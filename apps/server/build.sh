#!/usr/bin/env bash
# Leapcell デプロイ用ビルドスクリプト
# Leapcell ルートディレクトリ: .（リポジトリルート）
# 呼び出し例: bash apps/server/build.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Web フロントエンドのビルド ──────────────────────────────────
echo "[build] Building Next.js frontend..."
cd "${SCRIPT_DIR}/../web"
pnpm install --frozen-lockfile
pnpm build
# pnpm build は next build 後に out/ を apps/server/frontend/dist へ自動コピーする

# ── Python エージェント依存のインストール ────────────────────────
echo "[build] Installing Python agent dependencies..."
pip install -r "${SCRIPT_DIR}/../../packages/agent/requirements.txt"

# ── Rust サーバーのビルド ────────────────────────────────────────
echo "[build] Building Rust server..."
cd "${SCRIPT_DIR}"
cargo build --release --locked

echo "[build] Done."
