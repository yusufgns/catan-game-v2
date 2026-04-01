import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env';

/**
 * GameRoom Durable Object — one per active game.
 * Manages WebSocket connections, in-memory game state,
 * and persists to Neon DB.
 */
export class GameRoom extends DurableObject<Env> {
  private connections = new Map<string, WebSocket>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const playerId = url.searchParams.get('playerId') ?? 'unknown';
      this.ctx.acceptWebSocket(server);
      this.connections.set(playerId, server);

      // Send current state to newly connected player
      server.send(JSON.stringify({ type: 'PLAYER_CONNECTED', playerId }));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('GameRoom active', { status: 200 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // TODO: Parse ClientMessage, validate, mutate state, broadcast
    const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
    try {
      const msg = JSON.parse(data);
      // Placeholder: echo back
      ws.send(JSON.stringify({ type: 'ERROR', code: 'NOT_IMPLEMENTED', message: `Action ${msg.type} not yet implemented` }));
    } catch {
      ws.send(JSON.stringify({ type: 'ERROR', code: 'PARSE_ERROR', message: 'Invalid JSON' }));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    for (const [playerId, conn] of this.connections) {
      if (conn === ws) {
        this.connections.delete(playerId);
        this.broadcast({ type: 'PLAYER_DISCONNECTED', playerId });
        break;
      }
    }
  }

  private broadcast(message: unknown) {
    const data = JSON.stringify(message);
    for (const ws of this.connections.values()) {
      try { ws.send(data); } catch { /* connection closed */ }
    }
  }
}
