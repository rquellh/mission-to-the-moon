import type { Player, StoryMap } from './contract.ts';

/**
 * The longest step one frame may advance, so a stalled tab does not leap
 * ahead. It is long enough that a slow device drawing only 4 frames a second
 * still plays at the right pace (at 0.1 it fell behind below 10 frames a
 * second, which made the tour's run-up to each stop drag on).
 */
const MAX_FRAME_SECONDS = 0.25;

/**
 * The same limit for a trip made with playTo. A trip promises to take its
 * real seconds on any device, so its steps may be longer: a device drawing
 * one frame a second still arrives on time. A tab that stalls (hidden, then
 * shown again) still picks up about where it was rather than leaping to the end.
 */
const TRIP_MAX_FRAME_SECONDS = 1;

/**
 * A trip speeds up over this many real seconds as it leaves, and slows down
 * over as many as it arrives (each at most half the trip), so it neither
 * lurches away from where it was nor slams into where it is going.
 */
const TRIP_EASE_SECONDS = 1.5;

/** A playTo trip under way. Times are real seconds; places are story seconds. */
interface Trip {
  from: number;
  to: number;
  seconds: number;
  elapsed: number;
}

/** A moment on a trip: how far along it is (`share`) and how fast it is going (`pace`). */
export interface TripProgress {
  share: number;
  pace: number;
}

/**
 * How far along a trip is, from 0 to 1, after `elapsed` of its `seconds`,
 * and how fast it is going then, in whole trips per real second. The speed
 * rises from zero along half a cosine wave, holds, and falls back the same way.
 */
export function tripShape(elapsed: number, seconds: number): TripProgress {
  if (!(seconds > 0)) return { share: 1, pace: 0 };
  const u = Math.min(1, Math.max(0, elapsed / seconds));
  const ramp = Math.min(0.5, TRIP_EASE_SECONDS / seconds);
  // The top speed, in trips per unit of u, that makes the whole trip come to exactly 1.
  const top = 1 / (1 - ramp);
  const rampShare = (x: number): number => top * (x / 2 - (ramp / (2 * Math.PI)) * Math.sin((Math.PI * x) / ramp));
  const rampSlope = (x: number): number => (top * (1 - Math.cos((Math.PI * x) / ramp))) / 2;
  if (u < ramp) return { share: rampShare(u), pace: rampSlope(u) / seconds };
  if (u > 1 - ramp) return { share: 1 - rampShare(1 - u), pace: rampSlope(1 - u) / seconds };
  return { share: top * (ramp / 2 + (u - ramp)), pace: top / seconds };
}

/**
 * The mission clock. It advances in story time on each animation frame while
 * playing, and stops by itself at the end of the mission, or at the end of a
 * playTo trip.
 */
export class MissionPlayer implements Player {
  readonly start: number;
  readonly end: number;
  readonly story: StoryMap;

  private storyNow: number;
  private isPlaying = false;
  private playRate = 1;
  private trip: Trip | null = null;
  private frame: number | null = null;
  private lastFrameMs: number | null = null;
  private readonly listeners = new Set<(player: Player) => void>();
  private readonly now: () => number;

  /** `now` is real time in milliseconds, on the same clock as animation frames; tests pass their own. */
  constructor(start: number, end: number, story: StoryMap, now: () => number = () => performance.now()) {
    this.start = start;
    this.end = end;
    this.story = story;
    this.now = now;
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

  get speed(): number {
    if (!this.isPlaying) return 0;
    const trip = this.trip;
    if (!trip) return this.playRate;
    return Math.abs(trip.to - trip.from) * tripShape(trip.elapsed, trip.seconds).pace;
  }

  seek(elapsedSeconds: number): void {
    const clamped = Math.min(this.end, Math.max(this.start, elapsedSeconds));
    this.seekStory(this.story.toStory(clamped));
  }

  seekStory(storySeconds: number): void {
    // A jump replaces a trip; nothing asked for the clock to run on after it.
    if (this.trip) this.halt();
    this.storyNow = Math.min(this.story.duration, Math.max(0, storySeconds));
    this.notify();
  }

  play(): void {
    if (this.trip) {
      // Play on from here at the chosen speed instead of finishing the trip.
      this.trip = null;
      this.notify();
      return;
    }
    if (this.isPlaying) return;
    if (this.storyNow >= this.story.duration) this.storyNow = 0;
    this.isPlaying = true;
    this.lastFrameMs = null;
    this.frame = requestAnimationFrame(this.step);
    this.notify();
  }

  playTo(storySeconds: number, seconds: number): void {
    const to = Math.min(this.story.duration, Math.max(0, storySeconds));
    if (this.isPlaying) this.halt();
    if (!(seconds > 0) || to === this.storyNow) {
      this.storyNow = to;
      this.notify();
      return;
    }
    this.trip = { from: this.storyNow, to, seconds, elapsed: 0 };
    this.isPlaying = true;
    // Count from now, not from the first frame, so a slow device does not lose a frame's time.
    this.lastFrameMs = this.now();
    this.frame = requestAnimationFrame(this.step);
    this.notify();
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.halt();
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

  /** Stop the clock and any trip, without telling anyone yet. */
  private halt(): void {
    this.isPlaying = false;
    this.trip = null;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private readonly step = (nowMs: number): void => {
    if (!this.isPlaying) return;
    const elapsed = this.lastFrameMs === null ? 0 : Math.max(0, (nowMs - this.lastFrameMs) / 1000);
    this.lastFrameMs = nowMs;

    const trip = this.trip;
    if (trip) {
      trip.elapsed += Math.min(TRIP_MAX_FRAME_SECONDS, elapsed);
      if (trip.elapsed >= trip.seconds) {
        // Land exactly on the place asked for, then stand still there.
        this.storyNow = trip.to;
        this.trip = null;
        this.isPlaying = false;
        this.frame = null;
      } else {
        this.storyNow = trip.from + (trip.to - trip.from) * tripShape(trip.elapsed, trip.seconds).share;
        this.frame = requestAnimationFrame(this.step);
      }
      this.notify();
      return;
    }

    this.storyNow += Math.min(MAX_FRAME_SECONDS, elapsed) * this.playRate;
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
