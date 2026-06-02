import { Link } from 'react-router-dom';
import { ParkingSquare } from 'lucide-react';
import { parkingAdmin as parkingAdminApi } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import { FacilityOpsCard } from '../../components/admin/FacilityOpsCard';
import { Button, EmptyState, Spinner } from '../../components/ui';

export function ParkingAdminDashboardPage() {
  const { data, loading, reload } = useAsync(() => parkingAdminApi.assignedFacilities(), []);

  return (
    <div>
      <PageHeader title="Parking operations" subtitle="Manage availability and pricing for your assigned facilities." />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data || data.facilities.length === 0 ? (
        <EmptyState
          icon={<ParkingSquare className="h-10 w-10" />}
          title="No assigned facilities"
          description="You have no active facility assignments. A facility owner must assign you first."
        />
      ) : (
        <div className="space-y-4">
          {data.facilities.map((item) => (
            <div key={item.assignmentId}>
              <FacilityOpsCard item={item} onUpdated={reload} />
              <div className="mt-1 text-right">
                <Link to={`/parking-admin/facilities/${item.facility.id}/operations`}>
                  <Button variant="ghost" size="sm">
                    Open full operations →
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
