import { useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { availabilityColor, availabilityLabel } from '../../lib/format';
import type { RouteResult } from '../../lib/api';
import { ADDIS_CENTER, type MapMarker } from './MapView';

const GOOGLE_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

export interface GoogleMapViewProps {
  markers: MapMarker[];
  userLocation?: { lat: number; lng: number } | null;
  route?: RouteResult['geometry'] | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

/** Imperatively manages markers, the user dot, and the route polyline. */
function MapContent({ markers, userLocation, route, selectedId, onSelect }: GoogleMapViewProps) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userRef = useRef<google.maps.Marker | null>(null);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const fittedRef = useRef(false);

  // Facility markers + info windows.
  useEffect(() => {
    if (!map) return;
    if (!infoRef.current) infoRef.current = new google.maps.InfoWindow();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    markers.forEach((mk) => {
      const marker = new google.maps.Marker({
        position: { lat: mk.latitude, lng: mk.longitude },
        map,
        title: mk.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: mk.id === selectedId ? 10 : 7,
          fillColor: availabilityColor(mk.availableSpaces, mk.totalSpaces),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => {
        onSelect?.(mk.id);
        infoRef.current?.setContent(
          `<div style="padding:2px 6px;font-family:system-ui,sans-serif">
             <div style="font-weight:700;font-size:13px">${mk.name}</div>
             <div style="font-size:12px;color:#6b7280;margin-top:2px">${availabilityLabel(
               mk.availableSpaces,
               mk.totalSpaces,
             )} · ${mk.availableSpaces}/${mk.totalSpaces} spaces · ${mk.hourlyPrice} ETB/hr</div>
           </div>`,
        );
        infoRef.current?.open(map, marker);
      });
      markersRef.current.push(marker);
    });

    if (!fittedRef.current && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((mk) => bounds.extend({ lat: mk.latitude, lng: mk.longitude }));
      if (userLocation) bounds.extend(userLocation);
      map.fitBounds(bounds, 64);
      fittedRef.current = true;
    }
  }, [map, markers, selectedId, onSelect, userLocation]);

  // User location dot.
  useEffect(() => {
    if (!map) return;
    userRef.current?.setMap(null);
    if (userLocation) {
      userRef.current = new google.maps.Marker({
        position: userLocation,
        map,
        zIndex: 999,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    }
  }, [map, userLocation]);

  // Route polyline (road-following geometry from the backend Routes API).
  useEffect(() => {
    if (!map) return;
    polyRef.current?.setMap(null);
    polyRef.current = null;
    if (route && route.coordinates.length > 0) {
      const path = route.coordinates.map(([lng, lat]) => ({ lat, lng }));
      polyRef.current = new google.maps.Polyline({
        path,
        map,
        strokeColor: '#ea580c',
        strokeWeight: 5,
        strokeOpacity: 0.9,
      });
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 80);
    }
  }, [map, route]);

  // Real-time traffic overlay — live road congestion straight from Google.
  useEffect(() => {
    if (!map) return;
    const traffic = new google.maps.TrafficLayer();
    traffic.setMap(map);
    return () => traffic.setMap(null);
  }, [map]);

  return null;
}

export function GoogleMapView(props: GoogleMapViewProps) {
  return (
    <div className={props.className ?? 'h-full w-full'}>
      <APIProvider apiKey={GOOGLE_KEY}>
        <Map
          defaultCenter={ADDIS_CENTER}
          defaultZoom={12}
          gestureHandling="greedy"
          clickableIcons={false}
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          <MapContent {...props} />
        </Map>
      </APIProvider>
    </div>
  );
}
