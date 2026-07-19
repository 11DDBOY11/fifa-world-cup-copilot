import axios from 'axios';
import { venues } from '../config/venues';
import { ToolResult } from './types';

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN!;

// Mapbox travel profile mapping.
// Transit is not supported on the Mapbox free-tier Directions API.
// If the caller passes 'transit', we fall back to 'driving' but flag it
// clearly in the response so the LLM can tell the user honestly.
const PROFILE_MAP: Record<string, string> = {
  walking: 'walking',
  transit: 'driving', // fallback — flagged with transit_note in output
  driving: 'driving',
};

const TRANSIT_NOT_SUPPORTED_NOTE =
  'Real-time transit routing is not available via the current mapping service. ' +
  'Driving directions are shown instead. For public transit options, check the venue knowledge base.';


function metresToDisplay(metres: number, unitSystem: 'imperial' | 'metric'): string {
  if (unitSystem === 'imperial') {
    const miles = metres / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }
  const km = metres / 1000;
  return `${km.toFixed(1)} km`;
}

function secondsToDisplay(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

export async function navigation(input: Record<string, unknown>): Promise<ToolResult> {
  try {
    const origin = input.origin as string;
    const venueId = input.venue_id as string;
    const mode = (input.mode as string) || 'walking';

    if (!origin) {
      return { success: false, error: 'origin is required' };
    }
    if (!venueId) {
      return { success: false, error: 'venue_id is required' };
    }

    const venue = venues.find((v) => v.id === venueId);
    if (!venue) {
      return { success: false, error: `Unknown venue_id: ${venueId}` };
    }

    const validModes = ['walking', 'transit', 'driving'];
    if (!validModes.includes(mode)) {
      return { success: false, error: `mode must be one of: ${validModes.join(', ')}` };
    }

    const profile = PROFILE_MAP[mode] || 'walking';

    // 1. Geocode origin address using Mapbox Geocoding API to get [lng, lat]
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(origin)}.json`;
    const geocodeResponse = await axios.get(geocodeUrl, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        limit: 1,
      },
    });

    const geocodeData = geocodeResponse.data;
    if (!geocodeData.features || geocodeData.features.length === 0) {
      return { success: false, error: `Could not geocode origin location: "${origin}"` };
    }

    // Mapbox center coordinates are returned as [longitude, latitude]
    const [originLng, originLat] = geocodeData.features[0].center as [number, number];

    // Destination coordinates from venues config (lat/lng)
    const destLng = venue.lng;
    const destLat = venue.lat;

    // 2. Query Mapbox Directions API
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originLng},${originLat};${destLng},${destLat}`;
    const directionsResponse = await axios.get(directionsUrl, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        steps: true,
        overview: 'full',
      },
    });

    const directionsData = directionsResponse.data;
    if (!directionsData.routes || directionsData.routes.length === 0) {
      return { success: false, error: 'No routes returned by Mapbox Directions API.' };
    }

    const route = directionsData.routes[0];
    const distanceMetres = route.distance ?? 0;
    const durationSeconds = route.duration ?? 0;

    // Flatten step instructions from legs
    const steps: string[] = [];
    if (route.legs) {
      for (const leg of route.legs as Record<string, unknown>[]) {
        const legSteps = leg.steps as Record<string, unknown>[] | undefined;
        if (legSteps) {
          for (const step of legSteps) {
            const maneuver = step.maneuver as Record<string, unknown> | undefined;
            if (maneuver?.instruction) {
              steps.push(maneuver.instruction as string);
            }
          }
        }
      }
    }

    const isTransitFallback = mode === 'transit';

    return {
      success: true,
      data: {
        venue_id: venueId,
        venue_name: venue.name,
        unit_system: venue.unit_system,
        duration: secondsToDisplay(durationSeconds),
        distance: metresToDisplay(distanceMetres, venue.unit_system),
        mode_requested: mode,
        mode_used: isTransitFallback ? 'driving' : mode,
        ...(isTransitFallback && { transit_note: TRANSIT_NOT_SUPPORTED_NOTE }),
        steps,
      },
    };

  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return {
        success: false,
        error: `Mapbox API error ${err.response.status}: ${JSON.stringify(err.response.data)}`,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
