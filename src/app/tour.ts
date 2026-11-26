import {
  elapsedToSeconds,
  type EventView,
  type Mission,
  type MissionEvent,
} from '../content/types.ts';
import type { Parting } from '../sim/story-time.ts';
import { stillBetween, type Stay } from '../sim/surface.ts';
import type { Director, Player } from './contract.ts';
import {
  planTrip,
  TRIP_ARRIVE_SECONDS,
  TRIP_DEPART_SECONDS,
  TRIP_EASE_SECONDS,
  type TripPlan,
} from './player.ts';
import { nearestView } from './views.ts';

/**
 * Where the tour is:
 * - "off": not touring.
 * - "traveling": the clock is playing up to the next stop (at a parting,
 *   holding on its event and then playing on to where it rests), or the
 *   clock is at the stop and the camera is still settling there.
 * - "stopped": paused at a stop, waiting for Next.
 * - "finished": past the last stop, showing the ending.
 */
export type TourPhase = 'off' | 'traveling' | 'stopped' | 'finished';

export interface TourOptions {
  /** When this returns true, jump straight to each stop instead of playing up to it. */
  jumpStraight?: () => boolean;
  /**
   * Where a lander parts from the ship it was docked to at an event and then
   * keeps station beside it (see partingsAtEvents in src/sim/story-time.ts).
   * A stop at one of these events plays the parting and rests just after it
   * (see PARTING_REST_STORY_SECONDS).
   */
  partings?: readonly Parting[];
  /**
   * The mission seconds of each event at which a craft lets go of a part
   * that falls away (see dropsAtEvents in drops.ts). An every-event tour's
   * stop there rests just after it, once the part has fallen away (see
   * DROP_REST_STORY_SECONDS).
   */
  drops?: readonly number[];
  /**
   * Where the craft the story follows rests on a surface (see staysOnSurface
   * in src/sim/surface.ts). An every-event tour turns straight from one stop
   * to the next within one of these (see StyleRules.pageTurns).
   */
  stays?: readonly Stay[];
  /** Real time in milliseconds; tests pass their own clock. */
  now?: () => number;
}

/**
 * Starting the tour, going back, and starting over cut to shortly before the
 * stop and play up to it: a run-up. It plays the last RUN_UP_STORY_SECONDS
 * story seconds before the stop at normal speed (1 story second per real
 * second, the pace of exploring) between a trip's usual eases (see
 * playSeconds), so the moments just before a stop are seen at the pace they
 * were made for, never faster, whatever speed was chosen for exploring.
 */
export const RUN_UP_STORY_SECONDS = 3;

/**
 * A run-up covers no more than this much mission time, in mission seconds.
 * In a quiet stretch three story seconds can be hours (six before "Eagle
 * undocks", with the ship lapping the Moon three times), and the run-up
 * would be a time-lapse, the scene fast-forwarding while the camera is still
 * moving to the stop's view, which then dives in and out again.
 */
export const RUN_UP_MAX_MISSION_SECONDS = 30 * 60;

/**
 * A run-up with less than this many story seconds left to play is skipped,
 * and the tour cuts straight to the stop: a fraction of a second of play
 * would be a twitch, not a run-up.
 */
export const RUN_UP_MIN_STORY_SECONDS = 1;

/**
 * The shortest and longest trip from one stop to the next of a key-moments
 * tour, in real seconds (an every-event tour's are in
 * EVERY_EVENT_TRIP_MAX_SECONDS and everyEventTripSeconds).
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
 * On a trip of a key-moments tour (an every-event tour keeps one view; see
 * StyleRules.viewOnTrips), the camera keeps the view it is in and moves to
 * the stop's view this many real seconds before arriving. The view chosen
 * for a stop frames the stop itself, so from the start of a long trip the
 * spacecraft would often be out of it (the Moon view, while the ship is
 * still days from the Moon).
 * The camera's move takes up to 3 seconds, so the arrival is framed as the
 * stop intends. A trip this short or shorter moves the camera at the start.
 * It is as long as a squeezed trip's arrival at normal speed, so the camera
 * moves as the clock settles back to that speed, and the stop's view shows
 * the run-in to the stop at the pace exploring would. The camera moves
 * sooner on a short hurried trip out of the ship view (see
 * HURRY_VIEW_MISSION_SECONDS), on a trip whose final run into a body is
 * longer than this (see tripViewSeconds), and when the ship view's
 * fast-forward view ends on the way; and later when the scene is still
 * fast-forwarding when it is due (see watchScene).
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
 * A trip that hurries (see tripShape in player.ts) from the ship view to a
 * stop in the Earth or Moon view no more than this far off, in mission
 * seconds, moves the camera to the stop's view as its hurry begins, not
 * shortly before arriving. A ship that near a stop in a body's view is going
 * round that body already (nothing crosses between Earth and Moon in three
 * hours), so the stop's view shows the hurry as well as the ship view would:
 * the same body, and the same ring when the ship goes round too fast to
 * follow. Staying in the ship view instead costs two camera moves close
 * together, back to its steady fast-forward view and then round to the
 * stop's view moments later, the second of them while the stop's own action
 * is playing (Apollo 11 from "Eagle undocks" to the landing: the powered
 * descent played under a swinging camera). Farther off, the ship view's
 * time-lapse is long enough to settle into, and the ship may be far from the
 * stop's body.
 */
export const HURRY_VIEW_MISSION_SECONDS = 3 * 3600;

/**
 * On reaching a stop, the tour stays on its way while the scene says its
 * camera is still moving (Director.moving), for at most this many real
 * seconds: Next is offered once the stop's view has settled, so the next trip
 * does not set off with the camera still swinging round, and a scene that
 * never says it has settled holds the tour up only briefly. A scene that
 * cannot say counts as settled. The same wait ends the hold on a parting's
 * event (see PARTING_HOLD_SECONDS). A Skip does not wait: the button says the
 * tour will be at the stop, so it is, with the camera still on its way.
 * A little longer than the scene's longest camera move (CAMERA_MOVE_MS in
 * src/scene/config.ts), which starts a frame after it is asked for.
 */
export const CAMERA_SETTLE_MAX_SECONDS = 3.5;

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
 * An every-event tour's stop where a craft lets go of a part (see
 * TourOptions.drops) rests this many story seconds after its event: the
 * scene draws the part falling away over the first 1.1 story seconds or so
 * (DROP_STORY_SECONDS in src/scene/vehicles.ts), and the stop shows it gone.
 * Like a parting's, the rest point comes no later than PARTING_REST_MAX_SHARE
 * of the way to the next stop, and the clock holds on the event first (see
 * PARTING_HOLD_SECONDS), so the part is seen on the craft before it goes.
 */
export const DROP_REST_STORY_SECONDS = 1.5;

/**
 * Arriving at a parting, the clock holds still on the event for this many
 * real seconds before playing on to the rest point, so the two are seen
 * docked before they part. The hold also lasts until the camera has settled
 * in the stop's view (see CAMERA_SETTLE_MAX_SECONDS).
 */
export const PARTING_HOLD_SECONDS = 1;

/**
 * With a scene that cannot say whether its camera is moving, the hold lasts
 * until this many real seconds after the camera moved to the stop's view
 * instead, so the move (about 1.5 seconds) has settled before the two part.
 * A camera that moved on reaching the event (see watchScene) makes the hold
 * this long; one that moved a few seconds before leaves the hold at
 * PARTING_HOLD_SECONDS.
 */
export const PARTING_VIEW_SETTLE_SECONDS = 2;

/**
 * Travel may take this much longer than planned, in real seconds, before the
 * tour arrives anyway. The clock keeps to time on its own; this is a safety net.
 */
const TRAVEL_GRACE_SECONDS = 2;

/** Two places on the clock this close, in story seconds, are the same place. */
const SAME_STORY_SECONDS = 1e-6;

/**
 * Real seconds for the trip between two stops of a key-moments tour this
 * many story seconds apart, as asked of the clock. A hurried trip held back
 * by the clock's craft takes longer (see planTrip in player.ts).
 */
export function tripSeconds(storySeconds: number): number {
  return Math.min(TRIP_MAX_SECONDS, Math.max(TRIP_MIN_SECONDS, Math.abs(storySeconds)));
}

/**
 * Real seconds into a trip at which the camera moves to the stop's view, for
 * a trip planned as `plan` (see planTrip) over `storySeconds` of story, from
 * `fromView` to a stop in `toView` that is `missionToStop` mission seconds
 * off. One move, at the first of these that applies:
 *
 * - A hurried trip out of the ship view to a stop in the Earth or Moon view
 *   no more than HURRY_VIEW_MISSION_SECONDS off moves as its hurry begins,
 *   TRIP_DEPART_SECONDS in.
 * - A trip to a stop in the Earth or Moon view whose final run (from the end
 *   of its last hurry to the stop, see TripPlan.finalRun) is longer than
 *   VIEW_LEAD_SECONDS moves as that final run begins, and no sooner than its
 *   hurry would: the trip has been held to about normal speed for a swing in
 *   to the body (a capsule arriving at Earth, a craft sweeping into lunar
 *   orbit), and that body's view shows the whole of it, where a wide view
 *   would show a speck and the ship view's chase would turn with the craft.
 *   A trip with the usual shape has a final run of exactly
 *   VIEW_LEAD_SECONDS, so this never moves its camera.
 * - Otherwise, VIEW_LEAD_SECONDS before arriving.
 *
 * A trip no longer than VIEW_LEAD_SECONDS moves at once (see goTo). On the
 * way, the scene may still move the camera sooner, or hold the move back
 * (see watchScene).
 */
export function tripViewSeconds(trip: {
  readonly fromView: EventView;
  readonly toView: EventView;
  readonly missionToStop: number;
  readonly plan: TripPlan;
}): number {
  const { fromView, toView, missionToStop, plan } = trip;
  const toBody = toView === 'earth' || toView === 'moon';
  if (
    fromView === 'spacecraft' &&
    toBody &&
    missionToStop <= HURRY_VIEW_MISSION_SECONDS &&
    plan.hurries
  )
    return TRIP_DEPART_SECONDS;
  if (toBody && plan.finalRun > VIEW_LEAD_SECONDS)
    return Math.max(TRIP_DEPART_SECONDS, plan.seconds - plan.finalRun);
  return plan.seconds - VIEW_LEAD_SECONDS;
}

/**
 * Real seconds to play this many story seconds at normal speed (1 story
 * second per real second, the pace of exploring) between a trip's usual eases
 * out of where it starts and into where it stops: a run-up, and a parting's
 * play from its event to its rest point. Each ease covers half the story it
 * would at that pace. Under three story seconds the two eases meet, and the
 * play never reaches normal speed.
 */
export function playSeconds(storySeconds: number): number {
  return storySeconds + TRIP_EASE_SECONDS;
}

/**
 * The longest trip of an every-event tour, in real seconds. Its trips play
 * at Explore's pace, so this reaches only a story longer than any between
 * two of Apollo 11's events (17.4 story seconds at most): such a trip would
 * play its first and last few seconds at Explore's pace and hurry through
 * its middle (see tripShape and planTrip in player.ts), as a key-moments
 * trip longer than TRIP_MAX_SECONDS does.
 */
export const EVERY_EVENT_TRIP_MAX_SECONDS = 30;

/**
 * Real seconds for a trip of an every-event tour over this many story
 * seconds: the story at Explore's pace, 1 story second per real second,
 * between the trip's eases out of one stop and into the next (see
 * playSeconds), so nothing on the way plays faster than Explore shows it,
 * up to EVERY_EVENT_TRIP_MAX_SECONDS. There is no shortest trip: two stops
 * close together are a short trip.
 */
export function everyEventTripSeconds(storySeconds: number): number {
  return Math.min(EVERY_EVENT_TRIP_MAX_SECONDS, playSeconds(Math.abs(storySeconds)));
}

/**
 * What a tour style decides (see TourStyle in src/content/types.ts). Each
 * flight's tour follows one. The key-moments style goes away once every
 * flight has been converted to every-event, and with it the members here
 * that only it uses.
 */
export interface StyleRules {
  /** The events the tour stops at, in order. */
  stops(mission: Mission): MissionEvent[];
  /** The view the camera shows at a stop. */
  view(mission: Mission, stop: MissionEvent): EventView;
  /** Real seconds for the trip between two stops this many story seconds apart, as asked of the clock (a trip held back by the clock's craft takes longer; see planTrip in player.ts). */
  tripSeconds(storySeconds: number): number;
  /**
   * True when a trip moves the camera to the stop's view on the way (see
   * tripViewSeconds and watchScene). False when the tour keeps one view from
   * start to end: it asks for it as it starts, on a run-up (Back, starting
   * over), and whenever the camera is in another; a trip, and a page turn,
   * leave the camera where it is, so a visitor's drag stays.
   */
  viewOnTrips: boolean;
  /** True when a stop where a craft lets go of a part rests just after it (see DROP_REST_STORY_SECONDS). */
  showsDrops: boolean;
  /**
   * True when Next and Back turn straight to the next page, with the clock
   * jumped there, across a stretch in which the craft the story follows
   * rests on a surface (see TourOptions.stays): there is nothing to watch.
   */
  pageTurns: boolean;
}

/** A key-moments tour: the flight's key moments, each in its own view, a trip of 5 to 15 seconds between them. */
const KEY_MOMENTS: StyleRules = {
  stops: (mission) => mission.events.filter((event) => event.keyMoment),
  view: (mission, stop) => nearestView(mission, stop.view),
  tripSeconds,
  viewOnTrips: true,
  showsDrops: false,
  pageTurns: false,
};

/** An every-event tour: every event, riding along in the Ship view, each trip at Explore's pace. */
const EVERY_EVENT: StyleRules = {
  stops: (mission) => [...mission.events],
  view: () => 'spacecraft',
  tripSeconds: everyEventTripSeconds,
  viewOnTrips: false,
  showsDrops: true,
  pageTurns: true,
};

/** The rules of a flight's tour style (see TourStyle). */
export function tourRules(mission: Mission): StyleRules {
  return mission.tour === 'every-event' ? EVERY_EVENT : KEY_MOMENTS;
}

/** The events a flight's tour stops at, in order. */
export function tourStops(mission: Mission): MissionEvent[] {
  return tourRules(mission).stops(mission);
}

/**
 * The guided tour: steps through the mission's stops, as its style says
 * (see StyleRules): its key moments, each in its event's view (or the
 * nearest view the mission offers), or every event, in the Ship view
 * throughout. For each stop it plays the clock up to the event, pauses
 * there, and waits for Next. Next flies the whole stretch from one stop to
 * the next, for a key-moments tour moving the camera near the end; starting,
 * going back, and starting over play a short run-up to the stop instead,
 * with the camera moved at once. An every-event tour turns straight to the
 * next stop where nothing moves between the two. At a parting (see
 * TourOptions.partings) the clock holds on the event for a moment, then
 * plays on to rest just after it, with the two craft apart. The tour stops
 * once the camera has settled (see CAMERA_SETTLE_MAX_SECONDS).
 */
export class Tour {
  readonly stops: readonly MissionEvent[];

  private phaseNow: TourPhase = 'off';
  private indexNow = 0;
  /** Story seconds of each stop's event. */
  private readonly stopStories: readonly number[];
  /** Story seconds the clock is playing to: the stop's event, then, at a parting, its rest point. */
  private targetStory = 0;
  /** Mission seconds of the stop's event. */
  private stopSeconds = 0;
  /** Where the clock rests at the stop, in mission and story seconds: the event, or a parting's rest point. */
  private restSeconds = 0;
  private restStory = 0;
  /** Real time in milliseconds when the clock's hold on a parting's event ends; null when not holding. */
  private holdUntilMs: number | null = null;
  /**
   * Real time in milliseconds after which the tour stops waiting for the
   * camera to settle (see CAMERA_SETTLE_MAX_SECONDS): set during a hold, and
   * at the stop while the tour waits there; null otherwise.
   */
  private settleByMs: number | null = null;
  private stopWatching: (() => void) | null = null;
  private travelStartMs = 0;
  private travelDeadlineMs = 0;
  /** The stop's view, while a trip waits to move the camera to it (see VIEW_LEAD_SECONDS). */
  private viewLater: EventView | null = null;
  private viewAtMs = 0;
  /** Real time in milliseconds when the camera last moved to a different view on the way to this stop. */
  private viewMovedMs = Number.NEGATIVE_INFINITY;
  /** Stops listening to the scene (see watchScene). */
  private stopWatchingScene: (() => void) | null = null;
  /** True once the ship view has shown the scene's fast-forward view on this trip. */
  private sawFastForward = false;
  /** The stop whose story was on screen when listeners were last told (see shownStop). */
  private shownTold: MissionEvent | null = null;
  private readonly listeners = new Set<(tour: Tour) => void>();

  // Written out rather than as constructor parameter properties, so Node can
  // run this file directly in a test (it strips types but does not compile them).
  private readonly mission: Mission;
  private readonly player: Player;
  private readonly director: Director;
  private readonly options: TourOptions;
  private readonly rules: StyleRules;

  constructor(mission: Mission, player: Player, director: Director, options: TourOptions = {}) {
    this.mission = mission;
    this.player = player;
    this.director = director;
    this.options = options;
    this.rules = tourRules(mission);
    this.stops = this.rules.stops(mission);
    this.stopStories = this.stops.map((stop) =>
      player.story.toStory(elapsedToSeconds(stop.elapsed)),
    );
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

  /**
   * The stop whose story is on screen, so the card never names a moment the
   * clock has not reached. At a stop, that stop. On the way, the latest stop
   * (up to the one being headed for) whose event the clock has reached, or
   * the first stop before the clock reaches it: on a trip, the stop just left
   * until the clock reaches the next stop's event (at a parting, as the hold
   * on the event begins); on a run-up, whichever stop the clock is past. Null
   * when off or finished. Listeners are told when it changes.
   */
  get shownStop(): MissionEvent | null {
    if (this.phaseNow === 'off' || this.phaseNow === 'finished') return null;
    if (this.phaseNow === 'stopped') return this.stop;
    // Exactly: a trip is within a hair of the stop for its last few
    // milliseconds, and lands on it exactly by itself (see watchTravel).
    const now = this.player.storyTime;
    let shown = 0;
    for (let i = this.indexNow; i > 0; i -= 1) {
      if ((this.stopStories[i] ?? Infinity) <= now) {
        shown = i;
        break;
      }
    }
    return this.stops[shown] ?? null;
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
      if (this.now() - this.travelStartMs >= SKIP_GUARD_MS) this.arrive(true);
      return;
    }
    if (this.indexNow >= this.stops.length - 1) {
      this.finish();
    } else {
      // Fly from this stop, unless something has moved the clock away from it.
      const atStop = Math.abs(this.player.storyTime - this.restStory) < SAME_STORY_SECONDS;
      const to = this.indexNow + 1;
      this.goTo(to, atStop ? (this.turnsPage(to) ? 'page' : 'trip') : 'run-up');
    }
  }

  back(): void {
    if (this.phaseNow === 'off') return;
    if (this.phaseNow === 'finished') {
      this.goTo(this.stops.length - 1, 'run-up');
    } else if (this.indexNow > 0) {
      const to = this.indexNow - 1;
      this.goTo(to, this.turnsPage(to) ? 'page' : 'run-up');
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

  /**
   * Hear about every change of stop or phase, and of the stop on screen
   * (see shownStop). Returns a function that stops listening.
   */
  subscribe(listener: (tour: Tour) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * True when Next or Back to stop `index` turns the page (see
   * StyleRules.pageTurns): the craft the story follows rests on a surface all
   * the way from where the clock is to where the clock rests at that stop.
   */
  private turnsPage(index: number): boolean {
    const stop = this.stops[index];
    if (!stop || !this.rules.pageTurns) return false;
    const seconds = elapsedToSeconds(stop.elapsed);
    const rest = this.restFor(seconds, this.player.story.toStory(seconds));
    return stillBetween(this.options.stays ?? [], this.player.time, rest);
  }

  /**
   * Head for a stop. A "trip" plays the clock on from where it is, with no
   * cut, for as long as the stretch deserves; a "run-up" cuts to shortly
   * before the stop and plays the last few seconds (see RUN_UP_STORY_SECONDS);
   * a "page" jumps the clock straight there (see StyleRules.pageTurns).
   */
  private goTo(index: number, way: 'trip' | 'run-up' | 'page'): void {
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
    const view = this.rules.view(this.mission, stop);
    const jump = way === 'page' || this.options.jumpStraight?.() === true;
    const trip = way === 'trip' && !jump;
    const from = trip ? this.player.storyTime : this.runUpFrom();
    const seconds = trip
      ? this.rules.tripSeconds(this.targetStory - from)
      : playSeconds(this.targetStory - from);
    // How long it really takes: a hurried trip held back by the clock's craft takes longer.
    const plan = planTrip(this.player.story, from, this.targetStory, seconds);
    const takes = trip ? plan.seconds : seconds;
    const now = this.now();
    // A tour that keeps one view asks for it only on a run-up, or when the camera is in another.
    const asksView = this.rules.viewOnTrips || way === 'run-up' || this.director.view !== view;
    if (trip && this.rules.viewOnTrips && takes > VIEW_LEAD_SECONDS) {
      this.viewLater = view;
      const viewIn = tripViewSeconds({
        fromView: this.director.view,
        toView: view,
        missionToStop: this.stopSeconds - this.player.time,
        plan,
      });
      this.viewAtMs = now + viewIn * 1000;
      this.sawFastForward = false;
      this.stopWatchingScene = this.director.subscribe(this.watchScene);
    } else if (asksView) {
      this.moveCamera(view);
    } else if (trip) {
      // The camera stays in its view: say where the clock will stop, so the scene can bring it to rest by then.
      this.director.expectStop?.(this.stopSeconds, takes);
    }
    if (jump) {
      this.arrive();
      return;
    }

    if (!trip) {
      this.player.pause();
      this.player.seekStory(from);
    }
    this.phaseNow = 'traveling';
    this.travelStartMs = now;
    this.travelDeadlineMs = now + (takes + TRAVEL_GRACE_SECONDS) * 1000;
    // Already there: a stop at the very start, two stops at one time, or a
    // run-up with too little to play. A parting still holds on its event and
    // plays the two apart.
    if (Math.abs(this.targetStory - this.player.storyTime) < SAME_STORY_SECONDS) {
      if (this.restStory - this.targetStory > SAME_STORY_SECONDS) {
        this.notify();
        this.holdAtEvent();
      } else {
        this.arrive();
      }
      return;
    }

    this.notify();
    this.stopWatching = this.player.subscribe(this.watchTravel);
    this.player.playTo(this.targetStory, seconds);
  }

  /**
   * Where a run-up to the stop starts, in story seconds: RUN_UP_STORY_SECONDS
   * before it, or later to cover no more than RUN_UP_MAX_MISSION_SECONDS; the
   * stop itself when that leaves less than RUN_UP_MIN_STORY_SECONDS to play.
   */
  private runUpFrom(): number {
    const from = Math.max(
      0,
      this.targetStory - RUN_UP_STORY_SECONDS,
      this.player.story.toStory(this.stopSeconds - RUN_UP_MAX_MISSION_SECONDS),
    );
    return this.targetStory - from < RUN_UP_MIN_STORY_SECONDS ? this.targetStory : from;
  }

  /**
   * Arrive when the clock reaches the stop, or stops for any other reason
   * (a pause or a jump ends the trip early), or travel has taken far too long.
   * On the way, move the camera to the stop's view when it is time, and tell
   * listeners when the clock reaches the stop's event (see shownStop). At a
   * parting, reaching the event starts the hold there instead (see holdAtEvent).
   */
  private readonly watchTravel = (player: Player): void => {
    if (this.phaseNow !== 'traveling') return;
    if (this.holdUntilMs !== null) {
      // Anything else that moves the clock during the hold ends it at the rest point.
      if (player.playing || player.storyTime !== this.targetStory) this.arrive();
      return;
    }
    if (this.viewLater && this.now() >= this.viewAtMs && !this.director.fastForward)
      this.showStopView();
    // Exactly: a trip eases in so gently that it is within a hair of the stop
    // for its last few milliseconds, and it lands on the stop by itself.
    const reached = player.storyTime >= this.targetStory;
    if (reached && this.restStory - this.targetStory > SAME_STORY_SECONDS) this.holdAtEvent();
    else if (reached || !player.playing || this.now() > this.travelDeadlineMs) this.arrive();
    else this.tellShown();
  };

  /**
   * What the tour does when the scene changes, on its way to a stop.
   *
   * A trip can carry the ship around its body too fast to follow, and the
   * scene then shows its fast-forward view: the ship fades and its orbit shows
   * as a ring, in a steady view of the body (the ship view holds a steady wide
   * view of it). The camera never changes view while that shows: when its
   * time comes (see VIEW_LEAD_SECONDS), the move waits until the fast-forward
   * view ends or the trip arrives. Changing view in the middle of a
   * time-lapse swaps one wide view of the ring for another (or, for the
   * journey view, drops the Moon out of frame for a moment of empty sky);
   * one steady view through the whole time-lapse and one move at the end
   * reads better.
   *
   * In the ship view, when the fast-forward view ends while the trip still
   * waits to move the camera, and the stop is near (see
   * EARLY_VIEW_MISSION_SECONDS), the camera moves to the stop's view at once:
   * otherwise the ship view would swoop back in to chase the ship only to pull
   * out again for the stop's view moments later.
   *
   * At the stop, once the camera has settled, the tour stops (see
   * CAMERA_SETTLE_MAX_SECONDS).
   */
  private readonly watchScene = (director: Director): void => {
    if (this.phaseNow !== 'traveling') return;
    if (this.settling()) {
      if (!director.moving) this.stopHere();
      return;
    }
    if (!this.viewLater) return;
    if (this.now() >= this.viewAtMs) {
      if (!director.fastForward) this.showStopView();
    } else if (director.view !== 'spacecraft' || this.viewLater === 'spacecraft') {
      this.sawFastForward = false;
    } else if (director.fastForward) {
      this.sawFastForward = true;
    } else if (this.sawFastForward) {
      this.sawFastForward = false;
      const near = this.stopSeconds - this.player.time <= EARLY_VIEW_MISSION_SECONDS;
      if (near) this.showStopView();
    }
  };

  /**
   * Mission seconds where the clock rests at a stop whose event is at
   * `eventSeconds` (`eventStory` in story seconds): the event itself, or for
   * a parting a little after it (see PARTING_REST_STORY_SECONDS), and on an
   * every-event tour for a part let go too (see DROP_REST_STORY_SECONDS).
   */
  private restFor(eventSeconds: number, eventStory: number): number {
    const at = (time: number): boolean => Math.abs(time - eventSeconds) < 1e-6;
    const parting = this.options.partings?.find(({ start }) => at(start));
    if (parting) {
      const besideStory = this.player.story.toStory(parting.end) - eventStory;
      if (!(besideStory > 0)) return eventSeconds;
      const after = Math.min(PARTING_REST_STORY_SECONDS, PARTING_REST_MAX_SHARE * besideStory);
      return this.player.story.toElapsed(eventStory + after);
    }
    if (this.rules.showsDrops && this.options.drops?.some(at)) {
      const next =
        this.stopStories.find((story) => story > eventStory + SAME_STORY_SECONDS) ??
        this.player.story.duration;
      const after = Math.min(DROP_REST_STORY_SECONDS, PARTING_REST_MAX_SHARE * (next - eventStory));
      if (after > SAME_STORY_SECONDS) return this.player.story.toElapsed(eventStory + after);
    }
    return eventSeconds;
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
    const now = this.now();
    this.holdUntilMs = Math.max(
      now + PARTING_HOLD_SECONDS * 1000,
      // A scene that cannot say when its camera has settled: allow the move its usual time.
      this.director.moving === undefined
        ? this.viewMovedMs + PARTING_VIEW_SETTLE_SECONDS * 1000
        : now,
    );
    this.settleByMs = now + CAMERA_SETTLE_MAX_SECONDS * 1000;
    this.stopWatching = this.player.subscribe(this.watchTravel);
    requestAnimationFrame(this.watchHold);
    this.tellShown();
  }

  /** On each frame of a hold, play on to the rest point once it is over and the camera has settled. */
  private readonly watchHold = (): void => {
    if (this.holdUntilMs === null) return;
    if (this.now() < this.holdUntilMs || !this.cameraSettled()) {
      requestAnimationFrame(this.watchHold);
      return;
    }
    this.holdUntilMs = null;
    this.settleByMs = null;
    const seconds = playSeconds(this.restStory - this.targetStory);
    this.targetStory = this.restStory;
    this.travelDeadlineMs = this.now() + (seconds + TRAVEL_GRACE_SECONDS) * 1000;
    this.player.playTo(this.restStory, seconds);
  };

  /** True while the clock is at the stop and the tour waits for the camera to settle there. */
  private settling(): boolean {
    return this.settleByMs !== null && this.holdUntilMs === null;
  }

  /** True once the camera is not moving, or the tour has waited for it long enough (see CAMERA_SETTLE_MAX_SECONDS). */
  private cameraSettled(): boolean {
    return (
      this.director.moving !== true || this.settleByMs === null || this.now() >= this.settleByMs
    );
  }

  /** On each frame while the tour waits at the stop, stop once the camera has settled. */
  private readonly watchSettle = (): void => {
    if (!this.settling()) return;
    if (this.cameraSettled()) this.stopHere();
    else requestAnimationFrame(this.watchSettle);
  };

  private now(): number {
    return this.options.now ? this.options.now() : performance.now();
  }

  /**
   * Move the camera to a view, framing the spacecraft where it rests at the
   * stop, and note when it moves to a different one (see PARTING_VIEW_SETTLE_SECONDS).
   */
  private moveCamera(view: EventView): void {
    if (this.director.view !== view) this.viewMovedMs = this.now();
    this.director.setView(view, { at: this.restSeconds });
  }

  /** Move the camera to the stop's view, if a trip is still waiting to. */
  private showStopView(): void {
    const view = this.viewLater;
    this.viewLater = null;
    if (view) this.moveCamera(view);
  }

  /**
   * Put the clock on the stop's rest point. The tour stops there, once the
   * camera has settled: while the scene says it is moving, the tour is still
   * on its way (see CAMERA_SETTLE_MAX_SECONDS). A Skip (`atOnce`) stops there
   * without waiting, and so does arriving again while the tour waits.
   */
  private arrive(atOnce = false): void {
    const waited = this.settling();
    // A skip, or a trip cut short, arrives in the stop's own view all the same.
    this.showStopView();
    this.stopTravel();
    this.player.pause();
    this.player.seek(this.restSeconds);
    if (atOnce || waited || this.director.moving !== true) {
      this.stopHere();
      return;
    }
    if (this.phaseNow !== 'traveling') this.travelStartMs = this.now();
    this.phaseNow = 'traveling';
    this.settleByMs = this.now() + CAMERA_SETTLE_MAX_SECONDS * 1000;
    this.stopWatchingScene = this.director.subscribe(this.watchScene);
    requestAnimationFrame(this.watchSettle);
    this.notify();
  }

  /** Stopped at the stop, waiting for Next. */
  private stopHere(): void {
    this.stopTravel();
    this.phaseNow = 'stopped';
    this.notify();
  }

  private finish(): void {
    this.stopTravel();
    this.player.pause();
    this.phaseNow = 'finished';
    this.notify();
  }

  /**
   * Stop watching the clock and the scene. A view still waiting, a hold on a
   * parting's event, and a wait for the camera are dropped: the tour has
   * arrived, is leaving, or is heading elsewhere.
   */
  private stopTravel(): void {
    this.stopWatching?.();
    this.stopWatching = null;
    this.stopWatchingScene?.();
    this.stopWatchingScene = null;
    this.viewLater = null;
    this.holdUntilMs = null;
    this.settleByMs = null;
  }

  /** Tell listeners if the stop on screen has changed (see shownStop). */
  private tellShown(): void {
    if (this.shownStop !== this.shownTold) this.notify();
  }

  private notify(): void {
    this.shownTold = this.shownStop;
    for (const listener of this.listeners) listener(this);
  }
}
