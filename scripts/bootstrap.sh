#!/usr/bin/env bash
# ── Bootstrap: fresh Mac → fully runnable spinat-studentup repo ──────────────
# Single command: install uv, fetch Python 3.12, sync booth backends,
# install + build booth frontends, then run verify.sh.
#
# BOOTHS lists the backend/frontend trees to sync. All three booths now
# share recording-booth/, so the array is a single entry; kept as an array
# so re-expansion (e.g. reviving pump-game as a sidecar) is one line.
#
# Safe to re-run: uv sync is idempotent, npm ci is idempotent.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

# ── 0b. node + npm (frontend build prerequisites) ───────────────
# Homebrew formula is `node` — npm ships bundled with it. There is no
# standalone `brew install npm` formula. If a devbox uses nvm/volta to
# manage Node, we respect that (both `node` and `npm` already on PATH)
# and skip the brew install.
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "→ node/npm not found; installing Node via Homebrew (bundles npm)..."
    brew install node >/dev/null
  else
    echo "✗ node/npm missing and Homebrew unavailable — install Node manually (https://nodejs.org/)" >&2
    exit 1
  fi
fi
echo "→ node: $(node --version)  npm: $(npm --version)"

# ── 0c. ffmpeg (runtime dep for services/transcode.py) ──────────
# Finalize route runs every recording through ffmpeg to produce a
# browser-streamable faststart MP4 (Bug B+C fix, STATUSLOG 2026-04-22).
# Missing ffmpeg on the venue Mac silently breaks the finalize flow:
# the iPad button flips "처리 중" → "완료" with no QR code and no R2
# upload, because transcode fires BEFORE the R2 step in
# routers/videos.py finalize. Install at bootstrap so the failure
# mode can't resurface on a fresh clone.
if ! command -v ffmpeg >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "→ ffmpeg not found; installing via Homebrew..."
    brew install ffmpeg >/dev/null
  else
    echo "✗ ffmpeg missing and Homebrew unavailable — install manually (https://ffmpeg.org/)" >&2
    exit 1
  fi
fi
echo "→ ffmpeg: $(ffmpeg -version 2>&1 | head -1 | awk '{print $1, $2, $3}')"

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

# ── 3. Backend sync ─────────────────────────────────────────
# Parallel loop preserved for when BOOTHS grows back past 1 entry.
echo "→ Syncing backend pyproject(s)..."
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

# ── 4. Frontend install + build ─────────────────────────────
# Sequential loop (matters again if BOOTHS grows — simultaneous vite
# builds spike RAM). With a single entry today, the loop is a no-op cost.
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
