# Phase 5: Bot System

## Hedef
3 zorluk seviyesinde bot oyuncular — lobby'de eklenebilir, disconnect durumunda otomatik devralır.

---

## Tasks

### Package (`packages/catan-core/src/bot/`)

- [x] **P-BOT-01**: Bot types (`types.ts`)
  - `BotDifficulty`: "easy" | "medium" | "hard"
  - `BotStrategy` interface: `decideBotAction(state, playerId) → ClientMessage`
  - `BotConfig`: { difficulty, thinkDelayMs, name }

- [x] **P-BOT-02**: Board evaluation (`evaluate.ts`)
  - `scoreIntersection(intId, graph, hexes)` → pip toplamı + çeşitlilik + harbor bonus
  - `scoreResourceValue(resources)` → hangi kaynaklar daha değerli (context'e göre)
  - `evaluatePosition(state, playerId)` → genel pozisyon puanı (VP, kaynak erişimi, yol uzunluğu)

- [x] **P-BOT-03**: Easy bot (`easyBot.ts`)
  - Her aksiyon için valid hamleleri listele → random seç
  - Settlement: random valid intersection
  - Road: random valid edge
  - Trade: 4:1 bank trade (random eksik kaynak)
  - Dev card: hemen oyna

- [x] **P-BOT-04**: Medium bot (`mediumBot.ts`)
  - Settlement: `scoreIntersection()` ile en yüksek puanlı yer
  - Road: settlement'a bağlayan veya longest road'a yaklaştıran
  - Build priority: city > settlement > dev card > road
  - Trade: eksik kaynağı olan oyuncuya teklif, lidere trade yapma
  - Robber: en güçlü rakibin en verimli hex'ine koy
  - Dev card: knight biriktir (largest army), road building stratejik kullan

- [x] **P-BOT-05**: Hard bot (`hardBot.ts`)
  - MCTS (Monte Carlo Tree Search) — 800 simülasyon, 30 tur derinlik, UCB1 selection
  - Tamamen lokal, API bağımlılığı yok

### Backend (`backend/`)

- [ ] **B-BOT-01**: GameRoom DO bot entegrasyonu
  - Bot player'lar `player.isBot = true` flag'i ile işaretlenir
  - Bot sırası gelince `setTimeout(thinkDelayMs)` sonra `decideBotAction()` çağır
  - Bot aksiyonu normal oyuncu aksiyonu gibi validate → mutate → broadcast
  - Think delay: easy 500ms, medium 1500ms, hard 3000ms (doğal hissettirmek için)

- [ ] **B-BOT-02**: Disconnect → bot takeover
  - Oyuncu `webSocketClose` → 120 saniye timer başlat (DO alarm)
  - Timer dolunca → `player.botControlled = true`, bot devralır
  - Oyuncu reconnect → `player.botControlled = false`, kontrol geri
  - Diğer oyunculara "Oyuncu X botu devreye girdi" / "Oyuncu X geri döndü" broadcast

- [ ] **B-BOT-03**: Lobby bot ekleme
  - LobbyRoom'da "Add Bot" mesajı
  - Bot player oluştur: { id: "bot_xxx", name: "KHAN", isBot: true, difficulty: "medium" }
  - Bot renk seçimi (kullanılmayan renklerden)
  - Host zorluk değiştirebilir

### Frontend (`web/`)

- [ ] **F-BOT-01**: Lobby'de "Bot Ekle" butonu
  - Zorluk seçimi dropdown (Easy / Medium / Hard)
  - Bot isimleri: KHAN, MARCO, VIKING, CLEOPATRA vb.
  - Bot avatar (robot ikonu)
  - Bot çıkarma butonu

- [ ] **F-BOT-02**: Oyun içi bot göstergesi
  - Bot oyuncunun isminin yanında 🤖 ikonu
  - "Bot düşünüyor..." animasyonu (think delay sırasında)
  - Disconnect → bot takeover bildirim toast'ı

---

## Bot Seviyeleri Detay

### Easy 🟢
- Random valid hamle
- Hiç strateji yok
- Yeni başlayanlar için ideal

### Medium 🟡
- Heuristic scoring (intersection pip + diversity)
- Build priority zinciri
- Basit trade mantığı
- Casual oyuncuları yener

### Hard 🔴
- MCTS: her hamle için 1000+ simülasyon
- Trade ve robber pozisyonu için olasılık analizi
- Pro oyuncuları zorlar

---

## Notlar
- Bot logic `@catan/core`'da çalışır (pure function, no side effects)
- Backend DO sadece `decideBotAction()` çağırır ve sonucu normal aksiyon gibi işler
- Bot kararları deterministic olabilir (seed ile) — replay için faydalı
- Hiçbir dış API bağımlılığı yok, tamamen lokal çalışır
