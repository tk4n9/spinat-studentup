import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameEngine } from '../engine/GameEngine';

// Default config used when backend config is not yet fetched
// Must match config.yaml values (hit_zone_y_percent is integer 0-100)
const DEFAULT_CONFIG = {
  perfect_window_ms: 50,
  great_window_ms: 100,
  good_window_ms: 150,
  scroll_speed: 400,
  note_radius: 30,
  hit_zone_y_percent: 85,
  perfect_points: 100,
  great_points: 70,
  good_points: 40,
  countdown_seconds: 3,
  result_display_seconds: 8,
  lane_keys: ['a', 's', 'd', 'f', 'g'],
  audio_offset_ms: 0,
};

export default function PlayingScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const chart = useGameStore((s) => s.chart);
  const setResult = useGameStore((s) => s.setResult);
  const setScreen = useGameStore((s) => s.setScreen);

  useEffect(() => {
    if (!canvasRef.current || !chart) return;

    const engine = new GameEngine(canvasRef.current, chart, DEFAULT_CONFIG);
    engineRef.current = engine;

    engine.onComplete = (result) => {
      setResult(result);
      setScreen('RESULT');
    };

    engine.init().then(() => {
      engine.start();
    }).catch(console.error);

    // Dev shortcut: Escape skips to result with dummy data
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        engine.stop();
        setResult({
          score: 0,
          grade: 'D',
          perfectCount: 0,
          greatCount: 0,
          goodCount: 0,
          missCount: chart.notes.length,
          maxCombo: 0,
          totalNotes: chart.notes.length,
        });
        setScreen('RESULT');
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      engine.stop();
      engineRef.current = null;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [chart, setResult, setScreen]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
