# Frontend Setup (Vite + React + TS)

This document tracks what was installed/created for the frontend, and the next steps to finish the MVP UI.

## Repo context
- Backend: FastAPI (serves OpenAPI at `/openapi.json`)
- Frontend: Vite + React + TypeScript in `frontend/`

## What you installed (VS Code)

These are editor extensions (they integrate with project files and npm packages).

Recommended extensions:
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- Prettier - Code formatter (`esbenp.prettier-vscode`)
- ESLint (`dbaeumer.vscode-eslint`)
- EditorConfig for VS Code (`EditorConfig.EditorConfig`)

Optional (nice-to-have):
- Error Lens (`usernamehw.errorlens`)

### How they actually “work” (high level)
- EditorConfig: reads `.editorconfig` and applies whitespace/newline rules automatically.
- Prettier: formats files (and can sort Tailwind classes if the plugin is installed).
- ESLint: shows JS/TS problems and can auto-fix some of them.
- Tailwind IntelliSense: suggests Tailwind classes once Tailwind is installed/configured.

## What you created/changed (project files)

Repo root:
- `.editorconfig` (editor whitespace rules; commit this)
- `.vscode/settings.json` (workspace settings; commit this if you want consistent behavior)

Frontend folder:
- `frontend/` created by Vite scaffold
- `frontend/.prettierrc` (Prettier config + Tailwind class sorting plugin)
- `frontend/.prettierignore` (ignore generated/build artifacts for formatting)

## Commands you ran (so far)

Scaffold the React app:
- `npm create vite@latest frontend -- --template react-ts`

Install dependencies:
- `cd frontend`
- `npm i`

Add runtime deps:
- `npm i react-router-dom @tanstack/react-query`

Add formatting deps (dev-only):
- `npm i -D prettier prettier-plugin-tailwindcss`

## Current npm dependencies (what they are for)

From `frontend/package.json`:
- `react`, `react-dom`: UI runtime
- `react-router-dom`: client-side routing (pages)
- `@tanstack/react-query`: data fetching + caching + mutation helpers

Dev dependencies:
- `eslint` + `frontend/eslint.config.js`: linting
- `prettier` + `prettier-plugin-tailwindcss`: formatting + Tailwind class sorting
- `typescript`, `vite`: build tooling

## Workspace formatting behavior (expected)

### EditorConfig
`.editorconfig` sets consistent defaults like:
- LF line endings
- final newline on save
- trimming trailing whitespace (except Markdown)
- indentation sizes (2 for JS/TS; 4 for Python)

### Prettier + Tailwind sorting
With:
- VS Code extension installed (Prettier)
- `frontend/.prettierrc` referencing `prettier-plugin-tailwindcss`
- `.vscode/settings.json` enabling format-on-save

Expected result:
- Saving `.ts/.tsx` reformats code
- `className="..."` Tailwind class lists get auto-sorted into canonical order

If formatting does not happen:
- VS Code command palette → “Format Document With…” → choose “Prettier” → “Set as Default”

## Next: Tailwind CSS (adds styling + enables Tailwind IntelliSense)

Run in `frontend/`:
- `npm i -D tailwindcss postcss autoprefixer`
- `npx tailwindcss init -p`

This creates:
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`

Edit `frontend/tailwind.config.js` to include Vite paths:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Edit `frontend/src/index.css` (replace contents) to:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Then restart the dev server:
- `npm run dev`

Quick verification:
- In a component: `className="text-red-500"` should visibly apply.

## Next: shadcn/ui (component primitives)

Prereqs: Tailwind working.

Run in `frontend/`:
- `npx shadcn@latest init`

Then add core components you’ll use for MVP:
- `npx shadcn@latest add button card input dialog sonner`

Notes:
- shadcn modifies/creates a few files (Tailwind config, `components.json`, `src/components/ui/*`).
- If you want a minimal MVP, you can delay shadcn and build with plain Tailwind first.

## Remaining steps (short, no extra explanation)

- Add `frontend/.env`: `VITE_API_URL=http://localhost:8000`
- Add OpenAPI types generation via `openapi-typescript` into `frontend/src/api/types.ts`
- Implement `frontend/src/api/client.ts` (fetch wrapper + Bearer token)
- Build pages:
  - `frontend/src/pages/Login.tsx`
  - `frontend/src/pages/Register.tsx`
  - `frontend/src/pages/Feed.tsx`
- Add router wiring in `frontend/src/App.tsx`
- Add React Query hooks for:
  - login/register
  - feed fetch (`/posts/with_counts?skip&limit`)
  - create post
  - like/retweet toggles (use `is_liked/is_retweeted`)
- Add basic route guard (redirect to login if `/users/me` fails)
- Add error toasts and loading/empty states
