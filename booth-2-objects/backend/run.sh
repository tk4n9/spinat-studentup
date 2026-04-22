#!/usr/bin/env bash
# ── spinat 오브제 Booth (#2) — 서버 시작 스크립트 ──────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  spinat 오브제 Booth (#2) Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  모니터 (이 PC):  http://localhost:8002/monitor"
echo ""
LOCAL_IP=$(uv run python -c "import socket; s=socket.socket(); s.connect(('8.8.8.8',80)); print(s.getsockname()[0]); s.close()" 2>/dev/null || echo "알 수 없음")
echo "  패드 (동일 WiFi): http://$LOCAL_IP:8002/pad"
echo ""
echo "  (iPad HTTPS 필요 시:"
echo "     cloudflared tunnel --url http://localhost:8002)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec uv run uvicorn main:app --host 0.0.0.0 --port 8002 --reload
