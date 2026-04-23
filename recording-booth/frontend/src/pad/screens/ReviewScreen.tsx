import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { api } from '../../api/endpoints';
import { useWakeLock } from '../hooks/useWakeLock';

export default function ReviewScreen() {
  const { recordedBlob, selectedFormat, setUploadResult, setScreen, setChallengerCount } =
    useSessionStore((s) => ({
      recordedBlob: s.recordedBlob,
      selectedFormat: s.selectedFormat,
      setUploadResult: s.setUploadResult,
      setScreen: s.setScreen,
      setChallengerCount: s.setChallengerCount,
    }));

  const [saveChecked, setSaveChecked] = useState(false);
  const [instaChecked, setInstaChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const { acquire, release } = useWakeLock();

  useEffect(() => {
    acquire();
    return () => { release(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create object URL for loop playback
  useEffect(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    blobUrlRef.current = url;
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.play();
    }
    return () => URL.revokeObjectURL(url);
  }, [recordedBlob]);

  const handleComplete = async () => {
    if (!recordedBlob || !selectedFormat || submitting) return;
    setSubmitting(true);

    try {
      // Neither checked → discard, go back to start
      if (!saveChecked && !instaChecked) {
        setScreen('START');
        return;
      }

      // Upload video
      const { id } = await api.uploadVideo(recordedBlob, selectedFormat.id);

      // Finalize (server routes to display/instagram folders)
      const { r2_url } = await api.finalizeVideo(id, {
        save: saveChecked,
        instagram: instaChecked,
      });

      // Increment challenger counter
      const { count } = await api.incrementCounter();
      setChallengerCount(count);

      setUploadResult(id, r2_url);

      if (saveChecked) {
        setScreen('QR_CODE');
      } else {
        setScreen('RESTART');
      }
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  return (
    // Full-bleed stage. h-dvh (dynamic viewport) guarantees the modal stays
    // inside the visible area on iOS Safari, where 100vh would include the
    // browser chrome and push content off-screen (Bug A root cause).
    <div className="relative w-full h-dvh bg-black overflow-hidden">
      {/* Video loop plays full-screen behind the modal */}
      <video
        ref={videoRef}
        loop
        playsInline
        muted={false}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Dim overlay for modal readability */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Centered modal card — padding honors iPad home-indicator safe area */}
      <div
        className="absolute inset-0 flex items-center justify-center px-6"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div
          className="w-full max-w-md flex flex-col gap-5 rounded-2xl border border-white/10
                     bg-black/70 backdrop-blur-md p-6 shadow-2xl"
        >
          {/* Checkboxes */}
          <div className="flex flex-col gap-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveChecked}
                onChange={(e) => setSaveChecked(e.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-white shrink-0"
              />
              <span className="text-white text-sm leading-snug">
                <span className="font-bold">저장하시겠습니까?</span>
                <br />
                <span className="text-white/70 text-xs">
                  체크 시 QR코드로 영상을 받아보실 수 있으며, 앞쪽 모니터에 전시됩니다.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={instaChecked}
                onChange={(e) => setInstaChecked(e.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-white shrink-0"
              />
              <span className="text-white text-sm leading-snug">
                <span className="font-bold">인스타그램 업로딩에 동의하십니까?</span>
                <br />
                <span className="text-white/70 text-xs">
                  체크 시 본 영상은 추후 @spinat.official에 업로드됩니다.
                </span>
              </span>
            </label>
          </div>

          {/* Complete button */}
          <button
            onClick={handleComplete}
            disabled={submitting}
            className="w-full py-4 bg-white text-black text-xl font-black rounded-2xl
                       active:scale-95 transition-transform disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
