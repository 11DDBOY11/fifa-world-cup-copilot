# Fan Copilot

AI-powered assistant for FIFA World Cup 2026 attendees.

## Setup

### Backend
```bash
cd backend
cp .env.example .env
# Fill in all API keys in .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### RAG Index (one-time)
```bash
cd backend
npx ts-node src/rag/build-index.ts
```

### Crowd Simulator (run alongside backend)
```bash
cd backend
npx ts-node src/simulator/crowd-simulator.ts
```

## Environment Variables

See `backend/.env.example` for required keys.

## Demo Script

1. Fan asks in Spanish for directions to Gate B → gets a localized route.
2. Fan asks "is gate B busy?" → gets current occupancy from the simulator.
3. Fan asks "where's the accessible restroom?" → gets an answer pulled from the knowledge base.
4. Fan asks "should I take transit today?" → gets a transit-mode route + current weather context.
