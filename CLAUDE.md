# CLAUDE.md — spinat-studentup

## Quick Reference

- **Fresh Mac setup:** `bash scripts/bootstrap.sh` (installs uv, Python 3.12, all booth deps, frontend builds — one command)
- **Launch all 3 booths:** `bash scripts/start-all.sh` (parallel, logs in `.omc/logs/`)
- **Verify changes:** `bash scripts/verify.sh` (run after every change)
- **Agent map:** [AGENTS.md](AGENTS.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Status/history:** [STATUSLOG.md](STATUSLOG.md)

## Rules

1. Run `bash scripts/verify.sh` before suggesting a commit. If it fails, fix the issue first.
2. Follow layer constraints in ARCHITECTURE.md — backend services must not import routers.
3. Never commit `.env` files or Cloudflare credentials.
4. Update STATUSLOG.md after any significant change (new feature, bug fix, architecture decision).
5. Korean UI text stays in Korean. Code comments and docs in English.
6. Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
7. Always commit `uv.lock` — it guarantees reproducible installs on a fresh Mac at the venue.

## Backend (uv + pyproject.toml)

All three booths share one uv project at `recording-booth/backend/` (`pyproject.toml` + `uv.lock` + `.venv/`, auto-created by `uv sync`). Per-booth identity is selected at launch via `BOOTH_CONFIG`. uv manages Python 3.12 itself — no pyenv or system Python required.

```bash
# First-time (any fresh Mac)
bash scripts/bootstrap.sh

# Per-booth dev loop — one codebase, BOOTH_CONFIG selects identity
cd recording-booth/backend
BOOTH_CONFIG=../config/booth-1.yaml \
  uv run uvicorn main:app --reload --port 8000                  # booth-1 (port 8000)
BOOTH_CONFIG=../config/booth-1.yaml uv run pytest tests/ -q     # tests (fixture iterates 1,2,3)
BOOTH_CONFIG=../config/booth-1.yaml uv run python -c "import main"  # smoke test
# Swap to booth-2 (port 8002) or booth-3 (port 8001) by changing BOOTH_CONFIG.

# Adding a dependency (affects all 3 booths — single pyproject)
cd recording-booth/backend
uv add <package>                                 # updates pyproject + uv.lock
```

## Frontend

```bash
cd recording-booth/frontend
./node_modules/.bin/tsc --noEmit        # typecheck
npm run build                           # production build (single dist serves all 3 booths)
# Dev mode with live reload against a specific booth backend:
VITE_BOOTH=1 npm run dev                # proxies /api/* to http://localhost:8000
```

## Event-day workflow (fresh MacBook)

```bash
git clone <repo> && cd spinat-studentup
bash scripts/bootstrap.sh       # full setup
bash scripts/start-all.sh       # launch 3 booths
```

Open browser windows at `http://localhost:8000|8002|8001` (paired `/pad` + `/monitor` routes per booth). Use `cloudflared tunnel --url http://localhost:<port>` for HTTPS access from iPads.
