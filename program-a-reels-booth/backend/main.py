import logging
import socket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import FRONTEND_DIST, DISPLAY_PATH, MUSIC_PATH
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

# ── Static file mounts ────────────────────────────────────────────
# Serve recorded videos for the monitor player (supports HTTP Range for seeking)
app.mount("/videos/display", StaticFiles(directory=str(DISPLAY_PATH)), name="display")

# Serve music tracks to the Galaxy Pad browser (for Web Audio API)
app.mount("/music", StaticFiles(directory=str(MUSIC_PATH)), name="music")

# Serve built React frontend (production)
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


@app.on_event("startup")
async def _startup():
    try:
        s = socket.socket()
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "알 수 없음"

    logging.getLogger("spinat").info(
        f"\n\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"  spinat 릴스 Booth — 서버 시작됨\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"  모니터 (이 PC):  http://localhost:8000/monitor\n"
        f"  갤럭시 패드:     http://{local_ip}:8000/pad\n"
        f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    )
