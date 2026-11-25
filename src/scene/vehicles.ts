import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
  BoxGeometry,
  Box3,
  type Material,
  type Object3D,
} from 'three';
import type {
  LeftBehind,
  VehicleChange,
  VehicleLayout,
  VehiclePart,
} from '../content/vehicle-types';
import {
  buildWalker,
  GAS_GUN,
  holdGasGun,
  walkerLook,
  walkerMaterials,
  type SuitEra,
  type WalkerLook,
  type WalkerOptions,
  type WalkerPose,
} from './astronaut';
import { SHIP_SIZE_PX } from './config';

/**
 * Simplified spacecraft models built from plain shapes, and how they are
 * posed each frame: which parts show (from the cited vehicle changes),
 * where the ship is, which way it points, and how big it looks.
 *
 * Every model is built in meters with +Y pointing along the direction of
 * travel. Proportions are approximate and for drawing only. The lunar
 * module is the exception: it stands upright over the Moon (+Y away from
 * the Moon) and faces its direction of travel (+Z).
 *
 * Families of shapes: the Saturn V, the Saturn IB, and the Apollo
 * spacecraft; the Titan II and Gemini spacecraft; the Atlas, the Agena, and
 * the ATDA. Which shape a ship has at each moment comes from its mission's
 * vehicle file; `kindOf` says which part lists make which shape.
 */

/* ------------------------------------------------------------------ */
/* Tuning (presentation choices).                                      */
/* ------------------------------------------------------------------ */

/** Story seconds over which a dropped part falls away, and over which a settle takes place. */
const DROP_STORY_SECONDS = 1.1;
/**
 * Mission seconds over which a dropped part drifts away at most. When the
 * story clock runs many mission minutes a second, the drift is timed by
 * this instead, so a moment just after a separation, paused, shows a clear
 * gap (the drift distance is an illustration). Played on, though, a drop
 * timed this way takes at least DROP_MIN_SECONDS of real time, so a stage
 * let go at a fast pace drifts off rather than vanishing in one frame.
 */
const DROP_MISSION_SECONDS = 80;
const DROP_MIN_SECONDS = 0.5;
/** Story seconds over which a craft turns end for end when its main body's nose changes ends (as after pulling Eagle free). */
const TURN_AROUND_STORY_SECONDS = 2.2;
/**
 * A turn of the path of more than SUDDEN_TURN_DEG (or SUDDEN_TURN_DEG_PER_S)
 * between two frames, where one phase of a climb meets the next, eases over
 * TURN_EASE_SECONDS of real time instead of turning the model in one frame.
 * A steady turn, however quick, is followed exactly.
 */
const SUDDEN_TURN_DEG = 12;
const SUDDEN_TURN_DEG_PER_S = 240;
const TURN_EASE_SECONDS = 0.15;
/** How quickly the apparent size follows a change of shape, in seconds of real time. */
const SIZE_SMOOTHING_SECONDS = 0.3;
/**
 * A parachute opens over this many seconds of real time, growing out from
 * the capsule; a drogue let go when the mains open drifts off and shrinks
 * away over as long. A jump in time shows them as they are at once.
 */
const CHUTE_OPEN_SECONDS = 0.5;
/** How far (meters) a drogue let go drifts off as it goes. */
const CHUTE_RELEASE_DRIFT = 8;
/** Bigger stacks look bigger, but much less than in proportion. */
const SIZE_EXPONENT = 0.35;
/** Reference length (meters) that gets SHIP_SIZE_PX: the command and service module. */
const REFERENCE_LENGTH = 11;
/** How far (meters) the command and service module backs off from the third stage while turning around. */
const TRANSPOSITION_APART = 14;
/** How quickly a spacewalker fades in or out, in seconds of real time (a jump in time shows it at once). */
const WALKER_FADE_SECONDS = 0.45;
/** A spacewalk close-up frames at most this far around its middle, in meters (see ShipModel.walkerFocusOf). */
const WALK_FOCUS_REACH = 4.5;
/** How far the right-hand Gemini hatch swings open while a spacewalker is out, in radians. */
const HATCH_OPEN_RAD = MathUtils.degToRad(100);

/* ------------------------------------------------------------------ */
/* Materials and shapes.                                               */
/* ------------------------------------------------------------------ */

interface Kit {
  white: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  ring: MeshStandardMaterial;
  adapter: MeshStandardMaterial;
  adapterInside: MeshStandardMaterial;
  silver: MeshStandardMaterial;
  serviceModule: MeshStandardMaterial;
  heatShield: MeshStandardMaterial;
  gold: MeshStandardMaterial;
  lunarGray: MeshStandardMaterial;
  tower: MeshStandardMaterial;
  geminiBlack: MeshStandardMaterial;
  geminiWhite: MeshStandardMaterial;
  heatShieldDark: MeshStandardMaterial;
  window: MeshStandardMaterial;
  hatch: MeshStandardMaterial;
  hatchRim: MeshStandardMaterial;
  titan: MeshStandardMaterial;
  atlas: MeshStandardMaterial;
  agena: MeshStandardMaterial;
  agenaDark: MeshStandardMaterial;
  cone: MeshStandardMaterial;
  shroudInside: MeshStandardMaterial;
  canopy: MeshStandardMaterial;
  dish: MeshStandardMaterial;
  fender: MeshStandardMaterial;
  lines: LineBasicMaterial;
  geometries: Map<string, BufferGeometry>;
}

/** A set of materials (each ship has its own, so one can fade out without the others), sharing shapes by key. */
function makeKit(geometries: Map<string, BufferGeometry>): Kit {
  const standard = (
    color: number,
    roughness = 0.55,
    metalness = 0.1,
    flat = false,
  ): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, roughness, metalness, flatShading: flat });
  const inside = (color: number): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, side: BackSide });
  return {
    white: standard(0xeceef1, 0.6),
    dark: standard(0x24272d, 0.7),
    ring: standard(0x8e959e, 0.6),
    adapter: standard(0xdcdfe3, 0.5),
    // The adapter panels' inner faces, tan in NASA photo AS07-03-1535.
    adapterInside: inside(0x9a8664),
    silver: standard(0xd6dbe2, 0.35, 0.35),
    serviceModule: standard(0xb9bfc8, 0.45, 0.25),
    heatShield: standard(0x6f5a45, 0.8),
    gold: standard(0xd7a531, 0.4, 0.35, true),
    lunarGray: standard(0xb3b9c2, 0.5, 0.15, true),
    tower: standard(0xb0533c, 0.6),
    geminiBlack: standard(0x2c2f35, 0.55, 0.2),
    geminiWhite: standard(0xe7e8ea, 0.55),
    heatShieldDark: standard(0x4a3e33, 0.85),
    window: standard(0xb4cde2, 0.25, 0.35),
    hatch: standard(0x6e747d, 0.5, 0.3),
    hatchRim: standard(0xc9ced5, 0.5, 0.2),
    titan: standard(0xe1e4e8, 0.55),
    atlas: standard(0xc3c8cf, 0.35, 0.45),
    agena: standard(0xd3d7dc, 0.45, 0.25),
    agenaDark: standard(0x5a6068, 0.6),
    cone: new MeshStandardMaterial({
      color: 0xb9c0c8,
      roughness: 0.5,
      metalness: 0.2,
      side: DoubleSide,
    }),
    shroudInside: inside(0x4a4f57),
    canopy: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }),
    dish: new MeshStandardMaterial({
      color: 0xd9dde2,
      roughness: 0.45,
      metalness: 0.3,
      side: DoubleSide,
    }),
    fender: standard(0xa9875c, 0.6),
    lines: new LineBasicMaterial({ color: 0xd9d9d4, transparent: true, opacity: 0.7 }),
    geometries,
  };
}

/** Every material of a kit. */
function kitMaterials(kit: Kit): Array<MeshStandardMaterial | LineBasicMaterial> {
  const out: Array<MeshStandardMaterial | LineBasicMaterial> = [];
  for (const value of Object.values(kit)) {
    if (value instanceof MeshStandardMaterial || value instanceof LineBasicMaterial)
      out.push(value);
  }
  return out;
}

/** A cylinder or cone frustum along Y from y0 to y1 (without end caps when `open`), shared by key. */
function cylinder(
  kit: Kit,
  rBottom: number,
  rTop: number,
  y0: number,
  y1: number,
  segments = 28,
  open = false,
): BufferGeometry {
  const key = `cyl:${rBottom}:${rTop}:${y0}:${y1}:${segments}:${open}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    geometry = new CylinderGeometry(rTop, rBottom, y1 - y0, segments, 1, open);
    geometry.translate(0, (y0 + y1) / 2, 0);
    kit.geometries.set(key, geometry);
  }
  return geometry;
}

/**
 * A piece of a cone frustum's side along Y from y0 to y1 (no ends), covering
 * `span` radians around the axis from angle `from` (measured from +Z
 * toward +X), shared by key. For panels that lie on a curved hull.
 */
function conePatch(
  kit: Kit,
  rBottom: number,
  rTop: number,
  y0: number,
  y1: number,
  from: number,
  span: number,
  segments = 12,
): BufferGeometry {
  const key = `patch:${rBottom}:${rTop}:${y0}:${y1}:${from}:${span}:${segments}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    geometry = new CylinderGeometry(rTop, rBottom, y1 - y0, segments, 1, true, from, span);
    geometry.translate(0, (y0 + y1) / 2, 0);
    kit.geometries.set(key, geometry);
  }
  return geometry;
}

/** A flat disk facing +Y at height y, shared by key. */
function disk(kit: Kit, radius: number, y: number, segments = 28): BufferGeometry {
  const key = `disk:${radius}:${y}:${segments}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    geometry = new CircleGeometry(radius, segments);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, y, 0);
    kit.geometries.set(key, geometry);
  }
  return geometry;
}

function box(kit: Kit, w: number, h: number, d: number): BufferGeometry {
  const key = `box:${w}:${h}:${d}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    geometry = new BoxGeometry(w, h, d);
    kit.geometries.set(key, geometry);
  }
  return geometry;
}

function sphere(kit: Kit, radius: number, segments = 16): BufferGeometry {
  const key = `sphere:${radius}:${segments}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    geometry = new SphereGeometry(radius, segments, Math.max(6, segments / 2));
    kit.geometries.set(key, geometry);
  }
  return geometry;
}

/** A parachute canopy: a dome with alternating orange and white gores, open side down (-Y). */
function canopyGeometry(kit: Kit, radius: number): BufferGeometry {
  const key = `canopy:${radius}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    const dome = new SphereGeometry(
      radius,
      24,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.42,
    ).toNonIndexed();
    dome.scale(1, 0.75, 1);
    const position = dome.getAttribute('position');
    const colors: number[] = [];
    const orange = new Color(0xe8743b);
    const white = new Color(0xf2f1ec);
    for (let i = 0; i < position.count; i += 3) {
      const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
      const z = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
      const gore = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 12);
      const color = gore % 2 === 0 ? orange : white;
      for (let k = 0; k < 3; k += 1) colors.push(color.r, color.g, color.b);
    }
    dome.setAttribute('color', new Float32BufferAttribute(colors, 3));
    dome.computeVertexNormals();
    geometry = dome;
    kit.geometries.set(key, geometry);
  }
  return geometry;
}

function mesh(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/** A thin rod from one point to another (for struts, masts, and antennas). */
function rod(kit: Kit, from: Vector3, to: Vector3, radius: number, material: Material): Mesh {
  const length = from.distanceTo(to);
  const m = mesh(cylinder(kit, radius, radius, -length / 2, length / 2, 6), material);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return m;
}

/*
 * Nodes that are not vehicle parts but are shown, hidden, or moved with
 * them. Their names never match a VehiclePart.
 */
/** The Agena's boom antenna (part of the "agena" part, hidden under the nose shroud). */
const AGENA_BOOM = 'agena-boom';
/** The top of the Atlas that held an Agena, and the one that held the ATDA (photo S66-32139). */
const ATLAS_AGENA_ADAPTER = 'atlas-agena-adapter';
const ATLAS_ATDA_ADAPTER = 'atlas-atda-adapter';
/** The Gemini's right-hand hatch, which swings open while a spacewalker is out (or the hatch is listed open). */
const GEMINI_RIGHT_HATCH = 'gemini-right-hatch';
/** The Apollo command module's side hatch, drawn standing open at those times. */
const APOLLO_HATCH = 'apollo-open-hatch';

/** Groups that hold other parts and are always shown when their parts are. */
const WRAPPERS: ReadonlySet<string> = new Set(['csm', 'lm', 'gemini-spacecraft']);
/** Nodes handled one by one (see ShipModel.showSpecials). */
const SPECIALS: ReadonlySet<string> = new Set([
  AGENA_BOOM,
  ATLAS_AGENA_ADAPTER,
  ATLAS_ATDA_ADAPTER,
  GEMINI_RIGHT_HATCH,
  APOLLO_HATCH,
  'spacewalker',
  'standup-spacewalker',
  GAS_GUN,
]);

/** A named part: a group whose rest position is remembered for animation. */
function part(
  name: VehiclePart | 'csm' | 'lm' | 'gemini-spacecraft',
  ...children: Object3D[]
): Group {
  const group = new Group();
  group.name = name;
  if (children.length > 0) group.add(...children);
  return group;
}

/** A named node that is not a vehicle part (see SPECIALS). */
function special(name: string, ...children: Object3D[]): Group {
  const group = new Group();
  group.name = name;
  if (children.length > 0) group.add(...children);
  return group;
}

/** Parts that hang off the model and do not count toward its length (the size it is drawn at). */
const NOT_BODY: ReadonlySet<VehiclePart> = new Set<VehiclePart>([
  'open-hatch',
  'drogue-parachutes',
  'main-parachutes',
  'gemini-drogue-parachute',
  'gemini-main-parachute',
  'spacewalker',
  'standup-spacewalker',
  'gas-gun',
]);
/** Of those, parts that also do not count toward how far the model may reach on screen. */
const NOT_SIZED: ReadonlySet<VehiclePart> = new Set<VehiclePart>([
  'spacewalker',
  'standup-spacewalker',
  'gas-gun',
]);
/** The lunar module's parts, which ride hidden inside the adapter at launch. */
const LUNAR_MODULE_PARTS: ReadonlySet<VehiclePart> = new Set<VehiclePart>([
  'lm-descent-stage',
  'lm-ascent-stage',
]);

/* ---------------- Saturn V and Saturn IB, in stack coordinates (y from the Saturn V's engine exits) ---------------- */

const STACK = {
  firstStageTop: 42,
  interstageTop: 46,
  secondStageTop: 73,
  thirdStageBottom: 73,
  unitTop: 91.5,
  adapterTop: 100,
  /** Where the lunar module's footpads sit once the adapter is gone. */
  lmBase: 91.5,
  /** The command and service module's origin (service module aft face) at launch. */
  csmBase: 100,
  /**
   * Where the Saturn IB's first stage starts: 24.5 m below the S-IVB, from
   * the "6.5 x 24 m" S-IB of NASA MSFC drawing 0100801 ("Saturn IB Launch
   * Vehicle", 1968) with a little of the interstage.
   */
  saturnIBBase: 48.5,
};

function firstStage(kit: Kit): Group {
  const r = 5.05;
  const children: Object3D[] = [
    mesh(cylinder(kit, r, r, 3.4, STACK.firstStageTop), kit.white),
    mesh(cylinder(kit, r + 0.03, r + 0.03, 3.4, 9.5), kit.dark),
    mesh(cylinder(kit, r + 0.03, r + 0.03, 24, 26.5), kit.dark),
    mesh(cylinder(kit, 1.05, 0.55, 0, 3.4, 16), kit.dark),
  ];
  for (let k = 0; k < 4; k += 1) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    children.push(
      mesh(
        cylinder(kit, 1.05, 0.55, 0, 3.4, 16),
        kit.dark,
        Math.cos(a) * 3.1,
        0,
        Math.sin(a) * 3.1,
      ),
    );
    const fin = mesh(
      box(kit, 0.35, 5.5, 2.6),
      kit.white,
      Math.cos(a) * (r + 1.1),
      6.4,
      Math.sin(a) * (r + 1.1),
    );
    fin.rotation.y = -a;
    children.push(fin);
  }
  return part('first-stage', ...children);
}

function aftInterstage(kit: Kit): Group {
  return part(
    'aft-interstage',
    mesh(cylinder(kit, 5.05, 5.05, STACK.firstStageTop, STACK.interstageTop), kit.ring),
  );
}

function secondStage(kit: Kit): Group {
  return part(
    'second-stage',
    mesh(cylinder(kit, 5.05, 5.05, STACK.interstageTop, 68.5), kit.white),
    mesh(cylinder(kit, 5.08, 5.08, 66, 68.5), kit.dark),
    mesh(cylinder(kit, 5.05, 3.3, 68.5, STACK.secondStageTop), kit.white),
  );
}

function thirdStage(kit: Kit): Group {
  return part(
    'third-stage',
    mesh(cylinder(kit, 1.0, 0.45, 71.2, STACK.thirdStageBottom, 16), kit.dark),
    mesh(cylinder(kit, 3.3, 3.3, STACK.thirdStageBottom, 90.5), kit.white),
    // The dark aft skirt, its end a hair below the stage so the aft end is dark rather than flickering between the two.
    mesh(cylinder(kit, 3.33, 3.33, STACK.thirdStageBottom - 0.02, 76), kit.dark),
    mesh(cylinder(kit, 3.3, 3.3, 90.5, STACK.unitTop), kit.ring),
  );
}

/**
 * The Saturn IB's first stage, S-IB, below the S-IVB. Its look follows the
 * Apollo 7 launch photo S68-48788: eight white tanks around a ninth, which
 * show dark between them, a white band at the top, the interstage with
 * dark panels under the S-IVB, and fins at the tail. Sizes follow NASA MSFC
 * drawing 0100801 ("6.5 x 24 m"; eight H-1 engines); the tanks' sizes and
 * the fins' shape are approximate.
 */
function saturnIBFirstStage(kit: Kit): Group {
  const base = STACK.saturnIBBase;
  const top = STACK.thirdStageBottom;
  const tanksTop = top - 5.2;
  const children: Object3D[] = [
    // The center tank, seen only between the outer ones.
    mesh(cylinder(kit, 1.4, 1.4, base + 2.2, tanksTop, 20), kit.dark),
    // The tail: the engine compartment, with eight engine bells under it.
    mesh(cylinder(kit, 3.0, 3.0, base + 0.8, base + 2.6, 28), kit.dark),
    // The upper band (around the spider beam) and the interstage under the S-IVB.
    mesh(cylinder(kit, 3.27, 3.27, tanksTop, top - 3.0, 28), kit.white),
    mesh(cylinder(kit, 3.3, 3.3, top - 3.0, top, 28), kit.white),
  ];
  for (let k = 0; k < 8; k += 1) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    const x = Math.sin(a);
    const z = Math.cos(a);
    // The eight outer tanks, with rounded tops.
    children.push(
      mesh(
        cylinder(kit, 0.9, 0.9, base + 2.6, tanksTop - 0.5, 16),
        kit.white,
        x * 2.36,
        0,
        z * 2.36,
      ),
      mesh(
        cylinder(kit, 0.9, 0.55, tanksTop - 0.5, tanksTop, 16),
        kit.white,
        x * 2.36,
        0,
        z * 2.36,
      ),
    );
    // Engine bells: four inboard, four outboard.
    const r = k % 2 === 0 ? 0.9 : 2.2;
    children.push(mesh(cylinder(kit, 0.5, 0.28, base, base + 0.9, 12), kit.dark, x * r, 0, z * r));
    // Fins between the tanks at the tail.
    const b = (k * Math.PI) / 4;
    const fin = mesh(
      box(kit, 0.25, 3.4, 1.6),
      kit.white,
      Math.sin(b) * 3.75,
      base + 2.1,
      Math.cos(b) * 3.75,
    );
    fin.rotation.y = b;
    children.push(fin);
    // Dark panels on the interstage (photo S68-48788).
    if (k % 2 === 0) {
      const panel = mesh(
        box(kit, 1.0, 2.2, 0.06),
        kit.dark,
        Math.sin(b) * 3.31,
        top - 1.4,
        Math.cos(b) * 3.31,
      );
      panel.rotation.y = b;
      children.push(panel);
    }
  }
  return part('saturn-ib-first-stage', ...children);
}

function adapter(kit: Kit): Group {
  return part(
    'adapter',
    mesh(cylinder(kit, 3.3, 1.95, STACK.unitTop, STACK.adapterTop), kit.adapter),
  );
}

/** How far the adapter's four panels stand open on the spent stage, from closed, in radians. */
const PETAL_OPEN_RAD = MathUtils.degToRad(50);

/**
 * The adapter on a spent S-IVB, its four panels opened like petals, as NASA
 * photos AS07-03-1545 and AS07-03-1535 show Apollo 7's stage (taken from the
 * spacecraft during the practice docking): the panels' tan inner faces, and
 * the white disk with a cross, a practice docking target, held on struts in
 * the middle. How far the panels stand open is read off those photos,
 * roughly.
 */
function openAdapter(kit: Kit): Group {
  const base = STACK.unitTop;
  const height = STACK.adapterTop - STACK.unitTop;
  const children: Object3D[] = [];
  for (let k = 0; k < 4; k += 1) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const hinge = new Group();
    hinge.position.set(Math.sin(a) * 3.3, base, Math.cos(a) * 3.3);
    const inner = new Group();
    inner.position.set(-Math.sin(a) * 3.3, 0, -Math.cos(a) * 3.3);
    const from = a - Math.PI / 4 + 0.02;
    const span = Math.PI / 2 - 0.04;
    inner.add(
      mesh(conePatch(kit, 3.3, 1.95, 0, height, from, span), kit.adapter),
      mesh(conePatch(kit, 3.3, 1.95, 0, height, from, span), kit.adapterInside),
    );
    hinge.add(inner);
    // Open outward about the panel's lower edge (a tangent to the stage).
    hinge.quaternion.setFromAxisAngle(new Vector3(Math.cos(a), 0, -Math.sin(a)), PETAL_OPEN_RAD);
    children.push(hinge);
  }
  // The practice docking target: a white disk with a dark cross, on four struts.
  const targetY = base + 2.6;
  children.push(mesh(disk(kit, 0.7, targetY), kit.white));
  children.push(
    mesh(box(kit, 1.2, 0.02, 0.1), kit.dark, 0, targetY + 0.01, 0),
    mesh(box(kit, 0.1, 0.02, 1.2), kit.dark, 0, targetY + 0.01, 0),
  );
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2;
    children.push(
      rod(
        kit,
        new Vector3(Math.sin(a) * 3.0, base, Math.cos(a) * 3.0),
        new Vector3(Math.sin(a) * 0.5, targetY, Math.cos(a) * 0.5),
        0.07,
        kit.ring,
      ),
    );
  }
  return part('adapter', ...children);
}

/* ---------------- Command and service module, origin at the service module's aft face ---------------- */

const CSM = {
  bellExit: -3.0,
  smTop: 4.6,
  cmTop: 7.8,
  tunnelTop: 8.2,
  /** Middle of the whole command and service module, engine bell included. */
  center: 2.6,
};

function serviceModule(kit: Kit): Group {
  const children: Object3D[] = [
    mesh(cylinder(kit, 1.95, 1.95, 0, CSM.smTop), kit.serviceModule),
    mesh(cylinder(kit, 1.97, 1.97, 3.6, 4.1), kit.dark),
    mesh(cylinder(kit, 1.25, 0.45, CSM.bellExit, 0, 20), kit.dark),
  ];
  // Four thruster quads near the front.
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2;
    children.push(
      mesh(box(kit, 0.45, 0.7, 0.45), kit.ring, Math.cos(a) * 2.05, 3.3, Math.sin(a) * 2.05),
    );
  }
  return part('service-module', ...children);
}

/**
 * Apollo 13's service module after the oxygen tank burst: one whole side
 * panel blown away from end to end, the inside dark with tanks and torn
 * pieces showing, as NASA photos AS13-58-8458 and 7010516 (MSFC) show it
 * after the crew cast it off. The gap is on the +X side, about a sixth of
 * the way around; the pieces inside are an illustration.
 */
function serviceModuleDamaged(kit: Kit): Group {
  const gapFrom = Math.PI / 2 - 0.6;
  const gap = 1.2;
  const rest = Math.PI * 2 - gap;
  const children: Object3D[] = [
    mesh(conePatch(kit, 1.95, 1.95, 0, CSM.smTop, gapFrom + gap, rest, 28), kit.serviceModule),
    mesh(conePatch(kit, 1.97, 1.97, 3.6, 4.1, gapFrom + gap, rest, 28), kit.dark),
    mesh(cylinder(kit, 1.94, 1.94, CSM.smTop - 0.06, CSM.smTop), kit.serviceModule),
    mesh(cylinder(kit, 1.94, 1.94, 0, 0.06), kit.dark),
    // The inside: a dark core, two round tanks, and a bent strip of skin at each edge of the gap.
    mesh(cylinder(kit, 1.55, 1.55, 0.05, CSM.smTop - 0.05, 20), kit.dark),
    mesh(sphere(kit, 0.5), kit.ring, 1.35, 1.4, 0),
    mesh(sphere(kit, 0.42), kit.ring, 1.4, 3.1, 0.25),
    mesh(cylinder(kit, 1.25, 0.45, CSM.bellExit, 0, 20), kit.dark),
  ];
  for (const [angle, lean] of [
    [gapFrom + 0.05, -0.5],
    [gapFrom + gap - 0.05, 0.6],
  ] as const) {
    const strip = mesh(
      box(kit, 0.04, 2.2, 0.5),
      kit.serviceModule,
      Math.sin(angle) * 2.05,
      2.9,
      Math.cos(angle) * 2.05,
    );
    strip.rotation.set(0, angle, lean);
    children.push(strip);
  }
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2;
    children.push(
      mesh(box(kit, 0.45, 0.7, 0.45), kit.ring, Math.cos(a) * 2.05, 3.3, Math.sin(a) * 2.05),
    );
  }
  return part('service-module-damaged', ...children);
}

function commandModule(kit: Kit): Group {
  return part(
    'command-module',
    mesh(cylinder(kit, 1.95, 1.95, CSM.smTop, CSM.smTop + 0.25), kit.heatShield),
    mesh(cylinder(kit, 1.95, 0.42, CSM.smTop + 0.25, CSM.cmTop), kit.silver),
    mesh(cylinder(kit, 0.42, 0.36, CSM.cmTop, CSM.tunnelTop, 16), kit.silver),
  );
}

function escapeTower(kit: Kit): Group {
  return part(
    'escape-tower',
    mesh(cylinder(kit, 0.95, 0.38, CSM.tunnelTop, 11.5, 4), kit.tower),
    mesh(cylinder(kit, 0.42, 0.42, 11.5, 16.5, 16), kit.white),
    mesh(cylinder(kit, 0.42, 0.06, 16.5, 18.2, 16), kit.dark),
  );
}

/* ---------------- Lunar module, footpads at y = 0, front toward +Z ---------------- */

const LM = {
  descentBottom: 1.5,
  descentTop: 3.2,
  ascentTop: 5.2,
  tunnelTop: 5.7,
};

function lmDescentStage(kit: Kit): Group {
  const children: Object3D[] = [
    mesh(cylinder(kit, 2.1, 2.1, LM.descentBottom, LM.descentTop, 8), kit.gold),
    mesh(cylinder(kit, 0.85, 0.4, 0.9, LM.descentBottom, 12), kit.dark),
  ];
  const up = new Vector3(0, 1, 0);
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2;
    const cx = Math.sin(a);
    const cz = Math.cos(a);
    const from = new Vector3(cx * 2.0, 2.9, cz * 2.0);
    const to = new Vector3(cx * 3.7, 0.25, cz * 3.7);
    const length = from.distanceTo(to);
    const strut = mesh(cylinder(kit, 0.1, 0.1, -length / 2, length / 2, 6), kit.ring);
    strut.position.copy(from).add(to).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(up, to.clone().sub(from).normalize());
    children.push(
      strut,
      mesh(cylinder(kit, 0.5, 0.5, 0, 0.14, 12), kit.ring, cx * 3.7, 0, cz * 3.7),
    );
  }
  return part('lm-descent-stage', ...children);
}

function lmAscentStage(kit: Kit): Group {
  return part(
    'lm-ascent-stage',
    mesh(cylinder(kit, 1.4, 1.25, LM.descentTop, LM.ascentTop, 8), kit.lunarGray),
    mesh(box(kit, 1.9, 1.5, 0.8), kit.lunarGray, 0, 4.2, 1.15),
    mesh(box(kit, 0.9, 0.55, 0.1), kit.dark, 0, 4.55, 1.56),
    mesh(cylinder(kit, 0.45, 0.45, LM.ascentTop, LM.tunnelTop, 12), kit.lunarGray),
    mesh(box(kit, 0.4, 0.4, 0.4), kit.ring, 1.55, 4.6, 0),
    mesh(box(kit, 0.4, 0.4, 0.4), kit.ring, -1.55, 4.6, 0),
  );
}

/* ---------------- Lunar Roving Vehicle, wheels on the ground at y = 0, front toward +Z ---------------- */

/**
 * The Lunar Roving Vehicle, after NASA photos AS15-88-11901 (the rover
 * parked by itself at Hadley) and AS15-86-11603: four large wire-mesh
 * wheels under bronze fenders, a low silver chassis with two seats, a
 * pallet at the back, and at the front the umbrella-like high-gain antenna
 * on its mast, a thin low-gain antenna, and the electronics box. About
 * 3.1 m long and 2.3 m between axles; all sizes approximate.
 */
function lunarRover(kit: Kit): Group {
  const children: Object3D[] = [
    mesh(box(kit, 1.3, 0.22, 2.9), kit.silver, 0, 0.56, 0),
    // Seats and their backs.
    mesh(box(kit, 0.5, 0.1, 0.5), kit.ring, -0.33, 0.73, -0.15),
    mesh(box(kit, 0.5, 0.1, 0.5), kit.ring, 0.33, 0.73, -0.15),
    mesh(box(kit, 0.5, 0.5, 0.08), kit.ring, -0.33, 0.95, -0.43),
    mesh(box(kit, 0.5, 0.5, 0.08), kit.ring, 0.33, 0.95, -0.43),
    // The rear pallet, and the console and electronics box at the front.
    mesh(box(kit, 1.1, 0.45, 0.45), kit.agenaDark, 0, 0.9, -1.25),
    mesh(box(kit, 0.35, 0.3, 0.2), kit.ring, 0, 0.95, 0.35),
    mesh(box(kit, 0.45, 0.35, 0.35), kit.gold, 0, 0.85, 1.3),
    // The low-gain antenna, a thin rod at the front right.
    rod(kit, new Vector3(0.45, 0.68, 1.2), new Vector3(0.45, 1.95, 1.2), 0.025, kit.ring),
    // The high-gain antenna: a mast at the front left with a shallow dish.
    rod(kit, new Vector3(-0.45, 0.68, 1.25), new Vector3(-0.45, 1.75, 1.25), 0.035, kit.ring),
  ];
  const dish = mesh(cylinder(kit, 0.06, 0.52, 0, 0.16, 16, true), kit.dish, -0.45, 1.72, 1.25);
  dish.rotation.x = -0.5;
  children.push(dish);
  for (const x of [-0.92, 0.92]) {
    for (const z of [-1.15, 1.15]) {
      const wheel = mesh(cylinder(kit, 0.41, 0.41, -0.115, 0.115, 18), kit.hatchRim, x, 0.41, z);
      wheel.rotation.z = Math.PI / 2;
      const hub = mesh(cylinder(kit, 0.16, 0.16, -0.12, 0.12, 12), kit.agenaDark, x, 0.41, z);
      hub.rotation.z = Math.PI / 2;
      children.push(wheel, hub, mesh(box(kit, 0.3, 0.04, 0.95), kit.fender, x, 0.86, z));
    }
  }
  return part('lunar-rover', ...children);
}

/* ---------------- Parachutes, above a command module whose base is at y = 0 ---------------- */

/** A cluster of canopies above the apex (+Y), with their shroud lines. */
function parachutes(kit: Kit, name: 'drogue-parachutes' | 'main-parachutes'): Group {
  const main = name === 'main-parachutes';
  const count = main ? 3 : 2;
  // Much closer and smaller than the real ones, so the capsule stays the subject.
  const radius = main ? 2.3 : 0.95;
  const height = main ? 8.6 : 6.6;
  const spread = main ? 2.2 : 0.95;
  const apex = new Vector3(0, CSM.cmTop - CSM.smTop + 0.3, 0);
  const children: Object3D[] = [];
  const linePoints: number[] = [];
  for (let k = 0; k < count; k += 1) {
    const a = (k * Math.PI * 2) / count + (main ? Math.PI / 2 : 0);
    const center = new Vector3(Math.cos(a) * spread, height, Math.sin(a) * spread);
    const canopy = mesh(canopyGeometry(kit, radius), kit.canopy, center.x, center.y, center.z);
    // Lean each canopy away from the axis.
    canopy.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    children.push(canopy);
    for (let j = 0; j < 6; j += 1) {
      const b = (j * Math.PI * 2) / 6;
      const rim = new Vector3(
        Math.cos(b) * radius * 0.97,
        radius * 0.75 * Math.cos(Math.PI * 0.42),
        Math.sin(b) * radius * 0.97,
      );
      rim.applyEuler(canopy.rotation).add(center);
      linePoints.push(apex.x, apex.y, apex.z, rim.x, rim.y, rim.z);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(linePoints, 3));
  children.push(new LineSegments(geometry, kit.lines));
  const group = part(name, ...children);
  group.userData['apex'] = apex.y;
  return group;
}

/* ---------------- A spacewalker, on a tether from a hatch ---------------- */

/** The open Apollo side hatch's own materials (it fades in as the hatch opens). */
interface HatchLook {
  opening: MeshStandardMaterial;
  door: MeshStandardMaterial;
}

/**
 * How far around the craft a spacewalker is from the side the ship view
 * turns toward the camera, in radians (see ShipModel.walkerSide). Turning
 * the figure's own side to the camera would draw it in front of the hull,
 * as if it sat on the craft; turning a side a sixth of a turn farther on
 * draws it above the craft on screen, clear of the hull and against the sky,
 * with the open hatch still in view. A figure standing in a hatch then
 * rises from the craft's upper edge rather than being seen from over its head.
 */
const WALKER_VIEW_LIFT = Math.PI / 3;

/** Where and how a floating spacewalker is drawn, in model coordinates. */
interface WalkerPlace {
  /** The figure's middle (between its hip joints). */
  at: Vector3;
  /** Its turn from facing +Z with its head toward +Y. */
  turn: Quaternion;
  /** The tether's start: a point in the open hatchway, and the way it leaves it (the hull's outward direction there, unless it must clear the figure). */
  hatch: Vector3;
  outward: Vector3;
}

/**
 * How a floating figure at `at` is turned so the ship view draws it upright
 * and facing the viewer. The ship view draws travel (+Y) to the right and
 * rolls the craft so a side WALKER_VIEW_LIFT on from its spacewalker's
 * faces the camera (see ShipModel.walkerSide), so a figure whose front
 * faces out from the craft's axis on that side, and whose head points
 * across travel a quarter turn around the craft from it, stands upright,
 * above the craft on screen. `tilt` then turns it on the screen
 * (radians, its head toward its left), `quarter` about its height
 * (radians, toward its left), and `lean` tips its head back. A craft
 * flying blunt end first is built turned end for end (see endFor), which
 * would draw the figure upside down: `flipped` stands it the other way up.
 */
function walkerTurn(
  at: Vector3,
  tilt: number,
  quarter: number,
  lean: number,
  flipped = false,
): Quaternion {
  // The side turned to the camera is WALKER_VIEW_LIFT on from the figure's own (the other way in a craft built end for end).
  const side = Math.atan2(at.x, at.z) + (flipped ? -1 : 1) * WALKER_VIEW_LIFT;
  const head = new Vector3(-Math.cos(side), 0, Math.sin(side));
  const front = new Vector3(Math.sin(side), 0, Math.cos(side));
  const across = new Vector3().crossVectors(head, front);
  const turn = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across, head, front));
  turn.multiply(
    new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), tilt + (flipped ? Math.PI : 0)),
  );
  turn.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), quarter));
  return turn.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -lean));
}

/**
 * A spacewalker (see astronaut.ts) at `place.at` on a tether from the
 * hatch. The gap is an illustration: far less than a real tether's length,
 * so the figure stays near the craft on screen. The tether leaves the
 * hatchway straight out from the hull, hangs in a loose curve to beside the
 * figure's hips on the hatch's side, and comes up to the front of the suit
 * from in front of it and below (on Gemini, the chest pack), so it never
 * passes through the body.
 */
function spacewalker(
  kit: Kit,
  place: WalkerPlace,
  options: Omit<WalkerOptions, 'pose'> & { pose?: WalkerPose },
): Group {
  const look = walkerLook(options.era);
  const { figure, tetherPoint } = buildWalker(kit.geometries, look, {
    pose: 'floating',
    ...options,
  });
  figure.position.copy(place.at);
  figure.quaternion.copy(place.turn);
  figure.updateMatrix();
  // Points along the way, in the figure's own coordinates (see buildWalker), then in the model's.
  const inFigure = (x: number, y: number, z: number): Vector3 =>
    new Vector3(x, y, z).applyMatrix4(figure.matrix);
  const side = place.hatch.clone().applyMatrix4(figure.matrix.clone().invert()).x < 0 ? -1 : 1;
  const out = place.outward.clone().normalize();
  const start = place.hatch.clone().addScaledVector(out, -0.08);
  const rise = place.hatch.clone().addScaledVector(out, 0.35);
  const beside = inFigure(side * 0.5, tetherPoint.y - 0.32, tetherPoint.z + 0.04);
  const middle = rise.clone().add(beside).multiplyScalar(0.5).addScaledVector(out, 0.15);
  const near = inFigure(tetherPoint.x + side * 0.08, tetherPoint.y - 0.17, tetherPoint.z + 0.15);
  const end = inFigure(tetherPoint.x, tetherPoint.y, tetherPoint.z);
  const key = `tether:${[start, beside, end]
    .map((p) =>
      p
        .toArray()
        .map((v) => v.toFixed(3))
        .join(','),
    )
    .join(':')}`;
  let tube = kit.geometries.get(key);
  if (!tube) {
    // Thicker than the real one (a few centimeters), so it reads when the ship view draws the craft close up.
    tube = new TubeGeometry(
      new CatmullRomCurve3([start, rise, middle, beside, near, end], false, 'centripetal'),
      56,
      0.022,
      6,
      false,
    );
    kit.geometries.set(key, tube);
  }
  const group = part('spacewalker', figure, mesh(tube, look.tether));
  group.userData['look'] = look;
  // A floating figure is drawn above the craft (the porch figure stands on it, facing the camera).
  if ((options.pose ?? 'floating') === 'floating') group.userData['viewLift'] = WALKER_VIEW_LIFT;
  return group;
}

/**
 * An astronaut standing up in an open hatch, head and shoulders out, no
 * tether: `at` is a point on the hatch's surface, `outward` the hull's
 * outward direction there, `facing` roughly where the figure looks. The
 * figure is placed with its hips just below the surface, so the hull hides
 * its legs, and its forearms forward over the hatch's rim. As on Gemini's
 * "standup" spacewalks (NASA photo S66-63007 was taken by Gemini 12's pilot
 * standing in the open hatch, looking along the spacecraft), and Apollo's
 * crewmate standing in the side hatch (seen from behind in S72-37001). No
 * photo shows the figure from outside: its place and pose are approximate.
 */
function standupWalker(
  kit: Kit,
  era: SuitEra,
  at: Vector3,
  outward: Vector3,
  facing: Vector3,
): Group {
  const look = walkerLook(era);
  const { figure } = buildWalker(kit.geometries, look, { era, pose: 'standing' });
  const up = outward.clone().normalize();
  const front = facing.clone().addScaledVector(up, -facing.dot(up)).normalize();
  const side = new Vector3().crossVectors(up, front);
  figure.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(side, up, front));
  // The figure's middle is between its hip joints: just below the surface, so the waist clears the hull.
  figure.position.copy(at).addScaledVector(up, -0.06);
  const group = part('standup-spacewalker', figure);
  group.userData['look'] = look;
  group.userData['viewLift'] = WALKER_VIEW_LIFT;
  return group;
}

/** A Gemini pilot standing in the open right-hand hatch (Gemini coordinates). */
function geminiStandup(kit: Kit): Group {
  const y = (HATCH.y0 + HATCH.y1) / 2;
  const a = HATCH.offset;
  const at = new Vector3(Math.sin(a) * cabinRadius(y), y, Math.cos(a) * cabinRadius(y));
  return standupWalker(kit, 'gemini', at, geminiHatchOutward(), new Vector3(0, 1, 0));
}

/* ---------------- Gemini, origin at the adapter's aft face, nose toward +Y ---------------- */

const GEMINI = {
  equipmentTop: 1.55,
  retroTop: 2.3,
  shieldTop: 2.45,
  cabinTop: 4.2,
  rcsTop: 5.0,
  noseTop: 5.75,
};

/** The equipment section's radius at height y (it tapers from 1.52 m to 1.33 m). */
function equipmentRadius(y: number): number {
  return 1.52 - (y / GEMINI.equipmentTop) * (1.52 - 1.33);
}

/** A small shape standing on the equipment section's side at height y, `angle` radians from the hatch side (+Z). */
function onEquipmentSection(object: Mesh, y: number, angle: number, out: number): Mesh {
  const r = equipmentRadius(y) + out;
  object.position.set(Math.sin(angle) * r, y, Math.cos(angle) * r);
  object.rotation.y = angle;
  return object;
}

function geminiEquipmentSection(kit: Kit): Group {
  return part(
    'gemini-equipment-section',
    mesh(cylinder(kit, 1.52, 1.33, 0, GEMINI.equipmentTop, 28), kit.geminiWhite),
    mesh(cylinder(kit, 1.535, 1.535, 0, 0.12, 28, true), kit.ring),
    // The open aft end, dark inside.
    mesh(cylinder(kit, 1.5, 1.5, 0.02, 0.03, 28), kit.dark),
    // One-sided marks on the adapter, as NASA photo KSC-66PC-0038 shows them at
    // lift-off (public/media/gemini-8/ksc-66pc-0038.jpg): a lengthwise tube
    // fairing low on the equipment section, a little to one side of the
    // hatches, and two small dark square openings higher up, either side of
    // them. Places and sizes are read off that photo, roughly.
    onEquipmentSection(mesh(cylinder(kit, 0.06, 0.06, -0.2, 0.2, 8), kit.ring), 0.55, -0.35, 0.04),
    onEquipmentSection(mesh(box(kit, 0.16, 0.16, 0.04), kit.dark), 1.05, -0.8, 0.0),
    onEquipmentSection(mesh(box(kit, 0.16, 0.16, 0.04), kit.dark), 1.05, 0.8, 0.0),
  );
}

function geminiRetroSection(kit: Kit): Group {
  return part(
    'gemini-retro-section',
    mesh(cylinder(kit, 1.33, 1.15, GEMINI.equipmentTop, GEMINI.retroTop, 28), kit.geminiWhite),
    mesh(
      cylinder(kit, 1.345, 1.345, GEMINI.equipmentTop - 0.03, GEMINI.equipmentTop + 0.03, 28, true),
      kit.ring,
    ),
  );
}

/** The cabin's radius at height y (a cone from 1.15 m at the heat shield to 0.52 m at the nose section). */
function cabinRadius(y: number): number {
  return 1.15 - ((y - GEMINI.shieldTop) / (GEMINI.cabinTop - GEMINI.shieldTop)) * (1.15 - 0.52);
}

const HATCH = { half: 0.27, offset: 0.33, y0: GEMINI.shieldTop + 0.12, y1: GEMINI.cabinTop - 0.06 };

/**
 * One of the two crew hatches, side by side on the cabin's sloping top
 * (toward +Z), left (-1) or right (+1): a lighter panel with a light rim and
 * a large window. NASA photo S66-18602 (public/media/gemini-8/s66-18602.jpg,
 * the crew in the water with both hatches open) shows the two hatches side
 * by side over the crew, covering most of the cabin's top from near the
 * heat shield to the nose section, with a beam between them; S66-26037
 * (s66-26037.jpg) shows a window in a closed hatch. The real hatches are
 * the same dark color as the rest of the cabin: they are drawn lighter so
 * the craft's top, and any roll, can be seen.
 *
 * The right-hand hatch (the pilot's, which spacewalkers used) hangs on a
 * hinge along its outer edge, so it can swing open (S66-18602 shows the
 * hatches standing open that way).
 */
function geminiHatch(kit: Kit, side: -1 | 1): Group {
  const center = side * HATCH.offset;
  const { half, y0, y1 } = HATCH;
  const rim = 0.04;
  const frame = mesh(
    conePatch(
      kit,
      cabinRadius(y0 - rim) + 0.012,
      cabinRadius(y1 + rim) + 0.012,
      y0 - rim,
      y1 + rim,
      center - half - rim,
      2 * (half + rim),
    ),
    kit.hatchRim,
  );
  const panel = new Group();
  panel.add(
    mesh(
      conePatch(
        kit,
        cabinRadius(y0) + 0.022,
        cabinRadius(y1) + 0.022,
        y0,
        y1,
        center - half,
        2 * half,
      ),
      kit.hatch,
    ),
    // The window, toward the nose.
    mesh(
      conePatch(
        kit,
        cabinRadius(3.0) + 0.03,
        cabinRadius(3.85) + 0.03,
        3.0,
        3.85,
        center - 0.17,
        0.34,
      ),
      kit.window,
    ),
  );
  if (side < 0) {
    panel.add(frame);
    return panel;
  }
  // The hatchway, dark, seen when the hatch stands open.
  const opening = mesh(
    conePatch(
      kit,
      cabinRadius(y0) + 0.017,
      cabinRadius(y1) + 0.017,
      y0,
      y1,
      center - half,
      2 * half,
    ),
    kit.dark,
  );
  // The hinge: the hatch's outer edge, from its aft corner to its forward corner.
  const edge = center + half + rim;
  const from = new Vector3(Math.sin(edge) * cabinRadius(y0), y0, Math.cos(edge) * cabinRadius(y0));
  const to = new Vector3(Math.sin(edge) * cabinRadius(y1), y1, Math.cos(edge) * cabinRadius(y1));
  const hinge = special(GEMINI_RIGHT_HATCH);
  hinge.position.copy(from);
  panel.position.copy(from).negate();
  hinge.add(panel);
  hinge.userData['axis'] = to.sub(from).normalize();
  const group = new Group();
  group.add(frame, opening, hinge);
  return group;
}

function geminiReentryModule(kit: Kit): Group {
  return part(
    'gemini-reentry-module',
    mesh(cylinder(kit, 1.15, 1.15, GEMINI.retroTop, GEMINI.shieldTop, 28), kit.heatShieldDark),
    mesh(cylinder(kit, 1.15, 0.52, GEMINI.shieldTop, GEMINI.cabinTop, 28), kit.geminiBlack),
    // The two crew hatches, side by side on the cabin's sloping top.
    geminiHatch(kit, -1),
    geminiHatch(kit, 1),
    mesh(cylinder(kit, 0.52, 0.52, GEMINI.cabinTop, GEMINI.rcsTop, 20), kit.geminiBlack),
    mesh(cylinder(kit, 0.52, 0.36, GEMINI.rcsTop, GEMINI.noseTop, 20), kit.geminiBlack),
    mesh(cylinder(kit, 0.37, 0.3, GEMINI.noseTop - 0.08, GEMINI.noseTop + 0.04, 16), kit.ring),
  );
}

/** The cabin's outward direction at the right-hand hatch (Gemini coordinates). */
function geminiHatchOutward(): Vector3 {
  const a = HATCH.offset;
  const slope = (1.15 - 0.52) / (GEMINI.cabinTop - GEMINI.shieldTop);
  return new Vector3(Math.sin(a), slope, Math.cos(a)).normalize();
}

/**
 * A spacewalker outside a Gemini's right-hand hatch (Gemini coordinates), in
 * the Gemini suit, with the gas gun for "gas-gun"; `backward` when the
 * craft is built turned end for end (see walkerTurn).
 */
function geminiSpacewalker(kit: Kit, backward: boolean): Group {
  const hatch = new Vector3(
    Math.sin(HATCH.offset) * cabinRadius(3.4),
    3.4,
    Math.cos(HATCH.offset) * cabinRadius(3.4),
  );
  const at = new Vector3(1.5, 4.3, 2.4);
  const place: WalkerPlace = {
    at,
    turn: walkerTurn(at, -0.3, -0.6, 0.15, backward),
    hatch,
    outward: geminiHatchOutward(),
  };
  return spacewalker(kit, place, { era: 'gemini', gasGun: true });
}

/** Gemini's parachute (the small drogue or the big main), above a reentry module whose heat shield is at y = 0. */
function geminiParachute(
  kit: Kit,
  name: 'gemini-drogue-parachute' | 'gemini-main-parachute',
): Group {
  const main = name === 'gemini-main-parachute';
  // Much closer and smaller than the real ones, so the capsule stays the subject.
  const radius = main ? 2.2 : 0.75;
  const height = main ? 8.2 : 6.2;
  const apex = new Vector3(0, GEMINI.noseTop - GEMINI.retroTop + 0.05, 0);
  const canopy = mesh(canopyGeometry(kit, radius), kit.canopy, 0, height, 0);
  const linePoints: number[] = [];
  for (let j = 0; j < 8; j += 1) {
    const b = (j * Math.PI * 2) / 8;
    const rim = new Vector3(
      Math.cos(b) * radius * 0.97,
      height + radius * 0.75 * Math.cos(Math.PI * 0.42),
      Math.sin(b) * radius * 0.97,
    );
    linePoints.push(apex.x, apex.y, apex.z, rim.x, rim.y, rim.z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(linePoints, 3));
  const group = part(name, canopy, new LineSegments(geometry, kit.lines));
  group.userData['apex'] = apex.y;
  return group;
}

/* ---------------- Titan II, in stack coordinates (y from the engine exits) ---------------- */

const TITAN = {
  firstTop: 21.0,
  interstageTop: 22.0,
  secondTop: 29.5,
};

function titanFirstStage(kit: Kit): Group {
  return part(
    'titan-first-stage',
    mesh(cylinder(kit, 0.62, 0.3, 0, 1.6, 16), kit.dark, -0.68, 0, 0),
    mesh(cylinder(kit, 0.62, 0.3, 0, 1.6, 16), kit.dark, 0.68, 0, 0),
    mesh(cylinder(kit, 1.52, 1.52, 1.6, TITAN.firstTop, 28), kit.titan),
    mesh(cylinder(kit, 1.54, 1.54, 1.6, 3.0, 28, true), kit.dark),
  );
}

function titanSecondStage(kit: Kit): Group {
  return part(
    'titan-second-stage',
    mesh(cylinder(kit, 1.52, 1.52, TITAN.firstTop, TITAN.interstageTop, 28), kit.dark),
    mesh(cylinder(kit, 1.52, 1.52, TITAN.interstageTop, TITAN.secondTop, 28), kit.titan),
    mesh(cylinder(kit, 1.54, 1.54, TITAN.secondTop - 0.6, TITAN.secondTop, 28, true), kit.ring),
  );
}

/* ---------------- Agena, origin at its engine exit, docking cone toward +Y ---------------- */

const AGENA = {
  engineTop: 0.9,
  rackTop: 1.6,
  bodyTop: 6.6,
  adapterTop: 7.5,
  coneTop: 8.2,
};

function agena(kit: Kit): Group {
  return part(
    'agena',
    mesh(cylinder(kit, 0.45, 0.18, 0, AGENA.engineTop, 16), kit.dark),
    mesh(cylinder(kit, 0.76, 0.76, AGENA.engineTop, AGENA.rackTop, 24), kit.agenaDark),
    mesh(cylinder(kit, 0.76, 0.76, AGENA.rackTop, AGENA.bodyTop, 24), kit.agena),
    mesh(cylinder(kit, 0.775, 0.775, 4.2, 4.6, 24, true), kit.agenaDark),
    mesh(cylinder(kit, 0.76, 0.76, AGENA.bodyTop, AGENA.adapterTop, 24), kit.geminiWhite),
    // The docking cone, open toward +Y, with a docking collar at its throat.
    mesh(cylinder(kit, 0.62, 0.95, AGENA.adapterTop, AGENA.coneTop, 24, true), kit.cone),
    mesh(
      cylinder(kit, 0.5, 0.5, AGENA.adapterTop - 0.01, AGENA.adapterTop + 0.05, 20),
      kit.agenaDark,
    ),
    // One-sided features, all on the same side (+Z), as NASA photos S66-25782
    // and S66-25779 (public/media/gemini-8/) show the Agena seen from Gemini 8.
    // A row of small dark openings along the forward body, on the side the
    // boom antenna stands out from (S66-25782).
    ...[4.85, 5.1, 5.35, 5.6, 5.85, 6.1, 6.35].map((y) =>
      mesh(box(kit, 0.16, 0.14, 0.04), kit.agenaDark, 0, y, 0.765),
    ),
    // Boxy units on the aft rack, on that side and the opposite one
    // (S66-25782 shows them on top; S66-25779 on top and bottom).
    mesh(box(kit, 0.55, 0.6, 0.26), kit.agena, 0, 1.25, 0.86),
    mesh(box(kit, 0.55, 0.6, 0.26), kit.agena, 0, 1.25, -0.86),
    agenaBoom(kit),
  );
}

/**
 * The long boom antenna standing straight out from the docking adapter
 * section, a little behind the docking cone, with a small cylinder at its
 * tip: plain in NASA photos S66-25782 and S66-25779 (public/media/gemini-8/).
 * Its length, about 1.9 m, is read off S66-25782 against the 1.5 m wide
 * body; it is drawn thicker than the real boom so it shows. Hidden while the
 * nose shroud is on (see ShipModel.showSpecials).
 */
function agenaBoom(kit: Kit): Group {
  const boom = special(AGENA_BOOM);
  boom.position.set(0, 6.95, 0.76);
  // Along +Z: a Y-axis cylinder turned a quarter turn about X.
  boom.rotation.x = Math.PI / 2;
  boom.add(
    mesh(cylinder(kit, 0.05, 0.05, 0, 1.9, 6), kit.ring),
    mesh(cylinder(kit, 0.09, 0.09, 1.9, 2.22, 10), kit.geminiWhite),
  );
  return boom;
}

/* ---------------- ATDA, origin at its aft end, docking cone toward +Y ---------------- */

/**
 * The Augmented Target Docking Adapter, 1.52 m across and 3.33 m long
 * (NSSDCA Master Catalog, 1966-046A), after NASA photo S66-37923 (seen from
 * Gemini 9A, 66.5 feet away): a silver cylinder with a narrower ringed aft
 * end, a small rod antenna and a few small panels on one side (+Z), and a
 * docking cone like the Agena's at the front.
 */
const ATDA = {
  aftTop: 0.5,
  bodyTop: 2.55,
  collarTop: 2.85,
  coneTop: 3.4,
};

function atda(kit: Kit): Group {
  return part(
    'atda',
    mesh(cylinder(kit, 0.66, 0.66, 0, ATDA.aftTop, 24), kit.agena),
    mesh(cylinder(kit, 0.675, 0.675, 0.18, 0.3, 24, true), kit.agenaDark),
    mesh(cylinder(kit, 0.76, 0.76, ATDA.aftTop, ATDA.bodyTop, 24), kit.agena),
    mesh(cylinder(kit, 0.775, 0.775, 1.5, 1.6, 24, true), kit.agenaDark),
    mesh(cylinder(kit, 0.78, 0.78, ATDA.bodyTop, ATDA.collarTop, 24), kit.agenaDark),
    mesh(cylinder(kit, 0.62, 0.95, ATDA.collarTop, ATDA.coneTop, 24, true), kit.cone),
    mesh(cylinder(kit, 0.5, 0.5, ATDA.collarTop - 0.01, ATDA.collarTop + 0.05, 20), kit.agenaDark),
    rod(kit, new Vector3(0, 1.9, 0.74), new Vector3(0, 2.3, 1.15), 0.035, kit.ring),
    mesh(box(kit, 0.22, 0.14, 0.04), kit.tower, -0.2, 2.3, 0.765),
    mesh(box(kit, 0.18, 0.14, 0.04), kit.geminiWhite, 0.12, 2.3, 0.765),
  );
}

/** The ATDA shroud's two halves: about as long as the ATDA (photo S66-37923). */
const ATDA_SHROUD = { length: 3.3, base: 0.8, tip: 0.46 };

/** One half of the ATDA's nose shroud, from its base (y = 0) to its rounded tip, on the +Z (upper) or -Z side. */
function atdaShroudHalf(kit: Kit, upper: boolean): Group {
  const from = upper ? -Math.PI / 2 : Math.PI / 2;
  const { length, base, tip } = ATDA_SHROUD;
  const group = new Group();
  group.add(
    mesh(conePatch(kit, base, tip, 0, length, from, Math.PI, 16), kit.geminiWhite),
    mesh(conePatch(kit, base, tip, 0, length, from, Math.PI, 16), kit.shroudInside),
    mesh(conePatch(kit, tip, 0.06, length, length + 0.3, from, Math.PI, 16), kit.geminiWhite),
  );
  return group;
}

/**
 * The ATDA's nose shroud in orbit, its two halves hanging half open like
 * jaws ("angry alligator"), as photo S66-37923 shows: hinged at the base of
 * the docking cone, the upper half open a little, the lower one more. The
 * angles are read off that photo, roughly.
 */
function atdaShroudOpen(kit: Kit): Group {
  const group = part('atda-shroud');
  for (const [upper, angle] of [
    [true, 0.2],
    [false, 0.34],
  ] as const) {
    const hinge = new Group();
    const side = upper ? 1 : -1;
    hinge.position.set(0, ATDA.bodyTop, side * ATDA_SHROUD.base);
    const half = atdaShroudHalf(kit, upper);
    half.position.set(0, 0, -side * ATDA_SHROUD.base);
    hinge.add(half);
    hinge.rotation.x = side * angle;
    group.add(hinge);
  }
  return group;
}

/* ---------------- Atlas, in stack coordinates (y from the engine exits) ---------------- */

const ATLAS = {
  top: 21.0,
  /** Where the Agena's engine exit sits on the Atlas, past its adapter. */
  agenaBase: 22.2,
  /** Where the ATDA's aft end sits on the Atlas. */
  atdaBase: 21.5,
};

function atlas(kit: Kit): Group {
  // The top of the Atlas as it carried the ATDA: a black section with white
  // squares under the white nose shroud, plain in photo S66-32139 (lift-off
  // of the ATDA). That it covered the ATDA's sides is our reading of the photo.
  const atdaAdapter = special(
    ATLAS_ATDA_ADAPTER,
    mesh(cylinder(kit, 0.9, 0.98, ATLAS.top, ATLAS.atdaBase + 0.2, 24), kit.dark),
    mesh(
      cylinder(kit, 0.98, 0.98, ATLAS.atdaBase + 0.2, ATLAS.atdaBase + ATDA.bodyTop, 24),
      kit.dark,
    ),
  );
  for (let row = 0; row < 2; row += 1) {
    for (let k = 0; k < 4; k += 1) {
      const a = (k * Math.PI) / 2 + (row * Math.PI) / 4;
      const square = mesh(
        box(kit, 0.36, 0.36, 0.04),
        kit.white,
        Math.sin(a) * 0.995,
        ATLAS.atdaBase + 0.75 + row * 0.85,
        Math.cos(a) * 0.995,
      );
      square.rotation.y = a;
      atdaAdapter.add(square);
    }
  }
  return part(
    'atlas',
    mesh(cylinder(kit, 0.55, 0.25, 0, 1.2, 16), kit.dark, -0.85, 0, 0),
    mesh(cylinder(kit, 0.55, 0.25, 0, 1.2, 16), kit.dark, 0.85, 0, 0),
    mesh(cylinder(kit, 1.6, 1.52, 1.2, 3.2, 28), kit.atlas),
    mesh(cylinder(kit, 1.52, 1.52, 3.2, 18.5, 28), kit.atlas),
    mesh(cylinder(kit, 1.52, 0.9, 18.5, ATLAS.top, 28), kit.atlas),
    // The adapter, around the Agena's engine.
    special(
      ATLAS_AGENA_ADAPTER,
      mesh(
        cylinder(kit, 0.9, 0.78, ATLAS.top, ATLAS.agenaBase + AGENA.engineTop, 24),
        kit.geminiWhite,
      ),
    ),
    atdaAdapter,
  );
}

/** The nose shroud over the Agena's docking end during launch. */
function agenaShroud(kit: Kit): Group {
  const base = ATLAS.agenaBase + AGENA.bodyTop - 0.2;
  return part(
    'agena-shroud',
    mesh(cylinder(kit, 1.02, 1.02, base, base + 2.0, 24), kit.geminiWhite),
    mesh(cylinder(kit, 1.02, 0.08, base + 2.0, base + 3.8, 24), kit.geminiWhite),
  );
}

/** The ATDA's nose shroud, closed, during launch: a short white cylinder and a long point (photo S66-32139). */
function atdaShroudClosed(kit: Kit): Group {
  const base = ATLAS.atdaBase + ATDA.bodyTop;
  return part(
    'atda-shroud',
    mesh(cylinder(kit, 0.98, 0.98, base, base + 1.1, 24), kit.geminiWhite),
    mesh(cylinder(kit, 0.99, 0.99, base + 1.0, base + 1.12, 24, true), kit.ring),
    mesh(cylinder(kit, 0.98, 0.07, base + 1.1, base + 3.4, 24), kit.geminiWhite),
  );
}

/* ------------------------------------------------------------------ */
/* Assemblies.                                                         */
/* ------------------------------------------------------------------ */

/** The command and service module, centered on its own middle so it can turn in place. */
function csmAssembly(kit: Kit, withTower: boolean): Group {
  const inner = new Group();
  inner.position.y = -CSM.center;
  inner.add(serviceModule(kit), commandModule(kit));
  if (withTower) inner.add(escapeTower(kit));
  return part('csm', inner);
}

function lmAssembly(kit: Kit): Group {
  return part('lm', lmDescentStage(kit), lmAscentStage(kit));
}

/**
 * The launch stack in stack coordinates: the Saturn V's stages, and the
 * Saturn IB's first stage under the same S-IVB. The same group serves the
 * "launch", "transposition", and "docked-on-stage" layouts.
 */
function stackAssembly(kit: Kit): Group {
  const group = new Group();
  const csm = csmAssembly(kit, true);
  csm.position.y = STACK.csmBase + CSM.center;
  const lm = lmAssembly(kit);
  lm.position.y = STACK.lmBase;
  group.add(
    firstStage(kit),
    aftInterstage(kit),
    secondStage(kit),
    saturnIBFirstStage(kit),
    thirdStage(kit),
    adapter(kit),
    lm,
    csm,
  );
  return group;
}

/** Where the command module's side hatch is on its cone (service module coordinates), and the cone's radius there. */
const CM_HATCH = { y0: CSM.smTop + 0.75, y1: CSM.smTop + 1.6 };
function cmRadius(y: number): number {
  return 1.95 - ((y - CSM.smTop - 0.25) / (CSM.cmTop - CSM.smTop - 0.25)) * (1.95 - 0.42);
}

/** The command module cone's outward direction at its side hatch (service module coordinates). */
function cmHatchOutward(): Vector3 {
  const slope = (1.95 - 0.42) / (CSM.cmTop - CSM.smTop - 0.25);
  return new Vector3(0, slope, 1).normalize();
}

/**
 * A spacewalker by an Apollo service module, on a tether from the command
 * module's side hatch (service module coordinates), in the Apollo suit with
 * the small pack on its back that NASA photo S72-37001 shows; `backward`
 * when the craft is built turned end for end (see walkerTurn).
 */
function apolloSpacewalker(kit: Kit, backward: boolean): Group {
  const y = (CM_HATCH.y0 + CM_HATCH.y1) / 2;
  const at = new Vector3(0.6, 2.4, 3.6);
  const place: WalkerPlace = {
    at,
    turn: walkerTurn(at, -0.25, -0.6, 0.15, backward),
    hatch: new Vector3(0, y, cmRadius(y)),
    outward: cmHatchOutward(),
  };
  return spacewalker(kit, place, { era: 'apollo', pack: 'small' });
}

/**
 * The command module's side hatch standing open: a dark opening on the
 * cone, and the door swung out beside it (NASA photo S71-43202 shows the
 * open hatch with the tether coming out of it). Shown with a spacewalker or
 * "open-hatch"; size and place are approximate. Its own materials, so it
 * fades in as the hatch opens.
 */
function apolloOpenHatch(kit: Kit): Group {
  const { y0, y1 } = CM_HATCH;
  const look: HatchLook = {
    opening: new MeshStandardMaterial({ color: 0x15171b, roughness: 0.9, transparent: true }),
    door: new MeshStandardMaterial({
      color: 0xc9ced5,
      roughness: 0.5,
      metalness: 0.2,
      transparent: true,
      side: DoubleSide,
    }),
  };
  const opening = mesh(
    conePatch(kit, cmRadius(y0) + 0.02, cmRadius(y1) + 0.02, y0, y1, -0.3, 0.6),
    look.opening,
  );
  const door = mesh(
    box(kit, 0.04, 0.85, 0.75),
    look.door,
    Math.sin(0.3) * cmRadius(y0) + 0.38,
    (y0 + y1) / 2,
    Math.cos(0.3) * cmRadius(y0) + 0.32,
  );
  door.rotation.set(0.45, 0.8, 0);
  const group = special(APOLLO_HATCH, opening, door);
  group.userData['hatchLook'] = look;
  return group;
}

/** A crewmate standing in the command module's open side hatch (service module coordinates). */
function apolloStandup(kit: Kit): Group {
  const y = (CM_HATCH.y0 + CM_HATCH.y1) / 2;
  return standupWalker(
    kit,
    'apollo',
    new Vector3(0, y, cmRadius(y)),
    cmHatchOutward(),
    new Vector3(0, -1, 0.3),
  );
}

/** Both service modules (whole and damaged; the change's parts pick one), the command module, its open hatch, a crewmate standing in it, and (unless left out) a spacewalker. */
function csmParts(kit: Kit, walker = true, backward = false): Object3D[] {
  const parts = [
    serviceModule(kit),
    serviceModuleDamaged(kit),
    commandModule(kit),
    apolloOpenHatch(kit),
    apolloStandup(kit),
  ];
  return walker ? [...parts, apolloSpacewalker(kit, backward)] : parts;
}

/**
 * A spacewalker standing upright on the lunar module's front porch, below
 * its forward hatch, on a tether from the hatch (lunar module coordinates),
 * as on Apollo 9's spacewalk with the two craft docked (NASA photo
 * AS09-20-3094 shows the lunar module pilot standing on the porch, in its
 * "golden slippers" foot restraints). The suit follows AS9-19-2994: the
 * tall pack on the back, the helmet red over its top. Places are
 * approximate.
 */
function lmPorchSpacewalker(kit: Kit): Group {
  const place: WalkerPlace = {
    // On the porch in front of the hatch, a little to one side of it; feet on the descent stage's top.
    at: new Vector3(-0.2, LM.descentTop + 1.0, 2.0),
    turn: new Quaternion().setFromEuler(new Euler(0.05, 0.3, 0)),
    hatch: new Vector3(0, LM.descentTop + 0.5, 1.6),
    // The tether leaves the hatch to the side, clear of the legs.
    outward: new Vector3(0.85, 0.1, 0.5),
  };
  return spacewalker(kit, place, { era: 'apollo', pose: 'porch', pack: 'large', redHelmet: true });
}

/** Command module (with or without its service module) with the lunar module (or its ascent stage) on its nose, the lunar module ahead. */
function dockedAssembly(kit: Kit, backward: boolean): Group {
  const lm = lmAssembly(kit);
  lm.rotation.x = Math.PI;
  lm.position.y = CSM.tunnelTop + LM.tunnelTop;
  // Docked, the spacewalk is from the lunar module's porch (Apollo 9).
  lm.add(lmPorchSpacewalker(kit));
  return endFor(backward, ...csmParts(kit, false), lm);
}

function csmAloneAssembly(kit: Kit, backward: boolean): Group {
  return endFor(backward, ...csmParts(kit, true, backward));
}

/** A service module by itself (Apollo 13's, cast off before entry), front forward. */
function smAloneAssembly(kit: Kit, backward: boolean): Group {
  return endFor(backward, serviceModule(kit), serviceModuleDamaged(kit));
}

/** The command module by itself, heat shield first (+Y), its base at the origin, parachutes trailing. */
function cmAloneAssembly(kit: Kit): Group {
  const group = new Group();
  const turned = new Group();
  turned.rotation.x = Math.PI;
  const cm = commandModule(kit);
  cm.position.y = -CSM.smTop;
  turned.add(cm, parachutes(kit, 'drogue-parachutes'), parachutes(kit, 'main-parachutes'));
  group.add(turned);
  return group;
}

function lmAloneAssembly(kit: Kit): Group {
  const group = new Group();
  group.add(lmDescentStage(kit), lmAscentStage(kit));
  return group;
}

/** A spent S-IVB in orbit (stack coordinates), its adapter's panels open, the adapter end forward. */
function stageAloneAssembly(kit: Kit, backward: boolean): Group {
  return endFor(backward, thirdStage(kit), openAdapter(kit));
}

/** The Gemini spacecraft's three sections, in Gemini coordinates. */
function geminiParts(kit: Kit): Object3D[] {
  return [geminiEquipmentSection(kit), geminiRetroSection(kit), geminiReentryModule(kit)];
}

/** Titan II with the Gemini spacecraft on top, in stack coordinates. */
function titanStackAssembly(kit: Kit): Group {
  const group = new Group();
  const spacecraft = part('gemini-spacecraft', ...geminiParts(kit));
  spacecraft.position.y = TITAN.secondTop;
  group.add(titanFirstStage(kit), titanSecondStage(kit), spacecraft);
  return group;
}

/**
 * A group holding `children`, turned end for end when `turned` (so +Y,
 * the way of travel, meets what was at -Y). It turns about Z, the craft's
 * "up", the way a craft yaws around: its top (+Z, where the Gemini's
 * hatches and the Agena's boom are) stays on top.
 */
function endFor(turned: boolean, ...children: Object3D[]): Group {
  const group = new Group();
  if (!turned) {
    group.add(...children);
    return group;
  }
  const inner = new Group();
  inner.rotation.z = Math.PI;
  inner.add(...children);
  group.add(inner);
  return group;
}

/**
 * The Gemini spacecraft in orbit: the reentry module with its adapter
 * sections behind it, nose first, or blunt end first when `backward`.
 */
function geminiAloneAssembly(kit: Kit, backward: boolean): Group {
  return endFor(
    backward,
    ...geminiParts(kit),
    geminiSpacewalker(kit, backward),
    geminiStandup(kit),
  );
}

/** The reentry module by itself, heat shield first (+Y), its heat shield at the origin, parachutes trailing; hatches on top (+Z), as in endFor. */
function geminiReentryAssembly(kit: Kit): Group {
  const group = new Group();
  const turned = new Group();
  turned.rotation.z = Math.PI;
  const module = geminiReentryModule(kit);
  module.position.y = -GEMINI.retroTop;
  turned.add(
    module,
    geminiParachute(kit, 'gemini-drogue-parachute'),
    geminiParachute(kit, 'gemini-main-parachute'),
  );
  group.add(turned);
  return group;
}

/**
 * Gemini with its nose in a target's docking cone (the Agena's, or the
 * ATDA's: the change's parts pick which). Built nose first (the target
 * ahead, engine forward); `backward` turns the pair end for end, so the
 * Gemini flies blunt end first with the target behind it, cone forward.
 */
function geminiDockedAssembly(kit: Kit, backward: boolean): Group {
  const agenaTarget = agena(kit);
  // End for end about Z, so its boom stays on the same side as when it flies alone.
  agenaTarget.rotation.z = Math.PI;
  agenaTarget.position.y = GEMINI_IN_CONE + AGENA.coneTop;
  const atdaTarget = atda(kit);
  atdaTarget.rotation.z = Math.PI;
  atdaTarget.position.y = GEMINI_IN_CONE + ATDA.coneTop;
  return endFor(
    backward,
    ...geminiParts(kit),
    agenaTarget,
    atdaTarget,
    geminiSpacewalker(kit, backward),
    geminiStandup(kit),
  );
}

/** Where a target's cone mouth sits on a docked Gemini: the nose goes this far into the cone. */
const GEMINI_IN_CONE = GEMINI.noseTop - 0.55;

/** Atlas with the Agena or the ATDA (engine or aft end down, docking end up under its shroud), in stack coordinates. */
function atlasStackAssembly(kit: Kit): Group {
  const group = new Group();
  const agenaTarget = agena(kit);
  agenaTarget.position.y = ATLAS.agenaBase;
  const atdaTarget = atda(kit);
  atdaTarget.position.y = ATLAS.atdaBase;
  group.add(atlas(kit), agenaTarget, agenaShroud(kit), atdaTarget, atdaShroudClosed(kit));
  return group;
}

/** The Agena in orbit, docking cone forward (as it was launched). */
function agenaAloneAssembly(kit: Kit, backward: boolean): Group {
  return endFor(backward, agena(kit));
}

/** The ATDA in orbit, docking cone forward, with its shroud hanging half open. */
function atdaAloneAssembly(kit: Kit, backward: boolean): Group {
  return endFor(backward, atda(kit), atdaShroudOpen(kit));
}

/** A fresh group of the given kind; `backward` turns a craft in orbit blunt end first. */
function buildAssembly(kit: Kit, kind: Kind, backward = false): Group {
  switch (kind) {
    case 'stack':
      return stackAssembly(kit);
    case 'docked':
      return dockedAssembly(kit, backward);
    case 'csm':
      return csmAloneAssembly(kit, backward);
    case 'sm':
      return smAloneAssembly(kit, backward);
    case 'cm':
      return cmAloneAssembly(kit);
    case 'lm':
      return lmAloneAssembly(kit);
    case 'stage':
      return stageAloneAssembly(kit, backward);
    case 'titan':
      return titanStackAssembly(kit);
    case 'gemini':
      return geminiAloneAssembly(kit, backward);
    case 'gemini-reentry':
      return geminiReentryAssembly(kit);
    case 'gemini-docked':
      return geminiDockedAssembly(kit, backward);
    case 'atlas':
      return atlasStackAssembly(kit);
    case 'agena':
      return agenaAloneAssembly(kit, backward);
    case 'atda':
      return atdaAloneAssembly(kit, backward);
    case 'none':
      return new Group();
  }
}

/* ------------------------------------------------------------------ */
/* Per-change layout information.                                      */
/* ------------------------------------------------------------------ */

type Kind =
  /* Saturn V, Saturn IB, and Apollo. */
  | 'stack'
  | 'docked'
  | 'csm'
  | 'sm'
  | 'cm'
  | 'lm'
  | 'stage'
  /* Gemini. */
  | 'titan'
  | 'gemini'
  | 'gemini-reentry'
  | 'gemini-docked'
  /* Gemini's targets. */
  | 'atlas'
  | 'agena'
  | 'atda'
  /** Drawn as part of another ship. */
  | 'none';

/** Kinds that turn around about Z, keeping their top on top (see endFor); the rest turn about X. */
const TURN_ABOUT_Z: ReadonlySet<Kind> = new Set<Kind>([
  'gemini',
  'gemini-docked',
  'gemini-reentry',
  'agena',
  'atda',
]);

/** Kinds a change's `facing` can turn end for end (craft in orbit). */
const TURNABLE: ReadonlySet<Kind> = new Set<Kind>([
  'gemini',
  'gemini-docked',
  'docked',
  'csm',
  'sm',
  'stage',
  'agena',
  'atda',
]);

/** Kinds whose changes share one launch-stack group (so stages can fall away from it). */
const STACK_KINDS: ReadonlySet<Kind> = new Set<Kind>(['stack', 'titan', 'atlas']);

interface Shape {
  change: VehicleChange;
  time: number;
  kind: Kind;
  /** The group drawn (several changes share one). */
  group: Group;
  /** Parts named in the group, by name, and as a list. */
  parts: Map<string, Group>;
  partList: Group[];
  /** Point of the model (in group coordinates) placed on the path, along Y. */
  pivot: number;
  /** Where the pivot starts when the shape begins, if it eases in from somewhere else. */
  pivotFrom: number | undefined;
  /**
   * A fixed point of the vehicle's main body (Apollo: the command module's
   * base; the lunar module: its ascent stage's base; Gemini: the reentry
   * module's heat shield; Agena: its engine exit; the ATDA and the S-IVB:
   * their aft ends), relative to the pivot along Y, for lining shapes up
   * when parts come off.
   */
  anchor: number | undefined;
  /** +1 when the main body's nose points along travel, -1 when it points back; at the start and end of the shape. */
  facingStart: 1 | -1;
  facingEnd: 1 | -1;
  /** Length of the visible model in meters, for its apparent size. */
  length: number;
  /** Middle of the visible model relative to the pivot, along Y. */
  middle: number;
  /** The ends of the visible body along Y, relative to the pivot. */
  low: number;
  high: number;
  /** Largest side of the whole model, parachutes included, in meters. */
  largest: number;
  /** Farthest the model reaches from the pivot, in meters. */
  reach: number;
  /** The same with a spacewalker included, for drawing the craft close up. */
  fullReach: number;
  /**
   * For a shape that can show a spacewalker: the point a close-up centers
   * on (halfway from the pivot to the figure, relative to the pivot) and
   * how far the view must reach around it.
   */
  walkerFocus: { center: Vector3; side: number; reach: number } | undefined;
  /** Parts of the shape before that are not dropped at this change, because another ship takes them over or they are left behind. */
  keptElsewhere: ReadonlySet<VehiclePart>;
  /** Which end its dropped parts drift away from, once known (see ShipModel.dropSide). */
  dropSide?: 1 | -1;
  /** How far the drop at its change, timed by mission time, was last drawn (see DROP_MIN_SECONDS). */
  missionDrop?: number;
}

/**
 * Which shape a change's part list and layout make. The part lists:
 * - Saturn V on the pad, "launch": first-stage, aft-interstage,
 *   second-stage, third-stage, adapter, [lm-descent-stage, lm-ascent-stage,]
 *   service-module, command-module, escape-tower (the lunar module rides
 *   hidden in the adapter; leave it out for a flight without one).
 * - Saturn IB, "launch": saturn-ib-first-stage, third-stage, adapter,
 *   service-module, command-module, escape-tower.
 * - Apollo after launch: "transposition" and "docked-on-stage" (the stack
 *   with the lunar module on the S-IVB), "docked" (command module, with or
 *   without its service module, and the lunar module or its ascent stage),
 *   "alone": service-module (or service-module-damaged) and command-module;
 *   command-module alone, with drogue-parachutes or main-parachutes; the
 *   lunar module's parts; a service module by itself; a spent stage
 *   (third-stage, with adapter for open panels).
 * - Titan II and Gemini: "launch" with titan stages and Gemini sections;
 *   "alone" Gemini sections (nose or blunt end first, see `facing`), the
 *   reentry module with a parachute; "docked" Gemini sections with agena.
 * - Gemini's targets: "launch" atlas with agena (and agena-shroud) or atda
 *   (and atda-shroud); "alone" agena, or atda with or without atda-shroud.
 * - spacewalker: with Gemini sections ("alone", "docked") or Apollo's
 *   command and service module ("alone", "docked"); gas-gun with a
 *   spacewalker on Gemini.
 */
function kindOf(layout: VehicleLayout, parts: readonly VehiclePart[]): Kind {
  const has = (name: VehiclePart): boolean => parts.includes(name);
  const serviceModule = has('service-module') || has('service-module-damaged');
  const lunarModule = has('lm-descent-stage') || has('lm-ascent-stage');
  if (parts.length === 0) return 'none';
  if (has('titan-first-stage') || has('titan-second-stage')) return 'titan';
  if (has('atlas') || (layout === 'launch' && (has('agena') || has('atda')))) return 'atlas';
  if (has('gemini-reentry-module')) {
    if (layout === 'launch') return 'titan';
    if (layout === 'docked') return 'gemini-docked';
    if (has('gemini-equipment-section') || has('gemini-retro-section')) return 'gemini';
    return 'gemini-reentry';
  }
  if (has('agena')) return 'agena';
  if (has('atda')) return 'atda';
  if (layout === 'launch' || layout === 'transposition' || layout === 'docked-on-stage')
    return 'stack';
  if (layout === 'docked' && has('command-module') && lunarModule) return 'docked';
  if (serviceModule && has('command-module')) return 'csm';
  if (has('command-module')) return 'cm';
  if (lunarModule) return 'lm';
  if (serviceModule) return 'sm';
  if (has('third-stage')) return 'stage';
  return 'none';
}

/** True when a change lists any part of the lunar module. */
function hasLunarModule(change: VehicleChange): boolean {
  return change.parts.some((name) => LUNAR_MODULE_PARTS.has(name));
}

/** Report a vehicle file problem once, while developing (it does not stop the scene). */
const warned = new Set<string>();
function warnOnce(message: string): void {
  if (!import.meta.env.DEV || warned.has(message)) return;
  warned.add(message);
  console.warn(`[vehicles] ${message}`);
}

/** The extent along Y of the given parts of a group, at rest. */
function extentOf(group: Group, names: readonly string[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  const point = new Vector3();
  group.updateMatrixWorld(true);
  const inverse = new Matrix4().copy(group.matrixWorld).invert();
  for (const name of names) {
    const node = group.getObjectByName(name);
    if (!node) continue;
    node.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const geometry = child.geometry as BufferGeometry;
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i += 1) {
        point
          .fromBufferAttribute(position, i)
          .applyMatrix4(child.matrixWorld)
          .applyMatrix4(inverse);
        min = Math.min(min, point.y);
        max = Math.max(max, point.y);
      }
    });
  }
  return Number.isFinite(min) ? [min, max] : [0, 1];
}

/** Where a point on a part's own axis (at height `y` in the part's coordinates) sits along Y in the group, at rest. */
function axisPoint(group: Group, name: string, y: number): number | undefined {
  const node = group.getObjectByName(name);
  if (!node) return undefined;
  group.updateMatrixWorld(true);
  const inverse = new Matrix4().copy(group.matrixWorld).invert();
  return new Vector3(0, y, 0).applyMatrix4(node.matrixWorld).applyMatrix4(inverse).y;
}

/** The Gemini spacecraft's own sections. */
const GEMINI_PARTS: readonly VehiclePart[] = [
  'gemini-equipment-section',
  'gemini-retro-section',
  'gemini-reentry-module',
];

/** How big some parts are: the largest side of the box around them, and the farthest they reach from a pivot. */
interface PartsSize {
  largest: number;
  reach: number;
}

/**
 * The box (in group coordinates, at rest) around the given parts: its largest
 * side, and the farthest any of it reaches from a point on the Y axis.
 * `offset` moves the parts first (a part parked apart from another).
 */
function sizeOf(
  group: Group,
  names: readonly string[],
  pivot: number,
  offset?: Vector3,
): PartsSize {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  const point = new Vector3();
  group.updateMatrixWorld(true);
  const inverse = new Matrix4().copy(group.matrixWorld).invert();
  let reach = 0;
  for (const name of names) {
    const node = group.getObjectByName(name);
    if (!node) continue;
    node.traverse((child) => {
      if (!(child instanceof Mesh) && !(child instanceof LineSegments)) return;
      const position = (child.geometry as BufferGeometry).getAttribute('position');
      for (let i = 0; i < position.count; i += 1) {
        point
          .fromBufferAttribute(position, i)
          .applyMatrix4(child.matrixWorld)
          .applyMatrix4(inverse);
        if (offset) point.add(offset);
        min.min(point);
        max.max(point);
        reach = Math.max(reach, Math.hypot(point.x, point.y - pivot, point.z));
      }
    });
  }
  if (!Number.isFinite(min.x)) return { largest: 1, reach: 1 };
  const size = max.sub(min);
  return { largest: Math.max(size.x, size.y, size.z, 1), reach: Math.max(reach, 1) };
}

/* ------------------------------------------------------------------ */
/* The model of one ship.                                              */
/* ------------------------------------------------------------------ */

export interface ShipPose {
  /** Whether the ship exists now. */
  exists: boolean;
  /** Where it is (scene units). */
  position: Vector3;
  /** Unit direction of travel. */
  forward: Vector3;
  /** Unit "up": away from the nearer body (or ecliptic north far from both). */
  up: Vector3;
}

export interface PoseContext {
  /** Mission time and story time now. */
  time: number;
  storyTime: number;
  /** Story time of a mission time. */
  toStory(time: number): number;
  /** Scene units per CSS pixel at the ship's distance from the camera; 0 hides the ship. */
  unitsPerPixel: number;
  /** Multiplies the model's apparent size. */
  sizeScale: number;
  /** Most CSS pixels the model's largest side may span (Infinity for no limit). */
  maxPixels: number;
  /** Most CSS pixels the model may reach from the point on its path (Infinity for no limit). */
  maxReachPixels: number;
  /** Seconds since the last frame (real time), and true when the size should jump rather than ease. */
  dt: number;
  snap: boolean;
  /** True when the person asked for reduced motion: a fast spin is drawn as a slow, steady turn. */
  reducedMotion: boolean;
  /**
   * When above 0, draw at this many meters per CSS pixel instead of the
   * model's own size (two ships about to dock share one scale).
   */
  metersPerPixel: number;
  /** How visible the model is, 0 to 1 (it fades out while many orbits pass in a moment; see stage.ts). */
  opacity: number;
  /** How bright the glow behind it is, 0 to 1 (dimmed when the model is drawn close up). */
  glow: number;
  /** How far to center the model on its spacewalk close-up's middle instead of its point on the path, 0 to 1. */
  focus: number;
}

/**
 * Which end of a shape meets another craft keeping station with it: the
 * main body's nose. Along the ship's travel ("forward", sign +1 ahead or -1
 * behind), or for the lunar module its top ("up", sign +1), at `distance`
 * meters from its point on the path.
 */
export interface ShipFace {
  axis: 'forward' | 'up';
  sign: 1 | -1;
  distance: number;
}

const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
const _basis = new Matrix4();
const _q = new Quaternion();
const _qRoll = new Quaternion();
const _qStep = new Quaternion();
const _axisX = new Vector3(1, 0, 0);
const _axisY = new Vector3(0, 1, 0);

/** Parts that visibly fall away when they come off. */
const DROPPABLE: ReadonlySet<string> = new Set([
  'first-stage',
  'aft-interstage',
  'second-stage',
  'saturn-ib-first-stage',
  'third-stage',
  'escape-tower',
  'service-module',
  'service-module-damaged',
  'lm-descent-stage',
  'lm-ascent-stage',
  'titan-first-stage',
  'titan-second-stage',
  'gemini-equipment-section',
  'gemini-retro-section',
  'atlas',
  'agena-shroud',
  'atda-shroud',
]);

/** Parts that fall away only together with the part they sit on (the empty adapter with the S-IVB). */
const RIDES_WITH: ReadonlyMap<VehiclePart, VehiclePart> = new Map<VehiclePart, VehiclePart>([
  ['adapter', 'third-stage'],
]);

/** Dropped parts that drift forward and aside (a tower or a nose shroud) rather than back. */
const DROPS_FORWARD: ReadonlySet<string> = new Set(['escape-tower', 'agena-shroud', 'atda-shroud']);

/** Parachutes, which open over CHUTE_OPEN_SECONDS (see ShipModel.openChutes). */
const CHUTES: readonly VehiclePart[] = [
  'drogue-parachutes',
  'main-parachutes',
  'gemini-drogue-parachute',
  'gemini-main-parachute',
];

/** Turn rate drawn under reduced motion, degrees per story second, at most. */
const REDUCED_MOTION_TURN_DEG = 8;
/**
 * While the clock is stopped, a turning craft keeps turning in real time.
 * When it was speeding up (a rate rising toward a higher one), it eases up
 * to that higher rate over a few seconds (time constant, real seconds).
 */
const IDLE_SPEED_UP_SECONDS = 1;
/** How quickly a turn made while stopped fades out once the craft stops turning, in real seconds. */
const IDLE_SETTLE_SECONDS = 0.4;

/** Wrap an angle to [-pi, pi]. */
function wrapAngle(angle: number): number {
  return angle - Math.PI * 2 * Math.round(angle / (Math.PI * 2));
}

/** Smooth start and stop over [0, 1]. */
function ease(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

/** A dropped part shrinks away over the last quarter of its drop (`done`, 0 to 1), rather than vanishing at the end. */
function dropShrink(done: number): number {
  return 1 - ease((done - 0.75) / 0.25);
}

/** A change's parts that count toward the model's length. */
function bodyParts(names: readonly string[]): string[] {
  return names.filter((name) => !NOT_BODY.has(name as VehiclePart));
}

/** Materials whose opacity follows a fade, with their own opacity and blending remembered. */
class Fader {
  private readonly items: Array<{ material: Material; opacity: number; transparent: boolean }> = [];
  private level = 1;

  add(material: Material): void {
    this.items.push({ material, opacity: material.opacity, transparent: material.transparent });
  }

  /** Set every material's opacity to `level` times its own. */
  set(level: number): void {
    const value = level > 0.995 ? 1 : Math.max(0, level);
    if (value === this.level) return;
    this.level = value;
    for (const item of this.items) {
      const transparent = value < 1 || item.transparent;
      if (item.material.transparent !== transparent) {
        item.material.transparent = transparent;
        item.material.needsUpdate = true;
      }
      item.material.opacity = item.opacity * value;
    }
  }
}

/** Where the command and service module is during transposition: its middle along the stack, and how far it has turned (radians). */
interface TranspositionPose {
  center: number;
  angle: number;
}

export class ShipModel {
  /** Holds the model; placed, turned, and scaled each frame. */
  readonly root = new Group();
  /** A soft glow behind the model, so it can always be found. */
  readonly halo: Sprite;

  private readonly shapes: Shape[] = [];
  private readonly groups: Group[] = [];
  /** A wrapper that turns the active shape during a turn. */
  private readonly body = new Group();
  /** Turns the whole model for a cited roll or tumble (see VehicleChange.motion). */
  private readonly spin = new Group();
  /** Holds the previous shape's dropped parts while they fall away. */
  private readonly trail = new Group();
  private metersPerPixel = 0;
  private lastShape = -1;
  /** The last good sideways reference, for when travel lines up with "up" (a vertical climb or fall). */
  private readonly lastSide = new Vector3(0, 0, 1);
  /** Reused list of parts falling away. */
  private readonly dropped: VehiclePart[] = [];
  /** The whole model's materials, for fading it out. */
  private readonly fader = new Fader();
  private readonly haloOpacity = 0.55;
  /** How far out the spacewalker is now, 0 to 1 (it fades in and out in real time). */
  private walkerLevel = 0;
  /** How far open the crew hatch is now, 0 to 1 (with a spacewalker, or "open-hatch"). */
  private hatchLevel = 0;
  /** How far in view a crewmate standing in the hatch is now, 0 to 1. */
  private standLevel = 0;
  /** Whether the spacewalker, while out or fading out, holds the gas gun ("gas-gun" listed with it). */
  private walkerGun = false;
  /** How visible the whole model is now (see PoseContext.opacity). */
  private fade = 1;
  /** The turn the model is drawn at, and the turn its path asked for last frame (see SUDDEN_TURN_DEG). */
  private readonly drawnTurn = new Quaternion();
  private readonly pathTurn = new Quaternion();
  /** How many CSS pixels across its glow is drawn now (it follows a change of shape as the size does). */
  private haloPixels = 0;
  /** How far each parachute is open, 0 to 1 (see CHUTE_OPEN_SECONDS), and whether one is still opening or going. */
  private readonly chuteLevels = new Map<string, number>();
  private chutesMoving = false;
  /** True while a dropped part is held to DROP_MIN_SECONDS with the clock stopped. */
  private dropMoving = false;
  /** True while the model eases to its size, its glow's size, or its path's turn. */
  private settling = false;

  constructor(
    readonly shipId: string,
    changes: readonly VehicleChange[],
    elapsed: (change: VehicleChange) => number,
    kit: Kit,
    haloTexture: CanvasTexture,
    color: number,
    leftBehind: readonly LeftBehind[] = [],
    leftBehindTime: (item: LeftBehind) => number = () => Number.NaN,
  ) {
    this.root.name = `Ship ${shipId}`;
    this.root.add(this.spin);
    this.spin.add(this.body, this.trail);
    this.halo = new Sprite(
      new SpriteMaterial({
        map: haloTexture,
        color,
        transparent: true,
        opacity: this.haloOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.halo.renderOrder = -1;
    for (const material of kitMaterials(kit)) this.fader.add(material);

    const own = changes.filter((change) => change.ship === shipId);
    const stacks = new Map<Kind, Group>();
    for (const change of own) {
      const kind = kindOf(change.layout, change.parts);
      if (kind === 'none' && change.parts.length > 0) {
        warnOnce(
          `${shipId} at "${change.label}": no shape is made of ${change.parts.join(', ')} in layout "${change.layout}"; nothing is drawn.`,
        );
      }
      // A craft in orbit may fly blunt end first.
      const backward = TURNABLE.has(kind) && change.facing === 'backward';
      if (change.facing && !TURNABLE.has(kind) && change.parts.length > 0) {
        warnOnce(
          `${shipId} at "${change.label}": "facing" does not apply to this shape (${kind}); it keeps its usual way.`,
        );
      }
      let group: Group;
      if (STACK_KINDS.has(kind)) {
        group = stacks.get(kind) ?? buildAssembly(kit, kind);
        stacks.set(kind, group);
      } else {
        group = buildAssembly(kit, kind, backward);
      }
      if (!this.groups.includes(group)) {
        this.groups.push(group);
        group.visible = false;
      }

      const parts = new Map<string, Group>();
      group.traverse((child) => {
        if (child instanceof Group && child.name) {
          parts.set(child.name, child);
          child.userData['restY'] = child.position.y;
          child.userData['restRotation'] = child.rotation.x;
          child.userData['restScale'] = child.scale.x;
        }
      });
      if (kind === 'stack' && change.layout === 'docked-on-stage' && !hasLunarModule(change)) {
        warnOnce(
          `${shipId} at "${change.label}": "docked-on-stage" needs the lunar module's parts; for a flight without one, use "transposition".`,
        );
      }
      for (const name of change.parts) {
        const shownByHatch =
          name === 'open-hatch' && (parts.has(GEMINI_RIGHT_HATCH) || parts.has(APOLLO_HATCH));
        if (kind !== 'none' && !parts.has(name) && !shownByHatch) {
          warnOnce(
            `${shipId} at "${change.label}": the ${kind} shape (layout "${change.layout}") cannot show "${name}"; it is left out.`,
          );
        }
      }

      // Size the model by its body, not its parachutes or a spacewalker.
      const shown = bodyParts(this.visibleParts(kind, change));
      const [min, max] = extentOf(group, shown);
      let pivot: number;
      let pivotFrom: number | undefined;
      let facingStart: 1 | -1 = 1;
      let facingEnd: 1 | -1 = 1;
      const time = elapsed(change);
      const previous = this.shapes[this.shapes.length - 1];
      const keptElsewhere = this.keptElsewhere(
        previous?.change,
        change,
        time,
        changes,
        elapsed,
        leftBehind,
        leftBehindTime,
      );
      if (STACK_KINDS.has(kind) && change.layout === 'launch') {
        // On its launch vehicle: the bottom of the stack sits on the path (on the pad at liftoff).
        pivot = min;
      } else if (kind === 'stack') {
        // The middle of the lunar module and the turned-around command and service module, once docked.
        pivot = (STACK.lmBase + STACK.lmBase + LM.tunnelTop + CSM.tunnelTop - CSM.bellExit) / 2;
        facingStart = change.layout === 'transposition' ? 1 : -1;
        facingEnd = -1;
      } else if (kind === 'lm') {
        pivot = change.parts.includes('lm-descent-stage') ? 0 : LM.descentTop;
        // An ascent stage that lifts off from a descent stage left on the surface starts where it sat, on top of it.
        if (
          !change.parts.includes('lm-descent-stage') &&
          keptElsewhere.has('lm-descent-stage') &&
          previous?.kind === 'lm'
        )
          pivotFrom = 0;
      } else if (kind === 'cm' || kind === 'gemini-reentry') {
        // Heat shield first, its base on the path (on the water at splashdown).
        pivot = 0;
        facingStart = -1;
        facingEnd = -1;
      } else if (kind === 'gemini-docked') {
        // The Gemini's own middle, so it does not jump as it docks or undocks.
        const [gMin, gMax] = extentOf(group, GEMINI_PARTS);
        pivot = (gMin + gMax) / 2;
      } else if (kind === 'none') {
        pivot = 0;
      } else {
        pivot = (min + max) / 2;
      }
      if (backward) {
        facingStart = -1;
        facingEnd = -1;
      }

      const anchor = this.anchorOf(kind, change, group, pivot);
      // Off its launch vehicle: start where the spacecraft was on top of it, then settle.
      if (
        previous &&
        (previous.kind === 'titan' || previous.kind === 'atlas') &&
        previous.group !== group &&
        previous.anchor !== undefined &&
        anchor !== undefined &&
        previous.facingEnd === facingStart
      ) {
        pivotFrom = pivot + anchor - previous.anchor;
      }

      this.shapes.push({
        change,
        time,
        kind,
        group,
        parts,
        partList: [...parts.values()],
        pivot,
        pivotFrom,
        anchor,
        facingStart,
        facingEnd,
        length: Math.max(1, max - min),
        middle: (min + max) / 2 - pivot,
        low: min - pivot,
        high: max - pivot,
        keptElsewhere,
        ...this.capSizes(group, change, kind, pivot),
        fullReach: sizeOf(group, this.visibleParts(kind, change), pivot).reach,
        walkerFocus: this.walkerFocusOf(group, kind, change, pivot),
      });
    }
  }

  /** The open hatches' own materials in a group. */
  private hatchLooks(group: Group): HatchLook[] {
    const looks: HatchLook[] = [];
    group.traverse((child) => {
      const look = child.userData['hatchLook'] as HatchLook | undefined;
      if (look) looks.push(look);
    });
    return looks;
  }

  /**
   * Where a close-up of a spacewalk centers, and how far it reaches: around
   * the point halfway from the craft's point on the path to the figure,
   * far enough for the figure and the hatch, and for the whole craft up to
   * WALK_FOCUS_REACH meters (a long docked stack is then framed around the
   * spacewalker rather than whole).
   */
  private walkerFocusOf(
    group: Group,
    kind: Kind,
    change: VehicleChange,
    pivot: number,
  ): Shape['walkerFocus'] {
    const walker = group.getObjectByName(
      change.parts.includes('standup-spacewalker') ? 'standup-spacewalker' : 'spacewalker',
    );
    const figure = walker?.children[0];
    if (!figure) return undefined;
    group.updateMatrixWorld(true);
    const inverse = new Matrix4().copy(group.matrixWorld).invert();
    const at = new Vector3().setFromMatrixPosition(figure.matrixWorld).applyMatrix4(inverse);
    at.y -= pivot;
    const center = at.clone().multiplyScalar(0.5);
    const names = [...this.visibleParts(kind, change), walker?.name ?? 'spacewalker'];
    let reach = 0;
    const point = new Vector3();
    for (const name of names) {
      group.getObjectByName(name)?.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const position = (child.geometry as BufferGeometry).getAttribute('position');
        for (let i = 0; i < position.count; i += 1) {
          point
            .fromBufferAttribute(position, i)
            .applyMatrix4(child.matrixWorld)
            .applyMatrix4(inverse);
          point.y -= pivot;
          reach = Math.max(reach, point.distanceTo(center));
        }
      });
    }
    // The side to turn toward the camera: the figure's own, or WALKER_VIEW_LIFT on from it (see there).
    const lift = (walker?.userData['viewLift'] as number | undefined) ?? 0;
    const side =
      Math.hypot(center.x, center.z) < 1e-6 ? Number.NaN : Math.atan2(center.x, center.z) + lift;
    return {
      center,
      side,
      reach: Math.max(at.distanceTo(center) + 1.2, Math.min(reach, WALK_FOCUS_REACH)),
    };
  }

  /** The spacewalkers' own materials in a group. */
  private walkerLooks(group: Group): WalkerLook[] {
    const looks: WalkerLook[] = [];
    group.traverse((child) => {
      const look = child.userData['look'] as WalkerLook | undefined;
      if (look) looks.push(look);
    });
    return looks;
  }

  /**
   * Parts of the shape before (`before`) that leave the ship at this change
   * without falling away: another ship lists them at the same moment (the
   * lunar module undocking, a spent stage that flies on as a target), or
   * they are left behind on the surface then.
   */
  private keptElsewhere(
    before: VehicleChange | undefined,
    change: VehicleChange,
    time: number,
    changes: readonly VehicleChange[],
    elapsed: (change: VehicleChange) => number,
    leftBehind: readonly LeftBehind[],
    leftBehindTime: (item: LeftBehind) => number,
  ): Set<VehiclePart> {
    const kept = new Set<VehiclePart>();
    if (!before) return kept;
    for (const name of before.parts) {
      if (change.parts.includes(name)) continue;
      const handedOver = changes.some(
        (other) =>
          other.ship !== change.ship &&
          other.parts.includes(name) &&
          Math.abs(elapsed(other) - time) <= 1,
      );
      const left = leftBehind.some(
        (item) =>
          item.ship === change.ship &&
          item.part === name &&
          Math.abs(leftBehindTime(item) - time) <= 1,
      );
      if (handedOver || left) kept.add(name);
    }
    return kept;
  }

  /** The main body's fixed point (see Shape.anchor) for a shape, relative to its pivot. */
  private anchorOf(
    kind: Kind,
    change: VehicleChange,
    group: Group,
    pivot: number,
  ): number | undefined {
    const has = (name: VehiclePart): boolean => change.parts.includes(name);
    if (has('command-module')) {
      if (kind === 'stack')
        return this.stackCmBase(change.layout, 1, hasLunarModule(change)) - pivot;
      if (kind === 'cm') return 0;
      return (axisPoint(group, 'command-module', CSM.smTop) ?? CSM.smTop) - pivot;
    }
    if (kind === 'lm' && has('lm-ascent-stage')) return LM.descentTop - pivot;
    // Gemini: the heat shield; the Agena: its engine exit; the ATDA and a stage: their aft ends. Measured on the model as built.
    const at = has('gemini-reentry-module')
      ? axisPoint(group, 'gemini-reentry-module', GEMINI.retroTop)
      : has('agena')
        ? axisPoint(group, 'agena', 0)
        : has('atda')
          ? axisPoint(group, 'atda', 0)
          : has('third-stage')
            ? axisPoint(group, 'third-stage', STACK.thirdStageBottom)
            : undefined;
    return at === undefined ? undefined : at - pivot;
  }

  /** Largest side and reach from the pivot, parachutes included (the turning-around CSM reaches farther). */
  private capSizes(group: Group, change: VehicleChange, kind: Kind, pivot: number): PartsSize {
    const all = this.visibleParts(kind, change).filter(
      (name) => !NOT_SIZED.has(name as VehiclePart),
    );
    const size = sizeOf(group, all, pivot);
    if (change.layout === 'transposition') {
      size.largest += TRANSPOSITION_APART;
      size.reach += TRANSPOSITION_APART;
    }
    return size;
  }

  /** Where the command module's base is in stack coordinates, for a layout at transposition progress p. */
  private stackCmBase(layout: VehicleLayout, p: number, docks = true): number {
    if (layout === 'launch') return STACK.csmBase + CSM.smTop;
    const { center, angle } = this.transposition(layout === 'transposition' ? p : 1, docks);
    return center + Math.cos(angle) * (CSM.smTop - CSM.center);
  }

  /**
   * The command and service module's middle (stack coordinates) and pitch
   * during transposition, for progress p: it backs off, turns around, and
   * closes in to dock with the lunar module. With nothing to dock to
   * (`docks` false: Apollo 8, which carried no lunar module), it stays
   * backed off, turned to face the stage.
   */
  private transposition(p: number, docks = true): TranspositionPose {
    const start = STACK.csmBase + CSM.center;
    const apart = start + TRANSPOSITION_APART;
    const docked = STACK.lmBase + LM.tunnelTop + (CSM.tunnelTop - CSM.center);
    let center: number;
    if (p < 0.3) center = start + (apart - start) * ease(p / 0.3);
    else if (p < 0.7 || !docks) center = apart;
    else center = apart + (docked - apart) * ease((p - 0.7) / 0.3);
    return { center, angle: Math.PI * ease((p - 0.3) / 0.4) };
  }

  /** Whether a part is hidden in this shape although listed (the lunar module rides inside the adapter at launch). */
  private hiddenInside(kind: Kind, change: VehicleChange, name: string): boolean {
    return (
      kind === 'stack' && change.layout === 'launch' && LUNAR_MODULE_PARTS.has(name as VehiclePart)
    );
  }

  /** The named parts to show for a change. */
  private visibleParts(kind: Kind, change: VehicleChange): string[] {
    return change.parts.filter((name) => !this.hiddenInside(kind, change, name));
  }

  /** Index of the shape in force at mission time t, or -1 before the first. */
  shapeAt(time: number): number {
    let found = -1;
    for (let i = 0; i < this.shapes.length; i += 1) {
      if ((this.shapes[i] as Shape).time <= time + 1e-6) found = i;
    }
    return found;
  }

  /** How many shapes the ship has, and facts about one, for pairing two ships that dock. */
  get shapeCount(): number {
    return this.shapes.length;
  }

  shapeTime(index: number): number {
    return this.shapes[index]?.time ?? Number.NaN;
  }

  shapeParts(index: number): readonly VehiclePart[] {
    return this.shapes[index]?.change.parts ?? [];
  }

  shapeLayout(index: number): VehicleLayout | undefined {
    return this.shapes[index]?.change.layout;
  }

  /** Where the middle of the named parts sits along the model's long axis, relative to the point on the path, in meters. */
  partsMiddle(index: number, names: readonly string[]): number | undefined {
    const shape = this.shapes[index];
    if (!shape || !names.some((name) => shape.parts.has(name))) return undefined;
    const [min, max] = extentOf(shape.group, names);
    return (min + max) / 2 - shape.pivot;
  }

  /** The middle of a shape's visible body relative to its point on the path, in meters. */
  shapeMiddle(index: number): number {
    return this.shapes[index]?.middle ?? 0;
  }

  /** Length of a shape's visible body, in meters. */
  shapeLength(index: number): number {
    return this.shapes[index]?.length ?? 0;
  }

  /** The end of a shape that meets a craft keeping station with it (see ShipFace). */
  faceOf(index: number): ShipFace {
    const shape = this.shapes[index];
    if (!shape) return { axis: 'forward', sign: 1, distance: 0 };
    if (shape.kind === 'lm') return { axis: 'up', sign: 1, distance: Math.max(0, shape.high) };
    const sign = shape.facingEnd;
    return { axis: 'forward', sign, distance: Math.max(0, sign > 0 ? shape.high : -shape.low) };
  }

  /** True when a shape has a spacewalker out. */
  hasWalker(index: number): boolean {
    const parts = this.shapes[index]?.change.parts;
    return (
      parts !== undefined &&
      (parts.includes('spacewalker') || parts.includes('standup-spacewalker'))
    );
  }

  /**
   * Which side of the craft the ship view turns toward the camera during a
   * spacewalk, around its long axis: an angle in radians from its top (+Z)
   * toward its right (+X), or NaN when the shape has no spacewalker. It is
   * WALKER_VIEW_LIFT on from the side the figure is on (Gemini's and the
   * command module's are on top), so the figure is drawn above the craft;
   * for the figure on the lunar module's porch (underneath on a docked
   * Apollo stack) it is the porch's own side.
   */
  walkerSide(index: number): number {
    return this.shapes[index]?.walkerFocus?.side ?? Number.NaN;
  }

  /** Meters per CSS pixel at which a spacewalk close-up (see walkerFocusOf) reaches `pixels` around its middle. */
  closeUpMetersPerPixel(index: number, pixels: number): number {
    const shape = this.shapes[index];
    if (!shape || pixels <= 0) return 0;
    return (shape.walkerFocus?.reach ?? shape.fullReach) / pixels;
  }

  /** Meters per CSS pixel that shape would be drawn at in this context (0 when it cannot be drawn). */
  metersPerPixelOf(index: number, context: PoseContext): number {
    const shape = this.shapes[index];
    if (!shape) return 0;
    const targetPixels =
      SHIP_SIZE_PX * context.sizeScale * Math.pow(shape.length / REFERENCE_LENGTH, SIZE_EXPONENT);
    const pixelsPerMeter = Math.min(
      targetPixels / shape.length,
      context.maxPixels / shape.largest,
      context.maxReachPixels / shape.reach,
    );
    return pixelsPerMeter > 0 ? 1 / pixelsPerMeter : 0;
  }

  /**
   * The model's turn from cited motions, in radians: a roll about its long
   * axis and a tumble across it. A motion runs in story time from its change
   * until the next one, at the cited rate per story second (changing evenly
   * to `rateTo` over that stretch when given), so playing at normal speed
   * shows the true rate. When it stops, the model settles back square over a
   * moment. Under reduced motion every turn is slow and steady.
   */
  private motionAt(
    index: number,
    context: PoseContext,
    out: { roll: number; tumble: number },
  ): void {
    let roll = 0;
    let tumble = 0;
    const limit = (degrees: number): number => {
      const rate = MathUtils.degToRad(degrees);
      return context.reducedMotion
        ? Math.sign(rate) * Math.min(Math.abs(rate), MathUtils.degToRad(REDUCED_MOTION_TURN_DEG))
        : rate;
    };
    for (let j = 0; j <= index; j += 1) {
      const shape = this.shapes[j] as Shape;
      const from = context.toStory(shape.time);
      const next = this.shapes[j + 1];
      const end = next ? context.toStory(next.time) : Infinity;
      const to = j < index ? end : context.storyTime;
      const span = Math.max(0, to - from);
      const length = Math.max(span, end - from);
      let rolled = 0;
      let tumbled = 0;
      let rolling = false;
      let tumbling = false;
      for (const motion of shape.change.motion ?? []) {
        const start = limit(motion.rate.value);
        const finish = motion.rateTo ? limit(motion.rateTo.value) : start;
        // The angle turned: the rate changes evenly from start to finish over the whole stretch.
        const angle =
          start * span +
          (Number.isFinite(length) && length > 0
            ? ((finish - start) * span * span) / (2 * length)
            : 0);
        if (motion.kind === 'roll') {
          rolled += angle;
          rolling = true;
        } else {
          tumbled += angle;
          tumbling = true;
        }
      }
      roll = rolling ? roll + rolled : this.settleTurn(roll, span);
      tumble = tumbling ? tumble + tumbled : this.settleTurn(tumble, span);
    }
    out.roll = roll;
    out.tumble = tumble;
  }

  /** A turn left over when a motion stops, easing back to square over DROP_STORY_SECONDS. */
  private settleTurn(angle: number, span: number): number {
    if (angle === 0 || span >= DROP_STORY_SECONDS) return 0;
    return wrapAngle(angle) * (1 - ease(span / DROP_STORY_SECONDS));
  }

  private readonly turn = { roll: 0, tumble: 0 };
  /** The extra turn made while the clock was stopped, and its rate now (radians, radians per second). */
  private readonly idle = { roll: 0, tumble: 0 };
  private readonly idleRate = { roll: 0, tumble: 0 };
  private lastStoryTime = Number.NaN;
  private turningNow = false;
  private walkerMoving = false;

  /** True while the model turns, a spacewalker fades, a parachute opens, a dropped part drifts off, or the model eases to a new size or turn with the clock stopped, so the scene must keep drawing. */
  get idleTurning(): boolean {
    return (
      this.turningNow || this.walkerMoving || this.chutesMoving || this.dropMoving || this.settling
    );
  }

  /**
   * The rate of each kind of turn now, and the rate it is heading for: the
   * stretch's `rateTo` when that is faster, otherwise the rate now (radians
   * per second, capped under reduced motion). NaN when there is no such turn.
   */
  private ratesAt(
    index: number,
    context: PoseContext,
    out: { roll: [number, number]; tumble: [number, number] },
  ): void {
    out.roll[0] = out.roll[1] = Number.NaN;
    out.tumble[0] = out.tumble[1] = Number.NaN;
    const shape = this.shapes[index];
    if (!shape) return;
    const limit = (degrees: number): number => {
      const rate = MathUtils.degToRad(degrees);
      return context.reducedMotion
        ? Math.sign(rate) * Math.min(Math.abs(rate), MathUtils.degToRad(REDUCED_MOTION_TURN_DEG))
        : rate;
    };
    const from = context.toStory(shape.time);
    const next = this.shapes[index + 1];
    const length = next ? context.toStory(next.time) - from : Infinity;
    const progress =
      Number.isFinite(length) && length > 0
        ? MathUtils.clamp((context.storyTime - from) / length, 0, 1)
        : 0;
    for (const motion of shape.change.motion ?? []) {
      const start = limit(motion.rate.value);
      const finish = motion.rateTo ? limit(motion.rateTo.value) : start;
      const now = start + (finish - start) * progress;
      const heading = Math.abs(finish) > Math.abs(now) ? finish : now;
      const slot = motion.kind === 'roll' ? out.roll : out.tumble;
      slot[0] = (Number.isNaN(slot[0]) ? 0 : slot[0]) + now;
      slot[1] = (Number.isNaN(slot[1]) ? 0 : slot[1]) + heading;
    }
  }

  private readonly rates = { roll: [0, 0] as [number, number], tumble: [0, 0] as [number, number] };

  /**
   * Keep a turning craft turning while the clock is stopped (at a tour stop,
   * or paused), in real time at the rate in force, easing up to a faster
   * rate it was heading for. The turn made while stopped stays on as an
   * offset when the clock runs again, fades out when the craft stops
   * turning, and is dropped on a jump in time.
   */
  private updateIdle(index: number, context: PoseContext): void {
    const advancing = context.storyTime !== this.lastStoryTime;
    this.lastStoryTime = context.storyTime;
    this.turningNow = false;
    if (context.snap) {
      this.idle.roll = this.idle.tumble = 0;
      this.idleRate.roll = this.idleRate.tumble = 0;
      return;
    }
    this.ratesAt(index, context, this.rates);
    for (const kind of ['roll', 'tumble'] as const) {
      const [now, heading] = this.rates[kind];
      if (Number.isNaN(now)) {
        this.idle[kind] =
          this.idle[kind] === 0
            ? 0
            : wrapAngle(this.idle[kind]) * Math.exp(-context.dt / IDLE_SETTLE_SECONDS);
        if (Math.abs(this.idle[kind]) < 1e-4) this.idle[kind] = 0;
        else this.turningNow = true;
        this.idleRate[kind] = 0;
        continue;
      }
      if (advancing) {
        this.idleRate[kind] = now;
        continue;
      }
      this.idleRate[kind] +=
        (heading - this.idleRate[kind]) * (1 - Math.exp(-context.dt / IDLE_SPEED_UP_SECONDS));
      this.idle[kind] = wrapAngle(this.idle[kind] + this.idleRate[kind] * context.dt);
      if (this.idleRate[kind] !== 0) this.turningNow = true;
    }
  }

  /** Pose the model for this frame. Returns false when nothing is drawn. */
  update(pose: ShipPose, context: PoseContext): boolean {
    const index = pose.exists ? this.shapeAt(context.time) : -1;
    const shape = index >= 0 ? this.shapes[index] : undefined;
    if (
      !shape ||
      shape.change.parts.length === 0 ||
      context.unitsPerPixel <= 0 ||
      context.opacity <= 0.005
    ) {
      this.root.visible = false;
      this.halo.visible = false;
      this.lastShape = -1;
      this.turningNow = false;
      this.walkerMoving = false;
      this.chutesMoving = false;
      this.dropMoving = false;
      this.settling = false;
      return false;
    }
    // Not drawn last frame: everything is put where it is now rather than eased there.
    const fresh = this.lastShape < 0;
    this.root.visible = true;
    this.halo.visible = true;
    this.fader.set(context.opacity);
    this.fade = Math.min(1, context.opacity);
    (this.halo.material as SpriteMaterial).opacity =
      this.haloOpacity * Math.min(1, context.opacity) * context.glow;

    const previous = index > 0 ? this.shapes[index - 1] : undefined;
    const sinceStory = context.storyTime - context.toStory(shape.time);
    const since = sinceStory / DROP_STORY_SECONDS;
    const u = ease(since);
    const turnedFor = sinceStory / TURN_AROUND_STORY_SECONDS;

    // Show only the active group (and the previous one while its parts fall away).
    for (let i = 0; i < this.groups.length; i += 1) {
      const group = this.groups[i] as Group;
      group.visible = group === shape.group;
    }
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    if (shape.group.parent !== this.body) this.body.add(shape.group);
    this.showParts(shape, context);
    this.updateWalker(shape, context);
    this.showSpecials(shape, shape.change.parts);
    this.openChutes(shape, context, fresh);

    // Turning around (the main body's nose changes ends).
    const turning =
      previous !== undefined &&
      turnedFor >= 0 &&
      turnedFor < 1 &&
      previous.facingEnd !== shape.facingStart;
    // Shapes built turned about Z (see endFor) turn around that way; the rest about X.
    if (turning) {
      const turned = Math.PI * (1 - ease(turnedFor));
      if (TURN_ABOUT_Z.has(shape.kind)) this.body.rotation.z = turned;
      else this.body.rotation.x = turned;
    }

    // Parts that came off fall away, and the pivot settles from where it
    // was to where it now is. Changes can overlap: the first stage, the
    // interstage, and the tower come off within seconds of each other.
    let pivot = shape.pivot;
    this.trail.visible = false;
    this.dropMoving = false;
    // Changes the clock has just played past start their drops from the start (see DROP_MIN_SECONDS).
    if (!fresh && !context.snap) {
      for (let k = this.lastShape + 1; k <= index; k += 1)
        (this.shapes[k] as Shape).missionDrop = 0;
    }
    let droppedFrom: Shape | undefined;
    let dropped = this.dropProgress;
    for (let k = index; k > 0; k -= 1) {
      const later = this.shapes[k] as Shape;
      const earlier = this.shapes[k - 1] as Shape;
      const progress = this.dropAt(later, context, fresh);
      if (progress.done < 0 || progress.done >= 1) break;
      if (earlier.group === shape.group && later.group === shape.group) {
        pivot -= (later.pivot - earlier.pivot) * (1 - ease(progress.done));
        this.dropWithinStack(earlier, later, shape, progress);
      } else {
        if (k === index) {
          droppedFrom = earlier;
          dropped = progress;
        }
        break;
      }
    }
    if (shape.pivotFrom !== undefined && since >= 0 && since < 1) {
      pivot = shape.pivotFrom + (pivot - shape.pivotFrom) * u;
    }
    shape.group.position.y = -pivot;
    // A spacewalk close-up centers between the craft and the figure.
    const focus = shape.walkerFocus;
    if (focus && context.focus > 0)
      this.spin.position.copy(focus.center).multiplyScalar(-context.focus);
    else this.spin.position.set(0, 0, 0);
    if (droppedFrom) this.showDropped(droppedFrom, shape, dropped, turning, pivot);

    // Place and turn the root.
    this.root.position.copy(pose.position);
    if (shape.kind === 'lm') {
      // Upright over the Moon, facing the way it travels.
      _y.copy(pose.up);
      _z.copy(pose.forward).addScaledVector(_y, -pose.forward.dot(_y));
    } else {
      _y.copy(pose.forward);
      _z.copy(pose.up).addScaledVector(_y, -pose.up.dot(_y));
    }
    if (_z.lengthSq() < 1e-6) {
      _z.copy(this.lastSide).addScaledVector(_y, -this.lastSide.dot(_y));
      if (_z.lengthSq() < 1e-6) _z.set(1, 0, 0).addScaledVector(_y, -_y.x);
      if (_z.lengthSq() < 1e-6) _z.set(0, 0, 1).addScaledVector(_y, -_y.z);
    }
    _z.normalize();
    this.lastSide.copy(_z);
    _x.crossVectors(_y, _z).normalize();
    _basis.makeBasis(_x, _y, _z);
    _q.setFromRotationMatrix(_basis);
    this.turnTo(_q, context, fresh);
    this.root.quaternion.copy(this.drawnTurn);

    // A cited roll (about the long axis) or tumble (end over end), plus any turn made while the clock was stopped.
    this.motionAt(index, context, this.turn);
    this.updateIdle(index, context);
    const roll = this.turn.roll + this.idle.roll;
    const tumble = this.turn.tumble + this.idle.tumble;
    if (roll === 0 && tumble === 0) this.spin.quaternion.identity();
    else {
      this.spin.quaternion.setFromAxisAngle(_axisX, tumble);
      this.spin.quaternion.multiply(_qRoll.setFromAxisAngle(_axisY, roll));
    }

    // Apparent size: steady on screen, a little bigger for bigger stacks.
    const own = this.metersPerPixelOf(index, context);
    const wanted = context.metersPerPixel > 0 ? context.metersPerPixel : own;
    if (context.snap || this.lastShape < 0 || this.metersPerPixel <= 0)
      this.metersPerPixel = wanted;
    else {
      const k = 1 - Math.exp(-context.dt / SIZE_SMOOTHING_SECONDS);
      this.metersPerPixel += (wanted - this.metersPerPixel) * k;
    }
    this.lastShape = index;
    const scale = context.unitsPerPixel / this.metersPerPixel;
    this.root.scale.setScalar(scale);

    // The halo sits behind the middle of the model, and changes size with it as its shape changes.
    _y.multiplyScalar(shape.middle * scale);
    this.halo.position.copy(pose.position).add(_y);
    const haloPixels = Math.max(30, (shape.length / this.metersPerPixel) * 0.9 + 18);
    if (context.snap || fresh || this.haloPixels <= 0) this.haloPixels = haloPixels;
    else
      this.haloPixels +=
        (haloPixels - this.haloPixels) * (1 - Math.exp(-context.dt / SIZE_SMOOTHING_SECONDS));
    this.halo.scale.setScalar(this.haloPixels * context.unitsPerPixel);
    // Still easing to its size, its glow's, or its path's turn: with the clock stopped (at a
    // tour stop it has just settled onto) the scene keeps drawing until it gets there.
    this.settling =
      Math.abs(wanted - this.metersPerPixel) > 0.002 * wanted ||
      Math.abs(haloPixels - this.haloPixels) > 0.25 ||
      this.drawnTurn.angleTo(this.pathTurn) > 1e-3;
    return true;
  }

  /**
   * Turn the model toward the turn its path asks for (`wanted`): a steady
   * turn is followed exactly, a sudden one (see SUDDEN_TURN_DEG) eases over
   * TURN_EASE_SECONDS. At once when the model was not drawn last frame, on a
   * jump in time, and under reduced motion.
   */
  private turnTo(wanted: Quaternion, context: PoseContext, fresh: boolean): void {
    if (fresh || context.snap || context.reducedMotion) {
      this.drawnTurn.copy(wanted);
    } else {
      // How far the path turned since the last frame, in the world's frame.
      _qStep.copy(this.pathTurn).invert().premultiply(wanted);
      const step = 2 * Math.acos(Math.min(1, Math.abs(_qStep.w)));
      const sudden = MathUtils.degToRad(
        Math.max(SUDDEN_TURN_DEG, SUDDEN_TURN_DEG_PER_S * context.dt),
      );
      if (step <= sudden) this.drawnTurn.premultiply(_qStep);
      this.drawnTurn.slerp(wanted, 1 - Math.exp(-context.dt / TURN_EASE_SECONDS));
    }
    this.pathTurn.copy(wanted);
  }

  /**
   * Parachutes open over CHUTE_OPEN_SECONDS of real time, growing out from
   * the capsule's apex; a drogue let go (the mains replace it) drifts off and
   * shrinks away. At once when the model was not drawn last frame, on a jump
   * in time, and under reduced motion.
   */
  private openChutes(shape: Shape, context: PoseContext, fresh: boolean): void {
    this.chutesMoving = false;
    const snap = fresh || context.snap || context.reducedMotion;
    for (const name of CHUTES) {
      const node = shape.parts.get(name);
      if (!node) continue;
      const wanted = node.visible ? 1 : 0;
      let level = this.chuteLevels.get(name) ?? wanted;
      const step = context.dt / CHUTE_OPEN_SECONDS;
      if (snap) level = wanted;
      else if (level < wanted) level = Math.min(wanted, level + step);
      else level = Math.max(wanted, level - step);
      this.chuteLevels.set(name, level);
      if (level !== wanted) this.chutesMoving = true;
      if (level >= 1 && wanted === 1) continue;
      node.visible = level > 0.01;
      if (!node.visible) continue;
      const e = ease(level);
      const opening = wanted === 1;
      // Grown about the apex, where the lines meet, so it comes out of the capsule.
      const size = opening ? 0.15 + 0.85 * e : 0.4 + 0.6 * e;
      const apex = (node.userData['apex'] as number | undefined) ?? 0;
      const rest = node.userData['restY'] as number;
      node.scale.setScalar((node.userData['restScale'] as number) * size);
      node.position.y = rest + apex * (1 - size) + (opening ? 0 : (1 - e) * CHUTE_RELEASE_DRIFT);
    }
  }

  /** The meters per CSS pixel the model was last drawn at. */
  get drawnMetersPerPixel(): number {
    return this.metersPerPixel;
  }

  /** Put every named node of a shape back at rest, showing the listed parts. */
  private showParts(shape: Shape, context: PoseContext): void {
    const shown = shape.change.parts;
    for (let i = 0; i < shape.partList.length; i += 1) {
      const node = shape.partList[i] as Group;
      const name = node.name;
      if (SPECIALS.has(name)) continue;
      node.position.y = node.userData['restY'] as number;
      node.position.x = 0;
      node.scale.setScalar(node.userData['restScale'] as number);
      node.rotation.x = node.userData['restRotation'] as number;
      if (WRAPPERS.has(name)) {
        node.visible = true;
        continue;
      }
      node.visible =
        shown.includes(name as VehiclePart) && !this.hiddenInside(shape.kind, shape.change, name);
    }
    if (shape.kind === 'stack' && shape.change.layout !== 'launch') {
      // Transposition: the command and service module backs off, turns around, and docks.
      const csm = shape.parts.get('csm');
      if (csm) {
        const next = this.shapes[this.shapes.indexOf(shape) + 1];
        let p = 1;
        if (shape.change.layout === 'transposition' && next) {
          const a = context.toStory(shape.time);
          const b = context.toStory(next.time);
          p = b > a ? (context.storyTime - a) / (b - a) : 1;
        }
        const { center, angle } = this.transposition(
          Math.min(1, Math.max(0, p)),
          hasLunarModule(shape.change),
        );
        csm.position.y = center;
        csm.rotation.x = angle;
      }
    }
  }

  /**
   * A spacewalker fades in and out (in real time, at once on a jump), and
   * the Gemini's right-hand hatch swings open with it.
   */
  private updateWalker(shape: Shape, context: PoseContext): void {
    const parts = shape.change.parts;
    const walker = parts.includes('spacewalker') ? 1 : 0;
    // The gas gun goes with the spacewalker: kept while it fades out.
    if (walker === 1) this.walkerGun = parts.includes('gas-gun');
    const standing = parts.includes('standup-spacewalker') ? 1 : 0;
    const hatch = walker === 1 || standing === 1 || parts.includes('open-hatch') ? 1 : 0;
    const k =
      context.snap || context.reducedMotion ? 1 : 1 - Math.exp(-context.dt / WALKER_FADE_SECONDS);
    this.walkerLevel += (walker - this.walkerLevel) * k;
    this.standLevel += (standing - this.standLevel) * k;
    this.hatchLevel += (hatch - this.hatchLevel) * k;
    if (Math.abs(this.walkerLevel - walker) < 0.004) this.walkerLevel = walker;
    if (Math.abs(this.standLevel - standing) < 0.004) this.standLevel = standing;
    if (Math.abs(this.hatchLevel - hatch) < 0.004) this.hatchLevel = hatch;
    this.walkerMoving =
      this.walkerLevel !== walker || this.standLevel !== standing || this.hatchLevel !== hatch;
  }

  /** Nodes that follow the listed parts in their own ways (`parts`: the parts of the shape they belong to). */
  private showSpecials(shape: Shape, parts: readonly VehiclePart[]): void {
    const boom = shape.parts.get(AGENA_BOOM);
    // Out only once the nose shroud is off.
    if (boom) boom.visible = !parts.includes('agena-shroud');
    const agenaAdapter = shape.parts.get(ATLAS_AGENA_ADAPTER);
    if (agenaAdapter) agenaAdapter.visible = !parts.includes('atda');
    const atdaAdapter = shape.parts.get(ATLAS_ATDA_ADAPTER);
    if (atdaAdapter) atdaAdapter.visible = parts.includes('atda');
    const level = ease(this.walkerLevel) * this.fade;
    const fadeFigure = (name: string, shown: number): void => {
      const node = shape.parts.get(name);
      if (!node) return;
      node.visible = shown > 0.01;
      const look = node.userData['look'] as WalkerLook | undefined;
      if (!look) return;
      const opaque = shown > 0.995;
      for (const material of walkerMaterials(look)) {
        material.opacity = shown;
        if (material.depthWrite !== opaque) material.depthWrite = opaque;
      }
    };
    fadeFigure('spacewalker', level);
    fadeFigure('standup-spacewalker', ease(this.standLevel) * this.fade);
    const gun = shape.parts.get(GAS_GUN);
    if (gun) holdGasGun(gun, this.walkerGun);
    const open = ease(this.hatchLevel);
    const hatch = shape.parts.get(GEMINI_RIGHT_HATCH);
    const axis = hatch?.userData['axis'] as Vector3 | undefined;
    if (hatch && axis) hatch.quaternion.setFromAxisAngle(axis, HATCH_OPEN_RAD * open);
    const apolloHatch = shape.parts.get(APOLLO_HATCH);
    const hatchLook = apolloHatch?.userData['hatchLook'] as HatchLook | undefined;
    if (apolloHatch && hatchLook) {
      const shown = open * this.fade;
      apolloHatch.visible = shown > 0.01;
      for (const material of [hatchLook.opening, hatchLook.door]) {
        material.opacity = shown;
        material.depthWrite = shown > 0.995;
      }
    }
  }

  private readonly dropProgress = { done: 0, drift: 0 };

  /**
   * How far parts dropped at a shape's change have gone: `done` 0 to 1 (gone
   * at 1) and `drift`, the share of the drift distance, by story time
   * (speeding up, as before) or by mission time (steady), whichever is
   * further along. Played on, the drop by mission time goes no faster than
   * over DROP_MIN_SECONDS of real time (at once when the model was not drawn
   * last frame, or on a jump in time).
   */
  private dropAt(
    shape: Shape,
    context: PoseContext,
    fresh: boolean,
  ): { done: number; drift: number } {
    const story = (context.storyTime - context.toStory(shape.time)) / DROP_STORY_SECONDS;
    let mission = (context.time - shape.time) / DROP_MISSION_SECONDS;
    const shown = shape.missionDrop;
    if (!fresh && !context.snap && shown !== undefined && mission > shown && shown < 1) {
      const most = shown + context.dt / DROP_MIN_SECONDS;
      if (mission > most && most > story) this.dropMoving = true;
      mission = Math.min(mission, most);
    }
    shape.missionDrop = mission;
    const out = this.dropProgress;
    out.done = Math.max(story, mission);
    out.drift = Math.max(story > 0 ? story * story : story, mission);
    return out;
  }

  /** The parts of `previous` that fall away at the change to `next` (not kept by another ship or left behind). */
  private droppedAt(previous: Shape, next: Shape, out: VehiclePart[]): VehiclePart[] {
    out.length = 0;
    const parts = previous.change.parts;
    const gone = (name: VehiclePart): boolean =>
      !next.change.parts.includes(name) && !next.keptElsewhere.has(name);
    for (let i = 0; i < parts.length; i += 1) {
      const name = parts[i] as VehiclePart;
      if (!gone(name)) continue;
      const base = RIDES_WITH.get(name);
      if (
        DROPPABLE.has(name) ||
        (base !== undefined && parts.includes(base) && gone(base) && DROPPABLE.has(base))
      )
        out.push(name);
    }
    return out;
  }

  /** Within the launch stack: parts that came off drift away (stages back, the tower forward). */
  private dropWithinStack(
    previous: Shape,
    next: Shape,
    shape: Shape,
    progress: { done: number; drift: number },
  ): void {
    const since = progress.done;
    const dropped = this.droppedAt(previous, next, this.dropped);
    for (let i = 0; i < dropped.length; i += 1) {
      const name = dropped[i] as VehiclePart;
      const node = shape.parts.get(name);
      if (!node) continue;
      node.visible = !this.hiddenInside(shape.kind, previous.change, name);
      const rest = node.userData['restY'] as number;
      const distance = 3 + 40 * progress.drift;
      const forward = DROPS_FORWARD.has(name);
      node.position.y = rest + (forward ? distance * 0.8 : -distance);
      if (forward) node.position.x = since * 6;
      node.scale.setScalar((1 - 0.35 * since) * dropShrink(since));
    }
  }

  /** Between different models: show the previous model's dropped parts, lined up, drifting away. */
  private showDropped(
    previous: Shape,
    shape: Shape,
    progress: { done: number; drift: number },
    turning: boolean,
    pivotNow: number,
  ): void {
    const since = progress.done;
    const dropped = this.droppedAt(previous, shape, this.dropped);
    if (dropped.length === 0 || previous.anchor === undefined || shape.anchor === undefined) return;

    const group = previous.group;
    if (group.parent !== this.trail) this.trail.add(group);
    group.visible = true;
    this.trail.visible = true;
    for (let i = 0; i < previous.partList.length; i += 1) {
      const node = previous.partList[i] as Group;
      const name = node.name;
      if (SPECIALS.has(name)) continue;
      node.position.y = node.userData['restY'] as number;
      node.position.x = 0;
      node.scale.setScalar(node.userData['restScale'] as number);
      node.rotation.x = node.userData['restRotation'] as number;
      if (WRAPPERS.has(name)) {
        node.visible = true;
        continue;
      }
      node.visible = dropped.includes(name as VehiclePart);
    }
    this.showSpecials(previous, previous.change.parts);
    for (const name of ['spacewalker', 'standup-spacewalker']) {
      const figure = previous.parts.get(name);
      if (figure) figure.visible = false;
    }
    // Line the previous model up with the new one as it stood at the change
    // (its main body's fixed point where the new one's is drawn now).
    const anchorNow = shape.pivot + shape.anchor - pivotNow;
    const newAnchor = turning ? -anchorNow : anchorNow;
    group.position.y = -previous.pivot + (newAnchor - previous.anchor);
    // Drift away from the spacecraft, on the side the dropped parts were on.
    const distance = (2 + 18 * progress.drift) * this.dropSide(previous, dropped);
    this.trail.position.set(0, distance, 0);
    this.trail.scale.setScalar((1 - 0.3 * since) * dropShrink(since));
  }

  /** Which end of the previous model (+1 the front, -1 the back) the dropped parts were on; worked out once per change. */
  private dropSide(previous: Shape, dropped: readonly VehiclePart[]): 1 | -1 {
    const known = previous.dropSide;
    if (known !== undefined) return known;
    const kept = bodyParts(previous.change.parts.filter((name) => !dropped.includes(name)));
    const [dMin, dMax] = extentOf(previous.group, dropped);
    const [kMin, kMax] = kept.length > 0 ? extentOf(previous.group, kept) : [dMin, dMax];
    const side: 1 | -1 = (dMin + dMax) / 2 > (kMin + kMax) / 2 ? 1 : -1;
    previous.dropSide = side;
    return side;
  }

  dispose(): void {
    (this.halo.material as SpriteMaterial).dispose();
    for (const group of this.groups) {
      for (const look of this.walkerLooks(group)) {
        for (const material of walkerMaterials(look)) material.dispose();
      }
      for (const hatch of this.hatchLooks(group)) {
        hatch.opening.dispose();
        hatch.door.dispose();
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Parts left behind.                                                  */
/* ------------------------------------------------------------------ */

/**
 * Where a part left behind is parked relative to its landing site, in
 * meters in the site's own frame (x to the side, y up, z toward the lander's
 * front), and which way it faces, in radians from that front. The descent
 * stage stands on the site itself; others park beside it. The distances are
 * an illustration: far shorter than the real ones (the rovers were parked
 * about 90 m from the lunar module), so they share the view.
 */
const PARKED: Partial<Record<VehiclePart, { at: Vector3; turn: number }>> = {
  'lm-descent-stage': { at: new Vector3(0, 0, 0), turn: 0 },
  'lunar-rover': { at: new Vector3(7.2, 0, 5.0), turn: 1.9 },
};

/**
 * A part that stays where it was left (Eagle's descent stage at Tranquility
 * Base, a rover), drawn upright on the surface from the cited moment on.
 * Every part at one site is drawn at one scale: that of the lunar module
 * while it still stands there, then that of the ascent stage that lifted
 * off (so at liftoff the two sit one on top of the other).
 */
export class LeftBehindModel {
  readonly root = new Group();
  /** Mission time from which it is there. */
  readonly from: number;
  /** The ship it came off. */
  readonly shipId: string;
  readonly part: VehiclePart;
  /** Its own largest side and reach, and those of everything parked at its site (set by buildFleet). */
  largest: number;
  reach: number;
  private readonly holder = new Group();
  private metersPerPixel = 0;

  constructor(item: LeftBehind, from: number, kit: Kit) {
    this.from = from;
    this.shipId = item.ship;
    this.part = item.part;
    this.root.name = `Left behind: ${item.part}`;
    const parked = PARKED[item.part];
    if (item.part === 'lm-descent-stage') this.holder.add(lmDescentStage(kit));
    else if (item.part === 'lunar-rover') this.holder.add(lunarRover(kit));
    else
      warnOnce(
        `${item.ship} at "${item.label}": "${item.part}" cannot be drawn as a part left behind.`,
      );
    if (parked) {
      this.holder.position.copy(parked.at);
      this.holder.rotation.y = parked.turn;
    }
    this.root.add(this.holder);
    const size = sizeOf(this.root, [item.part], 0);
    this.largest = size.largest;
    this.reach = size.reach;
    const box = new Box3().setFromObject(this.root, true);
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) this.corners.push(new Vector3(x, y, z));
      }
    }
    this.root.visible = false;
  }

  /** The corners of the box around it where it is parked, in meters from its site. */
  private readonly corners: Vector3[] = [];

  /**
   * How far it reaches from its site in the direction `toward` (a unit
   * vector in world space), in world units, as last drawn. The scene uses
   * it to hang a label clear of everything at the site.
   */
  reachToward(toward: Vector3): number {
    let reach = 0;
    for (const corner of this.corners) {
      reach = Math.max(reach, _x.copy(corner).applyQuaternion(this.root.quaternion).dot(toward));
    }
    return reach * this.root.scale.x;
  }

  /**
   * Place it at its site, `position`, upright along `up` and facing
   * `front`; hide it when `shown` is false. When `context.metersPerPixel`
   * is above 0, draw at that scale (the lander standing at the site, or
   * just lifting off from it), and otherwise ease to its own.
   */
  update(
    shown: boolean,
    position: Vector3,
    up: Vector3,
    front: Vector3,
    context: PoseContext,
  ): void {
    if (!shown || context.unitsPerPixel <= 0) {
      this.root.visible = false;
      this.metersPerPixel = 0;
      return;
    }
    this.root.visible = true;
    this.root.position.copy(position);
    _y.copy(up);
    _z.copy(front).addScaledVector(_y, -front.dot(_y));
    if (_z.lengthSq() < 1e-6) _z.set(1, 0, 0).addScaledVector(_y, -_y.x);
    _z.normalize();
    _x.crossVectors(_y, _z).normalize();
    _basis.makeBasis(_x, _y, _z);
    this.root.quaternion.setFromRotationMatrix(_basis);
    // The same scale the ascent stage gets (see ShipModel.update), unless the lander is still there.
    const ascent = LM.tunnelTop - LM.descentTop;
    const pixelsPerMeter = Math.min(
      (SHIP_SIZE_PX * context.sizeScale * Math.pow(ascent / REFERENCE_LENGTH, SIZE_EXPONENT)) /
        ascent,
      context.maxPixels / this.largest,
      context.maxReachPixels / this.reach,
    );
    const wanted = context.metersPerPixel > 0 ? context.metersPerPixel : 1 / pixelsPerMeter;
    if (context.snap || this.metersPerPixel <= 0 || context.metersPerPixel > 0)
      this.metersPerPixel = wanted;
    else
      this.metersPerPixel +=
        (wanted - this.metersPerPixel) * (1 - Math.exp(-context.dt / SIZE_SMOOTHING_SECONDS));
    this.root.scale.setScalar(context.unitsPerPixel / this.metersPerPixel);
  }
}

/* ------------------------------------------------------------------ */
/* The fleet.                                                          */
/* ------------------------------------------------------------------ */

export interface Fleet {
  readonly ships: readonly ShipModel[];
  readonly leftBehind: readonly LeftBehindModel[];
  dispose(): void;
}

/** A soft round glow, drawn once on a small canvas. */
function haloTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

/** A ship of the flight path, as the fleet needs it. */
export interface FleetShip {
  readonly id: string;
  /** Halo color. */
  readonly color: number;
}

/** One model per ship of the flight path (in its order), and the parts left behind. */
export function buildFleet(
  ships: readonly FleetShip[],
  changes: readonly VehicleChange[],
  leftBehind: readonly LeftBehind[],
  elapsed: (moment: { at: VehicleChange['at'] }) => number,
): Fleet {
  const geometries = new Map<string, BufferGeometry>();
  const kits: Kit[] = [];
  const kitFor = (): Kit => {
    const kit = makeKit(geometries);
    kits.push(kit);
    return kit;
  };
  const texture = haloTexture();
  for (const change of changes) {
    if (!ships.some((ship) => ship.id === change.ship))
      warnOnce(`A vehicle change names a ship the flight plan does not have: "${change.ship}".`);
  }
  const models = ships.map(
    (ship) =>
      new ShipModel(ship.id, changes, elapsed, kitFor(), texture, ship.color, leftBehind, elapsed),
  );
  const sharedKit = kitFor();
  const parts = leftBehind.map((item) => new LeftBehindModel(item, elapsed(item), sharedKit));
  // Everything parked at one site is capped together, so it keeps one scale.
  for (const model of parts) {
    const site = parts.filter((other) => other.shipId === model.shipId);
    const holder = new Group();
    for (const other of site) holder.add(other.root.clone());
    const size = sizeOf(
      holder,
      site.map((other) => other.part),
      0,
    );
    model.largest = size.largest;
    model.reach = size.reach;
  }
  return {
    ships: models,
    leftBehind: parts,
    dispose() {
      for (const ship of models) ship.dispose();
      for (const geometry of geometries.values()) geometry.dispose();
      for (const kit of kits) {
        for (const material of kitMaterials(kit)) material.dispose();
      }
      texture.dispose();
    },
  };
}

/* ------------------------------------------------------------------ */
/* One model by itself, for the extras (see kit.ts).                   */
/* ------------------------------------------------------------------ */

/** A model built from one part list, in meters, for a view of its own (see kit.ts, createVehicle). */
export interface StandaloneVehicle {
  /** Holds the model; +Y along the stack or the way of travel. */
  readonly object: Group;
  /** The visible model's lowest and highest points along Y, and its length, in meters, as built (before any scaling). */
  readonly bottom: number;
  readonly top: number;
  readonly length: number;
  /** The parts it can show, of those asked for. */
  readonly parts: readonly VehiclePart[];
  setPartVisible(part: VehiclePart, visible: boolean): void;
  drift(part: VehiclePart, meters: number): void;
  dispose(): void;
}

/**
 * Build one model from a layout and part list (the same shapes and part
 * rules as a mission's vehicle file), with its own materials. A launch
 * stack stands with its lowest point at y = 0; anything else is centered on
 * the origin.
 */
export function buildStandaloneVehicle(
  layout: VehicleLayout,
  parts: readonly VehiclePart[],
  facing: 'forward' | 'backward' = 'forward',
): StandaloneVehicle {
  const geometries = new Map<string, BufferGeometry>();
  const kit = makeKit(geometries);
  const kind = kindOf(layout, parts);
  if (kind === 'none' && parts.length > 0)
    warnOnce(`createVehicle: no shape is made of ${parts.join(', ')} in layout "${layout}".`);
  const group = buildAssembly(kit, kind, TURNABLE.has(kind) && facing === 'backward');
  const nodes = new Map<string, Group>();
  group.traverse((child) => {
    if (child instanceof Group && child.name) nodes.set(child.name, child);
  });
  const known = parts.filter((name) => {
    const ok =
      nodes.has(name) ||
      (name === 'open-hatch' && (nodes.has(GEMINI_RIGHT_HATCH) || nodes.has(APOLLO_HATCH)));
    if (!ok)
      warnOnce(`createVehicle: the ${kind} shape (layout "${layout}") cannot show "${name}".`);
    return ok;
  });
  const hidden = (name: string): boolean =>
    kind === 'stack' && layout === 'launch' && LUNAR_MODULE_PARTS.has(name as VehiclePart);
  // Show the listed parts, and the nodes that go with them.
  for (const [name, node] of nodes) {
    if (WRAPPERS.has(name)) node.visible = true;
    else if (!SPECIALS.has(name))
      node.visible = known.includes(name as VehiclePart) && !hidden(name);
  }
  const boom = nodes.get(AGENA_BOOM);
  if (boom) boom.visible = !known.includes('agena-shroud');
  const agenaAdapter = nodes.get(ATLAS_AGENA_ADAPTER);
  if (agenaAdapter) agenaAdapter.visible = !known.includes('atda');
  const atdaAdapter = nodes.get(ATLAS_ATDA_ADAPTER);
  if (atdaAdapter) atdaAdapter.visible = known.includes('atda');
  const open =
    known.includes('spacewalker') ||
    known.includes('standup-spacewalker') ||
    known.includes('open-hatch');
  for (const name of ['spacewalker', 'standup-spacewalker'] as const) {
    const figure = nodes.get(name);
    if (!figure) continue;
    figure.visible = known.includes(name);
    const look = figure.userData['look'] as WalkerLook | undefined;
    if (look) for (const material of walkerMaterials(look)) material.transparent = false;
  }
  const gun = nodes.get(GAS_GUN);
  if (gun) holdGasGun(gun, known.includes('gas-gun') && known.includes('spacewalker'));
  const hatch = nodes.get(GEMINI_RIGHT_HATCH);
  const axis = hatch?.userData['axis'] as Vector3 | undefined;
  if (hatch && axis) hatch.quaternion.setFromAxisAngle(axis, open ? HATCH_OPEN_RAD : 0);
  const apolloHatch = nodes.get(APOLLO_HATCH);
  if (apolloHatch) {
    apolloHatch.visible = open;
    const look = apolloHatch.userData['hatchLook'] as HatchLook | undefined;
    if (look) for (const material of [look.opening, look.door]) material.transparent = false;
  }
  // A stack mid-transposition is drawn turned around, at its end.
  const csm = nodes.get('csm');
  if (csm && kind === 'stack' && layout !== 'launch') {
    const start = STACK.csmBase + CSM.center;
    const docks = parts.some((name) => LUNAR_MODULE_PARTS.has(name));
    csm.position.y = docks
      ? STACK.lmBase + LM.tunnelTop + (CSM.tunnelTop - CSM.center)
      : start + TRANSPOSITION_APART;
    csm.rotation.x = Math.PI;
  }
  const visible = bodyParts(known.filter((name) => !hidden(name)));
  const [min, max] = extentOf(group, visible);
  const holder = new Group();
  holder.name = `Vehicle: ${parts.join(' + ')}`;
  holder.add(group);
  const shift = STACK_KINDS.has(kind) && layout === 'launch' ? -min : -(min + max) / 2;
  group.position.y = shift;
  const rest = new Map<string, Vector3>();
  for (const [name, node] of nodes) rest.set(name, node.position.clone());
  // The spacewalkers' and the open hatch's own materials (see walkerMaterials).
  const ownMaterials: Material[] = [];
  group.traverse((child) => {
    const walker = child.userData['look'] as WalkerLook | undefined;
    const hatch = child.userData['hatchLook'] as HatchLook | undefined;
    if (walker) ownMaterials.push(...walkerMaterials(walker));
    if (hatch) ownMaterials.push(hatch.opening, hatch.door);
  });
  return {
    object: holder,
    bottom: min + shift,
    top: max + shift,
    length: Math.max(0, max - min),
    parts: known,
    setPartVisible(part, on) {
      const node = nodes.get(part);
      if (node) node.visible = on;
    },
    drift(part, meters) {
      const node = nodes.get(part);
      const at = rest.get(part);
      if (!node || !at) return;
      // Stages fall back; a tower or a nose shroud goes forward and aside (as in a mission).
      const forward = DROPS_FORWARD.has(part);
      node.position.copy(at);
      node.position.y += forward ? meters * 0.8 : -meters;
      if (forward) node.position.x += meters * 0.15;
    },
    dispose() {
      for (const geometry of geometries.values()) geometry.dispose();
      for (const material of kitMaterials(kit)) material.dispose();
      for (const material of ownMaterials) material.dispose();
    },
  };
}

/** How tall each full launch stack is as the models draw it, in meters (see launchStackHeights). */
export interface StackHeights {
  saturnV: number;
  saturnIB: number;
  titanII: number;
  atlasAgena: number;
}

/**
 * The full launch stacks as the models encode them, in meters from the
 * lowest engine bell to the escape tower's tip (or the nose). These are
 * drawing sizes, approximate, not cited facts: only the Saturn IB's stages
 * follow a cited source (NASA MSFC drawing 0100801, "Saturn IB Launch
 * Vehicle", 1968: first stage "6.5 x 24 m", second stage "6.6 x 18.1 m",
 * "68 m" with the spacecraft and escape system). The Saturn V's, the
 * Titan II's, and the Atlas-Agena's heights are not from a cited source:
 * their proportions were set by eye from photos. Cite heights from NASA
 * separately and scale a model to them (see kit.ts, createVehicle).
 */
export function launchStackHeights(): StackHeights {
  const measure = (layout: VehicleLayout, parts: readonly VehiclePart[]): number => {
    const vehicle = buildStandaloneVehicle(layout, parts);
    const height = vehicle.length;
    vehicle.dispose();
    return Math.round(height * 10) / 10;
  };
  const apollo: VehiclePart[] = [
    'third-stage',
    'adapter',
    'service-module',
    'command-module',
    'escape-tower',
  ];
  return {
    saturnV: measure('launch', ['first-stage', 'aft-interstage', 'second-stage', ...apollo]),
    saturnIB: measure('launch', ['saturn-ib-first-stage', ...apollo]),
    titanII: measure('launch', [
      'titan-first-stage',
      'titan-second-stage',
      'gemini-equipment-section',
      'gemini-retro-section',
      'gemini-reentry-module',
    ]),
    atlasAgena: measure('launch', ['atlas', 'agena', 'agena-shroud']),
  };
}
