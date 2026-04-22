#!/usr/bin/env bash
# ── Harness Verification Script ──────────────────────────────
# Run after ANY change. Success = silent. Failures = verbose.
# Usage: bash scripts/verify.sh
#
# Backend checks run via `uv run` — requires uv on PATH and each
# booth backend to have pyproject.toml + uv.lock. Skips gracefully
# if either file is missing (prints SKIP).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

# One-time uv availability check (instead of per-booth repetition).
UV_OK=1
if ! command -v uv >/dev/null 2>&1; then
  UV_OK=0
  echo "SKIP: uv not on PATH — all backend checks skipped (run bash scripts/bootstrap.sh)" >&2
fi

fail() { echo "FAIL: $1" >&2; FAIL=1; }

# Run a step silently on success; replay captured output only on failure.
# This is what makes the whole script silent-on-pass per the docstring.
run_silent() {
  local label="$1"; shift
  local out
  if ! out="$("$@" 2>&1)"; then
    echo "$out" >&2
    fail "$label"
  fi
}

# ── Backend check (uv-based) ────────────────────────────────
# extra_env: optional "KEY=val" prefix for the subprocess (e.g. BOOTH_CONFIG=...)
check_backend() {
  local name="$1" dir="$2" extra_env="${3:-}"

  if [ ! -f "$dir/pyproject.toml" ] || [ ! -f "$dir/uv.lock" ]; then
    echo "SKIP: $name backend (pyproject.toml or uv.lock missing — run bash scripts/bootstrap.sh)" >&2
    return 0
  fi
  if [ "$UV_OK" -eq 0 ]; then
    return 0
  fi

  run_silent "$name backend import" \
    bash -c "cd '$dir' && $extra_env uv run --frozen python -c 'import main'"

  if [ -d "$dir/tests" ] && ls "$dir/tests"/test_*.py 1>/dev/null 2>&1; then
    run_silent "$name backend tests" \
      bash -c "cd '$dir' && $extra_env uv run --frozen pytest tests/ -q --tb=short"
  fi
}

# ── Frontend check ──────────────────────────────────────────
check_frontend() {
  local name="$1" dir="$2"

  if [ ! -d "$dir/node_modules" ]; then
    echo "SKIP: $name frontend (node_modules missing — run cd $dir && npm ci)" >&2
    return 0
  fi

  local tsc="$dir/node_modules/.bin/tsc"
  run_silent "$name frontend typecheck" \
    bash -c "cd '$dir' && '$tsc' --noEmit"
  run_silent "$name frontend build" \
    bash -c "cd '$dir' && npm run build --silent"
}

# ── Run checks for all 3 booths ─────────────────────────────
check_backend  "booth-1 (performance)" "$ROOT/recording-booth/backend" \
  "BOOTH_CONFIG=$ROOT/recording-booth/config/booth-1.yaml"
check_frontend "booth-1 (performance)" "$ROOT/recording-booth/frontend"

check_backend  "booth-2 (objects)"     "$ROOT/booth-2-objects/backend"
check_frontend "booth-2 (objects)"     "$ROOT/booth-2-objects/frontend"

check_backend  "booth-3 (record)"      "$ROOT/booth-3-record/backend"
check_frontend "booth-3 (record)"      "$ROOT/booth-3-record/frontend"

# ── Result ──────────────────────────────────────────────────
if [ $FAIL -ne 0 ]; then
  echo "" >&2
  echo "✗ Verification FAILED. Fix errors above before committing." >&2
  exit 1
fi
# Success is silent.
