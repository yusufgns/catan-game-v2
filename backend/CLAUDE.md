# Catan v2 — Backend

## Oyun Kuralları

Tüm oyun kuralları ve mekaniği için: `../. claude/catan-rules.md`

Bu dosyayı her zaman game logic yazarken referans al.

---

## Teknoloji Stack

- **Runtime**: Go 1.22+ (önerilen) veya Node.js 20+
- **HTTP Framework**: Go net/http + chi router / Node: Fastify
- **WebSocket**: gorilla/websocket (Go) / ws (Node)
- **Store**: In-memory (başlangıç), Redis (ölçekleme için)
- **Serialization**: JSON

## Proje Yapısı (Go)

```
backend/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── game/
│   │   ├── state.go        ← GameState, Player, Board struct'ları
│   │   ├── board.go        ← Hex grid, intersection, edge logic
│   │   ├── rules.go        ← Kural validasyonları (distance rule, road connect vb)
│   │   ├── engine.go       ← Turn yönetimi, action handler'lar
│   │   ├── resource.go     ← Kaynak üretimi, banka işlemleri
│   │   ├── trade.go        ← Domestic & maritime trade
│   │   ├── robber.go       ← Robber & 7 logic
│   │   └── victory.go      ← VP hesaplama, longest road, largest army
│   ├── lobby/
│   │   ├── lobby.go        ← Oyun odası yönetimi
│   │   └── matchmaking.go
│   └── ws/
│       ├── hub.go          ← WebSocket connection hub
│       ├── client.go       ← Player connection
│       └── messages.go     ← Message types (JSON protocol)
├── go.mod
└── go.sum
```

## WebSocket Mesaj Protokolü

### Client → Server

```json
{ "type": "JOIN_LOBBY", "lobbyId": "abc123", "playerName": "Alice" }
{ "type": "START_GAME" }
{ "type": "ROLL_DICE" }
{ "type": "BUILD_ROAD", "edgeId": 42 }
{ "type": "BUILD_SETTLEMENT", "intersectionId": 15 }
{ "type": "BUILD_CITY", "intersectionId": 15 }
{ "type": "BUY_DEV_CARD" }
{ "type": "PLAY_DEV_CARD", "cardType": "knight", "robberHex": 7, "stealFrom": "player2" }
{ "type": "PLAY_DEV_CARD", "cardType": "road_building", "edges": [3, 7] }
{ "type": "PLAY_DEV_CARD", "cardType": "year_of_plenty", "resources": ["lumber", "ore"] }
{ "type": "PLAY_DEV_CARD", "cardType": "monopoly", "resource": "grain" }
{ "type": "OFFER_TRADE", "offer": {"lumber":2}, "want": {"ore":1}, "targetPlayer": "player3" }
{ "type": "ACCEPT_TRADE", "tradeId": "t1" }
{ "type": "REJECT_TRADE", "tradeId": "t1" }
{ "type": "MARITIME_TRADE", "give": {"lumber":4}, "want": {"ore":1} }
{ "type": "MOVE_ROBBER", "hexId": 5, "stealFrom": "player2" }
{ "type": "END_TURN" }
```

### Server → Client

```json
{ "type": "GAME_STATE", "state": { ...GameState } }
{ "type": "ERROR", "code": "INVALID_ACTION", "message": "..." }
{ "type": "DICE_ROLLED", "values": [3, 5], "total": 8 }
{ "type": "RESOURCES_PRODUCED", "production": { "player1": {"ore":1}, "player2": {"lumber":2} } }
{ "type": "TRADE_OFFERED", "tradeId": "t1", "from": "player1", "offer": {...}, "want": {...} }
{ "type": "GAME_OVER", "winner": "player2", "victoryPoints": 10 }
```

## Game Logic Prensipleri

### State Mutations

- Tüm state değişiklikleri `engine.go`'daki `ApplyAction()` fonksiyonundan geçer
- Her action validate edilir, sonra state güncellenir, sonra broadcast edilir
- Hata durumunda state değişmez, sadece hata mesajı döner

### Validasyon Sırası

1. Oyuncunun sırası mı? (`currentPlayer` check)
2. Turn phase doğru mu? (roll → trade → build → done)
3. Action tipine göre kural validasyonu (rules.go)
4. Yeterli kaynak var mı?
5. State'i güncelle
6. VP kontrol et (10+ VP → oyun bitti)
7. Broadcast

### Longest Road Algoritması

- Her road placement veya settlement/city build'de hesapla
- DFS ile her edge'den başlayarak en uzun path'i bul
- Branch'ler sayılmaz, sadece tek continuous path
- Rakip settlement/city path'i keser

### Largest Army

- Her knight oynamada güncelle
- `knightsPlayed >= 3` ve mevcut largest army sahibinden fazla → transfer

## API Endpoints (REST)

```
GET  /health
POST /lobby/create          → { lobbyId, code }
POST /lobby/:id/join        → { playerId, token }
GET  /lobby/:id             → LobbyState
WS   /ws/:lobbyId/:playerId ← WebSocket upgrade
```

## Geliştirme Notları

- Her oyun kendi goroutine/room'unda çalışır
- Race condition'lardan kaçınmak için oyun state'i mutex ile korunur
- Test için `internal/game/` paketinin tüm public fonksiyonları unit test edilmeli
- Özellikle: distance rule, longest road, resource production, 7 discard hesaplama
