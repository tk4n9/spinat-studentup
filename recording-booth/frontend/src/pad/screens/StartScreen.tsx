import { useEffect, useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useBoothStore } from '../../store/boothStore';
import { api } from '../../api/endpoints';
import type { Format } from '../../types';

export default function StartScreen() {
  const { challengerCount, setChallengerCount, setSelectedFormat, setScreen } = useSessionStore();
  const boothConfig = useBoothStore((s) => s.config);
  const [formats, setFormats] = useState<Format[]>([]);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCounter(), api.getFormats()])
      .then(([{ count }, fmts]) => {
        setChallengerCount(count);
        setFormats(fmts);
        setSelectedId(fmts[0]?.id ?? 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setChallengerCount]);

  const handleStart = () => {
    const fmt = formats.find((f) => f.id === selectedId) ?? formats[0];
    if (!fmt) return;
    setSelectedFormat(fmt);
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

      {/* Format selector (shown only if multiple formats) */}
      {formats.length > 1 && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <p className="text-white/70 text-sm text-center">챌린지 선택</p>
          <div className="grid grid-cols-2 gap-2">
            {formats.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                  selectedId === f.id
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                {f.label}
                <br />
                <span className="font-normal text-xs opacity-70">{f.duration_seconds}초</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* START button — copy comes from the per-booth theme so operators can
          swap labels (English "START" vs Korean "시작하기") without a rebuild. */}
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
