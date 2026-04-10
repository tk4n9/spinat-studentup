import { apiFetch } from './client';
import type { UploadResult, FinalizeResult, DisplayVideo, Format } from '../types';

export const api = {
  getCounter: () =>
    apiFetch<{ count: number }>('/api/session/counter'),

  incrementCounter: () =>
    apiFetch<{ count: number }>('/api/session/counter/increment', { method: 'POST' }),

  getFormats: () =>
    apiFetch<Format[]>('/api/session/formats'),

  uploadVideo: async (blob: Blob, formatId: number): Promise<UploadResult> => {
    const form = new FormData();
    form.append('video_file', blob, `recording.webm`);
    form.append('format_id', String(formatId));
    return apiFetch<UploadResult>('/api/videos/upload', { method: 'POST', body: form });
  },

  finalizeVideo: async (
    videoId: string,
    opts: { save: boolean; instagram: boolean },
  ): Promise<FinalizeResult> => {
    const form = new FormData();
    form.append('save', String(opts.save));
    form.append('instagram', String(opts.instagram));
    return apiFetch<FinalizeResult>(`/api/videos/${videoId}/finalize`, {
      method: 'POST',
      body: form,
    });
  },

  getDisplayVideos: () =>
    apiFetch<DisplayVideo[]>('/api/videos/display'),
};
