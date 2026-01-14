# Frontend Plan (MVP)

## Goal
Ship a small, clean React UI that demonstrates:
- auth (register/login)
- feed with counts
- create/edit/delete post
- like/retweet

## Extentions 

Tailwind CSS IntelliSense (autocomplete + class validation + hover preview)
Prettier + prettier-plugin-tailwindcss (auto-sorts Tailwind classes)
ESLint (plus React/TS rules) to keep diffs clean
Backend is the source of truth (FastAPI OpenAPI).

## Stack
- React + TypeScript (Vite)
- TailwindCSS
- shadcn/ui (component primitives)
- TanStack Query (server-state)
- Router: React Router

## API Contract (what frontend calls)
- Auth
  - `POST /users/` (register)
  - `POST /token` (login, OAuth2PasswordRequestForm)
  - `GET /users/me` (verify session)
- Feed
  - `GET /posts/with_counts/?skip=0&limit=10` (auth-required; includes counts + `is_liked`/`is_retweeted`)
- Posts
  - `POST /posts/`
  - `PUT /posts/{post_id}` (10-min edit window)
  - `DELETE /posts/{post_id}`
- Reactions
  - `POST /posts/{post_id}/like|unlike`
  - `POST /posts/{post_id}/retweet|unretweet`

## OpenAPI → TypeScript types (types-only)
Tool: `openapi-typescript`.

### Output
- Generate into `frontend/src/api/types.ts` (read-only file; regenerated from OpenAPI).

### Scripts (planned)
- `api:pull`: download OpenAPI JSON from the running backend
- `api:gen`: generate TS types from that JSON

## Directory plan
- `frontend/`
  - `src/api/`
    - `client.ts` (fetch wrapper: base URL, auth header, error handling)
    - `types.ts` (generated)
    - `endpoints.ts` (thin typed functions that call `client.ts`)
    - `queries.ts` (TanStack Query hooks)
  - `src/pages/`
    - `Login.tsx`
    - `Register.tsx`
    - `Feed.tsx`
  - `src/components/`
    - `PostCard.tsx`
    - `CreatePost.tsx`
    - `EditPostDialog.tsx`

## Auth approach (MVP)
- Store access token in `localStorage` (simple)
- `apiFetch` attaches `Authorization: Bearer <token>`
- On app start:
  - if token exists, call `/users/me`
  - if 401, clear token and redirect to login

## UI requirements
- Use shadcn/ui components (Button, Card, Dialog, Input, Toast/Sonner)
- Tailwind utilities only (no bespoke CSS files)
- Mobile-first layout
- Clear empty/error/loading states

## Milestone A — Scaffold + tooling
- [ ] Create `frontend/` (Vite React TS)
- [ ] Add Tailwind
- [ ] Add shadcn/ui
- [ ] Add TanStack Query + React Router
- [ ] Add env var `VITE_API_URL` (ex: `http://localhost:8000`)

## Milestone B — API types + client
- [ ] Add `openapi-typescript`
- [ ] Add `api:pull` and `api:gen` scripts
- [ ] Implement `apiFetch` with:
  - base URL
  - auth header
  - JSON parsing
  - consistent error objects

## Milestone C — Auth pages
- [ ] Install shadcn primitives: Card, Button, Input, Label, Sonner
- [ ] Login page (useLoginMutation; disable submit while pending; toast on error; redirect to `/feed`)
- [ ] Register page (useRegisterMutation; disable submit while pending; redirect to `/login`)
- [ ] Auth bootstrap: mount useMeQuery on app start; on 401 clear token + remove `['me']` + redirect
- [ ] Route guards: RequireAuth uses useMeQuery (loading → spinner; 401/no user → `/login`); RequireGuest redirects authed users away from `/login` and `/register`

## Milestone D — Feed MVP
- [ ] Fetch feed from `/posts/with_counts/`
- [ ] Render list (content, owner username, timestamp, counts)
- [ ] Create post
- [ ] Edit post (disable/hide if not owner; show message if edit-window expired)
- [ ] Delete post (confirm dialog)
- [ ] Like/retweet buttons

## Milestone E — Polish
- [ ] Loading skeletons
- [ ] Empty-state copy
- [ ] Basic optimistic updates (optional)
- [ ] README section for frontend run

## Questions / concerns (confirm before building)
- Token storage: use `localStorage` for MVP.
- Base URL: backend runs in Docker on `http://localhost:8000` for dev; confirm.
- CORS: ensure backend allows `http://localhost:5173`.
- Feed pagination: use `skip/limit`.
- Post edit window: show countdown/tooltip or just error toast?
- Auth hardening (after MVP): on `/users/me` error, clear token and redirect to login.
- Reactions hardening (after MVP): disable buttons while mutations are in-flight; consider optimistic toggles; consider switching backend reactions to idempotent `PUT/DELETE` (instead of `POST like/unlike`) and add rate limiting.
- Feed pagination (note): current `useFeedQuery({ skip, limit })` is page-based offset pagination; infinite scroll would require `useInfiniteQuery` + page appending, and ideally backend cursor pagination.
