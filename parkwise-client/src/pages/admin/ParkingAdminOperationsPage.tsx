import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { parkingAdmin as parkingAdminApi } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import { FacilityOpsCard } from '../../components/admin/FacilityOpsCard';
import { EmptyState, Spinner } from '../../components/ui';

export function ParkingAdminOperationsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, reload } = useAsync(() => parkingAdminApi.assignedFacilities(), []);

  const item = data?.facilities.find((f) => f.facility.id === id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/parking-admin/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to operations
      </Link>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !item ? (
        <EmptyState
          title="Facility not available"
          description="This facility is not actively assigned to you."
        />
      ) : (
        <>
          <PageHeader title={item.facility.name} subtitle="Facility operations" />
          <FacilityOpsCard item={item} onUpdated={reload} />
        </>
      )}
    </div>
  );
}
