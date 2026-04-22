# Ödeme Sistemi — Adapty + Stripe

## Stack
- **Adapty** — paywall yönetimi, subscription, A/B test, analytics
- **Stripe** — web ödeme altyapısı (Adapty üzerinden)
- **İleride:** App Store / Google Play (Adapty native destekliyor)

## Neden Adapty?
- Web'de Stripe üzerinden çalışır
- Mobil çıkınca App Store/Google Play entegrasyonu hazır
- Paywall A/B test (fiyat optimizasyonu)
- Revenue analytics, churn, LTV dashboard
- Subscription yönetimi (iptal, upgrade, downgrade) otomatik

## Adapty Entegrasyonu

### Web (öncelik)
- Adapty Web SDK + Stripe backend
- Paywall'lar Adapty dashboard'dan yönetilir
- Ödeme Stripe Checkout üzerinden

### Mobil (ileride)
- Adapty iOS/Android SDK
- App Store / Google Play native ödeme
- Cross-platform subscription sync

## Gelir Modeli

### Ücretsiz (Free)
- Ranked dahil tüm oyun modları
- Temel avatar ve renkler
- Günlük bonus
- Leaderboard erişimi

### Membership Tiers (aylık/yıllık)

| Tier | Aylık | Yıllık | İçerik |
|------|-------|--------|--------|
| **Plus** | $4.99 | $47.88 ($3.99/ay) | Reklamsız, exclusive emotes, 2x daily bonus |
| **Premium** | $9.99 | $95.88 ($7.99/ay) | Plus + tüm haritalar, genişlemeler host, replay |
| **Elite** | $19.99 | $191.88 ($15.99/ay) | Premium + exclusive cosmetics, priority matchmaking |

### Coin Paketleri (tek seferlik)
| Paket | Fiyat | Coin | Bonus |
|-------|-------|------|-------|
| Starter | $4.99 | 500 | — |
| Popular | $9.99 | 1,100 | +100 |
| Value | $14.99 | 1,800 | +300 |
| Super | $19.99 | 2,500 | +500 |
| Mega | $49.99 | 6,500 | +1,500 |
| Ultimate | $99.99 | 15,000 | +5,000 |

### Cosmetic Satışları (gem/coin ile)
- Avatarlar: 200-2000 coin
- Border/frame: 300-1500 coin
- Emotes: 100-500 coin
- Board efektleri: 500-3000 coin

## Şirket Gerekliliği

Stripe'tan para çekmek için şirket gerekiyor. Seçenekler:

| Yol | Süre | Maliyet | Not |
|-----|------|---------|-----|
| **TR şahıs şirketi** | 1-2 gün | ~0₺ | En hızlı, e-devlet'ten |
| **TR LTD** | 1-2 hafta | 5-10K₺ | Daha profesyonel |
| **ABD LLC (Stripe Atlas)** | 1-2 hafta | $500 | LLC + Stripe + banka tek paket |
| **UK LTD** | 1-3 gün | ~$50 | Hızlı ve ucuz |

**Şu an:** Stripe test modunda geliştirme yapılabilir. Şirket açılınca live key'e geçilir.

## Backend Gereksinimleri

### DB Tabloları
- `subscriptions` — userId, tier, status, adaptyProfileId, expiresAt
- `coin_packages` — id, coins, bonusCoins, priceUsd (mevcut plan)
- `purchase_history` — userId, type (subscription/coins/item), amount, adaptyTransactionId

### Endpoints
- `POST /payment/create-checkout` — Adapty üzerinden Stripe checkout session
- `POST /payment/webhook` — Adapty/Stripe webhook (subscription update, payment success)
- `GET /user/subscription` — mevcut subscription bilgisi
- `POST /payment/verify` — ödeme doğrulama

### Adapty Webhook Events
- `subscription_started` — yeni abone
- `subscription_renewed` — otomatik yenileme
- `subscription_cancelled` — iptal
- `subscription_expired` — süresi doldu
- `non_subscription_purchase` — coin paketi satın alma
