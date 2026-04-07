import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { AppUser, saveSession } from '../lib/api';

const OAuthCallbackPage = ({ onAuthSuccess }: { onAuthSuccess?: (user: AppUser) => void }) => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');
    const rawUser = params.get('user');
    const rawError = params.get('error');

    if (rawError) {
      setError(rawError);
      return;
    }

    if (!token || !rawUser) {
      setError('OAuth sign-in did not return a valid session.');
      return;
    }

    try {
      const user = JSON.parse(rawUser) as AppUser;
      saveSession({ token, user });
      onAuthSuccess?.(user);

      if (user.role === 'sys_admin') navigate('/sysadmin/dashboard', { replace: true });
      else if (user.role === 'parking_admin') navigate('/admin/dashboard', { replace: true });
      else navigate('/driver/dashboard', { replace: true });
    } catch {
      setError('OAuth sign-in response could not be processed.');
    }
  }, [navigate, onAuthSuccess]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-red-100 rounded-[2rem] p-8 shadow-xl text-center space-y-5">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900">OAuth Sign-In Failed</h1>
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
          <div className="flex justify-center gap-3">
            <Link to="/login" className="px-5 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors">
              Back to Login
            </Link>
            <Link to="/register" className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">
              Try Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-green-100 rounded-[2rem] p-8 shadow-xl text-center space-y-5 max-w-md w-full"
      >
        <div className="mx-auto h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-gray-900">Completing Sign-In</h1>
          <p className="text-sm text-gray-500 font-medium">We’re finishing your OAuth session and redirecting you now.</p>
        </div>
        <div className="mx-auto h-8 w-8 rounded-full border-4 border-orange-600 border-t-transparent animate-spin" />
      </motion.div>
    </div>
  );
};

export default OAuthCallbackPage;
