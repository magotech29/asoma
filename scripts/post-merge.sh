#!/bin/bash
set -e
pnpm install --frozen-lockfile
npx drizzle-kit push --config=drizzle.config.ts
