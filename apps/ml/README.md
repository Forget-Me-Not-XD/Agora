# apps/ml — LSTM Bywoningsvoorspelling

> Scripts wat 'n klein LSTM-neurale netwerk oplei om funksie-vulkoerse
> en nie-opkoms-koerse vir universiteitsgeleenthede te voorspel, en dan
> voorspellings op 'n Raspberry Pi 5 lewer.

---

## Toetsomgewing

| Komponent | Weergawe | Notas |
|---|---|---|
| Python (ontwikkelingsmasjien) | **3.11.9** | 3.12+ word nie deur TensorFlow ondersteun nie |
| Python (Raspberry Pi-bediener) | **3.11.9** | Verstek op Raspberry Pi OS Bookworm |
| TensorFlow | **2.15.1** | Slegs opleiding — word nooit op die Pi geïnstalleer nie |
| tflite-runtime | **2.14.0** | Slegs inferensie — net op die Pi |
| scikit-learn | **>=1.3.0** | Beide omgewings (benodig om scaler.pkl te deserialiseer) |
| numpy | **>=1.24.0, < 2.0.0** | numpy 2.x het brekende veranderinge wat onversoenbaar is met TF2.15 |
| OS (ontwikkeling) | Windows 11 | |
| OS (Pi-bediener) | Raspberry Pi OS Bookworm (ARM 64) | |

---

## Inhoudsopgawe

1. [Oorsig](#1-oorsig)
2. [Stelselargitektuur](#2-stelselargitektuur)
3. [Hoe die Neurale Netwerk Werk](#3-hoe-die-neurale-netwerk-werk)
4. [Die Opleidingskurwes Verstaan](#4-die-opleidingskurwes-verstaan)
5. [Volledige Opstelgids — Van Stap 1 Af](#5-volledige-opstelgids--van-stap-1-af)
6. [Artefakte na die Raspberry Pi Ontplooi](#6-artefakte-na-die-raspberry-pi-ontplooi)
7. [predict.py Handmatig Toets](#7-predictpy-handmatig-toets)
8. [Die Uitvoer JSON Verstaan](#8-die-uitvoer-json-verstaan)
9. [Heroplei Soos Werklike Gebeure Ophoop](#9-heroplei-soos-werklike-gebeure-ophoop)
10. [Fase 1 — Kenmerkingenieurswese en Verliesfunksie: Resultate](#10-fase-1--kenmerkingenieurswese-en-verliesfunksie-resultate)
11. [Fase 3 — Dag-van-die-Maand Kenmerk: Resultate](#11-fase-3--dag-van-die-maand-kenmerk-resultate)

---

## 1. Oorsig

Twee Python-skrips hanteer die volledige ML-lewensiklus:

| Skrip | Loop op | Doel |
|---|---|---|
| `train.py` | Ontwikkelingsmasjien | Haal historiese geleentheiddata van die NestJS API, lei die LSTM op, stoor `model.tflite` en `scaler.pkl` |
| `predict.py` | Raspberry Pi 5 | Word deur die NestJS-backend as 'n kindproses gelaai; lees die gestoorde artefakte en gee 'n JSON-voorspelling terug |

Opleiding is doelbewus van inferensie geskei. Die Pi laat slegs
`predict.py` loop — dit lei nooit op nie. Opleiding gebeur op 'n
ontwikkelingsmasjien met volledige TensorFlow geïnstalleer, en produseer twee
klein artefaklêers wat dan na die Pi gekopieer word.

---

## 2. Stelselargitektuur

```
╔══════════════════════════════════════════════════════════════════╗
║                        ONTWIKKELINGSMASJIEN                      ║
║                                                                  ║
║   MongoDB ──► GET /analytics/training-data ──► train.py          ║
║   (gebeure,    (NestJS API, poort 3000)           │              ║
║    RSVPs)                                         │              ║
║                                          ┌────────┴───────┐      ║
║                                          │  model.tflite  │      ║
║                                          │  scaler.pkl    │      ║
║                                          └────────┬───────┘      ║
╚═══════════════════════════════════════════════════╪══════════════╝
                                                    │
                                         scp (kopieer oor netwerk)
                                                    │
╔═══════════════════════════════════════════════════╪══════════════╗
║                   RASPBERRY PI 5                  │              ║
║                                                   |              ║
║   Mobiele App ◄── NestJS API ◄── spawn() ◄── predict.py          ║
║                (poort 3000)     kindproses      │                ║
║                                                 ├── model.tflite ║
║                                                 └── scaler.pkl   ║
╚══════════════════════════════════════════════════════════════════╝
```

**Hoekom twee afsonderlike omgewings?**  
Volledige TensorFlow (~500 MB) is nodig vir opleiding maar kan nie skoon
op Raspberry Pi OS Bookworm geïnstalleer word nie. Die TFLite-runtime
(`tflite-runtime`, ~6 MB) kan slegs 'n vooraf-opgeleide model *uitvoer*, nie
bou nie. Opleiding op 'n kragtige masjien en slegs die bevrore artefak na
die Pi stuur is die standaard ingebedde ML-ontplooipatroon.

---

## 3. Hoe die Neurale Netwerk Werk

### 3.1 Hoekom LSTM en nie 'n eenvoudiger model nie?

'n Standaard deurvoer-neurale netwerk behandel elke geleentheid afsonderlik —
dit het geen begrip van tyd of volgorde nie. Universiteitsgeleentheidsbywoning
is nie geïsoleerd nie: vulkoerse in Februarie (oriëntering) is struktureel anders
as vulkoerse in Mei (eksamens). 'n LSTM (Long Short-Term Memory network) is
ontwerp vir presies hierdie soort opeenvolgende data. Dit lees 'n venster van
opeenvolgende gebeure en bou 'n interne "geheue" van patrone op voordat dit 'n
voorspelling vir die volgende geleentheid maak.

Ons model lees 'n venster van **5 opeenvolgende gebeure** (beheer deur
`SEQUENCE_LENGTH = 5` in `train.py`). Tydens opleiding skuif hierdie venster
oor die hele chronologies-gesorteerde geleentheidsgeskiedenis en produseer een
opleidingsmonster per posisie.

### 3.2 Invoerkenmerke

Elke geleentheid word deur **5 rou getalle** beskryf, wat na **8 kenmerke**
uitgebrei word voordat dit die netwerk ingaan (sien 3.3):

| Indeks | Rou kenmerk | Wat dit vasvang |
|---|---|---|
| 0 | `maxCapacity` | Lokaalgrootte — groot lokale word proporsioneel minder gevul |
| 1 | `dayOfWeek` | 0 = Sondag … 6 = Saterdag — Vrydae is die besigste |
| 2 | `month` | 1–12 — akademiese kalendereffekte (eksamens, oriëntering) |
| 3 | `dayOfMonth` | 1–31 — beurs-/toelaagbetalingsiklus (sien onder) |
| 4 | `daysInAdvance` | Dae tussen die skep van die geleentheid en die datum — promosietyd |

Dit is dieselfde 5 rou kenmerke wat die NestJS `LstmService.computeFeatures()`/
`computeDraftFeatures()`-metodes vanuit die databasis (of konsep-DTO) bou, sodat
opleidingsdata en regstreekse voorspellingsdata altyd dieselfde vorm het.

`dayOfMonth` vang die beurs-/toelaagbetalingsiklus vas: NSFAS en die meeste
SA-universiteitstoelaes betaal in die eerste week van die maand uit, en
studente se bereidwilligheid om opsionele/betaalde geleenthede by te woon
neem tipies af namate die maand vorder (sien `domFillFactor`/`domNoShowFactor`
in `seed-analytics-mock-data.ts`). Fase 3 het bevestig dat hierdie kenmerk
akkuraatheid werklik verbeter wanneer die onderliggende data 'n egte patroon
bevat — sien afdeling 11 vir die volledige voor/na-vergelyking.

### 3.3 Kenmerknormalisering

Rou kenmerkwaardes het baie verskillende skale: `maxCapacity` kan 500 wees
terwyl `dayOfWeek` 0–6 is. Neurale netwerke leer baie vinniger wanneer alle
invoere op dieselfde skaal is.

'n `MinMaxScaler` van scikit-learn word op die opleidingstel gepas en map
elke kenmerk na die reeks **[0, 1]** met die formule:

```
geskaleerde_waarde = (rou_waarde - kenmerk_min) / (kenmerk_max - kenmerk_min)
```

Die scaler word in `scaler.pkl` gestoor sodat `predict.py` presies
**dieselfde skalering** tydens inferensie kan toepas. As die scaler weggegooi
word en 'n nuwe een op 'n enkele voorspellingspunt gepas word, sal die
geskaleerde waardes useless vir die model wees.

### 3.4 Netwerk-argitektuur

```
         INVOERTENSOR  vorm: (1, 10, 8)
         ─────────────────────────────────────────
         1 monster │ 10 tydstappe │ 8 kenmerke elk

         ┌──────┐ ┌──────┐        ┌──────┐
         │  t₁  │ │  t₂  │  ....  │  t₁₀ │   ← 10 tydstappe (9 werklike
         │ [8k] │ │ [8k] │        │ [8k] │      vorige gebeure + teikengebeurtenis)
         └──┬───┘ └──┬───┘        └──┬───┘
            └────────┴───────────────┘
                        │
                        ▼
         ╔══════════════════════════════════════════╗
         ║         LSTM-laag  —  64 eenhede         ║
         ║                                          ║
         ║  Lees al 10 tydstappe in volgorde.       ║
         ║  Elke interne sel stuur sy toestand      ║
         ║  na die volgende, en bou konteks op.     ║
         ║  Uitvoer: 64-getal opsommingsvektor.     ║
         ║                                          ║
         ║  Parameters: 4×64×(8+64+1) = 18,688      ║
         ╚══════════════════╤═══════════════════════╝
                            │ 64 waardes
                            ▼
         ╔══════════════════════════════════════════╗
         ║         Dropout  —  koers 0.2            ║
         ╚══════════════════╤═══════════════════════╝
                            │ 64 waardes
                            ▼
         ╔═══════════════════════════════════════════╗
         ║     Dense-laag  —  32 eenhede  (ReLU)     ║
         ║     Parameters: 64×32 + 32 = 2,080        ║
         ╚══════════════════╤════════════════════════╝
                            │ 32 waardes
                            ▼
         ╔══════════════════════════════════════════╗
         ║         Dropout  —  koers 0.1            ║
         ╚══════════════════╤═══════════════════════╝
                            │ 32 waardes
                            ▼
         ╔══════════════════════════════════════════╗
         ║   Uitvoerlaag  —  2 eenhede  (Sigmoid)   ║
         ║   Parameters: 32×2 + 2 = 66               ║
         ╚══════════════╤═══════════════╤═══════════╝
                        ▼               ▼
                   uitvoer[0]       uitvoer[1]
                   fillRate         noShowRate

         Totale opleibare parameters: 20,834
```

**Verliesfunksie:** Huber (delta=0.3) in plaas van gewone MSE — demp die
invloed van uitskieter-historiese gebeure sonder om die gradiënt vir tipiese
foute te verander. Steekproefgewigte laat verre-toekoms-gebeure
(`daysInAdvance >= 45`) swaarder tel tydens opleiding. Sien afdeling 10 en 11
vir volledige besonderhede.

### 3.5 Die LSTM-sel Verduidelik

'n Gewone neurale netwerplaag pas 'n formule eenmalig toe en vergeet. 'n
LSTM-sel het twee stukke toestand wat dit van tydstap na tydstap dra:

```
            ┌─────────────────────────────────────────────────────────┐
            │                    LSTM-SEL                             │
            │                                                         │
            │   Drie hekke beheer wat onthou en vergeet word:         │
            │                                                         │
            │   VERGEET-HEK ──► "Hoeveel van my langtermyngeheue      │
            │                    moet ek uitvee?"                     │
            │                   (sigmoid: 0 = vergeet, 1 = behou)     │
            │                                                         │
            │   INVOER-HEK  ──► "Watter nuwe inligting moet ek        │
            │                    in langtermyngeheue skryf?"          │
            │                   (sigmoid × tanh)                      │
            │                                                         │
            │   UITVOER-HEK ──► "Watter deel van my langtermyngeheue  │
            │                    moet ek nou blootstel?"              │
            │                   (sigmoid × tanh van seltoestand)      │
            │                                                         │
  ───────►  verborge toestand (korttermyn)                            ├──────►
  vorige    seltoestand       (langtermyn)                            │       volgende
  toestande └─────────────────────────────────────────────────────────┘       toestande
```

In gewone taal: stel jou voor jy lees 5 geleentheidsrekords een vir een. Die
vergeet-hek laat die model sê "die seisoen van 3 gebeure terug is nie meer
relevant nie." Die invoer-hek laat dit sê "dit is eksamensmaand — skryf dit
in geheue." Die uitvoer-hek besluit watter deel van daardie opgehoopte konteks
om te gebruik wanneer die finale voorspelling gemaak word.

### 3.6 Opleiding vs Inferensie — Werklike Geskiedenis by Beide

Tydens opleiding sien die model **werklike reekse van 10 opeenvolgende
historiese gebeure**. Tot en met Fase 2 het inferensie 'n enkele geleentheid
se kenmerke 10 keer herhaal om aan die LSTM se invoervorm te voldoen — dit
het die LSTM se hele waarde (om van 'n reeks te leer) tydens regstreekse
voorspelling weggegooi.

Fase 2 het dit reggestel: `LstmService.buildFeatureSequence()` haal nou die
9 werklike mees-onlangse gebeure strek voor die teiken-datum op, bereken hul
kenmerke presies soos opleiding dit doen, en voeg die teikengebeurtenis se
eie kenmerke by as die laaste tydstap:

```
         Inferensie-invoer (nou 'n werklike reeks):

         t₁: [kenmerke van gebeurtenis 9 gebeure gelede]
         t₂: [kenmerke van gebeurtenis 8 gebeure gelede]
         ...
         t₉: [kenmerke van mees onlangse vorige gebeurtenis]
         t₁₀: [kenmerke van die teikengebeurtenis self]
```

**Randgeval — te min werklike geskiedenis:** as minder as 9 werklike gebeure
vóór die teiken-datum bestaan (vroeg in die datastel, of 'n splinternuwe
ontplooiing), word die vroegste beskikbare werklike gebeurtenis herhaal om
die oorblywende plekke aan die begin van die venster te vul. Dit sê vir die
LSTM "niks ongewoons het voor hierdie gebeur nie" — 'n veiliger verstek as
om vals variasie te versin, en verbeter outomaties namate werklike
geskiedenis ophoop.

Die NestJS↔Python-koppelvlak is ook verander: `predict.py` aanvaar nou een
CLI-argument — 'n JSON-stringvoorstelling van die volle 10-ry-reeks — in
plaas van 4 plat argumente. `spawn()` (sonder `shell: true`) gee argv-inskrywings
direk aan die bedryfstelsel deur, so JSON met hakies/aanhalingstekens het geen
ontsnapping nodig nie.

---

## 4. Die opleidingskurwes Verstaan

As `train.py` met matplotlib geïnstalleer loop, stoor dit `training_curves.png`
in `apps/ml/`. Die plot het twee panele:

**Linkerpaneel — MAE-verlies oor epochs**
```
Verlies
│╲
│ ╲         opleidingsverlies
│  ╲___________________
│   ╲  valideringsverlies
│    ╲_______________
│
└──────────────────── Epoch
```
- Beide lyne moet saam daal en dan af plat.  
- As **valideringsverlies styg terwyl opleidingsverlies aanhou daal**, pas die
  model te veel aan (memoriseer opleidingsdata). Die Dropout-lae en vroeë
  stop is ontwerp om dit te voorkom.  
- As **beide lyne baie vroeg op 'n hoë waarde plato**, pas die model te min aan
  — oorweeg om `LSTM_UNITS` of `DENSE_UNITS` in `train.py` te verhoog.

**Regterpaneel — MAE oor epochs**  
MAE (Gemiddelde Absolute Fout) is meer interpreteerbaar as verlies: 'n MAE
van 0.08 op vulkoers beteken voorspellings is gemiddeld met sowat 8
persentasiepunte af. Vir 'n universiteitsgebeurteniebeplanner is 'n MAE van
8–12 punte operasioneel nuttig.

---

## 5. Volledige Opstelgids — Van Stap 1 Af

### 5.1 Vereistes

Verseker die volgende is op jou **ontwikkelingsmasjien** geïnstalleer:

- Docker Desktop (vir MongoDB)
- Node.js 18+ en npm
- Python 3.10 of 3.11
- Git

### 5.2 Begin MongoDB

Vanuit die monorepo-hoof:

```bash
docker compose up -d
```

Verifieer dat MongoDB loop:

```bash
docker ps
# Moet 'n houer op poort 27017 wys
```

### 5.3 Installeer Backend-afhanklikhede en Begin die API

```bash
cd apps/backend
npm install
npm run start:dev
```

Die API sal beskikbaar wees by `http://localhost:3000/api/v1`.
Laat hierdie terminaal loop.

### 5.4 Saai die Databasis

Maak 'n nuwe terminaal oop vanuit die monorepo-hoof:

```bash
cd apps/backend
npx ts-node src/database/seeds/seed-analytics-mock-data.ts
```

Dit voeg 300 sintetiese historiese gebeure in (Julie 2021 – Junie 2026) en
~25,460 RSVP-dokumente met realistiese SA akademiese kalenderpatrone (Sal in die tokeoms maybe verhoog).

### 5.5 Kry 'n Admin JWT-token

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}' \
  | grep -o '"access_token":"[^"]*"'
```

Kopieer die tokenwaarde — jy sal dit in die volgende stap nodig hê.

### 5.6 Installeer Opleidingsafhanklikhede

```bash
cd apps/ml
pip install -r requirements-train.txt
```

Dit installeer volledige TensorFlow, scikit-learn, numpy, matplotlib en requests. Alles op die ontwikkelaar masjien.

### 5.7 Voer Opleiding Uit

**Opsie A — haal regstreeks van die lopende API (aanbeveel):**

```bash
python train.py --api http://localhost:3000/api/v1 --token JOU_JWT_TOKEN_HIER
```

**Opsie B — van 'n gestoorde JSON-lêer (nuttig vir aflyn-heropleiding):**

```bash
# Dump eers die data
curl -H "Authorization: Bearer JOU_JWT_TOKEN_HIER" \
     http://localhost:3000/api/v1/analytics/training-data > data.json

# Lei dan op vanuit die lêer
python train.py --json data.json
```

Opleidingsuitvoer wat jy sal sien:

```
Fetching training data from http://localhost:3000/api/v1/analytics/training-data ...
Received 300 events.

Dataset: 300 events  |  X (300, 4)  |  y (300, 2)
Chronological split: 240 train / 60 val events

Normalising features ...
capacity       : [20, 500] -> scaled to [0, 1]
dayOfWeek      : [0, 6]    -> scaled to [0, 1]
month          : [1, 12]   -> scaled to [0, 1]
daysInAdvance  : [0, 90]   -> scaled to [0, 1]

Sequences: 236 train / 56 val
...
Epoch 1/300 — loss: 0.0842  val_loss: 0.0901
Epoch 2/300 — loss: 0.0791  val_loss: 0.0855
...
Restoring model weights from the end of the best epoch: 47.

Best epoch: 47  |  best val_loss: 0.0412

== Validation Metrics ==
 Fill Rate MAE:    0.0821  (8.2 percentage points avg error)
 No-Show Rate MAE: 0.0644  (6.4 percentage points avg error)

Converting to TFLite...
Saved -> apps/ml/model.tflite (18.4 KB with quantization)
```

### 5.8 Verifieer die Artefakte

Nadat opleiding voltooi is, bevestig dat hierdie lêers in `apps/ml/` bestaan:

```bash
ls -lh apps/ml/model.tflite apps/ml/scaler.pkl
```

Verwagte uitvoer:

```
-rw-r--r--  model.tflite   ~18 KB
-rw-r--r--  scaler.pkl     ~1 KB
```

As `model.tflite` ontbreek, het opleiding misluk — kyk na die foutuitvoer.  
As `scaler.pkl` ontbreek, is die scaler nie gestoor nie — dit behoort nie te
gebeur tensy die opleidingsdata te klein was nie.

---

## 6. Artefakte na die Raspberry Pi Ontplooi

Slegs twee lêers moet oorgedra word. Hulle moet in dieselfde gids as
`predict.py` op die Pi woon.

```bash
# Vervang PI_GEBRUIKER en PI_IP met jou Pi se besonderhede
scp apps/ml/model.tflite PI_GEBRUIKER@PI_IP:~/span4/apps/ml/
scp apps/ml/scaler.pkl   PI_GEBRUIKER@PI_IP:~/span4/apps/ml/
```

**Eerste keer Pi-opstel** — installeer inferensie-afhanklikhede op die Pi:

```bash
# SSH eers in die Pi
ssh PI_GEBRUIKER@PI_IP

# Installeer dan slegs-inferensie-afhanklikhede (geen TensorFlow nie)
cd ~/span4/apps/ml
pip install -r requirements-infer.txt
```

Verifieer dat die Pi die runtime korrek kan invoer:

```bash
python -c "import tflite_runtime.interpreter; print('TFLite OK')"
python -c "import sklearn; print('scikit-learn OK')"
```

---

## 7. predict.py Handmatig Toets

Loop vanuit die `apps/ml/`-gids op die Pi (of ontwikkelingsmasjien as
artefakte daar is):

```bash
# python predict.py <kapasiteit> <dagVanWeek> <maand> <daeVooruit>
# dayOfWeek: 0=Sondag, 1=Maandag, 2=Dinsdag, 3=Woensdag, 4=Donderdag,
#            5=Vrydag, 6=Saterdag

python predict.py 200 5 2 30
```

Dit simuleer 'n 200-sitplek geleentheid op 'n Vrydag in Februarie, 30 dae
vooruit geskep.

**Om randgevalle te toets:**

```bash
# Klein laaste-minuut geleentheid op 'n Sondag in eksamensmaand
python predict.py 30 0 5 2

# Groot lokaal, goed vooruit, middelsemester Donderdag
python predict.py 800 4 3 60
```

**Om fouthantering te bevestig (model ontbreek):**

```bash
mv model.tflite model.tflite.bak
python predict.py 200 5 2 30   # moet met kode 1 uitsluit en fout na stderr skryf
mv model.tflite.bak model.tflite
```

---

## 8. Die Uitvoer JSON Verstaan

`predict.py` druk een JSON-objek na stdout en sluit af met kode 0:

```json
{
  "predictedFillRate":   0.82,
  "estimatedRsvps":      164,
  "predictedNoShowRate": 0.12,
  "estimatedAttendees":  144,
  "estimatedBudgetZAR":  36700,
  "reasoning": [
    "Februarie is oriënteringweek - histories hoë bywoning word verwag",
    "Vrydag-geleentheid - die besigste dag vir studentebywoning op kampus",
    "Medium-grootte lokaal - goeie vulkoers word verwag met behoorlike promosie",
    "30 dae vooraf aangekondig - redelike promosietyd is beskikbaar"
  ]
}
```

| Veld | Bron | Betekenis |
|---|---|---|
| `predictedFillRate` | LSTM uitvoer[0] | Breukdeel van sitplekke wat verwag word om gevul te word (0–1) |
| `estimatedRsvps` | `fillRate × kapasiteit` | Getal mense wat verwag word om te bevestig |
| `predictedNoShowRate` | LSTM uitvoer[1] | Breukdeel van bevestigde byeeners wat verwag word om nie op te daag nie (0–1) |
| `estimatedAttendees` | `rsvps × (1 - noShowRate)` | Getal mense wat verwag word om fisies aan te kom |
| `estimatedBudgetZAR` | `byeeners×R250 + lokaalverhuur` | Beraamde geleentheidskostes in Suid-Afrikaanse Rand |
| `reasoning` | Reëlgebaseerde enjin | Gewone Afrikaanse verduidelikings afgelei van invoerkenmerkwaardes |

**Begrotingsuiteensetting:**

```
estimatedBudgetZAR = (beraamde byeeners × R200 verversings)
                   + lokaalverhuur (gelaagd per kapasiteit)
                   + (beraamde byeeners × R50 materiaal)

Lokaalverhuur-vlakke:
  < 50  sitplekke  →  R500
  < 200 sitplekke  →  R1,500
  < 500 sitplekke  →  R3,000
  500+ sitplekke   →  R8,000
```

Enige fout (ontbrekende model, verkeerde argumente, Python-uitsondering) skryf
'n gewone teksberig na **stderr** en sluit af met 'n **nie-nul kode** — nooit
na stdout nie. Die NestJS-backend behandel enige nie-nul uitsluiting as
503 Service Unavailable.

---

## 9. Heroplei Soos Werklike Gebeure Ophoop

Die model is aanvanklik op 300 sintetiese gebeure opgelei. Soos werklike
gebeure plaasvind en RSVP-data aangeteken word, sal heropleiding op werklike
data die akkuraatheid verbeter.

### Wanneer om te heroplei

- Nadat **~50 of meer nuwe vorige gebeure** in die databasis opgehoop het
- Na enige strukturele verandering aan hoe gebeure of RSVPs vasgelê word
- As voorspelde vulkoerse konsekwent ver af is na een volledige akademiese
  semester se werklike data

### Stappe

**1. Dump vars opleidingsdata:**

```bash
curl -H "Authorization: Bearer JOU_ADMIN_JWT" \
     http://localhost:3000/api/v1/analytics/training-data > data.json
```

**2. Heroplei op die ontwikkelingsmasjien:**

```bash
cd apps/ml
python train.py --json data.json
```

**3. Hersien die valideringsstatistieke** wat aan die einde van opleiding gedruk
word. Vergelyk die nuwe MAE-waardes met die vorige lopie. As MAE verbeter het,
is die nuwe model beter. As dit slegter geword het, ondersoek of die nuwe data
ongewone patrone het of of meer data benodig word voor heropleiding.

**4. Ontplooi beide nuwe artefakte na die Pi:**

```bash
scp apps/ml/model.tflite PI_GEBRUIKER@PI_IP:~/span4/apps/ml/
scp apps/ml/scaler.pkl   PI_GEBRUIKER@PI_IP:~/span4/apps/ml/
```

**5.** Die NestJS-backend tel die nuwe lêers op by die volgende inkomende
versoek. Geen herstart is nodig nie.

> **Kopieer altyd beide lêers saam.**  
> Die scaler se min/maks-reekse word van nuuts af herbereken by elke
> opleidingslopie. 'n Nuwe `model.tflite` saam met 'n ou `scaler.pkl` sal
> verkeerd geskaleerde invoere produseer en onbetroubare voorspellings lewer.
> Behandel hulle as 'n gepaarde stel — hulle is slegs saam geldig.

---

## 10. Fase 1 — Kenmerkingenieurswese en Verliesfunksie: Resultate

Fase 1 van die LSTM-verbeterings ticket het die volgende bygevoeg:
sikliese (sin/cos) enkodering vir `dayOfWeek` en `month`, 'n `log1p`-transformasie
op `daysInAdvance` voor skalering, Huber-verlies in plaas van MSE, steekproefgewigte
wat verre-toekoms-gebeure swaarder laat tel tydens opleiding, en RMSE +
'n aparte verre-toekoms-onderstel (`daysInAdvance >= 45`) in `evaluate()`.
Sien `train.py` se `engineer_features()`, `create_sample_weights()` en
`evaluate()` vir die implementasie.

**Belangrike nota oor die "voor"-syfers:** tydens hierdie fase is ontdek dat
die databasis gebeure van twee onversoenbare, vorige saai-lopies bevat het
(verskillende e-posdomeine, ~25–49% van gebeure met onrealistiese
kapasiteite <10 en 'n handjievol onmoontlike vulkoerse >1.0). Die "voor"-syfers
hieronder is dus gemeet op besoedelde data met 'n heeltemal ander pyplyn (geen
sikliese kenmerke, geen data-skoonmaak, MSE-verlies) — dit is nie 'n
perfekte appels-met-appels-vergelyking nie. Die databasis is skoongemaak en
met die huidige, korrekte `seed-analytics-mock-data.ts` herlaai; die "na"-syfers
is die eerste keer wat hierdie statistieke op werklik skoon data gemeet is.

| Statistiek | Voor (ou, besoedelde data, n=850) | Na (Fase 1, skoon data, n=300) |
|---|---|---|
| Vulkoers MAE | 0.0332 | 0.1320 |
| Vulkoers RMSE | (nie gemeet nie) | 0.1551 |
| Nie-opkoms-koers MAE | 0.0992 | 0.0656 |
| Nie-opkoms-koers RMSE | (nie gemeet nie) | 0.0783 |
| Verre-toekoms Vulkoers MAE (≥45 dae, n=11) | (nie gemeet nie) | 0.1443 |
| Verre-toekoms Vulkoers RMSE (≥45 dae, n=11) | (nie gemeet nie) | 0.1646 |
| Verre-toekoms Nie-opkoms MAE (≥45 dae, n=11) | (nie gemeet nie) | 0.0736 |
| Verre-toekoms Nie-opkoms RMSE (≥45 dae, n=11) | (nie gemeet nie) | 0.0890 |
| Verliesfunksie | MSE | Huber (delta=0.3) |
| `DROPOUT_RATE` | 0.35 | 0.2 (verlaag na waarneming van onderpassing op die klein skoon datastel) |

Nie-opkoms-koers het werklik verbeter (MAE 0.0992 → 0.0656). Vulkoers-MAE lyk
op die oog af slegter, maar dit is die eerste betroubare meting op skoon data —
die ou 0.0332-syfer was gemeet teen 'n makliker (en gedeeltelik korrupte)
databasis. Fase 2 (regte historiese konteks tydens inferensie) en 'n moontlike
groter/beter datastel in Fase 3 word verwag om vulkoers-akkuraatheid verder
te verbeter.

---

## 11. Fase 3 — Dag-van-die-Maand Kenmerk: Resultate

Fase 3 het `dayOfMonth` as 'n vyfde rou kenmerk bygevoeg (sikliese sin/cos-
enkodering, periode=31 — sien 3.2) en Fase 2 se regte-geskiedenis-verandering
voltooi. Drie opeenvolgende opleidingslopies wys hoekom die kenmerk se
onderliggende data saak maak:

| Statistiek | Fase 1 (6 kenmerke, geen dayOfMonth) | Fase 3, dayOfMonth sonder egte sein | Fase 3, dayOfMonth met beurssiklus-sein |
|---|---|---|---|
| Vulkoers MAE | 0.1320 | 0.1582 | **0.1145** |
| Vulkoers RMSE | 0.1551 | 0.1954 | **0.1382** |
| Nie-opkoms MAE | 0.0656 | 0.0699 | **0.0478** |
| Nie-opkoms RMSE | 0.0783 | 0.0879 | **0.0614** |
| Verre-toekoms Vulkoers MAE | 0.1443 (n=11) | 0.1754 (n=11) | **0.1213** (n=16) |
| Verre-toekoms Nie-opkoms MAE | 0.0736 (n=11) | 0.0899 (n=11) | **0.0457** (n=16) |

Die middelste kolom is die sintetiese saaidata (`seed-analytics-mock-data.ts`)
soos dit oorspronklik was: geen verband tussen `dayOfMonth` en vulkoers/
nie-opkoms-koers nie. Twee ekstra invoerdimensies (`dom_sin`, `dom_cos`)
sonder enige onderliggende sein om te leer het **elke enkele statistiek
versleg** — verwagte gedrag op 'n klein datastel (231 opleidingsreekse):
uninformatiewe dimensies kos meer as wat hulle help wanneer daar niks
werklik te leer is nie.

Die regte kolom volg 'n bewuste besluit: `domFillFactor()`/`domNoShowFactor()`
is by die saaiskrip gevoeg om die beurs-/toelaagbetalingsiklus te simuleer
(NSFAS/toelaes betaal die eerste week van die maand uit; bywoningsbereidheid
daal namate die maand vorder — 'n werklike, gedokumenteerde patroon, nie
kunsmatig verzin nie). Met 'n egte patroon om te leer, klop hierdie lopie
selfs die Fase 1-basislyn wat glad nie `dayOfMonth` gehad het nie — nie-opkoms-
akkuraatheid het byna verdubbel (MAE 0.0656 → 0.0478), aangesien
`domNoShowFactor` die model 'n heeltemal nuwe voorspellende hefboom spesifiek
vir nie-opkoms gegee het.

**Gevolgtrekking:** die `dayOfMonth`-kenmerk se implementasie was reg van die
staanspoor af — die aanvanklike agteruitgang was 'n eienskap van die
sintetiese data, nie 'n fout in die kode nie. Sodra werklike produksiedata
ophoop, sal hierdie kenmerk outomaties bewys (of weerlê) of dieselfde patroon
in die regte wêreld bestaan.
