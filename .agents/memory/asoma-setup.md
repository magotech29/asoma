---
name: asoma project setup
description: Key facts about the asoma stamp rally service running in Replit
---

## Project
- Name: asoma (ぐるっとスタンプラリー)
- Stack: Next.js 16 (App Router), PostgreSQL + Drizzle ORM, Tailwind CSS v4
- GitHub: https://github.com/magotech29/asoma (master branch is default)

## Replit setup
- Workflow: "asoma" — runs `npm run dev -- --port 3000`, outputType webview
- Port 3000 = Next.js app (user-facing)
- Port 8080 = pnpm workspace api-server artifact (separate, don't conflict)
- DB: Replit built-in PostgreSQL, DATABASE_URL already in secrets
- Schema pushed via: `npx drizzle-kit push` (reads drizzle.config.ts → src/lib/db/schema.ts)

## Required secrets (all set)
- DATABASE_URL — Replit managed
- SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD — set by user

## Key paths
- src/app/ — Next.js App Router pages and API routes
- src/lib/db/schema.ts — DB schema source of truth
- src/lib/auth.ts — tenant admin auth (SHA256 hash, cookie-based)
- src/lib/super-auth.ts — super admin auth (env var based)
- src/lib/session.ts — participant session (UUID cookie)

## Why: port 3000 not 8080
Port 8080 is claimed by the pnpm workspace api-server artifact.
Next.js must use port 3000 to avoid EADDRINUSE.

## Gotcha: .npmrc has pnpm flags
.npmrc has `auto-install-peers=false` and `strict-peer-dependencies=false` which npm warns about.
Use `npm install --legacy-peer-deps` if needed. These are pnpm settings, harmless for npm.
