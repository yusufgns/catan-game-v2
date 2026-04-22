import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { Env } from '../env';
import { createDb } from '../db/client';

const health = new Hono<{ Bindings: Env }>();

health.get('/health', async (c) => {
  const start = Date.now();
  let dbLatency: number | null = null;
  let dbStatus: 'ok' | 'error' = 'ok';

  try {
    const db = createDb(c.env.NEON_DATABASE_URL);
    await db.execute(sql`SELECT 1`);
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = 'error';
    dbLatency = Date.now() - start;
  }

  return c.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    environment: c.env.ENVIRONMENT,
    db: { status: dbStatus, latencyMs: dbLatency },
    timestamp: new Date().toISOString(),
  });
});

export default health;
