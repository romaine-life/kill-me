// auth.romaine.life owns the session via a cookie scoped to .romaine.life.
// The browser auto-attaches the cookie on every request to *.romaine.life,
// so this SPA doesn't hold or refresh any token. It just asks the backend
// "who am I?" on boot (the backend forwards the cookie upstream to
// auth.romaine.life/api/auth/get-session and gates on role).

const AUTH_URL = 'https://auth.romaine.life';

/**
 * Boot-time "who am I?" probe. Returns the user record from auth.romaine.life
 * (via this app's /api/auth/me) if there's a valid session, or null.
 */
export async function bootstrapAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** User-initiated sign-in: redirect to auth.romaine.life's Microsoft flow. */
export function startLogin() {
  const callbackURL = encodeURIComponent(window.location.origin + window.location.pathname);
  // GET handler at auth.romaine.life/sign-in/microsoft wraps Better Auth's
  // social flow and 302s back to callbackURL after Microsoft completes.
  window.location.href = `${AUTH_URL}/sign-in/microsoft?callbackURL=${callbackURL}`;
}

/** Tell auth.romaine.life to invalidate the session, then reload. */
export async function logout() {
  try {
    await fetch(`${AUTH_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // best-effort; the reload still clears local SPA state
  }
  window.location.reload();
}
