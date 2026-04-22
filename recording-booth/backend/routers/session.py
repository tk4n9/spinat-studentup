import json
from fastapi import APIRouter
from config import CONFIG

router = APIRouter(prefix="/api/session", tags=["session"])


def _read() -> int:
    path = CONFIG.session.counter_file
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8")).get("count", 0)
    return 0


def _write(count: int) -> None:
    path = CONFIG.session.counter_file
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"count": count}), encoding="utf-8")


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
    # Pydantic v2 models serialize natively; model_dump() guarantees the
    # on-the-wire shape stays dict (not Pydantic-introspectable) so existing
    # frontend consumers continue to receive plain JSON.
    return [f.model_dump() for f in CONFIG.formats]
