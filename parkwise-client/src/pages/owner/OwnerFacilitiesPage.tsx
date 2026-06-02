import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Cpu, ParkingCircle, Plus } from 'lucide-react';
import { owner as ownerApi } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, Card, CardContent, EmptyState, FacilityStatusBadge, Spinner } from '../../components/ui';
import { formatPrice } from '../../lib/format';

export function OwnerFacilitiesPage() {
  const { data, loading } = useAsync(() => ownerApi.listFacilities(), []);

  return (
    <div>
      <PageHeader
        title="My facilities"
        subtitle="All parking facilities you have registered."
        actions={
          <Link to="/owner/facilities/new">
            <Button>
              <Plus className="h-4 w-4" /> New facility
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data || data.facilities.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No facilities yet"
          description="Register a facility to make it available to drivers after approval."
          action={
            <Link to="/owner/facilities/new">
              <Button>Register a facility</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.facilities.map((f) => (
            <Link key={f.id} to={`/owner/facilities/${f.id}`}>
              <Card className="transition hover:border-gray-200">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-gray-900">{f.name}</p>
                      {f.facilityType === 'API_INTEGRATED' ? (
                        <Cpu className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ParkingCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <p className="truncate text-sm text-gray-500">{f.address}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {f.availableSpaces}/{f.totalSpaces} free · {formatPrice(f.hourlyPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FacilityStatusBadge status={f.status} />
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
