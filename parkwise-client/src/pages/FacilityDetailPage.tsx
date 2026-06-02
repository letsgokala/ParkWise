import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Cpu, MapPin, Navigation, ParkingCircle } from 'lucide-react';
import { toast } from 'sonner';
import { facilities as facilitiesApi, navigation as navigationApi, type Facility, type RouteResult } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useGeolocation } from '../lib/useGeolocation';
import {
  availabilityColor,
  availabilityLabel,
  formatDistance,
  formatDuration,
  formatPrice,
  formatRelativeTime,
} from '../lib/format';
import { ParkingMap } from '../components/map/ParkingMap';
import { Button, Card, CardContent, CongestionBadge, FacilityStatusBadge, Spinner } from '../components/ui';

export function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { location, request } = useGeolocation();
  const { data, loading, error } = useAsync(() => facilitiesApi.detail(id!), [id]);
  const [route, setRoute] = useState<RouteResult | null>(null);

  useEffect(() => {
    request();
  }, [request]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-600">{error ?? 'Facility not found.'}</p>
        <Link to="/map" className="mt-4 inline-block font-semibold text-orange-600">
          ← Back to map
        </Link>
      </div>
    );
  }

  const facility: Facility = data.facility;

  const navigate = async () => {
    if (!location) {
      toast.error('Enable location to get directions.');
      return;
    }
    const { route } = await navigationApi.route(location.lat, location.lng, facility.latitude, facility.longitude);
    setRoute(route);
    toast.success(`${formatDistance(route.distanceMeters / 1000)} · ${formatDuration(route.durationSeconds)}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/map" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 overflow-hidden rounded-2xl border border-gray-100 lg:h-full">
          <ParkingMap
            markers={[
              {
                id: facility.id,
                latitude: facility.latitude,
                longitude: facility.longitude,
                availableSpaces: facility.availableSpaces,
                totalSpaces: facility.totalSpaces,
                name: facility.name,
                hourlyPrice: facility.hourlyPrice,
              },
            ]}
            userLocation={location}
            route={route?.geometry ?? null}
            className="h-full w-full"
          />
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-gray-500">
                <MapPin className="h-4 w-4" /> {facility.address}
              </p>
            </div>
            <FacilityStatusBadge status={facility.status} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Card>
              <CardContent>
                <p className="text-xs font-medium uppercase text-gray-400">Availability</p>
                <p
                  className="mt-1 text-xl font-bold"
                  style={{ color: availabilityColor(facility.availableSpaces, facility.totalSpaces) }}
                >
                  {facility.availableSpaces}/{facility.totalSpaces}
                </p>
                <p className="text-xs text-gray-500">
                  {availabilityLabel(facility.availableSpaces, facility.totalSpaces)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs font-medium uppercase text-gray-400">Price</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{formatPrice(facility.hourlyPrice)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CongestionBadge level={facility.congestionLevel} />
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {facility.facilityType === 'API_INTEGRATED' ? (
                <>
                  <Cpu className="h-3 w-3" /> Smart (API-integrated)
                </>
              ) : (
                <>
                  <ParkingCircle className="h-3 w-3" /> Manual
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              <Clock className="h-3 w-3" /> Updated {formatRelativeTime(facility.lastAvailabilityUpdateAt)}
            </span>
          </div>

          <div className="mt-6">
            <Button onClick={navigate} size="lg">
              <Navigation className="h-5 w-5" /> Navigate here
            </Button>
            {route?.fallback && (
              <p className="mt-2 text-xs text-amber-600">
                Showing a straight-line estimate (no routing provider configured).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
