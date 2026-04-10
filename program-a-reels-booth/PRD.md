# PRD — Program A: 릴스 Booth & 모니터 영상전시 툴
*Reels Booth & Monitor Video Exhibition Tool*

**Last updated:** 2026-04-10  
**Status:** Planning  
**Repository:** spinat-studentup / program-a-reels-booth

---

## 1. Overview

A two-device interactive video recording booth system for exhibitions and events.

| Device | Role |
|---|---|
| Galaxy Pad (Android tablet) | Booth controller — recording, review, consent |
| Large Monitor + PC | Exhibition display — accumulated video playlist loop |

Users step up to the booth, record a short video (with optional background music), then choose whether to save it for QR download, display on the exhibition monitor, and/or save for Instagram upload.

---

## 2. User Flow

```
[START SCREEN]
  "N번째 챌린저님, 파이팅!"   ← challenger count
  [ START ]
     ↓
[COUNTDOWN: 5s]
  5 → 4 → 3 → 2 → 1 ...
  (pre-recorded music begins if format requires it)
     ↓
[RECORDING]
  Timer: top-right corner (remaining time countdown)
  Music: playing (if format has it)
  Auto-stops at designated duration
     ↓
[REVIEW SCREEN]
  Video: infinite loop playback on Galaxy Pad
  ┌─────────────────────────────────────────────┐
  │ ☐  저장하시겠습니까?                          │
  │    (체크 시 QR코드 제공 + 모니터에 전시)       │
  │ ☐  인스타그램 업로딩에 동의하십니까?           │
  │    (체크 시 @spinat.official 업로드 예정)      │
  │                    [ 완료 ]                   │
  └─────────────────────────────────────────────┘
     ↓
[COMPLETION LOGIC — based on checkbox state]

  ✅ Both checked  → QR code screen + "다시시작"
                     Video → monitor display
                     Video → instagram/ folder

  ☑1 only (Save)  → QR code screen + "다시시작"
                     Video → monitor display

  ☑2 only (Insta) → "다시시작" button only
                     Video → instagram/ folder

  ☐ Neither        → Return to START SCREEN directly
     ↓ (for QR cases)
[QR CODE SCREEN]
  Shows QR code pointing to downloadable video
  [ 다시시작 ]   ← resets to START SCREEN
```

---

## 3. Monitor Display Behavior

- Runs independently in a browser window on the monitor PC (fullscreen)
- Plays all accumulated "display" videos in a continuous loop
- New videos appear automatically (real-time via WebSocket notification)
- Audio plays through connected headset/speakers
- Shows the N-th video in queue; when list ends, loops back to first

---

## 4. Video Format Modes (4 types — specs TBD)

The system supports 4 configurable video formats. Each format defines:

| Property | Description |
|---|---|
| `id` | Format identifier (1–4) |
| `label` | Display name |
| `duration_seconds` | Recording length (e.g., 30) |
| `music_file` | Path to pre-recorded audio (null if none) |
| `music_start_offset` | Seconds into music to start from (default 0) |

> **Note:** Full format specs to be provided by user. Format config will live in `backend/config.yaml`.

---

## 5. Technical Architecture

### 5.1 Architecture Decision: Python FastAPI + React Web App

**Rationale:**
- No APK install required on Galaxy Pad — just open Chrome
- Single codebase for both Pad UI and Monitor UI (React, route-based)
- FastAPI server handles file storage, QR generation, WebSocket events
- Easy to deploy at a venue (run one Python server on the monitor PC)
- Maintainable by a small team without mobile dev expertise

**Trade-off acknowledged:**
- Browser-based recording (MediaRecorder API) has some codec constraints vs native Android
- Mitigated by: Chrome on Android has solid MediaRecorder support for `video/webm;codecs=vp8,opus`
- Audio mixing uses Web Audio API (AudioContext) — tested and feasible in Android Chrome

### 5.2 System Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    Local WiFi Network                           │
│                                                                 │
│   ┌──────────────────┐          ┌──────────────────────────┐   │
│   │   Galaxy Pad      │          │  Monitor PC               │   │
│   │   Chrome Browser  │◄────────►│  Python FastAPI Server    │   │
│   │                   │  HTTP /  │  + Chrome Browser          │   │
│   │  React Pad App    │  WS      │  (monitor display)        │   │
│   │  /pad route       │          │  /monitor route           │   │
│   └──────────────────┘          │                            │   │
│                                  │  storage/                  │   │
│                                  │  ├── display/   ← monitor  │   │
│                                  │  └── instagram/ ← insta    │   │
│                                  └──────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### 5.3 Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend | Python 3.11+ / FastAPI | Async, easy file ops, WebSocket built-in |
| Frontend | React 18 + TypeScript + Vite | Fast dev, type safety, component model |
| Styling | Tailwind CSS | Rapid UI, responsive, kiosk-friendly |
| Video Recording | MediaRecorder API (browser) | No install needed |
| Audio Mixing | Web Audio API (AudioContext) | Mix music + mic into single stream |
| QR Code (server) | `qrcode` Python library | Generates PNG served via API |
| QR Code (client) | `qrcode.react` | Optional: client-side QR display |
| Video Transfer | Fetch API (multipart upload) | Simple blob → FormData → POST |
| Real-time Sync | WebSocket (FastAPI native) | Monitor gets instant notification |
| State Mgmt | Zustand | Lightweight, simple for this use case |
| Wake Lock | Screen Wake Lock API (Chrome 84+) | Prevents tablet sleep; must re-acquire on visibilitychange |
| WebM fix | `fix-webm-duration` npm library | Adds duration metadata so seek bar works in review playback |

---

## 6. File Structure

```
spinat-studentup/
├── STATUSLOG.md
├── program-a-reels-booth/
│   ├── PRD.md                    ← this file
│   ├── backend/
│   │   ├── main.py               ← FastAPI app entry point
│   │   ├── routers/
│   │   │   ├── videos.py         ← upload, download, list endpoints
│   │   │   ├── qr.py             ← QR code generation
│   │   │   └── websocket.py      ← WebSocket monitor sync
│   │   ├── config.yaml           ← format configs, server settings
│   │   ├── requirements.txt
│   │   ├── run.sh                ← start script for venue
│   │   └── storage/
│   │       ├── display/          ← videos queued for monitor loop
│   │       └── instagram/        ← videos approved for Instagram
│   └── frontend/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── package.json
│       └── src/
│           ├── App.tsx            ← Route: /pad → PadApp, /monitor → MonitorApp
│           ├── main.tsx
│           ├── pad/
│           │   ├── PadApp.tsx     ← state machine root for Galaxy Pad
│           │   ├── screens/
│           │   │   ├── StartScreen.tsx
│           │   │   ├── CountdownScreen.tsx
│           │   │   ├── RecordingScreen.tsx
│           │   │   ├── ReviewScreen.tsx
│           │   │   └── QRCodeScreen.tsx
│           │   ├── hooks/
│           │   │   ├── useVideoRecorder.ts   ← MediaRecorder + audio mix
│           │   │   ├── useCountdown.ts
│           │   │   └── useWakeLock.ts
│           │   └── store/
│           │       └── sessionStore.ts       ← Zustand: session state
│           ├── monitor/
│           │   ├── MonitorApp.tsx            ← fullscreen playlist player
│           │   └── hooks/
│           │       └── usePlaylist.ts        ← WebSocket-driven playlist
│           └── api/
│               ├── client.ts                 ← axios/fetch base config
│               └── endpoints.ts              ← typed API calls
```

---

## 7. Key API Endpoints

### REST

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/session/counter` | Returns current challenger count (N) |
| `POST` | `/api/videos/upload` | Upload recorded video blob (multipart) |
| `GET` | `/api/videos/{id}` | Download video by ID (for QR link) |
| `GET` | `/api/videos/display` | List all display-queue videos (for monitor) |
| `GET` | `/api/qr/{id}` | Get QR code PNG for video download link |
| `GET` | `/api/config/formats` | Get 4 video format configs |
| `POST` | `/api/videos/{id}/finalize` | Finalize: route to display/instagram based on flags |

### WebSocket

| Path | Direction | Event |
|---|---|---|
| `WS /ws/monitor` | Server → Monitor | `{type: "new_video", id: "...", url: "..."}` |
| `WS /ws/monitor` | Server → Monitor | `{type: "playlist_update", videos: [...]}` |

---

## 8. Pad App — Screen State Machine

```
State: START_SCREEN
  Action: user presses START
  → State: COUNTDOWN

State: COUNTDOWN
  Duration: 5 seconds
  Side effect: preload audio track (if format requires)
  → State: RECORDING

State: RECORDING
  Duration: format.duration_seconds
  Side effects:
    - MediaRecorder captures video + audio
    - If format.music_file: AudioContext plays music, mixes into recording stream
    - Timer displayed top-right (remaining seconds)
    - Wake Lock active
  → State: REVIEW (auto, on timer end)

State: REVIEW
  Side effects:
    - Video blob plays on loop (local URL.createObjectURL)
    - Wake Lock active
  Action: user presses 완료
  → Route based on checkbox state:
       save=true, insta=true  → upload(save=true, insta=true) → State: QR_CODE
       save=true, insta=false → upload(save=true, insta=false) → State: QR_CODE
       save=false, insta=true → upload(save=false, insta=true) → State: RESTART
       save=false, insta=false → (no upload) → State: START_SCREEN

State: QR_CODE
  Side effects: display QR code from server
  Action: 다시시작 button
  → State: START_SCREEN

State: RESTART
  Transient — shows "다시시작" button
  Action: press
  → State: START_SCREEN
```

---

## 9. Audio Mixing Implementation

**Validated via research — confirmed feasible on Android Chrome.**

For formats with pre-recorded music, the canonical Web Audio API pattern:

```typescript
// 1. Camera video (no audio) + separate mic stream
const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
const micStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    // Samsung Galaxy Tab OneUI 6.0+ fix: disable noise processing
    noiseSuppression: false,
    echoCancellation: false,
    autoGainControl: false,
  }
});

// 2. AudioContext mixing destination
const audioCtx = new AudioContext();
const dest = audioCtx.createMediaStreamDestination();

// 3. Mic input → mix
const micSource = audioCtx.createMediaStreamSource(micStream);
micSource.connect(dest);

// 4. Background music → mix + speakers
const audioEl = document.getElementById('bgMusic') as HTMLAudioElement;
const bgSource = audioCtx.createMediaElementSource(audioEl);
bgSource.connect(dest);                   // into recording
bgSource.connect(audioCtx.destination);   // also to speaker/headset output

// 5. Combined stream: camera video + mixed audio
const combined = new MediaStream([
  ...camStream.getVideoTracks(),
  ...dest.stream.getAudioTracks(),
]);

// 6. Codec detection (never hardcode)
const mimeTypes = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1,mp4a.40.2',  // Chrome 130+ only
];
const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t))!;

// 7. Record with explicit bitrates
const recorder = new MediaRecorder(combined, {
  mimeType,
  videoBitsPerSecond: 800_000,
  audioBitsPerSecond: 128_000,
});
```

**Note on WebM playback seeking:** MediaRecorder WebM files often lack a valid `duration` in metadata — seek bar won't work. Use the [`fix-webm-duration`](https://github.com/yusitnikov/fix-webm-duration) library on the recorded Blob before upload if seeking in the review player is needed.

Result: video file contains both user voice + background music.

---

## 10. Monitor App Behavior

```
1. On load: fetch /api/videos/display → initial playlist
2. Connect WebSocket: /ws/monitor
3. Display: fullscreen video player, loop through playlist array
4. On WS message {type: "new_video"}: append to playlist queue
5. If playlist was empty: start playing immediately
6. Current video ends → advance index → loop back to 0 when at end
7. Audio: on by default (user can hear via headset connected to monitor PC)
```

---

## 11. Configuration (config.yaml)

```yaml
server:
  host: "0.0.0.0"
  port: 8000
  storage_path: "./storage"

session:
  counter_file: "./storage/counter.json"

formats:
  - id: 1
    label: "기본 챌린지"
    duration_seconds: 30
    music_file: null

  - id: 2
    label: "챌린지 A"
    duration_seconds: 15
    music_file: "music/track_a.mp3"
    music_start_offset: 0

  - id: 3
    label: "챌린지 B"
    duration_seconds: 45
    music_file: "music/track_b.mp3"
    music_start_offset: 5

  - id: 4
    label: "챌린지 C"
    duration_seconds: 20
    music_file: null

# To be filled when format specs are provided
```

---

## 12. Deployment (Venue Setup)

```bash
# On monitor PC (one-time setup):
cd program-a-reels-booth/backend
pip install -r requirements.txt
python main.py
# Server starts at http://0.0.0.0:8000

# On monitor PC browser:
# Open http://localhost:8000/monitor  (fullscreen F11)

# On Galaxy Pad (Chrome):
# Open http://192.168.x.x:8000/pad   ← PC's local IP
# (IP shown in terminal on server start)
```

---

## 13. Implementation Phases

### Phase 1 — Backend Foundation
- [ ] FastAPI project setup + requirements.txt
- [ ] Video upload endpoint (multipart)
- [ ] Video download endpoint
- [ ] Session counter (read/increment/persist to JSON)
- [ ] Display playlist endpoint
- [ ] Static file serving for frontend build

### Phase 2 — Pad UI Core
- [ ] React + Vite + Tailwind setup
- [ ] React Router: /pad and /monitor routes
- [ ] Start screen with challenger counter
- [ ] Countdown screen (5s visual)
- [ ] Recording screen (MediaRecorder, timer overlay)
  - Use `MediaRecorder.isTypeSupported()` for codec detection (never hardcode)
  - Samsung Galaxy Tab: disable `noiseSuppression`, `echoCancellation`, `autoGainControl` in getUserMedia
  - Set explicit `videoBitsPerSecond: 800_000, audioBitsPerSecond: 128_000`
- [ ] Review screen (video loop + checkboxes + 완료 button)
  - Apply `fix-webm-duration` on Blob before creating object URL (enables seek)
- [ ] Wake Lock integration
  - Re-acquire on `document.visibilitychange` (released automatically on tab switch)
  - Requires HTTPS in production

### Phase 3 — Video Transfer & QR
- [ ] Upload blob to FastAPI on 완료
- [ ] Finalize endpoint (routes video based on flags)
- [ ] QR code generation (Python qrcode lib)
- [ ] QR Code screen in React

### Phase 4 — Monitor Display
- [ ] Monitor fullscreen player React component
- [ ] Playlist API integration
- [ ] WebSocket client (auto-add new videos)
- [ ] Loop playback logic

### Phase 5 — Audio & Formats
- [ ] Web Audio API mixing hook (useVideoRecorder.ts)
- [ ] Format config API endpoint
- [ ] Format selection on start screen (or admin config)
- [ ] Music files serving from backend

### Phase 6 — Polish & Kiosk Hardening
- [ ] Full-screen kiosk mode (no browser UI visible)
- [ ] Error states + reconnection logic
- [ ] Prevent accidental navigation on Galaxy Pad
- [ ] Loading states + transitions
- [ ] "N번째 챌린저님, 파이팅!" final styling

---

## 14. Open Questions (requires user input)

| # | Question | Impact |
|---|---|---|
| 1 | Exact specs for 4 video formats (duration, music track, etc.) | Phase 5 config |
| 2 | How is the monitor connected to PC? (HDMI direct, secondary display?) | Deployment notes |
| 3 | Same WiFi network guaranteed at venue? | Architecture assumption |
| 4 | Does Galaxy Pad stay fixed at one format, or does operator choose per session? | Format selector UI |
| 5 | Should the QR video URL work outside the local network? (requires cloud hosting or tunneling) | QR scannability |
| 6 | Instagram folder = local folder only, or eventual API auto-upload? | Phase scope |
| 7 | Video resolution preference? (720p recommended for size/performance balance) | Recording config |
| 8 | What is Program B? (for repo structure planning) | Repo layout |

---

*PRD authored: 2026-04-10*
