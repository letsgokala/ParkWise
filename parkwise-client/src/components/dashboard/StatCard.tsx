import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function StatCard({
  label,
  value,
  icon,
  accent = 'text-gray-900',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon && <span className="text-gray-300">{icon}</span>}
      </div>
      <p className={cn('mt-2 text-3xl font-extrabold', accent)}>{value}</p>
    </div>
  );
}
