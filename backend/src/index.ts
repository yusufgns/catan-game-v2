import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import health from './routes/health';

// ── Durable Object exports ────────────────────────────────────────────────────
export { GameRoom } from './durable-objects/GameRoom';
export { LobbyRoom } from './durable-objects/LobbyRoom';

// ── Hono App ──────────────────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:3000';
    return origin === frontendUrl ? origin : '';
  },
  credentials: true,
}));

// Routes
app.route('/', health);

// WebSocket upgrade → Durable Objects
app.get('/ws/game/:gameId', async (c) => {
  const gameId = c.req.param('gameId');
  const playerId = c.req.query('playerId');
  if (!playerId) return c.json({ error: 'Missing playerId' }, 400);

  const id = c.env.GAME_ROOM.idFromName(gameId);
  const stub = c.env.GAME_ROOM.get(id);
  const url = new URL(c.req.url);
  url.searchParams.set('playerId', playerId);
  return stub.fetch(new Request(url.toString(), c.req.raw));
});

app.get('/ws/lobby/:lobbyId', async (c) => {
  const lobbyId = c.req.param('lobbyId');
  const playerId = c.req.query('playerId');
  const playerName = c.req.query('playerName') || 'Player';
  if (!playerId) return c.json({ error: 'Missing playerId' }, 400);

  const id = c.env.LOBBY_ROOM.idFromName(lobbyId);
  const stub = c.env.LOBBY_ROOM.get(id);
  const url = new URL(c.req.url);
  url.searchParams.set('playerId', playerId);
  url.searchParams.set('playerName', playerName);
  return stub.fetch(new Request(url.toString(), c.req.raw));
});

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
