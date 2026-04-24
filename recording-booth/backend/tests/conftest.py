"""
Shared pytest setup for the unified recording-booth backend.

Three concerns:

1. test_api.py imports `config` + `main` at module scope, so BOOTH_CONFIG
   must be set before pytest's collection phase. Verify.sh wraps pytest
   with `BOOTH_CONFIG=.../booth-1.yaml uv run --frozen pytest …`, so
   that's already handled — this conftest just fails loud if someone
   runs pytest manually without setting it.

2. test_booth_identity.py wants to iterate over ALL three booth configs
   inside a single pytest process. Reloading `config` mid-test is
   fragile (module-level `CONFIG = BoothConfig.parse_yaml(...)` caches
   mkdir side effects, PATHS freezes on first import). The `booth_id`
   fixture below rotates the param but each consumer test uses a
   subprocess so the new BOOTH_CONFIG takes effect cleanly without
   polluting the parent process's cached `CONFIG`.

3. test_api.py exercises finalize with 1 KB of zero-bytes disguised as
   `.webm` / `.mp4`. Two services would reject that payload:
     - `services.transcode.transcode_to_faststart_mp4` → real ffmpeg
       call would fail because the bytes are not a valid container.
     - `services.r2.upload_video` → with live R2 credentials in .env,
       finalize would actually upload those 1 KB blobs to the
       production bucket (this happened once — STATUSLOG 2026-04-22).
   The autouse `_mock_external_side_effects` fixture stubs both so
   tests exercise the routing/registry logic without burning network
   or CPU.
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

# Repository layout: backend/tests/conftest.py → backend/ → recording-booth/
BACKEND_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = BACKEND_DIR.parent / "config"


def pytest_configure(config: pytest.Config) -> None:
    """Bail early if BOOTH_CONFIG wasn't set by the caller."""
    if "BOOTH_CONFIG" not in os.environ:
        pytest.exit(
            "BOOTH_CONFIG env var is required for pytest.\n"
            "  Example: "
            "BOOTH_CONFIG=recording-booth/config/booth-1.yaml uv run --frozen pytest\n"
            "  scripts/verify.sh sets this automatically.",
            returncode=2,
        )


@pytest.fixture(params=[1, 2, 3, 4], ids=["booth-1", "booth-2", "booth-3", "booth-4"])
def booth_id(request: pytest.FixtureRequest) -> int:
    """Parametrised booth identifier (1, 2, 3, 4).

    Used by test_booth_identity.py to assert that each booth's YAML
    config loads with the expected values. Pair with `booth_config_path`
    to get the absolute YAML path for the currently-parameterised booth.
    """
    return request.param


@pytest.fixture
def booth_config_path(booth_id: int) -> Path:
    """Absolute path to the currently-parameterised booth's YAML."""
    return CONFIG_DIR / f"booth-{booth_id}.yaml"


@pytest.fixture(autouse=True)
def _mock_external_side_effects(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Replace transcode + R2 upload with no-op fakes so tests never call
    ffmpeg or hit the real Cloudflare bucket.

    Guarded imports: test_booth_identity.py does not import `services.*`
    (it only parses YAML), so we import lazily to avoid triggering the
    backend's module-level Pydantic validation during collection for
    tests that don't need it.
    """
    try:
        from services import r2 as r2_mod
        from services import transcode as transcode_mod
    except Exception:
        # config.py failed to import (e.g. during the booth-identity
        # subprocess tests where BOOTH_CONFIG is handled differently).
        # Skip patching — these tests don't exercise finalize anyway.
        return

    async def _fake_upload_video(file_path: Path, video_id: str) -> str:
        return f"https://fake-r2.invalid/videos/{video_id}{file_path.suffix}"

    async def _fake_transcode(src: Path) -> Path:
        # Simulate "webm/mp4 → mp4 faststart" by renaming in place. The
        # router consumes the returned Path as the canonical artifact;
        # downstream code only cares about the `.mp4` suffix, not the
        # bytes inside it.
        dst = src.parent / f"{src.stem}.mp4"
        if src.resolve() != dst.resolve():
            src.rename(dst)
        return dst

    monkeypatch.setattr(r2_mod, "upload_video", _fake_upload_video)
    monkeypatch.setattr(transcode_mod, "transcode_to_faststart_mp4", _fake_transcode)
