from pathlib import Path
import yaml

_BASE = Path(__file__).parent
_cfg_path = _BASE / "config.yaml"
with open(_cfg_path, encoding="utf-8") as _f:
    _yaml = yaml.safe_load(_f)

# ── Server ────────────────────────────────────────────
SERVER_HOST: str = _yaml["server"]["host"]
SERVER_PORT: int = _yaml["server"]["port"]
STORAGE_PATH: Path = (_BASE / _yaml["server"]["storage_path"]).resolve()
FRONTEND_DIST: Path = (_BASE / _yaml["server"]["frontend_dist"]).resolve()

# ── Game config ───────────────────────────────────────
GAME_CONFIG: dict = _yaml["game"]

# ── Derived storage paths ─────────────────────────────
CHARTS_PATH: Path = STORAGE_PATH / "charts"
MUSIC_PATH: Path = STORAGE_PATH / "music"
SCORES_PATH: Path = STORAGE_PATH / "scores"

for _p in [CHARTS_PATH, MUSIC_PATH, SCORES_PATH]:
    _p.mkdir(parents=True, exist_ok=True)
