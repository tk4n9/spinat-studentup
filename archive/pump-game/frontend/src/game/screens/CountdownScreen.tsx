import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function CountdownScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const countdown = useGameStore((s) => s.chart?.meta);
  // Default 3 seconds if config not available at this stage
  const total = 3;
  const [count, setCount] = useState(total);
  const [scale, setScale] = useState(1);

  // Suppress unused warning — countdown is used to satisfy store read pattern
  void countdown;

  useEffect(() => {
    if (count <= 0) {
      setScreen('PLAYING');
      return;
    }

    // Trigger scale animation on each tick
    setScale(1.4);
    const scaleTimer = setTimeout(() => setScale(1), 150);

    const timer = setTimeout(() => {
      setCount((c) => c - 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(scaleTimer);
    };
  }, [count, setScreen]);

  const label = count === 0 ? 'GO!' : String(count);

  return (
    <div className="flex items-center justify-center w-full h-full bg-black">
      <div
        className="text-white font-black select-none"
        style={{
          fontSize: '20vw',
          transform: `scale(${scale})`,
          transition: 'transform 0.15s ease-out',
          textShadow: '0 0 40px rgba(168,85,247,0.8)',
          lineHeight: 1,
        }}
      >
        {label}
      </div>
    </div>
  );
}
