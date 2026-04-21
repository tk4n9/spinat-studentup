import { create } from 'zustand';
import type { PadScreen, Format } from '../../types';

interface SessionState {
  screen: PadScreen;
  challengerCount: number;
  selectedFormat: Format | null;
  recordedBlob: Blob | null;
  uploadedVideoId: string | null;
  r2Url: string | null;

  setScreen: (s: PadScreen) => void;
  setChallengerCount: (n: number) => void;
  setSelectedFormat: (f: Format) => void;
  setRecordedBlob: (b: Blob | null) => void;
  setUploadResult: (id: string, url: string | null) => void;
  reset: () => void;
}

const initial = {
  screen: 'START' as PadScreen,
  challengerCount: 0,
  selectedFormat: null,
  recordedBlob: null,
  uploadedVideoId: null,
  r2Url: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initial,
  setScreen: (screen) => set({ screen }),
  setChallengerCount: (challengerCount) => set({ challengerCount }),
  setSelectedFormat: (selectedFormat) => set({ selectedFormat }),
  setRecordedBlob: (recordedBlob) => set({ recordedBlob }),
  setUploadResult: (id, url) => set({ uploadedVideoId: id, r2Url: url }),
  reset: () => set({ ...initial }),
}));
