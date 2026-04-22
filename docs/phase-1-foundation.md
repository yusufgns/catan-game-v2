# Phase 1: Foundation — Tamamlandı

## Özet
Monorepo yapısı kuruldu, shared game logic paketi oluşturuldu, backend scaffold hazırlandı.

## Yapılanlar

### Monorepo Setup
- [x] Root `package.json` + `pnpm-workspace.yaml` (pnpm workspaces)
- [x] pnpm global kurulum
- [x] Root `.gitignore` (node_modules, .DS_Store, .env, build artifacts)
- [x] Kullanılmayan dizinler silindi: `web-v2/`, `frontend/`, `game/`, `Elemental-Serenity/`
- [x] `web/package-lock.json` silindi (artık root pnpm-lock.yaml)

### `@catan/core` Package (`packages/catan-core/`)
Shared pure TypeScript game logic — DOM/Node bağımlılığı yok, Cloudflare Workers'ta çalışır.

| Dosya | İçerik |
|-------|--------|
| `src/types.ts` | GameState, Player, Resources, BoardGraph, PublicGameState, PublicPlayer |
| `src/hexGrid.ts` | hexToPixel, BEGINNER_BOARD, HARBORS, TERRAIN_RESOURCE, generateRandomBoard |
| `src/boardGraph.ts` | buildBoardGraph — intersection/edge graph oluşturma |
| `src/gameRules.ts` | canPlaceSettlement/City/Road, computeLongestRoad, distributeResources |
| `src/harborUtils.ts` | harborIntersectionIds, playerTradeRates |
| `src/devCards.ts` | createDevCardDeck (25 kart, Fisher-Yates shuffle) |
| `src/costs.ts` | ROAD/SETTLEMENT/CITY/DEV_CARD_COST, canAfford, deductCost |
| `src/victory.ts` | calculateVP, checkWinner |
| `src/protocol.ts` | ClientMessage, ServerMessage, LobbyMessage discriminated unions |
| `src/index.ts` | Barrel export |

### Backend Scaffold (`backend/`)

| Dosya | İçerik |
|-------|--------|
| `wrangler.toml` | Cloudflare Workers config + GameRoom/LobbyRoom DO bindings |
| `src/index.ts` | Hono app — CORS, health endpoint, WS upgrade routes |
| `src/env.ts` | Env type (DO bindings, secrets, vars) |
| `src/db/schema.ts` | Drizzle schema: users, sessions, magic_link_tokens, oauth_accounts, lobbies, games, game_actions, user_stats |
| `src/db/client.ts` | Neon serverless client factory |
| `src/durable-objects/GameRoom.ts` | WebSocket hub skeleton |
| `src/durable-objects/LobbyRoom.ts` | Lobby coordination skeleton |
| `src/routes/health.ts` | GET /health endpoint |
| `drizzle.config.ts` | Drizzle Kit config → Neon |

## Repo Yapısı (Phase 1 Sonrası)
```
catan-v2/
├── .gitignore
├── package.json              ← pnpm workspace root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── docs/
├── packages/
│   └── catan-core/           ← @catan/core (shared game logic)
├── backend/                  ← Cloudflare Workers + DO
│   ├── src/
│   │   ├── db/
│   │   ├── durable-objects/
│   │   └── routes/
│   └── wrangler.toml
└── web/                      ← Next.js frontend (mevcut)
```
