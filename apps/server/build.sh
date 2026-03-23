#!/usr/bin/env bash
# Leapcell デプロイ用ビルドスクリプト
# ワーキングディレクトリ: apps/server
set -euo pipefail

# ── Web フロントエンドのビルド ──────────────────────────────────
echo "[build] Building Next.js frontend..."
cd ../web
pnpm install --frozen-lockfile
pnpm build
# pnpm build は next build 後に out/ を ../server/frontend/dist へ自動コピーする

# ── Python エージェント依存のインストール ────────────────────────
echo "[build] Installing Python agent dependencies..."
cd ../server
pip install -r ../../packages/agent/requirements.txt

# ── Rust サーバーのビルド ────────────────────────────────────────
echo "[build] Building Rust server..."
cargo build --release --locked

echo "[build] Done."
