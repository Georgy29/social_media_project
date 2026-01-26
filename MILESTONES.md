# Social Media MVP — Milestones (Roadmap)

This file is the **high-level roadmap** (what exists, what ships next).
For day-to-day progress tracking, use `PLAN.md`. For release gating and deploy readiness, use `cleanup.md` + `RELEASE_1.md`.

## Target outcome (MVP)
A recruiter/teammate can:
- open a URL
- create an account / log in
- see a feed
- create/edit a post
- like/retweet
- refresh and see counts persist

And the repo has a README that explains:
- how to run locally
- what tradeoffs were chosen

Everything else is Phase 2+.

## Current state (already in this repo)
- [x] FastAPI app + routers wired up
- [x] Register user (`POST /users/`)
- [x] Login for JWT (`POST /token`)
- [x] Posts: create/read/edit (10-min window)/delete
- [x] Reactions: like/unlike, retweet/unretweet
- [x] Feed with counts + owner username (`GET /posts/with_counts/`)
- [x] Subscriptions feed filter (`GET /posts/with_counts/?view=public|subscriptions`)
- [x] Follow/unfollow users
- [x] `GET /users/me` (or equivalent "me" endpoint)
- [x] Public profile + timeline (`GET /users/{username}`, `GET /users/{username}/timeline`)
- [x] Media: presign/complete + post media + avatar/cover endpoints
- [x] README “Tradeoffs” section (local run instructions exist)
- [ ] Deploy + CI (below)

## Milestone 0 — Lock MVP scope

### Backend scope (freeze for MVP)
- [x] Auth: register, login, “me”
- [x] Posts: create, read feed (paginated), edit (owner only), delete (optional)
- [x] Reactions: like/unlike, retweet/unretweet
- [x] Feed response includes: owner username + counts (likes/retweets)

### Frontend scope (freeze for MVP)
Pages:
- [x] Login/Register
- [x] Feed (list + counts)

Components:
- [x] Create post (modal or inline)
- [x] Like/retweet buttons
- [x] Basic toasts/errors/loading states

### Explicitly NOT in MVP (Phase 2)
- [ ] Comments
- [ ] Redis
- [ ] PKCE/OIDC
- [ ] AI moderation

## Milestone 1 — Backend foundation pass

### 1.1 Alembic migrations (must-have)
Deliverables
- [x] Alembic initialized and working with SQLAlchemy models
- [x] `alembic revision --autogenerate` initial migration
- [x] `alembic upgrade head` works on a fresh DB
- [x] “Reset DB” workflow documented (drop + recreate + upgrade + seed)

Definition of done
- A teammate can clone, run one command, and the DB schema is correct.

### 1.2 Minimal Docker Compose (dev)
Deliverables
- [x] `docker compose up` brings up:
  - Postgres
  - API service
- [x] Environment variables managed via `.env` + `.env.example`

Definition of done
- No local Postgres install needed to run the backend.

### 1.3 Tests (small, strategic) + CI (high signal, low effort)
Test suite (8–12 tests)
- [ ] Auth: register → login
- [ ] Posts: create → appears in feed
- [ ] Permissions: cannot edit others’ post
- [ ] Like/unlike toggling works and count changes
- [ ] Retweet/unretweet toggling works and count changes
- [ ] Pagination sanity: limit/offset returns stable shapes

CI
- [ ] GitHub Actions running:
  - ruff (or equivalent lint)
  - pytest

Definition of done
- Every push runs checks automatically; one broken endpoint = red CI.

## Milestone 2 — Frontend MVP with OpenAPI-generated types

### 2.1 Frontend scaffolding
Deliverables
- [x] Vite + React + TypeScript
- [x] Tailwind set up
- [x] shadcn/ui installed
- [x] TanStack Query installed (recommended)

### 2.2 OpenAPI → TypeScript client (controlled, repeatable)
Deliverables
- [x] Repeatable script to:
  - fetch backend OpenAPI JSON
  - generate TypeScript types/client
- [x] Generated code committed (and regeneratable)

Example workflow (illustrative)
- `curl http://localhost:8000/openapi.json -o frontend/openapi.json`
- run generator (openapi-typescript / openapi-generator / etc.)

Definition of done
- Frontend does not hand-write request/response types.
- Changing an endpoint forces type changes (prevents drift).

### 2.3 UI scope (MVP)
Deliverables
- [x] Auth pages (login/register)
- [x] Feed page:
  - fetch feed
  - render posts + counts
- [x] Create post
- [x] Like/retweet buttons
- [x] Protected routes (basic guard)

Controlled LLM approach
- Generate one page at a time.
- Require the model to:
  - not invent endpoints
  - use generated types
  - keep diffs small (one feature per commit)

Rule: “LLM writes UI, I enforce contracts.”

## Milestone 2.5 — Wire remaining UI (profile/subscriptions/media)
Goal: backend contracts match the UI you’ve already started building.

- [x] Subscriptions feed (follow-based)
  - [x] Extend `GET /posts/with_counts/` with a filter param (e.g. `view=public|subscriptions`).
- [x] Profile page + timeline
  - [x] `GET /users/{username}` (public profile + counts)
  - [x] `GET /users/{username}/timeline?skip&limit`
- [x] Media uploads (posts + avatars)
  - [x] `POST /media/presign` (auth) + storage wiring
  - [x] Posts accept optional `media_id` and feed returns `media_url`
  - [x] `PUT /users/me/avatar`

## Milestone 3 — Deployable demo

Recommended demo topology
- Something not free to host all demos (all databases can be hosted in 1 thing)
- Frontend: Vercel/Netlify (static SPA)
- Backend: Render or Railway
- DB: Supabase Postgres (free tier) or hosted Postgres on same platform

Key realities to plan around
- Supabase free plan can pause after inactivity.
- Some backend hosts sleep on free tiers.

Definition of done
- [ ] Public URL exists for frontend + backend
- [ ] README includes:
  - local run (docker compose)
  - deployed URLs
  - demo credentials (if seeded demo user)
  - known limitations (cold start, free-tier pauses, etc.)

## Phase 2 backlog (after MVP is shipped)

### A) Security/auth upgrades (pick one at a time)
- [ ] Move auth to fastapi-users (if you want the structure + features)
- [ ] Refresh tokens (rotate, revoke on logout)
- [ ] Role/permission dependency helpers (admin/moderator)
- [ ] Rate limiting on auth endpoints (prevents brute force)

### B) OAuth2 / PKCE / OIDC (only when ready)
- [ ] Integrate with an external IdP (fastest “realistic”)
- [ ] OR implement PKCE flow properly (time-consuming; not MVP)

### C) Redis (choose ONE use-case first)
- [ ] Rate limiting counters
- [ ] Cache feed results (short TTL)
- [ ] Temporary tokens (email verification / reset)

### D) Product features (only after MVP)
- [ ] Comments
- [ ] Media attachments
- [ ] Notifications
- [ ] Search

### E) AI integration (one endpoint, optional)
High-signal if disciplined:
- [ ] “Moderate post content” (flag toxic/spam)
- [ ] “Summarize feed”

Rules
- [ ] Feature-flagged
- [ ] Rate limited
- [ ] Documented costs
- [ ] Safe fallback when AI unavailable

## Portfolio “20% extra” (pick 1–2 after MVP)
- [ ] Following feed (use `follows` table; show “real” feed logic)
- [ ] Rate limiting + structured error responses (429, problem details)
- [ ] One AI endpoint behind a feature flag (with cost/safety notes)
