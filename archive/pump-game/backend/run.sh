#!/usr/bin/env bash
# ── spinat 펌프 Booth (#3) — Program B 서버 시작 스크립트 ──────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  spinat 펌프 Booth (#3) — Program B"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  패드:           http://localhost:8001/pad"
echo "  게임 모니터:    http://localhost:8001/game"
echo "  전시 모니터:    http://localhost:8001/monitor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec uv run uvicorn main:app --host 0.0.0.0 --port 8001 --reload
