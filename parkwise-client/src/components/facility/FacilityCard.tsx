import { Link } from 'react-router-dom';
import { Cpu, Heart, MapPin, Navigation, ParkingCircle } from 'lucide-react';
import type { Facility } from '../../lib/api';
import { availabilityColor, availabilityLabel, formatDistance, formatPrice } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Button, CongestionBadge } from '../ui';

interface FacilityCardProps {
  facility: Facility;
  distanceKm?: number | null;
  selected?: boolean;
  showFavorite?: boolean;
  isFavorite?: boolean;
  favoriteBusy?: boolean;
  onToggleFavorite?: () => void;
  onNavigate?: () => void;
  onSelect?: () => void;
}

export function FacilityCard({
  facility,
  distanceKm,
  selected,
  showFavorite,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
  onNavigate,
  onSelect,
}: FacilityCardProps) {
  const color = availabilityColor(facility.availableSpaces, facility.totalSpaces);
  const label = availabilityLabel(facility.availableSpaces, facility.totalSpaces);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-4 shadow-soft transition',
        selected ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-100 hover:border-gray-200',
        onSelect && 'cursor-pointer',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-gray-900">{facility.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> {facility.address}
          </p>
        </div>
        {showFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            disabled={favoriteBusy}
            aria-label="Toggle favorite"
            className="shrink-0 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500 disabled:opacity-50"
          >
            <Heart className={cn('h-5 w-5', isFavorite && 'fill-red-500 text-red-500')} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {label} · {facility.availableSpaces}/{facility.totalSpaces}
        </span>
        <CongestionBadge level={facility.congestionLevel} />
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-600">
          {facility.facilityType === 'API_INTEGRATED' ? (
            <>
              <Cpu className="h-3 w-3" /> Smart
            </>
          ) : (
            <>
              <ParkingCircle className="h-3 w-3" /> Manual
            </>
          )}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-bold text-gray-900">{formatPrice(facility.hourlyPrice)}</span>
          {distanceKm != null && (
            <span className="ml-2 text-gray-500">· {formatDistance(distanceKm)} away</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/facilities/${facility.id}`} onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm">
              Details
            </Button>
          </Link>
          {onNavigate && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate();
              }}
            >
              <Navigation className="h-4 w-4" /> Navigate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
