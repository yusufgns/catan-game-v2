# Catan v2 — Project Root

Bu repo, Catan board oyununun web tabanlı implementasyonunu içerir.

## Repo Yapısı

```
catan-v2/
├── CLAUDE.md               ← Bu dosya (root context)
├── .claude/
│   └── catan-rules.md      ← Catan kuralları & oyun mekaniği (detaylı)
├── game/                   ← React + TypeScript + Three.js (Vite 6, SPA)
│   ├── src/
│   │   ├── main.tsx        ← React entry point (Router)
│   │   ├── pages/          ← CatanPage, ModelsPage
│   │   ├── catan.ts        ← Game board init (legacy imperative)
│   │   ├── models.ts       ← Model viewer init (legacy imperative)
│   │   ├── models/         ← Prosedürel 3D modeller (settlement, hex tiles, etc.)
│   │   ├── Game/           ← Three.js game engine (CatanGame, CatanWorld, etc.)
│   │   └── Shaders/        ← GLSL shader'lar
│   └── public/             ← Textures, audio, 3D models, styles
├── backend/                ← Go/Node API & WebSocket sunucusu
│   └── CLAUDE.md           ← Backend-specific context
└── web/                    ← Next.js (SSR/SSG — landing, SEO, lobby)
    └── CLAUDE.md           ← Frontend-specific context
```

## Genel Prensipler

- Catan oyun kuralları ve mekaniği için her zaman `.claude/catan-rules.md` dosyasını referans al
- Backend ve frontend birbirinden bağımsız geliştirilebilir ama `catan-rules.md` ikisi için de tek kaynak
- Oyun state'i backend'de yaşar, frontend sadece görselleştirir
- Real-time senkronizasyon için WebSocket kullanılır

## Teknoloji Stack

- **Backend**: Go (net/http + gorilla/websocket) veya Node.js (Fastify + ws)
- **Game Engine**: React + TypeScript + Three.js + Vite 6
- **3D Rendering**: Three.js (MeshStandardMaterial, prosedürel geometri)
- **Styling**: SCSS (game/), Tailwind CSS (web/)
- **State Yönetimi**: Zustand veya Redux Toolkit
- **Real-time**: WebSocket (Socket.io veya native ws)

## Oyun Hakkında

Catan, 3-4 oyuncu için bir strateji board oyunudur. Kaynak üretimi, ticaret ve inşaat üzerine kuruludur. 10 zafer puanına ulaşan ilk oyuncu kazanır. Tüm kurallar için `.claude/catan-rules.md` dosyasına bak.
