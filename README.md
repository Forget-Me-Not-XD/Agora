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

## Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Generate a strong JWT secret and replace in .env
openssl rand -hex 32

# 3. Start all services
docker compose up --build

# 4. Verify services are healthy
docker compose ps

# 5. Open RabbitMQ management UI
open http://localhost:15672  # user: akademia, pass: see .env
```

## Endpoints

- Backend API: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`
- RabbitMQ AMQP: `amqp://localhost:5672`
- RabbitMQ UI: `http://localhost:15672`
- Redis: `redis://localhost:6379`

## Mobile

The mobile app is built with **React Native + Expo 50** and talks to the same NestJS backend. The backend must be running before you launch the app.

### Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 18+ | |
| Expo Go app | latest | Install on your phone from the App Store / Play Store |
| Android Studio | Hedgehog+ | Required only for Android emulator |
| Xcode | 15+ | Required only for iOS simulator — macOS only |

### Install

```bash
cd apps/mobile
npm install
```

### Configure the API URL

The app reads `EXPO_PUBLIC_API_URL` from the root `.env` to reach the backend. The default value works for an Android emulator. Change it if you're using a different target:

| Target | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:3000` ← default |
| iOS simulator | `http://localhost:3000` |
| Physical device | `http://<your-machine-LAN-ip>:3000` |

To find your machine's LAN IP on Windows: `ipconfig` → look for IPv4 Address under your active adapter.

### Run

```bash
# Start the Expo dev server — scan the QR code with Expo Go on your phone
npm start

# Open directly in a running Android emulator
npm run android

# Open directly in the iOS simulator (macOS only)
npm run ios

# Open in browser for a quick web preview
# First time only: npx expo install react-native-web react-dom @expo/metro-runtime
npm run web
```

> **Tip:** press `a` in the Expo terminal to open the Android emulator, `i` for iOS simulator, or `w` for web — no need to restart the server.