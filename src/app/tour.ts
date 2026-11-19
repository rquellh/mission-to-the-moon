import { elapsedToSeconds, type EventView, type Mission, type MissionEvent } from '../content/types.ts';
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
  /**
   * Real seconds of the short run-up to a stop, when the tour starts, goes
   * back, or starts over. It covers this many story seconds at the current speed.
   */
  leadInSeconds?: number;
  /** When this returns true, jump straight to each stop instead of playing up to it. */
  jumpStraight?: () => boolean;
  /** Real time in milliseconds; tests pass their own clock. */
  now?: () => number;
}

const DEFAULT_LEAD_IN_SECONDS = 3;

/**
 * The shortest and longest trip from one stop to the next, in real seconds.
 * A trip takes as long as the story between the two stops lasts at normal
 * speed, kept within these: a hop between two close stops still has time to
 * be seen, and a long quiet stretch speeds up rather than keep anyone waiting.
 */
export const TRIP_MIN_SECONDS = 5;
export const TRIP_MAX_SECONDS = 14;

/**
 * A Skip pressed this soon after a trip starts is ignored, in milliseconds,
 * so a double tap on Next does not skip the trip it has just started.
 */
export const SKIP_GUARD_MS = 400;

/**
 * On a trip, the camera keeps the view it is in and moves to the stop's view
 * this many real seconds before arriving. The view chosen for a stop frames
 * the stop itself, so from the start of a long trip the spacecraft would often
 * be out of it (the Moon view, while the ship is still days from the Moon).
 * The camera's move takes about 1.5 seconds, so the arrival is framed as the
 * stop intends. A trip this short or shorter moves the camera at the start.
 */
export const VIEW_LEAD_SECONDS = 4;

/**
 * Travel may take this much longer than planned, in real seconds, before the
 * tour arrives anyway. The clock keeps to time on its own; this is a safety net.
 */
const TRAVEL_GRACE_SECONDS = 2;

/** Real seconds for the trip between two stops this many story seconds apart. */
export function tripSeconds(storySeconds: number): number {
  return Math.min(TRIP_MAX_SECONDS, Math.max(TRIP_MIN_SECONDS, Math.abs(storySeconds)));
}

/**
 * The guided tour: steps through the mission's events marked `inTour`. For
 * each stop it moves the camera to the event's view (or the nearest view the
 * mission offers), plays the clock up to the event, pauses there, and waits
 * for Next. Next flies the whole stretch from one stop to the next, moving
 * the camera near the end; starting, going back, and starting over play a
 * short run-up to the stop instead, with the camera moved at once.
 */
export class Tour {
  readonly stops: readonly MissionEvent[];

  private phaseNow: TourPhase = 'off';
  private indexNow = 0;
  private targetStory = 0;
  private stopSeconds = 0;
  private stopWatching: (() => void) | null = null;
  private travelStartMs = 0;
  private travelDeadlineMs = 0;
  /** The stop's view, while a trip waits to move the camera to it (see VIEW_LEAD_SECONDS). */
  private viewLater: EventView | null = null;
  private viewAtMs = 0;
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
    this.goTo(index, 'run-up');
  }

  /**
   * At a stop: on to the next one (or the ending, after the last). On the
   * way to a stop: arrive there at once.
   */
  next(): void {
    if (this.phaseNow === 'off' || this.phaseNow === 'finished') return;
    if (this.phaseNow === 'traveling') {
      if (this.now() - this.travelStartMs >= SKIP_GUARD_MS) this.arrive();
      return;
    }
    if (this.indexNow >= this.stops.length - 1) {
      this.finish();
    } else {
      // Fly from this stop, unless something has moved the clock away from it.
      const atStop = Math.abs(this.player.storyTime - this.targetStory) < 1e-6;
      this.goTo(this.indexNow + 1, atStop ? 'trip' : 'run-up');
    }
  }

  back(): void {
    if (this.phaseNow === 'off') return;
    if (this.phaseNow === 'finished') {
      this.goTo(this.stops.length - 1, 'run-up');
    } else if (this.indexNow > 0) {
      this.goTo(this.indexNow - 1, 'run-up');
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

  /**
   * Head for a stop. A "trip" plays the clock on from where it is, with no
   * cut, for as long as the stretch deserves; a "run-up" cuts to shortly
   * before the stop and plays the last few seconds.
   */
  private goTo(index: number, way: 'trip' | 'run-up'): void {
    const stop = this.stops[index];
    if (!stop) return;
    this.stopTravel();
    this.indexNow = index;
    this.stopSeconds = elapsedToSeconds(stop.elapsed);
    this.targetStory = this.player.story.toStory(this.stopSeconds);
    const view = nearestView(this.mission, stop.view);
    const trip = way === 'trip' && !this.options.jumpStraight?.();
    const seconds = trip
      ? tripSeconds(this.targetStory - this.player.storyTime)
      : (this.options.leadInSeconds ?? DEFAULT_LEAD_IN_SECONDS);
    const now = this.now();
    if (trip && seconds > VIEW_LEAD_SECONDS) {
      this.viewLater = view;
      this.viewAtMs = now + (seconds - VIEW_LEAD_SECONDS) * 1000;
    } else {
      this.director.setView(view);
    }
    if (this.options.jumpStraight?.()) {
      this.arrive();
      return;
    }

    if (!trip) {
      const leadIn = seconds * this.player.rate;
      if (!(leadIn > 0)) {
        this.arrive();
        return;
      }
      this.player.pause();
      this.player.seekStory(Math.max(0, this.targetStory - leadIn));
    }
    // Already there (a stop at the very start, or two stops at one time).
    if (Math.abs(this.targetStory - this.player.storyTime) < 1e-6) {
      this.arrive();
      return;
    }

    this.phaseNow = 'traveling';
    this.travelStartMs = now;
    this.travelDeadlineMs = now + (seconds + TRAVEL_GRACE_SECONDS) * 1000;
    this.notify();
    this.stopWatching = this.player.subscribe(this.watchTravel);
    this.player.playTo(this.targetStory, seconds);
  }

  /**
   * Arrive when the clock reaches the stop, or stops for any other reason
   * (a pause or a jump ends the trip early), or travel has taken far too long.
   * On the way, move the camera to the stop's view when it is time.
   */
  private readonly watchTravel = (player: Player): void => {
    if (this.phaseNow !== 'traveling') return;
    if (this.viewLater && this.now() >= this.viewAtMs) this.showStopView();
    // Exactly: a trip eases in so gently that it is within a hair of the stop
    // for its last few milliseconds, and it lands on the stop by itself.
    const reached = player.storyTime >= this.targetStory;
    if (reached || !player.playing || this.now() > this.travelDeadlineMs) this.arrive();
  };

  private now(): number {
    return this.options.now ? this.options.now() : performance.now();
  }

  /** Move the camera to the stop's view, if a trip is still waiting to. */
  private showStopView(): void {
    const view = this.viewLater;
    this.viewLater = null;
    if (view) this.director.setView(view);
  }

  private arrive(): void {
    // A skip, or a trip cut short, arrives in the stop's own view all the same.
    this.showStopView();
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

  /** Stop watching the clock. A view still waiting is dropped: the tour is leaving, or heading elsewhere. */
  private stopTravel(): void {
    this.stopWatching?.();
    this.stopWatching = null;
    this.viewLater = null;
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}
