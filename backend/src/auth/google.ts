import { Google } from 'arctic';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { users, oauthAccounts, userStats } from '../db/schema';
import type { Database } from '../db/client';

export function createGoogleClient(clientId: string, clientSecret: string, redirectUri: string) {
  return new Google(clientId, clientSecret, redirectUri);
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
}

/** Fetch Google user info from access token */
export async function getGoogleUser(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  return res.json();
}

/** Upsert user from Google OAuth — handles new users, existing users, and guest upgrades */
export async function upsertGoogleUser(db: Database, googleUser: GoogleUserInfo) {
  // Check if OAuth account already exists
  const existing = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.providerId, googleUser.sub))
    .limit(1);

  if (existing.length > 0) {
    // Known user — update profile
    const userId = existing[0].userId;
    const [user] = await db.update(users).set({
      name: googleUser.name,
      avatarUrl: googleUser.picture,
      email: googleUser.email,
      emailVerified: googleUser.email_verified,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return user;
  }

  // Check if email matches an existing account (guest upgrade or email user)
  if (googleUser.email) {
    const emailUser = await db.select().from(users).where(eq(users.email, googleUser.email)).limit(1);
    if (emailUser.length > 0) {
      const userId = emailUser[0].id;
      // Link Google to existing account
      await db.insert(oauthAccounts).values({
        provider: 'google',
        providerId: googleUser.sub,
        userId,
      });
      const [user] = await db.update(users).set({
        googleId: googleUser.sub,
        avatarUrl: googleUser.picture,
        emailVerified: true,
        isGuest: false,
        updatedAt: new Date(),
      }).where(eq(users.id, userId)).returning();
      return user;
    }
  }

  // New user
  const id = nanoid(16);
  const tag = String(Math.floor(10000 + Math.random() * 90000));
  const [user] = await db.insert(users).values({
    id,
    email: googleUser.email,
    emailVerified: googleUser.email_verified,
    name: googleUser.name,
    tag,
    avatarUrl: googleUser.picture,
    googleId: googleUser.sub,
    isGuest: false,
  }).returning();

  // OAuth link
  await db.insert(oauthAccounts).values({
    provider: 'google',
    providerId: googleUser.sub,
    userId: id,
  });

  // Initialize stats
  await db.insert(userStats).values({ userId: id }).onConflictDoNothing();

  return user;
}
