import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../env';
import { eq } from 'drizzle-orm';
import { createDb } from '../db/client';
import { users, sessions, userStats, gamePlayers, gameActions, lobbyPlayers } from '../db/schema';
import { createSession, deleteSession, sessionCookie, clearSessionCookie } from '../auth/session';
import { createGuestUser } from '../auth/guest';
import { createGoogleClient, getGoogleUser, upsertGoogleUser } from '../auth/google';
import { createMagicLinkToken, verifyMagicLinkToken, upsertEmailUser, sendMagicLinkEmail } from '../auth/magic-link';
import { requireAuth } from '../auth/middleware';
import { generateCodeVerifier, generateState } from 'arctic';

const auth = new Hono<{ Bindings: Env }>();

// ── Guest Login ───────────────────────────────────────────────────────────────

auth.post('/auth/guest', async (c) => {
  const body = await c.req.json<{ name?: string }>().catch(() => ({ name: undefined }));
  const db = createDb(c.env.NEON_DATABASE_URL);

  const user = await createGuestUser(db, body.name ?? '');
  const token = await createSession(db, user.id);
  const isSecure = !c.env.FRONTEND_URL.includes('localhost');

  c.header('Set-Cookie', sessionCookie(token, isSecure));
  return c.json({
    user: {
      id: user.id, name: user.name, tag: user.tag,
      email: null, isGuest: true, avatarUrl: null,
      level: 1, gems: 0, eloRating: 1000,
    },
    stats: { rankedGamesPlayed: 0, rankedGamesWon: 0, gamesPlayed: 0, gamesWon: 0, totalVp: 0 },
  });
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

auth.get('/auth/google', async (c) => {
  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;
  const google = createGoogleClient(c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, redirectUri);

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email']);

  // Store state + verifier in cookies (short-lived)
  setCookie(c, 'google_state', state, { httpOnly: true, secure: true, maxAge: 600, path: '/', sameSite: 'Lax' });
  setCookie(c, 'google_verifier', codeVerifier, { httpOnly: true, secure: true, maxAge: 600, path: '/', sameSite: 'Lax' });

  return c.redirect(url.toString());
});

auth.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'google_state');
  const codeVerifier = getCookie(c, 'google_verifier');

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return c.json({ error: 'Invalid OAuth state' }, 400);
  }

  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;
  const google = createGoogleClient(c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, redirectUri);

  const tokens = await google.validateAuthorizationCode(code, codeVerifier);
  const googleUser = await getGoogleUser(tokens.accessToken());

  const db = createDb(c.env.NEON_DATABASE_URL);
  const user = await upsertGoogleUser(db, googleUser);
  const token = await createSession(db, user.id);

  // Clear OAuth cookies
  setCookie(c, 'google_state', '', { maxAge: 0, path: '/' });
  setCookie(c, 'google_verifier', '', { maxAge: 0, path: '/' });

  c.header('Set-Cookie', sessionCookie(token, !c.env.FRONTEND_URL.includes('localhost')));
  return c.redirect(c.env.FRONTEND_URL);
});

// ── Magic Link ────────────────────────────────────────────────────────────────

auth.post('/auth/magic-link', async (c) => {
  const body = await c.req.json<{ email: string }>();
  if (!body.email || !body.email.includes('@')) {
    return c.json({ error: 'Valid email required' }, 400);
  }

  const db = createDb(c.env.NEON_DATABASE_URL);
  const rawToken = await createMagicLinkToken(db, body.email);

  const verifyUrl = `${c.env.FRONTEND_URL}/auth/verify?token=${rawToken}`;
  await sendMagicLinkEmail(c.env.RESEND_API_KEY, body.email, verifyUrl);

  return c.json({ ok: true });
});

auth.get('/auth/verify', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'Missing token' }, 400);

  const db = createDb(c.env.NEON_DATABASE_URL);
  const email = await verifyMagicLinkToken(db, token);
  if (!email) return c.json({ error: 'Invalid or expired token' }, 400);

  const user = await upsertEmailUser(db, email);
  const sessionToken = await createSession(db, user.id);

  c.header('Set-Cookie', sessionCookie(sessionToken, !c.env.FRONTEND_URL.includes('localhost')));
  return c.redirect(c.env.FRONTEND_URL);
});

// ── Logout ────────────────────────────────────────────────────────────────────

auth.post('/auth/logout', requireAuth, async (c) => {
  const token = c.get('sessionToken' as never) as string;
  const user = c.get('user' as never) as any;
  const db = createDb(c.env.NEON_DATABASE_URL);

  await deleteSession(db, token);

  // Guest logout → delete all user data (account is disposable)
  if (user.isGuest) {
    // Delete in correct order (foreign key constraints)
    await db.delete(gameActions).where(eq(gameActions.userId, user.id));
    await db.delete(gamePlayers).where(eq(gamePlayers.userId, user.id));
    await db.delete(lobbyPlayers).where(eq(lobbyPlayers.userId, user.id));
    await db.delete(userStats).where(eq(userStats.userId, user.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }

  c.header('Set-Cookie', clearSessionCookie());
  return c.json({ ok: true, guestDeleted: user.isGuest });
});

export default auth;
