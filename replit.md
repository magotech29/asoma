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

必要な環境変数（Replitのシークレットに設定）:
- `DATABASE_URL` — PostgreSQL接続文字列

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
