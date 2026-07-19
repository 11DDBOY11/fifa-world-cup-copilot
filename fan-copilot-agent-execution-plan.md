# Fan Copilot — Agent Execution Plan (v2)

**This document is the single source of truth. Any AI coding agent (Claude Code, Cursor,
Antigravity, etc.) executing this project must follow it literally. v2 supersedes v1 —
if you already ran Task 0, keep going, but Tasks 1-4 and 6 have changed below. Do not mix
instructions from an old copy of this file.**

## v2 change note — why this version exists

v1 silently assumed a single stadium. The real FIFA World Cup 2026 spans 16 venues across
three countries (Canada, Mexico, United States) — each with its own language defaults,
measurement units, currency, and transit system. v2 makes the system venue-aware: every
gate, every knowledge doc, and every tool call is now scoped to a specific venue, instead
of assuming there's only one. This is a **data-population decision, not a full 16-venue
build**: the plan seeds only 3 venues (one per host country) to prove the architecture
generalizes. Adding the remaining 13 later means adding data files and one config entry —
not writing new code. If an agent finds itself writing venue-specific logic in code rather
than adding a data file, that's a sign the abstraction is being violated — stop and flag it.

## Rules for the agent (read first, follow always)

1. Do not introduce libraries, frameworks, architectures, file structures, or design patterns
   not named in this document. If something isn't specified, stop and ask the user — do not
   substitute your own judgment.
2. Execute tasks **in order**. Do not start Task N+1 before Task N's acceptance criteria pass.
3. Do not refactor, rename, or reorganize files outside the scope of the current task.
4. Do not add authentication, payments, extra pages, animations, or "nice to haves" that
   aren't listed. Scope creep is a failure, not a bonus.
5. After each task, run the acceptance test listed and report pass/fail before continuing.
6. If an API key is missing, stop and print exactly which env var is needed — do not mock
   around it silently and do not invent a placeholder that looks like a real key.

---

## 1. Fixed tech stack (final — no substitutions)

| Layer | Choice | Package |
|---|---|---|
| Backend runtime | Node.js 20, TypeScript | — |
| Backend framework | Express | `express` |
| LLM | Anthropic Claude API, tool-use mode | `@anthropic-ai/sdk` |
| Knowledge base / RAG | Local vector search, no external vector DB service | `vectra` |
| Embeddings | Voyage AI embeddings (Anthropic's recommended embedding partner) | `voyageai` (REST call, no SDK needed) |
| Database | SQLite, file-based | `better-sqlite3` |
| Maps / navigation | Google Maps Platform — Directions API, Places API | REST calls via `axios` |
| Transit | Google Maps Directions API with `mode=transit` (no separate GTFS integration in MVP) | same as above |
| Weather | OpenWeatherMap API (free tier) | REST calls via `axios` |
| Crowd data | Synthetic simulator script (no real sensor feed exists publicly) | custom Node script |
| Voice (STT/TTS) | Browser-native Web Speech API (zero cost, Phase 3 only) | none (browser built-in) |
| Frontend | React + Vite + TypeScript | `vite`, `react` |
| Styling | Tailwind CSS | `tailwindcss` |
| Frontend HTTP | `fetch` (native) | — |

No Pinecone, no Weaviate, no Firebase, no Next.js, no GraphQL, no Docker (for MVP). If the
agent believes one of these would be "better," it still does not use it — flag it to the
user in a note instead.

---

## 2. Repository structure (create exactly this)

```
fan-copilot/
├── backend/
│   ├── src/
│   │   ├── index.ts                # Express app entrypoint
│   │   ├── orchestrator.ts         # Claude tool-use loop
│   │   ├── config/
│   │   │   └── venues.ts           # Single source of truth: all venue metadata
│   │   ├── tools/
│   │   │   ├── navigation.ts       # Google Maps Directions/Places wrapper (venue-aware)
│   │   │   ├── weather.ts          # OpenWeatherMap wrapper (venue-aware)
│   │   │   ├── crowd.ts            # Reads synthetic crowd data (venue-aware)
│   │   │   └── knowledge.ts        # RAG lookup over vectra index (venue-aware)
│   │   ├── rag/
│   │   │   ├── build-index.ts      # One-time script: embeds docs/**/*.md into vectra
│   │   │   └── docs/
│   │   │       ├── metlife/        # New York/New Jersey, USA — English, imperial units
│   │   │       ├── azteca/         # Mexico City, Mexico — Spanish, metric units
│   │   │       └── bc-place/       # Vancouver, Canada — English/French, metric units
│   │   ├── simulator/
│   │   │   └── crowd-simulator.ts  # Generates fake gate occupancy data every 5s
│   │   └── db.ts                   # SQLite setup (crowd data table, chat log table)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                 # Chat UI, single page
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── LanguageToggle.tsx
│   │   └── api.ts                  # calls backend /chat endpoint
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

Do not add files outside this tree without explicit instruction in a later task.

---

## 3. Environment variables (exact names, set in `backend/.env`)

```
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
GOOGLE_MAPS_API_KEY=
OPENWEATHER_API_KEY=
PORT=3001
```

Task 0 must fail loudly and stop if any of these are missing — never proceed with a fake key.

---

## 4. Data contracts (exact schemas — do not deviate)

### Venue config (`backend/src/config/venues.ts`) — exact shape, seed with exactly 3 entries
```typescript
interface Venue {
  id: string;            // "metlife" | "azteca" | "bc-place" — matches docs/ folder name
  name: string;          // "MetLife Stadium"
  city: string;          // "East Rutherford, NJ" — used for weather/transit lookups
  country: "USA" | "Canada" | "Mexico";
  lat: number;
  lng: number;
  default_language: string;   // "en" | "es" | "en"
  unit_system: "imperial" | "metric";
  gates: string[];        // e.g. ["gate-a", "gate-b", "gate-c", "gate-d"]
}
```
Seed exactly these 3 venues. Do not add more without explicit instruction — expanding
venue coverage later is a data task (new docs folder + one array entry here), not a
reason to change any tool or orchestrator code.

### Crowd data record (SQLite table `crowd_status`)
```
venue_id     TEXT               -- references Venue.id, e.g. "metlife"
gate_id      TEXT               -- e.g. "gate-a", "gate-b", "gate-c", "gate-d"
occupancy    INTEGER            -- 0-100, percent full
updated_at   TEXT               -- ISO 8601 timestamp
PRIMARY KEY (venue_id, gate_id)
```

### Chat log record (SQLite table `chat_log`)
```
id           INTEGER PRIMARY KEY AUTOINCREMENT
session_id   TEXT
role         TEXT               -- "user" | "assistant"
content      TEXT
created_at   TEXT
```

### Knowledge base doc format (`backend/src/rag/docs/<venue_id>/*.md`)
Plain markdown files, one topic per file, nested under a folder named for the venue's
`id` (must match `venues.ts` exactly: `metlife/`, `azteca/`, `bc-place/`). No frontmatter,
no special format — `build-index.ts` embeds the whole file content as one chunk per file,
tagging each vector with its `venue_id` (derived from the parent folder name) so retrieval
can be filtered to the fan's current venue. No chunking logic in Phase 1.

Each venue folder gets exactly 3 files for Phase 1 (trimmed from v1's 5, to keep the
3-venue seed manageable): `gate-map.md`, `accessible-info.md`, `transit-options.md`.
Content must reflect the real venue: Azteca's docs in Spanish with metric distances,
MetLife's in English with imperial distances, BC Place's in English noting bilingual
signage. This is the one place free drafting is fine — it's content, not architecture.

### Tool interface (all tools in `backend/src/tools/*.ts` must export this shape)
```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
// Each tool file exports one async function: (input: Record<string, unknown>) => Promise<ToolResult>
```

---

## 5. Task list — execute strictly in this order

### Task 0 — Project scaffold
- Create the folder structure in section 2 exactly.
- Initialize `backend` and `frontend` as separate npm projects.
- Install exactly the packages listed in section 1 (plus `typescript`, `ts-node`, `dotenv`,
  `cors`, `axios`, `@types/express`, `@types/node` as dev/support deps).
- Create `.env.example` with the keys from section 3, values blank.
- **Acceptance test:** `npm run dev` in both `backend/` and `frontend/` starts without
  errors (backend prints "listening on port 3001", frontend serves on localhost:5173).

### Task 1 — Venue config + knowledge base + RAG
- Write `config/venues.ts` with exactly the 3 venues specified in section 4 (MetLife,
  Azteca, BC Place), matching the `Venue` interface exactly.
- Write 3 markdown files per venue (9 total) in `backend/src/rag/docs/<venue_id>/`:
  `gate-map.md`, `accessible-info.md`, `transit-options.md`. Content should be realistic
  placeholder info matching that venue's real city, language, and unit system (agent may
  draft reasonable placeholder text — this is content, not architecture).
- Write `build-index.ts`: walks all venue subfolders, calls Voyage embeddings API per
  file, stores vectors in a local `vectra` index at `backend/src/rag/index/`, tagging
  each entry with its `venue_id` (parent folder name).
- Write `tools/knowledge.ts`: takes `{query: string, venue_id: string}`, embeds the
  query, does a `vectra` similarity search **filtered to that venue_id**, returns top 2
  matching doc contents as `ToolResult.data`.
- **Acceptance test:** running `build-index.ts` produces index files on disk; calling
  `knowledge.ts` with `{query: "where is the accessible entrance", venue_id: "azteca"}`
  returns Azteca's doc, not MetLife's or BC Place's, even though all 9 docs are indexed.

### Task 2 — Crowd simulator
- Write `simulator/crowd-simulator.ts`: a standalone script that, every 5 seconds, updates
  `crowd_status` for every gate at every venue in `venues.ts` (loop over all 3 venues'
  `gates` arrays) with a semi-realistic pattern (sine-wave-based occupancy between
  20-95% per gate, offset per venue so they don't all move in lockstep).
- Write `tools/crowd.ts`: takes `{venue_id: string}`, reads current `crowd_status` table
  filtered to that venue, returns that venue's gates' occupancy only.
- **Acceptance test:** running the simulator for 30 seconds shows changing values for
  all 3 venues in the `crowd_status` table; calling `tools/crowd.ts` with `venue_id:
  "bc-place"` returns only BC Place's gates, not the other two venues'.

### Task 3 — Navigation + weather tools
- Write `tools/navigation.ts`: given `{origin: string, venue_id: string, mode: "walking"
  | "transit" | "driving"}`, looks up the venue's lat/lng from `venues.ts` as the
  destination, calls Google Maps Directions API, returns route summary (duration,
  distance in the venue's `unit_system`, steps) as `ToolResult.data`.
- Write `tools/weather.ts`: given `{venue_id: string}`, looks up the venue's `city` from
  `venues.ts`, calls OpenWeatherMap, returns current conditions (temperature in the
  venue's `unit_system`) as `ToolResult.data`.
- **Acceptance test:** calling `navigation.ts` with `venue_id: "azteca"` returns a real
  route to Mexico City in kilometers; calling it with `venue_id: "metlife"` returns a
  route in miles. Weather tool returns correct real conditions for each of the 3 cities.

### Task 4 — Orchestrator (Claude tool-use loop)
- Write `orchestrator.ts`: takes `{message: string, session_id: string, venue_id: string}`,
  calls Claude API with all 4 tools (`navigation`, `weather`, `crowd`, `knowledge`)
  registered as tool-use functions. `venue_id` is injected into every tool call the model
  makes — the model does not need to ask the fan which venue they mean, it's already
  known from the session. Runs the tool-use loop (call tool → feed result back → get
  final answer), logs both messages to `chat_log`, returns the final assistant text.
- System prompt (use exactly, agent may only add venue-specific facts, not change behavior
  rules): *"You are Fan Copilot, an assistant for FIFA World Cup 2026 attendees at
  {venue_name} in {venue_city}. Answer in the same language the user writes in, defaulting
  to {default_language} if unclear. Use {unit_system} units. Use the available tools to
  get real information before answering — do not guess at routes, weather, or crowd
  levels. Keep answers short and conversational, suitable for a mobile chat window."*
  (the `{...}` fields are filled from `venues.ts` at request time, not hardcoded)
- **Acceptance test:** POST to `/chat` with `{"message": "how do I get to gate B and is
  it busy", "venue_id": "azteca"}` triggers both the navigation and crowd tools scoped to
  Azteca and returns one coherent answer in Spanish using both. Repeating with
  `venue_id: "metlife"` returns an English answer scoped to MetLife's gates instead.

### Task 5 — Express API
- Write `index.ts`: single route `POST /chat` accepting `{session_id, message, venue_id}`,
  calling `orchestrator.ts`, returning `{reply: string}`. Also add `GET /venues` returning
  the contents of `venues.ts` so the frontend can populate a venue selector without
  hardcoding venue names. CORS enabled for frontend origin only.
- **Acceptance test:** `curl -X POST localhost:3001/chat -d '{"session_id":"test",
  "message":"hi","venue_id":"bc-place"}'` returns a JSON reply; `curl localhost:3001/venues`
  returns all 3 venues.

### Task 6 — Frontend chat UI
- Build `App.tsx` + `ChatWindow.tsx` + `MessageBubble.tsx`: a single-page chat interface,
  message list + input box, calling `POST /chat` on submit, rendering user/assistant bubbles.
- `VenueSelector.tsx` (new component, replaces nothing — add alongside `LanguageToggle.tsx`):
  a dropdown populated from `GET /venues`, required before the fan can send a message —
  this sets `venue_id` for the whole session. Default to no venue selected; do not
  auto-guess a venue.
- `LanguageToggle.tsx`: unchanged from v1 — a simple dropdown (English/Spanish only for
  Phase 1) that prepends a note to the outgoing message like `[respond in Spanish]`.
- **Acceptance test:** on load, the venue dropdown shows all 3 venues; selecting one and
  sending a message produces a reply scoped to that venue (verify by asking about gates —
  the gate names returned should match that venue's `gates` array, not another venue's).

### Task 7 — Integration pass (do not skip)
- Run backend + simulator + frontend together.
- Walk through the demo script below live and fix any breakage found — do not add new
  features while doing this, only fix defects in what Tasks 0-6 built.

---

## 6. Demo script (what "done" looks like for Phase 1)

Run this once per venue to prove the architecture generalizes, not just that one venue works:

1. Select **Azteca** → ask in Spanish for directions to a gate → gets a localized route
   in kilometers.
2. Still at Azteca → ask "is that gate busy?" → gets current occupancy from the simulator,
   scoped to Azteca's gates only.
3. Switch venue to **MetLife** → ask "where's the accessible entrance?" → gets an answer
   pulled from MetLife's knowledge docs (not Azteca's), in English, in miles.
4. Switch venue to **BC Place** → ask "should I take transit today?" → gets a transit-mode
   route + current Vancouver weather.

If all four work end-to-end, across three different venues, three different default
languages, and two different unit systems, without the agent writing any venue-specific
`if` statements in the tool/orchestrator code — only reading from `venues.ts` and the
per-venue doc folders — Phase 1 is complete and the architecture is proven to scale to
the other 13 venues as a data task.

---

## 7. What is explicitly out of scope for this plan (do not build yet)

- All 16 venues' real content (only 3 seeded — see section 4 for why)
- Voice/TTS/STT (Phase 3 — separate task list, not started until Phase 1 passes fully)
- Multi-language beyond English/Spanish (French for Canada is a Phase 3+ addition)
- Real crowd sensors / third-party occupancy data
- User accounts, auth, persistence beyond SQLite
- Deployment/hosting (local dev only for this plan)
- Cross-venue trip planning (e.g. "I'm going to matches in 3 cities this week") — a real
  fan need for a multi-venue tournament, but a distinct feature from single-venue
  assistance and out of scope until Phase 1 is solid

Bringing any of these in early is a deviation from the plan, not initiative.
