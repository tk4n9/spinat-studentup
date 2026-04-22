import { create } from 'zustand';
import { api } from '../api/endpoints';
import type { BoothConfig } from '../types';

interface BoothState {
  config: BoothConfig | null;
  loading: boolean;
  error: string | null;
  /** Fetch /api/booth and cache. Idempotent — second call after success is a no-op. */
  fetch: () => Promise<void>;
}

/**
 * Zustand store for the per-booth runtime config. Populated once on App mount
 * from GET /api/booth; consumers read theme + identity without re-fetching.
 *
 * Kept separate from sessionStore because its lifecycle is app-global
 * (fetch once, never reset) vs sessionStore's per-challenger reset cycle.
 */
export const useBoothStore = create<BoothState>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  fetch: async () => {
    if (get().config || get().loading) return;
    set({ loading: true, error: null });
    try {
      const config = await api.getBoothConfig();
      set({ config, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },
}));
