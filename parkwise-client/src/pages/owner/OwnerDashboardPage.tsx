import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, Plus, Users } from 'lucide-react';
import { owner as ownerApi } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { Button, Card, CardContent, EmptyState, FacilityStatusBadge, Spinner } from '../../components/ui';
import { formatPrice } from '../../lib/format';

export function OwnerDashboardPage() {
  const { data, loading } = useAsync(() => ownerApi.dashboard(), []);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Owner overview"
        subtitle="Manage your facilities and parking administrators."
        actions={
          <Link to="/owner/facilities/new">
            <Button>
              <Plus className="h-4 w-4" /> New facility
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Facilities" value={data.stats.total} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Approved" value={data.stats.approved} accent="text-green-600" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Pending" value={data.stats.pending} accent="text-amber-600" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Parking admins" value={data.admins.length} icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Your facilities</h2>
          <Link to="/owner/facilities" className="text-sm font-semibold text-orange-600">
            View all
          </Link>
        </div>
        {data.facilities.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-10 w-10" />}
            title="No facilities yet"
            description="Register your first facility to get started. It will be reviewed by a system admin."
            action={
              <Link to="/owner/facilities/new">
                <Button>Register a facility</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.facilities.slice(0, 4).map((f) => (
              <Link key={f.id} to={`/owner/facilities/${f.id}`}>
                <Card className="transition hover:border-gray-200">
                  <CardContent className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{f.name}</p>
                      <p className="truncate text-sm text-gray-500">{f.address}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {f.availableSpaces}/{f.totalSpaces} free · {formatPrice(f.hourlyPrice)}
                      </p>
                    </div>
                    <FacilityStatusBadge status={f.status} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
