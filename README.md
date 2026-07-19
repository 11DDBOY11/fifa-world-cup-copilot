# ⚽ Fan Copilot

**A GenAI-powered stadium companion for FIFA World Cup 2026 fans.**

Fan Copilot helps fans navigate stadiums, check real-time crowd levels, get live weather, and ask questions in their own language — all through a single conversational assistant that reasons over live data instead of guessing.

🔗 **Live app**: [your-vercel-url.vercel.app](https://fifa-world-cup-copilot.vercel.app)
💻 **Backend API**: [your-railway-url.up.railway.app](https://fifa-world-cup-copilot-production.up.railway.app)

Built for **Challenge 4 — GenAI Exchange**, hosted by Hack2skill in partnership with Google for Developers.

---

## What it does

A fan opens the app, picks their venue, and asks anything — Fan Copilot decides which tool to call, gets real data, and answers conversationally:

> "How do I get to Gate B from the metro station, and is it busy right now?"

The assistant calls **navigation** and **crowd** tools in the same turn, merges the results, and replies in one coherent, localized answer — in the fan's own language, using the venue's correct units (km vs. miles).

## Key features

| Feature | How it works |
|---|---|
| 🧠 **Real tool-calling AI** | Groq (Llama 3.3 70B) reasons over 4 tools — not a scripted chatbot, an actual agentic loop |
| 🗺️ **Live navigation** | Real routes via Mapbox, geocoded and biased to each venue's location |
| 🌤️ **Live weather** | Real current conditions via OpenWeatherMap, in the venue's native unit system |
| 👥 **Crowd awareness** | Simulated real-time gate occupancy, updated every 5 seconds |
| 📚 **Venue knowledge (RAG)** | Gate maps, accessibility info, and transit options retrieved from a vector-indexed knowledge base, strictly isolated per venue |
| 🗣️ **Multilingual** | Responds in the fan's language automatically — English and Spanish supported |
| 🧵 **Conversation memory** | Follow-up questions ("is *it* busy?") resolve correctly using real chat history |
| 🌍 **Multi-venue, multi-country** | MetLife Stadium (USA), Estadio Azteca (Mexico), BC Place (Canada) — architected so adding a venue is a *data* change, not a *code* change |
| 🎨 **Rich landing experience** | Football history, all 24 World Cup champions (1930–2026), and a showcase of official 2026 venues alongside legendary stadiums worldwide |
| 🌗 **Light/dark theme** | Defaults to system preference, togglable, persisted |

## A note on honesty

Two things Fan Copilot deliberately does *not* fake:
- If asked for **transit directions**, it's upfront that live public-transit routing isn't available on the current mapping tier, and shows driving directions instead — it never mislabels one as the other.
- The **2026 World Cup champion** is correctly shown as "pending" in the historical record, not guessed — the assistant doesn't invent outcomes for events that haven't happened yet.

---

## Architecture

```
Fan (web/mobile browser)
        │
        ▼
Frontend — React + Vite + TypeScript + Tailwind
        │  HTTP
        ▼
Backend — Express + TypeScript
        │
        ▼
Orchestrator — Groq (Llama 3.3 70B) tool-use loop
        │
   ┌────┼──────────┬─────────────┐
   ▼    ▼          ▼             ▼
Navigation  Weather      Crowd        Knowledge
(Mapbox)   (OpenWeather) (SQLite,     (Vectra + VoyageAI
                          simulated)   embeddings, RAG)
```

Every tool call is scoped to a `venue_id`, injected server-side — the model never guesses which venue's data to touch, and cross-venue data leakage is structurally prevented, not just prompted against.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js, TypeScript, Express |
| LLM | Groq API — `llama-3.3-70b-versatile`, function calling |
| Vector search | Vectra (local, file-based — no external vector DB service) |
| Embeddings | VoyageAI |
| Database | SQLite (`better-sqlite3`) |
| Navigation | Mapbox Directions + Geocoding |
| Weather | OpenWeatherMap |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Deployment | Railway (backend), Vercel (frontend) |

## Supported venues

| Venue | City | Country | Status |
|---|---|---|---|
| MetLife Stadium | East Rutherford, NJ | USA | ✅ Live — full tool access |
| Estadio Azteca | Mexico City | Mexico | ✅ Live — full tool access |
| BC Place | Vancouver, BC | Canada | ✅ Live — full tool access |
| Sree Kanteerava Stadium | Bangalore | India | ✅ Live (bonus demo venue — **not** an official 2026 host city) |
| 12 remaining official 2026 venues | USA / Mexico / Canada | — | Shown on the landing page for reference; not yet wired into live tools |

Adding a new venue to the live assistant means adding one config entry and a few knowledge-base documents — no changes to the orchestrator, tools, or frontend logic required.

---

## Getting started locally

### Prerequisites
- Node.js 20.x
- API keys for: [Groq](https://console.groq.com), [Voyage AI](https://dash.voyageai.com), [Mapbox](https://mapbox.com), [OpenWeatherMap](https://openweathermap.org/api)

### Backend
```bash
cd backend
npm install
cp .env.example .env   # then fill in your real API keys
npm run build           # compiles TypeScript AND builds the RAG index
npm start                # or `npm run dev` for local development
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env    # set VITE_BACKEND_URL to your backend's address
npm run dev
```

Visit `http://localhost:5173`.

### Environment variables

**Backend** (`backend/.env`):
```
GROQ_API_KEY=
VOYAGE_API_KEY=
MAPBOX_ACCESS_TOKEN=
OPENWEATHER_API_KEY=
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```
VITE_BACKEND_URL=http://localhost:3001
```

---

## API reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/chat` | POST | Main conversational endpoint — `{ session_id, message, venue_id }` → `{ reply }` |
| `/general-info` | POST | Fallback knowledge for venues not yet wired with live tools — `{ stadium_name, host_city }` → `{ reply }` |
| `/venues` | GET | Returns all configured venues and their metadata |

---

## Known limitations

Transparency over polish — things worth knowing if you're evaluating or extending this:

- **Crowd data is simulated**, not sourced from real stadium sensors (no public API for this exists yet)
- **Transit routing** falls back to driving directions, disclosed honestly in every response
- **SQLite storage is ephemeral** on the current free-tier deployment — chat history and crowd state reset on redeploy
- **RAG knowledge base** currently covers gate maps, accessibility, and transit for 4 venues — match/event schedule data is not yet included

## Roadmap

- Real-time match schedule and kickoff-time awareness
- Additional languages (French for Canada, Portuguese, others)
- Sustainability guidance (transit vs. car carbon estimates)
- Expand live tool coverage to all 16 official 2026 venues
- Architecture is designed to extend to **future tournaments** (2030, 2034) as a data layer, following the same pattern already proven when this project's venue list was expanded without any orchestrator or tool code changes

---

## Acknowledgments

Built for **Challenge 4 — GenAI Exchange**, organized by **Hack2skill** in partnership with **Google for Developers**.

## License

MIT
