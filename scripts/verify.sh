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

fail() { echo "FAIL: $1" >&2; FAIL=1; }

# ── Backend check (uv-based) ────────────────────────────────
check_backend() {
  local name="$1" dir="$2"

  if [ ! -f "$dir/pyproject.toml" ] || [ ! -f "$dir/uv.lock" ]; then
    echo "SKIP: $name backend (pyproject.toml or uv.lock missing — run bash scripts/bootstrap.sh)" >&2
    return 0
  fi
  if ! command -v uv >/dev/null 2>&1; then
    echo "SKIP: $name backend (uv not on PATH — run bash scripts/bootstrap.sh)" >&2
    return 0
  fi

  # Import smoke test
  (cd "$dir" && uv run --frozen python -c "import main" 2>/dev/null) \
    || fail "$name backend import"

  # Pytest (only if tests exist)
  if [ -d "$dir/tests" ] && ls "$dir/tests"/test_*.py 1>/dev/null 2>&1; then
    (cd "$dir" && uv run --frozen pytest tests/ -q --tb=short 2>&1) \
      || fail "$name backend tests"
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
  (cd "$dir" && "$tsc" --noEmit 2>&1) || fail "$name frontend typecheck"
  (cd "$dir" && npm run build --silent 2>&1) || fail "$name frontend build"
}

# ── Run checks for all 3 booths ─────────────────────────────
check_backend  "booth-1 (performance)" "$ROOT/program-a-reels-booth/backend"
check_frontend "booth-1 (performance)" "$ROOT/program-a-reels-booth/frontend"

check_backend  "booth-2 (objects)"     "$ROOT/booth-2-objects/backend"
check_frontend "booth-2 (objects)"     "$ROOT/booth-2-objects/frontend"

check_backend  "booth-3 (pump-game)"   "$ROOT/program-b-pump-game/backend"
check_frontend "booth-3 (pump-game)"   "$ROOT/program-b-pump-game/frontend"

# ── Result ──────────────────────────────────────────────────
if [ $FAIL -ne 0 ]; then
  echo "" >&2
  echo "✗ Verification FAILED. Fix errors above before committing." >&2
  exit 1
fi
# Success is silent.
