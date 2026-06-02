import { haversineKm, type Coordinates } from '../lib/geo/haversine';
import { env } from '../config/env';

export interface RouteResult {
  provider: string;
  fallback: boolean;
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

// Approximate average urban driving speed in Addis Ababa (km/h).
const AVG_SPEED_KMH = 28;

function straightLineRoute(from: Coordinates, to: Coordinates): RouteResult {
  const km = haversineKm(from, to);
  return {
    provider: 'straight-line',
    fallback: true,
    distanceMeters: Math.round(km * 1000),
    durationSeconds: Math.round((km / AVG_SPEED_KMH) * 3600),
    geometry: {
      type: 'LineString',
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    },
  };
}

/**
 * Decode a Google/OSRM-style encoded polyline (precision 5) into a list of
 * [lng, lat] pairs (GeoJSON order).
 */
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

/**
 * Google Routes API (v2:computeRoutes) — the modern replacement for the legacy
 * Directions API. Returns a road-following route. The key is used server-side
 * only.
 */
async function googleRoute(from: Coordinates, to: Coordinates): Promise<RouteResult> {
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googleMapsApiKey,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
      destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
      travelMode: 'DRIVE',
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) throw new Error(`Google Routes responded ${response.status}`);
  const data = (await response.json()) as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  };
  const route = data.routes?.[0];
  if (!route?.polyline?.encodedPolyline) throw new Error('Google Routes returned no geometry');

  return {
    provider: 'google-routes',
    fallback: false,
    distanceMeters: route.distanceMeters ?? 0,
    // Routes API returns duration like "695s".
    durationSeconds: route.duration ? parseInt(route.duration, 10) : 0,
    geometry: { type: 'LineString', coordinates: decodePolyline(route.polyline.encodedPolyline) },
  };
}

/** OSRM-compatible routing server (e.g. self-hosted). */
async function osrmRoute(from: Coordinates, to: Coordinates): Promise<RouteResult> {
  const base = env.routingProviderUrl.replace(/\/$/, '');
  const url = `${base}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error(`Routing provider responded ${response.status}`);

  const data = (await response.json()) as {
    routes?: Array<{ distance?: number; duration?: number; geometry?: RouteResult['geometry'] }>;
  };
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error('Routing provider returned no geometry');

  return {
    provider: 'osrm',
    fallback: false,
    distanceMeters: Math.round(route.distance ?? 0),
    durationSeconds: Math.round(route.duration ?? 0),
    geometry: route.geometry,
  };
}

/**
 * Resolve a driving route, preferring real road routing when available:
 *   1. Google Routes API (if GOOGLE_MAPS_API_KEY is set)
 *   2. OSRM-compatible server (if ROUTING_PROVIDER_URL is set)
 *   3. Straight-line estimate (always works — UC9 alternative flow)
 */
export async function getRoute(from: Coordinates, to: Coordinates): Promise<RouteResult> {
  if (env.googleMapsApiKey) {
    try {
      return await googleRoute(from, to);
    } catch (error) {
      console.warn('[navigation] Google Routes failed, falling back:', (error as Error).message);
    }
  }

  if (env.routingProviderUrl) {
    try {
      return await osrmRoute(from, to);
    } catch (error) {
      console.warn('[navigation] OSRM failed, falling back:', (error as Error).message);
    }
  }

  return straightLineRoute(from, to);
}
