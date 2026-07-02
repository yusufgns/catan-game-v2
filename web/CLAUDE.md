# Catan v2 — Frontend (Web)

## Oyun Kuralları

Tüm oyun kuralları ve mekaniği için: `../.claude/catan-rules.md`

UI bileşenlerini ve etkileşimleri implemente ederken bu dosyayı referans al. Saf kural mantığı `@catan/core` paketinde (`../packages/catan-core`) — tipler ve validasyonlar oradan import edilir.

> **ÖNEMLİ**: Bu proje Next.js 16 kullanıyor — training data'dan sapmalar var. Framework davranışından emin değilsen `node_modules/next/dist/docs/` altındaki dokümanlara bak (bkz. `AGENTS.md`).

---

## Teknoloji Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **3D**: Vanilla Three.js (el yazması motor, Bruno Simon tarzı class mimarisi) — `@react-three/fiber`/`drei` kurulu ama ana motor r3f DEĞİL
- **State Yönetimi**: Zustand (`lib/gameStore.ts`, `lib/lobbyStore.ts`)
- **Styling**: Tailwind CSS v4 (lobby/UI) + SCSS (game engine: `game-engine/catan.scss`)
- **WebSocket**: native WebSocket (`lib/useWebSocket.ts`), server-authoritative sync
- **Animasyonlar**: GSAP (3D motor içi), Framer Motion (lobby/UI)
- **Diğer**: lucide-react (ikonlar), mersennetwister (seeded RNG), lil-gui + three-perf (debug), raw-loader (GLSL import)
- **Backend API**: `NEXT_PUBLIC_API_URL` (default `http://localhost:8787`)

## Proje Yapısı

```
web/
├── app/
│   ├── (lobby)/                    ← Lobby shell (layout.tsx = nav)
│   │   ├── page.tsx                ← Ana sayfa (oyun modları, quick play)
│   │   ├── shop/ leaderboard/ daily/ profile/ inventory/
│   │   ├── news/ + news/[slug]/
│   │   ├── login/
│   │   └── catan-2d/               ← 2D board varyantı (fallback)
│   ├── (game)/
│   │   ├── room/                   ← Pre-game oda (ready, renk, bot ekleme)
│   │   └── play/                   ← 3D oyun: page.tsx → CatanView.tsx (motoru mount eder)
│   ├── auth/verify/                ← Magic link doğrulama landing
│   └── layout.tsx
├── components/
│   ├── AuthGuard, AuthProvider, ActiveGameBanner, InviteFriendsDialog
│   ├── board/                      ← 2D varyant bileşenleri (HexBoard, HexTile, ...)
│   ├── board3d/                    ← r3f tabanlı 3D parçalar (Settlement3D, Road3D, ...)
│   └── ui/                         ← TradeDialog, LogCard
├── game-engine/                    ← ANA 3D MOTOR (vanilla Three.js)
│   ├── catan.ts                    ← initCatan() entry + modül singleton'ları
│   │                                 (getGameState, getGameRef, getMultiplayerRef, destroyCatan)
│   ├── multiplayer.ts              ← WS adapter: createMultiplayerAdapter, syncServerStateToLocal
│   ├── Game/
│   │   ├── CatanGame.class.ts      ← Orkestratör
│   │   ├── Core/                   ← Renderer, Camera
│   │   ├── Utils/                  ← EventEmitter, Time, Sizes, ResourceLoader, Audio*, Debug
│   │   └── World/                  ← CatanWorld + Managers (Season, Environment/day-night, Biome)
│   │       └── Components/         ← Ground, Skydome, Rain, Snow, FireFlies, ... +
│   │           └── CatanBoard/     ← CatanBoard.class, CatanPieces, CatanGameState
│   ├── models/                     ← Prosedürel geometri (hexForest, settlement, city, road, ...)
│   ├── Shaders/                    ← Custom GLSL (Materials/ + Chunks/)
│   ├── game-logic/                 ← ⚠️ core'un kopyası — yeni kod @catan/core kullanmalı
│   └── ui/                         ← React HUD overlay: GameHUD, TradeDialog, ActionBar,
│                                     DiscardDialog, VictoryOverlay, TurnTimer, useGameState hook
├── lib/                            ← gameStore/lobbyStore (Zustand), useWebSocket, auth, tabId
│                                     (⚠️ bir kısım kural kopyası burada da var — @catan/core'u tercih et)
├── types/ public/
└── AGENTS.md                       ← Next.js 16 uyarısı
```

## Motor ↔ React Entegrasyonu

- Motor client-side dynamic import ile `<canvas id="three">` içine mount edilir (`CatanView.tsx`)
- React HUD (`game-engine/ui/`) canvas üzerine overlay; `useGameState` hook'u motor singleton'ını dinler
- `CatanGameState` listener pattern'iyle değişiklik yayar; bazı köprüler `window.__catan*` callback'leri üzerinden (session-replaced / replaced-by-bot dialogları) — teknik borç, genişletme yaparken tercih etme
- `?mode=ranked|classic` URL paramı board üretimini belirler (`generateRandomBoard` vs `BEGINNER_BOARD`)

## WebSocket Entegrasyonu

- Mesaj kontratı: `packages/catan-core/src/protocol.ts` (tek kaynak)
- `lib/useWebSocket.ts`: auto-reconnect + backoff; `game-engine/multiplayer.ts`: server state → lokal motor sync
- **Game state sadece sunucudan güncellenir**; client'ta unilateral state mutation yapma
- Kural validasyonu backend'de; client'ta sadece UX yardımı (hangi aksiyonlar mevcut, highlight'lar)

## Interaksiyon State'leri (UI phase)

```typescript
type UIPhase =
  | "idle"
  | "placing-initial-settlement"
  | "placing-initial-road"
  | "placing-robber"        // 7 geldiğinde
  | "placing-settlement"
  | "placing-road"
  | "placing-city"
  | "stealing"              // robber sonrası
```

- Aktif intersection'lar highlight edilir, geçersiz konumlar disabled
- Hover tooltip ile bilgi göster

## Tasarım Sistemi

### Renk Paleti (Oyuncu Renkleri)

```typescript
const PLAYER_COLORS = {
  red:    { bg: '#DC2626', border: '#991B1B' },
  blue:   { bg: '#2563EB', border: '#1D4ED8' },
  orange: { bg: '#EA580C', border: '#C2410C' },
  white:  { bg: '#F9FAFB', border: '#6B7280' },
}
```

### Terrain Renkleri

```typescript
const TERRAIN_COLORS = {
  forest:    '#15803d',
  hills:     '#b45309',
  pasture:   '#65a30d',
  fields:    '#ca8a04',
  mountains: '#6b7280',
  desert:    '#d97706',
  ocean:     '#0ea5e9',
}
```

### Number Token Renkleri

- 6 ve 8: kırmızı text (`#DC2626`)
- Diğerleri: koyu kahverengi (`#78350f`)

## Komutlar

```bash
pnpm dev     # next dev (localhost:3000)
pnpm build   # next build
pnpm lint    # eslint
```

## Geliştirme Notları

- Hex/board geometri hesapları `@catan/core` (`hexGrid.ts`, `boardGraph.ts`) — component'a gömme
- `lib/` ve `game-engine/game-logic/` altındaki kural kopyaları legacy; yeni kod `@catan/core` import etmeli
- Game UI tasarımı için `web/.claude/skills/game-ui-design` skill'i mevcut
- Mobile responsive: touch event'leri destekle; accessibility için klavye navigasyonu
- Zar/kaynak/robber animasyonları: HUD'da Framer Motion, sahnede GSAP
