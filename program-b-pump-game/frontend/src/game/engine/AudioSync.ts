export class AudioSync {
  private ctx: AudioContext;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startTime = 0;
  private offsetMs: number;
  private playing = false;

  constructor(offsetMs: number) {
    this.offsetMs = offsetMs;
    this.ctx = new AudioContext();
  }

  async load(audioFile: string): Promise<void> {
    try {
      const res = await fetch(audioFile);
      if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      // Gracefully handle missing audio — game works visually without it
      console.warn('[AudioSync] Could not load audio, running silent:', err);
      this.buffer = null;
    }
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    if (this.buffer) {
      this.source = this.ctx.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.connect(this.ctx.destination);
      this.source.start(0);
    }
    this.startTime = this.ctx.currentTime;
  }

  getCurrentTime(): number {
    if (!this.playing) return 0;
    return this.ctx.currentTime - this.startTime + this.offsetMs / 1000;
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    try {
      this.source?.stop();
    } catch {
      // ignore if already stopped
    }
    this.source = null;
    // Close AudioContext to prevent resource leak (~6 concurrent limit in Chrome)
    this.ctx.close().catch(() => {});
  }

  isPlaying(): boolean {
    return this.playing;
  }
}
