# Feature: Profile Avatar Group + Shared Suggestions

## Goal
Add a profile header widget that shows relevant users connected to the viewed profile, using an Avatar Group UI (X-style).

This widget must:
- Never look empty (when viewer is authenticated)
- Never show fake social proof
- Reuse the same suggestion source as the right sidebar ("Who to follow")
- Require minimal backend changes

## Final Product Decisions (Locked)
- UI always renders exactly **5** avatar slots.
- Slots are either real users or **neutral placeholders**.
- Placeholders are non-interactive (no tooltip, no click, cursor stays default).
- Profile pages (viewing another user):
  - If `mutual_count > 0`: show mutuals.
  - Else: show suggestions.
- Right sidebar: always shows suggestions.

## High-Level Behavior
The profile avatar group has two mutually exclusive states.

### State A - Mutuals exist (primary)
Show real mutual connections between the viewer and the profile user.

### State B - Suggestions (fallback)
Show suggested users (same source as the right sidebar), visually de-emphasized.

Only one state is rendered at a time.

## Definitions
**Viewer**
- The currently authenticated user.

**Profile User**
- The user whose profile page is being viewed.

**Mutual**
- A user who is followed by the viewer AND follows the profile user.
- This definition must remain consistent everywhere.

## UI Placement
**Location**
- Profile page
- Directly below profile stats (Posts / Followers / Following)
- Above timeline

**Layout**
- Single line
- Small text
- Avatar group inline with label

## State A - Mutuals (Primary State)
**Conditions**
- Viewer is authenticated
- Viewer is not the profile owner
- `mutual_count > 0`

**Label**
- "Followed by"

**Content**
- Avatar group renders **5 slots**:
  - show up to 5 real mutual avatars
  - if fewer than 5 mutuals, pad remaining slots with placeholders
- If `mutual_count > 5`, still show 5 real avatars and render a small `+{mutual_count - 5}` affordance (outside the 5 slots) that can open the full mutuals list later.

**Interaction (real avatars only)**
- Hover avatar -> show `@username`
- Click avatar -> navigate to user profile

## State B - Suggestions (Fallback State)
**Conditions**
- Viewer is authenticated
- AND either:
  - `mutual_count == 0`, OR
  - viewer follows nobody yet (new account case; mutuals will effectively be 0 anyway)

**Label**
- "Also follow"

**Content**
- Avatar group renders **5 slots**:
  - show up to 5 suggested users
  - if fewer than 5 suggestions, pad remaining slots with placeholders
- Users come from the same "Who to follow" source used by the right sidebar
- Suggested user avatars are visually de-emphasized:
  - grayscale filter
  - slightly reduced opacity
  - still clickable
  - still show tooltips

**Important UX Rule**
- This state must not be labeled "Followed by".

**Interaction (real avatars only)**
- Hover avatar -> show `@username`
- Click avatar -> navigate to user profile

## Shared Suggestions Requirement (Right Sidebar + Profile Header)
The "Who to follow" list must be driven by the same backend suggestion source for:
- the feed right sidebar card
- the profile header avatar group fallback

## Backend API (MVP)
### 1) Mutuals preview
`GET /users/{username}/mutuals/preview?limit=5`
- Auth: required (viewer context needed)
- `limit` defaults to 5 and is capped at 5
- Returns:
  - `mutual_count` (total)
  - `mutual_preview[]` (up to `limit`)

### 2) Suggestions ("Who to follow")
`GET /users/suggestions?limit=5`
- Auth: required
- `limit` defaults to 5 and is capped at 5
- Returns: `suggestions[]` (up to `limit`)
- Exclusions:
  - exclude viewer
  - exclude users the viewer already follows

## Suggestion Algorithm (MVP)
Fill `suggestions[]` in order until `limit` is reached:
1) Recent post authors (newest activity first)
2) Newest users by `created_at` (fallback if not enough posters)

If there are not enough eligible users, return fewer than `limit` (the UI pads with placeholders; we do not return fake users).

## Response Shapes
Use the same `UserPreview` shape everywhere (mutual preview, sidebar suggestions, profile header fallback):
- `id`
- `username`
- `avatar_url` (optional)
- `bio` (optional; useful for hover cards)

## Request Flow (Profile Page)
1) Fetch profile data
2) Fetch mutuals preview
3) If `mutual_count > 0`:
   - Render State A
4) Else:
   - Fetch suggestions
   - Render State B

## Explicit Non-Goals (MVP Scope Control)
- No seeded/fake users
- No auto-follow on signup
- No repost avatar groups
- No mutuals list page required initially
- No hover-only appearance logic

## Acceptance Criteria
- Widget is either hidden (unauthenticated viewer) or shows exactly 5 slots.
- Placeholders are neutral and non-interactive.
- Mutuals state only appears when at least one real mutual exists.
- Sidebar and profile header suggestions are consistent (same backend source).

## Reasoning
This design:
- matches X behavior
- avoids empty states for new users
- avoids deceptive social proof
- keeps backend changes minimal
- keeps UI stable as social graph grows
