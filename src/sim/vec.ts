/**
 * Small 3D vector helpers on plain number tuples. Functions that return a
 * vector write into an `out` argument, so hot paths can reuse storage.
 */

export type Vec3 = [number, number, number];

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return [x, y, z];
}

export function set(out: Vec3, x: number, y: number, z: number): Vec3 {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

export function copy(out: Vec3, a: Readonly<Vec3>): Vec3 {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}

export function add(out: Vec3, a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}

export function sub(out: Vec3, a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

export function scale(out: Vec3, a: Readonly<Vec3>, s: number): Vec3 {
  out[0] = a[0] * s;
  out[1] = a[1] * s;
  out[2] = a[2] * s;
  return out;
}

/** out = a + b * s */
export function addScaled(out: Vec3, a: Readonly<Vec3>, b: Readonly<Vec3>, s: number): Vec3 {
  out[0] = a[0] + b[0] * s;
  out[1] = a[1] + b[1] * s;
  out[2] = a[2] + b[2] * s;
  return out;
}

export function lerp(out: Vec3, a: Readonly<Vec3>, b: Readonly<Vec3>, t: number): Vec3 {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

export function dot(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(out: Vec3, a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

export function length(a: Readonly<Vec3>): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function distance(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function normalize(out: Vec3, a: Readonly<Vec3>): Vec3 {
  const len = length(a);
  if (len === 0) return set(out, 0, 0, 0);
  return scale(out, a, 1 / len);
}

/** Angle between two vectors, in radians (0 to pi). */
export function angleBetween(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  const c: Vec3 = [0, 0, 0];
  cross(c, a, b);
  return Math.atan2(length(c), dot(a, b));
}

/**
 * Rotation about +Y by `angle` radians, the three.js convention: a positive
 * angle carries +X toward -Z (counterclockwise seen from +Y).
 */
export function rotateY(out: Vec3, a: Readonly<Vec3>, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const x = a[0] * c + a[2] * s;
  const z = -a[0] * s + a[2] * c;
  out[0] = x;
  out[1] = a[1];
  out[2] = z;
  return out;
}

/** Rotation about +X by `angle` radians (right-handed: +Y toward +Z). */
export function rotateX(out: Vec3, a: Readonly<Vec3>, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const y = a[1] * c - a[2] * s;
  const z = a[1] * s + a[2] * c;
  out[0] = a[0];
  out[1] = y;
  out[2] = z;
  return out;
}

/** Rodrigues rotation of `a` about the unit vector `axis` by `angle` radians. */
export function rotateAxis(
  out: Vec3,
  a: Readonly<Vec3>,
  axis: Readonly<Vec3>,
  angle: number,
): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const kd = dot(axis, a) * (1 - c);
  const x = a[0] * c + (axis[1] * a[2] - axis[2] * a[1]) * s + axis[0] * kd;
  const y = a[1] * c + (axis[2] * a[0] - axis[0] * a[2]) * s + axis[1] * kd;
  const z = a[2] * c + (axis[0] * a[1] - axis[1] * a[0]) * s + axis[2] * kd;
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/**
 * Spherical interpolation between two unit vectors. Falls back to a
 * normalized linear blend when they are nearly parallel.
 */
export function slerpUnit(out: Vec3, a: Readonly<Vec3>, b: Readonly<Vec3>, t: number): Vec3 {
  const cosTheta = Math.min(1, Math.max(-1, dot(a, b)));
  const theta = Math.acos(cosTheta);
  if (theta < 1e-9) return normalize(out, lerp(out, a, b, t));
  const s = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / s;
  const wb = Math.sin(t * theta) / s;
  out[0] = a[0] * wa + b[0] * wb;
  out[1] = a[1] * wa + b[1] * wb;
  out[2] = a[2] * wa + b[2] * wb;
  return out;
}

/** Cubic smoothstep: 0 at u <= 0, 1 at u >= 1, zero slope at both ends. */
export function smoothstep(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return u * u * (3 - 2 * u);
}

/** Derivative of smoothstep with respect to u. */
export function smoothstepSlope(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  return 6 * u * (1 - u);
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Wraps an angle to (-pi, pi]. */
export function wrapPi(a: number): number {
  const twoPi = 2 * Math.PI;
  let r = a % twoPi;
  if (r <= -Math.PI) r += twoPi;
  else if (r > Math.PI) r -= twoPi;
  return r;
}

/** Wraps an angle to [0, 2pi). */
export function wrapTwoPi(a: number): number {
  const twoPi = 2 * Math.PI;
  const r = a % twoPi;
  return r < 0 ? r + twoPi : r;
}

export const DEG = Math.PI / 180;
