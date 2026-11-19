import type { Player, StoryMap } from './contract.ts';

/**
 * The longest step one frame may advance, so a stalled tab does not leap
 * ahead. It is long enough that a slow device drawing only 4 frames a second
 * still plays at the right pace (at 0.1 it fell behind below 10 frames a
 * second, which made the tour's run-up to each stop drag on).
 */
const MAX_FRAME_SECONDS = 0.25;

/**
 * The mission clock. It advances in story time on each animation frame while
 * playing, and stops by itself at the end of the mission.
 */
export class MissionPlayer implements Player {
  readonly start: number;
  readonly end: number;
  readonly story: StoryMap;

  private storyNow: number;
  private isPlaying = false;
  private playRate = 1;
  private frame: number | null = null;
  private lastFrameMs: number | null = null;
  private readonly listeners = new Set<(player: Player) => void>();

  constructor(start: number, end: number, story: StoryMap) {
    this.start = start;
    this.end = end;
    this.story = story;
    this.storyNow = story.toStory(start);
  }

  get time(): number {
    return this.story.toElapsed(this.storyNow);
  }

  get storyTime(): number {
    return this.storyNow;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get rate(): number {
    return this.playRate;
  }

  seek(elapsedSeconds: number): void {
    const clamped = Math.min(this.end, Math.max(this.start, elapsedSeconds));
    this.seekStory(this.story.toStory(clamped));
  }

  seekStory(storySeconds: number): void {
    this.storyNow = Math.min(this.story.duration, Math.max(0, storySeconds));
    this.notify();
  }

  play(): void {
    if (this.isPlaying) return;
    if (this.storyNow >= this.story.duration) this.storyNow = 0;
    this.isPlaying = true;
    this.lastFrameMs = null;
    this.frame = requestAnimationFrame(this.step);
    this.notify();
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.notify();
  }

  setRate(rate: number): void {
    if (!(rate > 0) || rate === this.playRate) return;
    this.playRate = rate;
    this.notify();
  }

  subscribe(listener: (player: Player) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private readonly step = (nowMs: number): void => {
    if (!this.isPlaying) return;
    const elapsed = this.lastFrameMs === null ? 0 : (nowMs - this.lastFrameMs) / 1000;
    this.lastFrameMs = nowMs;
    this.storyNow += Math.min(MAX_FRAME_SECONDS, Math.max(0, elapsed)) * this.playRate;

    if (this.storyNow >= this.story.duration) {
      this.storyNow = this.story.duration;
      this.isPlaying = false;
      this.frame = null;
    } else {
      this.frame = requestAnimationFrame(this.step);
    }
    this.notify();
  };

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}
