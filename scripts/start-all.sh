#!/usr/bin/env bash
# ── Launch all 3 booth servers in parallel with log capture ──────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/.omc/logs"
mkdir -p "$LOG_DIR"

# Launch one booth uvicorn in the background; echoes the child pid for reaping.
# booth_config: optional absolute path to the YAML config (recording-booth only for now;
#               empty string leaves BOOTH_CONFIG unset for legacy booth-2/booth-3 backends
#               that still read config.yaml directly).
start_booth() {
  local backend_dir="$1" port="$2" log_name="$3" booth_config="${4:-}"
  (
    cd "$backend_dir"
    if [ -n "$booth_config" ]; then
      BOOTH_CONFIG="$booth_config" uv run uvicorn main:app --host 0.0.0.0 --port "$port"
    else
      uv run uvicorn main:app --host 0.0.0.0 --port "$port"
    fi
  ) > "$LOG_DIR/$log_name.log" 2>&1 &
  echo "$!"
}

pids=()
pids+=("$(start_booth "$ROOT/recording-booth/backend" 8000 booth-1 "$ROOT/recording-booth/config/booth-1.yaml")")
pids+=("$(start_booth "$ROOT/booth-2-objects/backend"       8002 booth-2)")
pids+=("$(start_booth "$ROOT/booth-3-record/backend"        8001 booth-3)")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  spinat-studentup — all booths running"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Booth 1 (Performance):  http://localhost:8000   pid=${pids[0]}"
echo "  Booth 2 (Objects):      http://localhost:8002   pid=${pids[1]}"
echo "  Booth 3 (Record):       http://localhost:8001   pid=${pids[2]}"
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
