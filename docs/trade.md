# Trade Sistemi

> Single source of truth for Catan trade mechanics. Game logic, validation ve UI implementasyonu bu dosyaya uymalı. Üst-seviye kural özeti için `.claude/catan-rules.md §4.2`.

## 1. Genel

İki tür trade var:

| Tür | Karşı taraf | Oran | Kim başlatabilir |
|-----|-------------|------|------------------|
| **Maritime (Bank)** | Banka / Supply | 4:1, 3:1, 2:1 (harbor'a göre) | Yalnızca aktif oyuncu |
| **Domestic (Player)** | Bir veya daha fazla rakip | Müzakere edilebilir (resmi Catan: serbest oran) | Yalnızca aktif oyuncu |

Her iki türde de:
- Sadece **aktif oyuncu turn phase** = `main` ve `diceRolled === true` iken trade başlatabilir.
- Setup fazında trade yok.
- 7 atıldıysa robber işlemleri (`discard`, `move`, `steal`) bitmeden trade yapılamaz.
- Verilen ve alınan kaynak aynı olamaz (`give.resource !== want`).
- Aktif trade varken aynı oyuncu yeni offer açamaz; önce mevcut trade `accepted` veya `rejected` olmalı (veya turn bitince otomatik temizlenir).

---

## 2. Maritime Trade (Bank ile)

### 2.1 Oranlar — Harbor Sahipliği

`playerTradeRates(player)` her kaynak için **en iyi** oranı döner:

| Koşul | Oran |
|-------|------|
| Hiçbir harbor yok | **4:1** |
| Generic harbor (3:1) | **3:1** (tüm kaynaklar için) |
| Specific harbor (örn. wool 2:1) | **2:1** (yalnızca o kaynak için) |

Harbor sahipliği = harbor'un dock edge'inin iki intersection'ından **birinde** oyuncunun settlement veya city'si var.

### 2.2 Kritik Kural — Tek Kaynak Verilir

Bank trade'inde **tek bir kaynak tipinden** `rate` adet verilir, karşılığında **tek bir farklı kaynaktan 1 adet** alınır.

> Örnek: 3 wool harbor'ın varsa 3 wool → 1 grain yapabilirsin.
> **3 wool + 1 ore** karışık veremezsin (geçersiz).
> Aynı turda **birden fazla** maritime trade yapılabilir; her biri ayrı işlemdir.

### 2.3 Birden Fazla Harbor

Birden fazla farklı harbor varsa her kaynak ayrı en iyi oranını kullanır:
- Wool 2:1 + brick 2:1 → wool ve brick için 2:1, diğerleri 4:1.
- Wool 2:1 + generic 3:1 → wool için 2:1, geri kalanlar için 3:1.

### 2.4 Validasyon

```
MARITIME_TRADE { give: { resource, amount }, want }

✓ phase === 'main' && diceRolled
✓ playerId === currentPlayerId
✓ !needsRobber && !needsSteal && !needsDiscard
✓ give.resource !== want
✓ give.amount === playerTradeRates(player)[give.resource]
✓ player.resources[give.resource] >= give.amount
```

İşlem: `player.resources[give.resource] -= give.amount; player.resources[want] += 1`. Bank kaynakları sınırsız (resmi kuralda 19 adet limit var; Phase 1'de modellenmiyor).

---

## 3. Domestic Trade (Oyuncular arası)

### 3.1 Akış (iki-fazlı: pre-accept + finalize)

```
1. Aktif oyuncu OFFER_TRADE gönderir
   { offer, want, targetPlayer? }
   - targetPlayer set ise: kapalı / hedefli teklif (yalnızca o oyuncu görür/kabul edebilir)
   - targetPlayer undefined ise: açık teklif (tüm rakipler görür)

2. Server activeTrade'i set eder (acceptedBy: []), TRADE_OFFERED broadcast eder

3. Adaylar ACCEPT_TRADE { tradeId } gönderir → pre-accept
   - Server activeTrade.acceptedBy listesine ekler
   - broadcastState ile herkes "X kabul etti" görür
   - Birden fazla aday paralel kabul edebilir (open offer'da)

4. Aktif oyuncu acceptedBy listesinden BİR partner seçer:
   ACCEPT_TRADE { tradeId, with: partnerId }
   - Server kaynakları transfer eder
   - TRADE_RESOLVED { accepted: true, finalizedWith: partnerId } broadcast
   - activeTrade null'a çekilir

5. İptal:
   - Aktif oyuncu REJECT_TRADE → trade tamamen iptal, TRADE_RESOLVED { accepted: false }
   - Pre-accept etmiş bir aday REJECT_TRADE → sadece kendi pre-accept'ini geri çeker (acceptedBy'dan çıkar)
   - Pre-accept etmemiş aday REJECT_TRADE → no-op (sadece kendi UI'ında banner kaybolur)
```

### 3.2 Kurallar

- **Sadece aktif oyuncu** offer açabilir.
- **Aynı turda birden fazla offer açılabilir**, ancak **aynı (offer, want) imzasıyla iki teklif olamaz** (`DUPLICATE_TRADE`). İmza `ALL_RESOURCES` sırasında her kaynağın miktarı normalize edilerek hesaplanır.
- Offer/want **boş olamaz** (en az bir kaynak > 0).
- Offer ve want **aynı kaynağı içeremez**.
- Tüm miktarlar **pozitif tamsayı**.
- **Aktif oyuncu pre-accept yapamaz** kendi teklifine; sadece `with` parametresiyle finalize edebilir.
- Offer açıldığında ve finalize anında **fromPlayer'ın kaynağı yeterli olmalı** (arada robber çalışmış olabilir).
- Pre-accept anında ve finalize anında **partner'ın kaynağı yeterli olmalı**.
- Aynı oyuncu **iki kez pre-accept yapamaz** (`ALREADY_ACCEPTED`).
- `with` parametresindeki partner mutlaka `acceptedBy` listesinde olmalı (`PARTNER_NOT_PRE_ACCEPTED`).
- Turn değişince veya 7 atılınca `activeTrades` listesi tamamen temizlenir.

### 3.5 Trade TTL (Otomatik Süre Aşımı)

Her trade'in `expiresAt = createdAt + TRADE_TTL_MS` (default 30 saniye) deadline'ı vardır:
- TTL içinde trade üzerinde herhangi bir aktivite (pre-accept, withdraw) olursa `expiresAt` 30 saniye uzatılır.
- TTL dolarsa server `trade_timeout` alarm'ında trade'i kaldırır ve `TRADE_RESOLVED { accepted: false }` broadcast eder.
- Hem offerer hem recipient'lar 30sn boyunca işlem yapmazsa trade otomatik kapanır.
- Frontend banner'larda kalan süre `CountdownPill` ile gösterilir; <8s kırmızı uyarı.

### 3.3 Neden iki faz?

Açık teklif (targetPlayer yok) durumunda birden fazla rakip aynı anda kabul etmek isteyebilir. İlk gelen kazanır mantığı yerine:
- Tüm pre-accept'ler toplanır.
- Aktif oyuncu kimle takas edeceğine bilinçli karar verir.
- Diğer adaylar trade'in kiminle gerçekleştiğini `TRADE_RESOLVED.finalizedWith` ile öğrenir.

### 3.3 Oran

Resmi Catan'da herhangi bir oran negotiable (örn. 2 lumber → 1 ore, ya da 3 wool + 1 brick → 2 ore). Backend oran kısıtlaması koymaz; her iki tarafın anlaşması yeterli.

### 3.4 Validasyon

```
OFFER_TRADE { offer, want, targetPlayer? }

✓ phase === 'main' && diceRolled
✓ playerId === currentPlayerId
✓ !needsRobber && !needsSteal && !needsDiscard
✓ activeTrade === null
✓ Object.keys(offer).length > 0 && Object.keys(want).length > 0
✓ Tüm değerler pozitif tamsayı
✓ Object.keys(offer) ∩ Object.keys(want) === ∅
✓ Tüm offer kaynakları için player.resources[r] >= offer[r]
✓ targetPlayer (varsa) geçerli, currentPlayer değil

ACCEPT_TRADE { tradeId }   — pre-accept (recipient)

✓ activeTrade?.id === tradeId
✓ playerId !== activeTrade.fromPlayerId
✓ activeTrade.toPlayerId yoksa veya playerId ile eşleşiyorsa
✓ playerId NOT IN activeTrade.acceptedBy
✓ accepter.resources[r] >= want[r] (her r için)

ACCEPT_TRADE { tradeId, with: partnerId }   — finalize (offerer)

✓ activeTrade?.id === tradeId
✓ playerId === activeTrade.fromPlayerId
✓ partnerId IN activeTrade.acceptedBy
✓ offerer.resources[r] >= offer[r]
✓ partner.resources[r] >= want[r]
```

---

## 4. Protocol Mesajları

`packages/catan-core/src/protocol.ts` ile uyumlu:

### Client → Server

```ts
| { type: "MARITIME_TRADE"; give: { resource: ResourceType; amount: number }; want: ResourceType }
| { type: "OFFER_TRADE"; offer: Partial<Resources>; want: Partial<Resources>; targetPlayer?: string }
| { type: "ACCEPT_TRADE"; tradeId: string }
| { type: "REJECT_TRADE"; tradeId: string }
```

### Server → Client

```ts
| { type: "TRADE_OFFERED"; tradeId; from; offer; want; targetPlayer? }
| { type: "TRADE_RESOLVED"; tradeId; accepted: boolean; acceptedBy?: string }
| { type: "RESOURCES_PRODUCED"; production }   // maritime sonrası state diff için
| { type: "ERROR"; code: 'INVALID_TRADE' | 'INSUFFICIENT_RESOURCES' | ...; message }
```

`TRADE_OFFERED` aynı zamanda `targetPlayer` alanını taşır ki UI sadece hedeflenen oyuncuya Accept butonunu açsın.

---

## 5. Frontend UI (`web/game-engine/ui/TradeDialog.tsx`)

### 5.1 Aktif Oyuncu Görünümü

Trade düğmesine basınca modal:

- **Tabs**: `Bank` | `Player`
- **Bank tab**: Her kaynak için `playerTradeRates` ile hesaplanan oran rozeti, give-resource seçici (counter ≥ rate olunca aktif), want-resource seçici, "Trade" butonu.
- **Player tab**: Her oyuncu kaynağından `±` ile offer ve want oluşturma, opsiyonel target oyuncu seçici, "Send Offer" butonu.

### 5.2 Pasif Oyuncu Görünümü

`TRADE_OFFERED` geldiğinde HUD'da bir banner:
- "X size teklif: [+2 lumber] karşılığında [-1 ore]" + Accept / Reject butonları.
- Hedef değilseniz veya kaynağınız yetmiyorsa Accept disabled.

### 5.3 Aktif Oyuncu — Trade Açıkken

"Cancel offer" butonu (`REJECT_TRADE` kendi tradeId ile).

---

## 6. State Tracking

`GameState.activeTrades: TradeOffer[]` — birden fazla aktif trade aynı anda taşınabilir:

```ts
interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId?: string;       // undefined = open offer
  offer: Partial<Resources>;
  want: Partial<Resources>;
  acceptedBy: string[];      // pre-accept eden recipient'lar
  createdAt: number;
  expiresAt: number;         // ms epoch — TTL deadline
}
```

`PublicGameState.activeTrades` aynı şekilde tüm oyunculara broadcast edilir.

---

## 7. Bot Davranışı

`backend/src/durable-objects/GameRoom.ts:botTryMaritimeTrade`:
- City'ye 1 kaynak eksikse, fazlalık bir kaynaktan rate kadar verip eksik olanı al.
- Domestic trade botlar arası yok (Phase 1).

---

## 8. Edge Case'ler

- **7 atılınca aktif trade**: `needsDiscard` veya `needsRobber` set olduğunda mevcut `activeTrade` iptal edilir, `TRADE_RESOLVED accepted=false` broadcast edilir.
- **Turn bitince aktif trade**: `END_TURN` handler `activeTrade`'i null'a çeker.
- **Disconnect**: Offer'ı açan oyuncu disconnect olursa trade iptal.
- **Bank limit**: Phase 1'de bank kaynakları sınırsız. Phase 2'de 19/19/19/19/19 limiti eklenecek.
