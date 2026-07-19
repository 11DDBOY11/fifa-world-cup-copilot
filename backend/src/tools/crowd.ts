import db from '../db';
import { ToolResult } from './types';

interface CrowdRow {
  venue_id: string;
  gate_id: string;
  occupancy: number;
  updated_at: string;
}

export async function crowd(input: Record<string, unknown>): Promise<ToolResult> {
  try {
    const venueId = input.venue_id as string;
    if (!venueId) {
      return { success: false, error: 'venue_id is required' };
    }

    const rows = db
      .prepare('SELECT venue_id, gate_id, occupancy, updated_at FROM crowd_status WHERE venue_id = ? ORDER BY gate_id')
      .all(venueId) as CrowdRow[];

    const gates = rows.map((row) => ({
      gate_id: row.gate_id,
      occupancy: row.occupancy,
      status:
        row.occupancy >= 80
          ? 'very busy'
          : row.occupancy >= 60
          ? 'busy'
          : row.occupancy >= 40
          ? 'moderate'
          : 'quiet',
      updated_at: row.updated_at,
    }));

    return { success: true, data: { venue_id: venueId, gates } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
