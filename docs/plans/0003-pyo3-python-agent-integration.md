# Plan 0003: PyO3 で Python Claude Agent SDK を Rust に統合する

## 背景と目的
Loco サーバーが Next.js のビルド成果物を配信する前提に切り替わったため、Cloudflare Workers 上へ agent を載せる理由がなくなった。分析処理は `apps/server` 内で完結させつつ、Claude Agent SDK 自体は使用継続する必要があるため、Rust から PyO3 経由で Python 実装を呼び出す。

## 対象ユーザーと利用シナリオ
- 利用者が健康分析を実行すると、Loco の background worker が当日の食事・睡眠データを集約する
- Rust worker が Python の Claude Agent SDK 実装を呼び出し、分析結果を DB に保存する

## スコープ
- `apps/server` に PyO3 と Python モジュールを追加する
- 既存の `AGENT_SERVICE_URL` HTTP 呼び出しを廃止し、同一プロセス内呼び出しへ置き換える
- Python 側に Claude Agent SDK ベースの健康分析処理を実装する
- ドキュメントに Python 依存を追記する

## 非スコープ
- 旧 `apps/agent` の Node 実装を Python package へ置き換える
- Cloudflare 向けの既存変更の全面整理

## UI変更点
- なし

## データモデル変更点
- なし

## API / イベント / ジョブへの影響
- `HealthAnalysisWorker` の agent 呼び出し先が HTTP から PyO3 へ変わる
- 必要な環境変数は `ANTHROPIC_API_KEY` と任意の `ANTHROPIC_MODEL`
- ランタイムには Python と `claude-agent-sdk` が必要

## テスト方針
- `cargo check`
- `cargo test`
- Python モジュールの構文チェック

## リスク・保留事項・移行
- デプロイ先に Python と SDK のインストール手順が必要
- PyO3 は system Python に依存するため、環境差異に注意する
- `packages/agent` を Python package として維持し、HTTP サービス化は行わない
