/**
 * Flight plans: the published facts a flight path is built from.
 *
 * A flight plan lists, for each spacecraft, its phases in order. Each phase
 * has a start and end on the mission clock and the published values its
 * kind needs (orbit heights, positions at burns, a landing site). Every
 * number is `Cited`, so the type checker rejects an uncited value.
 *
 * Units are the ones the Apollo and Gemini sources print:
 * - times: mission clock (ground elapsed time), "hhh:mm:ss.ss"; a ship
 *   launched before the mission clock starts (Gemini's Agena target) has
 *   negative times, "-001:40:59.262"
 * - angles: degrees; latitude north positive, longitude east positive
 * - altitudes: nautical miles
 * - speeds: feet per second
 *
 * Heights are measured the way the sources measure them:
 * - Earth orbit apogee and perigee: above Earth's equatorial radius.
 * - Other Earth altitudes: above the ellipsoid (geodetic altitude).
 * - Moon: above `FlightPlan.moonReferenceRadius` when given (Apollo used the
 *   radius of the landing site), otherwise above the Moon's mean radius.
 *
 * Latitudes on Earth are geodetic (as on a map) unless `latitudeKind` says
 * the source printed a geocentric one.
 */
import type { Cited, ElapsedTime } from "../content/types.ts";

export type BodyId = "earth" | "moon";

/** Direction of travel around a body, seen from above its north pole. */
export type Sense = "prograde" | "retrograde";

/** A place over a body, as printed by a source. */
export interface Fix {
  latitude: Cited<number>;
  /** "geocentric" when the source prints a geocentric latitude (Earth only). */
  latitudeKind?: "geodetic" | "geocentric";
  longitude: Cited<number>;
  /** Nautical miles. Omitted for a point on the surface. */
  altitude?: Cited<number>;
}

/**
 * A place over the Moon whose latitude was not used. The model draws lunar
 * orbits in the Moon's equatorial plane, so only longitude and altitude matter.
 */
export interface LunarFix {
  longitude: Cited<number>;
  altitude?: Cited<number>;
}

/** A position, and optionally a velocity, at a moment. */
export interface StateFix extends Fix {
  /** When the fix applies. Omit to mean "at the phase boundary it belongs to". */
  time?: Cited<ElapsedTime>;
  /** Space-fixed (inertial) speed, feet per second (see `velocityFrame`). */
  speed?: Cited<number>;
  /** Space-fixed flight-path angle above the local horizontal, degrees (see `velocityFrame`). */
  flightPathAngle?: Cited<number>;
  /** Space-fixed heading, degrees east of north (see `velocityFrame`). */
  heading?: Cited<number>;
  /**
   * What the speed, flight-path angle, and heading are measured against:
   * the stars ("space-fixed", the default) or the turning Earth
   * ("earth-fixed", as reentry guidance prints them).
   */
  velocityFrame?: "space-fixed" | "earth-fixed";
}

/** A lunar state: longitude, altitude, speed, and flight-path angle. */
export interface LunarStateFix extends LunarFix {
  time?: Cited<ElapsedTime>;
  speed?: Cited<number>;
  flightPathAngle?: Cited<number>;
}

interface PhaseBase {
  start: Cited<ElapsedTime>;
  end: Cited<ElapsedTime>;
  /** Short plain name, for example "Parking orbit". */
  label: string;
}

/**
 * Powered flight from the surface into orbit. The path runs from `site`
 * through the published `track` points and joins the next phase (an orbit)
 * at its start.
 */
export interface AscentPhase extends PhaseBase {
  kind: "ascent";
  body: BodyId;
  site: Fix;
  /** Published points along the way, each with its own time and altitude. */
  track?: StateFix[];
}

/**
 * Coasting in orbit. Its size is published (apoapsis and periapsis); its
 * position at the start and end is pinned to published fixes when given.
 * Earth orbits also turn slowly with Earth's equatorial bulge (J2).
 */
export interface OrbitPhase extends PhaseBase {
  kind: "orbit";
  body: BodyId;
  /** Highest and lowest points, nautical miles. */
  apoapsis: Cited<number>;
  periapsis: Cited<number>;
  /** Inclination to the body's equator, degrees (informational for Earth orbits). */
  inclination?: Cited<number>;
  /** Direction of travel. */
  sense: Cited<Sense>;
  /**
   * Where the orbit starts. Earth orbits need a full fix with a heading;
   * lunar orbits a longitude (and altitude and flight-path angle when
   * published). Omit to continue from the previous phase.
   */
  startFix?: StateFix | LunarStateFix;
  /** Where the craft is at the end of the phase. */
  endFix?: Fix | LunarFix;
  /**
   * Instead of `endFix`: the craft's distance (nautical miles) to another
   * ship at the phase end, trailing it along its orbit, as published for a
   * rendezvous at terminal phase initiation. The end of the phase is pinned
   * to that point in the other ship's orbit plane.
   */
  endRange?: { target: string; range: Cited<number> };
  /** Start from another ship's position at the phase start (undocking). */
  from?: string;
}

/**
 * An engine firing that changes one orbit into the next. The path blends
 * smoothly from the orbit before to the orbit after.
 */
export interface BurnPhase extends PhaseBase {
  kind: "burn";
  body: BodyId;
  /** Velocity change, feet per second (informational). */
  deltaV?: Cited<number>;
}

/**
 * The coast between Earth and the Moon, either way. Near Earth the path is
 * a Kepler conic about Earth through `earthFix`; near the Moon a conic about
 * the Moon through `moonFix`; the two are joined in between.
 */
export interface TransferPhase extends PhaseBase {
  kind: "transfer";
  /** "moon" for the outbound coast, "earth" for the return. */
  to: BodyId;
  /**
   * Translunar injection, or the entry interface. Must have a time and
   * altitude. Its speed and angles are kept for checking: the path through
   * it is computed (a Lambert arc), and lands close to them.
   */
  earthFix: StateFix;
  /** Arrival in lunar orbit, or departure from it. Must have altitude, speed, flight-path angle. */
  moonFix: LunarStateFix;
  /** Direction of travel around the Moon. */
  lunarSense: Cited<Sense>;
  /** Direction of travel around Earth. */
  earthSense: Cited<Sense>;
  /**
   * True when the outbound path would have swung around the Moon and back
   * to Earth with no further burn (the figure eight). Informational.
   */
  freeReturn?: Cited<boolean>;
}

/**
 * A Kepler coast about one body (for example, after retrofire). When the end
 * fix gives only a place, the coast is the conic from where the previous
 * phase leaves off to that place, on time. When it gives a full state
 * (altitude, speed, flight-path angle, and heading, about Earth), the coast
 * is the conic through that state, run back to the phase start, and an orbit
 * before the burn that leads into it is pinned to end where it begins.
 */
export interface CoastPhase extends PhaseBase {
  kind: "coast";
  body: BodyId;
  /** Where the coast ends, at the phase end (or at its own time). */
  endFix: StateFix;
  sense: Cited<Sense>;
}

/** Powered descent from orbit to a landing site. */
export interface DescentPhase extends PhaseBase {
  kind: "descent";
  body: BodyId;
  site: Fix;
}

/** Resting on the surface. */
export interface SurfacePhase extends PhaseBase {
  kind: "surface";
  body: BodyId;
  site: Fix;
}

/** Atmospheric entry and parachute descent to splashdown. */
export interface EntryPhase extends PhaseBase {
  kind: "entry";
  splashdown: Fix;
  /** Drogue parachute deployment: the end of travel over the ground. */
  drogue?: Cited<ElapsedTime>;
  /**
   * Height at which the drogue parachute opened, nautical miles. When it is
   * not given, the model uses an illustrative height (see build.ts).
   */
  drogueAltitude?: Cited<number>;
}

/**
 * Closing in on another ship in orbit, ending side by side at docking. The
 * craft flies its own orbit (the published size after its last burn),
 * blended around the body into the target's position. The blend is complete
 * at `alongside` when given (the craft had reached the target and was
 * keeping station beside it), otherwise at the phase end.
 */
export interface RendezvousPhase extends PhaseBase {
  kind: "rendezvous";
  body: BodyId;
  target: string;
  apoapsis: Cited<number>;
  periapsis: Cited<number>;
  sense: Cited<Sense>;
  /** When the craft reached the target and began flying alongside it, before docking. */
  alongside?: Cited<ElapsedTime>;
}

/** Attached to another ship. */
export interface DockedPhase extends PhaseBase {
  kind: "docked";
  target: string;
}

export type Phase =
  | AscentPhase
  | OrbitPhase
  | BurnPhase
  | TransferPhase
  | CoastPhase
  | DescentPhase
  | SurfacePhase
  | EntryPhase
  | RendezvousPhase
  | DockedPhase;

export type PhaseKind = Phase["kind"];

/**
 * What a ship is for in the mission:
 * - "main": the crew's spacecraft for the whole flight (Apollo's command
 *   and service module, a Gemini spacecraft);
 * - "lander": carries crew away from the main ship and back (Apollo's
 *   lunar module);
 * - "target": an uncrewed vehicle the main ship meets (Gemini's Agena).
 */
export type ShipRole = "main" | "lander" | "target";

export interface ShipPlan {
  /** Unique within the plan, for example "csm". */
  id: string;
  /** Plain description, for example "Command and service module". */
  name: string;
  role: ShipRole;
  /** In time order, each starting where the previous one ends. */
  phases: [Phase, ...Phase[]];
}

/**
 * Where the Moon and Sun were, and how Earth was turned, at a moment of the
 * mission. Two or more samples fix the sky for the whole flight.
 */
export interface SkySample {
  time: Cited<ElapsedTime>;
  /** The Moon's geocentric ecliptic longitude, degrees. */
  moonEclipticLongitude: Cited<number>;
  /** East longitude on Earth of the point directly below the Moon, degrees. */
  subLunarLongitude: Cited<number>;
  /** The Sun's geocentric ecliptic longitude, degrees. */
  sunEclipticLongitude: Cited<number>;
}

export interface FlightPlan {
  /** For example "apollo-11". */
  missionId: string;
  /** Radius that lunar altitudes are measured from, nautical miles. */
  moonReferenceRadius?: Cited<number>;
  sky: [SkySample, ...SkySample[]];
  ships: [ShipPlan, ...ShipPlan[]];
}

/* ------------------------------------------------------------------ */
/* The built path.                                                     */
/* ------------------------------------------------------------------ */

/** Anything the model can write x, y, z into. */
export type Vec3Out = Float32Array | Float64Array | number[];

/**
 * A ship's path sampled for drawing. Sample i is at `times[i]`; its
 * positions are `truePositions[3i..3i+2]` and `readablePositions[3i..3i+2]`
 * in Earth radii. Draw at a scale mix m by interpolating
 * readable + (true - readable) * m per vertex.
 */
export interface Polyline {
  readonly times: Float64Array;
  readonly truePositions: Float32Array;
  readonly readablePositions: Float32Array;
}

export interface ShipTrack {
  readonly id: string;
  readonly name: string;
  readonly role: ShipRole;
  /**
   * Mission clock seconds when the ship's path begins and ends. A ship
   * launched before the main ship starts at a negative time.
   */
  readonly start: number;
  readonly end: number;
  readonly phases: readonly Phase[];
}

export interface FlightPath {
  /**
   * Mission clock seconds: first liftoff (of any ship, so negative when a
   * target was launched before the crew) and last splashdown or path end.
   */
  readonly start: number;
  readonly end: number;
  readonly ships: readonly ShipTrack[];
  /**
   * Writes the ship's position at mission time `t` (seconds) into `out`,
   * in Earth radii in the scene frame, at scale mix `mix` (0 readable,
   * 1 true). Returns false, leaving `out` alone, when the ship does not
   * exist at `t`.
   */
  position(shipId: string, t: number, mix: number, out: Vec3Out): boolean;
  /**
   * Writes a unit vector along the ship's direction of travel (as drawn at
   * that mix). Near Earth's surface the travel is measured relative to the
   * ground; on the surface it is the local vertical. Returns false when the
   * ship does not exist.
   */
  direction(shipId: string, t: number, mix: number, out: Vec3Out): boolean;
  /** The phase the ship is in at `t`, or undefined. */
  phaseAt(shipId: string, t: number): Phase | undefined;
  /**
   * The angle to set as the Earth globe's `rotation.y`, radians. The globe
   * texture has longitude 0 on local +X and east toward local -Z.
   */
  earthSpinAngle(t: number): number;
  /**
   * The angle to set as the Earth tilt group's `rotation.y`, radians, with
   * that group's Euler order "YXZ" and `rotation.x = -EARTH_AXIAL_TILT_RAD`.
   * It turns Earth's tilted axis so it stays fixed among the stars while
   * the frame turns with the Moon.
   */
  earthAxisAngle(t: number): number;
  /** Writes the unit vector from Earth toward the Sun at `t`. */
  sunDirection(t: number, out: Vec3Out): void;
  /** Writes the Moon's center at scale mix `mix`, in Earth radii. */
  moonPosition(mix: number, out: Vec3Out): void;
  /** The ship's path sampled for drawing, or undefined for an unknown ship. */
  polyline(shipId: string): Polyline | undefined;
}
