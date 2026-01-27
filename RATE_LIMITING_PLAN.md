# Rate Limiting Plan (SlowAPI, no Redis) — Portfolio App

Goal: add **credible abuse protection** to the FastAPI backend using **SlowAPI** with **in-memory storage** (single-instance friendly), plus a clear path to Redis later.

## Why (portfolio signal)
- Prevent brute-force and signup spam on auth endpoints.
- Prevent reaction/write spam (likes/retweets/follows/media presign).
- Demonstrate “production thinking” (429 semantics, headers, proxy considerations).

## Constraints (v1)
- **No Redis** for now → limits are **per-process**, reset on restart, and do not coordinate across multiple workers/instances.
- This is acceptable for a **single Lightsail instance** running a single Uvicorn worker (current Dockerfile default), but must be documented as a tradeoff.

## Decisions
- Library: `slowapi`
- Strategy: **moving window** (sliding-window semantics; avoids fixed-window edge spikes)
- Storage: `memory://` (default)
- Rate limit key:
  - Prefer **per-user** when authenticated (e.g. `user:{id}`)
  - Fallback to **per-IP** when unauthenticated (e.g. `ip:{remote_addr}`)
- Error semantics:
  - Return **429 Too Many Requests**
  - Include `Retry-After` + `X-RateLimit-*` headers
  - Use a consistent JSON error shape (ideally RFC7807 “problem details”, aligned with the backend’s broader error semantics work)

## Proposed limits (real‑app style: global default + overrides)
Tune after basic UX testing; keep auth strict and writes moderate.

**Default (global, per-user else per-IP)**
- `120/minute` for all endpoints unless overridden below.

**Overrides — Auth (per-IP)**
- `POST /token`: `5/minute`
- `POST /users/` (register): `3/minute`

**Overrides — Writes (per-user, else per-IP)**
- `POST /posts/`: `15/minute`
- `PUT /posts/{post_id}`: `10/minute`
- `DELETE /posts/{post_id}`: `10/minute`
- `POST /posts/{id}/like|unlike`: `60/minute`
- `POST /posts/{id}/retweet|unretweet`: `30/minute`
- `POST /users/{id}/follow|unfollow`: `30/minute`
- `POST /media/presign`: `10/minute`
- `POST /media/{media_id}/complete`: `30/minute`
- `PUT /users/me/avatar`: `5/minute`
- `PUT /users/me/cover`: `5/minute`

**Optional stricter reads (only if needed)**
- `GET /users/me`: `60/minute`
- `GET /users/{username}/mutuals/preview`: `60/minute`
- `GET /users/discover/suggestions`: `60/minute`

## Implementation plan (no code yet)
1) **Dependency + configuration**
   - Add `slowapi` to `app/requirements.txt`.
   - Add settings toggles:
     - `RATE_LIMIT_ENABLED` (default true in prod, can disable in some dev/test contexts)
     - `RATE_LIMIT_STORAGE_URI` (default `memory://`, later `redis://...`)

2) **Limiter wiring (app-level)**
   - Instantiate a SlowAPI limiter with `default_limits=["120/minute"]` in `app/main.py` (or a small `app/rate_limit.py` module).
   - Add SlowAPI middleware.
   - Register a global exception handler for rate limit exceeded → returns 429 with consistent JSON + headers.

3) **Keying (per-user when possible)**
   - Ensure authenticated requests set `request.state.user` (or `request.state.user_id`) inside auth dependencies.
   - Implement limiter `key_func`:
     - if `request.state.user_id` exists → key by user
     - else → key by remote IP address

4) **Apply overrides to endpoints (not all)**
   - Decorate only the endpoints listed under **Overrides** (auth + writes, and optional stricter reads).
   - Everything else uses the global default limit.
   - If an overridden endpoint doesn’t currently accept a `Request` object, add it to the signature (should not affect the API contract).

5) **Local/dev ergonomics**
   - Keep limits enabled by default (so you can demonstrate it), but allow:
     - relaxed limits in dev (optional), or
     - a documented way to disable for load-testing.

6) **Tests (high-signal, minimal flakiness)**
   - Add 2–4 focused pytest tests:
     - `POST /token` exceeds limit → 429 + `Retry-After` header present
     - One write endpoint (e.g. `POST /posts/`) exceeds limit → 429
   - Keep tests deterministic:
     - Use a very small limit like `2/minute` in test configuration.
     - Avoid relying on wall-clock sleeps.

7) **Docs (portfolio-ready)**
   - Add a short section to `README.md`:
     - what endpoints are rate-limited
     - why `memory://` is OK for this deployment
     - limitations (multi-worker / multi-instance) + “upgrade to Redis” note
   - Add a checkbox item to `cleanup.md` under “Backend Credibility Upgrade” once implemented.

## Deployment notes (important)
- If you run **multiple Uvicorn workers** or scale the API to multiple containers, **in-memory limits won’t be shared** → effective limits multiply and protection becomes inconsistent. When scaling, switch to Redis.
- If the backend sits behind a reverse proxy/load balancer, ensure the app sees the **real client IP** (proxy headers), otherwise all users may appear as the proxy’s IP and get rate-limited together.

## Upgrade path (Redis later, low churn)
- Set `RATE_LIMIT_STORAGE_URI=redis://...`
- Keep the same per-endpoint limits and keying logic.
- Verify counters behave correctly across multiple workers/instances.
