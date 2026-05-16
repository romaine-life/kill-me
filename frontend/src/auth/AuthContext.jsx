import { createContext, useContext, useState, useEffect } from 'react';
import { bootstrapAuth, logout as authLogout } from './index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Boot: ask the backend "am I signed in?". The backend forwards the
  // .romaine.life session cookie to auth.romaine.life's get-session
  // endpoint and returns the user record (or null). No token storage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await bootstrapAuth();
        if (!cancelled) setUser(u);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function logout() {
    await authLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.role === 'admin', logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
