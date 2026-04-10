"""
Backend API smoke tests.
Run: cd backend && .venv/bin/python -m pytest tests/ -q
"""
import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app
from config import COUNTER_FILE, DISPLAY_PATH, INSTAGRAM_PATH, TEMP_PATH


@pytest.fixture(autouse=True)
def _clean_storage():
    """Remove test artifacts before and after each test."""
    for d in [DISPLAY_PATH, INSTAGRAM_PATH, TEMP_PATH]:
        for f in d.iterdir():
            if f.is_file() and not f.name.startswith("."):
                f.unlink()
    if COUNTER_FILE.exists():
        COUNTER_FILE.unlink()
    yield
    for d in [DISPLAY_PATH, INSTAGRAM_PATH, TEMP_PATH]:
        for f in d.iterdir():
            if f.is_file() and not f.name.startswith("."):
                f.unlink()
    if COUNTER_FILE.exists():
        COUNTER_FILE.unlink()


@pytest.fixture
def client():
    return TestClient(app)


def _fake_video() -> io.BytesIO:
    buf = io.BytesIO(b"\x00" * 1024)
    buf.name = "test.webm"
    return buf


# ── Session ──────────────────────────────────────────────────

def test_counter_starts_at_zero(client):
    r = client.get("/api/session/counter")
    assert r.status_code == 200
    assert r.json()["count"] == 0


def test_counter_increments(client):
    client.post("/api/session/counter/increment")
    client.post("/api/session/counter/increment")
    r = client.get("/api/session/counter")
    assert r.json()["count"] == 2


def test_formats_returns_list(client):
    r = client.get("/api/session/formats")
    assert r.status_code == 200
    fmts = r.json()
    assert isinstance(fmts, list)
    assert len(fmts) == 4
    assert all("id" in f and "duration_seconds" in f for f in fmts)


# ── Video upload ─────────────────────────────────────────────

def test_upload_returns_id(client):
    r = client.post(
        "/api/videos/upload",
        files={"video_file": ("test.webm", _fake_video(), "video/webm")},
        data={"format_id": "1"},
    )
    assert r.status_code == 200
    assert "id" in r.json()


# ── Finalize paths ───────────────────────────────────────────

def _upload_and_finalize(client, save: bool, instagram: bool) -> dict:
    up = client.post(
        "/api/videos/upload",
        files={"video_file": ("test.webm", _fake_video(), "video/webm")},
        data={"format_id": "1"},
    )
    vid_id = up.json()["id"]
    r = client.post(
        f"/api/videos/{vid_id}/finalize",
        data={"save": str(save).lower(), "instagram": str(instagram).lower()},
    )
    return {"status": r.status_code, "body": r.json(), "id": vid_id}


def test_finalize_both(client):
    res = _upload_and_finalize(client, save=True, instagram=True)
    assert res["status"] == 200
    # display folder should have 1 file
    assert len(list(DISPLAY_PATH.iterdir())) == 1
    # instagram folder should have 1 file
    assert len([f for f in INSTAGRAM_PATH.iterdir() if f.is_file()]) == 1


def test_finalize_save_only(client):
    res = _upload_and_finalize(client, save=True, instagram=False)
    assert res["status"] == 200
    assert len(list(DISPLAY_PATH.iterdir())) == 1
    assert len([f for f in INSTAGRAM_PATH.iterdir() if f.is_file()]) == 0


def test_finalize_instagram_only(client):
    res = _upload_and_finalize(client, save=False, instagram=True)
    assert res["status"] == 200
    assert len(list(DISPLAY_PATH.iterdir())) == 0
    assert len([f for f in INSTAGRAM_PATH.iterdir() if f.is_file()]) == 1


def test_finalize_neither_discards(client):
    res = _upload_and_finalize(client, save=False, instagram=False)
    assert res["status"] == 200
    assert len(list(DISPLAY_PATH.iterdir())) == 0
    assert len([f for f in INSTAGRAM_PATH.iterdir() if f.is_file()]) == 0
    # temp should also be empty
    assert len([f for f in TEMP_PATH.iterdir() if f.is_file()]) == 0


# ── Display list ─────────────────────────────────────────────

def test_display_list_empty(client):
    r = client.get("/api/videos/display")
    assert r.status_code == 200
    assert r.json() == []


def test_display_list_after_save(client):
    _upload_and_finalize(client, save=True, instagram=False)
    r = client.get("/api/videos/display")
    vids = r.json()
    assert len(vids) == 1
    assert "url" in vids[0]
    assert "id" in vids[0]
