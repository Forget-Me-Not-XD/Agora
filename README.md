<p align="center">
  <img src="404_logo_transparent.png" alt="Akademia Funksiebestuurstelsel Banner" width="100%" />
</p>

# Akademia Funksiebestuurstelsel

Die **Akademia Funksiebestuurstelsel** is 'n omvattende platform vir die bestuur van Akademia-funksies soos gradeplegtigheid, sportbyeenkomste, kultuuraande en meer. Dit stel beplanners in staat om geleenthede te skep, RSVPs te bestuur, bywoning te monitor, en datagedrewe besluite te neem deur middel van 'n ingeboude LSTM-voorspellingsmodel.

Die stelsel bestaan uit drie dele:

| Deel | Tegnologie | Beskrywing |
|---|---|---|
| Backend API | NestJS + MongoDB | Sentrale API vir alle data en besigheidlogika |
| Web-dashboard | Next.js 14 | Bestuurskoppelvlak vir admins en dosente |
| Mobiele toepassing | React Native + Expo | Gebruikerskoppelvlak vir gaste en studente |

---

## Vereistes

| Hulpmiddel | Minimum weergawe | Notas |
|---|---|---|
| Node.js | 18+ | Benodig vir backend, web, en mobiel |
| Docker Desktop | Nuutste | Benodig vir MongoDB, RabbitMQ, en Redis |
| Expo Go | Nuutste | Installeer op jou foon vir mobiele toetsing |

---

## Omgewingsveranderlikes

Kopieer die voorbeeldlêer na `.env` in die repo-wortel:

```bash
cp .env.example .env
```

| Veranderlike | Beskrywing | Voorbeeldwaarde |
|---|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB root gebruikersnaam | `akademia` |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root wagwoord | `changeme_in_production` |
| `MONGO_DB_NAME` | MongoDB databasisnaam | `akademia` |
| `MONGO_URI` | Volledige MongoDB verbindingsstring | `mongodb://akademia:changeme_in_production@mongodb:27017/akademia?authSource=admin` |
| `RABBITMQ_DEFAULT_USER` | RabbitMQ gebruikersnaam | `akademia` |
| `RABBITMQ_DEFAULT_PASS` | RabbitMQ wagwoord | `changeme_in_production` |
| `RABBITMQ_URL` | Volledige RabbitMQ verbindingsstring | `amqp://akademia:changeme_in_production@rabbitmq:5672` |
| `REDIS_URL` | Redis verbindingsstring | `redis://redis:6379` |
| `JWT_SECRET` | Geheime sleutel vir JWT-tokens | `replace_with_64_random_bytes_in_production` |
| `JWT_ACCESS_EXPIRY` | Vervaltyd van toegangstoken | `15m` |
| `JWT_REFRESH_EXPIRY` | Vervaltyd van verfristoken | `7d` |
| `BACKEND_PORT` | Poort waarop die backend luister | `3000` |
| `NODE_ENV` | Omgewingsmodus | `development` |
| `EXPO_PUBLIC_API_URL` | Backend URL vir die mobiele toepassing | `http://10.0.2.2:3000` |

> Genereer 'n veilige `JWT_SECRET` met: `openssl rand -hex 32`

---

## Opstelling

### 1. Docker-dienste (MongoDB, RabbitMQ, Redis)

Die backend is afhanklik van MongoDB, RabbitMQ, en Redis. Begin al drie met Docker:

```bash
docker compose up
```

Verifieer dat alle dienste gesond is:

```bash
docker compose ps
```

Eindpunte na opstart:

| Diens | URL |
|---|---|
| Backend API | `http://localhost:3000` |
| RabbitMQ-bestuurskoppelvlak | `http://localhost:15672` |
| MongoDB | `mongodb://localhost:27017` |
| Redis | `redis://localhost:6379` |

### 2. Web-toepassing

```bash
cd apps/web
npm install
npm run dev
```

Die web-dashboard is beskikbaar by `http://localhost:3001`.

### 3. Mobiele toepassing

```bash
cd apps/mobile
npm install
```

Stel die korrekte `EXPO_PUBLIC_API_URL` in jou `.env` in volgens jou teiken:

| Teiken | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android-emulator | `http://10.0.2.2:3000` |
| iOS-simulator | `http://localhost:3000` |
| Fisiese toestel | `http://<jou-LAN-IP>:3000` |

> Om jou LAN-IP op Windows te vind: `ipconfig` -> soek IPv4-adres onder jou aktiewe adapter.

Begin die Expo-ontwikkelingsbediener:

```bash
npm start
```

| Opdrag | Aksie |
|---|---|
| `a` in terminaal | Maak Android-emulator oop |
| `i` in terminaal | Maak iOS-simulator oop (slegs macOS) |
| `w` in terminaal | Maak webblaaier oop |

---

## Produksie-ontplooiing

Die stelsel loop in produksie op 'n self hosted k3s-Kubernetes-cluster (3 Raspberry Pi's - Mater(Pi5), Node1(Pi4), Node2(PI4)), met publieke HTTPS-toegang via 'n Cloudflare Tunnel (die cluster is agter CGNAT, dus is geen port-forwarding moontlik nie).

| Onderdeel | Waar |
|---|---|
| K8s-manifeste (databasisse, backend, web, cloudflared, NetworkPolicy) | [`deploy/`](deploy/) |
| Backend-houerbeeld | `ghcr.io/koek1/span4-backend` |
| Web-houerbeeld | `ghcr.io/koek1/span4-web` |
| Publieke URL's | `https://web.use-agora.com` · `https://api.use-agora.com` |
| CI (bou + stoot houerbeelde) | [`.gitlab-ci.yml`](.gitlab-ci.yml) — ontplooiing na die cluster bly 'n **handmatige** `kubectl apply`-stap |

Belangrike verskil tussen `NEXT_PUBLIC_API_URL` (web) / `EXPO_PUBLIC_API_URL` (mobiel) en `API_URL` (web, bediener-kant): die `NEXT_PUBLIC_`/`EXPO_PUBLIC_`-veranderlikes word tydens **bou-tyd** in die JavaScript-bundel vasgebak — 'n verandering hier vereis 'n nuwe houerbeeld-bou (web) of 'n nuwe EAS-bou (mobiel), nie net 'n herbegin nie. `API_URL` (sonder voorvoegsel) word wel tydens **loop-tyd** deur die Next.js-bediener self gelees, en wys na die interne cluster-adres van die backend.

'n Nuwe `/api/v1/health/live` en `/api/v1/health/ready` eindpunt is bygevoeg spesifiek vir Kubernetes se readiness/liveness-toetse (`/ready` bevestig 'n werklike Mongo-verbinding, nie net dat die proses loop nie).

### Plaaslike toetsing bly ongeraak

Bogenoemde produksie-opset verander niks aan die plaaslike ontwikkelingsvloei hierbo nie — `docker compose up`, `npm run dev`, en `npx expo start` werk soos voorheen, teen jou plaaslike MongoDB/RabbitMQ/Redis. Om tydelik teen die **produksie**-API te toets sonder 'n nuwe bou:

```bash
# Web (in apps/web/, tydelike terminaal-sessie):
$env:API_URL="https://api.use-agora.com"; npm run dev

# Mobiel (in apps/mobile/):
$env:EXPO_PUBLIC_API_URL="https://api.use-agora.com/api/v1"; npx expo start
```

Vir 'n installeerbare APK om op 'n fisiese toestel te toets (met die produksie-API reeds vasgebak, sien `apps/mobile/eas.json`):

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

---

## Kenmerke van Stelsel

### Geleentheidskeping
Skep en bestuur funksies met besonderhede soos datum, ligging, kapasiteit, en begroting.
- Web: `http://localhost:3001/events/create`

### RSVP-vloei
Gebruikers kan registreer vir geleenthede en hul RSVP-status bestuur.
- Web: `http://localhost:3001/events`
- API: `POST /api/v1/rsvp`

### Dashboard-statistieke
Admins en dosente sien 'n oorsig van bywoning, begroting, en bevredigingsgraderings.
- Web: `http://localhost:3001/dashboard`

### Gebruikersprofiel
Gebruikers kan hul akademiese titel opstel via die profielblad.
- Web: `http://localhost:3001/profile`

### Gebruikersbestuur
Admins kan alle geregistreerde gebruikers sien en bestuur.
- Web: `http://localhost:3001/users`

---

## Projekstruktuur

```
span4/
├── apps/
│   ├── backend/        # NestJS API (Dockerfile, src/health/ vir k8s probes)
│   ├── web/             # Next.js 14 web-dashboard (Dockerfile, standalone output)
│   ├── mobile/          # React Native + Expo mobiele toepassing (eas.json)
│   ├── ml/              # LSTM bywoning-voorspeller (predict.py, deur backend as kindproses aangeroep)
│
├── deploy/              # Produksie k8s-manifeste (databasisse, backend, web, cloudflared, NetworkPolicy)
├── .gitlab-ci.yml       # CI: bou + stoot houerbeelde na GHCR (ontplooiing bly handmatig)
├── .dockerignore
├── docker-compose.yaml  # Plaaslike ontwikkeling (MongoDB/RabbitMQ/Redis)
├── .env.example
└── README.md
```