import { useEffect, useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useBoothStore } from '../../store/boothStore';
import { api } from '../../api/endpoints';
import type { Format } from '../../types';

export default function StartScreen() {
  const { challengerCount, setChallengerCount, setSelectedFormat, setScreen } = useSessionStore();
  const boothConfig = useBoothStore((s) => s.config);
  // Single-format flow across all booths. Per-booth format selection now
  // lives in YAML (formats[0] is the active challenge). Operators swap
  // challenges by editing recording-booth/config/booth-N.yaml + restart.
  const [format, setFormat] = useState<Format | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCounter(), api.getFormats()])
      .then(([{ count }, fmts]) => {
        setChallengerCount(count);
        setFormat(fmts[0] ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setChallengerCount]);

  const handleStart = () => {
    if (!format) return;
    setSelectedFormat(format);
    setScreen('COUNTDOWN');
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-10 px-8">
      {/* Challenger greeting */}
      <div className="text-center">
        <p className="text-white/60 text-xl mb-2">준비됐나요?</p>
        <h1 className="text-white text-4xl font-black leading-tight">
          {challengerCount + 1}번째 챌린저님,
          <br />
          <span className="text-yellow-400">파이팅!</span>
        </h1>
      </div>

      {/* START button — copy comes from the per-booth theme so operators can
          swap labels (English "START" vs Korean "시작하기") without a rebuild.
          Challenge selector intentionally removed: formats[0] is the canonical
          challenge per booth, configured in recording-booth/config/booth-N.yaml. */}
      <button
        onClick={handleStart}
        className="w-48 h-48 rounded-full bg-white text-black text-4xl font-black
                   shadow-[0_0_60px_rgba(255,255,255,0.3)]
                   active:scale-95 transition-transform select-none"
      >
        {boothConfig?.theme.startCopy ?? 'START'}
      </button>

      {/* spinat branding — booth name acts as a disambiguator suffix so the
          single Vite dist still shows which booth the operator is on. */}
      <p className="text-white/20 text-xs tracking-widest">
        @spinat.official{boothConfig ? ` · ${boothConfig.name}` : ''}
      </p>
    </div>
  );
}
