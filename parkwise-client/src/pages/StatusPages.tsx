import { Link } from 'react-router-dom';
import { Ban, Compass } from 'lucide-react';
import { Button } from '../components/ui';

function CenteredMessage({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 rounded-2xl bg-orange-100 p-4 text-orange-600">{icon}</div>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 max-w-md text-gray-600">{description}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <CenteredMessage
      icon={<Ban className="h-8 w-8" />}
      title="Access denied"
      description="Your account role does not have permission to view this page."
      action={
        <Link to="/">
          <Button>Back to home</Button>
        </Link>
      }
    />
  );
}

export function NotFoundPage() {
  return (
    <CenteredMessage
      icon={<Compass className="h-8 w-8" />}
      title="Page not found"
      description="The page you are looking for doesn’t exist or has moved."
      action={
        <Link to="/">
          <Button>Back to home</Button>
        </Link>
      }
    />
  );
}
