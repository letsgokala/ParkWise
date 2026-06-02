import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  ApiError,
  driver as driverApi,
  facilities as facilitiesApi,
  type Recommendation,
} from '../lib/api';
import { useGeolocation } from '../lib/useGeolocation';
import { RecommendationCard } from '../components/facility/RecommendationCard';
import { Button, Card, CardContent, EmptyState, Field, Input, Spinner } from '../components/ui';

export function RecommendationsPage() {
  const navigate = useNavigate();
  const { location, request, useDefault } = useGeolocation();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(15);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Default to Addis center immediately, then upgrade to GPS if granted.
  useEffect(() => {
    useDefault();
    request();
  }, [useDefault, request]);

  useEffect(() => {
    driverApi
      .listFavorites()
      .then(({ favorites }) => setFavorites(new Set(favorites.map((f) => f.facilityId))))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      const { recommendations } = await facilitiesApi.rank(location.lat, location.lng, radiusKm);
      setRecs(recommendations);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  }, [location, radiusKm]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = async (facilityId: string) => {
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
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI recommendations</h1>
          <p className="text-sm text-gray-500">Ranked for you by distance, price, availability and traffic.</p>
        </div>
      </div>

      <Card className="mb-6 border-orange-100 bg-orange-50">
        <CardContent className="flex items-start gap-3 text-sm text-orange-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Each facility gets a transparent score: <strong>distance 35%</strong>,{' '}
            <strong>price 25%</strong>, <strong>availability 25%</strong>, <strong>traffic 15%</strong>.
            The breakdown under each card shows exactly how the score was computed.
          </p>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-end gap-3">
        <div className="w-32">
          <Field label="Radius (km)">
            <Input
              type="number"
              min={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value) || 1)}
            />
          </Field>
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : recs.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="No recommendations yet"
          description="No approved facilities were found within your radius. Try increasing it."
        />
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => (
            <RecommendationCard
              key={rec.facility.id}
              rec={rec}
              showFavorite
              isFavorite={favorites.has(rec.facility.id)}
              onToggleFavorite={() => toggleFavorite(rec.facility.id)}
              onNavigate={() => navigate(`/facilities/${rec.facility.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
