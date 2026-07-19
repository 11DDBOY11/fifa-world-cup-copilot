const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';


export interface VenueData {
  id: string;
  name: string;
  city: string;
  country: string;
  default_language: string;
  unit_system: string;
}

export async function getVenues(): Promise<VenueData[]> {
  const response = await fetch(`${BACKEND_URL}/venues`);
  if (!response.ok) {
    throw new Error(`Failed to fetch venues: HTTP ${response.status}`);
  }
  return response.json() as Promise<VenueData[]>;
}

export async function sendMessage(
  sessionId: string,
  message: string,
  venueId: string
): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message, venue_id: venueId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as { reply: string };
  return data.reply;
}

export async function getGeneralInfo(
  stadiumName: string,
  hostCity: string
): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/general-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stadium_name: stadiumName, host_city: hostCity }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as { reply: string };
  return data.reply;
}

