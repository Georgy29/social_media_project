# Social Media MVP — Milestones

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
- [x] Follow/unfollow users
- [ ] `GET /users/me` (or equivalent “me” endpoint)
- [ ] README (local run + tradeoffs)
- [ ] Docker/Deploy/CI (below)

## Milestone 0 — Lock MVP scope

### Backend scope (freeze for MVP)
- [ ] Auth: register, login, “me”
- [ ] Posts: create, read feed (paginated), edit (owner only), delete (optional)
- [ ] Reactions: like/unlike, retweet/unretweet
- [ ] Feed response includes: owner username + counts (likes/retweets)

### Frontend scope (freeze for MVP)
Pages:
- [ ] Login/Register
- [ ] Feed (list + counts)

Components:
- [ ] Create post (modal or inline)
- [ ] Like/retweet buttons
- [ ] Basic toasts/errors/loading states

### Explicitly NOT in MVP (Phase 2)
- [ ] Comments
- [ ] Media uploads (images/videos)
- [ ] Redis
- [ ] PKCE/OIDC
- [ ] AI moderation

## Milestone 1 — Backend foundation pass

### 1.1 Alembic migrations (must-have)
Deliverables
- [ ] Alembic initialized and working with SQLAlchemy models
- [ ] `alembic revision --autogenerate` initial migration
- [ ] `alembic upgrade head` works on a fresh DB
- [ ] “Reset DB” workflow documented (drop + recreate + upgrade + seed)

Definition of done
- A teammate can clone, run one command, and the DB schema is correct.

### 1.2 Minimal Docker Compose (dev)
Deliverables
- [ ] `docker compose up` brings up:
  - Postgres
  - API service
- [ ] Environment variables managed via `.env` + `.env.example`

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
- [ ] Vite + React + TypeScript
- [ ] Tailwind set up
- [ ] shadcn/ui installed
- [ ] TanStack Query installed (recommended)

### 2.2 OpenAPI → TypeScript client (controlled, repeatable)
Deliverables
- [ ] Repeatable script to:
  - fetch backend OpenAPI JSON
  - generate TypeScript types/client
- [ ] Generated code committed OR generated in CI (pick one)

Example workflow (illustrative)
- `curl http://localhost:8000/openapi.json -o frontend/openapi.json`
- run generator (openapi-typescript / openapi-generator / etc.)

Definition of done
- Frontend does not hand-write request/response types.
- Changing an endpoint forces type changes (prevents drift).

### 2.3 UI scope (MVP)
Deliverables
- [ ] Auth pages (login/register)
- [ ] Feed page:
  - fetch feed
  - render posts + counts
- [ ] Create post
- [ ] Like/retweet buttons
- [ ] Protected routes (basic guard)

Controlled LLM approach
- Generate one page at a time.
- Require the model to:
  - not invent endpoints
  - use generated types
  - keep diffs small (one feature per commit)

Rule: “LLM writes UI, I enforce contracts.”

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
