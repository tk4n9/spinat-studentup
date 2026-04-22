# AGENTS.md — Program A: 릴스 Booth

> Program-specific agent instructions. For repo-wide context, see [../AGENTS.md](../AGENTS.md).

## What This Is

Video recording booth for events. Galaxy Pad records, Monitor PC displays.
Full spec: [PRD.md](PRD.md). Setup: [README.md](README.md).

## Verify

```bash
cd recording-booth
bash ../scripts/verify.sh       # full check (runs import smoke per booth + parametrized pytest)
```

## Backend (Python FastAPI)

```bash
cd backend
.venv/bin/python -m pytest tests/ -q        # tests
.venv/bin/python -c "import main"            # import check
.venv/bin/uvicorn main:app --port 8001       # run locally
```

**Layer structure:** `config.py` → `services/` → `routers/` → `main.py`
- `config.py` — loads config.yaml + .env, exports constants
- `services/` — business logic (storage, r2, qr_gen). No HTTP knowledge.
- `routers/` — HTTP/WS endpoints. Calls services. No direct file I/O.
- `main.py` — app assembly, static mounts, startup.

**API endpoints:**
- `GET  /api/session/counter` — challenger count
- `POST /api/session/counter/increment` — bump count
- `GET  /api/session/formats` — 4 video format configs
- `POST /api/videos/upload` — multipart video blob
- `POST /api/videos/{id}/finalize` — route to display/instagram
- `GET  /api/videos/display` — monitor playlist
- `GET  /api/videos/{id}/qr.png` — QR code PNG
- `WS   /ws/monitor` — real-time new-video events

**Secrets:** `.env` file (see `.env.example`). Never commit `.env`.

## Frontend (React + TypeScript + Tailwind)

```bash
cd frontend
./node_modules/.bin/tsc --noEmit     # typecheck
npm run build                         # production build
npm run dev                           # dev server (proxies API to :8000)
```

**Screen state machine:** `START → COUNTDOWN → RECORDING → REVIEW → QR_CODE | RESTART`
- Implementation: `src/pad/PadApp.tsx` (root) + `src/pad/screens/`
- State: `src/pad/store/sessionStore.ts` (Zustand)
- Recording: `src/pad/hooks/useVideoRecorder.ts` (MediaRecorder + Web Audio)
- Monitor: `src/monitor/MonitorApp.tsx` + WebSocket playlist

**Samsung Galaxy Tab gotcha:** getUserMedia audio must set `noiseSuppression: false, echoCancellation: false, autoGainControl: false`. Already handled in `useVideoRecorder.ts:46-49`.

## What NOT to change without understanding

- Audio mixing in `useVideoRecorder.ts` — carefully architected per Web Audio API spec
- Finalize logic in `routers/videos.py` — 4-path branching matches PRD exactly
- WebSocket manager in `routers/ws.py` — monitor depends on broadcast format
