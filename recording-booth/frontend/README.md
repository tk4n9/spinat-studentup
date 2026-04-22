# recording-booth / frontend

Single Vite + React app that serves all three booth identities. Production
builds once and is served as static files by FastAPI from each booth's
uvicorn process; dev mode proxies API calls to whichever backend you want
to target via the `VITE_BOOTH` env var.

## Dev loop

```bash
cd recording-booth/frontend
npm ci

# Target booth-1 (performance, backend on :8000)
VITE_BOOTH=1 npm run dev

# Target booth-2 (objects, backend on :8002)
VITE_BOOTH=2 npm run dev

# Target booth-3 (record, backend on :8001)
VITE_BOOTH=3 npm run dev
```

Unset `VITE_BOOTH` defaults to booth-1.

## Production

No `VITE_BOOTH` involvement. The build is per-booth-agnostic:

```bash
npm run build                # produces dist/
```

Per-booth identity is injected at runtime via `GET /api/booth`
(`src/store/boothStore.ts`). The same `dist/` directory is served by
all three uvicorn processes, each with its own `BOOTH_CONFIG` env var.

## Per-booth customisation

Backend YAML configs (`recording-booth/config/booth-{1,2,3}.yaml`) set:

- `theme.primary` / `theme.accent` — exposed on `:root` as
  `--theme-primary` / `--theme-accent` CSS custom properties.
- `theme.start_copy` — button label on `StartScreen.tsx`.
- `booth.name` — used as a footer disambiguator (`@spinat.official · <name>`).

To change any of these without a rebuild, edit the YAML and restart the
matching uvicorn process (`scripts/start-all.sh` re-reads on launch).

## Typecheck + build gate

```bash
./node_modules/.bin/tsc --noEmit
npm run build
```

`scripts/verify.sh` runs both from the repo root in silent-on-pass mode.
