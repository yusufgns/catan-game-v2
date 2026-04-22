"use client";

import { create } from 'zustand';
import type { LobbyPlayer } from '@catan/core';

interface LobbyStore {
  lobbyId: string | null;
  code: string | null;
  players: LobbyPlayer[];
  hostId: string | null;
  settings: Record<string, unknown>;
  gameStarting: string | null;
  lobbyClosed: boolean;
  closedReason: string | null;

  setLobby: (lobbyId: string, code: string) => void;
  handleServerMessage: (msg: any) => void;
  reset: () => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  lobbyId: null,
  code: null,
  players: [],
  hostId: null,
  settings: {},
  gameStarting: null,
  lobbyClosed: false,
  closedReason: null,

  setLobby: (lobbyId, code) => set({ lobbyId, code }),

  handleServerMessage: (msg: any) => {
    switch (msg.type) {
      case 'LOBBY_STATE':
        set(s => ({
          players: msg.players,
          hostId: msg.hostId,
          settings: msg.settings,
          code: msg.code || s.code,
        }));
        break;
      case 'PLAYER_JOINED':
        set(s => ({ players: [...s.players, msg.player] }));
        break;
      case 'PLAYER_LEFT':
        set(s => ({ players: s.players.filter(p => p.id !== msg.playerId) }));
        break;
      case 'PLAYER_READY':
        set(s => ({
          players: s.players.map(p =>
            p.id === msg.playerId ? { ...p, ready: msg.ready } : p
          ),
        }));
        break;
      case 'GAME_STARTING':
        set({ gameStarting: msg.gameId });
        break;
      case 'LOBBY_CLOSED':
        set({ lobbyClosed: true, closedReason: msg.reason });
        break;
      case 'HOST_CHANGED':
        set({ hostId: msg.newHostId });
        break;
    }
  },

  reset: () => set({
    lobbyId: null, code: null, players: [], hostId: null,
    settings: {}, gameStarting: null, lobbyClosed: false, closedReason: null,
  }),
}));
