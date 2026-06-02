import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { systemAdmin as systemAdminApi, type FacilityStatus } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import { FacilityReviewCard } from '../../components/admin/FacilityReviewCard';
import { EmptyState, Select, Spinner } from '../../components/ui';

type Filter = 'ALL' | FacilityStatus;

export function SysAdminFacilitiesPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const { data, loading, reload } = useAsync(
    () => systemAdminApi.allFacilities(filter === 'ALL' ? undefined : filter),
    [filter],
  );

  return (
    <div>
      <PageHeader
        title="All facilities"
        subtitle="Monitor and moderate every facility on the platform."
        actions={
          <div className="w-44">
            <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data || data.facilities.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No facilities"
          description="No facilities match the selected status."
        />
      ) : (
        <div className="space-y-4">
          {data.facilities.map((f) => (
            <FacilityReviewCard key={f.id} facility={f} onReviewed={reload} />
          ))}
        </div>
      )}
    </div>
  );
}
