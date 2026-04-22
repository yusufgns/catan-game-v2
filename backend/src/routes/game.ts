import { Hono } from 'hono';
import { eq, desc, and } from 'drizzle-orm';
import type { Env } from '../env';
import { createDb } from '../db/client';
import { games, gamePlayers, gameActions, users, userStats } from '../db/schema';
import { requireAuth } from '../auth/middleware';

const game = new Hono<{ Bindings: Env }>();

// GET /game/:id — game details
game.get('/game/:id', requireAuth, async (c) => {
  const gameId = c.req.param('id');
  const db = createDb(c.env.NEON_DATABASE_URL);

  const result = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (result.length === 0) return c.json({ error: 'Game not found' }, 404);

  const players = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId));

  return c.json({ game: result[0], players });
});

// GET /game/:id/access — lightweight check: does this game exist, is it still
// in progress, and is the current user a participant? Used by the client
// before opening a WebSocket so it can redirect home instead of spinning.
game.get('/game/:id/access', requireAuth, async (c) => {
  const gameId = c.req.param('id');
  const user = c.get('user' as never) as any;
  const db = createDb(c.env.NEON_DATABASE_URL);

  const gameRows = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (gameRows.length === 0) return c.json({ error: 'Game not found', code: 'NOT_FOUND' }, 404);
  const g = gameRows[0];
  if (g.phase === 'ended' || g.winnerUserId) {
    return c.json({ error: 'Game already ended', code: 'ENDED' }, 410);
  }

  const participation = await db
    .select()
    .from(gamePlayers)
    .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, user.id)))
    .limit(1);
  if (participation.length === 0) {
    return c.json({ error: 'Not a participant', code: 'FORBIDDEN' }, 403);
  }

  return c.json({ ok: true, gameId: g.id, phase: g.phase });
});

// GET /game/:id/actions — game action log (for replay)
game.get('/game/:id/actions', requireAuth, async (c) => {
  const gameId = c.req.param('id');
  const db = createDb(c.env.NEON_DATABASE_URL);

  const actions = await db
    .select()
    .from(gameActions)
    .where(eq(gameActions.gameId, gameId))
    .orderBy(gameActions.id);

  return c.json({ actions });
});

// GET /leaderboard — top players by ELO
game.get('/leaderboard', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const db = createDb(c.env.NEON_DATABASE_URL);

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      eloRating: users.eloRating,
      level: users.level,
      gamesPlayed: userStats.gamesPlayed,
      gamesWon: userStats.gamesWon,
    })
    .from(users)
    .leftJoin(userStats, eq(users.id, userStats.userId))
    .where(eq(users.isGuest, false))
    .orderBy(desc(users.eloRating))
    .limit(limit);

  return c.json({ leaderboard: result });
});

export default game;
