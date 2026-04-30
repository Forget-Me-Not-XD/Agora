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

```bash
cd apps/mobile
npm install
npx expo start
```