# ARCHITECTURE.md — spinat-studentup

Machine-readable architectural constraints. Agents must respect these rules.

---

## 3-Booth Deployment Model

Four booths deploy independently on **geographically separated PCs**. No remote access between them. Each booth runs its own backend + frontend + local storage. They share exactly one resource: a single Cloudflare R2 bucket with keys namespaced by booth.

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Booth 1 PC    │ │ Booth 2 PC    │ │ Booth 3 PC    │ │ Booth 4 PC    │
│ violin        │ │ biotron       │ │ playtron      │ │ beethoven     │
│ :8000 FastAPI │ │ :8002 FastAPI │ │ :8001 FastAPI │ │ :8003 FastAPI │
│ Galaxy Pad    │ │ Galaxy Pad    │ │ Galaxy Pad    │ │ Galaxy Pad    │
│ local counter │ │ local counter │ │ local counter │ │ local counter │
│ local insta/  │ │ local insta/  │ │ local insta/  │ │ local insta/  │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │
       │ videos/        │ videos/        │ videos/        │ videos/
       │ booth-1/...    │ booth-2/...    │ booth-3/...    │ booth-4/...
       └────────────────┴────────┬───────┴────────────────┘
                                 ▼
                      ┌──────────────────────┐
                      │ Cloudflare R2 bucket │
                      │ (QR code downloads)  │
                      └──────────────────────┘
```

### Rules (booth-level)

1. **No cross-booth runtime dependencies.** Each booth PC boots, runs, and fails independently. No booth may require another to be online.
2. **R2 key prefix = booth identifier.** All uploads use `videos/booth-{BOOTH_ID}/{video_id}{suffix}`. `BOOTH_ID` comes from each booth's `config.yaml` `booth:` section.
3. **Challenger counter is local per booth.** Counter file lives on each booth PC. No syncing.
4. **Instagram folder is local per booth.** Each booth PC has its own `storage/instagram/` directory. No syncing.
5. **Booth identifier is configurable.** `config.yaml` → `booth: { id, name }`. Never hardcoded in source.

### Booth ↔ Program Mapping

| Booth | Name      | Directory | Port | Status |
|---|---|---|---|---|
| 1 | violin    | `recording-booth/` (BOOTH_CONFIG=`config/booth-1.yaml`) | 8000 | Unified (US-001/US-002) |
| 2 | biotron   | `recording-booth/` (BOOTH_CONFIG=`config/booth-2.yaml`) | 8002 | Unified (US-003) |
| 3 | playtron  | `recording-booth/` (BOOTH_CONFIG=`config/booth-3.yaml`) | 8001 | Unified (US-004). Pump-game archived under `archive/pump-game/`. |
| 4 | beethoven | `recording-booth/` (BOOTH_CONFIG=`config/booth-4.yaml`) | 8003 | Added post-unify |

---

## System Topology

### Program A: 릴스 Booth

```
┌──────────────────────────────────────────────────────┐
│                  Local WiFi Network                   │
│                                                       │
│  ┌─────────────┐         ┌────────────────────────┐  │
│  │ Galaxy Pad   │  HTTP   │ Monitor PC              │  │
│  │ Chrome       │◄───────►│ FastAPI Server :8000    │  │
│  │ /pad route   │  WS     │ Chrome /monitor route   │  │
│  └─────────────┘         └────────────────────────┘  │
│                                   │                   │
│                                   │ HTTPS             │
│                                   ▼                   │
│                          ┌────────────────┐          │
│                          │ Cloudflare R2   │          │
│                          │ (QR downloads)  │          │
│                          └────────────────┘          │
└──────────────────────────────────────────────────────┘
```

### Program B: 피아노 타일 펌프

```
┌──────────────────────────────────────────────────────────────┐
│                     Local WiFi Network                        │
│                                                               │
│  ┌──────────────┐       ┌──────────────────────────────────┐ │
│  │ Galaxy Pad    │ HTTP  │ Monitor PC                       │ │
│  │ Chrome /pad   │◄────►│ FastAPI A :8000 + FastAPI B :8001 │ │
│  │               │  WS   │                                  │ │
│  └──────────────┘       │  ┌───────────┐  ┌────────────┐   │ │
│                          │  │ Game Mon  │  │ Exhibit Mon│   │ │
│  ┌──────────────┐  USB  │  │ /game     │  │ /monitor   │   │ │
│  │ 5 Foot Pads  │──────►│  └───────────┘  └────────────┘   │ │
│  │ Arduino HID  │       └──────────────────────────────────┘ │
│  └──────────────┘                │ HTTPS                      │
│                          ┌───────┴────────┐                   │
│                          │ Cloudflare R2   │                   │
│                          └────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

Programs A and B run as independent FastAPI servers on the same PC. Program A (:8000) handles video recording, upload, QR, and exhibition monitor. Program B (:8001) handles the rhythm game on the game monitor. The Galaxy Pad signals Program B to start via a best-effort POST when recording begins. No shared backend code — only a single HTTP call connects them.

## Dependency Layers

Dependencies flow **downward only**. No upward or circular imports.
Each program follows the same layer structure independently.

### Program A

```
Layer 0: Types / Config
  config.py, config.yaml, .env
  frontend/src/types.ts
       │
Layer 1: Services (business logic)
  services/storage.py    — local file I/O
  services/r2.py         — Cloudflare R2 upload
  services/qr_gen.py     — QR code generation
  frontend/src/api/      — HTTP/WS client
       │
Layer 2: Routers / UI Components
  routers/session.py     — session API
  routers/videos.py      — video API (calls services)
  routers/ws.py          — WebSocket (broadcasts)
  frontend/src/pad/      — Galaxy Pad UI
  frontend/src/monitor/  — Monitor display UI
       │
Layer 3: App Assembly
  main.py                — FastAPI app, mounts, startup
  frontend/src/App.tsx   — React Router, entry point
```

### Program B

```
Layer 0: Types / Config
  config.py, config.yaml
  frontend/src/types.ts
       │
Layer 1: Services (business logic)
  services/scoring.py    — score persistence (JSON)
  frontend/src/api/      — HTTP/WS client
  frontend/src/game/engine/ — game engine classes
       │
Layer 2: Routers / UI Components
  routers/game.py        — game API (start, charts, scores)
  routers/ws.py          — WebSocket (game events)
  frontend/src/game/     — Game Monitor UI + screens
       │
Layer 3: App Assembly
  main.py                — FastAPI app, mounts, startup
  frontend/src/App.tsx   — React Router, entry point
```

### Rules

1. **Layer N may only import from Layer N-1 or lower.** `routers/` may import `services/`, but `services/` must never import `routers/`.
2. **Backend and frontend share NO code.** Communication is REST + WebSocket only.
3. **Config is read-only after startup.** `config.py` loads once; services and routers read constants from it.
4. **Secrets live in `.env` only.** Config.yaml has no secrets. `.env` is gitignored.
5. **Static files are served by FastAPI.** Frontend builds to `dist/`, FastAPI mounts it at `/`.
6. **Storage directories are gitignored.** Only `.gitkeep` is tracked. Videos are ephemeral per deployment.

## Data Flow: Video Recording

```
[Galaxy Pad]                    [FastAPI Server]              [R2]       [Monitor]
     │                                │                        │              │
     │──── POST /api/videos/upload ──►│                        │              │
     │◄─── {id} ─────────────────────│                        │              │
     │                                │── save to temp/ ──►   │              │
     │──── POST /finalize ───────────►│                        │              │
     │     {save:T, insta:T}          │── move to display/ ──►│              │
     │                                │── copy to instagram/ ─►│              │
     │                                │── upload_video() ─────►│              │
     │                                │◄── r2_url ────────────│              │
     │                                │── WS broadcast ───────────────────►  │
     │◄─── {id, r2_url} ────────────│                        │   (plays)   │
     │                                │                        │              │
     │ (shows QR of r2_url)          │                        │              │
```

## Cross-Program Integration

Program A → Program B: single best-effort HTTP POST.

```
[Galaxy Pad RecordingScreen]
     │
     │── POST http://localhost:8001/api/game/start ──► [Program B Backend]
     │   { chart_id: "chart_1" }                           │
     │   .catch(() => {})  ← best-effort                   │── WS broadcast ──► [Game Monitor]
     │                                                     │   "game_start"
```

If Program B is not running, the POST silently fails and Program A works exactly as before. No shared state, no shared code, no shared database.

## Verification Contract

Any change must pass `scripts/verify.sh`. The script checks the unified `recording-booth/` tree (import-smoke per booth config + pytest once + frontend typecheck & build):
1. Backend Python imports succeed
2. Backend tests pass (pytest)
3. Frontend TypeScript compiles (tsc --noEmit)
4. Frontend builds (vite build)

**If verify.sh passes silently, the change is safe to commit.**
