import { useEffect, useRef, useState } from 'react';
import { usePlaylist } from './hooks/usePlaylist';

export default function MonitorApp() {
  const { videos, current, index, advance } = usePlaylist();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Load new video whenever current changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !current) return;
    el.src = current.url;
    el.load();
    el.play().catch(() => {});
  }, [current]);

  // When a video ends, either rewind-and-replay (single video) or
  // advance to the next (multi-video playlist).
  //
  // Belt-and-suspenders: `loop={videos.length <= 1}` below SHOULD make
  // the browser loop natively and suppress `ended` entirely for the
  // single-video case. Real-world behaviour drifts though — stale dist,
  // Safari autoplay interactions with audio tracks, or a transcoded MP4
  // whose duration metadata trips an early `ended` — so when `ended`
  // does fire and we only have one video, rewind + play explicitly
  // instead of falling off the end. `advance()` for len=1 is a setIndex
  // no-op (prev+1 % 1 === prev), so React bails out of the re-render,
  // the `[current]` effect never re-fires, and playback freezes on the
  // last frame. This explicit path avoids that trap.
  const handleEnded = () => {
    if (videos.length <= 1) {
      const el = videoRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
      return;
    }
    advance();
  };

  // Show connection indicator briefly then hide
  useEffect(() => {
    setWsConnected(true);
    const t = setTimeout(() => setWsConnected(false), 2000);
    return () => clearTimeout(t);
  }, [videos.length]);

  // Empty state
  if (videos.length === 0) {
    return (
      <div className="w-screen h-dvh bg-[var(--theme-bg,#607A33)] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-white/50 text-lg">영상을 기다리는 중...</p>
          <p className="text-white/20 text-sm mt-1">첫 번째 챌린저가 영상을 저장하면 재생됩니다</p>
        </div>
        <p className="text-white/10 text-xs tracking-widest">@spinat.official</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-dvh bg-[var(--theme-bg,#607A33)] relative overflow-hidden">
      {/* Main video player.
          `loop` when there's only one video — a single-element playlist
          can't advance (setIndex((0+1)%1)=0 is a no-op → effect never
          re-runs), so let the browser loop natively. Flip back to false
          as soon as a second video arrives via WS so `onEnded` fires and
          playlist advancement resumes. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        loop={videos.length <= 1}
        onEnded={handleEnded}
        className="w-full h-full object-cover"
      />

      {/* Video counter — bottom right, subtle */}
      <div className="absolute bottom-4 right-4 bg-black/40 rounded-lg px-3 py-1">
        <span className="text-white/40 text-xs tabular-nums">
          {index + 1} / {videos.length}
        </span>
      </div>

      {/* New video added indicator */}
      {wsConnected && (
        <div className="absolute top-4 left-4 bg-white/10 backdrop-blur rounded-lg px-3 py-1
                        animate-pulse-slow">
          <span className="text-white/60 text-xs">● 새 영상 추가됨</span>
        </div>
      )}
    </div>
  );
}
