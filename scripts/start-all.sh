#!/usr/bin/env bash
# ── Launch all 3 booth servers in parallel with log capture ──────────────
# All booths run off the single recording-booth/ codebase; per-booth identity
# is selected by BOOTH_CONFIG env, port is read from the YAML via yq so the
# config stays the single source of truth.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/.omc/logs"
BACKEND="$ROOT/recording-booth/backend"
CONFIG_DIR="$ROOT/recording-booth/config"
mkdir -p "$LOG_DIR"

if ! command -v yq >/dev/null 2>&1; then
  echo "✗ yq not on PATH — run bash scripts/bootstrap.sh first" >&2
  exit 1
fi

# Launch one booth uvicorn in the background; echoes the child pid for reaping.
start_booth() {
  local n="$1"
  local cfg="$CONFIG_DIR/booth-$n.yaml"
  local port
  port="$(yq '.booth.port' "$cfg")"
  (
    cd "$BACKEND"
    BOOTH_CONFIG="$cfg" uv run uvicorn main:app --host 0.0.0.0 --port "$port"
  ) > "$LOG_DIR/booth-$n.log" 2>&1 &
  echo "$!"
}

pids=()
ports=()
for n in 1 2 3; do
  pids+=("$(start_booth "$n")")
  ports+=("$(yq '.booth.port' "$CONFIG_DIR/booth-$n.yaml")")
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  spinat-studentup — all booths running"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Booth 1 (Performance):  http://localhost:${ports[0]}   pid=${pids[0]}"
echo "  Booth 2 (Objects):      http://localhost:${ports[1]}   pid=${pids[1]}"
echo "  Booth 3 (Record):       http://localhost:${ports[2]}   pid=${pids[2]}"
echo ""
echo "  Logs:  $LOG_DIR/booth-{1,2,3}.log"
echo "  Stop: Ctrl+C (this script reaps all children)"
echo ""

cleanup() {
  echo ""
  echo "→ Stopping booths..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "✓ All booths stopped"
}
trap cleanup INT TERM

wait
