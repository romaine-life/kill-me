import { createRemoteJWKSet, jwtVerify } from 'jose';

// JWTs are issued and signed by auth.romaine.life (Better Auth's JWT plugin,
// RS256). We verify against its JWKS endpoint instead of the old shared
// HS256 secret. JWKS is fetched once and cached by `jose`; rotations are
// picked up automatically when an unknown kid arrives.
const JWKS = createRemoteJWKSet(new URL('https://auth.romaine.life/api/auth/jwks'));
const ISSUER = 'https://auth.romaine.life';

export function createRequireAuth() {
  return async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
    if (!token) {
      return res.status(401).json({ error: 'Missing authentication' });
    }

    try {
      const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
      req.user = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role || 'member',
      };
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}
