# AGENTS.md — Program B: 피아노 타일 펌프

> Agent guide for Program B. For repo-level overview, see [../AGENTS.md](../AGENTS.md).

## Verify

```bash
bash scripts/verify.sh          # from repo root — checks both programs
```

## Architecture

- **Backend:** FastAPI on port 8001. Config in `config.yaml`. No secrets needed.
- **Frontend:** React 18 + Vite + Tailwind + Zustand. Game engine uses Canvas 2D, NOT React DOM.
- **Input:** Arduino Leonardo USB HID keyboard (keys A/S/D/F/G → lanes 0-4).
- **Integration:** Program A fires best-effort `POST /api/game/start` when recording starts. No shared code.

## Key Constraint

The game engine (`src/game/engine/`) is plain TypeScript classes, not React components. Timing uses `AudioContext.currentTime` as the single source of truth — never `Date.now()` or `performance.now()`.

## Key Commands

```bash
# Backend
cd program-b-pump-game/backend
.venv/bin/python -m uvicorn main:app --port 8001 --reload

# Frontend
cd program-b-pump-game/frontend
npm run dev                         # dev server
./node_modules/.bin/tsc --noEmit    # typecheck
npm run build                       # production build
```

## Documentation

| Document | Purpose |
|---|---|
| [PRD.md](PRD.md) | Full product requirements + blocking questions |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Cross-program topology + layer constraints |
| [../STATUSLOG.md](../STATUSLOG.md) | Change history |
