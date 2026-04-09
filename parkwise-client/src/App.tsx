import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus, LogOut, Car, ShieldCheck, Menu, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser, clearSession, getCurrentUser, getStoredUser } from './lib/api';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles, user, role }: { 
  children: React.ReactNode, 
  allowedRoles?: string[],
  user: AppUser | null,
  role: string | null
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user && location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/') {
      // Allow guest access to driver dashboard for "Find Parking"
      if (location.pathname === '/driver/dashboard') return;
      navigate('/login');
    } else if (user && role && allowedRoles && !allowedRoles.includes(role)) {
      navigate('/');
    }
  }, [user, role, allowedRoles, navigate, location]);

  return <>{children}</>;
};

// Pages (to be implemented)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SysAdminDashboard from './pages/SysAdminDashboard';

const Navbar = ({ user, role, onLogout }: { user: AppUser | null, role: string | null, onLogout: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    onLogout();
    navigate('/');
  };

  const rightLinks = user ? [
    ...(role !== 'driver' ? [
      { 
        name: 'Dashboard', 
        path: role === 'parking_admin' ? '/admin/dashboard' : '/sysadmin/dashboard', 
        icon: ShieldCheck 
      },
    ] : []),
  ] : [
    { name: 'Login', path: '/login', icon: LogIn },
    { name: 'Register', path: '/register', icon: UserPlus },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Left Side */}
          <div className="flex items-center flex-1">
            <Link to="/" className="flex items-center space-x-2 mr-8">
              <div className="bg-orange-600 p-2 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold hidden sm:block">
                <span className="text-gray-900">Park</span>
                <span className="text-orange-600">Wise</span>
              </span>
            </Link>
          </div>

          {/* Center Link - Find Parking */}
          <div className="flex items-center justify-center flex-1">
            <Link
              to="/driver/dashboard"
              className={`flex items-center space-x-2 px-6 py-2 rounded-full font-bold transition-all ${
                location.pathname === '/driver/dashboard' 
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Find Parking</span>
            </Link>
          </div>

          {/* Right Links */}
          <div className="hidden md:flex items-center justify-end space-x-6 flex-1">
            {rightLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                  location.pathname === link.path ? 'text-orange-600' : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                <link.icon className="h-4 w-4" />
                <span>{link.name}</span>
              </Link>
            ))}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-orange-600 transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link
                to="/driver/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl text-base font-bold bg-orange-50 text-orange-600 mb-4"
              >
                <Search className="h-5 w-5" />
                <span>Find Parking</span>
              </Link>
              {rightLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 p-3 rounded-xl text-base font-medium transition-colors ${
                    location.pathname === link.path ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <link.icon className="h-5 w-5" />
                  <span>{link.name}</span>
                </Link>
              ))}
              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl text-base font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default function App() {
  const [user, setUser] = useState<AppUser | null>(getStoredUser());
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const storedUser = getStoredUser();
      if (!storedUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        setUser(response.user);
        setRole(response.user.role);
      } catch {
        clearSession();
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const handleAuthSuccess = (nextUser: AppUser) => {
    setUser(nextUser);
    setRole(nextUser.role);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setRole(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 border-4 border-orange-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <Navbar user={user} role={role} onLogout={handleLogout} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onAuthSuccess={handleAuthSuccess} />} />
            <Route path="/register" element={<RegisterPage onAuthSuccess={handleAuthSuccess} />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage onAuthSuccess={handleAuthSuccess} />} />
            <Route 
              path="/driver/dashboard" 
              element={
                <ProtectedRoute user={user} role={role} allowedRoles={['driver', 'sys_admin']}>
                  <DriverDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute user={user} role={role} allowedRoles={['parking_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sysadmin/dashboard" 
              element={
                <ProtectedRoute user={user} role={role} allowedRoles={['sys_admin']}>
                  <SysAdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
