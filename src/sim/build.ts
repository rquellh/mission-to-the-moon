/**
 * Builds a flight path from a flight plan (types.ts describes the plan;
 * index.ts lists the public API). What each phase kind becomes:
 *
 * - orbit: a Kepler orbit of the published size (period from size), pinned
 *   to the published position at its start and, with a small smooth phase
 *   and plane correction, at its end (AnchoredOrbit): at a published fix,
 *   at a published range behind another ship, where a coast from a
 *   published state begins after the next burn, or where the fall from
 *   retrofire to the published splashdown begins (planFall). Its start may
 *   instead be placed from the launch site and inclination
 *   (launchReference) or relative to another ship (relativeReference). Its
 *   size may change slowly through published sizes (SizeSchedule). Earth
 *   orbits also turn steadily with Earth's bulge (J2: the plane swings
 *   west, and the craft runs slightly fast in its orbit).
 * - burn: a smooth blend from the phase before into the one after.
 * - transfer: a Lambert arc about Earth from the published Earth fix (or
 *   from a midcourse burn) to a patch point on a conic about the Moon
 *   through the published lunar fix, cross-faded near the Moon; or, split
 *   by a midcourse burn, a conic through a single published state. Kepler
 *   timing throughout, so it is fast near Earth, slow far out, and arrives
 *   exactly on time.
 * - coast: the Kepler conic from the previous phase to the published end
 *   point (a Lambert arc); when the end is a full published state, the
 *   conic through that state; with no end, the planned fall to the entry
 *   interface after retrofire, or a free coast on the previous path.
 * - ascent, descent, entry: smooth curves in body-fixed coordinates between
 *   the surface site (or splashdown) and the neighboring orbit or coast.
 *   An entry right after retrofire starts with the planned fall.
 * - surface (on the Moon or Earth, turning with the ground), docked,
 *   station, rendezvous: a fixed site, another ship's position, or the
 *   craft's own orbit blended into the other ship's (complete when it comes
 *   alongside).
 * - Lunar orbits lie in the Moon's equatorial plane, or in the plane over
 *   the landing site that the plan sets (FlightPlan.lunarOrbitPlane).
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
import { Conic, ellipticMeanFromTrue, solveLambert } from "./kepler.ts";
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
  SizeSchedule,
  SurfacePoint,
  SurfaceRelativePath,
  TransferBlend,
  type Oblateness,
  type OrbitReference,
  type PathKnot,
  type Segment,
  type SizeKnot,
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
  addScaled,
  clamp,
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

/**
 * How far downrange orbit insertion is when no insertion fix is published,
 * as a fraction of the distance the craft would cover at orbital speed over
 * the whole ascent. An illustration, fit to three published ascents:
 * Gemini VIII 0.44, its Atlas-Agena 0.56, Apollo 11 0.56.
 */
const DOWNRANGE_FRACTION = 0.5;

/**
 * The same for a lunar module's ascent from the Moon. An illustration, fit
 * to the one published lunar insertion point in our sources: Apollo 11's
 * ascent stage reached orbit 10.48 degrees west of Tranquility Base
 * (Mission Report Table 7-II), 0.44 of the way an orbit-speed craft would
 * have gone in its 7 minutes 15 seconds.
 */
const LUNAR_DOWNRANGE_FRACTION = 0.44;

/**
 * A lunar orbit after liftoff with a published end fix but no start fix is
 * started where its published size carries it to that end fix on time,
 * unless that is more than this far (radians) from the illustrative
 * insertion point: then the fix is reached with a correction instead.
 */
const LIFTOFF_SHIFT_LIMIT = 30 * DEG;

/**
 * Entry interface, the conventional top of the atmosphere for entry:
 * 400,000 feet above the ellipsoid. Used only when the plan gives no entry
 * state (an assumption, though the usual one in the sources).
 */
const ENTRY_INTERFACE_HEIGHT_KM = 400_000 * FOOT_KM;

/**
 * When no entry interface time is published: entry interface comes this
 * long before landing, or before the drogue parachute when its time is
 * published. Illustrations, from Gemini VIII (14 min 33 s before landing,
 * 9 min 54 s before the drogue) and Apollo 11 (15 min 29 s and 9 min 1 s).
 */
const ENTRY_BEFORE_LANDING_S = 15 * 60;
const ENTRY_BEFORE_DROGUE_S = 9.5 * 60;

/**
 * When the entry interface place is not published: the angle around Earth
 * from it to the point over which the capsule has slowed (halfway from
 * entry interface to the drogue), in the orbit plane. An illustration:
 * about 30 degrees for Gemini VIII and 26 for Apollo 11.
 */
const ENTRY_ARC_RAD = 27 * DEG;

/** Polylines: at most this many samples per ship (adaptive refinement stops there). */
const MAX_SAMPLES = 60_000;
/**
 * At most this many starting samples per ship. A long Earth orbit asks
 * for 48 per revolution (10,000 for Gemini 7's 206); past this budget the
 * orbits get proportionally fewer, and refinement adds what curves need.
 */
const INITIAL_SAMPLE_BUDGET = 20_000;
/**
 * Each phase may refine up to its share of MAX_SAMPLES, in proportion to
 * its starting samples but at least this many, spent evenly along it, so a
 * long phase is smooth from start to end instead of fine at the start and
 * coarse once the budget runs out.
 */
const MIN_PHASE_SHARE = 4_000;

/** Lunar orbits are drawn in the Moon's equatorial plane unless the plan sets one over its landing site. */
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
  /** Set when the plan draws its lunar orbits over the landing site; unset for the Moon's equator. */
  const lunarPlaneUp: Vec3 | undefined = lunarOrbitPlaneUp();

  function anchoredOrbit(
    body: BodyId,
    rp: number,
    ra: number,
    t0: number,
    t1: number,
    reference: OrbitReference,
    endDirection?: Readonly<Vec3>,
    schedule?: SizeSchedule,
    gm: number = mu(body),
  ): AnchoredOrbit {
    return new AnchoredOrbit(sky, body, gm, rp, ra, t0, t1, reference, endDirection, body === "earth" ? earthBulge : undefined, schedule);
  }

  /**
   * The gravitational parameter an orbit phase is drawn with: the body's,
   * or, with a published period (OrbitPhase.period), the one that gives an
   * orbit of the published size that period. The size keeps its shape; only
   * the timing follows the period.
   */
  function phaseMu(phase: OrbitPhase, rp: number, ra: number): number {
    if (!phase.period) return mu(phase.body);
    const n = (2 * Math.PI) / (phase.period.value * 60);
    return n * n * ((rp + ra) / 2) ** 3;
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
    if (!lunarPlaneUp) {
      const d = moonFixedDirection(0, fix.longitude.value * DEG, vec3());
      return rotateY(d, d, sky.moonLongitude(t));
    }
    // Where the lunar orbit plane crosses the fix's longitude at t: the
    // plane, fixed among the stars, in Moon-fixed axes then.
    const n = rotateY(vec3(), lunarPlaneUp, -sky.moonLongitude(t));
    const lon = fix.longitude.value * DEG;
    const lat = Math.atan((n[0] * Math.cos(lon) - n[2] * Math.sin(lon)) / n[1]);
    const d = moonFixedDirection(lat, lon, vec3());
    return rotateY(d, d, sky.moonLongitude(t));
  }

  function moonFixRadius(fix: LunarFix): number | undefined {
    return fix.altitude ? moonRefRadius + fix.altitude.value * NM : undefined;
  }

  function lunarNormal(sense: Sense): Vec3 {
    if (lunarPlaneUp) return sense === "prograde" ? vec3(...lunarPlaneUp) : scale(vec3(), lunarPlaneUp, -1);
    return sense === "prograde" ? vec3(...MOON_NORTH) : vec3(0, -1, 0);
  }

  /** The prograde normal of the plan's lunar orbit plane (see LunarOrbitPlane), if it sets one. */
  function lunarOrbitPlaneUp(): Vec3 | undefined {
    const plane = plan.lunarOrbitPlane;
    if (!plane) return undefined;
    let t: number | undefined = plane.time ? elapsedToSeconds(plane.time.value) : undefined;
    if (t === undefined) {
      for (const ship of plan.ships) {
        const stay = ship.phases.find((p) => p.kind === "surface" && p.body === "moon");
        if (stay) {
          t = (elapsedToSeconds(stay.start.value) + elapsedToSeconds(stay.end.value)) / 2;
          break;
        }
      }
    }
    if (t === undefined) throw new Error("lunarOrbitPlane needs a time when there is no stay on the lunar surface");
    const site = moonFixedDirection(plane.site.latitude.value * DEG, plane.site.longitude.value * DEG, vec3());
    const north = sub(vec3(), [0, 1, 0], scale(vec3(), site, site[1]));
    if (length(north) < 1e-6) throw new Error("lunarOrbitPlane: the site cannot be at a pole");
    normalize(north, north);
    const east = cross(vec3(), north, site);
    const heading = (plane.heading?.value ?? 270) * DEG;
    const travel = addScaled(vec3(), scale(vec3(), north, Math.cos(heading)), east, Math.sin(heading));
    const up = normalize(vec3(), cross(vec3(), site, travel));
    if (up[1] < 0) scale(up, up, -1);
    if (Math.abs(up[1]) < 1e-6) throw new Error("lunarOrbitPlane: an orbit over the poles is not supported");
    return rotateY(up, up, sky.moonLongitude(t));
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
          throw new Error(`${where(ship, i)}: a burn must sit between orbits, coasts, transfers, or station keeping (or lead from an orbit into the entry)`);
        }
        return new BurnBlend(phase.body, before, after, t0, t1);
      }
      case "transfer":
        return buildTransfer(ship, i, phase, t0, t1);
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
      case "station":
        // Station keeping holds the target's place, like docking; the scene
        // draws the pair a little apart.
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

  /** A phase's name for error messages. */
  function where(ship: ShipState, i: number): string {
    return `${ship.plan.id} phase ${i} (${ship.plan.phases[i]!.label})`;
  }

  /** The published sizes of an orbit phase as a schedule, or undefined when its size does not change. */
  function sizeSchedule(ship: ShipState, i: number, phase: OrbitPhase): SizeSchedule | undefined {
    if (!phase.sizes || phase.sizes.length === 0) return undefined;
    const [rp, ra] = apsides(phase.body, phase);
    const knots: SizeKnot[] = [{ t: ship.starts[i]!, rp, ra }];
    for (const size of phase.sizes) {
      const t = elapsedToSeconds(size.time.value);
      if (!(t > knots[knots.length - 1]!.t && t <= ship.ends[i]!)) {
        throw new Error(`${where(ship, i)}: orbit sizes must be in time order and inside the phase (${size.time.value})`);
      }
      const [p, a] = apsides(phase.body, size);
      knots.push({ t, rp: p, ra: a });
    }
    return new SizeSchedule(phaseMu(phase, rp, ra), knots);
  }

  /** Where and how an orbit phase starts (see OrbitPhase in types.ts for the order of preference). */
  function orbitReference(ship: ShipState, i: number, phase: OrbitPhase, rp: number, ra: number): OrbitReference {
    const body = phase.body;
    const t0 = ship.starts[i]!;
    const previous = i > 0 ? ship.plan.phases[i - 1]! : undefined;
    const afterTarget = previous?.kind === "docked" || previous?.kind === "station" ? previous.target : undefined;
    const fromId = phase.from ?? (phase.startFix ? undefined : afterTarget);

    if (fromId) {
      // Undocking or leaving station: start exactly where the other ship
      // is, on its orbit if this one has the same size.
      const target = shipById(fromId);
      let k = phaseIndexAt(target, t0);
      if (k < 0) throw new Error(`${where(ship, i)}: "${fromId}" does not exist at the phase start`);
      // When the other ship starts flying beside this one at this very
      // moment (a spent stage set loose and kept on station), take its state
      // from just before, so the two do not wait on each other.
      const there = target.plan.phases[k]!;
      if (k > 0 && target.starts[k] === t0 && (there.kind === "docked" || there.kind === "station") && there.target === ship.plan.id) k--;
      const targetSeg = segment(target, k);
      if (targetSeg instanceof AnchoredOrbit && targetSeg.body === body && shapeMatches(targetSeg, rp, ra, t0)) {
        return continuation(targetSeg, t0);
      }
      const { r, v } = bodyInertialState(sky, body, targetSeg, t0);
      return referenceFromState(r, v, t0, rp, ra);
    }
    if (phase.startFix) return fixReference(phase, phase.startFix, t0, rp, ra, ship, i);
    if (phase.startRelative) return relativeReference(ship, i, phase, rp);
    if (previous?.kind === "burn") return referenceAcrossBurn(ship, i, body, rp, ra);
    if (previous?.kind === "ascent" && body === "earth") return launchReference(ship, i, phase, rp);
    if (previous?.kind === "ascent" && body === "moon") return lunarLiftoffReference(ship, i, phase, rp, ra);
    if (previous) {
      const prevSeg = segment(ship, i - 1);
      if (prevSeg instanceof AnchoredOrbit) {
        if (prevSeg.body !== body || !shapeMatches(prevSeg, rp, ra, t0)) {
          throw new Error(`${where(ship, i)}: the orbit changes without a burn`);
        }
        return continuation(prevSeg, t0);
      }
      const { r, v } = bodyInertialState(sky, body, prevSeg, t0);
      return referenceFromState(r, v, t0, rp, ra);
    }
    throw new Error(`${where(ship, i)}: an orbit needs a start fix, a previous phase, "from", or "startRelative"`);
  }

  function buildOrbit(ship: ShipState, i: number, phase: OrbitPhase, t0: number, t1: number): AnchoredOrbit {
    const body = phase.body;
    const [rp, ra] = apsides(body, phase);
    const schedule = sizeSchedule(ship, i, phase);
    const reference = orbitReference(ship, i, phase, rp, ra);

    let endDirection: Vec3 | undefined;
    if (phase.endFix && phase.endRange) {
      throw new Error(`${where(ship, i)}: give an end fix or an end range, not both`);
    }
    if (phase.endFix) {
      endDirection =
        body === "earth" ? earthFixDirection(phase.endFix as Fix, t1) : moonFixDirection(phase.endFix, t1);
    } else if (phase.endRange) {
      endDirection = trailingDirection(ship, i, phase, t0, t1, rp, ra, reference, schedule);
    } else if (stateCoastAfterBurn(ship, i)) {
      // The coast after the next burn runs back from a published state, so
      // this orbit is pinned to end where that coast begins.
      const { r } = bodyInertialState(sky, body, segment(ship, i + 2), t1);
      endDirection = normalize(r, r);
    } else if (deorbitAfter(ship, i)) {
      return orbitIntoFall(ship, i, rp, ra, reference, schedule);
    }
    const orbit = anchoredOrbit(body, rp, ra, t0, t1, reference, endDirection, schedule, phaseMu(phase, rp, ra));
    // A published retrofire position: the fall starts there.
    if (phase.endFix && deorbitAfter(ship, i)) planFallFrom(ship, i, orbit);
    return orbit;
  }

  /**
   * An orbit phase as it would fly with no end corrections, used to place
   * another ship relative to it (so the two do not depend on each other).
   */
  function naturalOrbit(ship: ShipState, k: number): AnchoredOrbit | undefined {
    const phase = ship.plan.phases[k]!;
    if (phase.kind !== "orbit") return undefined;
    const [rp, ra] = apsides(phase.body, phase);
    const reference = orbitReference(ship, k, phase, rp, ra);
    return anchoredOrbit(phase.body, rp, ra, ship.starts[k]!, ship.ends[k]!, reference, undefined, sizeSchedule(ship, k, phase), phaseMu(phase, rp, ra));
  }

  /**
   * A ship already in orbit when the plan begins: at the published moment
   * it is the published straight-line distance ahead of (or behind) the
   * other ship, in that ship's orbit plane.
   */
  function relativeReference(ship: ShipState, i: number, phase: OrbitPhase, rp: number): OrbitReference {
    const place = phase.startRelative!;
    const t = elapsedToSeconds(place.time.value);
    const other = shipById(place.ship);
    const k = phaseIndexAt(other, t);
    if (k < 0) throw new Error(`${where(ship, i)}: "${place.ship}" does not exist at ${place.time.value}`);
    const body = phase.body;
    const otherOrbit = naturalOrbit(other, k);
    let rOther: Vec3;
    let normal: Vec3;
    if (otherOrbit && otherOrbit.body === body) {
      rOther = otherOrbit.inertialPosition(t, vec3());
      normal = otherOrbit.normalAt(t, vec3());
    } else {
      const state = bodyInertialState(sky, body, segment(other, k), t);
      rOther = state.r;
      normal = normalize(vec3(), cross(vec3(), state.r, state.v));
    }
    // The craft is drawn at its orbit's low point at that moment: an
    // illustration (where it was in its orbit is not published, and for the
    // near-circular orbits of targets it hardly shows).
    const schedule = sizeSchedule(ship, i, phase);
    const radius = schedule ? schedule.aAt(t) * (1 - schedule.eAt(t)) : rp;
    const ahead = "ahead" in place;
    const d = (ahead ? place.ahead.value : place.behind.value) * NM;
    const r0 = length(rOther);
    const c = (radius * radius + r0 * r0 - d * d) / (2 * radius * r0);
    if (!(c <= 1 && c >= -1)) {
      throw new Error(`${where(ship, i)}: an orbit of this size cannot be ${d / NM} nautical miles from "${place.ship}"`);
    }
    const direction = rotateAxis(vec3(), normalize(vec3(), rOther), normal, (ahead ? 1 : -1) * Math.acos(c));
    return { t, direction, normal, trueAnomaly: 0 };
  }

  /**
   * A lunar orbit after liftoff with no published insertion fix: in the
   * lunar orbit plane, at the orbit's low point, an illustrative distance
   * downrange of the site (LUNAR_DOWNRANGE_FRACTION). When the phase has a
   * published end fix, the start is then moved along the orbit so that an
   * orbit of the published size reaches that fix on time (as far as
   * LIFTOFF_SHIFT_LIMIT), which keeps the orbit's own speed: where it
   * starts is still our illustration, not a published place.
   */
  function lunarLiftoffReference(ship: ShipState, i: number, phase: OrbitPhase, rp: number, ra: number): OrbitReference {
    const ascent = ship.plan.phases[i - 1] as AscentPhase;
    const liftoff = ship.starts[i - 1]!;
    const t0 = ship.starts[i]!;
    const t1 = ship.ends[i]!;
    const normal = lunarNormal(phase.sense.value);
    const site = siteDirection("moon", ascent.site);
    rotateY(site, site, sky.moonLongitude(liftoff));
    const onPlane = normalize(vec3(), addScaled(vec3(), site, normal, -dot(site, normal)));
    const speed = Math.sqrt(MOON_GM_KM3_PER_S2 / rp);
    const downrange = (LUNAR_DOWNRANGE_FRACTION * speed * (t0 - liftoff)) / rp;
    const reference: OrbitReference = { t: t0, direction: rotateAxis(vec3(), onPlane, normal, downrange), normal, trueAnomaly: 0 };
    if (!phase.endFix) return reference;
    const natural = anchoredOrbit("moon", rp, ra, t0, t1, reference, undefined, sizeSchedule(ship, i, phase), phaseMu(phase, rp, ra)).inertialPosition(t1, vec3());
    const wanted = moonFixDirection(phase.endFix, t1);
    const shift = Math.atan2(dot(cross(vec3(), natural, wanted), normal), dot(natural, wanted));
    if (Math.abs(shift) > LIFTOFF_SHIFT_LIMIT) return reference;
    return { ...reference, direction: rotateAxis(vec3(), reference.direction, normal, shift) };
  }

  /* ---------------- orbit planes from the launch site ---------------- */

  /** North, east, and the cosine of the latitude at an inertial unit direction (Earth). */
  function localAxes(up: Readonly<Vec3>): { north: Vec3; east: Vec3; cosLatitude: number } {
    const pole = sky.earthPoleInertial(vec3());
    const horizontal = sub(vec3(), pole, scale(vec3(), up, dot(pole, up)));
    const cosLatitude = length(horizontal);
    const north = scale(vec3(), horizontal, 1 / cosLatitude);
    return { north, east: cross(vec3(), north, up), cosLatitude };
  }

  /** The orbit normal for travel from `up` at a space-fixed heading (radians east of north). */
  function headingNormal(up: Readonly<Vec3>, heading: number): Vec3 {
    const { north, east } = localAxes(up);
    const travel = addScaled(vec3(), scale(vec3(), north, Math.cos(heading)), east, Math.sin(heading));
    return normalize(vec3(), cross(vec3(), up, travel));
  }

  /**
   * The two space-fixed headings at `up` for an orbit of the given
   * inclination (radians): northeast-bound first, then southeast-bound.
   */
  function headingsForInclination(up: Readonly<Vec3>, inclination: number, context: string): [number, number] {
    const { cosLatitude } = localAxes(up);
    const latitude = Math.acos(Math.min(1, cosLatitude));
    if (inclination < latitude - 1 * DEG) {
      throw new Error(`${context}: an orbit inclined ${(inclination / DEG).toFixed(2)} degrees cannot pass over latitude ${(latitude / DEG).toFixed(2)}`);
    }
    // Within a degree of the latitude (the latitude conventions differ by up
    // to 0.2 degree), the orbit is drawn at the lowest inclination that
    // passes over the point: heading due east.
    const heading = Math.asin(clamp(Math.cos(inclination) / cosLatitude, -1, 1));
    return [heading, Math.PI - heading];
  }

  /**
   * The space-fixed heading for a launch azimuth measured on the ground
   * (radians), at the given space-fixed speed: Earth's turning adds its
   * eastward speed under the site.
   */
  function spaceFixedHeading(up: Readonly<Vec3>, azimuth: number, speed: number): number {
    const { cosLatitude } = localAxes(up);
    const spin = EARTH_SPIN_RATE * EARTH_MEAN_RADIUS_KM * cosLatitude;
    const s = Math.sin(azimuth);
    const ground = -spin * s + Math.sqrt(Math.max(0, spin * spin * s * s - spin * spin + speed * speed));
    return Math.atan2(ground * s + spin, ground * Math.cos(azimuth));
  }

  /**
   * An Earth orbit after an ascent with no published insertion fix: the
   * plane through the launch site (at liftoff) from the published
   * inclination, launch azimuth, or both, and insertion at the orbit's low
   * point, an illustrative distance downrange (DOWNRANGE_FRACTION). Which
   * way it leaves the site (northeast or southeast) follows the azimuth,
   * northeast when none is published.
   */
  function launchReference(ship: ShipState, i: number, phase: OrbitPhase, rp: number): OrbitReference {
    const ascent = ship.plan.phases[i - 1] as AscentPhase;
    const tLaunch = ship.starts[i - 1]!;
    const t0 = ship.starts[i]!;
    const site = earthFixDirection(ascent.site, tLaunch);
    const speed = Math.sqrt(EARTH_GM_KM3_PER_S2 / rp);
    const azimuth = ascent.azimuth ? spaceFixedHeading(site, ascent.azimuth.value * DEG, speed) : undefined;
    let heading: number;
    if (phase.inclination) {
      const [northeast, southeast] = headingsForInclination(site, phase.inclination.value * DEG, where(ship, i));
      const off = (h: number) => Math.abs(Math.atan2(Math.sin(h - azimuth!), Math.cos(h - azimuth!)));
      heading = azimuth !== undefined && off(southeast) < off(northeast) ? southeast : northeast;
    } else if (azimuth !== undefined) {
      heading = azimuth;
    } else {
      throw new Error(`${where(ship, i)}: an orbit after a launch needs a start fix with a heading, an inclination, or the ascent's azimuth`);
    }
    const normal = headingNormal(site, heading);
    const downrange = (DOWNRANGE_FRACTION * speed * (t0 - tLaunch)) / rp;
    return { t: t0, direction: rotateAxis(vec3(), site, normal, downrange), normal, trueAnomaly: 0 };
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
    schedule: SizeSchedule | undefined,
  ): Vec3 {
    const { target: targetId, range } = phase.endRange!;
    const ahead = phase.endRange!.side === "ahead";
    const body = phase.body;
    const target = shipById(targetId);
    const k = phaseIndexAt(target, t1);
    if (k < 0) throw new Error(`${ship.plan.id} phase ${i} (${phase.label}): "${targetId}" does not exist at the phase end`);
    const { r: rt, v: vt } = bodyInertialState(sky, body, segment(target, k), t1);
    const targetRadius = length(rt);
    const up = normalize(vec3(), rt);
    const normal = normalize(vec3(), cross(vec3(), rt, vt));
    const d = range.value * NM;
    const gm = phaseMu(phase, rp, ra);
    let radius = length(anchoredOrbit(body, rp, ra, t0, t1, reference, undefined, schedule, gm).inertialPosition(t1, vec3()));
    const direction = vec3();
    for (let pass = 0; pass < 4; pass++) {
      const c = (radius * radius + targetRadius * targetRadius - d * d) / (2 * radius * targetRadius);
      if (!(c <= 1 && c >= -1)) {
        throw new Error(`${ship.plan.id} phase ${i} (${phase.label}): the end range cannot be reached`);
      }
      rotateAxis(direction, up, normal, (ahead ? 1 : -1) * Math.acos(c));
      const aimed = anchoredOrbit(body, rp, ra, t0, t1, reference, direction, schedule, gm);
      radius = length(aimed.inertialPosition(t1, vec3()));
    }
    return direction;
  }

  /** True when an orbit has, at time t, the size given by periapsis and apoapsis radii. */
  function shapeMatches(orbit: AnchoredOrbit, rp: number, ra: number, t: number): boolean {
    const e = (ra - rp) / (ra + rp);
    const p = (2 * ra * rp) / (ra + rp);
    const shape = orbit.shapeAt(t);
    return Math.abs(shape.p - p) < 1e-6 * p && Math.abs(shape.e - e) < 1e-9;
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
      } else if (phase.inclination) {
        // The plane through the fix at the published inclination; of the
        // two, the one that passes nearer the launch site, if there is one.
        const up = normalize(vec3(), r);
        const normals = headingsForInclination(up, phase.inclination.value * DEG, where(ship, i)).map((h) => headingNormal(up, h));
        const ascent = ship.plan.phases[i - 1];
        normal = normals[0]!;
        if (ascent?.kind === "ascent") {
          const site = earthFixDirection(ascent.site, ship.starts[i - 1]!);
          if (Math.abs(dot(normals[1]!, site)) < Math.abs(dot(normal, site))) normal = normals[1]!;
        }
      } else throw new Error(`${where(ship, i)}: an Earth orbit start fix needs a heading or an inclination`);
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

  /** The lunar conic through a published lunar state, in the Moon's inertial frame. */
  function lunarConic(moonFix: LunarStateFix, tM: number, sense: Sense): Conic {
    const rM = scale(vec3(), moonFixDirection(moonFix, tM), moonFixRadius(moonFix)!);
    const up = normalize(vec3(), rM);
    const horizontal = normalize(vec3(), cross(vec3(), lunarNormal(sense), up));
    const gamma = moonFix.flightPathAngle!.value * DEG;
    const speed = moonFix.speed!.value * FPS;
    const vM = vec3();
    for (let k = 0; k < 3; k++) vM[k] = speed * (Math.cos(gamma) * horizontal[k]! + Math.sin(gamma) * up[k]!);
    return Conic.fromState(rM, vM, MOON_GM_KM3_PER_S2, tM);
  }

  /** The Moon's velocity in Earth's inertial frame at t, km/s. */
  function moonVelocity(t: number): Vec3 {
    const h = 1;
    const a = sky.moonCenterInertial(t - h, vec3());
    const b = sky.moonCenterInertial(t + h, vec3());
    return scale(vec3(), sub(vec3(), b, a), 1 / (2 * h));
  }

  /**
   * Where the previous phase leaves off, in Earth's inertial frame: after a
   * burn, the position before the burn at its middle (as coasts do).
   */
  function departure(ship: ShipState, i: number): { r: Vec3; v: Vec3; t: number } {
    const phases = ship.plan.phases;
    if (i >= 2 && phases[i - 1]!.kind === "burn") {
      const t = (ship.starts[i - 1]! + ship.ends[i - 1]!) / 2;
      return { ...bodyInertialState(sky, "earth", segment(ship, i - 2), t), t };
    }
    if (i === 0) throw new Error(`${where(ship, i)}: a transfer without an Earth fix needs a phase before it`);
    const t = ship.starts[i]!;
    return { ...bodyInertialState(sky, "earth", segment(ship, i - 1), t), t };
  }

  /**
   * The time in (t0, end) at which to join a leg that leaves a burn at
   * `start` (with the velocity it had before the burn) to the lunar conic
   * (`pointAt`), so that its Lambert arc needs the least change of velocity.
   * A coarse scan, then a golden-section search around the best.
   */
  function leastChangeJoin(
    start: { r: Vec3; v: Vec3; t: number },
    t0: number,
    end: number,
    pointAt: (t: number) => Vec3,
    sense: Sense,
  ): number {
    const change = (tj: number): number => {
      const r2 = pointAt(tj);
      const { v1 } = solveLambert(start.r, r2, tj - start.t, EARTH_GM_KM3_PER_S2, earthShortWay(start.r, r2, sense));
      const d = length(sub(vec3(), v1, start.v));
      return Number.isFinite(d) ? d : Infinity;
    };
    const lo = t0 + 0.02 * (end - t0);
    const hi = end - 0.02 * (end - t0);
    const n = 24;
    let best = 0;
    let bestValue = Infinity;
    for (let k = 0; k <= n; k++) {
      const value = change(lo + ((hi - lo) * k) / n);
      if (value < bestValue) {
        bestValue = value;
        best = k;
      }
    }
    let a = lo + ((hi - lo) * Math.max(0, best - 1)) / n;
    let b = lo + ((hi - lo) * Math.min(n, best + 1)) / n;
    const g = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 30; k++) {
      const c = b - g * (b - a);
      const d = a + g * (b - a);
      if (change(c) < change(d)) b = d;
      else a = c;
    }
    return (a + b) / 2;
  }

  /** Lambert's short or long way for a coast about Earth in the given direction of travel. */
  function earthShortWay(r1: Readonly<Vec3>, r2: Readonly<Vec3>, sense: Sense): boolean {
    const turn = dot(cross(vec3(), r1, r2), MOON_NORTH);
    return turn >= 0 === (sense === "prograde");
  }

  function buildTransfer(ship: ShipState, i: number, phase: TransferPhase, t0: number, t1: number): Segment {
    const outbound = phase.to === "moon";
    const { earthFix, moonFix } = phase;
    if (!earthFix && !moonFix) throw new Error(`${where(ship, i)}: a transfer needs an Earth fix, a lunar fix, or both`);
    if (earthFix && !earthFix.altitude) throw new Error(`${where(ship, i)}: the Earth fix needs an altitude`);
    if (moonFix && (!moonFix.altitude || !moonFix.speed || !moonFix.flightPathAngle)) {
      throw new Error(`${where(ship, i)}: the lunar fix needs altitude, speed, and flight-path angle`);
    }
    const tE = earthFix?.time ? elapsedToSeconds(earthFix.time.value) : outbound ? t0 : t1;

    if (!moonFix) {
      const fix = earthFix!;
      if (outbound) {
        // Before a midcourse burn: the conic about Earth through the
        // published state, which must not reach the Moon.
        if (!isFullState(fix)) throw new Error(`${where(ship, i)}: without a lunar fix, the Earth fix must be a full state (speed, flight-path angle, heading)`);
        const r = earthFixInertial(fix, tE);
        const conic = Conic.fromState(r, earthFixVelocity(fix, r)!, EARTH_GM_KM3_PER_S2, tE);
        const p = vec3();
        const m = vec3();
        for (let k = 0; k <= 200; k++) {
          const t = t0 + ((t1 - t0) * k) / 200;
          const d = length(sub(p, conic.position(t, p), sky.moonCenterInertial(t, m)));
          if (d < NEAR_RADIUS_KM) throw new Error(`${where(ship, i)}: this leg reaches the Moon, so it needs a lunar fix`);
        }
        return new ConicSegment(sky, "earth", conic, t0, t1);
      }
      // Home after a midcourse burn: from where the burn was to the entry
      // interface, about Earth alone.
      const { r: r1, t: ta } = departure(ship, i);
      const r2 = earthFixInertial(fix, tE);
      const { v1 } = solveLambert(r1, r2, tE - ta, EARTH_GM_KM3_PER_S2, earthShortWay(r1, r2, phase.earthSense.value));
      return new ConicSegment(sky, "earth", Conic.fromState(r1, v1, EARTH_GM_KM3_PER_S2, ta), t0, t1);
    }

    const tM = moonFix.time ? elapsedToSeconds(moonFix.time.value) : outbound ? t1 : t0;
    const moonConic = lunarConic(moonFix, tM, phase.lunarSense.value);
    const branch = outbound ? -1 : 1;
    const patchTime = moonConic.timeAtRadius(PATCH_RADIUS_KM, branch);
    const farTime = moonConic.timeAtRadius(FAR_RADIUS_KM, branch);
    const nearTime = moonConic.timeAtRadius(NEAR_RADIUS_KM, branch);
    if (!Number.isFinite(patchTime) || !Number.isFinite(farTime) || !Number.isFinite(nearTime)) {
      throw new Error(`${where(ship, i)}: the lunar conic does not reach the patch distance`);
    }

    // A transfer that starts at a burn inside the cross-fade (a midcourse
    // burn between FAR and NEAR) starts wholly on the conic that leaves
    // from the burn, its Earth conic outbound or its lunar conic home, and
    // fades from there into the other. Otherwise it would start part way
    // toward the other conic, away from where the burn was, and the burn
    // would bridge the gap with a sideways jog. The patch point may then be
    // just ahead of the burn or behind it, so the conics are joined
    // elsewhere in the shorter fade: outbound, where the Earth conic leaves
    // the burn with the least change of velocity (the burn then looks no
    // bigger than the two published paths need); home, at the patch point
    // when it is still ahead, otherwise halfway through the fade.
    const afterBurn = ship.plan.phases[i - 1]?.kind === "burn";
    const inFade = afterBurn && (outbound ? t0 > farTime && t0 < nearTime : t0 > nearTime && t0 < farTime);
    const fadeFar = inFade && outbound ? t0 : farTime;
    const fadeNear = inFade && !outbound ? t0 : nearTime;
    const pointAt = (t: number) => add(vec3(), sky.moonCenterInertial(t, vec3()), moonConic.position(t, vec3()));
    let joinTime = patchTime;
    if (inFade && outbound && !earthFix) joinTime = leastChangeJoin(departure(ship, i), t0, nearTime, pointAt, phase.earthSense.value);
    else if (inFade && !outbound && patchTime <= t0) joinTime = (t0 + farTime) / 2;
    const join = pointAt(joinTime);

    let earthConic: Conic;
    if (earthFix || outbound) {
      // The Earth conic: Lambert arc between the Earth fix (or, after a
      // midcourse burn, where the burn was) and the patch point.
      const start = earthFix ? { r: earthFixInertial(earthFix, tE), t: tE } : departure(ship, i);
      const [r1, r2, ta, tb] = outbound ? [start.r, join, start.t, joinTime] : [join, start.r, joinTime, start.t];
      const { v1 } = solveLambert(r1, r2, tb - ta, EARTH_GM_KM3_PER_S2, earthShortWay(r1, r2, phase.earthSense.value));
      earthConic = Conic.fromState(r1, v1, EARTH_GM_KM3_PER_S2, ta);
    } else {
      // Leaving the Moon before a midcourse burn: carried on about Earth
      // from the patch point with the lunar conic's velocity there.
      const v = add(vec3(), moonVelocity(joinTime), moonConic.velocity(joinTime, vec3()));
      earthConic = Conic.fromState(join, v, EARTH_GM_KM3_PER_S2, joinTime);
    }
    return new TransferBlend(sky, earthConic, moonConic, t0, t1, fadeFar, fadeNear);
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
      coast.endFix !== undefined &&
      isFullState(coast.endFix)
    );
  }

  function buildCoast(ship: ShipState, i: number, phase: CoastPhase, t0: number, t1: number): ConicSegment {
    const body = phase.body;
    const endFix = phase.endFix;
    const previous = i > 0 ? ship.plan.phases[i - 1]! : undefined;
    if (!endFix) {
      if (previous?.kind === "burn") {
        if (body !== "earth" || ship.plan.phases[i + 1]?.kind !== "entry") {
          throw new Error(`${where(ship, i)}: a coast after a burn needs an end fix, unless it falls into the entry`);
        }
        // The fall from retrofire to the entry interface (see planFall).
        return new ConicSegment(sky, body, fallFor(ship, i - 1).conic, t0, t1);
      }
      if (!previous) throw new Error(`${where(ship, i)}: a coast needs a previous phase`);
      // A free coast on the conic the craft was on (for example a lunar
      // module set loose; the push that separated it is not drawn).
      const { r, v } = bodyInertialState(sky, body, segment(ship, i - 1), t0);
      return new ConicSegment(sky, body, Conic.fromState(r, v, mu(body), t0), t0, t1);
    }
    if (body === "earth" && isFullState(endFix)) {
      // A full published state at the end: the coast is the Kepler conic
      // through it, run back to the start of the phase.
      const tFix = endFix.time ? elapsedToSeconds(endFix.time.value) : t1;
      const r = earthFixInertial(endFix, tFix);
      const v = earthFixVelocity(endFix, r)!;
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
        ? earthFixInertial(endFix, t1)
        : scale(vec3(), moonFixDirection(endFix, t1), moonFixRadius(endFix) ?? MOON_MEAN_RADIUS_KM);
    const north = body === "earth" ? vec3(0, 1, 0) : vec3(...(lunarPlaneUp ?? MOON_NORTH));
    const shortWay = dot(cross(vec3(), r1, r2), north) >= 0 === (phase.sense.value === "prograde");
    const { v1 } = solveLambert(r1, r2, t1 - ta, mu(body), shortWay);
    return new ConicSegment(sky, body, Conic.fromState(r1, v1, mu(body), ta), t0, t1);
  }

  /* ---------------- retrofire and the fall to entry ---------------- */

  /** The fall from retrofire to the entry interface: a Kepler conic, and when it gets there. */
  interface Fall {
    conic: Conic;
    entryTime: number;
  }
  const falls = new Map<string, Fall>();

  /**
   * True when phase i is an Earth orbit followed by a burn and then the
   * entry, either directly or through a coast with no end fix: the fall to
   * entry is then planned from the splashdown (see EntryPhase in types.ts).
   */
  function deorbitAfter(ship: ShipState, i: number): boolean {
    const phases = ship.plan.phases;
    const orbit = phases[i];
    const next = phases[i + 2];
    if (orbit?.kind !== "orbit" || orbit.body !== "earth" || phases[i + 1]?.kind !== "burn") return false;
    if (next?.kind === "entry") return true;
    return next?.kind === "coast" && next.body === "earth" && !next.endFix && phases[i + 3]?.kind === "entry";
  }

  /** The planned fall after the burn at index iBurn (it is planned while the orbit before it is built). */
  function fallFor(ship: ShipState, iBurn: number): Fall {
    const before = ship.plan.phases[iBurn - 1];
    if (iBurn < 1 || before?.kind !== "orbit" || before.body !== "earth" || !deorbitAfter(ship, iBurn - 1)) {
      throw new Error(`${where(ship, iBurn)}: retrofire into the entry needs an Earth orbit before the burn`);
    }
    segment(ship, iBurn - 1);
    const fall = falls.get(`${ship.plan.id}:${iBurn}`);
    if (!fall) throw new Error(`${where(ship, iBurn)}: the fall from retrofire was not planned`);
    return fall;
  }

  interface FallTarget {
    /** When the fall reaches the entry interface, and whether that time is published. */
    entryTime: number;
    published: boolean;
    /** Inertial direction of the splashdown point when the capsule has slowed over it. */
    splash: Vec3;
    /** Distance from Earth's center of the entry interface, km. */
    radius: number;
  }

  /** What the fall after orbit phase i must reach, worked back from the splashdown. */
  function fallTarget(ship: ShipState, i: number): FallTarget {
    const phases = ship.plan.phases;
    const coast = phases[i + 2]!.kind === "coast";
    const je = coast ? i + 3 : i + 2;
    const entry = phases[je] as EntryPhase;
    const landing = ship.ends[je]!;
    const burnEnd = ship.ends[i + 1]!;
    const drogue = entry.drogue ? elapsedToSeconds(entry.drogue.value) : undefined;
    let entryTime: number;
    if (coast) entryTime = ship.ends[i + 2]!;
    else {
      entryTime = drogue !== undefined ? Math.min(landing - ENTRY_BEFORE_LANDING_S, drogue - ENTRY_BEFORE_DROGUE_S) : landing - ENTRY_BEFORE_LANDING_S;
      // Keep at least a minute of fall after retrofire, and of entry before
      // the drogue (or the landing).
      entryTime = Math.min(Math.max(entryTime, burnEnd + 60), (drogue ?? landing) - 60);
    }
    // Where the capsule has slowed over the landing area: halfway from
    // entry interface to the drogue (or to buildEntry's default drogue time).
    const slowed = entryTime + 0.5 * ((drogue ?? entryTime + 0.6 * (landing - entryTime)) - entryTime);
    return {
      entryTime,
      published: coast,
      splash: earthFixDirection(entry.splashdown, slowed),
      radius: ellipsoidRadius(earthFixLatitude(entry.splashdown)) + ENTRY_INTERFACE_HEIGHT_KM,
    };
  }

  /** Time to fall from apoapsis ra to radius r on the ellipse with periapsis rp, seconds. */
  function fallTime(ra: number, rp: number, r: number): number {
    const e = (ra - rp) / (ra + rp);
    const p = (2 * ra * rp) / (ra + rp);
    const n = Math.sqrt(EARTH_GM_KM3_PER_S2 / ((ra + rp) / 2) ** 3);
    const nu = 2 * Math.PI - Math.acos(clamp((p / r - 1) / e, -1, 1));
    return (ellipticMeanFromTrue(nu, e) - Math.PI) / n;
  }

  /**
   * The fall from retrofire: an ellipse in `plane` whose high point is at
   * the middle of the burn (radius ra) and which reaches the entry
   * interface at its time. The entry interface is placed in the direction
   * `entry`, or, when `apoapsis` is given (a published retrofire position),
   * the high point is placed there.
   */
  function planFall(
    ship: ShipState,
    i: number,
    target: FallTarget,
    ra: number,
    plane: Readonly<Vec3>,
    toward: { entry: Readonly<Vec3> } | { apoapsis: Readonly<Vec3> },
  ): Fall {
    const tMid = (ship.starts[i + 1]! + ship.ends[i + 1]!) / 2;
    const r = target.radius;
    const steepest = 0.3 * r;
    const shallowest = r * (1 - 1e-7);
    let dt = target.entryTime - tMid;
    const longest = fallTime(ra, shallowest, r);
    const shortest = fallTime(ra, steepest, r);
    if (!(dt <= longest && dt >= shortest)) {
      if (target.published) {
        throw new Error(`${where(ship, i + 1)}: no fall from retrofire reaches the entry interface ${(dt / 60).toFixed(1)} minutes later (between ${(shortest / 60).toFixed(1)} and ${(longest / 60).toFixed(1)} minutes can)`);
      }
      dt = clamp(dt, shortest, longest);
    }
    // The longer the fall, the shallower the ellipse: find its low point.
    let lo = steepest;
    let hi = shallowest;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (fallTime(ra, mid, r) > dt) hi = mid;
      else lo = mid;
    }
    const rp = (lo + hi) / 2;
    const e = (ra - rp) / (ra + rp);
    const p = (2 * ra * rp) / (ra + rp);
    const sweep = Math.PI - Math.acos(clamp((p / r - 1) / e, -1, 1));
    const high =
      "entry" in toward
        ? rotateAxis(vec3(), toward.entry, plane, -sweep)
        : normalize(vec3(), toward.apoapsis);
    const conic = new Conic({ mu: EARTH_GM_KM3_PER_S2, p, e, pHat: scale(vec3(), high, -1), normal: vec3(plane[0], plane[1], plane[2]), t0: tMid, M0: Math.PI });
    const fall = { conic, entryTime: tMid + dt };
    falls.set(`${ship.plan.id}:${i + 1}`, fall);
    return fall;
  }

  /**
   * An Earth orbit that ends at retrofire with no published retrofire
   * position: it ends where the fall to the splashdown begins. The fall is
   * planned in the plane through the splashdown point nearest the orbit's
   * own, with the entry interface ENTRY_ARC_RAD before the splashdown; the
   * orbit is then pinned to end where the fall starts (a few passes, since
   * the fall's high point is the orbit's height there).
   */
  function orbitIntoFall(
    ship: ShipState,
    i: number,
    rp: number,
    ra: number,
    reference: OrbitReference,
    schedule: SizeSchedule | undefined,
  ): AnchoredOrbit {
    const t0 = ship.starts[i]!;
    const t1 = ship.ends[i]!;
    const tMid = (ship.starts[i + 1]! + ship.ends[i + 1]!) / 2;
    const target = fallTarget(ship, i);
    const gm = phaseMu(ship.plan.phases[i] as OrbitPhase, rp, ra);
    let orbit = anchoredOrbit("earth", rp, ra, t0, t1, reference, undefined, schedule, gm);
    for (let pass = 0; pass < 3; pass++) {
      const r = orbit.inertialPosition(tMid, vec3());
      const normal = orbit.normalAt(tMid, vec3());
      const plane = normalize(vec3(), addScaled(vec3(), normal, target.splash, -dot(normal, target.splash)));
      const entry = rotateAxis(vec3(), target.splash, plane, -ENTRY_ARC_RAD);
      const fall = planFall(ship, i, target, length(r), plane, { entry });
      const start = fall.conic.position(t1, vec3());
      orbit = anchoredOrbit("earth", rp, ra, t0, t1, reference, normalize(start, start), schedule, gm);
    }
    return orbit;
  }

  /** A published retrofire position: the fall's high point is where the orbit is then, in the plane through the splashdown point. */
  function planFallFrom(ship: ShipState, i: number, orbit: AnchoredOrbit): void {
    const tMid = (ship.starts[i + 1]! + ship.ends[i + 1]!) / 2;
    const target = fallTarget(ship, i);
    const r = orbit.inertialPosition(tMid, vec3());
    const plane = normalize(vec3(), cross(vec3(), r, target.splash));
    if (dot(plane, orbit.normalAt(tMid, vec3())) < 0) scale(plane, plane, -1);
    planFall(ship, i, target, length(r), plane, { apoapsis: r });
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

  /** When each entry phase reaches the atmosphere (later than its start when it begins at retrofire). */
  const entryInterfaces = new Map<string, number>();

  function buildEntry(ship: ShipState, i: number, phase: EntryPhase, t0: number, t1: number): Segment {
    // Straight after retrofire, the entry begins with the planned fall to
    // the entry interface (see planFall); otherwise it begins there.
    const fall =
      ship.plan.phases[i - 1]?.kind === "burn" ? new ConicSegment(sky, "earth", fallFor(ship, i - 1).conic, t0, t1) : undefined;
    const tE = fall ? fallFor(ship, i - 1).entryTime : t0;
    if (!(tE < t1)) throw new Error(`${where(ship, i)}: the entry interface comes after the landing`);
    entryInterfaces.set(`${ship.plan.id}:${i}`, tE);
    const start = bodyFixedState(sky, "earth", fall ?? segment(ship, i - 1), tE);
    const tDrogue = phase.drogue ? elapsedToSeconds(phase.drogue.value) : tE + 0.6 * (t1 - tE);
    if (!(tDrogue > tE && tDrogue < t1)) throw new Error(`${where(ship, i)}: the drogue must open after the entry interface and before landing`);
    const knots: PathKnot[] = [
      { t: tE, direction: normalize(vec3(), start.r), radius: length(start.r) },
      { t: tDrogue, direction: siteDirection("earth", phase.splashdown), radius: EARTH_MEAN_RADIUS_KM },
    ];
    // Height: falls from the entry interface toward the drogue height with
    // the arrival descent rate, levels off there, then drops under the
    // parachutes to the sea at splashdown.
    const h0 = length(start.r) - EARTH_MEAN_RADIUS_KM;
    const drogueHeight = phase.drogueAltitude ? phase.drogueAltitude.value * NM : DROGUE_HEIGHT_KM;
    const hd = Math.min(drogueHeight, h0 / 2);
    const rate0 = radiusRate(start.r, start.v);
    const k = Math.max(1, (-rate0 * (tDrogue - tE)) / (h0 - hd));
    const height = (t: number): number => {
      if (t <= tDrogue) {
        const u = Math.min(1, Math.max(0, (t - tE) / (tDrogue - tE)));
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
      // With the fall in front, the burn before can blend into it.
      extendable: fall !== undefined,
      evaluate: (t, out) => (fall && t < tE ? fall.evaluate(t, out) : path.evaluate(t, out)),
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
        // An entry that begins at retrofire counts its progress from the
        // entry interface: before it, the craft is still falling in space.
        const from = phase.kind === "entry" ? (entryInterfaces.get(`${ship.plan.id}:${k}`) ?? ship.starts[k]!) : ship.starts[k]!;
        const progress = (t - from) / (ship.ends[k]! - from);
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

    function refine(ta: number, a: [number[], number[]], tb: number, b: [number[], number[]], depth: number, limit: number): void {
      const tm = (ta + tb) / 2;
      const m = sample(tm);
      const split =
        depth < 16 &&
        times.length < limit &&
        tb - ta > 0.05 &&
        (needsSplit(a[0], b[0], m[0], EARTH_MOON_DISTANCE) || needsSplit(a[1], b[1], m[1], moonDistanceAtMix(0)));
      if (split) {
        refine(ta, a, tm, m, depth + 1, limit);
        refine(tm, m, tb, b, depth + 1, limit);
      } else {
        push(tb, b);
      }
    }

    const phases = ship.plan.phases;
    const allSteps = budgetedSteps(ship);
    const totalSteps = allSteps.reduce((sum, n) => sum + n, 0);
    let prevT = ship.starts[0]!;
    let prev = sample(prevT);
    push(prevT, prev);
    for (let k = 0; k < phases.length; k++) {
      const t0 = ship.starts[k]!;
      const t1 = ship.ends[k]!;
      const steps = allSteps[k]!;
      // This phase refines within its share of the samples, spent evenly
      // along it (see MIN_PHASE_SHARE).
      const first = times.length;
      const share = Math.max(MIN_PHASE_SHARE, (MAX_SAMPLES * steps) / totalSteps);
      for (let s = 1; s <= steps; s++) {
        const t = s === steps ? t1 : t0 + ((t1 - t0) * s) / steps;
        const next = sample(t);
        refine(prevT, prev, t, next, 0, Math.min(MAX_SAMPLES, first + (share * s) / steps));
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

  /**
   * Starting subdivisions of every phase of a ship, within
   * INITIAL_SAMPLE_BUDGET: past it, the orbit-like phases (the ones that ask
   * for many) get proportionally fewer, at least 4 each.
   */
  function budgetedSteps(ship: ShipState): number[] {
    const steps = ship.plan.phases.map((_, k) => initialSteps(ship, k));
    const total = steps.reduce((sum, n) => sum + n, 0);
    if (total <= INITIAL_SAMPLE_BUDGET) return steps;
    const fixed = steps.reduce((sum, n, k) => (orbitLike(ship, k) ? sum : sum + n), 0);
    const scaled = steps.reduce((sum, n, k) => (orbitLike(ship, k) ? sum + n : sum), 0);
    const factor = Math.max(0, INITIAL_SAMPLE_BUDGET - fixed) / scaled;
    return steps.map((n, k) => (orbitLike(ship, k) ? Math.max(4, Math.floor(n * factor)) : n));
  }

  function orbitLike(ship: ShipState, k: number): boolean {
    const kind = ship.plan.phases[k]!.kind;
    return kind === "orbit" || kind === "rendezvous" || kind === "docked" || kind === "station";
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
      case "docked":
      case "station": {
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
    if (phase.kind === "docked" || phase.kind === "station") {
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

