import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ParkingSquare,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import type { Role } from '../../lib/api';
import { cn } from '../../lib/cn';
import { Brand } from './Brand';
import { Button } from '../ui';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: Record<Exclude<Role, 'REGISTERED_DRIVER'>, NavItem[]> = {
  FACILITY_OWNER: [
    { to: '/owner/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/owner/facilities', label: 'My Facilities', icon: Building2 },
    { to: '/owner/parking-admins', label: 'Parking Admins', icon: Users },
    { to: '/owner/assignments', label: 'Assignments', icon: ClipboardList },
  ],
  PARKING_ADMIN: [{ to: '/parking-admin/dashboard', label: 'Operations', icon: ParkingSquare }],
  SYSTEM_ADMIN: [
    { to: '/system-admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/system-admin/facilities/pending', label: 'Pending Review', icon: ListChecks },
    { to: '/system-admin/facilities', label: 'All Facilities', icon: ShieldCheck },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  REGISTERED_DRIVER: 'Driver',
  FACILITY_OWNER: 'Facility Owner',
  PARKING_ADMIN: 'Parking Admin',
  SYSTEM_ADMIN: 'System Admin',
};

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = user && user.role !== 'REGISTERED_DRIVER' ? NAV[user.role] : [];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navContent = (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.split('/').length <= 3}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
              isActive ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100',
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white p-4 lg:flex">
        <Brand className="mb-8 px-2" />
        {navContent}
        <div className="mt-auto border-t border-gray-100 pt-4">
          <div className="px-2 pb-3">
            <p className="truncate text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user && ROLE_LABEL[user.role]}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 lg:hidden">
          <Brand />
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>
        {open && (
          <div className="border-b border-gray-100 bg-white p-4 lg:hidden">
            {navContent}
            <Button variant="ghost" className="mt-2 w-full justify-start" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
