import { useState } from 'react';
import { Building2, Cpu, MapPin, ParkingCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { systemAdmin as systemAdminApi, ApiError, type FacilityWithOwner } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  CongestionBadge,
  FacilityStatusBadge,
  Textarea,
} from '../ui';
import { formatPrice } from '../../lib/format';

type Action = 'approve' | 'reject' | 'suspend';

const ACTION_META: Record<Action, { label: string; verb: string; destructive: boolean }> = {
  approve: { label: 'Approve', verb: 'approve', destructive: false },
  reject: { label: 'Reject', verb: 'reject', destructive: true },
  suspend: { label: 'Suspend', verb: 'suspend', destructive: true },
};

export function FacilityReviewCard({
  facility,
  onReviewed,
}: {
  facility: FacilityWithOwner;
  onReviewed: () => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const available: Action[] = [];
  if (facility.status !== 'APPROVED') available.push('approve');
  if (facility.status !== 'REJECTED') available.push('reject');
  if (facility.status === 'APPROVED') available.push('suspend');

  const submit = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const fn = systemAdminApi[action];
      await fn(facility.id, notes || undefined);
      toast.success(`Facility ${ACTION_META[action].verb}d.`);
      setAction(null);
      setNotes('');
      onReviewed();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <h3 className="truncate font-bold text-gray-900">{facility.name}</h3>
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5" /> {facility.address}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <User className="h-3.5 w-3.5" /> {facility.owner.organizationName} · {facility.owner.email}
            </p>
          </div>
          <FacilityStatusBadge status={facility.status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5">
            {facility.facilityType === 'API_INTEGRATED' ? <Cpu className="h-3 w-3" /> : <ParkingCircle className="h-3 w-3" />}
            {facility.facilityType === 'API_INTEGRATED' ? 'Smart' : 'Manual'}
          </span>
          <span>{facility.totalSpaces} spaces</span>
          <span>· {formatPrice(facility.hourlyPrice)}</span>
          <CongestionBadge level={facility.congestionLevel} />
        </div>

        {facility.approvalNotes && (
          <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-500">Note: {facility.approvalNotes}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {available.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={a === 'approve' ? 'primary' : a === 'reject' ? 'danger' : 'outline'}
              onClick={() => {
                setAction(a);
                setNotes('');
              }}
            >
              {ACTION_META[a].label}
            </Button>
          ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={action !== null}
        title={action ? `${ACTION_META[action].label} "${facility.name}"?` : ''}
        description={
          action === 'approve'
            ? 'Approved facilities become visible to drivers on the map, in search, ranking and navigation.'
            : 'This facility will be hidden from all driver-facing features.'
        }
        confirmLabel={action ? ACTION_META[action].label : 'Confirm'}
        destructive={action ? ACTION_META[action].destructive : false}
        loading={busy}
        onCancel={() => setAction(null)}
        onConfirm={submit}
      >
        <Textarea
          rows={3}
          placeholder="Optional note (shown to the owner)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </ConfirmDialog>
    </Card>
  );
}
