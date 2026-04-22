import type { GameState, BoardGraph, Player, ResourceType, Hex } from '../types';
import type { ClientMessage } from '../protocol';
import { canPlaceSettlement, canUpgradeCity, canPlaceRoad, computeLongestRoad, distributeResources } from '../gameRules';
import { canAfford, deductCost } from '../costs';
import { SETTLEMENT_COST, CITY_COST, ROAD_COST, DEV_CARD_COST } from '../costs';
import { calculateVP } from '../victory';
import { buildBoardGraph } from '../boardGraph';
import { scoreIntersection } from './evaluate';
import type { BotStrategy } from './types';

const SIMULATION_COUNT = 800;
const MAX_SIMULATION_DEPTH = 30; // max turns to simulate

interface MCTSNode {
  action: ClientMessage | null;
  visits: number;
  totalScore: number;
  children: MCTSNode[];
  parent: MCTSNode | null;
}

/**
 * Hard bot — Monte Carlo Tree Search.
 * Simulates hundreds of random game continuations to find the best move.
 * No external API needed — pure computation.
 */
export function createHardBot(graph: BoardGraph): BotStrategy {
  return {
    decide(state: GameState, playerId: string): ClientMessage {
      // Setup phase: use heuristic (MCTS is overkill for setup)
      if (state.phase === 'setup1' || state.phase === 'setup2') {
        return decideSetup(state, playerId, graph);
      }

      // Roll dice first
      if (!state.diceRolled) {
        return { type: 'ROLL_DICE' };
      }

      // Get all valid actions
      const actions = getValidActions(state, playerId, graph);
      if (actions.length === 0) return { type: 'END_TURN' };
      if (actions.length === 1) return actions[0];

      // MCTS
      const root: MCTSNode = {
        action: null, visits: 0, totalScore: 0,
        children: [], parent: null,
      };

      // Expand root with all valid actions
      for (const action of actions) {
        root.children.push({
          action, visits: 0, totalScore: 0,
          children: [], parent: root,
        });
      }

      // Run simulations
      for (let i = 0; i < SIMULATION_COUNT; i++) {
        // Select: pick child with best UCB1
        const child = selectChild(root);
        if (!child) break;

        // Simulate: play random game from this action
        const score = simulate(state, playerId, child.action!, graph);

        // Backpropagate
        let node: MCTSNode | null = child;
        while (node) {
          node.visits++;
          node.totalScore += score;
          node = node.parent;
        }
      }

      // Pick action with highest average score
      let bestChild: MCTSNode | null = null;
      let bestAvg = -Infinity;
      for (const child of root.children) {
        if (child.visits === 0) continue;
        const avg = child.totalScore / child.visits;
        if (avg > bestAvg) { bestAvg = avg; bestChild = child; }
      }

      return bestChild?.action || { type: 'END_TURN' };
    },
  };
}

// ── UCB1 Selection ──────────────────────────────────────────────────────────

function selectChild(parent: MCTSNode): MCTSNode | null {
  if (parent.children.length === 0) return null;

  const C = 1.41; // exploration constant
  let best: MCTSNode | null = null;
  let bestUCB = -Infinity;

  for (const child of parent.children) {
    if (child.visits === 0) return child; // prioritize unvisited

    const exploitation = child.totalScore / child.visits;
    const exploration = C * Math.sqrt(Math.log(parent.visits) / child.visits);
    const ucb = exploitation + exploration;

    if (ucb > bestUCB) { bestUCB = ucb; best = child; }
  }

  return best;
}

// ── Simulation (Random Playout) ─────────────────────────────────────────────

function simulate(
  originalState: GameState,
  playerId: string,
  firstAction: ClientMessage,
  graph: BoardGraph,
): number {
  // Deep clone state
  const state = deepCloneState(originalState);

  // Apply first action
  applyAction(state, playerId, firstAction, graph);

  // Random playout for remaining turns
  let depth = 0;
  while (depth < MAX_SIMULATION_DEPTH && state.phase !== 'ended') {
    const cp = state.players[state.currentPlayerIndex];

    if (!state.diceRolled && state.phase === 'main') {
      // Roll dice
      const d1 = Math.ceil(Math.random() * 6);
      const d2 = Math.ceil(Math.random() * 6);
      state.diceValues = [d1, d2];
      state.diceRolled = true;
      const total = d1 + d2;
      if (total !== 7) {
        state.players = distributeResources(total, state.hexes, graph, state.players, state.robberHex);
      }
    }

    // Random action
    const actions = getValidActions(state, cp.id, graph);
    if (actions.length > 0) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      applyAction(state, cp.id, action, graph);
    }

    // End turn
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    state.diceRolled = false;
    state.diceValues = null;
    depth++;

    // Check victory
    for (const p of state.players) {
      const vp = p.settlements.length + p.cities.length * 2 +
        (state.longestRoadHolder === p.id ? 2 : 0) +
        (state.largestArmyHolder === p.id ? 2 : 0) +
        (p.devCards.victoryPoint || 0);
      if (vp >= 10) {
        state.phase = 'ended';
        state.winner = p.id;
        break;
      }
    }
  }

  // Score: how well did we do?
  return evaluateForPlayer(state, playerId);
}

// ── Action Generation ───────────────────────────────────────────────────────

function getValidActions(state: GameState, playerId: string, graph: BoardGraph): ClientMessage[] {
  const actions: ClientMessage[] = [];
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [{ type: 'END_TURN' }];

  // Settlement
  if (canAfford(player.resources, SETTLEMENT_COST as any)) {
    for (const [intId] of graph.intersections) {
      if (canPlaceSettlement(intId, graph, state.players, playerId)) {
        actions.push({ type: 'BUILD_SETTLEMENT', intersectionId: intId });
      }
    }
  }

  // City
  if (canAfford(player.resources, CITY_COST as any)) {
    for (const intId of player.settlements) {
      if (canUpgradeCity(intId, state.players, playerId)) {
        actions.push({ type: 'BUILD_CITY', intersectionId: intId });
      }
    }
  }

  // Road
  if (canAfford(player.resources, ROAD_COST as any)) {
    for (const [edgeId] of graph.edges) {
      if (canPlaceRoad(edgeId, graph, state.players, playerId)) {
        actions.push({ type: 'BUILD_ROAD', edgeId });
      }
    }
  }

  // Dev card
  if (canAfford(player.resources, DEV_CARD_COST as any) && state.devCardDeck.length > 0) {
    actions.push({ type: 'BUY_DEV_CARD' });
  }

  // Always can end turn
  actions.push({ type: 'END_TURN' });

  return actions;
}

// ── Apply Action (mutates cloned state) ─────────────────────────────────────

function applyAction(state: GameState, playerId: string, action: ClientMessage, graph: BoardGraph) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  switch (action.type) {
    case 'BUILD_SETTLEMENT':
      if (state.phase === 'main') {
        player.resources = deductCost(player.resources, SETTLEMENT_COST as any);
      }
      player.settlements.push(action.intersectionId);
      break;

    case 'BUILD_CITY':
      player.resources = deductCost(player.resources, CITY_COST as any);
      player.settlements = player.settlements.filter(id => id !== action.intersectionId);
      player.cities.push(action.intersectionId);
      break;

    case 'BUILD_ROAD':
      if (state.phase === 'main') {
        player.resources = deductCost(player.resources, ROAD_COST as any);
      }
      player.roads.push(action.edgeId);
      break;

    case 'BUY_DEV_CARD':
      player.resources = deductCost(player.resources, DEV_CARD_COST as any);
      if (state.devCardDeck.length > 0) {
        const card = state.devCardDeck.pop()!;
        player.devCards[card]++;
      }
      break;

    case 'END_TURN':
      break;
  }
}

// ── Evaluation ──────────────────────────────────────────────────────────────

function evaluateForPlayer(state: GameState, playerId: string): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;

  // Winner bonus
  if (state.winner === playerId) return 100;
  if (state.winner && state.winner !== playerId) return -50;

  let score = 0;

  // VP (most important)
  const vp = player.settlements.length + player.cities.length * 2 +
    (state.longestRoadHolder === playerId ? 2 : 0) +
    (state.largestArmyHolder === playerId ? 2 : 0) +
    (player.devCards.victoryPoint || 0);
  score += vp * 10;

  // Resource advantage
  const totalRes = Object.values(player.resources).reduce((a, b) => a + b, 0);
  score += Math.min(totalRes, 7) * 1;

  // Network size
  score += player.roads.length * 0.5;

  // VP lead over opponents
  const myVP = vp;
  const maxOpponentVP = Math.max(...state.players
    .filter(p => p.id !== playerId)
    .map(p => p.settlements.length + p.cities.length * 2));
  score += (myVP - maxOpponentVP) * 5;

  return score;
}

// ── Setup Decisions (heuristic, not MCTS) ───────────────────────────────────

function decideSetup(state: GameState, playerId: string, graph: BoardGraph): ClientMessage {
  if (!state.setupConstraint) {
    // Pick best settlement spot
    let bestId = '';
    let bestScore = -1;
    for (const [intId] of graph.intersections) {
      if (!canPlaceSettlement(intId, graph, state.players, playerId)) continue;
      const score = scoreIntersection(intId, graph, state.hexes, graph.hexIntersections);
      if (score > bestScore) { bestScore = score; bestId = intId; }
    }
    if (bestId) return { type: 'BUILD_SETTLEMENT', intersectionId: bestId };
  } else {
    // Pick best road from setup constraint
    let bestEdge = '';
    let bestScore = -1;
    for (const [edgeId, edge] of graph.edges) {
      if (!canPlaceRoad(edgeId, graph, state.players, playerId)) continue;
      if (!edge.intersections.includes(state.setupConstraint)) continue;
      const otherId = edge.intersections[0] === state.setupConstraint
        ? edge.intersections[1] : edge.intersections[0];
      const score = scoreIntersection(otherId, graph, state.hexes, graph.hexIntersections);
      if (score > bestScore) { bestScore = score; bestEdge = edgeId; }
    }
    if (bestEdge) return { type: 'BUILD_ROAD', edgeId: bestEdge };
  }
  return { type: 'END_TURN' };
}

// ── Deep Clone ──────────────────────────────────────────────────────────────

function deepCloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      settlements: [...p.settlements],
      cities: [...p.cities],
      roads: [...p.roads],
      resources: { ...p.resources },
      devCards: { ...p.devCards },
    })),
    hexes: state.hexes, // immutable, no need to clone
    devCardDeck: [...state.devCardDeck],
    stealTargets: [...state.stealTargets],
    diceValues: state.diceValues ? [...state.diceValues] as [number, number] : null,
    activeTrades: [],
    discardRequired: { ...state.discardRequired },
    discardDeadline: state.discardDeadline,
  };
}
