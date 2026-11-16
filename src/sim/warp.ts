/**
 * The "readable" scale: a smooth warp of true-scale positions that brings the
 * Moon in to the scene's readable distance and lifts low orbits so they
 * read clearly, while keeping Earth's and the Moon's surfaces where they are.
 *
 *   readable(p) = k p + liftEarth(p) + liftMoon(p),   k = readable / true Moon distance
 *
 * Far from both bodies the warp is the uniform scaling k. Around each body a
 * radial term replaces it: a point at distance r from the body's center
 * moves to distance f(r) = k r + (R (1 - k) + A (1 - exp(-h / s))) C(h),
 * where h = r - R is the height above the surface and C(h) = (1 - h / H)^3
 * fades the term to nothing at height H. So:
 * - f(R) = R: surface points stay on the surface;
 * - small heights are lifted (slope about A / s near the surface);
 * - beyond height H, f(r) = k r exactly, so the Moon's center lands on the
 *   readable distance and the two regions never overlap.
 * f is strictly increasing (see the bound in readableRadius), so the warp
 * is one-to-one and keeps the order of distances from each body.
 *
 * All inputs and outputs are in Earth radii in the scene frame.
 */
import {
  EARTH_MOON_DISTANCE,
  EARTH_RADIUS,
  MOON_RADIUS,
} from "../content/physical-constants.ts";

/**
 * Earth-Moon distance at the readable scale, in Earth radii. Must equal
 * MOON_DISTANCE.readable in src/scene/config.ts (a test checks this).
 */
export const READABLE_MOON_DISTANCE = 10;

/** Uniform scale far from both bodies. */
export const WARP_SCALE = READABLE_MOON_DISTANCE / EARTH_MOON_DISTANCE;

export interface RadialLift {
  /** Body radius. */
  radius: number;
  /** Extra height added once the lift has saturated. */
  amount: number;
  /** Height over which the lift builds up. */
  buildUp: number;
  /** Height at which the warp returns to the uniform scale. */
  reach: number;
}

/**
 * Presentation choices (not facts). With these, a 100 nautical mile Earth
 * orbit reads about 0.19 Earth radii up, and a 60 nautical mile lunar orbit
 * about 0.37 Moon radii up.
 */
export const EARTH_LIFT: RadialLift = { radius: EARTH_RADIUS, amount: 0.5, buildUp: 0.06, reach: 38 };
export const MOON_LIFT: RadialLift = { radius: MOON_RADIUS, amount: 0.2, buildUp: 0.025, reach: 20 };

/**
 * Readable distance from a body's center for a true distance r. Strictly
 * increasing: its slope is at least k - (R (1 - k) + A) * 3 / H, which is
 * positive for both lifts above.
 */
export function readableRadius(r: number, lift: RadialLift): number {
  const h = r - lift.radius;
  const base = WARP_SCALE * r;
  if (h >= lift.reach) return base;
  const fade = 1 - h / lift.reach;
  const deviation =
    (lift.radius * (1 - WARP_SCALE) + lift.amount * (1 - Math.exp(-Math.max(h, 0) / lift.buildUp))) *
    fade * fade * fade;
  return base + deviation;
}

/** The radial displacement a lift adds at true distance r (zero beyond its reach). */
function liftOffset(r: number, lift: RadialLift): number {
  return readableRadius(r, lift) - WARP_SCALE * r;
}

/** Writes the readable-scale position of a true-scale point (Earth radii). */
export function toReadable(x: number, y: number, z: number, out: Float64Array | number[]): void {
  let rx = WARP_SCALE * x;
  let ry = WARP_SCALE * y;
  let rz = WARP_SCALE * z;

  const rE = Math.hypot(x, y, z);
  if (rE > 0 && rE - EARTH_LIFT.radius < EARTH_LIFT.reach) {
    const d = liftOffset(rE, EARTH_LIFT) / rE;
    rx += x * d;
    ry += y * d;
    rz += z * d;
  }

  const mx = x - EARTH_MOON_DISTANCE;
  const rM = Math.hypot(mx, y, z);
  if (rM > 0 && rM - MOON_LIFT.radius < MOON_LIFT.reach) {
    const d = liftOffset(rM, MOON_LIFT) / rM;
    rx += mx * d;
    ry += y * d;
    rz += z * d;
  }

  out[0] = rx;
  out[1] = ry;
  out[2] = rz;
}

/** The Moon's center at scale mix m (0 readable, 1 true). */
export function moonDistanceAtMix(mix: number): number {
  return READABLE_MOON_DISTANCE + (EARTH_MOON_DISTANCE - READABLE_MOON_DISTANCE) * mix;
}
