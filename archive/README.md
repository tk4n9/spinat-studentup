# archive/

Dormant code preserved for post-event revival. Not wired into `scripts/bootstrap.sh`, `scripts/start-all.sh`, or `scripts/verify.sh`.

## pump-game/

Archived 2026-04-22 (pre-event triage). Revival recipe below; post-event unification plan at `.omc/plans/unify-booths-v2.md`.

### 5-step revival checklist

1. **Extract:** `cp -r archive/pump-game <target-dir>` (e.g. a fresh `program-b-pump-game/` or `recording-booth/features/game/`).
2. **Backend deps:** `cd <target-dir>/backend && uv sync` (uses the preserved `pyproject.toml` + `uv.lock`; Python 3.12 required).
3. **Arduino handshake:** flash `<target-dir>/arduino/pump_pads/pump_pads.ino` to the pump-pad controller. Verify the serial handshake string matches `backend/services/scoring.py` expectations before first boot.
4. **Frontend build:** `cd <target-dir>/frontend && npm ci && npm run build`.
5. **(Optional) Port into unified app:** if the post-event unification has landed, re-home the game as a `recording-booth/features/game/` mini-service. The archived `routers/game.py` + `routers/ws.py` + `services/scoring.py` drop in with BOOTH_CONFIG wiring changes only.

### What's preserved here

- `backend/` — FastAPI app, scoring service, WebSocket router, pyproject + uv.lock
- `backend/storage/charts/chart_1.json` — known-good chart data (verified present at archive time)
- `arduino/pump_pads/pump_pads.ino` — pump-pad controller firmware
- `frontend/` — Vite + TS UI

### What's NOT preserved

- `.venv/`, `node_modules/`, `dist/` — transient build artifacts; regenerate per steps 2 and 4 above.
- Runtime `.env` credentials — intentionally out of archive. See `backend/.env.example` for required keys.
