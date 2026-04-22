import { useRef, useCallback, useEffect } from 'react';

export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      lockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Battery saver or permission denied — non-fatal
    }
  }, []);

  const release = useCallback(async () => {
    if (lockRef.current) {
      await lockRef.current.release().catch(() => {});
      lockRef.current = null;
    }
  }, []);

  // Re-acquire when tab becomes visible again (lock is auto-released on hide)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && lockRef.current === null) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [acquire]);

  return { acquire, release };
}
