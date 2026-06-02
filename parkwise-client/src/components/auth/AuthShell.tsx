import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '../layout/Brand';
import { Card, CardContent } from '../ui';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <Card>
          <CardContent>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </CardContent>
        </Card>
        {footer && <div className="mt-4 text-center text-sm text-gray-500">{footer}</div>}
        <p className="mt-6 text-center text-xs text-gray-400">
          <Link to="/" className="hover:text-gray-600">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
