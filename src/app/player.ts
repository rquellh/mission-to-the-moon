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
export const TRIP_EASE_SECONDS = 1.5;

/*
 * A trip with more story to cover than it has real seconds is squeezed. It
 * plays its first TRIP_DEPART_SECONDS and its last TRIP_ARRIVE_SECONDS (real
 * seconds, eases included) at normal speed, 1 story second per real second,
 * the pace of exploring, and hurries through the stretch between. What
 * happens just after one stop and just before the next is then seen at the
 * pace it was made for, and only the middle of the trip goes by fast. The
 * trip speeds up to its hurried pace over TRIP_HURRY_EASE_SECONDS, and slows
 * back down over as many, so the change of pace does not jolt.
 */
export const TRIP_DEPART_SECONDS = 6;
export const TRIP_ARRIVE_SECONDS = 4;
const TRIP_HURRY_EASE_SECONDS = 1;

/** A playTo trip under way. Times are real seconds; places are story seconds. */
interface Trip {
  from: number;
  to: number;
  plan: TripPlan;
  elapsed: number;
}

/** A moment on a trip: how far along it is (`share`) and how fast it is going (`pace`). */
export interface TripProgress {
  share: number;
  pace: number;
}

/**
 * How far along a trip is, from 0 to 1, after `elapsed` of its `seconds`
 * (real seconds), and how fast it is going then, in whole trips per real
 * second. The trip covers `storySeconds` of story. The speed rises from zero
 * along half a cosine wave, holds, and falls back the same way. A squeezed
 * trip (see TRIP_DEPART_SECONDS) holds normal speed for a while at each end
 * and hurries in between.
 */
export function tripShape(elapsed: number, seconds: number, storySeconds: number): TripProgress {
  if (!(seconds > 0)) return { share: 1, pace: 0 };
  const squeezed = squeezedShape(elapsed, seconds, storySeconds);
  if (squeezed) return squeezed;
  // One pace between the two eases, as fast as the trip needs.
  const u = Math.min(1, Math.max(0, elapsed / seconds));
  const ramp = Math.min(0.5, TRIP_EASE_SECONDS / seconds);
  // The top speed, in trips per unit of u, that makes the whole trip come to exactly 1.
  const top = 1 / (1 - ramp);
  const rampShare = (x: number): number =>
    top * (x / 2 - (ramp / (2 * Math.PI)) * Math.sin((Math.PI * x) / ramp));
  const rampSlope = (x: number): number => (top * (1 - Math.cos((Math.PI * x) / ramp))) / 2;
  if (u < ramp) return { share: rampShare(u), pace: rampSlope(u) / seconds };
  if (u > 1 - ramp) return { share: 1 - rampShare(1 - u), pace: rampSlope(1 - u) / seconds };
  return { share: top * (ramp / 2 + (u - ramp)), pace: top / seconds };
}

/** A stretch of a trip, in real seconds, over which the pace (story seconds per real second) goes from one value to another along half a cosine wave, or holds when the two are equal. */
interface PaceStretch {
  seconds: number;
  from: number;
  to: number;
}

/** True when a trip of `seconds` real seconds covering `storySeconds` of story is squeezed: normal speed at each end and a hurry between (see TRIP_DEPART_SECONDS). */
export function tripHurries(seconds: number, storySeconds: number): boolean {
  return squeezedShape(0, seconds, storySeconds) !== null;
}

/**
 * tripShape for a squeezed trip, or null when the trip is not squeezed or is
 * too short for normal speed at both ends with room to hurry between. It
 * then takes the one-pace shape.
 */
function squeezedShape(
  elapsed: number,
  seconds: number,
  storySeconds: number,
): TripProgress | null {
  const hurry = hurryOf(seconds, storySeconds);
  if (hurry === null) return null;
  const hurryEase = TRIP_HURRY_EASE_SECONDS;
  const hurrying = seconds - TRIP_DEPART_SECONDS - TRIP_ARRIVE_SECONDS - hurryEase;
  const { covered, pace } = walk(
    [
      ...DEPARTURE,
      { seconds: hurryEase, from: 1, to: hurry },
      { seconds: hurrying - hurryEase, from: hurry, to: hurry },
      { seconds: hurryEase, from: hurry, to: 1 },
      ...ARRIVAL,
    ],
    Math.min(seconds, Math.max(0, elapsed)),
  );
  return { share: Math.min(1, covered / storySeconds), pace: pace / storySeconds };
}

/**
 * The hurried pace of a squeezed trip of `seconds` real seconds over
 * `storySeconds` of story (story seconds per real second), or null when it
 * is not squeezed (see squeezedShape).
 */
function hurryOf(seconds: number, storySeconds: number): number | null {
  if (!(storySeconds > seconds)) return null;
  const hurryEase = TRIP_HURRY_EASE_SECONDS;
  // Real seconds of the hurried pace, counting half of each ease into and out of it.
  const hurrying = seconds - TRIP_DEPART_SECONDS - TRIP_ARRIVE_SECONDS - hurryEase;
  // Its two eases must not overlap.
  if (hurrying < hurryEase) return null;
  // The story covered at normal speed and in the eases, so the hurry covers the rest.
  const unhurried = TRIP_DEPART_SECONDS + TRIP_ARRIVE_SECONDS - TRIP_EASE_SECONDS + hurryEase;
  const hurry = (storySeconds - unhurried) / hurrying;
  return hurry < 1 ? null : hurry;
}

/** A squeezed trip's start, at normal speed: the ease out of where it was, then normal speed. */
const DEPARTURE: readonly PaceStretch[] = [
  { seconds: TRIP_EASE_SECONDS, from: 0, to: 1 },
  { seconds: TRIP_DEPART_SECONDS - TRIP_EASE_SECONDS, from: 1, to: 1 },
];

/** A squeezed trip's end, at normal speed: normal speed, then the ease into where it stops. */
const ARRIVAL: readonly PaceStretch[] = [
  { seconds: TRIP_ARRIVE_SECONDS - TRIP_EASE_SECONDS, from: 1, to: 1 },
  { seconds: TRIP_EASE_SECONDS, from: 1, to: 0 },
];

/** How far along a run of pace stretches is: the story seconds it has covered, and its pace then. */
interface Walked {
  readonly covered: number;
  readonly pace: number;
}

/** Story seconds a run of pace stretches covers in its first `elapsed` real seconds, and its pace then. */
function walk(stretches: readonly PaceStretch[], elapsed: number): Walked {
  let left = Math.max(0, elapsed);
  let covered = 0;
  for (const { seconds: length, from, to } of stretches) {
    if (!(length > 0)) continue;
    if (left <= length) {
      const angle = (Math.PI * left) / length;
      const pace = from + ((to - from) * (1 - Math.cos(angle))) / 2;
      covered +=
        from * left + (to - from) * (left / 2 - (length / (2 * Math.PI)) * Math.sin(angle));
      return { covered, pace };
    }
    covered += ((from + to) / 2) * length;
    left -= length;
  }
  return { covered, pace: 0 };
}

/** Story seconds covered by a squeezed trip's start and by its end at normal speed, eases included. */
const DEPARTURE_STORY_SECONDS = walk(DEPARTURE, TRIP_DEPART_SECONDS).covered;
const ARRIVAL_STORY_SECONDS = walk(ARRIVAL, TRIP_ARRIVE_SECONDS).covered;

/*
 * A trip's hurry and the craft. The hurry multiplies the story clock's pace,
 * and on a closed lap the scene covers any speed: a craft going round too
 * fast is drawn as a stand-in gliding round its ring. On no closed lap
 * (arriving at a body, leaving one) nothing can stand in, and the craft is
 * drawn at its true place, so the hurry keeps to the story's hurryLimit
 * there (see StoryMap.hurryLimit): about normal speed on a swing the clock
 * already plays at its own limit, faster where craft turn slowly, as fast as
 * it likes where none is on no closed lap. A squeezed trip whose usual shape
 * (see tripShape) keeps to it is played that way, unchanged. One that does
 * not keeps its start and its end at normal speed, and in between goes as
 * fast as the usual shape's hurry but no faster than the limit allows, its
 * speed changing no more abruptly than the usual ease into the hurry does;
 * it takes longer, by what the slower parts cost, up to
 * TRIP_LIMITED_MAX_SECONDS. A trip that would need longer still takes that
 * long and goes over the limit by one even factor where the limit holds it
 * back (see TripPlan.over).
 */
export const TRIP_LIMITED_MAX_SECONDS = 28;

/**
 * A trip held back by the limit is hurrying where it goes at least this
 * many times normal speed (or, for a trip whose hurry is slower than five
 * times, half way from normal speed to its hurry) more than
 * TRIP_RUN_IN_MISSION_SECONDS from the stop; its final run (see
 * TripPlan.finalRun) begins where the limit next holds it under that, after
 * its last hurry. Under it, a trip whose limit rises and falls between two
 * and three times normal speed is still on its way in.
 */
export const TRIP_HURRY_SPEED = 3;

/**
 * Within this much mission time of the stop, a trip going fast is not a
 * hurry but part of its run in: the craft is at the body it is arriving at
 * already (nothing crosses between Earth and the Moon in three hours; see
 * HURRY_VIEW_MISSION_SECONDS in tour.ts). Apollo 11 coming home goes
 * through its entry and its parachutes, minutes before splashdown, at up to
 * six times normal speed after the swing round Earth the limit held it to.
 */
export const TRIP_RUN_IN_MISSION_SECONDS = 3 * 3600;

/**
 * A trip's final run begins no farther from the stop than this, in mission
 * seconds: farther out, a stretch the limit holds is a swing away from the
 * body the trip left (Apollo 12 leaving the Moon, 72 hours before its
 * splashdown), not the swing in. The clock first holds a craft arriving at
 * Earth about six hours out, at the Moon two or three.
 */
export const TRIP_FINAL_RUN_MISSION_SECONDS = 8 * 3600;

/** Story seconds between the points at which a limited trip's speed is set. */
const PLAN_STEP_STORY_SECONDS = 0.02;

/** Real seconds between the moments at which a trip's usual shape is checked against the limit. */
const CHECK_STEP_SECONDS = 0.02;

/** A trip planned (see planTrip): how long it takes, and where it is at each moment. */
export interface TripPlan {
  /** Real seconds it takes. */
  readonly seconds: number;
  /** Whether it hurries between normal speed at its two ends (see TRIP_DEPART_SECONDS). */
  readonly hurries: boolean;
  /** Whether the story's hurryLimit shaped it, rather than the usual shape (see tripShape). */
  readonly limited: boolean;
  /** The factor by which it goes over the limit where it had to (see TRIP_LIMITED_MAX_SECONDS); 1 when it keeps to it. */
  readonly over: number;
  /**
   * Real seconds of its final run, from the end of its last hurry to its
   * end. The usual shape's hurry ends as it settles back to normal speed,
   * TRIP_ARRIVE_SECONDS before the end, and so does that of a trip held back
   * only on its way out; a trip that does not hurry has the same. A trip the
   * limit holds back on its way in (a swing round the body it is arriving
   * at) runs in from where the limit takes hold after its last hurry (see
   * TRIP_HURRY_SPEED), so its final run is the whole of that swing, and
   * whatever follows it to the stop.
   */
  readonly finalRun: number;
  /** How far along it is, and how fast it is going, `elapsed` real seconds in (as tripShape). */
  at(elapsed: number): TripProgress;
}

/** The last trip planned, so the tour's plan and the player's are one (see planTrip). */
let lastPlanned: {
  story: StoryMap;
  from: number;
  to: number;
  seconds: number;
  plan: TripPlan;
} | null = null;

/**
 * The trip from story second `from` to `to` that a playTo of `seconds` real
 * seconds plays on `story`: the usual shape (see tripShape), or, for a
 * squeezed trip whose usual hurry would carry a craft drawn at its true place
 * round its body faster than the story allows, one held to that (see
 * TRIP_LIMITED_MAX_SECONDS), which takes longer.
 */
export function planTrip(story: StoryMap, from: number, to: number, seconds: number): TripPlan {
  const last = lastPlanned;
  if (
    last &&
    last.story === story &&
    last.from === from &&
    last.to === to &&
    last.seconds === seconds
  )
    return last.plan;
  const plan = makePlan(story, from, to, seconds);
  lastPlanned = { story, from, to, seconds, plan };
  return plan;
}

function makePlan(story: StoryMap, from: number, to: number, seconds: number): TripPlan {
  const span = Math.abs(to - from);
  const usual: TripPlan = {
    seconds,
    hurries: tripHurries(seconds, span),
    limited: false,
    over: 1,
    finalRun: Math.min(seconds, TRIP_ARRIVE_SECONDS),
    at: (elapsed) => tripShape(elapsed, seconds, span),
  };
  const limit = story.hurryLimit;
  const hurry = hurryOf(seconds, span);
  if (!limit || hurry === null) return usual;
  const direction = to >= from ? 1 : -1;
  const limitAt = (covered: number): number => limit(from + direction * covered);
  if (keepsTo(usual, span, limitAt)) return usual;
  const toStop = (covered: number): number =>
    story.toElapsed(to) - story.toElapsed(from + direction * covered);
  return limitedPlan(span, hurry, limitAt, toStop);
}

/** True when a trip's usual shape never goes faster than the limit allows. */
function keepsTo(plan: TripPlan, span: number, limitAt: (covered: number) => number): boolean {
  for (let elapsed = 0; elapsed <= plan.seconds; elapsed += CHECK_STEP_SECONDS) {
    const { share, pace } = plan.at(elapsed);
    const speed = span * pace;
    if (speed > 1 && speed > limitAt(span * share) * (1 + 1e-9)) return false;
  }
  return true;
}

/**
 * A squeezed trip over `span` story seconds held to the limit (see
 * TRIP_LIMITED_MAX_SECONDS): its start and end as usual, and between them a
 * speed that is the least of the usual hurry, the limit (times `over`, 1
 * unless the trip would take too long), and what the speed can reach from
 * either end changing no faster than the usual ease into the hurry does at
 * its steepest. Within each step of PLAN_STEP_STORY_SECONDS the speed changes
 * at one rate.
 */
function limitedPlan(
  span: number,
  hurry: number,
  limitAt: (covered: number) => number,
  toStop: (covered: number) => number,
): TripPlan {
  const start = DEPARTURE_STORY_SECONDS;
  const middle = Math.max(0, span - DEPARTURE_STORY_SECONDS - ARRIVAL_STORY_SECONDS);
  const steps = Math.max(1, Math.ceil(middle / PLAN_STEP_STORY_SECONDS));
  const step = middle / steps;
  // Each point takes the least limit of its own and its two neighbours', so a sharp change of the
  // limit between two points (a transfer beginning) is met at the point before it.
  const read = Float64Array.from({ length: steps + 1 }, (_, i) => limitAt(start + i * step));
  const limits = read.map((value, i) =>
    Math.min(value, read[i - 1] ?? Infinity, read[i + 1] ?? Infinity),
  );
  // The usual ease into the hurry, half a cosine over TRIP_HURRY_EASE_SECONDS, at its steepest.
  const steepest = (Math.PI / 2) * ((hurry - 1) / TRIP_HURRY_EASE_SECONDS);
  const speeds = new Float64Array(steps + 1);
  const times = new Float64Array(steps + 1);
  /** Lays the middle out with the limit stretched by `over`, and returns its real seconds. */
  const lay = (over: number): number => {
    for (let i = 0; i <= steps; i += 1) speeds[i] = Math.min(hurry, over * (limits[i] as number));
    // Normal speed where the middle meets the start and the end; no faster to reach than allowed.
    speeds[0] = 1;
    speeds[steps] = 1;
    for (let i = 1; i <= steps; i += 1)
      speeds[i] = Math.min(
        speeds[i] as number,
        Math.sqrt((speeds[i - 1] as number) ** 2 + 2 * steepest * step),
      );
    for (let i = steps - 1; i >= 0; i -= 1)
      speeds[i] = Math.min(
        speeds[i] as number,
        Math.sqrt((speeds[i + 1] as number) ** 2 + 2 * steepest * step),
      );
    for (let i = 1; i <= steps; i += 1)
      times[i] =
        (times[i - 1] as number) + (2 * step) / ((speeds[i - 1] as number) + (speeds[i] as number));
    return times[steps] as number;
  };
  const ends = TRIP_DEPART_SECONDS + TRIP_ARRIVE_SECONDS;
  let over = 1;
  if (ends + lay(1) > TRIP_LIMITED_MAX_SECONDS) {
    // Over the limit by the least even factor that fits: with it stretched far enough, only the hurry holds the trip back.
    let lo = 1;
    let hi = hurry / Math.max(1e-9, Math.min(...limits));
    for (let k = 0; k < 60 && hi - lo > 1e-9 * hi; k += 1) {
      const mid = (lo + hi) / 2;
      if (ends + lay(mid) > TRIP_LIMITED_MAX_SECONDS) lo = mid;
      else hi = mid;
    }
    over = hi;
  }
  const hurrying = lay(over);
  const seconds = ends + hurrying;
  // The final run: from where the limit last holds the trip under its hurrying speed after a
  // hurry; with none, from where the trip is back at normal speed, as the usual shape's is.
  const fast = Math.min(TRIP_HURRY_SPEED, (1 + hurry) / 2);
  let runFrom = -1;
  let hurried = false;
  for (let i = 0; i <= steps; i += 1) {
    const allowed = over * (limits[i] as number);
    const speed = speeds[i] as number;
    const away = toStop(start + i * step);
    if (away > TRIP_FINAL_RUN_MISSION_SECONDS) hurried = true;
    else if (speed >= fast && away > TRIP_RUN_IN_MISSION_SECONDS) hurried = true;
    else if (allowed < fast && speed >= allowed * (1 - 1e-9)) {
      if (hurried) runFrom = i;
      hurried = false;
    }
  }
  const finalRun =
    runFrom < 0 ? TRIP_ARRIVE_SECONDS : seconds - TRIP_DEPART_SECONDS - (times[runFrom] as number);
  const at = (elapsed: number): TripProgress => {
    const e = Math.min(seconds, Math.max(0, elapsed));
    let covered: number;
    let speed: number;
    if (e < TRIP_DEPART_SECONDS) ({ covered, pace: speed } = walk(DEPARTURE, e));
    else if (e < TRIP_DEPART_SECONDS + hurrying) {
      const into = e - TRIP_DEPART_SECONDS;
      let lo = 0;
      let hi = steps - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if ((times[mid] as number) <= into) lo = mid;
        else hi = mid - 1;
      }
      const v0 = speeds[lo] as number;
      const v1 = speeds[lo + 1] as number;
      // One rate of change of speed across the step: its speed squared changes evenly with the story.
      const rate = (v1 * v1 - v0 * v0) / (2 * step);
      const tau = into - (times[lo] as number);
      covered = start + lo * step + Math.min(step, v0 * tau + (rate * tau * tau) / 2);
      speed = v0 + rate * tau;
    } else {
      const done = walk(ARRIVAL, e - TRIP_DEPART_SECONDS - hurrying);
      covered = start + middle + done.covered;
      speed = done.pace;
    }
    return { share: Math.min(1, covered / span), pace: speed / span };
  };
  return { seconds, hurries: true, limited: true, over, finalRun, at };
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
  constructor(
    start: number,
    end: number,
    story: StoryMap,
    now: () => number = () => performance.now(),
  ) {
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
    const span = Math.abs(trip.to - trip.from);
    return span * trip.plan.at(trip.elapsed).pace;
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
    this.trip = {
      from: this.storyNow,
      to,
      plan: planTrip(this.story, this.storyNow, to, seconds),
      elapsed: 0,
    };
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
      if (trip.elapsed >= trip.plan.seconds) {
        // Land exactly on the place asked for, then stand still there.
        this.storyNow = trip.to;
        this.trip = null;
        this.isPlaying = false;
        this.frame = null;
      } else {
        const { share } = trip.plan.at(trip.elapsed);
        this.storyNow = trip.from + (trip.to - trip.from) * share;
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
