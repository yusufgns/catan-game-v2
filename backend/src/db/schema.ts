import { pgTable, text, boolean, integer, timestamp, bigserial, jsonb, primaryKey, index } from 'drizzle-orm/pg-core';

// ── Users & Auth ──────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  googleId: text('google_id').unique(),
  isGuest: boolean('is_guest').notNull().default(false),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  gems: integer('gems').notNull().default(0),
  eloRating: integer('elo_rating').notNull().default(1000),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_sessions_user_id').on(table.userId),
]);

export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_magic_link_email').on(table.email),
]);

export const oauthAccounts = pgTable('oauth_accounts', {
  provider: text('provider').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.provider, table.providerId] }),
]);

// ── Lobbies ───────────────────────────────────────────────────────────────────

export const lobbies = pgTable('lobbies', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  hostUserId: text('host_user_id').notNull().references(() => users.id),
  mode: text('mode').notNull().default('classic'),
  maxPlayers: integer('max_players').notNull().default(4),
  status: text('status').notNull().default('waiting'),
  isPublic: boolean('is_public').notNull().default(false),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_lobbies_status').on(table.status),
]);

export const lobbyPlayers = pgTable('lobby_players', {
  lobbyId: text('lobby_id').notNull().references(() => lobbies.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  ready: boolean('ready').notNull().default(false),
  color: text('color'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.lobbyId, table.userId] }),
]);

// ── Games ─────────────────────────────────────────────────────────────────────

export const games = pgTable('games', {
  id: text('id').primaryKey(),
  lobbyId: text('lobby_id').references(() => lobbies.id),
  mode: text('mode').notNull(),
  phase: text('phase').notNull().default('setup'),
  state: jsonb('state').notNull(),
  board: jsonb('board').notNull(),
  winnerUserId: text('winner_user_id').references(() => users.id),
  turnCount: integer('turn_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const gamePlayers = pgTable('game_players', {
  gameId: text('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  playerIndex: integer('player_index').notNull(),
  color: text('color').notNull(),
  vpFinal: integer('vp_final'),
  settlements: integer('settlements'),
  cities: integer('cities'),
  roads: integer('roads'),
  longestRoad: boolean('longest_road').default(false),
  largestArmy: boolean('largest_army').default(false),
  devCardsPlayed: integer('dev_cards_played'),
}, (table) => [
  primaryKey({ columns: [table.gameId, table.userId] }),
]);

export const gameActions = pgTable('game_actions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  actionType: text('action_type').notNull(),
  payload: jsonb('payload'),
  turnNumber: integer('turn_number').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_game_actions_game_id').on(table.gameId),
]);

// ── Stats ─────────────────────────────────────────────────────────────────────

export const userStats = pgTable('user_stats', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  gamesPlayed: integer('games_played').notNull().default(0),
  gamesWon: integer('games_won').notNull().default(0),
  totalVp: integer('total_vp').notNull().default(0),
  longestRoads: integer('longest_roads').notNull().default(0),
  largestArmies: integer('largest_armies').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
