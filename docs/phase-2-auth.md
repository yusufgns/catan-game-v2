# Phase 2: Auth System

## Hedef
Guest, Google OAuth ve Email Magic Link authentication — Cloudflare Workers üzerinde.

## Tech Stack
- **Session**: oslo/crypto (token hash) + Drizzle (sessions table)
- **Google OAuth**: arctic (PKCE flow)
- **Magic Link**: oslo/crypto (token gen) + Resend (email gönderimi)
- **Middleware**: Hono middleware (session verify → user attach)

---

## Tasks

### Backend (`backend/`) — Tamamlandı

- [x] **B-AUTH-01**: Session management (`src/auth/session.ts`)
  - `createSession(userId)` → generates token, hashes with SHA-256, writes to `sessions` table, returns raw token
  - `validateSession(token)` → hash token, lookup in DB, check expiry, return user
  - `deleteSession(sessionId)` → remove from DB
  - Session expiry: 30 gün
  - Cookie: `session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`

- [x] **B-AUTH-02**: Auth middleware (`src/auth/middleware.ts`)
  - Hono middleware: reads `session` cookie (or `Authorization: Bearer <token>`)
  - Calls `validateSession()`, attaches user to `c.set("user", user)`
  - `requireAuth` variant: returns 401 if no valid session
  - `optionalAuth` variant: attaches user if present, continues if not

- [x] **B-AUTH-03**: Guest auth (`src/auth/guest.ts` + `src/routes/auth.ts`)
  - `POST /auth/guest` body: `{ name: string }`
  - Creates user with `is_guest=true`, no email
  - Creates session, sets cookie
  - Returns `{ user: { id, name, isGuest } }`

- [x] **B-AUTH-04**: Google OAuth (`src/auth/google.ts` + `src/routes/auth.ts`)
  - `GET /auth/google` → generate state + PKCE verifier, store in cookie, redirect to Google
  - `GET /auth/google/callback` → exchange code for tokens via arctic
  - Extract `sub`, `email`, `name`, `picture` from Google ID token
  - Upsert user: match on `google_id` or `email`, update `avatar_url`, set `email_verified=true`
  - Create session, redirect to `FRONTEND_URL` with cookie set
  - Handle account linking: if guest user logs in with Google, upgrade account

- [x] **B-AUTH-05**: Email Magic Link (`src/auth/magic-link.ts` + `src/routes/auth.ts`)
  - `POST /auth/magic-link` body: `{ email: string }`
  - Generate random token (32 bytes), hash with SHA-256
  - Store in `magic_link_tokens` table (15 min expiry)
  - Send email via Resend API: link = `FRONTEND_URL/auth/verify?token=<raw_token>`
  - `GET /auth/verify?token=<token>` → hash, lookup, verify not expired/used
  - Upsert user (match on email), set `email_verified=true`
  - Mark token as used, create session, redirect to `FRONTEND_URL`

- [x] **B-AUTH-06**: User routes (`src/routes/user.ts`)
  - `GET /user/me` (requireAuth) → return current user profile
  - `PATCH /user/me` (requireAuth) → update name, avatar
  - `POST /auth/logout` → delete session, clear cookie

- [ ] **B-AUTH-07**: DB migration
  - Run `drizzle-kit generate` to create SQL migration from schema
  - Apply migration to Neon database
  - Verify tables: users, sessions, magic_link_tokens, oauth_accounts

### Frontend (`web/`) — Tamamlandı

- [x] **F-AUTH-01**: Auth context & hooks (`web/lib/auth.ts`)
  - `useAuth()` hook, `AuthProvider` component (`web/components/AuthProvider.tsx`)
  - `loginAsGuest()`, `loginWithGoogle()`, `sendMagicLink()`, `logout()`, `refresh()`
  - Root layout'a AuthProvider eklendi (`web/app/layout.tsx`)

- [x] **F-AUTH-02**: Login page (`web/app/(lobby)/login/page.tsx`)
  - Google ile giriş butonu
  - Email ile giriş (magic link) tab'ı
  - Misafir olarak oyna (opsiyonel nickname)
  - Email gönderildi onay ekranı
  - Magic link verify page: `web/app/auth/verify/page.tsx`

- [x] **F-AUTH-03**: Auth guard (`web/components/AuthGuard.tsx`)
  - Loading spinner + auth yoksa /login'e redirect

- [x] **F-AUTH-04**: Lobby header user info
  - "TUTANKHAMIN" → `user.name` (dinamik)
  - "1,957" gems → `user.gems` (dinamik)

### Package (`packages/catan-core/`)

- [ ] **P-AUTH-01**: Auth ile ilgili shared type'lar yoksa eklenmez — auth tamamen backend concern

---

## Auth Flow Diyagramları

### Guest
```
Client                          Worker
  |-- POST /auth/guest --------->|
  |   { name: "Ali" }           |-- INSERT users (is_guest=true)
  |                              |-- INSERT sessions
  |<-- Set-Cookie: session=xxx --|
  |<-- { user: {...} } ---------|
```

### Google OAuth
```
Client                          Worker                    Google
  |-- GET /auth/google --------->|
  |<-- 302 redirect ------------|-- state+verifier cookie
  |-- (user logs in at Google) -------------------------------->|
  |<-- redirect /auth/google/callback?code=xxx&state=yyy ------|
  |-- GET /auth/google/callback->|
  |                              |-- exchange code ------------>|
  |                              |<-- tokens + user info -------|
  |                              |-- UPSERT user
  |                              |-- INSERT session
  |<-- 302 redirect to frontend -|-- Set-Cookie: session=xxx
```

### Magic Link
```
Client                          Worker                    Resend
  |-- POST /auth/magic-link ---->|
  |   { email: "a@b.com" }      |-- generate token
  |                              |-- INSERT magic_link_tokens
  |                              |-- send email ------------->|
  |<-- { ok: true } ------------|                             |
  |                              |                             |-- email delivered
  |                              |                             |
  |-- (user clicks email link) --|                             |
  |-- GET /auth/verify?token=xxx>|
  |                              |-- hash & lookup token
  |                              |-- UPSERT user
  |                              |-- INSERT session
  |<-- 302 redirect to frontend -|-- Set-Cookie: session=xxx
```

---

## Notlar
- Tüm session token'lar SHA-256 ile hash'lenerek DB'de saklanır (raw token sadece cookie'de)
- Google OAuth PKCE flow kullanır (code_verifier cookie'de saklanır)
- Magic link token 15 dakika geçerli, tek kullanımlık
- Guest hesap sonradan Google/email ile upgrade edilebilir
- CORS: sadece `FRONTEND_URL` origin'e izin verilir
