// auth.romaine.life owns sessions. Each request comes in with the
// .romaine.life session cookie auto-attached by the browser (Better Auth
// sets the cookie on the parent domain via crossSubDomainCookies).
//
// requireAuth forwards the Cookie header to auth.romaine.life's
// get-session endpoint and gates on the returned user's role claim. Result
// is cached in-process for 60s per cookie value so a burst of requests
// from the same logged-in user doesn't fan out into a round-trip per call.
//
// No local JWT signing, no per-app KV secret, no Bearer-token handling.
// The frontend stores nothing — the cookie is the durable session state,
// owned by auth.romaine.life.

const AUTH_URL = 'https://auth.romaine.life';
const SESSION_CACHE_TTL_MS = 60_000;
const AUTH_REQUEST_TIMEOUT_MS = 5_000;
const ALLOWED_ROLES = new Set(['admin', 'user']);

// LOCAL DEV ONLY. When DEV_AUTH is set (e.g. DEV_AUTH=admin), skip the
// auth.romaine.life cookie forward and treat every request as this mock user.
// Production never sets DEV_AUTH, so this is inert there. Lets you run the
// backend locally and act as admin without a real .romaine.life session.
function devUser() {
  if (!process.env.DEV_AUTH) return null;
  return {
    sub: process.env.DEV_AUTH_SUB || 'dev-admin-local',
    email: process.env.DEV_AUTH_EMAIL || 'dev@localhost',
    name: process.env.DEV_AUTH_NAME || 'Dev Admin',
    role: process.env.DEV_AUTH === 'admin' ? 'admin' : 'user',
  };
}

// Map<cookieHeader, {expiry, user|null}>. null user = negative cache (we
// know this cookie didn't resolve, so we don't keep retrying for 60s).
const sessionCache = new Map();

async function fetchSessionFromAuth(cookie) {
  try {
    const res = await fetch(`${AUTH_URL}/api/auth/get-session`, {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.user ?? null;
  } catch (err) {
    console.warn('[auth] get-session call failed:', err.message);
    return null;
  }
}

async function resolveCaller(cookie) {
  if (!cookie) return null;
  const now = Date.now();
  const cached = sessionCache.get(cookie);
  if (cached && cached.expiry > now) return cached.user;

  const user = await fetchSessionFromAuth(cookie);
  sessionCache.set(cookie, { expiry: now + SESSION_CACHE_TTL_MS, user });

  // Opportunistic cleanup so the Map doesn't grow unbounded across hours
  // of session churn. Cheap because we only walk on misses.
  if (sessionCache.size > 200) {
    for (const [key, entry] of sessionCache) {
      if (entry.expiry <= now) sessionCache.delete(key);
    }
  }
  return user;
}

export function createRequireAuth() {
  return async (req, res, next) => {
    const dev = devUser();
    if (dev) { req.user = dev; return next(); }
    const cookie = req.headers.cookie || '';
    const user = await resolveCaller(cookie);
    if (!user) {
      return res.status(401).json({ error: 'Not signed in' });
    }
    const role = user.role ?? 'pending';
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ error: `Role not approved by auth.romaine.life: ${role}` });
    }
    req.user = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role,
    };
    next();
  };
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// Used by the GET /api/auth/me handler to return the current user (or
// null) without a 401 — useful for the boot-time "am I signed in?" probe.
export async function currentCaller(req) {
  const dev = devUser();
  if (dev) return dev;
  const cookie = req.headers.cookie || '';
  const user = await resolveCaller(cookie);
  if (!user) return null;
  const role = user.role ?? 'pending';
  if (!ALLOWED_ROLES.has(role)) return null;
  return { sub: user.id, email: user.email, name: user.name, role };
}
