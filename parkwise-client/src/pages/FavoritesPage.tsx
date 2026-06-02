import { useNavigate } from 'react-router-dom';
import { Bell, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { driver as driverApi } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { FacilityCard } from '../components/facility/FacilityCard';
import { Card, CardContent, EmptyState, Spinner } from '../components/ui';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => driverApi.listFavorites(), []);

  const remove = async (facilityId: string) => {
    try {
      await driverApi.removeFavorite(facilityId);
      toast.success('Removed from favorites.');
      void reload();
    } catch {
      toast.error('Could not remove favorite.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-red-100 p-3 text-red-500">
          <Heart className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
          <p className="text-sm text-gray-500">Your saved approved parking facilities.</p>
        </div>
      </div>

      {data && data.alerts.length > 0 && (
        <Card className="mb-4 border-orange-100 bg-orange-50">
          <CardContent className="space-y-1">
            {data.alerts.map((a, i) => (
              <p key={i} className="flex items-center gap-2 text-sm text-orange-900">
                <Bell className="h-4 w-4 shrink-0" /> {a.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !data || data.favorites.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-10 w-10" />}
          title="No favorites yet"
          description="Save facilities from the map to access them quickly here."
        />
      ) : (
        <div className="space-y-3">
          {data.hiddenCount > 0 && (
            <p className="text-xs text-gray-400">
              {data.hiddenCount} favorite{data.hiddenCount > 1 ? 's are' : ' is'} hidden because the
              facility is no longer approved.
            </p>
          )}
          {data.favorites.map((fav) => (
            <FacilityCard
              key={fav.id}
              facility={fav.facility}
              showFavorite
              isFavorite
              onToggleFavorite={() => remove(fav.facilityId)}
              onNavigate={() => navigate(`/facilities/${fav.facilityId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
