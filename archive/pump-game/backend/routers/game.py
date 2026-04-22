import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import CHARTS_PATH, SCORES_PATH
from routers.ws import manager
from services.scoring import save_score, get_latest_score

router = APIRouter(prefix="/api/game", tags=["game"])


class StartRequest(BaseModel):
    chart_id: str


class ScoreRequest(BaseModel):
    chart_id: str
    score: int
    grade: str
    perfect_count: int
    great_count: int
    good_count: int
    miss_count: int
    max_combo: int


def _load_chart(chart_id: str) -> dict:
    chart_path = CHARTS_PATH / f"{chart_id}.json"
    if not chart_path.exists():
        raise HTTPException(status_code=404, detail=f"Chart '{chart_id}' not found")
    return json.loads(chart_path.read_text(encoding="utf-8"))


@router.post("/start")
async def start_game(body: StartRequest):
    _load_chart(body.chart_id)  # validate existence
    await manager.broadcast({"type": "game_start", "chart_id": body.chart_id})
    return {"status": "started", "chart_id": body.chart_id}


@router.get("/charts")
async def list_charts():
    charts = []
    for path in sorted(CHARTS_PATH.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            meta = data.get("meta", {})
            meta["id"] = path.stem
            charts.append(meta)
        except Exception:
            pass
    return charts


@router.get("/charts/{chart_id}")
async def get_chart(chart_id: str):
    return _load_chart(chart_id)


@router.post("/scores")
async def post_score(body: ScoreRequest):
    filename = save_score(body.model_dump())
    return {"status": "saved", "filename": filename}


@router.get("/scores/latest")
async def latest_score():
    score = get_latest_score()
    if score is None:
        raise HTTPException(status_code=404, detail="No scores found")
    return score
