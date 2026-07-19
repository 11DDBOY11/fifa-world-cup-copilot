import { weather } from './weather';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('weather tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module cache between tests if needed, or rely on distinct test runs
  });

  it('should return error if venue_id is missing', async () => {
    const result = await weather({});
    expect(result.success).toBe(false);
    expect(result.error).toBe('venue_id is required');
  });

  it('should return error if venue_id is unknown', async () => {
    const result = await weather({ venue_id: 'unknown-venue' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown venue_id: unknown-venue');
  });

  it('should query weather API with metric units for metric venues and format appropriately', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        main: { temp: 22.4, feels_like: 21.8, humidity: 60 },
        weather: [{ description: 'scattered clouds' }],
        wind: { speed: 5.2 },
        visibility: 10000,
      },
    });

    const result = await weather({ venue_id: 'azteca' }); // Azteca is metric

    expect(result.success).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.openweathermap.org/data/2.5/weather',
      expect.objectContaining({
        params: expect.objectContaining({
          q: 'Mexico City',
          units: 'metric',
        }),
      })
    );
    expect(result.data).toEqual({
      venue_id: 'azteca',
      venue_name: 'Estadio Azteca',
      city: 'Mexico City',
      unit_system: 'metric',
      temperature: '22°C',
      feels_like: '22°C',
      humidity_percent: 60,
      description: 'scattered clouds',
      wind_speed: '5.2 m/s',
      visibility_m: 10000,
    });
  });

  it('should query weather API with imperial units for imperial venues and format appropriately', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        main: { temp: 72.8, feels_like: 73.1, humidity: 55 },
        weather: [{ description: 'clear sky' }],
        wind: { speed: 8.5 },
        visibility: 9999,
      },
    });

    const result = await weather({ venue_id: 'metlife' }); // MetLife is imperial

    expect(result.success).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.openweathermap.org/data/2.5/weather',
      expect.objectContaining({
        params: expect.objectContaining({
          q: 'East Rutherford,NJ,US',
          units: 'imperial',
        }),
      })
    );
    expect(result.data).toEqual({
      venue_id: 'metlife',
      venue_name: 'MetLife Stadium',
      city: 'East Rutherford,NJ,US',
      unit_system: 'imperial',
      temperature: '73°F',
      feels_like: '73°F',
      humidity_percent: 55,
      description: 'clear sky',
      wind_speed: '8.5 mph',
      visibility_m: 9999,
    });
  });

  it('should cache successful weather calls and hit cache on subsequent requests', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        main: { temp: 15, feels_like: 14, humidity: 80 },
        weather: [{ description: 'light rain' }],
        wind: { speed: 3.1 },
        visibility: 8000,
      },
    });

    // Call once (cache miss)
    const result1 = await weather({ venue_id: 'bc-place' });
    expect(result1.success).toBe(true);

    // Call twice (cache hit)
    const result2 = await weather({ venue_id: 'bc-place' });
    expect(result2.success).toBe(true);

    // Axios should only have been called once due to caching
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(result2.data).toEqual(result1.data);
  });

  it('should handle API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

    // Query for kanteerav (which is not cached yet)
    const result = await weather({ venue_id: 'kanteerav' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network Error');
  });
});
