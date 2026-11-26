/**
 * Fast forward's rules, apart from the scene so they can be tested: when a
 * craft laps its body too fast to be drawn at its true place
 * (inFastForward); the ring drawn for it then, which must be a closed lap of
 * its body (closedLapStart, writeLap); the stand-in, its model gliding round
 * that ring at a calm pace of its own (glideRevolutions, ringPointAt,
 * ringHeadingAt); and the hand-back to its true place when fast forward ends
 * (handBackOpacity, stepHandBack). See the fast-forward block in stage.ts for
 * how the scene uses them.
 */

/**
 * A craft drawn going around its body faster than once in
 * FAST_FORWARD_ON_LAP_SECONDS of real time is replaced by its ring; it is
 * drawn again once it slows to less than once in FAST_FORWARD_OFF_LAP_SECONDS.
 * Two levels, so a pace near one of them does not flutter between the two.
 * The owner called a lap of the Moon in 4.4 seconds "way too fast" and one in
 * 8.8 seconds "better", and with the ring coming on at once in 7 seconds
 * said the orbit animations were still too fast. One lap in 20 seconds is a
 * working figure chosen since, not one the owner gave: a drawn craft goes
 * round no faster, and anything faster on a closed lap is the ring. The
 * story clock keeps the moments either side of an event slower still (about
 * once in 30 seconds in low Earth orbit; see EASE_GENTLE_PACE in
 * src/sim/story-time.ts), so a craft is drawn again a little before them.
 */
export const FAST_FORWARD_ON_LAP_SECONDS = 20;
export const FAST_FORWARD_OFF_LAP_SECONDS = 24;

/** Whether a craft going around its body `lapsPerSecond` times a second of real time is in fast forward, given whether it was. */
export function inFastForward(lapsPerSecond: number, was: boolean): boolean {
  return was
    ? lapsPerSecond * FAST_FORWARD_OFF_LAP_SECONDS >= 1
    : lapsPerSecond * FAST_FORWARD_ON_LAP_SECONDS > 1;
}

/**
 * One revolution of a path is a closed lap when its two ends are this close,
 * as a share of their distance from the body's center, at true scale. An
 * orbit, or two orbits a small burn apart (a rendezvous, a lander's descent
 * orbit), miss by a few hundredths; a burn that leaves orbit, an arrival, or
 * a climb from the surface by a third or more.
 */
export const LAP_CLOSED_SHARE = 0.08;

/**
 * Where the lap around now may start, in revolutions back from now: half a
 * lap back first (now in the middle of the ring), then further and further
 * off center, so that just after arriving in orbit the lap ahead is used,
 * and just before leaving it the lap behind.
 */
const LAP_OFFSETS = [0.5, 0.375, 0.625, 0.25, 0.75, 0.125, 0.875, 0, 1] as const;

/** A path sampled for drawing, with the revolutions flown around the nearer body at each sample. */
export interface LapPath {
  /** Revolutions flown at each sample, from the path's start (never decreasing). */
  readonly revolutions: ArrayLike<number>;
  /** Each sample's place at true scale and at readable scale, x, y, z each. */
  readonly truePositions: ArrayLike<number>;
  readonly readablePositions: ArrayLike<number>;
}

/** The fractional sample index at which a never-decreasing array reaches `value` (clamped to its ends). */
export function indexAtValue(values: ArrayLike<number>, value: number): number {
  const n = values.length;
  if (n === 0) return 0;
  if (value <= (values[0] as number)) return 0;
  if (value >= (values[n - 1] as number)) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((values[mid] as number) <= value) lo = mid;
    else hi = mid;
  }
  const a = values[lo] as number;
  const b = values[hi] as number;
  return lo + (b > a ? (value - a) / (b - a) : 0);
}

/** A position at a fractional sample index, between readable (mix 0) and true scale (mix 1), into `out` at `offset`. */
function pointAt(
  path: LapPath,
  index: number,
  mix: number,
  out: { [i: number]: number },
  offset = 0,
): void {
  const n = path.revolutions.length;
  const i = Math.max(0, Math.min(Math.floor(index), n - 2));
  const u = Math.max(0, Math.min(1, index - i));
  for (let c = 0; c < 3; c += 1) {
    const a = 3 * i + c;
    const r0 = path.readablePositions[a] ?? 0;
    const r = r0 + ((path.readablePositions[a + 3] ?? r0) - r0) * u;
    const t0 = path.truePositions[a] ?? 0;
    const t = t0 + ((path.truePositions[a + 3] ?? t0) - t0) * u;
    out[offset + c] = r + (t - r) * mix;
  }
}

const _a = [0, 0, 0];
const _b = [0, 0, 0];

/**
 * How far one revolution of a path, from `start` revolutions to `start + 1`,
 * misses closing on itself: the distance between its two ends over their
 * mean distance from `center`, at true scale. Infinity when the path does
 * not cover that whole revolution.
 */
export function lapGap(path: LapPath, start: number, center: ArrayLike<number>): number {
  const revolutions = path.revolutions;
  const n = revolutions.length;
  if (n < 2) return Infinity;
  if ((revolutions[0] as number) > start + 1e-9 || (revolutions[n - 1] as number) < start + 1)
    return Infinity;
  pointAt(path, indexAtValue(revolutions, start), 1, _a);
  pointAt(path, indexAtValue(revolutions, start + 1), 1, _b);
  const ra = Math.hypot(
    (_a[0] as number) - (center[0] ?? 0),
    (_a[1] as number) - (center[1] ?? 0),
    (_a[2] as number) - (center[2] ?? 0),
  );
  const rb = Math.hypot(
    (_b[0] as number) - (center[0] ?? 0),
    (_b[1] as number) - (center[1] ?? 0),
    (_b[2] as number) - (center[2] ?? 0),
  );
  const gap = Math.hypot(
    (_b[0] as number) - (_a[0] as number),
    (_b[1] as number) - (_a[1] as number),
    (_b[2] as number) - (_a[2] as number),
  );
  return ra + rb > 0 ? gap / ((ra + rb) / 2) : Infinity;
}

/**
 * The start (in revolutions) of a closed lap of the path that passes through
 * now (`now`, in revolutions), or NaN when no lap through now closes: the
 * craft is leaving orbit, arriving, or changing orbit by more than a little
 * within a lap either way. `center` is the body's center at true scale.
 */
export function closedLapStart(path: LapPath, now: number, center: ArrayLike<number>): number {
  for (const offset of LAP_OFFSETS) {
    const start = now - 1 + offset;
    if (lapGap(path, start, center) <= LAP_CLOSED_SHARE) return start;
  }
  return Number.NaN;
}

const _end = [0, 0, 0];

/**
 * Write the lap that starts at `start` revolutions as `count` ring points
 * into `out` (x, y, z each), at scale mix `mix`. Point j sits where the path
 * has flown a whole number of revolutions plus j / count, so a point keeps
 * about its place around the body from one lap to the next and a ring can
 * ease from one lap to another point by point. What the lap misses closing
 * by is spread along it, so the last point leads back to the first without
 * a chord: none of it at `anchor` (revolutions, within the lap; its start
 * unless given), where the ring runs through the path itself, and more of
 * it the farther round the lap from there. The scene anchors a ring at the
 * craft's true place, so the ring and the line the craft has flown meet
 * where the craft is as fast forward begins and ends (see updateTrail in
 * stage.ts); a lap that misses by a few hundredths of its size would
 * otherwise run that far beside the craft's own line there.
 */
export function writeLap(
  path: LapPath,
  start: number,
  mix: number,
  out: Float32Array,
  count: number,
  anchor = start,
): void {
  const revolutions = path.revolutions;
  pointAt(path, indexAtValue(revolutions, start), mix, _a);
  pointAt(path, indexAtValue(revolutions, start + 1), mix, _end);
  const from = Math.max(0, Math.min(1, anchor - start));
  for (let j = 0; j < count; j += 1) {
    const phase = j / count - start;
    const along = phase - Math.floor(phase);
    pointAt(path, indexAtValue(revolutions, start + along), mix, out, 3 * j);
    for (let c = 0; c < 3; c += 1) {
      out[3 * j + c] =
        (out[3 * j + c] as number) + (along - from) * ((_a[c] as number) - (_end[c] as number));
    }
  }
}

/*
 * The stand-in. While a craft is in fast forward its true place races round
 * the body, so its model is not drawn there: it stands in for the craft on
 * the ring, gliding round at one steady, calm pace in real time, one lap in
 * FAST_FORWARD_GLIDE_LAP_SECONDS, whatever the clock's pace, the tour's
 * hurry, or Explore's speed. It sets off from the craft's true place at the
 * pace the craft went into fast forward at (one lap in
 * FAST_FORWARD_ON_LAP_SECONDS) and eases to its own over
 * FAST_FORWARD_GLIDE_EASE_SECONDS, so it neither jumps nor slows with a
 * jolt. The 40 seconds is a working figure, twice the slowest lap that goes
 * to the ring; it is not a number the owner gave.
 */
export const FAST_FORWARD_GLIDE_LAP_SECONDS = 40;
export const FAST_FORWARD_GLIDE_EASE_SECONDS = 1;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const smooth = (x: number): number => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/** The stand-in's pace in laps a second, `seconds` of real time after it set off at `startRate` laps a second. */
export function glideRate(seconds: number, startRate: number): number {
  const end = 1 / FAST_FORWARD_GLIDE_LAP_SECONDS;
  return startRate + (end - startRate) * smooth(seconds / FAST_FORWARD_GLIDE_EASE_SECONDS);
}

/**
 * The laps the stand-in has glided `seconds` of real time after it set off
 * at `startRate` laps a second (not below 0): glideRate summed over that
 * time, so it never decreases.
 */
export function glideRevolutions(seconds: number, startRate: number): number {
  const start = Math.max(0, startRate);
  const end = 1 / FAST_FORWARD_GLIDE_LAP_SECONDS;
  const ease = FAST_FORWARD_GLIDE_EASE_SECONDS;
  const s = Math.max(0, seconds);
  if (s >= ease) return (ease * (start + end)) / 2 + end * (s - ease);
  // The ease is a smoothstep of the time, whose sum from 0 to u is u³ - u⁴ / 2.
  const u = s / ease;
  return start * s + (end - start) * ease * (u ** 3 - u ** 4 / 2);
}

/**
 * How much of the stand-in's distance from the ring as it sets off (from
 * the craft's true place to the ring's point there, at most what the lap
 * misses closing by) is still added, `seconds` of real time in: all of it at
 * first, so it starts where the craft is, and none once the glide has eased
 * to its own pace, so from then on it is on the ring.
 */
export function seedShare(seconds: number): number {
  return 1 - smooth(seconds / FAST_FORWARD_GLIDE_EASE_SECONDS);
}

/** Where a phase falls on a ring: at point j, and `u` of the way on toward point j + 1 (0 to 1). */
interface RingStep {
  readonly j: number;
  readonly u: number;
}

/** Where `phase` (a share of a lap, any number, taken round the lap) falls on a ring of `count` points. */
function ringStep(count: number, phase: number): RingStep {
  const along = (phase - Math.floor(phase)) * count;
  const j = Math.min(count - 1, Math.max(0, Math.floor(along)));
  return { j, u: Math.max(0, Math.min(1, along - j)) };
}

/**
 * The point a share `phase` of a lap round a ring of `count` points (point j
 * at j / count of the lap, as writeLap writes them; the last point leads
 * back to the first), on the straight line between its two neighbours, as
 * the ring is drawn: into `out` at `offset`.
 */
export function ringPointAt(
  ring: ArrayLike<number>,
  count: number,
  phase: number,
  out: { [i: number]: number },
  offset = 0,
): void {
  const { j, u } = ringStep(count, phase);
  const k = (j + 1) % count;
  for (let c = 0; c < 3; c += 1) {
    const a = ring[3 * j + c] ?? 0;
    const b = ring[3 * k + c] ?? 0;
    out[offset + c] = a + (b - a) * u;
  }
}

/**
 * The way on round a ring of `count` points (as ringPointAt) at `phase`, as
 * a unit vector into `out`: the way the craft flies, since a lap's points go
 * in the order it flies them. It turns smoothly from one point to the next,
 * not in steps at the points. Left as it is when the ring has no length there.
 */
export function ringHeadingAt(
  ring: ArrayLike<number>,
  count: number,
  phase: number,
  out: { [i: number]: number },
): void {
  const { j, u } = ringStep(count, phase);
  const before = (j - 1 + count) % count;
  const next = (j + 1) % count;
  const after = (j + 2) % count;
  const heading = [0, 0, 0];
  for (let c = 0; c < 3; c += 1) {
    // The way at points j and j + 1, each from its two neighbours, blended between them.
    const at = (ring[3 * next + c] ?? 0) - (ring[3 * before + c] ?? 0);
    const on = (ring[3 * after + c] ?? 0) - (ring[3 * j + c] ?? 0);
    heading[c] = at + (on - at) * u;
  }
  const length = Math.hypot(heading[0] as number, heading[1] as number, heading[2] as number);
  if (!(length > 1e-12)) return;
  for (let c = 0; c < 3; c += 1) out[c] = (heading[c] as number) / length;
}

/*
 * The hand-back. When fast forward ends, the model goes back to the craft's
 * true place with a dissolve over FAST_FORWARD_HANDBACK_SECONDS of real time:
 * it fades out where it stands in and fades in at its true place, moving at
 * HANDBACK_SWITCH of the way through, with nothing drawn, so it is never seen
 * to jump. A stand-in within HANDBACK_EASE_DEG of its true place (round the
 * body) eases across instead, drawn all the while.
 */
export const FAST_FORWARD_HANDBACK_SECONDS = 0.5;
export const HANDBACK_SWITCH = 0.5;
export const HANDBACK_EASE_DEG = 4;

/** How visible the model is a share `progress` of the way through a hand-back that dips: fully at either end, not at all at the switch. */
export function handBackOpacity(progress: number): number {
  const p = clamp01(progress);
  return p < HANDBACK_SWITCH
    ? 1 - smooth(p / HANDBACK_SWITCH)
    : smooth((p - HANDBACK_SWITCH) / (1 - HANDBACK_SWITCH));
}

/**
 * A hand-back's progress `dt` seconds of real time on (back toward 0 for a
 * negative `dt`: fast forward came back before the model moved). A step
 * across the switch stops on it, so one frame is drawn with the model hidden
 * at the switch however long the frames are: it leaves one place and appears
 * at the other unseen.
 */
export function stepHandBack(progress: number, dt: number): number {
  const next = clamp01(progress + dt / FAST_FORWARD_HANDBACK_SECONDS);
  const crosses =
    (progress < HANDBACK_SWITCH && next > HANDBACK_SWITCH) ||
    (progress > HANDBACK_SWITCH && next < HANDBACK_SWITCH);
  return crosses ? HANDBACK_SWITCH : next;
}

/**
 * Whether a stand-in at `standIn` is close enough to its craft's true place
 * `truePlace` to ease across to it without dipping out and in: no farther
 * from it than an arc of HANDBACK_EASE_DEG round the body's center `center`
 * at the craft's distance from it.
 */
export function handBackEases(
  standIn: ArrayLike<number>,
  truePlace: ArrayLike<number>,
  center: ArrayLike<number>,
): boolean {
  let apart = 0;
  let radius = 0;
  for (let c = 0; c < 3; c += 1) {
    apart += ((standIn[c] ?? 0) - (truePlace[c] ?? 0)) ** 2;
    radius += ((truePlace[c] ?? 0) - (center[c] ?? 0)) ** 2;
  }
  return Math.sqrt(apart) <= Math.sqrt(radius) * ((HANDBACK_EASE_DEG * Math.PI) / 180);
}
