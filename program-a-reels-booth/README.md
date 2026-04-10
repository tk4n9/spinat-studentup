# Program A — 릴스 Booth & 모니터 영상전시 툴

행사/전시용 영상 녹화 부스 시스템. 갤럭시 패드(녹화) + 모니터(전시) 2대 구성.

## Quick Setup

### 1. 백엔드

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt

# R2 설정 (선택 — 없어도 QR 제외 모든 기능 동작)
cp .env.example .env   # → R2 credentials 입력

bash run.sh
```

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run build          # → dist/ 생성 (FastAPI가 자동으로 서빙)
```

### 3. 접속

| 장치 | URL |
|---|---|
| 모니터 (이 PC) | `http://localhost:8000/monitor` (F11 전체화면) |
| 갤럭시 패드 | `http://{서버IP}:8000/pad` (run.sh 시작 시 IP 출력됨) |

> 같은 WiFi 네트워크에 연결되어 있어야 합니다.

### 개발 모드

```bash
# 터미널 1: 백엔드
cd backend && bash run.sh

# 터미널 2: 프론트엔드 (HMR)
cd frontend && npm run dev
# → http://localhost:5173/pad  (API는 8000으로 자동 프록시)
```

## 설정 변경

- **영상 포맷:** `backend/config.yaml` → `formats` 섹션 (길이, 음악 파일)
- **R2 클라우드:** `backend/.env` → Cloudflare R2 credentials
- **음악 파일:** `backend/storage/music/` 에 MP3 파일 추가

## 상세 기획

→ [PRD.md](./PRD.md) 참조
