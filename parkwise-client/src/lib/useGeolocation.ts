import { useCallback, useState } from 'react';
import { ADDIS_CENTER } from '../components/map/MapView';

export type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied';

export interface GeoLocation {
  lat: number;
  lng: number;
}

/**
 * Browser geolocation with graceful fallback. If permission is denied or
 * unavailable, callers can fall back to the Addis Ababa default or manual input.
 */
export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  }, []);

  const useDefault = useCallback(() => {
    setLocation({ lat: ADDIS_CENTER.lat, lng: ADDIS_CENTER.lng });
  }, []);

  return { location, status, request, setLocation, useDefault };
}
