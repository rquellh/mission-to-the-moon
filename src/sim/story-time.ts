/**
 * Story time: a watchable clock for the timeline. Mission time is mapped
 * onto story time so that each interval between consecutive key times (for
 * example, mission events) plays for a few seconds when short and at most
 * `maxSeconds` when days long. A stretch whose craft go round their bodies
 * calmly plays at one even pace; a faster one eases into and out of the key
 * times at its ends and hurries between (see EASE_GENTLE_PACE), and wherever
 * a craft swings round a body on no closed lap the clock keeps to the pace
 * that craft allows (see SWING_LAP_STORY_SECONDS). The map is strictly
 * increasing, so it runs both ways.
 */
import { EARTH_RADIUS, MOON_RADIUS } from '../content/physical-constants.ts';
import { elapsedToSeconds } from '../content/types.ts';
import type { FlightPath, Phase, Polyline, ShipTrack } from './types.ts';

export interface StoryTimeOptions {
  /** Story length of a vanishingly short interval, seconds. Default 2. */
  minSeconds?: number;
  /** Story length of an interval of `longInterval` or more, seconds. Default 14. */
  maxSeconds?: number;
  /** Mission interval that gets the full `maxSeconds`, seconds. Default 3 days. */
  longInterval?: number;
  /** Mission interval where the growth turns from linear to logarithmic, seconds. Default 60. */
  knee?: number;
  /**
   * Whether the clock keeps its craft calm: eases a fast stretch into and out
   * of its ends (see EASE_GENTLE_PACE), keeps a swing round a body to its
   * calm pace (see SWING_LAP_STORY_SECONDS) and a parting or a docking
   * approach to a calm even pace (see CALM_LAP_STORY_SECONDS). False plays
   * every interval evenly for storyIntervalLength. Default true.
   */
  ease?: boolean;
}

/** How one stretch between two key times plays (see createStoryTime). */
export type StretchPlay = 'even' | 'held' | 'eased';

/** One stretch of a story clock, between two consecutive key times. */
export interface Stretch {
  /** Its key times, mission seconds. */
  readonly from: number;
  readonly to: number;
  /** Its story length, seconds: storyIntervalLength, or more when its craft need it (see EASE_MAX_HURRY and CALM_LAP_STORY_SECONDS). */
  readonly length: number;
  /** How it plays: evenly; evenly but no faster than a calm pace (a parting or a docking approach); or eased. */
  readonly play: StretchPlay;
}

export interface StoryTime {
  /** Total story length, seconds. */
  readonly length: number;
  /** The key times actually used (sorted, duplicates removed). */
  readonly keyTimes: readonly number[];
  /** Each stretch between two consecutive key times, in order. */
  readonly stretches: readonly Stretch[];
  /** Story seconds for a mission time (clamped to the key-time range). */
  toStory(missionSeconds: number): number;
  /** Mission seconds for a story time (clamped to [0, length]). */
  toMission(storySeconds: number): number;
}

/** Story length of one mission interval, seconds. */
export function storyIntervalLength(interval: number, options: StoryTimeOptions = {}): number {
  const min = options.minSeconds ?? 2;
  const max = options.maxSeconds ?? 14;
  const long = options.longInterval ?? 3 * 86_400;
  const knee = options.knee ?? 60;
  if (interval <= 0) return 0;
  const grow = Math.log1p(interval / knee) / Math.log1p(long / knee);
  return Math.min(max, min + (max - min) * grow);
}

/*
 * How calm the clock keeps the craft. The scene draws a craft going round
 * its body at the pace the clock runs, and swaps it for its fast-forward
 * ring once it laps faster than once in 20 seconds of real time on a closed
 * lap (see src/scene/fast-forward.ts). The owner called a lap of the Moon in
 * 4.4 seconds "way too fast" and one in 8.8 "better", and later, with this
 * clock keeping a drawn craft to about one lap in 8 seconds, said the orbit
 * animations were still too fast. One lap in 20 seconds for any drawn craft,
 * and about 30 or slower either side of an event, is the working standard
 * now; it is a figure chosen here, not one the owner gave.
 *
 * The clock reads how fast each craft goes round its body (see turnsOf), so
 * each stretch between two key times plays one of three ways:
 *
 * - Evenly, when its craft are calm played evenly: none drawn on its own
 *   laps faster than once in CALM_LAP_STORY_SECONDS (24, where the scene
 *   draws a craft again after its ring), and its even pace is no faster than
 *   EASE_START_PACE. Easing such a stretch would only hurry its middle, and
 *   could flash the ring there: Apollo 11's two craft flying side by side
 *   after undocking (245 mission seconds a story second) lap the Moon once
 *   in about 29 seconds, and stay drawn. The same pace in low Earth orbit is
 *   a lap in about 22 seconds, not calm, so pace alone cannot tell the two.
 * - Held: a lander parting from its ship, and two craft closing in to dock
 *   (see partingsAtEvents, approachesAtEvents), play evenly as well, so the
 *   two stay drawn all through, but no faster than a pace at which they lap
 *   once in CALM_LAP_STORY_SECONDS: one that would be faster plays longer.
 * - Eased, otherwise: its first and last EASE_SHOULDER_STORY_SECONDS play at
 *   EASE_GENTLE_PACE (its shoulders), then the pace grows (its ramps, see
 *   EASE_RAMP_MISSION_SECONDS) to its middle's, which makes up the time. On
 *   a closed lap the ring takes over a moment into the ramp.
 *
 * Wherever a craft swings round a body on no closed lap (arriving at the
 * Moon or Earth, leaving one; see onNoClosedLap), no ring can stand in, so
 * an eased stretch also keeps to the pace at which that craft laps once in
 * SWING_LAP_STORY_SECONDS, wherever in the stretch the swing comes, event
 * or not (Apollo 12 leaves the Moon with no event at its burn). A craft
 * leaving a body turns about as the inverse square of the time since it
 * left, so that pace grows about with the square of the time, and the swing
 * takes SWING_LAP_STORY_SECONDS times the share of a lap it sweeps: about 6
 * to 8 story seconds, inside the stretch it falls in. A key of its own would
 * cost more: played evenly, that stretch could go no faster than the swing
 * at its fastest, and past the key the next stretch would still need to
 * grow its pace as slowly as the swing allows. When the shoulders and the
 * swings leave the middle too little time (it would have to hurry more than
 * EASE_MAX_HURRY times the even pace), the stretch plays longer instead.
 * Every other stretch keeps its storyIntervalLength.
 */

/**
 * The pace of an eased stretch's shoulders, in mission seconds per story
 * second. A low Earth orbit (about 5,300 s) then laps once in about 30 story
 * seconds and a low lunar orbit (about 7,100 s) once in about 40: slower
 * than the scene's two fast-forward thresholds (once in 20 and 24 seconds),
 * so the craft is drawn either side of each event and comes back from its
 * ring a little before the shoulder.
 */
export const EASE_GENTLE_PACE = 175;

/**
 * Story seconds at each end of an eased stretch played at EASE_GENTLE_PACE,
 * when the stretch has room: about eight minutes of mission time, so a
 * lunar orbit insertion (about six minutes) plays inside its shoulder. Past
 * the shoulder the ring takes over within half a second, so for the three
 * story seconds either side of the event a craft drawn on a closed lap goes
 * round no faster than once in 24 seconds.
 */
export const EASE_SHOULDER_STORY_SECONDS = 2.8;

/**
 * The shortest shoulders an eased stretch is given when longer ones would
 * hurry its middle past EASE_MAX_HURRY: such a stretch (of six to nine story
 * seconds) is not played longer for its shoulders. A craft there is drawn a
 * little faster for a few tenths of a second before its ring, never faster
 * than once in 20 seconds.
 */
export const EASE_SHOULDER_MIN_STORY_SECONDS = 2;

/**
 * Past a shoulder the pace grows with the square of the mission time since
 * it: as (1 + t / EASE_RAMP_MISSION_SECONDS)^2 times the gentle pace, t
 * mission seconds into the ramp, until it reaches the middle's pace. On a
 * closed lap the ramp may be steep, as the ring takes over: in low Earth
 * orbit about half a story second into the ramp, when the craft laps once in
 * 20 seconds, and after the scene's 0.3-second cross-fade, when the model is
 * gone, it laps once in about 14. A gentler ramp would leave less of a
 * stretch for its gentle shoulders; a steeper one would have the fading
 * model visibly speed up (at 300, once in about 12 seconds as it goes). A
 * swing round a body on no closed lap keeps to its own, gentler pace (see
 * SWING_LAP_STORY_SECONDS).
 */
export const EASE_RAMP_MISSION_SECONDS = 400;

/**
 * A stretch whose craft, played evenly, lap no faster than once in this many
 * story seconds plays evenly; and a parting or a docking approach plays no
 * faster than that. It is the scene's slower fast-forward threshold
 * (FAST_FORWARD_OFF_LAP_SECONDS), where a craft is drawn again after its ring.
 */
export const CALM_LAP_STORY_SECONDS = 24;

/**
 * On no closed lap (arriving at a body, leaving one, an entry from the
 * Moon), the clock keeps every craft to at most one lap in this many story
 * seconds. The scene's limit is one in 20 (FAST_FORWARD_ON_LAP_SECONDS); the
 * two seconds more leave room for how the clock samples the craft's turning
 * between the points of its path.
 */
export const SWING_LAP_STORY_SECONDS = 22;

/**
 * The middle of an eased stretch hurries at most this many times the
 * stretch's even pace; when its shoulders, ramps and swings leave it less
 * time than that needs, its shoulders are shortened (see
 * EASE_SHOULDER_MIN_STORY_SECONDS), and then the stretch plays longer.
 * Apollo 11 waiting in low Earth orbit to leave for the Moon (nine story
 * seconds) hurries four times with shoulders of a little over two seconds:
 * the gentle ends and their ramps take most of a stretch that short.
 */
export const EASE_MAX_HURRY = 4;

/**
 * A stretch whose even pace, in mission seconds per story second, is faster
 * than this is eased even when no craft goes round a body fast there (a
 * coast between Earth and the Moon, or the hours after splashdown): played
 * evenly it would cover half an hour of mission time in two story seconds
 * right up to its events, so an event in mid-coast would go by unseen and
 * the tour's run-up to it would be cut. A stretch whose craft lap a low orbit
 * is never calm this fast, so easing such a stretch never hurries a calm one
 * into its ring.
 */
export const EASE_START_PACE = 900;

/**
 * With no flight to read (plain key times), the clock takes every craft to
 * be in a low Earth orbit, the fastest closed lap any flight flies, of this
 * many mission seconds: a stretch then plays evenly up to about 220 mission
 * seconds per story second.
 */
export const PLAIN_ORBIT_SECONDS = 5300;

/** Mission seconds either side of a moment over which a craft's turning is measured, as the scene measures it (Stage.turnRate). */
const TURN_WINDOW_SECONDS = 30;

/** Pace steps along a ramp, as a factor: the clock's pace changes this much from one point of a ramp to the next. */
const RAMP_STEP = 1.02;

/* ------------------------------------------------------------------ */
/* How fast the craft turn.                                            */
/* ------------------------------------------------------------------ */

/**
 * How fast a flight's craft go round their bodies, as the scene counts it:
 * laps per mission second, measured over TURN_WINDOW_SECONDS either side of
 * a moment, around the nearer of Earth and the Moon. A craft docked to
 * another (drawn as part of it), standing on a surface, or not yet launched
 * does not count.
 */
export interface Turns {
  /** The fastest any craft drawn on its own turns at mission time t, laps per mission second. */
  rate(t: number): number;
  /** The same, counting only craft on no closed lap there (see turnsOf); 0 where there is none. */
  openRate(t: number): number;
  /** The spans of mission time in which some craft is on no closed lap, sorted and apart. */
  readonly open: readonly (readonly [number, number])[];
  /** The mission times between `from` and `to` at which the two rates change course, sorted: reading them there finds their highest. */
  samples(from: number, to: number): readonly number[];
}

/** Plain key times: every craft in a low Earth orbit throughout (see PLAIN_ORBIT_SECONDS). */
const PLAIN_TURNS: Turns = {
  rate: () => 1 / PLAIN_ORBIT_SECONDS,
  openRate: () => 0,
  open: [],
  samples: () => [],
};

/** Revolutions flown around the nearer body at each sample of a path, at true scale (as Stage.revolutionsOf counts them). */
function revolutionsOf(line: Polyline, moon: readonly number[]): Float64Array {
  const n = line.times.length;
  const p = line.truePositions;
  const revolutions = new Float64Array(n);
  const mx = moon[0] ?? 0;
  const my = moon[1] ?? 0;
  const mz = moon[2] ?? 0;
  let total = 0;
  for (let i = 1; i < n; i += 1) {
    const x = p[3 * i] ?? 0;
    const y = p[3 * i + 1] ?? 0;
    const z = p[3 * i + 2] ?? 0;
    const moonHeight = (Math.hypot(x - mx, y - my, z - mz) - MOON_RADIUS) / MOON_RADIUS;
    const earthHeight = (Math.hypot(x, y, z) - EARTH_RADIUS) / EARTH_RADIUS;
    const [cx, cy, cz] = moonHeight < earthHeight ? [mx, my, mz] : [0, 0, 0];
    const ax = (p[3 * i - 3] ?? 0) - cx;
    const ay = (p[3 * i - 2] ?? 0) - cy;
    const az = (p[3 * i - 1] ?? 0) - cz;
    const bx = x - cx;
    const by = y - cy;
    const bz = z - cz;
    const la = Math.hypot(ax, ay, az);
    const lb = Math.hypot(bx, by, bz);
    if (la > 1e-9 && lb > 1e-9) {
      const cos = (ax * bx + ay * by + az * bz) / (la * lb);
      total += Math.acos(Math.min(1, Math.max(-1, cos))) / (Math.PI * 2);
    }
    revolutions[i] = total;
  }
  return revolutions;
}

/** A value of a sampled, never-decreasing series at time t, linearly between samples and clamped at its ends. */
function valueAt(times: Float64Array, values: Float64Array, t: number): number {
  const n = times.length;
  if (n === 0) return 0;
  if (t <= (times[0] as number)) return values[0] as number;
  if (t >= (times[n - 1] as number)) return values[n - 1] as number;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] as number) <= t) lo = mid;
    else hi = mid;
  }
  const t0 = times[lo] as number;
  const t1 = times[hi] as number;
  const v0 = values[lo] as number;
  const v1 = values[hi] as number;
  return t1 > t0 ? v0 + ((v1 - v0) * (t - t0)) / (t1 - t0) : v0;
}

/** Whether t lies in one of a list of [start, end] spans. */
const within = (spans: readonly (readonly [number, number])[], t: number): boolean =>
  spans.some(([start, end]) => t >= start && t <= end);

/** Spans sorted and joined where they meet or overlap. */
function joined(spans: (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  for (const [start, end] of [...spans].sort((a, b) => a[0] - b[0])) {
    const last = out[out.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else out.push([start, end]);
  }
  return out;
}

/**
 * Whether phase `k` of a ship's phases is on no closed lap of its body: a
 * transfer between Earth and the Moon, either way, and the entry it leads
 * into. Leaving or arriving, the craft swings round the body on a path that
 * never closes, so the scene cannot show its ring and draws it however fast
 * it goes. Everything else a flight flies is a lap of its body, or a small
 * change from one (a burn, a rendezvous, a descent or climb a few percent of
 * the body's size): an entry from Earth orbit, or a lunar module climbing
 * into orbit, closes on the lap before or after it.
 */
export function onNoClosedLap(phases: readonly Phase[], k: number): boolean {
  const phase = phases[k];
  return (
    phase?.kind === 'transfer' || (phase?.kind === 'entry' && phases[k - 1]?.kind === 'transfer')
  );
}

/**
 * How fast a flight's craft go round their bodies (see Turns), read from
 * their paths as drawn: each ship's revolutions around the nearer body at
 * true scale, measured over a minute, as the scene measures them.
 */
export function turnsOf(path: Pick<FlightPath, 'ships' | 'polyline' | 'moonPosition'>): Turns {
  const moon = [0, 0, 0];
  path.moonPosition(1, moon);
  const spanOf = (phase: Phase): [number, number] => [
    elapsedToSeconds(phase.start.value),
    elapsedToSeconds(phase.end.value),
  ];
  const ships = path.ships.flatMap((ship) => {
    const line = path.polyline(ship.id);
    if (!line || line.times.length < 2) return [];
    const { phases } = ship;
    return [
      {
        times: line.times,
        revolutions: revolutionsOf(line, moon),
        start: ship.start,
        end: ship.end,
        quiet: phases
          .filter((phase) => phase.kind === 'docked' || phase.kind === 'surface')
          .map(spanOf),
        open: joined(phases.filter((_phase, k) => onNoClosedLap(phases, k)).map(spanOf)),
        bounds: phases.flatMap(spanOf),
      },
    ];
  });
  type Ship = (typeof ships)[number];
  const rateOf = (ship: Ship, t: number): number => {
    if (t < ship.start || t > ship.end || within(ship.quiet, t)) return 0;
    const before = valueAt(ship.times, ship.revolutions, t - TURN_WINDOW_SECONDS);
    const after = valueAt(ship.times, ship.revolutions, t + TURN_WINDOW_SECONDS);
    return Math.max(0, (after - before) / (2 * TURN_WINDOW_SECONDS));
  };
  // Where the rates change course: each path sample either side of the window, and each phase change.
  const all = new Float64Array(
    [
      ...ships.flatMap((ship) =>
        Array.from(ship.times).flatMap((t) => [
          t - TURN_WINDOW_SECONDS,
          t,
          t + TURN_WINDOW_SECONDS,
        ]),
      ),
      ...ships.flatMap((ship) => ship.bounds),
    ].sort((a, b) => a - b),
  );
  const firstAtOrAfter = (t: number): number => {
    let lo = 0;
    let hi = all.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((all[mid] as number) < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return {
    rate: (t) => Math.max(0, ...ships.map((ship) => rateOf(ship, t))),
    openRate: (t) =>
      Math.max(0, ...ships.map((ship) => (within(ship.open, t) ? rateOf(ship, t) : 0))),
    open: joined(ships.flatMap((ship) => ship.open)),
    samples(from, to) {
      const out: number[] = [];
      for (let i = firstAtOrAfter(from); i < all.length && (all[i] as number) <= to; i += 1) {
        const t = all[i] as number;
        if (out[out.length - 1] !== t) out.push(t);
      }
      return out;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Partings, approaches, and the clock's keys.                         */
/* ------------------------------------------------------------------ */

/**
 * Whether phase `k` of a ship's phases is station keeping that begins as the
 * two craft part from docked: right after a docked phase with the same ship,
 * or as the ship's first phase (a lander that rode on the other until then).
 */
export function partsFromDocked(phases: readonly Phase[], k: number): boolean {
  const phase = phases[k];
  if (phase?.kind !== 'station') return false;
  const before = phases[k - 1];
  return before === undefined || (before.kind === 'docked' && before.target === phase.target);
}

/**
 * A lander parting from the ship it was docked to, at one of the flight's
 * events, and then keeping station beside it. Both times are mission seconds.
 */
export interface Parting {
  /** The event's time, when the two part. */
  readonly start: number;
  /** When the station keeping ends and the two go their own ways. */
  readonly end: number;
}

/**
 * Every place where an event marks a lander's undocking and the lander then
 * keeps station beside the ship it left (see partsFromDocked). The story
 * clock gives each its own stretch, held to a calm pace (see storyKeyTimes),
 * and the tour lets the two be seen parting at a stop there.
 */
export function partingsAtEvents(
  path: { readonly ships: readonly ShipTrack[] },
  eventTimes: readonly number[],
): Parting[] {
  const isEvent = (time: number): boolean =>
    eventTimes.some((event) => Math.abs(event - time) < 1e-6);
  const partings: Parting[] = [];
  for (const ship of path.ships) {
    if (ship.role !== 'lander') continue;
    ship.phases.forEach((phase, k) => {
      const start = elapsedToSeconds(phase.start.value);
      if (partsFromDocked(ship.phases, k) && isEvent(start))
        partings.push({ start, end: elapsedToSeconds(phase.end.value) });
    });
  }
  return partings;
}

/**
 * Whether phase `k` of a ship's phases brings it in to dock: closing in
 * (`rendezvous`) or keeping station (`station`) beside a ship, right before
 * a docked phase with that same ship.
 */
export function closesToDocked(phases: readonly Phase[], k: number): boolean {
  const phase = phases[k];
  if (phase?.kind !== 'rendezvous' && phase?.kind !== 'station') return false;
  const after = phases[k + 1];
  return after?.kind === 'docked' && after.target === phase.target;
}

/**
 * The final approach to a docking at one of the flight's events, in mission
 * seconds: the two craft closing in, or flying side by side, until they dock.
 */
export interface Approach {
  /** When the final approach begins (see approachesAtEvents). */
  readonly start: number;
  /** The event's time, when the two dock. */
  readonly end: number;
}

/**
 * Every place where an event marks a docking and the ship's phases say how
 * the two craft came together before it (see closesToDocked). The final
 * approach begins when the craft came alongside: at the start of its station
 * keeping, or at a rendezvous's published `alongside` time, or else at the
 * start of the rendezvous (Apollo 11's begins as Eagle's braking burn,
 * terminal phase finalize, ends). It begins no earlier than the event before
 * the docking: when an event already marks that moment or a later one
 * (Gemini 8's station keeping), the approach already plays as a stretch of
 * its own. The story clock gives each its own stretch, held to a calm pace
 * (see storyKeyTimes), so the two are seen closing in.
 */
export function approachesAtEvents(
  path: { readonly ships: readonly ShipTrack[] },
  eventTimes: readonly number[],
): Approach[] {
  const isEvent = (time: number): boolean =>
    eventTimes.some((event) => Math.abs(event - time) < 1e-6);
  const approaches: Approach[] = [];
  for (const ship of path.ships) {
    ship.phases.forEach((phase, k) => {
      const end = elapsedToSeconds(phase.end.value);
      if (!closesToDocked(ship.phases, k) || !isEvent(end)) return;
      const alongside = phase.kind === 'rendezvous' ? phase.alongside : undefined;
      const begins = elapsedToSeconds((alongside ?? phase.start).value);
      const eventBefore = Math.max(...eventTimes.filter((event) => event < end - 1e-6));
      approaches.push({ start: Math.max(begins, eventBefore), end });
    });
  }
  return approaches;
}

/** What a flight's story clock is built from (see storyKeyTimes). */
export interface StoryKeys {
  /** The mission times between which the clock's stretches play (in any order). */
  readonly times: readonly number[];
  /** How fast the flight's craft go round their bodies; plain times take a low Earth orbit (see PLAIN_ORBIT_SECONDS). */
  readonly turns?: Turns;
  /** Spans of mission time whose stretches are held: evenly, at no more than a calm pace (see CALM_LAP_STORY_SECONDS). */
  readonly held?: readonly (readonly [number, number])[];
}

/**
 * What a flight's story clock is built from: the path's two ends and every
 * event, so each stretch between two events plays for a watchable length.
 * One more key for each parting (see partingsAtEvents): the end of its
 * station keeping, so the two flying side by side play as their own stretch
 * rather than the first moments of a long one. (Other station keeping adds
 * no key: as keys, it would lengthen some flights by 10 to 34 seconds.) And
 * one for each docking at an event (see approachesAtEvents): the start of
 * its final approach, so the two closing in play as their own stretch rather
 * than the last moments of a long one. Both stretches are held to a calm
 * pace, so the two craft stay drawn. With them come the craft's turning
 * (see turnsOf), which tells the clock how fast it may go where.
 */
export function storyKeyTimes(
  path: Pick<FlightPath, 'start' | 'end' | 'ships' | 'polyline' | 'moonPosition'>,
  eventTimes: readonly number[],
): StoryKeys {
  const partings = partingsAtEvents(path, eventTimes);
  const approaches = approachesAtEvents(path, eventTimes);
  return {
    times: [
      path.start,
      path.end,
      ...eventTimes,
      ...partings.map((parting) => parting.end),
      ...approaches.map((approach) => approach.start),
    ],
    turns: turnsOf(path),
    held: [...partings, ...approaches].map(({ start, end }) => [start, end] as const),
  };
}

/* ------------------------------------------------------------------ */
/* The clock.                                                          */
/* ------------------------------------------------------------------ */

/**
 * Story seconds into a stretch of mission time `span` long, after `x`
 * mission seconds of it, when its pace goes from `p0` to `p1` mission seconds
 * per story second such that the story seconds per mission second change
 * evenly with mission time. A turn rate measured as the scene measures it
 * changes evenly between the points of a craft's path, so a pace that keeps
 * the craft to a set number of laps a second does this exactly.
 */
function storyInto(span: number, p0: number, p1: number, x: number): number {
  const w0 = 1 / p0;
  const k = (1 / p1 - w0) / span;
  return x * (w0 + (k * x) / 2);
}

/** Mission seconds into such a stretch after `y` story seconds of it (the inverse of storyInto). */
function missionInto(span: number, p0: number, p1: number, y: number): number {
  const w0 = 1 / p0;
  const k = (1 / p1 - w0) / span;
  // The root of (k / 2) x^2 + w0 x = y, in a form that keeps its precision when k is small.
  return (2 * y) / (w0 + Math.sqrt(Math.max(0, w0 * w0 + 2 * k * y)));
}

/**
 * One stretch's map: mission times at which its pace is set (`times`, from
 * its start to its end), the pace there (`paces`), and the story seconds
 * reached at each (`stories`, from 0). Between two of them the pace changes
 * as storyInto says.
 */
interface Plan {
  readonly times: Float64Array;
  readonly paces: Float64Array;
  readonly stories: Float64Array;
  readonly length: number;
  readonly play: StretchPlay;
}

/** The plan of a stretch played at one pace. */
function evenPlan(from: number, to: number, length: number, play: StretchPlay): Plan {
  const pace = (to - from) / length;
  return {
    times: Float64Array.of(from, to),
    paces: Float64Array.of(pace, pace),
    stories: Float64Array.of(0, length),
    length,
    play,
  };
}

/** Fastest drawn turning over a span, laps per mission second (see Turns.samples). */
function fastestTurn(turns: Turns, from: number, to: number): number {
  let top = Math.max(turns.rate(from), turns.rate(to), turns.rate((from + to) / 2));
  for (const t of turns.samples(from, to)) top = Math.max(top, turns.rate(t));
  return top;
}

/** The pace of an eased stretch's end, `d` mission seconds from it, past a shoulder of `shoulder` mission seconds (see EASE_RAMP_MISSION_SECONDS). */
function endPace(d: number, shoulder: number): number {
  return d <= shoulder
    ? EASE_GENTLE_PACE
    : EASE_GENTLE_PACE * (1 + (d - shoulder) / EASE_RAMP_MISSION_SECONDS) ** 2;
}

/** Mission seconds from the start of a ramp that grows from `pace` by EASE_RAMP_MISSION_SECONDS to each of a run of paces, up to `top`. */
function rampSteps(pace: number, top: number): number[] {
  const out: number[] = [];
  for (let r = 1; pace * r * r <= top * RAMP_STEP ** 2; r *= Math.sqrt(RAMP_STEP))
    out.push(EASE_RAMP_MISSION_SECONDS * (r - 1));
  return out;
}

/** What the swings on no closed lap allow over a stretch (see swingsOver). */
interface SwingLimit {
  /** The mission times at which the limit changes course. */
  readonly points: readonly number[];
  /** The most the pace may be at mission time t, mission seconds per story second. */
  limit(t: number): number;
}

/**
 * What the swings on no closed lap allow over a stretch from `from` to `to`
 * whose pace goes no higher than `top` (the limit at a mission time is
 * remembered, as the stretch is laid out more than once).
 */
function swingsOver(from: number, to: number, top: number, turns: Turns): SwingLimit {
  // From the craft's own turning on no closed lap, and on the closed lap either side of a swing
  // that starts or ends inside the stretch, a ramp down to it (the ring stands in there).
  const swingAt = (t: number): number => {
    const rate = turns.openRate(t);
    return rate > 0 ? 1 / (SWING_LAP_STORY_SECONDS * rate) : Infinity;
  };
  const edges = turns.open.flatMap(([start, end]) => [
    { at: start, side: -1 },
    { at: end, side: 1 },
  ]);
  const inside = edges
    .filter(({ at }) => at >= from && at <= to)
    .map((edge) => ({ ...edge, pace: swingAt(edge.at) }))
    .filter(({ pace }) => Number.isFinite(pace));
  const known = new Map<number, number>();
  const limit = (t: number): number => {
    let pace = known.get(t);
    if (pace !== undefined) return pace;
    pace = swingAt(t);
    for (const edge of inside) {
      const d = (t - edge.at) * edge.side;
      if (d > 0) pace = Math.min(pace, edge.pace * (1 + d / EASE_RAMP_MISSION_SECONDS) ** 2);
    }
    known.set(t, pace);
    return pace;
  };
  const points: number[] = [];
  for (const edge of inside)
    for (const u of rampSteps(edge.pace, top)) points.push(edge.at + edge.side * u);
  // Between two samples a turn rate changes evenly, but the middle's pace may meet the swing's
  // between them: points close enough that the swing's pace changes by RAMP_STEP at most.
  const samples = turns.samples(from, to);
  for (let k = 0; k < samples.length; k += 1) {
    const t = samples[k] as number;
    const rate = turns.openRate(t);
    if (!(rate > 0)) continue;
    points.push(t);
    const next = samples[k + 1];
    const nextRate = next === undefined ? 0 : turns.openRate(next);
    if (next === undefined || !(nextRate > 0)) continue;
    const steps = Math.ceil(Math.abs(Math.log(nextRate / rate)) / Math.log(RAMP_STEP));
    for (let m = 1; m < steps; m += 1) points.push(t + ((next - t) * m) / steps);
  }
  return { points, limit };
}

/** An eased stretch laid out (see easedLayout). */
interface Layout {
  /** The mission times at which its pace is set, from its start to its end. */
  readonly times: Float64Array;
  /** Its pace at each, and the story seconds reached at each, as `lay` last set them. */
  readonly paces: Float64Array;
  readonly stories: Float64Array;
  /** Sets the pace at each time to its limit or `middle`, whichever is less, and returns the stretch's story length then. */
  lay(middle: number): number;
}

/**
 * An eased stretch from `from` to `to` with shoulders of `shoulderSeconds`
 * story seconds, laid out: the most its pace may be at each of its times is
 * the least of its two ends' and what the swings allow.
 */
function easedLayout(
  from: number,
  to: number,
  top: number,
  swings: SwingLimit,
  shoulderSeconds: number,
): Layout {
  const shoulder = EASE_GENTLE_PACE * shoulderSeconds;
  const limit = (t: number): number =>
    Math.min(endPace(t - from, shoulder), endPace(to - t, shoulder), swings.limit(t));
  // The mission times at which the pace is set: the ends, the shoulders and along each ramp, and
  // wherever the swings' limit changes course.
  const points = [from, to, from + shoulder, to - shoulder, ...swings.points];
  for (const u of rampSteps(EASE_GENTLE_PACE, top))
    points.push(from + shoulder + u, to - shoulder - u);
  const times = Float64Array.from(
    [...new Set(points.filter((t) => t >= from && t <= to))].sort((a, b) => a - b),
  );
  const limits = times.map(limit);
  const paces = new Float64Array(times.length);
  const stories = new Float64Array(times.length);
  const lay = (middle: number): number => {
    for (let j = 0; j < times.length; j += 1) paces[j] = Math.min(middle, limits[j] as number);
    for (let j = 1; j < times.length; j += 1) {
      const dt = (times[j] as number) - (times[j - 1] as number);
      stories[j] =
        (stories[j - 1] as number) + storyInto(dt, paces[j - 1] as number, paces[j] as number, dt);
    }
    return stories[times.length - 1] as number;
  };
  return { times, paces, stories, lay };
}

/**
 * The plan of an eased stretch from `from` to `to`, `length` story seconds
 * long when it fits (see EASE_GENTLE_PACE and SWING_LAP_STORY_SECONDS): the
 * pace is the least of its middle's, its two ends', and what each swing on
 * no closed lap allows, and the middle's is whatever makes the length, up to
 * EASE_MAX_HURRY times the even pace. Its shoulders are as long as fits, from
 * EASE_SHOULDER_STORY_SECONDS down to EASE_SHOULDER_MIN_STORY_SECONDS; a
 * stretch that does not fit even then plays longer.
 */
function easedPlan(from: number, to: number, length: number, turns: Turns): Plan {
  const even = (to - from) / length;
  const top = EASE_MAX_HURRY * even;
  const swings = swingsOver(from, to, top, turns);
  const fits = (shoulder: number) =>
    easedLayout(from, to, top, swings, shoulder).lay(top) <= length;
  let shoulder = EASE_SHOULDER_STORY_SECONDS;
  if (!fits(shoulder)) {
    // The longest that fits, to within a hundredth of a story second.
    let lo = EASE_SHOULDER_MIN_STORY_SECONDS;
    let hi = shoulder;
    if (fits(lo))
      while (hi - lo > 0.01) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
    shoulder = lo;
  }
  const { times, paces, stories, lay } = easedLayout(from, to, top, swings, shoulder);
  let played = length;
  if (lay(top) > length) played = lay(top);
  else {
    // The middle's pace that makes the length: the stretch takes less time the faster its middle.
    let lo = even;
    let hi = top;
    for (let k = 0; k < 100 && hi - lo > 1e-12 * hi; k += 1) {
      const mid = (lo + hi) / 2;
      if (lay(mid) > length) lo = mid;
      else hi = mid;
    }
    // Scaled to the length exactly, so the stretch's keys keep their story seconds.
    const scale = length / lay(hi);
    for (let j = 0; j < stories.length; j += 1) stories[j] = (stories[j] as number) * scale;
    for (let j = 0; j < paces.length; j += 1) paces[j] = (paces[j] as number) / scale;
  }
  stories[stories.length - 1] = played;
  return { times, paces, stories, length: played, play: 'eased' };
}

/** Index j with values[j] <= x < values[j + 1], clamped to [0, values.length - 2]. */
function locate(values: ArrayLike<number>, x: number): number {
  let lo = 0;
  let hi = values.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((values[mid] as number) <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Builds a story clock from any list of mission times (sorted or not), or
 * from a flight's keys (see storyKeyTimes). Each interval between two of
 * them plays for storyIntervalLength, evenly, held, or eased (see
 * EASE_GENTLE_PACE), and longer where its craft need it.
 */
export function createStoryTime(
  keysOrTimes: readonly number[] | StoryKeys,
  options: StoryTimeOptions = {},
): StoryTime {
  const given: StoryKeys = Array.isArray(keysOrTimes)
    ? { times: keysOrTimes as readonly number[] }
    : (keysOrTimes as StoryKeys);
  const keys = [...new Set(given.times.filter((t) => Number.isFinite(t)))].sort((a, b) => a - b);
  const turns = given.turns ?? PLAIN_TURNS;
  const held = given.held ?? [];
  const calm = options.ease !== false;
  const plans: Plan[] = [];
  for (let i = 1; i < keys.length; i++) {
    const from = keys[i - 1]!;
    const to = keys[i]!;
    const length = storyIntervalLength(to - from, options);
    const even = (to - from) / length;
    if (!calm || !(length > 0)) {
      plans.push(evenPlan(from, to, length, 'even'));
      continue;
    }
    const calmPace = 1 / (CALM_LAP_STORY_SECONDS * fastestTurn(turns, from, to));
    if (held.some(([start, end]) => from >= start - 1e-6 && to <= end + 1e-6))
      plans.push(evenPlan(from, to, Math.max(length, (to - from) / calmPace), 'held'));
    else if (even <= calmPace && even <= EASE_START_PACE)
      plans.push(evenPlan(from, to, length, 'even'));
    else plans.push(easedPlan(from, to, length, turns));
  }
  const story: number[] = [0];
  for (const plan of plans) story.push(story[story.length - 1]! + plan.length);
  const length = story[story.length - 1] ?? 0;

  return {
    length,
    keyTimes: keys,
    stretches: plans.map((plan, i) => ({
      from: keys[i]!,
      to: keys[i + 1]!,
      length: plan.length,
      play: plan.play,
    })),
    toStory(missionSeconds) {
      if (keys.length < 2) return 0;
      const t = Math.min(keys[keys.length - 1]!, Math.max(keys[0]!, missionSeconds));
      const i = locate(keys, t);
      const plan = plans[i]!;
      if (t >= keys[i + 1]!) return story[i + 1]!;
      const j = locate(plan.times, t);
      const t0 = plan.times[j] as number;
      const span = (plan.times[j + 1] as number) - t0;
      const p0 = plan.paces[j] as number;
      const p1 = plan.paces[j + 1] as number;
      return story[i]! + (plan.stories[j] as number) + storyInto(span, p0, p1, t - t0);
    },
    toMission(storySeconds) {
      if (keys.length === 0) return 0;
      if (keys.length === 1) return keys[0]!;
      const s = Math.min(length, Math.max(0, storySeconds));
      const i = locate(story, s);
      const plan = plans[i]!;
      if (s >= story[i + 1]!) return keys[i + 1]!;
      const y = s - story[i]!;
      const j = locate(plan.stories, y);
      const t0 = plan.times[j] as number;
      const span = (plan.times[j + 1] as number) - t0;
      const p0 = plan.paces[j] as number;
      const p1 = plan.paces[j + 1] as number;
      const x = missionInto(span, p0, p1, y - (plan.stories[j] as number));
      return Math.min(plan.times[j + 1] as number, t0 + x);
    },
  };
}
