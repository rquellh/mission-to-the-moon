/**
 * Builds a flight path from a flight plan (types.ts describes the plan;
 * index.ts lists the public API). What each phase kind becomes:
 *
 * - orbit: a Kepler orbit of the published size (period from size), pinned
 *   to the published position at its start and, with a small smooth phase
 *   and plane correction, at its end (AnchoredOrbit): at a published fix,
 *   at a published range behind another ship, or where a coast from a
 *   published state begins after the next burn. Earth orbits also turn
 *   steadily with Earth's bulge (J2: the plane swings west, and the craft
 *   runs slightly fast in its orbit).
 * - burn: a smooth blend from the orbit or coast before into the one after.
 * - transfer: a Lambert arc about Earth from the published Earth fix to a
 *   patch point on a conic about the Moon through the published lunar fix,
 *   cross-faded near the Moon. Kepler timing throughout, so it is fast near
 *   Earth, slow far out, and arrives exactly on time.
 * - coast: the Kepler conic from the previous phase to the published end
 *   point (a Lambert arc), or, when the end is a full published state, the
 *   conic through that state.
 * - ascent, descent, entry: smooth curves in body-fixed coordinates between
 *   the surface site (or splashdown) and the neighboring orbit or coast.
 * - surface (on the Moon or Earth, turning with the ground), docked,
 *   rendezvous: a fixed site, another ship's position, or the craft's own
 *   orbit blended into the other ship's (complete when it comes alongside).
 *
 * Mission times may be negative (a target launched before the crew).
 *
 * Between published anchors the path is an illustration, not a
 * reconstruction of the flown trajectory.
 */
import {
  EARTH_EQUATORIAL_RADIUS_KM,
  EARTH_GM_KM3_PER_S2,
  EARTH_J2,
  EARTH_MEAN_RADIUS_KM,
  EARTH_MOON_DISTANCE,
  FOOT_KM,
  MOON_GM_KM3_PER_S2,
  MOON_MEAN_RADIUS_KM,
  NAUTICAL_MILE_KM,
} from "../content/physical-constants.ts";
import { elapsedToSeconds } from "../content/types.ts";
import {
  bodyFixedDirection,
  EARTH_SPIN_RATE,
  ellipsoidRadius,
  geocentricToGeodetic,
  geodeticToGeocentric,
  moonFixedDirection,
  Sky,
} from "./frames.ts";
import { Conic, solveLambert } from "./kepler.ts";
import {
  AnchoredOrbit,
  bodyFixedState,
  bodyInertialState,
  BurnBlend,
  ConicSegment,
  Converge,
  directionRate,
  Follow,
  radiusRate,
  SurfacePoint,
  SurfaceRelativePath,
  TransferBlend,
  type Oblateness,
  type OrbitReference,
  type PathKnot,
  type Segment,
} from "./segments.ts";
import type {
  BodyId,
  CoastPhase,
  DescentPhase,
  EntryPhase,
  Fix,
  FlightPath,
  FlightPlan,
  LunarFix,
  LunarStateFix,
  OrbitPhase,
  Polyline,
  RendezvousPhase,
  Sense,
  ShipPlan,
  ShipTrack,
  StateFix,
  TransferPhase,
  AscentPhase,
  Vec3Out,
} from "./types.ts";
import {
  add,
  cross,
  DEG,
  dot,
  length,
  normalize,
  rotateAxis,
  rotateY,
  scale,
  smoothstep,
  sub,
  vec3,
  type Vec3,
} from "./vec.ts";
import { moonDistanceAtMix, toReadable } from "./warp.ts";

/* ------------------------------------------------------------------ */
/* Modeling choices (not published values).                            */
/* ------------------------------------------------------------------ */

/**
 * Where the Earth conic and the lunar conic of a transfer are joined,
 * measured from the Moon's center: the conics meet exactly at PATCH, and
 * the path cross-fades from one to the other between FAR and NEAR. About
 * the distance where the Moon's pull starts to dominate (its "sphere of
 * influence", roughly 66,000 km).
 */
const PATCH_RADIUS_KM = 10 * EARTH_MEAN_RADIUS_KM;
const FAR_RADIUS_KM = 18 * EARTH_MEAN_RADIUS_KM;
const NEAR_RADIUS_KM = 3 * EARTH_MEAN_RADIUS_KM;

/**
 * Height at which the drogue parachute opens, km, when the plan does not
 * give one (EntryPhase.drogueAltitude). Not in the cited tables; an
 * illustrative value. After it, the capsule drops straight down.
 */
const DROGUE_HEIGHT_KM = 7;

/**
 * Published ascent points this close to orbit insertion are left out; the
 * orbit's own position and velocity take over there.
 */
const TRACK_END_MARGIN_S = 30;

/** Altitude over which Earth latitudes ease from map (geodetic) to geocentric, km. */
const LATITUDE_EASE_KM = 40;

/** Lunar orbits are drawn in the Moon's equatorial plane. */
const MOON_NORTH: Readonly<Vec3> = [0, 1, 0];

const NM = NAUTICAL_MILE_KM;
const FPS = FOOT_KM;

function mu(body: BodyId): number {
  return body === "earth" ? EARTH_GM_KM3_PER_S2 : MOON_GM_KM3_PER_S2;
}

function hasLatitude(fix: Fix | LunarFix): fix is Fix {
  return (fix as Fix).latitude !== undefined;
}

interface ShipState {
  plan: ShipPlan;
  starts: number[];
  ends: number[];
  segments: (Segment | undefined)[];
  building: boolean[];
}

/** Diagnostics for tests and the sanity table. */
export interface BuildReport {
  sky: Sky;
  /** Per ship and phase: the built segment. */
  segment(shipId: string, phaseIndex: number): Segment;
}

export function buildFlightPath(plan: FlightPlan): FlightPath & { report: BuildReport } {
  const sky = new Sky(plan.sky);
  const sunScratch = vec3();
  const moonRefRadius = plan.moonReferenceRadius
    ? plan.moonReferenceRadius.value * NM
    : MOON_MEAN_RADIUS_KM;
  /** Earth's bulge turns Earth orbits (the Moon's is far weaker and left out). */
  const earthBulge: Oblateness = {
    pole: sky.earthPoleInertial(vec3()),
    j2: EARTH_J2,
    radius: EARTH_EQUATORIAL_RADIUS_KM,
  };

  function anchoredOrbit(
    body: BodyId,
    rp: number,
    ra: number,
    t0: number,
    t1: number,
    reference: OrbitReference,
    endDirection?: Readonly<Vec3>,
  ): AnchoredOrbit {
    return new AnchoredOrbit(sky, body, mu(body), rp, ra, t0, t1, reference, endDirection, body === "earth" ? earthBulge : undefined);
  }

  const ships: ShipState[] = plan.ships.map((shipPlan) => {
    const starts = shipPlan.phases.map((p) => elapsedToSeconds(p.start.value));
    const ends = shipPlan.phases.map((p) => elapsedToSeconds(p.end.value));
    for (let i = 0; i < starts.length; i++) {
      if (!(ends[i]! > starts[i]!)) {
        throw new Error(`${shipPlan.id} phase ${i} (${shipPlan.phases[i]!.label}) ends before it starts`);
      }
      if (i > 0 && Math.abs(starts[i]! - ends[i - 1]!) > 1e-6) {
        throw new Error(`${shipPlan.id} phase ${i} (${shipPlan.phases[i]!.label}) does not start where the previous phase ends`);
      }
    }
    return {
      plan: shipPlan,
      starts,
      ends,
      segments: shipPlan.phases.map(() => undefined),
      building: shipPlan.phases.map(() => false),
    };
  });
  const shipIndex = new Map(plan.ships.map((s, i) => [s.id, i]));

  function shipById(id: string): ShipState {
    const i = shipIndex.get(id);
    if (i === undefined) throw new Error(`Unknown ship "${id}"`);
    return ships[i]!;
  }

  function phaseIndexAt(ship: ShipState, t: number): number {
    const { starts, ends } = ship;
    if (t < starts[0]! || t > ends[ends.length - 1]!) return -1;
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= t) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function shipPositionKm(ship: ShipState, t: number, out: Vec3): Vec3 {
    let i = phaseIndexAt(ship, t);
    if (i < 0) i = t < ship.starts[0]! ? 0 : ship.starts.length - 1;
    return segment(ship, i).evaluate(t, out);
  }

  function follower(id: string): (t: number, out: Vec3) => Vec3 {
    const target = shipById(id);
    return (t, out) => shipPositionKm(target, t, out);
  }

  /* ---------------- fixes ---------------- */

  /** Geodetic (map) latitude of an Earth fix, radians. */
  function earthFixLatitude(fix: Fix): number {
    const lat = fix.latitude.value * DEG;
    return fix.latitudeKind === "geocentric" ? geocentricToGeodetic(lat) : lat;
  }

  /**
   * The latitude to draw an Earth fix at, radians. Earth is drawn as a
   * sphere with a map texture, so a point on the ground goes at its map
   * (geodetic) latitude; a point in space goes along its true direction from
   * Earth's center (geocentric latitude), which keeps orbit inclinations
   * right. In between, the latitude eases from one to the other with
   * altitude. The two differ by at most 0.19 degrees.
   */
  function earthFixDrawnLatitude(fix: Fix): number {
    const lat = fix.latitude.value * DEG;
    const geodetic = fix.latitudeKind === "geocentric" ? geocentricToGeodetic(lat) : lat;
    const geocentric = fix.latitudeKind === "geocentric" ? lat : geodeticToGeocentric(lat);
    const altitudeKm = (fix.altitude?.value ?? 0) * NM;
    return geocentric + (geodetic - geocentric) * Math.exp(-altitudeKm / LATITUDE_EASE_KM);
  }

  /**
   * Inertial position of an Earth fix at t, km: at the ellipsoid radius plus
   * its altitude, or on the drawn sphere when it is on the surface.
   */
  function earthFixInertial(fix: Fix, t: number): Vec3 {
    const r = fix.altitude
      ? ellipsoidRadius(earthFixLatitude(fix)) + fix.altitude.value * NM
      : EARTH_MEAN_RADIUS_KM;
    return sky.earthPointInertial(earthFixDrawnLatitude(fix), fix.longitude.value * DEG, r, t, vec3());
  }

  /** Inertial unit direction of an Earth fix at t. */
  function earthFixDirection(fix: Fix, t: number): Vec3 {
    return sky.earthPointInertial(earthFixDrawnLatitude(fix), fix.longitude.value * DEG, 1, t, vec3());
  }

  /**
   * Space-fixed (inertial) velocity of an Earth fix from speed, heading, and
   * flight-path angle. Values measured relative to the turning Earth
   * (`velocityFrame: "earth-fixed"`) have Earth's rotation added back.
   */
  function earthFixVelocity(fix: StateFix, r: Readonly<Vec3>): Vec3 | undefined {
    if (!fix.heading) return undefined;
    const up = normalize(vec3(), r);
    const pole = sky.earthPoleInertial(vec3());
    const north = normalize(vec3(), sub(vec3(), pole, scale(vec3(), up, dot(pole, up))));
    const east = cross(vec3(), north, up);
    const psi = fix.heading.value * DEG;
    const gamma = (fix.flightPathAngle?.value ?? 0) * DEG;
    const speed = (fix.speed?.value ?? 1) * FPS;
    const v = vec3();
    for (let k = 0; k < 3; k++) {
      v[k] = speed * (Math.cos(gamma) * (Math.cos(psi) * north[k]! + Math.sin(psi) * east[k]!) + Math.sin(gamma) * up[k]!);
    }
    if (fix.velocityFrame === "earth-fixed") {
      const spin = cross(vec3(), scale(vec3(), pole, EARTH_SPIN_RATE), r);
      add(v, v, spin);
    }
    return v;
  }

  /** True when a fix gives a full published state: position, speed, and direction of travel. */
  function isFullState(fix: StateFix): boolean {
    return fix.altitude !== undefined && fix.speed !== undefined && fix.flightPathAngle !== undefined && fix.heading !== undefined;
  }

  /** Moon-centered inertial direction of a lunar fix at t (equatorial plane). */
  function moonFixDirection(fix: LunarFix | Fix, t: number): Vec3 {
    const d = moonFixedDirection(0, fix.longitude.value * DEG, vec3());
    return rotateY(d, d, sky.moonLongitude(t));
  }

  function moonFixRadius(fix: LunarFix): number | undefined {
    return fix.altitude ? moonRefRadius + fix.altitude.value * NM : undefined;
  }

  function lunarNormal(sense: Sense): Vec3 {
    return sense === "prograde" ? vec3(...MOON_NORTH) : vec3(0, -1, 0);
  }

  /** True anomaly where an orbit of (rp, ra) has radius r, on the side given by `rising`. */
  function trueAnomalyAtRadius(rp: number, ra: number, r: number, rising: boolean): number {
    const e = (ra - rp) / (ra + rp);
    if (e < 1e-12) return 0;
    const p = (2 * ra * rp) / (ra + rp);
    const c = Math.min(1, Math.max(-1, (p / r - 1) / e));
    const nu = Math.acos(c);
    return rising ? nu : -nu;
  }

  function referenceFromState(
    rState: Readonly<Vec3>,
    vState: Readonly<Vec3>,
    t: number,
    rp: number,
    ra: number,
  ): OrbitReference {
    const direction = normalize(vec3(), rState);
    const normal = normalize(vec3(), cross(vec3(), rState, vState));
    const rising = dot(rState, vState) >= 0;
    return { t, direction, normal, trueAnomaly: trueAnomalyAtRadius(rp, ra, length(rState), rising) };
  }

  /* ---------------- segment builders ---------------- */

  function segment(ship: ShipState, i: number): Segment {
    const existing = ship.segments[i];
    if (existing) return existing;
    if (ship.building[i]) throw new Error(`${ship.plan.id} phase ${i}: circular dependency`);
    ship.building[i] = true;
    const built = buildSegment(ship, i);
    ship.segments[i] = built;
    ship.building[i] = false;
    return built;
  }

  function buildSegment(ship: ShipState, i: number): Segment {
    const phase = ship.plan.phases[i]!;
    const t0 = ship.starts[i]!;
    const t1 = ship.ends[i]!;
    switch (phase.kind) {
      case "orbit":
        return buildOrbit(ship, i, phase, t0, t1);
      case "burn": {
        if (i === 0 || i === ship.plan.phases.length - 1) {
          throw new Error(`${ship.plan.id} phase ${i}: a burn needs a phase before and after it`);
        }
        const before = segment(ship, i - 1);
        const after = segment(ship, i + 1);
        if (!before.extendable || !after.extendable) {
          throw new Error(`${ship.plan.id} phase ${i}: a burn must sit between orbits or coasts`);
        }
        return new BurnBlend(phase.body, before, after, t0, t1);
      }
      case "transfer":
        return buildTransfer(phase, t0, t1);
      case "coast":
        return buildCoast(ship, i, phase, t0, t1);
      case "ascent":
        return buildAscent(ship, i, phase, t0, t1);
      case "descent":
        return buildDescent(ship, i, phase, t0, t1);
      case "surface": {
        const dir = siteDirection(phase.body, phase.site);
        const radius = phase.body === "earth" ? EARTH_MEAN_RADIUS_KM : MOON_MEAN_RADIUS_KM;
        return new SurfacePoint(sky, phase.body, dir, radius, t0, t1);
      }
      case "entry":
        return buildEntry(ship, i, phase, t0, t1);
      case "rendezvous":
        return buildRendezvous(ship, i, phase, t0, t1);
      case "docked":
        return new Follow(follower(phase.target), t0, t1);
    }
  }

  /** Body-fixed unit direction of a surface site. */
  function siteDirection(body: BodyId, site: Fix): Vec3 {
    if (body === "earth") {
      return bodyFixedDirection(earthFixLatitude(site), site.longitude.value * DEG, vec3());
    }
    return moonFixedDirection(site.latitude.value * DEG, site.longitude.value * DEG, vec3());
  }

  function apsides(body: BodyId, phase: { apoapsis: { value: number }; periapsis: { value: number } }): [number, number] {
    const ref = body === "earth" ? EARTH_EQUATORIAL_RADIUS_KM : moonRefRadius;
    return [ref + phase.periapsis.value * NM, ref + phase.apoapsis.value * NM];
  }

  /** The orbit reference used when a phase starts right after a burn and has no published start. */
  function referenceAcrossBurn(ship: ShipState, i: number, body: BodyId, rp: number, ra: number): OrbitReference {
    const burnStart = ship.starts[i - 1]!;
    const burnEnd = ship.ends[i - 1]!;
    const before = segment(ship, i - 2);
    const tMid = (burnStart + burnEnd) / 2;
    const { r, v } = bodyInertialState(sky, body, before, tMid);
    return referenceFromState(r, v, tMid, rp, ra);
  }

  function buildOrbit(ship: ShipState, i: number, phase: OrbitPhase, t0: number, t1: number): AnchoredOrbit {
    const body = phase.body;
    const [rp, ra] = apsides(body, phase);
    const previous = i > 0 ? ship.plan.phases[i - 1]! : undefined;
    let reference: OrbitReference;

    if (phase.from) {
      // Undocking: start exactly where the other ship is, on its orbit if
      // this one has the same size.
      const target = shipById(phase.from);
      const targetSeg = segment(target, phaseIndexAt(target, t0));
      if (targetSeg instanceof AnchoredOrbit && targetSeg.body === body && shapeMatches(targetSeg, rp, ra)) {
        reference = continuation(targetSeg, t0);
      } else {
        const { r, v } = bodyInertialState(sky, body, targetSeg, t0);
        reference = referenceFromState(r, v, t0, rp, ra);
      }
    } else if (phase.startFix) {
      reference = fixReference(phase, phase.startFix, t0, rp, ra, ship, i);
    } else if (previous?.kind === "burn") {
      reference = referenceAcrossBurn(ship, i, body, rp, ra);
    } else if (previous) {
      const prevSeg = segment(ship, i - 1);
      if (prevSeg instanceof AnchoredOrbit) {
        if (prevSeg.body !== body || !shapeMatches(prevSeg, rp, ra)) {
          throw new Error(`${ship.plan.id} phase ${i} (${phase.label}): the orbit changes without a burn`);
        }
        reference = continuation(prevSeg, t0);
      } else {
        const { r, v } = bodyInertialState(sky, body, prevSeg, t0);
        reference = referenceFromState(r, v, t0, rp, ra);
      }
    } else {
      throw new Error(`${ship.plan.id} phase ${i}: an orbit needs a start fix, a previous phase, or "from"`);
    }

    let endDirection: Vec3 | undefined;
    if (phase.endFix && phase.endRange) {
      throw new Error(`${ship.plan.id} phase ${i} (${phase.label}): give an end fix or an end range, not both`);
    }
    if (phase.endFix) {
      endDirection =
        body === "earth" ? earthFixDirection(phase.endFix as Fix, t1) : moonFixDirection(phase.endFix, t1);
    } else if (phase.endRange) {
      endDirection = trailingDirection(ship, i, phase, t0, t1, rp, ra, reference);
    } else if (stateCoastAfterBurn(ship, i)) {
      // The coast after the next burn runs back from a published state, so
      // this orbit is pinned to end where that coast begins.
      const { r } = bodyInertialState(sky, body, segment(ship, i + 2), t1);
      endDirection = normalize(r, r);
    }
    return anchoredOrbit(body, rp, ra, t0, t1, reference, endDirection);
  }

  /**
   * The direction (body inertial) at which an orbit should end so that the
   * craft trails the target by the published range, in the target's orbit
   * plane. The craft's distance from the body there comes from its own
   * orbit, so the angle behind the target is refined a few times.
   */
  function trailingDirection(
    ship: ShipState,
    i: number,
    phase: OrbitPhase,
    t0: number,
    t1: number,
    rp: number,
    ra: number,
    reference: OrbitReference,
  ): Vec3 {
    const { target: targetId, range } = phase.endRange!;
    const body = phase.body;
    const target = shipById(targetId);
    const k = phaseIndexAt(target, t1);
    if (k < 0) throw new Error(`${ship.plan.id} phase ${i} (${phase.label}): "${targetId}" does not exist at the phase end`);
    const { r: rt, v: vt } = bodyInertialState(sky, body, segment(target, k), t1);
    const targetRadius = length(rt);
    const up = normalize(vec3(), rt);
    const normal = normalize(vec3(), cross(vec3(), rt, vt));
    const d = range.value * NM;
    let radius = length(anchoredOrbit(body, rp, ra, t0, t1, reference).inertialPosition(t1, vec3()));
    const direction = vec3();
    for (let pass = 0; pass < 4; pass++) {
      const c = (radius * radius + targetRadius * targetRadius - d * d) / (2 * radius * targetRadius);
      if (!(c <= 1 && c >= -1)) {
        throw new Error(`${ship.plan.id} phase ${i} (${phase.label}): the end range cannot be reached`);
      }
      rotateAxis(direction, up, normal, -Math.acos(c));
      const aimed = anchoredOrbit(body, rp, ra, t0, t1, reference, direction);
      radius = length(aimed.inertialPosition(t1, vec3()));
    }
    return direction;
  }

  /** True when an orbit has the size given by periapsis and apoapsis radii. */
  function shapeMatches(orbit: AnchoredOrbit, rp: number, ra: number): boolean {
    const e = (ra - rp) / (ra + rp);
    const p = (2 * ra * rp) / (ra + rp);
    return Math.abs(orbit.conic.p - p) < 1e-6 * p && Math.abs(orbit.conic.e - e) < 1e-9;
  }

  /** Continue an orbit of the same size exactly where it is at t. */
  function continuation(prev: AnchoredOrbit, t: number): OrbitReference {
    const p = prev.inertialPosition(t, vec3());
    return {
      t,
      direction: normalize(p, p),
      trueAnomaly: prev.trueAnomalyAt(t),
      normal: prev.normalAt(t, vec3()),
    };
  }

  function fixReference(
    phase: OrbitPhase,
    fix: StateFix | LunarStateFix,
    t0: number,
    rp: number,
    ra: number,
    ship: ShipState,
    i: number,
  ): OrbitReference {
    const body = phase.body;
    if (body === "earth") {
      if (!hasLatitude(fix)) throw new Error(`${ship.plan.id} phase ${i}: Earth fixes need a latitude`);
      const r = earthFixInertial(fix, t0);
      const v = earthFixVelocity(fix, r);
      let normal: Vec3;
      if (v) normal = normalize(vec3(), cross(vec3(), r, v));
      else if (i >= 2 && ship.plan.phases[i - 1]!.kind === "burn") {
        normal = referenceAcrossBurn(ship, i, body, rp, ra).normal;
      } else throw new Error(`${ship.plan.id} phase ${i}: an Earth orbit start fix needs a heading`);
      const rising = (fix.flightPathAngle?.value ?? 0) >= 0;
      return {
        t: t0,
        direction: normalize(vec3(), r),
        normal,
        trueAnomaly: trueAnomalyAtRadius(rp, ra, length(r), rising),
      };
    }
    const direction = moonFixDirection(fix, t0);
    const radius = moonFixRadius(fix) ?? (rp + ra) / 2;
    const rising = (fix.flightPathAngle?.value ?? 0) >= 0;
    return {
      t: t0,
      direction,
      normal: lunarNormal(phase.sense.value),
      trueAnomaly: trueAnomalyAtRadius(rp, ra, radius, rising),
    };
  }

  function buildTransfer(phase: TransferPhase, t0: number, t1: number): TransferBlend {
    const outbound = phase.to === "moon";
    const earthFix = phase.earthFix;
    const moonFix = phase.moonFix;
    if (!earthFix.altitude || !moonFix.altitude || !moonFix.speed || !moonFix.flightPathAngle) {
      throw new Error(`Transfer "${phase.label}": fixes need altitude, and the lunar fix speed and flight-path angle`);
    }
    const tE = earthFix.time ? elapsedToSeconds(earthFix.time.value) : outbound ? t0 : t1;
    const tM = moonFix.time ? elapsedToSeconds(moonFix.time.value) : outbound ? t1 : t0;

    // The lunar conic through the published lunar state.
    const rM = scale(vec3(), moonFixDirection(moonFix, tM), moonFixRadius(moonFix)!);
    const up = normalize(vec3(), rM);
    const horizontal = normalize(vec3(), cross(vec3(), lunarNormal(phase.lunarSense.value), up));
    const gamma = moonFix.flightPathAngle.value * DEG;
    const speed = moonFix.speed.value * FPS;
    const vM = vec3();
    for (let k = 0; k < 3; k++) vM[k] = speed * (Math.cos(gamma) * horizontal[k]! + Math.sin(gamma) * up[k]!);
    const moonConic = Conic.fromState(rM, vM, MOON_GM_KM3_PER_S2, tM);

    const branch = outbound ? -1 : 1;
    const patchTime = moonConic.timeAtRadius(PATCH_RADIUS_KM, branch);
    const farTime = moonConic.timeAtRadius(FAR_RADIUS_KM, branch);
    const nearTime = moonConic.timeAtRadius(NEAR_RADIUS_KM, branch);
    if (!Number.isFinite(patchTime) || !Number.isFinite(farTime) || !Number.isFinite(nearTime)) {
      throw new Error(`Transfer "${phase.label}": the lunar conic does not reach the patch distance`);
    }

    // The Earth conic: Lambert arc between the Earth fix and the patch point.
    const patch = add(vec3(), sky.moonCenterInertial(patchTime, vec3()), moonConic.position(patchTime, vec3()));
    const rE = earthFixInertial(earthFix, tE);
    const [r1, r2, ta, tb] = outbound ? [rE, patch, tE, patchTime] : [patch, rE, patchTime, tE];
    const turn = dot(cross(vec3(), r1, r2), MOON_NORTH);
    const prograde = phase.earthSense.value === "prograde";
    const shortWay = turn >= 0 === prograde;
    const { v1 } = solveLambert(r1, r2, tb - ta, EARTH_GM_KM3_PER_S2, shortWay);
    const earthConic = Conic.fromState(r1, v1, EARTH_GM_KM3_PER_S2, ta);
    return new TransferBlend(sky, earthConic, moonConic, t0, t1, farTime, nearTime);
  }

  /** True when phase i is followed by a burn and then a coast that ends at a full published Earth state. */
  function stateCoastAfterBurn(ship: ShipState, i: number): boolean {
    const phases = ship.plan.phases;
    const burn = phases[i + 1];
    const coast = phases[i + 2];
    return (
      burn?.kind === "burn" &&
      coast?.kind === "coast" &&
      coast.body === "earth" &&
      phases[i]!.kind === "orbit" &&
      (phases[i] as OrbitPhase).body === "earth" &&
      isFullState(coast.endFix)
    );
  }

  function buildCoast(ship: ShipState, i: number, phase: CoastPhase, t0: number, t1: number): ConicSegment {
    const body = phase.body;
    if (body === "earth" && isFullState(phase.endFix)) {
      // A full published state at the end: the coast is the Kepler conic
      // through it, run back to the start of the phase.
      const tFix = phase.endFix.time ? elapsedToSeconds(phase.endFix.time.value) : t1;
      const r = earthFixInertial(phase.endFix, tFix);
      const v = earthFixVelocity(phase.endFix, r)!;
      return new ConicSegment(sky, body, Conic.fromState(r, v, mu(body), tFix), t0, t1);
    }
    let r1: Vec3;
    let ta: number;
    if (i > 0 && ship.plan.phases[i - 1]!.kind === "burn" && i >= 2) {
      ta = (ship.starts[i - 1]! + ship.ends[i - 1]!) / 2;
      r1 = bodyInertialState(sky, body, segment(ship, i - 2), ta).r;
    } else if (i > 0) {
      ta = t0;
      r1 = bodyInertialState(sky, body, segment(ship, i - 1), ta).r;
    } else throw new Error(`${ship.plan.id} phase ${i}: a coast needs a previous phase`);
    const r2 =
      body === "earth"
        ? earthFixInertial(phase.endFix, t1)
        : scale(vec3(), moonFixDirection(phase.endFix, t1), moonFixRadius(phase.endFix) ?? MOON_MEAN_RADIUS_KM);
    const north = body === "earth" ? vec3(0, 1, 0) : vec3(...MOON_NORTH);
    const shortWay = dot(cross(vec3(), r1, r2), north) >= 0 === (phase.sense.value === "prograde");
    const { v1 } = solveLambert(r1, r2, t1 - ta, mu(body), shortWay);
    return new ConicSegment(sky, body, Conic.fromState(r1, v1, mu(body), ta), t0, t1);
  }

  function buildAscent(ship: ShipState, i: number, phase: AscentPhase, t0: number, t1: number): SurfaceRelativePath {
    const body = phase.body;
    const next = segment(ship, i + 1);
    const end = bodyFixedState(sky, body, next, t1);
    const surfaceRadius = body === "earth" ? EARTH_MEAN_RADIUS_KM : MOON_MEAN_RADIUS_KM;
    const knots: PathKnot[] = [{ t: t0, direction: siteDirection(body, phase.site), radius: surfaceRadius }];
    for (const point of phase.track ?? []) {
      if (!point.time || !point.altitude) throw new Error(`${ship.plan.id} phase ${i}: track points need a time and altitude`);
      const t = elapsedToSeconds(point.time.value);
      // Points just before insertion are left to the orbit itself, so the
      // climb joins the orbit without a kink.
      if (t <= t0 || t >= t1 - TRACK_END_MARGIN_S) continue;
      let direction: Vec3;
      let radius: number;
      if (body === "earth") {
        radius = ellipsoidRadius(earthFixLatitude(point)) + point.altitude.value * NM;
        direction = bodyFixedDirection(earthFixDrawnLatitude(point), point.longitude.value * DEG, vec3());
      } else {
        radius = moonRefRadius + point.altitude.value * NM;
        direction = moonFixedDirection(point.latitude.value * DEG, point.longitude.value * DEG, vec3());
      }
      knots.push({ t, direction, radius });
    }
    knots.push({ t: t1, direction: normalize(vec3(), end.r), radius: length(end.r) });
    const firstSecant = (knots[1]!.radius - knots[0]!.radius) / (knots[1]!.t - knots[0]!.t);
    return new SurfaceRelativePath(sky, body, knots, {
      startDirectionRate: vec3(0, 0, 0),
      endDirectionRate: directionRate(end.r, end.v, vec3()),
      // A lunar ascent starts with a vertical rise; an Earth ascent starts at rest.
      startRadiusRate: body === "moon" ? 2 * firstSecant : 0,
      endRadiusRate: radiusRate(end.r, end.v),
    });
  }

  function buildDescent(ship: ShipState, i: number, phase: DescentPhase, t0: number, t1: number): SurfaceRelativePath {
    const body = phase.body;
    const start = bodyFixedState(sky, body, segment(ship, i - 1), t0);
    const surfaceRadius = body === "earth" ? EARTH_MEAN_RADIUS_KM : MOON_MEAN_RADIUS_KM;
    const knots: PathKnot[] = [
      { t: t0, direction: normalize(vec3(), start.r), radius: length(start.r) },
      { t: t1, direction: siteDirection(body, phase.site), radius: surfaceRadius },
    ];
    return new SurfaceRelativePath(sky, body, knots, {
      startDirectionRate: limitDirectionRate(knots[0]!, knots[1]!, directionRate(start.r, start.v, vec3())),
      endDirectionRate: vec3(0, 0, 0),
      startRadiusRate: radiusRate(start.r, start.v),
      endRadiusRate: 0,
    });
  }

  function buildEntry(ship: ShipState, i: number, phase: EntryPhase, t0: number, t1: number): Segment {
    const start = bodyFixedState(sky, "earth", segment(ship, i - 1), t0);
    const tDrogue = phase.drogue ? elapsedToSeconds(phase.drogue.value) : t0 + 0.6 * (t1 - t0);
    const knots: PathKnot[] = [
      { t: t0, direction: normalize(vec3(), start.r), radius: length(start.r) },
      { t: tDrogue, direction: siteDirection("earth", phase.splashdown), radius: EARTH_MEAN_RADIUS_KM },
    ];
    // Height: falls from the entry interface toward the drogue height with
    // the arrival descent rate, levels off there, then drops under the
    // parachutes to the sea at splashdown.
    const h0 = length(start.r) - EARTH_MEAN_RADIUS_KM;
    const drogueHeight = phase.drogueAltitude ? phase.drogueAltitude.value * NM : DROGUE_HEIGHT_KM;
    const hd = Math.min(drogueHeight, h0 / 2);
    const rate0 = radiusRate(start.r, start.v);
    const k = Math.max(1, (-rate0 * (tDrogue - t0)) / (h0 - hd));
    const height = (t: number): number => {
      if (t <= tDrogue) {
        const u = Math.min(1, Math.max(0, (t - t0) / (tDrogue - t0)));
        return hd + (h0 - hd) * Math.pow(1 - u, k);
      }
      const u = Math.min(1, (t - tDrogue) / (t1 - tDrogue));
      return hd * (1 - smoothstep(u));
    };
    const path = new SurfaceRelativePath(
      sky,
      "earth",
      knots,
      {
        startDirectionRate: limitDirectionRate(knots[0]!, knots[1]!, directionRate(start.r, start.v, vec3())),
        endDirectionRate: vec3(0, 0, 0),
      },
      (t) => EARTH_MEAN_RADIUS_KM + height(t),
    );
    return {
      t0,
      t1,
      body: "earth",
      extendable: false,
      evaluate: (t, out) => path.evaluate(t, out),
    };
  }

  function buildRendezvous(ship: ShipState, i: number, phase: RendezvousPhase, t0: number, t1: number): Converge {
    const body = phase.body;
    const [rp, ra] = apsides(body, phase);
    let reference: OrbitReference;
    if (i >= 2 && ship.plan.phases[i - 1]!.kind === "burn") reference = referenceAcrossBurn(ship, i, body, rp, ra);
    else {
      const { r, v } = bodyInertialState(sky, body, segment(ship, i - 1), t0);
      reference = referenceFromState(r, v, t0, rp, ra);
    }
    const meet = phase.alongside ? elapsedToSeconds(phase.alongside.value) : t1;
    if (!(meet > t0 && meet <= t1)) {
      throw new Error(`${ship.plan.id} phase ${i} (${phase.label}): "alongside" must fall inside the phase`);
    }
    const own = anchoredOrbit(body, rp, ra, t0, t1, reference);
    return new Converge(body, own, follower(phase.target), t0, t1, meet);
  }

  /* ---------------- public API ---------------- */

  const R = EARTH_MEAN_RADIUS_KM;
  // Scratch storage, so position() and direction() allocate nothing.
  const scratchKm = vec3();
  const scratchFixed = vec3();
  const scratchRead = [0, 0, 0];
  const dirP = [0, 0, 0];
  const dirA = [0, 0, 0];
  const dirB = [0, 0, 0];
  const dirGA = [0, 0, 0];
  const dirGB = [0, 0, 0];
  const dirKm = vec3();

  /** A scene position in km, written out in Earth radii at scale mix `mix` (clamped to 0..1). */
  function applyMix(pKm: Readonly<Vec3>, mix: number, out: Vec3Out): void {
    const x = pKm[0] / R;
    const y = pKm[1] / R;
    const z = pKm[2] / R;
    if (mix >= 1) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      return;
    }
    toReadable(x, y, z, scratchRead);
    const m = Math.max(0, mix);
    out[0] = scratchRead[0]! + (x - scratchRead[0]!) * m;
    out[1] = scratchRead[1]! + (y - scratchRead[1]!) * m;
    out[2] = scratchRead[2]! + (z - scratchRead[2]!) * m;
  }

  function positionAt(ship: ShipState, t: number, mix: number, out: Vec3Out): void {
    applyMix(shipPositionKm(ship, t, scratchKm), mix, out);
  }

  /** Where the Earth-fixed point under scene position pKm (at time t) is at time t2. */
  function groundPointAt(pKm: Readonly<Vec3>, t: number, t2: number, mix: number, out: Vec3Out): void {
    sky.sceneToEarthFixed(pKm, t, scratchFixed);
    applyMix(sky.earthFixedToScene(scratchFixed, t2, scratchFixed), mix, out);
  }

  /** Writes the unit vector from the nearer body's center (at that mix) to p. */
  function localUp(p: Vec3Out, mix: number, out: Vec3Out): void {
    const moonX = moonDistanceAtMix(mix);
    const dE = Math.hypot(p[0]!, p[1]!, p[2]!);
    const dM = Math.hypot(p[0]! - moonX, p[1]!, p[2]!);
    const cx = dM < dE ? moonX : 0;
    const len = Math.min(dE, dM);
    out[0] = (p[0]! - cx) / len;
    out[1] = p[1]! / len;
    out[2] = p[2]! / len;
  }

  const tracks: ShipTrack[] = ships.map((s) => ({
    id: s.plan.id,
    name: s.plan.name,
    role: s.plan.role,
    start: s.starts[0]!,
    end: s.ends[s.ends.length - 1]!,
    phases: s.plan.phases,
  }));

  const polylines = new Map<string, Polyline>();

  const api: FlightPath & { report: BuildReport } = {
    start: Math.min(...tracks.map((t) => t.start)),
    end: Math.max(...tracks.map((t) => t.end)),
    ships: tracks,

    position(shipId, t, mix, out) {
      const i = shipIndex.get(shipId);
      if (i === undefined || !Number.isFinite(t)) return false;
      const ship = ships[i]!;
      if (t < ship.starts[0]! || t > ship.ends[ship.ends.length - 1]!) return false;
      positionAt(ship, t, Math.min(1, mix), out);
      return true;
    },

    direction(shipId, t, mix, out) {
      const i = shipIndex.get(shipId);
      if (i === undefined || !Number.isFinite(t)) return false;
      const ship = ships[i]!;
      const start = ship.starts[0]!;
      const end = ship.ends[ship.ends.length - 1]!;
      if (t < start || t > end) return false;
      const m = Math.max(0, Math.min(1, mix));
      const k = phaseIndexAt(ship, t);
      const phase = ship.plan.phases[k]!;
      positionAt(ship, t, m, dirP);
      if (phase.kind === "surface") {
        localUp(dirP, m, out);
        return true;
      }
      const h = 1;
      const ta = Math.max(start, t - h);
      const tb = Math.min(end, t + h);
      positionAt(ship, ta, m, dirA);
      positionAt(ship, tb, m, dirB);
      let vx = (dirB[0]! - dirA[0]!) / (tb - ta);
      let vy = (dirB[1]! - dirA[1]!) / (tb - ta);
      let vz = (dirB[2]! - dirA[2]!) / (tb - ta);
      // Near Earth's surface, show travel relative to the ground, easing
      // into travel in the scene frame by the end of the ascent (and out of
      // it over the entry).
      const groundRelative = phase.kind === "entry" || (phase.kind === "ascent" && phase.body === "earth");
      if (groundRelative) {
        const progress = (t - ship.starts[k]!) / (ship.ends[k]! - ship.starts[k]!);
        const groundWeight = phase.kind === "ascent" ? 1 - smoothstep(progress) : smoothstep(progress);
        shipPositionKm(ship, t, dirKm);
        groundPointAt(dirKm, t, ta, m, dirGA);
        groundPointAt(dirKm, t, tb, m, dirGB);
        vx -= (groundWeight * (dirGB[0]! - dirGA[0]!)) / (tb - ta);
        vy -= (groundWeight * (dirGB[1]! - dirGA[1]!)) / (tb - ta);
        vz -= (groundWeight * (dirGB[2]! - dirGA[2]!)) / (tb - ta);
      }
      const len = Math.hypot(vx, vy, vz);
      if (!(len > 1e-12)) {
        localUp(dirP, m, out);
        return true;
      }
      out[0] = vx / len;
      out[1] = vy / len;
      out[2] = vz / len;
      return true;
    },

    phaseAt(shipId, t) {
      const i = shipIndex.get(shipId);
      if (i === undefined) return undefined;
      const ship = ships[i]!;
      const k = phaseIndexAt(ship, t);
      return k < 0 ? undefined : ship.plan.phases[k];
    },

    earthSpinAngle(t) {
      const a = sky.spin(t) % (2 * Math.PI);
      return a < 0 ? a + 2 * Math.PI : a;
    },

    earthAxisAngle(t) {
      const a = -sky.moonLongitude(t) % (2 * Math.PI);
      return a <= -Math.PI ? a + 2 * Math.PI : a > Math.PI ? a - 2 * Math.PI : a;
    },

    sunDirection(t, out) {
      // Called every frame while playing, so it reuses one scratch vector.
      const d = sky.sunDirection(t, sunScratch);
      out[0] = d[0];
      out[1] = d[1];
      out[2] = d[2];
    },

    moonPosition(mix, out) {
      out[0] = moonDistanceAtMix(Math.max(0, Math.min(1, mix)));
      out[1] = 0;
      out[2] = 0;
    },

    polyline(shipId) {
      const i = shipIndex.get(shipId);
      if (i === undefined) return undefined;
      let line = polylines.get(shipId);
      if (!line) {
        line = samplePolyline(ships[i]!);
        polylines.set(shipId, line);
      }
      return line;
    },

    report: {
      sky,
      segment(shipId, phaseIndex) {
        return segment(shipById(shipId), phaseIndex);
      },
    },
  };

  /* ---------------- polylines ---------------- */

  function samplePolyline(ship: ShipState): Polyline {
    const times: number[] = [];
    const truePos: number[] = [];
    const readPos: number[] = [];
    const MAX_SAMPLES = 60_000;
    const pTrue = [0, 0, 0];
    const pRead = [0, 0, 0];

    function sample(t: number): [number[], number[]] {
      positionAt(ship, t, 1, pTrue);
      positionAt(ship, t, 0, pRead);
      return [pTrue.slice(), pRead.slice()];
    }

    function nearestBodyDistance(p: number[], moonX: number): number {
      const dE = Math.hypot(p[0]!, p[1]!, p[2]!);
      const dM = Math.hypot(p[0]! - moonX, p[1]!, p[2]!);
      return Math.min(dE, dM);
    }

    function needsSplit(a: number[], b: number[], mid: number[], moonX: number): boolean {
      const dx = mid[0]! - (a[0]! + b[0]!) / 2;
      const dy = mid[1]! - (a[1]! + b[1]!) / 2;
      const dz = mid[2]! - (a[2]! + b[2]!) / 2;
      const deviation = Math.hypot(dx, dy, dz);
      const tolerance = 0.0012 * Math.max(nearestBodyDistance(mid, moonX), 0.05);
      return deviation > tolerance;
    }

    function push(t: number, s: [number[], number[]]): void {
      times.push(t);
      truePos.push(s[0][0]!, s[0][1]!, s[0][2]!);
      readPos.push(s[1][0]!, s[1][1]!, s[1][2]!);
    }

    function refine(ta: number, a: [number[], number[]], tb: number, b: [number[], number[]], depth: number): void {
      const tm = (ta + tb) / 2;
      const m = sample(tm);
      const split =
        depth < 16 &&
        times.length < MAX_SAMPLES &&
        tb - ta > 0.05 &&
        (needsSplit(a[0], b[0], m[0], EARTH_MOON_DISTANCE) || needsSplit(a[1], b[1], m[1], moonDistanceAtMix(0)));
      if (split) {
        refine(ta, a, tm, m, depth + 1);
        refine(tm, m, tb, b, depth + 1);
      } else {
        push(tb, b);
      }
    }

    const phases = ship.plan.phases;
    let prevT = ship.starts[0]!;
    let prev = sample(prevT);
    push(prevT, prev);
    for (let k = 0; k < phases.length; k++) {
      const t0 = ship.starts[k]!;
      const t1 = ship.ends[k]!;
      const steps = initialSteps(ship, k);
      for (let s = 1; s <= steps; s++) {
        const t = s === steps ? t1 : t0 + ((t1 - t0) * s) / steps;
        const next = sample(t);
        refine(prevT, prev, t, next, 0);
        prevT = t;
        prev = next;
      }
    }
    return {
      times: Float64Array.from(times),
      truePositions: Float32Array.from(truePos),
      readablePositions: Float32Array.from(readPos),
    };
  }

  /** Starting subdivision of a phase before adaptive refinement. */
  function initialSteps(ship: ShipState, k: number): number {
    const phase = ship.plan.phases[k]!;
    const duration = ship.ends[k]! - ship.starts[k]!;
    switch (phase.kind) {
      case "surface":
        return 1;
      case "orbit":
      case "rendezvous":
      case "docked": {
        const period = orbitPeriodNear(ship, k) ?? 7200;
        return Math.max(4, Math.ceil((duration / period) * 48));
      }
      case "transfer":
        return 160;
      default:
        return 12;
    }
  }

  /**
   * The period of the orbit a phase moves on: its own orbit, the orbit it
   * converges from, or (docked) the orbit of the ship it is attached to.
   */
  function orbitPeriodNear(ship: ShipState, k: number): number | undefined {
    const phase = ship.plan.phases[k]!;
    let seg: Segment = segment(ship, k);
    if (phase.kind === "docked") {
      const target = shipById(phase.target);
      const j = phaseIndexAt(target, (ship.starts[k]! + ship.ends[k]!) / 2);
      if (j < 0) return undefined;
      seg = segment(target, j);
    }
    if (seg instanceof Converge) seg = seg.own;
    return seg instanceof AnchoredOrbit ? seg.conic.period : undefined;
  }

  // Build every segment now so errors surface at build time.
  for (const ship of ships) ship.segments.forEach((_, i) => segment(ship, i));

  return api;
}

/** Keeps a Hermite direction tangent from overshooting the chord (at most 3x). */
function limitDirectionRate(a: PathKnot, b: PathKnot, rate: Vec3): Vec3 {
  const angle = Math.acos(Math.min(1, Math.max(-1, dot(a.direction, b.direction))));
  const dt = b.t - a.t;
  const max = (3 * angle) / dt;
  const len = length(rate);
  if (len > max && len > 0) scale(rate, rate, max / len);
  return rate;
}

