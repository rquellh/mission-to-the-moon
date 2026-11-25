import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Director, Player, ViewInsets } from '../app/contract';
import { homeView, nearestView } from '../app/views';
import { EARTH_MEAN_RADIUS_KM, EARTH_RADIUS, MOON_RADIUS } from '../content/physical-constants';
import { elapsedToSeconds, type ElapsedTime, type EventView, type Mission } from '../content/types';
import type { LeftBehind, VehicleChange } from '../content/vehicle-types';
import {
  approachesAtEvents,
  closesToDocked,
  partsFromDocked,
  type FlightPath,
  type Phase,
  type ShipTrack,
} from '../sim';
import {
  AMBIENT_INTENSITY,
  BODY_VIEW_ANGLE_DEG,
  CAMERA_FOV,
  JOURNEY_ELEVATION_DEG,
  LONG_SWING_MS,
  MAX_DISTANCE,
  MIN_DISTANCE_FACTOR,
  MOON_DISTANCE,
  PORTRAIT_MAX_FOV,
  PORTRAIT_MIN_HORIZONTAL_FOV,
  REFRAME_MS,
  SHIP_AMBIENT_INTENSITY,
  SHIP_COLORS,
  SHIP_SUN_INTENSITY,
  SUN_INTENSITY,
  SWING_ANGLES_DEG,
  TRANSITION_MS,
  type ScaleMode,
} from './config';
import { createEarth, type Earth } from './earth';
import {
  closedLapStart,
  indexAtValue,
  inFastForward,
  writeLap,
  type LapPath,
} from './fast-forward';
import {
  clockJumped,
  fitAcross,
  fitDistance,
  interpolatePose,
  swingAngle,
  swingAround,
  swingBodyOf,
  swingKeeping,
  type CameraPose,
  type ClearArea,
  type ClockReading,
  type OrientedPose,
  type SphereLike,
} from './framing';
import { createMarkers, type MarkerPoint, type MarkerSet } from './markers';
import { createMoon, type Moon } from './moon';
import {
  createOrbitRing,
  createPathLine,
  sampleIndexAt,
  valueAtIndex,
  type OrbitRing,
  type PathFade,
  type PathLine,
} from './path-lines';
import type { SceneBox, SceneReport } from './report';
import { createStarfield, type Starfield } from './stars';
import { chooseTextureTier, loadStageTextures, type TextureTier } from './textures';
import { easeInOutCubic, Tween } from './tween';
import {
  buildFleet,
  type Fleet,
  type LeftBehindModel,
  type PoseContext,
  type ShipFace,
  type ShipModel,
  type ShipPose,
} from './vehicles';
import { webGL2Available } from './webgl';

export interface StageOptions {
  /** The flight path, from buildFlightPath. */
  path: FlightPath;
  /** The mission clock; the scene draws the mission at `player.time`. */
  player: Player;
  /** The mission, for its events. */
  mission: Mission;
  /** Cited moments at which each ship changes shape. */
  vehicle: readonly VehicleChange[];
  /** Cited parts that stay behind (for Apollo 11, Eagle's descent stage at Tranquility Base). */
  leftBehind: readonly LeftBehind[];
  onContextLost(): void;
  onContextRestored(): void;
}

/** Thrown when the browser cannot create a WebGL 2 context. */
export class WebGLUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('WebGL 2 is not available', { cause });
    this.name = 'WebGLUnavailableError';
  }
}

/** What a ship is to the story. */
type ShipRole = 'main' | 'lander' | 'target';

/**
 * A ship's role: main is the crew's spacecraft for the whole flight; a
 * lander carries crew away and back (Apollo's lunar module); a target is
 * a vehicle the main ship meets (an Agena, or another Gemini). Read from
 * the flight plan; a plan that leaves it out makes the first ship the main
 * one and any other a target.
 */
function roleOf(track: ShipTrack, index: number): ShipRole {
  const role = (track as { readonly role?: unknown }).role;
  if (role === 'main' || role === 'lander' || role === 'target') return role;
  return index === 0 ? 'main' : 'target';
}

/** A camera pose to fill in, with up along +Y. */
const orientedPose = (): OrientedPose => ({
  position: new Vector3(),
  target: new Vector3(),
  up: new Vector3(0, 1, 0),
});

const phaseStart = (phase: Phase): number => elapsedToSeconds(phase.start.value);
const phaseEnd = (phase: Phase): number => elapsedToSeconds(phase.end.value);

const MAX_PIXEL_RATIO = 2;
const CAMERA_FAR = 2000;
const STAR_SPHERE_RADIUS = 900;
/** The atmosphere shell is slightly larger than the globe. */
const EARTH_FRAME_RADIUS = EARTH_RADIUS * 1.02;
/** Keep the camera at least this far outside a body's surface, as a radius multiple. */
const SURFACE_CLEARANCE = 1.03;
/** Arrow-key turn per press, in radians, and zoom factor per +/- press. */
const KEY_ROTATE_STEP = Math.PI / 36;
const KEY_ZOOM_STEP = 1.15;
/** How quickly the ship view turns with the ship, and eases its distance, in seconds. */
const CHASE_TURN_SECONDS = 0.7;
const CHASE_DISTANCE_SECONDS = 0.8;
/** How quickly the picture slides when the interface changes size, in seconds. */
const OFFSET_SECONDS = 0.12;
/** Where the ship view's camera sits, in the ship's frame: behind (-x), above (+y), to the side (+z). */
const CHASE_OFFSET = new Vector3(-0.72, 0.34, 0.6).normalize();
/** The ship being followed in the ship view is drawn this much larger (more for a flight that stays in Earth orbit, where the ships meet up close). */
const SUBJECT_SCALE = 1.35;
const ORBIT_SUBJECT_SCALE = 5;
/**
 * A flight that stays in Earth orbit goes around many times, and drawn all
 * at once its orbits pile up into a band. There, the path still to come
 * fades out over the next revolution, flown revolutions older than the last
 * one dim, and those older than a few are gone. Revolutions are counted
 * along the path itself, so the fading follows the real period of the orbit
 * flown (a high orbit's longer one too). A Moon flight's path fades this way
 * only where it stays in lunar orbit for many revolutions (Apollo 11's
 * thirty are all drawn; the three-day stays of Apollo 15 to 17 fade).
 */
const ORBIT_FADE = {
  future: [0.4, 1.0],
  past: [1.0, 2.0, 0.28],
  gone: [3.0, 5.0],
} as const;
/*
 * In the ship view, another ship that is not paired with the followed one
 * (not docked, not keeping station, not about to dock) would be drawn as a
 * tiny model beside it when far off: a toy at its feet. Beyond
 * COMPANION_MODEL_M meters its model fades out, and by COMPANION_MARKER_M it
 * is a small dot of its color instead, COMPANION_MARKER_PX across. Closer
 * (just after undocking), both models show.
 */
const COMPANION_MODEL_M = 300;
/** The pointer toward a followed ship out of the Earth or Moon view: its size, and how far in from the clear area's edge, in CSS pixels. */
const POINTER_PX = 16;
const POINTER_INSET_PX = 22;
/** A part left behind is labeled when the camera is closer than the first, fading out by the second, in Moon radii. */
const LABEL_NEAR_MOON_RADII = [1.4, 2.2] as const;
/** The room between the parts at a site and the first label under them, in CSS pixels, and how long a label takes to fade in or out, in seconds. */
const LABEL_GAP_PX = 8;
const LABEL_FADE_SECONDS = 0.5;
/** For this many story seconds after liftoff, a part left behind is drawn at the size its lander is drawn (see updateFleet). */
const LIFTOFF_SIZE_STORY_SECONDS = 1.5;
const COMPANION_MARKER_M = 1500;
const COMPANION_MARKER_PX = 9;
/** Story seconds over which a ship's line fades out once its path has ended (see fadeEndedPaths). */
const PATH_END_FADE_STORY_SECONDS = 1.5;
/** A stay in lunar orbit of more revolutions than this fades loop by loop. */
const LONG_LUNAR_STAY_REVOLUTIONS = 40;
/*
 * Fast forward: on a long flight the story clock can carry a craft around
 * its body several times a second. Drawn, the model would whirl around the
 * orbit, and the ship view with it. So each craft is either drawn or
 * replaced by a bright ring in its color, never left half faded:
 *
 * - It is replaced once it goes around its body (on screen, at the pace the
 *   clock runs now) faster than once in FAST_FORWARD_ON_LAP_SECONDS (7), and
 *   drawn again once it slows to less than once in
 *   FAST_FORWARD_OFF_LAP_SECONDS (8); see fast-forward.ts. A slower lap stays
 *   a model the camera follows: a lander's last lap before its descent, at
 *   normal speed, takes about 8.8 seconds.
 * - Only while its path around now is a closed lap of its body (see
 *   closedLapStart): a craft leaving orbit, arriving, or climbing from the
 *   surface is drawn however fast it goes, so a ring never has a chord or a
 *   spoke across it.
 * - Never while it is docked to another craft (drawn as part of it) or
 *   standing on a surface, and never with the clock stopped: then the model
 *   is at its true place.
 * - The model and the ring cross-fade over FAST_FORWARD_CROSSFADE_SECONDS.
 *
 * Each craft in fast forward has its own ring. The followed craft's turns on
 * the "Fast forward" mark and the ship view's steady view of the body with
 * the orbit in frame, which come and go more slowly (FAST_FORWARD_SECONDS).
 */
const FAST_FORWARD_CROSSFADE_SECONDS = 0.3;
/**
 * The followed craft's fast-forward level (0 to 1, easing toward 1 or 0 over
 * FAST_FORWARD_SECONDS of real time, at once on a jump or under reduced
 * motion) at which the interface is told fast forward is on, and off again
 * (see Stage.fastForward). The ship view holds its steady view until the
 * level drops below FAST_FORWARD_OFF (see updateCamera).
 */
const FAST_FORWARD_ON = 0.6;
const FAST_FORWARD_OFF = 0.3;
const FAST_FORWARD_SECONDS = 0.45;
/** The steady view: this many degrees off the orbit's axis, toward the ship. */
const FAST_FORWARD_TILT_DEG = 52;
/** A ring's width in CSS pixels, its opacity, and how far its craft's color is lightened toward white. */
const FAST_FORWARD_RING_PX = 4;
const RING_OPACITY = 0.9;
const RING_LIGHTEN = 0.35;
/** Points along a ring. */
const RING_POINTS = 192;
/** How quickly a ring eases to its craft's new orbit after a burn, in seconds of real time. */
const RING_SETTLE_SECONDS = 0.15;
/**
 * A craft that goes behind Earth or the Moon fades out over this many
 * seconds of real time, and fades in as it comes out, rather than vanishing
 * or appearing at the limb in one frame.
 */
const HIDDEN_FADE_SECONDS = 0.25;
/**
 * A seek of more than this many story seconds puts every craft straight
 * into its new look (size, parachutes, fast forward). A smaller one, such as
 * the tour's last settle onto a stop, eases as playing does.
 */
const LEAP_STORY_SECONDS = 0.3;
/*
 * A spacewalk: the ship view draws the followed craft close up while its
 * parts include a spacewalker, so the figure, its tether, and the open
 * hatch can be seen, and eases back when the walk ends. The craft and the
 * figure then reach this share of the clear area's smaller side from the
 * middle of the view. The camera stays where it is, so near Earth the
 * horizon stays in frame.
 */
const SPACEWALK_REACH_SHARE = 0.4;
/** The ship view's camera during a spacewalk, in the ship's frame (as CHASE_OFFSET): a little behind and above, mostly to the side. */
const SPACEWALK_VIEW = new Vector3(-0.3, 0.32, 0.9).normalize();
/** How quickly the close-up comes and goes, in seconds of real time (at once on a jump or under reduced motion). */
const SPACEWALK_SECONDS = 0.7;
/** The Earth view of an Earth-orbit flight looks at the orbit from this many degrees off its axis, toward the ship. */
const ORBIT_VIEW_TILT_DEG = 70;
/** A ship this many body radii up (or less) counts as near that body for the Earth and Moon views. */
const NEAR_BODY_RADII = 4;
/**
 * A tall, narrow picture is narrower than the low orbits around Earth or the
 * Moon, and a craft on one would spend seconds off its sides. There, the
 * Earth and Moon views stand back far enough that the orbits fit across it
 * (see orbitReach): those of every craft near the body, within
 * LOW_ORBIT_RADII body radii of its center, over LOW_ORBIT_WINDOW_SECONDS of
 * mission time either side of the moment framed (about an orbit), with
 * LOW_ORBIT_EDGE_PX clear at each side: room for a craft at the edge of the
 * orbit and another drawn beside it (two craft parting are drawn at least
 * PAIR_GAP_MIN_PX apart). Only a picture whose clear area is taller than it
 * is wide stands back so; a wide one (any desktop window) fits them anyway
 * and keeps its framing.
 */
const LOW_ORBIT_RADII = 1.7;
const LOW_ORBIT_WINDOW_SECONDS = 5400;
const LOW_ORBIT_EDGE_PX = 80;
/**
 * A camera move whose ends are closer than this share of the distance it
 * looks from (and whose ups turn less than as many radians) is no move: about
 * a pixel at most, so it is made at once and `moving` never says otherwise.
 */
const SAME_POSE_SHARE = 1e-3;
/**
 * A camera move swings around Earth or the Moon (see swingAround) when the
 * points it looks at, at both ends, are within this many of the body's
 * radii of its center; or when flying straight would take it past a body
 * closer than either end (see divesPast); or when only one end looks there
 * and the other is a wider view from farther off with the body in sight
 * (the journey view, to or from the Earth or Moon view or a craft near
 * either). Otherwise (between Earth and the Moon, or in open space) the
 * camera flies straight across. See swingBodyOf.
 */
const SWING_REACH_RADII = 3;
/** Room kept at the edges of the journey view for a spacecraft model, in CSS pixels. */
const JOURNEY_EDGE_PX = 38;
/** Longest a spacecraft model may look in the journey view, and how far it may reach from its point on the path, in CSS pixels. */
const JOURNEY_SHIP_MAX_PX = 48;
const JOURNEY_SHIP_REACH_PX = JOURNEY_EDGE_PX - 2;
/** In the journey view a part left behind is drawn smaller than the spacecraft. */
const JOURNEY_LEFT_BEHIND_MAX_PX = 30;
/** Room kept between a spacecraft model and the edge of the clear area in the other views, in CSS pixels. */
const SHIP_EDGE_PX = 28;
/** In the Earth view, keep the camera at least this many degrees off the line behind Earth from the Moon. */
const EARTH_VIEW_MOON_CLEARANCE_DEG = 50;
/** The ship view moves the camera when the ship it follows changes to one at least this far away, in Earth radii. */
const HANDOVER_DISTANCE = 0.02;
/** Meters per scene unit (one Earth mean radius). */
const METERS_PER_UNIT = EARTH_MEAN_RADIUS_KM * 1000;
/*
 * Two ships that dock (the main ship and a target): at these scales the
 * real distances between them are far too small to see, so the models
 * would sit on top of each other. In the ship view the target is drawn at
 * least a model's length from the main ship, along the line between them.
 * From the moment the main ship is alongside (station keeping) until
 * docking, and just after undocking, in every view, the target is drawn
 * where it would be docked plus a little room (swinging there over the top
 * just before station keeping), and both share the docked pair's scale, so
 * at docking they meet as they are drawn docked.
 *
 * Two ships keeping station without docking (a `station` phase, or a
 * rendezvous past its `alongside` time with no docking after it): one stays
 * where it is (the ship the story follows), and the other is drawn a little
 * off its nose, turned to face it nose to nose (for the lunar module, its
 * top), at one scale. All of this is illustration.
 */
/** Room drawn between the two, in CSS pixels: from the first when side by side, up to the second; PAIR_GAP_DISTANCE_M sets how fast it grows with their real distance. */
const PAIR_GAP_MIN_PX = 34;
const PAIR_GAP_MAX_PX = 84;
const PAIR_GAP_DISTANCE_M = 2000;
/** Story seconds over which the target swings to its docking side before station keeping. */
const PAIR_ARRANGE_STORY_SECONDS = 1.5;
/**
 * Keeping station without docking, the two are drawn this many lengths of
 * the shorter craft apart (at least PAIR_GAP_MIN_PX), so they read as two
 * spacecraft, not one about to dock; and the pair is drawn small enough to
 * reach no farther than this share of the clear area's smaller side from
 * the ship that stays put. Both are illustration (the real gaps were tens
 * of feet).
 */
const STATION_GAP_LENGTHS = 0.9;
/**
 * Keeping station, the two share the larger one's scale, but are drawn
 * larger where that would show the smaller one at less than this share of
 * its own size. Eagle's ascent stage is under a quarter of Columbia's length:
 * at Columbia's scale it would be a speck beside it, closing in to dock and
 * docked. A whole lunar module, or a Gemini beside an Agena, is not affected.
 */
const PAIR_SMALL_SHARE = 0.5;
/**
 * Parting from docked, that gap opens over this many story seconds, so the
 * two are seen to part at any pace of the clock (in lunar orbit it can run
 * many mission minutes a second). It is open
 * sooner when the first event after the parting, or the end of the station
 * keeping, comes first, so a stop there shows the two apart.
 */
const STATION_OPEN_STORY_SECONDS = 1.5;
/** Mission seconds over which that gap closes before docking, when the station keeping plays for less than PAIR_CLOSE_STORY_SECONDS (see pairNow). */
const STATION_CLOSE_MISSION_SECONDS = 120;
const STATION_FIT_SHARE = 0.45;
const PAIR_CLOSE_STORY_SECONDS = 1.5;

/** Vertical field of view for a screen shape; wider on tall screens. */
function fieldOfViewFor(aspect: number): number {
  const minHorizontal = MathUtils.degToRad(PORTRAIT_MIN_HORIZONTAL_FOV);
  const vertical = MathUtils.radToDeg(2 * Math.atan(Math.tan(minHorizontal / 2) / aspect));
  return MathUtils.clamp(vertical, CAMERA_FOV, PORTRAIT_MAX_FOV);
}

/** Whether a mesh with this material shows at all: not hidden, and not faded (almost) out. */
function isDrawn(material: Material | Material[]): boolean {
  const list = Array.isArray(material) ? material : [material];
  return list.some((one) => one.visible && (!one.transparent || one.opacity > 0.05));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** `value` moved toward `target` by at most `step`, without passing it. */
function stepToward(value: number, target: number, step: number): number {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}

/** The two turns OrbitControls keeps between the camera's up and the world's up (its own `_quat` and `_quatInverse`). */
interface OrbitUpTurns {
  /** From the camera's up to the world's up. */
  toWorldUp: Quaternion;
  /** The way back. */
  fromWorldUp: Quaternion;
}

/** The orbit controls' two turns (see setCameraUp), or null when this three.js version does not have them. */
function orbitUpTurns(controls: OrbitControls): OrbitUpTurns | null {
  if (!('_quat' in controls) || !('_quatInverse' in controls)) return null;
  const { _quat: toWorldUp, _quatInverse: fromWorldUp } = controls;
  if (!(toWorldUp instanceof Quaternion) || !(fromWorldUp instanceof Quaternion)) return null;
  return { toWorldUp, fromWorldUp };
}

/** Per-ship state for the current frame. */
interface ShipState extends ShipPose {
  readonly id: string;
  readonly role: ShipRole;
  readonly color: number;
  readonly track: ShipTrack;
  /** Its liftoff from Earth, if it has one: the time and the pad on the globe (globe-local). */
  launch: { time: number; local: Vector3 } | null;
  /** Revolutions flown around the nearer body at each sample of its path (see revolutionsOf), and the sample times. */
  revolutions: Float64Array | null;
  times: Float64Array | null;
  /** Its path and those revolutions, for finding a closed lap (see closedLapStart). */
  lap: LapPath | null;
  /** For a lander: the times it docks with another ship; it is followed only while apart on its way to one. */
  dockings: readonly number[];
  /** True while it is in fast forward: its model replaced by its ring (see FAST_FORWARD_CROSSFADE_SECONDS). */
  fast: boolean;
  /** How far its model has given way to its ring, 0 (the model) to 1 (the ring). */
  crossFade: number;
  /** Its fast-forward level for the camera and the interface, 0 to 1 (see FAST_FORWARD_ON). */
  fastForward: number;
  /** Its ring, the points it is drawn through now and those it eases toward, and its body's center. */
  ring: OrbitRing | null;
  readonly ringNow: Float32Array;
  readonly ringWanted: Float32Array;
  readonly ringCenter: Vector3;
  /** How far it is in sight, 0 (behind Earth or the Moon) to 1 (see HIDDEN_FADE_SECONDS); NaN while it does not exist. */
  seen: number;
}

/** Where a ship is and which way it goes at a mission time a view is framed for (see Stage.posesAt). */
interface FramePose {
  exists: boolean;
  readonly position: Vector3;
  readonly forward: Vector3;
}

/**
 * Two ships keeping station without docking, from `from` to `to` (mission
 * time). `anchor` stays where it is; `mover` is drawn beside it.
 */
interface StationSpan {
  readonly anchor: ShipState;
  readonly mover: ShipState;
  readonly from: number;
  readonly to: number;
  /** True when the two were docked just before (they part from docked) or dock just after (they close in). */
  readonly opens: boolean;
  readonly closes: boolean;
  /** Parting from docked: the mission time by which the gap is open at the latest (the first event after `from`, or `to`). */
  readonly openBy: number;
}

/** The pair of ships drawn apart this frame, if any. */
interface PairNow {
  readonly anchor: ShipState;
  readonly mover: ShipState;
  /** How far the mover is set out in its place, 0 to 1, and the room between the two in CSS pixels. */
  readonly arranged: number;
  readonly gapPixels: number;
  /** A docking or undocking with the main ship (drawn as before docking), or station keeping (face to face). */
  readonly moment: PairMoment | null;
  /** Station keeping: how much of the full gap is drawn, 0 to 1 (less just after undocking and just before docking). */
  readonly opening: number;
  /**
   * The mission time whose shapes set the pair's faces and scale: now, or,
   * for two that have just docked, the moment before they did, so the
   * docked pair stays where and as large as the two were drawn meeting.
   */
  readonly shapesAt: number;
}

/** A docking or an undocking of a target ship with the main ship. */
interface PairMoment {
  /** Mission time. */
  readonly time: number;
  /** The main ship's docked shape (index in its model), and the target's own shape next to the moment. */
  readonly docked: number;
  readonly alone: number;
  /** Along the main ship's travel, from its point on the path to the target's when docked, in meters. */
  readonly contact: number;
}

interface Pairing {
  readonly target: ShipState;
  readonly targetModel: ShipModel;
  readonly moments: readonly PairMoment[];
  /** When the main ship was alongside the target before docking (its rendezvous phase's `alongside`), if published. */
  readonly alongside: number | undefined;
}

/** A cited landing site, relative to the Moon's center, and the lander's facing there. */
interface LandingSite {
  readonly offset: Vector3;
  readonly front: Vector3;
}

/**
 * The 3D scene: Earth, the Moon, the stars, and a mission's flight drawn at
 * the mission clock's time, with the camera views the interface asks for
 * (only those the mission offers, see app/views.ts).
 * Create it with `Stage.create`, then `await stage.load(...)`, then `start()`.
 */
export class Stage implements Director {
  readonly textureTier: TextureTier;

  private readonly path: FlightPath;
  private readonly player: Player;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  /** Spacecraft are drawn in a second pass on top, so they are never buried in a body they are drawn larger than. */
  private readonly shipScene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly sun = new DirectionalLight(0xffffff, SUN_INTENSITY);
  private readonly shipSun = new DirectionalLight(0xffffff, SHIP_SUN_INTENSITY);

  private earth: Earth | null = null;
  private moon: Moon | null = null;
  private stars: Starfield | null = null;
  private lines: PathLine[] = [];
  /** Each ship's dot for the ship view when it is far from the followed ship (see COMPANION_MODEL_M). */
  private companionMarkers: Sprite[] = [];
  private dotMap: CanvasTexture | null = null;
  /** Each ship's line. */
  private readonly lineOf = new Map<ShipState, PathLine>();
  private eventMarkers: MarkerSet | null = null;
  private earthSites: MarkerSet | null = null;
  private moonSites: MarkerSet | null = null;
  private readonly moonAnchor = new Group();
  /** Each lander's landing site on the Moon (it does not change with the scale), by ship id. */
  private readonly landings = new Map<string, LandingSite>();
  private readonly sitePosition = new Vector3();
  private readonly siteUp = new Vector3();
  private fleet: Fleet | null = null;

  /* Clock and scale. */
  private mode: ScaleMode = 'readable';
  private mix = 0;
  private mixTween: Tween | null = null;
  private shownTime = Number.NaN;
  private shownMix = Number.NaN;
  /** The clock as last heard from (see noteClock), and whether it has jumped since the last frame. */
  private clockSeen: ClockReading;
  private clockJump = false;
  /** How far the clock jumped, in story seconds, since the last frame (the largest jump, if several). */
  private clockLeap = 0;
  private readonly eventSeconds: number[];
  private currentEvent = -2;

  /* Ships, in flight plan order. */
  private readonly ships: ShipState[];
  private readonly main: ShipState;
  private followed: ShipState;
  /** Target ships that dock with the main ship, and when. */
  private pairings: Pairing[] = [];
  /** Ships keeping station with each other without docking, and when. */
  private stations: StationSpan[] = [];
  /** The ship view's steady view while the followed craft is in fast forward (see FAST_FORWARD_CROSSFADE_SECONDS). */
  private readonly fastView = {
    active: false,
    center: new Vector3(),
    direction: new Vector3(0, 0, 1),
    up: new Vector3(0, 1, 0),
    distance: 1,
    level: 0,
  };
  /** Where a ship's model is drawn this frame (a target may be moved apart from the main ship). */
  private readonly drawnPose: ShipPose = {
    exists: false,
    position: new Vector3(),
    forward: new Vector3(1, 0, 0),
    up: new Vector3(0, 1, 0),
  };

  /* Views and camera. */
  private viewNow: EventView;
  /** True for a flight that stays in Earth orbit: its Earth view frames Earth and every orbit. */
  private readonly orbitMission: boolean;
  /** Set by setView; the framing waits a frame so any seek made with it is in place. */
  private pendingView: 'tween' | 'instant' | null = 'instant';
  /** The mission time setView asked the pending view to be framed for, if not now. */
  private pendingAt: number | null = null;
  /** The mission time the Earth or Moon view was last framed for, which a change of layout keeps (see refitOffset). */
  private framedAt = 0;
  /**
   * A move into the ship view framed for a later moment (setView's `at`):
   * that time while the clock is on its way there, and the ship followed
   * then, when it is not the one followed now. The camera heads for that
   * ship as it will be with the clock stopped there, so it chases it without
   * the steady fast-forward view (see updateCamera) until the clock stops or
   * gets there.
   */
  private chaseAt: number | null = null;
  private chaseOverride: ShipState | null = null;
  /** The chased ship as it will be at chaseAt (see chaseSubject). */
  private readonly chaseAtPose: ShipPose = {
    exists: true,
    position: new Vector3(),
    forward: new Vector3(1, 0, 0),
    up: new Vector3(0, 1, 0),
  };
  /** Every ship at a mission time a view is framed for (see posesAt), and the Sun's direction then. */
  private readonly framePoses: FramePose[];
  private readonly frameSun = new Vector3(1, 0, 0);
  private readonly frameDirection = new Vector3();
  private cameraTween: Tween | null = null;
  /** True while cameraTween is a move the `moving` getter reports (not a refit after a change of layout). */
  private cameraMove = false;
  /** True while the ship view eases back from its steady fast-forward view to the chase. */
  private fastReturning = false;
  /** What `moving` said when subscribers last heard. */
  private movingShown = false;
  private readonly tweenFrom = orientedPose();
  private readonly tweenTo = orientedPose();
  private readonly tweenPose = orientedPose();
  /** Where the current view's camera rests this frame (see settledPose). */
  private readonly restPose = orientedPose();
  private readonly upTurn = new Quaternion();
  private readonly upStep = new Quaternion();
  private readonly worldUp = new Vector3(0, 1, 0);
  /** Camera offset from the anchor once settled (world space), for the Earth, Moon, and journey views. */
  private readonly settledOffset = new Vector3(0, 0, 10);
  /** The scale mix the camera move under way is heading for. */
  private tweenMix = 0;
  /** True once the person moves the camera themselves after a framing. */
  private userMovedCamera = false;
  /** True while the stage itself runs the controls (see handleControlChange). */
  private updatingControls = false;
  /** Ship view: the smoothed ship frame, the camera's direction in it, and its distance. */
  private readonly chaseFrame = new Quaternion();
  private readonly chaseDirection = CHASE_OFFSET.clone();
  private chaseZoom = 1;
  private chaseDistance = 1;
  private chaseReady = false;
  private readonly chaseForward = new Vector3(1, 0, 0);
  /** Where the ship view's camera was last drawn from, to draw only when it moves. */
  private readonly lastChasePosition = new Vector3(Infinity, 0, 0);
  private readonly lastChaseTarget = new Vector3();
  private readonly lastChaseUp = new Vector3();

  /* Interface insets and the picture's offset. */
  private insets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private readonly clear: ClearArea = { width: 1, height: 1 };
  private offsetTarget = { x: 0, y: 0 };
  private offsetNow = { x: 0, y: 0 };
  private cssWidth = 1;
  private cssHeight = 1;

  /* Journey framing: path samples at readable and true scale. */
  private readonly journeyPoints: { readable: Float32Array; true: Float32Array };
  private readonly journeyCenter = { readable: new Vector3(), true: new Vector3() };

  /* Loop. */
  private reducedMotion = false;
  private running = false;
  /** What the fastForward getter says now. */
  private fastForwardShown = false;
  /** The pointer toward the followed ship when it is out of the Earth or Moon view (see updatePointer), and each part left behind's label. */
  private pointer: Sprite | null = null;
  private labels: Sprite[] = [];
  /** Whether each part left behind is labeled now: only once its lander has gone (see updateLabels). */
  private labelWanted: boolean[] = [];
  private readonly screenDown = new Vector3();
  /** The insets the clear area keeps, in CSS pixels (as clamped by updateClearArea). */
  private readonly clearInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  /** False while something covers the whole view (see setDrawing). */
  private drawing = true;
  private needsRender = true;
  private lastFrameMs: number | null = null;
  private readonly listeners = new Set<(director: Director) => void>();
  private readonly resizeObserver: ResizeObserver;
  private readonly cleanups: Array<() => void> = [];

  /* Scratch, so the frame loop allocates nothing. */
  private readonly scratch = [0, 0, 0];
  private readonly sunDirection = new Vector3(1, 0, 0);
  private readonly moonCenter = new Vector3(MOON_DISTANCE.readable, 0, 0);
  private readonly anchor = new Vector3();
  private readonly v1 = new Vector3();
  private readonly v2 = new Vector3();
  private readonly v3 = new Vector3();
  private readonly f1 = new Vector3();
  private readonly f2 = new Vector3();
  private readonly f3 = new Vector3();
  private readonly f4 = new Vector3();
  private readonly f5 = new Vector3();
  private readonly f6 = new Vector3();
  private readonly dockDirection = new Vector3();
  /** The farthest the followed craft's ring reaches from its body's center (scene units). */
  private ringRadius = 0;
  /** The Moon's and Earth's centers at true scale, for telling a closed lap (see closedLap). */
  private readonly moonAtTrueScale = [0, 0, 0];
  private readonly atOrigin = [0, 0, 0] as const;
  /** The scale mix the rings were last drawn at, and the view the craft were last drawn in. */
  private ringMix = Number.NaN;
  private fleetView: EventView | null = null;
  /** True from a move out of the journey view until the camera arrives (see updateFleet). */
  private leavingJourney = false;
  /** How far the ship view is drawn close up for a spacewalk, 0 to 1, and where it is heading. */
  private walkLevel = 0;
  private walkWanted = 0;
  private walkPrimed = false;
  private readonly walkPose: ShipPose = {
    exists: false,
    position: new Vector3(),
    forward: new Vector3(1, 0, 0),
    up: new Vector3(0, 1, 0),
  };
  private readonly fastFrom = orientedPose();
  private readonly fastTo = orientedPose();
  private readonly q1 = new Quaternion();
  private readonly q2 = new Quaternion();
  private readonly q3 = new Quaternion();
  private readonly m1 = new Matrix4();
  private readonly cameraForward = new Vector3();
  private readonly origin = new Vector3();
  private readonly poseContext: PoseContext = {
    time: 0,
    storyTime: 0,
    toStory: (time) => this.player.story.toStory(time),
    unitsPerPixel: 0,
    sizeScale: 1,
    maxPixels: Infinity,
    maxReachPixels: Infinity,
    dt: 0,
    snap: true,
    reducedMotion: false,
    metersPerPixel: 0,
    opacity: 1,
    glow: 1,
    focus: 0,
  };

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: StageOptions,
  ) {
    // Checked quietly first: three.js logs errors when it cannot make a context.
    if (!webGL2Available()) {
      throw new WebGLUnavailableError();
    }
    try {
      this.renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        stencil: true,
        powerPreference: 'default',
      });
    } catch (error) {
      throw new WebGLUnavailableError(error);
    }
    this.path = options.path;
    this.path.moonPosition(1, this.moonAtTrueScale);
    this.player = options.player;
    this.eventSeconds = options.mission.events.map((event) => elapsedToSeconds(event.elapsed));
    this.ships = this.path.ships.map((track, index): ShipState => {
      const role = roleOf(track, index);
      return {
        id: track.id,
        role,
        color: role === 'main' ? SHIP_COLORS.main : SHIP_COLORS.other,
        track,
        launch: null,
        revolutions: null,
        times: null,
        lap: null,
        dockings: track.phases.filter((phase) => phase.kind === 'docked').map(phaseStart),
        fast: false,
        crossFade: 0,
        fastForward: 0,
        ring: null,
        ringNow: new Float32Array(RING_POINTS * 3),
        ringWanted: new Float32Array(RING_POINTS * 3),
        ringCenter: new Vector3(),
        seen: Number.NaN,
        exists: false,
        position: new Vector3(),
        forward: new Vector3(1, 0, 0),
        up: new Vector3(0, 1, 0),
      };
    });
    const main = this.ships.find((ship) => ship.role === 'main') ?? this.ships[0];
    if (!main) throw new Error('The flight path has no ships');
    this.main = main;
    this.followed = main;
    this.framePoses = this.ships.map(() => ({
      exists: false,
      position: new Vector3(),
      forward: new Vector3(1, 0, 0),
    }));
    this.clockSeen = this.readClock();
    this.viewNow = homeView(options.mission);
    this.orbitMission = options.mission.destination === 'earth-orbit';
    this.journeyPoints = this.sampleJourney();
    this.journeyCenter.readable.copy(
      this.boundsCenter(this.journeyPoints.readable, MOON_DISTANCE.readable),
    );
    this.journeyCenter.true.copy(this.boundsCenter(this.journeyPoints.true, MOON_DISTANCE.true));

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setClearColor(0x000000, 1);
    this.textureTier = chooseTextureTier(this.renderer.capabilities.maxTextureSize);

    this.camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.01, CAMERA_FAR);
    this.scene.background = new Color(0x000000);
    this.scene.add(
      this.sun,
      this.sun.target,
      new AmbientLight(0xffffff, AMBIENT_INTENSITY),
      this.moonAnchor,
    );
    this.shipScene.add(
      this.shipSun,
      this.shipSun.target,
      new AmbientLight(0xffffff, SHIP_AMBIENT_INTENSITY),
    );

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.addEventListener('start', this.handleControlStart);
    this.controls.addEventListener('change', this.handleControlChange);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas);
    this.listen(window, 'orientationchange', () => this.handleResize());
    this.listen(document, 'visibilitychange', () => this.syncLoop());
    this.listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault();
      this.renderer.setAnimationLoop(null);
      this.options.onContextLost();
    });
    this.listen(canvas, 'webglcontextrestored', () => {
      this.options.onContextRestored();
      this.needsRender = true;
      this.syncLoop();
    });
    this.listen(canvas, 'keydown', (event) => this.handleKey(event as KeyboardEvent));
    this.cleanups.push(
      this.player.subscribe(() => {
        this.needsRender = true;
        this.noteClock();
      }),
    );

    this.handleResize();
    // While developing, the stage can be looked at from the browser console (for checking the scene).
    if (import.meta.env.DEV) window.stage = this;
  }

  /** Create the stage. Throws WebGLUnavailableError if WebGL 2 is missing. */
  static create(canvas: HTMLCanvasElement, options: StageOptions): Stage {
    return new Stage(canvas, options);
  }

  /** Load textures, build the scene, upload everything to the GPU, and draw once. */
  async load(onProgress: (loaded: number, total: number) => void): Promise<void> {
    const textures = await loadStageTextures(
      this.textureTier,
      this.renderer.capabilities.getMaxAnisotropy(),
      onProgress,
    );
    const detail = this.textureTier === '4k' ? 'high' : 'low';

    this.stars = createStarfield(textures.stars, STAR_SPHERE_RADIUS);
    this.earth = createEarth(textures.earth, detail);
    this.moon = createMoon(textures.moon, detail);
    this.scene.add(this.stars.mesh, this.earth.root, this.moon.root);
    this.buildMission();

    this.updateWorld(true);
    this.updateShips();
    this.applyFraming(true);
    this.applyLimits();

    // Upload textures and compile shaders now so the first frames are smooth.
    for (const texture of [textures.earth, textures.moon, textures.stars]) {
      this.renderer.initTexture(texture);
    }
    if (this.renderer.extensions.has('KHR_parallel_shader_compile')) {
      await this.renderer.compileAsync(this.scene, this.camera);
      await this.renderer.compileAsync(this.shipScene, this.camera);
    } else {
      this.renderer.compile(this.scene, this.camera);
      this.renderer.compile(this.shipScene, this.camera);
    }
    this.renderFrame(0);
  }

  start(): void {
    this.running = true;
    this.syncLoop();
  }

  /* ---------------------------------------------------------------- */
  /* Director                                                          */
  /* ---------------------------------------------------------------- */

  get scaleMode(): ScaleMode {
    return this.mode;
  }

  /**
   * Switch between "readable" (Moon at 10 Earth radii, orbits lifted) and
   * "true" (real distances). The Moon and the paths move together; the view
   * stays the same and follows them.
   */
  setScaleMode(mode: ScaleMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    const from = this.mix;
    const to = mode === 'true' ? 1 : 0;
    this.mixTween?.cancel();
    this.mixTween = new Tween(this.transitionMs, (t) => {
      this.mix = from + (to - from) * t;
    });
    if (this.viewNow === 'journey' && this.earth) {
      // Frame for where everything will end up.
      this.startTween(this.transitionMs, to, { move: false });
    }
    this.needsRender = true;
    this.notify();
  }

  /**
   * True while the followed ship circles too fast to follow and the scene
   * shows its calm fast-forward view (the model faded, its orbit a ring).
   * It turns on once that look is mostly in, and off once the model is
   * mostly back (a little apart, so it does not flicker), and is always
   * false with the clock stopped. Subscribers hear when it changes.
   */
  get fastForward(): boolean {
    return this.fastForwardShown;
  }

  get view(): EventView {
    return this.viewNow;
  }

  /**
   * True while the camera is on its way: a move to a view (asked for, or to
   * a followed ship handed over far off), a swing that brings the followed
   * ship back into view after a jump of the clock, or the ship view's return
   * from its steady fast-forward view. Not while it refits to a change of
   * layout or of scale. Subscribers hear when it changes.
   */
  get moving(): boolean {
    const tweening = this.cameraMove && this.cameraTween !== null && !this.cameraTween.done;
    return this.pendingView === 'tween' || tweening || this.fastReturning;
  }

  /**
   * Move the camera to a view. With `instant`, jump there (also the case
   * with reduced motion). A view the mission does not offer becomes the
   * nearest one it does. With `at`, the view is framed for the spacecraft as
   * it will be at that mission time (a tour on its way to a stop asks for
   * the stop's), so arriving there needs no second move: the Earth and Moon
   * views look from where the ship followed then will be, and the ship view
   * heads for the ship followed then.
   */
  setView(view: EventView, options: { at?: number; instant?: boolean } = {}): void {
    const at = options.at;
    this.viewNow = nearestView(this.options.mission, view);
    this.userMovedCamera = false;
    this.pendingView = options.instant || !this.running || this.reducedMotion ? 'instant' : 'tween';
    this.pendingAt = at !== undefined && Number.isFinite(at) ? at : null;
    this.endChaseAt(false);
    if (this.viewNow === 'spacecraft') {
      this.chaseReady = false;
      this.chaseDirection.copy(CHASE_OFFSET);
      this.chaseZoom = 1;
      if (this.pendingAt !== null && this.pendingAt > this.player.time) {
        this.chaseAt = this.pendingAt;
        const ship = this.followedAt(this.pendingAt);
        if (ship !== this.followed && ship.exists) this.chaseOverride = ship;
      }
    }
    // Say now, not from the next frame, whether this starts a move: none when the
    // camera is already where the view puts it (the view asked for again, as framed).
    if (this.pendingView === 'tween' && this.earth && this.alreadyFramed()) {
      this.pendingView = 'instant';
    }
    this.needsRender = true;
    this.movingShown = this.moving;
    this.notify();
  }

  /** True when the camera already rests where the pending view's framing puts it (see setView). */
  private alreadyFramed(): boolean {
    this.framingOffset(this.settledOffset, this.mix, this.pendingAt ?? this.player.time);
    this.settledPose(this.tweenTo);
    this.tweenFrom.position.copy(this.camera.position);
    this.tweenFrom.target.copy(this.controls.target);
    this.tweenFrom.up.copy(this.camera.up);
    return this.samePose(this.tweenFrom, this.tweenTo);
  }

  setViewInsets(insets: ViewInsets): void {
    const same =
      insets.top === this.insets.top &&
      insets.right === this.insets.right &&
      insets.bottom === this.insets.bottom &&
      insets.left === this.insets.left;
    if (same) return;
    this.insets = { ...insets };
    this.updateClearArea();
    this.reframeAfterLayout();
  }

  subscribe(listener: (director: Director) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.controls.enableDamping = !reduced;
    this.needsRender = true;
  }

  /**
   * What the scene is drawing now, as last drawn (see SceneReport): for the
   * browser tests, which cannot look inside a canvas. Nothing here changes
   * the picture.
   */
  report(): SceneReport {
    const t = this.player.time;
    const models = this.fleet?.ships ?? [];
    const insets = this.clearInsets;
    return {
      view: this.viewNow,
      scaleMode: this.scaleMode,
      time: t,
      fastForward: this.fastForward,
      canvas: { width: this.cssWidth, height: this.cssHeight },
      clear: {
        x: insets.left,
        y: insets.top,
        width: this.cssWidth - insets.left - insets.right,
        height: this.cssHeight - insets.top - insets.bottom,
      },
      followed: this.followed.id,
      ships: this.ships.map((ship, i) => {
        const model = models[i];
        const names = model ? model.shapeParts(model.shapeAt(t)) : [];
        return {
          id: ship.id,
          fastForward: ship.fast,
          box: model ? this.boxOnCanvas(model.root) : null,
          parts: names.map((name) => ({
            name,
            box: model ? this.boxOnCanvas(model.root, name) : null,
          })),
        };
      }),
      leftBehind: (this.fleet?.leftBehind ?? []).map((part) => ({
        part: part.part,
        ship: part.shipId,
        box: this.boxOnCanvas(part.root),
      })),
      labels: this.labels.map((label, i) => {
        const opacity = label.visible ? (label.material as SpriteMaterial).opacity : 0;
        return {
          text: this.options.leftBehind[i]?.label ?? '',
          opacity,
          box: opacity > 0 ? this.labelBox(label) : null,
        };
      }),
    };
  }

  /**
   * The box on the canvas around the drawn meshes under `root`, or only
   * those of its part `name`: null when none are drawn (hidden, faded out)
   * or any of it is behind the camera.
   */
  private boxOnCanvas(root: Object3D, name?: string): SceneBox | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let behind = false;
    const corner = this.v1;
    const walk = (node: Object3D, inside: boolean): void => {
      if (!node.visible) return;
      const within = inside || node.name === name;
      if (within && node instanceof Mesh && isDrawn(node.material as Material | Material[])) {
        const geometry = node.geometry as BufferGeometry;
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (box) {
          for (let k = 0; k < 8; k += 1) {
            corner
              .set(
                k & 1 ? box.max.x : box.min.x,
                k & 2 ? box.max.y : box.min.y,
                k & 4 ? box.max.z : box.min.z,
              )
              .applyMatrix4(node.matrixWorld);
            if (
              this.v2.subVectors(corner, this.camera.position).dot(this.cameraForward) <=
              this.camera.near
            ) {
              behind = true;
              continue;
            }
            corner.project(this.camera);
            const x = ((corner.x + 1) / 2) * this.cssWidth;
            const y = ((1 - corner.y) / 2) * this.cssHeight;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      for (const child of node.children) walk(child, within);
    };
    walk(root, name === undefined);
    if (behind || !Number.isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /** The box on the canvas a label (see updateLabels) covers. */
  private labelBox(label: Sprite): SceneBox {
    const anchor = this.v1.copy(label.position).project(this.camera);
    const height = label.userData['pixels'] as number;
    const width = height * (label.userData['aspect'] as number);
    const x = ((anchor.x + 1) / 2) * this.cssWidth;
    const y = ((1 - anchor.y) / 2) * this.cssHeight;
    return { x: x - label.center.x * width, y: y + (label.center.y - 1) * height, width, height };
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    for (const cleanup of this.cleanups) cleanup();
    this.controls.removeEventListener('start', this.handleControlStart);
    this.controls.removeEventListener('change', this.handleControlChange);
    this.controls.dispose();
    this.earth?.dispose();
    this.moon?.dispose();
    this.stars?.dispose();
    for (const line of this.lines) line.dispose();
    for (const ship of this.ships) ship.ring?.dispose();
    this.eventMarkers?.dispose();
    this.earthSites?.dispose();
    this.moonSites?.dispose();
    this.fleet?.dispose();
    for (const marker of this.companionMarkers) (marker.material as SpriteMaterial).dispose();
    for (const sprite of [this.pointer, ...this.labels]) {
      const material = sprite?.material as SpriteMaterial | undefined;
      material?.map?.dispose();
      material?.dispose();
    }
    this.dotMap?.dispose();
    this.renderer.dispose();
  }

  /* ---------------------------------------------------------------- */
  /* Building the mission                                              */
  /* ---------------------------------------------------------------- */

  private buildMission(): void {
    const earth = this.earth;
    if (!earth) return;

    // Paths. A ship docked to another rides on that ship's line meanwhile.
    this.ships.forEach((ship, i) => {
      const polyline = this.path.polyline(ship.id);
      if (!polyline) return;
      const hidden = ship.track.phases
        .filter((phase) => phase.kind === 'docked')
        .map((phase) => [phaseStart(phase), phaseEnd(phase)] as const);
      const { revolutions, runs } = this.revolutionsOf(polyline);
      ship.revolutions = revolutions;
      ship.times = polyline.times;
      ship.lap = {
        revolutions,
        truePositions: polyline.truePositions,
        readablePositions: polyline.readablePositions,
      };
      const fade: PathFade | null = runs.length > 0 ? { ...ORBIT_FADE, revolutions, runs } : null;
      const line = createPathLine(polyline, ship.color, i + 1, hidden, fade);
      this.lineOf.set(ship, line);
      line.mesh.renderOrder = 1 + i;
      line.setResolution(this.cssWidth, this.cssHeight);
      this.lines.push(line);
      this.scene.add(line.mesh);
    });
    // Each ship's fast-forward ring, in its color, lightened.
    const white = new Color(0xffffff);
    this.ships.forEach((ship, i) => {
      const ring = createOrbitRing(0xffffff, FAST_FORWARD_RING_PX, RING_POINTS);
      ring.setColor(new Color(ship.color).lerp(white, RING_LIGHTEN));
      ring.mesh.renderOrder = 2 + this.ships.length + i;
      ring.setResolution(this.cssWidth, this.cssHeight);
      this.scene.add(ring.mesh);
      ship.ring = ring;
    });

    // Event markers, on the path of the ship the story follows at each event
    // (or, before that ship flies, of a ship that already does).
    const points: MarkerPoint[] = [];
    this.eventSeconds.forEach((t, index) => {
      const followed = this.followedAt(t);
      for (const ship of [followed, ...this.ships.filter((other) => other !== followed)]) {
        const readable = [0, 0, 0];
        const real = [0, 0, 0];
        if (
          !this.path.position(ship.id, t, 0, readable) ||
          !this.path.position(ship.id, t, 1, real)
        )
          continue;
        points.push({
          readable,
          true: real,
          color: ship.color,
          eventIndex: index,
          group: this.ships.indexOf(ship),
        });
        break;
      }
    });
    this.eventMarkers = createMarkers(points, false);
    this.scene.add(this.eventMarkers.points);

    // Sites: where each ship lifted off from Earth, landed, and splashed down.
    const earthPoints: MarkerPoint[] = [];
    const moonPoints: MarkerPoint[] = [];
    for (const ship of this.ships) {
      for (const phase of ship.track.phases) {
        if (phase.kind === 'ascent' && phase.body === 'earth') {
          const local = this.earthSite(ship.id, phaseStart(phase), 1);
          if (!local) continue;
          earthPoints.push({
            readable: local.toArray(),
            true: local.toArray(),
            color: 0xffffff,
            eventIndex: -1,
          });
          ship.launch ??= { time: phaseStart(phase), local };
        } else if (phase.kind === 'entry' || (phase.kind === 'descent' && phase.body === 'earth')) {
          const local = this.earthSite(ship.id, phaseEnd(phase), -1);
          if (local)
            earthPoints.push({
              readable: local.toArray(),
              true: local.toArray(),
              color: 0xffffff,
              eventIndex: -1,
            });
        } else if (phase.kind === 'descent') {
          const site = this.moonSite(ship.id, phaseEnd(phase));
          if (!site) continue;
          moonPoints.push({
            readable: site.offset.toArray(),
            true: site.offset.toArray(),
            color: 0xffffff,
            eventIndex: -1,
          });
          if (!this.landings.has(ship.id)) this.landings.set(ship.id, site);
        }
      }
    }
    // Earth's sites turn with the globe; the Moon's ride with the Moon (which does not turn in this frame).
    this.earthSites = createMarkers(earthPoints, true);
    earth.globe.add(this.earthSites.points);
    if (moonPoints.length > 0) {
      this.moonSites = createMarkers(moonPoints, true);
      this.moonAnchor.add(this.moonSites.points);
    }

    // The spacecraft.
    this.fleet = buildFleet(this.ships, this.options.vehicle, this.options.leftBehind, (moment) =>
      elapsedToSeconds(moment.at.value),
    );
    for (const ship of this.fleet.ships) this.shipScene.add(ship.halo, ship.root);
    this.companionMarkers = this.ships.map((ship) => {
      const marker = new Sprite(
        new SpriteMaterial({
          map: this.dotTexture(),
          color: ship.color,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          sizeAttenuation: false,
        }),
      );
      marker.visible = false;
      marker.renderOrder = 10;
      this.shipScene.add(marker);
      return marker;
    });
    for (const part of this.fleet.leftBehind) this.shipScene.add(part.root);
    this.pointer = new Sprite(
      new SpriteMaterial({
        map: this.arrowTexture(),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: false,
      }),
    );
    this.pointer.visible = false;
    this.pointer.renderOrder = 12;
    this.shipScene.add(this.pointer);
    this.labels = this.options.leftBehind.map((item) => this.labelSprite(item.label));
    this.labelWanted = this.labels.map(() => false);
    for (const label of this.labels) this.shipScene.add(label);
    this.pairings = this.findPairings(this.fleet);
    this.stations = this.findStations();

    const ratio = this.renderer.getPixelRatio();
    for (const set of [this.eventMarkers, this.earthSites, this.moonSites])
      set?.setPixelRatio(ratio);
  }

  /**
   * Revolutions flown around the nearer body at each sample of a path (the
   * angle swept about Earth's or the Moon's center, at true scale), and the
   * stretches of it that fade loop by loop (see ORBIT_FADE): the whole path
   * of a flight that stays in Earth orbit; for a Moon flight, each long stay
   * in lunar orbit.
   */
  private revolutionsOf(polyline: {
    readonly times: Float64Array;
    readonly truePositions: Float32Array;
  }): Pick<PathFade, 'revolutions' | 'runs'> {
    const n = polyline.times.length;
    const revolutions = new Float64Array(n);
    const moon = [0, 0, 0];
    this.path.moonPosition(1, moon);
    const moonCenter = new Vector3().fromArray(moon);
    const p = new Vector3();
    const a = new Vector3();
    const b = new Vector3();
    const p2 = polyline.truePositions;
    /** Near the Moon (by height in body radii), and low over it. */
    const nearMoonAt = (i: number): boolean => {
      p.fromArray(p2, 3 * i);
      const moonHeight = (p.distanceTo(moonCenter) - MOON_RADIUS) / MOON_RADIUS;
      const earthHeight = (p.length() - EARTH_RADIUS) / EARTH_RADIUS;
      return moonHeight < earthHeight;
    };
    const lowOverMoon = (i: number): boolean => {
      p.fromArray(p2, 3 * i);
      return p.distanceTo(moonCenter) < MOON_RADIUS * 1.6;
    };
    let total = 0;
    for (let i = 1; i < n; i += 1) {
      const center = nearMoonAt(i) ? moonCenter : this.origin;
      a.fromArray(p2, 3 * (i - 1)).sub(center);
      b.fromArray(p2, 3 * i).sub(center);
      const la = a.length();
      const lb = b.length();
      if (la > 1e-9 && lb > 1e-9)
        total += Math.acos(MathUtils.clamp(a.dot(b) / (la * lb), -1, 1)) / (Math.PI * 2);
      revolutions[i] = total;
    }
    const runs: Array<readonly [number, number]> = [];
    if (n < 2) return { revolutions, runs };
    if (this.orbitMission) {
      runs.push([0, n - 1]);
      return { revolutions, runs };
    }
    // Long stays low over the Moon.
    let first = -1;
    for (let i = 0; i <= n; i += 1) {
      const low = i < n && lowOverMoon(i);
      if (low && first < 0) first = i;
      if (!low && first >= 0) {
        const last = i - 1;
        if (
          (revolutions[last] ?? 0) - (revolutions[first] ?? 0) > LONG_LUNAR_STAY_REVOLUTIONS &&
          runs.length < 4
        )
          runs.push([first, last]);
        first = -1;
      }
    }
    return { revolutions, runs };
  }

  /**
   * Ships keeping station without docking: each `station` phase, each
   * rendezvous past its `alongside` time, and each final approach to a
   * docking at an event (see approachesAtEvents), unless the main ship
   * docks with a target there (Gemini 8's is drawn as an approach to
   * docking, see findPairings). The ship that stays put is the one the story
   * follows then (or the main ship); the other is drawn beside it.
   */
  private findStations(): StationSpan[] {
    const spans: StationSpan[] = [];
    const approaches = approachesAtEvents(this.path, this.eventSeconds);
    for (const chaser of this.ships) {
      const phases = chaser.track.phases;
      phases.forEach((phase, k) => {
        let from: number;
        let target: string;
        if (phase.kind === 'station') {
          from = phaseStart(phase);
          target = phase.target;
        } else if (phase.kind === 'rendezvous') {
          const docks = closesToDocked(phases, k);
          const paired = this.pairings.some(
            (pairing) => pairing.target.id === phase.target && chaser === this.main,
          );
          if (docks && paired) return;
          // Its final approach to a docking at an event, from when it came alongside.
          const approach = docks
            ? approaches.find((one) => Math.abs(one.end - phaseEnd(phase)) < 1e-6)
            : undefined;
          if (phase.alongside) from = elapsedToSeconds(phase.alongside.value);
          else if (approach) from = approach.start;
          else return;
          target = phase.target;
        } else {
          return;
        }
        const other = this.ships.find((ship) => ship.id === target);
        if (!other || other === chaser) return;
        const to = phaseEnd(phase);
        const middle = (from + to) / 2;
        const followed = this.followedAt(middle);
        const anchor =
          followed === chaser || followed === other
            ? followed
            : chaser === this.main || other !== this.main
              ? chaser
              : other;
        spans.push({
          anchor,
          mover: anchor === chaser ? other : chaser,
          from,
          to,
          // A lander's first phase parts it from the ship that carried it.
          opens: partsFromDocked(phases, k),
          closes: closesToDocked(phases, k),
          openBy: Math.min(to, ...this.eventSeconds.filter((time) => time > from + 1e-6)),
        });
      });
    }
    return spans;
  }

  /**
   * Where a ship is at mission time t (true scale), on the globe as it was
   * turned then (globe-local), or null. At a phase boundary, `nudge` (+1
   * or -1) says which side of it to try if the ship is not there exactly.
   */
  private earthSite(shipId: string, t: number, nudge: number): Vector3 | null {
    const earth = this.earth;
    if (!earth) return null;
    let time = t;
    if (!this.path.position(shipId, time, 1, this.scratch)) {
      time = t + nudge * 0.001;
      if (!this.path.position(shipId, time, 1, this.scratch)) return null;
    }
    earth.setOrientation(this.path.earthAxisAngle(time), this.path.earthSpinAngle(time));
    earth.root.updateMatrixWorld(true);
    return earth.globe.worldToLocal(new Vector3().fromArray(this.scratch));
  }

  /** A landing site on the Moon at mission time t, relative to the Moon's center, and the lander's facing there. */
  private moonSite(shipId: string, t: number): LandingSite | null {
    let time = t;
    if (!this.path.position(shipId, time, 0, this.scratch)) {
      time = t - 0.001;
      if (!this.path.position(shipId, time, 0, this.scratch)) return null;
    }
    const center = [0, 0, 0];
    this.path.moonPosition(0, center);
    const offset = new Vector3().fromArray(this.scratch).sub(this.v2.fromArray(center));
    // Which way it faced as it set down: its travel just before landing, along the ground.
    const front = new Vector3(0, 0, 1);
    if (this.path.direction(shipId, time - 20, 0, this.scratch)) front.fromArray(this.scratch);
    return { offset, front };
  }

  /**
   * Each target ship's dockings with the main ship and undockings from it,
   * read from the vehicle changes: the target is drawn as part of the main
   * ship (no parts of its own) while docked.
   */
  private findPairings(fleet: Fleet): Pairing[] {
    const mainModel = fleet.ships[this.ships.indexOf(this.main)];
    if (!mainModel) return [];
    const pairings: Pairing[] = [];
    this.ships.forEach((target, i) => {
      const model = fleet.ships[i];
      if (target.role !== 'target' || !model) return;
      const moments: PairMoment[] = [];
      for (let k = 1; k < model.shapeCount; k += 1) {
        const before = model.shapeParts(k - 1).length > 0;
        const after = model.shapeParts(k).length > 0;
        if (before === after) continue;
        const time = model.shapeTime(k);
        // Docking: the main ship's shape from then on; undocking: its shape until then.
        const docked = mainModel.shapeAt(after ? time - 1e-3 : time);
        const alone = after ? k : k - 1;
        if (docked < 0 || mainModel.shapeLayout(docked) !== 'docked') continue;
        const middle = mainModel.partsMiddle(docked, model.shapeParts(alone));
        if (middle === undefined) continue;
        moments.push({ time, docked, alone, contact: middle - model.shapeMiddle(alone) });
      }
      // Station keeping: the main ship's rendezvous with this target says when it was alongside.
      let alongside: number | undefined;
      for (const phase of this.main.track.phases) {
        if (phase.kind !== 'rendezvous' || phase.target !== target.id) continue;
        const at = (phase as { readonly alongside?: { readonly value: ElapsedTime } }).alongside;
        if (at) alongside = elapsedToSeconds(at.value);
      }
      if (moments.length > 0) pairings.push({ target, targetModel: model, moments, alongside });
    });
    return pairings;
  }

  /**
   * The ship the story follows: a lander while it flies apart from the main
   * ship with its crew (on its way to docking again; Apollo 13's, cast off
   * empty before entry, is not followed), otherwise the main ship. A target
   * is followed only before the main ship lifts off (Gemini 8's Agena, or
   * Gemini 7 for Gemini 6A, flew first), as the only ship there is.
   */
  private followedAt(t: number): ShipState {
    for (const ship of this.ships) {
      if (ship.role !== 'lander') continue;
      const phase = this.path.phaseAt(ship.id, t);
      if (phase && phase.kind !== 'docked' && ship.dockings.some((time) => time >= t)) return ship;
    }
    if (t < this.main.track.start) {
      const flying = this.ships.find((ship) => t >= ship.track.start && t <= ship.track.end);
      if (flying) return flying;
    }
    return this.main;
  }

  /** The ship the Earth and Moon views frame: the followed ship, or before it flies, the first one that does. */
  private subject(): ShipState {
    if (this.followed.exists) return this.followed;
    return this.ships.find((ship) => ship.exists) ?? this.followed;
  }

  /** The ship the ship view's camera follows: the followed ship, or while a move heads for a later moment, the one followed then (see chaseAt). */
  private chased(): ShipState {
    return this.chaseOverride ?? this.followed;
  }

  /**
   * End a move's hold on a later moment (see chaseAt). If the camera was
   * following a ship other than the followed one, and `handOver` is true, it
   * moves to the followed one when that is far off, as at any handover.
   */
  private endChaseAt(handOver: boolean): void {
    const before = this.chased();
    this.chaseAt = null;
    this.chaseOverride = null;
    if (!handOver || this.viewNow !== 'spacecraft' || this.pendingView) return;
    if (before.position.distanceTo(this.followed.position) > HANDOVER_DISTANCE) {
      this.pendingView = this.running && !this.reducedMotion ? 'tween' : 'instant';
    }
  }

  /**
   * Every ship at mission time `at` (scale mix `mix`), into framePoses, and
   * the Sun's direction then, into frameSun. Returns the one the Earth and
   * Moon views frame then: the ship followed then, or before it flies, the
   * first one that does (as subject() does for now); null when none does.
   */
  private posesAt(at: number, mix: number): FramePose | null {
    this.ships.forEach((ship, i) => {
      const pose = this.framePoses[i] as FramePose;
      pose.exists = this.path.position(ship.id, at, mix, this.scratch);
      if (!pose.exists) return;
      pose.position.fromArray(this.scratch);
      if (this.path.direction(ship.id, at, mix, this.scratch)) pose.forward.fromArray(this.scratch);
    });
    this.path.sunDirection(at, this.scratch);
    this.frameSun.fromArray(this.scratch);
    const followed = this.framePoses[this.ships.indexOf(this.followedAt(at))];
    if (followed?.exists) return followed;
    return this.framePoses.find((pose) => pose.exists) ?? null;
  }

  /**
   * How far from a body's center the low orbits of the craft near it at
   * mission time `at` reach (see LOW_ORBIT_RADII), in scene units at scale
   * mix `mix`: the farthest any of them gets within LOW_ORBIT_WINDOW_SECONDS
   * either side, counting only its path within LOW_ORBIT_RADII of the center,
   * so a craft arriving from far off, or leaving, counts only once it is
   * close. Reads framePoses, so call posesAt(at, mix) first.
   */
  private orbitReach(center: Vector3, radius: number, at: number, mix: number): number {
    let reach = 0;
    const limit = radius * LOW_ORBIT_RADII;
    this.ships.forEach((ship, i) => {
      const pose = this.framePoses[i];
      if (!pose?.exists || pose.position.distanceTo(center) > radius * (1 + NEAR_BODY_RADII))
        return;
      const line = this.path.polyline(ship.id);
      if (!line) return;
      const { times, readablePositions: readable, truePositions: real } = line;
      const from = Math.floor(indexAtValue(times, at - LOW_ORBIT_WINDOW_SECONDS));
      for (let k = from; k < times.length; k += 1) {
        if ((times[k] as number) > at + LOW_ORBIT_WINDOW_SECONDS) break;
        const x = MathUtils.lerp(readable[3 * k] ?? 0, real[3 * k] ?? 0, mix) - center.x;
        const y = MathUtils.lerp(readable[3 * k + 1] ?? 0, real[3 * k + 1] ?? 0, mix) - center.y;
        const z = MathUtils.lerp(readable[3 * k + 2] ?? 0, real[3 * k + 2] ?? 0, mix) - center.z;
        const distance = Math.hypot(x, y, z);
        if (distance <= limit) reach = Math.max(reach, distance);
      }
    });
    return reach;
  }

  /** The mission clock now, as clockJumped reads it. */
  private readClock(): ClockReading {
    return {
      story: this.player.storyTime,
      playing: this.player.playing,
      speed: this.player.speed,
    };
  }

  /**
   * Hear the clock: it tells of each step it runs and of every seek alike.
   * Note a jump (a seek, not a slow frame; see clockJumped) for the next
   * frame, which is all that moves the camera in the Earth and Moon views
   * besides the visitor and a change of view.
   */
  private noteClock(): void {
    const now = this.readClock();
    if (clockJumped(this.clockSeen, now)) {
      this.clockJump = true;
      this.clockLeap = Math.max(this.clockLeap, Math.abs(now.story - this.clockSeen.story));
    }
    this.clockSeen = now;
  }

  /** A few hundred points along every path, for framing the journey view (and an Earth-orbit flight's Earth view). */
  private sampleJourney(): Record<ScaleMode, Float32Array> {
    const readable: number[] = [];
    const real: number[] = [];
    for (const ship of this.path.ships) {
      const line = this.path.polyline(ship.id);
      if (!line) continue;
      const n = line.times.length;
      const step = Math.max(1, Math.floor(n / 300));
      for (let i = 0; i < n; i += step) {
        for (let k = 0; k < 3; k += 1) {
          readable.push(line.readablePositions[3 * i + k] ?? 0);
          real.push(line.truePositions[3 * i + k] ?? 0);
        }
      }
    }
    return { readable: Float32Array.from(readable), true: Float32Array.from(real) };
  }

  /** Middle of the box around the path, Earth, and the Moon. */
  private boundsCenter(points: Float32Array, moonDistance: number): Vector3 {
    const min = new Vector3(-EARTH_FRAME_RADIUS, -EARTH_FRAME_RADIUS, -EARTH_FRAME_RADIUS);
    const max = new Vector3(moonDistance + MOON_RADIUS, EARTH_FRAME_RADIUS, EARTH_FRAME_RADIUS);
    const p = new Vector3();
    for (let i = 0; i < points.length; i += 3) {
      p.fromArray(points, i);
      min.min(p);
      max.max(p);
    }
    return min.add(max).multiplyScalar(0.5);
  }

  /* ---------------------------------------------------------------- */
  /* Each frame: the world at the mission clock's time                 */
  /* ---------------------------------------------------------------- */

  /** Turn Earth, aim the Sun, place the Moon, and light the paths for the current time and scale. */
  private updateWorld(force = false): boolean {
    const t = this.player.time;
    const timeChanged = force || t !== this.shownTime;
    const mixChanged = force || this.mix !== this.shownMix;
    if (!timeChanged && !mixChanged) return false;

    if (timeChanged) {
      const axis = this.path.earthAxisAngle(t);
      this.earth?.setOrientation(axis, this.path.earthSpinAngle(t));
      this.stars?.setAxisAngle(axis);
      this.path.sunDirection(t, this.scratch);
      this.sunDirection.fromArray(this.scratch);
      this.sun.position.copy(this.sunDirection).multiplyScalar(100);
      this.shipSun.position.copy(this.sunDirection).multiplyScalar(100);
      this.earth?.setSunDirection(this.sunDirection);
      this.moon?.setSunDirection(this.sunDirection);
      for (let i = 0; i < this.lines.length; i += 1) (this.lines[i] as PathLine).setTime(t);
      this.fadeEndedPaths();
      const current = this.eventIndexAt(t);
      if (current !== this.currentEvent) {
        this.currentEvent = current;
        this.eventMarkers?.setCurrent(current);
      }
      this.shownTime = t;
    }
    if (mixChanged) {
      this.path.moonPosition(this.mix, this.scratch);
      this.moonCenter.fromArray(this.scratch);
      this.moon?.setPosition(this.moonCenter, this.origin);
      this.moonAnchor.position.copy(this.moonCenter);
      for (let i = 0; i < this.lines.length; i += 1) (this.lines[i] as PathLine).setMix(this.mix);
      this.eventMarkers?.setMix(this.mix);
      this.shownMix = this.mix;
    }
    return true;
  }

  /**
   * A ship whose path ends before the flight does (Apollo 7's spent stage,
   * a lunar module cast off) does not leave its line behind: the line and
   * the event markers on it fade out just after the path ends. The main
   * ship's line stays.
   */
  private fadeEndedPaths(): void {
    const story = this.player.storyTime;
    this.ships.forEach((ship, i) => {
      let opacity = 1;
      if (ship !== this.main && ship.track.end < this.path.end - 1) {
        const end = this.player.story.toStory(ship.track.end);
        opacity = 1 - smoothstep(end, end + PATH_END_FADE_STORY_SECONDS, story);
      }
      this.lineOf.get(ship)?.setOpacity(opacity);
      this.eventMarkers?.setGroupOpacity(i, opacity);
    });
  }

  /** The last event at or before t (a little tolerance so a seek to an event lands on it), or -1. */
  private eventIndexAt(t: number): number {
    const seconds = this.eventSeconds;
    let lo = 0;
    let hi = seconds.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if ((seconds[mid] ?? Infinity) <= t + 0.01) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  }

  /**
   * Where each ship is and which way it is going. A ship that has not
   * lifted off yet waits at its pad on the turning Earth (not drawn), so
   * the ship view can look there before liftoff.
   */
  private updateShips(): void {
    const t = this.player.time;
    for (let i = 0; i < this.ships.length; i += 1) {
      const ship = this.ships[i] as ShipState;
      ship.exists = this.path.position(ship.id, t, this.mix, this.scratch);
      if (!ship.exists) {
        if (ship.launch && t < ship.launch.time && this.earth) {
          this.earth.root.updateMatrixWorld(true);
          this.earth.globe.localToWorld(ship.position.copy(ship.launch.local));
          ship.up.copy(ship.position).normalize();
          ship.forward.copy(ship.up);
        }
        continue;
      }
      ship.position.fromArray(this.scratch);
      if (this.path.direction(ship.id, t, this.mix, this.scratch))
        ship.forward.fromArray(this.scratch);
      this.radialUp(ship.position, ship.up);
      // Down on Earth (a capsule floating after splashdown): it came down, so it stays heat shield down.
      const phase = this.path.phaseAt(ship.id, t);
      if (phase?.kind === 'surface' && phase.body === 'earth') ship.forward.copy(ship.up).negate();
    }
    const followed = this.followedAt(t);
    if (followed !== this.followed) {
      // Handing the ship view to a ship somewhere else (the main ship at its liftoff): move the camera there.
      // (Not when the camera already follows it, on a move to the moment it is followed: see chaseAt.)
      const chased = this.chased();
      const far = followed.position.distanceTo(chased.position) > HANDOVER_DISTANCE;
      this.followed = followed;
      if (this.chaseOverride === followed) this.chaseOverride = null;
      if (far && followed !== chased && this.viewNow === 'spacecraft' && !this.pendingView) {
        this.pendingView = this.running && !this.reducedMotion ? 'tween' : 'instant';
      }
    }
  }

  /** Unit vector away from the nearer body (by height in body radii). */
  private radialUp(position: Vector3, out: Vector3): Vector3 {
    const toEarth = position.length();
    const toMoon = position.distanceTo(this.moonCenter);
    const earthHeight = (toEarth - EARTH_RADIUS) / EARTH_RADIUS;
    const moonHeight = (toMoon - MOON_RADIUS) / MOON_RADIUS;
    if (moonHeight < earthHeight) out.subVectors(position, this.moonCenter);
    else out.copy(position);
    if (out.lengthSq() < 1e-12) out.set(0, 1, 0);
    return out.normalize();
  }

  /* ---------------------------------------------------------------- */
  /* Camera views                                                      */
  /* ---------------------------------------------------------------- */

  private get transitionMs(): number {
    return this.reducedMotion ? 0 : TRANSITION_MS;
  }

  /** The point the current view looks at, at the current scale (or at mix `mix`). */
  private viewAnchor(out: Vector3, mix = this.mix): Vector3 {
    switch (this.viewNow) {
      case 'earth':
        return out.set(0, 0, 0);
      case 'moon':
        return out.set(
          MOON_DISTANCE.readable + (MOON_DISTANCE.true - MOON_DISTANCE.readable) * mix,
          0,
          0,
        );
      case 'spacecraft':
        return out.copy(this.chased().position);
      case 'journey':
        return out.lerpVectors(this.journeyCenter.readable, this.journeyCenter.true, mix);
    }
  }

  /** Bodies for framing and occlusion. */
  private moonSphere(mix: number): SphereLike {
    return {
      center: new Vector3(
        MOON_DISTANCE.readable + (MOON_DISTANCE.true - MOON_DISTANCE.readable) * mix,
        0,
        0,
      ),
      radius: MOON_RADIUS,
    };
  }

  /**
   * The settled camera offset (from the anchor) for the current view, framed
   * for mission time `at` (now unless a view was asked for a later moment),
   * written to `out`. For the ship view this also resets the chase so it
   * starts behind and above the ship.
   */
  private framingOffset(out: Vector3, mix = this.mix, at = this.player.time): Vector3 {
    switch (this.viewNow) {
      case 'journey':
        return this.journeyOffset(out, mix);
      case 'earth':
      case 'moon': {
        const isEarth = this.viewNow === 'earth';
        const center = isEarth ? this.origin : this.moonSphere(mix).center;
        const radius = isEarth ? EARTH_FRAME_RADIUS : MOON_RADIUS;
        const subject = this.posesAt(at, mix);
        const direction = this.bodyDirection(center, radius, subject, this.frameDirection);
        this.framedAt = at;
        return out
          .copy(direction)
          .multiplyScalar(this.bodyDistance(center, radius, direction, subject, at, mix));
      }
      case 'spacecraft': {
        const ship = this.chaseSubject();
        this.chaseFrameFor(ship, this.chaseFrame);
        this.chaseReady = true;
        this.chaseDistance = this.chaseAutoDistance(ship);
        return out
          .copy(this.chaseDirection)
          .applyQuaternion(this.chaseFrame)
          .multiplyScalar(this.chaseDistance * this.chaseZoom);
      }
    }
  }

  /** Small spheres along every path at scale mix `mix`, for framing. */
  private pathSpheres(mix: number): SphereLike[] {
    const spheres: SphereLike[] = [];
    const points = this.journeyPoints;
    for (let i = 0; i < points.readable.length; i += 3) {
      spheres.push({
        center: new Vector3(
          MathUtils.lerp(points.readable[i] ?? 0, points.true[i] ?? 0, mix),
          MathUtils.lerp(points.readable[i + 1] ?? 0, points.true[i + 1] ?? 0, mix),
          MathUtils.lerp(points.readable[i + 2] ?? 0, points.true[i + 2] ?? 0, mix),
        ),
        radius: 0.05 + 0.02 * mix,
      });
    }
    return spheres;
  }

  /**
   * The journey view is a diagram with one fixed orientation for the whole
   * mission: seen from the north (above the plane of the path), Earth on the
   * left, the Moon on the right. It never turns to follow the ship; a ship
   * behind Earth or the Moon is drawn anyway (see updateFleet).
   */
  private journeyOffset(out: Vector3, mix: number): Vector3 {
    const center = this.viewAnchor(new Vector3(), mix);
    const spheres: SphereLike[] = [
      { center: this.origin, radius: EARTH_FRAME_RADIUS },
      this.moonSphere(mix),
      ...this.pathSpheres(mix),
    ];
    // Leave room at the edges for a spacecraft model drawn at the end of the path.
    const clear: ClearArea = {
      width: Math.max(0.2, this.clear.width - (2 * JOURNEY_EDGE_PX) / this.cssWidth),
      height: Math.max(0.2, this.clear.height - (2 * JOURNEY_EDGE_PX) / this.cssHeight),
    };
    // From the +Z side, raised toward ecliptic north: +X (the Moon) is to the right.
    const elevation = MathUtils.degToRad(JOURNEY_ELEVATION_DEG);
    const direction = new Vector3(0, Math.sin(elevation), Math.cos(elevation));
    const distance = fitDistance(
      this.camera,
      center,
      direction,
      spheres,
      1.05,
      clear,
      this.worldUp,
    );
    return out.copy(direction).multiplyScalar(distance);
  }

  /**
   * How far the Earth or Moon view stands from the body's center, looking
   * along `direction`, for the clear area now: the body and the framed ship
   * `subject` (at mission time `at`) in the clear area, and in a tall, narrow
   * picture the low orbits around the body across it (see LOW_ORBIT_RADII).
   * A flight that stays in Earth orbit has Earth and every orbit in its
   * Earth view. Reads framePoses, so call posesAt(at, mix) first.
   */
  private bodyDistance(
    center: Vector3,
    radius: number,
    direction: Vector3,
    subject: FramePose | null,
    at: number,
    mix: number,
  ): number {
    const spheres: SphereLike[] = [{ center, radius }];
    if (center === this.origin && this.orbitMission) {
      // A flight that stays in Earth orbit: Earth and every orbit, with room at the edges for a model.
      spheres.push(...this.pathSpheres(mix));
      const clear: ClearArea = {
        width: Math.max(0.2, this.clear.width - (2 * SHIP_EDGE_PX) / this.cssWidth),
        height: Math.max(0.2, this.clear.height - (2 * SHIP_EDGE_PX) / this.cssHeight),
      };
      return fitDistance(this.camera, center, direction, spheres, 1.06, clear, this.worldUp);
    }
    if (subject && subject.position.distanceTo(center) < radius * (1 + NEAR_BODY_RADII)) {
      spheres.push({ center: subject.position.clone(), radius: radius * 0.12 });
    }
    const distance = fitDistance(
      this.camera,
      center,
      direction,
      spheres,
      1.2,
      this.clear,
      this.worldUp,
    );
    // Only a picture taller than it is wide; a wide one (any desktop window) keeps its framing.
    const tall = this.cssWidth * this.clear.width < this.cssHeight * this.clear.height;
    if (!tall) return distance;
    const reach = this.orbitReach(center, radius, at, mix);
    if (reach <= radius) return distance;
    const across: ClearArea = {
      width: Math.max(0.2, this.clear.width - (2 * LOW_ORBIT_EDGE_PX) / this.cssWidth),
      height: this.clear.height,
    };
    return Math.max(distance, fitAcross(this.camera, reach, 1, across));
  }

  /**
   * The Earth and Moon views look at the body from the side the ship
   * (`subject`, where it is at the moment framed) is on, turned away from
   * straight overhead toward the Sun (and north), so the ship stands out
   * against the lit side and its shape reads. Without a ship nearby, they
   * show the body's day side. Reads frameSun, so call posesAt first.
   */
  private bodyDirection(
    center: Vector3,
    radius: number,
    subject: FramePose | null,
    out: Vector3,
  ): Vector3 {
    const ship = subject;
    if (center === this.origin && this.orbitMission && ship && this.orbitDirection(ship, out))
      return out;
    const lean = this.v1.copy(this.frameSun).addScaledVector(this.v2.set(0, 1, 0), 0.6);
    if (ship && ship.position.distanceTo(center) < radius * (1 + NEAR_BODY_RADII)) {
      const toShip = out.subVectors(ship.position, center).normalize();
      lean.addScaledVector(toShip, -lean.dot(toShip));
      if (lean.lengthSq() < 1e-6) lean.set(0, 1, 0).addScaledVector(toShip, -toShip.y);
      lean.normalize();
      const angle = MathUtils.degToRad(BODY_VIEW_ANGLE_DEG);
      out.multiplyScalar(Math.cos(angle)).addScaledVector(lean, Math.sin(angle)).normalize();
      if (center === this.origin) this.keepMoonOutOfEarthView(out);
      return out;
    }
    if (center === this.origin) return out.copy(lean).normalize();
    // The Moon: from the Earth side (its near side), leaning sunward.
    return out.set(-1, 0.3, 0).addScaledVector(this.frameSun, 0.7).normalize();
  }

  /**
   * The Earth view of a flight that stays in Earth orbit: from above the
   * ship's orbit (its north or sunlit side), tilted ORBIT_VIEW_TILT_DEG
   * toward the ship, so the orbits show as rings around Earth rather than
   * edge on. False when the ship's travel gives no orbit plane. Reads
   * framePoses and frameSun, so call posesAt first.
   */
  private orbitDirection(ship: FramePose, out: Vector3): boolean {
    if (!ship.exists) return false;
    // The orbit plane: the ship's own, or while it has none (climbing, falling under a
    // parachute, or afloat), that of another ship still in orbit.
    const normal = this.v2;
    let found = false;
    for (const candidate of [ship, ...this.framePoses]) {
      if (!candidate.exists) continue;
      normal.crossVectors(this.v1.copy(candidate.position).normalize(), candidate.forward);
      if (normal.lengthSq() > 0.05) {
        found = true;
        break;
      }
    }
    if (!found) return false;
    normal.normalize();
    const radial = this.v1.copy(ship.position).normalize();
    const preferred = this.v3.copy(this.frameSun).multiplyScalar(0.6).add(this.worldUp);
    if (normal.dot(preferred) < 0) normal.negate();
    const tilt = MathUtils.degToRad(ORBIT_VIEW_TILT_DEG);
    // (No turning away from the Moon here: that could turn the view edge on to the orbits.)
    out
      .copy(normal)
      .multiplyScalar(Math.cos(tilt))
      .addScaledVector(radial, Math.sin(tilt))
      .normalize();
    return true;
  }

  /**
   * In the Earth view, a camera on the far side of Earth from the Moon would
   * see the Moon and its orbits right behind (or just above) Earth, where
   * they read as a ring around it. Turn such a direction away from the
   * Earth-Moon line until it is at least this far from it.
   */
  private keepMoonOutOfEarthView(direction: Vector3): void {
    const minAngle = MathUtils.degToRad(EARTH_VIEW_MOON_CLEARANCE_DEG);
    const away = this.v2.set(-1, 0, 0); // from Earth, directly away from the Moon
    const cos = direction.dot(away);
    if (cos <= Math.cos(minAngle)) return;
    const side = this.v1.copy(direction).addScaledVector(away, -cos);
    if (side.lengthSq() < 1e-8) side.set(0, 0, 1);
    side.normalize();
    direction
      .copy(away)
      .multiplyScalar(Math.cos(minAngle))
      .addScaledVector(side, Math.sin(minAngle))
      .normalize();
  }

  /**
   * The ship view's frame: x along the ship's horizontal travel, y up (away
   * from the nearby body, or ecliptic north far from both), z to the side.
   */
  private chaseFrameFor(ship: ShipPose, out: Quaternion): Quaternion {
    const up = this.v1;
    const toEarth = ship.position.length() - EARTH_RADIUS;
    const toMoon = ship.position.distanceTo(this.moonCenter) - MOON_RADIUS;
    const nearMoon = toMoon / MOON_RADIUS < toEarth / EARTH_RADIUS;
    const height = nearMoon ? toMoon / MOON_RADIUS : toEarth / EARTH_RADIUS;
    const weight = 1 - smoothstep(1.5, 5, height);
    up.copy(ship.up)
      .multiplyScalar(weight)
      .add(this.v2.set(0, 1 - weight, 0));
    if (up.lengthSq() < 1e-8) up.set(0, 1, 0);
    up.normalize();

    const forward = this.v2.copy(ship.forward).addScaledVector(up, -ship.forward.dot(up));
    if (forward.lengthSq() < 1e-6) {
      forward.copy(this.chaseForward).addScaledVector(up, -this.chaseForward.dot(up));
      if (forward.lengthSq() < 1e-6) forward.set(0, 1, 0).cross(up);
      if (forward.lengthSq() < 1e-6) forward.set(1, 0, 0);
    }
    forward.normalize();
    this.chaseForward.copy(forward);
    const side = this.v3.crossVectors(forward, up).normalize();
    this.m1.makeBasis(forward, up, side);
    return out.setFromRotationMatrix(this.m1);
  }

  /**
   * What the ship view's chase turns with and stands off from (see
   * chaseFrameFor): the chased ship as it is now, or while a move heads for a
   * later moment (see chaseAt), as it will be then. Holding that frame on the
   * way, the camera arrives exactly where the chase rests once the clock
   * stops there, with nothing left to catch up.
   */
  private chaseSubject(): ShipPose {
    const ship = this.chased();
    if (this.chaseAt === null) return ship;
    const pose = this.chaseAtPose;
    if (!this.path.position(ship.id, this.chaseAt, this.mix, this.scratch)) return ship;
    pose.position.fromArray(this.scratch);
    if (this.path.direction(ship.id, this.chaseAt, this.mix, this.scratch))
      pose.forward.fromArray(this.scratch);
    this.radialUp(pose.position, pose.up);
    return pose;
  }

  /** How far the ship view stands off: enough to see the nearby body, farther out in open space. */
  private chaseAutoDistance(ship: ShipPose): number {
    const toEarth = ship.position.length() - EARTH_RADIUS;
    const toMoon = ship.position.distanceTo(this.moonCenter) - MOON_RADIUS;
    const nearMoon = toMoon / MOON_RADIUS < toEarth / EARTH_RADIUS;
    const radius = nearMoon ? MOON_RADIUS : EARTH_RADIUS;
    const height = Math.max(0, nearMoon ? toMoon : toEarth);
    return MathUtils.clamp(0.75 * radius + 0.5 * height, 0.15, 3.5);
  }

  /**
   * Start a camera move from where the camera is to the current view's
   * framing (for mission time `how.at`, or now), or with `how.keepOffset`,
   * to settledOffset as it is (a refit, see reframeAfterLayout). A move
   * between two views of one body, one that flying straight would take close
   * past a body, or one into or out of a close view of a body from a wide
   * view, swings around that body (see swingBodyOf and swingAround), and a
   * long swing takes longer (see LONG_SWING_MS). Otherwise the camera flies
   * straight across. A move to where the camera already is is made at once.
   * `how.move` (true unless given) says whether `moving` reports it.
   */
  private startTween(
    durationMs: number,
    mix = this.mix,
    how: { at?: number; keepOffset?: boolean; move?: boolean } = {},
  ): void {
    this.settleDamping();
    this.tweenFrom.position.copy(this.camera.position);
    this.tweenFrom.target.copy(this.controls.target);
    this.tweenFrom.up.copy(this.camera.up);
    if (!how.keepOffset) this.framingOffset(this.settledOffset, mix, how.at);
    this.tweenMix = mix;
    const toMix = mix;
    // The destination moves with its anchor (a ship, or the Moon as the scale changes).
    const destination = (): OrientedPose =>
      this.settledPose(this.tweenTo, this.viewNow === 'journey' ? toMix : this.mix);
    destination();
    this.cameraTween?.cancel();
    this.cameraTween = null;
    this.cameraMove = false;
    if (this.samePose(this.tweenFrom, this.tweenTo)) {
      this.setCameraUp(this.tweenTo.up);
      this.applyPose(this.tweenTo);
      this.applyLimits();
      return;
    }
    const body = this.swingBody(this.tweenFrom, this.tweenTo);
    let duration = durationMs;
    if (body) {
      const [short, long] = SWING_ANGLES_DEG;
      const degrees = MathUtils.radToDeg(
        swingAngle(this.tweenFrom, this.tweenTo, this.bodyCenter(body)),
      );
      const share = MathUtils.clamp((degrees - short) / (long - short), 0, 1);
      duration *= MathUtils.lerp(1, LONG_SWING_MS / TRANSITION_MS, share);
    }
    const keep = body ? this.keptCraft(this.tweenFrom, this.tweenTo, body) : null;
    this.controls.minDistance = 0;
    this.controls.maxDistance = Infinity;
    this.cameraMove = how.move ?? true;
    this.cameraTween = new Tween(
      duration,
      (t) => {
        const to = destination();
        if (body && keep) {
          swingKeeping(this.tweenFrom, to, this.bodyCenter(body), keep, t, this.tweenPose);
        } else if (body) {
          swingAround(this.tweenFrom, to, this.bodyCenter(body), t, this.tweenPose);
        } else {
          interpolatePose(this.tweenFrom, to, t, this.tweenPose);
          // Roll from the old "up" to the new one along the way.
          this.upTurn.setFromUnitVectors(this.tweenFrom.up, to.up);
          this.upStep.identity().slerp(this.upTurn, t);
          this.tweenPose.up.copy(this.tweenFrom.up).applyQuaternion(this.upStep);
        }
        this.setCameraUp(this.tweenPose.up);
        this.applyPose(this.tweenPose);
      },
      easeInOutCubic,
    );
    this.needsRender = true;
  }

  /** The body a camera move between two poses swings around, if any (see swingBodyOf and SWING_REACH_RADII). */
  private swingBody(from: CameraPose, to: CameraPose): 'earth' | 'moon' | null {
    const bodies = [
      { name: 'moon', center: this.moonCenter, radius: MOON_RADIUS },
      { name: 'earth', center: this.origin, radius: EARTH_FRAME_RADIUS },
    ] as const;
    return swingBodyOf(from, to, bodies, SWING_REACH_RADII)?.name ?? null;
  }

  /**
   * For a swing around `body` between a wide view and a close view of a craft
   * near the body (the ship view near Earth or the Moon, to or from the
   * journey view), the end that looks at the craft, which swingKeeping keeps
   * in the picture all the way. Null for any other swing (between two views
   * of the body, or one that looks at its center): swingAround slides the
   * body across the picture.
   */
  private keptCraft(
    from: CameraPose,
    to: CameraPose,
    body: 'earth' | 'moon',
  ): 'from' | 'to' | null {
    const center = this.bodyCenter(body);
    const radius = body === 'moon' ? MOON_RADIUS : EARTH_FRAME_RADIUS;
    const near = (pose: CameraPose): boolean =>
      pose.target.distanceTo(center) < radius * SWING_REACH_RADII;
    const atCraft = (pose: CameraPose): boolean => pose.target.distanceTo(center) > radius * 0.5;
    if (near(to) && atCraft(to) && !near(from)) return 'to';
    if (near(from) && atCraft(from) && !near(to)) return 'from';
    return null;
  }

  /** True when two camera poses are the same, near enough that a move between them would not show. */
  private samePose(a: OrientedPose, b: OrientedPose): boolean {
    const scale = Math.max(a.position.distanceTo(a.target), 1e-9) * SAME_POSE_SHARE;
    return (
      a.position.distanceTo(b.position) < scale &&
      a.target.distanceTo(b.target) < scale &&
      a.up.distanceToSquared(b.up) < SAME_POSE_SHARE * SAME_POSE_SHARE
    );
  }

  /** Where Earth's or the Moon's center is now. */
  private bodyCenter(body: 'earth' | 'moon'): Vector3 {
    return body === 'moon' ? this.moonCenter : this.origin;
  }

  /**
   * Where the current view's camera comes to rest now (at scale mix `mix`),
   * with its up, written to `out`. The ship view's includes its steady view
   * as far as fast forward has it (see blendFastView).
   */
  private settledPose(out: OrientedPose, mix = this.mix): OrientedPose {
    this.viewAnchor(out.target, mix);
    out.position.copy(out.target).add(this.destinationOffset(this.v1));
    this.desiredUp(out.up);
    if (this.viewNow === 'spacecraft' && this.chaseReady && this.fastView.level > 0.001) {
      this.blendFastView(out);
    }
    return out;
  }

  /**
   * Screen "up": the ship's own up in the ship view (so a rocket on the pad
   * stands upright with the ground below), otherwise ecliptic north.
   */
  private desiredUp(out: Vector3): Vector3 {
    if (this.viewNow === 'spacecraft' && this.chaseReady)
      return out.set(0, 1, 0).applyQuaternion(this.chaseFrame);
    return out.set(0, 1, 0);
  }

  /**
   * Set the camera's up, and have the orbit controls turn about it too.
   * OrbitControls reads its up only when created, so its two internal
   * rotations are updated here (if this three.js version has them).
   */
  private setCameraUp(up: Vector3): void {
    if (this.camera.up.distanceToSquared(up) < 1e-14) return;
    this.camera.up.copy(up);
    const turns = orbitUpTurns(this.controls);
    if (turns) {
      turns.toWorldUp.setFromUnitVectors(up, this.worldUp);
      turns.fromWorldUp.copy(turns.toWorldUp).invert();
    }
  }

  /** The settled offset for the view now (the ship view's follows the ship). */
  private destinationOffset(out: Vector3): Vector3 {
    if (this.viewNow === 'spacecraft' && this.chaseReady) {
      out.copy(this.chaseDirection);
      // During a spacewalk, from more to the side, so a figure standing along the craft is seen whole.
      if (this.walkLevel > 0) out.lerp(SPACEWALK_VIEW, easeInOutCubic(this.walkLevel)).normalize();
      return out
        .applyQuaternion(this.chaseFrame)
        .multiplyScalar(this.chaseDistance * this.chaseZoom);
    }
    return out.copy(this.settledOffset);
  }

  /** Frame the current view for mission time `at` (now unless given): instantly, or with a camera move. */
  private applyFraming(instant: boolean, at = this.player.time): void {
    if (instant) {
      this.framingOffset(this.settledOffset, this.mix, at);
      this.jumpToSettled();
    } else {
      this.startTween(this.transitionMs, this.mix, { at });
    }
  }

  /** Put the camera where the current view rests now, with no move. */
  private jumpToSettled(): void {
    this.cameraTween?.cancel();
    this.cameraTween = null;
    this.cameraMove = false;
    this.settledPose(this.tweenPose);
    this.setCameraUp(this.tweenPose.up);
    this.applyPose(this.tweenPose);
    this.applyLimits();
  }

  /**
   * After the interface or window changes size: refit unless the person has
   * taken the camera. The camera keeps the direction it looks from (a card
   * changing height never swings it around the body); only its distance
   * changes, as the new clear area needs, and the picture slides so the
   * subject sits in the middle of it (see updateClearArea). A move under way
   * lands on the refitted framing instead.
   */
  private reframeAfterLayout(): void {
    this.needsRender = true;
    if (!this.earth || this.userMovedCamera || this.pendingView) return;
    if (this.viewNow === 'spacecraft') return;
    if (this.cameraTween && !this.cameraTween.done) {
      // A move is under way (a tour starting as its card opens, say): have it land on the framing for the new clear area.
      this.refitOffset(this.settledOffset, this.tweenMix);
      return;
    }
    this.settleDamping();
    this.settledOffset.subVectors(this.camera.position, this.controls.target);
    this.refitOffset(this.settledOffset, this.mix);
    if (this.reducedMotion) this.jumpToSettled();
    else this.startTween(REFRAME_MS, this.mix, { keepOffset: true, move: false });
  }

  /**
   * Fit `offset`, the camera's offset from the view's anchor, to the clear
   * area now, keeping its direction: only its length changes. The Earth and
   * Moon views fit what they were framed for (see framedAt); the journey
   * view has one direction anyway.
   */
  private refitOffset(offset: Vector3, mix: number): void {
    if (this.viewNow === 'journey') {
      this.journeyOffset(offset, mix);
      return;
    }
    if (this.viewNow !== 'earth' && this.viewNow !== 'moon') return;
    if (offset.lengthSq() < 1e-18) return;
    const isEarth = this.viewNow === 'earth';
    const center = isEarth ? this.origin : this.moonSphere(mix).center;
    const radius = isEarth ? EARTH_FRAME_RADIUS : MOON_RADIUS;
    const direction = this.frameDirection.copy(offset).normalize();
    const subject = this.posesAt(this.framedAt, mix);
    offset
      .copy(direction)
      .multiplyScalar(this.bodyDistance(center, radius, direction, subject, this.framedAt, mix));
  }

  private applyPose(pose: CameraPose): void {
    this.controls.target.copy(pose.target);
    this.camera.position.copy(pose.position);
    this.camera.lookAt(pose.target);
    this.needsRender = true;
  }

  /** Settle any leftover drag momentum so it does not resume after a move. */
  private settleDamping(): void {
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.updateControls();
    this.controls.enableDamping = damping;
  }

  /** Run the controls from the stage's own code. Returns true if they moved the camera. */
  private updateControls(dt: number | null = null): boolean {
    this.updatingControls = true;
    const changed = this.controls.update(dt);
    this.updatingControls = false;
    return changed;
  }

  /** Keep where the controls put the camera: as the ship view's chase offset, or the settled offset. */
  private keepCameraOffset(): void {
    if (this.viewNow === 'spacecraft' && this.chaseReady) this.readChase();
    else this.settledOffset.subVectors(this.camera.position, this.controls.target);
  }

  private applyLimits(): void {
    if (this.viewNow === 'spacecraft') return;
    if (this.viewNow === 'journey') {
      this.controls.minDistance = EARTH_RADIUS * 1.5;
    } else {
      const radius = this.viewNow === 'moon' ? MOON_RADIUS : EARTH_FRAME_RADIUS;
      this.controls.minDistance = radius * MIN_DISTANCE_FACTOR;
    }
    this.controls.maxDistance = Math.max(
      MAX_DISTANCE[this.mode],
      this.settledOffset.length() * 1.5,
    );
  }

  private readonly handleControlStart = (): void => {
    // The person took over: stop any camera flight where it is.
    if (this.cameraTween && !this.cameraTween.done) {
      this.cameraTween.cancel();
      this.cameraTween = null;
      this.cameraMove = false;
      if (this.viewNow === 'spacecraft') this.readChase();
      else this.settledOffset.subVectors(this.camera.position, this.controls.target);
      this.applyLimits();
    }
    this.userMovedCamera = true;
  };

  /**
   * OrbitControls applies some input by itself as it arrives, between
   * frames: each scroll or pinch step, each key press, and (without damping)
   * a drag. The frame's own update then finds nothing new, so keep the move
   * and draw it from here. Otherwise it is not drawn until something else
   * changes, and the ship view puts the camera back where it was.
   */
  private readonly handleControlChange = (): void => {
    if (this.updatingControls) return;
    this.keepCameraOffset();
    this.needsRender = true;
  };

  /** Arrow keys turn the view and +/- zoom while the canvas has focus. */
  private handleKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const actions = new Map<string, () => void>([
      ['ArrowLeft', () => this.controls.rotateLeft(KEY_ROTATE_STEP)],
      ['ArrowRight', () => this.controls.rotateLeft(-KEY_ROTATE_STEP)],
      ['ArrowUp', () => this.controls.rotateUp(KEY_ROTATE_STEP)],
      ['ArrowDown', () => this.controls.rotateUp(-KEY_ROTATE_STEP)],
      ['+', () => this.controls.dollyIn(KEY_ZOOM_STEP)],
      ['=', () => this.controls.dollyIn(KEY_ZOOM_STEP)],
      ['-', () => this.controls.dollyOut(KEY_ZOOM_STEP)],
      ['_', () => this.controls.dollyOut(KEY_ZOOM_STEP)],
    ]);
    const action = actions.get(event.key);
    if (!action) return;
    event.preventDefault();
    this.handleControlStart();
    action();
  }

  /** In the ship view, take the camera's place relative to the ship as the new chase offset. */
  private readChase(): void {
    const offset = this.v1.subVectors(this.camera.position, this.controls.target);
    const distance = offset.length();
    if (distance < 1e-9 || this.chaseDistance <= 0) return;
    this.q1.copy(this.chaseFrame).invert();
    this.chaseDirection.copy(offset).divideScalar(distance).applyQuaternion(this.q1);
    this.chaseZoom = distance / this.chaseDistance;
  }

  /** True when the ship is hidden behind Earth or the Moon from the camera, or out of the clear area. */
  private shipHidden(ship: ShipState): boolean {
    if (!ship.exists) return false;
    if (this.occluded(ship.position)) return true;
    return !this.inClearArea(ship.position, SHIP_EDGE_PX);
  }

  /** True when a point is drawn inside the clear area the interface leaves (in front of the camera), at least `margin` CSS pixels in. */
  private inClearArea(point: Vector3, margin: number): boolean {
    const p = this.v1.copy(point).project(this.camera);
    if (p.z > 1) return false;
    const x = ((p.x + 1) / 2) * this.cssWidth;
    const y = ((1 - p.y) / 2) * this.cssHeight;
    const i = this.clearInsets;
    return (
      x >= i.left + margin &&
      x <= this.cssWidth - i.right - margin &&
      y >= i.top + margin &&
      y <= this.cssHeight - i.bottom - margin
    );
  }

  /**
   * In the Earth and Moon views, a followed ship out of the clear area that
   * a reframing cannot bring in (it is far from the body, on its way between
   * Earth and the Moon) gets a small arrow of its color at the clear area's
   * edge, pointing toward it. Not when it is behind the body.
   */
  private updatePointer(tanHalf: number): void {
    const pointer = this.pointer;
    if (!pointer) return;
    pointer.visible = false;
    const ship = this.subject();
    if (
      (this.viewNow !== 'earth' && this.viewNow !== 'moon') ||
      !ship.exists ||
      this.occluded(ship.position)
    )
      return;
    if (this.inClearArea(ship.position, SHIP_EDGE_PX)) return;
    const p = this.v1.copy(ship.position).project(this.camera);
    // Behind the camera, the projection is mirrored.
    if (p.z > 1) p.multiplyScalar(-1);
    const i = this.clearInsets;
    const cx = (i.left + this.cssWidth - i.right) / 2;
    const cy = (i.top + this.cssHeight - i.bottom) / 2;
    const dx = ((p.x + 1) / 2) * this.cssWidth - cx;
    const dy = ((1 - p.y) / 2) * this.cssHeight - cy;
    const halfW = (this.cssWidth - i.left - i.right) / 2 - POINTER_INSET_PX;
    const halfH = (this.cssHeight - i.top - i.bottom) / 2 - POINTER_INSET_PX;
    if (halfW <= 0 || halfH <= 0 || (dx === 0 && dy === 0)) return;
    const t = Math.min(
      dx !== 0 ? halfW / Math.abs(dx) : Infinity,
      dy !== 0 ? halfH / Math.abs(dy) : Infinity,
    );
    const x = cx + dx * t;
    const y = cy + dy * t;
    pointer.position
      .set((x / this.cssWidth) * 2 - 1, 1 - (y / this.cssHeight) * 2, 0.5)
      .unproject(this.camera);
    pointer.scale.setScalar((2 * POINTER_PX * tanHalf) / this.cssHeight);
    const material = pointer.material as SpriteMaterial;
    // The arrow is drawn pointing up; turn it toward the ship (screen y runs down).
    material.rotation = Math.atan2(-dy, dx) - Math.PI / 2;
    material.color.setHex(ship.color);
    pointer.visible = true;
  }

  /** An arrow pointing up, drawn once (tinted by the pointer's color). */
  private arrowTexture(): CanvasTexture {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext('2d');
    if (g) {
      g.lineJoin = 'round';
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(5, 8, 13, 0.95)';
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(size / 2, 3);
      g.lineTo(size - 5, size - 6);
      g.lineTo(size / 2, size - 12);
      g.lineTo(5, size - 6);
      g.closePath();
      g.stroke();
      g.fill();
    }
    return new CanvasTexture(canvas);
  }

  /** A small label in plain words (a part left behind's), drawn once; it hangs from its top (see updateLabels). */
  private labelSprite(text: string): Sprite {
    const ratio = 2;
    const font = `${12 * ratio}px system-ui, -apple-system, sans-serif`;
    const canvas = document.createElement('canvas');
    const g = canvas.getContext('2d');
    // Up to two lines of at most about 190 CSS pixels.
    const lines: string[] = [];
    if (g) {
      g.font = font;
      let line = '';
      for (const word of text.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (g.measureText(next).width > 190 * ratio && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      if (lines.length > 2) lines.splice(2, lines.length - 2, `${lines[1]}…`);
      const width = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width))) + 8 * ratio;
      canvas.width = width;
      canvas.height = lines.length * 16 * ratio + 4 * ratio;
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.shadowColor = 'rgba(0, 0, 0, 0.9)';
      g.shadowBlur = 3 * ratio;
      g.fillStyle = '#e8ecf1';
      lines.forEach((l, k) => g.fillText(l, width / 2, 2 * ratio + k * 16 * ratio));
    }
    const sprite = new Sprite(
      new SpriteMaterial({
        map: new CanvasTexture(canvas),
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: false,
      }),
    );
    sprite.center.set(0.5, 1);
    sprite.userData['aspect'] = canvas.width / Math.max(1, canvas.height);
    sprite.userData['pixels'] = canvas.height / ratio;
    sprite.visible = false;
    // It is drawn away from the point it hangs from, so that point's being off screen says nothing.
    sprite.frustumCulled = false;
    sprite.renderOrder = 11;
    return sprite;
  }

  /** True when the line from the camera to `point` passes through Earth or the Moon. */
  private occluded(point: Vector3): boolean {
    return (
      this.segmentHitsSphere(this.camera.position, point, this.origin, EARTH_RADIUS * 0.995) ||
      this.segmentHitsSphere(this.camera.position, point, this.moonCenter, MOON_RADIUS * 0.995)
    );
  }

  private segmentHitsSphere(from: Vector3, to: Vector3, center: Vector3, radius: number): boolean {
    const d = this.v2.subVectors(to, from);
    const f = this.v3.subVectors(from, center);
    const a = d.dot(d);
    const b = 2 * f.dot(d);
    const c = f.dot(f) - radius * radius;
    const disc = b * b - 4 * a * c;
    if (a < 1e-12 || disc < 0) return false;
    const root = Math.sqrt(disc);
    const t1 = (-b - root) / (2 * a);
    const t2 = (-b + root) / (2 * a);
    return (t1 > 0 && t1 < 1) || (t2 > 0 && t2 < 1) || (t1 < 0 && t2 > 1);
  }

  /**
   * Per frame: keep the camera on its anchor, follow the ship, and run any
   * move. In the Earth and Moon views the camera holds still unless the
   * visitor moves it, a view is asked for, the layout changes (a refit, see
   * reframeAfterLayout), or the clock jumps (`jumped`: a seek, never a pause
   * or a slow frame) and leaves the followed ship hidden.
   */
  private updateCamera(dt: number, jumped: boolean): boolean {
    let moved = false;

    // A move into the ship view framed for a later moment holds until the clock gets there or stops.
    if (
      this.chaseAt !== null &&
      (!this.player.playing || this.player.time >= this.chaseAt || this.viewNow !== 'spacecraft')
    ) {
      this.endChaseAt(true);
    }

    // The ship view moves to its steady view as the fast-forward level rises. As
    // it falls, the view holds until the level drops below FAST_FORWARD_OFF, when
    // the interface stops saying "Fast forward", and only then eases back to the
    // chase. A tour trip waiting to move the camera to its stop's view moves it at
    // that moment (see src/app/tour.ts), so the camera goes there from the steady view
    // instead of swooping back in to the ship and out again. A stopped clock shows
    // the ship at its true place, so there the steady view ends at once (below).
    // A move to a stop in the ship view (see chaseAt) heads for the ship as it will
    // be there, with the clock stopped: without the steady view.
    const shipView = this.viewNow === 'spacecraft';
    const level =
      shipView && this.player.playing && this.chaseAt === null ? this.followed.fastForward : 0;
    const wasFast = shipView && this.fastView.level > 0.001;
    const fast = Math.min(level / FAST_FORWARD_OFF, Math.max(level, this.fastView.level));
    const fastBefore = this.fastView.level;
    this.updateFastView(fast);
    this.controls.enabled = fast < 0.02;
    this.fastReturning = shipView && fast > 0.001 && fast < fastBefore - 1e-6;

    if (this.pendingView) {
      const instant = this.pendingView === 'instant' || this.reducedMotion;
      const at = this.pendingAt ?? this.player.time;
      this.pendingView = null;
      this.pendingAt = null;
      this.applyFraming(instant, at);
      moved = true;
    } else if (wasFast && !this.player.playing) {
      // The clock stopped while the ship view held its steady view: the camera
      // travels back to the chase, around the body, rather than cutting to it.
      this.startTween(this.transitionMs);
      moved = true;
    } else if (
      jumped &&
      !this.userMovedCamera &&
      (this.viewNow === 'earth' || this.viewNow === 'moon')
    ) {
      // After a jump of the clock, bring the ship back into view if it is hidden, in
      // one swing around the body. (The journey view keeps its one orientation; the
      // ship view follows anyway.)
      const tweening = this.cameraTween !== null && !this.cameraTween.done;
      if (!tweening && this.shipHidden(this.subject())) {
        this.applyFraming(this.reducedMotion);
        moved = true;
      }
    }

    // The ship view turns with the ship and eases its distance.
    if (this.viewNow === 'spacecraft' && this.chaseReady) {
      const ship = this.chaseSubject();
      this.chaseFrameFor(ship, this.q1);
      const auto = this.chaseAutoDistance(ship);
      if (jumped || this.reducedMotion) {
        this.chaseFrame.copy(this.q1);
        this.chaseDistance = auto;
      } else {
        this.chaseFrame.slerp(this.q1, 1 - Math.exp(-dt / CHASE_TURN_SECONDS));
        this.chaseDistance +=
          (auto - this.chaseDistance) * (1 - Math.exp(-dt / CHASE_DISTANCE_SECONDS));
      }
    }

    if (this.cameraTween) {
      this.cameraTween.step(this.nowMs);
      moved = true;
      if (this.cameraTween.done) {
        this.cameraTween = null;
        this.cameraMove = false;
        this.applyLimits();
        this.updateControls();
      }
      return moved;
    }

    // Settled: carry the camera with its anchor, keeping the view's up.
    this.setCameraUp(this.desiredUp(this.v1));
    this.viewAnchor(this.anchor);
    const delta = this.v1.subVectors(this.anchor, this.controls.target);
    if (delta.lengthSq() > 0) {
      this.controls.target.copy(this.anchor);
      this.camera.position.add(delta);
      // The controls nudge the target by rounding errors each frame; only a real move needs drawing, so a still scene stops drawing.
      if (delta.lengthSq() > 1e-24) moved = true;
    }
    if (this.viewNow === 'spacecraft' && this.chaseReady) {
      const pose = this.settledPose(this.restPose);
      this.controls.target.copy(pose.target);
      this.camera.position.copy(pose.position);
      if (fast > 0.001) {
        this.controls.minDistance = 0;
        this.controls.maxDistance = Infinity;
        this.setCameraUp(pose.up);
        this.camera.lookAt(pose.target);
      } else {
        this.controls.minDistance = this.chaseDistance * 0.08;
        this.controls.maxDistance = this.chaseDistance * 40;
      }
      // Draw only when the camera has moved by more than a fraction of a pixel (the chase eases to rest): a stopped clock then draws nothing.
      const tolerance = 2e-5 * Math.max(this.chaseDistance, 1e-6);
      if (
        this.camera.position.distanceToSquared(this.lastChasePosition) > tolerance * tolerance ||
        this.controls.target.distanceToSquared(this.lastChaseTarget) > tolerance * tolerance ||
        this.camera.up.distanceToSquared(this.lastChaseUp) > 4e-10
      ) {
        moved = true;
        this.lastChasePosition.copy(this.camera.position);
        this.lastChaseTarget.copy(this.controls.target);
        this.lastChaseUp.copy(this.camera.up);
      }
    }
    const changed = this.updateControls(dt);
    // While fast-forwarding, the ship view holds a steady view of the body and
    // the chase goes on underneath, so that view is not taken as the chase offset.
    const steadyView = this.viewNow === 'spacecraft' && this.chaseReady && fast > 0.001;
    if (changed && !steadyView) this.keepCameraOffset();
    return moved || changed;
  }

  /**
   * Ship view while fast-forwarding: move the chase's pose, `pose`, toward
   * the steady view of its body (see updateFastView), as far as the
   * fast-forward level says, swinging around the body. The chase goes on
   * underneath, so the camera returns to it smoothly when the pace drops.
   */
  private blendFastView(pose: OrientedPose): void {
    const view = this.fastView;
    const e = easeInOutCubic(MathUtils.clamp(view.level, 0, 1));
    this.fastFrom.position.copy(pose.position);
    this.fastFrom.target.copy(pose.target);
    this.fastFrom.up.copy(pose.up);
    this.fastTo.target.copy(view.center);
    this.fastTo.position.copy(view.center).addScaledVector(view.direction, view.distance);
    this.fastTo.up.copy(view.up);
    swingAround(this.fastFrom, this.fastTo, view.center, e, pose);
  }

  /* ---------------------------------------------------------------- */
  /* Layout                                                            */
  /* ---------------------------------------------------------------- */

  private listen(target: EventTarget, type: string, handler: (event: Event) => void): void {
    target.addEventListener(type, handler);
    this.cleanups.push(() => target.removeEventListener(type, handler));
  }

  private updateClearArea(): void {
    const width = this.cssWidth;
    const height = this.cssHeight;
    const top = Math.min(Math.max(0, this.insets.top), height * 0.4);
    const bottom = Math.min(Math.max(0, this.insets.bottom), height * 0.7);
    const left = Math.min(Math.max(0, this.insets.left), width * 0.4);
    const right = Math.min(Math.max(0, this.insets.right), width * 0.6);
    Object.assign(this.clearInsets, { top, right, bottom, left });
    this.clear.width = Math.max(0.25, (width - left - right) / width);
    this.clear.height = Math.max(0.25, (height - top - bottom) / height);
    // Shift the picture so the view's axis passes through the middle of the clear area.
    this.offsetTarget = { x: (right - left) / 2, y: (bottom - top) / 2 };
    if (this.reducedMotion || !this.running) this.offsetNow = { ...this.offsetTarget };
    this.applyViewOffset();
  }

  private applyViewOffset(): void {
    const { x, y } = this.offsetNow;
    if (Math.abs(x) < 0.25 && Math.abs(y) < 0.25) {
      this.camera.clearViewOffset();
    } else {
      this.camera.setViewOffset(this.cssWidth, this.cssHeight, x, y, this.cssWidth, this.cssHeight);
    }
    this.camera.updateProjectionMatrix();
  }

  /** Ease the picture's shift toward its target. Returns true while it moves. */
  private updateViewOffset(dt: number): boolean {
    const dx = this.offsetTarget.x - this.offsetNow.x;
    const dy = this.offsetTarget.y - this.offsetNow.y;
    if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {
      if (dx !== 0 || dy !== 0) {
        this.offsetNow.x = this.offsetTarget.x;
        this.offsetNow.y = this.offsetTarget.y;
        this.applyViewOffset();
        return true;
      }
      return false;
    }
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt / OFFSET_SECONDS);
    this.offsetNow.x += dx * k;
    this.offsetNow.y += dy * k;
    this.applyViewOffset();
    return true;
  }

  private handleResize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.cssWidth = width;
    this.cssHeight = height;
    const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = fieldOfViewFor(this.camera.aspect);
    this.updateClearArea();
    for (const line of this.lines) line.setResolution(width, height);
    for (const ship of this.ships) ship.ring?.setResolution(width, height);
    for (const set of [this.eventMarkers, this.earthSites, this.moonSites])
      set?.setPixelRatio(ratio);
    this.reframeAfterLayout();
    // Draw right away so the canvas never shows a stretched frame.
    if (this.earth && this.drawing) this.renderFrame(0);
  }

  /* ---------------------------------------------------------------- */
  /* The loop                                                          */
  /* ---------------------------------------------------------------- */

  private nowMs = 0;

  /**
   * Stop drawing while something covers the whole view (an extra's sheet
   * with a 3D view of its own), and start again: the frame loop stops, and
   * on resuming one fresh frame is drawn with the camera and the clock
   * where they are.
   */
  setDrawing(drawing: boolean): void {
    if (drawing === this.drawing) return;
    this.drawing = drawing;
    if (drawing) {
      this.needsRender = true;
      if (this.earth) {
        this.updateWorld(true);
        this.updateShips();
        this.renderFrame(0, true);
      }
    }
    this.syncLoop();
  }

  private syncLoop(): void {
    const shouldRun = this.running && this.drawing && document.visibilityState === 'visible';
    if (shouldRun) {
      this.lastFrameMs = null;
      this.renderer.setAnimationLoop(this.tick);
    } else {
      this.renderer.setAnimationLoop(null);
    }
  }

  private readonly tick = (time: number): void => {
    this.nowMs = time;
    const dt = this.lastFrameMs === null ? 0 : Math.min((time - this.lastFrameMs) / 1000, 0.1);
    this.lastFrameMs = time;

    // A jump of the clock since the last frame: a seek (the visitor scrubbing or
    // stepping to an event, the tour setting off or skipping), as the clock
    // reported it (see noteClock). A slow frame, or a trip landing on its stop,
    // is not one.
    const jumped = this.clockJump;
    // The craft are put straight into their new look only by a real leap (see LEAP_STORY_SECONDS).
    const leapt = jumped && this.clockLeap > LEAP_STORY_SECONDS;
    this.clockJump = false;
    this.clockLeap = 0;

    let animating = false;
    if (this.mixTween) {
      this.mixTween.step(time);
      animating = true;
      if (this.mixTween.done) this.mixTween = null;
    }

    const worldChanged = this.updateWorld();
    if (worldChanged) this.updateShips();
    const fastForward = this.updateFastForward(dt, jumped, leapt);
    const level = this.followed.fastForward;
    const shown =
      this.player.playing &&
      (this.fastForwardShown ? level > FAST_FORWARD_OFF : level > FAST_FORWARD_ON);
    if (shown !== this.fastForwardShown) {
      this.fastForwardShown = shown;
      this.notify();
    }
    const offsetMoving = this.updateViewOffset(dt);
    const cameraMoved = this.updateCamera(dt, jumped);
    if (this.moving !== this.movingShown) {
      this.movingShown = this.moving;
      this.notify();
    }

    if (
      animating ||
      worldChanged ||
      fastForward ||
      offsetMoving ||
      cameraMoved ||
      this.needsRender ||
      this.shipsTurning()
    ) {
      this.renderFrame(dt, leapt);
    }
  };

  /** True while a spacecraft keeps turning or fading with the clock stopped (see ShipModel.idleTurning). */
  private shipsTurning(): boolean {
    if (this.walkLevel !== this.walkWanted) return true;
    for (const ship of this.ships) {
      if (ship.seen > 0 && ship.seen < 1) return true;
    }
    const ships = this.fleet?.ships ?? [];
    for (let i = 0; i < ships.length; i += 1) {
      if ((ships[i] as ShipModel).idleTurning) return true;
    }
    return false;
  }

  /** Scene units per CSS pixel at a point, for a model drawn there; 0 when it is hidden behind Earth or the Moon or behind the camera. */
  private unitsPerPixelAt(point: Vector3, exists: boolean, tanHalf: number): number {
    if (!exists || this.behindBody(point)) return 0;
    return this.depthUnitsPerPixel(point, tanHalf);
  }

  /** Scene units per CSS pixel at a point in front of the camera, whatever is in the way; 0 behind the camera. */
  private depthUnitsPerPixel(point: Vector3, tanHalf: number): number {
    const depth = this.v1.subVectors(point, this.camera.position).dot(this.cameraForward);
    return depth > this.camera.near ? (2 * depth * tanHalf) / this.cssHeight : 0;
  }

  /**
   * True when Earth or the Moon hides a point. The journey view is a
   * diagram: a craft behind Earth or the Moon is drawn anyway, and still is
   * while the camera moves from it to another view (see updateFleet).
   */
  private behindBody(point: Vector3): boolean {
    return this.viewNow !== 'journey' && !this.leavingJourney && this.occluded(point);
  }

  /**
   * Scene units per CSS pixel for a craft drawn at `point`, as
   * unitsPerPixelAt, while it fades out behind Earth or the Moon and in as
   * it comes out (see HIDDEN_FADE_SECONDS): this eases `ship.seen`, and is 0
   * once it has faded out. A craft that has just come to exist is in sight
   * or not at once.
   */
  private shipUnitsPerPixel(
    ship: ShipState,
    point: Vector3,
    tanHalf: number,
    dt: number,
    snap: boolean,
  ): number {
    if (!ship.exists) {
      ship.seen = Number.NaN;
      return 0;
    }
    const units = this.depthUnitsPerPixel(point, tanHalf);
    const wanted = units > 0 && !this.behindBody(point) ? 1 : 0;
    if (Number.isNaN(ship.seen) || snap || this.reducedMotion) ship.seen = wanted;
    else ship.seen = stepToward(ship.seen, wanted, dt / HIDDEN_FADE_SECONDS);
    return ship.seen > 0 ? units : 0;
  }

  /** Their real distance apart at mission time t, in meters, or NaN when one does not exist. */
  private metersApart(a: ShipState, b: ShipState, t: number): number {
    if (!this.path.position(a.id, t, 1, this.scratch)) return Number.NaN;
    this.v3.fromArray(this.scratch);
    if (!this.path.position(b.id, t, 1, this.scratch)) return Number.NaN;
    return this.v3.distanceTo(this.v2.fromArray(this.scratch)) * METERS_PER_UNIT;
  }

  /** Room drawn between two ships this many meters apart, in CSS pixels (see PAIR_GAP_MIN_PX). */
  private roomFor(meters: number): number {
    return (
      PAIR_GAP_MIN_PX +
      (PAIR_GAP_MAX_PX - PAIR_GAP_MIN_PX) * (1 - Math.exp(-meters / PAIR_GAP_DISTANCE_M))
    );
  }

  /**
   * The two ships drawn apart now, if any: a target near the main ship,
   * docking with it or undocking from it (the docking or undocking it is
   * nearest), or two ships keeping station. Of several, the pair most set
   * out in its place wins, then the nearest one: the ship the main ship is
   * with at that moment.
   */
  private pairNow(): PairNow | null {
    const t = this.player.time;
    const story = this.player.storyTime;
    const toStory = (time: number): number => this.player.story.toStory(time);
    let best: PairNow | null = null;
    let bestMeters = Infinity;
    // Station keeping wins a tie with a docking, so two ships tied together after undocking are drawn apart.
    const consider = (pair: PairNow, meters: number): void => {
      const tie = best !== null && Math.abs(pair.arranged - best.arranged) <= 1e-6;
      const better =
        best === null ||
        pair.arranged > best.arranged + 1e-6 ||
        (tie && pair.moment === null && best?.moment !== null) ||
        (tie && meters < bestMeters);
      if (!better) return;
      best = pair;
      bestMeters = meters;
    };
    if (this.main.exists) {
      for (const pairing of this.pairings) {
        const target = pairing.target;
        if (!target.exists) continue;
        const index = pairing.targetModel.shapeAt(t);
        let moment: PairMoment | null = null;
        for (const candidate of pairing.moments) {
          if (candidate.alone !== index) continue;
          if (!moment || Math.abs(candidate.time - t) < Math.abs(moment.time - t))
            moment = candidate;
        }
        if (!moment) continue;
        const meters = this.metersApart(target, this.main, t);
        if (!Number.isFinite(meters)) continue;
        // Before docking: set out from station keeping on (swinging there just before it).
        // After undocking: at first, then letting go as the two drift apart.
        const storyApart = Math.abs(toStory(moment.time) - story);
        let arranged: number;
        if (moment.time > t) {
          const from = toStory(pairing.alongside ?? moment.time);
          arranged = smoothstep(from - PAIR_ARRANGE_STORY_SECONDS, from, story);
        } else {
          arranged =
            1 -
            smoothstep(
              PAIR_CLOSE_STORY_SECONDS,
              PAIR_CLOSE_STORY_SECONDS + PAIR_ARRANGE_STORY_SECONDS,
              storyApart,
            );
        }
        const closing = smoothstep(0, PAIR_CLOSE_STORY_SECONDS, storyApart);
        consider(
          {
            anchor: this.main,
            mover: target,
            arranged,
            gapPixels: closing * this.roomFor(meters),
            moment,
            opening: 1,
            shapesAt: t,
          },
          meters,
        );
      }
    }
    for (const span of this.stations) {
      if (!span.anchor.exists || !span.mover.exists) continue;
      const from = toStory(span.from);
      const to = toStory(span.to);
      // The two let go of their places after the station keeping (or docking), sooner when
      // one of them is gone soon after, so the pair is not cut off half let go (Apollo 15's
      // ascent stage was cast off hours after docking, under two story seconds later).
      const gone = toStory(Math.min(span.anchor.track.end, span.mover.track.end));
      const letGo = Math.max(
        to,
        Math.min(to + PAIR_CLOSE_STORY_SECONDS, gone - PAIR_ARRANGE_STORY_SECONDS),
      );
      let arranged: number;
      if (story < from) arranged = smoothstep(from - PAIR_ARRANGE_STORY_SECONDS, from, story);
      else if (story <= to) arranged = 1;
      else arranged = 1 - smoothstep(letGo, letGo + PAIR_ARRANGE_STORY_SECONDS, story);
      if (arranged <= 0) continue;
      const meters = this.metersApart(span.anchor, span.mover, t);
      if (!Number.isFinite(meters)) continue;
      // Parting from docked, the gap opens over a stretch of story time, so the
      // parting is seen at any pace of the clock (see STATION_OPEN_STORY_SECONDS).
      const openStory = Math.min(STATION_OPEN_STORY_SECONDS, toStory(span.openBy) - from);
      const since = openStory > 1e-9 ? (story - from) / openStory : 1;
      // Closing in to dock, it closes: at a steady pace over the whole station
      // keeping when that plays for PAIR_CLOSE_STORY_SECONDS or more (a final
      // approach with a stretch of its own, see approachesAtEvents), so the two
      // are seen closing in until they touch. A shorter one closes by story time
      // or by mission time, whichever is less far along, so it still shows the
      // gap before it closes.
      let left = 1;
      if (span.closes && to - from >= PAIR_CLOSE_STORY_SECONDS)
        left = MathUtils.clamp((to - story) / (to - from), 0, 1);
      else if (span.closes)
        left = smoothstep(
          0,
          1,
          Math.max(
            (to - story) / PAIR_CLOSE_STORY_SECONDS,
            (span.to - t) / STATION_CLOSE_MISSION_SECONDS,
          ),
        );
      const opening = (span.opens ? smoothstep(0, 1, since) : 1) * left;
      // Once the station keeping is over, the room grows with their real distance over a
      // stretch of story time, not at once: the path can move one of them kilometers away
      // in a burn of a few mission seconds (Apollo 10's and 11's separation burns).
      const room =
        story > to
          ? MathUtils.lerp(
              this.roomFor(0),
              this.roomFor(meters),
              smoothstep(to, to + PAIR_CLOSE_STORY_SECONDS, story),
            )
          : this.roomFor(meters);
      consider(
        {
          anchor: span.anchor,
          mover: span.mover,
          arranged,
          gapPixels: room,
          moment: null,
          opening,
          // Once docked, the one that docked into the other's model has no parts of its own.
          shapesAt: span.closes ? Math.min(t, span.to - 1e-3) : t,
        },
        meters,
      );
    }
    return best;
  }

  /**
   * Where to draw `mover` near `anchor` (into `out`): at least `minPixels`
   * from it, along the line between them, turning (over the top) toward the
   * unit direction `dock` as `arranged` goes to 1.
   */
  private besideAnchor(
    anchor: ShipState,
    mover: ShipState,
    dock: Vector3,
    minPixels: number,
    arranged: number,
    units: number,
    out: Vector3,
  ): void {
    const offset = this.v1.subVectors(mover.position, anchor.position);
    const realPixels = offset.length() / units;
    const real = realPixels > 1e-6 ? offset.normalize() : this.v1.copy(dock);
    // After undocking, the real geometry takes over as they drift apart.
    let a = arranged;
    if (a >= 1 && realPixels > minPixels) a = 1 - smoothstep(minPixels, 3 * minPixels, realPixels);
    const cos = MathUtils.clamp(real.dot(dock), -1, 1);
    const angle = Math.acos(cos) * a;
    const across = this.v3.copy(dock).addScaledVector(real, -cos);
    if (across.lengthSq() < 1e-8)
      across.copy(anchor.up).addScaledVector(real, -anchor.up.dot(real));
    if (across.lengthSq() < 1e-8) across.set(0, 1, 0).addScaledVector(real, -real.y);
    across.normalize();
    const direction = real.multiplyScalar(Math.cos(angle)).addScaledVector(across, Math.sin(angle));
    const pixels = MathUtils.lerp(Math.max(realPixels, minPixels), minPixels, a);
    out.copy(anchor.position).addScaledVector(direction, pixels * units);
  }

  /** The world direction a ship's face looks (see ShipFace), into `out`. */
  private faceDirection(ship: ShipState, face: ShipFace, out: Vector3): Vector3 {
    return out
      .copy(face.axis === 'up' ? ship.up : ship.forward)
      .multiplyScalar(face.sign)
      .normalize();
  }

  /** A turn standing for a ship pose: +Y along `forward`, +Z toward `up` (made square to it). */
  private poseTurn(forward: Vector3, up: Vector3, out: Quaternion): Quaternion {
    const y = this.f1.copy(forward).normalize();
    const z = this.f2.copy(up).addScaledVector(y, -up.dot(y));
    if (z.lengthSq() < 1e-8) z.set(0, 0, 1).addScaledVector(y, -y.z);
    if (z.lengthSq() < 1e-8) z.set(1, 0, 0).addScaledVector(y, -y.x);
    z.normalize();
    const x = this.f3.crossVectors(y, z).normalize();
    this.m1.makeBasis(x, y, z);
    return out.setFromRotationMatrix(this.m1);
  }

  /**
   * Turn `mover` (from its own pose, as `arranged` goes to 1) to face
   * `anchor`: its face toward the anchor, against `toMover` (the anchor's
   * face direction), with its top on the anchor's side.
   */
  private facingPose(
    anchor: ShipState,
    mover: ShipState,
    toMover: Vector3,
    face: ShipFace,
    arranged: number,
    out: ShipPose,
  ): void {
    const back = this.f4.copy(toMover).negate();
    const forward = this.f5;
    const up = this.f6;
    if (face.axis === 'up') {
      // The lunar module: its top toward the anchor, its front along the anchor's travel.
      up.copy(back);
      forward.copy(anchor.forward).addScaledVector(up, -anchor.forward.dot(up));
      if (forward.lengthSq() < 1e-6)
        forward.copy(anchor.up).addScaledVector(up, -anchor.up.dot(up));
    } else {
      // Nose (or docking end) toward the anchor, the top toward the anchor's top.
      forward.copy(back).multiplyScalar(face.sign);
      up.copy(anchor.up).addScaledVector(forward, -anchor.up.dot(forward));
      if (up.lengthSq() < 1e-6)
        up.copy(anchor.forward).addScaledVector(forward, -anchor.forward.dot(forward));
    }
    this.poseTurn(mover.forward, mover.up, this.q2);
    this.poseTurn(forward, up, this.q3);
    this.q2.slerp(this.q3, arranged);
    out.forward.set(0, 1, 0).applyQuaternion(this.q2);
    out.up.set(0, 0, 1).applyQuaternion(this.q2);
  }

  /** A round dot with a dark rim, drawn once (tinted by each marker's color). */
  private dotTexture(): CanvasTexture {
    if (this.dotMap) return this.dotMap;
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext('2d');
    if (g) {
      g.fillStyle = 'rgba(5, 8, 13, 0.95)';
      g.beginPath();
      g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(size / 2, size / 2, size * 0.32, 0, Math.PI * 2);
      g.fill();
    }
    this.dotMap = new CanvasTexture(canvas);
    return this.dotMap;
  }

  /** How visible a ship's model is now: it gives way to its ring in fast forward, and fades out behind Earth or the Moon. */
  private opacityOf(ship: ShipState): number {
    const seen = Number.isNaN(ship.seen) ? 0 : ship.seen;
    return (1 - smoothstep(0, 1, ship.crossFade)) * smoothstep(0, 1, seen);
  }

  /** Size, place, and show or hide each spacecraft for this frame. */
  private updateFleet(dt: number, snap: boolean): void {
    if (!this.fleet) return;
    // A move out of the journey view draws a craft behind Earth or the Moon
    // until the camera arrives, as the journey view does, so a craft just past
    // a limb from there does not blink out on the way (see behindBody).
    if (this.viewNow !== this.fleetView) {
      this.leavingJourney = this.fleetView === 'journey';
      this.fleetView = this.viewNow;
    }
    if (this.leavingJourney && this.pendingView === null && this.cameraTween === null)
      this.leavingJourney = false;
    const context = this.poseContext;
    const t = this.player.time;
    context.time = t;
    context.storyTime = this.player.storyTime;
    context.dt = dt;
    context.snap = snap;
    context.reducedMotion = this.reducedMotion;
    // Smaller clear areas (phones) get somewhat smaller models.
    const clearPixels = Math.min(
      this.clear.width * this.cssWidth,
      this.clear.height * this.cssHeight,
    );
    const screenScale = MathUtils.clamp(Math.sqrt(clearPixels / 600), 0.75, 1);
    // The journey view is a small diagram: no model longer than JOURNEY_SHIP_MAX_PX.
    // Elsewhere every model stays inside the clear area around the point it is drawn at.
    const journey = this.viewNow === 'journey';
    context.maxPixels = journey ? JOURNEY_SHIP_MAX_PX : Infinity;
    context.maxReachPixels = journey
      ? JOURNEY_SHIP_REACH_PX
      : Math.max(24, clearPixels / 2 - SHIP_EDGE_PX);
    this.camera.getWorldDirection(this.cameraForward);
    const tanHalf = Math.tan(MathUtils.degToRad(this.camera.fov) / 2);
    const subjectScale = this.orbitMission ? ORBIT_SUBJECT_SCALE : SUBJECT_SCALE;
    const sizeScaleOf = (ship: ShipState): number =>
      screenScale * (this.viewNow === 'spacecraft' && ship === this.followed ? subjectScale : 1);

    const models = this.fleet.ships;
    // A spacewalk under way on the followed craft: draw it close up in the ship view.
    const followedModel = models[this.ships.indexOf(this.followed)];
    const walking =
      this.viewNow === 'spacecraft' &&
      followedModel !== undefined &&
      this.followed.exists &&
      this.followed.fastForward < 0.5 &&
      followedModel.hasWalker(followedModel.shapeAt(t));
    this.walkWanted = walking ? 1 : 0;
    // At once on a jump, under reduced motion, and on the first frame (a link that opens during a spacewalk).
    if (snap || this.reducedMotion || !this.walkPrimed) this.walkLevel = this.walkWanted;
    else
      this.walkLevel +=
        (this.walkWanted - this.walkLevel) * (1 - Math.exp(-dt / SPACEWALK_SECONDS));
    this.walkPrimed = true;
    if (Math.abs(this.walkLevel - this.walkWanted) < 0.002) this.walkLevel = this.walkWanted;
    /**
     * The followed craft during a spacewalk: larger (see SPACEWALK_REACH_SHARE),
     * and rolled about its long axis so its top, where the spacewalker
     * floats, turns toward the camera (an illustration).
     */
    const closeUp = (ship: ShipState, model: ShipModel, pose: ShipPose): ShipPose => {
      context.glow = 1;
      context.focus = 0;
      if (ship !== this.followed || this.walkLevel <= 0) return pose;
      const index = model.shapeAt(t);
      let near = model.closeUpMetersPerPixel(index, SPACEWALK_REACH_SHARE * clearPixels);
      // Beside another craft (Gemini 10 at the old Agena), keep that one in frame too.
      if (stationReach > 0 && ship === pair?.anchor)
        near = Math.max(near, (stationReach * pair.arranged) / (STATION_FIT_SHARE * clearPixels));
      const base =
        context.metersPerPixel > 0
          ? context.metersPerPixel
          : model.metersPerPixelOf(index, context);
      const e = easeInOutCubic(this.walkLevel);
      if (near > 0 && base > 0 && near < base)
        context.metersPerPixel = MathUtils.lerp(base, near, e);
      // A close-up model needs no glow to be found; it centers on the spacewalk.
      context.glow = 1 - 0.85 * e;
      context.focus = e;
      const walk = this.walkPose;
      walk.exists = pose.exists;
      walk.position.copy(pose.position);
      walk.forward.copy(pose.forward);
      const top = this.f1.copy(pose.up).addScaledVector(pose.forward, -pose.up.dot(pose.forward));
      const toCamera = this.f2.subVectors(this.camera.position, pose.position);
      toCamera.addScaledVector(pose.forward, -toCamera.dot(pose.forward));
      if (top.lengthSq() < 1e-10 || toCamera.lengthSq() < 1e-10) return pose;
      top.normalize();
      toCamera.normalize();
      // Roll the side the spacewalker is on toward the camera by most of the way, the short way around.
      const axis = this.f3.copy(pose.forward).normalize();
      const side = model.walkerSide(index);
      const walkerDirection = this.f5.copy(top);
      // +X of the model is forward x top (see ShipModel.update); the walker is `side` from the top toward it.
      if (Number.isFinite(side)) walkerDirection.applyAxisAngle(axis, side);
      const angle = Math.atan2(
        this.f4.crossVectors(walkerDirection, toCamera).dot(axis),
        walkerDirection.dot(toCamera),
      );
      walk.up.copy(top).applyAxisAngle(axis, 0.8 * e * angle);
      return walk;
    };
    const pair = this.pairNow();
    // In the ship view, how far each ship is a dot rather than a model (see COMPANION_MODEL_M).
    const companion = (ship: ShipState): number => {
      if (
        this.viewNow !== 'spacecraft' ||
        ship === this.followed ||
        !ship.exists ||
        !this.followed.exists
      )
        return 0;
      // One of the pair is a model. Two keeping station fade between the two as
      // the pair forms or lets go, so the model does not turn into a dot at once.
      const inPair = pair !== null && (pair.anchor === ship || pair.mover === ship);
      const paired = inPair ? (pair.moment ? 1 : pair.arranged) : 0;
      if (paired >= 1) return 0;
      const meters = this.metersApart(ship, this.followed, t);
      return Number.isFinite(meters)
        ? (1 - paired) * smoothstep(COMPANION_MODEL_M, COMPANION_MARKER_M, meters)
        : 0;
    };
    const dotScale = (2 * COMPANION_MARKER_PX * tanHalf) / this.cssHeight;
    this.ships.forEach((ship, i) => {
      const marker = this.companionMarkers[i];
      if (!marker) return;
      // It fades behind a body with its model (see shipUnitsPerPixel).
      const level = companion(ship) * this.opacityOf(ship);
      const units = level > 0.01 ? this.depthUnitsPerPixel(ship.position, tanHalf) : 0;
      marker.visible = units > 0;
      if (!marker.visible) return;
      marker.position.copy(ship.position);
      marker.scale.setScalar(dotScale);
      (marker.material as SpriteMaterial).opacity = level;
    });
    // The ship that stays put (the main ship, or one of a pair) first, so the one drawn beside it can share its scale.
    const anchorIndex = this.ships.indexOf(pair ? pair.anchor : this.main);
    const moverIndex = pair ? this.ships.indexOf(pair.mover) : -1;
    const anchorModel = models[anchorIndex];
    const moverModel = moverIndex >= 0 ? models[moverIndex] : undefined;

    // Two ships keeping station: the gap drawn between them (meters at their shared scale), and how far the pair reaches from the anchor.
    // Both from their shapes at pair.shapesAt (see PairNow).
    let stationGap = 0;
    let stationReach = 0;
    // Just docked into the mover's model (Eagle into Columbia's), the anchor has no parts of its own.
    let anchorMerged = false;
    if (pair && !pair.moment && anchorModel && moverModel) {
      const a = anchorModel.shapeAt(pair.shapesAt);
      const m = moverModel.shapeAt(pair.shapesAt);
      stationGap =
        STATION_GAP_LENGTHS * Math.min(anchorModel.shapeLength(a), moverModel.shapeLength(m));
      stationReach = anchorModel.faceOf(a).distance + stationGap + moverModel.shapeLength(m);
      anchorMerged =
        pair.shapesAt < t && anchorModel.shapeParts(anchorModel.shapeAt(t)).length === 0;
    }
    let anchorUnits = 0;
    let anchorSizeScale = 1;
    /** The scale the pair shares, meters per CSS pixel (0 when there is no pair). */
    let pairScale = 0;
    if (anchorModel) {
      const ship = this.ships[anchorIndex] as ShipState;
      // A pair is drawn at the size of the ship the story follows, whichever of the two that is.
      context.sizeScale = anchorSizeScale = pair
        ? Math.max(sizeScaleOf(pair.anchor), sizeScaleOf(pair.mover))
        : sizeScaleOf(ship);
      context.unitsPerPixel = anchorUnits = this.shipUnitsPerPixel(
        ship,
        ship.position,
        tanHalf,
        dt,
        snap,
      );
      context.metersPerPixel = 0;
      context.opacity = this.opacityOf(ship) * (1 - companion(ship));
      if (pair && moverModel) {
        // Grow or shrink toward the size the two share: the docked pair's, or the larger of their
        // own, but large enough to show the smaller one (see PAIR_SMALL_SHARE).
        const own = anchorModel.metersPerPixelOf(anchorModel.shapeAt(t), context);
        if (pair.moment) {
          pairScale = anchorModel.metersPerPixelOf(pair.moment.docked, context);
        } else {
          const ownA = anchorModel.metersPerPixelOf(anchorModel.shapeAt(pair.shapesAt), context);
          const ownM = moverModel.metersPerPixelOf(moverModel.shapeAt(pair.shapesAt), context);
          const smaller = Math.min(ownA, ownM);
          const showsSmaller = smaller > 0 ? smaller / PAIR_SMALL_SHARE : Infinity;
          pairScale = Math.max(
            Math.min(Math.max(ownA, ownM), showsSmaller),
            stationReach / (STATION_FIT_SHARE * clearPixels),
          );
        }
        if (own > 0 && pairScale > 0)
          context.metersPerPixel = MathUtils.lerp(own, pairScale, pair.arranged);
      }
      anchorModel.update(closeUp(ship, anchorModel, ship), context);
    }

    for (let i = 0; i < models.length; i += 1) {
      if (i === anchorIndex) continue;
      const model = models[i] as ShipModel;
      const ship = this.ships[i] as ShipState;
      let pose: ShipPose = ship;
      context.sizeScale = sizeScaleOf(ship);
      context.metersPerPixel = 0;
      // An anchor merged into this ship's model is not drawn: the pair's scale stands in for its own.
      const anchorScale = anchorMerged ? pairScale : (anchorModel?.drawnMetersPerPixel ?? 0);
      const spread = pair !== null && (pair.arranged > 0 || this.viewNow === 'spacecraft');
      if (pair && spread && anchorModel && i === moverIndex && anchorUnits > 0 && anchorScale > 0) {
        // Never on top of the other ship in the ship view; in its place beside it from station keeping on (an illustration).
        const w = pair.arranged;
        const anchor = pair.anchor;
        const drawn = this.drawnPose;
        if (pair.moment) {
          // Where it will be docked, plus a little room.
          const minPixels = Math.abs(pair.moment.contact) / anchorScale + pair.gapPixels;
          this.dockDirection.copy(anchor.forward).multiplyScalar(pair.moment.contact >= 0 ? 1 : -1);
          this.besideAnchor(
            anchor,
            ship,
            this.dockDirection,
            minPixels,
            w,
            anchorUnits,
            this.sitePosition,
          );
          drawn.forward.lerpVectors(ship.forward, anchor.forward, w).normalize();
          drawn.up.lerpVectors(ship.up, anchor.up, w).normalize();
        } else {
          // Off the anchor's nose, face to face.
          const anchorFace = anchorModel.faceOf(anchorModel.shapeAt(pair.shapesAt));
          const moverFace = model.faceOf(model.shapeAt(t));
          this.faceDirection(anchor, anchorFace, this.dockDirection);
          // Docked into this one's model, the anchor is now its facing end: that end stays where
          // the anchor stood (a lunar module stands on its base) until the two let go.
          const minPixels = anchorMerged
            ? (moverFace.distance / anchorScale) * w
            : (anchorFace.distance + moverFace.distance) / anchorScale +
              Math.max(pair.gapPixels, stationGap / anchorScale) * pair.opening;
          this.besideAnchor(
            anchor,
            ship,
            this.dockDirection,
            minPixels,
            w,
            anchorUnits,
            this.sitePosition,
          );
          this.facingPose(anchor, ship, this.dockDirection, moverFace, w, drawn);
        }
        drawn.exists = true;
        drawn.position.copy(this.sitePosition);
        pose = drawn;
        const units = this.shipUnitsPerPixel(ship, drawn.position, tanHalf, dt, snap);
        context.unitsPerPixel = units > 0 ? MathUtils.lerp(units, anchorUnits, w) : 0;
        context.sizeScale = MathUtils.lerp(context.sizeScale, anchorSizeScale, w);
        const own = model.metersPerPixelOf(model.shapeAt(t), context);
        if (own > 0) context.metersPerPixel = MathUtils.lerp(own, anchorScale, w);
      } else {
        context.unitsPerPixel = this.shipUnitsPerPixel(ship, ship.position, tanHalf, dt, snap);
      }
      context.opacity = this.opacityOf(ship) * (1 - companion(ship));
      model.update(closeUp(ship, model, pose), context);
    }
    context.glow = 1;
    context.focus = 0;

    // Parts left behind stand at their ship's landing site from their cited moment on.
    context.opacity = 1;
    const parts = this.fleet.leftBehind;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i] as LeftBehindModel;
      const site = this.landings.get(part.shipId);
      this.sitePosition.copy(this.moonCenter).add(site?.offset ?? this.origin);
      this.siteUp.copy(site?.offset ?? this.worldUp).normalize();
      const shown = site !== undefined && t >= part.from - 1e-6;
      context.unitsPerPixel = this.unitsPerPixelAt(this.sitePosition, shown, tanHalf);
      // Sized like the ascent stage that lifted off from it (smaller in the journey view),
      // or, while the lander still stands there, like the lander. Just after liftoff it
      // takes the ascent stage's size as drawn, which eases from the whole lander's, so
      // the two grow together rather than the part appearing at the larger size.
      if (journey) context.maxPixels = JOURNEY_LEFT_BEHIND_MAX_PX;
      context.sizeScale =
        screenScale *
        (this.viewNow === 'spacecraft' && this.followed.id === part.shipId ? SUBJECT_SCALE : 1);
      const landerIndex = this.ships.findIndex((ship) => ship.id === part.shipId);
      const lander = models[landerIndex];
      const phase = this.path.phaseAt(part.shipId, t)?.kind;
      const drawnLander = lander !== undefined && lander.root.visible;
      const standing = drawnLander && phase === 'surface';
      const rising =
        drawnLander &&
        phase === 'ascent' &&
        this.player.storyTime - this.player.story.toStory(part.from) < LIFTOFF_SIZE_STORY_SECONDS;
      context.metersPerPixel = standing || rising ? lander.drawnMetersPerPixel : 0;
      part.update(shown, this.sitePosition, this.siteUp, site?.front ?? this.worldUp, context);
      // While the lander still stands there, the part is not left behind yet: no label.
      this.labelWanted[i] = !standing;
    }
    context.metersPerPixel = 0;
    this.updateLabels(tanHalf, dt, snap);
    this.updatePointer(tanHalf);
  }

  /**
   * The label of each part left behind: shown once its lander has lifted
   * off and the camera is close. It hangs under everything standing at the
   * site, one label below another, so it covers neither the parts, nor a
   * ship above them, nor another label.
   */
  private updateLabels(tanHalf: number, dt: number, snap: boolean): void {
    const parts = this.fleet?.leftBehind ?? [];
    // Toward the bottom of the screen, in world space.
    const down = this.screenDown
      .setFromMatrixColumn(this.camera.matrixWorld, 1)
      .normalize()
      .negate();
    const ease = snap ? 1 : 1 - Math.exp(-dt / LABEL_FADE_SECONDS);
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i] as LeftBehindModel;
      const label = this.labels[i];
      if (!label) continue;
      const material = label.material as SpriteMaterial;
      // Everything parked at one site stands around one point: its root's.
      const site = part.root.position;
      const unitsPerPixel = part.root.visible ? this.unitsPerPixelAt(site, true, tanHalf) : 0;
      if (unitsPerPixel <= 0) {
        label.visible = false;
        material.opacity = 0;
        continue;
      }
      const near =
        1 -
        smoothstep(
          LABEL_NEAR_MOON_RADII[0],
          LABEL_NEAR_MOON_RADII[1],
          this.camera.position.distanceTo(site) / MOON_RADIUS,
        );
      material.opacity += ((this.labelWanted[i] ? near : 0) - material.opacity) * ease;
      label.visible = material.opacity > 0.01;
      if (!label.visible) continue;
      // How far the site's parts reach down the screen, and the labels already hanging there, in CSS pixels.
      let below = 0;
      let stacked = 0;
      for (let k = 0; k < parts.length; k += 1) {
        const other = parts[k] as LeftBehindModel;
        if (other.shipId !== part.shipId || !other.root.visible) continue;
        below = Math.max(below, other.reachToward(down) / unitsPerPixel);
        const above = this.labels[k];
        if (k < i && above?.visible) stacked += above.userData['pixels'] as number;
      }
      const pixels = label.userData['pixels'] as number;
      label.position.copy(site);
      // The sprite's center is where it hangs from, in its own heights: above its top edge by the room it needs.
      label.center.set(0.5, 1 + (below + LABEL_GAP_PX + stacked) / pixels);
      const h = (2 * pixels * tanHalf) / this.cssHeight;
      label.scale.set(h * (label.userData['aspect'] as number), h, 1);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Fast forward                                                      */
  /* ---------------------------------------------------------------- */

  /**
   * Mission seconds that pass per second of real time now (0 when the clock
   * is stopped): the pace just ahead, so playing on from an event takes the
   * pace of the stretch after it, not a blend with the one before.
   */
  private missionPace(): number {
    if (!this.player.playing) return 0;
    const story = this.player.story;
    const s = this.player.storyTime;
    const b = Math.min(story.duration, s + 0.04);
    const a = b - s < 0.01 ? Math.max(0, b - 0.04) : s;
    return b > a ? ((story.toElapsed(b) - story.toElapsed(a)) / (b - a)) * this.player.speed : 0;
  }

  /**
   * Revolutions per mission second a ship makes around its body at mission
   * time t (from its path): 0 while it is docked to another ship or drawn as
   * part of one, or stands on a surface.
   */
  private turnRate(ship: ShipState, index: number, t: number): number {
    const revolutions = ship.revolutions;
    const times = ship.times;
    if (!revolutions || !times || !ship.exists) return 0;
    const phase = this.path.phaseAt(ship.id, t);
    if (!phase || phase.kind === 'docked' || phase.kind === 'surface') return 0;
    const model = this.fleet?.ships[index];
    if (model && model.shapeParts(model.shapeAt(t)).length === 0) return 0;
    const step = 30;
    const a = valueAtIndex(revolutions, sampleIndexAt(times, t - step));
    const b = valueAtIndex(revolutions, sampleIndexAt(times, t + step));
    return Math.max(0, (b - a) / (2 * step));
  }

  /**
   * The start (in revolutions flown) of a closed lap of a ship's path through
   * mission time t, or NaN when there is none (see closedLapStart).
   */
  private closedLap(ship: ShipState, t: number): number {
    const lap = ship.lap;
    const times = ship.times;
    if (!lap || !times) return Number.NaN;
    const now = valueAtIndex(lap.revolutions, sampleIndexAt(times, t));
    const center = this.nearMoon(ship.position) ? this.moonAtTrueScale : this.atOrigin;
    return closedLapStart(lap, now, center);
  }

  /**
   * Put each ship in fast forward or take it out (see
   * FAST_FORWARD_CROSSFADE_SECONDS), cross-fade its model and its ring, and
   * draw its ring through the closed lap of its path around now, easing to
   * a new lap after a burn. The ring keeps its last lap while it fades out.
   * The followed ship's fast-forward level, for the camera and the interface,
   * eases over FAST_FORWARD_SECONDS. `jumped` is any seek, `leapt` one of more
   * than a moment (see LEAP_STORY_SECONDS). Returns true when anything changed.
   */
  private updateFastForward(dt: number, jumped: boolean, leapt: boolean): boolean {
    const pace = this.missionPace();
    const t = this.player.time;
    const rescaled = this.mix !== this.ringMix;
    this.ringMix = this.mix;
    const settle = 1 - Math.exp(-dt / RING_SETTLE_SECONDS);
    let changed = false;
    this.ships.forEach((ship, index) => {
      const lapping = inFastForward(this.turnRate(ship, index, t) * pace, ship.fast);
      const start = lapping ? this.closedLap(ship, t) : Number.NaN;
      const fast = !Number.isNaN(start);
      const target = fast ? 1 : 0;
      const at = leapt || this.reducedMotion;
      if (fast && ship.lap) {
        writeLap(ship.lap, start, this.mix, ship.ringWanted, RING_POINTS);
        ship.ringCenter.copy(this.nearMoon(ship.position) ? this.moonCenter : this.origin);
        // A ring that is not showing yet takes its lap as it is; one showing eases to a new one.
        if (ship.crossFade <= 0 || at || rescaled) ship.ringNow.set(ship.ringWanted);
        else {
          const now = ship.ringNow;
          const wanted = ship.ringWanted;
          for (let k = 0; k < now.length; k += 1)
            now[k] = (now[k] as number) + ((wanted[k] as number) - (now[k] as number)) * settle;
        }
      }
      const crossFade = ship.crossFade;
      ship.crossFade = at
        ? target
        : stepToward(crossFade, target, dt / FAST_FORWARD_CROSSFADE_SECONDS);
      const level = ship.fastForward;
      if (this.reducedMotion || jumped) ship.fastForward = target;
      else ship.fastForward += (target - level) * (1 - Math.exp(-dt / FAST_FORWARD_SECONDS));
      if (Math.abs(ship.fastForward - target) < 0.003) ship.fastForward = target;
      if (fast !== ship.fast || ship.crossFade !== crossFade || ship.fastForward !== level)
        changed = true;
      ship.fast = fast;
      const ring = ship.ring;
      if (!ring) return;
      if (ship.crossFade > 0) {
        if (fast) ring.setPoints(ship.ringNow, RING_POINTS);
        ring.setOpacity(RING_OPACITY * smoothstep(0, 1, ship.crossFade));
        changed = true;
      } else if (ring.mesh.visible) {
        ring.setOpacity(0);
        changed = true;
      }
    });
    // The steady view frames the followed ship's ring (see updateFastView).
    const followed = this.followed;
    if (followed.crossFade > 0) {
      let radius = 0;
      for (let k = 0; k < RING_POINTS; k += 1)
        radius = Math.max(
          radius,
          this.v1.fromArray(followed.ringNow, 3 * k).distanceTo(followed.ringCenter),
        );
      this.ringRadius = radius;
    }
    // The event markers would stand still on the ring while the ship goes around many times: they fade with the model.
    if (changed) this.eventMarkers?.setOpacity(1 - smoothstep(0, 1, followed.crossFade));
    return changed;
  }

  /** True when a point is nearer the Moon than Earth (by height in body radii). */
  private nearMoon(position: Vector3): boolean {
    const earthHeight = (position.length() - EARTH_RADIUS) / EARTH_RADIUS;
    const moonHeight = (position.distanceTo(this.moonCenter) - MOON_RADIUS) / MOON_RADIUS;
    return moonHeight < earthHeight;
  }

  /**
   * The ship view's steady view while fast-forwarding: of the followed
   * ship's body from off its orbit's axis, tilted toward where the ship was
   * when it began, with the whole ring in frame. The direction is chosen
   * once, when fast forward starts, so the view holds still.
   */
  private updateFastView(level: number): void {
    const view = this.fastView;
    view.level = level;
    if (level <= 0.001) {
      view.active = false;
      return;
    }
    const ship = this.followed;
    const moon = this.nearMoon(ship.position);
    view.center.copy(moon ? this.moonCenter : this.origin);
    if (!view.active) {
      const radial = this.f1.subVectors(ship.position, view.center).normalize();
      const normal = this.f2.crossVectors(radial, ship.forward);
      if (normal.lengthSq() < 1e-6) normal.copy(this.worldUp);
      normal.normalize();
      // From the north and sunlit side of the orbit, as the Earth view of an Earth-orbit flight looks.
      if (normal.dot(this.f3.copy(this.sunDirection).multiplyScalar(0.6).add(this.worldUp)) < 0)
        normal.negate();
      const tilt = MathUtils.degToRad(FAST_FORWARD_TILT_DEG);
      view.direction
        .copy(normal)
        .multiplyScalar(Math.cos(tilt))
        .addScaledVector(radial, Math.sin(tilt))
        .normalize();
      view.up.copy(normal).addScaledVector(view.direction, -normal.dot(view.direction)).normalize();
      view.active = true;
    }
    const bodyRadius = moon ? MOON_RADIUS : EARTH_FRAME_RADIUS;
    const spheres: SphereLike[] = [
      { center: view.center, radius: bodyRadius },
      { center: view.center, radius: Math.max(bodyRadius, this.ringRadius) },
    ];
    view.distance = fitDistance(
      this.camera,
      view.center,
      view.direction,
      spheres,
      1.08,
      this.clear,
      view.up,
    );
  }

  private renderFrame(dt: number, snap = false): void {
    this.keepCameraOutsideBodies();
    this.updateNearPlane();
    this.updateFleet(dt, snap);
    if (this.stars) this.stars.mesh.position.copy(this.camera.position);
    this.renderer.autoClear = true;
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.shipScene, this.camera);
    this.renderer.autoClear = true;
    this.needsRender = false;
  }

  /** Push the camera back out if it ends up inside (or too close to) a body. */
  private keepCameraOutsideBodies(): void {
    this.keepCameraOutside(this.origin, EARTH_FRAME_RADIUS);
    this.keepCameraOutside(this.moonCenter, MOON_RADIUS);
  }

  private keepCameraOutside(center: Vector3, radius: number): void {
    const offset = this.v1.subVectors(this.camera.position, center);
    const min = radius * SURFACE_CLEARANCE;
    if (offset.lengthSq() < min * min) {
      if (offset.lengthSq() < 1e-12) offset.set(0, 0, 1);
      this.camera.position.copy(center).addScaledVector(offset.normalize(), min);
      this.camera.lookAt(this.controls.target);
    }
  }

  /** Keep the near plane close to the nearest surface (and the ship) for good depth precision. */
  private updateNearPlane(): void {
    const toEarth = this.camera.position.length() - EARTH_FRAME_RADIUS;
    const toMoon = this.camera.position.distanceTo(this.moonCenter) - MOON_RADIUS;
    const toTarget = this.camera.position.distanceTo(this.controls.target);
    const near = MathUtils.clamp(Math.min(toEarth, toMoon, toTarget) * 0.4, 0.0005, 1);
    if (Math.abs(near - this.camera.near) / this.camera.near > 0.1) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}

declare global {
  interface Window {
    /** The stage, while developing only, to look at the scene from the browser console. */
    stage?: Stage;
  }
}
