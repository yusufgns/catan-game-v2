import { eq } from 'drizzle-orm';
import { sessions, users } from '../db/schema';
import type { Database } from '../db/client';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Generate a random session token (32 bytes hex) */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hash a token for safe DB storage */
async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Create a new session for a user. Returns the raw token (to set as cookie). */
export async function createSession(db: Database, userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    id: tokenHash,
    userId,
    expiresAt,
  });

  return token;
}

/** Validate a session token. Returns the user if valid, null otherwise. */
export async function validateSession(db: Database, token: string) {
  const tokenHash = await hashToken(token);

  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, tokenHash))
    .limit(1);

  if (result.length === 0) return null;

  const { session, user } = result[0];

  // Check expiry
  if (new Date(session.expiresAt) < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, tokenHash));
    return null;
  }

  // Auto-renew: if less than 7 days remaining, extend by 30 days
  const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
  if (remainingMs < 7 * 24 * 60 * 60 * 1000) {
    const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
    await db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, tokenHash));
    // Touch user's updatedAt so cleanup cron doesn't delete active guests
    await db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  return user;
}

/** Delete a session by raw token */
export async function deleteSession(db: Database, token: string): Promise<void> {
  const tokenHash = await hashToken(token);
  await db.delete(sessions).where(eq(sessions.id, tokenHash));
}

/** Build Set-Cookie header value */
export function sessionCookie(token: string, secure = true): string {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  const parts = [
    `session=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** Build a clear-cookie header to logout */
export function clearSessionCookie(): string {
  return 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
}
