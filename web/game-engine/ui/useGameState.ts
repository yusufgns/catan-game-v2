import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import type CatanGameState from '../Game/World/Components/CatanBoard/CatanGameState';

/** Snapshot of CatanGameState that React can track */
export interface GameSnapshot {
  phase: string;
  isSetup: boolean;
  currentPlayerIndex: number;
  currentPlayer: {
    id: string;
    name: string;
    color: string;
    settlements: string[];
    cities: string[];
    roads: string[];
    resources: Record<string, number>;
    devCards: Record<string, number>;
    tradeRates: Record<string, number>;
  };
  players: {
    id: string;
    name: string;
    color: string;
    settlements: string[];
    cities: string[];
    roads: string[];
    resources: Record<string, number>;
    devCards: Record<string, number>;
    tradeRates: Record<string, number>;
  }[];
  activeTrades: {
    id: string;
    fromPlayerId: string;
    toPlayerId?: string;
    offer: Record<string, number>;
    want: Record<string, number>;
    acceptedBy: string[];
    createdAt: number;
    expiresAt: number;
  }[];
  myPlayerId: string | null;
  discardRequired: Record<string, number>;
  discardDeadline: number | null;
  actionMode: string;
  diceRolled: boolean;
  diceValues: [number, number] | null;
  diceTotal: number | null;
  robberHex: string;
  stealTargets: string[];
  winner: any;
  longestRoadHolder: string | null;
  largestArmyHolder: string | null;
  canBuyDevCard: boolean;
  devCardDeckSize: number;
  canAffordRoad: boolean;
  canAffordSettlement: boolean;
  canAffordCity: boolean;
  turnDeadline: number | null;
  turnTimerMs: number;
  serverTime: number;
  botReplacedPlayers: Record<string, string>;
  gameResults: {
    winnerId?: string;
    results?: Array<{
      playerId: string;
      name: string;
      color: string;
      vp: number;
      position: number;
      isBot?: boolean;
      eloBefore?: number | null;
      eloAfter?: number | null;
      eloChange?: number;
      xpEarned?: number;
      levelBefore?: number | null;
      levelAfter?: number | null;
    }>;
  } | null;
}

const DEFAULT_RATES = { lumber: 4, brick: 4, wool: 4, grain: 4, ore: 4 };

function createSnapshot(gs: CatanGameState): GameSnapshot {
  const cp = gs.currentPlayer;
  return {
    phase: gs.phase,
    isSetup: gs.isSetup,
    currentPlayerIndex: gs.currentPlayerIndex,
    currentPlayer: {
      id: cp.id, name: cp.name, color: cp.color,
      settlements: [...cp.settlements],
      cities: [...cp.cities],
      roads: [...cp.roads],
      resources: { ...cp.resources },
      devCards: { ...(cp.devCards || {}) },
      tradeRates: { ...((cp as any).tradeRates || DEFAULT_RATES) },
    },
    players: gs.players.map((p: any) => ({
      id: p.id, name: p.name, color: p.color,
      settlements: [...p.settlements],
      cities: [...p.cities],
      roads: [...p.roads],
      resources: { ...p.resources },
      devCards: { ...(p.devCards || {}) },
      tradeRates: { ...(p.tradeRates || DEFAULT_RATES) },
    })),
    activeTrades: Array.isArray((gs as any).activeTrades) ? [...(gs as any).activeTrades] : [],
    myPlayerId: (gs as any).myPlayerId ?? null,
    discardRequired: { ...((gs as any).discardRequired ?? {}) },
    discardDeadline: (gs as any).discardDeadline ?? null,
    gameResults: (gs as any).gameResults ?? null,
    actionMode: gs.actionMode,
    diceRolled: gs.diceRolled,
    diceValues: gs.diceValues,
    diceTotal: gs.diceTotal,
    robberHex: gs.robberHex,
    stealTargets: [...gs.stealTargets],
    winner: gs.winner,
    longestRoadHolder: gs.longestRoadHolder,
    largestArmyHolder: (gs as any).largestArmyHolder ?? null,
    canBuyDevCard: gs.canBuyDevCard(),
    devCardDeckSize: gs.devCardDeck.length,
    canAffordRoad: gs.canAffordRoad(),
    canAffordSettlement: gs.canAffordSettlement(),
    canAffordCity: gs.canAffordCity(),
    turnDeadline: gs.turnDeadline ?? null,
    turnTimerMs: gs.turnTimerMs ?? 0,
    serverTime: gs.serverTime ?? Date.now(),
    botReplacedPlayers: gs.botReplacedPlayers ?? {},
  };
}

/**
 * React hook that subscribes to CatanGameState changes
 * using useSyncExternalStore for reliable synchronization.
 */
export function useGameState(gameState: CatanGameState | null) {
  // Mutable ref to latest snapshot — updated on every emit
  const [snapshotRef] = useState(() => ({ current: null as GameSnapshot | null }));

  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!gameState) return () => {};
    snapshotRef.current = createSnapshot(gameState);
    const handler = () => {
      snapshotRef.current = createSnapshot(gameState);
      onStoreChange();
    };
    gameState.onChange(handler);
    // Cleanup: remove this specific listener
    return () => {
      const idx = gameState._listeners.indexOf(handler);
      if (idx !== -1) gameState._listeners.splice(idx, 1);
    };
  }, [gameState, snapshotRef]);

  const getSnapshot = useCallback(() => {
    if (!gameState) return null;
    if (!snapshotRef.current) snapshotRef.current = createSnapshot(gameState);
    return snapshotRef.current;
  }, [gameState, snapshotRef]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Force re-sync when tab becomes visible (stale snapshot after background)
  useEffect(() => {
    if (!gameState) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        // Trigger _emit → onChange listeners fire → snapshot refreshes → React re-renders
        gameState._emit();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [gameState]);

  // Route actions through multiplayer adapter if available, otherwise local
  const dispatch = useCallback((action: any) => {
    const catanAction = (window as any).__catanAction;
    if (catanAction) {
      catanAction(action);
    }
  }, []);

  const actions = {
    rollDice: useCallback(() => dispatch({ type: 'ROLL_DICE' }), [dispatch]),
    endTurn: useCallback(() => dispatch({ type: 'END_TURN' }), [dispatch]),
    setActionMode: useCallback((mode: string) => gameState?.setActionMode(mode), [gameState]),
    handleSteal: useCallback((targetId: string) => dispatch({ type: 'CHOOSE_STEAL', targetId }), [dispatch]),
    buyDevCard: useCallback(() => dispatch({ type: 'BUY_DEV_CARD' }), [dispatch]),
    reset: useCallback(() => gameState?.reset(), [gameState]),
    maritimeTrade: useCallback(
      (give: { resource: string; amount: number }, want: string) =>
        dispatch({ type: 'MARITIME_TRADE', give, want }),
      [dispatch],
    ),
    offerTrade: useCallback(
      (offer: Record<string, number>, want: Record<string, number>, targetPlayer?: string) =>
        dispatch({ type: 'OFFER_TRADE', offer, want, targetPlayer }),
      [dispatch],
    ),
    acceptTrade: useCallback(
      (tradeId: string, withPlayer?: string) => dispatch({ type: 'ACCEPT_TRADE', tradeId, with: withPlayer }),
      [dispatch],
    ),
    rejectTrade: useCallback((tradeId: string) => dispatch({ type: 'REJECT_TRADE', tradeId }), [dispatch]),
    discardResources: useCallback(
      (resources: Record<string, number>) => dispatch({ type: 'DISCARD_RESOURCES', resources }),
      [dispatch],
    ),
  };

  return { state, actions };
}
