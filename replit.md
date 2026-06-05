# asoma

asomaは、スタンプラリー形式のイベント管理サービスです（マルチテナント対応）。

## GitHub連携

このReplitプロジェクトは `https://github.com/magotech29/asoma` に接続済みです。

### 初回セットアップ（masterブランチへ切り替え）

Replitのシェルを開いて以下を実行してください：

```bash
git checkout -b master origin/master
git config init.defaultBranch master
```

### 日常の開発フロー

```bash
# 最新を取得（作業開始前）
git pull origin master

# 変更をGitHubへ反映（作業後）
git add .
git commit -m "変更内容を説明するメッセージ"
git push origin master
```

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema (source of truth)
- `artifacts/api-server/src/routes/` — Express route handlers

## Architecture decisions

- `origin` remote = `https://github.com/magotech29/asoma` (master branch is default)
- Replit workspace branch: switch to `master` via shell on first use

## Product

スタンプラリー形式のイベント管理。QRコードスキャンによるスポットチェックイン、テナント管理、参加者ガイド機能を持つ。

## User preferences

- GitHubのmasterブランチをメインとして使う
- ReplitでコードをしてGitHubへ反映するフローで開発する

## Gotchas

- Replitエージェントはgit checkout等のgit操作を直接実行できない。シェルで手動実行が必要。
- masterブランチへの切り替えは初回のみ手動で `git checkout -b master origin/master` を実行する。

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
