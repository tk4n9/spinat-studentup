export interface Format {
  id: number;
  label: string;
  duration_seconds: number;
  music_file: string | null;
  music_start_offset: number;
}

export type PadScreen =
  | 'START'
  | 'COUNTDOWN'
  | 'RECORDING'
  | 'REVIEW'
  | 'QR_CODE'
  | 'RESTART';

export interface UploadResult {
  id: string;
  format_id: number;
}

export interface FinalizeResult {
  id: string;
  r2_url: string | null;
}

export interface DisplayVideo {
  id: string;
  filename: string;
  url: string;
}

export interface WsMessage {
  type: 'new_video' | 'playlist_update';
  id?: string;
  filename?: string;
  url?: string;
}
