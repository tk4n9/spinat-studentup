import { useEffect, useRef, useCallback } from 'react';
import { wsUrl } from '../../api/client';
import { fetchChart } from '../../api/endpoints';
import { useGameStore } from '../store/gameStore';

interface WsGameStart {
  type: 'game_start';
  chart_id: string;
}

type WsMessage = WsGameStart;

export function useGameWebSocket(): void {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setChart = useGameStore((s) => s.setChart);
  const setScreen = useGameStore((s) => s.setScreen);
  const getScreen = useCallback(() => useGameStore.getState().screen, []);

  const connect = useCallback(() => {
    const ws = new WebSocket(wsUrl('/ws/game'));
    wsRef.current = ws;

    ws.onmessage = (e: MessageEvent) => {
      const msg: WsMessage = JSON.parse(e.data as string);
      if (msg.type === 'game_start') {
        // Only accept game_start when IDLE — ignore if already playing
        if (getScreen() !== 'IDLE') return;
        fetchChart(msg.chart_id)
          .then((chart) => {
            setChart(chart, msg.chart_id);
            setScreen('COUNTDOWN');
          })
          .catch(console.error);
      }
    };

    ws.onclose = () => {
      retryRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [setChart, setScreen]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);
}
