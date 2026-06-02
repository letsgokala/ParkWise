import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { owner as ownerApi, ApiError, type ParkingAdminAccount } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  AssignmentStatusBadge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Select,
  Spinner,
} from '../../components/ui';
import { formatRelativeTime } from '../../lib/format';

export function OwnerAssignmentsPage() {
  const { data, loading, reload } = useAsync(async () => {
    const [a, b] = await Promise.all([ownerApi.listAssignments(), ownerApi.listAdmins()]);
    return { assignments: a.assignments, admins: b.admins };
  }, []);

  const [dialog, setDialog] = useState<{ type: 'remove' | 'replace'; id: string } | null>(null);
  const [newAdminId, setNewAdminId] = useState('');
  const [busy, setBusy] = useState(false);

  const activeAdmins: ParkingAdminAccount[] = (data?.admins ?? []).filter((a) => a.adminStatus === 'ACTIVE');

  const act = async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      setDialog(null);
      setNewAdminId('');
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Admin assignments" subtitle="Assignment history and lifecycle across your facilities." />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data || data.assignments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="No assignments yet"
          description="Assign a parking administrator from a facility's detail page."
        />
      ) : (
        <div className="space-y-3">
          {data.assignments.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {a.adminName} <span className="text-gray-400">→</span> {a.facilityName}
                  </p>
                  <p className="text-sm text-gray-500">{a.adminEmail}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Assigned {formatRelativeTime(a.assignedAt)}
                    {a.removedAt && ` · removed ${formatRelativeTime(a.removedAt)}`}
                    {a.notes && ` · ${a.notes}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AssignmentStatusBadge status={a.status} />
                  {a.status === 'ACTIVE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => act(() => ownerApi.suspendAssignment(a.id), 'Assignment suspended.')}
                    >
                      Suspend
                    </Button>
                  )}
                  {a.status !== 'REMOVED' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setDialog({ type: 'replace', id: a.id })}>
                        Replace
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDialog({ type: 'remove', id: a.id })}>
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={dialog?.type === 'remove'}
        title="Remove assignment?"
        description="The administrator will lose access to this facility. The record is preserved for history."
        destructive
        confirmLabel="Remove"
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() => dialog && act(() => ownerApi.removeAssignment(dialog.id), 'Assignment removed.')}
      />

      <ConfirmDialog
        open={dialog?.type === 'replace'}
        title="Replace administrator"
        description="The current assignment is removed and a new active assignment is created."
        confirmLabel="Replace"
        loading={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (!dialog || !newAdminId) {
            toast.error('Select a replacement administrator.');
            return;
          }
          void act(
            () => ownerApi.replaceAssignment(dialog.id, { newParkingAdminId: newAdminId }),
            'Administrator replaced.',
          );
        }}
      >
        <Select value={newAdminId} onChange={(e) => setNewAdminId(e.target.value)}>
          <option value="">Select replacement…</option>
          {activeAdmins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.email})
            </option>
          ))}
        </Select>
      </ConfirmDialog>
    </div>
  );
}
