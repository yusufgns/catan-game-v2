import { Hono } from 'hono';
import { eq, and, lt, ne, sql } from 'drizzle-orm';
import type { Env } from '../env';
import { createDb, type Database } from '../db/client';
import { users, sessions, userStats, gamePlayers, gameActions, lobbyPlayers, games, lobbies } from '../db/schema';

const cleanup = new Hono<{ Bindings: Env }>();

/**
 * Orphan guest cleanup logic — used by both cron handler and manual route.
 */
export async function cleanupOrphanGuests(db: Database): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

  const orphans = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.isGuest, true),
        lt(users.updatedAt, cutoff),
      )
    )
    .limit(500);

  const orphanIds: string[] = [];
  for (const orphan of orphans) {
    const activeSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, orphan.id),
          sql`${sessions.expiresAt} > NOW()`,
        )
      )
      .limit(1);

    if (activeSessions.length === 0) {
      orphanIds.push(orphan.id);
    }
  }

  if (orphanIds.length === 0) {
    return { deleted: 0 };
  }

  for (const id of orphanIds) {
    await db.delete(gameActions).where(eq(gameActions.userId, id));
    await db.delete(gamePlayers).where(eq(gamePlayers.userId, id));
    await db.delete(lobbyPlayers).where(eq(lobbyPlayers.userId, id));
    await db.delete(userStats).where(eq(userStats.userId, id));
    await db.delete(sessions).where(eq(sessions.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  return { deleted: orphanIds.length };
}

/**
 * Stale game cleanup — marks games that have been sitting around `phase !== 'ended'`
 * with no activity for longer than `maxAgeHours` as ended. Also flips the owning
 * lobby's status to 'closed' so it's removed from the join flow.
 *
 * Catan games realistically finish in 60–90 minutes. Anything still open past
 * ~4 hours is almost certainly abandoned and should be purged from
 * `/user/active-game` banners + the DO DB cache.
 */
export async function cleanupStaleGames(
  db: Database,
  maxAgeHours: number = 4,
): Promise<{ endedGames: number; closedLobbies: number }> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  // Find games still in-progress whose createdAt is past the cutoff. The games
  // table doesn't have an updatedAt column, so we use createdAt — anything
  // older than maxAgeHours is definitively abandoned since Catan finishes
  // well within that window.
  const stale = await db
    .select({ id: games.id, lobbyId: games.lobbyId })
    .from(games)
    .where(
      and(
        ne(games.phase, 'ended'),
        lt(games.createdAt, cutoff),
      )
    )
    .limit(500);

  if (stale.length === 0) return { endedGames: 0, closedLobbies: 0 };

  const now = new Date();
  for (const g of stale) {
    await db.update(games)
      .set({ phase: 'ended', finishedAt: now })
      .where(eq(games.id, g.id));
  }

  // Close corresponding lobbies so they don't linger as "waiting" or "in_progress"
  const lobbyIds = [...new Set(stale.map(s => s.lobbyId).filter((id): id is string => !!id))];
  let closedLobbies = 0;
  for (const lid of lobbyIds) {
    const res = await db.update(lobbies)
      .set({ status: 'closed', updatedAt: now })
      .where(and(eq(lobbies.id, lid), ne(lobbies.status, 'closed')));
    if ((res as any)?.rowCount) closedLobbies += (res as any).rowCount;
  }

  return { endedGames: stale.length, closedLobbies };
}

/**
 * DELETE /cleanup/orphan-guests
 * Manual trigger endpoint for orphan guest cleanup.
 */
cleanup.delete('/cleanup/orphan-guests', async (c) => {
  const db = createDb(c.env.NEON_DATABASE_URL);
  const result = await cleanupOrphanGuests(db);
  return c.json(result);
});

/**
 * DELETE /cleanup/stale-games
 * Manual trigger for stale game cleanup. Optional ?hours= query.
 */
cleanup.delete('/cleanup/stale-games', async (c) => {
  const db = createDb(c.env.NEON_DATABASE_URL);
  const hours = Math.max(1, parseInt(c.req.query('hours') || '4'));
  const result = await cleanupStaleGames(db, hours);
  return c.json(result);
});

export default cleanup;
