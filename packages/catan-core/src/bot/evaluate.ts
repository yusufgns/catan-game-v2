import type { BoardGraph, GameState, Hex, Resources, ResourceType } from '../types';
import { ALL_RESOURCES } from '../types';
import { NUMBER_PIPS } from '../hexGrid';

/**
 * Score an intersection for settlement placement.
 * Higher = better spot.
 */
export function scoreIntersection(
  intId: string,
  graph: BoardGraph,
  hexes: Hex[],
  hexIntersections: Map<string, string[]>,
): number {
  let pipScore = 0;
  const resourceTypes = new Set<string>();

  // Find which hexes touch this intersection
  for (const [hexKey, intIds] of hexIntersections) {
    if (!intIds.includes(intId)) continue;
    const [q, r] = hexKey.split(',').map(Number);
    const hex = hexes.find(h => h.q === q && h.r === r);
    if (!hex || !hex.number || hex.type === 'desert' || hex.type === 'ocean') continue;

    pipScore += NUMBER_PIPS[hex.number] || 0;
    resourceTypes.add(hex.type);
  }

  // Diversity bonus: more different resources = better
  const diversityBonus = resourceTypes.size * 2;

  // Ore + Grain access bonus (city strategy)
  const hasOre = resourceTypes.has('mountains');
  const hasGrain = resourceTypes.has('fields');
  const cityBonus = (hasOre ? 2 : 0) + (hasGrain ? 2 : 0);

  return pipScore + diversityBonus + cityBonus;
}

/**
 * Evaluate overall position strength for a player.
 */
export function evaluatePosition(state: GameState, playerId: string): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;

  let score = 0;

  // VP
  score += player.settlements.length * 10;
  score += player.cities.length * 20;

  // Resources in hand
  const totalRes = Object.values(player.resources).reduce((a, b) => a + b, 0);
  score += Math.min(totalRes, 7) * 1; // diminishing returns, 8+ is risky (robber)

  // Road network
  score += player.roads.length * 1.5;

  // Dev cards
  const totalDevCards = Object.values(player.devCards).reduce((a, b) => a + b, 0);
  score += totalDevCards * 3;

  // Knights played (largest army potential)
  score += player.knightsPlayed * 2;

  // Longest road / largest army
  if (state.longestRoadHolder === playerId) score += 20;
  if (state.largestArmyHolder === playerId) score += 20;

  return score;
}

/**
 * Score which resource is most needed right now.
 * Returns resource types sorted by value (most needed first).
 */
export function rankNeededResources(state: GameState, playerId: string): ResourceType[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return ['lumber', 'brick', 'wool', 'grain', 'ore'];

  const needs: Record<ResourceType, number> = {
    lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0,
  };

  // Settlement need
  if (player.settlements.length < 5) {
    needs.lumber += 3; needs.brick += 3; needs.wool += 3; needs.grain += 3;
  }

  // City need (high priority after 2+ settlements)
  if (player.settlements.length >= 2) {
    needs.grain += 4; needs.ore += 5;
  }

  // Road need
  needs.lumber += 1; needs.brick += 1;

  // Subtract what we already have
  for (const [res, amount] of Object.entries(player.resources)) {
    needs[res as ResourceType] = Math.max(0, needs[res as ResourceType] - amount * 2);
  }

  return (Object.entries(needs) as [ResourceType, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([res]) => res);
}

/**
 * Score how valuable each resource is to a player right now.
 * Higher = more wanted. Used for trade evaluation.
 *
 * Mirrors `rankNeededResources` weights but exposes raw scores so we can
 * compare offer/want totals.
 */
export function resourceValueMap(state: GameState, playerId: string): Record<ResourceType, number> {
  const player = state.players.find(p => p.id === playerId);
  const out: Record<ResourceType, number> = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 };
  if (!player) return out;

  // Demand weights (target inventory we'd like to have)
  if (player.settlements.length < 5) {
    out.lumber += 3; out.brick += 3; out.wool += 3; out.grain += 3;
  }
  if (player.settlements.length >= 2) {
    out.grain += 4; out.ore += 5;
  }
  out.lumber += 1; out.brick += 1;

  // Subtract what we already hold (each held unit reduces demand by 2)
  for (const r of ALL_RESOURCES) {
    out[r] = Math.max(0, out[r] - player.resources[r] * 2);
  }
  return out;
}

/**
 * Decide whether a bot should pre-accept a domestic trade offer.
 *
 * Bot accepts when:
 * - It has enough resources to fulfill the `want` side
 * - The total perceived value of what it would receive (offer) is strictly
 *   greater than the total perceived value of what it would give up (want)
 * - Giving up the want resources doesn't drop it below 1 of any resource
 *   it currently relies on for an immediate build
 */
export function shouldBotAcceptTrade(
  state: GameState,
  botId: string,
  offer: Partial<Resources>,
  want: Partial<Resources>,
): boolean {
  const bot = state.players.find(p => p.id === botId);
  if (!bot) return false;

  // Affordability: can the bot fulfill the want side?
  for (const r of ALL_RESOURCES) {
    const need = want[r] ?? 0;
    if (need > 0 && bot.resources[r] < need) return false;
  }

  const valueMap = resourceValueMap(state, botId);

  let benefit = 0;
  for (const r of ALL_RESOURCES) {
    benefit += (offer[r] ?? 0) * valueMap[r];
  }
  let cost = 0;
  for (const r of ALL_RESOURCES) {
    cost += (want[r] ?? 0) * valueMap[r];
  }

  // Add a small positive bias so trivially even-value swaps are still accepted
  // when the bot is rich (low marginal value); reject if margin is negative or
  // the bot is starved on any want resource (would drop to 0).
  for (const r of ALL_RESOURCES) {
    const give = want[r] ?? 0;
    if (give > 0 && bot.resources[r] - give === 0 && valueMap[r] > 0) {
      // Don't trade away your last unit of a resource you still want
      cost += valueMap[r];
    }
  }

  return benefit > cost;
}
