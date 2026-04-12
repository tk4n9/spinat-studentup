import logging
import socket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import FRONTEND_DIST, MUSIC_PATH, CHARTS_PATH
from routers import game, ws

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")

app = FastAPI(title="spinat 피아노 타일 펌프", version="1.0.0")

# ── CORS (dev: allow all; prod: same origin) ──────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────
app.include_router(game.router)
app.include_router(ws.router)

# ── Static file mounts ────────────────────────────────────────────
# Serve music tracks via HTTP (Web Audio API)
app.mount("/music", StaticFiles(directory=str(MUSIC_PATH)), name="music")

# Serve chart JSON files directly (frontend can also fetch charts this way)
app.mount("/charts", StaticFiles(directory=str(CHARTS_PATH)), name="charts")

# ── SPA fallback: serve index.html for client-side routes ─────────
if FRONTEND_DIST.exists():
    _index_path = FRONTEND_DIST / "index.html"

    @app.get("/game", include_in_schema=False)
    async def _spa_fallback():
        return FileResponse(_index_path)

    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


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
    logging.getLogger("spinat").info(
        f"\n\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"  spinat 피아노 타일 펌프 — 서버 시작됨\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"  Game Monitor:  http://localhost:8001/game\n"
        f"  API docs:      http://localhost:8001/docs\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    )
