# Phase 6: Frontend Integration

## Hedef
Mevcut frontend'i live backend'e bağla — WebSocket hook, server-driven state, reconnection.

---

## Tasks

### Frontend (`web/`)

- [x] **F-INT-01**: WebSocket hook (`web/lib/useWebSocket.ts`) — auto-reconnect, exponential backoff
- [x] **F-INT-02**: Game state store (`web/lib/gameStore.ts`) — Zustand, handles all ServerMessage types
- [x] **F-INT-03**: Lobby state store (`web/lib/lobbyStore.ts`) — Zustand, handles LobbyServerMessage
- [x] **F-INT-04**: Active game banner (`web/components/ActiveGameBanner.tsx`) — "Devam eden oyun" on home
- [x] **F-INT-05**: Backend active-game endpoint (`GET /user/active-game`) — finds unfinished game
- [ ] **F-INT-06**: Room page — wire to real WebSocket (needs full page rewrite with lobby store)
- [ ] **F-INT-07**: Game page — wire CatanView to gameStore + WebSocket (needs CatanGameState refactor)
