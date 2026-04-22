# AGENTS.md — spinat-studentup

> This file is the map. It points to deeper sources of truth.
> Keep it under 100 lines. Do not add codebase overviews or directory listings.

## Repository

Three independent booth programs for @spinat.official event tools.
Each lives in its own directory with its own AGENTS.md and is deployed
to a **geographically separated** PC. The booths share one Cloudflare R2
bucket; keys are namespaced under `videos/booth-{id}/`.

## Verify Everything

```bash
bash scripts/verify.sh          # ← run this after ANY change
```

This runs typecheck, backend import check, and tests. **If it passes silently, you're good.** Failures print details.

## Programs

| Booth | Directory | AGENTS.md / PRD | Status |
|---|---|---|---|
| 1 — violin    | `recording-booth/` (BOOTH_CONFIG=`config/booth-1.yaml`, :8000) | [AGENTS.md](recording-booth/AGENTS.md) | Unified (US-001/US-002) |
| 2 — biotron   | `recording-booth/` (BOOTH_CONFIG=`config/booth-2.yaml`, :8002) | [AGENTS.md](recording-booth/AGENTS.md) | Unified (US-003) |
| 3 — playtron  | `recording-booth/` (BOOTH_CONFIG=`config/booth-3.yaml`, :8001) | [AGENTS.md](recording-booth/AGENTS.md) | Unified (US-004). Pump-game archived under `archive/pump-game/`. |
| 4 — beethoven | `recording-booth/` (BOOTH_CONFIG=`config/booth-4.yaml`, :8003) | [AGENTS.md](recording-booth/AGENTS.md) | Added post-unify |

## Architecture Constraints

→ See [ARCHITECTURE.md](ARCHITECTURE.md) for layer definitions and dependency rules.

**Key rule:** Backend and frontend are strictly separated. Backend serves frontend as static files. All communication is via REST API or WebSocket — no shared code.

## Conventions

- **Language:** Backend = Python 3.12+. Frontend = TypeScript (strict).
- **Frameworks:** FastAPI, React 18, Vite, Tailwind CSS.
- **State:** Zustand (frontend). In-memory dicts (backend, acceptable for single-session kiosk).
- **Tests:** pytest (backend), tsc --noEmit (frontend type-safety).
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`).
- **Config:** YAML for app config, `.env` for secrets (never committed).

## Key Commands

```bash
# Fresh Mac one-command setup (installs uv, Python 3.12, all deps)
bash scripts/bootstrap.sh

# Launch all 4 booths in parallel (logs in .omc/logs/)
bash scripts/start-all.sh

# Backend — single codebase, per-booth via BOOTH_CONFIG env var
cd recording-booth/backend
BOOTH_CONFIG=../config/booth-1.yaml uv run pytest tests/ -q         # booth-1 tests
BOOTH_CONFIG=../config/booth-1.yaml uv run python -c "import main"  # import smoke
BOOTH_CONFIG=../config/booth-1.yaml \
  uv run uvicorn main:app --reload --port 8000                      # booth-1 dev server
# Swap to booth-2 (port 8002) or booth-3 (port 8001) by changing BOOTH_CONFIG.

# Frontend (single build, identity fetched at runtime via /api/booth)
cd recording-booth/frontend
./node_modules/.bin/tsc --noEmit        # typecheck
npm run build                           # production build (one dist for all 4 booths)

# Full verification
bash scripts/verify.sh                  # all checks at once
```

## Tooling

- **Python:** 3.12, managed by `uv` (no pyenv, no system Python required).
- **Backend deps:** declared in each booth's `backend/pyproject.toml`; locked in `backend/uv.lock` (committed).
- **Virtualenv:** `.venv/` per booth backend, auto-created by `uv sync` on first `uv run`.

## Documentation Map

| Document | Purpose |
|---|---|
| [STATUSLOG.md](STATUSLOG.md) | Change history, decisions, current status |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layer constraints, dependency rules |
| [recording-booth/PRD.md](recording-booth/PRD.md) | Full product requirements (historical — describes original program-a scope) |
| [recording-booth/AGENTS.md](recording-booth/AGENTS.md) | Unified backend/frontend agent guide |
| [recording-booth/README.md](recording-booth/README.md) | Setup & deployment |
| [recording-booth/config/booth-{1,2,3,4}.yaml](recording-booth/config/) | Per-booth runtime config selected via `BOOTH_CONFIG` env var |
