# Social Media MVP

A small full-stack social feed demo: FastAPI + Postgres + Vite/React.
Includes posts, reactions, profiles, media uploads, and 2-level threaded comments.

## Quickstart (API + Postgres via Docker)
1) Create `.env` from the example:
   - macOS/Linux: `cp .env.example .env`
   - PowerShell: `Copy-Item .env.example .env`

2) Start the backend (API + DB):
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`

The API container runs `alembic upgrade head` automatically on startup.

3) Open API docs:
- `http://localhost:8000/docs`

## Tests (pytest)
Tests use Postgres. Easiest way is to run them in Docker:
- First time only (fresh volume): `docker compose down -v` then `docker compose up -d --build`
- Run tests: `docker compose --profile test run --rm test`

If you prefer running tests in the existing `api` container:
- `docker compose exec api python -m pytest -q`

## Frontend (Vite)
1) Create `frontend/.env` from the example:
   - macOS/Linux: `cp frontend/.env.example frontend/.env`
   - PowerShell: `Copy-Item frontend/.env.example frontend/.env`

2) Install deps + run dev server:
- `cd frontend`
- `npm install`
- `npm run dev`

3) Open the app:
- `http://localhost:5173`

If Vite errors with `Failed to resolve import "motion/react"`: run `npm install` again (your `node_modules` is out of sync with `frontend/package-lock.json`).

## Reset the database (dev)
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v`
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`

## Tradeoffs (intentional MVP choices)
- Auth is simple: access token stored in `localStorage` (no refresh tokens / rotation yet).
- Product scope is intentionally small: no notifications/search (yet).
- Infra stays minimal: no Redis/background jobs; media uses S3 presigned uploads.
- Feed is uncached (viewer-specific flags like likes/reposts make caching trickier).

## Rate limiting
This API uses SlowAPI with a **global default** limit of `120/minute`, and **stricter overrides** on auth + write endpoints (posts, reactions, media, follow, etc). When a limit is exceeded, the API returns `429 Too Many Requests` and includes `Retry-After`/rate-limit headers.

Current storage is `memory://` (in-process), which is appropriate for a single-instance demo but:
- limits reset on restart
- limits are not shared across multiple workers/instances

To scale beyond a single process, switch `RATE_LIMIT_STORAGE_URI` to Redis (e.g. `redis://...`).

## Release docs
- Pre-release gate checklist: `docs/cleanup.md`
- Step-by-step wiring + deploy: `docs/release-1.md`
