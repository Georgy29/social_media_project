# Feature: Bookmarks (X-style, MVP)

## Summary
Add per-user bookmarks for posts:
- toggle bookmark from the post card (feed + profile timeline)
- view a dedicated bookmarks page that lists bookmarked posts (newest bookmarked first)

Goal: minimal backend + minimal UI wiring, consistent with existing likes/retweets patterns.

## Product Decisions (MVP)
- Bookmarks are private (not shown on public profiles).
- A user can bookmark a post at most once.
- **Idempotent semantics**:
  - Create bookmark when already bookmarked => **204 no-op** (not 409).
  - Delete bookmark when not bookmarked => **204 no-op** (not 409).
- UI should disable the bookmark button while the mutation is in-flight to avoid spam requests/toasts.

## Backend

### DB schema
Table: `bookmarks`
- `user_id` (FK -> `users.id`, not null)
- `post_id` (FK -> `posts.id`, not null, `ondelete="CASCADE"`)
- `created_at` (timestamp with tz, default now)

Constraints / indexes
- Primary key: `(user_id, post_id)` (prevents duplicates)
- Index: `(user_id, created_at DESC)` (fast "my bookmarks" listing)

Relationships (include for future-proofing)
- Add `bookmarks` relationship on `User` and `Post`
- Use `back_populates` on `Bookmark.user` and `Bookmark.post`

### API (auth required)
Toggle endpoints
- `POST /bookmarks/{post_id}` -> 204
- `DELETE /bookmarks/{post_id}` -> 204

List endpoint
- `GET /bookmarks?skip&limit` -> list of bookmarked posts, newest first

### Response shapes
Update feed/timeline post shape (`PostWithCounts`) to include:
- `is_bookmarked: bool`

Bookmarks list response (MVP choice)
- Return `PostWithCounts[]` ordered by bookmark time
  - (Optional later: include `bookmarked_at` if we need it in UI)

### Query updates
Feed/timeline query:
- Add a `bookmarked_by_me` subquery (like existing `liked_by_me_subq`)
- Join it to set `is_bookmarked`

Bookmarks list query:
- Join `bookmarks -> posts -> users` (plus avatar/media as needed)
- Reuse the same count subqueries to keep `PostCard` rendering identical

## Frontend

### Data layer
- Add endpoints to `frontend/src/api/endpoints.ts` (or regen via OpenAPI)
- Add query hook:
  - `useBookmarksQuery({ skip, limit })`
- Add mutation hook:
  - `useToggleBookmarkMutation({ postId, nextState })`
- Query invalidation:
  - On bookmark toggle: invalidate feed + timeline + bookmarks list
  - Consider invalidating onSettled so optimistic UI cannot get stuck on errors

### UI
- Wire `PostCard` bookmark button to real state:
  - source of truth: `post.is_bookmarked`
  - optimistic toggle in component is OK, but must resync via invalidation
- Add `/bookmarks` route + page:
  - renders list of `PostCard` using `useBookmarksQuery`
  - empty state: "No bookmarks yet"

## Acceptance Criteria
- Toggling bookmark updates icon state and persists after refresh.
- Bookmarks page shows bookmarked posts, newest bookmarked first.
- Buttons do not error on double-click spam (idempotent backend).
- No cross-user leakage after logout/login (query cache cleared, already fixed).

## Test Checklist (high signal)
Backend (pytest)
- bookmark create returns 204
- bookmark create again returns 204 (idempotent)
- bookmark delete returns 204
- bookmark delete again returns 204 (idempotent)
- bookmarks list returns bookmarked posts in newest-first order
- `GET /posts/with_counts/` returns correct `is_bookmarked` for viewer

Frontend (manual)
- Toggle bookmark on feed, refresh, state persists
- Toggle bookmark on profile timeline, state persists
- Bookmarks page loads, pagination works if implemented

## Open Questions (confirm before coding)
- Do we want REST-style routes (`PUT/DELETE /posts/{id}/bookmark`) instead of `POST/DELETE /bookmarks/{id}`?
- Should bookmarks list return `PostWithCounts[]` or `{ items: [{ bookmarked_at, post }] }`?
- Do we want a left-nav item for Bookmarks now, or keep it hidden until the page exists?
