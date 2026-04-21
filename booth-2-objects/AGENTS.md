# AGENTS.md — booth-2-objects

> Galaxy Pad records 30s of sound from physical objects (bell, paper) being touched.
> Audio = Galaxy Pad internal mic (no special capture). Video + audio land in the
> unified R2 bucket under the `videos/booth-2/` prefix.

## Scope

- **Input:** Galaxy Pad camera + internal mic. Player touches physical objects in frame.
- **Duration:** Fixed 30 seconds (no format selector).
- **Output:** Same as Program A — local display folder, optional Instagram folder, optional R2 upload + QR.
- **Deployment:** Independent PC. No network link to other booths. One unified R2 bucket (key prefix `videos/booth-2/`).

## Relationship to Program A

This booth is structurally identical to `program-a-reels-booth`. The only differences:

| Aspect | Program A | Booth 2 |
|---|---|---|
| `server.port` | 8000 | 8002 |
| `booth.id` | 1 | 2 |
| `booth.name` | `performance` | `objects` |
| Formats | 4 placeholders | 1 fixed (30s, no music) |
| Title bar | "릴스 Booth" | "오브제 Booth (#2)" |

Any Program A behavior fix should be ported here too until a shared module is extracted.

## Verify

```bash
cd booth-2-objects/backend
.venv/bin/python -m pytest tests/ -q
.venv/bin/python -c "import main"

cd ../frontend
./node_modules/.bin/tsc --noEmit
npm run build
```

Or from repo root: `bash scripts/verify.sh`.

## Notes

- **R2 namespacing:** Uploads go to `videos/booth-2/<uuid>.webm` so the shared bucket can distinguish each booth's output.
- **No song files:** Booth 2 has no backing track. Audio comes from whatever noise the objects make while the mic is rolling.
- **Challenger counter:** Local to this PC only. Booth 1 and Booth 3 keep their own independent counters.
