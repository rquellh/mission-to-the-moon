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
 *
 * Common shapes of a ship's phase list (each kind's comment says more):
 * - Earth orbit: ascent, orbit, [burn, orbit]..., burn (retrofire), entry,
 *   [surface (floating until pickup)]. The orbit after the ascent can be
 *   placed from the launch site and inclination, and the end needs no
 *   retrofire position or entry state (see OrbitPhase and EntryPhase).
 * - Rendezvous: ... orbit (endRange to the target), burn, rendezvous,
 *   station and/or docked, then orbit (it starts from the target) or burn.
 *   A target already in orbit starts with an orbit placed by
 *   `startRelative`.
 * - To the Moon: ascent, orbit, burn, transfer, burn, orbit (lunar)...,
 *   burn, transfer (to Earth), entry. A lander: orbit (from the main ship),
 *   burn, orbit, descent, surface, ascent, orbit..., rendezvous, docked.
 * - Around the Moon without orbiting it (Apollo 13): see TransferPhase.
 *
 * The all-missions test (src/sim/test/all-missions.test.ts) builds every
 * mission folder's plan and checks it; tools/sky.mjs prints the `sky`
 * samples.
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
 * A place over the Moon whose latitude is not used. The model draws lunar
 * orbits in one plane (the Moon's equator, or the plane over the landing
 * site that `FlightPlan.lunarOrbitPlane` sets), so only longitude and
 * altitude matter: the point is placed where that plane crosses the
 * longitude at the fix's time.
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
  /**
   * The published launch (flight) azimuth, degrees east of north, measured
   * on the ground. Used only when the orbit after an Earth ascent has no
   * start fix with a heading: it says whether the orbit leaves the launch
   * site toward the northeast or the southeast, and, when the orbit gives
   * no inclination, it sets the orbit's plane.
   */
  azimuth?: Cited<number>;
}

/** A published orbit size at a moment of an orbit phase (see `OrbitPhase.sizes`). */
export interface OrbitSize {
  time: Cited<ElapsedTime>;
  /** Highest and lowest points, nautical miles. */
  apoapsis: Cited<number>;
  periapsis: Cited<number>;
}

/**
 * Where a ship that was already in orbit when the plan begins is placed,
 * instead of a start fix: its distance ahead of, or behind, another ship
 * of the plan at a published moment. See `OrbitPhase.startRelative`.
 */
export type RelativeStart =
  | { ship: string; time: Cited<ElapsedTime>; ahead: Cited<number> }
  | { ship: string; time: Cited<ElapsedTime>; behind: Cited<number> };

/**
 * Coasting in orbit. Its size is published (apoapsis and periapsis); its
 * position at the start and end is pinned to published fixes when given.
 * Earth orbits also turn slowly with Earth's equatorial bulge (J2).
 *
 * How the orbit starts, in order of preference:
 * - `from`: at another ship's position (undocking). An orbit right after a
 *   `docked` or `station` phase starts from that phase's target anyway.
 * - `startFix`: a published place. Earth orbits need a heading, or an
 *   `inclination` (the plane through the fix at that inclination that
 *   passes nearest the launch site is used).
 * - `startRelative`: a ship already in orbit when the plan begins (a
 *   target launched days or months before the crew).
 * - Right after an Earth `ascent`, with none of the above: the plane comes
 *   from the launch site, `inclination`, and the ascent's `azimuth`, and
 *   the insertion point is placed downrange by an illustrative distance
 *   (see build.ts). A published insertion fix with a heading always wins.
 * - Right after a lunar `ascent`, with no start fix: insertion at the
 *   orbit's low point in the lunar orbit plane, placed so that an orbit of
 *   the published size reaches the phase's `endFix` on time (or, with no
 *   end fix, an illustrative distance downrange of the site). Where it
 *   starts is an illustration; a published insertion fix always wins.
 * - Otherwise it continues from the previous phase (after a burn, from the
 *   orbit before the burn).
 *
 * How it ends: at `endFix` or `endRange` when given. An orbit followed by
 * the retrofire burn and the entry needs neither: the engine ends it where
 * a natural fall from retrofire reaches the published splashdown point at
 * the published time, however many revolutions came before (see
 * `EntryPhase`).
 */
export interface OrbitPhase extends PhaseBase {
  kind: "orbit";
  body: BodyId;
  /** Highest and lowest points at the start of the phase, nautical miles. */
  apoapsis: Cited<number>;
  periapsis: Cited<number>;
  /**
   * Inclination to the body's equator, degrees. For an Earth orbit with no
   * start fix heading, it sets the orbit's plane (see above); otherwise it
   * is informational. When the launch site or fix lies up to a degree
   * farther from the equator than this (latitude conventions differ), the
   * orbit is drawn at the lowest inclination that passes over it.
   */
  inclination?: Cited<number>;
  /** Direction of travel. */
  sense: Cited<Sense>;
  /**
   * Where the orbit starts. Earth orbits need a heading or an
   * `inclination`; lunar orbits a longitude (and altitude and flight-path
   * angle when published). Omit to continue from the previous phase or to
   * start from the launch (see above).
   */
  startFix?: StateFix | LunarStateFix;
  /**
   * Instead of a start fix, for a ship that was already in orbit when the
   * plan begins (Gemini 7 for Gemini 6A, an old Agena for Gemini 10): at
   * `time`, the craft is `ahead` (or `behind`) nautical miles from `ship`,
   * measured in a straight line, in `ship`'s orbit plane. Start the phase
   * shortly before the main launch: its orbit then needs no published fix
   * of its own, and the long time it spent in orbit before is not drawn.
   * `time` must fall in an orbit phase of `ship` that does not itself
   * depend on this craft (its first orbit, for example at insertion). The
   * craft is drawn at its own orbit's low point at `time` (an illustration).
   */
  startRelative?: RelativeStart;
  /** Where the craft is at the end of the phase. */
  endFix?: Fix | LunarFix;
  /**
   * Instead of `endFix`: the craft's distance (nautical miles, in a
   * straight line) to another ship at the phase end, trailing it along its
   * orbit (`side: "ahead"` for leading it), as published for a rendezvous at
   * terminal phase initiation or by radar while two ships flew near each
   * other. The end of the phase is pinned to that point in the other ship's
   * orbit plane. For a distance published in the middle of a long stretch,
   * split the orbit phase at that moment (two phases of the same size
   * follow on with no burn) and give the first one the `endRange`.
   *
   * Two ships that stayed near each other for hours (Gemini 6A and 7
   * overnight, Apollo 7 and its spent stage) drift apart when each runs at
   * the period its own published size implies, since a small error in size
   * adds up revolution after revolution. Pin them with `endRange` wherever
   * a distance is published, and give both ships their published `period`.
   */
  endRange?: { target: string; range: Cited<number>; side?: "behind" | "ahead" };
  /**
   * The published orbital period, minutes. The craft then goes around in
   * that time instead of the time its published size implies (the shape
   * stays the published size); Earth's bulge adds its small, steady effect
   * on top, the same for every orbit of about that size and inclination.
   * Give it to both of two ships flying near each other, so that what pulls
   * them apart is the published difference in period, not a rounding of
   * their heights. With `sizes`, it applies to the size at the phase start.
   */
  period?: Cited<number>;
  /** Start from another ship's position at the phase start (undocking). */
  from?: string;
  /**
   * Published sizes later in the phase, in time order, for an orbit whose
   * size changed slowly (air drag over days) or in small steps that are not
   * drawn one by one (trim burns). `apoapsis` and `periapsis` above are the
   * size at the phase start; the orbit then passes through each size here
   * at its time, changing smoothly in between, and keeps the last one to
   * the phase end. For a step, give the size before it at the step's start
   * and the size after it a short time later (the burn's end). Times must
   * fall inside the phase. A big maneuver is still a `burn` phase between
   * two orbit phases.
   */
  sizes?: OrbitSize[];
}

/**
 * An engine firing that changes one orbit into the next. The path blends
 * smoothly from the phase before to the phase after: orbits, coasts,
 * transfers, station keeping, or a rendezvous after it. Retrofire may also
 * lead straight into the entry (see EntryPhase). Small trims over a long
 * flight need no burn phase of their own (see `OrbitPhase.sizes`).
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
 *
 * A coast split by a midcourse burn is two transfer phases with a `burn`
 * between them, each with one fix:
 * - Outbound, before the burn: `earthFix` only, a full state (translunar
 *   injection with speed, flight-path angle, and heading); the path is the
 *   conic about Earth through it. It must end well short of the Moon.
 * - Outbound, after the burn: `moonFix` only; the path leaves from where
 *   the burn was and arrives at the lunar fix.
 * - Return, before the burn: `moonFix` only; the path is the conic about the
 *   Moon through it, carried on about Earth with the same velocity.
 * - Return, after the burn: `earthFix` only (the entry interface); the path
 *   leaves from where the burn was. The Moon's pull is left out of this
 *   leg, so put the burn well away from the Moon.
 *
 * A flyby with no lunar orbit (Apollo 13): give the outbound transfer the
 * closest approach as its `moonFix`, with that moment's `time`, and let the
 * phase run past it to the next burn; the path swings around the Moon on
 * the conic through the fix.
 */
export interface TransferPhase extends PhaseBase {
  kind: "transfer";
  /** "moon" for the outbound coast, "earth" for the return. */
  to: BodyId;
  /**
   * Translunar injection, or the entry interface. Must have a time and
   * altitude. Its speed and angles are kept for checking when there is a
   * `moonFix`: the path through it is computed (a Lambert arc), and lands
   * close to them. Without a `moonFix` it must be a full state, and the
   * path goes through it exactly. Omit it only right after a burn (see
   * above).
   */
  earthFix?: StateFix;
  /**
   * Arrival in lunar orbit (or the closest approach of a flyby), or
   * departure from it. Must have altitude, speed, flight-path angle. Omit
   * it only around a midcourse burn (see above).
   */
  moonFix?: LunarStateFix;
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
 *
 * Without an end fix:
 * - After retrofire and before the entry: the fall to the entry interface
 *   at the phase end (a published time without a published place). The
 *   engine places it so the entry reaches the splashdown point; see
 *   `EntryPhase`.
 * - After any phase but a burn (for example a lunar module set loose after
 *   `docked`): a free coast on the conic the craft was on.
 */
export interface CoastPhase extends PhaseBase {
  kind: "coast";
  body: BodyId;
  /** Where the coast ends, at the phase end (or at its own time). */
  endFix?: StateFix;
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

/**
 * Atmospheric entry and parachute descent to splashdown. It ends at the
 * published splashdown point at the published time.
 *
 * From Earth orbit, when no entry state is published, write the end of the
 * flight as `orbit`, `burn` (retrofire), `entry`: the entry then starts at
 * the end of retrofire and includes the fall to the entry interface. The
 * engine works back from the splashdown: the entry interface (400,000 feet)
 * is an illustrative distance before the splashdown point along the ground
 * track and an illustrative time before landing (or before the drogue, when
 * published), and retrofire is placed where a fall of that length begins,
 * in a plane through the splashdown point. The orbit before is pinned to
 * end there, with a correction too small to see. With a published entry
 * interface time but no place, use `orbit`, `burn`, `coast` (no end fix),
 * `entry` instead. A published retrofire position (the orbit's `endFix`)
 * is kept.
 */
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
 * keeping station beside it), otherwise at the phase end. Follow it with
 * `docked` or `station` (the craft is then at the target's place); when
 * station keeping is a story of its own, prefer ending the rendezvous when
 * the craft arrived and following it with a `station` phase over
 * `alongside`, so the scene can draw the two apart.
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

/**
 * Attached to another ship: the craft is drawn at the target's position.
 * A ship can start docked (a lunar module riding on the command module, a
 * spent stage still carrying the spacecraft). After it, an orbit starts
 * from the target (undocking), and a coast with no end fix flies on freely
 * from the target's path (a lunar module set loose before entry).
 */
export interface DockedPhase extends PhaseBase {
  kind: "docked";
  target: string;
}

/**
 * Flying beside another ship without being attached to it (station keeping).
 * The craft holds the target's place in orbit; the scene draws the two a
 * little apart.
 *
 * It may follow a `rendezvous` (or start a ship's flight beside another),
 * and be followed by `rendezvous` or `docked` (closing in again), by a
 * `burn` (a separation maneuver), or by an `orbit`, which then starts
 * from the target's position and velocity (on the target's own orbit when
 * it has the same published size).
 */
export interface StationPhase extends PhaseBase {
  kind: "station";
  target: string;
  /** The published distance between the two, nautical miles (informational). */
  range?: Cited<number>;
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
  | DockedPhase
  | StationPhase;

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

/**
 * The plane the lunar orbits are drawn in, when it is not the Moon's
 * equator: the plane through the Moon's center that passes over `site`,
 * heading `heading` there, at `time`. The plane stays fixed among the stars
 * while the Moon turns under it (about 13 degrees a day), as real orbits
 * did, so the site lies exactly under it only at `time`; the default time,
 * the middle of the stay on the surface, keeps it close at both landing and
 * liftoff (about 1 degree for a three-day stay at 26 degrees north).
 * Published plane changes are not drawn, so over a long stay in lunar orbit
 * the published longitudes can need larger corrections than on the equator.
 *
 * A flight that never lands (Apollo 8, Apollo 10) can use it too: give as
 * `site` a published point the spacecraft passed over (the latitude and
 * longitude of a trajectory table row) and as `time` the moment it was
 * there (required when there is no stay on the surface). Only the point's
 * direction is used, not its altitude. Give `heading` only if the source
 * measures it from lunar north; headings measured from a space-fixed north
 * do not apply. Without one, the plane is the one in which that point is
 * the orbit's farthest from the equator, the lowest inclination that
 * reaches it: an illustration, so say so in the plan.
 */
export interface LunarOrbitPlane {
  /**
   * The site the orbits pass over (selenographic latitude and east
   * longitude): usually the landing site, or for a flight that never lands
   * a published point under the orbit.
   */
  site: { latitude: Cited<number>; longitude: Cited<number> };
  /**
   * Direction of travel over the site, degrees east of north (Apollo's
   * "approach azimuth"; -91 and 269 mean the same). Defaults to due west for
   * retrograde orbits, which puts the site at the orbit's farthest point
   * from the equator: the lowest inclination that reaches it.
   */
  heading?: Cited<number>;
  /**
   * When the orbit passes over the site. Defaults to the middle of the first
   * stay on the lunar surface; required for a flight that never lands.
   */
  time?: Cited<ElapsedTime>;
}

export interface FlightPlan {
  /** For example "apollo-11". */
  missionId: string;
  /** Radius that lunar altitudes are measured from, nautical miles. */
  moonReferenceRadius?: Cited<number>;
  /**
   * Draw the lunar orbits over the landing site instead of over the Moon's
   * equator (Apollo 15 landed at 26 degrees north, Apollo 17 at 20). Omit it
   * for orbits near the equator; Apollo 11 omits it.
   */
  lunarOrbitPlane?: LunarOrbitPlane;
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
