import type { MissionBundle } from '../../content/missions/bundle.ts';
/**
 * The facts and the timing behind "Drop the stages", kept apart from the
 * page so Node can check them.
 *
 * Every fact comes from the mission's own files, with its citations; no
 * time is typed in here:
 * - The vehicle file: the main ship's changes in the "launch" layout, each
 *   part list compared with the one before it, say which part came off
 *   and when. The change that ends the launch layout counts too when it
 *   comes as the ship reaches orbit (a Gemini spacecraft letting go of its
 *   spent second stage); an Apollo upper stage that stays on for hours
 *   does not count.
 * - The flight plan: the main ship's ascent phase ends at orbit insertion.
 * - The story: the event at that moment says what reaching orbit meant.
 *
 * The timing is a simplification, and the page says so: the mission clock
 * runs much faster than real time, fastest between drops and slower near
 * each one, so the whole climb takes well under a minute and there is time
 * to press the button.
 */
import {
  elapsedToSeconds,
  type Cited,
  type ElapsedTime,
  type MissionEvent,
} from '../../content/types.ts';
import type { VehicleChange, VehiclePart } from '../../content/vehicle-types.ts';

/** One moment the rocket let go of something on the way up. */
export interface Drop {
  /** The parts that came off at this moment (usually one). */
  parts: VehiclePart[];
  /** In plain words, lower case: "the first stage". */
  name: string;
  /** When, on the mission clock, with the vehicle file's citations. */
  at: Cited<ElapsedTime>;
  /** `at` in seconds. */
  seconds: number;
  /** The vehicle file gives a planned time here, because the real one was not recorded. */
  planned: boolean;
}

export interface Climb {
  missionId: string;
  /** "Apollo 11". */
  missionName: string;
  /** The rocket as the story names it: "Saturn V (SA-506)". */
  rocket: string;
  /** The parts on the pad, as the vehicle file lists them at liftoff. */
  liftoffParts: VehiclePart[];
  /** Liftoff on the mission clock, seconds. */
  liftoff: number;
  /** In time order. Never empty. */
  drops: Drop[];
  /** Where the clock stops: orbit insertion, or the last drop if that comes later. */
  end: number;
  /** The story's event at orbit insertion (or at the last drop, when that ended the launch), if it has one. */
  orbit: MissionEvent | undefined;
  /** The story's liftoff event, to open the mission there. */
  liftoffEvent: MissionEvent | undefined;
  /** The liftoff time as the vehicle file gives it, when there is no liftoff event. */
  liftoffAt: ElapsedTime;
}

/**
 * Plain names for the parts a rocket drops on the way up, from the doc
 * comments on VehiclePart (src/content/vehicle-types.ts). Any other part
 * falls back to its id in words.
 */
const PART_NAMES: Partial<Record<VehiclePart, string>> = {
  'first-stage': 'the first stage',
  'saturn-ib-first-stage': 'the first stage',
  'titan-first-stage': 'the first stage',
  'aft-interstage': 'the ring between the first and second stages',
  'second-stage': 'the second stage',
  'titan-second-stage': 'the second stage',
  'escape-tower': 'the launch escape tower',
};

export function partName(part: VehiclePart): string {
  return PART_NAMES[part] ?? `the ${part.replace(/-/g, ' ')}`;
}

function namesOf(parts: readonly VehiclePart[]): string {
  const names = [...new Set(parts.map(partName))];
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "the first stage" to "The first stage". */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * How long after orbit insertion the change that ends the launch layout
 * may come and still count as part of the climb. Gemini spacecraft let go
 * of their second stage within seconds of the cited insertion time; an
 * Apollo spacecraft left its upper stage hours later, in orbit. A minute
 * tells the two apart. (A cutoff, not a fact: nothing on screen shows it.)
 */
const ORBIT_ALLOWANCE_SECONDS = 60;

const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.001;

/** The vehicle file says the time is a plan, not a measurement (Apollo 17's escape tower). */
function isPlanned(change: VehicleChange): boolean {
  return (
    /\bplanned\b/i.test(change.label) ||
    change.at.citations.some((c) => /\bplanned time\b/i.test(c.locator))
  );
}

/** The climb a mission's files describe, or null when its vehicle file gives no usable sequence. */
export function climbFor(bundle: MissionBundle): Climb | null {
  const { mission, flight, vehicle } = bundle;
  const main = flight.ships.find((ship) => ship.role === 'main');
  if (!main) return null;
  const ascent = main.phases[0].kind === 'ascent' ? main.phases[0] : undefined;
  const insertion = ascent ? elapsedToSeconds(ascent.end.value) : undefined;

  const changes = vehicle
    .filter((change) => change.ship === main.id)
    .map((change) => ({ change, seconds: elapsedToSeconds(change.at.value) }))
    .sort((a, b) => a.seconds - b.seconds);
  const start = changes.findIndex(({ change }) => change.layout === 'launch');
  const first = changes[start];
  if (!first || first.change.parts.length === 0) return null;

  const drops: Drop[] = [];
  /** When the change that ended the launch layout counted as a drop. */
  let leftLaunch: number | undefined;
  let previous = first.change;
  for (const { change, seconds } of changes.slice(start + 1)) {
    const inLaunch = change.layout === 'launch';
    // Only the way up counts: nothing after orbit insertion (and its allowance).
    if (insertion !== undefined && seconds > insertion + ORBIT_ALLOWANCE_SECONDS) break;
    // Without a cited insertion time, only changes in the launch layout count.
    if (!inLaunch && insertion === undefined) break;
    const dropped = previous.parts.filter((part) => !change.parts.includes(part));
    if (dropped.length > 0) {
      drops.push({
        parts: dropped,
        name: namesOf(dropped),
        at: change.at,
        seconds,
        planned: isPlanned(change),
      });
      if (!inLaunch) leftLaunch = seconds;
    }
    if (!inLaunch) break;
    previous = change;
  }
  if (drops.length === 0) return null;

  const last = drops[drops.length - 1]!;
  const end = Math.max(insertion ?? last.seconds, last.seconds);
  const at = (seconds: number): MissionEvent | undefined =>
    mission.events.find((event) => near(elapsedToSeconds(event.elapsed), seconds));
  return {
    missionId: mission.id,
    missionName: mission.name,
    rocket: mission.launch?.value.vehicle ?? `${mission.name}'s rocket`,
    liftoffParts: [...first.change.parts],
    liftoff: first.seconds,
    drops,
    end,
    orbit:
      (insertion !== undefined ? at(insertion) : undefined) ??
      (leftLaunch !== undefined ? at(leftLaunch) : undefined),
    liftoffEvent: at(first.seconds) ?? mission.events.find((event) => event.id === 'liftoff'),
    liftoffAt: first.change.at.value,
  };
}

/* ------------------------------------------------------------------ */
/* Words for times.                                                    */
/* ------------------------------------------------------------------ */

const unit = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * A cited time in words, keeping the source's digits: "000:02:42.30" is
 * "2 minutes 42.30 seconds", "000:06:05.66" is "6 minutes 5.66 seconds".
 */
export function sayElapsed(elapsed: ElapsedTime): string {
  const [h = '0', m = '0', s = '0'] = elapsed.replace('-', '').trim().split(':');
  const hours = Number(h);
  const minutes = Number(m);
  const secondsText = s.replace(/^0+(?=\d)/, '');
  const seconds = secondsText === '1' ? '1 second' : `${secondsText} seconds`;
  const words: string[] = [];
  if (hours > 0) words.push(unit(hours, 'hour', 'hours'));
  if (hours > 0 || minutes > 0) words.push(unit(minutes, 'minute', 'minutes'));
  words.push(seconds);
  return words.join(' ');
}

/** A reading of the illustration's clock in words, whole seconds: "2 minutes 41 seconds". */
export function sayClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds + 1e-6));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (minutes === 0) return unit(rest, 'second', 'seconds');
  return rest === 0
    ? unit(minutes, 'minute', 'minutes')
    : `${unit(minutes, 'minute', 'minutes')} ${unit(rest, 'second', 'seconds')}`;
}

/** The clock face: minutes and seconds, "2:41". */
export function clockFace(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds + 1e-6));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* The sped-up clock (a simplification).                               */
/* ------------------------------------------------------------------ */

/** Real seconds the clock takes from one drop to the next: about this many mission seconds a second, within the bounds below. */
const GUIDE_SPEED = 20;
const SEGMENT_MIN = 4.5;
const SEGMENT_MAX = 7;
/** From the last drop to orbit. */
const END_MIN = 1.5;
const END_MAX = 4;
/** Near each drop the clock slows to this many mission seconds a second, for this long before and after it. */
const SLOW_SPEED = 3;
const SLOW_BEFORE = 2;
const SLOW_AFTER = 1.2;
/** How early, and how late, a press still counts as on time (real seconds). */
export const EARLY_WINDOW = 0.7;
export const LATE_WINDOW = 1;

export interface Schedule {
  /** The clock's corners: real seconds since Start, and mission seconds, in step. */
  real: number[];
  mission: number[];
  /** The real second at which each drop's cited time comes. */
  targets: number[];
  /** The real second at which the clock reaches the end of the climb. */
  end: number;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** How the clock runs for a climb, from Start to orbit. */
export function scheduleFor(climb: Climb): Schedule {
  const real = [0];
  const mission = [climb.liftoff];
  const targets: number[] = [];
  const segment = (to: number, min: number, max: number, slowBefore: number): void => {
    const r0 = real[real.length - 1]!;
    const m0 = mission[mission.length - 1]!;
    const span = Math.max(0, to - m0);
    const length = clamp(span / GUIDE_SPEED, min, max);
    const slowSpan = SLOW_SPEED * (SLOW_AFTER + slowBefore);
    const fastLength = length - SLOW_AFTER - slowBefore;
    // Slow near the drops only when the rest still runs faster than the slow part.
    if (fastLength > 0 && span - slowSpan > SLOW_SPEED * fastLength) {
      real.push(r0 + SLOW_AFTER, r0 + length - slowBefore);
      mission.push(m0 + SLOW_SPEED * SLOW_AFTER, to - SLOW_SPEED * slowBefore);
    }
    real.push(r0 + length);
    mission.push(Math.max(m0, to));
  };
  for (const drop of climb.drops) {
    segment(drop.seconds, SEGMENT_MIN, SEGMENT_MAX, SLOW_BEFORE);
    targets.push(real[real.length - 1]!);
  }
  segment(climb.end, END_MIN, END_MAX, 0);
  return { real, mission, targets, end: real[real.length - 1]! };
}

/** The mission clock at a real second since Start. */
export function missionAt(schedule: Schedule, seconds: number): number {
  const { real, mission } = schedule;
  if (seconds <= 0) return mission[0]!;
  for (let i = 1; i < real.length; i += 1) {
    const r1 = real[i]!;
    if (seconds <= r1) {
      const r0 = real[i - 1]!;
      const m0 = mission[i - 1]!;
      const u = r1 > r0 ? (seconds - r0) / (r1 - r0) : 1;
      return m0 + (mission[i]! - m0) * u;
    }
  }
  return mission[mission.length - 1]!;
}

/** "early": too soon, nothing drops. "on-time": it drops. */
export function judge(target: number, seconds: number): 'early' | 'on-time' {
  return seconds < target - EARLY_WINDOW ? 'early' : 'on-time';
}

/** True once the visitor has waited too long: the part drops by itself. */
export function overdue(target: number, seconds: number): boolean {
  return seconds > target + LATE_WINDOW;
}
