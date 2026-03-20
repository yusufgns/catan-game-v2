# Catan v2 — Project Root

Bu repo, Catan board oyununun web tabanlı implementasyonunu içerir.

## Repo Yapısı

```
catan-v2/
├── CLAUDE.md               ← Bu dosya (root context)
├── .claude/
│   └── catan-rules.md      ← Catan kuralları & oyun mekaniği (detaylı)
├── backend/                ← Go/Node API & WebSocket sunucusu
│   └── CLAUDE.md           ← Backend-specific context
└── web/                    ← React/TypeScript frontend
    └── CLAUDE.md           ← Frontend-specific context
```

## Genel Prensipler

- Catan oyun kuralları ve mekaniği için her zaman `.claude/catan-rules.md` dosyasını referans al
- Backend ve frontend birbirinden bağımsız geliştirilebilir ama `catan-rules.md` ikisi için de tek kaynak
- Oyun state'i backend'de yaşar, frontend sadece görselleştirir
- Real-time senkronizasyon için WebSocket kullanılır

## Teknoloji Stack

- **Backend**: Go (net/http + gorilla/websocket) veya Node.js (Fastify + ws)
- **Frontend**: React + TypeScript + Vite
- **State Yönetimi**: Zustand veya Redux Toolkit
- **Styling**: Tailwind CSS
- **Board Rendering**: Canvas API veya SVG (hexagonal grid)
- **Real-time**: WebSocket (Socket.io veya native ws)

## Oyun Hakkında

Catan, 3-4 oyuncu için bir strateji board oyunudur. Kaynak üretimi, ticaret ve inşaat üzerine kuruludur. 10 zafer puanına ulaşan ilk oyuncu kazanır. Tüm kurallar için `.claude/catan-rules.md` dosyasına bak.
