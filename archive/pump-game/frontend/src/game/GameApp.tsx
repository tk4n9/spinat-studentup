import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameWebSocket } from './hooks/useGameWebSocket';
import { fetchChart } from '../api/endpoints';
import IdleScreen from './screens/IdleScreen';
import CountdownScreen from './screens/CountdownScreen';
import PlayingScreen from './screens/PlayingScreen';
import ResultScreen from './screens/ResultScreen';

// Dummy chart for dev testing without backend
const DEV_CHART_ID = 'chart_1';

export default function GameApp() {
  const screen = useGameStore((s) => s.screen);
  const setChart = useGameStore((s) => s.setChart);
  const setScreen = useGameStore((s) => s.setScreen);

  useGameWebSocket();

  // Dev shortcut: spacebar on IDLE loads chart_1 and starts countdown
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && screen === 'IDLE') {
        e.preventDefault();
        fetchChart(DEV_CHART_ID)
          .then((chart) => {
            setChart(chart, DEV_CHART_ID);
            setScreen('COUNTDOWN');
          })
          .catch(() => {
            // If backend unavailable, use a minimal stub chart for visual testing
            setChart(
              {
                meta: {
                  title: 'Dev Test',
                  artist: 'spinat',
                  audio_file: '',
                  duration_seconds: 30,
                  bpm: 120,
                  offset_ms: 0,
                },
                notes: Array.from({ length: 40 }, (_, i) => ({
                  time: 1 + i * 0.5,
                  lane: i % 5,
                })),
              },
              DEV_CHART_ID,
            );
            setScreen('COUNTDOWN');
          });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, setChart, setScreen]);

  switch (screen) {
    case 'IDLE':      return <IdleScreen />;
    case 'COUNTDOWN': return <CountdownScreen />;
    case 'PLAYING':   return <PlayingScreen />;
    case 'RESULT':    return <ResultScreen />;
  }
}
