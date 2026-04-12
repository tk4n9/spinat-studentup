import type { Judgment, GameResult } from '../../types';

interface PointConfig {
  perfect: number;
  great: number;
  good: number;
}

interface NoteStats {
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

export class Scorer {
  private score = 0;
  private combo = 0;
  private maxCombo = 0;

  addJudgment(judgment: Judgment, points: PointConfig): void {
    if (judgment === 'MISS') {
      this.combo = 0;
      return;
    }
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    switch (judgment) {
      case 'PERFECT': this.score += points.perfect; break;
      case 'GREAT':   this.score += points.great;   break;
      case 'GOOD':    this.score += points.good;     break;
    }
  }

  getScore(): number { return this.score; }
  getCombo(): number { return this.combo; }
  getMaxCombo(): number { return this.maxCombo; }

  getGrade(maxPossible: number): string {
    if (maxPossible === 0) return 'D';
    const ratio = this.score / maxPossible;
    if (ratio >= 0.90) return 'S';
    if (ratio >= 0.80) return 'A';
    if (ratio >= 0.70) return 'B';
    if (ratio >= 0.60) return 'C';
    return 'D';
  }

  getResult(totalNotes: number, stats: NoteStats, maxPossible: number): GameResult {
    return {
      score: this.score,
      grade: this.getGrade(maxPossible),
      perfectCount: stats.perfect,
      greatCount: stats.great,
      goodCount: stats.good,
      missCount: stats.miss,
      maxCombo: this.maxCombo,
      totalNotes,
    };
  }
}
