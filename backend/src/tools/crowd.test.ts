import { crowd } from './crowd';
import db from '../db';

// Mock the db module
jest.mock('../db', () => ({
  __esModule: true,
  default: {
    prepare: jest.fn(),
  },
}));

describe('crowd tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error if venue_id is missing', async () => {
    const result = await crowd({});
    expect(result.success).toBe(false);
    expect(result.error).toBe('venue_id is required');
  });

  it('should map occupancy levels to correct status strings', async () => {
    const mockAll = jest.fn().mockReturnValue([
      { venue_id: 'metlife', gate_id: 'gate-a', occupancy: 90, updated_at: '2026-07-19T12:00:00Z' },
      { venue_id: 'metlife', gate_id: 'gate-b', occupancy: 70, updated_at: '2026-07-19T12:00:00Z' },
      { venue_id: 'metlife', gate_id: 'gate-c', occupancy: 50, updated_at: '2026-07-19T12:00:00Z' },
      { venue_id: 'metlife', gate_id: 'gate-d', occupancy: 30, updated_at: '2026-07-19T12:00:00Z' },
    ]);
    (db.prepare as jest.Mock).mockReturnValue({
      all: mockAll,
    });

    const result = await crowd({ venue_id: 'metlife' });

    expect(result.success).toBe(true);
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    expect(mockAll).toHaveBeenCalledWith('metlife');

    const data = result.data as { venue_id: string; gates: Array<{ gate_id: string; occupancy: number; status: string }> };
    expect(data.venue_id).toBe('metlife');
    expect(data.gates).toHaveLength(4);
    expect(data.gates[0]).toEqual({ gate_id: 'gate-a', occupancy: 90, status: 'very busy', updated_at: '2026-07-19T12:00:00Z' });
    expect(data.gates[1]).toEqual({ gate_id: 'gate-b', occupancy: 70, status: 'busy', updated_at: '2026-07-19T12:00:00Z' });
    expect(data.gates[2]).toEqual({ gate_id: 'gate-c', occupancy: 50, status: 'moderate', updated_at: '2026-07-19T12:00:00Z' });
    expect(data.gates[3]).toEqual({ gate_id: 'gate-d', occupancy: 30, status: 'quiet', updated_at: '2026-07-19T12:00:00Z' });
  });

  it('should handle database errors gracefully', async () => {
    (db.prepare as jest.Mock).mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const result = await crowd({ venue_id: 'metlife' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Database connection failed');
  });
});
