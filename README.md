# 生活補助 Web アプリ

食事・睡眠を記録し、Claude AI が健康状態を分析する生活支援 Web アプリケーションです。

## 機能

- **食事記録** — 朝食・昼食・夕食の日別管理
- **睡眠記録** — 手動入力 + Fitbit 連携（自動同期）
- **Claude 健康分析** — 食事スコア・睡眠スコア・推奨事項の生成
- **ユーザー認証** — JWT トークンベースのセッション管理

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16 / React 19 / Tailwind CSS / shadcn/ui |
| バックエンド | Rust / Loco 0.16 / Axum / SeaORM |
| AI エージェント | Node.js 24 / Hono / Anthropic Claude SDK |
| データベース | PostgreSQL 16 |
| Monorepo | Moon 2.1.0 |
| CI/CD | GitHub Actions |
| VCS | Jujutsu (jj) |

## ディレクトリ構成

```
apps/
├── web/      # Next.js フロントエンド (ポート 3000)
├── server/   # Rust/Loco バックエンド API (ポート 5150)
└── agent/    # Claude 分析エージェント (ポート 8081)
```

## セットアップ

### 前提条件

- VS Code + Dev Containers 拡張
- Docker Desktop

### 起動手順

1. リポジトリをクローンして VS Code で開く
2. `Reopen in Container` でコンテナを起動
3. コンテナ内で各サービスを起動:

```bash
# バックエンド
cd apps/server
cargo run

# フロントエンド（別ターミナル）
cd apps/web
pnpm dev

# AI エージェント（別ターミナル）
cd apps/agent
pnpm dev
```

4. ブラウザで http://localhost:3000 を開く

## 開発コマンド

### Moon（推奨）

```bash
# 全プロジェクトのビルド
moon run :build

# CI と同じタスクを実行（変更分のみ）
moon ci
```

### Web (apps/web)

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm lint         # ESLint
pnpm typecheck    # 型チェック
pnpm test:e2e     # Playwright E2E テスト
```

### Server (apps/server)

```bash
cargo run         # サーバー起動
cargo test        # テスト
cargo clippy      # Lint
cargo fmt         # フォーマット
```

### Agent (apps/agent)

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # ビルド
pnpm lint         # ESLint
```

## テスト

### E2E テスト

```bash
cd apps/web
pnpm test:e2e              # ヘッドレス実行
pnpm test:e2e:headed       # ブラウザ表示で実行
pnpm test:e2e:ui           # Playwright UI モード
```

### Rust テスト

```bash
cd apps/server
cargo test
```

## 環境変数

| 変数 | 説明 | デフォルト |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | バックエンド API URL | `http://localhost:5150` |
| `DATABASE_URL` | PostgreSQL 接続文字列 | `postgres://loco:loco@db:5432/sandbox_development` |

## API エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/api/auth/login` | ログイン |
| `POST` | `/api/auth/register` | ユーザー登録 |
| `GET` | `/api/meals?date=YYYY-MM-DD` | 食事記録取得 |
| `POST` | `/api/meals` | 食事記録作成 |
| `GET` | `/api/sleep?date=YYYY-MM-DD` | 睡眠記録取得 |
| `POST` | `/api/sleep` | 睡眠記録作成 |
| `POST` | `/api/fitbit/sync` | Fitbit データ同期 |
| `POST` | `/api/analysis/trigger` | 健康分析実行 |
| `GET` | `/api/analysis/history` | 分析履歴取得 |

## CI/CD

GitHub Actions で `main` ブランチへの push / PR 時に自動実行されます。

Moon の変更検出により、変更のあったプロジェクトのタスクのみ実行します。

| プロジェクト | 実行タスク |
|---|---|
| web | lint, typecheck, test:e2e |
| server | lint, test |
| agent | lint, typecheck |

## 開発方針

- 新機能は `docs/plans/` に計画を起こしてから着手する
- 実装で得た知見は `docs/knowhow/` に残す
- AI エージェントとの協働ルールは `CLAUDE.md` / `CLAUDE.repo.md` を参照
