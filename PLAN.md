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
- [x] Auth: register, login, `GET /users/me`
- [x] Posts: create, feed (paginated), edit (owner only), delete
- [x] Reactions: like/unlike, retweet/unretweet
- [x] Feed includes: owner username + counts (likes/retweets)

Frontend (must ship)
- [x] Login/Register page
- [x] Feed page (list + counts)
- [x] Create post UI
- [x] Like/retweet buttons
- [x] Basic loading/errors/toasts

Explicitly NOT MVP
- [ ] Comments
- [ ] Media uploads (images/videos)
- [ ] Redis
- [ ] PKCE/OIDC
- [ ] AI features


### API contract decisions (write down once)
- [x] Decide which endpoint the frontend uses for the feed:
  - Option A (minimal change): use `GET /posts/with_counts/` - is main feed API 
- [ ] Standardize error semantics (when to return 401 vs 403 vs 404) and keep them consistent

## Milestone 1 — Full-stack MVP (local)
Goal: someone can run it locally and use the whole product end-to-end.

### Backend deliverables
- [x] Add `GET /users/me` (returns current user)
- [x] Introduce a small settings module (read `DATABASE_URL`, `SECRET_KEY`, token expiry, CORS origins)
- [x] Alembic migrations:
  - [x] initialize Alembic and wire to models
  - [x] initial autogenerate migration
  - [x] `upgrade head` works on a fresh DB
- [x] Docker Compose (dev): Postgres + API
- [x] Document DB reset workflow (drop + upgrade + seed)
- [ ] Optional polish (high signal, low time): structured error responses + consistent status codes

### Frontend deliverables
- [x] Scaffold `frontend/`: Vite + React + TypeScript
- [x] Tailwind + shadcn/ui
- [x] TanStack Query for server state
- [x] OpenAPI → TS types/client generation (repeatable script)
- [x] Auth:
  - [x] Register
  - [x] Login (store token)
  - [x] Route guard (redirect to login)
- [x] Feed:
  - [x] Fetch + render posts (owner + counts)
  - [x] Create post
  - [x] Edit post (only if owner + within window)
  - [x] Like/unlike + retweet/unretweet

### README (must-have)
- [x] Local run instructions (docker compose)
- [x] Local URLs + example `.env`
- [ ] “Tradeoffs” section (what you intentionally skipped)
- [ ] Screenshots or short GIF

### UI polish (optional, high-signal)
- [x] X-like layout (left nav + center feed + right sidebar on xl; hide right under xl)
- [x] Left nav: profile card + Feed/Profile/Search + Settings anchored at bottom
- [x] Composer modal and tuned CreatePost sizing
- [x] Post actions dropdown + delete confirmation dialog
- [x] Build notes accordion (shadcn/ui)
- [ ] Bookmarks page + persisted bookmarks

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

## Phase 2 — Portfolio Upgrades (“20% harder”)
Pick 1 product feature + 1 backend credibility upgrade.

### Product features (high signal)
- [ ] Bookmarks (persisted)
  - [ ] Backend: add `POST /bookmarks/{post_id}` + `DELETE /bookmarks/{post_id}`
  - [ ] Backend: `GET /bookmarks?skip&limit` to power a bookmarks page
  - [ ] Frontend: `/bookmarks` route + real toggle state per post
- [ ] Avatar system (no uploads yet)
  - [ ] DB: add `users.avatar_kind` + `users.avatar_value` (or `users.avatar_key`)
  - [ ] Static assets: ship a pool of animal PNGs (server-hosted)
  - [ ] `GET /avatars` (public): list available avatar keys + URLs (+ optional gradients list)
  - [ ] Register flow: allow choosing avatar (either in `UserCreate` or via `PUT /users/me/avatar`)
  - [ ] Frontend: register page fetches `/avatars`, user chooses gradient/animal; show avatar in UI
- [ ] Profile page + timeline (posts + reposts)
  - [ ] `GET /users/{username}` (public): profile + counts
  - [ ] `GET /users/{username}/timeline?skip&limit`: return user posts + reposts of others
  - [ ] Frontend: left nav item “Profile”; profile view with tabs “Posts / Reposts”
- [ ] Media uploads (portfolio path: presigned, not multipart)
  - [ ] Add MinIO to `docker-compose.yml` for local S3-compatible storage
  - [ ] DB: `media` table (id, owner_id, storage_key, public_url, mime, size, created_at, status)
  - [ ] `POST /media/presign` (auth): returns `{ media_id, upload_url, public_url }`
  - [ ] Optional: `POST /media/{id}/complete` to verify object exists and mark ready
  - [ ] Posts: allow attaching optional `media_id` (start with 1 image per post)
  - [ ] Frontend: CreatePost supports selecting image → presign → upload → create post
  - [ ] Storage abstraction: `STORAGE_BACKEND=local|minio|imagekit` (same API, different implementation)
  - [ ] Optional thumbnails: generate + store thumbnail URLs
- [ ] Seed/demo data (makes the project “tryable”)
  - [ ] Script: create demo users, posts, likes, reposts (and optional media)
  - [ ] Document “reset DB + seed” workflow in README

## Immediate fixes (do now)
- [ ] Fix encoding artifacts in UI strings (e.g., Loading... text, etc.)
- [ ] Add `/bookmarks` route placeholder or wire real page to avoid dead links
- [ ] Search page stub + backend query (or hide the nav item until wired)
- [ ] Verify animate-ui usage is limited to alert dialogs; keep shadcn as the default UI set

### Backend credibility upgrades (pick 1–2)
- [ ] Rate limiting (Redis-backed)
  - [ ] Protect `/token`, `/users/`, and write endpoints (posts, reactions, media presign)
  - [ ] Add per-IP + per-user limits and clear error responses
- [ ] Reactions hardening (idempotent semantics + spam safety)
  - [ ] Switch to `PUT /posts/{id}/like` + `DELETE /posts/{id}/like` (same for repost)
  - [ ] Frontend: disable buttons while mutations are in-flight; optional optimistic toggles later
- [ ] Background jobs (for “real backend” feel)
  - [ ] Add a worker (RQ/Celery/arq) for thumbnails / cleanup / email
  - [ ] Add a simple job status endpoint if needed

### Nice-to-have backend “portfolio” features (optional list)
- [ ] Observability: request IDs + structured logs + Sentry/OpenTelemetry
- [ ] Search: Postgres full-text search for posts/users
- [ ] Email verification + password reset (token flow)
- [ ] Admin/moderation endpoints (delete/hide posts, ban users)

### AI (optional, one endpoint)
- [ ] Feature-flagged “moderate post content” OR “summarize feed”
- [ ] Rate limited + documented costs + safe fallback when AI unavailable
