/**
 * Two-body (Kepler) motion: ellipses and hyperbolas about one body, plus a
 * Lambert solver (the conic that joins two points in a given time).
 *
 * Units are whatever the caller uses consistently; the model uses
 * kilometers and seconds.
 */
import {
  addScaled,
  cross,
  dot,
  length,
  normalize,
  scale,
  sub,
  vec3,
  type Vec3,
} from "./vec.ts";

const TWO_PI = 2 * Math.PI;

function solveElliptic(M: number, e: number): number {
  // M in [-pi, pi]. Newton from a start that converges for any e < 1.
  if (M === 0) return 0;
  let E = e < 0.8 ? M : Math.sign(M) * Math.PI;
  for (let i = 0; i < 60; i++) {
    const f = E - e * Math.sin(E) - M;
    const step = f / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-14) break;
  }
  return E;
}

function solveHyperbolic(M: number, e: number): number {
  if (M === 0) return 0;
  let F = Math.sign(M) * Math.log((2 * Math.abs(M)) / e + 1.8);
  for (let i = 0; i < 100; i++) {
    const f = e * Math.sinh(F) - F - M;
    const step = f / (e * Math.cosh(F) - 1);
    F -= step;
    if (Math.abs(step) < 1e-14 * Math.max(1, Math.abs(F))) break;
  }
  return F;
}

/** A Kepler orbit: an ellipse (e < 1) or a hyperbola (e > 1) about a body. */
export class Conic {
  /** Gravitational parameter of the central body. */
  readonly mu: number;
  /** Semilatus rectum. */
  readonly p: number;
  readonly e: number;
  /** Semimajor axis; negative for a hyperbola. */
  readonly a: number;
  /** Mean motion, radians per second. */
  readonly n: number;
  /** Unit vectors: toward periapsis, 90 degrees ahead of it, and the orbit normal. */
  readonly pHat: Vec3;
  readonly qHat: Vec3;
  readonly normal: Vec3;
  /** Mean anomaly at time t0 (unwrapped: may exceed 2 pi). */
  readonly t0: number;
  readonly M0: number;

  constructor(options: {
    mu: number;
    p: number;
    e: number;
    pHat: Vec3;
    normal: Vec3;
    t0: number;
    M0: number;
  }) {
    this.mu = options.mu;
    this.p = options.p;
    this.e = options.e;
    this.a = options.p / (1 - options.e * options.e);
    this.n = Math.sqrt(options.mu / Math.abs(this.a * this.a * this.a));
    this.pHat = normalize(vec3(), options.pHat);
    this.normal = normalize(vec3(), options.normal);
    this.qHat = cross(vec3(), this.normal, this.pHat);
    this.t0 = options.t0;
    this.M0 = options.M0;
  }

  /** The conic through a position and velocity at time t0. */
  static fromState(r: Readonly<Vec3>, v: Readonly<Vec3>, mu: number, t0: number): Conic {
    const h = cross(vec3(), r, v);
    const hMag = length(h);
    const rMag = length(r);
    const eVec = cross(vec3(), v, h);
    scale(eVec, eVec, 1 / mu);
    addScaled(eVec, eVec, r, -1 / rMag);
    const e = length(eVec);
    const pHat = e > 1e-10 ? scale(vec3(), eVec, 1 / e) : scale(vec3(), r, 1 / rMag);
    const normal = scale(vec3(), h, 1 / hMag);
    const qHat = cross(vec3(), normal, pHat);
    const nu = Math.atan2(dot(r, qHat), dot(r, pHat));
    const conic = new Conic({ mu, p: (hMag * hMag) / mu, e, pHat, normal, t0, M0: 0 });
    return new Conic({ mu, p: conic.p, e, pHat, normal, t0, M0: conic.meanFromTrue(nu) });
  }

  get isHyperbolic(): boolean {
    return this.e > 1;
  }

  get periapsis(): number {
    return this.p / (1 + this.e);
  }

  get apoapsis(): number {
    return this.e < 1 ? this.p / (1 - this.e) : Infinity;
  }

  /** Orbital period in seconds (Infinity for a hyperbola). */
  get period(): number {
    return this.e < 1 ? TWO_PI / this.n : Infinity;
  }

  meanAt(t: number): number {
    return this.M0 + this.n * (t - this.t0);
  }

  /** True anomaly for a mean anomaly. Unwrapped: whole turns carry over. */
  trueFromMean(M: number): number {
    if (this.e < 1) {
      const k = Math.round(M / TWO_PI);
      const Mw = M - k * TWO_PI;
      const E = solveElliptic(Mw, this.e);
      const nu = 2 * Math.atan2(
        Math.sqrt(1 + this.e) * Math.sin(E / 2),
        Math.sqrt(1 - this.e) * Math.cos(E / 2),
      );
      return nu + k * TWO_PI;
    }
    const F = solveHyperbolic(M, this.e);
    return 2 * Math.atan(Math.sqrt((this.e + 1) / (this.e - 1)) * Math.tanh(F / 2));
  }

  /** Mean anomaly for a true anomaly. Unwrapped: whole turns carry over. */
  meanFromTrue(nu: number): number {
    if (this.e < 1) {
      const k = Math.round(nu / TWO_PI);
      const nw = nu - k * TWO_PI;
      const E = 2 * Math.atan2(
        Math.sqrt(1 - this.e) * Math.sin(nw / 2),
        Math.sqrt(1 + this.e) * Math.cos(nw / 2),
      );
      return E - this.e * Math.sin(E) + k * TWO_PI;
    }
    const F = 2 * Math.atanh(Math.sqrt((this.e - 1) / (this.e + 1)) * Math.tan(nu / 2));
    return this.e * Math.sinh(F) - F;
  }

  radiusAtTrue(nu: number): number {
    return this.p / (1 + this.e * Math.cos(nu));
  }

  /** Position for a true anomaly. */
  positionAtTrue(nu: number, out: Vec3): Vec3 {
    const r = this.radiusAtTrue(nu);
    const c = Math.cos(nu) * r;
    const s = Math.sin(nu) * r;
    out[0] = this.pHat[0] * c + this.qHat[0] * s;
    out[1] = this.pHat[1] * c + this.qHat[1] * s;
    out[2] = this.pHat[2] * c + this.qHat[2] * s;
    return out;
  }

  velocityAtTrue(nu: number, out: Vec3): Vec3 {
    const k = Math.sqrt(this.mu / this.p);
    const a = -Math.sin(nu) * k;
    const b = (this.e + Math.cos(nu)) * k;
    out[0] = this.pHat[0] * a + this.qHat[0] * b;
    out[1] = this.pHat[1] * a + this.qHat[1] * b;
    out[2] = this.pHat[2] * a + this.qHat[2] * b;
    return out;
  }

  position(t: number, out: Vec3): Vec3 {
    return this.positionAtTrue(this.trueFromMean(this.meanAt(t)), out);
  }

  velocity(t: number, out: Vec3): Vec3 {
    return this.velocityAtTrue(this.trueFromMean(this.meanAt(t)), out);
  }

  /**
   * The time when the conic is at distance `r`, on the inbound (branch -1)
   * or outbound (branch +1) side of the periapsis pass nearest to t0.
   * Returns NaN when the conic never reaches that distance.
   */
  timeAtRadius(r: number, branch: -1 | 1): number {
    const cosNu = (this.p / r - 1) / this.e;
    if (cosNu < -1 || cosNu > 1) return NaN;
    const nu = branch * Math.acos(cosNu);
    let M = this.meanFromTrue(nu);
    if (this.e < 1) {
      // The periapsis pass nearest t0.
      const turns = Math.round(this.M0 / TWO_PI);
      M += turns * TWO_PI;
    }
    return this.t0 + (M - this.M0) / this.n;
  }
}

function stumpffC2(psi: number): number {
  if (psi > 1e-6) return (1 - Math.cos(Math.sqrt(psi))) / psi;
  if (psi < -1e-6) return (Math.cosh(Math.sqrt(-psi)) - 1) / -psi;
  return 0.5 - psi / 24;
}

function stumpffC3(psi: number): number {
  if (psi > 1e-6) {
    const s = Math.sqrt(psi);
    return (s - Math.sin(s)) / (s * s * s);
  }
  if (psi < -1e-6) {
    const s = Math.sqrt(-psi);
    return (Math.sinh(s) - s) / (s * s * s);
  }
  return 1 / 6 - psi / 120;
}

/**
 * Lambert's problem: the velocities at r1 and r2 of the conic that leaves r1
 * and reaches r2 after `tof` seconds, going the short way around (less than
 * one half turn) when `shortWay` is true. Universal-variable method with
 * bisection (Vallado, "Fundamentals of Astrodynamics and Applications").
 */
export function solveLambert(
  r1: Readonly<Vec3>,
  r2: Readonly<Vec3>,
  tof: number,
  mu: number,
  shortWay: boolean,
): { v1: Vec3; v2: Vec3 } {
  const r1Mag = length(r1);
  const r2Mag = length(r2);
  const cosDnu = dot(r1, r2) / (r1Mag * r2Mag);
  const tm = shortWay ? 1 : -1;
  const A = tm * Math.sqrt(r1Mag * r2Mag * (1 + cosDnu));
  if (Math.abs(A) < 1e-12) throw new Error("Lambert: the two points are opposite each other");

  let psi = 0;
  let c2 = 0.5;
  let c3 = 1 / 6;
  let psiUp = 4 * Math.PI * Math.PI;
  let psiLow = -4 * Math.PI * Math.PI;
  let y = 0;
  const sqrtMu = Math.sqrt(mu);
  for (let i = 0; i < 500; i++) {
    y = r1Mag + r2Mag + (A * (psi * c3 - 1)) / Math.sqrt(c2);
    if (A > 0 && y < 0) {
      // Raise the lower bound until y is positive.
      psiLow = psi;
      psi = (psiUp + psiLow) / 2;
      c2 = stumpffC2(psi);
      c3 = stumpffC3(psi);
      continue;
    }
    const chi = Math.sqrt(y / c2);
    const t = (chi * chi * chi * c3 + A * Math.sqrt(y)) / sqrtMu;
    if (Math.abs(t - tof) < 1e-9 * Math.max(1, tof)) break;
    if (t <= tof) psiLow = psi;
    else psiUp = psi;
    psi = (psiUp + psiLow) / 2;
    c2 = stumpffC2(psi);
    c3 = stumpffC3(psi);
  }
  const f = 1 - y / r1Mag;
  const g = A * Math.sqrt(y / mu);
  const gDot = 1 - y / r2Mag;
  const v1 = sub(vec3(), r2, scale(vec3(), r1, f));
  scale(v1, v1, 1 / g);
  const v2 = sub(vec3(), scale(vec3(), r2, gDot), r1);
  scale(v2, v2, 1 / g);
  return { v1, v2 };
}
