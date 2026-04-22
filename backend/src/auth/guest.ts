import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { users, userStats } from '../db/schema';
import type { Database } from '../db/client';

/** Generate random 5-digit tag (10000-99999) */
function generateTag(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

/** Find a globally unique tag (retry if tag already exists) */
async function findUniqueTag(db: Database, maxRetries = 10): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const tag = generateTag();
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.tag, tag))
      .limit(1);
    if (existing.length === 0) return tag;
  }
  // Fallback: 6 digit if 5-digit space is getting full
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Create a guest user account */
export async function createGuestUser(db: Database, name: string) {
  const id = nanoid(16);
  const tag = await findUniqueTag(db);

  const [user] = await db.insert(users).values({
    id,
    name: name || 'Guest',
    tag,
    isGuest: true,
  }).returning();

  await db.insert(userStats).values({ userId: id }).onConflictDoNothing();
  return user;
}
