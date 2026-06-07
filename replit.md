# asoma — ぐるっとスタンプラリー

地域コミュニティ向けのQRコード型デジタルスタンプラリーサービス（マルチテナント）の継続開発プロジェクト。

## GitHub連携

- リポジトリ: `https://github.com/magotech29/asoma`
- デフォルトブランチ: `master`

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

```bash
# 開発サーバー起動
pnpm dev          # または npm run dev

# DB操作
pnpm db:push      # スキーマをDBに反映
pnpm db:studio    # Drizzle Studio（DB確認）
pnpm db:seed      # シードデータ投入
```

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, preview at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

必要な環境変数（Replitのシークレットに設定）:
- `DATABASE_URL` — PostgreSQL接続文字列 (auto-provisioned by Replit)

## Environment Setup (first time)

All required environment variables are auto-provisioned by Replit:

- `DATABASE_URL` — managed Postgres connection string
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` — individual PG connection params
- `SESSION_SECRET` — session signing secret

**To verify DB schema is in sync:**

```bash
pnpm --filter @workspace/db run push
```

**API server health check:**

```bash
curl localhost:80/api/healthz
# → {"status":"ok"}
```

## Stack

- Next.js 16 (App Router)
- PostgreSQL + Drizzle ORM
- Tailwind CSS v4
- html5-qrcode（QRスキャン）
- Supabase（認証・ストレージ）

## Where things live

- `src/app/` — Next.js App Router ページ・APIルート
- `src/lib/db/schema.ts` — DBスキーマ（ソースオブトゥルース）
- `src/lib/` — 認証・DB・セッション・テナントユーティリティ
- `scripts/` — シード・PDF生成スクリプト

## Roles & URLs

| ロール | URL |
|--------|-----|
| スーパー管理者 | `/super-admin/login` |
| テナント管理者 | `/admin/login?t=TOKEN` |
| 参加者 | `/?t=TOKEN` |

## User preferences

- GitHubのmasterブランチをメインとして使う
- ReplitでコードしてGitHubへ反映するフローで開発する

## Gotchas

- Replitエージェントはgit checkout等のgit操作を直接実行できない（lock-fileガード）。ブランチ切り替えはシェルで手動実行。
- `DATABASE_URL` が未設定だとDB接続エラーになる。ReplitのSecretsに設定必要。
