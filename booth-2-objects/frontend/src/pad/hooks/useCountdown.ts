import { useState, useEffect, useRef, useCallback } from 'react';

interface CountdownOptions {
  from: number;
  onTick?: (remaining: number) => void;
  onComplete?: () => void;
}

export function useCountdown({ from, onTick, onComplete }: CountdownOptions) {
  const [remaining, setRemaining] = useState(from);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const start = useCallback(() => {
    setRemaining(from);
    setRunning(true);
  }, [from]);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        onTick?.(next);
        if (next <= 0) {
          setRunning(false);
          clearInterval(intervalRef.current!);
          completeRef.current?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, onTick]);

  return { remaining, running, start, stop };
}
