# Backend Plan (Always-On, ≤ $10/month target)

This plan keeps the backend **always running** (“no sleep”) while staying as close as possible to **≤ $10/month** by minimizing managed services.

## Hosting choice (fits the budget)
**Recommended:** one small VPS + S3
- **Compute + API + DB:** AWS **Lightsail** $5/mo instance running Docker Compose (FastAPI + Postgres).
- **Media:** AWS **S3** for uploads (presigned URLs).
- **Optional later:** CloudFront in front of S3 for image caching (cheap at low traffic).

Why this fits the budget:
- Managed DBs (RDS/Supabase paid/Render Postgres) usually push you above $10/month by themselves.
- A single always-on VPS is the cheapest “always-on” path that still looks credible if documented well.

Budget reality check (tiny demo, <50 users/week):
- Lightsail: **~$5/mo** fixed
- S3: typically **cents–few dollars** (use lifecycle rules + size limits)
- Domain: optional **~$1–$15/yr** depending on TLD

## Phase 1 (small + complete, no DB migrations)
### 1) Subscriptions feed
**Endpoint**
- Extend `GET /posts/with_counts` with `view=public|subscriptions`.
**Behavior**
- `subscriptions` returns posts by `(me + users I follow)` newest-first.
**Why**
- Small change, immediate product realism, no schema changes.

### 2) Profile + combined timeline (Option 1: posts + reposts)
**Endpoints**
- `GET /users/{username}` (profile + counts)
- `GET /users/{username}/timeline?skip&limit` (interleaved posts + reposts ordered by activity time)
**Why**
- Strong “social app” signal, still no schema changes.

## Phase 2 (media + moderation + credibility)
### 3) Minimal moderation (demo hygiene)
**Endpoint**
- `DELETE /admin/posts/{id}` (admin-only)
**DB**
- Add `posts.is_deleted` (soft delete) + hide deleted posts from feeds.
**Why**
- Prevents demo abuse without building a full moderation system.

### 4) Media foundation (S3 presign)
**DB**
- New `media` table
- `posts.media_id` (start with one image per post)
- `users.avatar_media_id`
**Endpoints**
- `POST /media/presign` → `{ media_id, upload_url, public_url }`
- `POST /media/{media_id}/complete` (verify object exists, mark ready)
- `PUT /users/me/avatar` body `{ media_id }`
- Extend `POST /posts/` to accept optional `media_id`
**Why**
- Presign keeps your API server out of the file-byte path and scales cleanly.

### 5) Thumbnails (background job)
**Approach**
- Background worker generates a few sizes (e.g. 128/512/1024) and stores them in S3.
**Why**
- “Intermediate” backend signal; improves UX and performance.

### 6) Rate limiting + request IDs + structured logs
**Rate limiting**
- Start simple (in-process) while on one instance, then upgrade to Redis when you actually need multi-instance scaling.
**Observability**
- Add `X-Request-Id` middleware + structured JSON logs.
**Why**
- Highest “backend credibility” per hour spent.

## Caching (what’s worth it for this project)
At low traffic, skip API response caching early because feed results include user-specific flags (`is_liked`, `is_retweeted`).
**Best ROI cache:** images
- Once media exists, put **CloudFront** in front of S3 to cache images cheaply.

## Frontend sync (later, after API stabilizes)
After Phase 1 endpoints are final:
- Pull OpenAPI JSON and regenerate TS types/client (your `api:pull` + `api:gen` flow).

