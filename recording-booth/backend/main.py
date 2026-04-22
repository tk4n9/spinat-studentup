import logging
import socket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import CONFIG, PATHS
from routers import session, videos, ws

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")

app = FastAPI(title="spinat 릴스 Booth", version="1.0.0")

# ── CORS (dev: Vite on :5173; prod: same origin) ──────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────
app.include_router(session.router)
app.include_router(videos.router)
app.include_router(ws.router)


# ── Runtime config for the frontend (US-005 theme injection) ──────
# Must be defined BEFORE the root StaticFiles mount below; any route
# registered after `app.mount("/", StaticFiles(...))` is shadowed by
# the static catch-all and returns 404.
@app.get("/api/booth", include_in_schema=False)
def get_booth_runtime_config() -> dict:
    """Return the subset of BoothConfig the frontend needs on load."""
    return {
        "id": CONFIG.booth.id,
        "name": CONFIG.booth.name,
        "theme": {
            "primary": CONFIG.theme.primary,
            "accent": CONFIG.theme.accent,
            "startCopy": CONFIG.theme.start_copy,
        },
    }


# ── Static file mounts ────────────────────────────────────────────
# Serve recorded videos for the monitor player (supports HTTP Range for seeking)
app.mount("/videos/display", StaticFiles(directory=str(PATHS.display)), name="display")

# Serve music tracks to the Galaxy Pad browser (for Web Audio API)
app.mount("/music", StaticFiles(directory=str(PATHS.music)), name="music")

# ── SPA fallback: serve index.html for client-side routes ─────
if CONFIG.server.frontend_dist.exists():
    _index_path = CONFIG.server.frontend_dist / "index.html"

    @app.get("/pad", include_in_schema=False)
    @app.get("/monitor", include_in_schema=False)
    async def _spa_fallback():
        return FileResponse(_index_path)

    app.mount(
        "/",
        StaticFiles(directory=str(CONFIG.server.frontend_dist), html=True),
        name="frontend",
    )


def _get_local_ip() -> str:

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "알 수 없음"


@app.on_event("startup")
async def _startup():
    local_ip = _get_local_ip()
    port = CONFIG.booth.port
    logging.getLogger("spinat").info(
        f"\n\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"  spinat 릴스 Booth {CONFIG.booth.id} ({CONFIG.booth.name}) — 서버 시작됨\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"  모니터 (이 PC):  http://localhost:{port}/monitor\n"
        f"  갤럭시 패드:     http://{local_ip}:{port}/pad\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    )

