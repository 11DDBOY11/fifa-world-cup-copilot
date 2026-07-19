import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { orchestrate, client } from './orchestrator';
import { venues } from './config/venues';
import db from './db';

// --- Env validation (Task 0 requirement: fail loudly if any key is missing) ---
const REQUIRED_ENV = [
  'GROQ_API_KEY',
  'VOYAGE_API_KEY',
  'MAPBOX_ACCESS_TOKEN',
  'OPENWEATHER_API_KEY',
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Environment variable ${key} is not set.`);
    console.error('Copy backend/.env.example to backend/.env and fill in all keys.');
    process.exit(1);
  }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === FRONTEND_ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json());

interface ChatRequestBody {
  session_id: string;
  message: string;
  venue_id: string;
}

interface GeneralInfoRequestBody {
  stadium_name: string;
  host_city: string;
}

// POST /chat — main chat endpoint
app.post('/chat', async (req: Request<object, object, ChatRequestBody>, res: Response) => {
  const { session_id, message, venue_id } = req.body;

  if (!session_id || typeof session_id !== 'string') {
    res.status(400).json({ error: 'session_id is required and must be a string' });
    return;
  }
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required and must be a string' });
    return;
  }
  if (!venue_id || typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id is required and must be a string' });
    return;
  }

  const validVenueIds = venues.map((v) => v.id);
  if (!validVenueIds.includes(venue_id)) {
    res.status(400).json({ error: `venue_id must be one of: ${validVenueIds.join(', ')}` });
    return;
  }

  try {
    const reply = await orchestrate(session_id, message, venue_id);
    res.json({ reply });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('Error in /chat:', errMessage);
    res.status(500).json({ error: 'Internal server error', detail: errMessage });
  }
});

// POST /general-info — plain knowledge info endpoint for Coming soon stadiums
app.post('/general-info', async (req: Request<object, object, GeneralInfoRequestBody>, res: Response) => {
  const { stadium_name, host_city } = req.body;

  if (!stadium_name || typeof stadium_name !== 'string') {
    res.status(400).json({ error: 'stadium_name is required and must be a string' });
    return;
  }
  if (!host_city || typeof host_city !== 'string') {
    res.status(400).json({ error: 'host_city is required and must be a string' });
    return;
  }

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'You are Fan Copilot. Answer briefly and factually about real-world stadiums using your general knowledge — capacity, notable history, what makes it distinctive. Keep it to 2-3 sentences, conversational, suitable for a mobile chat window. If you\'re not confident about a specific fact, say so rather than guessing precisely.',
        },
        {
          role: 'user',
          content: `Tell me about ${stadium_name} in ${host_city}.`,
        },
      ],
    });

    const reply = response.choices[0].message.content || '';
    res.json({ reply });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('Error in /general-info:', errMessage);
    res.status(500).json({ error: 'Internal server error', detail: errMessage });
  }
});

// GET /venues — returns all venue metadata so the frontend can populate
// the venue selector without hardcoding any venue names or IDs.
app.get('/venues', (_req: Request, res: Response) => {
  res.json(venues);
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Fan Copilot backend listening on port ${PORT}`);
  });

  // ── Crowd Simulator (runs in-process) ──────────────────────────────────────
  // Identical sine-wave logic from crowd-simulator.ts, now started automatically
  // when the server boots so Railway doesn't need a second process/script.

  const CROWD_UPDATE_INTERVAL_MS = 5_000;

  const venueIndexMap: Record<string, number> = {};
  venues.forEach((v, idx) => { venueIndexMap[v.id] = idx; });

  const updateCrowdRow = db.prepare(
    'UPDATE crowd_status SET occupancy = ?, updated_at = ? WHERE venue_id = ? AND gate_id = ?'
  );

  const computeOccupancy = (venueId: string, gateIndex: number, t: number): number => {
    const venueIndex = venueIndexMap[venueId] ?? 0;
    const phase = (venueIndex * Math.PI) / 3 + (gateIndex * Math.PI) / 4;
    const raw = Math.sin(t / 20 + phase); // ~125 s period
    const occupancy = Math.round(20 + ((raw + 1) / 2) * 75);
    return Math.max(20, Math.min(95, occupancy));
  };

  let crowdTick = 0;

  const runCrowdTick = (): void => {
    const now = new Date().toISOString();
    for (const venue of venues) {
      venue.gates.forEach((gateId, gateIndex) => {
        const occupancy = computeOccupancy(venue.id, gateIndex, crowdTick);
        updateCrowdRow.run(occupancy, now, venue.id, gateId);
      });
    }
    crowdTick++;
  };

  runCrowdTick(); // run once immediately on boot
  setInterval(runCrowdTick, CROWD_UPDATE_INTERVAL_MS);
  console.log('Crowd simulator running in-process (updating every 5 s).');
}


