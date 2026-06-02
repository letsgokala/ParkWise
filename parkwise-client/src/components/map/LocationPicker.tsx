import { useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { ADDIS_CENTER } from './MapView';
import { Field, Input } from '../ui';

const GOOGLE_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

export interface LocationPickerProps {
  latitude: number;
  longitude: number;
  address: string;
  onChange: (value: { latitude?: number; longitude?: number; address?: string }) => void;
}

/** Draggable marker + click-to-set, with best-effort reverse geocoding. */
function PickerLayer({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number;
  longitude: number;
  onPick: (lat: number, lng: number, address?: string) => void;
}) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const reverseGeocode = (lat: number, lng: number) => {
    try {
      if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder();
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        // Requires the Geocoding API + billing; degrades silently to manual entry.
        if (status === 'OK' && results && results[0]) {
          onPickRef.current(lat, lng, results[0].formatted_address);
        }
      });
    } catch {
      /* ignore — address stays manual */
    }
  };

  useEffect(() => {
    if (!map) return;
    markerRef.current = new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map,
      draggable: true,
    });
    markerRef.current.addListener('dragend', () => {
      const p = markerRef.current?.getPosition();
      if (p) {
        onPickRef.current(p.lat(), p.lng());
        reverseGeocode(p.lat(), p.lng());
      }
    });
    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      markerRef.current?.setPosition(e.latLng);
      onPickRef.current(e.latLng.lat(), e.latLng.lng());
      reverseGeocode(e.latLng.lat(), e.latLng.lng());
    });
    return () => {
      google.maps.event.removeListener(clickListener);
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Keep the marker in sync if coordinates change externally.
  useEffect(() => {
    markerRef.current?.setPosition({ lat: latitude, lng: longitude });
  }, [latitude, longitude]);

  return null;
}

/**
 * Map-based location picker. With a Google key it shows a clickable map that
 * sets lat/lng (and auto-fills the address when the Geocoding API is enabled).
 * Without a key it falls back to manual coordinate entry.
 */
export function LocationPicker({ latitude, longitude, address, onChange }: LocationPickerProps) {
  if (!GOOGLE_KEY) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Field label="Latitude">
          <Input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onChange({ latitude: Number(e.target.value) })}
          />
        </Field>
        <Field label="Longitude">
          <Input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onChange({ longitude: Number(e.target.value) })}
          />
        </Field>
        <div className="col-span-2">
          <Field label="Address">
            <Input value={address} onChange={(e) => onChange({ address: e.target.value })} />
          </Field>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
          <MapPin className="h-4 w-4" /> Click or drag the pin to set the facility location
        </p>
        <div className="h-64 overflow-hidden rounded-xl border border-gray-200">
          <APIProvider apiKey={GOOGLE_KEY}>
            <Map
              defaultCenter={{ lat: latitude || ADDIS_CENTER.lat, lng: longitude || ADDIS_CENTER.lng }}
              defaultZoom={13}
              gestureHandling="greedy"
              clickableIcons={false}
              style={{ width: '100%', height: '100%' }}
            >
              <PickerLayer
                latitude={latitude}
                longitude={longitude}
                onPick={(lat, lng, addr) =>
                  onChange({ latitude: lat, longitude: lng, ...(addr !== undefined ? { address: addr } : {}) })
                }
              />
            </Map>
          </APIProvider>
        </div>
        <div className="mt-1 flex gap-4 text-xs text-gray-500">
          <span>Lat: {Number(latitude).toFixed(5)}</span>
          <span>Lng: {Number(longitude).toFixed(5)}</span>
        </div>
      </div>
      <Field label="Address" hint="Auto-filled from the map where available — otherwise type it.">
        <Input value={address} onChange={(e) => onChange({ address: e.target.value })} />
      </Field>
    </div>
  );
}
