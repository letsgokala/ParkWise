import { useState } from 'react';
import { Cpu, Lock, ParkingCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parkingAdmin as parkingAdminApi, ApiError, type AssignedFacility } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FacilityStatusBadge,
  Field,
  Input,
  SyncStatusBadge,
} from '../ui';
import { formatRelativeTime } from '../../lib/format';

export function FacilityOpsCard({ item, onUpdated }: { item: AssignedFacility; onUpdated: () => void }) {
  const { facility, canEditAvailability, apiIntegration } = item;
  const [available, setAvailable] = useState(String(facility.availableSpaces));
  const [price, setPrice] = useState(String(facility.hourlyPrice));
  const [savingAvail, setSavingAvail] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  const saveAvailability = async () => {
    setSavingAvail(true);
    try {
      await parkingAdminApi.updateAvailability(facility.id, Number(available));
      toast.success('Availability updated.');
      onUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed.');
    } finally {
      setSavingAvail(false);
    }
  };

  const savePrice = async () => {
    setSavingPrice(true);
    try {
      await parkingAdminApi.updatePrice(facility.id, Number(price));
      toast.success('Price updated.');
      onUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed.');
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {facility.facilityType === 'API_INTEGRATED' ? (
              <Cpu className="h-4 w-4 text-gray-400" />
            ) : (
              <ParkingCircle className="h-4 w-4 text-gray-400" />
            )}
            {facility.name}
          </CardTitle>
          <p className="text-sm text-gray-500">{facility.address}</p>
        </div>
        <FacilityStatusBadge status={facility.status} />
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {/* Availability */}
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Available spaces</p>
          {canEditAvailability ? (
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={facility.totalSpaces}
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
              />
              <Button onClick={saveAvailability} loading={savingAvail}>
                Update
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
              <p className="flex items-center gap-1 font-semibold text-gray-700">
                <Lock className="h-3.5 w-3.5" /> {facility.availableSpaces}/{facility.totalSpaces} (API-managed)
              </p>
              {apiIntegration && (
                <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <SyncStatusBadge status={apiIntegration.lastSyncStatus} /> last sync{' '}
                  {formatRelativeTime(apiIntegration.lastSyncAt)}
                </p>
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-400">of {facility.totalSpaces} total spaces</p>
        </div>

        {/* Price */}
        <div>
          <Field label="Hourly price (ETB)">
            <div className="flex gap-2">
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              <Button onClick={savePrice} loading={savingPrice}>
                Update
              </Button>
            </div>
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
