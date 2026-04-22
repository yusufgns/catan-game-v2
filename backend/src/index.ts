import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { createDb } from './db/client';
import { validateSession } from './auth/session';
import { getToken } from './auth/middleware';
import { rateLimit } from './middleware/rate-limit';
import { cleanupOrphanGuests, cleanupStaleGames } from './routes/cleanup';
import health from './routes/health';
import auth from './routes/auth';
import user from './routes/user';
import lobby from './routes/lobby';
import game from './routes/game';
import cleanup from './routes/cleanup';

// ── Durable Object exports ────────────────────────────────────────────────────
export { GameRoom } from './durable-objects/GameRoom';
export { LobbyRoom } from './durable-objects/LobbyRoom';

// ── Hono App ──────────────────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>();

// Request logging
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  if (!c.req.path.startsWith('/ws/')) {
    console.log(JSON.stringify({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      ts: new Date().toISOString(),
    }));
  }
});

app.use('*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:3000';
    return origin === frontendUrl ? origin : '';
  },
  credentials: true,
}));

// Rate limiting on sensitive endpoints
const MINUTE = 60_000;
app.use('/auth/guest', rateLimit({ windowMs: MINUTE, max: 5 }));
app.use('/auth/magic-link', rateLimit({ windowMs: MINUTE, max: 3 }));
app.use('/auth/google', rateLimit({ windowMs: MINUTE, max: 10 }));
app.use('/auth/google/callback', rateLimit({ windowMs: MINUTE, max: 10 }));
app.use('/lobby/create', rateLimit({ windowMs: MINUTE, max: 5 }));

// Routes
app.route('/', health);
app.route('/', auth);
app.route('/', user);
app.route('/', lobby);
app.route('/', game);
app.route('/', cleanup);

// WebSocket upgrade → Durable Objects (with session auth)
app.get('/ws/game/:gameId', async (c) => {
  const gameId = c.req.param('gameId');

  // Authenticate via token query param or cookie
  const token = c.req.query('token') || getToken(c.req.raw);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb(c.env.NEON_DATABASE_URL);
  const user = await validateSession(db, token);
  if (!user) return c.json({ error: 'Invalid or expired session' }, 401);

  const id = c.env.GAME_ROOM.idFromName(gameId);
  const stub = c.env.GAME_ROOM.get(id);
  const url = new URL(c.req.url);
  url.searchParams.set('playerId', user.id);
  url.searchParams.set('playerName', user.name);
  return stub.fetch(new Request(url.toString(), c.req.raw));
});

app.get('/ws/lobby/:lobbyId', async (c) => {
  const lobbyId = c.req.param('lobbyId');

  // Authenticate via token query param or cookie
  const token = c.req.query('token') || getToken(c.req.raw);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const db = createDb(c.env.NEON_DATABASE_URL);
  const user = await validateSession(db, token);
  if (!user) return c.json({ error: 'Invalid or expired session' }, 401);

  const id = c.env.LOBBY_ROOM.idFromName(lobbyId);
  const stub = c.env.LOBBY_ROOM.get(id);
  const url = new URL(c.req.url);
  url.searchParams.set('playerId', user.id);
  url.searchParams.set('playerName', user.name);
  return stub.fetch(new Request(url.toString(), c.req.raw));
});

// Global error handler
app.onError((err, c) => {
  console.error(JSON.stringify({
    event: 'unhandled_error',
    method: c.req.method,
    path: c.req.path,
    error: err.message,
    stack: c.env.ENVIRONMENT !== 'production' ? err.stack : undefined,
  }));
  return c.json({ error: 'Internal server error' }, 500);
});

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Cron handler for scheduled tasks. Multiple cron patterns hit this single
// handler; we dispatch based on `event.cron` so 4-hour and weekly jobs can
// coexist.
const worker = {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = createDb(env.NEON_DATABASE_URL);
    const cron = event.cron;

    // Every 4 hours — prune abandoned games / lobbies.
    if (cron === '0 */4 * * *') {
      ctx.waitUntil(
        cleanupStaleGames(db, 4)
          .then((r) => console.log(JSON.stringify({ event: 'cron_stale_games', ...r })))
          .catch((e) => console.error(JSON.stringify({ event: 'cron_stale_games_failed', error: String(e) })))
      );
      return;
    }

    // Weekly — orphan guest accounts (original job).
    ctx.waitUntil(
      cleanupOrphanGuests(db)
        .then((r) => console.log(JSON.stringify({ event: 'cron_cleanup', deleted: r.deleted })))
        .catch((e) => console.error(JSON.stringify({ event: 'cron_cleanup_failed', error: String(e) })))
    );
  },
};

export default worker;
