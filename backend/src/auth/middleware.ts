import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { createDb } from '../db/client';
import { validateSession } from './session';

type AuthUser = {
  id: string;
  name: string;
  tag: string;
  email: string | null;
  isGuest: boolean;
  avatarUrl: string | null;
  level: number;
  gems: number;
  eloRating: number;
};

type AuthEnv = {
  Bindings: Env;
  Variables: {
    user: AuthUser;
    sessionToken: string;
  };
};

/** Extract session token from cookie or Authorization header */
export function getToken(req: Request): string | null {
  // Cookie
  const cookie = req.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
    if (match) return match[1];
  }
  // Authorization: Bearer <token>
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** Require valid session — returns 401 if not authenticated */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getToken(c.req.raw);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb(c.env.NEON_DATABASE_URL);
  const user = await validateSession(db, token);
  if (!user) return c.json({ error: 'Invalid or expired session' }, 401);

  c.set('user', {
    id: user.id,
    name: user.name,
    tag: user.tag,
    email: user.email,
    isGuest: user.isGuest,
    avatarUrl: user.avatarUrl,
    level: user.level,
    gems: user.gems,
    eloRating: user.eloRating,
  });
  c.set('sessionToken', token);
  await next();
});

/** Optional auth — attaches user if present, continues regardless */
export const optionalAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getToken(c.req.raw);
  if (token) {
    const db = createDb(c.env.NEON_DATABASE_URL);
    const user = await validateSession(db, token);
    if (user) {
      c.set('user', {
        id: user.id,
        name: user.name,
        tag: user.tag,
        email: user.email,
        isGuest: user.isGuest,
        avatarUrl: user.avatarUrl,
        level: user.level,
        gems: user.gems,
        eloRating: user.eloRating,
      });
      c.set('sessionToken', token);
    }
  }
  await next();
});
