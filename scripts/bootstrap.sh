#!/usr/bin/env bash
# ── Bootstrap: fresh Mac → fully runnable spinat-studentup repo ──────────────
# Single command: install uv, fetch Python 3.12, sync booth backends,
# install + build booth frontends, then run verify.sh.
#
# BOOTHS array covers the distinct backend/frontend trees that still exist
# on disk. Booth-2 was collapsed into recording-booth/ (single codebase,
# BOOTH_CONFIG env-var selects booth identity); booth-3 unification pending.
#
# Safe to re-run: uv sync is idempotent, npm ci is idempotent.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Single unified backend + frontend tree. Per-booth identity selected at
# launch time via BOOTH_CONFIG env (see scripts/start-all.sh).
BOOTHS=(recording-booth)

# ── 0. yq (used by start-all.sh to read booth.port out of YAML configs) ─
# Install early so failures surface before we touch Python/Node.
if ! command -v yq >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "→ yq not found; installing via Homebrew..."
    brew install yq >/dev/null
  else
    echo "✗ yq missing and Homebrew unavailable — install yq manually (https://github.com/mikefarah/yq)" >&2
    exit 1
  fi
fi
echo "→ yq: $(yq --version)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  spinat-studentup — bootstrap"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. uv ───────────────────────────────────────────────────
if ! command -v uv >/dev/null 2>&1; then
  echo "→ uv not found; installing via astral.sh..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # Installer puts uv in ~/.local/bin (or similar). Extend PATH for this shell.
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
  if ! command -v uv >/dev/null 2>&1; then
    echo "✗ uv install failed; please install manually (https://docs.astral.sh/uv/)" >&2
    exit 1
  fi
fi
echo "→ uv: $(uv --version)"

# ── 2. Python 3.12 (uv-managed, no pyenv required) ──────────
echo "→ Ensuring Python 3.12 is available..."
uv python install 3.12 >/dev/null

# ── 3. Backend sync (3 booths, parallel) ────────────────────
echo "→ Syncing 3 backend pyprojects in parallel..."
pids=()
for b in "${BOOTHS[@]}"; do
  (
    cd "$ROOT/$b/backend"
    uv sync --frozen 2>&1 | sed "s/^/  [$b] /"
  ) &
  pids+=($!)
done
fail=0
for pid in "${pids[@]}"; do
  wait "$pid" || fail=1
done
if [ $fail -ne 0 ]; then
  echo "✗ Backend sync failed" >&2
  exit 1
fi

# ── 4. Frontend install + build (3 booths, sequential) ──────
# Sequential to avoid memory spike during simultaneous vite builds.
for b in "${BOOTHS[@]}"; do
  FRONT="$ROOT/$b/frontend"
  if [ -f "$FRONT/package.json" ]; then
    echo "→ Frontend: $b"
    (cd "$FRONT" && npm ci && npm run build) 2>&1 | sed "s/^/  [$b] /"
  else
    echo "→ Frontend: $b (no package.json, skip)"
  fi
done

# ── 5. Verify ───────────────────────────────────────────────
echo "→ Running verify.sh..."
bash "$ROOT/scripts/verify.sh"

echo ""
echo "✓ Bootstrap complete"
echo ""
echo "  Next steps:"
echo "    bash scripts/start-all.sh      # launch all 3 booth servers"
echo "    (or) cd <booth>/backend && bash run.sh   # run one booth"
echo ""
