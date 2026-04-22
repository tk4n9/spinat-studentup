# STATUSLOG — spinat-studentup

This file tracks the history of changes, decisions, and current status for all programs in this repository. Any agent or developer can read this file to get up to speed without ambiguity.

---

## Repository Overview

| Booth | Directory | Status |
|---|---|---|
| Booth 1 — Performance (음원 + 촬영) | `recording-booth/` (BOOTH_CONFIG=`config/booth-1.yaml`) | 🟢 Unified 2026-04-22 (Ralph #5). Single codebase runs all 3 booths. |
| Booth 2 — Objects (사물 수음)       | `recording-booth/` (BOOTH_CONFIG=`config/booth-2.yaml`) | 🟢 Unified 2026-04-22 (Ralph #5). Port 8002, single `오브제 챌린지` format. |
| Booth 3 — Record                     | `recording-booth/` (BOOTH_CONFIG=`config/booth-3.yaml`) | 🟢 Unified 2026-04-22 (Ralph #5). Port 8001, 4-format clone of booth-1. Pump-game archived under `archive/pump-game/`. |

---

## Log

---

### 2026-04-22 — Ralph #5: Unify 3 booths into single `recording-booth/` codebase (Option B, user-accepted timeline risk)

**User Prompt:**
> Let's please go for the Option B. please start implementing the option B. You may change some directory names such as program-a-reels-booth. Do not care about the timeline conflict. /ralph just do it now.

**Background:**
Post-Path-C, the repo had three parallel booth trees (`program-a-reels-booth/`, `booth-2-objects/`, `booth-3-record/`) — a 2× byte-for-byte clone of Booth 1 plus a fork for Booth 2. Any bug fix had to land three times, any style change had to land three times. Plan `.omc/plans/unify-booths-v2.md` (consensus-approved over 3 critic iterations) prescribed Option B: collapse into one `recording-booth/` tree; three uvicorn processes still boot on their original ports (8000/8002/8001 — non-monotonic by design, preserves iPad QR codes already circulating); identity is selected per process by `BOOTH_CONFIG=recording-booth/config/booth-{1,2,3}.yaml`. Plan Principle 3 + US-15 required a ≥3-day buffer between unify-merge and event, which the timeline did not meet (event 2026-04-24, rehearsal 2026-04-23). Risk was surfaced explicitly at Ralph-session start; user waived the buffer with "Do not care about the timeline conflict" — timeline ownership now user-side.

**Actions Taken:**

Starting commit: `24c3f4c` (Path C — booth-3 clone of booth-1, pump-game archived).
Commit chain (this session):

1. **`021d04a` — US-001/US-002: rename + Pydantic config loader.** `git mv program-a-reels-booth recording-booth`; rewrote `recording-booth/backend/config.py` as a Pydantic v2 model (`BoothConfig` with nested `BoothSection`, `ServerSection`, `SessionSection`, `ThemeSection`, `FormatSpec`, `R2Section`, `StorageSection`). `BOOTH_CONFIG` env var is required — `config.py` raises `SystemExit(2)` with a recognizable error message on missing env var or ValidationError (fail-loud per plan US-14). `FormatSpec` schema matches reality (`id/label/duration_seconds/music_file/music_start_offset`), not the plan draft's `width/height/fps` — plan was authored before live-config inspection; reconciled at implementation time. R2 `bucket/public_url/key_prefix` moved to YAML (public); `R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY` stayed in `.env` (secrets). Old top-level `config.yaml` deleted.

2. **`af1ec38` — US-003: collapse booth-2-objects.** Wrote `recording-booth/config/booth-2.yaml` (port 8002, booth.id=2, `booth.name: objects`, single `오브제 챌린지` format preserved, `storage.r2.key_prefix: 'videos/booth-2/'` — preserves existing R2 URLs). `git rm -r booth-2-objects`. `scripts/start-all.sh` booth-2 invocation rewritten to point at unified backend.

3. **`c4795a0` — US-004: onboard booth-3 + deduplicate bootstrap.** `recording-booth/config/booth-3.yaml` (port 8001, booth.id=3, 4-format clone of booth-1, `videos/booth-3/` prefix). `git rm -r booth-3-record`. `scripts/bootstrap.sh` BOOTHS array reduced to single `recording-booth` entry — one `uv sync`, one `npm ci && npm run build`. `scripts/start-all.sh` loop iterates `1 2 3`, all launching from `recording-booth/backend` with per-booth `BOOTH_CONFIG` exported. Dedup victory: frontend build dropped from 3× to 1×.

4. **`b0bbfb8` — US-005: frontend runtime theme via `/api/booth`.** New `routers/booth.py` returns `{id, name, theme: {primary, accent, startCopy}}` from the loaded `BoothConfig` (camelCase on the wire). React fetches on mount via a Zustand store with an idempotent fetch guard; `StartScreen.tsx` now renders `startCopy` from the fetched config instead of a hardcoded Korean literal. CSS custom properties `--theme-primary`/`--theme-accent` set on `document.documentElement` from the fetched theme. Vite dev proxy reads `VITE_BOOTH` (1→:8000, 2→:8002, 3→:8001). Single `dist/` serves all 3 booths.

5. **`1f0a558` — US-006: idempotent storage migration.** `scripts/migrate-storage.sh` moves pre-unify storage into `recording-booth/backend/storage/booth-{1,2,3}/`, preserves `counter.json` bitwise, scaffolds booth-3 with `{"counter": 0}`. Backup tarball `.backup-$(date +%s).tar.gz` is written only on mutation runs (no spam on no-op reruns). `.gitignore` updated: `booth-*/*` (contents pattern, not `booth-*/` which blocks git descent) + allow-rule `!.../booth-*/.gitkeep`. 3rd/4th runs confirm idempotency.

6. **`d202a47` — US-007: parametrized pytest over 3 booth configs.** `recording-booth/backend/tests/conftest.py` adds `booth_id` fixture (`params=[1,2,3]`). `tests/test_booth_identity.py` spawns a fresh python subprocess per test (4 tests × 3 booths = 12 instances) because `config.py` freezes `@dataclass(frozen=True) PATHS` and caches `CONFIG` at import — `importlib.reload()` can't reset that safely. Subprocess inherits the full parent env (`{**os.environ, "BOOTH_CONFIG": str(yaml)}`), preserving `VIRTUAL_ENV` / `PYTHONHOME` that uv set up. `scripts/verify.sh` refactored: `check_backend_import()` loops per-booth (catches YAML typos in any single booth config at verify time); `check_backend_tests()` runs pytest once with a booth-1 baseline; the fixture handles iteration inside. 24 tests passing.

**Open (post-commit chain):**
- **US-008**: this STATUSLOG entry + CLAUDE.md / AGENTS.md / ARCHITECTURE.md stale-ref sweep + archive/README.md preamble.
- **US-009**: architect THOROUGH-tier reviewer verification against all 34 acceptance criteria across US-001 → US-008.
- **US-010**: fresh-Mac rehearsal in `/tmp/` via `rsync` → `bootstrap.sh` → `start-all.sh` → `curl 200` × 3 + `/api/booth` identity verification → teardown.

**Scope Notes:**
- Plan's optional follow-ups (features/{record,objects}/ plugin mount-points, per-feature routers) are **not** implemented in this ralph session — would require moving business logic, which the 3-day-buffer shortfall made too risky. US-001 through US-010 preserve the existing router/service layout unchanged; plugin extraction is a post-event refactor.
- `recording-booth/PRD.md` still reads as "Program A: 릴스 Booth" (a historical planning artifact — same precedent as requirements.txt references in prior PRDs per 2026-04-22 uv-migration entry). Will be superseded by a post-unify PRD rewrite after the event.
- Pump-game revival path (under `archive/pump-game/`) is unchanged: the 5-step checklist in `archive/README.md` still works, now with a note that post-unify the code should land under `recording-booth/features/game/`.

**Verification:**
- `bash scripts/verify.sh`: EXIT=0 (silent pass: 3× per-booth import smoke + 24 pytest tests + frontend tsc + vite build).
- Manual smoke (logged to `.omc/progress.txt`): `curl http://localhost:{8000,8002,8001}/api/booth` each returns `{id: n, name, theme: {…}}` with the right per-booth identity.
- **Fresh-Mac rehearsal (US-010, 2026-04-23):** rsync'd the repo (minus `.git`/`.venv`/`node_modules`/`dist`/`.omc/logs`) to `/tmp/ralph-5-unify-rehearsal-$$`. `bash scripts/bootstrap.sh` completed in **19 seconds** (warm uv + npm caches; cold-cache expected 2–4 min from 2026-04-22 uv-migration entry data). `bash scripts/start-all.sh` launched all 3 uvicorn processes; `curl` on `/` returned 200/200/200 for ports 8000/8002/8001; `curl /api/booth | jq .id` returned `1/2/3` with `name=performance/objects/booth-3` matching each booth's YAML. Korean `startCopy: "시작하기"` shipped identically through all 3 payloads. Clean teardown via SIGKILL on the uv-run → uvicorn child tree; post-teardown `lsof -i :8000 -i :8001 -i :8002` empty; rehearsal dir removed; main-repo `scripts/verify.sh` still EXIT=0 (rehearsal did not mutate working tree).

**Principle 3 Waiver:**
Plan `.omc/plans/unify-booths-v2.md` Principle 3 requires ≥3 days between unify-merge and event. Today is 2026-04-22, event is 2026-04-24 — buffer is ≤48h. User explicitly waived at session start. Mitigation: US-010 fresh-Mac rehearsal in /tmp/ before event; per-booth YAML typos surface at `scripts/verify.sh` time (US-007 import smoke). Timeline ownership is now user-side; Ralph delivered the unified codebase per the consensus plan.

**Files Changed (chain summary):**
- Renamed: `program-a-reels-booth/` → `recording-booth/` (git mv, preserves history).
- Deleted: `booth-2-objects/`, `booth-3-record/`.
- Added: `recording-booth/config/booth-{1,2,3}.yaml`, `recording-booth/backend/routers/booth.py`, `recording-booth/backend/tests/conftest.py`, `recording-booth/backend/tests/test_booth_identity.py`, `scripts/migrate-storage.sh`, `recording-booth/backend/storage/booth-{1,2,3}/.gitkeep`.
- Rewritten: `recording-booth/backend/config.py` (Pydantic), `scripts/bootstrap.sh`, `scripts/start-all.sh`, `scripts/verify.sh`.
- Modified (US-008 doc sweep, this commit): `STATUSLOG.md`, `CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `recording-booth/AGENTS.md`, `archive/README.md`.

---

### 2026-04-22 — uv + pyproject.toml Migration Across 3 Booths

**User Prompt:**
> 시연이 급하진 않고, 실전에서 쓰기 편하도록 하는 것이 중요해. 왜냐면 실제 공연 날에 그날 처음 쓰는 맥북으로 서버를 돌려야 하거든.
> 이제 어차피 드롭박스로 다른 곳에서 작업을 많이 하진 않을 것 같아서 (공연용 맥에서는 그냥 git clone할 예정, 내가 현재 사용하는 맥북이 여러개라서 여기저기에서 작업을 계속 이어가고 싶어서 그렇게 한 거였음. 앞으로 공연때까지는 하나의 맥으로 개발 예정) 그냥 모두가 .venv를 써도 될 것 같아. /ralph 구현 시작해 줘.

**Background:**
Event-day reliability is now the priority. On the performance day, the operator will git-clone onto a brand-new MacBook and must be able to boot all 3 booth servers with zero manual dependency wrangling. The prior Dropbox-era `.venv_$(whoami)` convention (supporting simultaneous work from accounts `tk` and `gtpv`) is obsolete — the user is consolidating onto a single Mac for the remaining run-up. Each booth previously relied on an ad-hoc `python3 -m venv .venv && pip install -r requirements.txt` flow with no lockfile and no Python-version pinning, which risks "worked yesterday, fails today" drift on a fresh system.

**Actions Taken:**

1. **Backend modernization (all 3 booths).** Replaced `requirements.txt` with `pyproject.toml` + uv-generated `uv.lock` for bit-exact reproducibility.
   - `program-a-reels-booth/backend/pyproject.toml` (`spinat-booth-1-performance`) — pinned identical runtime deps (fastapi 0.110.1, uvicorn[standard] 0.29.0, python-multipart 0.0.9, boto3 1.34.84, qrcode[pil] 7.4.2, Pillow 10.3.0, PyYAML 6.0.1, python-dotenv 1.0.1, aiofiles 23.2.1) and dev group (pytest 8.1.1, httpx 0.27.0).
   - `booth-2-objects/backend/pyproject.toml` (`spinat-booth-2-objects`) — same deps (byte-aligned fork of Program A).
   - `program-b-pump-game/backend/pyproject.toml` (`spinat-booth-3-pump-game`) — preserved the looser `>=` bounds from the original scaffold (fastapi>=0.111.0, uvicorn[standard]>=0.29.0, PyYAML>=6.0) and added pytest/httpx dev group.
   - All three declare `requires-python = ">=3.12,<3.13"` and `[tool.uv] package = false` (these are apps, not libraries).
   - Ran `uv sync` in each backend to generate `uv.lock` and `.venv/`. Deleted the now-redundant `requirements.txt` in all three booths.

2. **Unified venv convention.** Dropped `.venv_$(whoami)` entirely. All booths now use the plain `.venv/` directory that `uv sync` creates. The `.gitignore` was updated to remove the `.venv*/` wildcard (redundant with `.venv/`) and add an explicit comment that `uv.lock` must stay tracked.

3. **Runtime scripts rewritten.**
   - `program-a-reels-booth/backend/run.sh`, `booth-2-objects/backend/run.sh`, `program-b-pump-game/backend/run.sh` — all three now `exec uv run uvicorn main:app --host 0.0.0.0 --port <port> --reload`. No more `.venv/bin/uvicorn` fallback chain. `.env` loading switched from the unsafe `export $(grep -v '^#' .env | xargs)` pattern to `set -a; . ./.env; set +a`. Operator-facing banner preserved; IP discovery now uses `uv run python` instead of a system `python3`.

4. **New orchestration scripts.**
   - `scripts/bootstrap.sh` — one-command fresh-Mac setup. Installs uv via the official `astral.sh` installer if missing (extends PATH to include `$HOME/.local/bin` + `$HOME/.cargo/bin`), runs `uv python install 3.12`, fires `uv sync --frozen` in all 3 backends in parallel, then runs `npm ci && npm run build` for each frontend sequentially (to avoid a vite build memory spike), and finally runs `scripts/verify.sh` as a post-flight gate. Prints a clear `✓ Bootstrap complete` marker on success.
   - `scripts/start-all.sh` — launches all 3 backends in background via `uv run uvicorn`, tees each booth's output to `.omc/logs/booth-{1,2,3}.log`, installs an `INT`/`TERM` trap that reaps children cleanly, and `wait`s so Ctrl+C exits gracefully.

5. **Verification script simplified.** `scripts/verify.sh` rewritten:
   - Removed `pick_python()` — no longer needed.
   - Backend checks run via `uv run --frozen python -c "import main"` and `uv run --frozen pytest tests/ -q`.
   - Skips a booth gracefully if `pyproject.toml` or `uv.lock` is missing (prints `SKIP`, doesn't fail), and skips the whole backend lane if `uv` is not on PATH.
   - Frontend lane (tsc + vite build) behavior unchanged.
   - Single `check_backend` / `check_frontend` pair drives all 3 booths — removes the copy-paste divergence the old script had.

6. **Documentation refreshed.**
   - `CLAUDE.md` — Quick Reference now lists `bootstrap.sh` + `start-all.sh`. Backend section rewritten around `uv sync` / `uv run`. Added rule 7: always commit `uv.lock`. Added an event-day workflow section.
   - `AGENTS.md` — Key Commands block replaced with uv-based equivalents. New Tooling section documents Python 3.12 via uv (no pyenv, no system Python).
   - `program-a-reels-booth/README.md` — both Quick Setup and Client Demo sections converted to `uv sync` + `uv run uvicorn`.
   - `booth-2-objects/README.md` — Setup section converted; points first-time operators at `scripts/bootstrap.sh`.
   - `program-b-pump-game/README.md` — Quick Setup and Client Demo sections converted.
   - The `.venv_$(whoami)` / `.venv_tk` strings remaining in the repo now live only in prior STATUSLOG entries (where they document history — intentionally preserved).

**Scope Notes:**
- PRDs (`program-a-reels-booth/PRD.md`, `program-b-pump-game/PRD.md`) still reference `requirements.txt` in their narrative — those are planning artifacts describing the original intent, not operator-facing setup docs, and were left untouched.
- pyenv is deliberately **not** adopted — uv manages Python itself via `uv python install 3.12`, which removes one tool from the fresh-Mac dependency chain.

**Verification:**
- `bash scripts/verify.sh`: EXIT=0 (silent pass across 3 booths × backend import / pytest / tsc / vite build).
- All 3 `uv.lock` files tracked by git.
- Clean-Mac rehearsal: fresh `git clone` to a tmp directory, `bash scripts/bootstrap.sh` from scratch, `bash scripts/start-all.sh` — see Story US-011 outcome in `.omc/progress.txt`.

**Migration Notes (restore path):**
If a booth needs to temporarily revert, `uv export --format requirements-txt > requirements.txt` from its backend directory regenerates a pip-compatible file from the locked pins. The prior `.venv_$(whoami)` convention can be re-enabled by setting `UV_PROJECT_ENVIRONMENT=.venv_$(whoami)` before `uv sync` — no source changes required.

**Files Changed:**
- Added: `program-a-reels-booth/backend/pyproject.toml`, `program-a-reels-booth/backend/uv.lock`
- Added: `booth-2-objects/backend/pyproject.toml`, `booth-2-objects/backend/uv.lock`
- Added: `program-b-pump-game/backend/pyproject.toml`, `program-b-pump-game/backend/uv.lock`
- Added: `scripts/bootstrap.sh`, `scripts/start-all.sh`
- Deleted: `program-a-reels-booth/backend/requirements.txt`, `booth-2-objects/backend/requirements.txt`, `program-b-pump-game/backend/requirements.txt`
- Modified: `program-a-reels-booth/backend/run.sh`, `booth-2-objects/backend/run.sh`, `program-b-pump-game/backend/run.sh`
- Modified: `scripts/verify.sh`, `.gitignore`
- Modified: `CLAUDE.md`, `AGENTS.md`, `program-a-reels-booth/README.md`, `booth-2-objects/README.md`, `program-b-pump-game/README.md`, `STATUSLOG.md`

---

### 2026-04-21 — iPad MP4 Recorder Refactor (Program A + Booth 2)

**User Prompt:**
> Booth3: I will going to attach physical pads (experimenting several options, I think i'll will make some external physical pad that can be interpreted as keyboard input)
> Booth2: current full flow is correct.
> Yes. I approve the Ipad mp4 refactor. /ralph please start it.

**Background:**
Hardware reality: 1 MacBook + 4 iPads + 4 LG StandbyMe TVs, no per-booth PCs. iPad Safari MediaRecorder produces only MP4 (H.264/AAC), not webm. Previous code assumed webm everywhere — hardcoded `recording.webm` filename, unconditional `fix-webm-duration` call (corrupts MP4 moov atom), `ContentType='video/webm'` in R2 uploader.

**Actions Taken:**
- `program-a-reels-booth/frontend/src/pad/hooks/useVideoRecorder.ts` + booth-2 fork: added `recordedMimeType` state, gated `fixWebmDuration` on `mimeType.startsWith('video/webm')`, exposed mimeType in hook return.
- `program-a-reels-booth/frontend/src/api/endpoints.ts` + booth-2 fork: `uploadVideo` derives extension from `blob.type` (`mp4`/`webm`).
- `program-a-reels-booth/backend/services/r2.py` + booth-2 fork: added `_CONTENT_TYPES` dict + `_content_type_for()` helper; unknown suffix → `application/octet-stream`.
- `program-a-reels-booth/backend/tests/test_api.py` + booth-2 fork: added `_fake_mp4()` helper + `test_upload_returns_id_mp4` + `test_finalize_mp4_save_only` (asserts `.mp4` suffix preserved in DISPLAY_PATH).

**Scope Notes:**
- Program B (pump-game) intentionally excluded — no `/pad` route, no useVideoRecorder.
- Booth 3 input routing (physical pads → keyboard HID) deferred to hardware experiment.

**Verification:**
- `tsc --noEmit`: 0 errors both frontends.
- `vite build`: success both frontends.
- `pytest`: 10 → 12 passed both backends (+2 MP4 tests each).
- `bash scripts/verify.sh`: EXIT=0.
- Architect review: APPROVE — end-to-end suffix chain intact (blob filename → UploadFile → storage.py → r2.py).
- Deslop: removed unused `json`/`Path` imports from both test files. Post-deslop regression: EXIT=0.

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

### 2026-04-20 — Repo: 3-Booth Restructure + Booth-2 Scaffold

**User Prompt (new client spec):**
> 부스 1 — 음원(주말 녹음 예정) + 영상 촬영 / 부스 2 — 사물을 만지면 소리 나는 걸 수음해 영상에 입힘 / 부스 3 — 기존 Program B 발판 게임.
> 즉시 착수 가능 작업부터. /ralph start implementing.

**Client Q&A (architecture decisions):**

| # | Question | Answer |
|---|---|---|
| B2-1 | 부스 2 마이크 | 갤럭시 패드 내장 마이크 |
| B2-3 | 부스 2 녹화 길이 | 30초 고정 |
| C4 | 부스 식별자 | Configurable (config.yaml에 booth section) |
| C5 | 부스 간 거리 | Geographically separated (원격 접속 없음) |
| C6 | R2 버킷 | Unified — single bucket, booth_id prefix로 네임스페이스 |
| C7 | Instagram 폴더 | Local (per-booth PC, no sync) |
| C8 | Challenger counter | Independent per-booth (local file) |
| C10 | Remote access | Not required |

**Actions Taken:**

1. **Program A: added booth_id config + R2 key prefix**
   - `backend/config.yaml`: new top-level `booth: { id: 1, name: "performance" }` section
   - `backend/config.py`: exports `BOOTH_ID` (int), `BOOTH_NAME` (str)
   - `backend/services/r2.py`: R2 key changed from `videos/{id}{suffix}` → `videos/booth-{BOOTH_ID}/{id}{suffix}`
   - Rationale: unified R2 bucket shared by 3 booths, prefix prevents key collisions + enables per-booth access control later.

2. **Booth 2 scaffold — `booth-2-objects/`**
   - Full copy of `program-a-reels-booth/` (backend + frontend + tests).
   - `backend/config.yaml`: `server.port=8002`, `booth.id=2`, `booth.name="objects"`, single format (`오브제 챌린지`, 30s, no music_file).
   - `backend/main.py`: title → `"spinat 오브제 Booth (#2)"`, startup banner URLs updated to `:8002`.
   - `backend/run.sh`: port `8000` → `8002`.
   - `backend/tests/test_api.py`: `len(fmts) == 4` → `len(fmts) == 1`, added `duration_seconds == 30` assertion.
   - `frontend/package.json`: name → `spinat-booth-2-objects-frontend`.
   - `frontend/vite.config.ts`: all dev proxies → `:8002`.
   - `frontend/index.html`: title → `"spinat 오브제 Booth (#2)"`.
   - `frontend/src/pad/screens/StartScreen.tsx`: footer → `@spinat.official · 오브제 #2`.
   - New docs: `AGENTS.md`, `README.md`, `PRD.md` describing booth-2 scope + relationship to Program A.
   - Rationale: no shared/ module extracted yet — fork first, extract common code after pattern stabilizes across booths.

3. **Program B: PEP 604 compatibility fix**
   - `backend/services/scoring.py`: added `from __future__ import annotations`.
   - Root cause: `dict | None` return annotation requires Python 3.10+; booth PCs may run 3.9. `__future__` import defers annotation evaluation → works on 3.9.

4. **`scripts/verify.sh` extended**
   - Added `pick_python()` helper: probes `.venv_$(whoami)/bin/python` then `.venv/bin/python`, returns first executable path. Handles dangling symlinks from homebrew Python upgrades.
   - New booth-2 backend + frontend check block mirroring Program A.
   - `.venv_tk` (user `tk`) and `.venv` (user `gtpv`) both supported transparently.

5. **Docs updated**
   - `AGENTS.md`: 2-program → 3-booth table, geographical separation note, `videos/booth-{id}/` R2 key convention.
   - `STATUSLOG.md`: this entry.
   - `ARCHITECTURE.md`: new "3-Booth Topology" section + per-booth dependency layer notes.

**Verification:**
- `bash scripts/verify.sh` → exit 0 (Program A + B + booth-2 all pass; pytest 10 passed, tsc 0 errors, vite build OK).

**Status:**
- Booth 1 (`program-a-reels-booth/`): 🟢 Complete for recording path. Audio-overlay scope still blocked on client spec (곡 파일, duration, speaker, sync tolerance).
- Booth 2 (`booth-2-objects/`): 🟡 Scaffolded. Ready for venue deployment once Galaxy Pad mic capture tested.
- Booth 3 (`program-b-pump-game/`): 🟡 Scaffolded. Still blocked on 8 client questions (song, event date, pad builder, etc.).

---

### 2026-04-22 — Path C: Booth-3 Onboarding as Recording Clone (Pre-Event Triage)

**User Prompt:**
> rehearsal day is tomorrow and the main event is the day after tomorrow. Please go for /ralph path to implement them

**Background:**
Rehearsal 2026-04-23, event 2026-04-24. The consensus unify plan (`.omc/plans/unify-booths-v2.md`) requires a ≥3-day rehearsal buffer (Principle 3 / US-15) — no longer met by the calendar.

**Decision:** Scope-reduce to **Path C** — keep Booth 1 / Booth 2 untouched (Ralph #3 green baseline), archive dormant pump-game to `archive/pump-game/`, clone Booth 1 to `booth-3-record/` for the event-day gap. Full unify plan deferred to post-event.

**Actions Taken:**

1. **Archived pump-game** — `git mv program-b-pump-game archive/pump-game` (46 rename entries). Added `archive/README.md` with 5-step revival checklist.

2. **Cloned booth-1 → booth-3-record** — `rsync -a` excluding `.venv/`, `node_modules/`, `dist/`. Identity edits:
   - `config.yaml`: port 8000 → 8001, booth.id 1 → 3, booth.name "performance" → "booth-3".
   - `pyproject.toml`: name → "spinat-booth-3-record".
   - `frontend/package.json`: name similarly renamed.
   - `.env` copied (shared R2 bucket, per-booth key prefix).

3. **Bootstrapped deps** — `uv sync`, `npm ci`, `npm run build`. All checks pass (12/12 pytest, tsc 0 errors, 66-module vite build).

4. **Updated 3 launcher scripts:**
   - `scripts/bootstrap.sh`: `BOOTHS=(... program-b-pump-game)` → `(... booth-3-record)`.
   - `scripts/start-all.sh`: booth-3 `start_booth` target `program-b-pump-game/backend` → `booth-3-record/backend`. Banner text `"Booth 3 (Pump Game)"` → `"Booth 3 (Record)"`.
   - `scripts/verify.sh`: booth-3 `check_backend` + `check_frontend` paths swapped; label updated.

5. **Docs:** Overview table updated, `booth-3-record/README.md` rewritten as minimal pointer to booth-1 README.

**Verification:**
- `bash scripts/verify.sh` → EXIT=0 (all 3 booths, 12/12 pytest booth-3).
- `git status`: 46 `R` (rename) entries + `booth-3-record/` untracked + `STATUSLOG.md` modified.

**Why Path C over Path B (full unify now):**
- Zero-day rehearsal buffer means any regression from the 8-commit refactor becomes an event-day hotfix -- exactly what Principle 3 forbids.
- Path C diff: 3 script edits + 3 identity-file edits + 1 archive move + 2 docs (~30 min vs ~2-day refactor).
- Ralph #3 green baseline (12/12 tests, verify EXIT=0, 22.20s bootstrap) preserved as recovery point.
- 3-codebase duplication accepted as event-safety cost; unify plan deferred to post-event.

**Follow-ups (post-event):**
- Execute `.omc/plans/unify-booths-v2.md` with ≥3-day rehearsal buffer.
- Resolve open questions in `.omc/plans/open-questions.md` (StartScreen copy, R2 bucket split, game revival).

**Rehearsal outcome (US-009):**
- Scheduled 2026-04-23. Metrics in `.omc/progress.txt`.

---

*STATUSLOG maintained by Claude Code agents. Format: date — program — action — status.*
