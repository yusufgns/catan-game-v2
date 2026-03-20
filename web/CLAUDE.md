# Catan v2 — Frontend (Web)

## Oyun Kuralları

Tüm oyun kuralları ve mekaniği için: `../.claude/catan-rules.md`

UI bileşenlerini ve etkileşimleri implementarken bu dosyayı referans al.

---

## Teknoloji Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Yönetimi**: Zustand
- **Styling**: Tailwind CSS
- **Board Rendering**: SVG (hexagonal grid) veya Canvas API
- **WebSocket**: native WebSocket API veya socket.io-client
- **Animasyonlar**: Framer Motion
- **UI Components**: Radix UI (accessible primitives)

## Proje Yapısı

```
web/
├── src/
│   ├── components/
│   │   ├── board/
│   │   │   ├── HexBoard.tsx         ← Ana tahta bileşeni (SVG/Canvas)
│   │   │   ├── HexTile.tsx          ← Tek terrain hex
│   │   │   ├── NumberToken.tsx      ← Sayı token (pip gösterimi dahil)
│   │   │   ├── Settlement.tsx       ← Settlement/City render
│   │   │   ├── Road.tsx             ← Road render
│   │   │   ├── Robber.tsx           ← Robber figürü
│   │   │   └── Harbor.tsx           ← Harbor marker
│   │   ├── ui/
│   │   │   ├── ResourceCard.tsx     ← Kaynak kartı
│   │   │   ├── DevCard.tsx          ← Development kartı
│   │   │   ├── PlayerPanel.tsx      ← Oyuncu bilgi paneli
│   │   │   ├── DiceRoll.tsx         ← Zar atma animasyonu
│   │   │   ├── TradeDialog.tsx      ← Ticaret diyalogu
│   │   │   ├── BuildMenu.tsx        ← İnşaat menüsü
│   │   │   └── VictoryScreen.tsx    ← Kazanma ekranı
│   │   └── lobby/
│   │       ├── LobbyCreate.tsx
│   │       └── LobbyJoin.tsx
│   ├── store/
│   │   ├── gameStore.ts            ← Zustand game state
│   │   ├── wsStore.ts              ← WebSocket connection store
│   │   └── uiStore.ts              ← UI state (selected hex, modal, vb)
│   ├── hooks/
│   │   ├── useWebSocket.ts         ← WS bağlantı yönetimi
│   │   ├── useGameActions.ts       ← Action dispatcher'lar
│   │   └── useBoardGeometry.ts     ← Hex koordinat hesaplamaları
│   ├── lib/
│   │   ├── hexGrid.ts              ← Hexagonal grid math
│   │   ├── boardSetup.ts           ← Başlangıç tahta konfigürasyonu
│   │   └── constants.ts            ← Renk paleti, ölçüler, vb.
│   ├── types/
│   │   └── game.ts                 ← TypeScript type definitions (GameState, Player, vb.)
│   └── pages/
│       ├── Home.tsx
│       ├── Lobby.tsx
│       └── Game.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Hex Grid Matematiği

Hexagonal grid için `lib/hexGrid.ts` kullanılır:

```typescript
// Axial koordinatlardan pixel pozisyonu (pointy-top hex)
function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r),
    y: size * (3 / 2 * r)
  }
}

// Intersection (corner) pozisyonları — her hex'in 6 corner'ı
function hexCorners(cx: number, cy: number, size: number): Point[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30) // pointy-top
    return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) }
  })
}
```

## Board Render Yaklaşımı

### SVG Önerilen

- Her hex bir `<polygon>` veya `<path>`
- Intersection'lar click target olarak `<circle>` (hover için büyür)
- Edge'ler click target olarak `<line>` veya `<rect>`
- Terrain için CSS class veya gradient fill
- Tüm board tek `<svg>` içinde, viewBox ile responsive

### Interaksiyon State'leri

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

- Aktif intersection'lar highlight edilir (yeşil)
- Geçersiz konumlar disabled (kırmızı/gri)
- Hover tooltip ile bilgi göster

---

## State Yönetimi (Zustand)

```typescript
// store/gameStore.ts
interface GameStore {
  gameState: GameState | null
  myPlayerId: string | null

  // Actions (WS mesajlarından state güncelleme)
  applyGameState: (state: GameState) => void
  applyDiceRoll: (values: [number, number]) => void
  applyResourceUpdate: (production: Record<string, Resources>) => void

  // Selectors
  myPlayer: () => Player | null
  isMyTurn: () => boolean
  canBuild: (type: BuildingType) => boolean
}
```

---

## WebSocket Entegrasyonu

```typescript
// hooks/useWebSocket.ts
// Bağlantı kesilince auto-reconnect
// Gelen mesajları parse edip store'u güncelle
// Outgoing action'lar için sendAction() fonksiyonu
```

Mesaj protokolü için backend'in CLAUDE.md dosyasına bak.

---

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

---

## Geliştirme Notları

- Board geometry hesaplamalarını component'a gömme, `lib/hexGrid.ts`'de tut
- Game state sadece WebSocket'ten güncellenir; client'ta unilateral state mutation yapma
- Kural validasyonu backend'de; client'ta sadece UX yardımı (hangi aksiyonların mevcut olduğunu göster)
- Accessibility: keyboard navigation için intersection'lar `tabIndex` almalı
- Mobile responsive: touch event'leri destekle (tap to select, tap to place)
- Oyun anımlarında (zar, kaynak kazanma, robber hareketi) Framer Motion kullan
