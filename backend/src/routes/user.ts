import { Hono } from 'hono';
import { eq, and, ne, isNull } from 'drizzle-orm';
import type { Env } from '../env';
import { createDb } from '../db/client';
import { users, userStats, gamePlayers, games } from '../db/schema';
import { requireAuth } from '../auth/middleware';

const user = new Hono<{ Bindings: Env }>();

// GET /user/me — current user profile
user.get('/user/me', requireAuth, async (c) => {
  const authUser = c.get('user' as never) as any;
  const db = createDb(c.env.NEON_DATABASE_URL);

  const stats = await db.select().from(userStats).where(eq(userStats.userId, authUser.id)).limit(1);

  return c.json({
    user: authUser,
    stats: stats[0] ?? { gamesPlayed: 0, gamesWon: 0, totalVp: 0, rankedGamesPlayed: 0, rankedGamesWon: 0 },
  });
});

// GET /user/active-game — find active game for current user
user.get('/user/active-game', requireAuth, async (c) => {
  const authUser = c.get('user' as never) as any;
  const db = createDb(c.env.NEON_DATABASE_URL);

  // Defense in depth: exclude any game that has either been marked ended,
  // finished, or has a winner set. This protects against brief windows where
  // `games.phase` hasn't been synced from the Durable Object yet.
  const result = await db
    .select({ game: games })
    .from(gamePlayers)
    .innerJoin(games, eq(gamePlayers.gameId, games.id))
    .where(
      and(
        eq(gamePlayers.userId, authUser.id),
        ne(games.phase, 'ended'),
        isNull(games.winnerUserId),
        isNull(games.finishedAt),
      )
    )
    .limit(1);

  if (result.length === 0) return c.json({ game: null });

  return c.json({
    game: {
      id: result[0].game.id,
      mode: result[0].game.mode,
      turnCount: result[0].game.turnCount,
      phase: result[0].game.phase,
    },
  });
});

// PATCH /user/me — update profile
user.patch('/user/me', requireAuth, async (c) => {
  const authUser = c.get('user' as never) as any;
  const body = await c.req.json<{ name?: string; avatarUrl?: string }>();
  const db = createDb(c.env.NEON_DATABASE_URL);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.avatarUrl) updates.avatarUrl = body.avatarUrl;

  const [updated] = await db.update(users).set(updates).where(eq(users.id, authUser.id)).returning();

  return c.json({ user: updated });
});

// DELETE /user/active-game/:gameId — dismiss an active game from the user's
// banner. Forfeits the user's participation so the row no longer shows up in
// /user/active-game. If all real participants have forfeited, mark the game
// ended. Does NOT delete the game; just removes the user's link to it.
user.delete('/user/active-game/:gameId', requireAuth, async (c) => {
  const authUser = c.get('user' as never) as any;
  const gameId = c.req.param('gameId');
  const db = createDb(c.env.NEON_DATABASE_URL);

  // Verify the user is actually a participant in this game
  const participation = await db
    .select()
    .from(gamePlayers)
    .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, authUser.id)))
    .limit(1);
  if (participation.length === 0) return c.json({ ok: true });

  // Remove participation
  await db
    .delete(gamePlayers)
    .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, authUser.id)));

  // If no real participants remain, mark the game ended so it won't haunt
  // anyone else's banner either.
  const remaining = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, gameId));
  if (remaining.length === 0) {
    await db.update(games).set({
      phase: 'ended',
      finishedAt: new Date(),
    }).where(eq(games.id, gameId));
  }

  return c.json({ ok: true });
});

export default user;
