import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Crosshair, Filter, Loader2, Navigation, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  ApiError,
  driver as driverApi,
  facilities as facilitiesApi,
  navigation as navigationApi,
  type FacilityType,
  type FacilityWithDistance,
  type RouteResult,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useGeolocation } from '../lib/useGeolocation';
import { formatDistance, formatDuration } from '../lib/format';
import { ParkingMap, type MapMarker } from '../components/map/ParkingMap';
import { FacilityCard } from '../components/facility/FacilityCard';
import { Button, EmptyState, Field, Input, Select, Spinner } from '../components/ui';

interface Filters {
  radiusKm: string; // blank = no limit (show all approved facilities)
  maxPrice: string;
  minAvailableSpaces: string;
  facilityType: '' | FacilityType;
  availability: 'any' | 'available';
}

const DEFAULT_FILTERS: Filters = {
  radiusKm: '',
  maxPrice: '',
  minAvailableSpaces: '',
  facilityType: '',
  availability: 'any',
};

export function MapPage() {
  const { user } = useAuth();
  const isDriver = user?.role === 'REGISTERED_DRIVER';
  const { location, status, request, useDefault } = useGeolocation();

  const [facilities, setFacilities] = useState<FacilityWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Default to Addis center immediately so the map + list populate right away,
  // then upgrade to the device's GPS location if permission is granted.
  useEffect(() => {
    useDefault();
    request();
  }, [useDefault, request]);

  const loadFacilities = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const { facilities } = await facilitiesApi.search({
        lat: location.lat,
        lng: location.lng,
        maxDistanceKm: filters.radiusKm ? Number(filters.radiusKm) : undefined,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
        minAvailableSpaces: filters.minAvailableSpaces ? Number(filters.minAvailableSpaces) : undefined,
        facilityType: filters.facilityType || undefined,
        availability: filters.availability,
      });
      setFacilities(facilities);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load facilities.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, filters]);

  useEffect(() => {
    void loadFacilities();
  }, [loadFacilities]);

  // Load favorites for registered drivers so the heart state is correct.
  useEffect(() => {
    if (!isDriver) {
      setFavorites(new Set());
      return;
    }
    driverApi
      .listFavorites()
      .then(({ favorites }) => setFavorites(new Set(favorites.map((f) => f.facilityId))))
      .catch(() => undefined);
  }, [isDriver]);

  const markers: MapMarker[] = useMemo(
    () =>
      facilities.map((f) => ({
        id: f.id,
        latitude: f.latitude,
        longitude: f.longitude,
        availableSpaces: f.availableSpaces,
        totalSpaces: f.totalSpaces,
        name: f.name,
        hourlyPrice: f.hourlyPrice,
      })),
    [facilities],
  );

  const handleNavigate = useCallback(
    async (facility: FacilityWithDistance) => {
      if (!location) {
        toast.error('Enable location to get directions.');
        return;
      }
      setSelectedId(facility.id);
      try {
        const { route } = await navigationApi.route(
          location.lat,
          location.lng,
          facility.latitude,
          facility.longitude,
        );
        setRoute(route);
        toast.success(
          `${facility.name}: ${formatDistance(route.distanceMeters / 1000)} · ${formatDuration(
            route.durationSeconds,
          )}${route.fallback ? ' (estimated)' : ''}`,
        );
      } catch {
        toast.error('Could not load a route.');
      }
    },
    [location],
  );

  const toggleFavorite = useCallback(
    async (facilityId: string) => {
      if (!isDriver) {
        toast.error('Sign in as a driver to save favorites.');
        return;
      }
      const isFav = favorites.has(facilityId);
      try {
        if (isFav) {
          await driverApi.removeFavorite(facilityId);
          setFavorites((s) => {
            const next = new Set(s);
            next.delete(facilityId);
            return next;
          });
        } else {
          await driverApi.addFavorite(facilityId);
          setFavorites((s) => new Set(s).add(facilityId));
          toast.success('Saved to favorites.');
        }
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not update favorite.');
      }
    },
    [favorites, isDriver],
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Map */}
      <div className="relative h-[45vh] lg:h-full lg:flex-1">
        <ParkingMap
          markers={markers}
          userLocation={location}
          route={route?.geometry ?? null}
          selectedId={selectedId}
          onSelect={setSelectedId}
          className="h-full w-full"
        />
        {route && (
          <button
            onClick={() => setRoute(null)}
            className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow"
          >
            <X className="h-4 w-4" /> Clear route
          </button>
        )}
        {status === 'denied' && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-gray-600 shadow">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Location off — showing Addis Ababa.
            <button onClick={request} className="font-semibold text-orange-600">
              Retry
            </button>
          </div>
        )}
      </div>

      {/* List + filters */}
      <div className="flex w-full flex-col border-t border-gray-100 bg-gray-50 lg:w-[440px] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-3">
          <div>
            <h2 className="font-bold text-gray-900">Nearby parking</h2>
            <p className="text-xs text-gray-500">
              {loading ? 'Searching…' : `${facilities.length} approved facilities`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={request} title="Use my location">
              <Crosshair className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-3 border-b border-gray-100 bg-white p-4">
            <Field label="Radius (km)" hint="Blank = show all">
              <Input
                type="number"
                min={0}
                placeholder="All"
                value={filters.radiusKm}
                onChange={(e) => setFilters((f) => ({ ...f, radiusKm: e.target.value }))}
              />
            </Field>
            <Field label="Max price (ETB)">
              <Input
                type="number"
                min={0}
                value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
              />
            </Field>
            <Field label="Min free spaces">
              <Input
                type="number"
                min={0}
                value={filters.minAvailableSpaces}
                onChange={(e) => setFilters((f) => ({ ...f, minAvailableSpaces: e.target.value }))}
              />
            </Field>
            <Field label="Type">
              <Select
                value={filters.facilityType}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, facilityType: e.target.value as Filters['facilityType'] }))
                }
              >
                <option value="">Any</option>
                <option value="MANUAL">Manual</option>
                <option value="API_INTEGRATED">Smart</option>
              </Select>
            </Field>
            <Field label="Availability">
              <Select
                value={filters.availability}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, availability: e.target.value as Filters['availability'] }))
                }
              >
                <option value="any">All</option>
                <option value="available">Has free spaces</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Reset
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && facilities.length === 0 && (
            <EmptyState
              icon={<Navigation className="h-10 w-10" />}
              title="No matching parking facilities"
              description="No facilities match the current filters. Reset to show all approved facilities."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Reset filters
                </Button>
              }
            />
          )}
          {facilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              distanceKm={facility.distanceKm}
              selected={selectedId === facility.id}
              showFavorite={isDriver}
              isFavorite={favorites.has(facility.id)}
              onToggleFavorite={() => toggleFavorite(facility.id)}
              onNavigate={() => handleNavigate(facility)}
              onSelect={() => setSelectedId(facility.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
