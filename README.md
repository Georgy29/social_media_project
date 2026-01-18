# Social Media MVP (In progress)

## Quickstart (API + Postgres via Docker)
1) Create `.env` from the example:
- PowerShell: `Copy-Item .env.example .env`

2) Start the backend (API + DB):
- `docker compose up -d --build`

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
- PowerShell: `Copy-Item frontend/.env.example frontend/.env`

2) Install deps + run dev server:
- `cd frontend`
- `npm install`
- `npm run dev`

3) Open the app:
- `http://localhost:5173`

If Vite errors with `Failed to resolve import "motion/react"`: run `npm install` again (your `node_modules` is out of sync with `frontend/package-lock.json`).

## Reset the database (dev)
- `docker compose down -v`
- `docker compose up -d --build`
