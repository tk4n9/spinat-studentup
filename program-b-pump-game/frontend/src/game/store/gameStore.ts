import { create } from 'zustand';
import type { GameScreen, Chart, GameResult } from '../../types';

interface GameState {
  screen: GameScreen;
  chart: Chart | null;
  chartId: string | null;
  result: GameResult | null;

  setScreen: (screen: GameScreen) => void;
  setChart: (chart: Chart, chartId: string) => void;
  setResult: (result: GameResult) => void;
  reset: () => void;
}

const initial = {
  screen: 'IDLE' as GameScreen,
  chart: null,
  chartId: null,
  result: null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initial,
  setScreen: (screen) => set({ screen }),
  setChart: (chart, chartId) => set({ chart, chartId }),
  setResult: (result) => set({ result }),
  reset: () => set({ ...initial }),
}));
