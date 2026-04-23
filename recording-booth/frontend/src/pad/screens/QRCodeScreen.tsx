import { useSessionStore } from '../store/sessionStore';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeScreen() {
  const { r2Url, setScreen, reset } = useSessionStore((s) => ({
    r2Url: s.r2Url,
    setScreen: s.setScreen,
    reset: s.reset,
  }));

  const handleRestart = () => {
    reset();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-8 bg-[var(--theme-bg,#607A33)]">
      <div className="text-center">
        <h2 className="text-white text-2xl font-black mb-1">영상 저장 완료!</h2>
        <p className="text-white/60 text-sm">
          QR코드를 스캔하면 영상을 다운로드 받을 수 있어요
        </p>
      </div>

      {r2Url ? (
        <div className="bg-white p-4 rounded-2xl shadow-2xl">
          <QRCodeSVG value={r2Url} size={240} level="M" />
        </div>
      ) : (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60 text-sm">
            QR코드를 생성하지 못했습니다.
            <br />
            (서버 설정을 확인해 주세요)
          </p>
        </div>
      )}

      <p className="text-white/40 text-xs text-center">
        모니터에서도 재생 중입니다 🎬
      </p>

      <button
        onClick={handleRestart}
        className="w-full max-w-xs py-4 border-2 border-white text-white text-xl font-black
                   rounded-2xl active:scale-95 transition-transform"
      >
        다시시작
      </button>
    </div>
  );
}
