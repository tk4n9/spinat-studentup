import { useSessionStore } from '../store/sessionStore';

export default function RestartScreen() {
  const reset = useSessionStore((s) => s.reset);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-8 bg-black">
      <div className="text-center">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="text-white text-2xl font-black mb-2">완료되었습니다!</h2>
        <p className="text-white/50 text-sm">영상이 저장되었습니다.</p>
      </div>

      <button
        onClick={reset}
        className="w-full max-w-xs py-4 border-2 border-white text-white text-xl font-black
                   rounded-2xl active:scale-95 transition-transform"
      >
        다시시작
      </button>
    </div>
  );
}
