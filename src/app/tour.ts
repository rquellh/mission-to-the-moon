import { elapsedToSeconds, type Mission, type MissionEvent } from '../content/types.ts';
import type { Director, Player } from './contract.ts';
import { nearestView } from './views.ts';

/**
 * Where the tour is:
 * - "off": not touring.
 * - "traveling": the clock is playing up to the next stop.
 * - "stopped": paused at a stop, waiting for Next.
 * - "finished": past the last stop, showing the ending.
 */
export type TourPhase = 'off' | 'traveling' | 'stopped' | 'finished';

export interface TourOptions {
  /** Real seconds of playback leading up to each stop (at the current speed). */
  leadInSeconds?: number;
  /** When this returns true, jump straight to each stop instead of playing up to it. */
  jumpStraight?: () => boolean;
  /** Real time in milliseconds; tests pass their own clock. */
  now?: () => number;
}

const DEFAULT_LEAD_IN_SECONDS = 3;
/**
 * The run-up to a stop may take this much longer than planned, in real
 * seconds, before the tour arrives anyway. A device that draws few frames
 * plays slowly; the visitor should not wait on it.
 */
const TRAVEL_GRACE_SECONDS = 2;

/**
 * The guided tour: steps through the mission's events marked `inTour`. For
 * each stop it moves the camera to the event's view (or the nearest view the
 * mission offers), plays the clock from shortly before the event up to it,
 * pauses there, and waits for Next.
 */
export class Tour {
  readonly stops: readonly MissionEvent[];

  private phaseNow: TourPhase = 'off';
  private indexNow = 0;
  private targetStory = 0;
  private stopSeconds = 0;
  private stopWatching: (() => void) | null = null;
  private travelDeadlineMs = 0;
  private readonly listeners = new Set<(tour: Tour) => void>();

  // Written out rather than as constructor parameter properties, so Node can
  // run this file directly in a test (it strips types but does not compile them).
  private readonly mission: Mission;
  private readonly player: Player;
  private readonly director: Director;
  private readonly options: TourOptions;

  constructor(mission: Mission, player: Player, director: Director, options: TourOptions = {}) {
    this.mission = mission;
    this.player = player;
    this.director = director;
    this.options = options;
    this.stops = mission.events.filter((event) => event.inTour);
  }

  get phase(): TourPhase {
    return this.phaseNow;
  }

  get active(): boolean {
    return this.phaseNow !== 'off';
  }

  /** Zero-based position of the current stop. */
  get index(): number {
    return this.indexNow;
  }

  get total(): number {
    return this.stops.length;
  }

  /** The stop being traveled to or stopped at; null when off or finished. */
  get stop(): MissionEvent | null {
    if (this.phaseNow === 'off' || this.phaseNow === 'finished') return null;
    return this.stops[this.indexNow] ?? null;
  }

  start(index = 0): void {
    this.goTo(index);
  }

  next(): void {
    if (this.phaseNow === 'off' || this.phaseNow === 'finished') return;
    if (this.indexNow >= this.stops.length - 1) {
      this.finish();
    } else {
      this.goTo(this.indexNow + 1);
    }
  }

  back(): void {
    if (this.phaseNow === 'off') return;
    if (this.phaseNow === 'finished') {
      this.goTo(this.stops.length - 1);
    } else if (this.indexNow > 0) {
      this.goTo(this.indexNow - 1);
    }
  }

  /** Leave the tour where it is. The clock stays paused at the current time. */
  exit(): void {
    if (this.phaseNow === 'off') return;
    this.stopTravel();
    this.player.pause();
    this.phaseNow = 'off';
    this.notify();
  }

  /** Hear about every change of stop or phase. Returns a function that stops listening. */
  subscribe(listener: (tour: Tour) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private goTo(index: number): void {
    const stop = this.stops[index];
    if (!stop) return;
    this.stopTravel();
    this.indexNow = index;
    this.stopSeconds = elapsedToSeconds(stop.elapsed);
    this.targetStory = this.player.story.toStory(this.stopSeconds);
    this.director.setView(nearestView(this.mission, stop.view));

    const leadIn = (this.options.leadInSeconds ?? DEFAULT_LEAD_IN_SECONDS) * this.player.rate;
    if (this.options.jumpStraight?.() || leadIn <= 0) {
      this.arrive();
      return;
    }

    this.phaseNow = 'traveling';
    this.travelDeadlineMs = this.now() + ((this.options.leadInSeconds ?? DEFAULT_LEAD_IN_SECONDS) + TRAVEL_GRACE_SECONDS) * 1000;
    this.player.pause();
    this.player.seekStory(Math.max(0, this.targetStory - leadIn));
    this.notify();
    this.stopWatching = this.player.subscribe(this.watchTravel);
    this.player.play();
  }

  /** Arrive when the clock reaches the stop, stops by itself, or the run-up has taken too long. */
  private readonly watchTravel = (player: Player): void => {
    if (this.phaseNow !== 'traveling') return;
    const reached = player.storyTime >= this.targetStory - 1e-6;
    if (reached || !player.playing || this.now() > this.travelDeadlineMs) this.arrive();
  };

  private now(): number {
    return this.options.now ? this.options.now() : performance.now();
  }

  private arrive(): void {
    this.stopTravel();
    this.phaseNow = 'stopped';
    this.player.pause();
    this.player.seek(this.stopSeconds);
    this.notify();
  }

  private finish(): void {
    this.stopTravel();
    this.player.pause();
    this.phaseNow = 'finished';
    this.notify();
  }

  private stopTravel(): void {
    this.stopWatching?.();
    this.stopWatching = null;
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}
