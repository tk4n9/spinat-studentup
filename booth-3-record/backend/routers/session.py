import json
from fastapi import APIRouter
from config import COUNTER_FILE, FORMATS

router = APIRouter(prefix="/api/session", tags=["session"])


def _read() -> int:
    if COUNTER_FILE.exists():
        return json.loads(COUNTER_FILE.read_text(encoding="utf-8")).get("count", 0)
    return 0


def _write(count: int) -> None:
    COUNTER_FILE.parent.mkdir(parents=True, exist_ok=True)
    COUNTER_FILE.write_text(json.dumps({"count": count}), encoding="utf-8")


@router.get("/counter")
def get_counter():
    return {"count": _read()}


@router.post("/counter/increment")
def increment_counter():
    count = _read() + 1
    _write(count)
    return {"count": count}


@router.get("/formats")
def get_formats():
    return FORMATS
