"""
Unified recording-booth configuration loader.

Reads YAML config path from BOOTH_CONFIG env var (no default — fail loud).
Validates with Pydantic. Exposes:
  - CONFIG : fully validated BoothConfig
  - R2     : alias for CONFIG.storage.r2 (convenience)
  - PATHS  : dataclass of derived Paths (display/instagram/temp/music)
  - R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / QR_EXPIRY_DAYS
            (secrets + per-instance knobs — remain env-var sourced)

Call-site convention: prefer CONFIG.* / R2.* / PATHS.* over legacy
module-level names. No legacy shim aliases are exported — see the
per-section imports in main.py / routers / services for the
attribute-access pattern that replaced them.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError, field_validator

# Repo-relative anchor for resolving relative YAML paths.
_BASE = Path(__file__).parent


def _resolve(p: Path) -> Path:
    """Resolve a path against the backend dir if not already absolute."""
    return p if p.is_absolute() else (_BASE / p).resolve()


# ── Pydantic schema (mirrors .omc/plans/unify-booths-v2.md Section 6) ──

class BoothSection(BaseModel):
    id: int = Field(ge=1, le=99)
    name: str
    port: int = Field(ge=1024, le=65535)


class ServerSection(BaseModel):
    host: str
    storage_path: Path
    frontend_dist: Path

    @field_validator("storage_path", "frontend_dist", mode="after")
    @classmethod
    def _abs(cls, v: Path) -> Path:
        return _resolve(v)


class SessionSection(BaseModel):
    counter_file: Path

    @field_validator("counter_file", mode="after")
    @classmethod
    def _abs(cls, v: Path) -> Path:
        return _resolve(v)


class ThemeSection(BaseModel):
    primary: str
    accent: str
    start_copy: str
    # Page-level background. Default kept at pure black so YAMLs missing
    # the field continue to load without validation error (back-compat
    # for any downstream config not yet updated).
    background: str = "#000000"


class FormatSpec(BaseModel):
    """Matches the live schema used by booth-1/booth-2/booth-3 today."""
    id: int = Field(ge=1)
    label: str
    duration_seconds: int = Field(ge=1, le=600)
    music_file: str | None = None
    music_start_offset: float = Field(ge=0, default=0.0)


class R2Section(BaseModel):
    bucket: str
    public_url: str
    # key_prefix should end with "/" for clean concatenation at upload time.
    key_prefix: str


class StorageSection(BaseModel):
    r2: R2Section


class BoothConfig(BaseModel):
    booth: BoothSection
    server: ServerSection
    session: SessionSection
    theme: ThemeSection
    formats: list[FormatSpec]
    storage: StorageSection


# ── Load + validate ────────────────────────────────────────────────

load_dotenv()

try:
    _cfg_path_str = os.environ["BOOTH_CONFIG"]
except KeyError:
    sys.stderr.write(
        "[config] BOOTH_CONFIG env var is required and has no default.\n"
        "         Example: BOOTH_CONFIG=recording-booth/config/booth-1.yaml\n"
        "         scripts/start-all.sh + scripts/verify.sh set this per booth.\n"
    )
    raise SystemExit(2)

_cfg_path = Path(_cfg_path_str)
if not _cfg_path.is_absolute():
    # Allow paths relative to either the backend dir or the repo root.
    _candidate_a = (_BASE / _cfg_path).resolve()
    _candidate_b = (_BASE.parent.parent / _cfg_path).resolve()
    _cfg_path = _candidate_a if _candidate_a.exists() else _candidate_b

try:
    _raw = yaml.safe_load(_cfg_path.read_text(encoding="utf-8"))
    CONFIG: BoothConfig = BoothConfig.model_validate(_raw)
except FileNotFoundError:
    sys.stderr.write(f"[config] file not found: {_cfg_path}\n")
    raise SystemExit(2)
except ValidationError as e:
    sys.stderr.write(f"[config] validation failed for {_cfg_path}:\n{e}\n")
    raise SystemExit(2)

# Convenience aliases — plan Section 6 specifies R2 = CONFIG.storage.r2.
R2: R2Section = CONFIG.storage.r2


# ── Derived paths ──────────────────────────────────────────────────

@dataclass(frozen=True)
class Paths:
    display: Path
    instagram: Path
    temp: Path
    music: Path


PATHS = Paths(
    display=CONFIG.server.storage_path / "display",
    instagram=CONFIG.server.storage_path / "instagram",
    temp=CONFIG.server.storage_path / "temp",
    music=CONFIG.server.storage_path / "music",
)

for _p in (PATHS.display, PATHS.instagram, PATHS.temp, PATHS.music):
    _p.mkdir(parents=True, exist_ok=True)


# ── Secrets (env-only — never in YAML per plan Section 6) ──────────
#
# bucket + public_url moved to YAML for per-booth override, but
# account/access/secret stay in .env because they're credentials.

R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
QR_EXPIRY_DAYS: int = int(os.getenv("QR_EXPIRY_DAYS", "7"))
