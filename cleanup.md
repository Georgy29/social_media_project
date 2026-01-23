# Cleanup Checklist (Pre-Release)

This file is the **single pre-release checklist** to get from “works on my machine” → “safe to deploy”.

Scope: **Release 1** (frontend + backend wiring + deploy). Source steps live in `RELEASE_1.md`; this is the short gating list.

## Decide Release Scope (fill in)
- Release name/tag: `release-1`
- Backend host: Lightsail ($5) + Docker Compose + Postgres
- Frontend host: Vercel/Netlify (static SPA)
- Include in Release 1:
  - [ ] Profile page (/profile/:username)
  - [ ] Profile timeline
  - [ ] Avatar upload
  - [ ] Cover upload
  - [ ] Avatar group (mutuals/suggestions)
  - [ ] Hover cards

## Release Blockers (must be green)

### Product flows (manual QA)
- [ ] Register → login → reach Feed
- [ ] Create text post → appears in feed
- [ ] Like/unlike → count persists after refresh
- [ ] Repost/undo repost → count persists after refresh
- [ ] Subscriptions tab: actually uses `view=subscriptions` and paginates
- [ ] Logout clears session and redirects

### Media (if in scope)
- [ ] Post image upload: presign → PUT → complete → create post(media_id)
- [ ] Avatar upload: presign → PUT → complete → `PUT /users/me/avatar`
- [ ] Cover upload: presign → PUT → complete → `PUT /users/me/cover`

### UI hygiene
- [ ] No dead navigation (Search/Settings/Bookmarks are disabled or routed to “Coming soon”)
- [ ] Disabled nav items:
  - [ ] Left sidebar: add Bookmarks (disabled/gray)
  - [ ] Left sidebar: keep Search (disabled/gray)
  - [ ] Right rail: Search card shows “Coming soon”
- [ ] No obvious encoding artifacts (`...` vs `\u2026`, broken quotes)
- [ ] Accessibility spot check: keyboard nav works, focus visible, skip link works

### Repo/documentation
- [ ] `README.md` has “Tradeoffs” section
- [ ] `README.md` includes screenshots/GIF (optional but high signal)
- [ ] Regenerate OpenAPI TS types (if backend contract changed): `frontend npm run api:pull && npm run api:gen`

## Deploy Checklist (Lightsail)

### Backend
- [ ] Create Lightsail Ubuntu instance
- [ ] Install Docker + Compose
- [ ] Add prod `.env` on server (never commit secrets)
- [ ] `docker compose up -d --build`
- [ ] Verify migrations ran (`alembic upgrade head`) and API is reachable
- [ ] Configure CORS (`CORS_ORIGINS`) to include deployed frontend domain

### S3
- [ ] S3 CORS allows deployed frontend origin
- [ ] Verify uploads work from deployed frontend

### Frontend
- [ ] Set `VITE_API_URL` to backend URL
- [ ] Deploy (Vercel/Netlify)
- [ ] Smoke test from public URL (auth + feed + mutations + media if in scope)

## Post-Release (nice-to-have)
- [ ] Seed/demo data (script + docs)
- [ ] Add CI (lint + pytest)
- [ ] Add minimal rate limiting on auth endpoints

## Backend Credibility Upgrade (pick 1 for MVP)

Recommendation for this project’s MVP: **rate limiting** (simple, high-signal, low-risk).

- [ ] Rate limiting (start simple, single-instance friendly)
  - [ ] Protect `/token` and `POST /users/` (brute-force + spam)
  - [ ] Protect write endpoints (posts/reactions/media presign)
  - [ ] Clear error responses (429 + retry guidance)

Skip for MVP:
- Feed caching (hard because feed includes viewer-specific flags like `is_liked`/`is_retweeted`; low ROI early)
- Swapping auth libraries (high churn, low demo value unless you need specific features)
