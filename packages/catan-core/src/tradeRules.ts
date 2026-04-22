import type { Player, Resources, ResourceType, TradeOffer } from './types';
import { ALL_RESOURCES } from './types';
import { playerTradeRates } from './harborUtils';

export type TradeError =
  | 'INVALID_TRADE'
  | 'INSUFFICIENT_RESOURCES'
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'DUPLICATE_TRADE'
  | 'NO_ACTIVE_TRADE'
  | 'TRADE_TARGETED_AT_OTHER'
  | 'CANNOT_ACCEPT_OWN_TRADE'
  | 'NO_PRE_ACCEPTOR'
  | 'PARTNER_NOT_PRE_ACCEPTED'
  | 'ALREADY_ACCEPTED';

export interface TradeContext {
  isCurrentPlayerTurn: boolean;
  diceRolled: boolean;
  needsRobber: boolean;
  needsSteal: boolean;
  needsDiscard: boolean;
  isSetup: boolean;
}

function canActOnTurn(ctx: TradeContext): TradeError | null {
  if (ctx.isSetup) return 'WRONG_PHASE';
  if (!ctx.isCurrentPlayerTurn) return 'NOT_YOUR_TURN';
  if (!ctx.diceRolled) return 'WRONG_PHASE';
  if (ctx.needsRobber || ctx.needsSteal || ctx.needsDiscard) return 'WRONG_PHASE';
  return null;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

function partialResourceTotal(r: Partial<Resources>): number {
  let total = 0;
  for (const k of ALL_RESOURCES) total += r[k] ?? 0;
  return total;
}

function partialResourceValid(r: Partial<Resources>): boolean {
  for (const k of Object.keys(r)) {
    if (!ALL_RESOURCES.includes(k as ResourceType)) return false;
    const v = (r as any)[k];
    if (!isPositiveInt(v)) return false;
  }
  return partialResourceTotal(r) > 0;
}

function hasEnough(player: Player, need: Partial<Resources>): boolean {
  for (const k of ALL_RESOURCES) {
    const n = need[k] ?? 0;
    if (n > 0 && player.resources[k] < n) return false;
  }
  return true;
}

function overlap(a: Partial<Resources>, b: Partial<Resources>): boolean {
  for (const k of ALL_RESOURCES) {
    if ((a[k] ?? 0) > 0 && (b[k] ?? 0) > 0) return true;
  }
  return false;
}

/** Canonical signature for duplicate detection. Same offer/want = same sig. */
export function tradeSignature(offer: Partial<Resources>, want: Partial<Resources>): string {
  const norm = (r: Partial<Resources>) =>
    ALL_RESOURCES.map(k => `${k}:${r[k] ?? 0}`).join('|');
  return `${norm(offer)}>${norm(want)}`;
}

// ── Maritime ──────────────────────────────────────────────────────────────────

export function validateMaritimeTrade(
  player: Player,
  give: { resource: ResourceType; amount: number },
  want: ResourceType,
  ctx: TradeContext,
): TradeError | null {
  const turnErr = canActOnTurn(ctx);
  if (turnErr) return turnErr;

  if (!ALL_RESOURCES.includes(give.resource) || !ALL_RESOURCES.includes(want)) return 'INVALID_TRADE';
  if (give.resource === want) return 'INVALID_TRADE';

  const rate = playerTradeRates(player)[give.resource];
  if (!isPositiveInt(give.amount) || give.amount !== rate) return 'INVALID_TRADE';

  if (player.resources[give.resource] < give.amount) return 'INSUFFICIENT_RESOURCES';

  return null;
}

// ── Domestic Offer ────────────────────────────────────────────────────────────

export function validateOfferTrade(
  player: Player,
  offer: Partial<Resources>,
  want: Partial<Resources>,
  targetPlayerId: string | undefined,
  allPlayers: Player[],
  activeTrades: TradeOffer[],
  ctx: TradeContext,
): TradeError | null {
  const turnErr = canActOnTurn(ctx);
  if (turnErr) return turnErr;

  if (!partialResourceValid(offer) || !partialResourceValid(want)) return 'INVALID_TRADE';
  if (overlap(offer, want)) return 'INVALID_TRADE';
  if (!hasEnough(player, offer)) return 'INSUFFICIENT_RESOURCES';

  if (targetPlayerId !== undefined) {
    if (targetPlayerId === player.id) return 'INVALID_TRADE';
    if (!allPlayers.some(p => p.id === targetPlayerId)) return 'INVALID_TRADE';
  }

  // Duplicate guard: this player already has an open trade with the same
  // offer/want signature. Prevents spamming the same offer.
  const sig = tradeSignature(offer, want);
  for (const t of activeTrades) {
    if (t.fromPlayerId !== player.id) continue;
    if (tradeSignature(t.offer, t.want) === sig) return 'DUPLICATE_TRADE';
  }

  return null;
}

// ── Domestic Pre-Accept (recipient signals willingness) ──────────────────────

export function validatePreAcceptTrade(
  accepter: Player,
  trade: TradeOffer | null,
  tradeId: string,
): TradeError | null {
  if (!trade || trade.id !== tradeId) return 'NO_ACTIVE_TRADE';
  if (accepter.id === trade.fromPlayerId) return 'CANNOT_ACCEPT_OWN_TRADE';
  if (trade.toPlayerId !== undefined && trade.toPlayerId !== accepter.id) return 'TRADE_TARGETED_AT_OTHER';
  if (trade.acceptedBy.includes(accepter.id)) return 'ALREADY_ACCEPTED';
  if (!hasEnough(accepter, trade.want)) return 'INSUFFICIENT_RESOURCES';
  return null;
}

// ── Domestic Finalize (offerer picks one pre-acceptor) ───────────────────────

export function validateFinalizeTrade(
  offerer: Player,
  partner: Player | null,
  trade: TradeOffer | null,
  tradeId: string,
  partnerId: string,
): TradeError | null {
  if (!trade || trade.id !== tradeId) return 'NO_ACTIVE_TRADE';
  if (offerer.id !== trade.fromPlayerId) return 'NOT_YOUR_TURN';
  if (!partner || !trade.acceptedBy.includes(partnerId)) return 'PARTNER_NOT_PRE_ACCEPTED';
  if (!hasEnough(offerer, trade.offer)) return 'INSUFFICIENT_RESOURCES';
  if (!hasEnough(partner, trade.want)) return 'INSUFFICIENT_RESOURCES';
  return null;
}

// ── Helpers re-exported for UI ────────────────────────────────────────────────

export { playerTradeRates };
