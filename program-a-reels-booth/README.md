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

## 클라이언트 데모 (Client Demo)

단일 PC에서 전체 플로우를 시연할 수 있습니다. 별도 기기 불필요.

### 빠른 시작

```bash
# 1. 백엔드
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # R2 없어도 핵심 플로우 동작

# 2. 프론트엔드 빌드
cd ../frontend
npm install
npm run build

# 3. 서버 실행
cd ../backend
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

### 데모 화면

브라우저 창 2개를 나란히 열어주세요:

| URL | 역할 |
|-----|------|
| `http://localhost:8000/pad` | 부스 (갤럭시 패드 시뮬레이션) |
| `http://localhost:8000/monitor` | 전시 모니터 (영상 루프 재생) |

### 데모 시나리오

1. `/pad` → "N번째 챌린저님, 파이팅!" + 챌린지 포맷 선택 → **START**
2. 5초 카운트다운 → 녹화 시작 (타이머 + REC 표시)
3. 녹화 종료 → 리뷰 화면 (영상 루프 재생 + 체크박스)
4. "저장" 체크 → 업로드 → QR코드 화면
5. `/monitor` 창에 영상 자동 추가, 루프 재생

### 2대 기기 데모 (실제 현장 구성)

같은 WiFi에서 폰/태블릿으로 `http://<PC_IP>:8000/pad` 접속.

> **주의:** 카메라 API는 HTTPS 또는 localhost에서만 동작합니다.
> 외부 기기 접속 시 아래 중 하나를 적용하세요:
> - Chrome 주소창에 `chrome://flags/#unsafely-treat-insecure-origin-as-secure` → `http://<PC_IP>:8000` 추가
> - 또는 `ngrok http 8000` → HTTPS URL 사용

### 현재 동작 / 미구현

| 동작함 | 미구현 (데모 영향 없음) |
|--------|----------------------|
| 전체 Pad 플로우 (시작→녹화→리뷰→QR→재시작) | R2 클라우드 업로드 (credentials 필요) |
| 모니터 실시간 재생 (WebSocket) | QR 다운로드 링크 (R2 필요) |
| 세션 카운터 | 음악 파일 (storage/music/에 미배치) |
| 영상 업로드/분류 (display/instagram) | 인스타그램 자동 업로드 (수동 운영) |
| 포맷 선택 UI | |

## 상세 기획

→ [PRD.md](./PRD.md) 참조
