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
| 1 — Performance (음원 + 촬영) | `program-a-reels-booth/` | [AGENTS.md](program-a-reels-booth/AGENTS.md) | Complete (audio-overlay scope pending client spec) |
| 2 — Objects (사물 수음) | `recording-booth/` (BOOTH_CONFIG=`config/booth-2.yaml`) | [AGENTS.md](recording-booth/AGENTS.md) | Unified into recording-booth/ (single-codebase 3-booth app, US-003) |
| 3 — Pump Game (발판 게임) | `program-b-pump-game/` | [PRD.md](program-b-pump-game/PRD.md) | Planning complete, blocked on song + date |

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

# Launch all 3 booths in parallel (logs in .omc/logs/)
bash scripts/start-all.sh

# Backend (per-booth, after bootstrap)
cd program-a-reels-booth/backend
uv run pytest tests/ -q                 # run tests
uv run python -c "import main"          # import smoke test
uv run uvicorn main:app --reload        # dev server

# Frontend
cd program-a-reels-booth/frontend
./node_modules/.bin/tsc --noEmit        # typecheck
npm run build                           # production build

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
| [program-a-reels-booth/PRD.md](program-a-reels-booth/PRD.md) | Full product requirements |
| [program-a-reels-booth/AGENTS.md](program-a-reels-booth/AGENTS.md) | Program-specific agent guide |
| [program-a-reels-booth/README.md](program-a-reels-booth/README.md) | Setup & deployment |
