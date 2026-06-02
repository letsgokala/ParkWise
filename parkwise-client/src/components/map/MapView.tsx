import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { availabilityColor, availabilityLabel } from '../../lib/format';
import type { RouteResult } from '../../lib/api';

// Addis Ababa default center.
export const ADDIS_CENTER = { lat: 9.0108, lng: 38.7613 };

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const STYLE_OVERRIDE = import.meta.env.VITE_MAP_STYLE_URL as string | undefined;

// Free, no-API-key vector basemap — looks far nicer than raster OSM tiles.
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Style priority: MapTiler key (sharpest) → explicit override → free OpenFreeMap.
function resolveStyle(): string {
  if (MAPTILER_KEY) return `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;
  if (STYLE_OVERRIDE) return STYLE_OVERRIDE;
  return OPENFREEMAP_STYLE;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  availableSpaces: number;
  totalSpaces: number;
  name: string;
  hourlyPrice: number;
}

interface MapViewProps {
  markers: MapMarker[];
  userLocation?: { lat: number; lng: number } | null;
  route?: RouteResult['geometry'] | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

function buildMarkerElement(marker: MapMarker, isSelected: boolean): HTMLElement {
  const el = document.createElement('div');
  const color = availabilityColor(marker.availableSpaces, marker.totalSpaces);
  el.style.cssText = `
    width: ${isSelected ? 26 : 20}px; height: ${isSelected ? 26 : 20}px;
    background: ${color}; border: 3px solid white; border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer;
    ${isSelected ? 'outline: 3px solid rgba(249,115,22,0.5);' : ''}`;
  el.title = marker.name;
  return el;
}

export function MapView({
  markers,
  userLocation,
  route,
  selectedId,
  onSelect,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const loadedRef = useRef(false);
  const fittedRef = useRef(false);

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolveStyle(),
      center: [ADDIS_CENTER.lng, ADDIS_CENTER.lat],
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      loadedRef.current = true;
    });
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // Render facility markers whenever the data or selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    markers.forEach((marker) => {
      const el = buildMarkerElement(marker, marker.id === selectedId);
      el.addEventListener('click', () => onSelect?.(marker.id));
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
        `<div style="padding:8px 12px;min-width:160px">
           <div style="font-weight:700;font-size:13px">${marker.name}</div>
           <div style="font-size:12px;color:#6b7280;margin-top:2px">
             ${availabilityLabel(marker.availableSpaces, marker.totalSpaces)} ·
             ${marker.availableSpaces}/${marker.totalSpaces} spaces
           </div>
           <div style="font-size:12px;color:#6b7280">${marker.hourlyPrice} ETB/hr</div>
         </div>`,
      );
      const mlMarker = new maplibregl.Marker({ element: el })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map);
      markerRefs.current.push(mlMarker);
    });

    // Fit to all markers once on first load.
    if (!fittedRef.current && markers.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.longitude, m.latitude]));
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
      fittedRef.current = true;
    }
  }, [markers, selectedId, onSelect, userLocation]);

  // User location marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    if (userLocation) {
      const el = document.createElement('div');
      el.style.cssText =
        'width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,0.3)';
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    }
  }, [userLocation]);

  // Route line.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const existing = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
      if (route) {
        const data = { type: 'Feature' as const, properties: {}, geometry: route };
        if (existing) {
          existing.setData(data);
        } else {
          map.addSource('route', { type: 'geojson', data });
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#ea580c', 'line-width': 5, 'line-opacity': 0.85 },
          });
        }
        const bounds = new maplibregl.LngLatBounds();
        route.coordinates.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
      } else if (existing) {
        if (map.getLayer('route-line')) map.removeLayer('route-line');
        map.removeSource('route');
      }
    };

    if (loadedRef.current) apply();
    else map.once('load', apply);
  }, [route]);

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />;
}
