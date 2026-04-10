# STATUSLOG — spinat-studentup

This file tracks the history of changes, decisions, and current status for all programs in this repository. Any agent or developer can read this file to get up to speed without ambiguity.

---

## Repository Overview

| Program | Directory | Status |
|---|---|---|
| Program A: 릴스 Booth & 모니터 영상전시 툴 | `program-a-reels-booth/` | 🟡 Planning |
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

**Status:** Implementation complete. Ready for venue testing.

**Remaining before production-ready:**
- [ ] User provides 4 video format specs → update `backend/config.yaml`
- [ ] User creates Cloudflare R2 bucket → fills `backend/.env` from `.env.example`
- [ ] Add music files to `backend/storage/music/` if formats require them
- [ ] Test on actual Galaxy Pad + monitor PC setup

---

*STATUSLOG maintained by Claude Code agents. Format: date — program — action — status.*
