/**
 * The orbit toy's 3D view, drawn with the scene kit: a rocket seen from the
 * side, climbing from a launch pad at the bottom left toward a dashed orbit
 * line near the top. The kit draws the rocket (the same launch stack the
 * flight draws, in its own colors) and, at the out-of-fuel ending, the
 * spacecraft on its own; everything else is flat, unlit shapes made here in
 * the mock-ups' colors: small crisp stars in the sky above the thick air,
 * the faint band of thick air with its dashed top edge, the dark ground
 * with the pad, the orbit line, the path flown so far, the dashed path ahead
 * ending in a ring, and three small parachutes. The ground is drawn last,
 * over everything, so nothing shows below its top edge: not the flame at
 * liftoff, nor a tail tipped low, a falling stage or the path flown.
 *
 * Not to scale, and said so on screen: every rocket is drawn the same
 * length, RULES.rocketLength, whatever its real height. The ground curves
 * gently down away from the pad, a hint of the Earth's curve, not a real
 * one. The spacecraft that comes home is the command and service module
 * (or the whole Gemini spacecraft), under three parachutes drawn as simple
 * domes, and a small one is drawn a little bigger as it comes down so it
 * can still be seen; it comes to rest on the sea to the right of where it
 * let go.
 *
 * World axes: game x runs along world +X (to the right on screen) and game
 * height up world +Y, with the pad's top at y = 0. Everything flat lies in
 * the plane z = 0, where the rocket flies, so a point of the game is the
 * same point of the world and its line widths can be kept at a fixed number
 * of CSS pixels. The rocket stands in a wrapper turned about the middle of
 * the stack that is left (Flight.x and Flight.height), its nose toward +X as
 * it tips over.
 *
 * The camera stands straight out in front, level, so the picture is the
 * mock-ups' side view. Its distance is worked out from the kit's field of
 * view and the canvas's shape whenever they change (see fitView): the play
 * area's bottom at the bottom of the canvas, its top just under the fuel
 * strip the interface lays over the view, and both its sides inside. A tall
 * canvas is fitted by its width and a wide one by its height; on a wide one
 * the band, the ground and the orbit line run on past both sides.
 */
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import {
  COLORS,
  createGlow,
  createMiniView,
  createVehicle,
  disposeObject,
  type MiniView,
  type Vehicle,
  type VehiclePart,
} from '../../scene/kit.ts';
import { RULES, burning, tiltDegrees, type Ahead, type Flight } from './game.ts';

/** How thick the lines are drawn and how big the ring is, in CSS px, so the screen can place labels beside them. */
export const LINE_PX = 2;
export const RING_PX = 6;

export interface OrbitScene {
  view: MiniView;
  /** Build (or rebuild) the rocket from a flight's liftoff parts, whole and standing on the pad. */
  setRocket(parts: readonly VehiclePart[]): void;
  /** Place the rocket, its flame, the path flown so far and the path ahead. `look` is null when no path ahead should show. */
  fly(flight: Flight, look: Ahead | null, seconds: number, still: boolean): void;
  /** These parts drop away: they fall behind and fade, or simply vanish when `still`. */
  drop(parts: readonly VehiclePart[], still: boolean): void;
  /** Orbit reached: the flame goes out and the path ahead and ring are hidden. */
  orbit(flight: Flight, still: boolean): void;
  /** Out of fuel: the spacecraft lets go of the last stage and comes down under three parachutes, coming to rest in view. */
  comeHome(flight: Flight, still: boolean): void;
  /** Back to the start: the whole rocket on the pad, no paths. */
  reset(): void;
  /** Where a point of the play area is in the picture, as fractions from the top left; null when out of view. */
  spot(x: number, height: number): { left: number; top: number } | null;
  /** Move anything still moving on by `seconds`. True while something is still moving. */
  tick(seconds: number, still: boolean): boolean;
  dispose(): void;
}

/** A point of the game: across from the left edge, and up from the ground. */
interface Point {
  x: number;
  height: number;
}

/** The spacecraft: the parts that come home. Everything else on a rocket is a stage, a ring, the adapter or the escape tower. */
const SPACECRAFT: ReadonlySet<VehiclePart> = new Set<VehiclePart>([
  'command-module',
  'service-module',
  'gemini-equipment-section',
  'gemini-retro-section',
  'gemini-reentry-module',
]);

/** The vertical field of view on wide canvases, degrees; the kit widens it on tall ones (never under 36 degrees across). */
const FOV = 24;
/** Room kept at the top for the fuel strip the interface lays over the view, CSS pixels, and the lowest and highest the top of the play area may come, in the view's units (-1 at the bottom, 1 at the top). */
const TOP_ROOM_PX = 56;
const TOP_LINE_LOWEST = 0.5;
const TOP_LINE_HIGHEST = 0.85;
/** How near the sides the play area may come, in the view's units. */
const SIDE_LINE = 0.97;
/** The Sun, from in front and a little above and to the right: the side the camera sees is lit, and the stack still looks round. */
const SUN = new Vector3(0.3, 0.5, 1);

/** How far the flat picture runs on past the play area, for wide canvases, and how far down the ground goes. */
const X_FROM = -3 * RULES.width;
const X_TO = 4 * RULES.width;
const GROUND_BOTTOM = -RULES.groundDepth - 10;
/** The ground's top, sampled this often across, and how far it has curved down at the play area's right edge. */
const GROUND_STEP = 0.5;
const GROUND_DROP = 1.6;

/** The mock-ups' colors: the band of thick air and its edge, the ground, its edge and the pad, the path flown, the way down, and the parachutes. */
const BAND = 0xffffff;
const BAND_OPACITY = 0.05;
const BAND_EDGE = 0xaaa7a0;
const BAND_EDGE_OPACITY = 0.5;
const GROUND = 0x1d1d1d;
const GROUND_EDGE = 0x6f6d68;
const ORBIT_OPACITY = 0.5;
const TRAIL = 0xffffff;
const TRAIL_OPACITY = 0.2;
const DESCENT = 0xaaa7a0;
const CANOPY = 0x1d1d1d;
const CANOPY_EDGE = 0xd6d3cc;
const RISER_OPACITY = 0.6;

/** The pad under the rocket, and the short mast beside it. */
const PAD = { halfWidth: 0.8, depth: 0.25 };
const MAST = { aside: 0.85, height: 1.1, width: 0.15 };

/** A dashed line's dashes: how long each is, and one every `period`, in units. */
interface Dash {
  length: number;
  period: number;
}
const ORBIT_DASH: Dash = { length: 0.6, period: 1.1 };
const BAND_DASH: Dash = { length: 0.4, period: 0.8 };
const AHEAD_DASH: Dash = { length: 0.4, period: 0.8 };
const DESCENT_DASH: Dash = { length: 0.3, period: 0.8 };
/** The thinner lines, CSS pixels: the band's edge, the ground's edge and the way down. */
const EDGE_PX = 1;
/** The gap between the nose and the path ahead, and between the path ahead and the ring, in units. */
const AHEAD_GAP = 0.35;
/** The path flown keeps a point every TRAIL_STEP units, up to TRAIL_POINTS of them; the most dashes the path ahead and the way down can need. */
const TRAIL_STEP = 0.12;
const TRAIL_POINTS = 2048;
const AHEAD_DASHES = 200;
const DESCENT_DASHES = 160;
/** A line's corner never reaches out more than twice its half width. */
const MITER_LEAST = 0.5;

/**
 * The order things are drawn in: the flat picture back to front, then a
 * part on its way out (so the lines show through it as it fades), then the
 * parachutes and the flame's glows, and the ground over all of them. The
 * rocket itself is drawn first, and hides the flat things it is in front
 * of, but not the ground.
 */
const STAR_ORDER = 0;
const BAND_ORDER = 1;
const MAST_ORDER = 2;
const GUIDE_ORDER = 4;
const TRAIL_ORDER = 5;
const AHEAD_ORDER = 6;
const FADE_ORDER = 7;
const CHUTE_ORDER = 8;
const GLOW_ORDER = 20;
/** Last of all, over everything and whatever is nearer: the ground, then the pad and the ground's edge on it. */
const GROUND_ORDER = 30;
const PAD_ORDER = 31;

/**
 * The stars: how many, fixed in place across the sky above the thick air,
 * STAR_ABOVE_BAND units clear of its edge and STAR_UNDER_STRIP_PX clear of
 * the fuel strip, and never within STAR_CLEAR of the orbit line, where one
 * would look like a stray dash. Each is a dot of STAR_PX CSS pixels at any
 * canvas size, a few of them (every BRIGHT_EVERY) bigger and brighter.
 */
const STARS = 70;
const STAR = 0xeceae5;
const STAR_PX = { least: 1, most: 1.6, bright: 2 };
const STAR_GLOW = { least: 0.4, most: 0.75, bright: 0.95 };
const BRIGHT_EVERY = 9;
const STAR_ABOVE_BAND = 1.2;
const STAR_UNDER_STRIP_PX = 8;
const STAR_CLEAR = 0.5;

/** The engine's light, as stages draws it, and the paler middle of the flame. */
const FLAME = 0xffa64a;
const FLAME_CORE = 0xffe3a6;
/** One glow of the flame: how far below the bottom of the stack it sits, its size, its brightness and its color. */
type GlowRow = readonly [below: number, size: number, opacity: number, color: number];
/**
 * The flame's glows, in units, down from the bottom of the stack that is
 * left. They overlap, so the light adds up to a cone about a quarter of the
 * rocket long: white-hot and widest at the engines, orange at the tip, and
 * wider than the stage so it stands out against the black.
 */
const FLAME_GLOWS: readonly GlowRow[] = [
  [0.1, 0.7, 0.9, FLAME_CORE],
  [0.15, 1.4, 1, FLAME],
  [0.45, 1.3, 0.95, FLAME],
  [0.8, 1.15, 0.85, FLAME],
  [1.15, 1, 0.72, FLAME],
  [1.5, 0.82, 0.58, FLAME],
  [1.85, 0.64, 0.42, FLAME],
  [2.15, 0.48, 0.28, FLAME],
];
/** The flame is drawn a little longer than wide; how long it takes to light, and to go out. */
const FLAME_STRETCH = 1.1;
const FLAME_ON_SECONDS = 0.12;
const FLAME_OUT_SECONDS = 0.3;

/** How fast the drawn tilt catches up with a press; below SETTLED it has. */
const TILT_RATE = 12;
const SETTLED = 0.002;
/** After a drop the stack that is left glides back onto the flight's point: never faster than SETTLE_SPEED units a second on average, and over at least SETTLE_LEAST seconds. */
const SETTLE_SPEED = 1;
const SETTLE_LEAST = 1.2;

/** A dropped part: how long it takes to go, how far it falls behind (units), and when in that time it starts to fade. */
const DROP_SECONDS = 2.6;
const DROP_FALL = 0.8 * RULES.rocketLength;
const FADE_FROM = 0.45;

/**
 * Coming home. The spacecraft goes at HOME_SPEED units a second on average,
 * for HOME_LEAST to HOME_MOST seconds: it leaves at that speed, carries on
 * a little up and to the right (LEAD_ASIDE, LEAD_RISE), and curves down to
 * rest on the sea REST_ASIDE to the right of where it let go, but never
 * nearer either side of the play area than REST_EDGE, so its parachutes
 * stay in view. BEND is where on the way down it is heading straight down.
 */
const HOME_SPEED = 5;
const HOME_LEAST = 3;
const HOME_MOST = 8;
const HOME_SAMPLES = 40;
const LEAD_ASIDE = 2.8;
const LEAD_RISE = 0.9;
const BEND = 0.45;
const REST_ASIDE = 5;
const REST_EDGE = 2.5;
/** Shares of the way home: it swings upright (and a small one grows to CRAFT_LEAST long) between SWING_FROM and SWING_TO, and the parachutes open between CHUTE_FROM and CHUTE_TO, from CHUTE_SHUT of their size. */
const SWING_FROM = 0.04;
const SWING_TO = 0.3;
const CRAFT_LEAST = 1.4;
const CHUTE_FROM = 0.1;
const CHUTE_TO = 0.3;
const CHUTE_SHUT = 0.15;
/** How far the empty last stage turns over as it falls away. */
const TUMBLE = MathUtils.degToRad(40);

/** The parachutes, in units: three domes side by side above the spacecraft, the middle one in front, each on two lines down to its top. */
const CANOPY_X: readonly number[] = [-1.1, 1.1, 0];
const CANOPY_SIZE = { halfWidth: 0.65, height: 0.7 };
const CANOPY_RIM = 0.12;
const RISER_LENGTH = 2;
const RISER_WIDTH = 0.07;

/** Where the camera stands for a canvas, and how big a CSS pixel is where the rocket flies. */
export interface ViewFit {
  /** The point looked at, in the plane z = 0, and how far back the camera stands. */
  x: number;
  y: number;
  distance: number;
  /** Half the view's height in the plane z = 0, units. */
  half: number;
  /** Units per CSS pixel in that plane. */
  pixel: number;
}

/**
 * Fit the play area to a canvas seen through a vertical field of view of
 * `fov` degrees. Its bottom (the ground's depth) goes on the bottom edge
 * and its top (RULES.top) TOP_ROOM_PX under the top edge, unless its width
 * needs more room: then the extra room goes above it. Across, it is
 * centered.
 */
export function fitView(fov: number, aspect: number, heightPx: number): ViewFit {
  const height = Math.max(1, heightPx);
  const t = Math.tan(MathUtils.degToRad(fov) / 2);
  const topLine = MathUtils.clamp(
    1 - (2 * TOP_ROOM_PX) / height,
    TOP_LINE_LOWEST,
    TOP_LINE_HIGHEST,
  );
  const tall = (RULES.top + RULES.groundDepth) / (1 + topLine);
  const wide = RULES.width / (2 * aspect * SIDE_LINE);
  const half = Math.max(tall, wide);
  return {
    x: RULES.width / 2,
    y: half - RULES.groundDepth,
    distance: half / t,
    half,
    pixel: (2 * half) / height,
  };
}

/** The ground's top at x: level at the pad, curving gently down to either side, and leveling off so a wide view keeps a strip of ground. */
function groundTop(x: number): number {
  const s = (x - RULES.padX) / (RULES.width - RULES.padX);
  return (-GROUND_DROP * Math.tanh(s * s)) / Math.tanh(1);
}

/** A flame's flicker at a moment: its length, as a share of its steady length, wavering a little. */
function flickerAt(seconds: number): number {
  return 1 + 0.07 * Math.sin(seconds * 31) + 0.04 * Math.sin(seconds * 19 + 1.3);
}

/** An unlit color for the flat picture: drawn by its order without writing depth, so it never hides the rocket and the rocket hides it. */
function flatMaterial(color: number, opacity = 1): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

/** A color for the ground: drawn over everything, even what is in front of it. */
function groundMaterial(color: number): MeshBasicMaterial {
  const material = flatMaterial(color);
  material.depthTest = false;
  return material;
}

/** A flat mesh of the picture, drawn in `order`. */
function flatMesh(geometry: BufferGeometry, material: MeshBasicMaterial, order: number): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = order;
  return mesh;
}

/** Dashes along +X in the XY plane, each `length` long and 1 tall (scale Y for the width), one every `period` from `from`. */
function dashShape(count: number, length: number, period: number, from = 0): BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  for (let k = 0; k < count; k += 1) {
    const x0 = from + k * period;
    const x1 = x0 + length;
    const a = k * 4;
    positions.push(x0, -0.5, 0, x1, -0.5, 0, x1, 0.5, 0, x0, 0.5, 0);
    index.push(a, a + 1, a + 2, a, a + 2, a + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

/** A dashed line across the whole picture at `height`, a dash starting at x = 0; scale its Y for the width. */
function dashedAcross(dash: Dash, height: number, material: MeshBasicMaterial): Mesh {
  const from = -Math.ceil(-X_FROM / dash.period) * dash.period;
  const count = Math.ceil((X_TO - from) / dash.period);
  const line = flatMesh(dashShape(count, dash.length, dash.period, from), material, GUIDE_ORDER);
  line.position.y = height;
  return line;
}

/** The ground: everything under its curved top, down past the bottom of any view. */
function groundShape(points: readonly Point[]): BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  points.forEach(({ x, height }, column) => {
    positions.push(x, GROUND_BOTTOM, 0, x, height, 0);
    if (column > 0) {
      const a = (column - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Straight lines `width` wide, each from one point to another, as one shape. */
function segmentsShape(
  segments: ReadonlyArray<readonly [x0: number, y0: number, x1: number, y1: number]>,
  width: number,
): BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  segments.forEach(([x0, y0, x1, y1], k) => {
    const length = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (-(y1 - y0) / length) * (width / 2);
    const ny = ((x1 - x0) / length) * (width / 2);
    positions.push(
      x0 + nx,
      y0 + ny,
      0,
      x0 - nx,
      y0 - ny,
      0,
      x1 - nx,
      y1 - ny,
      0,
      x1 + nx,
      y1 + ny,
      0,
    );
    const a = k * 4;
    index.push(a, a + 1, a + 2, a, a + 2, a + 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

/** The running length along a polyline at each of its points, into `lengths`; the whole length comes back. */
function measure(points: readonly Point[], lengths: Float64Array): number {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i]!;
    if (a) total += Math.hypot(b.x - a.x, b.height - a.height);
    lengths[i] = total;
  }
  return total;
}

/**
 * The point `along` units down a polyline measured by `measure`, into
 * `out`. The search starts at piece `from` (the pieces only go forward);
 * the piece it ends in comes back, to start the next search there.
 */
function pointAlong(
  points: readonly Point[],
  lengths: Float64Array,
  along: number,
  out: Point,
  from = 0,
): number {
  const last = points.length - 1;
  let i = Math.max(0, Math.min(from, last - 1));
  while (i < last - 1 && lengths[i + 1]! < along) i += 1;
  const a = points[i];
  if (!a) return 0;
  const b = points[i + 1] ?? a;
  const span = lengths[i + 1]! - lengths[i]!;
  const k = span > 0 ? MathUtils.clamp((along - lengths[i]!) / span, 0, 1) : 0;
  out.x = a.x + (b.x - a.x) * k;
  out.height = a.height + (b.height - a.height) * k;
  return i;
}

/** A point on the curve from `a` to `d` that leaves toward `b` and arrives from `c`, `u` of the way along (0 to 1). */
function curvePoint(a: Point, b: Point, c: Point, d: Point, u: number): Point {
  const v = 1 - u;
  const wa = v * v * v;
  const wb = 3 * v * v * u;
  const wc = 3 * v * u * u;
  const wd = u * u * u;
  return {
    x: wa * a.x + wb * b.x + wc * c.x + wd * d.x,
    height: wa * a.height + wb * b.height + wc * c.height + wd * d.height,
  };
}

/** The triangles of a line of `capacity` points (one strip) or `capacity` dashes (one quad each). */
function lineIndex(capacity: number, dashed: boolean): number[] {
  const index: number[] = [];
  if (dashed) {
    for (let k = 0; k < capacity; k += 1) {
      const a = k * 4;
      index.push(a, a + 1, a + 2, a, a + 2, a + 3);
    }
  } else {
    for (let k = 0; k < capacity - 1; k += 1) {
      const a = k * 2;
      index.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  return index;
}

/** A line in the plane z = 0, drawn again whenever it changes. */
interface Line {
  readonly mesh: Mesh;
  /** Draw it along `points`, `width` units wide, leaving off `start` units at its start and `end` at its end. */
  draw(points: readonly Point[], width: number, start?: number, end?: number): void;
  hide(): void;
}

/**
 * A line of flat quads that is written anew each time it is drawn, into
 * buffers made once: solid (a strip whose corners are mitered, so a
 * see-through line never doubles over itself at a bend) when `dash` is
 * left out, else dashed, only whole dashes, each a straight piece from one
 * point of the line to another. `capacity` is how many points (solid) or
 * dashes it can hold.
 */
function createLine(
  material: MeshBasicMaterial,
  order: number,
  capacity: number,
  dash?: Dash,
): Line {
  const corners = dash ? 4 : 2;
  const positions = new Float32Array(capacity * corners * 3);
  const attribute = new BufferAttribute(positions, 3);
  attribute.setUsage(DynamicDrawUsage);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute);
  geometry.setIndex(lineIndex(capacity, dash !== undefined));
  const mesh = flatMesh(geometry, material, order);
  // Its buffers change every frame; it is always somewhere in view when shown.
  mesh.frustumCulled = false;
  mesh.visible = false;
  let lengths = new Float64Array(capacity);
  // A solid line's points after trimming.
  const xs = new Float64Array(capacity);
  const ys = new Float64Array(capacity);
  let count = 0;
  const a: Point = { x: 0, height: 0 };
  const b: Point = { x: 0, height: 0 };

  const put = (vertex: number, x: number, y: number): void => {
    positions[vertex * 3] = x;
    positions[vertex * 3 + 1] = y;
    positions[vertex * 3 + 2] = 0;
  };
  const finish = (pieces: number): void => {
    geometry.setDrawRange(0, pieces * 6);
    attribute.needsUpdate = true;
    mesh.visible = pieces > 0;
  };
  /** Measure `points` and say where the line stops, `end` before the last. */
  const stopAt = (points: readonly Point[], end: number): number => {
    if (lengths.length < points.length) lengths = new Float64Array(points.length * 2);
    return measure(points, lengths) - end;
  };

  /** Keep a point of a solid line, skipping one that would sit on the point before. */
  const keep = (x: number, y: number): void => {
    const last = count - 1;
    if (last >= 0 && Math.abs(x - xs[last]!) < 1e-6 && Math.abs(y - ys[last]!) < 1e-6) return;
    if (count >= capacity) return;
    xs[count] = x;
    ys[count] = y;
    count += 1;
  };
  /** The unit direction of the piece of a solid line from point j - 1 to point j, into `out`. */
  const directionInto = (j: number, out: Vector2): Vector2 => {
    const dx = xs[j]! - xs[j - 1]!;
    const dy = ys[j]! - ys[j - 1]!;
    return out.set(dx, dy).divideScalar(Math.hypot(dx, dy));
  };
  const before = new Vector2();
  const after = new Vector2();
  const along = new Vector2();
  /** The two corners at point j: out from the line on both sides, mitered at a bend, square at the ends and at a full turn back. */
  const writeCorners = (j: number, half: number): void => {
    const inside = j > 0 && j < count - 1;
    if (j > 0) directionInto(j, before);
    if (j < count - 1) directionInto(j + 1, after);
    let reach = half;
    if (!inside) along.copy(j > 0 ? before : after);
    else if (along.copy(before).add(after).lengthSq() < 1e-12) along.copy(before);
    else {
      along.normalize();
      reach = half / Math.max(MITER_LEAST, along.dot(before));
    }
    const nx = -along.y * reach;
    const ny = along.x * reach;
    put(j * 2, xs[j]! + nx, ys[j]! + ny);
    put(j * 2 + 1, xs[j]! - nx, ys[j]! - ny);
  };
  const drawSolid = (points: readonly Point[], width: number, start: number, end: number): void => {
    const to = stopAt(points, end);
    count = 0;
    if (points.length < 2 || to - start < 1e-6) {
      finish(0);
      return;
    }
    const first = pointAlong(points, lengths, start, a);
    keep(a.x, a.height);
    for (let i = first + 1; i < points.length && lengths[i]! < to; i += 1)
      keep(points[i]!.x, points[i]!.height);
    pointAlong(points, lengths, to, b, first);
    keep(b.x, b.height);
    for (let j = 0; j < count; j += 1) writeCorners(j, width / 2);
    finish(Math.max(0, count - 1));
  };

  /** One dash, a straight quad from `a` to `b`, as dash number k. */
  const writeDash = (k: number, half: number): void => {
    const dx = b.x - a.x;
    const dy = b.height - a.height;
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * half;
    const ny = (dx / length) * half;
    put(k * 4, a.x + nx, a.height + ny);
    put(k * 4 + 1, a.x - nx, a.height - ny);
    put(k * 4 + 2, b.x - nx, b.height - ny);
    put(k * 4 + 3, b.x + nx, b.height + ny);
  };
  const drawDashed = (
    points: readonly Point[],
    width: number,
    start: number,
    end: number,
    shape: Dash,
  ): void => {
    const to = stopAt(points, end);
    let pieces = 0;
    let piece = 0;
    for (let s = start; s + shape.length <= to && pieces < capacity; s += shape.period) {
      piece = pointAlong(points, lengths, s, a, piece);
      piece = pointAlong(points, lengths, s + shape.length, b, piece);
      writeDash(pieces, width / 2);
      pieces += 1;
    }
    finish(pieces);
  };

  return {
    mesh,
    draw(points, width, start = 0, end = 0) {
      if (dash) drawDashed(points, width, start, end, dash);
      else drawSolid(points, width, start, end);
    },
    hide() {
      mesh.visible = false;
    },
  };
}

/** The picture that never moves: the band of thick air and its edge, the ground and its edge, the pad and its mast, and the orbit line. */
function createBackdrop() {
  const backdrop = new Group();
  const bandHeight = RULES.thickAirTop - GROUND_BOTTOM;
  const band = flatMesh(
    new PlaneGeometry(X_TO - X_FROM, bandHeight),
    flatMaterial(BAND, BAND_OPACITY),
    BAND_ORDER,
  );
  band.position.set((X_FROM + X_TO) / 2, GROUND_BOTTOM + bandHeight / 2, 0);
  const bandEdge = dashedAcross(
    BAND_DASH,
    RULES.thickAirTop,
    flatMaterial(BAND_EDGE, BAND_EDGE_OPACITY),
  );
  const orbitLine = dashedAcross(
    ORBIT_DASH,
    RULES.orbitHeight,
    flatMaterial(COLORS.main, ORBIT_OPACITY),
  );

  // The ground, its edge and the pad paint over whatever is nearer, so nothing shows below the ground's top.
  const groundPoints: Point[] = [];
  for (let x = X_FROM; x <= X_TO; x += GROUND_STEP) groundPoints.push({ x, height: groundTop(x) });
  const ground = flatMesh(groundShape(groundPoints), groundMaterial(GROUND), GROUND_ORDER);
  ground.name = 'ground';
  const edgeMaterial = groundMaterial(GROUND_EDGE);
  const groundEdge = createLine(edgeMaterial, PAD_ORDER, groundPoints.length + 2);
  const pad = flatMesh(new PlaneGeometry(PAD.halfWidth * 2, PAD.depth), edgeMaterial, PAD_ORDER);
  pad.position.set(RULES.padX, -PAD.depth / 2, 0);
  pad.name = 'pad';
  groundEdge.mesh.name = 'ground-edge';
  // The mast stands above the ground, behind the rocket, whose tail swings toward it as the nose tips over.
  const mast = flatMesh(
    new PlaneGeometry(MAST.width, MAST.height),
    flatMaterial(GROUND_EDGE),
    MAST_ORDER,
  );
  mast.position.set(RULES.padX - MAST.aside, MAST.height / 2, 0);

  backdrop.add(band, bandEdge, ground, groundEdge.mesh, pad, mast, orbitLine);
  return { backdrop, bandEdge, orbitLine, groundEdge, groundPoints };
}

/** One star: where it is as shares of the sky across and up (0 to 1), its size in CSS pixels and its brightness. */
interface Star {
  across: number;
  up: number;
  px: number;
  glow: number;
}

/** The plastic number, whose sequence spreads points over a square evenly, with no clumps or gaps. */
const PLASTIC = 1.324717957244746;

/** The stars, fixed: no randomness, so every load shows the same sky. */
const SKY: readonly Star[] = Array.from({ length: STARS }, (_, k) => {
  const across = (0.5 + (k + 1) / PLASTIC) % 1;
  const up = (0.5 + (k + 1) / (PLASTIC * PLASTIC)) % 1;
  if (k % BRIGHT_EVERY === BRIGHT_EVERY - 1)
    return { across, up, px: STAR_PX.bright, glow: STAR_GLOW.bright };
  return {
    across,
    up,
    px: MathUtils.lerp(STAR_PX.least, STAR_PX.most, (k * 0.618034) % 1),
    glow: MathUtils.lerp(STAR_GLOW.least, STAR_GLOW.most, (k * 0.414214) % 1),
  };
});

/** The stars as one shape of small square dots, laid out again over the sky the view shows whenever the camera is fitted anew. */
function createStars() {
  const positions = new Float32Array(STARS * 4 * 3);
  const attribute = new BufferAttribute(positions, 3);
  attribute.setUsage(DynamicDrawUsage);
  const color = new Color(STAR);
  const colors: number[] = [];
  for (const { glow } of SKY) {
    for (let corner = 0; corner < 4; corner += 1) colors.push(color.r, color.g, color.b, glow);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
  geometry.setIndex(lineIndex(STARS, true));
  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  const mesh = flatMesh(geometry, material, STAR_ORDER);
  mesh.name = 'stars';
  mesh.frustumCulled = false;
  /** Spread them from `left` to `right` and `bottom` to `top`, each its size at `pixel` units a CSS pixel. */
  const place = (left: number, right: number, bottom: number, top: number, pixel: number): void => {
    mesh.visible = top > bottom;
    // In from the sides by the biggest star, so none is cut in half by the canvas's edge.
    const inset = STAR_PX.bright * pixel;
    SKY.forEach(({ across, up, px }, k) => {
      const x = MathUtils.lerp(left + inset, right - inset, across);
      let y = MathUtils.lerp(bottom, top, up);
      // Off the orbit line, to the side of it the star was on.
      const off = y - RULES.orbitHeight;
      if (Math.abs(off) < STAR_CLEAR) y += off >= 0 ? STAR_CLEAR : -STAR_CLEAR;
      const half = (px * pixel) / 2;
      const corners = [
        x - half,
        y - half,
        x + half,
        y - half,
        x + half,
        y + half,
        x - half,
        y + half,
      ];
      for (let corner = 0; corner < 4; corner += 1) {
        const i = (k * 4 + corner) * 3;
        positions[i] = corners[corner * 2]!;
        positions[i + 1] = corners[corner * 2 + 1]!;
        positions[i + 2] = 0;
      }
    });
    attribute.needsUpdate = true;
  };
  return { mesh, place };
}

/** The three parachutes, their lines meeting at the group's origin (the spacecraft's top), hidden until the way home. */
function createChutes(): Group {
  const chutes = new Group();
  const segments: Array<readonly [number, number, number, number]> = [];
  for (const x of CANOPY_X) {
    segments.push([x - CANOPY_SIZE.halfWidth, RISER_LENGTH, 0, 0]);
    segments.push([x + CANOPY_SIZE.halfWidth, RISER_LENGTH, 0, 0]);
  }
  chutes.add(
    flatMesh(
      segmentsShape(segments, RISER_WIDTH),
      flatMaterial(CANOPY_EDGE, RISER_OPACITY),
      CHUTE_ORDER,
    ),
  );
  // Each dome is a dark half disc on a pale one a rim larger, so it shows as an outline against the black, as the mock-up draws it.
  const dome = new CircleGeometry(1, 24, 0, Math.PI);
  const rimMaterial = flatMaterial(CANOPY_EDGE);
  const clothMaterial = flatMaterial(CANOPY);
  CANOPY_X.forEach((x, i) => {
    const rim = flatMesh(dome, rimMaterial, CHUTE_ORDER + 1 + 2 * i);
    rim.scale.set(CANOPY_SIZE.halfWidth + CANOPY_RIM, CANOPY_SIZE.height + 2 * CANOPY_RIM, 1);
    rim.position.set(x, RISER_LENGTH - CANOPY_RIM, 0);
    const cloth = flatMesh(dome, clothMaterial, CHUTE_ORDER + 2 + 2 * i);
    cloth.scale.set(CANOPY_SIZE.halfWidth, CANOPY_SIZE.height, 1);
    cloth.position.set(x, RISER_LENGTH, 0);
    chutes.add(rim, cloth);
  });
  chutes.visible = false;
  return chutes;
}

/** The flame's glows, one for each row, placed down from the flame's origin. */
function createFlameGlows(flame: Group) {
  return FLAME_GLOWS.map(([below, size, opacity, color]) => {
    const glow = createGlow(color, size, opacity);
    glow.renderOrder = GLOW_ORDER;
    glow.position.set(0, -below, 0);
    flame.add(glow);
    return { glow, opacity };
  });
}

/** What a part of the rocket is drawn with, and the box around it in the stack's units. */
interface PartShape {
  nodes: Object3D[];
  box: Box3;
}

/**
 * A part's nodes, found by hiding it and seeing what went (the kit has no
 * other way to ask), and the box around them. A part the model does not
 * draw (the lunar module, hidden in its adapter) has none, and is left as
 * it was. The vehicle's world matrices must be current.
 */
function partShape(vehicle: Vehicle, part: VehiclePart): PartShape {
  const shown = new Set<Object3D>();
  vehicle.object.traverse((child) => {
    if (child.visible) shown.add(child);
  });
  vehicle.setPartVisible(part, false);
  const nodes: Object3D[] = [];
  vehicle.object.traverse((child) => {
    if (shown.has(child) && !child.visible) nodes.push(child);
  });
  const box = new Box3();
  if (nodes.length === 0) return { nodes, box };
  vehicle.setPartVisible(part, true);
  const piece = new Box3();
  for (const node of nodes) {
    node.traverseVisible((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const own = mesh.geometry.boundingBox;
      if (own) box.union(piece.copy(own).applyMatrix4(mesh.matrixWorld));
    });
  }
  return { nodes, box };
}

/** Parts on their way out: how long they have been going, and their own copies of their materials, to fade without the rest. */
interface Leaving {
  parts: VehiclePart[];
  age: number;
  copies: Material[];
}

/** The way home: the spacecraft, the path it takes, and how far along it is. */
interface Home {
  t: number;
  /** How long the way home takes. */
  seconds: number;
  craft: Vehicle;
  /** From the flight's last point, through where the spacecraft lets go, to where it rests. */
  points: Point[];
  lengths: Float64Array;
  total: number;
  /** How far along `points` the spacecraft starts. */
  start: number;
  /** Its turn when it lets go, and its length then and at rest. */
  turn: number;
  fromLength: number;
  toLength: number;
}

export function createOrbitScene(canvas: HTMLCanvasElement): OrbitScene {
  // The kit's star map, magnified by this narrow view, would show as blurred blobs: the view draws its own small stars instead.
  const view = createMiniView(canvas, { controls: false, fov: FOV, near: 1 });
  const { camera, scene } = view;
  view.setSunDirection(SUN);

  const { backdrop, bandEdge, orbitLine, groundEdge, groundPoints } = createBackdrop();
  const stars = createStars();
  backdrop.add(stars.mesh);
  const trailLine = createLine(flatMaterial(TRAIL, TRAIL_OPACITY), TRAIL_ORDER, TRAIL_POINTS + 3);
  const aheadLine = createLine(flatMaterial(COLORS.main), AHEAD_ORDER, AHEAD_DASHES, AHEAD_DASH);
  const ring = flatMesh(new RingGeometry(0.7, 1, 32), flatMaterial(COLORS.main), AHEAD_ORDER);
  ring.visible = false;
  const descent = createLine(flatMaterial(DESCENT), TRAIL_ORDER, DESCENT_DASHES, DESCENT_DASH);
  const lines = new Group();
  lines.add(trailLine.mesh, aheadLine.mesh, ring, descent.mesh);

  // The rocket's wrapper sits on the flight's point and turns with the tilt; inside it, the stack is moved so the middle of what is left is on that point.
  const rocket = new Group();
  const stack = new Group();
  // The flame hangs from the bottom of the stack that is left, inside the stack so it turns and glides with it.
  const flame = new Group();
  const flameGlows = createFlameGlows(flame);
  stack.add(flame);
  rocket.add(stack);
  // The spacecraft on its way home, and its parachutes, which hang straight up whatever the spacecraft does.
  const craftHolder = new Group();
  const chutes = createChutes();
  rocket.name = 'rocket';
  craftHolder.name = 'spacecraft';
  chutes.name = 'parachutes';

  scene.add(backdrop, lines, rocket, craftHolder, chutes);

  // The rocket, built by setRocket.
  let vehicle: Vehicle | null = null;
  let liftoff: VehiclePart[] = [];
  /** Units of the picture per meter of the model. */
  let unitsPerMeter = 1;
  let shapes = new Map<VehiclePart, PartShape>();
  const gone = new Set<VehiclePart>();
  let drops: Leaving[] = [];
  let copies: Material[] = [];

  // What the picture shows.
  let phase: 'flying' | 'orbit' | 'home' = 'flying';
  const at: Point = { x: RULES.padX, height: RULES.rocketLength / 2 };
  const trail: Point[] = [];
  let shownLook: Ahead | null = null;
  let home: Home | null = null;
  let clock = 0;
  /** The flame lights only once time has moved since the rocket was set on the pad, so it stands quiet until the run starts. */
  let lit = false;
  /** The drawn tilt (radians) and where it is headed; the empty stage's turn as it falls away. */
  let tiltShown = 0;
  let tiltTarget = 0;
  let tumble = 0;
  /** The stack that is left, in its own units: its tail, its nose, and its middle as drawn on the flight's point and where that middle is headed. */
  let restBottom = 0;
  let restTop: number = RULES.rocketLength;
  let midShown = RULES.rocketLength / 2;
  let midTarget = midShown;
  const settle = { from: midShown, t: 0, seconds: SETTLE_LEAST };
  /** How lit the engine is, 0 to 1, and where it is headed. */
  let level = 0;
  let levelTarget = 0;

  const target = new Vector3();
  const size = new Vector2();
  const point = new Vector3();
  const here: Point = { x: 0, height: 0 };
  // What the camera was last fitted to: NaN before the first fitting, so that one always counts as a change.
  let fittedFov = Number.NaN;
  let fittedAspect = Number.NaN;
  let fittedHeight = Number.NaN;
  /** Units per CSS pixel where the rocket flies. */
  let pixel = 0.1;

  /**
   * Put the camera where the play area fits this canvas (see fitView), and
   * keep the lines that never move at their widths in pixels. Only the
   * kit's field of view and aspect and the canvas's height go into it, so
   * it does nothing, and says false, until one of them changes; true when
   * it moved the camera, and the lines that move must be drawn again.
   */
  const placeCamera = (): boolean => {
    view.renderer.getSize(size);
    if (camera.fov === fittedFov && camera.aspect === fittedAspect && size.y === fittedHeight)
      return false;
    fittedFov = camera.fov;
    fittedAspect = camera.aspect;
    fittedHeight = size.y;
    const fit = fitView(camera.fov, camera.aspect, size.y);
    camera.position.set(fit.x, fit.y, fit.distance);
    target.set(fit.x, fit.y, 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    // The kit's (switched off) controls still aim the camera at their target each frame.
    view.controls.target.copy(target);
    camera.updateMatrixWorld();
    pixel = fit.pixel;
    orbitLine.scale.y = LINE_PX * pixel;
    bandEdge.scale.y = EDGE_PX * pixel;
    ring.scale.setScalar(RING_PX * pixel);
    groundEdge.draw(groundPoints, EDGE_PX * pixel);
    // The stars fill the sky the view shows: side to side, from above the thick air to under the fuel strip.
    const across = fit.half * camera.aspect;
    stars.place(
      fit.x - across,
      fit.x + across,
      RULES.thickAirTop + STAR_ABOVE_BAND,
      fit.y + fit.half - (TOP_ROOM_PX + STAR_UNDER_STRIP_PX) * pixel,
      pixel,
    );
    return true;
  };

  /* ---------------- The rocket ---------------- */

  /** The parts still on the rocket that it draws. */
  const partsLeft = (): VehiclePart[] =>
    vehicle
      ? vehicle.parts.filter((part) => !gone.has(part) && shapes.get(part)?.box.isEmpty() === false)
      : [];
  const extentOf = (parts: readonly VehiclePart[]): Box3 => {
    const box = new Box3();
    for (const part of parts) {
      const shape = shapes.get(part);
      if (shape) box.union(shape.box);
    }
    return box;
  };
  /** Where the stack that is left has its tail, its nose and its middle. */
  const aim = (): void => {
    const box = extentOf(partsLeft());
    if (box.isEmpty()) return;
    restBottom = box.min.y;
    restTop = box.max.y;
    midTarget = (box.min.y + box.max.y) / 2;
  };

  const placeRocket = (): void => {
    rocket.position.set(at.x, at.height, 0);
    // Tilt turns the nose toward +X: clockwise on screen.
    rocket.rotation.set(0, 0, -tiltShown - tumble);
    stack.position.set(0, -midShown, 0);
  };

  const placeFlame = (still: boolean): void => {
    flame.visible = vehicle !== null && level > 0;
    if (!flame.visible) return;
    // A little flicker, never under reduced motion; going out, it also draws in toward the engines.
    const flicker = still ? 1 : flickerAt(clock);
    const base = 0.55 + 0.45 * level;
    flame.position.set(0, restBottom, 0);
    flame.scale.set(base, base * FLAME_STRETCH * flicker, 1);
    for (const { glow, opacity } of flameGlows) {
      glow.material.opacity = opacity * level * (still ? 1 : 0.94 + 0.06 * flicker);
      // The glows are drawn facing the camera; turned with the rocket, the stretched flame turns too.
      glow.material.rotation = rocket.rotation.z;
    }
  };

  /** Ease a value toward a target at `rate`, landing on it once within SETTLED. */
  const ease = (value: number, goal: number, rate: number, seconds: number): number => {
    const next = MathUtils.damp(value, goal, rate, seconds);
    return Math.abs(next - goal) < SETTLED ? goal : next;
  };
  const posing = (): boolean =>
    tiltShown !== tiltTarget || midShown !== midTarget || level !== levelTarget;
  /** Move the drawn tilt, the stack's glide after a drop and the flame on toward where they are headed; true when any of them was still on its way. */
  const stepPose = (seconds: number, still: boolean): boolean => {
    if (!posing()) return false;
    tiltShown = still ? tiltTarget : ease(tiltShown, tiltTarget, TILT_RATE, seconds);
    if (midShown !== midTarget) {
      settle.t += seconds;
      const glide = MathUtils.smootherstep(settle.t, 0, settle.seconds);
      midShown = still || glide >= 1 ? midTarget : MathUtils.lerp(settle.from, midTarget, glide);
    }
    const lighting = levelTarget > level;
    const rate = seconds / (lighting ? FLAME_ON_SECONDS : FLAME_OUT_SECONDS);
    if (still) level = levelTarget;
    else
      level = lighting ? Math.min(levelTarget, level + rate) : Math.max(levelTarget, level - rate);
    return true;
  };

  /** Let go of these parts: each gets its own copies of its materials and is drawn after the lines, so they show through it as it fades. */
  const letGo = (parts: readonly VehiclePart[]): void => {
    const own: Material[] = [];
    const copy = (material: Material): Material => {
      const made = material.clone();
      made.transparent = true;
      own.push(made);
      return made;
    };
    for (const part of parts) {
      for (const node of shapes.get(part)?.nodes ?? []) {
        node.traverse((child) => {
          const mesh = child as Mesh;
          if (!mesh.isMesh) return;
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(copy)
            : copy(mesh.material);
          mesh.renderOrder = FADE_ORDER;
        });
      }
    }
    copies.push(...own);
    drops.push({ parts: [...parts], age: 0, copies: own });
  };
  /** Move the parts on their way out: they fall behind faster and faster and fade, then are hidden. True while any were still going. */
  const stepDrops = (seconds: number, still: boolean): boolean => {
    const model = vehicle;
    if (!model || drops.length === 0) return false;
    drops = drops.filter((item) => {
      // Reduced motion coming on partway sends them at once.
      item.age = still ? DROP_SECONDS : item.age + seconds;
      const u = Math.min(1, item.age / DROP_SECONDS);
      for (const part of item.parts) model.drift(part, (DROP_FALL / unitsPerMeter) * u ** 1.5);
      for (const material of item.copies)
        material.opacity = 1 - MathUtils.smoothstep(u, FADE_FROM, 1);
      if (u < 1) return true;
      for (const part of item.parts) model.setPartVisible(part, false);
      return false;
    });
    return true;
  };

  const clearRocket = (): void => {
    if (vehicle) {
      stack.remove(vehicle.object);
      vehicle.dispose();
      vehicle = null;
    }
    for (const material of copies) material.dispose();
    copies = [];
    drops = [];
    shapes = new Map();
    gone.clear();
  };
  /** Build the whole stack, RULES.rocketLength long, and find where each of its parts is. */
  const build = (parts: readonly VehiclePart[]): void => {
    clearRocket();
    const made = createVehicle({ layout: 'launch', parts });
    const meters = made.length;
    made.setHeight(RULES.rocketLength);
    unitsPerMeter = meters > 0 ? RULES.rocketLength / meters : 1;
    // Measured on its own, before it joins the stack, so the boxes are in the stack's units.
    made.object.updateMatrixWorld(true);
    shapes = new Map(made.parts.map((part) => [part, partShape(made, part)]));
    stack.add(made.object);
    vehicle = made;
    liftoff = [...parts];
  };

  /* ---------------- The lines ---------------- */

  const drawTrail = (): void => {
    // The path flown so far stops at the tail of the stack, until the spacecraft lets go of it.
    const end = phase === 'home' ? 0 : midShown - restBottom;
    trail.push(at);
    trailLine.draw(trail, LINE_PX * pixel, 0, end);
    trail.pop();
  };
  /** Keep a point of the path flown each TRAIL_STEP, and the flight's point as it is now. */
  const record = (flight: Flight): void => {
    at.x = flight.x;
    at.height = flight.height;
    const last = trail[trail.length - 1];
    const far = !last || Math.hypot(at.x - last.x, at.height - last.height) >= TRAIL_STEP;
    if (far && trail.length < TRAIL_POINTS) trail.push({ x: at.x, height: at.height });
  };
  const startTrail = (): void => {
    trail.length = 0;
    // From the foot of the pad, so the line shows under the rocket from its first moment.
    trail.push({ x: RULES.padX, height: 0 }, { x: at.x, height: at.height });
  };

  const hideAhead = (): void => {
    aheadLine.hide();
    ring.visible = false;
  };
  /** The dashed path ahead, from just past the nose to just short of the ring at its end. */
  const drawAhead = (): void => {
    if (phase !== 'flying' || !shownLook) {
      hideAhead();
      return;
    }
    ring.position.set(shownLook.end.x, shownLook.end.height, 0);
    ring.visible = true;
    aheadLine.draw(
      shownLook.points,
      LINE_PX * pixel,
      restTop - midShown + AHEAD_GAP,
      RING_PX * pixel + AHEAD_GAP,
    );
  };

  /* ---------------- Coming home ---------------- */

  /** Where the spacecraft rests: on the sea to the right of where it let go, its parachutes in view. */
  const restFor = (from: Vector3, length: number): Point => {
    const x = MathUtils.clamp(from.x + REST_ASIDE, REST_EDGE, RULES.width - REST_EDGE);
    return { x, height: groundTop(x) + length / 2 };
  };
  /** The way down: on from the flight's point to where the spacecraft lets go, then a curve to its rest, over to the right first and straight down at the end. */
  const wayDown = (from: Vector3, rest: Point): Point[] => {
    const start: Point = { x: from.x, height: from.y };
    const lead: Point = {
      x: from.x + MathUtils.clamp(rest.x - from.x, 0, LEAD_ASIDE),
      height: Math.min(from.y + LEAD_RISE, RULES.maxHeight),
    };
    const bend: Point = { x: rest.x, height: MathUtils.lerp(from.y, rest.height, BEND) };
    const points: Point[] = [{ x: at.x, height: at.height }, start];
    for (let k = 1; k <= HOME_SAMPLES; k += 1)
      points.push(curvePoint(start, lead, bend, rest, k / HOME_SAMPLES));
    return points;
  };
  /** The spacecraft on its own, the size it is on the rocket, starting where its top was on the stack. */
  const sendHome = (crew: readonly VehiclePart[]): Home => {
    const top = extentOf(crew).max.y;
    for (const part of crew) vehicle?.setPartVisible(part, false);
    const craft = createVehicle({ layout: 'alone', parts: crew });
    const fromLength = craft.length * unitsPerMeter;
    craft.setHeight(fromLength);
    craftHolder.add(craft.object);
    rocket.updateMatrixWorld(true);
    const from = stack.localToWorld(new Vector3(0, top - craft.top, 0));
    const toLength = Math.max(fromLength, CRAFT_LEAST);
    const points = wayDown(from, restFor(from, toLength));
    const lengths = new Float64Array(points.length);
    const total = measure(points, lengths);
    const start = lengths[1] ?? 0;
    return {
      t: 0,
      seconds: MathUtils.clamp((total - start) / HOME_SPEED, HOME_LEAST, HOME_MOST),
      craft,
      points,
      lengths,
      total,
      start,
      turn: rocket.rotation.z,
      fromLength,
      toLength,
    };
  };
  /**
   * The way home `now.t` seconds in: the spacecraft leaves at its average
   * speed, swings upright as its parachutes open, and slows to a stop at its
   * rest, drawing its way down behind it, while the empty stage turns over
   * as it falls away.
   */
  const placeHome = (now: Home): void => {
    const u = Math.min(1, now.t / now.seconds);
    const share = u + u * u - u * u * u;
    const along = now.start + (now.total - now.start) * share;
    pointAlong(now.points, now.lengths, along, here);
    const swing = MathUtils.smootherstep(u, SWING_FROM, SWING_TO);
    const turn = now.turn * (1 - swing);
    now.craft.setHeight(MathUtils.lerp(now.fromLength, now.toLength, swing));
    craftHolder.position.set(here.x, here.height, 0);
    craftHolder.rotation.set(0, 0, turn);
    const open = MathUtils.smootherstep(u, CHUTE_FROM, CHUTE_TO);
    const top = now.craft.top;
    chutes.visible = open > 0;
    chutes.position.set(here.x - Math.sin(turn) * top, here.height + Math.cos(turn) * top, 0);
    chutes.scale.setScalar(MathUtils.lerp(CHUTE_SHUT, 1, open));
    descent.draw(now.points, EDGE_PX * pixel, 0, now.total - along);
    tumble = TUMBLE * MathUtils.smootherstep(now.t, 0, DROP_SECONDS);
    placeRocket();
  };
  const endHome = (): void => {
    if (home) {
      craftHolder.remove(home.craft.object);
      home.craft.dispose();
      home = null;
    }
    chutes.visible = false;
    descent.hide();
  };

  /* ---------------- Moments of a run ---------------- */

  /** The whole rocket standing on the pad, the flame out, no paths. */
  const toPad = (): void => {
    endHome();
    phase = 'flying';
    lit = false;
    clock = 0;
    at.x = RULES.padX;
    at.height = RULES.rocketLength / 2;
    tiltShown = 0;
    tiltTarget = 0;
    tumble = 0;
    level = 0;
    levelTarget = 0;
    aim();
    midShown = midTarget;
    shownLook = null;
    hideAhead();
    startTrail();
    placeRocket();
    placeFlame(true);
    drawTrail();
  };
  /** At an ending: the flight's last place, the drawn tilt and glide finished at once, and the flame told to go out. */
  const endAt = (flight: Flight, still: boolean): void => {
    record(flight);
    tiltTarget = MathUtils.degToRad(tiltDegrees(flight));
    tiltShown = tiltTarget;
    midShown = midTarget;
    levelTarget = 0;
    if (still) level = 0;
    shownLook = null;
    hideAhead();
    placeCamera();
    placeRocket();
    placeFlame(still);
  };
  /** Both moving lines again, and the way home, after the camera is fitted anew. */
  const redrawLines = (): void => {
    drawTrail();
    drawAhead();
    if (home) placeHome(home);
  };

  placeCamera();
  toPad();

  return {
    view,
    setRocket(parts) {
      build(parts);
      toPad();
      view.requestRender();
    },
    fly(flight, look, seconds, still) {
      const refit = placeCamera();
      // After an ending, the picture stays until reset puts the rocket back on the pad.
      if (phase !== 'flying') {
        if (refit) redrawLines();
        view.requestRender();
        return;
      }
      clock += seconds;
      if (seconds > 0) lit = true;
      tiltTarget = MathUtils.degToRad(tiltDegrees(flight));
      levelTarget = lit && burning(flight) ? 1 : 0;
      stepPose(seconds, still);
      record(flight);
      shownLook = look;
      placeRocket();
      placeFlame(still);
      drawTrail();
      drawAhead();
      view.requestRender();
    },
    drop(parts, still) {
      const going = parts.filter((part) => shapes.has(part) && !gone.has(part));
      if (going.length === 0) return;
      for (const part of going) gone.add(part);
      aim();
      // The stack that is left glides back onto the flight's point (at once without motion).
      settle.from = midShown;
      settle.t = 0;
      settle.seconds = Math.max(SETTLE_LEAST, Math.abs(midTarget - midShown) / SETTLE_SPEED);
      if (still) {
        for (const part of going) vehicle?.setPartVisible(part, false);
        midShown = midTarget;
        placeRocket();
      } else letGo(going);
      placeFlame(still);
      view.requestRender();
    },
    orbit(flight, still) {
      phase = 'orbit';
      endAt(flight, still);
      drawTrail();
      view.requestRender();
    },
    comeHome(flight, still) {
      phase = 'home';
      endAt(flight, still);
      endHome();
      const parts = partsLeft();
      for (const part of parts) gone.add(part);
      const rest = parts.filter((part) => !SPACECRAFT.has(part));
      const crew = parts.filter((part) => SPACECRAFT.has(part));
      if (still) for (const part of rest) vehicle?.setPartVisible(part, false);
      else letGo(rest);
      if (crew.length > 0) {
        const now = sendHome(crew);
        // Without motion, straight to the end picture: the same one the motion ends on.
        if (still) now.t = now.seconds;
        home = now;
        placeHome(now);
      }
      drawTrail();
      view.requestRender();
    },
    reset() {
      // Built again, so every dropped part is back, in its own materials.
      if (vehicle) build(liftoff);
      toPad();
      view.requestRender();
    },
    spot(x, height) {
      if (placeCamera()) {
        redrawLines();
        view.requestRender();
      }
      point.set(x, height, 0).applyMatrix4(camera.matrixWorldInverse);
      // Behind the camera, or nearer than it draws.
      if (point.z > -camera.near) return null;
      point.applyMatrix4(camera.projectionMatrix);
      const left = (point.x + 1) / 2;
      const top = (1 - point.y) / 2;
      if (left < 0 || left > 1 || top < 0 || top > 1) return null;
      return { left, top };
    },
    tick(seconds, still) {
      let moving = stepDrops(seconds, still);
      // While flying, fly moves the rocket on; after an ending, this does.
      if (phase === 'flying') moving = moving || posing();
      else {
        clock += seconds;
        const easing = stepPose(seconds, still);
        const now = home;
        const homing = now !== null && now.t < now.seconds;
        if (now && homing) {
          // Reduced motion coming on partway jumps to the end picture.
          now.t = still ? now.seconds : Math.min(now.seconds, now.t + seconds);
          placeHome(now);
        } else if (easing) placeRocket();
        if (easing) placeFlame(still);
        moving = moving || easing || homing;
      }
      const refit = placeCamera();
      if (refit) redrawLines();
      if (moving || refit) view.requestRender();
      return moving;
    },
    dispose() {
      endHome();
      clearRocket();
      scene.remove(backdrop, lines, rocket, craftHolder, chutes);
      // The glows' picture is shared by the kit; only their materials are ours.
      for (const { glow } of flameGlows) glow.material.dispose();
      disposeObject(backdrop);
      disposeObject(lines);
      disposeObject(chutes);
      view.dispose();
    },
  };
}
