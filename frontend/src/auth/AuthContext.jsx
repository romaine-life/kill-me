import { createContext, useContext, useState, useEffect } from 'react';
import { bootstrapAuth, logout as authLogout, getStoredToken, clearStoredToken } from './index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  // Boot-time auth check: try stored session → silent exchange via
  // .romaine.life cookie → fall through unauthenticated. Mirrors the
  // canonical pattern in tank-operator's frontend/src/auth.ts (the
  // template for all .romaine.life apps' delegation).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await bootstrapAuth();
        if (cancelled) return;
        if (u) {
          setUser(u);
          setToken(getStoredToken());
        }
      } catch (err) {
        console.error('bootstrapAuth threw:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function setSession(newToken, newUser) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function logout() {
    await authLogout();
    clearStoredToken();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin: user?.role === 'admin', setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
