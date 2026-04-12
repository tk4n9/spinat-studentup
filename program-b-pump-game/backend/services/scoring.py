import json
from datetime import datetime, timezone
from pathlib import Path

from config import SCORES_PATH


def save_score(data: dict) -> str:
    """Save score dict to SCORES_PATH/{timestamp}.json. Returns the filename."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    filename = f"{timestamp}.json"
    path = SCORES_PATH / filename
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return filename


def get_latest_score() -> dict | None:
    """Return the most recent score JSON by filename sort, or None if none exist."""
    files = sorted(SCORES_PATH.glob("*.json"))
    if not files:
        return None
    return json.loads(files[-1].read_text(encoding="utf-8"))
