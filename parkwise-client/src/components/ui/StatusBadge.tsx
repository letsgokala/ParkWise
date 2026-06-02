import type { Congestion, FacilityStatus } from '../../lib/api';
import { congestionMeta, facilityStatusMeta } from '../../lib/format';
import { Badge } from './primitives';

export function FacilityStatusBadge({ status }: { status: FacilityStatus }) {
  const meta = facilityStatusMeta[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function CongestionBadge({ level }: { level: Congestion }) {
  const meta = congestionMeta[level];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function SyncStatusBadge({ status }: { status: 'SUCCESS' | 'FAILED' | 'NEVER' }) {
  const map = {
    SUCCESS: { label: 'Synced', className: 'bg-green-100 text-green-700' },
    FAILED: { label: 'Sync failed', className: 'bg-red-100 text-red-700' },
    NEVER: { label: 'Never synced', className: 'bg-gray-100 text-gray-600' },
  } as const;
  const meta = map[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function AssignmentStatusBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED' }) {
  const map = {
    ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
    SUSPENDED: { label: 'Suspended', className: 'bg-amber-100 text-amber-700' },
    REMOVED: { label: 'Removed', className: 'bg-gray-200 text-gray-600' },
  } as const;
  const meta = map[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}
