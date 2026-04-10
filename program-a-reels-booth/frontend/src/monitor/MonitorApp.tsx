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

  // When a video ends, advance to next
  const handleEnded = () => advance();

  // Show connection indicator briefly then hide
  useEffect(() => {
    setWsConnected(true);
    const t = setTimeout(() => setWsConnected(false), 2000);
    return () => clearTimeout(t);
  }, [videos.length]);

  // Empty state
  if (videos.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center gap-6">
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
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Main video player */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
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
