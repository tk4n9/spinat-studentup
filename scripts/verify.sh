#!/bin/bash
# ── Harness Verification Script ──────────────────────────────
# Run after ANY change. Success = silent. Failures = verbose.
# Usage: bash scripts/verify.sh
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PA="$ROOT/program-a-reels-booth"
PB="$ROOT/program-b-pump-game"
B2="$ROOT/booth-2-objects"
FAIL=0

# ── Helpers ──────────────────────────────────────────────────
pass() { :; }  # silent on success
fail() { echo "FAIL: $1" >&2; FAIL=1; }

# ── Backend checks ──────────────────────────────────────────
# Pick a usable python — the venv python must exist AND be executable
# (homebrew python upgrades can leave a dangling symlink in an old venv).
pick_python() {
  local base="$1"
  for cand in "$base/.venv_$(whoami)/bin/python" "$base/.venv/bin/python"; do
    if [ -x "$cand" ]; then echo "$cand"; return 0; fi
  done
  return 1
}

PYTHON="$(pick_python "$PA/backend")" || {
  echo "SKIP: backend venv not found or unusable (run: cd program-a-reels-booth/backend && python3 -m venv .venv_\$(whoami) && .venv_\$(whoami)/bin/pip install -r requirements.txt)" >&2
}

if [ -n "${PYTHON:-}" ]; then
  # Import smoke test
  (cd "$PA/backend" && $PYTHON -c "import main" 2>/dev/null) && pass || fail "backend import"

  # Pytest (if tests exist)
  if [ -d "$PA/backend/tests" ] && ls "$PA/backend/tests"/test_*.py 1>/dev/null 2>&1; then
    (cd "$PA/backend" && $PYTHON -m pytest tests/ -q --tb=short 2>&1) || fail "backend tests"
  fi
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

# ── Program B: Backend checks ──────────────────────────────
PYTHON_B="$(pick_python "$PB/backend")" || {
  echo "SKIP: Program B backend venv not found or unusable (run: cd program-b-pump-game/backend && python3 -m venv .venv_\$(whoami) && .venv_\$(whoami)/bin/pip install -r requirements.txt)" >&2
}

if [ -n "${PYTHON_B:-}" ]; then
  (cd "$PB/backend" && $PYTHON_B -c "import main" 2>/dev/null) && pass || fail "program-b backend import"

  if [ -d "$PB/backend/tests" ] && ls "$PB/backend/tests"/test_*.py 1>/dev/null 2>&1; then
    (cd "$PB/backend" && $PYTHON_B -m pytest tests/ -q --tb=short 2>&1) || fail "program-b backend tests"
  fi
fi

# ── Program B: Frontend checks ─────────────────────────────
if [ -d "$PB/frontend/node_modules" ]; then
  TSC_B="$PB/frontend/node_modules/.bin/tsc"
  (cd "$PB/frontend" && $TSC_B --noEmit 2>&1) || fail "program-b frontend typecheck"
  (cd "$PB/frontend" && npm run build --silent 2>&1) || fail "program-b frontend build"
else
  echo "SKIP: Program B frontend node_modules not found (run: cd program-b-pump-game/frontend && npm install)" >&2
fi

# ── Booth 2: Backend checks ────────────────────────────────
PYTHON_B2="$(pick_python "$B2/backend")" || {
  echo "SKIP: Booth 2 backend venv not found or unusable (run: cd booth-2-objects/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt)" >&2
}

if [ -n "${PYTHON_B2:-}" ]; then
  (cd "$B2/backend" && $PYTHON_B2 -c "import main" 2>/dev/null) && pass || fail "booth-2 backend import"

  if [ -d "$B2/backend/tests" ] && ls "$B2/backend/tests"/test_*.py 1>/dev/null 2>&1; then
    (cd "$B2/backend" && $PYTHON_B2 -m pytest tests/ -q --tb=short 2>&1) || fail "booth-2 backend tests"
  fi
fi

# ── Booth 2: Frontend checks ───────────────────────────────
if [ -d "$B2/frontend/node_modules" ]; then
  TSC_B2="$B2/frontend/node_modules/.bin/tsc"
  (cd "$B2/frontend" && $TSC_B2 --noEmit 2>&1) || fail "booth-2 frontend typecheck"
  (cd "$B2/frontend" && npm run build --silent 2>&1) || fail "booth-2 frontend build"
else
  echo "SKIP: Booth 2 frontend node_modules not found (run: cd booth-2-objects/frontend && npm install)" >&2
fi

# ── Result ───────────────────────────────────────────────────
if [ $FAIL -ne 0 ]; then
  echo "" >&2
  echo "✗ Verification FAILED. Fix errors above before committing." >&2
  exit 1
fi
# Success is silent.
