// Identity is delegated to auth.romaine.life (Better Auth + JWT plugin).
// This module:
//   - On mount, asks auth.romaine.life for a JWT (the session cookie is on
//     `.romaine.life` so it's auto-attached). If there is no session, the
//     fetch comes back without a token and the user stays anonymous.
//   - Schedules a silent refresh 60 s before the token's `exp` so requests
//     never see a 401-from-expiry in normal use.
//   - `signIn()` redirects the user to auth.romaine.life's Microsoft flow,
//     which lands the user back on this app's origin with a session cookie.
//   - `signOut()` clears local state and asks auth.romaine.life to invalidate
//     the session cookie.
import { createContext, useContext, useState, useEffect } from 'react';

const AUTH_URL = 'https://auth.romaine.life';

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return null; }
}

async function fetchToken() {
  try {
    const res = await fetch(`${AUTH_URL}/api/auth/token`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.token ?? null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token');
    return t ? parseJwt(t) : null;
  });
  const [loading, setLoading] = useState(true);

  // On mount, refresh from the auth service.
  useEffect(() => {
    (async () => {
      const fresh = await fetchToken();
      if (fresh) {
        localStorage.setItem('token', fresh);
        setToken(fresh);
        setUser(parseJwt(fresh));
      } else if (token) {
        // We had a stale token but the server has no session — clear it.
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    })();

  }, []);

  // Silent refresh 60 s before exp.
  useEffect(() => {
    if (!token) return;
    const claims = parseJwt(token);
    if (!claims?.exp) return;
    const msUntilRefresh = (claims.exp * 1000) - Date.now() - 60_000;
    if (msUntilRefresh <= 0) return;  // near-expiry; next fetch will handle it
    const handle = setTimeout(async () => {
      const fresh = await fetchToken();
      if (fresh) {
        localStorage.setItem('token', fresh);
        setToken(fresh);
        setUser(parseJwt(fresh));
      }
    }, msUntilRefresh);
    return () => clearTimeout(handle);
  }, [token]);

  function signIn() {
    const cb = encodeURIComponent(window.location.origin + window.location.pathname);
    window.location.href = `${AUTH_URL}/api/auth/sign-in/social/microsoft?callbackURL=${cb}`;
  }

  async function signOut() {
    try {
      await fetch(`${AUTH_URL}/api/auth/sign-out`, { method: 'POST', credentials: 'include' });
    } catch { /* best effort */ }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAdmin: user?.role === 'admin',
      signIn,
      signOut,
      logout: signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
