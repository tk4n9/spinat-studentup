# Program B — 미니 피아노 타일식 펌프

행사/전시용 리듬 게임 부스 시스템. 5개 발판 + 게임 모니터 + 갤럭시 패드(영상 녹화) 구성.
Program A (릴스 Booth)와 연동하여, 게임 종료 후 녹화된 영상이 Program A의 리뷰/QR 플로우로 이어집니다.

## Quick Setup

### 1. 백엔드

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
bash run.sh
# → http://localhost:8001 에서 서버 시작
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
| 게임 모니터 (이 PC) | `http://localhost:8001/game` (F11 전체화면) |
| API 문서 | `http://localhost:8001/docs` |

> Program A도 같은 PC에서 포트 8000으로 동시 실행해야 전체 플로우가 동작합니다.

---

## 클라이언트 데모 (Client Demo)

단일 PC에서 전체 게임을 테스트할 수 있습니다. 발판/갤럭시 패드 없이 키보드로 플레이 가능.

### 빠른 시작

```bash
# 1. 백엔드
cd program-b-pump-game/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# 2. 프론트엔드 빌드
cd ../frontend
npm install
npm run build

# 3. 브라우저에서 접속
open http://localhost:8001/game
```

### 키보드로 테스트하기

실제 발판 없이 키보드로 전체 게임을 테스트할 수 있습니다:

| 키 | 발판 위치 |
|----|----------|
| `A` | 1번 (왼쪽 끝) |
| `S` | 2번 (왼쪽) |
| `D` | 3번 (가운데) |
| `F` | 4번 (오른쪽) |
| `G` | 5번 (오른쪽 끝) |

### 데모 시나리오

1. `http://localhost:8001/game` 접속 → "대기 중..." 화면
2. **스페이스바** 누름 → 게임 시작 (데모용 단축키, 실제 현장에서는 Program A가 시작 신호)
3. 3초 카운트다운 → 게임 시작
4. 화면 위에서 원형 노트가 내려옴 → 타이밍에 맞춰 해당 키 입력 (A/S/D/F/G)
5. PERFECT / GREAT / GOOD / MISS 판정 + 콤보 + 점수 표시
6. 30초 후 자동 종료 → 결과 화면 (점수, 등급, 판정 통계)
7. 8초 후 대기 화면으로 자동 복귀

> **팁:** 게임 중 `Esc` 키를 누르면 즉시 결과 화면으로 넘어갑니다 (개발/데모 용).

### 개발 모드 (HMR)

```bash
# 터미널 1: 백엔드
cd backend && bash run.sh

# 터미널 2: 프론트엔드
cd frontend && npm run dev
# → http://localhost:5173/game  (API는 8001로 자동 프록시)
```

---

## Program A + B 동시 실행 (현장 구성)

실제 현장에서는 두 프로그램을 동시에 실행합니다:

```bash
# 터미널 1: Program A (릴스 Booth)
cd program-a-reels-booth/backend && bash run.sh
# → http://localhost:8000

# 터미널 2: Program B (피아노 타일 펌프)
cd program-b-pump-game/backend && bash run.sh
# → http://localhost:8001
```

### 기기 구성

| 기기 | URL | 역할 |
|------|-----|------|
| 갤럭시 패드 (Chrome) | `http://{서버IP}:8000/pad` | 시작 버튼 + 영상 녹화 + 리뷰/QR |
| 게임 모니터 (PC Chrome) | `http://localhost:8001/game` | 게임 화면 (떨어지는 노트) |
| 전시 모니터 (PC Chrome) | `http://localhost:8000/monitor` | 누적 영상 재생 |
| 발판 5개 | USB (Arduino) | 플레이어 입력 |

### 연동 플로우

```
갤럭시 패드 START → 카운트다운 → 녹화 시작
                                    ↓ (자동으로 Program B에 시작 신호)
게임 모니터                       게임 시작 → 플레이 → 결과 표시
갤럭시 패드                       녹화 종료 → 리뷰 화면 → QR코드
```

> Program B가 꺼져 있어도 Program A는 정상 동작합니다 (독립 실행 가능).

---

## 발판 하드웨어

### 부품

| 부품 | 스펙 | 예상 가격 |
|------|------|----------|
| Arduino Leonardo (또는 Pro Micro) | ATmega32u4, USB HID 지원 | ~$15 |
| 100mm 아케이드 버튼 × 5 | 상시 개방형 (normally-open) | ~$20 |
| 합판 | ~120cm × 40cm × 18mm | ~$10 |
| 미끄럼 방지 패드 | 고무 발 + 매트 | ~$5 |
| USB 연장 케이블 | 3~5m | ~$5 |

**총 예상 비용: ~$55**

### 배선

```
Arduino Leonardo
  D2 ──── [버튼1] ──── GND    (키: A)
  D3 ──── [버튼2] ──── GND    (키: S)
  D4 ──── [버튼3] ──── GND    (키: D)
  D5 ──── [버튼4] ──── GND    (키: F)
  D6 ──── [버튼5] ──── GND    (키: G)
```

각 버튼은 디지털 핀과 GND 사이에 연결 (INPUT_PULLUP 사용, 외부 저항 불필요).

### 펌웨어 업로드

```bash
# Arduino IDE에서:
# 1. arduino/pump_pads/pump_pads.ino 열기
# 2. 보드: Arduino Leonardo 선택
# 3. 업로드
```

업로드 후 Arduino가 USB 키보드로 인식됩니다. 드라이버 설치 불필요.

### 발판 작동 확인

```bash
# 브라우저에서 아무 텍스트 입력칸을 열고 발판을 밟으면
# a, s, d, f, g 글자가 입력되어야 합니다.
```

---

## 설정 변경

- **타이밍 판정:** `backend/config.yaml` → `game.perfect_window_ms` 등 (단위: ms)
- **스크롤 속도:** `backend/config.yaml` → `game.scroll_speed` (pixels/sec)
- **키 매핑:** `backend/config.yaml` → `game.lane_keys` (기본: a,s,d,f,g)
- **노래 차트:** `backend/storage/charts/` 에 JSON 파일 추가
- **음악 파일:** `backend/storage/music/` 에 MP3 파일 추가
- **현장 보정:** `backend/config.yaml` → `game.audio_offset_ms` (오디오 지연 보정)

## 현재 동작 / 미구현

| 동작함 | 미구현 (별도 준비 필요) |
|--------|----------------------|
| 전체 게임 플로우 (대기→카운트다운→플레이→결과) | 실제 노래 및 차트 (데모 차트로 테스트 중) |
| 키보드 입력 (A/S/D/F/G) | 물리 발판 조립 (부품 구매 + 배선) |
| 점수/등급/콤보 시스템 | 복수 노래 선택 UI |
| WebSocket 시작 신호 (Program A 연동) | 현장 오디오 보정 |
| 결과 저장 (JSON) | 리더보드 / 점수 전시 |
| 오디오 없이 무음 플레이 가능 | 실제 음악 파일 배치 |

## 상세 기획

→ [PRD.md](./PRD.md) 참조
