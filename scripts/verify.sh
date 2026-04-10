#!/bin/bash
# ── Harness Verification Script ──────────────────────────────
# Run after ANY change. Success = silent. Failures = verbose.
# Usage: bash scripts/verify.sh
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PA="$ROOT/program-a-reels-booth"
FAIL=0

# ── Helpers ──────────────────────────────────────────────────
pass() { :; }  # silent on success
fail() { echo "FAIL: $1" >&2; FAIL=1; }

# ── Backend checks ──────────────────────────────────────────
if [ -d "$PA/backend/.venv" ]; then
  PYTHON="$PA/backend/.venv/bin/python"

  # Import smoke test
  (cd "$PA/backend" && $PYTHON -c "import main" 2>/dev/null) && pass || fail "backend import"

  # Pytest (if tests exist)
  if [ -d "$PA/backend/tests" ] && ls "$PA/backend/tests"/test_*.py 1>/dev/null 2>&1; then
    (cd "$PA/backend" && $PYTHON -m pytest tests/ -q --tb=short 2>&1) || fail "backend tests"
  fi
else
  echo "SKIP: backend venv not found (run: cd program-a-reels-booth/backend && python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt)" >&2
fi

# ── Frontend checks ─────────────────────────────────────────
if [ -d "$PA/frontend/node_modules" ]; then
  TSC="$PA/frontend/node_modules/.bin/tsc"

  # TypeScript typecheck
  (cd "$PA/frontend" && $TSC --noEmit 2>&1) || fail "frontend typecheck"

  # Vite build
  (cd "$PA/frontend" && npm run build --silent 2>&1) || fail "frontend build"
else
  echo "SKIP: frontend node_modules not found (run: cd program-a-reels-booth/frontend && npm install)" >&2
fi

# ── Result ───────────────────────────────────────────────────
if [ $FAIL -ne 0 ]; then
  echo "" >&2
  echo "✗ Verification FAILED. Fix errors above before committing." >&2
  exit 1
fi
# Success is silent.
