import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { auth, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getPostLoginPath } from '../lib/routes';
import { AuthShell } from '../components/auth/AuthShell';
import { Button, Field, Input } from '../components/ui';

const schema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user } = await auth.login(values.email, values.password);
      setUser(user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(getPostLoginPath(user, from), { replace: true });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Login failed.');
    }
  });

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your ParkWise dashboard."
      footer={
        <>
          New driver?{' '}
          <Link to="/register/driver" className="font-semibold text-orange-600">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-gray-400">
        Want to list a facility?{' '}
        <Link to="/register/facility-owner" className="font-medium text-gray-600">
          Register as a facility owner
        </Link>
      </p>
    </AuthShell>
  );
}
