import type { GameState, BoardGraph, ResourceType } from '../types';
import type { ClientMessage } from '../protocol';
import { canPlaceSettlement, canUpgradeCity, canPlaceRoad } from '../gameRules';
import { canAfford } from '../costs';
import { SETTLEMENT_COST, CITY_COST, ROAD_COST, DEV_CARD_COST } from '../costs';
import { playerTradeRates } from '../harborUtils';
import { scoreIntersection, rankNeededResources } from './evaluate';
import type { BotStrategy } from './types';

/**
 * Medium bot — heuristic strategy.
 * - Scores intersections by pip value + diversity
 * - Build priority: city > settlement > dev card > road
 * - Basic maritime trade when stuck
 * - Places robber on strongest opponent's best hex
 */
export function createMediumBot(graph: BoardGraph): BotStrategy {
  return {
    decide(state: GameState, playerId: string): ClientMessage {
      const player = state.players.find(p => p.id === playerId)!;

      // ── Setup Phase ──────────────────────────────────────────────────────
      if (state.phase === 'setup1' || state.phase === 'setup2') {
        if (!state.setupConstraint) {
          // Pick best intersection by score
          const bestInt = pickBestSettlementSpot(state, playerId, graph);
          if (bestInt) return { type: 'BUILD_SETTLEMENT', intersectionId: bestInt };
        } else {
          // Pick road toward best expansion direction
          const bestEdge = pickBestRoadForSetup(state, playerId, graph);
          if (bestEdge) return { type: 'BUILD_ROAD', edgeId: bestEdge };
        }
        // Fallback
        return { type: 'END_TURN' };
      }

      // ── Main Phase ───────────────────────────────────────────────────────

      // Roll dice
      if (!state.diceRolled) {
        // Play knight before rolling if we have one (to move robber first)
        if (player.devCards.knight > 0 && !player.hasPlayedDevCardThisTurn) {
          return {
            type: 'PLAY_DEV_CARD',
            cardType: 'knight',
            payload: pickRobberTarget(state, playerId, graph),
          };
        }
        return { type: 'ROLL_DICE' };
      }

      // Build priority: city > settlement > dev card > road

      // City upgrade
      if (canAfford(player.resources, CITY_COST as any) && player.settlements.length > 0) {
        // Upgrade the settlement with highest pip score
        let bestInt = '';
        let bestScore = -1;
        for (const intId of player.settlements) {
          const score = scoreIntersection(intId, graph, state.hexes, graph.hexIntersections);
          if (score > bestScore) { bestScore = score; bestInt = intId; }
        }
        if (bestInt) return { type: 'BUILD_CITY', intersectionId: bestInt };
      }

      // New settlement
      if (canAfford(player.resources, SETTLEMENT_COST as any)) {
        const bestInt = pickBestSettlementSpot(state, playerId, graph);
        if (bestInt) return { type: 'BUILD_SETTLEMENT', intersectionId: bestInt };
      }

      // Dev card (if we need knights for largest army, or just to gamble)
      if (canAfford(player.resources, DEV_CARD_COST as any) && state.devCardDeck.length > 0) {
        if (player.knightsPlayed >= 1 || Math.random() < 0.4) {
          return { type: 'BUY_DEV_CARD' };
        }
      }

      // Road (if expanding toward good spots)
      if (canAfford(player.resources, ROAD_COST as any) && player.roads.length < 12) {
        const bestEdge = pickExpansionRoad(state, playerId, graph);
        if (bestEdge) return { type: 'BUILD_ROAD', edgeId: bestEdge };
      }

      // Maritime trade if we have surplus
      const tradeAction = tryMaritimeTrade(state, playerId);
      if (tradeAction) return tradeAction;

      return { type: 'END_TURN' };
    },
  };
}

// ── Helper Functions ──────────────────────────────────────────────────────────

function pickBestSettlementSpot(state: GameState, playerId: string, graph: BoardGraph): string | null {
  let bestId: string | null = null;
  let bestScore = -1;

  for (const [intId] of graph.intersections) {
    if (!canPlaceSettlement(intId, graph, state.players, playerId)) continue;
    const score = scoreIntersection(intId, graph, state.hexes, graph.hexIntersections);
    if (score > bestScore) { bestScore = score; bestId = intId; }
  }

  return bestId;
}

function pickBestRoadForSetup(state: GameState, playerId: string, graph: BoardGraph): string | null {
  // Pick road adjacent to setupConstraint that leads toward best future settlement
  const constraint = state.setupConstraint;
  if (!constraint) return null;

  let bestEdge: string | null = null;
  let bestScore = -1;

  for (const [edgeId, edge] of graph.edges) {
    if (!canPlaceRoad(edgeId, graph, state.players, playerId)) continue;
    if (!edge.intersections.includes(constraint)) continue;

    // Score the other endpoint
    const otherId = edge.intersections[0] === constraint ? edge.intersections[1] : edge.intersections[0];
    const score = scoreIntersection(otherId, graph, state.hexes, graph.hexIntersections);
    if (score > bestScore) { bestScore = score; bestEdge = edgeId; }
  }

  return bestEdge;
}

function pickExpansionRoad(state: GameState, playerId: string, graph: BoardGraph): string | null {
  let bestEdge: string | null = null;
  let bestScore = -1;

  for (const [edgeId] of graph.edges) {
    if (!canPlaceRoad(edgeId, graph, state.players, playerId)) continue;

    const edge = graph.edges.get(edgeId)!;
    // Score based on what the endpoints lead to
    let score = 0;
    for (const intId of edge.intersections) {
      if (canPlaceSettlement(intId, graph, state.players, playerId)) {
        score += scoreIntersection(intId, graph, state.hexes, graph.hexIntersections);
      }
    }
    if (score > bestScore) { bestScore = score; bestEdge = edgeId; }
  }

  return bestEdge;
}

function pickRobberTarget(state: GameState, playerId: string, graph: BoardGraph): any {
  // Find strongest opponent
  let strongestId = '';
  let maxVP = -1;
  for (const p of state.players) {
    if (p.id === playerId) continue;
    const vp = p.settlements.length + p.cities.length * 2;
    if (vp > maxVP) { maxVP = vp; strongestId = p.id; }
  }

  // Find hex adjacent to their settlement with highest pip
  let bestHex = '';
  let bestPip = -1;
  for (const hex of state.hexes) {
    if (hex.type === 'desert' || hex.type === 'ocean' || !hex.number) continue;
    const hexKey = `${hex.q},${hex.r}`;
    if (hexKey === state.robberHex) continue;

    const intIds = graph.hexIntersections.get(hexKey) || [];
    const touchesStrongest = intIds.some(intId =>
      state.players.find(p => p.id === strongestId)?.settlements.includes(intId) ||
      state.players.find(p => p.id === strongestId)?.cities.includes(intId)
    );

    if (touchesStrongest) {
      const pip = (hex.number && hex.number in [6, 8]) ? 5 : (hex.number ? 6 - Math.abs(7 - hex.number) : 0);
      if (pip > bestPip) { bestPip = pip; bestHex = hexKey; }
    }
  }

  return { robberHex: bestHex || '0,0', stealFrom: strongestId || null };
}

function tryMaritimeTrade(state: GameState, playerId: string): ClientMessage | null {
  const player = state.players.find(p => p.id === playerId)!;
  const rates = playerTradeRates(player);
  const needed = rankNeededResources(state, playerId);

  // Find a resource we have excess of
  for (const [res, amount] of Object.entries(player.resources) as [ResourceType, number][]) {
    const rate = rates[res];
    if (amount >= rate + 1) { // keep at least 1
      const wantRes = needed.find(r => r !== res && player.resources[r] === 0);
      if (wantRes) {
        return {
          type: 'MARITIME_TRADE',
          give: { resource: res, amount: rate },
          want: wantRes,
        };
      }
    }
  }

  return null;
}
