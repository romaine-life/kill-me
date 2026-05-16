import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { exchangeRomaineLifeToken } from './auth.js';

const AUTH_URL = 'https://auth.romaine.life';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days, same as the legacy issueToken default

// Routes for the auth.romaine.life delegation flow. Microsoft sign-in itself
// happens upstream at auth.romaine.life; the SPA pulls a JWT from that
// service's /api/auth/token (the `.romaine.life` session cookie is auto-
// attached on cross-origin fetches because the auth service mounts CORS
// with credentials enabled for this origin) and POSTs it here to be
// exchanged for a kill-me-signed session JWT. We do not maintain any
// per-app email allowlist — the role claim from auth.romaine.life is
// the single gate.
export function createAuthRoutes({ jwtSecret, requireAuth }) {
  const router = Router();

  function issueToken(user) {
    return jwt.sign(
      { sub: user.sub, email: user.email, name: user.name, role: user.role },
      jwtSecret,
      { expiresIn: SESSION_TTL_SECONDS },
    );
  }

  // Frontend reads this on bootstrap to learn where the auth service lives.
  // Returning it from the backend (vs hardcoding the URL into the bundle)
  // keeps the SPA build environment-agnostic.
  router.get('/api/config', (_req, res) => {
    res.json({ auth_url: AUTH_URL });
  });

  router.post('/api/auth/exchange', async (req, res) => {
    const { auth_jwt: authJWT } = req.body ?? {};
    if (!authJWT || typeof authJWT !== 'string') {
      return res.status(400).json({ error: 'missing auth_jwt' });
    }
    try {
      const user = await exchangeRomaineLifeToken(authJWT);
      const token = issueToken(user);
      res.json({ token, user });
    } catch (err) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({ error: err.message || 'exchange failed' });
    }
  });

  router.get('/api/auth/me', requireAuth, (req, res) => {
    res.json(req.user);
  });

  // Bearer + localStorage is the primary session carrier; we also clear the
  // auth_token cookie for symmetry with anything that prefers cookies.
  router.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('auth_token', { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    res.json({ status: 'ok' });
  });

  return router;
}
