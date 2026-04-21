# PRD — booth-2-objects

**Last updated:** 2026-04-20
**Status:** Scaffolded. Ready for venue test pending R2 credentials.
**Repository:** spinat-studentup / booth-2-objects

---

## 1. Overview

A tactile-object booth: the player interacts with physical props (bell, rustling paper, any pre-staged tactile item) while the Galaxy Pad records 30 seconds of video and internal-mic audio. The finished clip goes through the same Review → R2 → QR / monitor flow as Program A. Nothing is synthesized; the audio is whatever the objects + the room actually sound like.

## 2. System

| Device | Role |
|---|---|
| Galaxy Pad (Android tablet) | Start button, camera, internal mic, Review/QR flow |
| Monitor PC (optional) | Serves frontend; optional venue-wide replay monitor on `/monitor` |
| Physical objects | Not controlled by software — staged by the event operator |

The booth is geographically isolated from Booth 1 and Booth 3. The only shared resource across booths is the Cloudflare R2 bucket.

## 3. Flow

```
[START] → [5s countdown] → [30s recording] → [REVIEW] → [SAVE / INSTAGRAM] → [QR or RESTART]
```

Identical to Program A, with `duration_seconds = 30` hard-coded in `config.yaml`.

## 4. Why a separate directory (instead of a flag on Program A)

- **Geographical separation** (C5): each booth runs on its own PC at a different location. There is no operational benefit to sharing a process.
- **Independent deployment:** a Booth 2 config push must not risk changing Booth 1 behavior.
- **Future divergence:** Booth 2 may later grow booth-specific UI (different branding, different copy) without complicating Program A.

Shared code extraction is deferred until Booth 1 audio overlay lands — at which point all three deployments (Program A, Booth 2, any future Booth 1 variant) will show a cleaner common surface for a `shared/` module.

## 5. Non-requirements

- **No song selection.** Booth 2 has one format.
- **No specific object list.** The physical objects are an operator concern, not a software concern.
- **No remote management.** Each booth PC is tended locally; no SSH or AnyDesk requirement.

## 6. Open items

- R2 credentials (`booth-2-objects/backend/.env`) — to be provided at venue setup.
- PC specs — TBD (client to confirm).
- Monitor decision — each booth's local monitor is optional; the event may run without one.
