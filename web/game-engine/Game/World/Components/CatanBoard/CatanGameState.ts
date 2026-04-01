/**
 * Catan game state manager — vanilla JS equivalent of the React state
 * from web/app/test-3d/page.tsx. Manages players, turns, phases,
 * settlement/city/road placement, dice, robber, resources, and victory.
 */
import { BEGINNER_BOARD, generateRandomBoard } from '../../../../game-logic/hexGrid';
import { buildBoardGraph } from '../../../../game-logic/boardGraph';
import { EMPTY_RESOURCES, EMPTY_DEV_CARDS, createDevCardDeck, DEV_CARD_COST } from '../../../../game-logic/gameTypes';
import type { DevCardType } from '../../../../game-logic/gameTypes';
import {
  canPlaceSettlement,
  canUpgradeCity,
  canPlaceRoad,
  computeLongestRoad,
  distributeResources,
} from '../../../../game-logic/gameRules';

const INITIAL_PLAYERS = [
  { id: 'p1', name: 'TUTANKHAMIN', color: '#d97706', settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES }, devCards: { ...EMPTY_DEV_CARDS } },
  { id: 'p2', name: 'NASSIR',      color: '#2563eb', settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES }, devCards: { ...EMPTY_DEV_CARDS } },
  { id: 'p3', name: 'JEAN',        color: '#16a34a', settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES }, devCards: { ...EMPTY_DEV_CARDS } },
  { id: 'p4', name: 'CANDAMIR',    color: '#dc2626', settlements: [], cities: [], roads: [], resources: { ...EMPTY_RESOURCES }, devCards: { ...EMPTY_DEV_CARDS } },
];

export type GameMode = 'classic' | 'ranked';

export default class CatanGameState {
  mode: GameMode;
  hexes: any[];
  graph: any;
  players: any[];
  currentPlayerIndex: number;
  actionMode: string;
  phase: string;
  longestRoadHolder: string | null;
  setupConstraint: string | null;
  diceRolled: boolean;
  diceValues: [number, number] | null;
  stealTargets: string[];
  winner: any;
  robberHex: string;
  devCardDeck: DevCardType[];
  _listeners: ((state: any) => void)[];

  constructor(mode: GameMode = 'classic', boardData?: any[]) {
    this.mode = mode;
    this.hexes = boardData ? [...boardData] : (mode === 'ranked' ? generateRandomBoard() : [...BEGINNER_BOARD]);
    this.graph = buildBoardGraph(this.hexes);
    this.players = INITIAL_PLAYERS.map(p => ({ ...p, resources: { ...EMPTY_RESOURCES }, devCards: { ...EMPTY_DEV_CARDS }, settlements: [], cities: [], roads: [] }));
    this.devCardDeck = createDevCardDeck();
    this.currentPlayerIndex = 0;
    this.actionMode = 'settlement';
    this.phase = 'setup1';
    this.longestRoadHolder = null;
    this.setupConstraint = null;
    this.diceRolled = false;
    this.diceValues = null;
    this.stealTargets = [];
    this.winner = null;

    const desert = this.hexes.find((h: any) => h.type === 'desert');
    this.robberHex = desert ? `${desert.q},${desert.r}` : '0,0';

    this._listeners = [];
  }

  get currentPlayer() { return this.players[this.currentPlayerIndex]; }
  get isSetup() { return this.phase !== 'main'; }
  get diceTotal() { return this.diceValues ? this.diceValues[0] + this.diceValues[1] : null; }

  onChange(fn: (state: any) => void) { this._listeners.push(fn); }
  _emit() {
    // Safety: if all players have 2 settlements and 2 roads, setup is done
    if (this.isSetup) {
      const allDone = this.players.every((p: any) => p.settlements.length >= 2 && p.roads.length >= 2);
      if (allDone) {
        this.phase = 'main';
        this.currentPlayerIndex = 0;
        this.actionMode = 'idle';
        this.setupConstraint = null;
      }
    }
    this._listeners.forEach(fn => fn(this));
  }

  // ── Valid positions ──────────────────────────────────────────────────────
  getValidIntersections(): Map<string, 'settlement' | 'city'> {
    const valid = new Map<string, 'settlement' | 'city'>();
    const showSettlement = this.actionMode === 'settlement' || (!this.isSetup && this.actionMode === 'idle' && this.canAffordSettlement());
    const showCity = this.actionMode === 'city' || (!this.isSetup && this.actionMode === 'idle' && this.canAffordCity());
    if (!showSettlement && !showCity) return valid;
    for (const [id] of this.graph.intersections) {
      if (showCity && canUpgradeCity(id, this.players, this.currentPlayer.id)) valid.set(id, 'city');
      else if (showSettlement && canPlaceSettlement(id, this.graph, this.players, this.currentPlayer.id)) valid.set(id, 'settlement');
    }
    return valid;
  }

  getValidEdges() {
    const valid = new Set();
    const showRoad = this.actionMode === 'road' || (!this.isSetup && this.actionMode === 'idle' && this.canAffordRoad());
    if (!showRoad) return valid;
    for (const [id, edge] of this.graph.edges) {
      if (this.setupConstraint && !edge.intersections.includes(this.setupConstraint)) continue;
      if (canPlaceRoad(id, this.graph, this.players, this.currentPlayer.id)) valid.add(id);
    }
    return valid;
  }

  // ── Longest road recalc ─────────────────────────────────────────────────
  _recalcLR() {
    const lengths = new Map(this.players.map(p => [p.id, computeLongestRoad(p.id, this.graph, this.players)]));
    if (this.longestRoadHolder !== null) {
      const holderLen = lengths.get(this.longestRoadHolder) || 0;
      if (holderLen >= 5) {
        let bestLen = holderLen, bestId = this.longestRoadHolder;
        for (const [id, len] of lengths) if (len > bestLen) { bestLen = len; bestId = id; }
        this.longestRoadHolder = bestId;
        return;
      }
    }
    let bestId = null, bestLen = 4;
    for (const [id, len] of lengths) if (len > bestLen) { bestLen = len; bestId = id; }
    this.longestRoadHolder = bestId;
  }

  computeVP(player: any): number {
    return player.settlements.length + player.cities.length * 2
      + (player.devCards?.victoryPoint || 0)
      + (this.longestRoadHolder === player.id ? 2 : 0);
  }

  canAffordRoad(): boolean {
    if (this.isSetup) return true;
    const r = this.currentPlayer.resources;
    return r.lumber >= 1 && r.brick >= 1;
  }

  canAffordSettlement(): boolean {
    if (this.isSetup) return true;
    const r = this.currentPlayer.resources;
    return r.lumber >= 1 && r.brick >= 1 && r.wool >= 1 && r.grain >= 1;
  }

  canAffordCity(): boolean {
    const r = this.currentPlayer.resources;
    return r.grain >= 2 && r.ore >= 3;
  }

  canBuyDevCard(): boolean {
    if (this.isSetup || this.devCardDeck.length === 0) return false;
    const r = this.currentPlayer.resources;
    return r.wool >= 1 && r.grain >= 1 && r.ore >= 1;
  }

  buyDevCard() {
    if (!this.canBuyDevCard()) return;
    const r = this.currentPlayer.resources;
    r.wool--;
    r.grain--;
    r.ore--;
    // Draw card
    const card = this.devCardDeck.pop()!;
    if (!this.currentPlayer.devCards) this.currentPlayer.devCards = { ...EMPTY_DEV_CARDS };
    this.currentPlayer.devCards[card]++;
    this._checkWinner();
    this._emit();
  }

  _checkWinner() {
    this.winner = this.players.find(p => this.computeVP(p) >= 10) || null;
  }

  // ── Setup turn advancement ──────────────────────────────────────────────
  _advanceSetupTurn() {
    this.setupConstraint = null;
    if (this.phase === 'setup1') {
      if (this.currentPlayerIndex === this.players.length - 1) {
        this.phase = 'setup2';
        this.actionMode = 'settlement';
      } else {
        this.currentPlayerIndex++;
        this.actionMode = 'settlement';
      }
    } else if (this.phase === 'setup2') {
      if (this.currentPlayerIndex === 0) {
        this.phase = 'main';
        this.currentPlayerIndex = 0;
        this.actionMode = 'idle';
      } else {
        this.currentPlayerIndex--;
        this.actionMode = 'settlement';
      }
    }
  }

  // ── Build helpers ────────────────────────────────────────────────────────

  _placeSettlement(intId: string): boolean {
    const r = this.currentPlayer.resources;
    if (!this.isSetup) { r.lumber--; r.brick--; r.wool--; r.grain--; }
    this.currentPlayer.settlements.push(intId);
    this._recalcLR();
    if (this.isSetup) {
      this.setupConstraint = intId;
      this.actionMode = 'road';
    } else {
      this.setupConstraint = null;
      this.actionMode = 'idle';
    }
    this._checkWinner();
    this._emit();
    return true;
  }

  _placeCity(intId: string): boolean {
    const r = this.currentPlayer.resources;
    r.grain -= 2; r.ore -= 3;
    this.currentPlayer.settlements = this.currentPlayer.settlements.filter(s => s !== intId);
    this.currentPlayer.cities.push(intId);
    this._checkWinner();
    this.actionMode = 'idle';
    this._emit();
    return true;
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  handleIntersectionClick(intId: string): boolean {
    if (this.actionMode === 'settlement' || this.actionMode === 'idle') {
      // Try city upgrade first (on own settlement)
      if (this.canAffordCity() && canUpgradeCity(intId, this.players, this.currentPlayer.id)) {
        return this._placeCity(intId);
      }
      // Then try new settlement
      if (canPlaceSettlement(intId, this.graph, this.players, this.currentPlayer.id)) {
        if (!this.isSetup && !this.canAffordSettlement()) return false;
        return this._placeSettlement(intId);
      }
      return false;
    } else if (this.actionMode === 'city') {
      if (!canUpgradeCity(intId, this.players, this.currentPlayer.id)) return false;
      if (!this.canAffordCity()) return false;
      return this._placeCity(intId);
    }
    return false;
  }

  handleEdgeClick(edgeId: string): boolean {
    if (this.actionMode !== 'road' && this.actionMode !== 'idle') return false;
    if (this.setupConstraint) {
      const edge = this.graph.edges.get(edgeId);
      if (!edge || !edge.intersections.includes(this.setupConstraint)) return false;
    }
    if (!canPlaceRoad(edgeId, this.graph, this.players, this.currentPlayer.id)) return false;
    if (!this.isSetup && !this.canAffordRoad()) return false;
    if (!this.isSetup) { const r = this.currentPlayer.resources; r.lumber--; r.brick--; }
    this.currentPlayer.roads.push(edgeId);
    this._recalcLR();
    if (this.isSetup) this._advanceSetupTurn();
    else { this.setupConstraint = null; this.actionMode = 'idle'; }
    this._checkWinner();
    this._emit();
    return true;
  }

  handleHexClick(hexKey: string): boolean {
    if (this.actionMode !== 'robber') return false;
    // Robber must move to a DIFFERENT hex
    if (hexKey === this.robberHex) return false;
    this.robberHex = hexKey;
    const intIds = this.graph.hexIntersections.get(hexKey) || [];
    const opponentIds = new Set();
    for (const intId of intIds) {
      for (const p of this.players) {
        if (p.id === this.currentPlayer.id) continue;
        if (p.settlements.includes(intId) || p.cities.includes(intId)) opponentIds.add(p.id);
      }
    }
    const targets = [...opponentIds].filter(id => {
      const p = this.players.find(p => p.id === id);
      return Object.values(p.resources).some((v: any) => v > 0);
    });
    if (targets.length === 1) {
      // Only one target — steal automatically
      this.handleSteal(targets[0] as string);
      return true;
    } else if (targets.length > 1) {
      this.stealTargets = targets as string[];
      this.actionMode = 'steal';
    } else {
      this.stealTargets = [];
      this.actionMode = 'idle';
    }
    this._emit();
    return true;
  }

  handleSteal(targetId: string) {
    const target = this.players.find(p => p.id === targetId);
    const available = Object.keys(target.resources).filter(r => target.resources[r] > 0);
    if (available.length === 0) return;
    const stolen = available[Math.floor(Math.random() * available.length)];
    target.resources[stolen]--;
    this.currentPlayer.resources[stolen]++;
    this.stealTargets = [];
    this.actionMode = 'idle';
    this._emit();
  }

  rollDice() {
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const sum = d1 + d2;
    this.diceValues = [d1, d2];
    this.diceRolled = true;
    if (sum !== 7) {
      this.players = distributeResources(sum, this.hexes, this.graph, this.players, this.robberHex);
    } else {
      // Discard rule: players with 8+ cards must discard half (rounded down)
      for (const p of this.players) {
        const total = Object.values(p.resources).reduce((a, b) => (a as number) + (b as number), 0) as number;
        if (total >= 8) {
          let toDiscard = Math.floor(total / 2);
          // Discard randomly from available resources
          const keys = Object.keys(p.resources).filter(k => p.resources[k] > 0);
          while (toDiscard > 0 && keys.length > 0) {
            const idx = Math.floor(Math.random() * keys.length);
            const key = keys[idx];
            if (p.resources[key] > 0) {
              p.resources[key]--;
              toDiscard--;
            }
            if (p.resources[key] <= 0) keys.splice(idx, 1);
          }
        }
      }
      this.actionMode = 'robber';
    }
    this._emit();
  }

  endTurn() {
    // Cannot end turn while robber must be moved or steal must be resolved
    if (this.actionMode === 'robber' || this.actionMode === 'steal') return;
    this.actionMode = 'idle';
    this.setupConstraint = null;
    this.diceRolled = false;
    this.diceValues = null;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this._emit();
  }

  setActionMode(mode: string) {
    this.actionMode = this.actionMode === mode ? 'idle' : mode;
    this._emit();
  }

  reset() {
    this.hexes = this.mode === 'ranked' ? generateRandomBoard() : [...BEGINNER_BOARD];
    this.graph = buildBoardGraph(this.hexes);
    this.players = INITIAL_PLAYERS.map(p => ({ ...p, resources: { ...EMPTY_RESOURCES }, devCards: { ...EMPTY_DEV_CARDS }, settlements: [], cities: [], roads: [] }));
    this.devCardDeck = createDevCardDeck();
    this.currentPlayerIndex = 0;
    this.phase = 'setup1';
    this.actionMode = 'settlement';
    this.longestRoadHolder = null;
    this.setupConstraint = null;
    this.diceRolled = false;
    this.diceValues = null;
    this.stealTargets = [];
    this.winner = null;
    const desert = this.hexes.find((h: any) => h.type === 'desert');
    this.robberHex = desert ? `${desert.q},${desert.r}` : '0,0';
    this._emit();
  }
}
