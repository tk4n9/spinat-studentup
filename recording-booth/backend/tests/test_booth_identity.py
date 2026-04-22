"""
Per-booth identity assertions (US-007 of unify-booths-v2 plan).

Each test loads config.py in a fresh subprocess with BOOTH_CONFIG set
to the parameterised booth's YAML. Running in a subprocess — not
importlib.reload — avoids the PATHS dataclass-freeze + Pydantic model
validation running twice against a stale import cache, which can let
the first booth's values leak into later assertions.

Runs once per booth (3 parametrisations), so `pytest -q` reports at
least 3 identity tests in addition to the existing test_api.py suite.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

# ── Helpers ─────────────────────────────────────────────────────────

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _load_config_in_subprocess(booth_yaml: Path) -> dict:
    """Import config.py with BOOTH_CONFIG=<yaml> and return a JSON snapshot.

    We can't import config into the current process because test_api.py
    already imported it at collection time with whichever BOOTH_CONFIG
    verify.sh passed — the module is cached and CONFIG is frozen.

    The subprocess inherits the parent env (so uv's VIRTUAL_ENV /
    PYTHONHOME / PATH all pass through) and only BOOTH_CONFIG is
    overridden. Stripping the env wholesale would break the venv
    python's site-packages lookup.
    """
    snippet = textwrap.dedent(
        """
        import json
        from config import CONFIG
        # Port lives on BoothSection (not ServerSection) in the unified
        # schema — keep this in sync with recording-booth/backend/config.py.
        print(json.dumps({
            "id":         CONFIG.booth.id,
            "name":       CONFIG.booth.name,
            "port":       CONFIG.booth.port,
            "key_prefix": CONFIG.storage.r2.key_prefix,
        }))
        """
    ).strip()
    env = {**os.environ, "BOOTH_CONFIG": str(booth_yaml)}
    result = subprocess.run(
        [sys.executable, "-c", snippet],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        env=env,
    )
    if result.returncode != 0:
        # Make failures diagnosable instead of hiding stderr behind
        # CalledProcessError's default repr.
        raise AssertionError(
            f"config import subprocess failed for {booth_yaml.name} "
            f"(exit={result.returncode}).\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return json.loads(result.stdout)


# ── Tests ───────────────────────────────────────────────────────────

def test_booth_config_loads(booth_id: int, booth_config_path: Path) -> None:
    """Each booth-N.yaml validates against the Pydantic BoothConfig model."""
    info = _load_config_in_subprocess(booth_config_path)
    assert info["id"] == booth_id, f"expected id={booth_id}, got {info['id']}"


def test_booth_port_in_expected_set(booth_id: int, booth_config_path: Path) -> None:
    """Port mapping: 1→8000, 2→8002, 3→8001 (non-monotonic by design)."""
    expected_ports = {1: 8000, 2: 8002, 3: 8001}
    info = _load_config_in_subprocess(booth_config_path)
    assert info["port"] == expected_ports[booth_id], (
        f"booth-{booth_id} should bind :{expected_ports[booth_id]}, "
        f"got :{info['port']}"
    )


def test_booth_r2_key_prefix(booth_id: int, booth_config_path: Path) -> None:
    """R2 key prefix must be 'videos/booth-{id}/' — preserves URLs from
    pre-unification uploads so existing iPad QR codes stay valid."""
    info = _load_config_in_subprocess(booth_config_path)
    expected = f"videos/booth-{booth_id}/"
    assert info["key_prefix"] == expected, (
        f"booth-{booth_id} key_prefix drift: expected {expected!r}, "
        f"got {info['key_prefix']!r}. R2 URLs for pre-unify uploads would break."
    )


def test_booth_name_non_empty(booth_id: int, booth_config_path: Path) -> None:
    """Booth name is used as a footer disambiguator on the pad UI —
    empty string would render the footer as '@spinat.official · '."""
    info = _load_config_in_subprocess(booth_config_path)
    assert info["name"], f"booth-{booth_id} has empty name"
