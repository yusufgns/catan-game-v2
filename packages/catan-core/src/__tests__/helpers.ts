import type { BoardGraph, GameState, Player, Resources, TradeOffer } from '../types';
import { EMPTY_DEV_CARDS, EMPTY_RESOURCES } from '../types';
import type { TradeContext } from '../tradeRules';

export function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    color: 'red',
    settlements: [],
    cities: [],
    roads: [],
    resources: { ...EMPTY_RESOURCES },
    devCards: { ...EMPTY_DEV_CARDS },
    knightsPlayed: 0,
    hasPlayedDevCardThisTurn: false,
    ...overrides,
  };
}

export function res(partial: Partial<Resources>): Resources {
  return { ...EMPTY_RESOURCES, ...partial };
}

export function makeState(players: Player[], overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'g1',
    mode: 'classic',
    phase: 'main',
    currentPlayerIndex: 0,
    turnNumber: 1,
    players,
    hexes: [],
    robberHex: '0,0',
    longestRoadHolder: null,
    largestArmyHolder: null,
    devCardDeck: [],
    setupConstraint: null,
    diceRolled: false,
    diceValues: null,
    stealTargets: [],
    activeTrades: [],
    discardRequired: {},
    discardDeadline: null,
    winner: null,
    ...overrides,
  };
}

export const CTX_OK: TradeContext = {
  isCurrentPlayerTurn: true,
  diceRolled: true,
  needsRobber: false,
  needsSteal: false,
  needsDiscard: false,
  isSetup: false,
};

export function makeTrade(overrides: Partial<TradeOffer> = {}): TradeOffer {
  return {
    id: 't1',
    fromPlayerId: 'p1',
    offer: { lumber: 1 },
    want: { ore: 1 },
    acceptedBy: [],
    createdAt: 0,
    expiresAt: 30_000,
    ...overrides,
  };
}

/** Edge id between two intersection ids — mirrors boardGraph's ekey. */
export function edgeIdBetween(a: string, b: string): string {
  return [a, b].sort().join('|');
}

/** Edge ids for a chain of consecutive intersection ids. */
export function chainEdges(path: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < path.length - 1; i++) out.push(edgeIdBetween(path[i], path[i + 1]));
  return out;
}

/** Find a simple path of `length` edges in the graph (returns length+1 intersection ids). */
export function findPath(graph: BoardGraph, length: number): string[] {
  function walk(path: string[], remaining: number): string[] | null {
    if (remaining === 0) return path;
    const cur = graph.intersections.get(path[path.length - 1])!;
    for (const next of cur.adjacentIntersections) {
      if (path.includes(next)) continue;
      const r = walk([...path, next], remaining - 1);
      if (r) return r;
    }
    return null;
  }
  for (const start of graph.intersections.keys()) {
    const path = walk([start], length);
    if (path) return path;
  }
  throw new Error(`no simple path of length ${length} found`);
}
