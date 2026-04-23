import { useEffect } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useCountdown } from '../hooks/useCountdown';

export default function CountdownScreen() {
  const { setScreen, selectedFormat } = useSessionStore();

  const { remaining, start } = useCountdown({
    from: 5,
    onComplete: () => setScreen('RECORDING'),
  });

  useEffect(() => {
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = remaining >= 3 ? 'scale-100' : remaining === 2 ? 'scale-110' : 'scale-125';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--theme-bg,#607A33)] gap-8">
      <p className="text-white/50 text-xl tracking-widest uppercase">준비하세요</p>

      <div
        className={`text-white font-black transition-transform duration-300 ${scale}`}
        style={{ fontSize: '30vw', lineHeight: 1 }}
      >
        {remaining}
      </div>

      {selectedFormat?.music_file && (
        <p className="text-white/40 text-sm">🎵 {selectedFormat.label}</p>
      )}
    </div>
  );
}
