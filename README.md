# Social Media MVP (In progress)

## Quickstart (API + Postgres via Docker)
1) Create `.env` from the example:
- PowerShell: `Copy-Item .env.example .env`

2) Start the backend (API + DB):
- `docker compose up -d --build`

The API container runs `alembic upgrade head` automatically on startup.

3) Open API docs:
- `http://localhost:8000/docs`

## Frontend (Vite)
1) Create `frontend/.env` from the example:
- PowerShell: `Copy-Item frontend/.env.example frontend/.env`

2) Install deps + run dev server:
- `cd frontend`
- `npm install`
- `npm run dev`

3) Open the app:
- `http://localhost:5173`

## Reset the database (dev)
- `docker compose down -v`
- `docker compose up -d --build`

