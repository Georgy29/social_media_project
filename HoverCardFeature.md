# Feature: Profile Bio + Follow State + Cover Card

## Goal
Add a short "about me" bio (max 100 chars) to user profiles, expose whether the
viewer follows the user, and render a cover card UI using existing cover URLs.

## Scope
- Backend: store bio, update it, return it in profile responses, return
  `is_followed_by_viewer`.
- Frontend: show bio with a "show more" toggle, show follow state/button, and
  render a cover card using the existing cover URL.

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
   - Render bio (truncate to 100 chars; show more toggle).
   - Show follow/unfollow button for non-owner using `is_followed_by_viewer`.
2. Cover card:
   - Add a card component near the profile header or sidebar that renders the
     cover image from `profile.cover_url` (or `meQuery.data.cover_url` for self).

### 8) Verify
1. Update profile bio, refresh profile page: bio persists and renders.
2. View another user: follow state reflects correctly.
3. Cover card renders and falls back cleanly when `cover_url` is null.

