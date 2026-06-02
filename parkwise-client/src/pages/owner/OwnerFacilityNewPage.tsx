import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { owner as ownerApi, ApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, Card, CardContent, Field, Input, Select } from '../../components/ui';
import { LocationPicker } from '../../components/map/LocationPicker';

const schema = z
  .object({
    name: z.string().min(2, 'Facility name is required.'),
    address: z.string().min(2, 'Pick a location on the map (or type the address).'),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    totalSpaces: z.coerce.number().int().positive('Must be a positive number.'),
    availableSpaces: z.coerce.number().int().nonnegative(),
    hourlyPrice: z.coerce.number().nonnegative(),
    facilityType: z.enum(['MANUAL', 'API_INTEGRATED']),
    endpointUrl: z.string().url('Enter a valid URL.').optional().or(z.literal('')),
    authToken: z.string().optional(),
    refreshIntervalSeconds: z.coerce.number().int().min(30).optional(),
  })
  .refine((d) => d.availableSpaces <= d.totalSpaces, {
    message: 'Available spaces cannot exceed total spaces.',
    path: ['availableSpaces'],
  })
  .refine((d) => d.facilityType !== 'API_INTEGRATED' || (d.endpointUrl && d.authToken), {
    message: 'API endpoint and token are required for smart facilities.',
    path: ['endpointUrl'],
  });

type FormValues = z.infer<typeof schema>;

export function OwnerFacilityNewPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      facilityType: 'MANUAL',
      latitude: 9.0108,
      longitude: 38.7613,
      address: '',
      refreshIntervalSeconds: 300,
    },
  });

  const isApi = watch('facilityType') === 'API_INTEGRATED';
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const address = watch('address');

  const onSubmit = handleSubmit(async (v) => {
    try {
      // congestionLevel is intentionally omitted — drivers see real-time traffic
      // on the map; the backend defaults the stored value to MEDIUM.
      const payload: Record<string, unknown> = {
        name: v.name,
        address: v.address,
        latitude: v.latitude,
        longitude: v.longitude,
        totalSpaces: v.totalSpaces,
        availableSpaces: v.availableSpaces,
        hourlyPrice: v.hourlyPrice,
        facilityType: v.facilityType,
      };
      if (v.facilityType === 'API_INTEGRATED') {
        payload.api = {
          endpointUrl: v.endpointUrl,
          authToken: v.authToken,
          refreshIntervalSeconds: v.refreshIntervalSeconds ?? 300,
        };
      }
      await ownerApi.createFacility(payload);
      toast.success('Facility submitted! It is now pending review.');
      navigate('/owner/facilities');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not create facility.');
    }
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/owner/facilities"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to facilities
      </Link>
      <PageHeader title="Register a facility" subtitle="New facilities start as Pending until a system admin approves them." />

      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Facility name" error={errors.name?.message}>
              <Input {...register('name')} />
            </Field>

            {/* Map-based location: sets lat/lng (and address when geocoding is available). */}
            <LocationPicker
              latitude={Number(latitude ?? 9.0108)}
              longitude={Number(longitude ?? 38.7613)}
              address={address ?? ''}
              onChange={(loc) => {
                if (loc.latitude !== undefined) setValue('latitude', loc.latitude, { shouldValidate: true });
                if (loc.longitude !== undefined) setValue('longitude', loc.longitude, { shouldValidate: true });
                if (loc.address !== undefined) setValue('address', loc.address, { shouldValidate: true });
              }}
            />
            {(errors.address || errors.latitude || errors.longitude) && (
              <p className="text-xs font-medium text-red-600">
                {errors.address?.message ?? 'Set the facility location on the map.'}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Total spaces" error={errors.totalSpaces?.message}>
                <Input type="number" {...register('totalSpaces')} />
              </Field>
              <Field label="Available spaces" error={errors.availableSpaces?.message}>
                <Input type="number" {...register('availableSpaces')} />
              </Field>
            </div>

            <Field label="Hourly price (ETB)" error={errors.hourlyPrice?.message}>
              <Input type="number" step="any" {...register('hourlyPrice')} />
            </Field>

            <Field label="Facility type" hint="Smart facilities sync availability from an external API.">
              <Select {...register('facilityType')}>
                <option value="MANUAL">Manual (admin updates availability)</option>
                <option value="API_INTEGRATED">Smart / API-integrated</option>
              </Select>
            </Field>

            {isApi && (
              <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">API integration</p>
                <Field label="API endpoint URL" error={errors.endpointUrl?.message}>
                  <Input placeholder="https://provider.example.com/availability" {...register('endpointUrl')} />
                </Field>
                <Field label="API auth token" error={errors.authToken?.message}>
                  <Input placeholder="secret token (stored encrypted)" {...register('authToken')} />
                </Field>
                <Field label="Refresh interval (seconds)" error={errors.refreshIntervalSeconds?.message}>
                  <Input type="number" {...register('refreshIntervalSeconds')} />
                </Field>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link to="/owner/facilities">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={isSubmitting}>
                Submit for review
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
