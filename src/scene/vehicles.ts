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
import type { LeftBehind, VehicleChange, VehicleLayout, VehiclePart } from '../content/missions/apollo-11-vehicle';
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
    canopy: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }),
    lines: new LineBasicMaterial({ color: 0xd9d9d4, transparent: true, opacity: 0.7 }),
    geometries: new Map(),
  };
}

/** A cylinder or cone frustum along Y from y0 to y1, shared by key. */
function cylinder(kit: Kit, rBottom: number, rTop: number, y0: number, y1: number, segments = 28): BufferGeometry {
  const key = `cyl:${rBottom}:${rTop}:${y0}:${y1}:${segments}`;
  let geometry = kit.geometries.get(key);
  if (!geometry) {
    geometry = new CylinderGeometry(rTop, rBottom, y1 - y0, segments);
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

/** A named part: a group whose rest position is remembered for animation. */
function part(name: VehiclePart | 'csm' | 'lm', ...children: Object3D[]): Group {
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

/* ------------------------------------------------------------------ */
/* Per-change layout information.                                      */
/* ------------------------------------------------------------------ */

type Kind = 'stack' | 'docked' | 'csm' | 'cm' | 'lm';

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
  /** Where the command module's base is, relative to the pivot, along Y (undefined when there is none). */
  cmBase: number | undefined;
  /** +1 when the command module's nose points along travel, -1 when it points back; at the start and end of the shape. */
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
}

function kindOf(layout: VehicleLayout, parts: readonly VehiclePart[]): Kind {
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
}

const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
const _basis = new Matrix4();
const _q = new Quaternion();

/** Parts that visibly fall away when they come off. */
const DROPPABLE: ReadonlySet<string> = new Set([
  'first-stage',
  'aft-interstage',
  'second-stage',
  'third-stage',
  'escape-tower',
  'service-module',
  'lm-ascent-stage',
]);

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
  /** Holds the previous shape's dropped parts while they fall away. */
  private readonly trail = new Group();
  private metersPerPixel = 0;
  private lastShape = -1;
  /** The last good sideways reference, for when travel lines up with "up" (a vertical climb or fall). */
  private readonly lastSide = new Vector3(0, 0, 1);
  /** Reused list of parts falling away. */
  private readonly dropped: VehiclePart[] = [];

  constructor(
    readonly shipId: 'csm' | 'lm',
    changes: readonly VehicleChange[],
    elapsed: (change: VehicleChange) => number,
    kit: Kit,
    haloTexture: CanvasTexture,
    color: number,
  ) {
    this.root.name = `Ship ${shipId}`;
    this.root.add(this.body, this.trail);
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
    let stack: Group | null = null;
    for (const change of own) {
      const kind = kindOf(change.layout, change.parts);
      let group: Group;
      if (kind === 'stack') {
        stack ??= stackAssembly(kit);
        group = stack;
      } else if (kind === 'docked') group = dockedAssembly(kit);
      else if (kind === 'csm') group = csmAloneAssembly(kit);
      else if (kind === 'cm') group = cmAloneAssembly(kit);
      else group = lmAloneAssembly(kit);
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
      const shown = this.visibleParts(kind, change).filter((name) => !name.endsWith('-parachutes'));
      const [min, max] = extentOf(group, shown);
      let pivot: number;
      let pivotFrom: number | undefined;
      let facingStart: 1 | -1 = 1;
      let facingEnd: 1 | -1 = 1;
      if (kind === 'stack') {
        if (change.layout === 'launch') pivot = min;
        else {
          // The middle of the lunar module and the turned-around command and service module, once docked.
          pivot = (STACK.lmBase + STACK.lmBase + LM.tunnelTop + CSM.tunnelTop - CSM.bellExit) / 2;
          facingStart = change.layout === 'transposition' ? 1 : -1;
          facingEnd = -1;
        }
      } else if (kind === 'lm') {
        pivot = change.parts.includes('lm-descent-stage') ? 0 : LM.descentTop;
        // The ascent stage starts where it sat, on top of the descent stage left on the surface.
        if (!change.parts.includes('lm-descent-stage')) pivotFrom = 0;
      } else if (kind === 'cm') {
        pivot = 0;
        facingStart = -1;
        facingEnd = -1;
      } else {
        pivot = (min + max) / 2;
      }

      let cmBase: number | undefined;
      if (change.parts.includes('command-module')) {
        if (kind === 'stack') cmBase = this.stackCmBase(change.layout, 1) - pivot;
        else if (kind === 'cm') cmBase = 0;
        else cmBase = CSM.smTop - pivot;
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
        cmBase,
        facingStart,
        facingEnd,
        length: Math.max(1, max - min),
        middle: (min + max) / 2 - pivot,
        ...this.capSizes(group, change, kind, pivot),
      });
    }
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
  private shapeAt(time: number): number {
    let found = -1;
    for (let i = 0; i < this.shapes.length; i += 1) {
      if ((this.shapes[i] as Shape).time <= time + 1e-6) found = i;
    }
    return found;
  }

  /** Pose the model for this frame. Returns false when nothing is drawn. */
  update(pose: ShipPose, context: PoseContext): boolean {
    const index = pose.exists ? this.shapeAt(context.time) : -1;
    const shape = index >= 0 ? this.shapes[index] : undefined;
    if (!shape || shape.change.parts.length === 0 || context.unitsPerPixel <= 0) {
      this.root.visible = false;
      this.halo.visible = false;
      this.lastShape = -1;
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

    // Turning around (the command module's nose changes ends).
    const turning = settling && previous !== undefined && previous.facingEnd !== shape.facingStart;
    if (turning) this.body.rotation.x = Math.PI * (1 - u);

    // Parts that came off fall away, and the pivot settles from where it
    // was to where it now is. Changes can overlap: the first stage, the
    // interstage, and the tower come off within seconds of each other.
    let pivot = shape.pivot;
    this.trail.visible = false;
    for (let k = index; k > 0; k -= 1) {
      const later = this.shapes[k] as Shape;
      const earlier = this.shapes[k - 1] as Shape;
      const sinceK = (context.storyTime - context.toStory(later.time)) / DROP_STORY_SECONDS;
      if (sinceK < 0 || sinceK >= 1) break;
      if (earlier.group === shape.group && later.group === shape.group) {
        pivot -= (later.pivot - earlier.pivot) * (1 - ease(sinceK));
        this.dropWithinStack(earlier, later, sinceK);
      } else {
        if (k === index) this.showDropped(earlier, later, sinceK, turning);
        break;
      }
    }
    if (shape.pivotFrom !== undefined && since >= 0 && since < 1) {
      pivot = shape.pivotFrom + (pivot - shape.pivotFrom) * u;
    }
    shape.group.position.y = -pivot;

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

    // Apparent size: steady on screen, a little bigger for bigger stacks.
    const targetPixels = SHIP_SIZE_PX * context.sizeScale * Math.pow(shape.length / REFERENCE_LENGTH, SIZE_EXPONENT);
    const target = Math.min(
      targetPixels / shape.length,
      context.maxPixels / shape.largest,
      context.maxReachPixels / shape.reach,
    );
    if (context.snap || this.lastShape < 0 || this.metersPerPixel <= 0) this.metersPerPixel = 1 / target;
    else {
      const k = 1 - Math.exp(-context.dt / SIZE_SMOOTHING_SECONDS);
      this.metersPerPixel += (1 / target - this.metersPerPixel) * k;
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
      if (name === 'csm' || name === 'lm') {
        node.visible = true;
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
      node.position.y = rest + (name === 'escape-tower' ? distance * 0.8 : -distance);
      if (name === 'escape-tower') node.position.x = since * 6;
      node.scale.setScalar(1 - 0.35 * since);
    }
  }

  /** Between different models: show the previous model's dropped parts, lined up, drifting away. */
  private showDropped(previous: Shape, shape: Shape, since: number, turning: boolean): void {
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
    if (dropped.length === 0 || previous.cmBase === undefined || shape.cmBase === undefined) return;

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
      if (name === 'csm' || name === 'lm') {
        node.visible = true;
        continue;
      }
      node.visible = dropped.includes(name as VehiclePart);
    }
    // Line the previous model up with the new one as it stood at the change.
    const newCm = turning ? -shape.cmBase : shape.cmBase;
    group.position.y = -previous.pivot + (newCm - previous.cmBase);
    // Drift away from the spacecraft: back for a stage or service module, forward for a docked ascent stage.
    const forward = dropped.includes('lm-ascent-stage') ? 1 : -1;
    const distance = (2 + 18 * since * since) * forward;
    this.trail.position.set(0, distance, 0);
    this.trail.scale.setScalar(1 - 0.3 * since);
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
  private readonly largest: number;
  private readonly reach: number;

  constructor(item: LeftBehind, from: number, kit: Kit) {
    this.from = from;
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
/* Both ships.                                                         */
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

export function buildFleet(
  changes: readonly VehicleChange[],
  leftBehind: readonly LeftBehind[],
  elapsed: (moment: { at: VehicleChange['at'] }) => number,
  colors: { csm: number; lm: number },
): Fleet {
  const kit = makeKit();
  const texture = haloTexture();
  const ships = (['csm', 'lm'] as const).map(
    (id) => new ShipModel(id, changes, elapsed, kit, texture, colors[id]),
  );
  return {
    ships,
    leftBehind: leftBehind.map((item) => new LeftBehindModel(item, elapsed(item), kit)),
    dispose() {
      for (const ship of ships) ship.dispose();
      for (const geometry of kit.geometries.values()) geometry.dispose();
      for (const material of Object.values(kit)) {
        if (material instanceof MeshStandardMaterial || material instanceof LineBasicMaterial) material.dispose();
      }
      texture.dispose();
    },
  };
}
