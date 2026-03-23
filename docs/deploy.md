# デプロイガイド

Leapcell を使った本番デプロイの手順書です。

## 構成

```
GitHub (main ブランチ)
  ├── CI (GitHub Actions) ─── lint / test
  └── push ─────────────────► Leapcell 自動デプロイ
                                ├── build.sh
                                │     ├─ pnpm install + pnpm build
                                │     │     └─ apps/web/out → apps/server/frontend/dist
                                │     ├─ pip install (packages/agent の依存)
                                │     └─ cargo build --release --locked
                                └── cargo run --release --bin server-cli
                                      ├─ /api/*   (REST API)
                                      └─ /*       (frontend/dist の静的配信)
```

Loco サーバーが API と静的ファイルをまとめて配信します。

---

## 前提条件

| 項目 | 内容 |
|---|---|
| Leapcell アカウント | サービス作成・デプロイに必要 |
| GitHub アカウント | Leapcell との連携に必要 |
| Anthropic API キー | Claude 健康分析機能に必要 |
| PostgreSQL | Leapcell マネージド DB または外部 DB |

---

## 初回デプロイ手順

### 1. PostgreSQL DB を用意する

Leapcell のマネージド DB サービスを使う場合は、コンソールから PostgreSQL インスタンスを作成してください。
接続文字列（`DATABASE_URL`）を控えておきます。

```
postgres://ユーザー名:パスワード@ホスト:5432/DB名
```

### 2. Leapcell でサービスを作成する

1. Leapcell コンソールで「New Service」を作成
2. GitHub リポジトリを連携（このリポジトリを選択）
3. ビルド設定を以下の通り入力:

| UI フィールド | 設定値 |
|---|---|
| フレームワークプリセット | `Rust` |
| ブランチ | `main` |
| ルートディレクトリ | `.`（リポジトリルート） |
| ランタイム | `Rust` → `rust debian` |
| ビルドコマンド | `bash apps/server/build.sh` ← **デフォルト値から変更する** |
| 起動コマンド | `cd apps/server && cargo run --release --bin server-cli` ← **デフォルト値から変更する** |
| 環境ポート | `5150` |

> **注意:** このリポジトリはモノレポ構成です。ルートディレクトリは `.`（リポジトリルート）のまま運用し、
> ビルド・起動コマンドで `apps/server` へ移動します。

### 3. 環境変数を設定する

下記の「環境変数リファレンス」を参照してすべての必須変数を設定してください。

### 4. デプロイを実行する

設定を保存すると自動でデプロイが始まります。ログで以下を確認:

```
[build] Building Next.js frontend...
[build] Installing Python agent dependencies...
[build] Building Rust server...
[build] Done.
...
Loco server started on port XXXX
```

### 5. 動作確認

```bash
# API 疎通確認（401 が返れば OK）
curl https://your-app.leapcell.dev/api/auth/current

# ブラウザでトップページを確認
open https://your-app.leapcell.dev
```

DB マイグレーションはサーバー初回起動時に自動実行されます（`auto_migrate: true`）。

---

## 環境変数リファレンス

### 必須

| 変数名 | 説明 | 例 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 接続文字列 | `postgres://user:pass@host:5432/dbname` |
| `APP_JWT_SECRET` | JWT 署名キー（十分長いランダム文字列） | `openssl rand -base64 32` で生成 |
| `ANTHROPIC_API_KEY` | Claude API キー（健康分析に必要） | `sk-ant-...` |

### 任意

| 変数名 | 説明 | デフォルト値 |
|---|---|---|
| `PORT` | サーバーバインドポート | `5150` |
| `FRONTEND_URL` | CORS の許可 origin | `http://localhost:5150` |
| `ANTHROPIC_MODEL` | 使用する Claude モデル | `claude-haiku-4-5-20251001` |
| `DB_MIN_CONNECTIONS` | DB 最小接続数 | `1` |
| `DB_MAX_CONNECTIONS` | DB 最大接続数 | `5` |

> **注意:** `FRONTEND_URL` は CORS の許可 origin とサーバーのホスト名に使われます。
> カスタムドメインを設定した場合は `https://your-domain.com` を指定してください。

---

## 継続デプロイ

`main` ブランチへの push が Leapcell の自動再デプロイをトリガーします。
GitHub Actions の CI が通ってから main にマージする運用が推奨です。

---

## DB マイグレーション

`apps/server/config/production.yaml` に `auto_migrate: true` が設定されているため、
サーバー起動時に未適用のマイグレーションが自動実行されます。手動実行は不要です。

---

## トラブルシューティング

### `The path 'frontend/dist' does not exist` でサーバーが起動しない

`build.sh` 内の `pnpm build` が失敗していないか確認してください。
Leapcell ビルドログで `[build] Building Next.js frontend...` 以降のエラーを確認します。

よくある原因:
- pnpm / Node.js がビルド環境にない → Leapcell の環境要件を確認
- `NEXT_PUBLIC_API_URL` 未設定によるビルドエラー（ビルド時は任意）

### `ModuleNotFoundError: No module named 'health_agent'`

Python エージェントのパスが見つかりません。

1. `pip install -r ../../packages/agent/requirements.txt` がビルドログに出ているか確認
2. 必要なら `PYTHON_AGENT_DIR` 環境変数でエージェントディレクトリを明示指定:

```
PYTHON_AGENT_DIR=/path/to/packages/agent
```

### `Error connecting to database`

`DATABASE_URL` の形式を確認してください:

```
postgres://ユーザー名:パスワード@ホスト:ポート/DB名
```

Leapcell マネージド DB を使う場合、ホスト名はコンソールから確認できます。

### JWT エラー（トークンが無効になる）

`APP_JWT_SECRET` が設定されていない場合、デフォルト値 `changeme-in-production` が使われます。
**本番環境では必ず変更してください。**

```bash
# ランダムな秘密鍵を生成
openssl rand -base64 32
```

### 健康分析が実行されない

`ANTHROPIC_API_KEY` が設定されていることを確認してください。
モデルを変更したい場合は `ANTHROPIC_MODEL` を設定します（例: `claude-haiku-4-5-20251001`）。
