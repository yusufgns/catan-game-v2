export interface Env {
  // Durable Objects
  GAME_ROOM: DurableObjectNamespace;
  LOBBY_ROOM: DurableObjectNamespace;

  // Secrets (set via wrangler secret put)
  NEON_DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  RESEND_API_KEY: string;

  // Vars
  FRONTEND_URL: string;
}
