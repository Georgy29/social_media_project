# Social Media MVP — PLAN.md (Working Execution Plan)

This is the source-of-truth checklist for building a portfolio-grade full-stack MVP.

## Target outcome (MVP)
A recruiter/teammate can:
- open a URL
- create an account / log in
- see a feed
- create/edit a post
- like/retweet
- refresh and see counts persist

And the repo has a README that explains how to run locally + the tradeoffs you chose.

## Milestone 0 — MVP contract + repo hygiene
Goal: lock the “shape” of the product so you stop reworking core decisions.

### Scope freeze (MVP)
Backend (must ship)
- [ ] Auth: register, login, `GET /users/me`
- [ ] Posts: create, feed (paginated), edit (owner only), delete
- [ ] Reactions: like/unlike, retweet/unretweet
- [ ] Feed includes: owner username + counts (likes/retweets)

Frontend (must ship)
- [ ] Login/Register page
- [ ] Feed page (list + counts)
- [ ] Create post UI
- [ ] Like/retweet buttons
- [ ] Basic loading/errors/toasts

Explicitly NOT MVP
- [ ] Comments
- [ ] Media uploads (images/videos)
- [ ] Redis
- [ ] PKCE/OIDC
- [ ] AI features


### API contract decisions (write down once)
- [ ] Decide which endpoint the frontend uses for the feed:
  - Option A (minimal change): use `GET /posts/with_counts/` - is main feed API 
- [ ] Standardize error semantics (when to return 401 vs 403 vs 404) and keep them consistent

## Milestone 1 — Full-stack MVP (local)
Goal: someone can run it locally and use the whole product end-to-end.

### Backend deliverables
- [ ] Add `GET /users/me` (returns current user)
- [ ] Introduce a small settings module (read `DATABASE_URL`, `SECRET_KEY`, token expiry, CORS origins)
- [ ] Alembic migrations:
  - [ ] initialize Alembic and wire to models
  - [ ] initial autogenerate migration
  - [ ] `upgrade head` works on a fresh DB
- [ ] Docker Compose (dev): Postgres + API
- [ ] Document DB reset workflow (drop + upgrade + seed)
- [ ] Optional polish (high signal, low time): structured error responses + consistent status codes

### Frontend deliverables
- [ ] Scaffold `frontend/`: Vite + React + TypeScript
- [ ] Tailwind + shadcn/ui
- [ ] TanStack Query for server state
- [ ] OpenAPI → TS types/client generation (repeatable script)
- [ ] Auth:
  - [ ] Register
  - [ ] Login (store token)
  - [ ] Route guard (redirect to login)
- [ ] Feed:
  - [ ] Fetch + render posts (owner + counts)
  - [ ] Create post
  - [ ] Edit post (only if owner + within window)
  - [ ] Like/unlike + retweet/unretweet

### README (must-have)
- [ ] Local run instructions (docker compose)
- [ ] Local URLs + example `.env`
- [ ] “Tradeoffs” section (what you intentionally skipped)
- [ ] Screenshots or short GIF

Definition of done
- `docker compose up` → open frontend → can register/login/post/like/retweet and see counts persist after refresh.

## Milestone 2 — Quality pass (tests + CI)
Goal: the repo looks like a teammate could safely work on it.

- [ ] Add ruff (or equivalent) + formatting
- [ ] Add pytest
- [ ] Add 8–12 high-signal tests:
  - [ ] register → login
  - [ ] create post → appears in feed
  - [ ] cannot edit/delete others’ post
  - [ ] like/unlike toggling and count changes
  - [ ] retweet/unretweet toggling and count changes
  - [ ] pagination sanity (limit/offset)
- [ ] GitHub Actions: lint + tests on every push/PR

## Milestone 3 — Deployable demo
Goal: public URLs exist and the README points to them.

- [ ] Choose hosting:
  - Frontend: Vercel/Netlify
  - Backend: Render/Railway
  - DB: hosted Postgres (Supabase or same platform)
- [ ] Add production env vars + CORS
- [ ] Add seed/demo account (optional)
- [ ] Update README with:
  - deployed URLs
  - demo credentials (if used)
  - known limitations (free-tier sleep/cold start)

## Phase 2 — Extras (portfolio “20% extra” lives here)
Pick 1–2 after Milestone 3.

### Product features
- [ ] User avatars
  - [ ] store `avatar_url` on user profile
  - [ ] `PATCH /users/me` to update avatar URL
  - [ ] serve a default placeholder when missing
- [ ] User profile page
  - [ ] `GET /users/{id}` or `GET /users/{username}`
  - [ ] show user info + their posts
  - [ ] follow/unfollow from profile
- [ ] Comments
  - [ ] comment model + endpoints
  - [ ] show under post + basic moderation (optional)
- [ ] Media attachments (images/videos)
  - [ ] upload flow via object storage (S3/R2/etc.)
  - [ ] store metadata in DB
  - [ ] render media in feed

### Backend credibility upgrades
- [ ] Refresh tokens + logout/revoke
- [ ] Rate limiting on auth + write endpoints
- [ ] Reactions hardening: make like/retweet idempotent (`PUT`/`DELETE`) and keep semantics consistent
- [ ] Role-based permissions (admin/mod)
- [ ] Observability: request IDs + structured logs

### AI (optional, one endpoint)
- [ ] Feature-flagged “moderate post content” OR “summarize feed”
- [ ] Rate limited + documented costs + safe fallback when AI unavailable
