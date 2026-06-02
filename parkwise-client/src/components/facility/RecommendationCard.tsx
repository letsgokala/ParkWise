import { Heart, Navigation } from 'lucide-react';
import type { Recommendation } from '../../lib/api';
import { formatDistance, formatPrice } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Button, CongestionBadge } from '../ui';

const FACTORS: { key: keyof Recommendation['scoreBreakdown']; label: string; color: string }[] = [
  { key: 'distanceScore', label: 'Distance', color: 'bg-blue-500' },
  { key: 'priceScore', label: 'Price', color: 'bg-green-500' },
  { key: 'availabilityScore', label: 'Availability', color: 'bg-orange-500' },
  { key: 'congestionScore', label: 'Traffic', color: 'bg-purple-500' },
];

export function RecommendationCard({
  rec,
  showFavorite,
  isFavorite,
  onToggleFavorite,
  onNavigate,
}: {
  rec: Recommendation;
  showFavorite?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onNavigate?: () => void;
}) {
  const { facility, scoreBreakdown: b, weights } = { ...rec, weights: rec.scoreBreakdown.weights };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold',
            rec.rank === 1 ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700',
          )}
        >
          {rec.rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-bold text-gray-900">{facility.name}</h3>
              <p className="truncate text-sm text-gray-500">{facility.address}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-orange-600">{rec.scorePercent}</div>
              <div className="text-[10px] font-medium uppercase text-gray-400">match</div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span>{formatDistance(rec.distanceKm)}</span>
            <span>·</span>
            <span>{formatPrice(facility.hourlyPrice)}</span>
            <span>·</span>
            <span className={rec.isFull ? 'font-semibold text-red-600' : ''}>
              {facility.availableSpaces}/{facility.totalSpaces} free
            </span>
            <CongestionBadge level={facility.congestionLevel} />
          </div>
        </div>
      </div>

      {/* Explainable score breakdown */}
      <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3">
        {FACTORS.map((factor) => {
          const score = b[factor.key] as number;
          const weight = weights[factor.key.replace('Score', '') as keyof typeof weights];
          return (
            <div key={factor.key} className="flex items-center gap-3 text-xs">
              <span className="w-20 shrink-0 text-gray-500">{factor.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div className={cn('h-full rounded-full', factor.color)} style={{ width: `${score * 100}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right font-medium text-gray-700">
                {(score * 100).toFixed(0)}
              </span>
              <span className="w-10 shrink-0 text-right text-gray-400">×{weight}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {showFavorite && (
          <Button variant="outline" size="sm" onClick={onToggleFavorite}>
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-red-500 text-red-500')} />
          </Button>
        )}
        {onNavigate && (
          <Button size="sm" onClick={onNavigate}>
            <Navigation className="h-4 w-4" /> Navigate
          </Button>
        )}
      </div>
    </div>
  );
}
