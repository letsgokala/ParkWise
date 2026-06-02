import { Link } from 'react-router-dom';
import { Car } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Brand({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2', className)}>
      <div className="rounded-lg bg-orange-600 p-2">
        <Car className="h-5 w-5 text-white" />
      </div>
      <span className="text-xl font-bold">
        <span className="text-gray-900">Park</span>
        <span className="text-orange-600">Wise</span>
      </span>
    </Link>
  );
}
