# S3 Media Feature (Posts + Avatars + Thumbnails)

Goal: add image uploads without sending file bytes through FastAPI.

MVP constraints:
- Storage: AWS S3
- Media type: images only (`jpeg`, `png`, `webp`)
- Limits: posts max **5MB**, avatars max **2MB**
- Post attachments: **1 image per post**
- Serving: **public S3 URLs** (simplest + cheapest for portfolio)

---

## Phase 0 — Decisions (write once)

### Public vs private
We’re choosing **public URLs** for MVP:
- Backend returns a stable `public_url` to store in DB and return in feeds.
- Anyone with the URL can view the image.

Later upgrade (optional): private S3 + CloudFront + signed URLs (more setup).

### Object key strategy
Use a random key to avoid guessing:
- Example: `media/{user_id}/{media_id}/{uuid}.{ext}`

---

## Phase 1 — AWS setup (S3 + IAM) (30–60 min)

### 1) Create S3 bucket
- Region: same region you’ll deploy Lightsail to (to keep latency/cost down).
- Block Public Access:
  - For MVP public images you may need to **allow public reads**. Keep it scoped:
    - Prefer “public read only for a specific prefix” (e.g. `public/`).

### 2) Bucket CORS (for browser uploads)
Add CORS to allow `PUT` from your frontend origin(s):
- Allowed origins: `http://localhost:5173` (and your deployed frontend domain later)
- Allowed methods: `PUT`, `GET`, `HEAD`
- Allowed headers: `*`
- Expose headers: `ETag`

### 3) Public read policy (MVP option)
If you serve images publicly, set a bucket policy for read access only for a prefix:
- Put uploaded objects under `public/` and allow `s3:GetObject` for `public/*`.
- Keep the bucket policy *read-only*; uploads must still require presigned URLs.

### 4) IAM user for API server
Create an IAM user with **least privilege**:
- Allow:
  - `s3:PutObject` (upload)
  - `s3:GetObject` (used for `HEAD`/verification too)
  - `s3:DeleteObject` (optional, cleanup)
- Scope to `arn:aws:s3:::YOUR_BUCKET/public/*` (or your chosen prefix).

Save credentials for the API server:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

Budget notes:
- S3 cost stays low if you enforce size limits + only store images.
- Add lifecycle rules later if you want auto-expire orphaned uploads.

---

## Phase 2 — Backend schema + migrations (30–60 min)

### 1) Add a `media` table
Suggested columns:
- `id` (int PK)
- `owner_id` (FK users.id, required)
- `kind` (`post_image` | `avatar`)
- `status` (`pending` | `ready`)
- `bucket` (string)
- `object_key` (string, unique)
- `content_type` (string)
- `size_bytes` (int)
- `public_url` (string) — computed at creation time
- `created_at` (datetime)

### 2) Link media to posts/users
- `posts.media_id` nullable FK → `media.id`
- `users.avatar_media_id` nullable FK → `media.id`

### 3) Alembic migration
- Create `media` table
- Add nullable FK columns + indexes

---

## Phase 3 — Backend storage module (S3 presign + verify) (1–2 hrs)

### 1) Add settings (`.env`)
New env vars:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `S3_PUBLIC_BASE_URL` (optional; otherwise compute from bucket+region)
- `S3_PUBLIC_PREFIX` (default `public/`)
- `MEDIA_MAX_BYTES_POST` (default `5242880`)
- `MEDIA_MAX_BYTES_AVATAR` (default `2097152`)

### 2) Storage helper (one place for AWS calls)
Create something like `app/storage/s3.py`:
- `create_presigned_put_url(bucket, key, content_type, expires_seconds)`
- `head_object(bucket, key)` to verify upload and read `ContentLength`/`ContentType`
- `public_url(bucket, key)` helper

Keep API code clean: routers call the storage helper, not boto3 directly.

Note: a presigned `PUT` URL can’t reliably enforce file size by itself. Always validate:
- client-declared `size_bytes` at presign time (fast)
- actual `ContentLength` at complete time (real check)

---

## Phase 4 — Backend API endpoints (2–4 hrs)

### 1) `POST /media/presign` (auth)
Input:
- `filename` (optional; used only for extension)
- `content_type`
- `size_bytes`
- `kind` (`post_image` | `avatar`)

Validation (before presign):
- `content_type` allowlist: `image/jpeg`, `image/png`, `image/webp`
- size limit based on `kind`

Behavior:
- Create `media` row with `status="pending"` + generated `object_key`
- Generate `upload_url` (presigned PUT, short expiry like 5 minutes)
- Return:
  - `media_id`
  - `upload_url`
  - `public_url`

### 2) `POST /media/{media_id}/complete` (auth)
Why: prevents attaching a non-existent object, and verifies size/type.

Behavior:
- Check media exists and belongs to current user
- `HEAD` the S3 object:
  - ensure it exists
  - ensure `ContentLength <= limit`
  - ensure `ContentType` matches allowlist
- Mark `status="ready"`

### 3) Posts: accept optional `media_id`
Update `POST /posts/`:
- Allow `media_id` in `PostCreate`
- On create:
  - verify media exists
  - verify `owner_id == current_user.id`
  - verify `kind == post_image`
  - verify `status == ready`

Update feed response (`PostWithCounts`):
- Add optional `media_url`

### 4) Avatars
Add `PUT /users/me/avatar`:
- Body: `{ "media_id": ... }` (or `{ "media_id": null }` to clear)
- Validate media belongs to current user, `kind==avatar`, `status==ready`

Update profile responses:
- Add optional `avatar_url` to:
  - `GET /users/me`
  - `GET /users/{username}`
  - Feed post owner (optional, later)

---

## Phase 5 — Thumbnails (Phase 2 feature) (half day+)

MVP shortcut:
- Store only the original image.
- Frontend constrains display size (CSS) and uses `loading="lazy"`.

“Real app” version:
- Generate thumbnails after upload completion:
  - sizes: `128`, `512`, `1024` (webp)
- Store variants:
  - Option A: `media.thumbs_json` (map size → url)
  - Option B: new `media_variants` table (`media_id`, `size`, `object_key`, `url`)

Processing approach:
- Add a background worker (Celery/RQ/arq) on the same Lightsail instance.
- On `complete`, enqueue thumbnail job.
- Frontend uses `thumb_512_url` for feed and `original_url` for lightbox.

---

## Phase 6 — Tests (high signal)

Key tests to add:
- Cannot presign without auth
- Rejects invalid `content_type`
- Rejects oversize `size_bytes`
- `complete` fails if object missing
- Cannot attach media that:
  - belongs to another user
  - is still `pending`
  - is the wrong `kind`

Testing strategy (keep CI simple):
- Wrap S3 operations behind a small interface and mock it in tests.
- Don’t require real AWS credentials in CI.

---

## Phase 7 — Local dev + deploy (when ready)

### Local dev
- Keep using Docker compose for DB + API.
- Use real S3 for uploads (simple), or add MinIO later if you want offline dev.

### Deploy (Lightsail)
Do after endpoints are stable and tests pass locally:
- Create Lightsail instance ($5/mo)
- Run docker compose with production env vars
- Set S3 creds + bucket env vars
- Confirm uploads from deployed frontend work (CORS + HTTPS origins)

---

## Phase 8 — Wiring + frontend sync (small but easy to forget)

Backend wiring:
- Add the `media` router to `app/main.py` so the endpoints appear in `/docs`.

Frontend sync:
- After the backend endpoints are in place, regenerate OpenAPI types:
  - `cd frontend && npm run api:pull && npm run api:gen`

---

## Checklist (MVP “done”)
- [ ] Create S3 bucket + CORS
- [ ] Add IAM user with least privilege
- [ ] Add `media` table + migrations
- [ ] Add `/media/presign` + `/media/{id}/complete`
- [ ] Posts accept `media_id` and feed returns `media_url`
- [ ] Add avatar endpoint + profile returns `avatar_url`
- [ ] Add mockable S3 layer + tests for permissions/validation
