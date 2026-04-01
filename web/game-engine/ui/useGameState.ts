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
  }[];
  actionMode: string;
  diceRolled: boolean;
  diceValues: [number, number] | null;
  diceTotal: number | null;
  robberHex: string;
  stealTargets: string[];
  winner: any;
  longestRoadHolder: string | null;
  canBuyDevCard: boolean;
  devCardDeckSize: number;
  canAffordRoad: boolean;
  canAffordSettlement: boolean;
  canAffordCity: boolean;
}

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
    },
    players: gs.players.map((p: any) => ({
      id: p.id, name: p.name, color: p.color,
      settlements: [...p.settlements],
      cities: [...p.cities],
      roads: [...p.roads],
      resources: { ...p.resources },
      devCards: { ...(p.devCards || {}) },
    })),
    actionMode: gs.actionMode,
    diceRolled: gs.diceRolled,
    diceValues: gs.diceValues,
    diceTotal: gs.diceTotal,
    robberHex: gs.robberHex,
    stealTargets: [...gs.stealTargets],
    winner: gs.winner,
    longestRoadHolder: gs.longestRoadHolder,
    canBuyDevCard: gs.canBuyDevCard(),
    devCardDeckSize: gs.devCardDeck.length,
    canAffordRoad: gs.canAffordRoad(),
    canAffordSettlement: gs.canAffordSettlement(),
    canAffordCity: gs.canAffordCity(),
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

  const actions = {
    rollDice: useCallback(() => gameState?.rollDice(), [gameState]),
    endTurn: useCallback(() => gameState?.endTurn(), [gameState]),
    setActionMode: useCallback((mode: string) => gameState?.setActionMode(mode), [gameState]),
    handleSteal: useCallback((targetId: string) => gameState?.handleSteal(targetId), [gameState]),
    buyDevCard: useCallback(() => gameState?.buyDevCard(), [gameState]),
    reset: useCallback(() => gameState?.reset(), [gameState]),
  };

  return { state, actions };
}
