# booth-2-objects — 오브제 Booth

Galaxy Pad records 30 seconds of video + internal-mic audio while a player handles tactile props (bell, rustling paper, etc.). The resulting clip flows through the same Review / R2 / QR pipeline as Program A.

---

## Setup

Prefer the one-command bootstrap from the repo root (installs uv, Python 3.12, all booth deps, frontend builds):

```bash
bash scripts/bootstrap.sh
```

Or set up just this booth manually:

```bash
# Backend (uv auto-creates .venv/ and installs from uv.lock)
cd booth-2-objects/backend
uv sync
cp .env.example .env   # fill R2 credentials if QR sharing is needed

# Frontend
cd ../frontend
npm ci
npm run build
```

## Run

```bash
cd booth-2-objects/backend
./run.sh              # FastAPI on :8002
```

Galaxy Pad browser → `http://<pc-lan-ip>:8002/pad`
Venue monitor (optional) → `http://localhost:8002/monitor`

## Config

`backend/config.yaml`:

- `server.port` — 8002 (avoids collision with Program A on 8000 and Program B on 8001)
- `booth.id` / `booth.name` — prefixes R2 object keys under `videos/booth-2/`
- `formats[0].duration_seconds` — 30 (fixed)

## Storage layout

```
storage/
├── counter.json       ← per-booth challenger counter (local JSON)
├── temp/              ← uploads in progress
├── display/           ← saved videos (monitor playlist source)
├── instagram/         ← copies flagged for the IG curator
└── music/             ← empty (booth 2 has no backing track)
```

## Verify

```bash
bash scripts/verify.sh        # from repo root — covers all 3 booths
```

## Diffs vs. Program A

This booth was forked from `program-a-reels-booth` with targeted changes:

- Port 8000 → 8002
- `booth.id` 1 → 2, `booth.name` "performance" → "objects"
- 4 format placeholders → 1 fixed 30-second format
- All user-facing Korean strings rebranded "릴스" → "오브제"

When porting a fix from Program A, change only the above fields — the rest should match byte-for-byte.
