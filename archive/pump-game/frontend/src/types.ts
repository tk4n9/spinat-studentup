// Chart format
export interface ChartMeta {
  title: string;
  artist: string;
  audio_file: string;
  duration_seconds: number;
  bpm: number;
  offset_ms: number;
}

export interface ChartNote {
  time: number;  // seconds from audio start
  lane: number;  // 0-4 (left to right)
}

export interface Chart {
  meta: ChartMeta;
  notes: ChartNote[];
}

// Game state
export type GameScreen = 'IDLE' | 'COUNTDOWN' | 'PLAYING' | 'RESULT';

export type Judgment = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';

export interface NoteState extends ChartNote {
  id: number;
  hit: boolean;
  missed: boolean;
  judgment: Judgment | null;
}

export interface GameResult {
  score: number;
  grade: string;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  maxCombo: number;
  totalNotes: number;
}

// Config from backend
export interface GameConfig {
  perfect_window_ms: number;
  great_window_ms: number;
  good_window_ms: number;
  scroll_speed: number;
  note_radius: number;
  hit_zone_y_percent: number;
  perfect_points: number;
  great_points: number;
  good_points: number;
  countdown_seconds: number;
  result_display_seconds: number;
  lane_keys: string[];
  audio_offset_ms: number;
}
