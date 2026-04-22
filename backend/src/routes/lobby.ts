import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Env } from '../env';
import { createDb } from '../db/client';
import { lobbies, lobbyPlayers, games, gamePlayers } from '../db/schema';
import { requireAuth } from '../auth/middleware';

const lobby = new Hono<{ Bindings: Env }>();

/** Generate a human-readable lobby code like "CXT-9921" */
function generateLobbyCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const l = () => letters[Math.floor(Math.random() * letters.length)];
  const d = () => Math.floor(Math.random() * 10);
  return `${l()}${l()}${l()}-${d()}${d()}${d()}${d()}`;
}

// POST /lobby/create
lobby.post('/lobby/create', requireAuth, async (c) => {
  const user = c.get('user' as never) as any;
  const body = await c.req.json<{ mode?: string; maxPlayers?: number; isPublic?: boolean }>().catch(() => ({ mode: undefined, maxPlayers: undefined, isPublic: undefined }));
  const db = createDb(c.env.NEON_DATABASE_URL);

  // Clean up user's old waiting lobbies
  const oldLobbies = await db.select({ id: lobbies.id })
    .from(lobbies)
    .where(and(eq(lobbies.hostUserId, user.id), eq(lobbies.status, 'waiting')));
  for (const old of oldLobbies) {
    await db.delete(lobbyPlayers).where(eq(lobbyPlayers.lobbyId, old.id));
    await db.update(lobbies).set({ status: 'closed' }).where(eq(lobbies.id, old.id));
  }

  const id = nanoid(12);
  const code = generateLobbyCode();

  await db.insert(lobbies).values({
    id,
    code,
    hostUserId: user.id,
    mode: body.mode || 'classic',
    maxPlayers: body.maxPlayers || 4,
    isPublic: body.isPublic || false,
  });

  await db.insert(lobbyPlayers).values({
    lobbyId: id,
    userId: user.id,
    ready: false,
  });

  return c.json({ lobbyId: id, code });
});

// GET /lobby/find?code=XXX
lobby.get('/lobby/find', requireAuth, async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ error: 'Missing code' }, 400);
  const user = c.get('user' as never) as any;

  const db = createDb(c.env.NEON_DATABASE_URL);
  const result = await db.select().from(lobbies).where(eq(lobbies.code, code.toUpperCase())).limit(1);

  if (result.length === 0) return c.json({ error: 'Lobby not found' }, 404);

  if (result[0].status !== 'waiting') {
    // Lobby moved on. If a game tied to this lobby is still in progress and the user
    // is a participant, surface the gameId so the client can rejoin instead of being kicked home.
    const gameRows = await db.select().from(games).where(eq(games.lobbyId, result[0].id)).limit(1);
    if (gameRows.length > 0 && gameRows[0].phase !== 'ended') {
      const isParticipant = await db
        .select()
        .from(gamePlayers)
        .where(and(eq(gamePlayers.gameId, gameRows[0].id), eq(gamePlayers.userId, user.id)))
        .limit(1);
      if (isParticipant.length > 0) {
        return c.json({ error: 'Lobby is no longer available', activeGameId: gameRows[0].id }, 400);
      }
    }
    return c.json({ error: 'Lobby is no longer available' }, 400);
  }

  return c.json({ lobby: result[0] });
});

// POST /lobby/:id/join
lobby.post('/lobby/:id/join', requireAuth, async (c) => {
  const lobbyId = c.req.param('id');
  const user = c.get('user' as never) as any;
  const db = createDb(c.env.NEON_DATABASE_URL);

  const result = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId)).limit(1);
  if (result.length === 0) return c.json({ error: 'Lobby not found' }, 404);

  const lob = result[0];
  if (lob.status !== 'waiting') return c.json({ error: 'Lobby is no longer available' }, 400);

  // Check player count
  const players = await db.select().from(lobbyPlayers).where(eq(lobbyPlayers.lobbyId, lobbyId));
  if (players.length >= lob.maxPlayers) return c.json({ error: 'Lobby is full' }, 400);

  // Check if already joined
  if (players.some(p => p.userId === user.id)) {
    return c.json({ lobbyId, alreadyJoined: true });
  }

  await db.insert(lobbyPlayers).values({
    lobbyId,
    userId: user.id,
    ready: false,
  });

  return c.json({ lobbyId });
});

// GET /lobby/:id
lobby.get('/lobby/:id', requireAuth, async (c) => {
  const lobbyId = c.req.param('id');
  const user = c.get('user' as never) as any;
  const db = createDb(c.env.NEON_DATABASE_URL);

  const result = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId)).limit(1);
  if (result.length === 0) return c.json({ error: 'Lobby not found' }, 404);

  const players = await db.select().from(lobbyPlayers).where(eq(lobbyPlayers.lobbyId, lobbyId));

  // Surface active game ID for rejoin if lobby has moved on
  let activeGameId: string | undefined;
  if (result[0].status !== 'waiting') {
    const gameRows = await db.select().from(games).where(eq(games.lobbyId, lobbyId)).limit(1);
    if (gameRows.length > 0 && gameRows[0].phase !== 'ended') {
      const isParticipant = await db
        .select()
        .from(gamePlayers)
        .where(and(eq(gamePlayers.gameId, gameRows[0].id), eq(gamePlayers.userId, user.id)))
        .limit(1);
      if (isParticipant.length > 0) activeGameId = gameRows[0].id;
    }
  }

  return c.json({ lobby: result[0], players, activeGameId });
});

export default lobby;
