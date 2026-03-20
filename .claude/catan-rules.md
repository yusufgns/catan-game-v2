# Catan — Tam Oyun Kuralları & Mekaniği

> Kaynak: Catan 3D Edition resmi kural kitabı
> Bu dosya, backend game logic ve frontend UI implementasyonu için tek kaynak (single source of truth)

---

## 1. OYUN TAHTASI (Board)

### 1.1 Terrain Hex Tipleri

| Terrain     | Kaynak  | Adet |
|-------------|---------|------|
| Forest      | Lumber  | 4    |
| Hills       | Brick   | 3    |
| Pasture     | Wool    | 4    |
| Fields      | Grain   | 4    |
| Mountains   | Ore     | 3    |
| Desert      | -       | 1    |
| **Toplam**  |         | **19** |

### 1.2 Number Token Dağılımı (18 adet)

```
2×1, 3×2, 4×2, 5×2, 6×2, 8×2, 9×2, 10×2, 11×2, 12×1
```

- **6 ve 8** kırmızı renkte — en çok roll edilen sayılar (5 pip)
- **2 ve 12** en az roll edilenler (1 pip)
- Desert'e token konmaz, Robber başlangıçta Desert'te durur

### 1.3 Harbor (Liman) Tipleri (9 adet)

| Harbor     | Oran | Adet |
|------------|------|------|
| Lumber 2:1 | 2:1  | 1    |
| Brick 2:1  | 2:1  | 1    |
| Wool 2:1   | 2:1  | 1    |
| Grain 2:1  | 2:1  | 1    |
| Ore 2:1    | 2:1  | 1    |
| Generic    | 3:1  | 4    |

### 1.4 Sea Frame

- 6 adet sea frame parçası (3 one-cove + 3 two-cove, alternating)
- Harbor marker'lar sea frame'deki cove'lara yerleştirilir

### 1.5 Board Koordinat Sistemi (Hexagonal Grid)

Catan tahtası **offset coordinate** veya **cube coordinate** sistemi ile temsil edilir:
- 19 hex, merkezi hex etrafında halka halka dizilir
- Her hex'in 6 köşesi (vertex/intersection) ve 6 kenarı (edge/path) vardır
- Her intersection en fazla 3 hex'e komşudur
- Her edge iki intersection'ı birleştirir

```
Hex Grid (axial coordinates, q+r+s=0):
         [0,-2,2] [1,-2,1] [2,-2,0]
       [-1,-1,2] [0,-1,1] [1,-1,0] [2,-1,-1]
     [-2,0,2] [-1,0,1] [0,0,0] [1,0,-1] [2,0,-2]
       [-2,1,1] [-1,1,0] [0,1,-1] [1,1,-2]
         [-2,2,0] [-1,2,-1] [0,2,-2]
```

---

## 2. OYUN BİLEŞENLERİ (Components)

### 2.1 Kartlar

- **Resource Cards**: 95 adet (her tipten 19)
  - Lumber, Brick, Wool, Grain, Ore
- **Development Cards**: 25 adet
  - Knight: 14 adet
  - Progress Cards: 6 adet (2x Road Building, 2x Year of Plenty, 2x Monopoly)
  - Victory Point Cards: 5 adet (1x each: Library, Market, Great Hall, Chapel, University)

### 2.2 Özel Kartlar

- **Longest Road**: 2 VP, ilk 5+ segment kesintisiz yol yapana
- **Largest Army**: 2 VP, ilk 3+ knight oynayan oyuncuya

### 2.3 Oyuncu Parçaları (her renk için)

- 15 Roads
- 5 Settlements
- 4 Cities

---

## 3. OYUN KURULUMU (Setup)

### 3.1 Başlangıç Kurulumu (Beginners)

1. Sea frame'i birleştir (one-cove ve two-cove alternating)
2. Harbor marker'ları cove'lara yerleştir
3. 19 terrain hex'i Overview haritasındaki gibi yerleştir
4. Number token'ları hex'lere yerleştir (desert hariç)
5. Robber'ı Desert'e koy
6. Resource card'ları 5 yığın halinde card tray'e koy
7. Development card'ları karıştır, face-down koy

### 3.2 Başlangıç Yerleşimi

- En yaşlı oyuncu başlar (experienced: reverse snake order)
- Her oyuncu sırayla **2 settlement + 2 road** koyar
- İkinci settlement'tan **1 resource card** (her komşu hex'ten 1)
- 3 oyuncuda kırmızı pozisyon boş kalır

---

## 4. TUR SIRASI (Turn Structure)

Her turda sırayla:

### 4.1 Resource Production (Zorunlu)

1. Aktif oyuncu 2 zarı atar
2. Toplam değere karşılık gelen number token'lara sahip hex'ler kaynak üretir
3. O hex'e komşu intersection'da **settlement** olan oyuncular **1 kaynak** alır
4. O hex'e komşu intersection'da **city** olan oyuncular **2 kaynak** alır
5. **Özel durum — 7 gelirse**: Robber aktive olur (bkz. Bölüm 6.1)

### 4.2 Trade (İsteğe Bağlı)

**a) Domestic Trade (Oyuncular arası)**
- Aktif oyuncu istediği kartları teklif edebilir
- Diğer oyuncular kabul edebilir veya counter-offer yapabilir
- Sadece aktif oyuncu ile işlem yapılabilir; diğer oyuncular kendi aralarında işlem yapamaz

**b) Maritime Trade (Supply ile)**
- **4:1**: Her zaman, herhangi 4 aynı kaynak → 1 istenen kaynak
- **3:1**: Generic harbor'a sahipse, 3 aynı kaynak → 1 istenen kaynak
- **2:1**: Specific harbor'a sahipse, o kaynaktan 2 → 1 istenen kaynak

### 4.3 Build (İsteğe Bağlı)

Aynı turda birden fazla şey inşa edilebilir. Development card satın alma zar atmadan önce de yapılabilir.

---

## 5. İNŞAAT MALİYETLERİ (Building Costs)

| Yapı              | Maliyet                          | VP  | Limit |
|-------------------|----------------------------------|-----|-------|
| Road              | Lumber + Brick                   | 0   | 15    |
| Settlement        | Lumber + Brick + Wool + Grain    | 1   | 5     |
| City              | 2 Grain + 3 Ore                  | 2   | 4     |
| Development Card  | Wool + Grain + Ore               | -   | 25    |

### 5.1 Road Kuralları
- Boş bir path'e inşa edilmeli
- Kendi mevcut road, settlement veya city'ye bağlı olmalı
- Rakip settlement/city'nin hemen ötesindeki path'e inşa edilemez

### 5.2 Settlement Kuralları
- Kendi road'una komşu bir intersection'da olmalı
- **Distance Rule**: Tüm komşu 3 intersection boş olmalı (kendi dahil herhangi settlement/city yok)

### 5.3 City Kuralları
- Sadece kendi mevcut settlement'ının üzerine upgrade edilebilir
- Settlement piece supply'a geri döner
- 2 resource card üretir (settlement'ın 1 yerine)

### 5.4 Development Card Kuralları
- Satın alındığı turda oynanamaz (Victory Point kartlar hariç)
- Tur başına maksimum 1 development card oynanabilir
- Kullanılan kartlar supply'a geri dönmez (oyundan çıkar)
- VP kartları kazanma anına kadar gizli tutulur

---

## 6. ÖZEL DURUMLAR (Special Cases)

### 6.1 Robber (7 Gelince)

1. 7 gelen turda kaynak üretilmez
2. **Discard Rule**: 8+ kaynak kartı olan her oyuncu, kartlarının yarısını (aşağı yuvarla) supply'a iade eder
3. Aktif oyuncu Robber'ı başka bir terrain hex'e taşır (desert dahil, ama mevcut konumu hariç)
4. Aktif oyuncu, yeni Robber konumuna komşu settlement/city'si olan oyunculardan **1 rastgele kaynak** çalar

**Robber etkisi**: Üzerinde Robber olan hex, o sayı geldiğinde kaynak üretmez.

### 6.2 Knight Card Oynamak

- Knight oynanınca Robber 7 gelmiş gibi hareket ettirilir
- Steal yapılır (4.a adımları ile aynı)
- Knight card face-up önüne konur

### 6.3 Progress Cards

| Kart             | Etki                                                                 |
|------------------|----------------------------------------------------------------------|
| Road Building    | Ücretsiz 2 road inşa et                                              |
| Year of Plenty   | Supply'dan istediğin 2 kaynak kartını al                             |
| Monopoly         | Bir kaynak türü ilan et; tüm diğer oyuncular o kaynağın tümünü sana verir |

---

## 7. ZAFER PUANLARI (Victory Points)

| Kaynak                | VP  | Notlar                                    |
|-----------------------|-----|-------------------------------------------|
| Settlement            | 1   | Her settlement 1 VP                       |
| City                  | 2   | Her city 2 VP                             |
| Longest Road          | 2   | Min 5 segment, kesintisiz, başka biri geçince kaybedersin |
| Largest Army          | 2   | Min 3 knight, başka biri geçince kaybedersin |
| Victory Point Card    | 1   | Her biri 1 VP, gizli tutulur              |

### 7.1 Longest Road Detayları

- En az 5 kesintisiz road segment
- Branch'ler sayılmaz, sadece en uzun tek yol
- Başka bir oyuncu daha uzun yol inşa ederse kart geçer
- Rakip settlement/city yolu bölebilir (path'i ikiye ayırır)

### 7.2 Largest Army Detayları

- En az 3 Knight card face-up önüne konmalı
- Başka bir oyuncu daha fazla knight oynarsa kart geçer

---

## 8. OYUN SONU (End of Game)

- **Kendi turunda** 10 VP'ye ulaşan ilk oyuncu kazanır
- Kendi turunda değilse, sıra gelinene kadar devam edilir
- Victory Point kartları ancak kazanırken açılabilir (veya başkası kazanırsa)
- Aynı turda birden fazla VP kartı açılabilir

---

## 9. OYUN STATEİ (Game State Model)

Backend implementasyonu için gerekli state yapısı:

```
GameState {
  phase: "setup" | "playing" | "ended"
  currentPlayer: PlayerID
  turnPhase: "roll" | "trade" | "build" | "done"
  players: Player[]
  board: Board
  robberPosition: HexID
  longestRoad: { playerID, length }
  largestArmy: { playerID, count }
  developmentCardDeck: DevelopmentCard[]
  resourceBank: ResourceBank
  winner: PlayerID | null
}

Player {
  id: PlayerID
  color: "red" | "blue" | "orange" | "white"
  resources: { lumber, brick, wool, grain, ore }
  settlements: IntersectionID[]
  cities: IntersectionID[]
  roads: EdgeID[]
  developmentCards: DevelopmentCard[]
  knightsPlayed: number
  victoryPoints: number
  hasPlayedDevCard: boolean  // bu turda
}

Board {
  hexes: Hex[]
  intersections: Intersection[]
  edges: Edge[]
}

Hex {
  id: HexID
  type: TerrainType
  number: number | null  // desert=null
  hasRobber: boolean
}

Intersection {
  id: IntersectionID
  adjacentHexes: HexID[]
  adjacentEdges: EdgeID[]
  adjacentIntersections: IntersectionID[]
  building: { type: "settlement" | "city", playerID } | null
  harbor: HarborType | null
}

Edge {
  id: EdgeID
  intersections: [IntersectionID, IntersectionID]
  road: { playerID } | null
}
```

---

## 10. BOARD GEOMETRİSİ (Hexagonal Grid)

### Hex Koordinat Sistemi

Axial (q, r) koordinatları önerilir:
- `q` = sütun
- `r` = satır
- `s = -q - r` (cube coordinate'e dönüşüm için)

### Intersection Hesaplama

Her hex'in 6 corner'ı vardır. Intersection ID'leri paylaşılan corner'lar için aynı olmalı.

### Başlangıç Tahtası (Beginners)

```
Hex dizilimi (q, r):
Row 0 (3 hex): (0,-2), (1,-2), (2,-2)
Row 1 (4 hex): (-1,-1), (0,-1), (1,-1), (2,-1)
Row 2 (5 hex): (-2,0), (-1,0), (0,0), (1,0), (2,0)
Row 3 (4 hex): (-2,1), (-1,1), (0,1), (1,1)
Row 4 (3 hex): (-2,2), (-1,2), (0,2)

Terrain sırası (beginners, dıştan içe spiral):
Mountains, Pasture, Forest, Fields, Hills, Pasture,
Hills, Fields, Forest, Desert, Forest, Mountains,
Forest, Mountains, Fields, Pasture, Hills, Fields, Pasture

Number token sırası (A-R, clockwise spiral):
5, 2, 6, 3, 8, 10, 9, 12, 11, -desert-, 3, 6, 4, 11, 5, 10, 8, 4, 9
```

---

## 11. OLASILILAR (Probabilities)

| Sayı | Kombinasyon | Olasılık | Pip |
|------|-------------|----------|-----|
| 2    | 1           | 2.78%    | 1   |
| 3    | 2           | 5.56%    | 2   |
| 4    | 3           | 8.33%    | 3   |
| 5    | 4           | 11.11%   | 4   |
| 6    | 5           | 13.89%   | 5   |
| 7    | 6           | 16.67%   | -   |
| 8    | 5           | 13.89%   | 5   |
| 9    | 4           | 11.11%   | 4   |
| 10   | 3           | 8.33%    | 3   |
| 11   | 2           | 5.56%    | 2   |
| 12   | 1           | 2.78%    | 1   |

---

## 12. STRATEJİ NOTLARI

- **6 ve 8**: En yüksek üretim potansiyeli (5 pip), kırmızıyla işaretli
- **Resource diversity**: Farklı kaynaklara erişim kritik
- **Harbor stratejisi**: Belirli kaynaklarda çok üretim + ilgili harbor = güçlü trade
- **Robber stratejisi**: 7+ karta sahipken dikkatli; Largest Army için knight biriktir
- **Settlement yeri**: Her intersection max 3 hex'e komşu → çeşit ve olasılık dengesi
