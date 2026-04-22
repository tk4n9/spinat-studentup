"""
Shared pytest setup for the unified recording-booth backend.

Two concerns:

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


@pytest.fixture(params=[1, 2, 3], ids=["booth-1", "booth-2", "booth-3"])
def booth_id(request: pytest.FixtureRequest) -> int:
    """Parametrised booth identifier (1, 2, 3).

    Used by test_booth_identity.py to assert that each booth's YAML
    config loads with the expected values. Pair with `booth_config_path`
    to get the absolute YAML path for the currently-parameterised booth.
    """
    return request.param


@pytest.fixture
def booth_config_path(booth_id: int) -> Path:
    """Absolute path to the currently-parameterised booth's YAML."""
    return CONFIG_DIR / f"booth-{booth_id}.yaml"
