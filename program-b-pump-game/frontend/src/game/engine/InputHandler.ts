const DEFAULT_KEY_MAP: Record<string, number> = {
  a: 0, s: 1, d: 2, f: 3, g: 4,
};

const DEBOUNCE_MS = 20;

export class InputHandler {
  private keyMap: Record<string, number>;
  private pressed: boolean[] = [false, false, false, false, false];
  private lastPress: number[] = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
  private onLanePressCallback: ((lane: number, time: number) => void) | null = null;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(
    laneKeys: string[],
    private getTime: () => number,
  ) {
    // Build key map from config, falling back to default
    if (laneKeys.length === 5) {
      this.keyMap = {};
      laneKeys.forEach((k, i) => { this.keyMap[k.toLowerCase()] = i; });
    } else {
      this.keyMap = { ...DEFAULT_KEY_MAP };
    }

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  set onLanePress(cb: (lane: number, time: number) => void) {
    this.onLanePressCallback = cb;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const lane = this.keyMap[e.key.toLowerCase()];
    if (lane === undefined) return;
    const now = performance.now();
    if (now - this.lastPress[lane] < DEBOUNCE_MS) return;
    this.lastPress[lane] = now;
    this.pressed[lane] = true;
    this.onLanePressCallback?.(lane, this.getTime());
  }

  private onKeyUp(e: KeyboardEvent): void {
    const lane = this.keyMap[e.key.toLowerCase()];
    if (lane === undefined) return;
    this.pressed[lane] = false;
  }

  getLanePressed(): boolean[] {
    return [...this.pressed];
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
