import 'dotenv/config';
import db from '../db';
import { venues } from '../config/venues';

const UPDATE_INTERVAL_MS = 5000;

const update = db.prepare(
  'UPDATE crowd_status SET occupancy = ?, updated_at = ? WHERE venue_id = ? AND gate_id = ?'
);

// Map venues to indexes for offset calculations
const venueIndexMap: Record<string, number> = {};
venues.forEach((v, index) => {
  venueIndexMap[v.id] = index;
});

function computeOccupancy(venueId: string, gateId: string, gateIndex: number, t: number): number {
  const venueIndex = venueIndexMap[venueId] ?? 0;
  // Offset formula to make each venue/gate unique
  const phase = (venueIndex * Math.PI) / 3 + (gateIndex * Math.PI) / 4;
  const raw = Math.sin(t / 20 + phase); // period ~125s
  const occupancy = Math.round(20 + ((raw + 1) / 2) * 75);
  return Math.max(20, Math.min(95, occupancy));
}

let tick = 0;

function runTick(): void {
  const now = new Date().toISOString();

  for (const venue of venues) {
    venue.gates.forEach((gateId, gateIndex) => {
      const occupancy = computeOccupancy(venue.id, gateId, gateIndex, tick);
      update.run(occupancy, now, venue.id, gateId);
    });
  }

  // Print current state for a subset of gates to verify
  const rows = db
    .prepare('SELECT venue_id, gate_id, occupancy FROM crowd_status ORDER BY venue_id, gate_id')
    .all() as { venue_id: string; gate_id: string; occupancy: number }[];

  const summary = venues
    .map((v) => {
      const gateSummary = rows
        .filter((r) => r.venue_id === v.id)
        .map((r) => `${r.gate_id}: ${r.occupancy}%`)
        .join(', ');
      return `[${v.name}] ${gateSummary}`;
    })
    .join('  |  ');

  console.log(`[${now}] ${summary}`);

  tick++;
}

console.log('Multi-venue crowd simulator started. Updating every 5 seconds...');
runTick(); // run once immediately
setInterval(runTick, UPDATE_INTERVAL_MS);
