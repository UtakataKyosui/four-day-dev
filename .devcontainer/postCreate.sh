#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$HOME/.config/jj"

JJ_CONFIG_PATH="$HOME/.config/jj/config.toml"
JJ_USER_VALUE="${JJ_USER:-devcontainer}"
JJ_EMAIL_VALUE="${JJ_EMAIL:-devcontainer@example.invalid}"

# Preserve any user-managed jj config. Only create a minimal config on first boot.
if [ ! -f "$JJ_CONFIG_PATH" ]; then
  cat > "$JJ_CONFIG_PATH" <<CONFIG_EOF
[user]
name = "${JJ_USER_VALUE}"
email = "${JJ_EMAIL_VALUE}"
CONFIG_EOF
fi
