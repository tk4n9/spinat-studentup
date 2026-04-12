import type { Chart, GameConfig, GameResult } from '../../types';
import { AudioSync } from './AudioSync';
import { InputHandler } from './InputHandler';
import { NoteManager } from './NoteManager';
import { Scorer } from './Scorer';
import { Renderer } from './Renderer';

const LANE_COUNT = 5;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private chart: Chart;
  private config: GameConfig;

  private audio!: AudioSync;
  private input!: InputHandler;
  private notes!: NoteManager;
  private scorer!: Scorer;
  private renderer!: Renderer;

  private rafId: number | null = null;
  private running = false;

  onComplete: ((result: GameResult) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, chart: Chart, config: GameConfig) {
    this.canvas = canvas;
    this.chart = chart;
    this.config = config;
  }

  async init(): Promise<void> {
    // Fit canvas to its display size
    this.canvas.width = this.canvas.offsetWidth || window.innerWidth;
    this.canvas.height = this.canvas.offsetHeight || window.innerHeight;

    this.audio = new AudioSync(
      this.config.audio_offset_ms + this.chart.meta.offset_ms,
    );

    // Load audio — gracefully skips if file not found
    const audioPath = `/music/${this.chart.meta.audio_file}`;
    await this.audio.load(audioPath);

    this.notes = new NoteManager(this.chart.notes);
    this.scorer = new Scorer();
    this.renderer = new Renderer(this.canvas, this.config);

    this.input = new InputHandler(
      this.config.lane_keys,
      () => this.audio.getCurrentTime(),
    );

    this.input.onLanePress = (lane: number, time: number) => {
      const windows = {
        perfect: this.config.perfect_window_ms,
        great: this.config.great_window_ms,
        good: this.config.good_window_ms,
      };
      const judgment = this.notes.tryHit(lane, time, windows);
      if (judgment) {
        const points = {
          perfect: this.config.perfect_points,
          great: this.config.great_points,
          good: this.config.good_points,
        };
        this.scorer.addJudgment(judgment, points);
        this.renderer.queueJudgmentText(judgment, lane, LANE_COUNT);
      }
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.audio.play();
    this.update();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.audio.stop();
    this.input.destroy();
  }

  getResult(): GameResult {
    const stats = this.notes.getStats();
    const maxPossible =
      this.chart.notes.length * this.config.perfect_points;
    return this.scorer.getResult(this.chart.notes.length, stats, maxPossible);
  }

  private update(): void {
    if (!this.running) return;

    const currentTime = this.audio.getCurrentTime();
    const goodWindowSec = this.config.good_window_ms / 1000;
    this.notes.update(currentTime, goodWindowSec);

    const hitZoneY =
      this.canvas.height * (this.config.hit_zone_y_percent / 100);
    const laneWidth = this.canvas.width / LANE_COUNT;

    // Render frame
    this.renderer.clear();

    // Lane press backgrounds
    const pressed = this.input.getLanePressed();
    for (let i = 0; i < LANE_COUNT; i++) {
      this.renderer.drawLanePress(i, pressed[i], LANE_COUNT);
    }

    this.renderer.drawLanes(LANE_COUNT);
    this.renderer.drawHitZone(hitZoneY);

    // Visible notes
    const visible = this.notes.getVisibleNotes(
      currentTime,
      this.config.scroll_speed,
      this.canvas.height,
      this.config.hit_zone_y_percent,
    );

    for (const note of visible) {
      const x = laneWidth * note.lane + laneWidth / 2;
      this.renderer.drawNote(
        x,
        note.yPos,
        this.config.note_radius,
        note.lane,
        note,
      );
    }

    this.renderer.drawScore(this.scorer.getScore(), this.scorer.getCombo());
    this.renderer.drawFloatingTexts();

    // Check end of song
    if (currentTime >= this.chart.meta.duration_seconds) {
      this.running = false;
      this.audio.stop();
      this.input.destroy();
      this.onComplete?.(this.getResult());
      return;
    }

    this.rafId = requestAnimationFrame(() => this.update());
  }
}
