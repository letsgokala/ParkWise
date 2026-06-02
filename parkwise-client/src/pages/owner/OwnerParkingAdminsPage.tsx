import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { owner as ownerApi, ApiError } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Field,
  Input,
  Spinner,
} from '../../components/ui';

const schema = z.object({
  name: z.string().min(2, 'Name is required.'),
  email: z.string().email('Valid email required.'),
  phoneNumber: z.string().min(7, 'Valid phone required.'),
  temporaryPassword: z.string().min(8, 'At least 8 characters.'),
});
type FormValues = z.infer<typeof schema>;

export function OwnerParkingAdminsPage() {
  const { data, loading, reload } = useAsync(() => ownerApi.listAdmins(), []);
  const [showForm, setShowForm] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await ownerApi.createAdmin(values as Parameters<typeof ownerApi.createAdmin>[0]);
      toast.success('Parking administrator created.');
      reset();
      setShowForm(false);
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not create administrator.');
    }
  });

  return (
    <div>
      <PageHeader
        title="Parking administrators"
        subtitle="Create operator accounts and assign them to your facilities."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New admin
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name?.message}>
                <Input {...register('name')} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" {...register('email')} />
              </Field>
              <Field label="Phone number" error={errors.phoneNumber?.message}>
                <Input {...register('phoneNumber')} />
              </Field>
              <Field label="Temporary password" error={errors.temporaryPassword?.message}>
                <Input type="text" {...register('temporaryPassword')} />
              </Field>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Create administrator
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data || data.admins.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No parking administrators yet"
          description="Create an administrator account, then assign them to a facility."
        />
      ) : (
        <div className="space-y-3">
          {data.admins.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{admin.name}</p>
                  <p className="text-sm text-gray-500">
                    {admin.email} · {admin.phoneNumber}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {admin.activeAssignments.length === 0 ? (
                      <span className="text-xs text-gray-400">No active assignments</span>
                    ) : (
                      admin.activeAssignments.map((a) => (
                        <Badge key={a.assignmentId} className="bg-orange-100 text-orange-700">
                          {a.facilityName}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <Badge
                  className={
                    admin.adminStatus === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }
                >
                  {admin.adminStatus}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
