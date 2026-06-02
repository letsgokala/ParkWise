import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, auth, type MeUser } from './api';

interface AuthContextValue {
  user: MeUser | null;
  loading: boolean;
  setUser: (user: MeUser | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Only a genuine 401 means "not signed in". Transient failures — rate
    // limits (429), 5xx, network blips, or the dev API restarting — must NOT
    // drop the session: the cookie is still valid, so we retry briefly and
    // otherwise preserve current state instead of forcing a logout.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const { user } = await auth.me();
        setUser(user);
        setLoading(false);
        return;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setUser(null);
          setLoading(false);
          return;
        }
        // Transient error — back off and retry before giving up.
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    // Retries exhausted on transient errors: stop the spinner but keep whatever
    // user we had (no spurious logout). A later refresh will reconcile.
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
