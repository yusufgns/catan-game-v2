import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env';

/**
 * LobbyRoom Durable Object — pre-game lobby coordination.
 * Manages player join/leave/ready state via WebSocket.
 */
export class LobbyRoom extends DurableObject<Env> {
  private connections = new Map<string, WebSocket>();
  private players = new Map<string, { id: string; name: string; color: string; ready: boolean; isHost: boolean }>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const playerId = url.searchParams.get('playerId') ?? 'unknown';
      const playerName = url.searchParams.get('playerName') ?? 'Player';
      this.ctx.acceptWebSocket(server);
      this.connections.set(playerId, server);

      const isHost = this.players.size === 0;
      this.players.set(playerId, {
        id: playerId, name: playerName,
        color: '', ready: false, isHost,
      });

      // Send lobby state to new player
      this.broadcastLobbyState();

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('LobbyRoom active', { status: 200 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
    try {
      const msg = JSON.parse(data);
      // TODO: handle READY, CHANGE_COLOR, START_GAME, CHAT
      ws.send(JSON.stringify({ type: 'ERROR', code: 'NOT_IMPLEMENTED', message: `${msg.type} not yet implemented` }));
    } catch {
      ws.send(JSON.stringify({ type: 'ERROR', code: 'PARSE_ERROR', message: 'Invalid JSON' }));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    for (const [playerId, conn] of this.connections) {
      if (conn === ws) {
        this.connections.delete(playerId);
        this.players.delete(playerId);
        this.broadcast({ type: 'PLAYER_LEFT', playerId });
        break;
      }
    }
  }

  private broadcastLobbyState() {
    const hostPlayer = [...this.players.values()].find(p => p.isHost);
    this.broadcast({
      type: 'LOBBY_STATE',
      players: [...this.players.values()],
      hostId: hostPlayer?.id ?? '',
      settings: {},
    });
  }

  private broadcast(message: unknown) {
    const data = JSON.stringify(message);
    for (const ws of this.connections.values()) {
      try { ws.send(data); } catch { /* closed */ }
    }
  }
}
