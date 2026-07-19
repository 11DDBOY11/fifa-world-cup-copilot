import axios from 'axios';
import { venues } from '../config/venues';
import { ToolResult } from './types';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY!;

interface CacheEntry {
  result: ToolResult;
  expiresAt: number;
}

const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function weather(input: Record<string, unknown>): Promise<ToolResult> {
  try {
    const venueId = input.venue_id as string;

    if (!venueId) {
      return { success: false, error: 'venue_id is required' };
    }

    const venue = venues.find((v) => v.id === venueId);
    if (!venue) {
      return { success: false, error: `Unknown venue_id: ${venueId}` };
    }

    // Check cache
    const now = Date.now();
    const cached = weatherCache.get(venueId);
    if (cached && now < cached.expiresAt) {
      console.log(`[Cache Hit] Returning cached weather for venue: ${venueId}`);
      return cached.result;
    }

    console.log(`[Cache Miss] Querying weather API for venue: ${venueId}`);

    // OpenWeatherMap: 'imperial' = °F, mph; 'metric' = °C, m/s
    const owmUnits = venue.unit_system === 'imperial' ? 'imperial' : 'metric';
    const tempUnit = venue.unit_system === 'imperial' ? '°F' : '°C';
    const speedUnit = venue.unit_system === 'imperial' ? 'mph' : 'm/s';

    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          q: venue.city,
          appid: OPENWEATHER_API_KEY,
          units: owmUnits,
        },
      }
    );

    const data = response.data;

    const result: ToolResult = {
      success: true,
      data: {
        venue_id: venueId,
        venue_name: venue.name,
        city: venue.city,
        unit_system: venue.unit_system,
        temperature: `${Math.round(data.main.temp)}${tempUnit}`,
        feels_like: `${Math.round(data.main.feels_like)}${tempUnit}`,
        humidity_percent: data.main.humidity,
        description: data.weather[0].description,
        wind_speed: `${data.wind.speed} ${speedUnit}`,
        visibility_m: data.visibility,
      },
    };

    // Cache the successful result
    weatherCache.set(venueId, {
      result,
      expiresAt: now + CACHE_TTL_MS,
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

