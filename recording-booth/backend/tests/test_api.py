"""
Backend API smoke tests.
Run: cd backend && .venv/bin/python -m pytest tests/ -q
"""
import io

import pytest
from fastapi.testclient import TestClient

from main import app
from config import CONFIG, PATHS


@pytest.fixture(autouse=True)
def _clean_storage():
    """Remove test artifacts before and after each test."""
    counter_file = CONFIG.session.counter_file
    dirs = [PATHS.display, PATHS.instagram, PATHS.temp]
    for d in dirs:
        for f in d.iterdir():
            if f.is_file() and not f.name.startswith("."):
                f.unlink()
    if counter_file.exists():
        counter_file.unlink()
    yield
    for d in dirs:
        for f in d.iterdir():
            if f.is_file() and not f.name.startswith("."):
                f.unlink()
    if counter_file.exists():
        counter_file.unlink()


@pytest.fixture
def client():
    return TestClient(app)


def _fake_video() -> io.BytesIO:
    buf = io.BytesIO(b"\x00" * 1024)
    buf.name = "test.webm"
    return buf


def _fake_mp4() -> io.BytesIO:
    buf = io.BytesIO(b"\x00" * 1024)
    buf.name = "test.mp4"
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
    # Count comes from the active BOOTH_CONFIG, not a hardcoded literal —
    # booth-2 ships 1 format ("오브제 챌린지"), booths 1/3 ship 4. Asserting
    # against CONFIG makes the test shape-agnostic across all three configs.
    r = client.get("/api/session/formats")
    assert r.status_code == 200
    fmts = r.json()
    assert isinstance(fmts, list)
    assert len(fmts) == len(CONFIG.formats)
    assert len(fmts) >= 1
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


def test_upload_returns_id_mp4(client):
    r = client.post(
        "/api/videos/upload",
        files={"video_file": ("test.mp4", _fake_mp4(), "video/mp4")},
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
    assert len(list(PATHS.display.iterdir())) == 1
    # instagram folder should have 1 file
    assert len([f for f in PATHS.instagram.iterdir() if f.is_file()]) == 1


def test_finalize_save_only(client):
    res = _upload_and_finalize(client, save=True, instagram=False)
    assert res["status"] == 200
    assert len(list(PATHS.display.iterdir())) == 1
    assert len([f for f in PATHS.instagram.iterdir() if f.is_file()]) == 0


def test_finalize_mp4_save_only(client):
    up = client.post(
        "/api/videos/upload",
        files={"video_file": ("test.mp4", _fake_mp4(), "video/mp4")},
        data={"format_id": "1"},
    )
    vid_id = up.json()["id"]
    r = client.post(
        f"/api/videos/{vid_id}/finalize",
        data={"save": "true", "instagram": "false"},
    )
    assert r.status_code == 200
    saved = [f for f in PATHS.display.iterdir() if f.is_file()]
    assert len(saved) == 1
    assert saved[0].suffix == ".mp4"


def test_finalize_instagram_only(client):
    res = _upload_and_finalize(client, save=False, instagram=True)
    assert res["status"] == 200
    assert len(list(PATHS.display.iterdir())) == 0
    assert len([f for f in PATHS.instagram.iterdir() if f.is_file()]) == 1


def test_finalize_neither_discards(client):
    res = _upload_and_finalize(client, save=False, instagram=False)
    assert res["status"] == 200
    assert len(list(PATHS.display.iterdir())) == 0
    assert len([f for f in PATHS.instagram.iterdir() if f.is_file()]) == 0
    # temp should also be empty
    assert len([f for f in PATHS.temp.iterdir() if f.is_file()]) == 0


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
