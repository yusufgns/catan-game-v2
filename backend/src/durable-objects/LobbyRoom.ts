import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env';
import { nanoid } from 'nanoid';
import { createDb } from '../db/client';
import { games, gamePlayers, lobbies } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { LobbyServerMessage } from '@catan/core';

const PLAYER_COLORS = ['#d97706', '#2563eb', '#16a34a', '#dc2626'];
const LOBBY_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min idle → auto-close
const DISCONNECT_GRACE_MS = 60 * 1000; // 60s grace before removing disconnected player

interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  isHost: boolean;
}

export class LobbyRoom extends DurableObject<Env> {
  private connections = new Map<string, WebSocket>(); // connId → ws
  private playerConnections = new Map<string, Set<string>>(); // playerId → Set<connId>
  private playerTabIds = new Map<string, string>(); // playerId → tabId
  private players = new Map<string, LobbyPlayer>();
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private lobbyId: string | null = null;
  private lobbyCode: string | null = null;
  private mode = 'classic';
  private settings: Record<string, unknown> = {};
  private closed = false;

  async fetch(request: Request): Promise<Response> {
    if (this.closed) {
      return new Response(JSON.stringify({ type: 'ERROR', code: 'LOBBY_CLOSED', message: 'Lobby has been closed' }), { status: 410 });
    }

    const url = new URL(request.url);

    if (url.searchParams.has('lobbyId')) this.lobbyId = url.searchParams.get('lobbyId');
    if (url.searchParams.has('mode')) this.mode = url.searchParams.get('mode') || 'classic';
    if (url.searchParams.has('code')) this.lobbyCode = url.searchParams.get('code');

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response(JSON.stringify({
        players: [...this.players.values()],
        lobbyId: this.lobbyId,
        code: this.lobbyCode,
        closed: this.closed,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const playerId = url.searchParams.get('playerId') ?? 'unknown';
    const playerName = url.searchParams.get('playerName') ?? 'Player';
    const tabId = url.searchParams.get('tabId') ?? '';
    const connId = `${playerId}_${Date.now()}`; // unique per connection

    // Close previous connections for this player
    if (this.playerConnections.has(playerId)) {
      const existingTabId = this.playerTabIds.get(playerId);
      const isSameTab = tabId && existingTabId && tabId === existingTabId;

      for (const oldConnId of this.playerConnections.get(playerId)!) {
        const oldWs = this.connections.get(oldConnId);
        if (oldWs) {
          if (isSameTab) {
            // Same tab reconnecting — silently replace
            try { oldWs.close(1000, 'Reconnected'); } catch {}
          } else {
            // Different tab — notify old tab
            try {
              oldWs.send(JSON.stringify({ type: 'SESSION_REPLACED' }));
              oldWs.close(4001, 'Session replaced by new tab');
            } catch {}
          }
        }
        this.connections.delete(oldConnId);
      }
      this.playerConnections.get(playerId)!.clear();
    }
    this.playerTabIds.set(playerId, tabId);

    this.ctx.acceptWebSocket(server, [connId]);
    this.connections.set(connId, server);
    if (!this.playerConnections.has(playerId)) this.playerConnections.set(playerId, new Set());
    this.playerConnections.get(playerId)!.add(connId);

    // Cancel disconnect timer if player is reconnecting
    if (this.disconnectTimers.has(playerId)) {
      clearTimeout(this.disconnectTimers.get(playerId)!);
      this.disconnectTimers.delete(playerId);
      this.broadcast({ type: 'PLAYER_RECONNECTED', playerId } as any);
    }

    // Add player if not already present
    if (!this.players.has(playerId)) {
      const isHost = this.players.size === 0;
      const usedColors = new Set([...this.players.values()].map(p => p.color));
      const color = PLAYER_COLORS.find(c => !usedColors.has(c)) || PLAYER_COLORS[0];
      this.players.set(playerId, { id: playerId, name: playerName, color, ready: false, isHost });
    }

    // Reset idle timer — lobby is active
    this.resetIdleTimer();

    this.broadcastLobbyState();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;

    this.resetIdleTimer();

    let msg: any;
    try { msg = JSON.parse(data); } catch {
      ws.send(JSON.stringify({ type: 'ERROR', code: 'PARSE_ERROR', message: 'Invalid JSON' }));
      return;
    }

    switch (msg.type) {
      case 'READY': {
        const player = this.players.get(playerId);
        if (player) {
          player.ready = !!msg.ready;
          this.broadcastLobbyState();
        }
        break;
      }

      case 'CHANGE_COLOR': {
        const player = this.players.get(playerId);
        if (!player || !msg.color) break;
        const usedColors = new Set(
          [...this.players.values()].filter(p => p.id !== playerId).map(p => p.color)
        );
        if (!usedColors.has(msg.color)) {
          player.color = msg.color;
          this.broadcastLobbyState();
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', code: 'COLOR_TAKEN', message: 'Color already taken' }));
        }
        break;
      }

      case 'CHAT': {
        if (msg.message && typeof msg.message === 'string') {
          this.broadcast({ type: 'CHAT', playerId, message: msg.message.slice(0, 200) });
        }
        break;
      }

      case 'LEAVE': {
        this.removePlayer(playerId, true);
        break;
      }

      case 'ADD_BOT': {
        const player = this.players.get(playerId);
        if (!player?.isHost) {
          ws.send(JSON.stringify({ type: 'ERROR', code: 'NOT_HOST', message: 'Only host can add bots' }));
          break;
        }
        if (this.players.size >= 6) {
          ws.send(JSON.stringify({ type: 'ERROR', code: 'LOBBY_FULL', message: 'Lobby is full' }));
          break;
        }
        const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const usedColors = new Set([...this.players.values()].map(p => p.color));
        const botColors = ['#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#F97316'];
        const botColor = botColors.find(c => !usedColors.has(c)) || '#6B7280';
        this.players.set(botId, {
          id: botId,
          name: msg.name || 'Bot',
          color: botColor,
          ready: true,
          isHost: false,
        });
        this.broadcastLobbyState();
        break;
      }

      case 'REMOVE_BOT': {
        const player = this.players.get(playerId);
        if (!player?.isHost) {
          ws.send(JSON.stringify({ type: 'ERROR', code: 'NOT_HOST', message: 'Only host can remove bots' }));
          break;
        }
        const botToRemove = msg.botId;
        if (botToRemove && typeof botToRemove === 'string' && botToRemove.startsWith('bot_') && this.players.has(botToRemove)) {
          this.players.delete(botToRemove);
          this.broadcastLobbyState();
        }
        break;
      }

      case 'UPDATE_SETTINGS': {
        const player = this.players.get(playerId);
        if (!player?.isHost) {
          ws.send(JSON.stringify({ type: 'ERROR', code: 'NOT_HOST', message: 'Only host can change settings' }));
          break;
        }
        if (msg.settings && typeof msg.settings === 'object') {
          this.settings = { ...this.settings, ...msg.settings };
          this.broadcastLobbyState();
        }
        break;
      }

      case 'START_GAME': {
        const player = this.players.get(playerId);
        if (!player?.isHost) {
          ws.send(JSON.stringify({ type: 'ERROR', code: 'NOT_HOST', message: 'Only host can start' }));
          break;
        }
        if (this.players.size < 1) {
          ws.send(JSON.stringify({ type: 'ERROR', code: 'NOT_ENOUGH', message: 'Need at least 1 player' }));
          break;
        }
        await this.startGame();
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'ERROR', code: 'UNKNOWN', message: `Unknown message type: ${msg.type}` }));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const connId = this.getConnId(ws);
    const playerId = this.getPlayerId(ws);
    if (!connId || !playerId) return;

    // Remove this specific connection
    this.connections.delete(connId);
    this.playerConnections.get(playerId)?.delete(connId);

    // Check if player still has other tabs open
    const remaining = this.playerConnections.get(playerId);
    if (remaining && remaining.size > 0) return; // still connected via another tab

    // All tabs closed — start grace period
    this.playerConnections.delete(playerId);
    this.disconnectTimers.set(playerId, setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      this.removePlayer(playerId, false);
    }, DISCONNECT_GRACE_MS));

    this.broadcast({ type: 'PLAYER_DISCONNECTED', playerId } as any);
  }

  async alarm(): Promise<void> {
    // No real players → close lobby (bots alone don't keep it alive)
    if (this.realPlayerCount === 0) {
      await this.closeLobby(this.connections.size === 0 ? 'all_disconnected' : 'no_real_players');
      return;
    }

    // All real players disconnected (no active connections from real players)
    const realPlayerIds = [...this.players.values()].filter(p => !p.id.startsWith('bot_')).map(p => p.id);
    const anyRealConnected = realPlayerIds.some(pid => {
      const conns = this.playerConnections.get(pid);
      return conns && conns.size > 0;
    });
    if (!anyRealConnected) {
      await this.closeLobby('all_disconnected');
      return;
    }

    // Still active — schedule next idle check
    this.resetIdleTimer();
  }

  // ── Player removal ────────────────────────────────────────────────────────

  private removePlayer(playerId: string, intentional: boolean) {
    const leaving = this.players.get(playerId);
    if (!leaving) return;

    this.players.delete(playerId);

    // Close all WebSocket connections for this player
    const connIds = this.playerConnections.get(playerId);
    if (connIds) {
      for (const connId of connIds) {
        const ws = this.connections.get(connId);
        if (ws) {
          try { ws.close(1000, intentional ? 'Player left' : 'Disconnected'); } catch {}
          this.connections.delete(connId);
        }
      }
      this.playerConnections.delete(playerId);
    }

    // Clear any pending disconnect timer
    if (this.disconnectTimers.has(playerId)) {
      clearTimeout(this.disconnectTimers.get(playerId)!);
      this.disconnectTimers.delete(playerId);
    }

    // If no real players left, remove all bots and close lobby
    if (this.realPlayerCount === 0) {
      // Remove all bots
      const botIds = [...this.players.keys()].filter(id => id.startsWith('bot_'));
      for (const botId of botIds) this.players.delete(botId);

      this.broadcast({ type: 'PLAYER_LEFT', playerId });
      this.ctx.storage.setAlarm(Date.now() + 3000); // close lobby shortly
      return;
    }

    // Transfer host — only to real players, never to bots
    if (leaving.isHost) {
      const newHost = this.getFirstRealPlayer();
      if (newHost) {
        newHost.isHost = true;
        this.broadcast({ type: 'HOST_CHANGED', newHostId: newHost.id } as any);
      }
    }

    this.broadcast({ type: 'PLAYER_LEFT', playerId });
    this.broadcastLobbyState();
  }

  // ── Lobby lifecycle ───────────────────────────────────────────────────────

  private resetIdleTimer() {
    this.ctx.storage.setAlarm(Date.now() + LOBBY_IDLE_TIMEOUT_MS);
  }

  private async closeLobby(reason: string) {
    this.closed = true;

    // Notify any remaining connections
    this.broadcast({ type: 'LOBBY_CLOSED', reason } as any);

    // Close all WebSockets
    for (const ws of this.connections.values()) {
      try { ws.close(1000, `Lobby closed: ${reason}`); } catch {}
    }
    this.connections.clear();
    this.players.clear();

    // Clear all disconnect timers
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();

    // Update DB
    try {
      if (this.lobbyId) {
        const db = createDb(this.env.NEON_DATABASE_URL);
        await db.update(lobbies).set({ status: 'closed' }).where(eq(lobbies.id, this.lobbyId));
      }
    } catch (e) { console.error(JSON.stringify({ event: 'lobby_close_db_failed', lobbyId: this.lobbyId, error: String(e) })); }
  }

  // ── Start game ────────────────────────────────────────────────────────────

  private async startGame() {
    const gameId = nanoid(12);
    const playerList = [...this.players.values()];

    const initialState = {
      id: gameId,
      mode: this.mode,
      phase: 'setup1',
      players: playerList.map((p, i) => ({
        id: p.id, name: p.name, color: p.color, playerIndex: i,
      })),
    };

    try {
      const db = createDb(this.env.NEON_DATABASE_URL);
      await db.insert(games).values({
        id: gameId, lobbyId: this.lobbyId, mode: this.mode,
        phase: 'setup', state: initialState, board: {},
      });
      // Skip bots — gamePlayers.userId is a FK to users.id and bots have
      // synthetic bot_* ids that aren't in the users table. They're still
      // tracked in-memory by the GameRoom DO and in games.state.
      for (let i = 0; i < playerList.length; i++) {
        const p = playerList[i];
        if (p.id.startsWith('bot_')) continue;
        await db.insert(gamePlayers).values({
          gameId, userId: p.id, playerIndex: i, color: p.color,
        });
      }
      if (this.lobbyId) {
        await db.update(lobbies).set({ status: 'in_progress' }).where(eq(lobbies.id, this.lobbyId));
      }
    } catch (e) {
      console.error('Failed to persist game start:', e);
    }

    // Initialize the GameRoom DO
    try {
      const gameRoomId = this.env.GAME_ROOM.idFromName(gameId);
      const gameRoomStub = this.env.GAME_ROOM.get(gameRoomId);
      await gameRoomStub.fetch(new Request('https://internal/init?init=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, players: playerList, mode: this.mode, settings: { turnTimerMs: this.parseTurnTimer() } }),
      }));
    } catch (e) {
      console.error('Failed to init GameRoom DO:', e);
    }

    this.broadcast({ type: 'GAME_STARTING', gameId });

    // Close lobby after game starts
    setTimeout(() => this.closeLobby('game_started'), 5000);
  }

  private parseTurnTimer(): number {
    const raw = this.settings.turnTimer as string | undefined;
    if (!raw || raw === 'Off') return 0;
    const seconds = parseInt(raw);
    return isNaN(seconds) ? 60_000 : seconds * 1000;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getPlayerId(ws: WebSocket): string | null {
    for (const [connId, conn] of this.connections) {
      if (conn === ws) {
        // connId format: "playerId_timestamp" → extract playerId
        const playerId = connId.split('_').slice(0, -1).join('_');
        // But playerId itself might contain underscore, so find in playerConnections
        for (const [pid, connIds] of this.playerConnections) {
          if (connIds.has(connId)) return pid;
        }
        return connId.split('_')[0]; // fallback
      }
    }
    return null;
  }

  private getConnId(ws: WebSocket): string | null {
    for (const [connId, conn] of this.connections) {
      if (conn === ws) return connId;
    }
    return null;
  }

  /** Count real (non-bot) players */
  private get realPlayerCount(): number {
    return [...this.players.values()].filter(p => !p.id.startsWith('bot_')).length;
  }

  /** Get first real (non-bot) player */
  private getFirstRealPlayer(): LobbyPlayer | undefined {
    return [...this.players.values()].find(p => !p.id.startsWith('bot_'));
  }

  private broadcastLobbyState() {
    const hostPlayer = [...this.players.values()].find(p => p.isHost);
    this.broadcast({
      type: 'LOBBY_STATE',
      players: [...this.players.values()],
      hostId: hostPlayer?.id ?? '',
      settings: this.settings,
      code: this.lobbyCode,
    });
  }

  private broadcast(message: LobbyServerMessage | { type: string; [key: string]: unknown }) {
    const data = JSON.stringify(message);
    for (const ws of this.connections.values()) {
      try { ws.send(data); } catch {}
    }
  }
}
