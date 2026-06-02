import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Heart, LayoutDashboard, LogOut, Map, Menu, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/cn';
import { Brand } from './Brand';
import { Button } from '../ui';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
    isActive ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600',
  );

export function PublicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isDriver = user?.role === 'REGISTERED_DRIVER';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = (
    <>
      <NavLink to="/map" className={linkClass} onClick={() => setOpen(false)}>
        <Map className="h-4 w-4" /> Find Parking
      </NavLink>
      {isDriver && (
        <>
          <NavLink to="/driver/recommendations" className={linkClass} onClick={() => setOpen(false)}>
            <Sparkles className="h-4 w-4" /> Recommendations
          </NavLink>
          <NavLink to="/driver/favorites" className={linkClass} onClick={() => setOpen(false)}>
            <Heart className="h-4 w-4" /> Favorites
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav className="hidden items-center gap-2 md:flex">{navLinks}</nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                {user.role !== 'REGISTERED_DRIVER' && (
                  <Link to={user.homePath}>
                    <Button variant="outline" size="sm">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Button>
                  </Link>
                )}
                <span className="text-sm text-gray-500">{user.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register/driver">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>
          <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <div className="space-y-2 border-t border-gray-100 px-4 py-4 md:hidden">
            {navLinks}
            <div className="flex flex-col gap-2 pt-2">
              {user ? (
                <>
                  {user.role !== 'REGISTERED_DRIVER' && (
                    <Link to={user.homePath} onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register/driver" onClick={() => setOpen(false)}>
                    <Button className="w-full">Sign up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
