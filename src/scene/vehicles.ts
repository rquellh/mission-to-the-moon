import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
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
  Vector3,
  BoxGeometry,
  type Material,
  type Object3D,
} from 'three';
import type { LeftBehind, VehicleChange, VehicleLayout, VehiclePart } from '../content/vehicle-types';
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
 * Families of shapes: the Saturn V and Apollo spacecraft; the Titan II and
 * Gemini spacecraft; the Atlas and the Agena target vehicle. Which shape a
 * ship has at each moment comes from its mission's vehicle file.
 */

/* ------------------------------------------------------------------ */
/* Tuning (presentation choices).                                      */
/* ------------------------------------------------------------------ */

/** Story seconds over which a dropped part falls away, and over which a turn or settle takes place. */
const DROP_STORY_SECONDS = 1.1;
/** How quickly the apparent size follows a change of shape, in seconds of real time. */
const SIZE_SMOOTHING_SECONDS = 0.3;
/** Bigger stacks look bigger, but much less than in proportion. */
const SIZE_EXPONENT = 0.35;
/** Reference length (meters) that gets SHIP_SIZE_PX: the command and service module. */
const REFERENCE_LENGTH = 11;
/** How far (meters) the command and service module backs off from the third stage while turning around. */
const TRANSPOSITION_APART = 14;

/* ------------------------------------------------------------------ */
/* Materials and shapes.                                               */
/* ------------------------------------------------------------------ */

interface Kit {
  white: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  ring: MeshStandardMaterial;
  adapter: MeshStandardMaterial;
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
  canopy: MeshStandardMaterial;
  lines: LineBasicMaterial;
  geometries: Map<string, BufferGeometry>;
}

function makeKit(): Kit {
  const standard = (color: number, roughness = 0.55, metalness = 0.1, flat = false): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, roughness, metalness, flatShading: flat });
  return {
    white: standard(0xeceef1, 0.6),
    dark: standard(0x24272d, 0.7),
    ring: standard(0x8e959e, 0.6),
    adapter: standard(0xdcdfe3, 0.5),
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
    cone: new MeshStandardMaterial({ color: 0xb9c0c8, roughness: 0.5, metalness: 0.2, side: DoubleSide }),
    canopy: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }),
    lines: new LineBasicMaterial({ color: 0xd9d9d4, transparent: true, opacity: 0.7 }),
    geometries: new Map(),
  };
}

/** A cylinder or cone frustum along Y from y0 to y1 (without end caps when `open`), shared by key. */
function cylinder(kit: Kit, rBottom: number, rTop: number, y0: number, y1: number, segments = 28, open = false): BufferGeometry {
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
function conePatch(kit: Kit, rBottom: number, rTop: number, y0: number, y1: number, from: number, span: number): BufferGeometry {
  const key = `patch:${rBottom}:${rTop}:${y0}:${y1}:${from}:${span}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    geometry = new CylinderGeometry(rTop, rBottom, y1 - y0, 12, 1, true, from, span);
    geometry.translate(0, (y0 + y1) / 2, 0);
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

/** A parachute canopy: a dome with alternating orange and white gores, open side down (-Y). */
function canopyGeometry(kit: Kit, radius: number): BufferGeometry {
  const key = `canopy:${radius}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    const dome = new SphereGeometry(radius, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.42).toNonIndexed();
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

/** The Agena's boom antenna (part of the "agena" part, hidden under the nose shroud). */
const AGENA_BOOM = 'agena-boom';

/** Groups that hold other parts and are always shown when their parts are. */
const WRAPPERS: ReadonlySet<string> = new Set(['csm', 'lm', 'gemini-spacecraft']);

/** A named part: a group whose rest position is remembered for animation. */
function part(name: VehiclePart | 'csm' | 'lm' | 'gemini-spacecraft', ...children: Object3D[]): Group {
  const group = new Group();
  group.name = name;
  group.add(...children);
  return group;
}

/* ---------------- Saturn V, in stack coordinates (y from the engine exits) ---------------- */

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
    children.push(mesh(cylinder(kit, 1.05, 0.55, 0, 3.4, 16), kit.dark, Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1));
    const fin = mesh(box(kit, 0.35, 5.5, 2.6), kit.white, Math.cos(a) * (r + 1.1), 6.4, Math.sin(a) * (r + 1.1));
    fin.rotation.y = -a;
    children.push(fin);
  }
  return part('first-stage', ...children);
}

function aftInterstage(kit: Kit): Group {
  return part('aft-interstage', mesh(cylinder(kit, 5.05, 5.05, STACK.firstStageTop, STACK.interstageTop), kit.ring));
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
    mesh(cylinder(kit, 3.33, 3.33, STACK.thirdStageBottom, 76), kit.dark),
    mesh(cylinder(kit, 3.3, 3.3, 90.5, STACK.unitTop), kit.ring),
  );
}

function adapter(kit: Kit): Group {
  return part('adapter', mesh(cylinder(kit, 3.3, 1.95, STACK.unitTop, STACK.adapterTop), kit.adapter));
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
    children.push(mesh(box(kit, 0.45, 0.7, 0.45), kit.ring, Math.cos(a) * 2.05, 3.3, Math.sin(a) * 2.05));
  }
  return part('service-module', ...children);
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
    children.push(strut, mesh(cylinder(kit, 0.5, 0.5, 0, 0.14, 12), kit.ring, cx * 3.7, 0, cz * 3.7));
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
      const rim = new Vector3(Math.cos(b) * radius * 0.97, radius * 0.75 * Math.cos(Math.PI * 0.42), Math.sin(b) * radius * 0.97);
      rim.applyEuler(canopy.rotation).add(center);
      linePoints.push(apex.x, apex.y, apex.z, rim.x, rim.y, rim.z);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(linePoints, 3));
  children.push(new LineSegments(geometry, kit.lines));
  return part(name, ...children);
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
    mesh(cylinder(kit, 1.345, 1.345, GEMINI.equipmentTop - 0.03, GEMINI.equipmentTop + 0.03, 28, true), kit.ring),
  );
}

/** The cabin's radius at height y (a cone from 1.15 m at the heat shield to 0.52 m at the nose section). */
function cabinRadius(y: number): number {
  return 1.15 - ((y - GEMINI.shieldTop) / (GEMINI.cabinTop - GEMINI.shieldTop)) * (1.15 - 0.52);
}

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
 */
function geminiHatch(kit: Kit, side: -1 | 1): Group {
  const center = side * 0.33;
  const half = 0.27;
  const y0 = GEMINI.shieldTop + 0.12;
  const y1 = GEMINI.cabinTop - 0.06;
  const rim = 0.04;
  const group = new Group();
  group.add(
    mesh(
      conePatch(kit, cabinRadius(y0 - rim) + 0.012, cabinRadius(y1 + rim) + 0.012, y0 - rim, y1 + rim, center - half - rim, 2 * (half + rim)),
      kit.hatchRim,
    ),
    mesh(conePatch(kit, cabinRadius(y0) + 0.022, cabinRadius(y1) + 0.022, y0, y1, center - half, 2 * half), kit.hatch),
    // The window, toward the nose.
    mesh(conePatch(kit, cabinRadius(3.0) + 0.03, cabinRadius(3.85) + 0.03, 3.0, 3.85, center - 0.17, 0.34), kit.window),
  );
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

/** Gemini's parachute (the small drogue or the big main), above a reentry module whose heat shield is at y = 0. */
function geminiParachute(kit: Kit, name: 'gemini-drogue-parachute' | 'gemini-main-parachute'): Group {
  const main = name === 'gemini-main-parachute';
  // Much closer and smaller than the real ones, so the capsule stays the subject.
  const radius = main ? 2.2 : 0.75;
  const height = main ? 8.2 : 6.2;
  const apex = new Vector3(0, GEMINI.noseTop - GEMINI.retroTop + 0.05, 0);
  const canopy = mesh(canopyGeometry(kit, radius), kit.canopy, 0, height, 0);
  const linePoints: number[] = [];
  for (let j = 0; j < 8; j += 1) {
    const b = (j * Math.PI * 2) / 8;
    const rim = new Vector3(Math.cos(b) * radius * 0.97, height + radius * 0.75 * Math.cos(Math.PI * 0.42), Math.sin(b) * radius * 0.97);
    linePoints.push(apex.x, apex.y, apex.z, rim.x, rim.y, rim.z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(linePoints, 3));
  return part(name, canopy, new LineSegments(geometry, kit.lines));
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
    mesh(cylinder(kit, 0.5, 0.5, AGENA.adapterTop - 0.01, AGENA.adapterTop + 0.05, 20), kit.agenaDark),
    // One-sided features, all on the same side (+Z), as NASA photos S66-25782
    // and S66-25779 (public/media/gemini-8/) show the Agena seen from Gemini 8.
    // A row of small dark openings along the forward body, on the side the
    // boom antenna stands out from (S66-25782).
    ...[4.85, 5.1, 5.35, 5.6, 5.85, 6.1, 6.35].map((y) => mesh(box(kit, 0.16, 0.14, 0.04), kit.agenaDark, 0, y, 0.765)),
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
 * nose shroud is on (see ShipModel.showParts).
 */
function agenaBoom(kit: Kit): Group {
  const boom = new Group();
  boom.name = AGENA_BOOM;
  boom.position.set(0, 6.95, 0.76);
  // Along +Z: a Y-axis cylinder turned a quarter turn about X.
  boom.rotation.x = Math.PI / 2;
  boom.add(
    mesh(cylinder(kit, 0.05, 0.05, 0, 1.9, 6), kit.ring),
    mesh(cylinder(kit, 0.09, 0.09, 1.9, 2.22, 10), kit.geminiWhite),
  );
  return boom;
}

/* ---------------- Atlas, in stack coordinates (y from the engine exits) ---------------- */

const ATLAS = {
  top: 21.0,
  /** Where the Agena's engine exit sits on the Atlas, past its adapter. */
  agenaBase: 22.2,
};

function atlas(kit: Kit): Group {
  return part(
    'atlas',
    mesh(cylinder(kit, 0.55, 0.25, 0, 1.2, 16), kit.dark, -0.85, 0, 0),
    mesh(cylinder(kit, 0.55, 0.25, 0, 1.2, 16), kit.dark, 0.85, 0, 0),
    mesh(cylinder(kit, 1.6, 1.52, 1.2, 3.2, 28), kit.atlas),
    mesh(cylinder(kit, 1.52, 1.52, 3.2, 18.5, 28), kit.atlas),
    mesh(cylinder(kit, 1.52, 0.9, 18.5, ATLAS.top, 28), kit.atlas),
    // The adapter, around the Agena's engine.
    mesh(cylinder(kit, 0.9, 0.78, ATLAS.top, ATLAS.agenaBase + AGENA.engineTop, 24), kit.geminiWhite),
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
 * The launch stack in stack coordinates. The same group serves the
 * "launch", "transposition", and "docked-on-stage" layouts.
 */
function stackAssembly(kit: Kit): Group {
  const group = new Group();
  const csm = csmAssembly(kit, true);
  csm.position.y = STACK.csmBase + CSM.center;
  const lm = lmAssembly(kit);
  lm.position.y = STACK.lmBase;
  group.add(firstStage(kit), aftInterstage(kit), secondStage(kit), thirdStage(kit), adapter(kit), lm, csm);
  return group;
}

/** Command and service module with the lunar module (or its ascent stage) on its nose, the lunar module ahead. */
function dockedAssembly(kit: Kit): Group {
  const group = new Group();
  const csm = new Group();
  csm.add(serviceModule(kit), commandModule(kit));
  const lm = lmAssembly(kit);
  lm.rotation.x = Math.PI;
  lm.position.y = CSM.tunnelTop + LM.tunnelTop;
  group.add(csm, lm);
  return group;
}

function csmAloneAssembly(kit: Kit): Group {
  const group = new Group();
  group.add(serviceModule(kit), commandModule(kit));
  return group;
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
  return endFor(backward, ...geminiParts(kit));
}

/** The reentry module by itself, heat shield first (+Y), its heat shield at the origin, parachutes trailing; hatches on top (+Z), as in endFor. */
function geminiReentryAssembly(kit: Kit): Group {
  const group = new Group();
  const turned = new Group();
  turned.rotation.z = Math.PI;
  const module = geminiReentryModule(kit);
  module.position.y = -GEMINI.retroTop;
  turned.add(module, geminiParachute(kit, 'gemini-drogue-parachute'), geminiParachute(kit, 'gemini-main-parachute'));
  group.add(turned);
  return group;
}

/**
 * Gemini with its nose in the Agena's docking cone. Built nose first (the
 * Agena ahead, engine forward); `backward` turns the pair end for end,
 * so the Gemini flies blunt end first with the Agena behind it, cone forward.
 */
function geminiDockedAssembly(kit: Kit, backward: boolean): Group {
  const target = agena(kit);
  // End for end about Z, so its boom stays on the same side as when it flies alone.
  target.rotation.z = Math.PI;
  target.position.y = GEMINI_IN_CONE + AGENA.coneTop;
  return endFor(backward, ...geminiParts(kit), target);
}

/** Where the Agena's cone mouth sits on a docked Gemini: the nose goes this far into the cone. */
const GEMINI_IN_CONE = GEMINI.noseTop - 0.55;

/** Atlas with the Agena (engine down, docking end up under its shroud), in stack coordinates. */
function atlasStackAssembly(kit: Kit): Group {
  const group = new Group();
  const target = agena(kit);
  target.position.y = ATLAS.agenaBase;
  group.add(atlas(kit), target, agenaShroud(kit));
  return group;
}

/** The Agena in orbit, docking cone forward (as it was launched). */
function agenaAloneAssembly(kit: Kit): Group {
  return endFor(false, agena(kit));
}

/** A fresh group of the given kind; `backward` turns a Gemini blunt end first. */
function buildAssembly(kit: Kit, kind: Kind, backward = false): Group {
  switch (kind) {
    case 'stack':
      return stackAssembly(kit);
    case 'docked':
      return dockedAssembly(kit);
    case 'csm':
      return csmAloneAssembly(kit);
    case 'cm':
      return cmAloneAssembly(kit);
    case 'lm':
      return lmAloneAssembly(kit);
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
      return agenaAloneAssembly(kit);
    case 'none':
      return new Group();
  }
}

/* ------------------------------------------------------------------ */
/* Per-change layout information.                                      */
/* ------------------------------------------------------------------ */

type Kind =
  /* Apollo. */
  | 'stack'
  | 'docked'
  | 'csm'
  | 'cm'
  | 'lm'
  /* Gemini. */
  | 'titan'
  | 'gemini'
  | 'gemini-reentry'
  | 'gemini-docked'
  /* Agena. */
  | 'atlas'
  | 'agena'
  /** Drawn as part of another ship. */
  | 'none';

/** Kinds built turned end for end about Z rather than X (see endFor). */
const GEMINI_KINDS: ReadonlySet<Kind> = new Set<Kind>(['gemini', 'gemini-docked', 'gemini-reentry']);

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
   * base; Gemini: the reentry module's heat shield; Agena: its engine exit),
   * relative to the pivot along Y, for lining shapes up when parts come off.
   */
  anchor: number | undefined;
  /** +1 when the main body's nose points along travel, -1 when it points back; at the start and end of the shape. */
  facingStart: 1 | -1;
  facingEnd: 1 | -1;
  /** Length of the visible model in meters, for its apparent size. */
  length: number;
  /** Middle of the visible model relative to the pivot, along Y. */
  middle: number;
  /** Largest side of the whole model, parachutes included, in meters. */
  largest: number;
  /** Farthest the model reaches from the pivot, in meters. */
  reach: number;
  /** Which end its dropped parts drift away from, once known (see ShipModel.dropSide). */
  dropSide?: 1 | -1;
}

function kindOf(layout: VehicleLayout, parts: readonly VehiclePart[]): Kind {
  const has = (name: VehiclePart): boolean => parts.includes(name);
  if (parts.length === 0) return 'none';
  if (has('titan-first-stage') || has('titan-second-stage')) return 'titan';
  if (has('atlas') || (layout === 'launch' && has('agena'))) return 'atlas';
  if (has('gemini-reentry-module')) {
    if (layout === 'launch') return 'titan';
    if (layout === 'docked') return 'gemini-docked';
    if (has('gemini-equipment-section') || has('gemini-retro-section')) return 'gemini';
    return 'gemini-reentry';
  }
  if (has('agena')) return 'agena';
  if (layout === 'launch' || layout === 'transposition' || layout === 'docked-on-stage') return 'stack';
  if (layout === 'docked') return 'docked';
  if (parts.includes('service-module')) return 'csm';
  if (parts.includes('command-module')) return 'cm';
  return 'lm';
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
        point.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld).applyMatrix4(inverse);
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
const GEMINI_PARTS: readonly VehiclePart[] = ['gemini-equipment-section', 'gemini-retro-section', 'gemini-reentry-module'];

/**
 * The box (in group coordinates, at rest) around the given parts: its largest
 * side, and the farthest any of it reaches from a point on the Y axis.
 */
function sizeOf(group: Group, names: readonly string[], pivot: number): { largest: number; reach: number } {
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
        point.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld).applyMatrix4(inverse);
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
}

const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
const _basis = new Matrix4();
const _q = new Quaternion();
const _qRoll = new Quaternion();
const _axisX = new Vector3(1, 0, 0);
const _axisY = new Vector3(0, 1, 0);

/** Parts that visibly fall away when they come off. */
const DROPPABLE: ReadonlySet<string> = new Set([
  'first-stage',
  'aft-interstage',
  'second-stage',
  'third-stage',
  'escape-tower',
  'service-module',
  'lm-ascent-stage',
  'titan-first-stage',
  'titan-second-stage',
  'gemini-equipment-section',
  'gemini-retro-section',
  'atlas',
  'agena-shroud',
]);

/** Dropped parts that drift forward and aside (a tower or a nose shroud) rather than back. */
const DROPS_FORWARD: ReadonlySet<string> = new Set(['escape-tower', 'agena-shroud']);

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

  constructor(
    readonly shipId: string,
    changes: readonly VehicleChange[],
    elapsed: (change: VehicleChange) => number,
    kit: Kit,
    haloTexture: CanvasTexture,
    color: number,
  ) {
    this.root.name = `Ship ${shipId}`;
    this.root.add(this.spin);
    this.spin.add(this.body, this.trail);
    this.halo = new Sprite(
      new SpriteMaterial({
        map: haloTexture,
        color,
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.halo.renderOrder = -1;

    const own = changes.filter((change) => change.ship === shipId);
    const stacks = new Map<Kind, Group>();
    for (const change of own) {
      const kind = kindOf(change.layout, change.parts);
      // A Gemini (alone or docked) may fly blunt end first.
      const turnable = kind === 'gemini' || kind === 'gemini-docked';
      const backward = turnable && change.facing === 'backward';
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

      // Size the model by its body, not its parachutes.
      const shown = this.visibleParts(kind, change).filter((name) => !name.endsWith('-parachutes') && !name.endsWith('-parachute'));
      const [min, max] = extentOf(group, shown);
      let pivot: number;
      let pivotFrom: number | undefined;
      let facingStart: 1 | -1 = 1;
      let facingEnd: 1 | -1 = 1;
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
        // The ascent stage starts where it sat, on top of the descent stage left on the surface.
        if (!change.parts.includes('lm-descent-stage')) pivotFrom = 0;
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
      const previous = this.shapes[this.shapes.length - 1];
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
        time: elapsed(change),
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
        ...this.capSizes(group, change, kind, pivot),
      });
    }
  }

  /** The main body's fixed point (see Shape.anchor) for a shape, relative to its pivot. */
  private anchorOf(kind: Kind, change: VehicleChange, group: Group, pivot: number): number | undefined {
    const has = (name: VehiclePart): boolean => change.parts.includes(name);
    if (has('command-module')) {
      if (kind === 'stack') return this.stackCmBase(change.layout, 1) - pivot;
      if (kind === 'cm') return 0;
      return CSM.smTop - pivot;
    }
    // Gemini: the heat shield; the Agena: its engine exit. Measured on the model as built.
    const at = has('gemini-reentry-module')
      ? axisPoint(group, 'gemini-reentry-module', GEMINI.retroTop)
      : has('agena')
        ? axisPoint(group, 'agena', 0)
        : undefined;
    return at === undefined ? undefined : at - pivot;
  }

  /** Largest side and reach from the pivot, parachutes included (the turning-around CSM reaches farther). */
  private capSizes(group: Group, change: VehicleChange, kind: Kind, pivot: number): { largest: number; reach: number } {
    const all = this.visibleParts(kind, change);
    const size = sizeOf(group, all, pivot);
    if (change.layout === 'transposition') {
      size.largest += TRANSPOSITION_APART;
      size.reach += TRANSPOSITION_APART;
    }
    return size;
  }

  /** Where the command module's base is in stack coordinates, for a layout at transposition progress p. */
  private stackCmBase(layout: VehicleLayout, p: number): number {
    if (layout === 'launch') return STACK.csmBase + CSM.smTop;
    const { center, angle } = this.transposition(layout === 'transposition' ? p : 1);
    return center + Math.cos(angle) * (CSM.smTop - CSM.center);
  }

  /** The command and service module's middle (stack coordinates) and pitch during transposition, for progress p. */
  private transposition(p: number): { center: number; angle: number } {
    const start = STACK.csmBase + CSM.center;
    const apart = start + TRANSPOSITION_APART;
    const docked = STACK.lmBase + LM.tunnelTop + (CSM.tunnelTop - CSM.center);
    let center: number;
    if (p < 0.3) center = start + (apart - start) * ease(p / 0.3);
    else if (p < 0.7) center = apart;
    else center = apart + (docked - apart) * ease((p - 0.7) / 0.3);
    return { center, angle: Math.PI * ease((p - 0.3) / 0.4) };
  }

  /** The named parts to show for a change (the lunar module rides hidden inside the adapter at launch). */
  private visibleParts(kind: Kind, change: VehicleChange): string[] {
    const names: string[] = [];
    for (const name of change.parts) {
      if (kind === 'stack' && change.layout === 'launch' && name.startsWith('lm-')) continue;
      names.push(name);
    }
    return names;
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

  /** Meters per CSS pixel that shape would be drawn at in this context (0 when it cannot be drawn). */
  metersPerPixelOf(index: number, context: PoseContext): number {
    const shape = this.shapes[index];
    if (!shape) return 0;
    const targetPixels = SHIP_SIZE_PX * context.sizeScale * Math.pow(shape.length / REFERENCE_LENGTH, SIZE_EXPONENT);
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
  private motionAt(index: number, context: PoseContext, out: { roll: number; tumble: number }): void {
    let roll = 0;
    let tumble = 0;
    const limit = (degrees: number): number => {
      const rate = MathUtils.degToRad(degrees);
      return context.reducedMotion ? Math.sign(rate) * Math.min(Math.abs(rate), MathUtils.degToRad(REDUCED_MOTION_TURN_DEG)) : rate;
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
        const angle = start * span + (Number.isFinite(length) && length > 0 ? ((finish - start) * span * span) / (2 * length) : 0);
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

  /** True while the model turns with the clock stopped, so the scene must keep drawing. */
  get idleTurning(): boolean {
    return this.turningNow;
  }

  /**
   * The rate of each kind of turn now, and the rate it is heading for: the
   * stretch's `rateTo` when that is faster, otherwise the rate now (radians
   * per second, capped under reduced motion). NaN when there is no such turn.
   */
  private ratesAt(index: number, context: PoseContext, out: { roll: [number, number]; tumble: [number, number] }): void {
    out.roll[0] = out.roll[1] = Number.NaN;
    out.tumble[0] = out.tumble[1] = Number.NaN;
    const shape = this.shapes[index];
    if (!shape) return;
    const limit = (degrees: number): number => {
      const rate = MathUtils.degToRad(degrees);
      return context.reducedMotion ? Math.sign(rate) * Math.min(Math.abs(rate), MathUtils.degToRad(REDUCED_MOTION_TURN_DEG)) : rate;
    };
    const from = context.toStory(shape.time);
    const next = this.shapes[index + 1];
    const length = next ? context.toStory(next.time) - from : Infinity;
    const progress = Number.isFinite(length) && length > 0 ? MathUtils.clamp((context.storyTime - from) / length, 0, 1) : 0;
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
        this.idle[kind] = this.idle[kind] === 0 ? 0 : wrapAngle(this.idle[kind]) * Math.exp(-context.dt / IDLE_SETTLE_SECONDS);
        if (Math.abs(this.idle[kind]) < 1e-4) this.idle[kind] = 0;
        else this.turningNow = true;
        this.idleRate[kind] = 0;
        continue;
      }
      if (advancing) {
        this.idleRate[kind] = now;
        continue;
      }
      this.idleRate[kind] += (heading - this.idleRate[kind]) * (1 - Math.exp(-context.dt / IDLE_SPEED_UP_SECONDS));
      this.idle[kind] = wrapAngle(this.idle[kind] + this.idleRate[kind] * context.dt);
      if (this.idleRate[kind] !== 0) this.turningNow = true;
    }
  }

  /** Pose the model for this frame. Returns false when nothing is drawn. */
  update(pose: ShipPose, context: PoseContext): boolean {
    const index = pose.exists ? this.shapeAt(context.time) : -1;
    const shape = index >= 0 ? this.shapes[index] : undefined;
    if (!shape || shape.change.parts.length === 0 || context.unitsPerPixel <= 0) {
      this.root.visible = false;
      this.halo.visible = false;
      this.lastShape = -1;
      this.turningNow = false;
      return false;
    }
    this.root.visible = true;
    this.halo.visible = true;

    const previous = index > 0 ? this.shapes[index - 1] : undefined;
    const since = (context.storyTime - context.toStory(shape.time)) / DROP_STORY_SECONDS;
    const settling = previous !== undefined && since >= 0 && since < 1;
    const u = ease(since);

    // Show only the active group (and the previous one while its parts fall away).
    for (let i = 0; i < this.groups.length; i += 1) {
      const group = this.groups[i] as Group;
      group.visible = group === shape.group;
    }
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    if (shape.group.parent !== this.body) this.body.add(shape.group);
    this.showParts(shape, context);

    // Turning around (the main body's nose changes ends).
    const turning = settling && previous !== undefined && previous.facingEnd !== shape.facingStart;
    // Gemini shapes are built turned about Z (see endFor), so they turn around that way; the rest about X.
    if (turning) {
      if (GEMINI_KINDS.has(shape.kind)) this.body.rotation.z = Math.PI * (1 - u);
      else this.body.rotation.x = Math.PI * (1 - u);
    }

    // Parts that came off fall away, and the pivot settles from where it
    // was to where it now is. Changes can overlap: the first stage, the
    // interstage, and the tower come off within seconds of each other.
    let pivot = shape.pivot;
    this.trail.visible = false;
    let droppedFrom: Shape | undefined;
    for (let k = index; k > 0; k -= 1) {
      const later = this.shapes[k] as Shape;
      const earlier = this.shapes[k - 1] as Shape;
      const sinceK = (context.storyTime - context.toStory(later.time)) / DROP_STORY_SECONDS;
      if (sinceK < 0 || sinceK >= 1) break;
      if (earlier.group === shape.group && later.group === shape.group) {
        pivot -= (later.pivot - earlier.pivot) * (1 - ease(sinceK));
        this.dropWithinStack(earlier, later, sinceK);
      } else {
        if (k === index) droppedFrom = earlier;
        break;
      }
    }
    if (shape.pivotFrom !== undefined && since >= 0 && since < 1) {
      pivot = shape.pivotFrom + (pivot - shape.pivotFrom) * u;
    }
    shape.group.position.y = -pivot;
    if (droppedFrom) this.showDropped(droppedFrom, shape, since, turning, pivot);

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
    this.root.quaternion.copy(_q);

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
    if (context.snap || this.lastShape < 0 || this.metersPerPixel <= 0) this.metersPerPixel = wanted;
    else {
      const k = 1 - Math.exp(-context.dt / SIZE_SMOOTHING_SECONDS);
      this.metersPerPixel += (wanted - this.metersPerPixel) * k;
    }
    this.lastShape = index;
    const scale = context.unitsPerPixel / this.metersPerPixel;
    this.root.scale.setScalar(scale);

    // The halo sits behind the middle of the model.
    _y.multiplyScalar(shape.middle * scale);
    this.halo.position.copy(pose.position).add(_y);
    const haloPixels = Math.max(30, (shape.length / this.metersPerPixel) * 0.9 + 18);
    this.halo.scale.setScalar(haloPixels * context.unitsPerPixel);
    return true;
  }

  /** The meters per CSS pixel the model was last drawn at. */
  get drawnMetersPerPixel(): number {
    return this.metersPerPixel;
  }

  private showParts(shape: Shape, context: PoseContext): void {
    const shown = shape.change.parts;
    const launch = shape.kind === 'stack' && shape.change.layout === 'launch';
    for (let i = 0; i < shape.partList.length; i += 1) {
      const node = shape.partList[i] as Group;
      const name = node.name;
      node.position.y = node.userData['restY'] as number;
      node.position.x = 0;
      node.scale.setScalar(node.userData['restScale'] as number);
      node.rotation.x = node.userData['restRotation'] as number;
      if (WRAPPERS.has(name)) {
        node.visible = true;
        continue;
      }
      if (name === AGENA_BOOM) {
        // Out only once the nose shroud is off.
        node.visible = !shown.includes('agena-shroud');
        continue;
      }
      node.visible = shown.includes(name as VehiclePart) && !(launch && name.startsWith('lm-'));
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
        const { center, angle } = this.transposition(Math.min(1, Math.max(0, p)));
        csm.position.y = center;
        csm.rotation.x = angle;
      }
    }
  }

  /** Within the launch stack: parts that came off drift away (stages back, the tower forward). */
  private dropWithinStack(previous: Shape, shape: Shape, since: number): void {
    const parts = previous.change.parts;
    for (let i = 0; i < parts.length; i += 1) {
      const name = parts[i] as VehiclePart;
      if (shape.change.parts.includes(name)) continue;
      const node = shape.parts.get(name);
      if (!node || !DROPPABLE.has(name)) continue;
      node.visible = true;
      const rest = node.userData['restY'] as number;
      const distance = 3 + 40 * since * since;
      const forward = DROPS_FORWARD.has(name);
      node.position.y = rest + (forward ? distance * 0.8 : -distance);
      if (forward) node.position.x = since * 6;
      node.scale.setScalar(1 - 0.35 * since);
    }
  }

  /** Between different models: show the previous model's dropped parts, lined up, drifting away. */
  private showDropped(previous: Shape, shape: Shape, since: number, turning: boolean, pivotNow: number): void {
    // Undocking hands the lunar module to its own model, so it does not fall away.
    const undocking = previous.change.parts.includes('lm-descent-stage') && shape.kind !== 'stack' && shape.kind !== 'docked';
    const dropped = this.dropped;
    dropped.length = 0;
    const parts = previous.change.parts;
    for (let i = 0; i < parts.length; i += 1) {
      const name = parts[i] as VehiclePart;
      if (shape.change.parts.includes(name) || !DROPPABLE.has(name)) continue;
      if (undocking && name.startsWith('lm-')) continue;
      dropped.push(name);
    }
    if (dropped.length === 0 || previous.anchor === undefined || shape.anchor === undefined) return;

    const group = previous.group;
    if (group.parent !== this.trail) this.trail.add(group);
    group.visible = true;
    this.trail.visible = true;
    for (let i = 0; i < previous.partList.length; i += 1) {
      const node = previous.partList[i] as Group;
      const name = node.name;
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
    // Line the previous model up with the new one as it stood at the change
    // (its main body's fixed point where the new one's is drawn now).
    const anchorNow = shape.pivot + shape.anchor - pivotNow;
    const newAnchor = turning ? -anchorNow : anchorNow;
    group.position.y = -previous.pivot + (newAnchor - previous.anchor);
    // Drift away from the spacecraft, on the side the dropped parts were on.
    const distance = (2 + 18 * since * since) * this.dropSide(previous, dropped);
    this.trail.position.set(0, distance, 0);
    this.trail.scale.setScalar(1 - 0.3 * since);
  }

  /** Which end of the previous model (+1 the front, -1 the back) the dropped parts were on; worked out once per change. */
  private dropSide(previous: Shape, dropped: readonly VehiclePart[]): 1 | -1 {
    const known = previous.dropSide;
    if (known !== undefined) return known;
    const kept = previous.change.parts.filter(
      (name) => !dropped.includes(name) && !name.endsWith('-parachutes') && !name.endsWith('-parachute'),
    );
    const [dMin, dMax] = extentOf(previous.group, dropped);
    const [kMin, kMax] = kept.length > 0 ? extentOf(previous.group, kept) : [dMin, dMax];
    const side: 1 | -1 = (dMin + dMax) / 2 > (kMin + kMax) / 2 ? 1 : -1;
    previous.dropSide = side;
    return side;
  }

  dispose(): void {
    (this.halo.material as SpriteMaterial).dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Parts left behind.                                                  */
/* ------------------------------------------------------------------ */

/**
 * A part that stays where it was left (Eagle's descent stage at Tranquility
 * Base), drawn upright on the surface from the cited moment on. It is sized
 * like the ascent stage that lifted off from it, so at liftoff the two sit
 * one on top of the other.
 */
export class LeftBehindModel {
  readonly root = new Group();
  /** Mission time from which it is there. */
  readonly from: number;
  /** The ship it came off. */
  readonly shipId: string;
  private readonly largest: number;
  private readonly reach: number;

  constructor(item: LeftBehind, from: number, kit: Kit) {
    this.from = from;
    this.shipId = item.ship;
    this.root.name = `Left behind: ${item.part}`;
    const holder = new Group();
    if (item.part === 'lm-descent-stage') holder.add(lmDescentStage(kit));
    this.root.add(holder);
    const size = sizeOf(holder, [item.part], 0);
    this.largest = size.largest;
    this.reach = size.reach;
    this.root.visible = false;
  }

  /** Place it at `position`, upright along `up` and facing `front`; hide it when `shown` is false. */
  update(shown: boolean, position: Vector3, up: Vector3, front: Vector3, context: PoseContext): void {
    if (!shown || context.unitsPerPixel <= 0) {
      this.root.visible = false;
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
    // The same scale the ascent stage gets (see ShipModel.update).
    const ascent = LM.tunnelTop - LM.descentTop;
    const pixelsPerMeter = Math.min(
      (SHIP_SIZE_PX * context.sizeScale * Math.pow(ascent / REFERENCE_LENGTH, SIZE_EXPONENT)) / ascent,
      context.maxPixels / this.largest,
      context.maxReachPixels / this.reach,
    );
    this.root.scale.setScalar(context.unitsPerPixel * pixelsPerMeter);
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
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
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
  const kit = makeKit();
  const texture = haloTexture();
  const models = ships.map((ship) => new ShipModel(ship.id, changes, elapsed, kit, texture, ship.color));
  return {
    ships: models,
    leftBehind: leftBehind.map((item) => new LeftBehindModel(item, elapsed(item), kit)),
    dispose() {
      for (const ship of models) ship.dispose();
      for (const geometry of kit.geometries.values()) geometry.dispose();
      for (const material of Object.values(kit)) {
        if (material instanceof MeshStandardMaterial || material instanceof LineBasicMaterial) material.dispose();
      }
      texture.dispose();
    },
  };
}
