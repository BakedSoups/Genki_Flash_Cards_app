#!/usr/bin/env bash
set -euo pipefail

# Keep this in sync with app.py's default --port.
PORT="${1:-8001}"

if [[ ! "$PORT" =~ ^[0-9]+$ ]] || ((PORT < 1 || PORT > 65535)); then
  echo "Usage: $0 [port]" >&2
  exit 2
fi

if ! command -v lsof >/dev/null 2>&1; then
  echo "Error: lsof is required to find the process using port $PORT." >&2
  exit 1
fi

mapfile -t PIDS < <(lsof -tiTCP:"$PORT" -sTCP:LISTEN)

if ((${#PIDS[@]} == 0)); then
  echo "Port $PORT is already free."
  exit 0
fi

kill -KILL "${PIDS[@]}"
echo "Force-stopped process ${PIDS[*]} listening on port $PORT."
