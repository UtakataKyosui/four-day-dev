#!/usr/bin/env bash
# Leapcell デプロイ用ビルドスクリプト
# Leapcell ルートディレクトリ: .（リポジトリルート）
# 呼び出し例: bash apps/server/build.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Node.js + pnpm のセットアップ ────────────────────────────────
echo "[build] Installing Node.js and pnpm..."
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
npm install -g pnpm@10

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
