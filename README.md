# ぐるっとスタンプラリー (asoma)

地域コミュニティ向けの **アプリ不要・QRコード型デジタルスタンプラリー** システムです。

---

## コンセプト

スマートフォンのブラウザだけで参加できるスタンプラリーを、複数のコミュニティ（自治体・商店街・イベント実行委員会など）がそれぞれ独立して運営できるマルチテナント型サービスです。

- **アプリインストール不要** — 参加者はURLを開くだけで参加
- **QRコードでスタンプ取得** — スポットに設置したQRコードをカメラで読み取り
- **スタンプ地図帳** — 取得状況の確認 + スポット名タップでGoogle マップ連携
- **景品応募** — 全スポット制覇で景品応募フォームが開放
- **マルチテナント** — コミュニティごとに独立した管理・参加者URLを発行

---

## ロール構成

| ロール | アクセスURL | 権限 |
|--------|------------|------|
| スーパー管理者 | `/super-admin/login` | コミュニティの作成・管理・代理入場 |
| コミュニティ管理者 | `/admin/login?t=TOKEN` | イベント・コース・スポット・QRコード管理 |
| 参加者 | `/?t=TOKEN` | スタンプ収集・景品応募 |

---

## データ構造

```
テナント（コミュニティ）
  └── イベント（開催期間付き）
        └── コース（距離・所要時間）
              └── スポット（QRコード・座標・SNSリンク）
                    └── スタンプログ（参加者ごとの取得記録）
```

---

## 主な機能

### 参加者
- トークン付きURLから入場（アプリ不要）
- QRコードスキャンによるスタンプ取得
- スタンプ地図帳で取得状況・進捗確認
- スポット名タップでGoogle マップ表示
- 全スポット制覇後に景品応募
- 使い方ガイド（`/guide`）

### コミュニティ管理者
- イベント管理（開催期間・日本時間・15分単位設定）
- コース管理（距離・所要時間）
- スポット管理（Google マップ座標入力・Instagram/Webサイトリンク）
- QRコード発行・印刷
- 統計ダッシュボード（参加者数・完走率・スポット別訪問数）
- 景品応募者管理（当選/落選管理）

### スーパー管理者
- コミュニティ（テナント）の作成・編集
- 参加者URL・管理者URLの発行
- 任意のコミュニティ管理画面への代理入場

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS 4 |
| データベース | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| QRスキャン | html5-qrcode |
| コンテナ | Docker / docker-compose |
| デプロイ | Ubuntu VPS |

---

## セットアップ

### 必要な環境変数（`.env.local`）

```env
DATABASE_URL=postgresql://...
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=your-password
SUPER_ADMIN_SESSION_SECRET=random-secret
ADMIN_SESSION_SECRET=random-secret
```

### 開発サーバー起動

```bash
cd asoma
npm install
npm run dev
```

### DBスキーマ反映

```bash
npm run db:push
```

### シードデータ投入

```bash
npm run db:seed
```

### マニュアルHTML生成（PDF用）

```bash
npm run docs:pdf
# docs/*.html をブラウザで開き Ctrl+P → PDFに保存
```

---

## デプロイ（VPS）

```bash
cd /var/www/asoma
git pull origin master
docker compose build && docker compose up -d
```

---

## ドキュメント

| ファイル | 内容 |
|---------|------|
| `docs/super-admin-manual.md` | スーパー管理者マニュアル |
| `docs/admin-manual.md` | コミュニティ管理者マニュアル |
| `docs/participant-guide.md` | 参加者操作ガイド（`/guide` でWeb公開） |

---

## ライセンス

Private
