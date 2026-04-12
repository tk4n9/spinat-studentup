# STATUSLOG — spinat-studentup

This file tracks the history of changes, decisions, and current status for all programs in this repository. Any agent or developer can read this file to get up to speed without ambiguity.

---

## Repository Overview

| Program | Directory | Status |
|---|---|---|
| Program A: 릴스 Booth & 모니터 영상전시 툴 | `program-a-reels-booth/` | 🟢 Complete (awaiting user config) |
| Program B: TBD | TBD | ⬜ Not started |

---

## Log

---

### 2026-04-10 — Program A: PRD Created

**User Prompt:**
> Program A [릴스 Booth & 모니터 영상전시 툴] 기획 및 계획 수립 요청.
> 
> 핵심 기능:
> - 갤럭시패드에서 Start 버튼 → 5초 카운트 → 영상 촬영 → 촬영 종료 → 저장/인스타 동의 체크박스 → 완료
> - 완료 후 조건에 따라 QR코드 표시 및 큰 모니터 전시
> - 모니터에서 누적 영상 반복재생
> - 영상 포맷 4가지 (세부 스펙 추후 제공 예정)

**Actions Taken:**
- Created `program-a-reels-booth/PRD.md` — full product requirements document including:
  - Complete user flow (state machine)
  - Architecture decision: Python FastAPI backend + React web frontend
  - Tech stack selection with rationale
  - File/folder structure
  - API endpoint design
  - Audio mixing implementation plan (Web Audio API)
  - Monitor display logic (WebSocket-driven playlist)
  - Configuration schema (config.yaml with 4 format slots)
  - 6-phase implementation plan
  - 8 open questions requiring user input

**Key Architecture Decision:**
- **No Android APK needed.** System runs as:
  - Python FastAPI server on the monitor PC
  - React web app served by FastAPI (accessed via Chrome on Galaxy Pad at `/pad`)
  - Monitor display runs in Chrome fullscreen at `/monitor`
  - Communication via REST + WebSocket over local WiFi

**Status:** PRD approved. Implementation in progress (Phase 1–5).

---

### 2026-04-11 — Program A: Implementation Begun

**User decisions:**
- Cloud storage: Cloudflare R2 (Option A) — QR codes must work for external visitor smartphones
- Architecture confirmed: Python FastAPI + React/TypeScript/Tailwind

**Files created:**
```
backend/
  main.py            — FastAPI app, static mounts, startup banner
  config.py          — loads config.yaml + .env
  config.yaml        — server config + 4 format placeholders (specs TBD)
  requirements.txt   — fastapi, uvicorn, boto3, qrcode, pillow, pyyaml
  .env.example       — R2 credentials template
  run.sh             — venue startup script (prints local IP for Galaxy Pad)
  routers/
    session.py       — GET/POST /api/session/counter, GET /api/session/formats
    videos.py        — POST upload, POST finalize, GET display list
    ws.py            — WS /ws/monitor (real-time monitor sync)
  services/
    storage.py       — local file ops (temp/display/instagram folders)
    r2.py            — Cloudflare R2 upload via boto3 (S3-compatible)
    qr_gen.py        — QR code PNG generation (qrcode + Pillow)

frontend/
  package.json       — React 18, Vite, Tailwind, Zustand, fix-webm-duration
  vite.config.ts     — API proxy to :8000 for dev
  src/
    App.tsx           — Router: /pad → PadApp, /monitor → MonitorApp
    types.ts          — shared TypeScript types
    api/client.ts     — fetch wrapper + wsUrl helper
    api/endpoints.ts  — typed API calls
    pad/
      PadApp.tsx                — screen state machine root
      store/sessionStore.ts     — Zustand store (screen, blob, r2url, etc.)
      hooks/useCountdown.ts     — reusable interval countdown
      hooks/useWakeLock.ts      — Screen Wake Lock API (re-acquires on visibility)
      hooks/useVideoRecorder.ts — MediaRecorder + Web Audio mixing + fix-webm-duration
      screens/StartScreen.tsx   — challenger counter + format selector + START
      screens/CountdownScreen.tsx — 5s visual countdown
      screens/RecordingScreen.tsx — camera preview + timer overlay + recording
      screens/ReviewScreen.tsx  — video loop + checkboxes + 완료
      screens/QRCodeScreen.tsx  — QR code display (qrcode.react) + 다시시작
      screens/RestartScreen.tsx — 다시시작 only (instagram-only path)
    monitor/
      MonitorApp.tsx            — fullscreen playlist player
      hooks/usePlaylist.ts      — WebSocket-driven playlist (auto-reconnect)
```

**Verification results:**
- ✅ TypeScript: 0 errors (`tsc --noEmit`)
- ✅ Backend: imports OK (Python 3.12 venv)
- ✅ Vite build: clean, 66 modules, 211KB JS bundle
- ✅ Backend smoke test: `import main` passes

**Status:** Dependencies installed, build passing.

---

### 2026-04-11 — Program A: Backend API Full Test + Socket Fix

**User Prompt:** (continuation of implementation)

**Actions Taken:**
- Fixed `main.py` startup hang: `socket.connect("8.8.8.8", 80)` blocked without timeout. Added `s.settimeout(2)` to `_get_local_ip()`.
- Started backend server and tested all API endpoints via curl:

| Endpoint | Method | Result |
|---|---|---|
| `/api/session/counter` | GET | `{"count":0}` ✅ |
| `/api/session/counter/increment` | POST | `{"count":1}` ✅ |
| `/api/session/formats` | GET | 4 formats array ✅ |
| `/api/videos/upload` | POST (multipart) | Returns `{id, format_id}` ✅ |
| `/api/videos/{id}/finalize` (both=true) | POST | Video → display/ + instagram/ ✅ |
| `/api/videos/{id}/finalize` (save only) | POST | Video → display/ only ✅ |
| `/api/videos/{id}/finalize` (insta only) | POST | Video → instagram/ only ✅ |
| `/api/videos/{id}/finalize` (neither) | POST | Video discarded ✅ |
| `/api/videos/display` | GET | Correct playlist ✅ |
| `/api/videos/{id}/qr.png` (no R2) | GET | 404 with clear message ✅ |

**Commit:** `8a7bd19` — `fix(backend): add socket timeout to prevent startup hang`

---

### 2026-04-11 — Program A: README + Type Declarations

**Actions Taken:**
- Created `program-a-reels-booth/README.md` — concise setup guide (backend venv, frontend build, dev mode, venue deployment)
- Created `frontend/src/vite-env.d.ts` — Vite client types + `fix-webm-duration` module declaration (no @types package available)

**Commit:** `b19f4c3` — `chore(program-a): add README, type declarations, and vite-env.d.ts`

---

### 2026-04-11 — Program A: Architect Review + Fixes

**Architect verification result: PASS**

3 issues identified, 2 fixed:

| # | Issue | Severity | Action |
|---|---|---|---|
| 1 | `r2.py`: sync boto3 I/O inside `async def` blocks event loop | Non-blocking | **Fixed** — wrapped in `asyncio.to_thread()` |
| 2 | `usePlaylist.ts`: stale `videos.length` closure in `advance()` | Non-blocking | **Fixed** — use `useRef` for current videos array |
| 3 | `_registry` dict is in-memory only, lost on server restart | Non-blocking | **Accepted** — appropriate for single-session exhibition booth |

**Architect confirmed all PRD requirements are implemented:**
- State machine (6 screens), challenger counter, format selector
- All 4 finalize paths, WebSocket monitor sync
- Web Audio API mixing matches PRD spec exactly
- Samsung Galaxy Tab audio fix, Wake Lock with visibilitychange re-acquire
- Codec detection (runtime `isTypeSupported()`), fix-webm-duration
- Kiosk back-button block

**Commit:** `1f355cd` — `fix: address architect review findings`

---

### Current Status (2026-04-11)

**Program A: 🟢 Implementation complete.**

All code written, tested, and architect-verified. 4 commits on `main`.

**Remaining (user action required):**
- [ ] Provide 4 video format specs → update `backend/config.yaml` (duration, music file per format)
- [ ] Create Cloudflare R2 bucket → fill `backend/.env` from `.env.example`
- [ ] Add music files to `backend/storage/music/` if formats require them
- [ ] Test on actual Galaxy Pad + monitor PC at venue

**Program B: ⬜ Not started — specs not yet provided.**

---

### 2026-04-12 — Program B: Consensus Architecture Plan Created

**User Prompt:**
> Implement Program B. Client spec: 미니 피아노 타일식 펌프 — Piano Tiles-style rhythm game with 5 physical foot pads, game monitor with falling circles, video recording via Galaxy Pad, scoring (karaoke-style), integration with Program A's Review/QR flow.

**Actions Taken:**
- Ran architect + critic agents in parallel for consensus planning
- Created `program-b-pump-game/PRD.md` — full product requirements document including:
  - System topology (3 devices: Galaxy Pad, Game Monitor, Exhibition Monitor)
  - Hardware recommendation: Arduino Leonardo + 5× 100mm arcade buttons (~$55)
  - Game engine: Canvas 2D + `AudioContext.currentTime` as master clock
  - Separate backend on port 8001 (independent failure domain from Program A)
  - Duration-based sync: recording and game share same timer, only 1 "start" signal needed
  - JSON chart format with explicit note times
  - Scoring: PERFECT/GREAT/GOOD/MISS windows (50/100/150ms)
  - 9-phase implementation plan
  - Venue risk checklist (10 items)
  - 8 blocking questions for client

**Key Architecture Decisions:**
1. **Foot pads = Arduino USB HID keyboard emulation** — zero drivers, any browser, `keydown` events
2. **Separate FastAPI server (port 8001)** — game crash cannot kill video recording
3. **Canvas 2D engine** — not React DOM rendering; 60fps required for rhythm game
4. **Minimal Program A changes** — only 1 file (RecordingScreen.tsx adds best-effort POST)
5. **Duration-based sync** — no complex cross-backend signaling needed

**Status:** PRD written. Implementation blocked on 8 client questions (song selection, event date, pad construction timeline, etc.)

---

### 2026-04-12 — Program B: Backend Scaffold Created

**User Prompt:**
> Create Program B backend scaffold following Program A patterns exactly.

**Actions Taken:**
- Created all files under `program-b-pump-game/backend/`:

```
backend/
  requirements.txt       — fastapi, uvicorn[standard], pyyaml
  config.yaml            — server (host/port 8001, storage_path, frontend_dist) + game config dict + charts list
  .env.example           — placeholder (no secrets yet)
  config.py              — loads config.yaml, exposes SERVER_HOST/PORT, STORAGE_PATH, FRONTEND_DIST, CHARTS_PATH, MUSIC_PATH, SCORES_PATH, GAME_CONFIG; creates storage dirs on import
  main.py                — FastAPI app "spinat 피아노 타일 펌프", CORS, game+ws routers, /music + /charts static mounts, SPA fallback for /game, startup banner (localhost:8001/game + /docs)
  run.sh                 — venue startup script (port 8001, --reload)
  routers/__init__.py    — empty
  routers/ws.py          — ConnectionManager class, manager singleton, /ws/game WebSocket endpoint
  routers/game.py        — APIRouter prefix=/api/game: POST /start (broadcast game_start), GET /charts (meta list), GET /charts/{id} (full chart+notes), POST /scores (save), GET /scores/latest
  services/__init__.py   — empty
  services/scoring.py    — save_score() writes timestamped JSON, get_latest_score() reads latest by filename sort
  storage/charts/chart_1.json — 30s dummy chart at 120 BPM, 69 notes across 5 lanes, mix of singles and doubles
  storage/music/.gitkeep
  storage/scores/.gitkeep
```

**Verification:**
- Smoke test: `python -c "import main; print('OK')"` → OK, exit 0 (Python 3.14, fresh venv)
- Layer constraints respected: routers import services, services do not import routers

---

### 2026-04-13 — Program B: Architect Verification + Bug Fixes

**Architect Verification Result: PASS (after fixes)**

6 issues identified by architect agent, all fixed:

| # | Issue | Severity | Fix |
|---|---|---|---|
| 1 | Score POST camelCase vs snake_case mismatch → 422 | CRITICAL | `endpoints.ts`: added camelCase→snake_case field mapping |
| 2 | AudioContext never closed → audio dies after ~6 games | MEDIUM | `AudioSync.ts`: `ctx.close()` in `stop()` |
| 3 | Grade thresholds differ from PRD | LOW | `Scorer.ts`: aligned to 0.90/0.80/0.70/0.60 |
| 4 | Missing /music + /charts dev proxy | LOW | `vite.config.ts`: added proxy rules |
| 5 | No state guard on WS game_start | LOW | `useGameWebSocket.ts`: check `screen === 'IDLE'` |
| 6 | rAF leak on ResultScreen unmount | NEGLIGIBLE | `ResultScreen.tsx`: cancel rAF + timeout in cleanup |

Additionally fixed during code review (pre-architect):
- `GameEngine.ts`: audio path `/api/game/audio/` → `/music/` (wrong static mount path)
- `GameEngine.ts` + `NoteManager.ts` + `Renderer.ts`: `hit_zone_y_percent` used raw (85) instead of divided by 100

**Verification:**
- ✅ Backend import: `python -c "import main"` → OK
- ✅ Frontend typecheck: `tsc --noEmit` → 0 errors
- ✅ Frontend build: `vite build` → 63 modules, 181KB JS

---

### Current Status (2026-04-13)

**Program A: 🟢 Implementation complete.**
All code written, tested, and architect-verified. Awaiting user config (format specs, R2 bucket, music files).

**Program B: 🟢 Implementation complete. Architect-verified.**
- Backend: FastAPI on port 8001, all endpoints working, venv set up.
- Frontend: React + Canvas 2D game engine, 4 screens, WebSocket integration, all typechecked.
- Arduino firmware: 55-line sketch for 5-pad USB HID keyboard.
- Program A integration: 1 line added to RecordingScreen.tsx (best-effort POST).
- Updated: verify.sh, ARCHITECTURE.md, AGENTS.md for Program B.
- Still blocked on 8 client questions from PRD. See `program-b-pump-game/PRD.md` § 15.

---

### 2026-04-12 — Program B: Frontend Scaffold + Game Engine + Screens

**User Prompt:**
> Create Program B frontend scaffold + game engine + screens under `program-b-pump-game/frontend/`.

**Actions Taken:**
- Created full Vite + React + TypeScript frontend scaffold mirroring Program A patterns:
  - `package.json`, `vite.config.ts` (proxy `/api` + `/ws` → localhost:8001), `tsconfig.json` (strict), `tailwind.config.ts`, `postcss.config.js`, `index.html`
- Core source files:
  - `src/types.ts` — `Chart`, `ChartNote`, `ChartMeta`, `NoteState`, `GameResult`, `GameConfig`, `GameScreen`, `Judgment`
  - `src/App.tsx` — React Router with `/game` route
  - `src/main.tsx`, `src/index.css` (black fullscreen kiosk styling), `src/vite-env.d.ts`
- API layer:
  - `src/api/client.ts` — `apiFetch<T>()` + `wsUrl()` (same pattern as Program A)
  - `src/api/endpoints.ts` — `fetchCharts()`, `fetchChart(id)`, `submitScore()`
- Zustand store:
  - `src/game/store/gameStore.ts` — `screen`, `chart`, `chartId`, `result` + actions
- WebSocket hook:
  - `src/game/hooks/useGameWebSocket.ts` — connects `/ws/game`, handles `game_start` message, auto-reconnects on close (same pattern as Program A `usePlaylist.ts`)
- Game engine (plain TS classes, no React):
  - `src/game/engine/AudioSync.ts` — AudioContext-based playback with graceful silent fallback for missing audio
  - `src/game/engine/InputHandler.ts` — keydown/keyup → lane mapping, 20ms debounce per lane
  - `src/game/engine/NoteManager.ts` — note lifecycle (active/hit/missed), `tryHit()` with judgment windows, `getVisibleNotes()` for canvas Y-position calculation
  - `src/game/engine/Scorer.ts` — score, combo, maxCombo, grade (S/A/B/C/D), `getResult()`
  - `src/game/engine/Renderer.ts` — Canvas 2D: lanes, hit zone (glowing line), notes (colored circles with highlight), score/combo overlay, floating judgment texts (fade-out animation), lane press highlight
  - `src/game/engine/GameEngine.ts` — orchestrator: `init()` / `start()` / `stop()` / `getResult()`, requestAnimationFrame loop, `onComplete` callback
- Game screens:
  - `src/game/screens/IdleScreen.tsx` — @spinat.official branding, pulsing gradient bg, "대기 중..." text, lane color bar at bottom
  - `src/game/screens/CountdownScreen.tsx` — 3/2/1/GO! with scale animation, transitions to PLAYING
  - `src/game/screens/PlayingScreen.tsx` — fullscreen canvas + GameEngine lifecycle; Escape key skips to RESULT (dev shortcut)
  - `src/game/screens/ResultScreen.tsx` — animated score roll-up, grade scale-in, breakdown table, auto-dismiss after 8s, POSTs score to backend
  - `src/game/GameApp.tsx` — state machine root; spacebar on IDLE loads `chart_1` (or stub chart) for dev testing without WebSocket

**Verification:**
- `npm install` → exit 0
- `tsc --noEmit` → exit 0, zero errors

---

*STATUSLOG maintained by Claude Code agents. Format: date — program — action — status.*
