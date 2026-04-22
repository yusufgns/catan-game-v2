import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries periodically (every 1000 checks)
let checkCount = 0;
function maybeCleanup() {
  if (++checkCount % 1000 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

/**
 * IP-based sliding window rate limiter for Cloudflare Workers.
 * Note: This is per-isolate. Under high traffic, each Worker isolate has
 * its own store, so effective limits may be higher than configured.
 * For stricter global limits, use Cloudflare Rate Limiting rules.
 */
export function rateLimit(opts: { windowMs: number; max: number }) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    maybeCleanup();

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    const entry = store.get(key);
    if (entry && entry.resetAt > now) {
      if (entry.count >= opts.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        c.header('Retry-After', String(retryAfter));
        return c.json({ error: 'Too many requests' }, 429);
      }
      entry.count++;
    } else {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
    }

    await next();
  });
}
