import os
from pathlib import Path
import yaml
from dotenv import load_dotenv

load_dotenv()

_BASE = Path(__file__).parent
_cfg_path = _BASE / "config.yaml"
with open(_cfg_path, encoding="utf-8") as _f:
    _yaml = yaml.safe_load(_f)

# ── Server ────────────────────────────────────────────
SERVER_HOST: str = _yaml["server"]["host"]
SERVER_PORT: int = _yaml["server"]["port"]
STORAGE_PATH: Path = (_BASE / _yaml["server"]["storage_path"]).resolve()
FRONTEND_DIST: Path = (_BASE / _yaml["server"]["frontend_dist"]).resolve()

# ── Booth identity ────────────────────────────────────
# booth.id prefixes R2 keys so videos from separate booths stay
# namespaced inside the one bucket shared across all deployments.
BOOTH_ID: int = _yaml["booth"]["id"]
BOOTH_NAME: str = _yaml["booth"]["name"]

# ── Session ───────────────────────────────────────────
COUNTER_FILE: Path = (_BASE / _yaml["session"]["counter_file"]).resolve()

# ── Video formats ─────────────────────────────────────
FORMATS: list[dict] = _yaml["formats"]

# ── Cloudflare R2 ─────────────────────────────────────
R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "spinat-reels-booth")
R2_PUBLIC_URL: str = os.getenv("R2_PUBLIC_URL", "")
QR_EXPIRY_DAYS: int = int(os.getenv("QR_EXPIRY_DAYS", "7"))

# ── Derived storage paths ─────────────────────────────
DISPLAY_PATH: Path = STORAGE_PATH / "display"
INSTAGRAM_PATH: Path = STORAGE_PATH / "instagram"
TEMP_PATH: Path = STORAGE_PATH / "temp"
MUSIC_PATH: Path = STORAGE_PATH / "music"

for _p in [DISPLAY_PATH, INSTAGRAM_PATH, TEMP_PATH, MUSIC_PATH]:
    _p.mkdir(parents=True, exist_ok=True)
