# Feature: Profile Bio + Follow State + Hover Card

## Goal
Add a short "about me" bio (max 100 chars) to user profiles, expose whether the
viewer follows the user, and render a hover card UI on the feed.

## Scope
- Backend: store bio, update it, return it in profile responses, return
  `is_followed_by_viewer`.
- Frontend: show bio, show follow state/button, and render a hover card from
  feed avatars/usernames.

## Exact Steps

### 1) Backend: add bio storage
1. Update `app/models.py`:
   - Add `bio = Column(String(100), nullable=True)` to `User`.
2. Create Alembic migration:
   - `alembic revision -m "add user bio"`
   - In the new migration:
     - `op.add_column("users", sa.Column("bio", sa.String(length=100), nullable=True))`
     - Down migration should drop the column.

### 2) Backend: schemas + optional auth
1. Update `app/schemas.py`:
   - Add `bio: Optional[str] = None` to `User` and `UserProfile`.
   - Add `is_followed_by_viewer: bool = False` to `UserProfile`.
   - Add a new payload model, e.g.:
     - `class UserProfileUpdate(BaseModel): bio: Optional[str] = None`
2. Update `app/auth.py`:
   - Add a new optional auth dependency so `/users/{username}` can remain public
     but still compute follow state when a token is present.
   - Use `OAuth2PasswordBearer(tokenUrl="token", auto_error=False)` and return
     `None` when no token is provided.

### 3) Backend: users router updates
1. Update `read_me` in `app/routers/users.py`:
   - Include `bio=current_user.bio` in the response.
2. Update `get_user_profile`:
   - Accept `current_user_optional` (from the optional auth dependency).
   - Compute `is_followed_by_viewer` using the `Follow` table when a viewer is
     present.
   - Include `bio` and `is_followed_by_viewer` in `UserProfile` response.
3. Add profile update endpoint:
   - `PUT /users/me/profile` that accepts `UserProfileUpdate`.
   - Trim whitespace, enforce max length 100, allow null to clear.

### 4) Backend: restart
If running in Docker:
- `docker compose up -d --build api`

If running locally:
- Restart uvicorn.

### 5) Frontend: regenerate types
1. Pull OpenAPI and regenerate:
   - `cd frontend`
   - `npm run api:pull`
   - `npm run api:gen`

### 6) Frontend: API + queries
1. Update `frontend/src/api/endpoints.ts`:
   - Add `updateProfile` (PUT `/users/me/profile`).
2. Update `frontend/src/api/queries.ts`:
   - Add `useUpdateProfileMutation`, invalidating `me` and `profile` queries.

### 7) Frontend: UI changes
1. Profile page (`frontend/src/pages/Profile.tsx`):
   - Render bio (always visible; max 100 chars).
   - Show follow/unfollow button for non-owner using `is_followed_by_viewer`.
2. Hover card (feed):
   - Use shadcn `hover-card` to show a compact profile card when hovering
     over avatar/username in `frontend/src/components/PostCard.tsx`.
   - Content: avatar, @username, bio, followers, following.
   - Actions: follow/unfollow button for non-owner using
     `POST /users/{user_id}/follow` and `POST /users/{user_id}/unfollow`.
   - Add a “View profile” button linking to `/profile/:username`.

### 8) Verify
1. Update profile bio, refresh profile page: bio persists and renders.
2. View another user: follow state reflects correctly.
3. Hover card appears on feed and shows bio + follow counts.
4. Follow/unfollow updates state and counts.

### 9) Frontend: Profile UX polish (no backend changes)
1. Profile header layout:
   - Move bio directly under `@username` (always visible; max 100 chars).
   - Replace the 3 big stat cards with a compact row: `Posts`, `Followers`, `Following` (X-like sizing).
2. Edit profile (owner only):
   - Replace separate buttons (avatar/cover/bio) with a single `Edit profile` button.
   - Open a dialog with 3 actions:
     - Change avatar: upload flow + `PUT /users/me/avatar`
     - Change cover: upload flow + `PUT /users/me/cover`
     - Edit bio: textarea (max 100) + `PUT /users/me/profile`
3. Follow button (non-owner only):
   - Show `Follow` / `Following` using `is_followed_by_viewer` and existing follow/unfollow endpoints.

### 10) Frontend: Sidebar suggestions (no backend changes)
Moved to `AvatarGroupFeature.md` so the sidebar and profile header can share the same suggestion source.
