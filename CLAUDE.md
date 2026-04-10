# CLAUDE.md — spinat-studentup

## Quick Reference

- **Verify changes:** `bash scripts/verify.sh` (run after every change)
- **Agent map:** [AGENTS.md](AGENTS.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Status/history:** [STATUSLOG.md](STATUSLOG.md)

## Rules

1. Run `bash scripts/verify.sh` before suggesting a commit. If it fails, fix the issue first.
2. Follow layer constraints in ARCHITECTURE.md — backend services must not import routers.
3. Never commit `.env` files or Cloudflare credentials.
4. Update STATUSLOG.md after any significant change (new feature, bug fix, architecture decision).
5. Korean UI text stays in Korean. Code comments and docs in English.
6. Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.

## Backend

```bash
cd program-a-reels-booth/backend
.venv/bin/python -m pytest tests/ -q   # tests
.venv/bin/python -c "import main"       # smoke test
```

## Frontend

```bash
cd program-a-reels-booth/frontend
./node_modules/.bin/tsc --noEmit        # typecheck
npm run build                           # production build
```
