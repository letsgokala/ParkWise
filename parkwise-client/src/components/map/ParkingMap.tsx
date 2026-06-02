import type { RouteResult } from '../../lib/api';
import { MapView, type MapMarker } from './MapView';
import { GoogleMapView } from './GoogleMapView';

const GOOGLE_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

export type { MapMarker };

export interface ParkingMapProps {
  markers: MapMarker[];
  userLocation?: { lat: number; lng: number } | null;
  route?: RouteResult['geometry'] | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * Renders the Google map when VITE_GOOGLE_MAPS_API_KEY is configured, otherwise
 * falls back to the MapLibre (OpenFreeMap) map. Both accept the same props, so
 * the rest of the app is map-provider agnostic.
 */
export function ParkingMap(props: ParkingMapProps) {
  return GOOGLE_KEY ? <GoogleMapView {...props} /> : <MapView {...props} />;
}
