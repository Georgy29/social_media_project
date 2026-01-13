# Social Media MVP (In progress)

## Quickstart (Docker + Postgres)
1) Create `.env` from the example:
- PowerShell: `Copy-Item .env.example .env`

2) Start everything:
- `docker compose up -d --build`

The API container runs `alembic upgrade head` automatically on startup.

3) Open API docs:
- `http://localhost:8000/docs`

## Reset the database (dev)
- `docker compose down -v`
- `docker compose up -d --build`

