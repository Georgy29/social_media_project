# Social Media MVP — Plan (Working Execution Checklist)

This is the source-of-truth checklist for building a portfolio-grade full-stack MVP.

Doc roles (avoid overlap):
- `milestones.md`: high-level roadmap
- `plan.md`: current execution checklist (this file)
- `cleanup.md`: pre-release gate checklist (short)
- `release-1.md`: detailed step-by-step wiring + deploy

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

Explicitly NOT MVP (v0 scope)
- [ ] Comments
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
- [x] “Tradeoffs” section (what you intentionally skipped)
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

## Milestone 1.5 — Wire remaining UI (profile/subscriptions/media)
Goal: ship backend endpoints + migrations needed by the UI you already started (Profile nav, Subscriptions tab, Upload CTA).

- [ ] Subscriptions feed (follow-based)
  - [x] Backend: extend `GET /posts/with_counts/` with a filter (e.g. `view=public|subscriptions`) and return only posts from users I follow (and optionally my own).
  - [x] Frontend: when “Subscriptions” tab is selected, pass the filter param and keep pagination working.

- [ ] Profile page + timeline
  - [x] Backend: `GET /users/{username}` (public profile + follower/following/post counts).
  - [x] Backend: `GET /users/{username}/timeline?skip&limit` (user posts + reposts, newest first).
  - [x] Frontend: add `/profile/:username` route and wire Profile nav to it.

- [ ] Media uploads (posts + avatars)
  - [x] Backend: add `media` table + Alembic migration.
  - [x] Backend: `POST /media/presign` (auth) returning `{ media_id, upload_url, public_url }`.
  - [x] Backend: `POST /media/{media_id}/complete` (auth) to mark media ready.
  - [x] Backend: posts accept optional `media_id` and feed includes optional `media_url`.
  - [x] Backend: `PUT /users/me/avatar` to set avatar (`media_id`-based).
  - [x] Backend: `PUT /users/me/cover` to set profile cover (`media_id`-based).
  - [x] Frontend: implement post image upload: choose file → presign → PUT upload_url → complete → create post (media_id).
  - [ ] Frontend: implement avatar upload: presign → PUT upload_url → complete → `PUT /users/me/avatar`.
  - [ ] Frontend: implement cover upload: presign → PUT upload_url → complete → `PUT /users/me/cover`.

## Milestone 1.6 — Frontend wiring for Media + Profile (Release 1)
Goal: ship the first “portfolio release” with media + a real profile page.

- [ ] Regenerate OpenAPI TS types (`frontend/openapi.json` → `frontend/src/api/types.ts`)
- [x] Wire feed “Subscriptions” tab to pass `view=subscriptions`
- [x] Render `media_url` in the post card UI (feed)
- [ ] Wire composer “Upload from device”:
  - [x] post image upload: presign(kind=post_image) → PUT → complete → create post(media_id)
  - [ ] avatar upload: presign(kind=avatar) → PUT → complete → `PUT /users/me/avatar`
  - [ ] cover upload: presign(kind=profile_cover) → PUT → complete → `PUT /users/me/cover`
- [x] Add a `/profile/:username` page using `GET /users/{username}`
- [x] Wire left nav “Profile” to `/profile/:username` (for me, use `/users/me` to find username)
- [x] Make non-wired UI honest:
  - [x] either hide Search/Settings or route them to “Coming soon” pages
  - [x] keep right sidebar (Trends/Who to follow) as static placeholder content for v1

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
- [ ] Seed/demo data (makes the project “tryable”)
  - [ ] Script: create demo users, posts, likes, reposts (and optional media)
  - [ ] Document “reset DB + seed” workflow in README

## Immediate fixes (do now)
- [ ] Fix encoding artifacts in UI strings (e.g., Loading... text, etc.)
- [ ] Fix reaction optimistic desync: invalidate feed/timeline onSettled (or treat 409 as success) so UI resyncs after failed like/repost toggles
- [ ] Add `/bookmarks` route placeholder or wire real page to avoid dead links
- [ ] Search page stub + backend query (or hide the nav item until wired)
- [ ] Add disabled Bookmarks + keep Search disabled (see `cleanup.md`)
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
  - [ ] Note: background jobs often imply eventual consistency (e.g., counters/feeds can lag briefly vs writes)
  - [ ] Add a simple job status endpoint if needed

### Nice-to-have backend “portfolio” features (optional list)
- [ ] Observability: request IDs + structured logs + Sentry/OpenTelemetry
- [ ] Search: Postgres full-text search for posts/users
- [ ] Email verification + password reset (token flow)
- [ ] Admin/moderation endpoints (delete/hide posts, ban users)

### AI (optional, one endpoint)
- [ ] Feature-flagged “moderate post content” OR “summarize feed”
- [ ] Rate limited + documented costs + safe fallback when AI unavailable
