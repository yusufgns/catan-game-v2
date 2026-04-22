# Frontend Analiz — Backend İhtiyaçları

## Sayfa Bazlı Analiz

### 1. Ana Lobby (`/`)
**Veri:** Matchmaking queue, game invites, friend list, friend requests
**Aksiyonlar:** Queue join/leave, invite accept/decline, friend request

**Endpoints:**
- `GET /matchmaking/queue/:mode` — kuyruğa katıl
- `DELETE /matchmaking/queue` — kuyruktan çık
- `GET /user/invites` — oyun davetleri
- `POST /user/invites/:id/accept` — daveti kabul et
- `POST /user/invites/:id/decline` — daveti reddet

**DB Tabloları:** matchmaking_queue, game_invites

---

### 2. Shop (`/shop`)
**Veri:** Coin paketleri (6 tier), cosmetic items (avatar, renk, border, emote, efekt)
**Aksiyonlar:** Paket satın al, item satın al

**Endpoints:**
- `GET /shop/coin-packages` — coin paketleri listele
- `POST /shop/purchase-coins/:packageId` — coin satın al
- `GET /shop/items?type=avatar|color|border|emote|effect` — item listele
- `POST /shop/purchase-item/:itemId` — item satın al (gem/coin ile)

**DB Tabloları:** shop_items, coin_packages, purchase_history

---

### 3. Inventory (`/inventory`)
**Veri:** Sahip olunan itemler, equipped durumu, rarity (legendary/epic/rare/common)
**Aksiyonlar:** Equip/unequip item

**Endpoints:**
- `GET /user/inventory` — envanter listele
- `POST /user/inventory/:itemId/equip` — item giy
- `POST /user/inventory/:itemId/unequip` — item çıkar

**DB Tabloları:** user_inventory

---

### 4. Daily Bonus (`/daily`)
**Veri:** 14 günlük ödül döngüsü, streak, claimed durumu
**Aksiyonlar:** Günlük ödül topla

**Endpoints:**
- `GET /user/daily-rewards` — ödül durumu + streak
- `POST /user/daily-rewards/claim` — bugünün ödülünü topla

**DB Tabloları:** daily_rewards

---

### 5. Leaderboard (`/leaderboard`)
**Veri:** Global/season/weekly/friends/guilds sıralaması, detaylı profil
**Tabs:** Global, Season 3, This Week, Top Guilds, Friends

**Endpoints:**
- `GET /leaderboard?type=global|season|weekly|friends|guilds&page=1&limit=15`
- `GET /user/:userId/profile` — detaylı profil (match history, achievements)

**DB Tabloları:** user_stats (mevcut), leaderboard_cache (opsiyonel)

---

### 6. News (`/news`, `/news/[slug]`)
**Veri:** Haberler, kategoriler (Updates, Events, Patches, Announcements)
**Aksiyonlar:** Makale kaydet, paylaş

**Endpoints:**
- `GET /news?category=all|updates|events|patches|announcements`
- `GET /news/:slug`
- `POST /user/saved-news/:slug` — makale kaydet

**DB Tabloları:** news_articles, user_saved_news

---

### 7. Settings (`/settings`)
**Veri:** Audio settings (master/music/sfx/voice volume)
**Aksiyonlar:** Ayar güncelle

**Endpoints:**
- `GET /user/settings`
- `PATCH /user/settings`

**DB Tabloları:** user_settings

---

### 8. Room/Lobby (`/room`)
**Veri:** Room code, oyuncular, ready durumu, lobby settings
**Settings:** VP target (8/10/12/15), trade ratio, turn timer, map type, expansions

**Endpoints:**
- `POST /lobby/create`
- `GET /lobby/:id`
- `GET /lobby/find?code=XXX`
- `POST /lobby/:id/join`
- `WS /ws/lobby/:id` — real-time lobby

**DB Tabloları:** lobbies, lobby_players (mevcut)

---

### 9. Game Play (`/play`)
**Veri:** Full game state, board, resources, dev cards, trade offers
**Aksiyonlar:** Tüm oyun aksiyonları (dice, build, trade, robber, dev card)

**Endpoints:**
- `WS /ws/game/:gameId` — real-time game (mevcut)
- `GET /game/:id` — game details
- `GET /game/:id/actions` — action log / replay

**DB Tabloları:** games, game_players, game_actions (mevcut)

---

## Eksik DB Tabloları (mevcut schema'da yok)

| Tablo | Açıklama | Öncelik |
|-------|----------|---------|
| `friends` | userId, friendId, status (pending/accepted/blocked) | Yüksek |
| `game_invites` | fromUserId, toUserId, lobbyId, status | Yüksek |
| `shop_items` | id, name, type, rarity, price, assetUrl | Orta |
| `coin_packages` | id, coins, bonusCoins, priceUsd | Orta |
| `user_inventory` | userId, itemId, equipped, acquiredAt | Orta |
| `daily_rewards` | userId, day (1-14), claimedAt, cycleStart, streak | Orta |
| `news_articles` | id, slug, title, category, body, author, publishedAt | Düşük |
| `user_saved_news` | userId, newsId | Düşük |
| `user_settings` | userId, settings (JSONB) | Düşük |
| `purchase_history` | userId, type, amount, createdAt | Orta |

---

## Eksik API Endpoints (mevcut backend'de yok)

### Yüksek Öncelik (oyun için gerekli)
- `GET/POST /user/friends` — arkadaş listesi + ekleme
- `GET/POST /user/friend-requests` — istek gönder/kabul et
- `POST /lobby/:id/invite/:userId` — oyuna davet et
- `GET /user/invites` — davetleri listele

### Orta Öncelik (engagement)
- `GET/POST /shop/*` — shop endpoints
- `GET/POST /user/inventory/*` — envanter
- `GET/POST /user/daily-rewards/*` — günlük ödül
- `GET /matchmaking/queue/:mode` — matchmaking

### Düşük Öncelik (content)
- `GET /news/*` — haberler
- `GET/PATCH /user/settings` — ayarlar

---

## User Tablosu — Eksik Kolonlar (sonra eklenecek)

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `coins` | integer | Oyun içi para (gems'ten ayrı, shop'ta satılıyor) |
| `trophies` | integer | Kupa sayısı (ranking için) |
| `rank_tier` | text | "bronze", "silver", "gold", "platinum", "diamond" |
| `rank_division` | integer | 1-5 (tier içi bölüm, ör: Bronze II = tier bronze, div 2) |
| `rank_stars` | integer | 0-5 (division içi ilerleme) |
| `online_status` | text | "online", "in_game", "offline" |
| `last_seen_at` | timestamp | Son aktif zaman |
| `equipped_avatar` | text FK | Equipped avatar item ID |
| `equipped_border` | text FK | Equipped border item ID |
| `equipped_emote` | text FK | Equipped emote item ID |

## User Stats — Eksik Kolonlar (sonra eklenecek)

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `total_losses` | integer | Kaybedilen oyun sayısı |
| `win_rate` | decimal | Kazanma oranı (cached) |
| `current_streak` | integer | Mevcut kazanma serisi |
| `best_streak` | integer | En uzun kazanma serisi |
| `total_trades` | integer | Toplam trade sayısı |
| `total_resources_collected` | integer | Toplam toplanan kaynak |

---

## Mevcut Backend'de Olan (✓) vs Olmayan (✗)

| Endpoint | Durum |
|----------|-------|
| Auth (guest, google, magic-link, logout) | ✓ |
| GET /user/me | ✓ |
| PATCH /user/me | ✓ |
| GET /user/active-game | ✓ |
| POST /lobby/create | ✓ |
| POST /lobby/:id/join | ✓ |
| GET /lobby/:id | ✓ |
| GET /lobby/find?code= | ✓ |
| WS /ws/lobby/:id | ✓ |
| WS /ws/game/:id | ✓ |
| GET /game/:id | ✓ |
| GET /game/:id/actions | ✓ |
| GET /leaderboard | ✓ |
| GET /health | ✓ |
| Friends system | ✗ |
| Game invites | ✗ |
| Shop | ✗ |
| Inventory | ✗ |
| Daily rewards | ✗ |
| Matchmaking queue | ✗ |
| News | ✗ |
| User settings | ✗ |
