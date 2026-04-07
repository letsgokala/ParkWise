import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserPlus, Mail, Lock, User, Phone, ArrowRight, AlertCircle, Car, Building2, ShieldCheck } from 'lucide-react';
import { AppUser, getOAuthStartUrl, OAuthProvider, registerUser, saveSession } from '../lib/api';

const getAuthErrorMessage = (err: any, action: 'register' | 'login') => {
  const message = err?.message || '';
  switch (message) {
    case 'That email is already in use.':
      return 'That email is already in use. Try signing in instead.';
    default:
      return message || `Failed to ${action === 'register' ? 'create account' : 'sign in'}. Please try again.`;
  }
};

const RegisterPage = ({ onAuthSuccess }: { onAuthSuccess?: (user: AppUser) => void }) => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(searchParams.get('role') === 'admin' ? 'parking_admin' : 'driver');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await registerUser({
        name,
        email,
        password,
        phone,
        role: role as 'driver' | 'parking_admin',
      });
      saveSession(response);
      onAuthSuccess?.(response.user);
      
      if (role === 'parking_admin') navigate('/admin/dashboard');
      else navigate('/driver/dashboard');
    } catch (err: any) {
      setError(getAuthErrorMessage(err, 'register'));
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = (provider: OAuthProvider) => {
    window.location.assign(getOAuthStartUrl(provider, { mode: 'register', role: role as 'driver' | 'parking_admin' }));
  };

  return (
    <div className="max-w-6xl mx-auto pt-10 px-4 pb-20">
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Left Side: Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-1/2 bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-2xl shadow-orange-100/50"
        >
          <div className="space-y-4 mb-10">
            <div className="bg-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Create Account</h1>
            <p className="text-gray-500 text-lg">Join the ParkWise community today</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 text-red-600 mb-8"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-4 mb-8">
              <label className="text-sm font-bold text-gray-700 ml-1 uppercase tracking-widest">Select Your Role</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-start text-left space-y-3 ${
                    role === 'driver' 
                      ? 'border-orange-600 bg-orange-50/50 ring-4 ring-orange-100' 
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-orange-200'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${role === 'driver' ? 'bg-orange-600 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                    <Car className="h-6 w-6" />
                  </div>
                  <div>
                    <span className={`block font-black text-lg ${role === 'driver' ? 'text-gray-900' : 'text-gray-500'}`}>Driver</span>
                    <span className="text-xs font-medium text-gray-400">Find and navigate to the best parking spots near you.</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('parking_admin')}
                  className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-start text-left space-y-3 ${
                    role === 'parking_admin' 
                      ? 'border-orange-600 bg-orange-50/50 ring-4 ring-orange-100' 
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-orange-200'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${role === 'parking_admin' ? 'bg-orange-600 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className={`block font-black text-lg ${role === 'parking_admin' ? 'text-gray-900' : 'text-gray-500'}`}>Parking Admin</span>
                    <span className="text-xs font-medium text-gray-400">Manage your facility's availability and pricing in real-time.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-600 focus:ring-0 transition-all text-gray-900 placeholder-gray-400 font-medium"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-600 focus:ring-0 transition-all text-gray-900 placeholder-gray-400 font-medium"
                    placeholder="+251 9..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-600 focus:ring-0 transition-all text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-600 focus:ring-0 transition-all text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-orange-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium uppercase tracking-widest">Or continue with</span>
            </div>
          </div>

          {/* Social Login - Vertical & Full Width */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => socialLogin('google')}
              className="w-full flex items-center justify-center space-x-3 p-4 rounded-2xl border-2 border-gray-50 hover:border-orange-200 hover:bg-orange-50 transition-all group"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-bold text-gray-600 group-hover:text-orange-600">Sign up with Google</span>
            </button>
            <button
              type="button"
              onClick={() => socialLogin('facebook')}
              className="w-full flex items-center justify-center space-x-3 p-4 rounded-2xl border-2 border-gray-50 hover:border-orange-200 hover:bg-orange-50 transition-all group"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.099 4.388 23.094 10.125 24v-8.438H7.078v-3.489h3.047V9.413c0-3.022 1.792-4.693 4.533-4.693 1.313 0 2.686.236 2.686.236v2.969h-1.514c-1.49 0-1.955.93-1.955 1.885v2.263h3.328l-.532 3.489h-2.796V24C19.612 23.094 24 18.099 24 12.073z" fill="#1877F2"/>
                <path d="M16.671 15.562l.532-3.489h-3.328V9.81c0-.955.465-1.885 1.955-1.885h1.514V4.956s-1.373-.236-2.686-.236c-2.741 0-4.533 1.671-4.533 4.693v2.66H7.078v3.489h3.047V24a12.11 12.11 0 003.75 0v-8.438h2.796z" fill="white"/>
              </svg>
              <span className="font-bold text-gray-600 group-hover:text-orange-600">Sign up with Facebook</span>
            </button>
            <button
              type="button"
              onClick={() => socialLogin('github')}
              className="w-full flex items-center justify-center space-x-3 p-4 rounded-2xl border-2 border-gray-50 hover:border-orange-200 hover:bg-orange-50 transition-all group"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.341-3.369-1.341-.454-1.152-1.11-1.459-1.11-1.459-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" fill="#24292F"/>
              </svg>
              <span className="font-bold text-gray-600 group-hover:text-orange-600">Sign up with GitHub</span>
            </button>
          </div>

          <div className="mt-10 text-center">
            <p className="text-gray-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-orange-600 hover:underline font-bold">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Right Side: Note with Picture */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block space-y-8"
        >
          <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white aspect-[4/5]">
            <img
              src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80&w=1000"
              alt="Parking Experience"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10 text-white space-y-4">
              <div className="bg-orange-600 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Car className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold leading-tight">
                Join thousands of drivers <br /> saving time every day.
              </h2>
              <p className="text-gray-200 text-lg">
                "ParkWise changed how I commute. I no longer worry about finding a spot in the city center."
              </p>
              <div className="flex items-center space-x-3 pt-4">
                <div className="h-12 w-12 rounded-full bg-orange-100 border-2 border-white overflow-hidden">
                  <img src="https://i.pravatar.cc/150?u=parkwise" alt="User" />
                </div>
                <div>
                  <p className="font-bold">Abebe Kebede</p>
                  <p className="text-sm text-gray-300">Daily Commuter</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100 space-y-4">
            <div className="flex items-center space-x-3 text-orange-600">
              <ShieldCheck className="h-6 w-6" />
              <h3 className="font-bold text-xl">Your Data is Secure</h3>
            </div>
            <p className="text-orange-800 font-medium leading-relaxed">
              We use industry-standard encryption and Firebase security protocols to ensure your personal information and payment data are always protected.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
