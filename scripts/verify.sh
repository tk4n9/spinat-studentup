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

# ── Backend import-smoke (per booth) ────────────────────────
# Per-booth `import main` run so a typo in any booth-N.yaml surfaces
# at verify time, not at event time. extra_env: "KEY=val" prefix for
# the subprocess (BOOTH_CONFIG=...).
check_backend_import() {
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
}

# ── Backend pytest (run once; fixture parametrises per booth) ──────
# US-007: tests/conftest.py supplies a booth_id fixture that iterates
# {1,2,3} and tests/test_booth_identity.py uses subprocesses to assert
# per-booth values. So pytest itself runs once here with a baseline
# BOOTH_CONFIG (booth-1.yaml) for test_api.py's module-level imports;
# the parameterised fixture handles the rest.
check_backend_tests() {
  local dir="$1" extra_env="$2"

  if [ ! -f "$dir/pyproject.toml" ] || [ ! -f "$dir/uv.lock" ]; then
    return 0
  fi
  if [ "$UV_OK" -eq 0 ]; then
    return 0
  fi
  if [ ! -d "$dir/tests" ] || ! ls "$dir/tests"/test_*.py 1>/dev/null 2>&1; then
    return 0
  fi

  run_silent "backend tests" \
    bash -c "cd '$dir' && $extra_env uv run --frozen pytest tests/ -q --tb=short"
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

# ── Run checks for the unified recording-booth app ──────────
# One backend tree + one frontend dist, launched per-booth via BOOTH_CONFIG
# at event time. Verify does two things:
#   1. Import-smoke per booth — catches YAML typos early.
#   2. Pytest once — the booth_id fixture in tests/conftest.py iterates
#      {1,2,3} for tests that care; tests that don't run once under the
#      booth-1 baseline.
BACKEND_DIR="$ROOT/recording-booth/backend"
for n in 1 2 3; do
  check_backend_import "booth-$n" "$BACKEND_DIR" \
    "BOOTH_CONFIG=$ROOT/recording-booth/config/booth-$n.yaml"
done
check_backend_tests "$BACKEND_DIR" \
  "BOOTH_CONFIG=$ROOT/recording-booth/config/booth-1.yaml"
check_frontend "recording-booth" "$ROOT/recording-booth/frontend"

# ── Result ──────────────────────────────────────────────────
if [ $FAIL -ne 0 ]; then
  echo "" >&2
  echo "✗ Verification FAILED. Fix errors above before committing." >&2
  exit 1
fi
# Success is silent.
