import type { NoteState, Judgment, GameConfig } from '../../types';

// 5 vibrant lane colors
const LANE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
const LANE_COLORS_ALPHA = ['#ef444440', '#3b82f640', '#22c55e40', '#eab30840', '#a855f740'];

interface FloatingText {
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
  createdAt: number;
  duration: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private config: GameConfig;
  private floatingTexts: FloatingText[] = [];

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.config = config;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawLanes(laneCount: number): void {
    const laneWidth = this.width / laneCount;
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    for (let i = 1; i < laneCount; i++) {
      const x = laneWidth * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
  }

  drawHitZone(y: number): void {
    // Glowing white/blue line
    this.ctx.save();
    this.ctx.shadowColor = '#60a5fa';
    this.ctx.shadowBlur = 18;
    this.ctx.strokeStyle = '#93c5fd';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.width, y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawNote(
    x: number,
    y: number,
    radius: number,
    lane: number,
    state: NoteState,
  ): void {
    const color = LANE_COLORS[lane % LANE_COLORS.length];
    this.ctx.save();

    if (state.hit) {
      // Burst/flash effect: expanding faint ring
      this.ctx.globalAlpha = 0.4;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius * 1.6, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 0;
    } else if (state.missed) {
      // Faded gray
      this.ctx.globalAlpha = 0.25;
      this.ctx.fillStyle = '#666';
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Normal note
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      // White center highlight
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
      this.ctx.beginPath();
      this.ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawScore(score: number, combo: number): void {
    this.ctx.save();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 28px "Noto Sans KR", system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#000';
    this.ctx.shadowBlur = 6;
    this.ctx.fillText(score.toLocaleString(), this.width / 2, 44);

    if (combo >= 2) {
      this.ctx.font = 'bold 20px "Noto Sans KR", system-ui, sans-serif';
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillText(`${combo} COMBO`, this.width / 2, 72);
    }
    this.ctx.restore();
  }

  queueJudgmentText(judgment: Judgment, lane: number, laneCount: number): void {
    const laneWidth = this.width / laneCount;
    const x = laneWidth * lane + laneWidth / 2;
    const hitZoneY = this.height * (this.config.hit_zone_y_percent / 100);
    const y = hitZoneY - 60;

    const colorMap: Record<Judgment, string> = {
      PERFECT: '#fbbf24',
      GREAT:   '#34d399',
      GOOD:    '#60a5fa',
      MISS:    '#ef4444',
    };

    this.floatingTexts.push({
      text: judgment,
      x,
      y,
      alpha: 1,
      color: colorMap[judgment],
      createdAt: performance.now(),
      duration: 700,
    });
  }

  drawFloatingTexts(): void {
    const now = performance.now();
    this.floatingTexts = this.floatingTexts.filter((ft) => {
      const elapsed = now - ft.createdAt;
      if (elapsed >= ft.duration) return false;
      const progress = elapsed / ft.duration;
      this.ctx.save();
      this.ctx.globalAlpha = 1 - progress;
      this.ctx.fillStyle = ft.color;
      this.ctx.font = 'bold 22px "Noto Sans KR", system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = '#000';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(ft.text, ft.x, ft.y - progress * 30);
      this.ctx.restore();
      return true;
    });
  }

  drawLanePress(lane: number, pressed: boolean, laneCount: number): void {
    if (!pressed) return;
    const laneWidth = this.width / laneCount;
    const x = laneWidth * lane;
    const color = LANE_COLORS_ALPHA[lane % LANE_COLORS_ALPHA.length];
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, 0, laneWidth, this.height);
  }
}
