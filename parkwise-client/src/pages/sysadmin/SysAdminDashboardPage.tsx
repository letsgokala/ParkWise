import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, ShieldCheck, Users } from 'lucide-react';
import { systemAdmin as systemAdminApi } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '../../components/ui';
import { formatRelativeTime } from '../../lib/format';

export function SysAdminDashboardPage() {
  const { data, loading } = useAsync(async () => {
    const [overview, audit] = await Promise.all([
      systemAdminApi.overview(),
      systemAdminApi.auditLogs(8),
    ]);
    return { overview, logs: audit.logs };
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const { overview, logs } = data;

  return (
    <div>
      <PageHeader
        title="Platform overview"
        subtitle="Monitor facilities and review onboarding requests."
        actions={
          overview.facilitiesByStatus.pending > 0 ? (
            <Link to="/system-admin/facilities/pending">
              <Button>{overview.facilitiesByStatus.pending} pending review</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Users" value={overview.totalUsers} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Facilities" value={overview.totalFacilities} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Approved" value={overview.facilitiesByStatus.approved} accent="text-green-600" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Pending" value={overview.facilitiesByStatus.pending} accent="text-amber-600" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Suspended" value={overview.facilitiesByStatus.suspended} accent="text-gray-600" icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">No audit activity yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {logs.map((log) => (
                <li key={log.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-700">
                    <span className="font-medium">{log.actor?.name ?? 'System'}</span>{' '}
                    <span className="text-gray-500">{log.action.replaceAll('_', ' ').toLowerCase()}</span>
                  </span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
