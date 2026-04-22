# Colonist.io vs Catan v2 — Rekabet Analizi

## Colonist'in Ranked Sistemi (mevcut bilgi)

### Rating
- Sadece **1. sıra** rating kazanır, 2-3-4. sıra aynı puan kaybeder
- Rating değişimi rakip seviyesine bağlı (underdog bonus var)
- Placement: 10 oyun, önceki sezon performansı dikkate alınır

### Season
- 3 aylık döngü
- Her sezon başında soft reset (1-2 division düşüş)
- ~40 oyun sonra eski seviyeye dönüş beklentisi

### Leaderboard
- Kolonlar: Rank, Player, Division, Rating, Win%, Games
- Top 50 season sonu membership ödülü alır

### Ranked Modlar
| Mod | VP Hedef | Discard | Timer |
|-----|----------|---------|-------|
| 4 Oyuncu | 10 | 7 | 60s |
| 1v1 | 15 | 9 | 30s |
| Cities & Knights | 13 | 7 | 60s |

### Season Ödülleri
- 1-3. sıra → Elite Membership (3 ay)
- 3-25. sıra → Premium Membership (3 ay)
- 26-50. sıra → Plus Membership (3 ay)
- Sadece top 50 ödül alır — geri kalan binlerce oyuncu hiçbir şey almaz

### Membership (Premium)
- 3 tier: Plus, Premium, Elite
- Sadece host'un membership'e ihtiyacı var (genişlemeler + haritalar için)
- Free oyuncular reklam izleyerek ranked oynayabiliyor

---

## Bizim Avantajlarımız (Catan v2'de farklı olan)

### 1. ELO Sistemi — Daha Adil

| | Colonist | Catan v2 |
|--|----------|----------|
| Kazanma | Sadece 1. sıra kazanır | 1. sıra full, 2-3. kısmi kazanır |
| Kaybetme | 2-3-4 aynı kaybeder | VP farkına göre farklı kayıp |
| Hesaplama | Tek rating değişimi | Her rakibe karşı ayrı hesap, ortalama |

**Neden daha iyi:** Colonist'te 2. sıra ile 4. sıra aynı cezayı alıyor — bu adaletsiz. Bizde 9 VP ile kaybeden 3 VP ile kaybedenden daha az kaybeder.

### 2. Bonus Çarpanlar — Daha Heyecanlı

Colonist'te yok, bizde var:
- **Win streak ×1.5** — seri galibiyetleri ödüllendiriyor
- **Dominant win ×1.2** — 13+ VP ile ezmek ek puan veriyor
- **Underdog ×1.3** — üst seviye lobby'de kazanmak ekstra değerli

### 3. Season Ödülleri — Daha Kapsayıcı

| | Colonist | Catan v2 |
|--|----------|----------|
| Top 50 | Membership ödülü | Exclusive cosmetics + gems |
| Top 1% | Hiçbir şey | Exclusive border + 1000 gems |
| Top 10% | Hiçbir şey | Season badge + 200 gems |
| Top 50% | Hiçbir şey | 50 gems |
| Katılımcı | Hiçbir şey | Participation badge |

**Neden daha iyi:** Colonist sadece top 50'yi ödüllendiriyor — 10.000+ oyuncudan 9.950'si hiçbir şey almıyor. Bizde top 50%'ye kadar herkes bir şey alıyor. Bu motivasyonu canlı tutar.

### 4. Rank Tier'ları — Daha Granüler

Colonist'te tier isimleri ve aralıkları net değil (sadece "Division" gösteriliyor). Bizde:
- 8 tier (Wood → Grandmaster)
- Her tier 4 division
- Her division 5 yıldız
- Demotion protection (3 oyun koruma)
- Decay sistemi (14 gün inaktif → günlük -10)

### 5. Bot Sistemi — Onlarda Yok (Aynı Seviyede)

Colonist'te bot var ama basit. Bizde:
- 3 zorluk seviyesi (Easy, Medium, Hard)
- Hard bot MCTS ile oynuyor (800 simülasyon)
- Disconnect olunca bot devralıyor
- Lobby'de bot eklenebilir

### 6. Free-to-Play Model — Daha Adil

| | Colonist | Catan v2 |
|--|----------|----------|
| Ranked erişim | Reklam izle veya öde | Tamamen ücretsiz |
| Genişlemeler | Membership gerekli (host) | Henüz planlanmadı |
| Cosmetics | Membership'e bağlı | Ayrı satın alınabilir |

**Neden daha iyi:** Colonist'te ranked oynamak için ya reklam izliyorsun ya ödüyorsun. Bizde ranked tamamen ücretsiz — gelir cosmetic satışlarından.

---

## Colonist'ten Öğreneceklerimiz

### 1. 1v1 Modu
Colonist'te 1v1 var (VP:15, Timer:30s). Bu popüler ve hızlı — bizde de eklenebilir.

### 2. Genişleme Desteği (Roadmap)
Cities & Knights ve Seafarers ranked modları planlı. Biz de bunu uzun vadede düşünmeliyiz.

### 3. Placement Oyunlarında Geçmiş Sezon Verisi
Colonist ilk 10 placement'ta önceki sezon performansını kullanıyor. Bizde de `season_elo` soft reset zaten bunu sağlıyor.

### 4. 60 Saniyelik Turn Timer
Ranked'da 60s default. Bizde 120s var — ranked için 60s daha iyi olabilir, daha hızlı oyunlar.

---

## Colonist'in Zayıf Noktaları (Fırsat Alanları)

1. **Sadece 1. sıra kazanır** — 2. sıra oyuncular motivasyon kaybediyor
2. **Top 50 dışına ödül yok** — büyük oyuncu kitlesini ignore ediyor
3. **Reklam zorunluluğu** — free oyuncu deneyimi kötü
4. **Tier sistemi belirsiz** — oyuncular nerede olduklarını net bilemiyor
5. **Disconnect handling** — bot devralma sistemi zayıf
6. **Cosmetic çeşitliliği az** — monetization sınırlı

---

## Sonuç

Catan v2'nin ranked sistemi Colonist'ten **daha adil** (kayıp gradasyonu), **daha kapsayıcı** (geniş ödül dağılımı), **daha şeffaf** (net tier/division/yıldız) ve **daha oyuncu dostu** (reklamsız free ranked). Colonist'ten 1v1 modu ve ranked turn timer ayarını alabiliriz.
