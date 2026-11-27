/**
 * Story time: a watchable clock for the timeline. Mission time is mapped
 * onto story time so that each interval between consecutive key times (for
 * example, mission events) plays for a few seconds when short and at most
 * `maxSeconds` when days long. A short or quiet interval plays at one even
 * pace; a long one eases into and out of the key times at its ends and
 * hurries between (see EASE_GENTLE_PACE). The map is strictly increasing,
 * so it runs both ways.
 */
import { elapsedToSeconds } from '../content/types.ts';
import type { Phase, ShipTrack } from './types.ts';

export interface StoryTimeOptions {
  /** Story length of a vanishingly short interval, seconds. Default 2. */
  minSeconds?: number;
  /** Story length of an interval of `longInterval` or more, seconds. Default 14. */
  maxSeconds?: number;
  /** Mission interval that gets the full `maxSeconds`, seconds. Default 3 days. */
  longInterval?: number;
  /** Mission interval where the growth turns from linear to logarithmic, seconds. Default 60. */
  knee?: number;
  /** Whether a long interval eases into and out of its ends (see EASE_GENTLE_PACE), or every interval plays evenly. Default true. */
  ease?: boolean;
}

export interface StoryTime {
  /** Total story length, seconds. */
  readonly length: number;
  /** The key times actually used (sorted, duplicates removed). */
  readonly keyTimes: readonly number[];
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
 * Easing a long stretch. Played evenly, a stretch of hours or days covers
 * hours every story second right up to the event at its end, and from the
 * first instant after the event at its start: Apollo 11 arriving in lunar
 * orbit was drawn swinging round the Moon twice a second, and the same
 * leaving for home. So a long stretch plays its first and last
 * EASE_SHOULDER_STORY_SECONDS at EASE_GENTLE_PACE (its shoulders), and makes
 * up the time in its middle. Between each shoulder and the middle the pace
 * changes gradually (its ramps, see EASE_RAMP_MISSION_SECONDS), never at a
 * stroke. The stretch keeps its story length, so every key time keeps its
 * story second.
 *
 * A stretch is eased when its even pace is faster than EASE_START_PACE, and
 * fully from EASE_FULL_PACE; between the two, its shoulders and ramps grow
 * from nothing to their full length (by the logarithm of the pace), still at
 * the gentle pace, so a stretch just over the start has shoulders a moment
 * long. Gentler shoulders instead would sit a craft in Earth orbit between
 * the scene's two lap thresholds, drawn and lapping faster than the limit
 * for seconds (Gemini 4 before it sleeps). A stretch too short for two
 * shoulders and two of the longest ramps also plays evenly, and one with
 * less than EASE_MIDDLE_STORY_SECONDS of middle left between them has its
 * ends shortened the same way. With the clock's own story lengths every
 * stretch faster than EASE_START_PACE plays for over 9 story seconds, so in
 * practice only the pace decides.
 */

/**
 * The pace of a long stretch's shoulders, in mission seconds per story
 * second. A low lunar orbit (about 7,100 s) then laps once in about 14 story
 * seconds and a low Earth orbit (about 5,300 s) once in about 11, inside the
 * owner's limit of one lap in 8 seconds for a drawn craft (a lap of the Moon
 * in 4.4 seconds was "way too fast", one in 8.8 "better"). It is slow enough
 * for the burns that start and end a stay at the Moon, where a craft goes
 * round fastest: Apollo 8's burn for home then laps about once in 8 seconds,
 * where at 600 the scene swaps the craft for its ring as the burn ends.
 */
export const EASE_GENTLE_PACE = 500;

/**
 * A stretch whose even pace, in mission seconds per story second, is no
 * faster than this plays evenly. At this pace a low lunar orbit already laps
 * no faster than once in 8 seconds, and easing such a stretch would only
 * hurry its middle into the scene's ring or past the limit (Apollo 11's
 * stretch before its powered descent, at 773, would flash its ring for a
 * moment in the middle). A low Earth orbit laps faster: a stretch in Earth
 * orbit between about 660 and 900 still laps a little faster than the limit,
 * or shows its ring, from the start.
 */
export const EASE_START_PACE = 900;

/** From this even pace, in mission seconds per story second, a stretch is eased fully: about where a low lunar orbit played evenly turns into the scene's ring (one lap in 7 seconds). */
export const EASE_FULL_PACE = 1000;

/** Story seconds at each end of a long stretch played at EASE_GENTLE_PACE: 12.5 minutes of mission time, so a lunar orbit insertion (about 6 minutes) plays in under a story second at the start or the end of a stretch. */
export const EASE_SHOULDER_STORY_SECONDS = 1.5;

/**
 * Past a shoulder the pace grows with the square of the mission time since
 * it: as (1 + t / EASE_RAMP_MISSION_SECONDS)^2 times the gentle pace, t
 * mission seconds into the ramp, until it reaches the middle's pace. Leaving
 * a body, a craft's turn round it slows about as the square of the time
 * since it left, so the craft is seen to lap at about the same rate all
 * through the ramp, and the same in reverse arriving. Apollo 16 leaving
 * Earth for the Moon then laps no faster than once in 7.4 seconds, where a
 * pace growing by a steady factor over a fixed ramp had it once in 5.8; this
 * value is about the least that keeps that departure, the hardest, near the
 * limit. The ramp lasts at most EASE_RAMP_MISSION_SECONDS / EASE_GENTLE_PACE
 * story seconds (2.6), less when the middle is not much faster.
 */
export const EASE_RAMP_MISSION_SECONDS = 1300;

/** The least middle, in story seconds, left between a stretch's two longest ramps when it is eased fully: a shorter stretch has shorter ends. */
export const EASE_MIDDLE_STORY_SECONDS = 1;

/**
 * How a long stretch maps its story seconds onto its mission seconds: its
 * first half, counted from its start (the second half mirrors it, counted
 * back from its end). See EASE_GENTLE_PACE.
 */
interface Ease {
  /** Mission seconds per story second in each shoulder. */
  readonly gentle: number;
  /** Story seconds of each shoulder. */
  readonly shoulder: number;
  /** The mission seconds by which the ramp's pace grows (see EASE_RAMP_MISSION_SECONDS). */
  readonly growth: number;
  /** Story seconds of each ramp. */
  readonly ramp: number;
  /** Mission seconds from the stretch's end to the far end of its ramp. */
  readonly ramped: number;
  /** Mission seconds per story second in the middle. */
  readonly middle: number;
}

/** Mission seconds covered `y` story seconds into a ramp from `gentle` that grows by `growth` (see EASE_RAMP_MISSION_SECONDS). */
function rampMission(gentle: number, growth: number, y: number): number {
  return (gentle * y) / (1 - (gentle * y) / growth);
}

/** Story seconds into such a ramp when it has covered `u` mission seconds (the inverse of rampMission). */
function rampStory(gentle: number, growth: number, u: number): number {
  return u / (gentle * (1 + u / growth));
}

/**
 * How a stretch of `interval` mission seconds played over `length` story
 * seconds eases into and out of its ends, or null when it plays evenly (see
 * EASE_GENTLE_PACE).
 */
function easeOf(interval: number, length: number): Ease | null {
  const gentle = EASE_GENTLE_PACE;
  const even = interval / length;
  const longestEnds = 2 * (EASE_SHOULDER_STORY_SECONDS + EASE_RAMP_MISSION_SECONDS / gentle);
  // The share of their full length the shoulders and ramps get, by the pace and by the room.
  const byPace = Math.log(even / EASE_START_PACE) / Math.log(EASE_FULL_PACE / EASE_START_PACE);
  const byRoom = (length - longestEnds) / EASE_MIDDLE_STORY_SECONDS;
  const share = Math.min(1, byPace, byRoom);
  if (!(share > 0) || !(even > gentle)) return null;
  const shoulder = EASE_SHOULDER_STORY_SECONDS * share;
  const growth = EASE_RAMP_MISSION_SECONDS * share;
  // With the middle's pace gentle * r^2, each ramp covers growth * (r - 1) mission seconds
  // in (growth / gentle) * (1 - 1 / r) story seconds, so the whole stretch covers
  // a r^2 + b r + c + interval mission seconds; r is the root that makes that the interval.
  const a = gentle * (length - 2 * shoulder) - 2 * growth;
  const b = 4 * growth;
  const c = 2 * gentle * shoulder - 2 * growth - interval;
  const r = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  const ramp = (growth / gentle) * (1 - 1 / r);
  const ramped = gentle * shoulder + rampMission(gentle, growth, ramp);
  return {
    gentle,
    shoulder,
    growth,
    ramp,
    ramped,
    middle: (interval - 2 * ramped) / (length - 2 * (shoulder + ramp)),
  };
}

/** Mission seconds from a stretch's end after `x` story seconds, for x up to half its story length. */
function easedMission(ease: Ease, x: number): number {
  if (x <= ease.shoulder) return ease.gentle * x;
  if (x <= ease.shoulder + ease.ramp)
    return ease.gentle * ease.shoulder + rampMission(ease.gentle, ease.growth, x - ease.shoulder);
  return ease.ramped + ease.middle * (x - ease.shoulder - ease.ramp);
}

/** Story seconds from a stretch's end after `m` mission seconds, for m up to half its mission length (the inverse of easedMission). */
function easedStory(ease: Ease, m: number): number {
  const shouldered = ease.gentle * ease.shoulder;
  if (m <= shouldered) return m / ease.gentle;
  if (m <= ease.ramped) return ease.shoulder + rampStory(ease.gentle, ease.growth, m - shouldered);
  return ease.shoulder + ease.ramp + (m - ease.ramped) / ease.middle;
}

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
 * clock gives each its own stretch (see storyKeyTimes), and the tour lets
 * the two be seen parting at a stop there.
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
 * its own. The story clock gives each its own stretch (see storyKeyTimes),
 * so the two are seen closing in.
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

/**
 * The mission times a flight's story clock is built from: the path's two
 * ends and every event, so each stretch between two events plays for a
 * watchable length. One more for each parting (see partingsAtEvents): the
 * end of its station keeping, so the two flying side by side play as their
 * own stretch rather than the first moments of a long one. (Other station
 * keeping adds no key: as keys, it would lengthen some flights by 10 to 34
 * seconds.) And one for each docking at an event (see approachesAtEvents):
 * the start of its final approach, so the two closing in play as their own
 * stretch rather than the last moments of a long one. That adds 6 to 7.5
 * seconds to each of seven flights.
 */
export function storyKeyTimes(
  path: { readonly start: number; readonly end: number; readonly ships: readonly ShipTrack[] },
  eventTimes: readonly number[],
): number[] {
  const partingEnds = partingsAtEvents(path, eventTimes).map((parting) => parting.end);
  const approachStarts = approachesAtEvents(path, eventTimes).map((approach) => approach.start);
  return [path.start, path.end, ...eventTimes, ...partingEnds, ...approachStarts];
}

/**
 * Builds a story clock from any list of mission times (sorted or not). Each
 * interval between two of them plays for storyIntervalLength, evenly or,
 * when long, eased into and out of its ends (see EASE_GENTLE_PACE).
 */
export function createStoryTime(
  times: readonly number[],
  options: StoryTimeOptions = {},
): StoryTime {
  const keys = [...new Set(times.filter((t) => Number.isFinite(t)))].sort((a, b) => a - b);
  const story: number[] = [0];
  const eases: (Ease | null)[] = [];
  for (let i = 1; i < keys.length; i++) {
    const interval = keys[i]! - keys[i - 1]!;
    const seconds = storyIntervalLength(interval, options);
    story.push(story[i - 1]! + seconds);
    eases.push(options.ease === false ? null : easeOf(interval, seconds));
  }
  const length = story[story.length - 1] ?? 0;

  function locate(values: number[], x: number): number {
    // Index i with values[i] <= x < values[i + 1], clamped to a valid interval.
    let lo = 0;
    let hi = values.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (values[mid]! <= x) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  return {
    length,
    keyTimes: keys,
    toStory(missionSeconds) {
      if (keys.length < 2) return 0;
      const t = Math.min(keys[keys.length - 1]!, Math.max(keys[0]!, missionSeconds));
      const i = locate(keys, t);
      const ease = eases[i];
      if (ease) {
        // Counted from the nearer end, so each key lands exactly on its story second.
        const half = (keys[i + 1]! - keys[i]!) / 2;
        return t - keys[i]! <= half
          ? story[i]! + easedStory(ease, t - keys[i]!)
          : story[i + 1]! - easedStory(ease, keys[i + 1]! - t);
      }
      const u = (t - keys[i]!) / (keys[i + 1]! - keys[i]!);
      return story[i]! + u * (story[i + 1]! - story[i]!);
    },
    toMission(storySeconds) {
      if (keys.length === 0) return 0;
      if (keys.length === 1) return keys[0]!;
      const s = Math.min(length, Math.max(0, storySeconds));
      const i = locate(story, s);
      const ease = eases[i];
      if (ease) {
        const half = (story[i + 1]! - story[i]!) / 2;
        return s - story[i]! <= half
          ? keys[i]! + easedMission(ease, s - story[i]!)
          : keys[i + 1]! - easedMission(ease, story[i + 1]! - s);
      }
      const u = (s - story[i]!) / (story[i + 1]! - story[i]!);
      return keys[i]! + u * (keys[i + 1]! - keys[i]!);
    },
  };
}
