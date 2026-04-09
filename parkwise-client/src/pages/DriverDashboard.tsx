import React, { useDeferredValue, useEffect, useRef, useState } from 'react';
import { rankParkingFacilities, ParkingLocation, ScoredParkingLocation } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Star, Info, Filter, Search, Zap, Clock, CreditCard, Map as MapIcon, XCircle, Route } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { getParkingLocations, getStoredUser } from '../lib/api';

// Custom Marker Icon for User
const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// Custom Marker Icon for Parking
const parkingIcon = L.divIcon({
  className: 'custom-parking-icon',
  html: `<div style="background-color: #ea580c; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
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

const Routing = ({ userLocation, destination }: { userLocation: { lat: number, lng: number }, destination: { lat: number, lng: number } | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !destination) return;

    const routingControl = (L as any).Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      routeWhileDragging: true,
      lineOptions: {
        styles: [{ color: '#ea580c', weight: 6, opacity: 0.8 }]
      },
      createMarker: () => null, // Don't create extra markers
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false // Hide the textual instructions panel
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
  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [scoredFacilities, setScoredFacilities] = useState<ScoredParkingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number, lng: number } | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'best-match' | 'price-low' | 'availability-high' | 'name-asc'>('best-match');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const lastFacilitiesSnapshotRef = useRef('');

  const hasMeaningfulLocationChange = (
    previous: { lat: number, lng: number } | null,
    next: { lat: number, lng: number }
  ) => {
    if (!previous) return true;

    const latDelta = Math.abs(previous.lat - next.lat);
    const lngDelta = Math.abs(previous.lng - next.lng);

    return latDelta > 0.0003 || lngDelta > 0.0003;
  };

  useEffect(() => {
    // Watch user location
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const nextLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          setUserLocation((currentLocation) =>
            hasMeaningfulLocationChange(currentLocation, nextLocation) ? nextLocation : currentLocation
          );
        },
        (error) => {
          console.error("Error watching location:", error);
          setUserLocation((currentLocation) => currentLocation ?? { lat: 9.03, lng: 38.74 });
        },
        { enableHighAccuracy: true }
      );
    }

    const loadFacilities = async () => {
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
        setLoading(false);
      }
    };

    loadFacilities();
    const intervalId = window.setInterval(loadFacilities, 10000);

    return () => {
      window.clearInterval(intervalId);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    const performRanking = async () => {
      if (userLocation && facilities.length > 0) {
        setRanking(scoredFacilities.length === 0);
        const ranked = await rankParkingFacilities(userLocation.lat, userLocation.lng, facilities);
        setScoredFacilities(ranked);
        setRanking(false);
      }
    };

    performRanking();
  }, [userLocation, facilities]);

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
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.pricePerHour - b.pricePerHour;
      if (sortBy === 'availability-high') return b.availableSpaces - a.availableSpaces;
      if (sortBy === 'name-asc') return a.facilityName.localeCompare(b.facilityName);
      return b.score - a.score;
    });

  const visibleAvailableSpots = filteredFacilities.reduce((sum, facility) => sum + facility.availableSpaces, 0);
  const showLoadingState = loading || (ranking && scoredFacilities.length === 0);
  const isNavigating = Boolean(destination);
  const destinationFacility = destination
    ? scoredFacilities.find(
        (facility) => facility.latitude === destination.lat && facility.longitude === destination.lng
      ) || null
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Find Parking</h1>
          <p className="text-gray-500">AI-powered recommendations near you</p>
          {!getStoredUser() && (
            <div className="mt-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-sm font-medium border border-orange-100 inline-block">
              Guest Mode: Sign in to save your favorite spots and history.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('cheap')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'cheap' ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Budget
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'available' ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Available
            </button>
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Matches</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{filteredFacilities.length}</p>
        </div>
        <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Visible Spots</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{visibleAvailableSpots}</p>
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

      <div className={`grid gap-8 ${isNavigating ? 'xl:grid-cols-5' : 'lg:grid-cols-3'}`}>
        {/* List View */}
        <div className={`${isNavigating ? 'xl:col-span-2' : 'lg:col-span-2'} space-y-6`}>
          {showLoadingState ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
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
                {filteredFacilities.map((facility, index) => (
                  <motion.div
                    key={facility.facilityId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all group relative overflow-hidden"
                  >
                    {/* Rating & Badge Layout */}
                    <div className="absolute top-6 right-6 flex items-center space-x-2">
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
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${facility.availableSpaces > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
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
                          <p className="text-2xl font-black text-orange-600">{facility.pricePerHour} <span className="text-sm font-bold text-gray-400">ETB/hr</span></p>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{facility.availableSpaces} spots left</p>
                        </div>
                        <button 
                          onClick={() => setDestination({ lat: facility.latitude, lng: facility.longitude })}
                          className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-md ${
                            destination?.lat === facility.latitude && destination?.lng === facility.longitude
                              ? 'bg-orange-100 text-orange-600 shadow-orange-50'
                              : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100'
                          }`}
                        >
                          <Navigation className={`h-4 w-4 ${destination?.lat === facility.latitude && destination?.lng === facility.longitude ? 'animate-pulse' : ''}`} />
                          <span>{destination?.lat === facility.latitude && destination?.lng === facility.longitude ? 'Navigating...' : 'Navigate'}</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Real Map View */}
        <div className="space-y-8">
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 160, damping: 20 }}
            className={`bg-white rounded-[2.5rem] relative overflow-hidden shadow-xl border-4 border-white z-0 ${
              isNavigating ? 'min-h-[28rem] lg:min-h-[38rem] xl:col-span-3' : 'aspect-square'
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
                
                {/* User Location Marker */}
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                  <Popup>You are here</Popup>
                </Marker>

                {/* Parking Markers */}
                {filteredFacilities.map((f) => (
                  <Marker 
                    key={f.facilityId} 
                    position={[f.latitude, f.longitude]}
                    icon={parkingIcon}
                  >
                    <Popup>
                      <div className="p-2 space-y-1">
                        <p className="font-bold text-gray-900">{f.facilityName}</p>
                        <p className="text-xs text-orange-600 font-bold">{f.pricePerHour} ETB/hr</p>
                        <p className="text-[10px] text-gray-500">{f.availableSpaces} spots available</p>
                        <button 
                          onClick={() => setDestination({ lat: f.latitude, lng: f.longitude })}
                          className="w-full mt-2 bg-orange-600 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold hover:bg-orange-700 transition-all"
                        >
                          Navigate Here
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
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
                    Navigation is active. Use the larger map to track the route, then press <span className="font-bold text-gray-900">Stop Navigation</span> when you want to return to browsing.
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
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
