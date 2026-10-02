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
12. [Fase 4 — Data-gedrewe Verduidelikings (Occlusion-analise)](#12-fase-4--data-gedrewe-verduidelikings-occlusion-analise)
13. [Kleiner Datastel — Hertreining en Vergelyking](#13-kleiner-datastel--hertreining-en-vergelyking)

---

## 1. Oorsig

Drie Python-skrips hanteer die volledige ML-lewensiklus:

| Skrip | Loop op | Doel |
|---|---|---|
| `train.py` | Ontwikkelingsmasjien | Haal historiese geleentheiddata van die NestJS API, lei die LSTM op, stoor `model.tflite` en `scaler.pkl` |
| `predict.py` | Raspberry Pi 5 | Word deur die NestJS-backend as 'n kindproses gelaai; lees die gestoorde artefakte en gee 'n JSON-voorspelling terug |
| `explain.py` | Raspberry Pi 5 | Deur `predict.py` ingevoer (nie self uitvoerbaar nie) — bereken die `reasoning`-lys deur die regte model herhaaldelik te bevraagteken (occlusion-analise, sien afdeling 12) |

Opleiding is doelbewus van inferensie geskei. Die Pi laat slegs `predict.py`
(en die module wat dit invoer, `explain.py`) loop — dit lei nooit op nie.
Opleiding gebeur op 'n ontwikkelingsmasjien met volledige TensorFlow
geïnstalleer, en produseer twee klein artefaklêers wat dan na die Pi
gekopieer word.

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
`computeFeaturesAt()`-metodes vanuit die databasis (of konsep-DTO) bou, sodat
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

Fase 2 het dit reggestel: `LstmService.findRecentHistory()` haal nou die
9 werklike mees-onlangse gebeure strek voor die teiken-datum op,
`buildFeatureSequence()` bereken hul
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

**Linkerpaneel — Huber-verlies oor epochs**
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

**"Konvergeer" beteken die lyne word plat — nie dat hulle mekaar raak nie.**
Dit is normaal dat die opleidingslyn deurgaans *bo* die valideringslyn lê:

1. **Dropout maak opleiding doelbewus moeiliker.** Tydens opleiding word 20%
   van die neurone ewekansig afgeskakel; tydens validering werk almal. Soos om
   met gewigte om die enkels te oefen en dit vir die wedstryd af te haal.
2. **Steekproefgewigte** (`create_sample_weights`) laat verre-toekoms-gebeure
   tot 5× swaarder in die opleidingsverlies tel; validering het geen gewigte nie
   (raak net die linkerpaneel).
3. **Die twee periodes verskil.** Opleiding dek die hele akademiese jaar
   (Februarie-pieke én eksamen-laagtes); die valideringsvenster is korter en
   minder gevarieerd, so dit is makliker om "naby" te wees.

'n Groot gaping tussen die lyne bewys dus nie oorpassing nie, en 'n lae
valideringslyn bewys ook nie dat die model goed is nie — sien afdeling 13.7
vir hoe die model teen 'n eenvoudige basislyn getoets word.

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

Dit voeg ~120 sintetiese historiese gebeure in (Oktober 2023 – September 2026),
~7 000–10 000 RSVP-dokumente en ~2 000–3 500 resensies met realistiese SA
akademiese kalenderpatrone. Gebruik `--reset` om slegs hierdie skrip se eie data
eers te verwyder en dan van voor af te saai.

> As `seed-demo-data.ts` ook in dieselfde databasis geloop het, word sy
> geleenthede (`isDemo: true`) outomaties uit die opleidingsdata gelaat —
> sien afdeling 13.3.

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
artefakte daar is). Sedert Fase 2 aanvaar `predict.py` **een CLI-argument**:
'n JSON-string van presies `SEQUENCE_LENGTH` (10) rye, elk
`[capacity, dayOfWeek, month, dayOfMonth, daysInAdvance]` — oudste
gebeurtenis eerste, teikengebeurtenis laaste:

```bash
# dayOfWeek: 0=Sondag, 1=Maandag, 2=Dinsdag, 3=Woensdag, 4=Donderdag,
#            5=Vrydag, 6=Saterdag

python predict.py "[[300,1,3,10,60],[300,1,3,10,55],[300,1,3,10,50],[300,1,3,10,45],[300,1,3,10,40],[300,1,3,10,35],[300,1,3,10,30],[300,1,3,10,25],[300,1,3,10,20],[200,5,2,10,30]]"
```

Dit simuleer 9 tipiese vorige gebeure (300 sitplekke, Maandae, Maart) gevolg
deur 'n teikengebeurtenis: 200-sitplek geleentheid op 'n Vrydag in Februarie,
30 dae vooruit geskep.

**Om randgevalle te toets:**

```bash
# Al 10 rye identies — simuleer 'n splinternuwe ontplooiing met geen
# werklike geskiedenis nie. compute_occlusion_reasoning() se afgeleide waardes
# is dan ~0 vir elke kenmerk, en predict.py val terug op generate_reasoning().
python predict.py "[[80,0,5,2,3],[80,0,5,2,3],[80,0,5,2,3],[80,0,5,2,3],[80,0,5,2,3],[80,0,5,2,3],[80,0,5,2,3],[80,0,5,2,3],[80,0,5,2,3],[80,0,5,2,3]]"
```

**Om fouthantering te bevestig (model ontbreek):**

```bash
mv model.tflite model.tflite.bak
python predict.py "[[300,1,3,10,60],[300,1,3,10,55],[300,1,3,10,50],[300,1,3,10,45],[300,1,3,10,40],[300,1,3,10,35],[300,1,3,10,30],[300,1,3,10,25],[300,1,3,10,20],[200,5,2,10,30]]"
# moet met kode 1 uitsluit en fout na stderr skryf
mv model.tflite.bak model.tflite
```

**Model-gebaseerde alternatiewe (`--alternatives`):**

Die opsionele `--alternatives`-argument neem 'n JSON-lys (hoogstens 31) van
teikenrye in dieselfde 5-waarde-formaat. Elke ry vervang die laaste ry van die
reeks en word met dieselfde gelaaide interpreteerder voorspel — steeds een
Python-proses. Sonder die argument is die uitset identies aan voorheen.

```bash
python predict.py "[[300,1,3,10,60],[300,1,3,10,55],[300,1,3,10,50],[300,1,3,10,45],[300,1,3,10,40],[300,1,3,10,35],[300,1,3,10,30],[300,1,3,10,25],[300,1,3,10,20],[200,5,2,10,30]]" --alternatives "[[200,4,2,9,29],[200,5,2,17,37],[160,5,2,10,30]]"
# Ongeldige alternatiewe (bv. --alternatives "nope") gee 'n WARNING op stderr,
# "alternatives": [] en steeds kode 0 — die hoofvoorspelling bly ongeskonde.
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
    "Kapasiteit van 200 sitplekke (teenoor 300 tipies by onlangse geleenthede) het die verwagte vulkoers met 3 persentasiepunte verhoog",
    "Vrydag-geleentheid (onlangse gemiddeld was eerder Maandag) het die vulkoers met 8 persentasiepunte verhoog",
    "30 dae vooraf beplan (onlangse tipiese waarde: 40 dae) het die vulkoers met 2 persentasiepunte verlaag"
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
| `reasoning` | `explain.py` (occlusion), met `generate_reasoning()` in `predict.py` as terugval | 1–3 Afrikaanse sinne wat elk 'n **gemete** effek beskryf: hoeveel die voorspelling regtig verander het toe een kenmerk van die teikengebeurtenis vervang is met wat tipies was vir die 9 voorafgaande werklike gebeure. Sien afdeling 12. |
| `alternatives` | Slegs met `--alternatives` | Een objek per alternatiewe ry: `capacity`, `dayOfWeek`, `month`, `dayOfMonth`, `daysInAdvance`, `predictedFillRate`, `predictedNoShowRate`, `estimatedRsvps`, `estimatedAttendees`. NestJS voeg `kind` (`sameWeek`/`laterWeek`/`recommendedCapacity`) en die volle ISO-`date` by, en stuur slegs die (hoogstens 5) opsies terug wat meer verwagte bywoners as die huidige keuse gee. Met `--alternatives` voeg Python ook `recommendedCapacity` by: die teikenry met `ceil(estimatedRsvps × 1.1)` sitplekke. |

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

Die model is aanvanklik op ~120 sintetiese gebeure opgelei (sien afdeling 13). Soos werklike
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
word. Kontroleer eers die `== Baseline ==`-blok: as die LSTM nie die basislyn
(altyd die opleidingsgemiddelde voorspel) klop nie, het dit geen werklike patroon
geleer nie (sien afdeling 13.7). Vergelyk dan die nuwe MAE-waardes met die vorige lopie. As MAE verbeter het,
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

---

## 12. Fase 4 — Data-gedrewe Verduidelikings (Occlusion-analise)

### 12.1 Die probleem met die oorspronklike `generate_reasoning()`

Tot en met Fase 4 het `predict.py`'s `generate_reasoning()` **elke** sin in
`reasoning` geproduseer uit 'n hardgekodeerde `if`/`elif`-leer, geskryf op
grond van aannames ("Februarie = oriënteringweek, hoë bywoning verwag"). Die
sinne het nooit na die model se werklike uitvoer of enige regte data gekyk
nie — dieselfde maand/dag/kapasiteitskombinasie het altyd dieselfde
sin gekry, ongeag wat die LSTM self voorspel het. `explain.py` vervang dit
met redes wat regtig gemeet is teen die ontplooide model.

### 12.2 Occlusion: die kernidee

Vir 'n swart-boks-funksie `f` (hier: kenmerkingenieurswese → skalering →
LSTM) en 'n invoer `x`, word die effek van een kenmerk `x_i` geskat as:

```
effect_i = f(x) − f(x met x_i vervang deur 'n verwysingswaarde)
```

Dit is 'n eindige-verskil-benadering van 'n afgeleide — dieselfde idee as 'n
numeriese gradiënt (`(f(x+h) − f(x)) / h`), behalwe dat, in plaas van 'n
oneindig klein stappie, een betekenisvolle, verstaanbare stap geneem word:
"wat as hierdie kenmerk sy tipiese onlangse waarde gehad het in plaas van sy
werklike waarde?" Dit vereis **geen toegang tot die model se binnekant nie**
— slegs die vermoë om dit twee keer aan te roep — wat presies is wat 'n
TFLite-`interpreter.invoke()` bied. Dit is dus die enigste tegniek wat op die
Pi se ontplooide `model.tflite` werk: gradiënt-gebaseerde metodes (Integrated
Gradients, SHAP se DeepExplainer) vereis terugpropagering deur 'n
differensieerbare grafiek, wat 'n plat TFLite-interpreteerder nie bied nie.

### 12.3 Implementasie-besonderhede (`explain.py`)

Vir die teikengebeurtenis (altyd die laaste van die 10 rye) word elk van sy 5
rou kenmerke (`capacity, dayOfWeek, month, dayOfMonth, daysInAdvance`) om die
beurt vervang met die **mediaan van daardie kenmerk oor die 9 voorafgaande
werklike rye** — "wat tipies is vir hierdie gebeurtenis se onlangse
geskiedenis." Die model word met elke vervanging herloop op **dieselfde reeds-
gelaaide interpreteerder** (`predict.py`'s `load_interpreter()`/`invoke()`
verdeling laat dit toe om 6 keer aangeroep te word — 1 werklike + 5
teenfeitelikes — sonder om `model.tflite` 6 keer van skyf af te herlaai).

Die vervanging gebeur in **rou kenmerkruimte**, nie in die geïngenieerde
sin/cos-ruimte nie: `engineer_features()` verwag geldige punte op die
eenheidsirkel (`sin² + cos² = 1`), en enige onafhanklike aanpassing van `sin`
en `cos` sal waarskynlik van die sirkel afval — 'n invoer wat die model nooit
tydens opleiding gesien het nie. Deur eerder die rou heelgetal (bv.
`dayOfWeek`) te vervang en dit weer deur `engineer_features()` te stuur, is
elke teenfeitelike 'n geldige, werklike kalenderdatum.

Elk van die 5 kenmerke se impak word bereken as
`|Δvulkoers| × 0.7 + |Δnie-opkoms| × 0.3` (vulkoers weeg swaarder — dit dryf
`estimatedAttendees`/`estimatedBudgetZAR` direk), en van hoog na laag gesorteer.
'n Kandidaat word slegs vertoon as dit **twee** hekke deurkom: die impak moet
bo `MIN_REASONING_IMPACT` (opsetlik baie klein — regte enkele-kenmerk-effekte
op regte data is dikwels ver onder 1 persentasiepunt, en steeds die moeite
werd om te rapporteer) wees, **en** die vulkoers-Δ moet tot minstens 1
heelgetal-persentasiepunt afrond (`round(|Δvulkoers| × 100) >= 1`) — sonder
hierdie tweede hek kon 'n kenmerk wat sy impak grotendeels uit `Δnie-opkoms`
put, terwyl sy eie `Δvulkoers` na 0 afrond, 'n onsinnige sin soos "...het die
vulkoers met 0 persentasiepunte verhoog" laat druk. Die top 1–3 wat oorbly
word in Afrikaanse sinne omgeskakel.

### 12.4 Die terugvalgeval

`LstmService.buildFeatureSequence()` (NestJS) vul ontbrekende geskiedenis deur
die vroegste bekende gebeurtenis te herhaal, of — as daar **glad geen** werklike
geskiedenis is nie (splinternuwe ontplooiing, of 'n konsepvoorspelling ver in
die toekoms) — die teikengebeurtenis self. In laasgenoemde geval is elke
"voorafgaande" ry identies aan die teiken, elke mediaan-verwysingswaarde is
dus reeds die teiken se eie waarde, elke teenfeitelike is identies aan die
werklike ry, en elke Δ is presies `0`. `compute_occlusion_reasoning()` gee dan
`None` terug, en `predict.py` val terug op die oorspronklike
`generate_reasoning()` — 'n eerlike "ons het nie genoeg onlangse konteks om
'n rede te meet nie," eerder as om 'n 0%-effek voor te hou asof dit
betekenisvol is.

### 12.5 Verwantskap met Shapley-waardes / SHAP

'n Volledige Shapley-waarde vir kenmerk `i` middel hierdie selfde
vervang-en-meet-truuk oor **elke moontlike kombinasie** van die ander kenmerke
wat teenwoordig of vervang is — `2⁵ = 32` kombinasies vir 5 kenmerke. Deur elke
kenmerk onafhanklik te vervang terwyl al die ander op hul werklike waardes bly,
bereken `explain.py` die enkele-kenmerk-spesiale-geval: 'n benadering wat
aanneem dat kenmerke nie wesenlik interaktief is in hoe hulle die uitvoer
beïnvloed nie. Dit is 'n reële vereenvoudiging (die LSTM kan wel interaksies
oor die 10 tydstappe modelleer), maar 'n standaard, goed-verstane
verhandelingspunt — 6 vorentoegange in plaas van tot 32.

---

## 13. Kleiner Datastel — Hertreining en Vergelyking

### 13.1 Wat beteken MAE? (in gewone taal)

MAE (*Mean Absolute Error*, Gemiddelde Absolute Fout) is die gemiddelde van hoe
ver elke voorspelling van die werklike waarde af was — ongeag of die model te
hoog of te laag geskat het. Laer is beter; 0 sou perfek wees.

Albei uitsette van die model is koerse tussen 0 en 1, so 'n MAE lees direk as
'n persentasie:

- **Vulkoers-MAE 0.12** = die voorspelling is gemiddeld **±12% van die
  kapasiteit** af. Voorbeeld: 'n lokaal met 200 sitplekke, en die model
  voorspel 60% vol (120 mense). Met 'n MAE van 0.12 is die werklike bywoning
  tipies tussen 96 en 144 mense (120 ± 24).
- **Nie-opkoms-MAE 0.05** = van die mense wat hul bywoning bevestig het, is die
  voorspelde persentasie wat nie opdaag nie gemiddeld **±5 persentasiepunte**
  af. Voorbeeld: 100 bevestigings en 20% voorspelde nie-opkoms (20 mense) —
  werklik tipies tussen 15 en 25 mense.
- **RMSE** werk soortgelyk, maar straf groot foute swaarder. As RMSE heelwat
  groter as MAE is, beteken dit die model mis af en toe met 'n groot marge.

MAE is 'n gemiddelde, nie 'n waarborg nie: sommige gebeure sal verder af wees.

### 13.2 Hoekom die datastel kleiner gemaak is

`seed-analytics-mock-data.ts` is van 300 na ~120 gebeure verklein sodat die
paneelborde leesbaar en verduidelikbaar bly. Hierdie afdeling bewys dat die
LSTM met ~60% minder data steeds betroubaar is.

### 13.3 Watter geleenthede tel as opleidingsdata

Die eerste hertreining het heeltemal misluk (vulkoers-MAE 0.3574, beste epoch 1
— die model het vir elke geleentheid ~0.76 voorspel). Die oorsaak was die data,
nie die model nie: `GET /analytics/training-data` het **elke** verlede
geleentheid teruggegee, insluitend 1 000 geleenthede van `seed-demo-data.ts`.
Daardie demodata volg nie die akademiese kalenderpatrone nie, bevat
plekhouer-geleenthede met kapasiteit 1, en het onlangse geleenthede sonder
enige inskandering — wat die ou kode as "100% nie-opkoms" aangeteken het.

`EventsService.findTrainableEvents()` pas nou een reël toe. 'n Geleentheid word
slegs gebruik as dit:

1. **nie demodata is nie** (`isDemo` is nie `true` nie) — die demo-seed merk sy
   eie geleenthede;
2. **klaar is** — `endDate` is verby, of (sonder `endDate`) dit het meer as 3 uur
   gelede begin, sodat 'n geleentheid wat nog aan die gang is nie halwe
   inskanderings as etiket gebruik nie;
3. **minstens een inskandering het** (`checkedInCount > 0`). Sonder enige
   inskandering is die nie-opkoms-koers *onbekend*, nie 100% nie.

Dieselfde reël geld vir die 9-geleentheid-geskiedenis wat `LstmService` tydens
voorspelling aan die model voer, sodat die model in gebruik presies dieselfde
soort data sien as waarop dit opgelei is. Die etikette (`fillRate`,
`noShowRate`) word nou direk van die geleentheid se eie `confirmedAttendees` en
`checkedInCount` gelees — een databasisnavraag in plaas van een per geleentheid.

### 13.4 Hoe die hertreining gedoen is

```bash
cd apps/backend
npx ts-node src/database/seeds/seed-analytics-mock-data.ts --reset

cd ../ml
curl.exe -s -H "Authorization: Bearer JOU_ADMIN_JWT" http://localhost:3000/api/v1/analytics/training-data -o data.json
python train.py --json data.json
```

> Gebruik op Windows PowerShell `curl.exe -o` en nie `curl ... > data.json` nie —
> PowerShell 5.1 skryf met `>` 'n UTF-16-lêer wat `train.py` nie kan lees nie.

Bestaande demogeleenthede (van voor die `isDemo`-veld bestaan het) is eenmalig
gemerk met:

```js
db.events.updateMany(
  { description: "Universiteitsgeleentheid geskep vir demonstrasie- en toetsdoeleindes met volledige voorbeelddata." },
  { $set: { isDemo: true } }
)
```

### 13.5 Resultate: oud teenoor nuut (enkele chronologiese verdeling)

Hierdie syfers kom van `train.py` se standaard-evaluering: die laaste 20% van
die gebeure (chronologies) word as valideringstel gebruik.

| Statistiek | Oud (300 gebeure) | Eerste poging (gemengde data) | Nuut (gefilterde data) |
|---|---|---|---|
| Gebeure gebruik (`n_events`) | 300 | 582 (van 1 020) | 120 |
| Beste epoch | 73 | 1 | 25 |
| Vulkoers MAE | 0.1145 | 0.3574 | 0.0949 |
| Vulkoers RMSE | 0.1382 | 0.4218 | 0.1500 |
| Nie-opkoms MAE | 0.0478 | 0.3340 | 0.0475 |
| Nie-opkoms RMSE | 0.0614 | 0.4857 | 0.0595 |
| Verre-toekoms Vulkoers MAE (≥45 dae) | 0.1213 (n=16) | 0.3694 (n=30) | 0.0647 (n=3) |
| Verre-toekoms Nie-opkoms MAE (≥45 dae) | 0.0457 (n=16) | 0.4137 (n=30) | 0.0299 (n=3) |
| `GET /analytics/model-status` → `health` | fair | poor | good |

### 13.6 Aanvaardingskriteria (enkele verdeling)

| Vereiste | Drempel | Nuut | Geslaag? |
|---|---|---|---|
| Vulkoers MAE | ≤ 0.14 | 0.0949 | 
| Nie-opkoms MAE | ≤ 0.07 | 0.0475 | 

Op hierdie meting is die vulkoers-voorspelling gemiddeld ±9.5% van die
kapasiteit af en die nie-opkoms-voorspelling ±4.75 persentasiepunte.
**Afdeling 13.7 wys egter dat hierdie meting te optimisties is.**

### 13.7 Eerlike evaluering: basislyn en tydreeks-kruisvalidering

Die enkele verdeling hierbo het twee swakhede:

1. **Geen basislyn nie.** 'n "Model" wat bloot altyd die opleidingsgemiddelde
   voorspel (vulkoers 0.519, nie-opkoms 0.216), behaal op dieselfde 15
   valideringsreekse **0.0899 / 0.0458** — effens *beter* as die LSTM se
   0.0949 / 0.0475. Die voorspellings in die uitvoer lê ook almal tussen 0.51
   en 0.55: die LSTM voorspel in wese die gemiddelde.
2. **Die valideringstel is klein en bevoordeel die model.** 15 reekse uit een
   halfjaar (April–September), en vroeë stop kies die beste epoch op dieselfde
   15 reekse waarop die model daarna beoordeel word.

`train.py` druk en stoor nou daarom ook `baseline_fill_mae` en
`baseline_noshow_mae` in `model_meta.json` (vanaf die volgende opleidingslopie),
en meld of die LSTM die basislyn klop.

Om eerlik te meet, is **tydreeks-kruisvalidering** gebruik: lei op op die eerste
60% / 70% / 80% / 90% van die tydlyn, voorspel telkens die volgende 10%, en
beoordeel alle voorspellings saam (47–59 toetsgebeure oor 'n volle jaar). Vroeë
stop gebruik slegs die laaste 15% van die *opleidings*venster. Dit is op 10
datastelle gedoen: die werklike `data.json`, plus 4 ekstra stelle van ~120 en 5
van ~150 gebeure uit dieselfde saaiskrip (in 'n aparte toetsdatabasis).

| Model (gemiddelde vulkoers-MAE) | ~120 gebeure | ~150 gebeure |
|---|---|---|
| Altyd die algehele gemiddelde | 0.177 | 0.197 |
| Gemiddelde vir daardie maand | 0.134 | 0.139 |
| Huidige LSTM (64 eenhede) | 0.180 | 0.190 |
| Kleiner LSTM (16 eenhede) | 0.174 | 0.193 |

**Eerlik gemeet haal die huidige LSTM nie die drempel van 0.14 nie**, en 'n
eenvoudige "maandgemiddelde"-opsoektabel is beter. Meer data (~150 gebeure,
die kaartjie se terugvalopsie) of 'n kleiner netwerk help nie.

**Hoekom:** die saaiskrip genereer elke geleentheid se bywoning onafhanklik uit
sy eie maand, weekdag, kapasiteit en voorafkennisgewing — daar is geen verband
tussen 'n geleentheid en die vorige geleenthede nie. 'n LSTM se enigste voordeel
is juis om die vorige 10 geleenthede te lees, so op hierdie data het dit niks
ekstra om te leer nie, terwyl ~20 000 gewigte op ~90 voorbeelde oorpas.

### 13.8 Eksperimente om die LSTM te verbeter

Al die eksperimente hieronder gebruik dieselfde kruisvalidering. "Slaag" beteken
vulkoers ≤ 0.14 **en** nie-opkoms ≤ 0.07.

**1. Maandgemiddeldes as kenmerk (*target encoding*).** Die opleidingsdata se
gemiddelde vul- en nie-opkoms-koers vir die geleentheid se maand word as twee
ekstra invoere bygevoeg (leave-one-out en na die algehele gemiddelde getrek,
sodat 'n geleentheid nie sy eie antwoord kan "sien" nie).

**2. Volgorde-kenmerke.** Die vorige geleentheid se werklike uitslag (hoe ver dit
van sy maandgemiddelde was) en die aantal dae sedert die vorige geleentheid.
Dit is wettig: wanneer 'n toekomstige geleentheid voorspel word, het die vorige
geleenthede reeds plaasgevind.

**3. Hibriede model.** 'n Lineêre deel (die "ruggraat") hanteer die voorspelbare
effekte; 'n LSTM-deel leer korreksies bo-op, en begin by nul sodat dit net kan
help.

**4. 'n Saaiskrip met volgorde-patrone.** 'n Toetsweergawe van die saaiskrip het
twee realistiese patrone bygevoeg: *moegheid* (elke ander geleentheid in die
vorige 7 dae verlaag vulkoers met 7%) en *momentum* ('n verskuiwende
kampus-betrokkenheidsvlak, ±~10%).

| Model | Huidige saaidata: vul / nie-opkoms | Slaag | Saaidata met patrone: vul / nie-opkoms | Slaag |
|---|---|---|---|---|
| Gemiddelde vir daardie maand | 0.136 / 0.061 | 4/10 | 0.141 / 0.073 | 1/10 |
| Lineêr + maandkenmerke | 0.101 / 0.055 | 10/10 | 0.119 / 0.066 | 7/10 |
| Gewone LSTM + alle nuwe kenmerke | 0.160 / 0.075 | 0/10 | 0.169 / 0.081 | 0/10 |
| **Hibried: lineêre ruggraat + LSTM** | **0.102 / 0.055** | **10/10** | **0.119 / 0.066** | **7/10** |

Bevindinge:

- **Die hibriede model is die enigste LSTM-ontwerp wat werk.** Dit is so goed
  soos die beste model op albei soorte data, en kan nooit swakker as die
  lineêre ruggraat word nie. As toekomstige (werklike) data wel patrone tussen
  geleenthede het, kan die LSTM-deel dit optel.
- **Eerlikheidshalwe kom byna al sy akkuraatheid uit die lineêre deel.** Selfs
  op die saaidata met patrone het die LSTM-deel min bygedra bo 'n lineêre model
  met dieselfde invoere.
- **'n Gewone LSTM misluk in elke opstelling** — ~90 opleidingsvoorbeelde is te
  min vir hom alleen.
- **Die patrone in die saaiskrip het alles moeiliker gemaak, nie makliker nie.**
  Momentum was so klein dat dit in die ander variasie verdrink het, en moegheid
  het net ekstra variasie bygevoeg. Die saaiskrip is daarom **nie** verander
  nie: data aanpas totdat 'n gekose model wen, sou die resultate ongeloofwaardig
  maak.

### 13.9 Besluit en volgende stap

**Status: besluit geneem, nog nie geïmplementeer nie.** Die model wat tans in
`model.tflite` ontplooi is, is steeds die oorspronklike LSTM (afdeling 13.5).

Die besluit:

1. **Vervang die huidige LSTM met die hibriede model** (lineêre ruggraat + LSTM),
   met maandgemiddeldes, die vorige geleentheid se uitslag en dae-sedert-vorige
   as invoere. Dit bly een TFLite-lêer vir die Raspberry Pi.
2. **Hou die huidige saaiskrip** sonder moegheid/momentum.
3. **Bou die eerlike evaluering in `train.py` in:** tydreeks-kruisvalidering,
   basislyne, en vroeë stop wat nie na die toetsdata loer nie — sodat elke
   toekomstige heropleiding, op watter data ook al, betroubare syfers rapporteer.

Dit raak `train.py`, `predict.py`, `explain.py` en `LstmService` (die
geskiedenis moet ook die vorige geleenthede se werklike uitslae stuur).

### 13.10 Gevolgtrekking

Die kleiner datastel (120 gebeure) is **nie** die probleem nie — die
maandgemiddelde en die lineêre model presteer op 120 gebeure net so goed as op
150. Twee groot lesse:

1. **Data-kwaliteit het baie meer saak gemaak as hoeveelheid.** 582 gemengde
   gebeure het 'n onbruikbare model opgelewer (vulkoers-MAE 0.3574); 120 skoon
   gebeure 'n bruikbare een.
2. **'n Lae MAE op een klein valideringstel bewys niks sonder 'n basislyn nie.**
   Eerlik gemeet voorspel die huidige LSTM nie beter as 'n maandgemiddelde nie;
   die hibriede model (13.9) haal die drempels op al 10 toetsdatastelle.

### 13.11 Beperkings

- **Sintetiese data.** Daar is geen werklike Akademia-bywoningsdata beskikbaar
  nie. Alle syfers meet hoe goed die model die saaiskrip se aannames leer, nie
  hoe goed dit Akademia se werklikheid voorspel nie.
- **Klein valideringstel.** Met 120 gebeure het die enkele verdeling net 15
  valideringsreekse; daarom die kruisvalidering in 13.7.
- **Nie-deterministiese saaidata.** Die saaiskrip gebruik `Math.random()`
  sonder 'n vaste saad, so elke `--reset` lewer effens ander data. Daarom is
  oor 10 datastelle gemiddel.
- **Verre-toekoms-onderstel.** Slegs 3 valideringsgebeure is ≥45 dae vooruit
  beplan — te min om daardie syfers as betroubaar te beskou.
- **Volgorde-kenmerke is effens optimisties in kruisvalidering.** Die toets
  gebruik die direk vorige geleentheid se uitslag; in werklike gebruik is dit
  die mees onlangse *voltooide* geleentheid, wat vir verre-toekoms-voorspellings
  verder terug kan lê.
- **'n Werklike 100%-nie-opkoms-geleentheid** (almal het ingeskryf, niemand het
  opgedaag nie) word deur reël 3 (13.3) uitgesluit, omdat dit nie van
  "inskandering is nooit gedoen nie" onderskei kan word nie. Dit is skaars
  genoeg om die akkuraatheidswins werd te wees.
