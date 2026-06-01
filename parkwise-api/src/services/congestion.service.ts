import { env } from '../config/env';
import type { Coordinates } from '../lib/geo/haversine';
import type { Congestion } from '../lib/ai/scoring';

/**
 * Real-time congestion derived from Google Routes API traffic data.
 *
 * For the route to a facility we request both the current-traffic duration and
 * the free-flow (static) duration. Their ratio indicates how congested the trip
 * is right now:
 *   ratio < 1.15            → LOW
 *   1.15 ≤ ratio < 1.4      → MEDIUM
 *   ratio ≥ 1.4             → HIGH
 *
 * Results are cached per facility for a short TTL so list/poll requests don't
 * hammer the API, and any failure (or missing key) falls back to the facility's
 * stored level.
 */

interface CacheEntry {
  level: Congestion;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 90_000;

export function levelFromRatio(ratio: number): Congestion {
  if (ratio >= 1.4) return 'HIGH';
  if (ratio >= 1.15) return 'MEDIUM';
  return 'LOW';
}

async function fetchLiveCongestion(origin: Coordinates, dest: Coordinates): Promise<Congestion | null> {
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.googleMapsApiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      routes?: Array<{ duration?: string; staticDuration?: string }>;
    };
    const route = data.routes?.[0];
    if (!route?.duration || !route?.staticDuration) return null;

    const live = parseInt(route.duration, 10);
    const free = parseInt(route.staticDuration, 10);
    if (!free) return null;

    return levelFromRatio(live / free);
  } catch {
    return null;
  }
}

export interface FacilityPoint {
  id: string;
  latitude: number;
  longitude: number;
  fallback: Congestion;
}

/**
 * Returns a map of facilityId → real-time congestion level. Falls back to each
 * facility's stored level when Google is unavailable or no key is configured.
 */
export async function computeForFacilities(
  origin: Coordinates,
  facilities: FacilityPoint[],
): Promise<Map<string, Congestion>> {
  const result = new Map<string, Congestion>();

  if (!env.googleMapsApiKey) {
    facilities.forEach((f) => result.set(f.id, f.fallback));
    return result;
  }

  const now = Date.now();
  await Promise.all(
    facilities.map(async (f) => {
      const cached = cache.get(f.id);
      if (cached && cached.expires > now) {
        result.set(f.id, cached.level);
        return;
      }
      const live = await fetchLiveCongestion(origin, { lat: f.latitude, lng: f.longitude });
      const level = live ?? f.fallback;
      if (live) cache.set(f.id, { level, expires: now + TTL_MS });
      result.set(f.id, level);
    }),
  );

  return result;
}
