import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  apiIntegration as apiIntegrationApi,
  owner as ownerApi,
  ApiError,
} from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  AssignmentStatusBadge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FacilityStatusBadge,
  Field,
  Input,
  Select,
  Spinner,
  SyncStatusBadge,
} from '../../components/ui';
import { formatRelativeTime } from '../../lib/format';

export function OwnerFacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, reload } = useAsync(async () => {
    const [detail, admins] = await Promise.all([
      ownerApi.facilityDetail(id!),
      ownerApi.listAdmins(),
    ]);
    return { ...detail, admins: admins.admins };
  }, [id]);

  const [form, setForm] = useState({ name: '', address: '', totalSpaces: 0, hourlyPrice: 0 });
  const [savingFacility, setSavingFacility] = useState(false);
  const [assignAdminId, setAssignAdminId] = useState('');
  const [simulateValue, setSimulateValue] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.facility.name,
        address: data.facility.address,
        totalSpaces: data.facility.totalSpaces,
        hourlyPrice: data.facility.hourlyPrice,
      });
    }
  }, [data]);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const { facility, assignments, apiIntegration } = data;
  const activeAdmins = data.admins.filter((a) => a.adminStatus === 'ACTIVE');

  const saveFacility = async () => {
    setSavingFacility(true);
    try {
      await ownerApi.updateFacility(facility.id, {
        name: form.name,
        address: form.address,
        totalSpaces: Number(form.totalSpaces),
        hourlyPrice: Number(form.hourlyPrice),
      });
      toast.success('Facility updated.');
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed.');
    } finally {
      setSavingFacility(false);
    }
  };

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Action failed.');
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const result = await apiIntegrationApi.sync(facility.id);
      if (result.synced) toast.success('Availability synced from the external API.');
      else toast.warning(result.warning ?? 'Sync failed — showing last known availability.');
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/owner/facilities" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to facilities
      </Link>
      <PageHeader
        title={facility.name}
        subtitle={facility.address}
        actions={<FacilityStatusBadge status={facility.status} />}
      />

      {facility.approvalNotes && (
        <Card className="mb-6 border-amber-100 bg-amber-50">
          <CardContent className="text-sm text-amber-900">
            <strong>Admin note:</strong> {facility.approvalNotes}
          </CardContent>
        </Card>
      )}

      {/* Editable details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Facility details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </Field>
          <Field label="Total spaces">
            <Input
              type="number"
              value={form.totalSpaces}
              onChange={(e) => setForm((f) => ({ ...f, totalSpaces: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Hourly price (ETB)">
            <Input
              type="number"
              value={form.hourlyPrice}
              onChange={(e) => setForm((f) => ({ ...f, hourlyPrice: Number(e.target.value) }))}
            />
          </Field>
          <div className="flex items-end">
            <Button onClick={saveFacility} loading={savingFacility}>
              <Save className="h-4 w-4" /> Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Parking administrators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <Field label="Assign an administrator">
                <Select value={assignAdminId} onChange={(e) => setAssignAdminId(e.target.value)}>
                  <option value="">Select administrator…</option>
                  {activeAdmins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              onClick={() => {
                if (!assignAdminId) return toast.error('Select an administrator.');
                void run(() => ownerApi.assignAdmin(facility.id, { parkingAdminId: assignAdminId }), 'Administrator assigned.');
                setAssignAdminId('');
              }}
            >
              Assign
            </Button>
          </div>

          <div className="space-y-2">
            {assignments.length === 0 && <p className="text-sm text-gray-400">No assignments yet.</p>}
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.adminName}</p>
                  <p className="text-xs text-gray-400">
                    {a.status === 'REMOVED' ? `Removed ${formatRelativeTime(a.removedAt)}` : `Assigned ${formatRelativeTime(a.assignedAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AssignmentStatusBadge status={a.status} />
                  {a.status === 'ACTIVE' && (
                    <Button variant="outline" size="sm" onClick={() => run(() => ownerApi.suspendAssignment(a.id), 'Suspended.')}>
                      Suspend
                    </Button>
                  )}
                  {a.status !== 'REMOVED' && (
                    <Button variant="danger" size="sm" onClick={() => run(() => ownerApi.removeAssignment(a.id), 'Removed.')}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API integration */}
      {facility.facilityType === 'API_INTEGRATED' && apiIntegration && (
        <Card>
          <CardHeader>
            <CardTitle>API integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="text-gray-500">
                <p className="break-all">{apiIntegration.endpointUrl}</p>
                <p className="text-xs">
                  Every {apiIntegration.refreshIntervalSeconds}s · last sync {formatRelativeTime(apiIntegration.lastSyncAt)}
                </p>
                {apiIntegration.lastSyncError && (
                  <p className="text-xs text-red-600">{apiIntegration.lastSyncError}</p>
                )}
              </div>
              <SyncStatusBadge status={apiIntegration.lastSyncStatus} />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button onClick={sync} loading={syncing}>
                <RefreshCw className="h-4 w-4" /> Sync now
              </Button>
              <div className="flex items-end gap-2">
                <div className="w-32">
                  <Field label="Simulate sensor count">
                    <Input
                      type="number"
                      value={simulateValue}
                      onChange={(e) => setSimulateValue(e.target.value)}
                    />
                  </Field>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!simulateValue) return;
                    await apiIntegrationApi.simulate(facility.id, Number(simulateValue));
                    toast.success('Simulated value set. Click "Sync now" to pull it in.');
                  }}
                >
                  Set
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Availability for smart facilities is pulled from the external API on sync — it cannot be
              edited manually.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
