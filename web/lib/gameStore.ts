"use client";

import { create } from 'zustand';
import type { PublicGameState, PublicPlayer, Resources, DevCards, ResourceType } from '@catan/core';

interface GameStore {
  // Public state (from server)
  gameState: PublicGameState | null;

  // Private state (own resources + dev cards, from PRIVATE_STATE message)
  myResources: Resources | null;
  myDevCards: DevCards | null;

  // Connection
  gameId: string | null;
  myPlayerId: string | null;
  connected: boolean;

  // Actions
  setGameState: (state: PublicGameState) => void;
  setPrivateState: (resources: Resources, devCards: DevCards) => void;
  setConnection: (gameId: string, playerId: string) => void;
  setConnected: (connected: boolean) => void;
  handleServerMessage: (msg: any) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  myResources: null,
  myDevCards: null,
  gameId: null,
  myPlayerId: null,
  connected: false,

  setGameState: (state) => set({ gameState: state }),
  setPrivateState: (resources, devCards) => set({ myResources: resources, myDevCards: devCards }),
  setConnection: (gameId, playerId) => set({ gameId, myPlayerId: playerId }),
  setConnected: (connected) => set({ connected }),

  handleServerMessage: (msg: any) => {
    switch (msg.type) {
      case 'GAME_STATE':
        set({ gameState: msg.state });
        break;
      case 'PRIVATE_STATE':
        set({ myResources: msg.resources, myDevCards: msg.devCards });
        break;
      case 'DICE_ROLLED':
        // Update dice in game state
        set(s => {
          if (!s.gameState) return s;
          return {
            gameState: {
              ...s.gameState,
              diceRolled: true,
              diceValues: msg.values,
            },
          };
        });
        break;
      case 'TURN_ENDED':
        set(s => {
          if (!s.gameState) return s;
          return {
            gameState: {
              ...s.gameState,
              currentPlayerIndex: msg.nextPlayerIndex,
              turnNumber: msg.turnNumber,
              diceRolled: false,
              diceValues: null,
            },
          };
        });
        break;
      case 'GAME_OVER':
        set(s => {
          if (!s.gameState) return s;
          return {
            gameState: { ...s.gameState, winner: msg.winnerId, phase: 'ended' },
          };
        });
        break;
      case 'PLAYER_CONNECTED':
      case 'PLAYER_DISCONNECTED':
        // Could update a "connected players" list
        break;
    }
  },

  reset: () => set({
    gameState: null, myResources: null, myDevCards: null,
    gameId: null, myPlayerId: null, connected: false,
  }),
}));
