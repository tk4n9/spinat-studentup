#!/usr/bin/env bash
# ── spinat 릴스 Booth (#1) — 서버 시작 스크립트 ──────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env if present (R2 credentials etc.)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  spinat 릴스 Booth (#1) Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  모니터 (이 PC):  http://localhost:8000/monitor"
echo ""
LOCAL_IP=$(uv run python -c "import socket; s=socket.socket(); s.connect(('8.8.8.8',80)); print(s.getsockname()[0]); s.close()" 2>/dev/null || echo "알 수 없음")
echo "  패드 (동일 WiFi): http://$LOCAL_IP:8000/pad"
echo ""
echo "  (iPad 등 외부기기 HTTPS 필요 시:"
echo "     cloudflared tunnel --url http://localhost:8000)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
