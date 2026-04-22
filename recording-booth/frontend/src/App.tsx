import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PadApp from './pad/PadApp';
import MonitorApp from './monitor/MonitorApp';
import { useBoothStore } from './store/boothStore';

export default function App() {
  const config = useBoothStore((s) => s.config);
  const loading = useBoothStore((s) => s.loading);
  const error = useBoothStore((s) => s.error);
  const fetchConfig = useBoothStore((s) => s.fetch);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Apply the per-booth CSS custom properties on :root so Tailwind / inline
  // styles can reference them via var(--theme-primary) / var(--theme-accent).
  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', config.theme.primary);
    root.style.setProperty('--theme-accent', config.theme.accent);
    document.title = `spinat ${config.name} booth`;
  }, [config]);

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white/70 text-sm px-8 text-center">
        부스 설정을 불러오지 못했어요 — 서버 로그를 확인해 주세요. ({error})
      </div>
    );
  }

  if (loading || !config) {
    // Neutral placeholder: same background as the app shell, no booth-specific
    // styling (we don't have the theme yet). A single centered spinner.
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pad" element={<PadApp />} />
        <Route path="/monitor" element={<MonitorApp />} />
        {/* Default: redirect to /pad (useful during dev) */}
        <Route path="*" element={<Navigate to="/pad" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
