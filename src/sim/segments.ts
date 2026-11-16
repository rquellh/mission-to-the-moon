/**
 * Trajectory pieces. Each segment gives a position in the scene frame, in
 * kilometers, for any time in its phase; "extendable" segments (Kepler
 * orbits and coasts) also give sensible positions a little outside their
 * phase, which burns use to blend one orbit into the next.
 */
import type { BodyId } from "./types.ts";
import { Conic } from "./kepler.ts";
import { MOON_CENTER_KM, type Sky } from "./frames.ts";
import {
  addScaled,
  angleBetween,
  copy,
  cross,
  dot,
  length,
  lerp,
  normalize,
  rotateAxis,
  scale,
  set,
  slerpUnit,
  smoothstep,
  sub,
  vec3,
  type Vec3,
} from "./vec.ts";

export interface Segment {
  readonly t0: number;
  readonly t1: number;
  /** Central body the segment moves about, or null (docked: follows another ship). */
  readonly body: BodyId | null;
  /** Kepler-based segments can be evaluated outside [t0, t1]. */
  readonly extendable: boolean;
  /** Position in the scene frame, km. */
  evaluate(t: number, out: Vec3): Vec3;
}

export function bodyCenter(body: BodyId): Readonly<Vec3> {
  return body === "earth" ? ORIGIN : MOON_CENTER_KM;
}

const ORIGIN: Readonly<Vec3> = [0, 0, 0];

/**
 * Position relative to a body in its non-rotating frame: Earth-centered
 * inertial (I) for Earth, Moon-centered inertial for the Moon.
 */
export function toBodyInertial(sky: Sky, body: BodyId, p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
  return body === "earth" ? sky.sceneToInertial(p, t, out) : sky.sceneToMoonInertial(p, t, out);
}

export function fromBodyInertial(sky: Sky, body: BodyId, p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
  return body === "earth" ? sky.inertialToScene(p, t, out) : sky.moonInertialToScene(p, t, out);
}

/** State (position and velocity) relative to a body in its inertial frame. */
export function bodyInertialState(
  sky: Sky,
  body: BodyId,
  seg: Segment,
  t: number,
): { r: Vec3; v: Vec3 } {
  const h = 0.5;
  const a = toBodyInertial(sky, body, seg.evaluate(t - h, vec3()), t - h, vec3());
  const b = toBodyInertial(sky, body, seg.evaluate(t + h, vec3()), t + h, vec3());
  const r = toBodyInertial(sky, body, seg.evaluate(t, vec3()), t, vec3());
  const v = scale(vec3(), sub(vec3(), b, a), 1 / (2 * h));
  return { r, v };
}

/**
 * Position relative to the body in body-fixed axes: Earth-fixed (globe
 * coordinates) for Earth; for the Moon, which does not turn in the scene
 * frame, scene axes relative to the Moon's center.
 */
export function toBodyFixed(sky: Sky, body: BodyId, p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
  if (body === "earth") return sky.sceneToEarthFixed(p, t, out);
  return set(out, p[0] - MOON_CENTER_KM[0], p[1], p[2]);
}

export function fromBodyFixed(sky: Sky, body: BodyId, p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
  if (body === "earth") return sky.earthFixedToScene(p, t, out);
  return set(out, p[0] + MOON_CENTER_KM[0], p[1], p[2]);
}

/** Body-fixed position and velocity of a segment at t. */
export function bodyFixedState(sky: Sky, body: BodyId, seg: Segment, t: number): { r: Vec3; v: Vec3 } {
  const h = 0.5;
  const a = toBodyFixed(sky, body, seg.evaluate(t - h, vec3()), t - h, vec3());
  const b = toBodyFixed(sky, body, seg.evaluate(t + h, vec3()), t + h, vec3());
  const r = toBodyFixed(sky, body, seg.evaluate(t, vec3()), t, vec3());
  return { r, v: scale(vec3(), sub(vec3(), b, a), 1 / (2 * h)) };
}

/* ------------------------------------------------------------------ */

/** A Kepler conic about a body, fixed in that body's inertial frame. */
export class ConicSegment implements Segment {
  readonly extendable = true;
  readonly body: BodyId;
  readonly conic: Conic;
  readonly t0: number;
  readonly t1: number;
  private readonly sky: Sky;
  private readonly tmp = vec3();

  constructor(sky: Sky, body: BodyId, conic: Conic, t0: number, t1: number) {
    this.sky = sky;
    this.body = body;
    this.conic = conic;
    this.t0 = t0;
    this.t1 = t1;
  }

  evaluate(t: number, out: Vec3): Vec3 {
    this.conic.position(t, this.tmp);
    return fromBodyInertial(this.sky, this.body, this.tmp, t, out);
  }
}

export interface OrbitReference {
  /** Time of the reference point. */
  t: number;
  /** Unit vector toward the craft at that time (body inertial frame). */
  direction: Vec3;
  /** True anomaly at that time. */
  trueAnomaly: number;
  /** Unit orbit normal (body inertial frame). */
  normal: Vec3;
}

/**
 * The slow turning of an orbit by its body's equatorial bulge (the "J2"
 * term of its gravity field), averaged over each revolution: the orbit's
 * plane swings around the body's axis, and the craft's place in its orbit
 * runs slightly fast or slow. Standard first-order secular rates (Vallado,
 * "Fundamentals of Astrodynamics and Applications", section 9.6).
 */
export interface Oblateness {
  /** Unit vector along the body's spin axis, in its inertial frame. */
  pole: Readonly<Vec3>;
  j2: number;
  /** The body's equatorial radius, km. */
  radius: number;
}

/**
 * An orbit of published size (periapsis and apoapsis radii) whose position
 * is pinned to a reference point and, optionally, to a published direction
 * at the end of the phase. To meet the end fix it adds a smooth correction
 * to the mean anomaly and a smooth rotation of the orbit, both zero at the
 * phase start and complete at the phase end (and zero rate at both ends).
 * With `oblateness`, the orbit also turns steadily from the reference time
 * as the body's bulge turns it (see Oblateness).
 */
export class AnchoredOrbit implements Segment {
  readonly extendable = true;
  readonly conic: Conic;
  /** Mean-anomaly correction applied by the end of the phase, radians. */
  readonly phaseCorrection: number;
  /** Rotation applied by the end of the phase, radians, and its axis. */
  readonly planeCorrection: number;
  /** Steady drift from oblateness, radians per second: node, periapsis, mean anomaly. */
  readonly nodeRate: number;
  readonly periapsisRate: number;
  readonly meanAnomalyRate: number;
  readonly body: BodyId;
  readonly t0: number;
  readonly t1: number;
  private readonly sky: Sky;
  private readonly planeAxis: Vec3 = vec3(0, 1, 0);
  private readonly pole: Vec3 = vec3(0, 1, 0);
  private readonly tmp = vec3();

  constructor(
    sky: Sky,
    body: BodyId,
    mu: number,
    periapsisRadius: number,
    apoapsisRadius: number,
    t0: number,
    t1: number,
    reference: OrbitReference,
    endDirection?: Readonly<Vec3>,
    oblateness?: Oblateness,
  ) {
    this.sky = sky;
    this.body = body;
    this.t0 = t0;
    this.t1 = t1;
    const rp = Math.min(periapsisRadius, apoapsisRadius);
    const ra = Math.max(periapsisRadius, apoapsisRadius);
    const e = (ra - rp) / (ra + rp);
    const p = (2 * ra * rp) / (ra + rp);
    const pHat = rotateAxis(vec3(), reference.direction, reference.normal, -reference.trueAnomaly);
    const base = new Conic({ mu, p, e, pHat, normal: reference.normal, t0: reference.t, M0: 0 });
    this.conic = new Conic({
      mu,
      p,
      e,
      pHat,
      normal: reference.normal,
      t0: reference.t,
      M0: base.meanFromTrue(reference.trueAnomaly),
    });

    let nodeRate = 0;
    let periapsisRate = 0;
    let meanAnomalyRate = 0;
    if (oblateness) {
      const c = dot(this.conic.normal, oblateness.pole);
      const k = 0.75 * oblateness.j2 * (oblateness.radius / p) ** 2 * this.conic.n;
      nodeRate = -2 * k * c;
      periapsisRate = k * (5 * c * c - 1);
      meanAnomalyRate = k * Math.sqrt(1 - e * e) * (3 * c * c - 1);
      normalize(this.pole, oblateness.pole);
    }
    this.nodeRate = nodeRate;
    this.periapsisRate = periapsisRate;
    this.meanAnomalyRate = meanAnomalyRate;

    let phaseCorrection = 0;
    let planeCorrection = 0;
    if (endDirection) {
      const conic = this.conic;
      // Undo the drift's swing of the plane at t1, so the end direction can
      // be compared with the orbit as the conic describes it.
      const local = rotateAxis(vec3(), endDirection, this.pole, -this.drift(t1).node);
      const { periapsis } = this.drift(t1);
      const Mnat = conic.meanAt(t1) + this.drift(t1).mean;
      const nuNat = conic.trueFromMean(Mnat);
      const nuEnd = Math.atan2(dot(local, conic.qHat), dot(local, conic.pHat)) - periapsis;
      const turns = Math.round((nuNat - nuEnd) / (2 * Math.PI));
      const nuTarget = nuEnd + turns * 2 * Math.PI;
      phaseCorrection = conic.meanFromTrue(nuTarget) - Mnat;
      // Remaining out-of-plane offset: rotate the orbit about an axis in its plane.
      const d1 = conic.positionAtTrue(nuTarget, vec3());
      rotateAxis(d1, d1, conic.normal, periapsis);
      normalize(d1, d1);
      const axis = cross(vec3(), d1, local);
      const axisLen = length(axis);
      if (axisLen > 1e-12) {
        planeCorrection = angleBetween(d1, local);
        scale(this.planeAxis, axis, 1 / axisLen);
      }
    }
    this.phaseCorrection = phaseCorrection;
    this.planeCorrection = planeCorrection;
  }

  /** The oblateness drift since the reference time: node, periapsis, and mean anomaly, radians. */
  private drift(t: number): { node: number; periapsis: number; mean: number } {
    const dt = t - this.conic.t0;
    return { node: this.nodeRate * dt, periapsis: this.periapsisRate * dt, mean: this.meanAnomalyRate * dt };
  }

  /** Progress of the corrections at t: 0 before the phase, 1 after. */
  private progress(t: number): number {
    return smoothstep((t - this.t0) / (this.t1 - this.t0));
  }

  /** Mean anomaly at t, with the drift and the phase correction. */
  private meanAt(t: number): number {
    return this.conic.meanAt(t) + this.meanAnomalyRate * (t - this.conic.t0) + this.phaseCorrection * this.progress(t);
  }

  /** Position in the body's inertial frame, km. */
  inertialPosition(t: number, out: Vec3): Vec3 {
    const s = this.progress(t);
    this.conic.positionAtTrue(this.conic.trueFromMean(this.meanAt(t)), out);
    if (this.periapsisRate !== 0) rotateAxis(out, out, this.conic.normal, this.periapsisRate * (t - this.conic.t0));
    if (this.planeCorrection !== 0) rotateAxis(out, out, this.planeAxis, this.planeCorrection * s);
    if (this.nodeRate !== 0) rotateAxis(out, out, this.pole, this.nodeRate * (t - this.conic.t0));
    return out;
  }

  /** True anomaly (unwrapped) at t, including the drift and the phase correction. */
  trueAnomalyAt(t: number): number {
    return this.conic.trueFromMean(this.meanAt(t));
  }

  evaluate(t: number, out: Vec3): Vec3 {
    this.inertialPosition(t, this.tmp);
    return fromBodyInertial(this.sky, this.body, this.tmp, t, out);
  }

  /** Orbit normal at t (including the plane correction so far and the drift). */
  normalAt(t: number, out: Vec3): Vec3 {
    rotateAxis(out, this.conic.normal, this.planeAxis, this.planeCorrection * this.progress(t));
    if (this.nodeRate !== 0) rotateAxis(out, out, this.pole, this.nodeRate * (t - this.conic.t0));
    return out;
  }
}

/**
 * An engine burn: blends the trajectory before into the trajectory after,
 * around the central body (radius and direction interpolated separately so
 * the path never cuts inward). Position and velocity match both neighbors
 * at the ends.
 */
export class BurnBlend implements Segment {
  readonly extendable = false;
  readonly body: BodyId;
  readonly t0: number;
  readonly t1: number;
  private readonly before: Segment;
  private readonly after: Segment;
  private readonly a = vec3();
  private readonly b = vec3();

  constructor(body: BodyId, before: Segment, after: Segment, t0: number, t1: number) {
    this.body = body;
    this.before = before;
    this.after = after;
    this.t0 = t0;
    this.t1 = t1;
  }

  evaluate(t: number, out: Vec3): Vec3 {
    const w = smoothstep((t - this.t0) / (this.t1 - this.t0));
    const c = bodyCenter(this.body);
    sub(this.a, this.before.evaluate(t, this.a), c);
    sub(this.b, this.after.evaluate(t, this.b), c);
    const ra = length(this.a);
    const rb = length(this.b);
    scale(this.a, this.a, 1 / ra);
    scale(this.b, this.b, 1 / rb);
    slerpUnit(out, this.a, this.b, w);
    normalize(out, out);
    scale(out, out, ra + (rb - ra) * w);
    out[0] += c[0];
    out[1] += c[1];
    out[2] += c[2];
    return out;
  }
}

/**
 * The coast between Earth and the Moon: a conic about Earth and a conic about
 * the Moon, cross-faded while the craft is between `nearRadius` and
 * `farRadius` from the Moon (measured on the lunar conic).
 */
export class TransferBlend implements Segment {
  readonly extendable = true;
  readonly body = "earth" as const;
  readonly earthConic: Conic;
  readonly moonConic: Conic;
  readonly t0: number;
  readonly t1: number;
  /** Times on the lunar conic at the far and near ends of the cross-fade. */
  readonly farTime: number;
  readonly nearTime: number;
  private readonly sky: Sky;
  private readonly e = vec3();
  private readonly m = vec3();

  constructor(
    sky: Sky,
    earthConic: Conic,
    moonConic: Conic,
    t0: number,
    t1: number,
    farTime: number,
    nearTime: number,
  ) {
    this.sky = sky;
    this.earthConic = earthConic;
    this.moonConic = moonConic;
    this.t0 = t0;
    this.t1 = t1;
    this.farTime = farTime;
    this.nearTime = nearTime;
  }

  /** Weight of the lunar conic at t. */
  moonWeight(t: number): number {
    return smoothstep((t - this.farTime) / (this.nearTime - this.farTime));
  }

  evaluate(t: number, out: Vec3): Vec3 {
    const w = this.moonWeight(t);
    if (w < 1) {
      this.earthConic.position(t, this.e);
      this.sky.inertialToScene(this.e, t, this.e);
    }
    if (w > 0) {
      this.moonConic.position(t, this.m);
      this.sky.moonInertialToScene(this.m, t, this.m);
    }
    if (w <= 0) return copy(out, this.e);
    if (w >= 1) return copy(out, this.m);
    return lerp(out, this.e, this.m, w);
  }
}

/* ------------------------------------------------------------------ */
/* Paths given in body-fixed coordinates (ascent, descent, entry).      */
/* ------------------------------------------------------------------ */

function hermite(p0: number, m0: number, p1: number, m1: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
}

/** Fritsch-Carlson limit: keeps a cubic Hermite piece from overshooting. */
function limitSlope(slope: number, secant: number): number {
  if (secant === 0) return 0;
  if (Math.sign(slope) !== Math.sign(secant)) return 0;
  return Math.sign(secant) * Math.min(Math.abs(slope), 3 * Math.abs(secant));
}

export interface PathKnot {
  t: number;
  /** Unit direction from the body's center, body-fixed. */
  direction: Vec3;
  /** Distance from the body's center, km. */
  radius: number;
}

/**
 * A smooth path through knots in body-fixed coordinates: direction by a
 * cubic Hermite curve (normalized onto the unit sphere), radius by a
 * monotone cubic. End rates may be given to join neighbors smoothly.
 */
export class SurfaceRelativePath implements Segment {
  readonly extendable = false;
  readonly body: BodyId;
  private readonly sky: Sky;
  private readonly knots: PathKnot[];
  private readonly radiusOverride: ((t: number) => number) | undefined;
  private readonly dirTangents: Vec3[];
  private readonly radiusSlopes: number[];
  private readonly tmp = vec3();

  constructor(
    sky: Sky,
    body: BodyId,
    knots: PathKnot[],
    ends: {
      startDirectionRate?: Readonly<Vec3>;
      endDirectionRate?: Readonly<Vec3>;
      startRadiusRate?: number;
      endRadiusRate?: number;
    },
    radiusOverride?: (t: number) => number,
  ) {
    this.sky = sky;
    this.body = body;
    this.knots = knots;
    this.radiusOverride = radiusOverride;
    const n = knots.length;
    this.dirTangents = knots.map(() => vec3());
    this.radiusSlopes = knots.map(() => 0);
    for (let i = 0; i < n; i++) {
      const k = knots[i]!;
      if (i > 0 && i < n - 1) {
        const prev = knots[i - 1]!;
        const next = knots[i + 1]!;
        sub(this.dirTangents[i]!, next.direction, prev.direction);
        scale(this.dirTangents[i]!, this.dirTangents[i]!, 1 / (next.t - prev.t));
        const s0 = (k.radius - prev.radius) / (k.t - prev.t);
        const s1 = (next.radius - k.radius) / (next.t - k.t);
        this.radiusSlopes[i] = s0 * s1 <= 0 ? 0 : (2 * s0 * s1) / (s0 + s1);
      }
    }
    const first = knots[0]!;
    const second = knots[1]!;
    const last = knots[n - 1]!;
    const beforeLast = knots[n - 2]!;
    if (ends.startDirectionRate) copy(this.dirTangents[0]!, ends.startDirectionRate);
    else {
      sub(this.dirTangents[0]!, second.direction, first.direction);
      scale(this.dirTangents[0]!, this.dirTangents[0]!, 1 / (second.t - first.t));
    }
    if (ends.endDirectionRate) copy(this.dirTangents[n - 1]!, ends.endDirectionRate);
    else {
      sub(this.dirTangents[n - 1]!, last.direction, beforeLast.direction);
      scale(this.dirTangents[n - 1]!, this.dirTangents[n - 1]!, 1 / (last.t - beforeLast.t));
    }
    const firstSecant = (second.radius - first.radius) / (second.t - first.t);
    const lastSecant = (last.radius - beforeLast.radius) / (last.t - beforeLast.t);
    this.radiusSlopes[0] = limitSlope(ends.startRadiusRate ?? firstSecant, firstSecant);
    this.radiusSlopes[n - 1] = limitSlope(ends.endRadiusRate ?? lastSecant, lastSecant);
  }

  get t0(): number {
    return this.knots[0]!.t;
  }

  get t1(): number {
    return this.knots[this.knots.length - 1]!.t;
  }

  /** Body-fixed position, km. */
  bodyFixed(t: number, out: Vec3): Vec3 {
    const knots = this.knots;
    let i = 0;
    while (i < knots.length - 2 && t > knots[i + 1]!.t) i++;
    const a = knots[i]!;
    const b = knots[i + 1]!;
    const dt = b.t - a.t;
    const u = Math.min(1, Math.max(0, (t - a.t) / dt));
    const ta = this.dirTangents[i]!;
    const tb = this.dirTangents[i + 1]!;
    for (let k = 0; k < 3; k++) {
      out[k] = hermite(a.direction[k]!, ta[k]! * dt, b.direction[k]!, tb[k]! * dt, u);
    }
    normalize(out, out);
    const r = this.radiusOverride
      ? this.radiusOverride(t)
      : hermite(a.radius, this.radiusSlopes[i]! * dt, b.radius, this.radiusSlopes[i + 1]! * dt, u);
    return scale(out, out, r);
  }

  evaluate(t: number, out: Vec3): Vec3 {
    this.bodyFixed(t, this.tmp);
    return fromBodyFixed(this.sky, this.body, this.tmp, t, out);
  }
}

/** Sitting still on the surface. */
export class SurfacePoint implements Segment {
  readonly extendable = false;
  readonly body: BodyId;
  readonly t0: number;
  readonly t1: number;
  private readonly sky: Sky;
  private readonly fixed: Vec3;

  constructor(sky: Sky, body: BodyId, direction: Readonly<Vec3>, radius: number, t0: number, t1: number) {
    this.sky = sky;
    this.body = body;
    this.t0 = t0;
    this.t1 = t1;
    this.fixed = scale(vec3(), direction, radius);
  }

  evaluate(t: number, out: Vec3): Vec3 {
    return fromBodyFixed(this.sky, this.body, this.fixed, t, out);
  }
}

/** Following another ship's position (docked). */
export class Follow implements Segment {
  readonly extendable = false;
  readonly body = null;
  readonly t0: number;
  readonly t1: number;
  private readonly target: (t: number, out: Vec3) => Vec3;

  constructor(target: (t: number, out: Vec3) => Vec3, t0: number, t1: number) {
    this.target = target;
    this.t0 = t0;
    this.t1 = t1;
  }

  evaluate(t: number, out: Vec3): Vec3 {
    return this.target(t, out);
  }
}

/**
 * Closing in on another ship: the craft's own orbit, blended around the
 * body into the target's position so the two meet at `meet` (the phase end
 * unless given). From `meet` to the phase end the craft flies alongside
 * the target, at its position.
 */
export class Converge implements Segment {
  /** Before its start it is just the craft's own orbit, so a burn can lead into it. */
  readonly extendable = true;
  readonly body: BodyId;
  readonly t0: number;
  readonly t1: number;
  /** When the craft reaches the target. */
  readonly meet: number;
  /** The craft's own orbit, before the blend. */
  readonly own: Segment;
  private readonly target: (t: number, out: Vec3) => Vec3;
  private readonly a = vec3();
  private readonly b = vec3();

  constructor(
    body: BodyId,
    own: Segment,
    target: (t: number, out: Vec3) => Vec3,
    t0: number,
    t1: number,
    meet: number = t1,
  ) {
    this.body = body;
    this.own = own;
    this.target = target;
    this.t0 = t0;
    this.t1 = t1;
    this.meet = meet;
  }

  evaluate(t: number, out: Vec3): Vec3 {
    if (t >= this.meet) return this.target(t, out);
    const w = smoothstep((t - this.t0) / (this.meet - this.t0));
    const c = bodyCenter(this.body);
    sub(this.a, this.own.evaluate(t, this.a), c);
    sub(this.b, this.target(t, this.b), c);
    const ra = length(this.a);
    const rb = length(this.b);
    scale(this.a, this.a, 1 / ra);
    scale(this.b, this.b, 1 / rb);
    slerpUnit(out, this.a, this.b, w);
    normalize(out, out);
    scale(out, out, ra + (rb - ra) * w);
    return addScaled(out, c, out, 1);
  }
}

/** Rate of change of a unit direction, given a body-fixed position and velocity. */
export function directionRate(r: Readonly<Vec3>, v: Readonly<Vec3>, out: Vec3): Vec3 {
  const rMag = length(r);
  const radial = dot(r, v) / rMag;
  // d(r/|r|)/dt = (v - radial * r/|r|) / |r|
  addScaled(out, v, r, -radial / rMag);
  return scale(out, out, 1 / rMag);
}

/** Rate of change of the distance from the center. */
export function radiusRate(r: Readonly<Vec3>, v: Readonly<Vec3>): number {
  return dot(r, v) / length(r);
}
