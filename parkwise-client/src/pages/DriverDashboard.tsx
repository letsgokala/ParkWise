import React, { useDeferredValue, useEffect, useRef, useState } from 'react';
import { rankParkingFacilities, ParkingLocation, ScoredParkingLocation } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Navigation,
  Star,
  Info,
  Filter,
  Search,
  Zap,
  Clock,
  CreditCard,
  Map as MapIcon,
  XCircle,
  Route,
  Heart,
  Bell,
} from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import {
  createDriverFavorite,
  deleteDriverFavorite,
  DriverFavorite,
  DriverSmartAlert,
  getDriverFavorites,
  getParkingLocations,
  getStoredUser,
  updateDriverFavoriteAlerts,
} from '../lib/api';

const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const parkingIcon = L.divIcon({
  className: 'custom-parking-icon',
  html: `<div style="background-color: #ea580c; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
};

const MapResizer = ({ trigger }: { trigger: string }) => {
  const map = useMap();

  useEffect(() => {
    const frame = window.setTimeout(() => map.invalidateSize(), 250);
    return () => window.clearTimeout(frame);
  }, [map, trigger]);

  return null;
};

const Routing = ({
  userLocation,
  destination,
}: {
  userLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number } | null;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !destination) return;

    const routingControl = (L as any).Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(destination.lat, destination.lng),
      ],
      routeWhileDragging: true,
      lineOptions: {
        styles: [{ color: '#ea580c', weight: 6, opacity: 0.8 }],
      },
      createMarker: () => null,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
    }).addTo(map);

    return () => {
      if (map && routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, [map, userLocation, destination]);

  return null;
};

const DriverDashboard = () => {
  const storedUser = getStoredUser();
  const isDriverSession = storedUser?.role === 'driver';

  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [scoredFacilities, setScoredFacilities] = useState<ScoredParkingLocation[]>([]);
  const [favorites, setFavorites] = useState<DriverFavorite[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<DriverSmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(isDriverSession);
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);
  const [alertPendingId, setAlertPendingId] = useState<string | null>(null);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'best-match' | 'price-low' | 'availability-high' | 'name-asc'>('best-match');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const lastFacilitiesSnapshotRef = useRef('');

  const favoriteIds = favorites.map((favorite) => favorite.facilityId);

  const hasMeaningfulLocationChange = (
    previous: { lat: number; lng: number } | null,
    next: { lat: number; lng: number }
  ) => {
    if (!previous) return true;

    const latDelta = Math.abs(previous.lat - next.lat);
    const lngDelta = Math.abs(previous.lng - next.lng);

    return latDelta > 0.0003 || lngDelta > 0.0003;
  };

  useEffect(() => {
    let watchId: number;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setUserLocation((currentLocation) =>
            hasMeaningfulLocationChange(currentLocation, nextLocation) ? nextLocation : currentLocation
          );
        },
        (error) => {
          console.error('Error watching location:', error);
          setUserLocation((currentLocation) => currentLocation ?? { lat: 9.03, lng: 38.74 });
        },
        { enableHighAccuracy: true }
      );
    } else {
      setUserLocation({ lat: 9.03, lng: 38.74 });
    }

    const loadFacilities = async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        const response = await getParkingLocations(['Verified', 'Full']);
        const nextFacilities = response.facilities as ParkingLocation[];
        const snapshot = JSON.stringify(
          nextFacilities.map((facility) => ({
            facilityId: facility.facilityId,
            status: facility.status,
            availableSpaces: facility.availableSpaces,
            pricePerHour: facility.pricePerHour,
            totalSpaces: facility.totalSpaces,
          }))
        );

        if (snapshot !== lastFacilitiesSnapshotRef.current) {
          lastFacilitiesSnapshotRef.current = snapshot;
          setFacilities(nextFacilities);
        }
      } catch (error) {
        console.error('Failed to load parking locations:', error);
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    };

    void loadFacilities(true);
    const intervalId = window.setInterval(() => {
      void loadFacilities();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!isDriverSession) {
      setFavorites([]);
      setFavoritesLoading(false);
      return;
    }

    const loadFavorites = async () => {
      try {
        const response = await getDriverFavorites();
        setFavorites(response.favorites);
        if (response.alerts.length > 0) {
          setSmartAlerts((current) => [...response.alerts, ...current].slice(0, 8));
        }
      } catch (error) {
        console.error('Failed to load driver favorites:', error);
        setFavoriteFeedback('We could not load your saved lots right now.');
      } finally {
        setFavoritesLoading(false);
      }
    };

    loadFavorites();
    const intervalId = window.setInterval(loadFavorites, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isDriverSession]);

  useEffect(() => {
    if (!favoriteFeedback) return;

    const timeoutId = window.setTimeout(() => setFavoriteFeedback(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [favoriteFeedback]);

  useEffect(() => {
    const performRanking = async () => {
      if (userLocation && facilities.length > 0) {
        setRanking(true);
        try {
          const ranked = await rankParkingFacilities(userLocation.lat, userLocation.lng, facilities);
          setScoredFacilities(ranked);
        } finally {
          setRanking(false);
        }
      } else if (!loading && facilities.length === 0) {
        setScoredFacilities([]);
      }
    };

    void performRanking();
  }, [userLocation, facilities, loading]);

  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();

  const filteredFacilities = scoredFacilities
    .filter((facility) => {
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        facility.facilityName.toLowerCase().includes(normalizedSearchTerm) ||
        facility.address.toLowerCase().includes(normalizedSearchTerm);

      if (!matchesSearch) return false;
      if (filter === 'all') return true;
      if (filter === 'cheap') return facility.pricePerHour < 20;
      if (filter === 'available') return facility.availableSpaces > 0;
      if (filter === 'favorites') return favoriteIds.includes(facility.facilityId);
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.pricePerHour - b.pricePerHour;
      if (sortBy === 'availability-high') return b.availableSpaces - a.availableSpaces;
      if (sortBy === 'name-asc') return a.facilityName.localeCompare(b.facilityName);
      return b.score - a.score;
    });

  const favoriteFacilities = favorites
    .map((favorite) => scoredFacilities.find((facility) => facility.facilityId === favorite.facilityId))
    .filter((facility): facility is ScoredParkingLocation => Boolean(facility));

  const visibleAvailableSpots = filteredFacilities.reduce((sum, facility) => sum + facility.availableSpaces, 0);
  const showLoadingState = loading || (ranking && scoredFacilities.length === 0);
  const isNavigating = Boolean(destination);
  const destinationFacility = destination
    ? scoredFacilities.find(
        (facility) => facility.latitude === destination.lat && facility.longitude === destination.lng
      ) || null
    : null;

  const startNavigation = (facility: { latitude: number; longitude: number }) => {
    setDestination({ lat: facility.latitude, lng: facility.longitude });
  };

  const toggleFavorite = async (facility: ScoredParkingLocation) => {
    if (!isDriverSession) {
      setFavoriteFeedback('Sign in as a driver to save favorite parking lots.');
      return;
    }

    setFavoritePendingId(facility.facilityId);

    try {
      if (favoriteIds.includes(facility.facilityId)) {
        await deleteDriverFavorite(facility.facilityId);
        setFavorites((current) => current.filter((favorite) => favorite.facilityId !== facility.facilityId));
        setFavoriteFeedback(`${facility.facilityName} removed from favorites.`);
      } else {
        const response = await createDriverFavorite(facility.facilityId);
        setFavorites((current) => [response.favorite, ...current.filter((favorite) => favorite.facilityId !== facility.facilityId)]);
        setFavoriteFeedback(`${facility.facilityName} saved for quick rebooking.`);
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
      setFavoriteFeedback('We could not update favorites right now.');
    } finally {
      setFavoritePendingId(null);
    }
  };

  const updateAlertPreference = async (
    facilityId: string,
    field: 'notifyOnAvailability' | 'notifyOnPriceDrop',
    value: boolean
  ) => {
    setAlertPendingId(`${facilityId}:${field}`);

    try {
      const response = await updateDriverFavoriteAlerts(facilityId, { [field]: value });
      setFavorites((current) =>
        current.map((favorite) => (favorite.facilityId === facilityId ? response.favorite : favorite))
      );
      setFavoriteFeedback(value ? 'Smart alert enabled.' : 'Smart alert paused.');
    } catch (error) {
      console.error('Failed to update alert preference:', error);
      setFavoriteFeedback('We could not update alert preferences right now.');
    } finally {
      setAlertPendingId(null);
    }
  };

  const alertsCard = isDriverSession ? (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">Smart Alerts</p>
          <h2 className="mt-2 text-2xl font-black text-gray-900">Favorite Lot Updates</h2>
          <p className="text-sm text-gray-500">
            ParkWise watches your saved lots and tells you when spots open up or prices drop.
          </p>
        </div>
        <div className="bg-sky-50 text-sky-600 rounded-2xl px-4 py-3 border border-sky-100 min-w-[92px] text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]">Recent</p>
          <p className="text-2xl font-black">{smartAlerts.length}</p>
        </div>
      </div>

      {smartAlerts.length > 0 ? (
        <div className="space-y-3">
          {smartAlerts.map((alert, index) => {
            const facility = favoriteFacilities.find((favorite) => favorite.facilityId === alert.facilityId);

            return (
              <div
                key={`${alert.facilityId}-${alert.type}-${alert.triggeredAt}-${index}`}
                className="rounded-[1.75rem] border border-sky-100 bg-sky-50/70 px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-white rounded-2xl p-3 border border-sky-100">
                    <Bell className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{alert.facilityName}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-500 mt-2">
                      {alert.type === 'availability' ? 'Availability Alert' : 'Price Drop Alert'}
                    </p>
                  </div>
                </div>
                {facility && (
                  <button
                    type="button"
                    onClick={() => startNavigation(facility)}
                    className="self-start md:self-auto rounded-2xl bg-gray-900 text-white px-4 py-3 font-bold inline-flex items-center gap-2 hover:bg-black transition-all"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>Go Now</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-gray-200 p-8 text-center bg-gray-50">
          <Bell className="h-10 w-10 text-sky-500 mx-auto" />
          <p className="mt-4 text-lg font-bold text-gray-900">No new alerts yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Enable alerts on your favorites and we’ll surface changes as soon as we detect them.
          </p>
        </div>
      )}
    </div>
  ) : null;

  const favoritesCard = isDriverSession ? (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">Quick Rebook</p>
          <h2 className="mt-2 text-2xl font-black text-gray-900">Favorite Parking Lots</h2>
          <p className="text-sm text-gray-500">
            Save the lots you trust, then jump back into navigation in one tap.
          </p>
        </div>
        <div className="bg-rose-50 text-rose-600 rounded-2xl px-4 py-3 border border-rose-100 min-w-[92px] text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]">Saved</p>
          <p className="text-2xl font-black">{favorites.length}</p>
        </div>
      </div>

      {favoritesLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((item) => (
            <div key={item} className="rounded-[2rem] border border-gray-100 bg-gray-50 p-5 animate-pulse space-y-3">
              <div className="h-5 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-100" />
              <div className="h-10 w-full rounded-xl bg-white" />
            </div>
          ))}
        </div>
      ) : favoriteFacilities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favoriteFacilities.map((facility) => (
            <div key={facility.facilityId} className="rounded-[2rem] border border-rose-100 bg-rose-50/50 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">{facility.facilityName}</h3>
                  <p className="text-sm text-gray-500">{facility.address}</p>
                </div>
                <Heart className="h-5 w-5 text-rose-500 fill-rose-500 flex-shrink-0" />
              </div>
              {(() => {
                const favorite = favorites.find((item) => item.facilityId === facility.facilityId);
                if (!favorite) return null;

                const availabilityPending = alertPendingId === `${facility.facilityId}:notifyOnAvailability`;
                const pricePending = alertPendingId === `${facility.facilityId}:notifyOnPriceDrop`;

                return (
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      disabled={availabilityPending}
                      onClick={() =>
                        updateAlertPreference(
                          facility.facilityId,
                          'notifyOnAvailability',
                          !favorite.notifyOnAvailability
                        )
                      }
                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                        favorite.notifyOnAvailability
                          ? 'bg-sky-50 border-sky-100 text-sky-700'
                          : 'bg-white border-gray-200 text-gray-500'
                      } ${availabilityPending ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em]">Open Spot Alerts</p>
                      <p className="mt-1 text-sm font-bold">
                        {favorite.notifyOnAvailability ? 'Enabled' : 'Paused'}
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={pricePending}
                      onClick={() =>
                        updateAlertPreference(
                          facility.facilityId,
                          'notifyOnPriceDrop',
                          !favorite.notifyOnPriceDrop
                        )
                      }
                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                        favorite.notifyOnPriceDrop
                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                          : 'bg-white border-gray-200 text-gray-500'
                      } ${pricePending ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em]">Price Drop Alerts</p>
                      <p className="mt-1 text-sm font-bold">{favorite.notifyOnPriceDrop ? 'Enabled' : 'Paused'}</p>
                    </button>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between text-sm font-bold text-gray-600">
                <span>{facility.availableSpaces} spots left</span>
                <span>{facility.pricePerHour} ETB/hr</span>
              </div>
              <button
                type="button"
                onClick={() => startNavigation(facility)}
                className="w-full rounded-2xl bg-gray-900 text-white px-4 py-3 font-bold hover:bg-black transition-all inline-flex items-center justify-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                <span>Navigate Again</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-gray-200 p-8 text-center bg-gray-50">
          <Heart className="h-10 w-10 text-rose-400 mx-auto" />
          <p className="mt-4 text-lg font-bold text-gray-900">No saved lots yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Tap the heart on a parking facility to keep it handy for fast rebooking.
          </p>
        </div>
      )}
    </div>
  ) : null;

  const listView = (
    <div className="space-y-6">
      {showLoadingState ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 animate-pulse space-y-4">
              <div className="h-6 w-1/3 bg-gray-100 rounded-lg" />
              <div className="h-4 w-2/3 bg-gray-50 rounded-lg" />
              <div className="flex space-x-4">
                <div className="h-10 w-24 bg-gray-50 rounded-xl" />
                <div className="h-10 w-24 bg-gray-50 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center space-y-4">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No parking facilities found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {filteredFacilities.map((facility, index) => {
              const isFavorite = favoriteIds.includes(facility.facilityId);
              const isFavoritePending = favoritePendingId === facility.facilityId;

              return (
                <motion.div
                  key={facility.facilityId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-6 right-6 flex items-center gap-2 flex-wrap justify-end max-w-[45%]">
                    {isDriverSession && (
                      <button
                        type="button"
                        onClick={() => toggleFavorite(facility)}
                        disabled={isFavoritePending}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-black border transition-all ${
                          isFavorite
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-rose-200 hover:text-rose-600'
                        } ${isFavoritePending ? 'opacity-60 cursor-wait' : ''}`}
                      >
                        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{isFavorite ? 'Saved' : 'Save'}</span>
                      </button>
                    )}
                    {index === 0 && (
                      <div className="bg-orange-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-1 shadow-lg shadow-orange-200">
                        <Zap className="h-3 w-3" />
                        <span>Best Match</span>
                      </div>
                    )}
                    <div className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl text-sm font-black border border-amber-100 flex items-center space-x-1 shadow-sm">
                      <Star className="h-4 w-4 fill-amber-600" />
                      <span>{facility.score.toFixed(1)}/10</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pr-32 md:pr-0">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-bold text-gray-900">{facility.facilityName}</h3>
                        <div
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            facility.availableSpaces > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {facility.availableSpaces > 0 ? 'Available' : 'Full'}
                        </div>
                      </div>
                      <div className="flex items-center text-gray-500 text-sm font-medium">
                        <MapPin className="h-4 w-4 mr-1 text-orange-600" />
                        <span>{facility.address}</span>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-start space-x-2">
                        <Zap className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-orange-800 font-medium leading-tight">
                          {facility.recommendationReason}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-black text-orange-600">
                          {facility.pricePerHour} <span className="text-sm font-bold text-gray-400">ETB/hr</span>
                        </p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {facility.availableSpaces} spots left
                        </p>
                      </div>
                      <button
                        onClick={() => startNavigation(facility)}
                        className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-md ${
                          destination?.lat === facility.latitude && destination?.lng === facility.longitude
                            ? 'bg-orange-100 text-orange-600 shadow-orange-50'
                            : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100'
                        }`}
                      >
                        <Navigation
                          className={`h-4 w-4 ${
                            destination?.lat === facility.latitude && destination?.lng === facility.longitude
                              ? 'animate-pulse'
                              : ''
                          }`}
                        />
                        <span>
                          {destination?.lat === facility.latitude && destination?.lng === facility.longitude
                            ? 'Navigating...'
                            : 'Navigate'}
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  const mapView = (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
      className={`bg-white rounded-[2.5rem] relative overflow-hidden shadow-xl border-4 border-white z-0 ${
        isNavigating ? 'w-full h-[34rem] lg:h-[44rem]' : 'aspect-square'
      }`}
    >
      {isNavigating && (
        <div className="absolute left-5 right-5 top-5 z-[500] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="bg-white/95 backdrop-blur px-5 py-4 rounded-2xl border border-orange-100 shadow-lg max-w-xl">
            <div className="flex items-center gap-2 text-orange-600 text-sm font-black uppercase tracking-[0.18em]">
              <Route className="h-4 w-4" />
              <span>Navigation Mode</span>
            </div>
            <p className="mt-2 text-lg font-black text-gray-900">
              {destinationFacility?.facilityName || 'Selected destination'}
            </p>
            <p className="text-sm text-gray-500">
              {destinationFacility?.address || 'Following the active route on the live map.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDestination(null)}
            className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 text-white font-bold shadow-lg hover:bg-black transition-all"
          >
            <XCircle className="h-4 w-4" />
            <span>Stop Navigation</span>
          </button>
        </div>
      )}

      {userLocation && (
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapUpdater center={[userLocation.lat, userLocation.lng]} />
          <MapResizer trigger={isNavigating ? 'expanded' : 'default'} />
          <Routing userLocation={userLocation} destination={destination} />

          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>

          {filteredFacilities.map((facility) => {
            const isFavorite = favoriteIds.includes(facility.facilityId);
            const isFavoritePending = favoritePendingId === facility.facilityId;

            return (
              <Marker
                key={facility.facilityId}
                position={[facility.latitude, facility.longitude]}
                icon={parkingIcon}
              >
                <Popup>
                  <div className="p-2 space-y-2">
                    <p className="font-bold text-gray-900">{facility.facilityName}</p>
                    <p className="text-xs text-orange-600 font-bold">{facility.pricePerHour} ETB/hr</p>
                    <p className="text-[10px] text-gray-500">{facility.availableSpaces} spots available</p>
                    {isDriverSession && (
                      <button
                        type="button"
                        onClick={() => toggleFavorite(facility)}
                        disabled={isFavoritePending}
                        className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all border ${
                          isFavorite
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-white text-gray-600 border-gray-200 hover:text-rose-600 hover:border-rose-200'
                        } ${isFavoritePending ? 'opacity-60 cursor-wait' : ''}`}
                      >
                        {isFavorite ? 'Remove Favorite' : 'Save Favorite'}
                      </button>
                    )}
                    <button
                      onClick={() => startNavigation(facility)}
                      className="w-full bg-orange-600 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold hover:bg-orange-700 transition-all"
                    >
                      Navigate Here
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}
      {!userLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-2">
            <MapIcon className="h-12 w-12 text-orange-600 mx-auto animate-pulse" />
            <p className="font-bold text-gray-500">Loading Map...</p>
          </div>
        </div>
      )}
    </motion.div>
  );

  const quickTipsCard = (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
      <h4 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
        <Info className="h-5 w-5 text-orange-600" />
        <span>Quick Tips</span>
      </h4>
      <div className="space-y-4">
        {isNavigating && (
          <div className="flex items-start space-x-3">
            <div className="bg-gray-900 p-2 rounded-lg mt-1">
              <Navigation className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Navigation is active. Use the larger map to track the route, then press{' '}
              <span className="font-bold text-gray-900">Stop Navigation</span> when you want to return to browsing.
            </p>
          </div>
        )}
        {isDriverSession && (
          <div className="flex items-start space-x-3">
            <div className="bg-rose-100 p-2 rounded-lg mt-1">
              <Heart className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Favorite the lots you use most often so you can jump back into navigation faster next time.
            </p>
          </div>
        )}
        {isDriverSession && (
          <div className="flex items-start space-x-3">
            <div className="bg-sky-100 p-2 rounded-lg mt-1">
              <Bell className="h-4 w-4 text-sky-600" />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Turn on smart alerts for favorites to catch availability recoveries and price drops sooner.
            </p>
          </div>
        )}
        <div className="flex items-start space-x-3">
          <div className="bg-orange-100 p-2 rounded-lg mt-1">
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Peak hours are between 8:00 AM and 10:00 AM. Prices may vary.
          </p>
        </div>
        <div className="flex items-start space-x-3">
          <div className="bg-purple-100 p-2 rounded-lg mt-1">
            <CreditCard className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Most lots accept mobile payments via Telebirr or CBE Birr.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Find Parking</h1>
          <p className="text-gray-500">AI-powered recommendations near you</p>
          {ranking && !loading && (
            <p className="mt-2 text-sm font-medium text-orange-600">Refreshing recommendations...</p>
          )}
          {!storedUser && (
            <div className="mt-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-sm font-medium border border-orange-100 inline-block">
              Guest Mode: Sign in to save favorite spots and history.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === 'all' ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('cheap')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === 'cheap' ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Budget
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === 'available'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Available
            </button>
            {isDriverSession && (
              <button
                onClick={() => setFilter('favorites')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all inline-flex items-center gap-2 ${
                  filter === 'favorites'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-100'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Heart className={`h-4 w-4 ${filter === 'favorites' ? 'fill-white' : ''}`} />
                <span>Favorites</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <label className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm min-w-[280px]">
              <Search className="h-4 w-4 text-orange-600" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by facility or address"
                className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none placeholder:text-gray-400"
              />
            </label>

            <label className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
              <Filter className="h-4 w-4 text-orange-600" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="bg-transparent text-sm font-bold text-gray-700 outline-none"
              >
                <option value="best-match">Best Match</option>
                <option value="price-low">Lowest Price</option>
                <option value="availability-high">Most Spaces</option>
                <option value="name-asc">Name A-Z</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {favoriteFeedback && (
        <div className="bg-white border border-rose-100 text-rose-600 px-5 py-4 rounded-2xl shadow-sm font-medium">
          {favoriteFeedback}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Matches</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{filteredFacilities.length}</p>
        </div>
        <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Visible Spots</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{visibleAvailableSpots}</p>
        </div>
        <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Saved Lots</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{isDriverSession ? favorites.length : 0}</p>
        </div>
        <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Recent Alerts</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{isDriverSession ? smartAlerts.length : 0}</p>
        </div>
        <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Sort Mode</p>
          <p className="mt-2 text-lg font-black text-gray-900">
            {sortBy === 'best-match' && 'AI Best Match'}
            {sortBy === 'price-low' && 'Lowest Price'}
            {sortBy === 'availability-high' && 'Most Spaces'}
            {sortBy === 'name-asc' && 'Name A-Z'}
          </p>
        </div>
      </div>

      {alertsCard}
      {favoritesCard}

      {isNavigating ? (
        <div className="space-y-8">
          {mapView}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">{listView}</div>
            <div>{quickTipsCard}</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">{listView}</div>
          <div className="space-y-8">
            {mapView}
            {quickTipsCard}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
