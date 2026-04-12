import { apiFetch } from './client';
import type { ChartMeta, Chart, GameResult } from '../types';

export async function fetchCharts(): Promise<ChartMeta[]> {
  return apiFetch<ChartMeta[]>('/api/game/charts');
}

export async function fetchChart(chartId: string): Promise<Chart> {
  return apiFetch<Chart>(`/api/game/charts/${chartId}`);
}

export async function submitScore(
  result: GameResult & { chart_id: string },
): Promise<void> {
  // Convert camelCase GameResult to snake_case for Pydantic backend model
  const payload = {
    chart_id: result.chart_id,
    score: result.score,
    grade: result.grade,
    perfect_count: result.perfectCount,
    great_count: result.greatCount,
    good_count: result.goodCount,
    miss_count: result.missCount,
    max_combo: result.maxCombo,
  };
  await apiFetch<void>('/api/game/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
