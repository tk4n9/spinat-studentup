import { useEffect, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { useCountdown } from '../hooks/useCountdown';
import { useWakeLock } from '../hooks/useWakeLock';

export default function RecordingScreen() {
  const { selectedFormat, setRecordedBlob, setScreen } = useSessionStore();
  const { previewStream, recordedBlob, isRecording, error, initCamera, startRecording, stopRecording } =
    useVideoRecorder();
  const { acquire, release } = useWakeLock();
  const previewRef = useRef<HTMLVideoElement>(null);
  const started = useRef(false);

  const duration = selectedFormat?.duration_seconds ?? 30;

  const { remaining, start: startTimer } = useCountdown({
    from: duration,
    onComplete: stopRecording,
  });

  // Init camera on mount
  useEffect(() => {
    initCamera();
    acquire();
    return () => { release(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once camera is ready, start recording
  useEffect(() => {
    if (previewStream && selectedFormat && !started.current) {
      started.current = true;
      previewRef.current && (previewRef.current.srcObject = previewStream);
      startRecording(selectedFormat).then(() => {
        startTimer();
        // Signal Program B game monitor to start (best-effort — if B not running, A works fine)
        fetch('http://localhost:8001/api/game/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chart_id: 'chart_1' }),
        }).catch(() => {});
      });
    }
  }, [previewStream, selectedFormat, startRecording, startTimer]);

  // When recording finishes, store blob and move to review
  useEffect(() => {
    if (recordedBlob) {
      setRecordedBlob(recordedBlob);
      setScreen('REVIEW');
    }
  }, [recordedBlob, setRecordedBlob, setScreen]);

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-6">{error}</p>
          <button
            onClick={() => setScreen('START')}
            className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[var(--theme-bg,#607A33)]">
      {/* Camera preview — mirrored so user sees themselves naturally */}
      <video
        ref={previewRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping-slow" />
          <span className="text-white text-sm font-bold tracking-wide">REC</span>
        </div>
      )}

      {/* Remaining timer — top right */}
      <div className="absolute top-4 right-4 bg-black/60 rounded-xl px-4 py-2">
        <span className="text-white font-black text-3xl tabular-nums">
          {mins}:{secs}
        </span>
      </div>
    </div>
  );
}
