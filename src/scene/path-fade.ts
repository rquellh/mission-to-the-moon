/**
 * Keeping a craft's path readable where it goes round and round a body,
 * apart from the scene so the rules can be tested: which stretches of a path
 * are stays in orbit, faded lap by lap (orbitStays; the fading itself is
 * PathFade in path-lines.ts, its distances ORBIT_FADE in stage.ts), which
 * one the craft is in (stayAt), how dim the way in to it is drawn
 * (wayDimming), and how
 * to read a value of the path at a point between two samples
 * (sampleIndexAt, valueAtIndex).
 *
 * Why every stay in orbit fades. The scene's frame turns with the Moon (see
 * src/sim/frames.ts), so each lap of an orbit is drawn a little turned from
 * the one before it, about a degree a lap, and the first laps of a stay can
 * be another shape altogether (Apollo's first two lunar orbits, before the
 * burn that made them round). Drawn all at once, the laps lay side by side
 * as near-copies of the ring the craft was on, and up close, in the ship
 * view, they ran beside the craft and into it: the owner saw "odd yellow
 * lines that connect to the ship". So a stay in orbit shows only the lap
 * through the craft.
 */

/**
 * A stretch of a path that stays low over one body (see orbitStays) is a
 * stay in orbit once it goes round more than this many times. Less is a
 * swing past (Apollo 13 round the Moon), a climb, or a fall to the ground,
 * which are drawn whole.
 */
export const ORBIT_STAY_REVOLUTIONS = 1;

/** Most stays one line fades (path-lines.ts has a slot for each). */
export const MAX_ORBIT_STAYS = 4;

/**
 * The stays in orbit along a path, as sample index ranges [first, last]:
 * each run of samples that are `low` over a body (the caller says which)
 * and go round it more than ORBIT_STAY_REVOLUTIONS times, by `revolutions`
 * (flown at each sample, never decreasing). At most MAX_ORBIT_STAYS, the
 * first ones.
 */
export function orbitStays(
  revolutions: ArrayLike<number>,
  low: ArrayLike<boolean>,
): Array<readonly [number, number]> {
  const n = Math.min(revolutions.length, low.length);
  const stays: Array<readonly [number, number]> = [];
  let first = -1;
  for (let i = 0; i <= n && stays.length < MAX_ORBIT_STAYS; i += 1) {
    const inside = i < n && low[i] === true;
    if (inside && first < 0) first = i;
    if (!inside && first >= 0) {
      const last = i - 1;
      const laps = (revolutions[last] as number) - (revolutions[first] as number);
      if (laps > ORBIT_STAY_REVOLUTIONS) stays.push([first, last]);
      first = -1;
    }
  }
  return stays;
}

/**
 * The way in to a stay in orbit (the path from Earth to the Moon, and all
 * before it) is drawn dimmer once the craft has gone round a while, so it
 * does not hang off the lap it is on as a bright tail where it joins it: it
 * dims as the craft goes from WAY_DIM_REVOLUTIONS[0] to [1] revolutions into
 * the stay (as the laps behind it fade), and comes back as it leaves, over
 * WAY_BACK_REVOLUTIONS past the stay's end. How dim is PATH_WAY_OPACITY in
 * config.ts. The way out, still to come, is dim already.
 */
export const WAY_DIM_REVOLUTIONS = [0.4, 0.65] as const;
export const WAY_BACK_REVOLUTIONS = 0.3;

/** How far the way in is dimmed (0 not, 1 fully), and the first sample after it (see wayDimming). */
export interface WayDimming {
  readonly before: number;
  readonly dim: number;
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const u = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return u * u * (3 - 2 * u);
};

/**
 * How the way in is drawn with the craft at a fractional sample index: the
 * samples before the start of the stay it is in, or last left, are dimmed
 * by `dim` (see WAY_DIM_REVOLUTIONS). Nothing is dimmed before the first
 * stay. `revolutions` are those flown at each sample.
 */
export function wayDimming(
  stays: ReadonlyArray<readonly [number, number]>,
  revolutions: ArrayLike<number>,
  index: number,
): WayDimming {
  let k = -1;
  for (let i = 0; i < stays.length; i += 1)
    if ((stays[i] as readonly [number, number])[0] <= index) k = i;
  if (k < 0) return { before: 0, dim: 0 };
  const [first, last] = stays[k] as readonly [number, number];
  const now = valueAtIndex(revolutions, index);
  const start = valueAtIndex(revolutions, first);
  const end = valueAtIndex(revolutions, last);
  const into = smoothstep(
    WAY_DIM_REVOLUTIONS[0],
    WAY_DIM_REVOLUTIONS[1],
    Math.min(now, end) - start,
  );
  const back = smoothstep(0, WAY_BACK_REVOLUTIONS, now - end);
  return { before: first, dim: into * (1 - back) };
}

/**
 * A craft that comes back near a body it left earlier (every flight's return
 * to Earth) flies in past what it drew there on the way out: the climb, the
 * lap kept of its parking orbit, and the leg out, which on Apollo starts over
 * the same ocean the craft comes home to. Up close those lines cross the
 * whole picture, run through the craft and cut across the body. So once the
 * craft is back, the lines of its earlier time near that body are not drawn
 * near it (see returnFade and PathLine's return fade).
 *
 * A sample is near the Moon within RETURN_MOON_ZONE_RADII of the Moon's radii
 * of its center at true scale, and near Earth anywhere else (see returnZone).
 * The zone holds every orbit flown round the Moon (the highest, the first
 * orbit after arrival, reach about 1.18 of its radii), so a craft in lunar
 * orbit never leaves it; leaving it, the craft is on its way home. So a
 * flight's return to Earth begins as it leaves lunar orbit, and the old lines
 * near Earth fade out as it climbs away from the Moon: none at the zone's
 * edge, all of them by RETURN_AWAY_MOON_RADII, and they stay gone all the way
 * in (see returnFade). On the way home into "Letting go of the service
 * module", the Ship view's turn toward its frame at the stop brings Earth
 * into the picture with the craft only about 2 Moon radii out. On the way
 * out, and in lunar orbit, nothing fades.
 */
export const RETURN_MOON_ZONE_RADII = 1.3;
export const RETURN_AWAY_MOON_RADII = 6;

/** Which body's neighbourhood a place `moonRadii` of the Moon's radii from its center is in: 2 the Moon's, 1 Earth's (see RETURN_MOON_ZONE_RADII). */
export function returnZone(moonRadii: number): number {
  return moonRadii < RETURN_MOON_ZONE_RADII ? 2 : 1;
}

/**
 * For each sample, the first sample of the stretch near one body that it is
 * in, when the path was near that body before that stretch began (a return);
 * otherwise -1 (a first visit, or near neither). `near` says which body each
 * sample is near: 0 neither, any other number a body.
 */
export function returnStarts(near: ArrayLike<number>): Int32Array {
  const n = near.length;
  const out = new Int32Array(n).fill(-1);
  const left = new Set<number>();
  let body = 0;
  let start = 0;
  for (let i = 0; i < n; i += 1) {
    const here = near[i] as number;
    if (here !== body) {
      if (body !== 0) left.add(body);
      body = here;
      start = i;
    }
    if (here !== 0 && left.has(here)) out[i] = start;
  }
  return out;
}

/**
 * How far the return fade is in, 0 to 1, for a craft `moonRadii` of the
 * Moon's radii from its center on a return to the body whose `zone` it is in
 * (see returnZone). To Earth, by its climb away from the Moon: from none at
 * the Moon's zone edge to all of it at RETURN_AWAY_MOON_RADII and beyond,
 * eased out over the distance's logarithm, so most of it goes while the craft
 * is still near the Moon (half of it by about 2 Moon radii). To the Moon (no
 * flight comes back to it), across its way in from the zone's edge to just
 * over its surface.
 */
export function returnFade(zone: number, moonRadii: number): number {
  if (zone === 2) return 1 - smoothstep(1.1, RETURN_MOON_ZONE_RADII, moonRadii);
  const span = Math.log(RETURN_AWAY_MOON_RADII / RETURN_MOON_ZONE_RADII);
  const t = Math.min(1, Math.max(0, Math.log(moonRadii / RETURN_MOON_ZONE_RADII) / span));
  return 1 - (1 - t) * (1 - t);
}

/** Which of `stays` (sample index ranges, as orbitStays gives them) a fractional sample index is in, or -1 for none. */
export function stayAt(stays: ReadonlyArray<readonly [number, number]>, index: number): number {
  return stays.findIndex(([first, last]) => index >= first && index <= last);
}

/**
 * Index position of mission time t along the samples: i + fraction when t
 * lies between sample i and i + 1; -1 before the first; the last index after.
 */
export function sampleIndexAt(times: ArrayLike<number>, t: number): number {
  const n = times.length;
  if (n === 0 || t < (times[0] as number)) return -1;
  if (t >= (times[n - 1] as number)) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] as number) <= t) lo = mid;
    else hi = mid;
  }
  const a = times[lo] as number;
  const b = times[hi] as number;
  return lo + (b > a ? (t - a) / (b - a) : 0);
}

/** The value of a per-sample array at a fractional sample index (clamped to the ends). */
export function valueAtIndex(values: ArrayLike<number>, index: number): number {
  const n = values.length;
  if (n === 0) return 0;
  if (index <= 0) return values[0] as number;
  if (index >= n - 1) return values[n - 1] as number;
  const i = Math.floor(index);
  const a = values[i] as number;
  const b = values[i + 1] as number;
  return a + (b - a) * (index - i);
}
