/**
 * The landing toy's 3D view, drawn with the scene kit: the lunar module seen
 * from the side, coming down over a field of boulders toward a patch of
 * clear, flat ground with more boulders past it. The kit draws the lander;
 * the ground, the boulders, the shadow, the flame and the amber guide lines
 * are plain three.js shapes made here, in flat, unlit colors (or flat-shaded
 * rocks) so the kit's bright model lighting does not wash them out.
 *
 * World axes: game x runs along world +X (to the right on screen) and game
 * height up world +Y, with the clear ground at y = 0. The lander flies in
 * the plane z = 0, its front (the window) toward the camera on +Z. One toy
 * meter is one meter of the model, so the lander is drawn at its own size
 * (about 8.4 m across the footpads, 5.7 m tall).
 *
 * The camera stands far back and a little raised, looking slightly down
 * (PITCH), so the ground reads as a band: the clear ground's line sits a
 * fifth of the way up the view, the ground in front of the lander's path
 * fills the bottom, and behind the path a short, darker strip of ground runs
 * back to low hills that stand for the horizon (the ground stops there,
 * hidden by the hills, so no gray reaches up behind the lander). Its
 * distance is worked out from the kit's field of view and the canvas's
 * shape whenever they change: the least distance that keeps the play area's
 * width at ground level, a lander at the highest it can fly, and the
 * marker's far end inside the view, with room left at the top for the fuel
 * strip. A narrow canvas is fitted by its width, a wide one by its height,
 * and on a wide one the boulders run on past both sides of the patch.
 */
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import {
  COLORS,
  createGlow,
  createMiniView,
  createVehicle,
  disposeObject,
  type MiniView,
  type VehiclePart,
} from '../../scene/kit.ts';
import { RULES, ahead, driftShows, groundUnder, type Flight, type Thrust } from './game.ts';

export interface LandingScene {
  readonly view: MiniView;
  /** Places the whole lander, its flame, its shadow and the drift line for this moment of a flight. */
  fly(flight: Flight, seconds: number, still: boolean): void;
  /** Shows one press: the lander leans for a sideways push, the flame swells or shrinks for an engine push. */
  puff(thrust: Thrust, still: boolean): void;
  /** The lander is down: flame out, standing on the ground, no drift line. */
  land(flight: Flight, still: boolean): void;
  /** Out of fuel: the flame goes out, the top half flies up and away, the bottom half drops to the ground. */
  abort(flight: Flight, still: boolean): void;
  /** Puts the two halves back together as one lander, for a new run. */
  reset(): void;
  /** Where a point of the game is in the view, as fractions of the canvas's width and height from its top left corner; null when it is outside the view. */
  spot(x: number, height: number): { left: number; top: number } | null;
  /** Moves on whatever is still moving by itself (a lean, a fading flame, the two halves); true while something still is. */
  tick(seconds: number, still: boolean): boolean;
  dispose(): void;
}

/** Both stages of the lunar module; the top one flies off on its own when the fuel runs out. */
const LANDER: readonly VehiclePart[] = ['lm-descent-stage', 'lm-ascent-stage'];
const ASCENT_STAGE: VehiclePart = 'lm-ascent-stage';
/** Heights on the model, from the bottom of the footpads: the descent engine's bell opens at 0.9 m, and the top stage sits on the bottom one at 3.2 m. */
const BELL = 0.9;
const ASCENT_BASE = 3.2;
/** Half the top stage's width, its thruster blocks included. */
const ASCENT_HALF_WIDTH = 1.8;

/** The vertical field of view on wide canvases, degrees; the kit widens it on tall ones (never under 36 degrees across). */
const FOV = 24;
/** How far down the camera looks. */
const PITCH = MathUtils.degToRad(4);
/** Where the clear ground's line sits, in the view's units (-1 at the bottom, 1 at the top): a fifth of the way up. */
const GROUND_LINE = -0.6;
/** Room kept at the top for the fuel strip the interface lays over the view, CSS pixels, and the lowest the top of the play area may come. */
const TOP_ROOM_PX = 56;
const TOP_LINE_LOWEST = 0.5;
const TOP_LINE_HIGHEST = 0.85;
/** How near the sides the play area may come, in the view's units. */
const SIDE_LINE = 0.985;
/**
 * How far the view shows to each side at ground level: out to the outer
 * edge of a footpad with the lander at the side of the play area, and
 * GROUND_ROOM past it.
 */
const GROUND_ROOM = 0.3;
const HALF_WIDTH = RULES.maxSide + RULES.footHalfSpan + GROUND_ROOM;

/** The ground: near and far colors, how far back it runs (to the hills), and how far it reaches to the sides. */
const GROUND_NEAR = 0x2c2d30;
const FAR_EDGE = 11;
const GROUND_HALF_WIDTH = 260;
/** The ground's rows, from the hills to well behind the camera: how far back each is (world z) and its color, darker with distance. */
const GROUND_ROWS: ReadonlyArray<readonly [z: number, color: number]> = [
  [-FAR_EDGE, 0x1e1f22],
  [-7, 0x242528],
  [-3, 0x2a2b2e],
  [0, GROUND_NEAR],
  [240, GROUND_NEAR],
];
/** The low hills on the horizon, a faint band darker than the ground in front of them. */
const HILLS = 0x17181a;
const HILL_STEP = 6;
/** The one shallow crater, behind the lander's path among the boulders. */
const CRATER = { x: -14.5, z: -6, radiusX: 2.7, radiusZ: 2, floor: 0x222326, rim: 0x3b3b3e };

/** The boulders' gray, and each one's half height for how high its top stands: 1.4 times as tall as it shows, so the rest is buried. */
const ROCK = 0x6f6d68;
const ROCK_HALF = 0.7;
/**
 * The boulders, fixed: [x, z, width, top, depth, turn, shape]. `top` is how
 * high each stands above the clear ground. They cover the rough ground on
 * both sides of the clear patch (left of RULES.clearFrom and right of
 * RULES.clearTo, out past either side of a wide canvas) from behind the
 * lander's path to in front of it, closest together on the path itself (z
 * near 0), where their tops are near RULES.roughHeight so a bump looks like
 * the footpads meeting rock. The ones that the front and back footpads pass
 * over (z near +-3.7) are low, so the pads never sink into them. The ones
 * nearest the patch are unturned, so their edges are exact and stay off it.
 * Two pebbles lie on the patch, away from where the footpads come down.
 */
export type Boulder = readonly [
  x: number,
  z: number,
  width: number,
  top: number,
  depth: number,
  turn: number,
  shape: 0 | 1,
];
export const BOULDERS: readonly Boulder[] = [
  // Left of the patch, on the lander's path.
  [-31, 0.4, 2.2, 1.15, 1.8, 0.3, 0],
  [-28.4, -0.9, 1.6, 1.05, 1.4, 1.1, 1],
  [-26.3, 0.8, 2, 1.25, 1.6, 2, 0],
  [-23.9, -0.3, 1.4, 0.95, 1.3, 0.7, 1],
  [-21.6, 1.1, 2.4, 1.3, 2, 2.6, 0],
  [-19.2, -1, 1.5, 1.1, 1.4, 1.5, 1],
  [-17, 0.5, 1.9, 1.2, 1.6, 0.2, 0],
  [-14.7, -0.6, 1.3, 0.9, 1.2, 2.3, 1],
  [-12.6, 1, 2.3, 1.25, 1.9, 1, 0],
  [-10.3, -0.4, 1.7, 1.15, 1.5, 0.5, 1],
  [-8.2, 0.9, 1.5, 1, 1.3, 2.9, 0],
  [-6, -1.1, 2.1, 1.3, 1.7, 1.8, 1],
  [-3.8, 0.3, 1.6, 1.1, 1.5, 0.9, 0],
  [-1.6, -0.8, 1.9, 1.2, 1.6, 2.4, 1],
  [0.6, 0.7, 1.4, 1.05, 1.3, 0.4, 0],
  [2.3, -0.6, 1.5, 1.15, 1.4, 0, 1],
  [3.15, 0.6, 1.4, 1.2, 1.3, 0, 0],
  // Left of the patch, in front of the path.
  [-29.5, 3.2, 0.9, 0.6, 0.8, 0.8, 1],
  [-25, 6.5, 2.2, 1.4, 1.8, 1.9, 0],
  [-20.2, 3.6, 0.7, 0.45, 0.6, 0.4, 0],
  [-16, 7.2, 1.3, 0.9, 1.2, 2.7, 1],
  [-11.4, 4.1, 1, 0.7, 0.9, 1.2, 0],
  [-7.2, 6, 2.4, 1.5, 2, 0.6, 1],
  [-3, 3.4, 0.6, 0.4, 0.6, 2.1, 0],
  [0.6, 5.6, 1.4, 0.85, 1.2, 1.4, 1],
  [3.1, 3.2, 0.7, 0.5, 0.7, 0, 0],
  // Left of the patch, behind the path.
  [-30, -4, 1.2, 0.8, 1.1, 1, 0],
  [-26.8, -7.5, 2.4, 1.6, 2, 2.2, 1],
  [-22.4, -3.4, 0.8, 0.55, 0.7, 0.2, 1],
  [-18.6, -6.2, 1.8, 1.2, 1.5, 1.6, 0],
  [-13, -9.4, 1.5, 1, 1.3, 0.9, 1],
  [-9.5, -3.6, 1, 0.7, 0.9, 2.5, 0],
  [-5, -7, 2.2, 1.5, 1.9, 0.5, 0],
  [-0.6, -3.3, 0.9, 0.6, 0.8, 1.7, 1],
  [2.75, -6.4, 1.5, 1, 1.3, 0, 1],
  // Farther left, for wide canvases.
  [-33.5, 4.8, 1.1, 0.7, 1, 0.9, 0],
  [-35.5, 0.2, 2, 1.2, 1.7, 1.2, 1],
  [-39, -5, 1.6, 1, 1.4, 0.4, 0],
  [-42.5, 1, 2.2, 1.25, 1.8, 2, 0],
  [-47, 5.5, 1.4, 0.9, 1.2, 1.6, 1],
  [-51, -2, 2, 1.2, 1.7, 0.8, 0],
  [-57, 1.5, 1.8, 1.1, 1.5, 2.4, 1],
  // Right of the patch, on the lander's path.
  [18.6, 0.3, 1.6, 1.2, 1.4, 0, 0],
  [20.6, -0.8, 2, 1.25, 1.7, 1.2, 1],
  [22.9, 0.9, 1.5, 1.05, 1.3, 2.4, 0],
  [25.1, -0.4, 2.3, 1.3, 1.9, 0.6, 1],
  [27.4, 1, 1.4, 0.95, 1.2, 1.9, 0],
  [29.5, -0.9, 1.9, 1.2, 1.6, 2.8, 1],
  [31.8, 0.5, 2.1, 1.15, 1.8, 0.9, 0],
  [34, -0.5, 1.6, 1.05, 1.4, 1.5, 1],
  // Right of the patch, in front of the path.
  [18.9, 3.4, 0.7, 0.45, 0.6, 0, 1],
  [21.6, 6.8, 2.2, 1.4, 1.8, 2, 0],
  [24.6, 4, 1, 0.7, 0.9, 1.1, 1],
  [28.3, 6.2, 1.3, 0.9, 1.2, 0.3, 0],
  [31, 3.5, 0.8, 0.5, 0.7, 2.6, 1],
  // Right of the patch, behind the path.
  [18.4, -3.5, 0.9, 0.6, 0.8, 0, 0],
  [22.2, -7.2, 2.4, 1.6, 2, 1.4, 1],
  [26, -4.2, 1.2, 0.8, 1.1, 2.2, 0],
  [29.8, -8.6, 1.7, 1.1, 1.5, 0.4, 1],
  [33.2, -3.8, 1, 0.65, 0.9, 1.8, 0],
  // Farther right, for wide canvases.
  [37.5, 0.8, 2, 1.2, 1.7, 1, 0],
  [41, -4.5, 1.6, 1, 1.4, 2.3, 1],
  [45.5, 2.5, 2.2, 1.25, 1.8, 0.5, 0],
  [51, -1, 1.8, 1.1, 1.5, 1.7, 1],
  // Two pebbles on the patch.
  [8.6, 6.6, 0.26, 0.15, 0.24, 0.5, 0],
  [14.6, -6, 0.28, 0.16, 0.26, 1.9, 1],
];

/** The engine's light, as stages draws it. */
const FLAME = 0xffa64a;
/** One glow of a flame: how far below the top of the flame it sits, its size, and its brightness. */
type GlowRow = readonly [below: number, size: number, opacity: number];
/**
 * The flame's glows, down from the bell. They overlap, so the light adds up
 * to a cone, brightest and widest at the bell and fading out at its tip
 * about 4.4 m down (with FLAME_STRETCH), near the height of the lander's
 * body.
 */
const FLAME_GLOWS: readonly GlowRow[] = [
  [0.25, 2.7, 1],
  [0.8, 2.5, 0.95],
  [1.35, 2.2, 0.85],
  [1.9, 1.9, 0.72],
  [2.45, 1.6, 0.58],
  [2.95, 1.3, 0.44],
  [3.45, 1, 0.3],
  [3.9, 0.7, 0.18],
];
/** The top stage's own flame, the same cone at about half the size, down from its base. */
const ASCENT_GLOWS: readonly GlowRow[] = [
  [0.15, 1.4, 1],
  [0.5, 1.25, 0.9],
  [0.85, 1.05, 0.75],
  [1.2, 0.85, 0.55],
  [1.55, 0.65, 0.38],
  [1.85, 0.45, 0.22],
];
/** The flame is drawn a little longer than wide. */
const FLAME_STRETCH = 1.05;
/**
 * One engine push: "up" makes the flame half as long again and "down" cuts
 * it to a little over half, mostly in length (a share of the change goes to
 * its width). How long that holds, and how fast it eases in and back.
 */
const SWELL = 0.5;
const SHRINK = 0.45;
const SWELL_WIDTH = 0.3;
const PUFF_HOLD = 0.3;
const PUFF_RATE = 16;
/** How long the flame takes to go out after a landing. */
const FADE_SECONDS = 0.4;

/** The lean for a sideways push: how far, how long it is held, and how fast it eases in and back. */
const LEAN = MathUtils.degToRad(8);
const LEAN_HOLD = 0.35;
const LEAN_RATE = 14;
/** Below this the lean and the swell have settled. */
const SETTLED = 0.002;

/** The split when the fuel runs out: how long it takes, and how far the bottom half tips. */
const SPLIT_SECONDS = 2.5;
const TIP = MathUtils.degToRad(12);
/**
 * Where the top half comes to rest, hovering in view, with or without
 * motion: this far to the side of the bottom half and this high over the
 * ground under it, or at least REST_LIFT above where it started, but never
 * higher than a whole lander may fly, so it stays clear of the fuel strip.
 * It goes to the right, and the bottom half tips that way, unless the lander
 * is right of REST_RIGHT_MOST: then both go to the left, to stay in view.
 */
const REST_ASIDE = 5;
const REST_RISE = 9.5;
const REST_LIFT = 4;
const REST_RIGHT_MOST = 11;
const REST_HIGHEST = RULES.maxHeight - 0.2;

/** The shadow: its size on the ground, and how dark it is with the lander down and at the top. */
const SHADOW_X = 4.6;
const SHADOW_Z = 3.4;
const SHADOW_DARKEST = 0.7;
const SHADOW_FAINTEST = 0.2;
const SHADOW_Y = 0.04;

/** The clear-ground marker: in front of the lander's path, across the patch from RULES.clearFrom to RULES.clearTo, in even dashes. */
const MARKER_Z = 5;
const MARKER_DASHES = 10;
/** The drift line: dash length and spacing in meters, the most dashes it can need, and its gaps at each end. */
const DRIFT_DASH = 0.45;
const DRIFT_PERIOD = 0.9;
const DRIFT_DASHES = 32;
const DRIFT_BELOW = 0.3;
const DRIFT_GAP = 0.3;
/** Widths on screen, CSS pixels, so the lines look the same at every canvas size. */
export const LINE_PX = 2;
const TICK_PX = 10;
const DRIFT_PX = 1.6;
export const RING_PX = 6;

/** Guide lines are drawn over everything; the shadow and glows come after the ground. */
const SHADOW_ORDER = 1;
const GLOW_ORDER = 2;
const MARKER_ORDER = 4;
const DRIFT_ORDER = 5;

/** A flame's flicker at a moment: its length, as a share of its steady length, wavering a little. */
function flickerAt(seconds: number): number {
  return 1 + 0.07 * Math.sin(seconds * 31) + 0.04 * Math.sin(seconds * 19 + 1.3);
}

/** A number from -1 to 1 fixed by a point, so the same corner of a rock always moves the same way and the faces stay joined. */
function wobble(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

/** A low-poly rock: a polyhedron with its corners pushed in and out a little, then fitted to -1..1 on each axis so its size is exact. */
function rockShape(shape: BufferGeometry, seed: number): BufferGeometry {
  const position = shape.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const k = 1 + 0.24 * wobble(x + seed, y, z);
    position.setXYZ(i, x * k, y * k, z * k);
  }
  shape.computeBoundingBox();
  const box = shape.boundingBox!;
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  shape.translate(-center.x, -center.y, -center.z);
  shape.scale(2 / size.x, 2 / size.y, 2 / size.z);
  shape.computeVertexNormals();
  shape.computeBoundingSphere();
  return shape;
}

/** The ground, flat at y = 0, colored row by row (see GROUND_ROWS). */
function groundShape(): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const color = new Color();
  GROUND_ROWS.forEach(([z, hex], row) => {
    color.setHex(hex);
    positions.push(-GROUND_HALF_WIDTH, 0, z, GROUND_HALF_WIDTH, 0, z);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    // Two triangles, facing up, from this row to the one before it.
    if (row > 0) {
      const a = (row - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

/** The hills: a strip standing at the ground's far edge, from below the ground to a gently rolling top. */
function hillsShape(): BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  let column = 0;
  for (let x = -GROUND_HALF_WIDTH; x <= GROUND_HALF_WIDTH; x += HILL_STEP) {
    const top = Math.max(
      0.4,
      1.1 +
        0.45 * Math.sin(x * 0.13 + 0.6) +
        0.3 * Math.sin(x * 0.31 + 2.2) +
        0.15 * Math.sin(x * 0.71 + 4.1),
    );
    positions.push(x, -1, -FAR_EDGE, x, top, -FAR_EDGE);
    if (column > 0) {
      const a = (column - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    column += 1;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

/** A soft round shadow: a disc in the XY plane, dark in the middle and fading to nothing at the rim. */
function shadowShape(): BufferGeometry {
  const geometry = new RingGeometry(0, 1, 32, 4);
  const position = geometry.getAttribute('position');
  const colors: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const r = Math.hypot(position.getX(i), position.getY(i));
    colors.push(1, 1, 1, 1 - MathUtils.smoothstep(r, 0.25, 1));
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
  return geometry;
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

/**
 * The ground, the hills, the crater and the boulders, in one group that is
 * drawn once and never moved. The boulders' meshes come back too: freeing
 * the group's shapes and materials does not free their instances.
 */
function createTerrain() {
  const terrain = new Group();
  const ground = new Mesh(
    groundShape(),
    new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }),
  );
  const hills = new Mesh(hillsShape(), new MeshBasicMaterial({ color: HILLS, side: DoubleSide }));
  const craterFloor = new Mesh(
    new CircleGeometry(1, 24),
    new MeshBasicMaterial({
      color: CRATER.floor,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  craterFloor.rotation.x = -Math.PI / 2;
  craterFloor.scale.set(CRATER.radiusX, CRATER.radiusZ, 1);
  craterFloor.position.set(CRATER.x, 0.02, CRATER.z);
  // A low rim, half sunk in the ground: a flattened ring lying on its side.
  const craterRim = new Mesh(
    new TorusGeometry(1, 0.14, 4, 24),
    new MeshStandardMaterial({ color: CRATER.rim, roughness: 1, metalness: 0, flatShading: true }),
  );
  craterRim.rotation.x = -Math.PI / 2;
  craterRim.scale.set(CRATER.radiusX, CRATER.radiusZ, 1.6);
  craterRim.position.set(CRATER.x, 0, CRATER.z);
  terrain.add(ground, hills, craterFloor, craterRim);

  const rockMaterial = new MeshStandardMaterial({
    color: ROCK,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const rockShapes = [
    rockShape(new IcosahedronGeometry(1, 0), 0.37),
    rockShape(new DodecahedronGeometry(1, 0), 1.91),
  ];
  const up = new Vector3(0, 1, 0);
  const rocks = rockShapes.map((shape, which) => {
    const list = BOULDERS.filter((boulder) => boulder[6] === which);
    const mesh = new InstancedMesh(shape, rockMaterial, list.length);
    const matrix = new Matrix4();
    const turn = new Quaternion();
    const where = new Vector3();
    const size = new Vector3();
    const tint = new Color();
    list.forEach(([x, z, width, top, depth, yaw], i) => {
      // Turned only about the vertical, so the top stays where it is set.
      const half = top * ROCK_HALF;
      where.set(x, top - half, z);
      size.set(width / 2, half, depth / 2);
      turn.setFromAxisAngle(up, yaw);
      mesh.setMatrixAt(i, matrix.compose(where, turn, size));
      // A slightly different gray for each, so neighbors do not merge.
      mesh.setColorAt(i, tint.setScalar(0.84 + 0.28 * ((i * 0.618 + which * 0.31) % 1)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    terrain.add(mesh);
    return mesh;
  });
  return { terrain, rocks };
}

/**
 * The amber guide lines, which face the camera and are drawn over
 * everything, like a drawing on the glass: the clear-ground marker with a
 * tick at each end, and the drift line with the ring it ends in, both
 * hidden until a flight places them. Their widths on screen are set with
 * the camera.
 */
function createGuideLines() {
  const amber = new MeshBasicMaterial({
    color: COLORS.main,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
  const markerDash = (RULES.clearTo - RULES.clearFrom) / (2 * MARKER_DASHES - 1);
  const marker = new Group();
  const markerLine = new Mesh(
    dashShape(MARKER_DASHES, markerDash, markerDash * 2, RULES.clearFrom),
    amber,
  );
  const tickShape = new PlaneGeometry(1, 1);
  const ticks = [RULES.clearFrom, RULES.clearTo].map((x) => {
    const tick = new Mesh(tickShape, amber);
    tick.position.set(x, 0, 0);
    tick.renderOrder = MARKER_ORDER;
    return tick;
  });
  markerLine.renderOrder = MARKER_ORDER;
  marker.add(markerLine, ...ticks);
  marker.position.set(0, 0, MARKER_Z);

  const drift = new Mesh(dashShape(DRIFT_DASHES, DRIFT_DASH, DRIFT_PERIOD), amber);
  drift.renderOrder = DRIFT_ORDER;
  drift.visible = false;
  const ring = new Mesh(new RingGeometry(0.7, 1, 32), amber);
  ring.renderOrder = DRIFT_ORDER;
  ring.visible = false;
  return { marker, markerLine, ticks, drift, ring };
}

/** A flame's glows, one for each row, drawn after the ground and the shadow, which would otherwise paint over them. */
function createFlameGlows(rows: readonly GlowRow[]) {
  return rows.map(([below, size, opacity]) => {
    const glow = createGlow(FLAME, size, opacity);
    glow.renderOrder = GLOW_ORDER;
    return { glow, below, size, opacity };
  });
}

/**
 * A value that eases toward a target, holds it a while, and eases back to
 * 0: the lander's lean for a sideways push, and the flame's swell for an
 * engine push. Under reduced motion it does not ease: with `stillJumps` it
 * changes at once and changes back at once when the hold ends, and without
 * it the value stays at 0.
 */
function createPulse(rate: number, stillJumps: boolean) {
  let target = 0;
  let hold = 0;
  const pulse = {
    value: 0,
    /** Head for `to` and hold it for `seconds`. */
    kick(to: number, seconds: number, still: boolean): void {
      target = to;
      hold = seconds;
      if (still && stillJumps) pulse.value = to;
    },
    /** Move on by `seconds`; true while it is held or not yet back at 0. */
    step(seconds: number, still: boolean): boolean {
      if (!(hold > 0 || pulse.value !== 0)) return false;
      hold = Math.max(0, hold - seconds);
      const to = hold > 0 ? target : 0;
      if (still) pulse.value = stillJumps ? to : 0;
      else pulse.value = MathUtils.damp(pulse.value, to, rate, seconds);
      if (hold === 0 && Math.abs(pulse.value) < SETTLED) pulse.value = 0;
      return true;
    },
    /** Straight back to 0, holding nothing. */
    clear(): void {
      pulse.value = 0;
      hold = 0;
    },
  };
  return pulse;
}

/** Where the lander was last placed, and the height of whatever is under it there (see groundUnder). */
interface Place {
  x: number;
  height: number;
  ground: number;
}

/** Where the split is: the bottom half drops and tips while the top half flies up and to one side, then hovers. */
interface Split {
  t: number;
  x: number;
  /** 1 when the top half goes to the right (the bottom half tips that way too), -1 to the left. */
  side: number;
  /** The lander's middle when the fuel ran out, and once the bottom half rests, tipped, on the ground. */
  fromY: number;
  toY: number;
  /** How long the bottom half takes to drop. */
  drop: number;
  /** The footpads' height when the fuel ran out (the top half's base starts there), and where that base comes to rest. */
  baseY: number;
  restX: number;
  restY: number;
}

export function createLandingScene(canvas: HTMLCanvasElement): LandingScene {
  const view = createMiniView(canvas, { stars: true, controls: false, fov: FOV });
  const { camera, scene } = view;
  // Everything drawn is tens of meters away: a far-off near plane keeps the depth sharp where the shadow lies on the ground.
  camera.near = 1;
  camera.updateProjectionMatrix();

  // The lander, its middle at the group's origin (the kit centers the model on its vertical middle).
  const vehicle = createVehicle({ layout: 'alone', parts: LANDER });
  const ascent = vehicle.object.getObjectByName(ASCENT_STAGE) ?? new Group();
  const ascentParent = ascent.parent ?? vehicle.object;
  const ascentRest = ascent.position.clone();
  const ascentTurn = ascent.quaternion.clone();
  const lander = new Group();
  // The flame hangs from the bell, inside the lander's group so it leans with it.
  const flame = new Group();
  flame.position.set(0, vehicle.bottom + BELL, 0);
  const flameGlows = createFlameGlows(FLAME_GLOWS);
  for (const { glow, below } of flameGlows) {
    glow.position.set(0, -below, 0);
    flame.add(glow);
  }
  lander.add(vehicle.object, flame);
  // The top stage's flame is placed in the world, under the stage wherever it flies, and shows only after the split.
  const ascentGlows = createFlameGlows(ASCENT_GLOWS);
  for (const { glow, size } of ascentGlows) {
    glow.scale.set(size, size * FLAME_STRETCH, 1);
    glow.visible = false;
  }

  const { terrain, rocks } = createTerrain();

  // The shadow, lying on the ground under the lander.
  const shadowMaterial = new MeshBasicMaterial({
    color: 0x000000,
    vertexColors: true,
    transparent: true,
    opacity: SHADOW_DARKEST,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const shadow = new Mesh(shadowShape(), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = SHADOW_ORDER;

  const { marker, markerLine, ticks, drift, ring } = createGuideLines();

  scene.add(terrain, lander, shadow, marker, drift, ring, ...ascentGlows.map(({ glow }) => glow));

  /** The points that must stay inside the sides, [x, height, z]: the ground's edge, a lander at the highest at the right edge (its footpads, then its top stage), and the marker's far tick, which is nearer the camera. */
  const landerHeight = vehicle.top - vehicle.bottom;
  const edges: ReadonlyArray<readonly [x: number, y: number, z: number]> = [
    [HALF_WIDTH, 0, 0],
    [RULES.maxSide + RULES.footHalfSpan, RULES.maxHeight, 0],
    [RULES.maxSide + ASCENT_HALF_WIDTH, RULES.maxHeight + landerHeight, 0],
    [RULES.clearTo + 0.3, 0, MARKER_Z],
  ];

  const look = new Vector3();
  const size = new Vector2();
  const point = new Vector3();
  // What the camera was last fitted to: NaN before the first fitting, so that one always counts as a change.
  let fittedFov = Number.NaN;
  let fittedAspect = Number.NaN;
  let fittedHeight = Number.NaN;
  /** Meters per CSS pixel where the lander flies. */
  let pixel = 0.1;

  /**
   * Put the camera where the play area fits this canvas. With the camera at
   * height `rise` and `distance` back, looking PITCH down, a point (x, y, z)
   * is `(rise - y) sin + (distance - z) cos` in front of it; the clear
   * ground's line lands on GROUND_LINE when rise / distance is
   * tan(PITCH + atan(-GROUND_LINE * t)), and each side point and the top of
   * the highest lander then give the least distance that keeps them in.
   *
   * Only the kit's field of view and aspect and the canvas's height go into
   * it, so it does nothing, and says false, until one of them changes; true
   * when it moved the camera. The interface ticks the view on the frame
   * after the canvas changes size, once the kit has set the new field and
   * aspect, so the camera follows the canvas without an observer here.
   */
  const placeCamera = (): boolean => {
    view.renderer.getSize(size);
    if (camera.fov === fittedFov && camera.aspect === fittedAspect && size.y === fittedHeight)
      return false;
    fittedFov = camera.fov;
    fittedAspect = camera.aspect;
    fittedHeight = size.y;
    const t = Math.tan(MathUtils.degToRad(camera.fov) / 2);
    const across = t * camera.aspect * SIDE_LINE;
    const sin = Math.sin(PITCH);
    const cos = Math.cos(PITCH);
    const slope = Math.tan(PITCH + Math.atan(-GROUND_LINE * t));
    const topLine = MathUtils.clamp(
      1 - (2 * TOP_ROOM_PX) / Math.max(1, size.y),
      TOP_LINE_LOWEST,
      TOP_LINE_HIGHEST,
    );
    let distance =
      (RULES.maxHeight + landerHeight) / (slope + Math.tan(Math.atan(topLine * t) - PITCH));
    for (const [x, y, z] of edges) {
      distance = Math.max(distance, (x / across + y * sin + z * cos) / (slope * sin + cos));
    }
    const rise = slope * distance;
    camera.position.set(0, rise, distance);
    look.set(0, rise - distance * Math.tan(PITCH), 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    // The kit's (switched off) controls still aim the camera at their target each frame.
    view.controls.target.copy(look);
    camera.updateMatrixWorld();
    pixel = (2 * distance * t) / Math.max(1, size.y);
    // Line widths in pixels, whatever the canvas's size.
    markerLine.scale.set(1, LINE_PX * pixel, 1);
    for (const tick of ticks) tick.scale.set(LINE_PX * pixel, TICK_PX * pixel, 1);
    ring.scale.setScalar(RING_PX * pixel);
    ring.quaternion.copy(camera.quaternion);
    return true;
  };

  // What the lander is doing.
  let phase: 'flying' | 'down' | 'split' = 'flying';
  const at: Place = {
    x: RULES.startX,
    height: RULES.startHeight,
    ground: groundUnder(RULES.startX),
  };
  let clock = 0;
  // Under reduced motion the lander never leans, and the flame changes size at once.
  const lean = createPulse(LEAN_RATE, false);
  const swell = createPulse(PUFF_RATE, true);
  /** How lit the engine is: 1 burning, 0 out. */
  let level = 1;
  let fading = false;
  let split: Split | null = null;

  const placeAt = (flight: Flight): void => {
    at.x = flight.x;
    at.height = flight.height;
    at.ground = groundUnder(flight.x);
  };

  const placeLander = (): void => {
    // A lean swings one footpad down; near the ground, lift the lander so that pad stays on top.
    const dip =
      RULES.footHalfSpan * Math.abs(Math.sin(lean.value)) +
      vehicle.bottom * (1 - Math.cos(lean.value));
    const lift = Math.max(0, dip - Math.max(0, at.height - at.ground));
    lander.position.set(at.x, at.height - vehicle.bottom + lift, 0);
    lander.rotation.set(0, 0, lean.value);
  };

  const placeFlame = (still: boolean): void => {
    flame.visible = level > 0;
    if (!flame.visible) return;
    // A little flicker, never under reduced motion.
    const flicker = still ? 1 : flickerAt(clock);
    // Going out, it also draws in toward the bell.
    const base = 0.55 + 0.45 * level;
    flame.scale.set(
      base * (1 + SWELL_WIDTH * swell.value),
      base * (1 + swell.value) * FLAME_STRETCH * flicker,
      1,
    );
    for (const { glow, opacity } of flameGlows) {
      glow.material.opacity = opacity * level * (still ? 1 : 0.94 + 0.06 * flicker);
      // The glows are drawn facing the camera; turned with the lean, the stretched flame leans too.
      glow.material.rotation = lean.value;
    }
  };

  /** Places the lander and its flame for this moment of a flight. */
  const placeFlight = (flight: Flight, still: boolean): void => {
    placeAt(flight);
    placeLander();
    placeFlame(still);
  };

  const placeShadow = (x: number, height: number): void => {
    const high = MathUtils.clamp(height / RULES.maxHeight, 0, 1);
    shadow.position.set(x, SHADOW_Y, 0);
    shadow.scale.set(SHADOW_X * (1 + 0.35 * high), SHADOW_Z * (1 + 0.35 * high), 1);
    shadowMaterial.opacity = MathUtils.lerp(SHADOW_DARKEST, SHADOW_FAINTEST, high);
  };

  const hideDrift = (): void => {
    drift.visible = false;
    ring.visible = false;
  };

  /** The dashed line from just under the footpads to where they will be in five seconds, ending in the ring. */
  const placeDrift = (flight: Flight): void => {
    const to = ahead(flight);
    // Not when the end of the line would sit on the lander itself (a short drift, or one upward).
    if (!driftShows(flight, to)) {
      hideDrift();
      return;
    }
    ring.position.set(to.x, to.height, 0);
    ring.visible = true;
    const fromY = flight.height - DRIFT_BELOW;
    const dx = to.x - flight.x;
    const dy = to.height - fromY;
    const span = Math.hypot(dx, dy);
    const room = span - DRIFT_GAP - (RING_PX * pixel + DRIFT_GAP);
    const count = Math.min(
      DRIFT_DASHES,
      Math.floor((room + DRIFT_PERIOD - DRIFT_DASH) / DRIFT_PERIOD),
    );
    if (count < 1) {
      drift.visible = false;
      return;
    }
    drift.position.set(flight.x + (dx / span) * DRIFT_GAP, fromY + (dy / span) * DRIFT_GAP, 0);
    drift.rotation.set(0, 0, Math.atan2(dy, dx));
    drift.scale.set(1, DRIFT_PX * pixel, 1);
    drift.geometry.setDrawRange(0, count * 6);
    drift.visible = true;
  };

  /** Move the top stage's base to a point in the world, from inside the lander (which carries the bottom half), with its flame under it. */
  const placeAscent = (x: number, y: number, flicker: number): void => {
    point.set(x, y, 0);
    ascentParent.worldToLocal(point);
    ascent.position.copy(point);
    for (const { glow, below, opacity } of ascentGlows) {
      ascent.localToWorld(glow.position.set(0, ASCENT_BASE - below, 0));
      glow.scale.y = glow.scale.x * FLAME_STRETCH * flicker;
      glow.material.opacity = opacity * (0.94 + 0.06 * flicker);
      // The stage is tipped with the bottom half; its flame points the same way.
      glow.material.rotation = lander.rotation.z;
    }
  };

  /**
   * The split `t` seconds in (SPLIT_SECONDS or more for the end picture):
   * the bottom half falls faster and faster and tips as it goes, while the
   * top half lifts off slowly, climbs first and moves aside after, and eases
   * to a stop where it hovers.
   */
  const placeSplit = (now: Split, t: number, still: boolean): void => {
    const fall = Math.min(1, t / now.drop);
    lander.position.set(now.x, now.fromY + (now.toY - now.fromY) * fall * fall, 0);
    lander.rotation.set(0, 0, -now.side * TIP * MathUtils.smootherstep(fall, 0, 1));
    const u = Math.min(1, t / SPLIT_SECONDS);
    const climb = MathUtils.smootherstep(u, 0, 0.85);
    const aside = MathUtils.smootherstep(u, 0.15, 1);
    placeAscent(
      now.x + (now.restX - now.x) * aside,
      now.baseY + (now.restY - now.baseY) * climb,
      still || u >= 1 ? 1 : flickerAt(t),
    );
    placeShadow(now.x, lander.position.y + vehicle.bottom);
  };

  placeCamera();
  placeLander();
  placeFlame(true);
  placeShadow(at.x, at.height);

  return {
    view,
    fly(flight, seconds, still) {
      placeCamera();
      // After a landing or a split, the picture stays until reset puts the lander back together.
      if (phase === 'flying') {
        clock += seconds;
        // Reduced motion coming on partway through a lean straightens the lander at once.
        if (still) lean.value = 0;
        placeFlight(flight, still);
        placeShadow(flight.x, flight.height);
        placeDrift(flight);
      }
      view.requestRender();
    },
    puff(thrust, still) {
      if (phase !== 'flying') return;
      switch (thrust) {
        case 'left':
        case 'right':
          // Under reduced motion the lander does not lean.
          if (still) return;
          lean.kick(thrust === 'left' ? LEAN : -LEAN, LEAN_HOLD, still);
          break;
        case 'up':
        case 'down':
          swell.kick(thrust === 'up' ? SWELL : -SHRINK, PUFF_HOLD, still);
          placeFlame(still);
          break;
      }
      view.requestRender();
    },
    land(flight, still) {
      phase = 'down';
      lean.clear();
      swell.clear();
      fading = !still && level > 0;
      if (still) level = 0;
      placeCamera();
      placeFlight(flight, still);
      placeShadow(flight.x, flight.height);
      marker.visible = false;
      hideDrift();
      view.requestRender();
    },
    abort(flight, still) {
      phase = 'split';
      lean.clear();
      swell.clear();
      fading = false;
      level = 0;
      placeCamera();
      placeFlight(flight, still);
      hideDrift();
      // Tipped, the bottom half rests on its lowest footpad's outer edge.
      const resting = -vehicle.bottom * Math.cos(TIP) + RULES.footHalfSpan * Math.sin(TIP);
      const fromY = lander.position.y;
      const toY = at.ground + resting;
      // Near the right edge the top half goes left instead, so it stays in view.
      const side = flight.x > REST_RIGHT_MOST ? -1 : 1;
      const next: Split = {
        t: 0,
        x: flight.x,
        side,
        fromY,
        toY,
        // Like a fall: longer from higher up.
        drop: MathUtils.clamp(0.5 * Math.sqrt(Math.abs(fromY - toY)), 0.35, SPLIT_SECONDS - 0.2),
        baseY: flight.height,
        restX: flight.x + side * REST_ASIDE,
        restY: Math.min(REST_HIGHEST, Math.max(at.ground + REST_RISE, flight.height + REST_LIFT)),
      };
      for (const { glow } of ascentGlows) glow.visible = true;
      // Without motion, straight to the end picture: the same one the motion ends on.
      split = still ? null : next;
      placeSplit(next, still ? SPLIT_SECONDS : 0, still);
      view.requestRender();
    },
    reset() {
      phase = 'flying';
      split = null;
      ascent.position.copy(ascentRest);
      ascent.quaternion.copy(ascentTurn);
      vehicle.setPartVisible(ASCENT_STAGE, true);
      for (const { glow } of ascentGlows) glow.visible = false;
      lean.clear();
      swell.clear();
      level = 1;
      fading = false;
      marker.visible = true;
      placeLander();
      placeFlame(true);
      placeShadow(at.x, at.height);
      view.requestRender();
    },
    spot(x, height) {
      if (placeCamera()) view.requestRender();
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
      // Both always move on, so neither is skipped when the other is still moving.
      const leaning = lean.step(seconds, still);
      const swelling = swell.step(seconds, still);
      let moving = leaning || swelling;
      if (fading) {
        level = still ? 0 : Math.max(0, level - seconds / FADE_SECONDS);
        if (level === 0) fading = false;
        moving = true;
      }
      if (split) {
        const now = split;
        // Reduced motion coming on partway jumps to the end picture.
        now.t = still ? SPLIT_SECONDS : Math.min(SPLIT_SECONDS, now.t + seconds);
        placeSplit(now, now.t, still);
        // At the end the top half hovers where it stopped, its flame on, and nothing moves.
        if (now.t >= SPLIT_SECONDS) split = null;
        moving = true;
      }
      if (moving) {
        if (phase !== 'split') placeLander();
        placeFlame(still);
      }
      const changed = placeCamera();
      if (moving || changed) view.requestRender();
      return moving;
    },
    dispose() {
      scene.remove(
        terrain,
        lander,
        shadow,
        marker,
        drift,
        ring,
        ...ascentGlows.map(({ glow }) => glow),
      );
      vehicle.dispose();
      // The glows' picture is shared by the kit; only their materials are ours.
      for (const { glow } of [...flameGlows, ...ascentGlows]) glow.material.dispose();
      disposeObject(terrain);
      for (const mesh of rocks) mesh.dispose();
      disposeObject(shadow);
      disposeObject(marker);
      disposeObject(drift);
      disposeObject(ring);
      view.dispose();
    },
  };
}
