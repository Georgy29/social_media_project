# Frontend

This repo's frontend lives in `frontend/` and is the UI for the FastAPI backend (OpenAPI at `/openapi.json`).

## Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui (design tokens + component primitives)
- TanStack Query (server-state)
- React Router (routing)
- OpenAPI types: `openapi-typescript`

## Run (local dev)
Prereqs: backend running on `http://localhost:8000` (see `README.md`).

1) Create `frontend/.env` from the example:
- PowerShell: `Copy-Item frontend/.env.example frontend/.env`

2) Start the frontend:
- `cd frontend`
- `npm install`
- `npm run dev`

Open: `http://localhost:5173`

## Environment variables
- `VITE_API_URL`: backend base URL (default is `http://localhost:8000` in `frontend/src/api/client.ts`)

## API contract (what the UI calls)
- Auth
  - `POST /users/` (register)
  - `POST /token` (login, OAuth2PasswordRequestForm)
  - `GET /users/me` (verify session)
- Feed
  - `GET /posts/with_counts/?skip=0&limit=10`
- Posts
  - `POST /posts/`
  - `PUT /posts/{post_id}` (10-min edit window)
  - `DELETE /posts/{post_id}`
- Reactions
  - `POST /posts/{post_id}/like` / `POST /posts/{post_id}/unlike`
  - `POST /posts/{post_id}/retweet` / `POST /posts/{post_id}/unretweet`

## Next wiring targets (UI exists / in progress)
These are the next backend contracts to add so the UI can be fully “real”:
- Subscriptions feed
  - Extend `GET /posts/with_counts/` with a filter param (e.g. `view=public|subscriptions`).
- Profile + timeline
  - `GET /users/{username}` (public profile + counts)
  - `GET /users/{username}/timeline?skip&limit`
- Media uploads (posts + avatars)
  - `POST /media/presign` (auth)
  - Posts accept optional `media_id` and feed includes `media_url`
  - `PUT /users/me/avatar` (recommend: `media_id`-based)

## OpenAPI -> TypeScript types
Generated file:
- `frontend/src/api/types.ts` (do not hand-edit)

Workflow (backend must be running):
- `cd frontend`
- `npm run api:pull`
- `npm run api:gen`

## Project structure
- `frontend/src/api/`
  - `client.ts`: fetch wrapper, base URL, auth header, error handling
  - `types.ts`: generated OpenAPI types
  - `endpoints.ts`: typed endpoint calls
  - `queries.ts`: TanStack Query hooks
- `frontend/src/pages/`: `Login.tsx`, `Register.tsx`, `Feed.tsx`
- `frontend/src/components/`: app components (cards/forms/etc)
- `frontend/src/components/ui/`: shadcn/ui components

## Auth approach (MVP)
- Access token is stored in `localStorage`.
- Requests attach `Authorization: Bearer <token>`.
- On `/users/me` returning 401: token is cleared and auth queries are reset.

## Editor + formatting
Recommended VS Code extensions:
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- Prettier - Code formatter (`esbenp.prettier-vscode`)
- ESLint (`dbaeumer.vscode-eslint`)
- EditorConfig for VS Code (`EditorConfig.EditorConfig`)

Notes:
- `frontend/.prettierrc` enables Tailwind class sorting.
- `frontend/eslint.config.js` configures lint rules.

## UI conventions
- Prefer shadcn/ui primitives (`Button`, `Card`, `Field`, etc.) and Tailwind utilities.
- Keep styling token-driven via `frontend/src/index.css` (CSS variables) instead of hard-coded colors.
