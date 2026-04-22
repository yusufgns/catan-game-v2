/**
 * Simple matchmaking queue — pairs players by mode and ELO range.
 * Runs in-memory within the Worker (stateless between requests).
 * For production: use a Durable Object or external queue.
 */

interface QueueEntry {
  userId: string;
  name: string;
  elo: number;
  mode: string;
  joinedAt: number;
}

const queue: QueueEntry[] = [];
const ELO_RANGE = 300;
const MAX_WAIT_MS = 30_000; // widen range after 30s

export function addToQueue(entry: Omit<QueueEntry, 'joinedAt'>): string | null {
  // Check if already in queue
  if (queue.some(e => e.userId === entry.userId)) return null;

  const now = Date.now();
  queue.push({ ...entry, joinedAt: now });

  // Try to match 4 players
  return tryMatch(entry.mode);
}

export function removeFromQueue(userId: string): void {
  const idx = queue.findIndex(e => e.userId === userId);
  if (idx !== -1) queue.splice(idx, 1);
}

function tryMatch(mode: string): string | null {
  const now = Date.now();
  const candidates = queue.filter(e => e.mode === mode);

  if (candidates.length < 2) return null;

  // Sort by join time (oldest first)
  candidates.sort((a, b) => a.joinedAt - b.joinedAt);

  const anchor = candidates[0];
  const waited = now - anchor.joinedAt;
  const range = waited > MAX_WAIT_MS ? ELO_RANGE * 2 : ELO_RANGE;

  const matched = candidates.filter(c =>
    Math.abs(c.elo - anchor.elo) <= range
  ).slice(0, 4);

  if (matched.length >= 2) {
    // Remove matched from queue
    for (const m of matched) {
      const idx = queue.findIndex(e => e.userId === m.userId);
      if (idx !== -1) queue.splice(idx, 1);
    }
    // Return matched player IDs (caller creates lobby)
    return JSON.stringify(matched.map(m => ({ userId: m.userId, name: m.name })));
  }

  return null;
}

export function getQueueSize(mode?: string): number {
  return mode ? queue.filter(e => e.mode === mode).length : queue.length;
}
