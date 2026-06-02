import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { auth, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AuthShell } from '../components/auth/AuthShell';
import { Button, Field, Input } from '../components/ui';

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name.'),
  organizationName: z.string().min(2, 'Enter your organization name.'),
  email: z.string().email('Enter a valid email.'),
  phoneNumber: z.string().min(7, 'Enter a valid phone number.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});
type FormValues = z.infer<typeof schema>;

export function RegisterOwnerPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user } = await auth.registerOwner(values as Parameters<typeof auth.registerOwner>[0]);
      setUser(user);
      toast.success('Owner account created! You can now register facilities.');
      navigate(user.homePath, { replace: true });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Registration failed.');
    }
  });

  return (
    <AuthShell
      title="Register as a facility owner"
      subtitle="List your parking facilities for approval and manage operations."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-orange-600">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" error={errors.fullName?.message}>
          <Input autoComplete="name" {...register('fullName')} />
        </Field>
        <Field label="Organization name" error={errors.organizationName?.message}>
          <Input {...register('organizationName')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Phone number" error={errors.phoneNumber?.message}>
          <Input autoComplete="tel" placeholder="+2519…" {...register('phoneNumber')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create owner account
        </Button>
      </form>
    </AuthShell>
  );
}
