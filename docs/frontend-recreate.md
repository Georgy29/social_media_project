# Frontend (Vite + React + TS + Tailwind + shadcn) — Recreate Guide

This is a clean, repeatable checklist for recreating the exact frontend setup we have in this repo.

## 0) Prereqs

- Node.js + npm installed
- VS Code (optional but recommended)

## 1) One-time installs (your machine)

### VS Code extensions

Install once; reuse across projects:
- Prettier - Code formatter (`esbenp.prettier-vscode`)
- ESLint (`dbaeumer.vscode-eslint`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- EditorConfig for VS Code (`EditorConfig.EditorConfig`)

Optional:
- Error Lens (`usernamehw.errorlens`)

How they help:
- EditorConfig reads `.editorconfig` and normalizes whitespace/newlines.
- Prettier formats code; with the Tailwind plugin it sorts Tailwind class order.
- ESLint highlights TS/JS issues; can auto-fix some problems.
- Tailwind IntelliSense autocompletes Tailwind classes (once Tailwind is configured).

## 2) Create the app (Vite scaffold)

From repo root:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm i
```

Sanity check:

```bash
npm run dev
```

## 3) Add baseline frontend deps (router + server-state)

In `frontend/`:

```bash
npm i react-router-dom @tanstack/react-query
```

## 4) Editor consistency (recommended)

### 4.1 Repo root: `.editorconfig` (commit it)

Create `.editorconfig` at repo root:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{ts,tsx,js,jsx,json,yml,yaml,md}]
indent_style = space
indent_size = 2

[*.py]
indent_style = space
indent_size = 4

[*.md]
trim_trailing_whitespace = false
```

### 4.2 Repo root: `.vscode/settings.json` (commit it)

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,

  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },

  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],

  "css.lint.unknownAtRules": "ignore",
  "scss.lint.unknownAtRules": "ignore",
  "less.lint.unknownAtRules": "ignore"
}
```

Notes:
- The `unknownAtRules` lines remove VS Code warnings for Tailwind at-rules like `@apply` and `@theme`.
- If Prettier doesn’t run on save: VS Code → “Format Document With…” → pick Prettier → “Set as Default”.

## 5) Prettier + Tailwind class sorting

In `frontend/`:

```bash
npm i -D prettier prettier-plugin-tailwindcss
```

Create `frontend/.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 80,
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/index.css"
}
```

Create `frontend/.prettierignore`:

```
node_modules
dist
build
coverage
```

Add scripts to `frontend/package.json` (recommended):

```json
{
  "scripts": {
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

Sanity checks:

```bash
npm run format
npm run lint
```

## 6) Tailwind CSS

In `frontend/`:

```bash
npm i -D tailwindcss @tailwindcss/vite
```

Update `frontend/vite.config.ts` to add the Tailwind plugin (keep your existing `@` alias config):

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
```

Note: Tailwind v4 does not require a `tailwind.config.js` or PostCSS config by default. Only add a config file if you need to customize the theme (shadcn may add one later).

Edit `frontend/src/index.css` to exactly:

```css
@import "tailwindcss";
```

Restart dev server after Tailwind changes:

```bash
npm run dev
```

## 7) shadcn/ui (Vite)

Note: This guide assumes Tailwind v4 installed via the Vite plugin and `@import "tailwindcss"` in `src/index.css`.

shadcn requires an import alias (commonly `@/*`), otherwise `npx shadcn@latest init` fails.

### 7.1 Add TS import alias

Edit `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Edit `frontend/tsconfig.app.json` and add to `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 7.2 Add Vite alias resolution (runtime)

Edit `frontend/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
```

### 7.3 Run shadcn init

In `frontend/`:

```bash
npx shadcn@latest init
```

Expected changes (created/updated):
- `frontend/components.json`
- `frontend/tailwind.config.js` (adds tokens, dark mode, animation plugin)
- `frontend/src/index.css` (adds CSS variables + base styles)
- `frontend/package.json` (adds UI deps)
- `frontend/src/components/ui/*` (once you add components)

### 7.4 Add core UI components

In `frontend/`:

```bash
npx shadcn@latest add button card input dialog sonner
```

## 8) Frontend env var for backend URL

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:8000
```

## 9) Create page stubs (routing targets)

Create these files (can start as `return null`):
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/Feed.tsx`

## 10) Final sanity checks

In `frontend/`:

```bash
npm run lint
npm run build
npm run dev
```

## 11) What’s left for the actual MVP app (no explanation)

- Wire React Router in `frontend/src/App.tsx`
- Add React Query provider in `frontend/src/main.tsx`
- Generate OpenAPI TS types via `openapi-typescript`
- Implement `frontend/src/api/client.ts` (fetch wrapper + token)
- Build pages: login, register, feed
- Add mutations: create post, like/unlike, retweet/unretweet
- Route guard using `GET /users/me`
