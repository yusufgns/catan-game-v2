# Phase 4: Game Engine

## Hedef
GameRoom Durable Object — tam oyun döngüsü, tüm aksiyonlar, state persistence.

---

## Tasks

### Backend (`backend/`)

- [x] **B-GAME-01**: GameRoom DO — full game loop (`src/durable-objects/GameRoom.ts`, ~450 lines)
- [x] **B-GAME-02**: Setup phase (settlement + road placement, snake draft)
- [x] **B-GAME-03**: ROLL_DICE — resource distribution, 7 handling
- [x] **B-GAME-04**: BUILD_SETTLEMENT / BUILD_CITY / BUILD_ROAD
- [x] **B-GAME-05**: BUY_DEV_CARD + PLAY_DEV_CARD (knight, road building, year of plenty, monopoly)
- [x] **B-GAME-06**: OFFER_TRADE / ACCEPT / REJECT + MARITIME_TRADE
- [x] **B-GAME-07**: MOVE_ROBBER + steal
- [x] **B-GAME-08**: END_TURN + victory check
- [x] **B-GAME-09**: State persistence (DO storage + async Neon via waitUntil)
- [x] **B-GAME-10**: Turn timer (DO alarms, 2 min per turn)
- [x] **B-GAME-11**: Reconnection — loadState from DO storage → Neon fallback, full state + private state on connect
