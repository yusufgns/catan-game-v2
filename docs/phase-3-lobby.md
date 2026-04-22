# Phase 3: Lobby System

## Hedef
Real-time lobby — oyun odası oluştur, arkadaş davet et, hazır ol, oyun başlat.

---

## Tasks

### Backend (`backend/`)

- [x] **B-LOBBY-01**: Lobby CRUD routes (`src/routes/lobby.ts`)
  - `POST /lobby/create` — yeni lobby oluştur, code üret, DB'ye yaz
  - `POST /lobby/:id/join` — lobby'ye katıl
  - `GET /lobby/:id` — lobby bilgisi getir
  - `GET /lobby/find?code=XXX` — code ile lobby bul

- [x] **B-LOBBY-02**: LobbyRoom DO tam implementasyon
  - Player join/leave broadcast
  - Ready toggle
  - Color seçimi
  - Host transfer (host çıkarsa)
  - Start game: GameRoom DO oluştur, game DB kaydı yaz, herkese GAME_STARTING gönder

- [x] **B-LOBBY-03**: Matchmaking service (`src/services/matchmaking.ts`)
  - Basit kuyruk: mode + ELO range
  - 4 oyuncu bulunca otomatik lobby oluştur

### Frontend (`web/`)

- [ ] **F-LOBBY-01**: Room page (`web/app/(game)/room/page.tsx`) — WebSocket ile gerçek lobby
- [ ] **F-LOBBY-02**: Lobby page güncelle — create/join/matchmaking gerçek API çağrıları
- [ ] **F-LOBBY-03**: Invite friends dialog — lobby code paylaşımı

### Package (`packages/catan-core/`)

- [ ] **P-LOBBY-01**: Lobby ile ilgili ek type'lar gerekirse protocol.ts'e ekle
