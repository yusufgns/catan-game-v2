/**
 * Multiplayer adapter — bridges local CatanGameState with backend GameRoom DO via WebSocket.
 */

import { getTabId } from '../lib/tabId';

const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787')
  : '';
const WS_URL = API_URL.replace(/^http/, 'ws');

export interface MultiplayerAdapter {
  isOnline: boolean;
  ws: WebSocket | null;
  gameId: string | null;
  playerId: string | null;
  connect(gameId: string, playerId: string): void;
  disconnect(): void;
  sendAction(action: any): void;
  /** Force a fresh WS if the current one is dead. Idempotent. */
  ensureConnected(): void;
  onStateUpdate: ((state: any) => void) | null;
  onPrivateState: ((resources: any, devCards: any) => void) | null;
  onError: ((error: string) => void) | null;
  onConnected: (() => void) | null;
  onDisconnected: (() => void) | null;
  onGameLog: ((message: string) => void) | null;
  onGameLogHistory: ((logs: string[]) => void) | null;
  onSessionReplaced: (() => void) | null;
  onReplacedByBot: ((reason: string) => void) | null;
  onGameResults: ((payload: any) => void) | null;
}

/**
 * Heartbeat threshold — if we haven't received any server message for this long
 * the socket is considered stale (browser likely suspended it while in another
 * tab). On the next visibility / send attempt we tear it down and reconnect.
 */
const STALE_MS = 20_000;

export function createMultiplayerAdapter(): MultiplayerAdapter {
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingActions: any[] = [];
  let lastMessageAt = 0;
  let visibilityHandler: (() => void) | null = null;

  const adapter: MultiplayerAdapter = {
    isOnline: false,
    ws: null,
    gameId: null,
    playerId: null,
    onStateUpdate: null,
    onPrivateState: null,
    onError: null,
    onConnected: null,
    onDisconnected: null,
    onGameLog: null,
    onGameLogHistory: null,
    onSessionReplaced: null,
    onReplacedByBot: null,
    onGameResults: null,

    connect(gameId: string, playerId: string) {
      adapter.gameId = gameId;
      adapter.playerId = playerId;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

      // Tear down any pre-existing socket cleanly so we don't leak handlers.
      if (adapter.ws) {
        try { adapter.ws.onclose = null; adapter.ws.close(); } catch {}
        adapter.ws = null;
        adapter.isOnline = false;
      }

      const url = `${WS_URL}/ws/game/${gameId}?playerId=${playerId}&tabId=${getTabId()}`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        adapter.isOnline = true;
        adapter.ws = ws;
        lastMessageAt = Date.now();
        adapter.onConnected?.();
        // Flush any queued actions buffered while disconnected.
        if (pendingActions.length > 0) {
          const queue = pendingActions;
          pendingActions = [];
          for (const action of queue) {
            try { ws.send(JSON.stringify(action)); } catch { pendingActions.push(action); }
          }
        }
      };

      ws.onmessage = (event) => {
        lastMessageAt = Date.now();
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'GAME_STATE':
              adapter.onStateUpdate?.(msg.state);
              break;
            case 'PRIVATE_STATE':
              adapter.onPrivateState?.(msg.resources, msg.devCards);
              break;
            case 'GAME_LOG':
              adapter.onGameLog?.(msg.message);
              break;
            case 'GAME_LOG_HISTORY':
              adapter.onGameLogHistory?.(msg.logs);
              break;
            case 'SESSION_REPLACED':
              // Another tab opened — stop reconnecting and notify UI
              adapter.gameId = null;
              adapter.playerId = null;
              adapter.onSessionReplaced?.();
              break;
            case 'REPLACED_BY_BOT':
              adapter.onReplacedByBot?.(msg.reason || 'afk');
              break;
            case 'ERROR':
              adapter.onError?.(msg.message);
              break;
            case 'GAME_OVER':
            case 'GAME_RESULTS':
              adapter.onGameResults?.(msg);
              break;
            default:
              // DICE_ROLLED, BUILDING_PLACED, TURN_ENDED etc.
              // Server sends GAME_STATE after each, so we just wait for that
              break;
          }
        } catch {}
      };

      ws.onclose = (event) => {
        adapter.isOnline = false;
        adapter.ws = null;
        adapter.onDisconnected?.();
        // Don't reconnect if session was replaced (4001) or replaced by bot (4002)
        if (event.code === 4001 || event.code === 4002) return;
        // Auto reconnect after 2s
        if (adapter.gameId && adapter.playerId) {
          reconnectTimer = setTimeout(() => {
            if (adapter.gameId && adapter.playerId) adapter.connect(adapter.gameId, adapter.playerId);
          }, 2000);
        }
      };

      ws.onerror = () => ws.close();

      // Wire visibility handler once. When the tab returns to focus we
      // immediately verify the socket and force a reconnect if it's stale.
      if (typeof document !== 'undefined' && !visibilityHandler) {
        visibilityHandler = () => {
          if (document.visibilityState === 'visible') adapter.ensureConnected();
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        window.addEventListener('focus', visibilityHandler);
        window.addEventListener('online', visibilityHandler);
      }
    },

    disconnect() {
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      adapter.gameId = null;
      adapter.playerId = null;
      pendingActions = [];
      if (adapter.ws) {
        try { adapter.ws.onclose = null; adapter.ws.close(); } catch {}
        adapter.ws = null;
      }
      if (visibilityHandler && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibilityHandler);
        window.removeEventListener('focus', visibilityHandler);
        window.removeEventListener('online', visibilityHandler);
        visibilityHandler = null;
      }
    },

    sendAction(action: any) {
      const ws = adapter.ws;
      const stale = lastMessageAt > 0 && Date.now() - lastMessageAt > STALE_MS;
      if (ws?.readyState === WebSocket.OPEN && !stale) {
        try { ws.send(JSON.stringify(action)); return; }
        catch { /* fall through to queue + reconnect */ }
      }
      // Queue and force a reconnect — server will replay full state on connect
      // so the action lands against fresh truth.
      pendingActions.push(action);
      adapter.ensureConnected();
    },

    ensureConnected() {
      if (!adapter.gameId || !adapter.playerId) return;
      const ws = adapter.ws;
      const stale = lastMessageAt > 0 && Date.now() - lastMessageAt > STALE_MS;
      const dead = !ws || ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED;
      if (dead || stale) {
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        adapter.connect(adapter.gameId, adapter.playerId);
      }
    },
  };

  return adapter;
}

/**
 * Sync server state into local CatanGameState (for Three.js rendering).
 * This is the ONLY way game state changes in multiplayer mode.
 */
export function syncServerStateToLocal(gameState: any, serverState: any) {
  if (!serverState || !gameState) return;

  // Sync players — rebuild full player objects
  if (serverState.players && serverState.players.length > 0) {
    gameState.players = serverState.players.map((sp: any) => ({
      id: sp.id,
      name: sp.name,
      color: sp.color,
      settlements: [...(sp.settlements || [])],
      cities: [...(sp.cities || [])],
      roads: [...(sp.roads || [])],
      // Private data comes separately via PRIVATE_STATE — keep existing if not in public state
      resources: sp.resources || { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 },
      devCards: sp.devCards || { knight: 0, victoryPoint: 0, roadBuilding: 0, yearOfPlenty: 0, monopoly: 0 },
      tradeRates: sp.tradeRates || { lumber: 4, brick: 4, wool: 4, grain: 4, ore: 4 },
    }));
  }

  // Trades — normalize array shape and tolerate older single-trade payloads
  const incoming = Array.isArray(serverState.activeTrades)
    ? serverState.activeTrades
    : (serverState.activeTrade ? [serverState.activeTrade] : []);
  gameState.activeTrades = incoming.map((t: any) => ({
    ...t,
    acceptedBy: t.acceptedBy ?? [],
    createdAt: t.createdAt ?? Date.now(),
    expiresAt: t.expiresAt ?? Date.now() + 30_000,
  }));

  // Forced discard state from 7-roll
  gameState.discardRequired = serverState.discardRequired ?? {};
  gameState.discardDeadline = serverState.discardDeadline ?? null;

  // Sync game phase — map server phase to local phase
  const phase = serverState.phase;
  if (phase === 'setup1' || phase === 'setup2') {
    gameState.phase = phase;
  } else if (phase === 'main') {
    gameState.phase = 'main';
  } else if (phase === 'ended') {
    gameState.phase = 'main'; // local engine uses 'main' even for ended
    gameState.winner = serverState.winner;
  }

  // Current player
  if (serverState.currentPlayerIndex !== undefined) {
    gameState.currentPlayerIndex = serverState.currentPlayerIndex;
  }

  // Dice
  gameState.diceRolled = !!serverState.diceRolled;
  gameState.diceValues = serverState.diceValues || null;

  // Robber
  if (serverState.robberHex) gameState.robberHex = serverState.robberHex;

  // Setup constraint
  gameState.setupConstraint = serverState.setupConstraint || null;

  // Special holders
  gameState.longestRoadHolder = serverState.longestRoadHolder || null;
  gameState.largestArmyHolder = serverState.largestArmyHolder || null;
  gameState.winner = serverState.winner || null;
  gameState.stealTargets = serverState.stealTargets || [];

  // Action mode — derive from server state
  if (phase === 'setup1' || phase === 'setup2') {
    gameState.actionMode = serverState.setupConstraint ? 'road' : 'settlement';
  } else if (serverState.needsRobber) {
    gameState.actionMode = 'robber';
  } else if (serverState.needsSteal && serverState.stealTargets?.length > 0) {
    gameState.actionMode = 'steal';
  } else if (phase === 'main' || phase === 'ended') {
    gameState.actionMode = 'idle';
  }

  // Turn timer
  gameState.turnDeadline = serverState.turnDeadline || null;
  gameState.turnTimerMs = serverState.turnTimerMs || 0;
  gameState.serverTime = serverState.serverTime || Date.now();
  gameState.botReplacedPlayers = serverState.botReplacedPlayers || {};

  // Trigger Three.js re-render
  gameState._emit();
}
