import {
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { VehiclePart } from '../content/vehicle-types';

/**
 * The astronaut drawn on spacewalks (see vehicles.ts: spacewalker,
 * standupWalker): a person in a bulky pressure suit, built from smooth
 * shapes, about 1.9 m tall standing.
 *
 * What it follows, all NASA photos in public/media:
 * - The Gemini suit (S65-34635, S65-30432 and S65-32919 of Gemini IV,
 *   S66-38515 of Gemini 9A, S66-54455 of Gemini 11, S66-62939 of Gemini
 *   12): an off-white suit, light gray gloves, white boots with gray soles,
 *   a white helmet with a gold visor across its front and a gray fitting on
 *   each side, a gray neck ring, a light gray pack on the chest where the
 *   umbilical joins (S65-34635, S65-30432), dark straps around the waist and
 *   over the shoulders (S65-34635; S66-54455 from behind), and no pack on the
 *   back (S66-54455, S65-32919).
 * - The Apollo suit (AS15-88-11866 and AS16-113-18339 on the Moon, S71-43202
 *   and S72-37001 by the service module, AS9-19-2994 on Apollo 9's porch): a
 *   white suit, a white helmet with a large gold visor, dark gray gloves
 *   (AS9-19-2994, S72-37001). A pack on the back only where a photo shows
 *   one: the small pack of S72-37001 for the spacewalker by the service
 *   module, the tall pack of AS9-19-2994 on Apollo 9's porch, whose helmet
 *   is red over its top in that photo.
 * - The gas gun of Gemini IV (S65-34635): a dark frame in the right hand
 *   with two silver bottles beside it, a dark box on top, and a thin rod
 *   standing up from it with a white end.
 * Not drawn, though the photos show them: the flag patches, the suits'
 *   wrinkles and seams, hoses other than the umbilical, cameras carried on
 *   the suit.
 *
 * Proportions are approximate and for drawing only. The figure's origin is
 * between its hip joints, head toward +Y, facing +Z; its right side is -X.
 * Its geometries are shared by key through the cache it is given; its
 * materials are its own (see walkerLook), so it fades by itself.
 */

/** Which suit: Gemini's or Apollo's. */
export type SuitEra = 'gemini' | 'apollo';
/** Floating on a tether, standing in a hatch (legs hidden by the hull), or standing on the lunar module's porch. */
export type WalkerPose = 'floating' | 'standing' | 'porch';

export interface WalkerOptions {
  era: SuitEra;
  pose: WalkerPose;
  /** A pack on the back: none, the small one of S72-37001, or the tall one of AS9-19-2994. */
  pack?: 'none' | 'small' | 'large';
  /** The helmet red over its top, as AS9-19-2994 shows it. */
  redHelmet?: boolean;
  /** The gas gun in the right hand, as a "gas-gun" node (shown only when that part is listed). */
  gasGun?: boolean;
}

/** A spacewalker's own materials (they fade in and out with it). List them with walkerMaterials. */
export interface WalkerLook {
  suit: MeshStandardMaterial;
  visor: MeshStandardMaterial;
  glove: MeshStandardMaterial;
  /** Gray fittings: the neck ring, helmet fittings, boot soles, chest pack, the gas gun's bottles. */
  metal: MeshStandardMaterial;
  /** Dark straps and the gas gun's frame. */
  strap: MeshStandardMaterial;
  /** The red of Apollo 9's helmet. */
  accent: MeshStandardMaterial;
  tether: MeshStandardMaterial;
}

/** The gas gun's node (a VehiclePart, drawn only with the spacewalker). */
export const GAS_GUN: VehiclePart = 'gas-gun';

/** A spacewalker's materials, for the suit of `era`. */
export function walkerLook(era: SuitEra): WalkerLook {
  const material = (color: number, roughness: number, metalness = 0, emissive = 0): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, roughness, metalness, emissive, transparent: true });
  const gemini = era === 'gemini';
  return {
    // Gemini's suit is a warmer, grayer white in S65-34635 than Apollo's.
    suit: material(gemini ? 0xe4e1d9 : 0xf0f0ec, 0.66),
    visor: material(0xd9a23a, 0.28, 0.55, 0x2e1d04),
    glove: material(gemini ? 0xc4c5c3 : 0x5a5d62, 0.8),
    metal: material(0x9ea3aa, 0.45, 0.4),
    strap: material(0x2b2d31, 0.85),
    accent: material(0xd2311f, 0.4),
    // White-covered, until a figure holds the gas gun (see holdGasGun and TETHER).
    tether: material(TETHER.white.color, TETHER.white.roughness, TETHER.white.metalness),
  };
}

/**
 * The umbilical's two looks. Gemini IV's was wrapped in gold tape (S65-34635,
 * S65-30432). The photos of later Gemini walks show a white-covered one
 * (S66-38515, Gemini 9A; S66-62939, Gemini 12), and Apollo's hose is white
 * (S71-43202). Only Gemini IV's walk lists the gas gun, so the gun is how
 * the scene knows that walk: its umbilical is drawn gold, the others white.
 */
const TETHER = {
  gold: { color: 0xd8b04a, roughness: 0.35, metalness: 0.45 },
  white: { color: 0xe8e8e2, roughness: 0.7, metalness: 0 },
} as const;

/** Every material of a look: the one list the ship model fades and disposes. */
export function walkerMaterials(look: WalkerLook): MeshStandardMaterial[] {
  return [look.suit, look.visor, look.glove, look.metal, look.strap, look.accent, look.tether];
}

/* ------------------------------------------------------------------ */
/* Proportions (meters, from the hip joints).                          */
/* ------------------------------------------------------------------ */

const BODY = {
  hipX: 0.11,
  hipY: -0.02,
  shoulderX: 0.215,
  shoulderY: 0.485,
  neckY: 0.62,
  /** The helmet's middle above the neck ring, and its radius. */
  helmetUp: 0.155,
  helmetR: 0.174,
  upperArm: 0.29,
  forearm: 0.26,
  thigh: 0.43,
  shin: 0.41,
  /** Front-to-back depth of the torso over its width. */
  torsoDepth: 0.68,
};

/** The torso's outline, radius by height (meters), from the crotch to the neck; turned around Y and flattened front to back. */
const TORSO: ReadonlyArray<readonly [number, number]> = [
  [0.0, -0.135],
  [0.08, -0.128],
  [0.14, -0.1],
  [0.172, -0.05],
  [0.185, 0.02],
  [0.18, 0.1],
  [0.176, 0.16],
  [0.19, 0.24],
  [0.205, 0.33],
  [0.21, 0.41],
  [0.205, 0.47],
  [0.185, 0.53],
  [0.15, 0.575],
  [0.11, 0.605],
  [0.08, 0.622],
  [0.0, 0.628],
];

/** The torso's radius (across) at height y. */
function torsoRadius(y: number): number {
  for (let i = 1; i < TORSO.length; i += 1) {
    const [r1, y1] = TORSO[i] as readonly [number, number];
    const [r0, y0] = TORSO[i - 1] as readonly [number, number];
    if (y <= y1) return r0 + ((y - y0) / Math.max(1e-6, y1 - y0)) * (r1 - r0);
  }
  return 0;
}

/** A point on the torso's surface at height y, `x` across, on its front (+1) or back (-1), `out` meters proud of it. */
function onTorso(x: number, y: number, side: 1 | -1, out = 0): Vector3 {
  const r = torsoRadius(y) + out;
  const z = Math.sqrt(Math.max(0, r * r - x * x)) * BODY.torsoDepth;
  return new Vector3(x, y, side * z);
}

/* ------------------------------------------------------------------ */
/* Poses (degrees).                                                    */
/* ------------------------------------------------------------------ */

/** A shoulder or hip: swung forward (`flex`), out to the side (`out`), and turned inward about the limb (`twist`). */
interface Swing {
  flex: number;
  out: number;
  twist: number;
}

interface Side {
  shoulder: Swing;
  /** Elbow and knee bends; ankle: toes down. */
  elbow: number;
  hip: Swing;
  knee: number;
  ankle: number;
}

interface Pose {
  /** Head: nodded forward, turned to its left, tilted to its left. */
  head: { nod: number; turn: number; tilt: number };
  left: Side;
  right: Side;
}

/**
 * Floating free on the tether: a relaxed, weightless crouch, hips and knees
 * a little bent, arms forward with the elbows bent, the head tipped down;
 * the right knee bent more than the left, as in S65-34635.
 */
const FLOATING: Pose = {
  head: { nod: 12, turn: 14, tilt: -4 },
  right: {
    shoulder: { flex: 40, out: 28, twist: 12 },
    elbow: 60,
    hip: { flex: 40, out: 22, twist: -28 },
    knee: 78,
    ankle: 22,
  },
  left: {
    shoulder: { flex: 32, out: 20, twist: 18 },
    elbow: 48,
    hip: { flex: 14, out: 8, twist: 4 },
    knee: 30,
    ankle: 16,
  },
};

/** Standing in a hatch: upright, the forearms forward over the hatch's front rim. */
const STANDING: Pose = {
  head: { nod: 8, turn: 0, tilt: 0 },
  right: { shoulder: { flex: 22, out: 8, twist: 32 }, elbow: 78, hip: { flex: 0, out: 3, twist: 0 }, knee: 0, ankle: 0 },
  left: { shoulder: { flex: 16, out: 10, twist: 30 }, elbow: 84, hip: { flex: 0, out: 3, twist: 0 }, knee: 0, ankle: 0 },
};

/** Standing on the porch: upright, knees a little bent, the arms forward (AS9-19-2994 shows one reaching out). */
const PORCH: Pose = {
  head: { nod: 10, turn: -10, tilt: 0 },
  right: { shoulder: { flex: 42, out: 20, twist: 18 }, elbow: 55, hip: { flex: 10, out: 5, twist: 0 }, knee: 16, ankle: -6 },
  left: { shoulder: { flex: 20, out: 16, twist: 24 }, elbow: 62, hip: { flex: 6, out: 5, twist: 0 }, knee: 10, ankle: -4 },
};

const POSES: Record<WalkerPose, Pose> = { floating: FLOATING, standing: STANDING, porch: PORCH };

/** The right arm holding the gas gun up and out to the side, as Ed White holds it in S65-34635. */
const GUN_ARM = { shoulder: { flex: 30, out: 70, twist: -55 }, elbow: 50 } satisfies Pick<Side, 'shoulder' | 'elbow'>;

const DEG = Math.PI / 180;

/** An unnamed joint at (x, y, z) in `parent` (unnamed: the ship model treats named groups as parts). */
function joint(parent: Object3D, x: number, y: number, z: number): Group {
  const group = new Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

/** Turn a shoulder or hip on side `side` (+1 the figure's left, +X; -1 its right). */
function swing(group: Group, side: 1 | -1, s: Swing): void {
  // Out to the side first, then forward, about the body's axes; the twist turns the limb about itself.
  group.rotation.set(-s.flex * DEG, -side * s.twist * DEG, side * s.out * DEG, 'XZY');
}

/* ------------------------------------------------------------------ */
/* Shapes, shared by key.                                              */
/* ------------------------------------------------------------------ */

function cached(cache: Map<string, BufferGeometry>, key: string, make: () => BufferGeometry): BufferGeometry {
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = make();
    cache.set(key, geometry);
  }
  return geometry;
}

/** A limb segment hanging from its joint (the origin) along -Y: rounded at both ends, radius `r1` at the joint tapering to `r2` at `length`. */
function limb(cache: Map<string, BufferGeometry>, r1: number, r2: number, length: number, segments = 12): BufferGeometry {
  return cached(cache, `walker:limb:${r1}:${r2}:${length}:${segments}`, () => {
    const points: Vector2[] = [];
    const steps = 3;
    for (let i = 0; i <= steps; i += 1) {
      const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
      points.push(new Vector2(Math.max(0, Math.cos(a) * r2), -length + Math.sin(a) * r2));
    }
    for (let i = 0; i <= steps; i += 1) {
      const a = (i / steps) * (Math.PI / 2);
      points.push(new Vector2(Math.max(0, Math.cos(a) * r1), Math.sin(a) * r1));
    }
    return new LatheGeometry(points, segments);
  });
}

function torsoGeometry(cache: Map<string, BufferGeometry>): BufferGeometry {
  return cached(cache, 'walker:torso', () => {
    const geometry = new LatheGeometry(
      TORSO.map(([r, y]) => new Vector2(r, y)),
      20,
    );
    geometry.scale(1, 1, BODY.torsoDepth);
    return geometry;
  });
}

/** A sphere scaled to (x, y, z) radii. */
function ellipsoid(cache: Map<string, BufferGeometry>, x: number, y: number, z: number, segments = 12): BufferGeometry {
  return cached(cache, `walker:ellipsoid:${x}:${y}:${z}:${segments}`, () => {
    const geometry = new SphereGeometry(1, segments, Math.max(6, Math.round(segments * 0.66)));
    geometry.scale(x, y, z);
    return geometry;
  });
}

/** The helmet's shell is longer front to back and a little taller than wide. */
const HELMET_SCALE = new Vector3(1, 1.05, 1.1);

/** The helmet's shell, `grow` times its radius, from the crown down to `bottom` radians (pi: the whole shell). */
function helmetShell(cache: Map<string, BufferGeometry>, grow: number, bottom: number): BufferGeometry {
  return cached(cache, `walker:helmet:${grow}:${bottom}`, () => {
    const geometry = new SphereGeometry(BODY.helmetR * grow, 24, Math.round((12 * bottom) / Math.PI), 0, Math.PI * 2, 0, bottom);
    geometry.scale(HELMET_SCALE.x, HELMET_SCALE.y, HELMET_SCALE.z);
    return geometry;
  });
}

/** The visor's span on the helmet: `phi` radians either side of straight ahead, from `top` to `bottom` radians down from the crown. */
interface VisorSpan {
  phi: number;
  top: number;
  bottom: number;
}

/** How square the visor's rounded outline is (a superellipse; 2 would be an ellipse). */
const VISOR_ROUNDNESS = 5;

/**
 * A point on the helmet's surface, `grow` times its radius, at `k` (0 the
 * middle, 1 the edge) toward angle `a` around the visor's rounded outline.
 */
function onVisor(span: VisorSpan, grow: number, k: number, a: number, out: Vector3): Vector3 {
  const c = Math.cos(a);
  const d = Math.sin(a);
  const u = k * Math.sign(c) * Math.abs(c) ** (2 / VISOR_ROUNDNESS);
  const v = k * Math.sign(d) * Math.abs(d) ** (2 / VISOR_ROUNDNESS);
  const theta = (span.top + span.bottom) / 2 - (v * (span.bottom - span.top)) / 2;
  const radius = BODY.helmetR * grow;
  return out.set(
    radius * Math.sin(u * span.phi) * Math.sin(theta) * HELMET_SCALE.x,
    radius * Math.cos(theta) * HELMET_SCALE.y,
    radius * Math.cos(u * span.phi) * Math.sin(theta) * HELMET_SCALE.z,
  );
}

/** The visor: a patch of the helmet's surface, `grow` times its radius, over `span`, with a rounded outline. */
function visorGeometry(cache: Map<string, BufferGeometry>, span: VisorSpan, grow: number): BufferGeometry {
  return cached(cache, `walker:visor:${span.phi}:${span.top}:${span.bottom}:${grow}`, () => {
    const rings = 6;
    const around = 36;
    const positions: number[] = [];
    const normals: number[] = [];
    const point = new Vector3();
    const normal = new Vector3();
    const add = (k: number, a: number): void => {
      onVisor(span, grow, k, a, point);
      positions.push(point.x, point.y, point.z);
      normal.set(point.x / HELMET_SCALE.x ** 2, point.y / HELMET_SCALE.y ** 2, point.z / HELMET_SCALE.z ** 2).normalize();
      normals.push(normal.x, normal.y, normal.z);
    };
    add(0, 0);
    for (let i = 1; i <= rings; i += 1) {
      for (let j = 0; j < around; j += 1) add(i / rings, (j / around) * Math.PI * 2);
    }
    // A fan around the middle, then bands out to the edge (counterclockwise seen from the front).
    const index: number[] = [];
    const at = (i: number, j: number): number => 1 + (i - 1) * around + (j % around);
    for (let j = 0; j < around; j += 1) index.push(0, at(1, j), at(1, j + 1));
    for (let i = 1; i < rings; i += 1) {
      for (let j = 0; j < around; j += 1) index.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    geometry.setIndex(index);
    return geometry;
  });
}

/** The visor's frame: a thin tube around its outline. */
function visorRim(cache: Map<string, BufferGeometry>, span: VisorSpan): BufferGeometry {
  return cached(cache, `walker:visor-rim:${span.phi}:${span.top}:${span.bottom}`, () => {
    const points: Vector3[] = [];
    for (let j = 0; j < 24; j += 1) points.push(onVisor(span, 1.022, 1, (j / 24) * Math.PI * 2, new Vector3()));
    return new TubeGeometry(new CatmullRomCurve3(points, true, 'centripetal'), 40, 0.009, 4, true);
  });
}

/** A ring lying flat (around Y). */
function torus(cache: Map<string, BufferGeometry>, radius: number, tube: number, around = 20): BufferGeometry {
  return cached(cache, `walker:torus:${radius}:${tube}:${around}`, () => {
    const geometry = new TorusGeometry(radius, tube, around > 16 ? 6 : 4, around);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  });
}

function roundedBox(cache: Map<string, BufferGeometry>, w: number, h: number, d: number, r: number, segments = 1): BufferGeometry {
  return cached(cache, `walker:rbox:${w}:${h}:${d}:${r}:${segments}`, () => new RoundedBoxGeometry(w, h, d, segments, r));
}

function capsule(cache: Map<string, BufferGeometry>, radius: number, length: number): BufferGeometry {
  return cached(cache, `walker:capsule:${radius}:${length}`, () => new CapsuleGeometry(radius, length, 2, 8));
}

function bottle(cache: Map<string, BufferGeometry>, radius: number, length: number): BufferGeometry {
  return cached(cache, `walker:bottle:${radius}:${length}`, () => new CylinderGeometry(radius, radius, length, 10));
}

/** A strap laid over the torso through `points`, as a thin tube. */
function strap(cache: Map<string, BufferGeometry>, key: string, points: Vector3[], closed = false): BufferGeometry {
  return cached(cache, `walker:strap:${key}`, () => new TubeGeometry(new CatmullRomCurve3(points, closed, 'centripetal'), closed ? 32 : 28, 0.011, 4, closed));
}

function place(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/* ------------------------------------------------------------------ */
/* The figure.                                                         */
/* ------------------------------------------------------------------ */

export interface Walker {
  /** The figure: origin between the hip joints, head toward +Y, facing +Z. */
  figure: Group;
  /** Where a tether meets the front of the suit, in the figure's coordinates. */
  tetherPoint: Vector3;
}

/** Build an astronaut in `look`'s materials, posed and dressed by `options`. */
export function buildWalker(cache: Map<string, BufferGeometry>, look: WalkerLook, options: WalkerOptions): Walker {
  const pose = POSES[options.pose];
  const gemini = options.era === 'gemini';
  const figure = new Group();

  // Torso, neck ring, and helmet.
  figure.add(place(torsoGeometry(cache), look.suit));
  const neck = joint(figure, 0, BODY.neckY, 0);
  neck.rotation.set(pose.head.nod * DEG * 0.35, pose.head.turn * DEG * 0.3, pose.head.tilt * DEG * 0.3);
  neck.add(place(torus(cache, 0.112, 0.03), look.metal, 0, 0.005, 0));
  const head = joint(neck, 0, 0, 0.01);
  head.rotation.set(pose.head.nod * DEG * 0.65, pose.head.turn * DEG * 0.7, pose.head.tilt * DEG * 0.7);
  addHelmet(cache, head, look, gemini, options.redHelmet === true);

  // Arms.
  let rightArm: { shoulder: Group; elbow: Group; hand: Group } | undefined;
  for (const side of [1, -1] as const) {
    const s = side > 0 ? pose.left : pose.right;
    const shoulder = joint(figure, side * BODY.shoulderX, BODY.shoulderY, 0);
    swing(shoulder, side, s.shoulder);
    shoulder.add(place(ellipsoid(cache, 0.098, 0.1, 0.092), look.suit));
    shoulder.add(place(limb(cache, 0.082, 0.07, BODY.upperArm), look.suit));
    const elbow = joint(shoulder, 0, -BODY.upperArm, 0);
    elbow.rotation.x = -s.elbow * DEG;
    elbow.add(place(limb(cache, 0.07, 0.06, BODY.forearm), look.suit));
    // The suit bunches at the elbow.
    elbow.add(place(ellipsoid(cache, 0.074, 0.072, 0.074, 10), look.suit));
    const wrist = joint(elbow, 0, -BODY.forearm, 0);
    // The glove: a wrist ring, a mitten (palm toward the body), and a thumb forward.
    wrist.add(place(torus(cache, 0.058, 0.013, 14), look.metal, 0, 0.01, 0));
    wrist.add(place(ellipsoid(cache, 0.05, 0.072, 0.036, 10), look.glove, 0, -0.07, 0.006));
    wrist.add(place(ellipsoid(cache, 0.018, 0.032, 0.02, 8), look.glove, -side * 0.026, -0.05, 0.03));
    if (side < 0) rightArm = { shoulder, elbow, hand: wrist };
  }

  // Legs.
  for (const side of [1, -1] as const) {
    const s = side > 0 ? pose.left : pose.right;
    const hip = joint(figure, side * BODY.hipX, BODY.hipY, 0);
    swing(hip, side, s.hip);
    hip.add(place(limb(cache, 0.112, 0.088, BODY.thigh), look.suit));
    const knee = joint(hip, 0, -BODY.thigh, 0);
    knee.rotation.x = s.knee * DEG;
    knee.add(place(limb(cache, 0.088, 0.074, BODY.shin), look.suit));
    // The suit bunches at the knee, more in front.
    knee.add(place(ellipsoid(cache, 0.092, 0.088, 0.094, 10), look.suit, 0, 0, 0.006));
    const ankle = joint(knee, 0, -BODY.shin, 0);
    ankle.rotation.x = s.ankle * DEG;
    // The boot, toe forward, on a gray sole.
    ankle.add(place(ellipsoid(cache, 0.072, 0.078, 0.13, 12), look.suit, 0, -0.045, 0.04));
    ankle.add(place(ellipsoid(cache, 0.07, 0.024, 0.127, 12), look.metal, 0, -0.103, 0.04));
  }

  // On the suit: Gemini's chest pack and straps, or a pack on the back.
  let tetherPoint: Vector3;
  if (gemini) {
    const front = onTorso(0, 0.31, 1);
    const chestPack = place(roundedBox(cache, 0.21, 0.15, 0.075, 0.022), look.metal, 0.01, 0.31, front.z + 0.03);
    chestPack.rotation.x = 0.12;
    figure.add(chestPack);
    tetherPoint = new Vector3(0.04, 0.245, front.z + 0.05);
    addGeminiStraps(cache, figure, look);
  } else {
    tetherPoint = onTorso(0.07, 0.2, 1, 0.01);
  }
  const pack = options.pack ?? 'none';
  if (pack !== 'none') {
    const large = pack === 'large';
    const [w, h, d, y] = large ? [0.5, 0.84, 0.27, 0.45] : [0.42, 0.5, 0.17, 0.33];
    const back = onTorso(0, 0.36, -1);
    figure.add(place(roundedBox(cache, w, h, d, 0.04, 2), look.suit, 0, y, back.z - d / 2 + 0.02));
  }

  if (options.gasGun && rightArm) {
    // Place the gun in the hand raised to hold it, then let the arm down until the gun is shown (see holdGasGun).
    swing(rightArm.shoulder, -1, GUN_ARM.shoulder);
    rightArm.elbow.rotation.x = -GUN_ARM.elbow * DEG;
    figure.updateMatrixWorld(true);
    const gun = gasGun(cache, look, figure, rightArm.hand);
    gun.userData['arm'] = { shoulder: rightArm.shoulder, elbow: rightArm.elbow, free: pose.right };
    figure.add(gun);
    holdGasGun(gun, false);
  }
  return { figure, tetherPoint };
}

/** The helmet on its neck joint: a white shell, the gold visor across its front, a gray fitting on each side. */
function addHelmet(cache: Map<string, BufferGeometry>, head: Group, look: WalkerLook, gemini: boolean, red: boolean): void {
  const helmet = joint(head, 0, BODY.helmetUp, 0.005);
  helmet.add(place(helmetShell(cache, 1, Math.PI), look.suit));
  // Apollo's visor is larger (AS16-113-18339, AS9-19-2994) than Gemini's (S65-34635).
  const span: VisorSpan = gemini ? { phi: 1.0, top: 0.98, bottom: 2.02 } : { phi: 1.18, top: 0.86, bottom: 2.18 };
  helmet.add(place(visorGeometry(cache, span, 1.022), look.visor), place(visorRim(cache, span), look.metal));
  if (red) helmet.add(place(helmetShell(cache, 1.012, 1.45), look.accent));
  for (const side of [1, -1]) helmet.add(place(ellipsoid(cache, 0.016, 0.03, 0.03, 8), look.metal, side * BODY.helmetR, -0.005, 0.03));
}

/** Gemini's dark straps: one around the waist and one over each shoulder, front to back (S65-34635, S66-54455). */
function addGeminiStraps(cache: Map<string, BufferGeometry>, figure: Group, look: WalkerLook): void {
  const belt: Vector3[] = [];
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    const r = torsoRadius(0.13) + 0.006;
    belt.push(new Vector3(Math.sin(a) * r, 0.13, Math.cos(a) * r * BODY.torsoDepth));
  }
  figure.add(place(strap(cache, 'belt', belt, true), look.strap));
  for (const side of [1, -1]) {
    const x = side * 0.1;
    const points: Vector3[] = [];
    for (const y of [0.13, 0.22, 0.32, 0.42, 0.5, 0.56]) points.push(onTorso(x, y, 1, 0.006));
    points.push(new Vector3(x * 1.05, 0.6, 0));
    for (const y of [0.56, 0.5, 0.42, 0.32, 0.22, 0.13]) points.push(onTorso(x, y, -1, 0.006));
    figure.add(place(strap(cache, `shoulder:${side}`, points), look.strap));
  }
}

/**
 * Show or hide a figure's gas gun (its "gas-gun" node), raising the right
 * arm to hold it or letting it down, and draw the umbilical as it was on
 * the walk with the gun (see TETHER).
 */
export function holdGasGun(gun: Object3D, held: boolean): void {
  gun.visible = held;
  const tether = gun.userData['tether'] as MeshStandardMaterial | undefined;
  if (tether) {
    const wrap = held ? TETHER.gold : TETHER.white;
    tether.color.setHex(wrap.color);
    tether.roughness = wrap.roughness;
    tether.metalness = wrap.metalness;
  }
  const arm = gun.userData['arm'] as { shoulder: Group; elbow: Group; free: Side } | undefined;
  if (!arm) return;
  const pose = held ? GUN_ARM : { shoulder: arm.free.shoulder, elbow: arm.free.elbow };
  swing(arm.shoulder, -1, pose.shoulder);
  arm.elbow.rotation.x = -pose.elbow * DEG;
}

/**
 * The gas gun of S65-34635, in the right glove: a dark grip and frame, two
 * silver bottles on its outer side, a dark box on top, and a thin rod
 * standing up from it with a white end. A "gas-gun" node at the figure's
 * origin, unturned (the ship model shows or hides it whole), held upright
 * in the figure's frame whatever the arm's pose.
 */
function gasGun(cache: Map<string, BufferGeometry>, look: WalkerLook, figure: Group, hand: Group): Group {
  const node = new Group();
  node.name = GAS_GUN;
  node.userData['tether'] = look.tether;
  const holder = new Group();
  // Where the fist is, in the figure's coordinates.
  const inverse = new Matrix4().copy(figure.matrixWorld).invert();
  const fist = new Vector3(0, -0.07, 0.01).applyMatrix4(hand.matrixWorld).applyMatrix4(inverse);
  holder.position.copy(fist);
  // Upright, turned a little toward the figure's front.
  holder.quaternion.copy(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -0.35));
  holder.scale.setScalar(1.35);
  holder.add(
    // The grip, through the fist, and the frame down and up from it.
    place(capsule(cache, 0.016, 0.09), look.strap),
    place(bottle(cache, 0.008, 0.26), look.strap, -0.045, 0.0, 0),
    // The two bottles, side by side outboard of the grip.
    place(capsule(cache, 0.026, 0.17), look.metal, -0.1, -0.02, 0.03),
    place(capsule(cache, 0.026, 0.17), look.metal, -0.1, -0.02, -0.03),
    // The box on top of the frame.
    place(roundedBox(cache, 0.07, 0.06, 0.09, 0.012), look.strap, -0.03, 0.12, 0),
  );
  // The rod, up from the frame, with its white end.
  const rod = place(bottle(cache, 0.005, 0.46), look.metal, -0.055, 0.38, 0);
  rod.rotation.z = 0.05;
  holder.add(rod, place(roundedBox(cache, 0.045, 0.085, 0.03, 0.01), look.suit, -0.067, 0.62, 0));
  node.add(holder);
  return node;
}
