# Feature Plan: Comments (VK-style Threads, X-style Navigation)

## Goal
Implement a comments system for a social media app:
- X-style layout/navigation (feed in center, sidebars left/right; clicking a post navigates to a post detail route).
- VK-style comment threading: 2-level structure (top-level comments + replies indented under each top-level comment).
- Replies can optionally target a specific user/comment within the same thread (VK-style reply-to-user prefix) without creating deep nesting.

## Status (2026-02-11)
Implemented:
- Backend DB + endpoints + cursor pagination + comment likes + rate limits.
- Frontend post detail route, threaded UI, likes, edit/delete, feed preview.

Gaps / future improvements:
- Preview truncation (feed shows full comment text right now).
- "Edited" label in UI when `updated_at > created_at`.
- Optimistic create (currently refetch-based).
- Additional backend tests (ordering, invariants, delete).

## UX Requirements

### Feed (Post Card)
- Show one preview comment under each post:
  - Pick the top-level comment with the highest `like_count`.
  - Tie-breaker: `created_at` ascending (older wins).
- Preview includes: author name, full text (no truncation yet), like count.
- Clicking the post navigates to Post Detail page.

### Post Detail Page (X-style Route)
- Route example: `/posts/:postId`
- Center column shows the post (full content).
- Below the post: comments section.

### Comments Display Rules
- Only two visual levels:
  - Top-level comments (`parent_id` is NULL)
  - Replies (`parent_id` points to the top-level comment)
- Replies are indented under the top-level comment.
- Replies are paginated; initial page uses `limit=5` and shows "Load more replies" when more are available.

### Sorting (No UI Toggles)
Single global sorting rule:
- Top-level comments are sorted by:
  - `like_count` DESC
  - `created_at` ASC (older first when likes equal)
  - `id` ASC (final deterministic tie-breaker)
- Replies under a top-level comment follow the same rule.

### Reply UX (Reply-to-user Without Deep Nesting)
- Clicking "Reply" on a top-level comment creates a reply with:
  - `parent_id = top_level_comment.id`
  - `reply_to_comment_id = NULL`
  - `reply_to_user_id = top_level_comment.user_id` (reply-to-user prefix)
- Clicking "Reply" on a reply (child comment) creates a new reply still under the same top-level comment:
  - `parent_id = top_level_comment.id`
  - `reply_to_comment_id = replied_child_comment.id`
  - `reply_to_user_id = replied_child_comment.user_id`
- UI renders an `@username` prefix (clickable profile link) whenever `reply_to_user_id` is present.
  - This prefix must be structural (not inferred from the text content).

### Mentions
- Mentions are optional for MVP.
- Do NOT rely on parsing `@username` to determine reply structure.
- If mentions are implemented later, use entity-based mentions (not string parsing as the source of truth).

### Delete Behavior
- Decision: hard delete for MVP.

## Data Model (PostgreSQL)
Table: `comments`

Required fields:
- `id` (PK)
- `post_id` (FK -> `posts.id`, indexed)
- `user_id` (FK -> `users.id`, indexed)
- `parent_id` (FK -> `comments.id`, nullable, indexed)
  - NULL = top-level comment
  - NOT NULL = reply; must point to a top-level comment id (enforce in app logic)
- `reply_to_comment_id` (FK -> `comments.id`, nullable, indexed)
- `reply_to_user_id` (FK -> `users.id`, nullable, indexed)
- `content` (TEXT)
- `like_count` (INT, default 0) (denormalized; updated by like/unlike logic)
- `created_at`, `updated_at`

Optional (later):
- `reply_count` for top-level comments (denormalized)

### Constraints / App-level Invariants
- If `parent_id IS NULL` then `reply_to_comment_id` and `reply_to_user_id` must be NULL.
- If `parent_id IS NOT NULL` then:
  - `parent_id` must reference a top-level comment (i.e., that referenced comment has `parent_id IS NULL`).
  - `reply_to_comment_id` (if present) must reference a comment within the same `post_id` and same thread.
  - `reply_to_user_id` rules:
    - If `reply_to_comment_id` is present, `reply_to_user_id` must match that commentвЂ™s `user_id`.
    - If `reply_to_comment_id` is NULL, `reply_to_user_id` must be the top-level parentвЂ™s `user_id`.
- Content must be non-empty after trim; apply a max length limit (e.g., 2000 chars).
  - Decision: max length is 400 chars.

### Indexes
Because sorting uses likes and time:
- `INDEX comments_post_parent_sort ON comments(post_id, parent_id, like_count DESC, created_at ASC, id ASC)`
- `INDEX comments_parent_sort ON comments(parent_id, like_count DESC, created_at ASC, id ASC)`
- `INDEX comments_reply_to_comment ON comments(reply_to_comment_id)` (optional)

### Comment Likes (MVP)
Table: `comment_likes`
- `user_id` (FK -> `users.id`, indexed)
- `comment_id` (FK -> `comments.id`, indexed)
- `created_at`
- Primary key: (`user_id`, `comment_id`)

Behavior:
- Idempotent like/unlike endpoints.
- Update `comments.like_count` on like/unlike.
- Include `is_liked_by_viewer` in comment list DTOs via left join.


## API Design (FastAPI)

### Create Comment / Reply
`POST /posts/{post_id}/comments`

Body:
- `content: string`
- `parent_id: int | null` (optional; if provided, indicates this is a reply under that top-level comment)
- `reply_to_comment_id: int | null` (optional)
- `reply_to_user_id: int | null` (optional)

Validation:
- Ensure non-empty trimmed content.
- If `parent_id` is provided:
  - Ensure it is a top-level comment for that `post_id`.
- If `reply_to_comment_id` is provided:
  - Ensure it belongs to same `post_id` and same thread (`parent_id`).
  - Ensure `reply_to_user_id` matches the targeted comment author (or compute it server-side).
- If `reply_to_comment_id` is not provided AND `parent_id` is provided:
  - Set `reply_to_user_id` to the top-level parent's `user_id` (reply-to-user prefix).
- If `parent_id` is NULL (top-level comment):
  - Ensure `reply_to_comment_id` and `reply_to_user_id` are both NULL (per constraint).

Response:
- Comment DTO including author snippet and reply_to user snippet.

### List Top-level Comments (Cursor Pagination)
`GET /posts/{post_id}/comments?limit=20&cursor=...`
- Returns only `parent_id IS NULL`.
- Sorted by: `like_count DESC, created_at ASC, id ASC`.
- Response: `{ items: [...], next_cursor: string | null }`

### List Replies For a Top-level Comment (Cursor Pagination)
`GET /comments/{comment_id}/replies?limit=20&cursor=...`
- `comment_id` is the top-level comment id.
- Returns only `parent_id = comment_id`.
- Same sorting and cursor logic.

### Delete Comment
`DELETE /comments/{comment_id}`
- Hard delete (MVP decision).
- Auth: author or moderator/admin.

### Comment Likes
`POST /comments/{comment_id}/like`
- Idempotent: creates a like if missing.

`DELETE /comments/{comment_id}/like`
- Idempotent: removes a like if present.


### Edit Comment (Optional but Recommended)
`PATCH /comments/{comment_id}`

Body:
- `content: string`

Rules:
- Author only.
- Updates `updated_at`.
- UI does not currently show an "Edited" label (optional future polish).

## Cursor Pagination Specification (Important)
Because sorting is not purely time-based, the cursor must encode:
- `like_count`
- `created_at`
- `id`

Sort order:
- `like_count` DESC
- `created_at` ASC
- `id` ASC

Cursor represents the last item returned.
Next page query fetches items вЂњafterвЂќ that cursor in the same ordering.

Pseudo-logic for вЂњafter cursorвЂќ (DESC on likes means вЂњafterвЂќ = lower likes; or later time; or higher id):

```sql
WHERE
  (like_count < :c_like)
  OR (like_count = :c_like AND created_at > :c_created)
  OR (like_count = :c_like AND created_at = :c_created AND id > :c_id)
ORDER BY like_count DESC, created_at ASC, id ASC
LIMIT :limit
```

Cursor format:
- base64 of `"{like_count}|{created_at_iso}|{id}"` (or JSON в†’ base64)
- Must be opaque to client; server decodes/validates.

## Frontend Implementation (React + TanStack Query)

### Routes
- Feed: `/feed` (existing)
- Post detail: `/posts/:postId` (new)

### Feed Card Preview Comment
- Prefer server-side: feed API includes `top_comment_preview` to avoid N+1 client fetches.
- Render preview under post card:
  - author
  - content (no truncation yet)
  - like count

### Post Detail Page
- Query post by id.
- Use `useInfiniteQuery` for top-level comments:
  - key: `["comments", postId]`
  - fetch with cursor
- For each top-level comment, render replies block:
  - show the first page of replies (current UI uses `limit=5`)
  - "Load more replies" uses `useInfiniteQuery`:
    - key: `["replies", topCommentId]`

### Reply Composer
- Reply to top-level: create reply with `parent_id = topCommentId`.
- Reply to a reply: set `reply_to_*` fields + still use `parent_id = topCommentId`.
- UI shows `@username` prefix if `reply_to_user` exists.

### Optimistic Create (Optional)
- Not implemented yet. Current behavior is refetch-based after create.

### Deleted Comments Rendering
- Not applicable for hard delete (MVP). Deleted comments disappear.

## Non-functional Requirements
- Rate limit comment creation per user/IP (basic anti-spam).
- Input validation (trim, max length).
- Avoid N+1 queries (join author in list endpoints).
- Deterministic ordering guaranteed by the (`like_count`, `created_at`, `id`) triple.
- Sanitize user input to prevent XSS (strip/escape HTML tags, JavaScript, and malicious content).
- Escape content properly when rendering on the frontend.
- Validate and sanitize URLs if markdown/links are supported.
- Consider Content Security Policy (CSP) headers to mitigate XSS risks.

## Backend Implementation Checklist
- Alembic migration for `comments` table (+ indexes).
- Alembic migration for `comment_likes` table.
- SQLAlchemy `Comment` model + relationships.
- SQLAlchemy `CommentLike` model + relationships (or direct table).
- Schemas/DTOs for create/list responses (include author + reply_to user snippet).
- Endpoints:
  - `POST /posts/{post_id}/comments`
  - `GET /posts/{post_id}/comments` (cursor)
  - `GET /comments/{comment_id}/replies` (cursor)
  - `DELETE /comments/{comment_id}` (hard delete for MVP)
  - `PATCH /comments/{comment_id}` (optional)
  - `POST /comments/{comment_id}/like` (idempotent)
  - `DELETE /comments/{comment_id}/like` (idempotent)
- Cursor encode/decode utilities + unit tests for ordering and cursor correctness.
- Feed query update to include `top_comment_preview` (optional but preferred).

## Frontend Implementation Checklist
- Add route: `/posts/:postId`.
- Add `PostDetailPage`:
  - renders post
  - renders comments + replies
- Add API endpoints + query hooks for comments/replies (cursor pagination).
- Add API endpoints + query hooks for comment like/unlike.
- Add comment composer + reply composer:
  - structural reply-to behavior
  - "Load more replies"
- Add comment like button + optimistic toggle.
- Feed: render preview comment under post card.

## Test Plan
Backend:
- Cursor ordering is correct and deterministic:
  - likes DESC, created_at ASC, id ASC
  - вЂњafter cursorвЂќ returns the right next page
- Validation:
  - cannot reply to non-top-level as parent_id
  - reply_to_comment must be in same post/thread
  - empty/whitespace content rejected
- Delete behavior:
  - deleted comments are removed entirely
  - verify replies are handled appropriately (cascade or orphan prevention)

Integration / E2E (optional):
- Create top-level comment в†’ appears in post detail
- Reply to top-level в†’ appears nested
- Reply to reply -> appears under same top-level with `@username` prefix

## Execution Plan (Step-by-step)
Recommended sequence to keep risk low and keep the app runnable at each step.

1. Prep
   - Create a feature branch: `feat/comments`
   - Decision: hard delete.
   - Decision: max comment length is 400 chars.

2. DB + Model (Backend)
   - Add Alembic migration:
     - `comments` table with required columns
     - indexes for `(post_id, parent_id, like_count DESC, created_at ASC, id ASC)`
     - `comment_likes` table
   - Add SQLAlchemy `Comment` model + relationships:
     - `Comment.user`, `Comment.post`
     - `Comment.parent` (top-level parent), `Comment.replies` (children)
   - Add SQLAlchemy `CommentLike` model + relationships (or direct table).
   - Ensure invariants in app logic:
     - replies always point to a top-level `parent_id`
     - `reply_to_*` rules enforced

3. DTOs + Cursor Helpers (Backend)
   - Add Pydantic schemas:
     - create request
     - comment response (include author preview + optional reply_to preview)
   - Implement cursor encode/decode:
     - opaque base64 cursor
     - validate/handle malformed cursors (400)
   - Implement вЂњafter cursorвЂќ SQL filter for the sorting triple:
     - `like_count DESC, created_at ASC, id ASC`

4. Endpoints + Tests (Backend)
   - Implement endpoints:
     - `POST /posts/{post_id}/comments` (create top-level or reply)
     - `GET /posts/{post_id}/comments` (cursor pagination, top-level only)
     - `GET /comments/{comment_id}/replies` (cursor pagination)
     - `DELETE /comments/{comment_id}` (hard delete)
     - `PATCH /comments/{comment_id}` (optional but recommended)
     - `POST /comments/{comment_id}/like` (idempotent)
     - `DELETE /comments/{comment_id}/like` (idempotent)
   - Add rate limiting to create/edit/delete as basic anti-spam.
   - Tests (high-signal):
     - validation (thread invariants)
     - pagination ordering and cursor correctness
     - comment like/unlike idempotency + `like_count` updates
      - delete behavior (verify hard delete completes successfully)

5. Frontend Route + Skeleton UI
   - Add route: `/posts/:postId`
   - Implement `PostDetailPage` skeleton:
     - show the post
     - show comments section placeholder

6. Frontend Data Layer (TanStack Query)
   - Add endpoints + query hooks for:
     - list top-level comments (cursor)
     - list replies for a top-level comment (cursor)
     - create comment/reply
     - delete (and optional edit)
     - like/unlike comment
   - Use `useInfiniteQuery` for cursor pagination.

7. Frontend Comments UI
   - Render top-level comments sorted by server order.
   - For each top-level comment:
     - show first page of replies (current UI uses `limit=5`)
     - "Load more replies" loads next pages
   - Reply UX:
     - Reply to top-level: `parent_id = topCommentId`
     - Reply to reply: still `parent_id = topCommentId`, set `reply_to_*`
  - Render `@username` prefix when `reply_to_user` exists.
   - Comment likes:
     - like/unlike toggle
     - optimistic updates on count and state

8. Feed Preview Comment (Optional but Preferred)
   - Backend: add `top_comment_preview` to feed DTO to avoid N+1 fetches.
   - Frontend: render under each post card, click navigates to `/posts/:postId`.

9. Polish + Acceptance Pass
   - Ensure errors are readable and UX stays responsive.
   - Verify deterministic ordering and no deep nesting.
   - Verify rate limits behave reasonably (429 UX is acceptable).

