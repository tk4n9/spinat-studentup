import type { ChartNote, NoteState, Judgment } from '../../types';

interface HitWindows {
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

export class NoteManager {
  private notes: NoteState[];

  constructor(chartNotes: ChartNote[]) {
    this.notes = chartNotes.map((n, i) => ({
      ...n,
      id: i,
      hit: false,
      missed: false,
      judgment: null,
    }));
  }

  update(currentTime: number, goodWindowSec: number): void {
    for (const note of this.notes) {
      if (note.hit || note.missed) continue;
      if (currentTime - note.time > goodWindowSec) {
        note.missed = true;
        note.judgment = 'MISS';
      }
    }
  }

  tryHit(lane: number, currentTime: number, windows: HitWindows): Judgment | null {
    // Find the nearest unhit note in this lane within the good window
    let best: NoteState | null = null;
    let bestDist = Infinity;

    for (const note of this.notes) {
      if (note.hit || note.missed || note.lane !== lane) continue;
      const dist = Math.abs(currentTime - note.time) * 1000; // convert to ms
      if (dist <= windows.good && dist < bestDist) {
        bestDist = dist;
        best = note;
      }
    }

    if (!best) return null;

    let judgment: Judgment;
    if (bestDist <= windows.perfect) {
      judgment = 'PERFECT';
    } else if (bestDist <= windows.great) {
      judgment = 'GREAT';
    } else {
      judgment = 'GOOD';
    }

    best.hit = true;
    best.judgment = judgment;
    return judgment;
  }

  getVisibleNotes(
    currentTime: number,
    scrollSpeed: number,
    canvasHeight: number,
    hitZoneYPercent: number,
  ): Array<NoteState & { yPos: number }> {
    const hitZoneY = canvasHeight * (hitZoneYPercent / 100);
    // Notes appear from top: future notes above hit zone, past notes below
    // Y = hitZoneY - (note.time - currentTime) * scrollSpeed
    const result: Array<NoteState & { yPos: number }> = [];
    for (const note of this.notes) {
      const yPos = hitZoneY - (note.time - currentTime) * scrollSpeed;
      // Only include notes within viewport (with some margin)
      if (yPos >= -50 && yPos <= canvasHeight + 50) {
        result.push({ ...note, yPos });
      }
    }
    return result;
  }

  getStats(): NoteStats {
    let perfect = 0, great = 0, good = 0, miss = 0;
    for (const note of this.notes) {
      if (note.judgment === 'PERFECT') perfect++;
      else if (note.judgment === 'GREAT') great++;
      else if (note.judgment === 'GOOD') good++;
      else if (note.judgment === 'MISS') miss++;
    }
    return { perfect, great, good, miss };
  }

  getNotes(): NoteState[] {
    return this.notes;
  }
}
