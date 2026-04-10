# AGENTS.md — spinat-studentup

> This file is the map. It points to deeper sources of truth.
> Keep it under 100 lines. Do not add codebase overviews or directory listings.

## Repository

Two independent programs for @spinat.official event tools.
Each lives in its own directory with its own AGENTS.md.

## Verify Everything

```bash
bash scripts/verify.sh          # ← run this after ANY change
```

This runs typecheck, backend import check, and tests. **If it passes silently, you're good.** Failures print details.

## Programs

| Program | Directory | AGENTS.md | Status |
|---|---|---|---|
| A: 릴스 Booth | `program-a-reels-booth/` | [AGENTS.md](program-a-reels-booth/AGENTS.md) | Complete |
| B: TBD | TBD | — | Not started |

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
# Backend
cd program-a-reels-booth/backend
.venv/bin/python -m pytest tests/ -q   # run tests
.venv/bin/python -c "import main"       # import smoke test

# Frontend
cd program-a-reels-booth/frontend
./node_modules/.bin/tsc --noEmit        # typecheck
npm run build                           # production build

# Full verification
bash scripts/verify.sh                  # all checks at once
```

## Documentation Map

| Document | Purpose |
|---|---|
| [STATUSLOG.md](STATUSLOG.md) | Change history, decisions, current status |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layer constraints, dependency rules |
| [program-a-reels-booth/PRD.md](program-a-reels-booth/PRD.md) | Full product requirements |
| [program-a-reels-booth/AGENTS.md](program-a-reels-booth/AGENTS.md) | Program-specific agent guide |
| [program-a-reels-booth/README.md](program-a-reels-booth/README.md) | Setup & deployment |
