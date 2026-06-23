<p align="center">
  <img src="404_logo_transparent.png" alt="Akademia Funksiebestuurstelsel Banner" width="100%" />
</p>

# Span 404
# Akademia Funksiebestuurstelsel

Die **Akademia Funksiebestuurstelsel** is 'n omvattende platform wat ontwikkel is vir die doeltreffende bestuur van Akademia-spesifieke funksies, insluitend sportbyeenkomste, glasieklink, kultuuraande en meer. Die stelsel bestaan uit:

- **Webinterface** (Next.js)
- **Mobiele toepassing** (React Native Expo)
- **Sentrale backend** (NestJS) met MongoDB as databasis

'n **LSTM-neurale netwerk** word geïntegreer om voorspellende analise te doen tydens die skep van nuwe funksies, soos vir begrotings, verwagte opkoms en benodigde hulpbronne. Hierdie oplossing stel beplanners in staat om datagedrewe besluite te neem en proaktief te bestuur.

# Akademia Funksiebestuurstelsel — Pre-Alpha

## Vinnige Begin

```bash
# 1. Kopieer die omgewingslêer
cp .env.example .env

# 2. Genereer 'n sterk JWT-geheim en vervang dit in .env
openssl rand -hex 32

# 3. Begin alle dienste
docker compose up --build

# 4. Verifieer dat alle dienste gesond is
docker compose ps

# 5. Maak die RabbitMQ-bestuurskoppelvlak oop
open http://localhost:15672  # gebruiker: akademia, wagwoord: sien .env
```

## Eindpunte

- Backend API: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`
- RabbitMQ AMQP: `amqp://localhost:5672`
- RabbitMQ-koppelvlak: `http://localhost:15672`
- Redis: `redis://localhost:6379`

## Mobiel

Die mobiele toepassing is gebou met **React Native + Expo 50** en kommunikeer met dieselfde NestJS-backend. Die backend moet aan die gang wees voordat jy die toepassing begin.

### Vereistes

| Hulpmiddel | Minimum weergawe | Notas |
|---|---|---|
| Node.js | 18+ | |
| Expo Go-toepassing | nuutste | Installeer op jou foon vanaf die App Store / Play Store |
| Android Studio | Hedgehog+ | Slegs benodig vir Android-emulator |
| Xcode | 15+ | Slegs benodig vir iOS-simulator — slegs macOS |

### Installasie

```bash
cd apps/mobile
npm install
```

### Stel die API-URL in

Die toepassing lees `EXPO_PUBLIC_API_URL` vanaf die hoof `.env`-lêer om die backend te bereik. Die verstekwaarde werk vir 'n Android-emulator. Verander dit as jy 'n ander teiken gebruik:

| Teiken | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android-emulator | `http://10.0.2.2:3000` ← verstek |
| iOS-simulator | `http://localhost:3000` |
| Fisiese toestel | `http://<jou-masjien-LAN-ip>:3000` |

Om jou masjien se LAN-IP op Windows te vind: `ipconfig` → soek vir IPv4-adres onder jou aktiewe adapter.

### Uitvoer

```bash
# Begin die Expo-ontwikkelingsbediener — scan die QR-kode met Expo Go op jou foon
npm start

# Maak direk oop in 'n lopende Android-emulator
npm run android

# Maak direk oop in die iOS-simulator (slegs macOS)
npm run ios

# Maak oop in blaaier vir 'n vinnige webvoorskou
# Eerste keer slegs: npx expo install react-native-web react-dom @expo/metro-runtime
npm run web
```

> **Wenk:** druk `a` in die Expo-terminaal om die Android-emulator oop te maak, `i` vir iOS-simulator, of `w` vir web — geen herstart van die bediener nodig nie.
