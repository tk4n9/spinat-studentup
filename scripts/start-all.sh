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

BOOTHS=(1 2 3 4)
pids=()
ports=()
names=()
for n in "${BOOTHS[@]}"; do
  # Read port + name from YAML FIRST so a typo surfaces before we fork
  # uvicorn (otherwise a bad config leaves orphan processes in the trap).
  ports+=("$(yq '.booth.port' "$CONFIG_DIR/booth-$n.yaml")")
  names+=("$(yq '.booth.name' "$CONFIG_DIR/booth-$n.yaml")")
  pids+=("$(start_booth "$n")")
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  spinat-studentup — all booths running"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
# Banner read from YAML so adding a booth is a one-line BOOTHS edit —
# no parallel banner string to keep in sync.
for i in "${!BOOTHS[@]}"; do
  printf "  Booth %s (%s):  http://localhost:%s   pid=%s\n" \
    "${BOOTHS[$i]}" "${names[$i]}" "${ports[$i]}" "${pids[$i]}"
done
echo ""
# macOS bash 3.2 predates negative array indexing — use explicit length.
_LAST="${BOOTHS[$((${#BOOTHS[@]} - 1))]}"
echo "  Logs:  $LOG_DIR/booth-{${BOOTHS[0]}..${_LAST}}.log"
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
