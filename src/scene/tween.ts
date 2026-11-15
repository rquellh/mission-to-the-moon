/** Smooth start and stop. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * A time-based animation from 0 to 1. Call `step(now)` once per frame; it
 * returns the eased progress and calls `onUpdate` with it. A duration of 0
 * finishes on the first step (used for reduced motion).
 */
export class Tween {
  private startTime: number | null = null;
  private finished = false;

  constructor(
    private readonly durationMs: number,
    private readonly onUpdate: (eased: number) => void,
    private readonly ease: (t: number) => number = easeInOutCubic,
  ) {}

  get done(): boolean {
    return this.finished;
  }

  step(now: number): void {
    if (this.finished) return;
    if (this.startTime === null) this.startTime = now;
    const t = this.durationMs <= 0 ? 1 : Math.min((now - this.startTime) / this.durationMs, 1);
    this.onUpdate(this.ease(t));
    if (t >= 1) this.finished = true;
  }

  /** Stop without reaching the end. */
  cancel(): void {
    this.finished = true;
  }
}
