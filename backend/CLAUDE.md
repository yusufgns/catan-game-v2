# Catan v2 — Backend

## Oyun Kuralları

Tüm oyun kuralları ve mekaniği için: `../.claude/catan-rules.md`

Bu dosyayı her zaman game logic yazarken referans al. Saf kural/validasyon/ELO mantığı `@catan/core` paketinde yaşar (`../packages/catan-core`) — backend bu paketi tüketir, kural mantığını burada duplike etme.

---

## Teknoloji Stack

- **Runtime**: Cloudflare Workers (nodejs_compat, ESM)
- **HTTP Framework**: Hono ^4
- **Real-time**: Cloudflare Durable Objects + native WebSocket (`ctx.acceptWebSocket`)
- **Database**: Neon serverless Postgres + Drizzle ORM (migration'lar drizzle-kit ile)
- **Auth**: arctic (Google OAuth PKCE), oslo (hash/crypto), Resend (magic link e-postası), session cookie
- **Shared logic**: `@catan/core` (workspace paketi)
- **Config**: `wrangler.toml` (DO binding'leri, staging/production env'leri, cron trigger'lar), secrets `.dev.vars`

## Proje Yapısı

```
backend/
├── src/
│   ├── index.ts                    ← Worker entry: Hono app + WS upgrade routes + cron dispatcher
│   ├── env.ts                      ← Env binding tipleri
│   ├── durable-objects/
│   │   ├── GameRoom.ts             ← OYUNUN KALBİ (~2100 satır): tüm game loop, action handling,
│   │   │                             bot'lar, timer/alarm yönetimi, reconnect, AFK→bot devralma
│   │   └── LobbyRoom.ts            ← Pre-game oda: ready/color/chat/bot ekleme/START_GAME
│   ├── db/
│   │   ├── schema.ts               ← Drizzle şeması (10 tablo)
│   │   └── client.ts               ← Neon bağlantı factory
│   ├── auth/                       ← session, middleware, guest, google, magic-link
│   ├── routes/                     ← health, auth, user, lobby, game, cleanup (REST)
│   ├── services/
│   │   ├── matchmaking.ts          ← In-memory ELO-range queue (±300, 30sn sonra genişler)
│   │   │                             NOT: production için DO/external queue gerekiyor
│   │   └── stats.ts                ← ESKİ/kullanılmıyor — canlı ELO yolu GameRoom + @catan/core
│   └── middleware/rate-limit.ts
├── migrations/                     ← Drizzle SQL migration'ları (0000...0004)
├── wrangler.toml
└── drizzle.config.ts
```

## Komutlar

```bash
pnpm dev            # wrangler dev (localhost:8787)
pnpm deploy         # wrangler deploy
pnpm db:generate    # drizzle-kit generate (şema değişince migration üret)
pnpm db:migrate     # drizzle-kit migrate
pnpm db:studio      # drizzle-kit studio
```

## Mimari Akış

1. Client REST ile lobby oluşturur/katılır (`routes/lobby.ts`)
2. `GET /ws/lobby/:lobbyId` → session doğrulanır → istek `LobbyRoom` DO'suna forward edilir
3. Host START_GAME → LobbyRoom `games` + `game_players` satırlarını yazar, `GameRoom.fetch(?init=true)` ile oyunu başlatır
4. `GET /ws/game/:gameId` → `GameRoom` DO'su maçı yönetir (authoritative state DO'da; `games.state` jsonb'ye mirror edilir)
5. Oyun sonu: `GameRoom` final sıralamayı hesaplar, `computeEloChanges` (sadece ranked) + XP/level uygular, `user_stats` + `users`'ı günceller

## WebSocket Mesaj Protokolü

Kontratın tek kaynağı: `packages/catan-core/src/protocol.ts` (`ClientMessage`, `ServerMessage`, `LobbyClientMessage`, `LobbyServerMessage`). Başlıca action'lar:

- Client → Server: `ROLL_DICE`, `BUILD_ROAD/SETTLEMENT/CITY`, `BUY_DEV_CARD`, `PLAY_DEV_CARD`, `OFFER/ACCEPT/REJECT_TRADE`, `MARITIME_TRADE`, `MOVE_ROBBER`, `DISCARD_RESOURCES`, `END_TURN`
- Server → Client: `GAME_STATE` (redacted public state), `PRIVATE_STATE`, `DICE_ROLLED`, `TRADE_OFFERED`, `GAME_OVER`, `ERROR`

Yeni mesaj tipi eklerken önce `protocol.ts`'i güncelle, sonra `GameRoom.handleAction` ve web tarafını.

## Game Logic Prensipleri

### Validasyon Sırası

1. Oyuncunun sırası mı? (`currentPlayer` check)
2. Turn phase doğru mu? (roll → trade → build → done)
3. Action tipine göre kural validasyonu (`@catan/core` gameRules/tradeRules)
4. Yeterli kaynak var mı? (`canAfford` / `deductCost`)
5. State'i güncelle (DO memory + storage)
6. VP kontrol et (10+ VP → oyun bitti, finalize + DB persist)
7. Broadcast (public state herkese, private state sahibine)

### Alarm/Timer Yönetimi (GameRoom)

DO'nun tek alarm slotu var; `rescheduleAlarms()` şu alarmları tek slot üzerinden önceliklendirir: bot_turn, turn_timer, trade_timeout, discard_timeout, idle_cleanup. Yeni bir zamanlı davranış eklerken bu mekanizmaya entegre et, ayrı alarm kurma.

### Bot & Bağlantı Yaşam Döngüsü

- Bot heuristikleri `@catan/core/bot` + GameRoom içi yardımcılar (`botPickSettlement`, `botTryBuild`, ...)
- 3 idle turn sonrası AFK oyuncu bot'a devredilir; reconnect'te geri alınır
- Bot id'leri `bot_*` — `game_players`'a YAZILMAZ (users FK nedeniyle)
- Disconnect grace window + per-tab session replacement + reconnect'te full/private state resync var

### DB Şeması (özet)

`users` (tag, elo, xp, gems), `sessions`, `magic_link_tokens`, `oauth_accounts`, `lobbies`, `lobby_players`, `games` (jsonb state/board), `game_players` (final istatistikler), `game_actions` (replay log), `user_stats`.

## Cron'lar (`scheduled` handler, `index.ts`)

- `0 */4 * * *` — stale/abandoned game + lobby temizliği
- `0 3 * * 0` — orphan guest kullanıcı temizliği (haftalık)

## Geliştirme Notları

- Kural değişikliği = önce `@catan/core`, sonra GameRoom orchestration
- `services/stats.ts` ölü kod — ELO için kullanma
- Test yok; kural fonksiyonları için testler `packages/catan-core`'a yazılmalı (vitest hazır)
- Monetizasyon (gems store) henüz yok; şemada `gems` alanı hazır, plan `docs/payment-system.md`
