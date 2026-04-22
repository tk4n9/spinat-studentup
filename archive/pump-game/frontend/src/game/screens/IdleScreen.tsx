export default function IdleScreen() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-black overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at 30% 50%, #7c3aed 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #1d4ed8 0%, transparent 60%)',
          animation: 'idlePulse 4s ease-in-out infinite alternate',
        }}
      />

      <style>{`
        @keyframes idlePulse {
          from { opacity: 0.15; transform: scale(1); }
          to   { opacity: 0.30; transform: scale(1.05); }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
      `}</style>

      {/* Logo / branding */}
      <div
        className="relative z-10 flex flex-col items-center gap-6"
        style={{ animation: 'floatUp 3s ease-in-out infinite' }}
      >
        <div className="text-5xl font-black tracking-widest text-white drop-shadow-lg">
          @spinat.official
        </div>
        <div className="text-2xl font-bold text-purple-300 tracking-wide">
          미니 피아노 타일
        </div>
        <div className="mt-8 text-lg text-gray-400 animate-pulse-slow">
          대기 중...
        </div>
      </div>

      {/* Decorative lane lines at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex h-2">
        {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'].map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c, opacity: 0.6 }} />
        ))}
      </div>
    </div>
  );
}
