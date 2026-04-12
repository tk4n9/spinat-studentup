# PRD — Program B: 미니 피아노 타일식 펌프

*Mini Piano Tiles-style Pump Game*

**Last updated:** 2026-04-12
**Status:** Planning (consensus plan approved, blocking questions pending)
**Repository:** spinat-studentup / program-b-pump-game

---

## 1. Overview

A rhythm game booth where players stomp on 5 physical foot pads in time with falling circles on a game monitor, while being filmed by the Galaxy Pad. After the game ends, the recorded video goes through Program A's existing Review → QR/Save/Instagram flow.

| Device | Role |
|---|---|
| Galaxy Pad (Android tablet) | Start button, video recording, Review/QR flow |
| Game Monitor (PC display) | Falling circles game display |
| Exhibition Monitor (PC display) | Accumulated video playlist (Program A, unchanged) |
| 5 Foot Pads (Arduino USB HID) | Player input — stomp to hit notes |

---

## 2. System Topology

```
┌──────────────────────────────────────────────────────────────────┐
│                     Local WiFi Network                            │
│                                                                   │
│  ┌──────────────┐       ┌─────────────────────────────────────┐  │
│  │ Galaxy Pad    │ HTTP  │ Monitor PC                          │  │
│  │ Chrome /pad   │◄────►│ FastAPI A (:8000) + FastAPI B (:8001)│  │
│  │               │  WS   │                                     │  │
│  └──────────────┘       │  ┌─────────────┐  ┌──────────────┐  │  │
│                          │  │ Game Monitor │  │ Exhibit Mon  │  │  │
│  ┌──────────────┐  USB  │  │ Chrome /game │  │ Chrome /mon  │  │  │
│  │ 5 Foot Pads  │──────►│  └─────────────┘  └──────────────┘  │  │
│  │ (Arduino HID)│       └─────────────────────────────────────┘  │
│  └──────────────┘                    │ HTTPS                      │
│                              ┌───────┴────────┐                   │
│                              │ Cloudflare R2   │                   │
│                              └────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. User Flow

```
[GALAXY PAD: START SCREEN]
  "N번째 챌린저님, 파이팅!"
  [ START ]
     ↓
[GALAXY PAD: COUNTDOWN 5s]
  5 → 4 → 3 → 2 → 1
  Simultaneously: POST /api/game/start to Program B backend
     ↓
[SIMULTANEOUS — duration = song length]
  Galaxy Pad: RECORDING (camera captures player)
  Game Monitor: PLAYING (falling circles, player stomps pads)
  Both end when song/timer expires
     ↓
[GAME MONITOR: RESULT SCREEN (8s)]
  Score display, grade (S/A/B/C/D), hit/miss breakdown
     ↓
[GALAXY PAD: REVIEW SCREEN]
  (Existing Program A flow — unchanged)
  Video loop + checkboxes (저장/인스타) + 완료
     ↓
[COMPLETION — same as Program A]
  QR code / monitor display / Instagram folder
```

---

## 4. Game Mechanics

### 4.1 Falling Notes

- 5 vertical lanes on game monitor, one per foot pad
- Colored circles fall from top to bottom at constant scroll speed
- Hit zone line near bottom (~85% from top)
- Player stomps corresponding pad when circle reaches hit zone
- Music plays continuously regardless of hits/misses

### 4.2 Timing Judgment

| Judgment | Window | Points |
|----------|--------|--------|
| PERFECT | ≤ 50ms | 100 |
| GREAT | ≤ 100ms | 70 |
| GOOD | ≤ 150ms | 40 |
| MISS | > 150ms or no press | 0 |

These windows are intentionally generous — this is a casual event booth with foot pads (less precise than fingers), not a competitive rhythm game. All values configurable in `config.yaml`.

### 4.3 Scoring (Karaoke-style)

Final score = `(total_earned / max_possible) × 100` → displayed as 0-100.

| Score | Grade |
|-------|-------|
| 90-100 | S |
| 80-89 | A |
| 70-79 | B |
| 60-69 | C |
| < 60 | D |

**Note:** Scoring is classified as nice-to-have. MVP = visual hit/miss feedback only.

---

## 5. Physical Foot Pads

### 5.1 Hardware Recommendation: Arduino Leonardo + Arcade Buttons

| Component | Spec | Cost |
|-----------|------|------|
| Arduino Leonardo (or Pro Micro clone) | ATmega32u4, native USB HID | ~$15 |
| 5× 100mm arcade buttons (sanwa-style) | Normally-open, designed for stomping | ~$20 |
| Plywood enclosure | ~120cm × 40cm × 18mm, 5 holes with 100mm hole saw | ~$10 |
| Rubber feet + anti-slip mat | Prevent sliding during play | ~$5 |
| USB cable (3-5m extension) | Arduino to Monitor PC | ~$5 |

Total: ~$55

### 5.2 Keyboard Mapping

| Pad # | Position | Key | Arduino Pin |
|-------|----------|-----|-------------|
| 1 | Far left | `a` | D2 |
| 2 | Left | `s` | D3 |
| 3 | Center | `d` | D4 |
| 4 | Right | `f` | D5 |
| 5 | Far right | `g` | D6 |

### 5.3 Arduino Firmware

~30 lines using `Keyboard.h`. Each pad = normally-open momentary switch wired between digital pin and GND (`INPUT_PULLUP`). Software debounce at 20ms.

Browser receives standard `KeyboardEvent` — zero drivers, any browser.

### 5.4 Why This Approach

| Alternative | Why not |
|---|---|
| Makey Makey | $50+, only 6 inputs, small clips not ideal for stomping, no custom debounce |
| USB dance pad (DDR) | Usually 4 arrows — need 5. Poor build quality on cheap ones |
| Arduino + WebSerial | Requires Chrome-only API, permission prompts, more complex |
| Bluetooth | 30-100ms+ latency, pairing issues, venue WiFi/BT interference |

**Critical development note:** Build ALL software with keyboard keys A/S/D/F/G first. Physical pads are a parallel hardware task connected at the end.

---

## 6. Technical Architecture

### 6.1 Separate Backend (Port 8001)

Program B runs its own FastAPI server on port 8001, separate from Program A's port 8000.

**Rationale:**
- Independent failure domains — game crash must NOT kill video recording pipeline
- Follows repo convention (each program in its own directory)
- Integration = 1 POST call + shared duration config
- Deployment: single `run.sh` starts both servers

### 6.2 Game Engine: Canvas 2D + AudioContext

**Decision: HTML5 Canvas with `requestAnimationFrame`, NOT React component rendering.**

- Rhythm game needs 60fps. React's reconciliation cycle adds latency/jank.
- Canvas 2D = direct pixel rendering, no DOM overhead.
- WebGL overkill for falling circles.
- `AudioContext.currentTime` = master clock (monotonic, tied to audio hardware, no drift).

Each frame:
1. Read `AudioContext.currentTime`
2. For each note: `screenY = (note.time - audioCurrentTime) * scrollSpeed`
3. Render visible notes, hit effects, score overlay
4. `requestAnimationFrame(next)`

### 6.3 Duration-Based Sync (Not Signal-Based)

**Key insight:** Recording duration = song duration. Both start from same trigger, both end when timer expires. No cross-backend "game_end" signal needed.

```
Galaxy Pad: START → countdown → recording starts (duration = song length)
                                    ↓ POST /api/game/start
Game Monitor:                    countdown → game plays → result screen
                                    ↓ (same duration)
Galaxy Pad:                      recording ends → REVIEW (existing flow)
```

Only 1 signal needed: "START game now."

---

## 7. Song/Chart Format

```json
{
  "meta": {
    "title": "챌린지 곡 1",
    "artist": "spinat",
    "audio_file": "track_a.mp3",
    "duration_seconds": 60,
    "bpm": 120,
    "offset_ms": 0
  },
  "notes": [
    { "time": 1.000, "lane": 2 },
    { "time": 1.500, "lane": 0 },
    { "time": 1.500, "lane": 4 },
    { "time": 2.000, "lane": 1 },
    { "time": 2.000, "lane": 3 }
  ]
}
```

- `time`: seconds from audio start (float, ms precision)
- `lane`: 0-4 (left to right)
- `offset_ms`: global timing offset for venue audio latency calibration
- `bpm`: informational only (actual timing uses explicit times)

**Authoring workflow:** Play song in Audacity → note beat timestamps → write JSON. ~1-2 hours per song.

---

## 8. File Structure

```
program-b-pump-game/
├── PRD.md                    ← this file
├── AGENTS.md
├── README.md
├── backend/
│   ├── main.py               ← FastAPI, port 8001
│   ├── config.py
│   ├── config.yaml
│   ├── requirements.txt      ← fastapi, uvicorn, pyyaml
│   ├── .env.example
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── game.py           ← POST /api/game/start, GET /api/game/charts
│   │   └── ws.py             ← WS /ws/game
│   ├── services/
│   │   ├── __init__.py
│   │   └── scoring.py
│   └── storage/
│       ├── charts/
│       │   └── chart_1.json
│       ├── music/
│       └── scores/
└── frontend/
    ├── package.json
    ├── vite.config.ts         ← proxy to :8001
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── index.html
    └── src/
        ├── App.tsx            ← /game → GameApp
        ├── main.tsx
        ├── types.ts
        ├── game/
        │   ├── GameApp.tsx    ← IDLE → COUNTDOWN → PLAYING → RESULT
        │   ├── screens/
        │   │   ├── IdleScreen.tsx
        │   │   ├── CountdownScreen.tsx
        │   │   ├── PlayingScreen.tsx  ← hosts <canvas>
        │   │   └── ResultScreen.tsx
        │   ├── engine/
        │   │   ├── GameEngine.ts      ← core loop: update + render
        │   │   ├── NoteManager.ts     ← note positions, hit detection
        │   │   ├── InputHandler.ts    ← key → lane, debounce
        │   │   ├── Renderer.ts        ← Canvas 2D drawing
        │   │   ├── AudioSync.ts       ← AudioContext master clock
        │   │   └── Scorer.ts          ← judgment + score calc
        │   ├── hooks/
        │   │   └── useGameWebSocket.ts
        │   └── store/
        │       └── gameStore.ts
        └── api/
            ├── client.ts
            └── endpoints.ts
```

---

## 9. API Endpoints (Program B, port 8001)

### REST

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/game/start` | Start game session `{ chart_id }` → broadcasts via WS |
| `GET` | `/api/game/charts` | List available charts (meta only) |
| `GET` | `/api/game/charts/{id}` | Full chart with notes |
| `POST` | `/api/game/scores` | Save score `{ chart_id, score, grade, stats }` |
| `GET` | `/api/game/scores/latest` | Most recent score |

### WebSocket

| Path | Direction | Event |
|---|---|---|
| `WS /ws/game` | Server → Game Monitor | `{ type: "game_start", chart_id: "chart_1" }` |
| `WS /ws/game` | Game Monitor → Server | `{ type: "game_end", score: 85, grade: "A" }` |

---

## 10. Game Monitor State Machine

```
State: IDLE
  Display: "대기 중..." (@spinat.official branding)
  Transition: WS receives "game_start"
  → State: COUNTDOWN

State: COUNTDOWN
  Duration: 3 seconds
  Display: 3... 2... 1... with visual pulse
  → State: PLAYING

State: PLAYING
  Duration: chart.meta.duration_seconds
  Side effects:
    - AudioContext plays chart audio
    - Canvas renders falling notes @ 60fps
    - Keyboard events → hit detection
    - Score/combo updated real-time
  → State: RESULT (auto, when audio ends)

State: RESULT
  Duration: 8 seconds (auto-dismiss)
  Display: score, grade, breakdown, max combo
  Side effects: POST score to backend
  → State: IDLE
```

---

## 11. Program A Modifications (Minimal)

Only **1 file** changes:

**`program-a-reels-booth/frontend/src/pad/screens/RecordingScreen.tsx`**

After recording starts, fire best-effort POST to Program B:

```typescript
fetch('http://localhost:8001/api/game/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chart_id: 'chart_1' }),
}).catch(() => {}); // if B not running, A works fine alone
```

No backend changes. No new types. No state machine changes.

---

## 12. Configuration (config.yaml)

```yaml
server:
  host: "0.0.0.0"
  port: 8001
  storage_path: "./storage"
  frontend_dist: "../frontend/dist"

game:
  perfect_window_ms: 50
  great_window_ms: 100
  good_window_ms: 150
  scroll_speed: 400            # pixels per second
  note_radius: 30
  hit_zone_y_percent: 85       # % from top
  perfect_points: 100
  great_points: 70
  good_points: 40
  result_display_seconds: 8
  countdown_seconds: 3
  lane_keys: ["a", "s", "d", "f", "g"]
  audio_offset_ms: 0           # calibrate at venue

charts:
  - id: "chart_1"
    file: "charts/chart_1.json"
```

---

## 13. Implementation Phases

| Phase | What | Depends on |
|-------|------|-----------|
| 1 | Backend foundation (FastAPI, config, WS, chart serving) | Nothing |
| 2 | Game engine (Canvas, NoteManager, Renderer, AudioSync) | Phase 1 |
| 3 | Input handling (keyboard events, debounce, hit detection) | Phase 2 |
| 4 | Game UI screens (Idle, Countdown, Playing, Result) | Phase 2-3 |
| 5 | Integration w/ Program A (RecordingScreen POST) | Phase 1 |
| 6 | Scoring + Result display | Phase 3-4 |
| 7 | Arduino firmware + pad wiring | Anytime (parallel) |
| 8 | Chart authoring (needs song selected) | **Song decision** |
| 9 | Venue testing + calibration | Everything |

---

## 14. Venue Risk Checklist

**Must complete before event:**

- [ ] All 5 pads register keystrokes (diagnostic page)
- [ ] Audio plays through correct speakers (not HDMI monitor audio)
- [ ] Game monitor ≥30fps during gameplay
- [ ] Galaxy Pad records video while game runs (simultaneous test)
- [ ] Recorded video plays correctly on ReviewScreen
- [ ] QR code works on phone NOT on venue WiFi (R2 upload test)
- [ ] Exhibition monitor continues playing accumulated videos
- [ ] Full cycle: Start → game → review → save → QR → scan → verify
- [ ] 10 back-to-back sessions without server restart
- [ ] Power failure recovery: kill server, restart, verify clean state

**Known risks:**
- Audio routes to wrong output device → configure at venue
- Camera permission prompt → pre-grant in Chrome settings
- Pad wire loosens from stomping → diagnostic page for quick check
- Game timing feels "off" → adjust `audio_offset_ms` on-site
- Monitor screensaver → disable power management on PC

---

## 15. Blocking Questions (Must Answer Before Code)

| # | Question | Why it blocks | Default if silent |
|---|----------|--------------|-------------------|
| 1 | **어떤 노래?** Which song(s)? | Chart cannot be authored without specific song | 1 song, any 120 BPM pop |
| 2 | **노래 길이?** Fixed game duration? | Recording duration + chart length | 60 seconds |
| 3 | **발판 누가 만듦?** Who builds pads? Timeline? | If not ready 3+ days before event → testing impossible | Dev provides spec, client builds |
| 4 | **행사 날짜?** Event date? | Hard deadline → feasible scope | Assume 2 weeks |
| 5 | **점수 필수?** Scoring required or just fun? | Adds state mgmt + UI | Visual hit/miss only |
| 6 | **기기 몇대?** How many PCs/monitors? | Architecture depends on this | 1 PC, 2 outputs, 1 Galaxy Pad |
| 7 | **게임 모니터에 카메라 화면도?** Camera feed on game monitor? | Layout complexity | No — game only |
| 8 | **발판 고장나면?** Pad disconnects mid-game? | Error handling | Game continues, lane inactive |

---

## 16. MVP Definition

**"Done" = 1 song, 5 lanes, pads trigger hits, video records, video goes through Review/QR flow.**

| Feature | Classification |
|---------|---------------|
| 5 falling lanes with circles synced to music | **MVP** |
| Step detection from pads (keyboard input) | **MVP** |
| Video recording during game (Galaxy Pad) | **MVP** |
| Resume into Program A Review flow | **MVP** |
| Visual hit/miss feedback | **MVP** |
| Score display (karaoke-style) | Nice-to-have |
| Multiple songs / chart selection | Nice-to-have |
| Combo multipliers, rank grades | Nice-to-have |

---

*PRD authored: 2026-04-12 — Consensus plan from architect + critic agents*
