/**
 * DEV ONLY: a page for checking the spacecraft models and the scene,
 * gallery.html at the project root. It is not part of the site: Vite builds
 * only index.html, and nothing in the site links here.
 *
 * Models, drawn side by side at one scale (meters), from the address bar:
 *   gallery.html?m=LAYOUT:PART+PART+...   one model; repeat m= for more
 *     add "|backward" to a model to fly it blunt end first
 *   &left=PART+PART    parts left behind, parked together at one site
 *                      (left of the row); &site=1 stands the first model
 *                      there too (a lunar module beside its rover)
 *   &yaw=35&pitch=12   turn the models, in degrees
 *   &dir=up|right      which way travel points on screen (default: up for
 *                      a launch layout, right otherwise)
 *   &halo=1            draw the glow behind each model, as the site does
 *   &preset=NAME       a named set, for example ?preset=saturn-ib (see PRESETS)
 * Problems with a part list are printed under the picture, as the site
 * reports them in the console while developing.
 *
 * The whole scene with a test flight (see fixtures.ts):
 *   gallery.html?flight=long-orbit&view=spacecraft&play=1&rate=4
 *   gallery.html?flight=pair&main=gemini&target=atda&t=06:10:00&view=spacecraft
 *   keys: space plays or pauses; 1-4 Earth, Moon, Ship, Journey views; +/- rate
 *   &reduced=1 asks for reduced motion
 */
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  LineSegments,
  Mesh,
  type Object3D,
  OrthographicCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Director, StoryMap } from '../../app/contract';
import { MissionPlayer } from '../../app/player';
import { elapsedToSeconds, type ElapsedTime, type EventView } from '../../content/types';
import type { LeftBehind, VehicleChange, VehicleLayout, VehiclePart } from '../../content/vehicle-types';
import { buildFlightPath, createStoryTime } from '../../sim';
import { SHIP_AMBIENT_INTENSITY, SHIP_COLORS, SHIP_SUN_INTENSITY } from '../config';
import { Stage } from '../stage';
import { buildFleet, type PoseContext } from '../vehicles';
import { fixture } from './fixtures';

const PRESETS: Record<string, string> = {
  'saturn-ib':
    'm=launch:saturn-ib-first-stage+third-stage+adapter+service-module+command-module+escape-tower&m=launch:first-stage+aft-interstage+second-stage+third-stage+adapter+lm-descent-stage+lm-ascent-stage+service-module+command-module+escape-tower&dir=up&yaw=20&pitch=8',
  'apollo-7': 'm=alone:service-module+command-module&m=alone:third-stage+adapter&yaw=40&pitch=20',
  atda: 'm=alone:atda+atda-shroud&m=alone:atda&m=launch:atlas+atda+atda-shroud&m=launch:atlas+agena+agena-shroud&yaw=30&pitch=10',
  spacewalk:
    'm=alone:gemini-equipment-section+gemini-retro-section+gemini-reentry-module+spacewalker&m=alone:service-module+command-module+spacewalker&yaw=25&pitch=25',
  rover: 'm=alone:lm-descent-stage+lm-ascent-stage&left=lunar-rover&site=1&yaw=20&pitch=25',
  'rover-after-liftoff': 'left=lm-descent-stage+lunar-rover&yaw=20&pitch=25',
  'apollo-13':
    'm=alone:service-module-damaged+command-module&m=docked:lm-descent-stage+lm-ascent-stage+command-module&m=alone:service-module-damaged&yaw=15&pitch=10',
  'gemini-targets': 'm=docked:gemini-equipment-section+gemini-retro-section+gemini-reentry-module+agena&m=docked:gemini-equipment-section+gemini-retro-section+gemini-reentry-module+atda&yaw=30&pitch=15',
  warnings: 'm=alone:lunar-rover&m=launch:titan-first-stage+titan-second-stage+spacewalker&m=alone:third-stage+gemini-main-parachute',
};

const params = new URLSearchParams(window.location.search);
const preset = params.get('preset');
if (preset && PRESETS[preset]) {
  for (const [key, value] of new URLSearchParams(PRESETS[preset])) {
    if (key === 'm') params.append(key, value);
    else if (!params.has(key)) params.set(key, value);
  }
}

const label = document.getElementById('label') as HTMLElement;
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const notes: string[] = [];
const warn = console.warn.bind(console);
console.warn = (...args: unknown[]): void => {
  notes.push(args.map(String).join(' '));
  label.textContent = [label.dataset['title'] ?? '', ...notes].join('\n');
  warn(...args);
};

const flightName = params.get('flight');
if (flightName) void showFlight(flightName);
else showModels();

/* ------------------------------------------------------------------ */
/* Models side by side.                                                */
/* ------------------------------------------------------------------ */

function showModels(): void {
  const AT = { value: '000:00:00', citations: [] } as unknown as VehicleChange['at'];
  const specs = params.getAll('m');
  const changes: VehicleChange[] = specs.map((spec, i) => {
    const [main = '', option] = spec.split('|');
    const [layout = 'alone', list = ''] = main.split(':');
    const parts = list.split(/[+ ,]/).filter(Boolean) as VehiclePart[];
    return {
      ship: `m${i}`,
      at: AT,
      label: `model ${i + 1}`,
      layout: layout as VehicleLayout,
      parts,
      ...(option === 'backward' ? { facing: 'backward' as const } : {}),
    };
  });
  const leftParts = (params.get('left') ?? '').split(/[+ ,]/).filter(Boolean) as VehiclePart[];
  const leftBehind: LeftBehind[] = leftParts.map((part) => ({ part, ship: 'site', at: AT, label: `left behind: ${part}` }));
  label.dataset['title'] = [
    ...changes.map((c, i) => `${i + 1}. ${c.layout}: ${c.parts.join(' + ')}${c.facing ? ` (${c.facing})` : ''}`),
    leftParts.length ? `left behind: ${leftParts.join(' + ')}` : '',
    changes.length === 0 && leftParts.length === 0 ? `presets: ${Object.keys(PRESETS).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  label.textContent = [label.dataset['title'], ...notes].join('\n');

  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x05070b, 1);
  const scene = new Scene();
  const yaw = (Number(params.get('yaw') ?? 35) * Math.PI) / 180;
  const pitch = (Number(params.get('pitch') ?? 12) * Math.PI) / 180;
  const sun = new DirectionalLight(0xffffff, SHIP_SUN_INTENSITY);
  sun.position.set(0.6, 0.8, 1.0);
  scene.add(sun, new AmbientLight(0xffffff, SHIP_AMBIENT_INTENSITY));

  const fleet = buildFleet(
    changes.map((c, i) => ({ id: c.ship, color: i === 0 ? SHIP_COLORS.main : SHIP_COLORS.other })),
    changes,
    leftBehind,
    () => 0,
  );
  // The glow behind each model only with &halo=1.
  for (const model of fleet.ships) scene.add(...(params.get('halo') === '1' ? [model.halo] : []), model.root);
  for (const part of fleet.leftBehind) scene.add(part.root);

  const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -yaw).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pitch));
  const context: PoseContext = {
    time: 1,
    storyTime: 100,
    toStory: (time) => time,
    unitsPerPixel: 1,
    sizeScale: 1,
    maxPixels: Infinity,
    maxReachPixels: Infinity,
    dt: 0,
    snap: true,
    reducedMotion: false,
    metersPerPixel: 1,
    opacity: 1,
  };
  const site = params.get('site') === '1';
  const poses = changes.map((c) => {
    const up = params.get('dir') ?? (c.layout === 'launch' ? 'up' : 'right');
    const forward = up === 'up' ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    const top = up === 'up' ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
    return { exists: true, position: new Vector3(), forward: forward.applyQuaternion(turn), up: top.applyQuaternion(turn) };
  });
  const siteUp = new Vector3(0, 1, 0).applyQuaternion(turn);
  const siteFront = new Vector3(1, 0, 0).applyQuaternion(turn);

  /** Pose everything with world units in meters; returns the visible box of each model. */
  const pose = (unitsPerPixel: number): Box3[] => {
    context.unitsPerPixel = unitsPerPixel;
    context.metersPerPixel = unitsPerPixel;
    const boxes = fleet.ships.map((model, i) => {
      model.update(poses[i]!, context);
      return visibleBox(model.root);
    });
    for (const part of fleet.leftBehind) part.update(true, new Vector3(), siteUp, siteFront, context);
    return boxes;
  };

  // Lay the models out in a row, left to right, with the site (if any) first.
  const boxes = pose(1);
  let x = 0;
  const gap = 3;
  if (fleet.leftBehind.length > 0) {
    const siteBox = new Box3();
    for (const part of fleet.leftBehind) siteBox.union(visibleBox(part.root));
    if (site && boxes[0]) siteBox.union(boxes[0]);
    for (const part of fleet.leftBehind) part.root.position.x -= siteBox.min.x;
    x = siteBox.max.x - siteBox.min.x + gap;
  }
  poses.forEach((p, i) => {
    const box = boxes[i]!;
    if (site && i === 0 && fleet.leftBehind.length > 0) {
      p.position.x = fleet.leftBehind[0]!.root.position.x;
      return;
    }
    if (box.isEmpty()) return;
    p.position.x = x - box.min.x;
    p.position.y = -(box.min.y + box.max.y) / 2;
    if (changes[i]?.layout === 'launch') p.position.y = -box.min.y;
    x += box.max.x - box.min.x + gap;
  });
  const sitePosition = new Vector3(fleet.leftBehind[0]?.root.position.x ?? 0, 0, 0);
  const finalPose = (unitsPerPixel: number): void => {
    context.unitsPerPixel = unitsPerPixel;
    context.metersPerPixel = unitsPerPixel;
    fleet.ships.forEach((model, i) => model.update(poses[i]!, context));
    for (const part of fleet.leftBehind) part.update(true, sitePosition, siteUp, siteFront, context);
  };
  finalPose(1);
  const all = new Box3();
  for (const model of fleet.ships) all.union(visibleBox(model.root));
  for (const part of fleet.leftBehind) all.union(visibleBox(part.root));
  if (all.isEmpty()) all.setFromCenterAndSize(new Vector3(), new Vector3(10, 10, 10));

  const camera = new OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);
  const resize = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    const center = all.getCenter(new Vector3());
    const size = all.getSize(new Vector3());
    const aspect = width / height;
    // Room at the top for the label.
    const h = Math.max(size.y * 1.25, (size.x * 1.12) / aspect);
    const w = h * aspect;
    camera.left = center.x - w / 2;
    camera.right = center.x + w / 2;
    camera.top = center.y + h * 0.56;
    camera.bottom = center.y - h * 0.44;
    camera.updateProjectionMatrix();
    finalPose(h / height);
    renderer.render(scene, camera);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
}

/** The box around the meshes and lines of an object that are drawn (every parent visible). */
function visibleBox(root: Object3D): Box3 {
  root.updateMatrixWorld(true);
  const box = new Box3();
  const part = new Box3();
  const shown = (object: Object3D): boolean => {
    for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
    return true;
  };
  root.traverse((child) => {
    if (!(child instanceof Mesh) && !(child instanceof LineSegments)) return;
    if (!shown(child)) return;
    child.geometry.computeBoundingBox();
    if (child.geometry.boundingBox) box.union(part.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld));
  });
  return box;
}

/* ------------------------------------------------------------------ */
/* The whole scene with a test flight.                                 */
/* ------------------------------------------------------------------ */

async function showFlight(name: string): Promise<void> {
  const bundle = fixture(name, params);
  const mission = bundle.mission;
  let path;
  try {
    path = buildFlightPath(bundle.flight);
  } catch (error) {
    label.textContent = `The test flight could not be built: ${String(error)}`;
    throw error;
  }
  const storyTime = createStoryTime([path.start, path.end, ...mission.events.map((e) => elapsedToSeconds(e.elapsed))]);
  const story: StoryMap = {
    duration: storyTime.length,
    toStory: (seconds) => storyTime.toStory(seconds),
    toElapsed: (seconds) => storyTime.toMission(seconds),
  };
  const keys = storyTime.keyTimes;
  const player = new MissionPlayer(keys[0] ?? path.start, keys[keys.length - 1] ?? path.end, story);
  const t = params.get('t');
  if (t) player.seek(/^-?\d+(\.\d+)?$/.test(t) ? Number(t) : elapsedToSeconds(t as ElapsedTime));
  const rate = Number(params.get('rate') ?? 1);
  if (rate > 0) player.setRate(rate);

  const stage = Stage.create(canvas, {
    path,
    player,
    mission,
    vehicle: bundle.vehicle,
    leftBehind: bundle.leftBehind,
    onContextLost: () => undefined,
    onContextRestored: () => undefined,
  });
  stage.setReducedMotion(params.get('reduced') === '1');
  const views: Record<string, EventView> = { earth: 'earth', moon: 'moon', spacecraft: 'spacecraft', ship: 'spacecraft', journey: 'journey' };
  const view = views[params.get('view') ?? ''];
  if (view) stage.setView(view);
  await stage.load(() => undefined);
  stage.start();
  if (params.get('play') === '1') player.play();

  const director: Director = stage;
  const status = (): void => {
    const s = Math.round(player.time);
    const sign = s < 0 ? '-' : '';
    const a = Math.abs(s);
    const time = `${sign}${String(Math.floor(a / 3600)).padStart(3, '0')}:${String(Math.floor((a % 3600) / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
    label.textContent = [`${name} ${time} ${player.playing ? 'playing' : 'paused'} ${player.rate}x ${director.view}`, ...notes].join('\n');
  };
  player.subscribe(status);
  director.subscribe(status);
  status();
  window.addEventListener('keydown', (event) => {
    const byKey: Record<string, EventView> = { '1': 'earth', '2': 'moon', '3': 'spacecraft', '4': 'journey' };
    if (event.key === ' ') {
      event.preventDefault();
      if (player.playing) player.pause();
      else player.play();
    } else if (byKey[event.key]) {
      director.setView(byKey[event.key]!);
    } else if (event.key === '+' || event.key === '=') {
      player.setRate(player.rate * 2);
    } else if (event.key === '-') {
      player.setRate(Math.max(0.25, player.rate / 2));
    }
  });
  // For screenshots: the page's own hooks.
  (window as unknown as { dev: unknown }).dev = { player, stage };
}
