# Ranked System — ELO & Tier Design

> **Implementation status (Phase 1):** ELO/XP/level updates are computed on game-over and broadcast via `GAME_RESULTS`. See `packages/catan-core/src/rank.ts` (`computeEloChanges`, `xpForResult`, `levelForXp`) and `backend/src/durable-objects/GameRoom.ts#finalizeGameRecords`.
>
> Bots are excluded from ELO/XP. Placement (first 10 ranked games) uses K=60 and is surfaced as "Unranked" via `getRankFromElo(elo, placementGames)`.


## ELO Sistemi

### Temel Formül (Glicko-2 benzeri)

```
K-Factor (değişkenlik):
  - Yeni oyuncu (0-30 oyun): K = 40 (hızlı yerleşim)
  - Normal: K = 24
  - Yüksek ELO (2000+): K = 16 (stabil)

Beklenen skor:
  E = 1 / (1 + 10^((Ropponent - Rplayer) / 400))

ELO değişimi:
  ΔR = K × (S - E)
  S = 1.0 (1. sıra), 0.66 (2. sıra), 0.33 (3. sıra), 0.0 (4. sıra)
```

### Catan'a Özel Ayarlamalar

4 kişilik oyunda ELO hesaplaması:
- Her oyuncu diğer 3 rakibine karşı ayrı ayrı hesaplanır
- 3 ΔR ortalaması alınır → final ELO değişimi
- Bu sayede güçlü lobbyde 4. olsan bile az kaybedersin

**VP bonusu:**
- Kazansan bile 10 VP ile kazanmak vs 13 VP → fark yok (win = win)
- Ama kaybedende VP farkı etkili:
  - 9 VP ile kaybeden → daha az kaybeder
  - 3 VP ile kaybeden → daha çok kaybeder
  - Formül: `loss_modifier = 0.5 + (playerVP / winnerVP) * 0.5`

**Bonus çarpanları (hızlı yükselme):**
- **Win streak ×1.5:** 3+ üst üste kazanınca ELO kazancı ×1.5
- **Dominant win ×1.2:** 13+ VP ile kazanınca
- **Underdog ×1.3:** Senden yüksek ELO'lu lobbyde kazanınca
- **Placement K=60:** İlk 10 oyun yüksek değişkenlik

**Placement matches:**
- İlk 10 oyun "placement" — ELO ±60 arası değişebilir (K=60)
- 10 oyun sonunda gerçek rank açılır
- Placement sırasında rank gösterilmez, "Calibrating..." yazar

### Yükselme Süresi Tahmini

| Bölge | Tahmini Oyun |
|-------|-------------|
| Wood → Bronze | ~35 |
| Bronze → Silver | ~28 |
| Silver → Gold | ~45 |
| Gold → Platinum | ~65 |
| Platinum → Diamond | ~90 |
| Diamond → Master | ~200 |
| Master → Grandmaster | ~350 |
| **Toplam** | **~813 oyun (~540 saat)** |

- Günde 3 oyun (2 saat): **~9 ay**
- Günde 6 oyun (4 saat): **~4.5 ay**

---

## Rank Tier Sistemi

### Tier'lar (ELO aralıkları)

| Tier | İsim | ELO Aralığı | İkon | Renk |
|------|------|-------------|------|------|
| 1 | **Wood** | 0 - 799 | 🪵 | `#8B6914` |
| 2 | **Bronze** | 800 - 1099 | 🥉 | `#CD7F32` |
| 3 | **Silver** | 1100 - 1399 | 🥈 | `#C0C0C0` |
| 4 | **Gold** | 1400 - 1699 | 🥇 | `#FFD700` |
| 5 | **Platinum** | 1700 - 1999 | 💎 | `#00CED1` |
| 6 | **Diamond** | 2000 - 2299 | 💠 | `#B9F2FF` |
| 7 | **Master** | 2300 - 2599 | ⚔️ | `#9B59B6` |
| 8 | **Grandmaster** | 2600+ | 👑 | `#FF4500` |

### Division (tier içi bölüm)

Her tier 4 division'a ayrılır (IV, III, II, I):
- Ör: Bronze IV (800-874), Bronze III (875-949), Bronze II (950-1024), Bronze I (1025-1099)
- Division genişliği: `(tier_max - tier_min) / 4`

### Yıldızlar (division içi ilerleme)

Her division 5 yıldıza ayrılır:
- Division genişliği / 5 = yıldız başına ELO
- Ör: Bronze II (950-1024) → her yıldız ~15 ELO
- UI'da 5 yıldızdan dolmuş olanlar gösterilir

### Özel kurallar

- **Demotion protection:** Tier düşerken 3 oyun koruma (ör: Silver'dan Bronze'a düşmeden önce)
- **Season reset:** Her sezon başında ELO soft reset → `new_elo = (current_elo + 1000) / 2`
- **Decay:** 14 gün oynamazsan günde -10 ELO (min tier floor'a kadar)
- **Grandmaster:** Top 100 oyuncu, sıralama numarası gösterilir (GM #1, GM #47 gibi)

---

## Matchmaking ELO Kuralları

| Bekleme Süresi | ELO Aralığı |
|----------------|-------------|
| 0-30 saniye | ±100 ELO |
| 30-60 saniye | ±200 ELO |
| 60-120 saniye | ±400 ELO |
| 120+ saniye | ±800 ELO (herkes) |

- Classic mode: ELO etkisiz (casual)
- Ranked mode: ELO bazlı matchmaking
- Custom mode: ELO etkisiz (özel lobi)

---

## Season Sistemi

### Neden Season var?

Sürekli aynı ELO ile oynamak monotonlaşır. Season sistemi:
- Herkese yeni bir başlangıç verir (ama sıfırdan değil)
- Aktif oynamayı teşvik eder (season reward için grind)
- Meta değişiklikleri için temiz başlangıç sağlar
- Leaderboard'u taze tutar (her season yeni yarış)

### Season Yapısı

- **Süre:** 3 ay (90 gün) — yılda 4 season
- **İsimlendirme:** Season 1, Season 2... veya tematik (Season of the Harvest, Season of the Sea)
- **2 ayrı ELO tutulur:**
  - `elo_rating` — genel/kalıcı ELO (hiç sıfırlanmaz)
  - `season_elo` — bu sezona özel ELO (her season başında reset)

### Season Başlangıcı — Soft Reset

Season başladığında `season_elo` sıfırdan başlamaz, mevcut ELO'ya göre hesaplanır:

```
season_elo = (önceki_season_elo + 1000) / 2
```

**Örnekler:**
| Önceki Season ELO | Yeni Season ELO | Açıklama |
|--------------------|-----------------|-----------|
| 800 (Bronze) | 900 | Biraz yukarı çekilir |
| 1000 (başlangıç) | 1000 | Değişmez |
| 1400 (Gold) | 1200 | Biraz aşağı çekilir |
| 2000 (Diamond) | 1500 | Belirgin düşüş |
| 2600 (GM) | 1800 | Çok düşer → tekrar kanıtlamalı |

**Neden soft reset?**
- Hard reset (herkes 1000'e) → ilk hafta kaos, GM'ler yeni başlayanları ezer
- Soft reset → GM'ler Platinum'dan başlar, 2-3 hafta içinde tekrar GM olur
- Yeni başlayanlar etkilenmez (zaten ~1000 civarı)

### Season Sıralaması

Leaderboard **season ELO**'ya göre sıralanır (genel ELO'ya göre değil).
Bu sayede her season yeni bir yarış olur — geçen season GM olan biri bu season tekrar tırmanmalı.

### Season Sonu Ödülleri

| Sıralama | Ödül |
|----------|------|
| **Top 1** | Unique title "Season Champion" + Legendary avatar frame + 5000 gems |
| **Top 10** | Exclusive avatar frame (season temalı) + 2000 gems |
| **Top 1%** | Exclusive border + 1000 gems |
| **Top 5%** | Season badge + 500 gems |
| **Top 10%** | Season badge + 200 gems |
| **Top 25%** | 100 gems |
| **Top 50%** | 50 gems |
| **Katılımcı** (10+ oyun) | Season participation badge |

- Ödüller **exclusive** — o season'dan sonra tekrar elde edilemez
- Profilde "Season 3 Top 1%" gibi badge gösterilir
- Eski season badge'leri koleksiyon olarak profilde kalır

### Season Arası Dönem (1 hafta)

- Season biter → 1 hafta "off-season"
- Bu sürede: ranked oynanır ama ELO değişmez
- Son sıralama kesinleşir, ödüller dağıtılır
- Yeni season teması/patch notes yayınlanır
- Yeni season başlar → soft reset uygulanır

### Genel ELO vs Season ELO

| | Genel ELO (`elo_rating`) | Season ELO (`season_elo`) |
|--|--------------------------|---------------------------|
| **Reset** | Hiçbir zaman | Her season başı (soft) |
| **Kullanım** | Matchmaking, profil | Leaderboard, season sıralaması |
| **Güncelleme** | Her ranked oyunda | Her ranked oyunda |
| **Decay** | Yok | 14 gün inaktif → -10/gün |
| **Görünürlük** | Profilde gizli (opsiyonel) | Profilde ve leaderboard'da açık |

Her ranked oyun sonunda **her iki ELO da** aynı formülle güncellenir. Fark sadece season başındaki reset ve leaderboard'da hangisinin kullanıldığı.

---

## Ranked Oyun Modları

| Mod | Oyuncu | VP Hedef | Discard | Turn Timer | Açıklama |
|-----|--------|----------|---------|------------|----------|
| **4P Ranked** | 4 | 10 | 7 | 60s | Standart ranked |
| **1v1 Ranked** | 2 | 15 | 9 | 30s | Hızlı düello modu |
| **Classic** | 2-4 | 10 | 7 | 120s | Casual, ELO etkisiz |
| **Custom** | 2-4 | Ayarlanabilir | Ayarlanabilir | Ayarlanabilir | Özel lobi, ELO etkisiz |

> **Not:** Ranked'da turn timer 60s (Colonist analizi sonucu). Daha hızlı oyunlar, daha fazla oyun/gün.

## Roadmap Notları (Colonist analizinden)

- [ ] **1v1 Ranked modu** — VP:15, Timer:30s, hızlı düello. Colonist'te popüler.
- [ ] **Ranked turn timer 60s** — 120s yerine 60s default ranked'da
- [ ] **Cities & Knights ranked** — genişleme desteği (uzun vade)
- [ ] **Seafarers ranked** — genişleme desteği (uzun vade)

---

## DB Gereksinimleri

### `users` tablosuna eklenecek kolonlar:
```
rank_tier       TEXT     -- "wood", "bronze", "silver", etc.
rank_division   INTEGER  -- 1-4 (IV=4, III=3, II=2, I=1)
placement_games INTEGER  -- 0-10, placement match sayacı
is_placed       BOOLEAN  -- placement tamamlandı mı
demotion_shield INTEGER  -- 0-3, kalan koruma oyunu
last_ranked_at  TIMESTAMP -- son ranked oyun (decay için)
season_elo      INTEGER  -- bu sezonun ELO'su
```

### Yeni tablo: `seasons`
```
id              TEXT PK
name            TEXT     -- "Season 3"
starts_at       TIMESTAMP
ends_at         TIMESTAMP
is_active       BOOLEAN
```

### Yeni tablo: `season_results`
```
season_id       TEXT FK
user_id         TEXT FK
final_elo       INTEGER
final_rank      INTEGER  -- season sonu sıralama
peak_elo        INTEGER  -- season içi en yüksek ELO
games_played    INTEGER
rewards_claimed BOOLEAN
```
