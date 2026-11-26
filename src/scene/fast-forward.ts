/**
 * Fast forward's two rules, apart from the scene so they can be tested:
 * when a craft laps its body too fast to be drawn (inFastForward), and the
 * ring that stands for it then, which must be a closed lap of its body
 * (closedLapStart, writeLap). See the fast-forward block in stage.ts for how
 * the scene uses them.
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
 * a chord.
 */
export function writeLap(
  path: LapPath,
  start: number,
  mix: number,
  out: Float32Array,
  count: number,
): void {
  const revolutions = path.revolutions;
  pointAt(path, indexAtValue(revolutions, start), mix, _a);
  pointAt(path, indexAtValue(revolutions, start + 1), mix, _end);
  for (let j = 0; j < count; j += 1) {
    const phase = j / count - start;
    const along = phase - Math.floor(phase);
    pointAt(path, indexAtValue(revolutions, start + along), mix, out, 3 * j);
    for (let c = 0; c < 3; c += 1) {
      out[3 * j + c] =
        (out[3 * j + c] as number) + along * ((_a[c] as number) - (_end[c] as number));
    }
  }
}
