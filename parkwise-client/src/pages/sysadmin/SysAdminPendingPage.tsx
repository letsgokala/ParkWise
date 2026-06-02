import { CheckCircle2 } from 'lucide-react';
import { systemAdmin as systemAdminApi } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import { FacilityReviewCard } from '../../components/admin/FacilityReviewCard';
import { EmptyState, Spinner } from '../../components/ui';

export function SysAdminPendingPage() {
  const { data, loading, reload } = useAsync(() => systemAdminApi.pending(), []);

  return (
    <div>
      <PageHeader title="Pending review" subtitle="Approve, reject or suspend newly registered facilities." />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data || data.facilities.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-10 w-10" />}
          title="All caught up"
          description="There are no facilities awaiting review."
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
