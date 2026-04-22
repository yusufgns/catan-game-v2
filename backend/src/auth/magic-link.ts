import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { users, magicLinkTokens, userStats } from '../db/schema';
import type { Database } from '../db/client';

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/** SHA-256 hash */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a magic link token and store in DB */
export async function createMagicLinkToken(db: Database, email: string): Promise<string> {
  const rawToken = nanoid(48);
  const tokenHash = await sha256(rawToken);

  await db.insert(magicLinkTokens).values({
    id: nanoid(16),
    email,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
  });

  return rawToken;
}

/** Verify a magic link token. Returns email if valid, null otherwise. */
export async function verifyMagicLinkToken(db: Database, rawToken: string): Promise<string | null> {
  const tokenHash = await sha256(rawToken);

  const result = await db
    .select()
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        eq(magicLinkTokens.used, false),
      )
    )
    .limit(1);

  if (result.length === 0) return null;

  const record = result[0];
  if (new Date(record.expiresAt) < new Date()) return null;

  // Mark as used
  await db.update(magicLinkTokens)
    .set({ used: true })
    .where(eq(magicLinkTokens.id, record.id));

  return record.email;
}

/** Upsert user by email (for magic link auth) */
export async function upsertEmailUser(db: Database, email: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    const [user] = await db.update(users).set({
      emailVerified: true,
      isGuest: false,
      updatedAt: new Date(),
    }).where(eq(users.id, existing[0].id)).returning();
    return user;
  }

  // New user from email
  const id = nanoid(16);
  const name = email.split('@')[0];
  const tag = String(Math.floor(10000 + Math.random() * 90000));
  const [user] = await db.insert(users).values({
    id,
    email,
    emailVerified: true,
    name,
    tag,
    isGuest: false,
  }).returning();

  await db.insert(userStats).values({ userId: id }).onConflictDoNothing();
  return user;
}

/** Send magic link email via Resend */
export async function sendMagicLinkEmail(
  resendApiKey: string,
  email: string,
  verifyUrl: string,
) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Catan <noreply@catan.game>',
      to: [email],
      subject: 'Catan — Giriş Linki',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#1a1a2e;">Catan'a Hoş Geldin!</h2>
          <p>Giriş yapmak için aşağıdaki butona tıkla:</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#d97706;color:#fff;padding:12px 32px;
            border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0;">
            Giriş Yap
          </a>
          <p style="color:#6b7280;font-size:13px;">Bu link 15 dakika geçerlidir ve tek kullanımlıktır.</p>
          <p style="color:#6b7280;font-size:13px;">Bu maili sen talep etmediysen güvenle yoksayabilirsin.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }
}
