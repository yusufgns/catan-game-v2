# Catan v2 — Project Root

Bu repo, Catan board oyununun web tabanlı multiplayer implementasyonunu içerir (pnpm monorepo).

## Repo Yapısı

```
catan-v2/
├── CLAUDE.md               ← Bu dosya (root context)
├── .claude/
│   └── catan-rules.md      ← Catan kuralları & oyun mekaniği (tek kaynak)
├── packages/
│   └── catan-core/         ← @catan/core — paylaşılan saf oyun mantığı (TS, sıfır runtime dependency)
│       └── src/            ← gameRules, tradeRules, hexGrid, boardGraph, rank (ELO/XP),
│                             victory, devCards, costs, protocol (WS kontratı), bot/ (easy/medium/hard-MCTS)
├── backend/                ← Cloudflare Workers (Hono + Durable Objects + Neon Postgres)
│   ├── CLAUDE.md           ← Backend-specific context
│   ├── src/                ← index.ts (Worker entry), durable-objects/ (GameRoom, LobbyRoom),
│   │                         routes/, auth/, db/ (Drizzle schema), services/
│   └── migrations/         ← Drizzle SQL migration'ları
├── web/                    ← Next.js 16 (App Router) + React 19 + Three.js
│   ├── CLAUDE.md           ← Frontend-specific context
│   ├── app/                ← Route grupları: (lobby) → home/shop/leaderboard/profile...,
│   │                         (game) → /room, /play
│   ├── components/         ← React bileşenleri (board, board3d, ui)
│   ├── game-engine/        ← Vanilla Three.js oyun motoru + React HUD (game-engine/ui/)
│   └── lib/                ← gameStore/lobbyStore (Zustand), useWebSocket, auth
└── docs/                   ← Sistem tasarım dokümanları
```

## Genel Prensipler

- Catan oyun kuralları ve mekaniği için her zaman `.claude/catan-rules.md` dosyasını referans al
- **Saf oyun mantığı `@catan/core`'da yaşar** — kural/validasyon/ELO değişiklikleri önce orada yapılır; backend ve web bu paketi `workspace:*` olarak tüketir. `web/lib/` veya `game-engine/game-logic/` içine kural kopyalama
- Oyun state'i backend'de (GameRoom Durable Object) yaşar, frontend sadece görselleştirir; client tarafı validasyon yalnızca UX yardımıdır
- Real-time senkronizasyon WebSocket ile yapılır; mesaj kontratı `packages/catan-core/src/protocol.ts` (tek kaynak)

## Sistem Dokümanları (`docs/`)

- `docs/trade.md` — Trade sistemi (bank/maritime + domestic), harbor oranları, validasyon, protokol, UI flow
- `docs/ranked-system.md` — ELO/tier tasarımı, placement, XP/level
- `docs/payment-system.md` — Monetizasyon planı (Adapty + Stripe; henüz implemente edilmedi)
- `docs/phase-1-foundation.md` … `docs/phase-6-frontend-integration.md` — tamamlanmış build log'ları
- `docs/branding.md`, `docs/colonist-comparison.md`, `docs/frontend-analysis.md` — ürün/analiz notları

## Teknoloji Stack

- **Shared core**: `@catan/core` — saf TypeScript, ESM, source'tan tüketilir (build step yok), vitest konfigürlü
- **Backend**: Cloudflare Workers + Hono, Durable Objects (GameRoom/LobbyRoom), Neon Postgres + Drizzle ORM, arctic (Google OAuth) + oslo + Resend (magic link)
- **Frontend**: Next.js 16 App Router, React 19, vanilla Three.js motoru (r3f/drei kurulu ama motor el yazması), Zustand, Tailwind CSS v4 + SCSS, GSAP + Framer Motion
- **Real-time**: Native WebSocket (Worker → Durable Object; `ctx.acceptWebSocket`)

## Komutlar

```bash
pnpm dev:backend   # wrangler dev (localhost:8787)
pnpm dev:web       # next dev (localhost:3000)
pnpm build         # tüm workspace'lerde build
```

## Oyun Hakkında

Catan, 3-4 oyuncu için bir strateji board oyunudur. Kaynak üretimi, ticaret ve inşaat üzerine kuruludur. 10 zafer puanına ulaşan ilk oyuncu kazanır. Tüm kurallar için `.claude/catan-rules.md` dosyasına bak.
