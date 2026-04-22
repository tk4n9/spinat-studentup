import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api/endpoints';
import { wsUrl } from '../../api/client';
import type { DisplayVideo, WsMessage } from '../../types';

export function usePlaylist() {
  const [videos, setVideos] = useState<DisplayVideo[]>([]);
  const [index, setIndex] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch initial playlist
  useEffect(() => {
    api.getDisplayVideos()
      .then((list) => setVideos(list))
      .catch(console.error);
  }, []);

  // WebSocket: receive new videos in real-time
  const connectWs = useCallback(() => {
    const ws = new WebSocket(wsUrl('/ws/monitor'));
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg: WsMessage = JSON.parse(e.data);
      if (msg.type === 'new_video' && msg.id && msg.url) {
        setVideos((prev) => {
          // Avoid duplicates
          if (prev.some((v) => v.id === msg.id)) return prev;
          return [...prev, { id: msg.id!, filename: msg.filename ?? '', url: msg.url! }];
        });
      }
    };

    ws.onclose = () => {
      // Reconnect after 3s
      retryRef.current = setTimeout(connectWs, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      wsRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connectWs]);

  const videosRef = useRef(videos);
  videosRef.current = videos;

  const advance = useCallback(() => {
    setIndex((prev) => {
      const len = videosRef.current.length;
      return len > 0 ? (prev + 1) % len : 0;
    });
  }, []);

  const current = videos[index] ?? null;

  return { videos, current, index, advance };
}
