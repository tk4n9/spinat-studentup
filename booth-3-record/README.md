# Booth 3 — Record (pre-event triage clone)

Booth 3의 사전 이벤트 트리아지용 복제본입니다. `program-a-reels-booth/` (Booth 1) 을 그대로 복사한 뒤 booth 식별자 / 포트만 변경했습니다.

**Operator instructions:** see [../program-a-reels-booth/README.md](../program-a-reels-booth/README.md) for the full recording flow, setup, and demo walkthrough. This booth is functionally identical.

## Booth-3 specific differences

| 항목 | Booth 1 | Booth 3 (여기) |
|---|---|---|
| 포트 | 8000 | **8001** |
| `booth.id` | 1 | **3** |
| `booth.name` | `performance` | `booth-3` |
| R2 key prefix | `booth-1/` | `booth-3/` |
| Package name | `spinat-booth-1-performance` | `spinat-booth-3-record` |

Formats (`config.yaml` → `formats`) start as Booth 1 의 4-challenge 기본값으로 복제되어 있습니다. 운영자가 원하면 이후 부스별로 축소/변경 가능합니다.

## Why this directory exists

`program-b-pump-game/` (펌프 게임) 이 2026-04-24 이벤트 전까지 완성 불가하여 `archive/pump-game/` 으로 아카이브됨. Booth 3 자리에 녹화 부스를 제공하기 위해 Booth 1 을 복제한 것이 이 디렉토리.

Post-event unification plan: [`.omc/plans/unify-booths-v2.md`](../.omc/plans/unify-booths-v2.md).

## Launch

```bash
# Repo-root one-liner (preferred — launches all 3 booths):
bash scripts/start-all.sh

# Or this booth alone:
cd backend && bash run.sh
```

접속: `http://localhost:8001/pad` (패드) + `http://localhost:8001/monitor` (모니터).
