#!/bin/bash
# ── spinat 릴스 Booth — 서버 시작 스크립트 ──────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Show local IP so operator can configure the Galaxy Pad
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  spinat 릴스 Booth Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  모니터 (이 PC):  http://localhost:8000/monitor"
echo ""
LOCAL_IP=$(python3 -c "import socket; s=socket.socket(); s.connect(('8.8.8.8',80)); print(s.getsockname()[0]); s.close()" 2>/dev/null || echo "알 수 없음")
echo "  갤럭시 패드:     http://$LOCAL_IP:8000/pad"
echo ""
echo "  (갤럭시 패드의 Chrome에서 위 주소를 입력하세요)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Use venv if present, otherwise fall back to system python
if [ -f ".venv/bin/uvicorn" ]; then
  .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
else
  python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
fi
