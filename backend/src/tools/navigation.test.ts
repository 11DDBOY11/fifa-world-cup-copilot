import { navigation } from './navigation';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('navigation tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error if origin is missing', async () => {
    const result = await navigation({ venue_id: 'metlife' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('origin is required');
  });

  it('should return error if venue_id is missing', async () => {
    const result = await navigation({ origin: 'New York' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('venue_id is required');
  });

  it('should return error if venue_id is unknown', async () => {
    const result = await navigation({ origin: 'New York', venue_id: 'unknown' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown venue_id: unknown');
  });

  it('should return error if mode is invalid', async () => {
    const result = await navigation({ origin: 'New York', venue_id: 'metlife', mode: 'flying' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('mode must be one of');
  });

  it('should fallback to driving mode when transit is requested and provide a note', async () => {
    // 1. Geocoding mock
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        features: [
          { center: [-74.006, 40.7128] }, // [lng, lat] for NY
        ],
      },
    });

    // 2. Directions mock (driving fallback profile)
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        routes: [
          {
            distance: 16093.44, // 10 miles in meters
            duration: 1200,     // 20 minutes
            legs: [
              {
                steps: [
                  { maneuver: { instruction: 'Turn right on route 3' } },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await navigation({ origin: 'New York', venue_id: 'metlife', mode: 'transit' });

    expect(result.success).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/geocoding/'),
      expect.any(Object)
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/directions/v5/mapbox/driving/'),
      expect.any(Object)
    );

    const data = result.data as Record<string, unknown>;
    expect(data.mode_requested).toBe('transit');
    expect(data.mode_used).toBe('driving');
    expect(data.transit_note).toBeDefined();
    expect(data.distance).toBe('10.0 mi'); // Metlife uses imperial
    expect(data.duration).toBe('20 min');
  });

  it('should correctly format routes with metric system for metric venues', async () => {
    // 1. Geocoding mock
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        features: [{ center: [-99.1332, 19.4326] }],
      },
    });

    // 2. Directions mock
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        routes: [
          {
            distance: 5000, // 5 km
            duration: 3600, // 60 mins
            legs: [
              {
                steps: [{ maneuver: { instruction: 'Walk straight' } }],
              },
            ],
          },
        ],
      },
    });

    const result = await navigation({ origin: 'Mexico City Center', venue_id: 'azteca', mode: 'walking' });

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.unit_system).toBe('metric');
    expect(data.distance).toBe('5.0 km');
    expect(data.duration).toBe('1 hr');
    expect(data.steps).toEqual(['Walk straight']);
  });

  it('should return error if geocoding returns no features', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { features: [] },
    });

    const result = await navigation({ origin: 'Nonexistent Place', venue_id: 'metlife' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Could not geocode origin location');
  });
});
