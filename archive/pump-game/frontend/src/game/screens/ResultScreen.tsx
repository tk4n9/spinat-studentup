import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { submitScore } from '../../api/endpoints';

const RESULT_DISPLAY_SECONDS = 8;

const GRADE_COLORS: Record<string, string> = {
  S: '#fbbf24',
  A: '#34d399',
  B: '#60a5fa',
  C: '#a78bfa',
  D: '#9ca3af',
};

export default function ResultScreen() {
  const result = useGameStore((s) => s.result);
  const chartId = useGameStore((s) => s.chartId);
  const reset = useGameStore((s) => s.reset);

  const [displayScore, setDisplayScore] = useState(0);
  const [gradeScale, setGradeScale] = useState(0.3);
  const scoreRef = useRef(0);
  const targetRef = useRef(result?.score ?? 0);

  // Score roll-up animation
  useEffect(() => {
    if (!result) return;
    targetRef.current = result.score;
    scoreRef.current = 0;
    setDisplayScore(0);

    const duration = 1500;
    const start = performance.now();
    let rafId = 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(eased * targetRef.current);
      setDisplayScore(current);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    // Grade scale-in
    const gradeTimer = setTimeout(() => setGradeScale(1), 200);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(gradeTimer);
    };
  }, [result]);

  // Submit score and auto-dismiss
  useEffect(() => {
    if (!result || !chartId) return;

    submitScore({ ...result, chart_id: chartId }).catch(console.error);

    const timer = setTimeout(() => {
      reset();
    }, RESULT_DISPLAY_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [result, chartId, reset]);

  if (!result) return null;

  const gradeColor = GRADE_COLORS[result.grade] ?? '#9ca3af';

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black text-white gap-6 px-8">
      {/* Grade */}
      <div
        className="font-black leading-none"
        style={{
          fontSize: '22vw',
          color: gradeColor,
          textShadow: `0 0 60px ${gradeColor}80`,
          transform: `scale(${gradeScale})`,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {result.grade}
      </div>

      {/* Score */}
      <div className="text-5xl font-black tabular-nums text-white">
        {displayScore.toLocaleString()}
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-lg mt-2">
        <span className="text-yellow-400 font-bold">PERFECT</span>
        <span className="text-right tabular-nums">{result.perfectCount}</span>

        <span className="text-green-400 font-bold">GREAT</span>
        <span className="text-right tabular-nums">{result.greatCount}</span>

        <span className="text-blue-400 font-bold">GOOD</span>
        <span className="text-right tabular-nums">{result.goodCount}</span>

        <span className="text-red-400 font-bold">MISS</span>
        <span className="text-right tabular-nums">{result.missCount}</span>

        <span className="text-gray-400">MAX COMBO</span>
        <span className="text-right tabular-nums">{result.maxCombo}</span>
      </div>

      {/* Auto-dismiss hint */}
      <div className="text-gray-500 text-sm mt-4 animate-pulse-slow">
        잠시 후 대기 화면으로 돌아갑니다...
      </div>
    </div>
  );
}
