import {
  elapsedToSeconds,
  type EventView,
  type Mission,
  type MissionEvent,
} from '../content/types.ts';
import type { Parting } from '../sim/story-time.ts';
import type { Director, Player } from './contract.ts';
import { TRIP_ARRIVE_SECONDS, TRIP_EASE_SECONDS } from './player.ts';
import { nearestView } from './views.ts';

/**
 * Where the tour is:
 * - "off": not touring.
 * - "traveling": the clock is playing up to the next stop (at a parting,
 *   holding on its event and then playing on to where it rests).
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
  /**
   * Where a lander parts from the ship it was docked to at an event and then
   * keeps station beside it (see partingsAtEvents in src/sim/story-time.ts).
   * A stop at one of these events plays the parting and rests just after it
   * (see PARTING_REST_STORY_SECONDS).
   */
  partings?: readonly Parting[];
  /** Real time in milliseconds; tests pass their own clock. */
  now?: () => number;
}

const DEFAULT_LEAD_IN_SECONDS = 3;

/**
 * The shortest and longest trip from one stop to the next, in real seconds.
 * A trip takes as long as the story between the two stops lasts at normal
 * speed, kept within these: a hop between two close stops still has time to
 * be seen, and a long quiet stretch speeds up rather than keep anyone waiting.
 * The clock squeezes a long stretch into the longest trip by hurrying through
 * its middle only (see tripShape in player.ts).
 */
export const TRIP_MIN_SECONDS = 5;
export const TRIP_MAX_SECONDS = 15;

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
 * It is as long as a squeezed trip's arrival at normal speed, so the camera
 * moves as the clock settles back to that speed, and the stop's view shows
 * the run-in to the stop at the pace exploring would. The camera moves
 * sooner when the ship view's fast-forward view ends on the way, and later
 * when the scene is still fast-forwarding on the way to the ship view (see
 * watchScene).
 */
export const VIEW_LEAD_SECONDS = TRIP_ARRIVE_SECONDS;

/**
 * The camera moves to the stop's view ahead of time (see watchScene) only
 * when the stop is no more than this far off, in mission seconds. The ship is
 * then already where the stop's view looks. Farther off it may be days from
 * there (leaving the Moon for a splashdown), and the view would show a world
 * with no ship in it.
 */
export const EARLY_VIEW_MISSION_SECONDS = 3600;

/**
 * A stop at a parting (see TourOptions.partings) rests this many story
 * seconds after its event rather than on it. At the event the two craft are
 * still docked; the scene draws them parting over the first 1.5 story seconds
 * of their station keeping. Resting later lets the stop show what its event
 * says: the two parted, and flying side by side for a moment.
 */
export const PARTING_REST_STORY_SECONDS = 3;

/**
 * A parting's rest point comes no later than this share of the way through
 * its station keeping, in story time, so the two are still side by side there
 * and the next trip sets off before they go their own ways.
 */
export const PARTING_REST_MAX_SHARE = 0.6;

/**
 * Arriving at a parting, the clock holds still on the event for this many
 * real seconds before playing on to the rest point, so the two are seen
 * docked before they part.
 */
export const PARTING_HOLD_SECONDS = 1;

/**
 * The hold also lasts until this many real seconds after the camera moved to
 * the stop's view, so the move (about 1.5 seconds) has settled before the two
 * part. A camera that moved on reaching the event (see watchScene) makes the
 * hold this long; one that moved a few seconds before leaves the hold at
 * PARTING_HOLD_SECONDS.
 */
export const PARTING_VIEW_SETTLE_SECONDS = 2;

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
 * Real seconds of the play from a parting's event to its rest point, this
 * many story seconds later: at normal speed (1 story second per real second,
 * the pace of exploring) between a trip's usual eases out of the event and
 * into the rest point. Each ease covers half the story it would at that pace.
 */
export function restPlaySeconds(storySeconds: number): number {
  return storySeconds + TRIP_EASE_SECONDS;
}

/**
 * The guided tour: steps through the mission's events marked `inTour`. For
 * each stop it moves the camera to the event's view (or the nearest view the
 * mission offers), plays the clock up to the event, pauses there, and waits
 * for Next. Next flies the whole stretch from one stop to the next, moving
 * the camera near the end; starting, going back, and starting over play a
 * short run-up to the stop instead, with the camera moved at once. At a
 * parting (see TourOptions.partings) the clock holds on the event for a
 * moment, then plays on to rest just after it, with the two craft apart.
 */
export class Tour {
  readonly stops: readonly MissionEvent[];

  private phaseNow: TourPhase = 'off';
  private indexNow = 0;
  /** Story seconds the clock is playing to: the stop's event, then, at a parting, its rest point. */
  private targetStory = 0;
  /** Mission seconds of the stop's event. */
  private stopSeconds = 0;
  /** Where the clock rests at the stop, in mission and story seconds: the event, or a parting's rest point. */
  private restSeconds = 0;
  private restStory = 0;
  /** Real time in milliseconds when the clock's hold on a parting's event ends; null when not holding. */
  private holdUntilMs: number | null = null;
  private stopWatching: (() => void) | null = null;
  private travelStartMs = 0;
  private travelDeadlineMs = 0;
  /** The stop's view, while a trip waits to move the camera to it (see VIEW_LEAD_SECONDS). */
  private viewLater: EventView | null = null;
  private viewAtMs = 0;
  /** Real time in milliseconds when the camera last moved to a different view on the way to this stop. */
  private viewMovedMs = Number.NEGATIVE_INFINITY;
  /** Stops listening to the scene while a trip waits to move the camera (see watchScene). */
  private stopWatchingScene: (() => void) | null = null;
  /** True once the ship view has shown the scene's fast-forward view on this trip. */
  private sawFastForward = false;
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
      const atStop = Math.abs(this.player.storyTime - this.restStory) < 1e-6;
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
    this.restSeconds = this.restFor(this.stopSeconds, this.targetStory);
    // Through the same map as arrive's seek, so the two agree exactly.
    this.restStory = this.player.story.toStory(this.restSeconds);
    this.viewMovedMs = Number.NEGATIVE_INFINITY;
    const view = nearestView(this.mission, stop.view);
    const trip = way === 'trip' && !this.options.jumpStraight?.();
    const seconds = trip
      ? tripSeconds(this.targetStory - this.player.storyTime)
      : (this.options.leadInSeconds ?? DEFAULT_LEAD_IN_SECONDS);
    const now = this.now();
    if (trip && seconds > VIEW_LEAD_SECONDS) {
      this.viewLater = view;
      this.viewAtMs = now + (seconds - VIEW_LEAD_SECONDS) * 1000;
      this.sawFastForward = false;
      this.stopWatchingScene = this.director.subscribe(this.watchScene);
    } else {
      this.moveCamera(view);
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
   * On the way, move the camera to the stop's view when it is time. At a
   * parting, reaching the event starts the hold there instead (see holdAtEvent).
   */
  private readonly watchTravel = (player: Player): void => {
    if (this.phaseNow !== 'traveling') return;
    if (this.holdUntilMs !== null) {
      // Anything else that moves the clock during the hold ends it at the rest point.
      if (player.playing || player.storyTime !== this.targetStory) this.arrive();
      return;
    }
    if (this.viewLater && this.now() >= this.viewAtMs && !this.waitingOutFastForward())
      this.showStopView();
    // Exactly: a trip eases in so gently that it is within a hair of the stop
    // for its last few milliseconds, and it lands on the stop by itself.
    const reached = player.storyTime >= this.targetStory;
    if (reached && this.restStory - this.targetStory > 1e-6) this.holdAtEvent();
    else if (reached || !player.playing || this.now() > this.travelDeadlineMs) this.arrive();
  };

  /**
   * A trip can carry the ship around its body too fast to follow, and the
   * scene then shows its fast-forward view: the ship fades and its orbit shows
   * as a ring, in a steady view of the body. Two moves of the camera wait on it.
   *
   * Heading for the ship view, the move waits while the scene is still
   * fast-forwarding when its time comes (see VIEW_LEAD_SECONDS), until the
   * fast-forward view ends or the trip arrives: the ship view would only swap
   * one wide view of the ring for another, then cut in to the ship on arrival.
   * One steady view through the whole time-lapse and one move in to the ship
   * at the end reads better.
   *
   * In the ship view, when the fast-forward view ends while the trip still
   * waits to move the camera, and the stop is near (see
   * EARLY_VIEW_MISSION_SECONDS), the camera moves to the stop's view at once:
   * otherwise the ship view would swoop back in to chase the ship only to pull
   * out again for the stop's view moments later.
   */
  private readonly watchScene = (director: Director): void => {
    if (this.phaseNow !== 'traveling' || !this.viewLater) return;
    if (this.viewLater === 'spacecraft') {
      if (this.now() >= this.viewAtMs && !director.fastForward) this.showStopView();
    } else if (director.view !== 'spacecraft') {
      this.sawFastForward = false;
    } else if (director.fastForward) {
      this.sawFastForward = true;
    } else if (this.sawFastForward) {
      this.sawFastForward = false;
      const near = this.stopSeconds - this.player.time <= EARLY_VIEW_MISSION_SECONDS;
      if (near) this.showStopView();
    }
  };

  /** True while a move to the ship view waits for the scene's fast-forward view to end (see watchScene). */
  private waitingOutFastForward(): boolean {
    return this.viewLater === 'spacecraft' && this.director.fastForward === true;
  }

  /**
   * Mission seconds where the clock rests at a stop whose event is at
   * `eventSeconds` (`eventStory` in story seconds): the event itself, or for
   * a parting a little after it (see PARTING_REST_STORY_SECONDS).
   */
  private restFor(eventSeconds: number, eventStory: number): number {
    const parting = this.options.partings?.find(
      ({ start }) => Math.abs(start - eventSeconds) < 1e-6,
    );
    if (!parting) return eventSeconds;
    const besideStory = this.player.story.toStory(parting.end) - eventStory;
    if (!(besideStory > 0)) return eventSeconds;
    const after = Math.min(PARTING_REST_STORY_SECONDS, PARTING_REST_MAX_SHARE * besideStory);
    return this.player.story.toElapsed(eventStory + after);
  }

  /**
   * At a parting's event: hold the clock still there, so the two craft are
   * seen docked once the camera has settled, then play on to the rest point
   * (see PARTING_HOLD_SECONDS). The tour is still on its way throughout.
   */
  private holdAtEvent(): void {
    // Not listening while the clock is put exactly on the event (a trip lands
    // there by itself; a clock played on from a trip has gone past it).
    this.stopWatching?.();
    this.stopWatching = null;
    // A move that waited out the fast-forward view goes now.
    this.showStopView();
    if (this.player.playing || this.player.storyTime !== this.targetStory) {
      this.player.pause();
      this.player.seekStory(this.targetStory);
    }
    this.holdUntilMs = Math.max(
      this.now() + PARTING_HOLD_SECONDS * 1000,
      this.viewMovedMs + PARTING_VIEW_SETTLE_SECONDS * 1000,
    );
    this.stopWatching = this.player.subscribe(this.watchTravel);
    requestAnimationFrame(this.watchHold);
  }

  /** On each frame of a hold, play on to the rest point once it is over. */
  private readonly watchHold = (): void => {
    if (this.holdUntilMs === null) return;
    if (this.now() < this.holdUntilMs) {
      requestAnimationFrame(this.watchHold);
      return;
    }
    this.holdUntilMs = null;
    const seconds = restPlaySeconds(this.restStory - this.targetStory);
    this.targetStory = this.restStory;
    this.travelDeadlineMs = this.now() + (seconds + TRAVEL_GRACE_SECONDS) * 1000;
    this.player.playTo(this.restStory, seconds);
  };

  private now(): number {
    return this.options.now ? this.options.now() : performance.now();
  }

  /** Move the camera to a view, noting when it moves to a different one (see PARTING_VIEW_SETTLE_SECONDS). */
  private moveCamera(view: EventView): void {
    if (this.director.view !== view) this.viewMovedMs = this.now();
    this.director.setView(view);
  }

  /** Move the camera to the stop's view, if a trip is still waiting to. */
  private showStopView(): void {
    const view = this.viewLater;
    this.viewLater = null;
    if (view) this.moveCamera(view);
  }

  private arrive(): void {
    // A skip, or a trip cut short, arrives in the stop's own view all the same.
    this.showStopView();
    this.stopTravel();
    this.phaseNow = 'stopped';
    this.player.pause();
    this.player.seek(this.restSeconds);
    this.notify();
  }

  private finish(): void {
    this.stopTravel();
    this.player.pause();
    this.phaseNow = 'finished';
    this.notify();
  }

  /**
   * Stop watching the clock. A view still waiting, and a hold on a parting's
   * event, are dropped: the tour has arrived, is leaving, or is heading elsewhere.
   */
  private stopTravel(): void {
    this.stopWatching?.();
    this.stopWatching = null;
    this.stopWatchingScene?.();
    this.stopWatchingScene = null;
    this.viewLater = null;
    this.holdUntilMs = null;
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}
