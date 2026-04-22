import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * VITE_BOOTH selects which local backend the dev server proxies to.
 *   VITE_BOOTH=1 → :8000 (booth-1 / violin)
 *   VITE_BOOTH=2 → :8002 (booth-2 / biotron)
 *   VITE_BOOTH=3 → :8001 (booth-3 / playtron)
 *   VITE_BOOTH=4 → :8003 (booth-4 / beethoven)
 * Unset → defaults to :8000 (booth-1).
 *
 * Production does not use vite.config at runtime (FastAPI serves dist/),
 * so VITE_BOOTH has no effect outside `npm run dev`.
 *
 * Port mapping is intentional (non-monotonic): booth-3 sits on :8001 for
 * historical compatibility with iPad bookmarks from the Path C clone.
 * Booth-4 grabs the next free port (8003).
 */
const BOOTH_PORTS: Record<string, number> = { '1': 8000, '2': 8002, '3': 8001, '4': 8003 };

export default defineConfig(() => {
  const boothId = process.env.VITE_BOOTH ?? '1';
  const target = `http://localhost:${BOOTH_PORTS[boothId] ?? 8000}`;
  const wsTarget = target.replace(/^http/, 'ws');

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      // Proxy API + WS to FastAPI backend during development.
      proxy: {
        '/api':    { target, changeOrigin: true },
        '/ws':     { target: wsTarget, ws: true, changeOrigin: true },
        '/videos': { target, changeOrigin: true },
        '/music':  { target, changeOrigin: true },
      },
    },
  };
});
