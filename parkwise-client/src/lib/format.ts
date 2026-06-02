import type { Congestion, FacilityStatus } from './api';

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatPrice(etb: number): string {
  return `${etb.toLocaleString()} ETB/hr`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export const congestionMeta: Record<Congestion, { label: string; className: string }> = {
  LOW: { label: 'Low traffic', className: 'bg-green-100 text-green-700' },
  MEDIUM: { label: 'Moderate traffic', className: 'bg-amber-100 text-amber-700' },
  HIGH: { label: 'Heavy traffic', className: 'bg-red-100 text-red-700' },
};

export const facilityStatusMeta: Record<FacilityStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  SUSPENDED: { label: 'Suspended', className: 'bg-gray-200 text-gray-700' },
};

/** Availability marker color buckets (also used for map markers). */
export function availabilityColor(available: number, total: number): string {
  if (available <= 0) return '#dc2626'; // full → red
  const ratio = total > 0 ? available / total : 0;
  if (ratio < 0.2) return '#f59e0b'; // low → amber
  return '#16a34a'; // available → green
}

export function availabilityLabel(available: number, total: number): string {
  if (available <= 0) return 'Full';
  const ratio = total > 0 ? available / total : 0;
  if (ratio < 0.2) return 'Limited';
  return 'Available';
}
