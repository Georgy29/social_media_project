# Release 1 — Frontend Wiring + Deploy (Step-by-step)

Goal: take the backend you already shipped (auth + posts + S3 media + avatar + cover) and wire the frontend so the app is usable end-to-end, then deploy it on a $5 Lightsail instance.

This doc is intentionally strict and sequential. Finish steps in order.

---

## Part A — Local “Release 1” wiring (frontend)

### A0) Preconditions
- Backend running at `http://localhost:8000` (`docker compose up -d --build`)
- Frontend running at `http://localhost:5173` (`cd frontend && npm install && npm run dev`)
- S3 env vars present in repo-root `.env` and loaded by the API container.

### A1) Regenerate OpenAPI TS types (do this first)
In `frontend/`:
- `npm run api:pull`
- `npm run api:gen`

This ensures frontend types include:
- `media_url` on posts
- `owner_avatar_url` on posts/timeline
- `avatar_url` and `cover_url` on users
- media presign/complete schemas

### A2) Add frontend API functions for media + profile
In `frontend/src/api/endpoints.ts` add endpoint wrappers for:
- `POST /media/presign`
- `POST /media/{media_id}/complete`
- `PUT /users/me/avatar`
- `PUT /users/me/cover`

Rule: these should be thin wrappers around `apiFetch`.

### A3) Add one shared upload helper (browser → S3)
Create a helper (new file is fine) that does:
1) `presign(kind, content_type, size_bytes)` → get `{ media_id, upload_url }`
2) `PUT upload_url` with:
   - `headers: { "Content-Type": file.type }`
   - `body: file`
3) `complete(media_id)`
4) return `media_id` (and/or `public_url`)

Notes:
- If the PUT returns “Request has expired”, re-run presign.
- The `Content-Type` sent in PUT must match the one used for presign.

### A4) Wire “Upload from device” for post images
Target: the composer modal in `frontend/src/pages/Feed.tsx` + `CreatePost`.

Minimal UX for v1:
- File picker (accept jpeg/png/webp)
- Upload on submit (or upload immediately after selection)
- On success: create post with `{ content, media_id }`
- Show errors in toast (Sonner)

### A5) Render post image in the feed
Target: `frontend/src/components/PostCard.tsx`

If `post.media_url` is present:
- Render an `img` below the post content.
- Keep it responsive (`w-full`, `rounded`, `object-cover`).

This is what makes media “real” in the UI.

### A6) Make Subscriptions tab actually work
Target: `frontend/src/pages/Feed.tsx`

Currently `feedView` exists but the query doesn’t pass it.
Update `getFeed`/`useFeedQuery` usage to pass:
- `view=public` or `view=subscriptions`

### A7) Add a Profile page (minimal but real)
Add a new page, e.g. `frontend/src/pages/Profile.tsx`:
- Load profile by username: `GET /users/{username}`
- Display:
  - avatar (`avatar_url`)
  - cover (`cover_url`) as a header image
  - counts (followers/following/posts)

Then add routing in `frontend/src/App.tsx`:
- `Route path="/profile/:username" element={<RequireAuth><ProfilePage /></RequireAuth>}`

### A7b) Add a Profile timeline (posts + reposts)
Backend:
- Update `GET /users/{username}/timeline` to return `PostWithCounts` with:
  - `media_url`
  - `is_liked` and `is_retweeted` for the current viewer
  - `owner_avatar_url`

Frontend:
- Render timeline items using `PostCard` on the Profile page.
- Optional: add client-side filters (All / Posts / Reposts).

### A8) Wire avatar + cover upload UI
On Profile page add:
- “Change avatar” button → upload flow with `kind="avatar"` → `PUT /users/me/avatar`
- “Change cover” button → upload flow with `kind="profile_cover"` → `PUT /users/me/cover`

V1 behavior:
- only allow changing your own profile (use `/users/me` to find username and gate the buttons)

### A9) Make “fake UI” honest (avoid dead clicks)
Right now some UI is placeholder (this is OK for a portfolio demo), but it must be honest:
- Left nav:
  - “Profile” should navigate to `/profile/:username`
  - “Search” and “Settings” should either:
    - be disabled, or
    - navigate to simple “Coming soon” pages
- Right sidebar:
  - Trends / Who to follow can remain static placeholder content for v1.

### A10) Local QA checklist (manual)
- Register + login
- Create a text-only post
- Upload an image post (presign → PUT → complete → post)
- Verify image renders in feed
- Upload avatar + cover, verify Profile page updates
- Verify profile timeline renders posts/reposts (including images)
- Verify like/unlike and repost/undo repost work in the profile timeline
- Verify profile timeline filters (All/Posts/Reposts) behave as expected
- Switch “Public feed” vs “Subscriptions” and confirm query param changes

### A11) Profile bio + follow state + cover card
Reference `features/hover-card.md` (bio + follow state + hover card) and `features/avatar-group.md` (shared suggestions avatar group) and implement the steps listed there.

---

## Part B — Deploy (Lightsail)

Do this only after Part A is stable locally.

### B1) What to deploy
Budget-first topology:
- Backend + Postgres on one Lightsail instance ($5/mo)
- Media: S3 (already)
- Frontend: Vercel/Netlify (recommended for speed)

### B2) Lightsail steps (high level)
1) Create instance (Ubuntu) in same AWS region as S3 (or close).
2) Install Docker + Docker Compose.
3) Clone repo on the instance.
4) Create `.env` on the server (never commit real secrets).
5) Run:
   - `docker compose up -d --build`
6) Confirm API:
   - `http://SERVER_IP:8000/docs`

### B3) Production env + CORS
- Set `CORS_ORIGINS` to include:
  - your frontend domain (https)
  - your API domain/IP (optional)
- Update S3 CORS AllowedOrigins to include your deployed frontend domain.

### B4) Frontend deploy
1) Set `VITE_API_URL` to your backend URL.
2) Deploy.
3) Confirm uploads work from deployed frontend (CORS + https origin).

---

## Suggested time budget (realistic)
- Frontend wiring (A1–A9): ~6–12 hours total
- Deploy + debug (B1–B4): ~2–6 hours

If you focus, this is a solid 1–2 weekend “Release 1”.
