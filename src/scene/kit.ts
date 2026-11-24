/**
 * The kit for extras: small activities (src/extras/) that each draw a 3D
 * view of their own in a sheet, with the same look as the main scene. Use
 * only what this file exports; never reach into stage.ts or vehicles.ts.
 *
 * A typical extra:
 *
 *   const view = createMiniView(canvas, { stars: true });
 *   const rocket = createVehicle({ layout: 'launch', parts: [...] });
 *   view.scene.add(rocket.object);
 *   view.frame(new Vector3(0, rocket.top / 2, 0), rocket.top / 2);
 *   const stop = view.addFrameCallback((dt) => { ...; return true; }); // animate
 *   ...
 *   stop(); rocket.dispose(); view.dispose();
 *
 * Units: a vehicle is built in meters. The globes are in the main scene's
 * units: Earth's radius is 1 and the Moon's is about 0.273 (their true
 * ratio). Put either in its own view, or scale a vehicle down to sit by
 * one (a real spacecraft is far too small to see next to a globe).
 */
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
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  AdditiveBlending,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EARTH_RADIUS, MOON_RADIUS } from '../content/physical-constants';
import type { VehicleLayout, VehiclePart } from '../content/vehicle-types';
import type { GroundPoint } from '../sim/frames';
import {
  AMBIENT_INTENSITY,
  CAMERA_FOV,
  PORTRAIT_MAX_FOV,
  PORTRAIT_MIN_HORIZONTAL_FOV,
  SHIP_AMBIENT_INTENSITY,
  SHIP_COLORS,
  SHIP_SUN_INTENSITY,
  SUN_INTENSITY,
} from './config';
import { createEarth as createEarthGlobe } from './earth';
import { fitDistance } from './framing';
import { createMarkers, type MarkerSet } from './markers';
import { createMoon as createMoonGlobe } from './moon';
import { createStarfield, type Starfield } from './stars';
import { chooseTextureTier, loadTexture, type TextureTier } from './textures';
import { buildStandaloneVehicle, launchStackHeights, type StackHeights } from './vehicles';
import { webGL2Available } from './webgl';

export type { VehicleLayout, VehiclePart } from '../content/vehicle-types';

/* ------------------------------------------------------------------ */
/* Colors and small pieces.                                            */
/* ------------------------------------------------------------------ */

/**
 * The site's colors for spacecraft and their paths: amber for the crew's
 * main spacecraft (and its rocket), aqua for every other craft (a lunar
 * module, a target vehicle).
 */
export const COLORS = { main: SHIP_COLORS.main, other: SHIP_COLORS.other } as const;

/** Most device pixels per CSS pixel a view draws at, as the main scene (sharper costs too much on phones). */
export const MAX_PIXEL_RATIO = 2;

/** A soft round glow, drawn once and shared. */
let glowTexture: CanvasTexture | null = null;
function glowMap(): CanvasTexture {
  if (glowTexture) return glowTexture;
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
  glowTexture = new CanvasTexture(canvas);
  return glowTexture;
}

/**
 * A soft glow sprite, like the one the main scene draws behind each
 * spacecraft so it can be found. `size` is its width in scene units (it
 * grows and shrinks with distance); set `.position` to place it. Dispose
 * its material when done (`glow.material.dispose()`).
 */
export function createGlow(color: number = COLORS.main, size = 1, opacity = 0.55): Sprite {
  const sprite = new Sprite(
    new SpriteMaterial({
      map: glowMap(),
      color,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  sprite.scale.setScalar(size);
  sprite.renderOrder = -1;
  return sprite;
}

/**
 * The unit vector toward a latitude and longitude (degrees; north and east
 * positive) on a globe of the kit, in the globe's own frame: longitude 0 on
 * +X, east toward -Z, north on +Y. Multiply by the radius for the surface.
 */
export function latLonToVector(latitude: number, longitude: number, out = new Vector3()): Vector3 {
  const lat = MathUtils.degToRad(latitude);
  const lon = MathUtils.degToRad(longitude);
  return out.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
}

/** The latitude and longitude (degrees) of a direction in a globe's own frame (the reverse of latLonToVector). */
export function vectorToLatLon(direction: Vector3): GroundPoint {
  const d = direction.clone().normalize();
  return {
    latitude: MathUtils.radToDeg(Math.asin(MathUtils.clamp(d.y, -1, 1))),
    longitude: MathUtils.radToDeg(Math.atan2(-d.z, d.x)),
  };
}

/* ------------------------------------------------------------------ */
/* A view of its own.                                                  */
/* ------------------------------------------------------------------ */

/**
 * Thrown by createMiniView when the browser cannot draw 3D (no WebGL 2).
 * Catch it and show the extra's own fallback; nothing is logged.
 */
export class MiniViewUnavailableError extends Error {
  constructor() {
    super('WebGL 2 is not available');
    this.name = 'MiniViewUnavailableError';
  }
}

/** True when this browser can draw the kit's 3D views (WebGL 2), checked once on a throwaway canvas, quietly. */
export { webGL2Available } from './webgl';

export interface MiniViewOptions {
  /** Draw the star map behind everything (default false). */
  stars?: boolean;
  /**
   * The light: "models" (default) lights spacecraft as the main scene does
   * (bright, with fill light, to be seen); "globes" lights Earth and the
   * Moon as it does (one Sun, dark night sides).
   */
  lighting?: 'models' | 'globes';
  /**
   * Let the person look around by dragging, pinching, and arrow keys
   * (default true; see setControls). Give the canvas tabindex="0" so it can
   * take the arrow keys.
   */
  controls?: boolean;
  /** Vertical field of view on wide screens, degrees (default the main scene's, 40); tall screens widen it. */
  fov?: number;
  /** Nearest and farthest distances drawn, scene units (defaults 0.01 and 2000). */
  near?: number;
  far?: number;
  /** Called when the browser takes the WebGL context away, and when it gives it back (the view redraws itself). */
  onContextLost?(): void;
  onContextRestored?(): void;
}

/** A callback run before each frame while registered; return true to say something moved (it is drawn). */
export type FrameCallback = (seconds: number, nowMs: number) => boolean | void;

export interface MiniView {
  readonly renderer: WebGLRenderer;
  /** Add your objects here. */
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  /** The Sun's light (see setSunDirection). */
  readonly sun: DirectionalLight;
  /** The looking-around controls (three.js OrbitControls); `controls.target` is the point looked at. */
  readonly controls: OrbitControls;
  /** True while the person asks for reduced motion (it follows their setting live): animate gently or not at all. */
  readonly reducedMotion: boolean;
  /** Turn looking around on or off. */
  setControls(enabled: boolean): void;
  /** Point the Sun's light from this direction (world space); pass it to a globe's setSunDirection too. */
  setSunDirection(direction: Vector3): void;
  /**
   * Put the camera where a sphere (center, radius) fills the view, looking
   * at its center from `direction` (default: from the front, a little above
   * and to the right). The controls then turn about that center.
   */
  frame(center: Vector3, radius: number, direction?: Vector3): void;
  /** Draw on the next frame (after changing something while nothing animates). */
  requestRender(): void;
  /**
   * Run `callback` before every frame until the returned function is called
   * (or it returns false for "nothing moved" and you remove it). The view
   * draws every frame while any callback is registered.
   */
  addFrameCallback(callback: FrameCallback): () => void;
  /**
   * Free the renderer and its WebGL context (each view has its own, apart
   * from the main scene's), the controls, and what the view itself made.
   * Not the objects you added: dispose those yourself, first.
   */
  dispose(): void;
}

/**
 * A three.js renderer, scene, and camera on `canvas`, set up like the main
 * scene (sRGB output, its lights, a pixel ratio of at most two, black
 * background, optional star map). It resizes with its canvas (give the
 * canvas a size in CSS), draws only when asked or while a frame callback
 * runs, stops drawing while the page is hidden, survives the loss of the
 * WebGL context, and follows the person's reduced-motion setting (no
 * drifting after a drag). Throws MiniViewUnavailableError, without logging
 * anything, when WebGL 2 is not available (see webGL2Available).
 */
export function createMiniView(canvas: HTMLCanvasElement, options: MiniViewOptions = {}): MiniView {
  if (!webGL2Available()) throw new MiniViewUnavailableError();
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 1);
  const scene = new Scene();
  scene.background = new Color(0x000000);
  const baseFov = options.fov ?? CAMERA_FOV;
  const camera = new PerspectiveCamera(baseFov, 1, options.near ?? 0.01, options.far ?? 2000);
  camera.position.set(0, 0, 10);
  const globes = options.lighting === 'globes';
  const sun = new DirectionalLight(0xffffff, globes ? SUN_INTENSITY : SHIP_SUN_INTENSITY);
  sun.position.set(0.6, 0.8, 1).multiplyScalar(100);
  scene.add(
    sun,
    sun.target,
    new AmbientLight(0xffffff, globes ? AMBIENT_INTENSITY : SHIP_AMBIENT_INTENSITY),
  );

  let stars: Starfield | null = null;
  if (options.stars) {
    const tier = chooseTextureTier(renderer.capabilities.maxTextureSize);
    const texture = loadTexture('stars', tier, 1, () => view.requestRender());
    stars = createStarfield(texture, (options.far ?? 2000) * 0.45);
    scene.add(stars.mesh);
  }

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.9;
  controls.enabled = options.controls ?? true;
  controls.listenToKeyEvents(canvas);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const applyMotion = (): void => {
    controls.enableDamping = !motion.matches;
    controls.dampingFactor = 0.08;
  };
  applyMotion();
  motion.addEventListener('change', applyMotion);

  const callbacks = new Set<FrameCallback>();
  let frame: number | null = null;
  let last: number | null = null;
  let lost = false;
  let disposed = false;

  const draw = (): void => {
    if (stars) stars.mesh.position.copy(camera.position);
    renderer.render(scene, camera);
  };
  const tick = (now: number): void => {
    frame = null;
    if (disposed || lost) return;
    const seconds = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    let moved = false;
    for (const callback of [...callbacks]) if (callback(seconds, now) !== false) moved = true;
    // Damping keeps the view drifting a moment after a drag.
    if (controls.update(seconds)) moved = true;
    draw();
    if (callbacks.size > 0 || moved) schedule();
    else last = null;
  };
  const schedule = (): void => {
    if (frame === null && !disposed && !lost && document.visibilityState === 'visible')
      frame = requestAnimationFrame(tick);
  };

  const resize = (): void => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Tall screens get a wider vertical field, so the sides are not cut too close (as the main scene does).
    const minHorizontal = MathUtils.degToRad(PORTRAIT_MIN_HORIZONTAL_FOV);
    const vertical = MathUtils.radToDeg(2 * Math.atan(Math.tan(minHorizontal / 2) / camera.aspect));
    camera.fov = MathUtils.clamp(vertical, baseFov, Math.max(baseFov, PORTRAIT_MAX_FOV));
    camera.updateProjectionMatrix();
    markerSets.forEach((set) => set.setPixelRatio(renderer.getPixelRatio()));
    if (!lost) draw();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const onVisibility = (): void => schedule();
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = (event: Event): void => {
    event.preventDefault();
    lost = true;
    options.onContextLost?.();
  };
  const onRestored = (): void => {
    lost = false;
    options.onContextRestored?.();
    resize();
    schedule();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  const onControls = (): void => schedule();
  controls.addEventListener('change', onControls);

  const view: MiniView = {
    renderer,
    scene,
    camera,
    sun,
    controls,
    get reducedMotion() {
      return motion.matches;
    },
    setControls(enabled) {
      controls.enabled = enabled;
    },
    setSunDirection(direction) {
      sun.position.copy(direction).normalize().multiplyScalar(100);
      schedule();
    },
    frame(center, radius, direction = new Vector3(0.35, 0.25, 1).normalize()) {
      const up = new Vector3(0, 1, 0);
      const distance = fitDistance(
        camera,
        center,
        direction,
        [{ center, radius }],
        1.08,
        { width: 1, height: 1 },
        up,
      );
      camera.position.copy(center).addScaledVector(direction, Math.max(distance, radius * 1.2));
      camera.up.copy(up);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.minDistance = radius * 1.05;
      controls.maxDistance = Math.max(distance * 4, radius * 4);
      camera.near = Math.max(1e-4, distance * 0.002);
      camera.updateProjectionMatrix();
      controls.update();
      schedule();
    },
    requestRender() {
      schedule();
    },
    addFrameCallback(callback) {
      callbacks.add(callback);
      schedule();
      return () => {
        callbacks.delete(callback);
      };
    },
    dispose() {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      callbacks.clear();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      motion.removeEventListener('change', applyMotion);
      controls.removeEventListener('change', onControls);
      controls.dispose();
      stars?.dispose();
      (stars?.mesh.material as { map?: { dispose(): void } } | undefined)?.map?.dispose();
      renderer.dispose();
      // Give the WebGL context back now, rather than when the page goes:
      // browsers allow only a few at once, and would drop the main scene's.
      renderer.forceContextLoss();
    },
  };
  const markerSets = viewMarkers(view);
  resize();
  return view;
}

/** Marker sets drawn in each view, so their point size follows the pixel ratio. */
const markersByView = new WeakMap<MiniView, Set<MarkerSet>>();
function viewMarkers(view: MiniView): Set<MarkerSet> {
  let sets = markersByView.get(view);
  if (!sets) {
    sets = new Set();
    markersByView.set(view, sets);
  }
  return sets;
}

/* ------------------------------------------------------------------ */
/* Spacecraft.                                                         */
/* ------------------------------------------------------------------ */

export interface VehicleOptions {
  /** How the parts go together, as in a mission's vehicle file ("launch", "docked", "alone", ...). */
  layout: VehicleLayout;
  /** The parts to show, as in a mission's vehicle file (see VehiclePart in src/content/vehicle-types.ts). */
  parts: readonly VehiclePart[];
  /** "backward" turns a craft in orbit blunt end first (as VehicleChange.facing). */
  facing?: 'forward' | 'backward';
}

export interface Vehicle {
  /** Add this to a scene. +Y runs up the stack (a craft's way of travel), +Z is its top (Gemini's hatches). */
  readonly object: Group;
  /**
   * The model's lowest and highest points along +Y and its length, in
   * meters as the model is built (times any scale you set with setHeight).
   * A launch stack stands with its lowest point at 0; anything else is
   * centered on the origin.
   */
  readonly bottom: number;
  readonly top: number;
  readonly length: number;
  /** The parts it shows (a part a shape cannot show is left out, with a warning in the console). */
  readonly parts: readonly VehiclePart[];
  /** Show or hide one part (a stage that has fallen away, a shroud that came off). */
  setPartVisible(part: VehiclePart, visible: boolean): void;
  /**
   * Move one part away from the rest, the staging look: a stage falls back
   * (-Y), a tower or nose shroud goes forward and to the side, by `meters`
   * of the model (0 puts it back). Hide it once it is far enough.
   */
  drift(part: VehiclePart, meters: number): void;
  /** Scale the model so its length is `meters` (to stand stacks side by side at cited heights). */
  setHeight(meters: number): void;
  dispose(): void;
}

/**
 * The same simplified spacecraft model a mission draws for this layout and
 * part list, in meters, as an object to add to a view's scene. Each vehicle
 * has its own materials and shapes; dispose it when done.
 */
export function createVehicle(options: VehicleOptions): Vehicle {
  const model = buildStandaloneVehicle(options.layout, options.parts, options.facing ?? 'forward');
  let scale = 1;
  return {
    object: model.object,
    get bottom() {
      return model.bottom * scale;
    },
    get top() {
      return model.top * scale;
    },
    get length() {
      return model.length * scale;
    },
    parts: model.parts,
    setPartVisible: model.setPartVisible,
    drift: model.drift,
    setHeight(meters) {
      scale = model.length > 0 ? meters / model.length : 1;
      model.object.scale.setScalar(scale);
    },
    dispose: model.dispose,
  };
}

/**
 * The full launch stacks' heights as the models draw them, in meters, lowest
 * engine bell to tip: Saturn V and Saturn IB with an Apollo spacecraft and
 * escape tower, Titan II with a Gemini spacecraft, Atlas with an Agena under
 * its shroud. These are drawing sizes, not cited facts: only the Saturn
 * IB's stage sizes follow a cited source (NASA MSFC drawing 0100801,
 * "Saturn IB Launch Vehicle", 1968); the others were proportioned by eye
 * from photos. To stand stacks side by side at true relative size, cite
 * each height from NASA and call `setHeight` with it.
 */
let heights: ReturnType<typeof launchStackHeights> | null = null;
export function stackHeights(): StackHeights {
  heights ??= launchStackHeights();
  return heights;
}

/* ------------------------------------------------------------------ */
/* Earth and the Moon.                                                 */
/* ------------------------------------------------------------------ */

export interface GlobeOptions {
  /** The view it will be drawn in: its texture quality fits that view's device, and the view redraws when the texture arrives. */
  view: MiniView;
  /** Fewer facets, for a small view (default "high" on a large screen, "low" on a phone). */
  detail?: 'low' | 'high';
}

export interface MarkerOptions {
  /** "ring" (default): a white ring, as the main scene marks a landing or launch site; "dot": a dot in `color`. */
  style?: 'ring' | 'dot';
  color?: number;
}

export interface Globe {
  /** Add this to the scene. Move it with setCenter (Earth's glow needs to know). */
  readonly root: Group;
  /** The turning sphere; things fixed to the ground (markers) ride on it. */
  readonly surface: Mesh;
  /** Its radius in scene units: Earth's is 1, the Moon's about 0.273 (their true ratio). */
  readonly radius: number;
  /** Resolves when the texture has arrived (the globe is drawn plain gray until then). */
  readonly ready: Promise<void>;
  /** Move its center. */
  setCenter(position: Vector3): void;
  /** Point its day side toward the Sun (world direction); give the view's setSunDirection the same direction. */
  setSunDirection(direction: Vector3): void;
  /** The world position of a latitude and longitude (degrees) at a height above the surface (scene units). */
  pointAt(latitude: number, longitude: number, height?: number, out?: Vector3): Vector3;
  /** Mark a latitude and longitude with a small marker of steady size on screen; returns a function that removes it. */
  addMarker(latitude: number, longitude: number, options?: MarkerOptions): () => void;
  /**
   * Turn the globe so a latitude and longitude face `toward` (a world
   * direction from the globe's center, for example toward the camera),
   * north kept up. Over `seconds` (at once under reduced motion or for 0);
   * resolves when done.
   */
  turnTo(latitude: number, longitude: number, toward: Vector3, seconds?: number): Promise<void>;
  /**
   * The latitude and longitude under a pointer position on the view's
   * canvas (CSS pixels from the canvas's top left, as event.offsetX and
   * offsetY), or null when the pointer is off the globe.
   */
  pick(x: number, y: number): GroundPoint | null;
  dispose(): void;
}

/** Set up a globe of the kit around one of the main scene's globes. */
function kitGlobe(
  view: MiniView,
  root: Group,
  surface: Mesh,
  radius: number,
  ready: Promise<void>,
  setSun: (direction: Vector3) => void,
  setCenter: (position: Vector3) => void,
  dispose: () => void,
): Globe {
  const markers = new Set<MarkerSet>();
  const sets = viewMarkers(view);
  const turnTo = (
    latitude: number,
    longitude: number,
    toward: Vector3,
    seconds = 0,
  ): Promise<void> => {
    // The turn that carries the place's normal (and north) to the wanted direction (and up).
    const parent = surface.parent ?? root;
    parent.updateMatrixWorld(true);
    const parentTurn = new Quaternion();
    parent.getWorldQuaternion(parentTurn);
    const inverse = parentTurn.clone().invert();
    const d = toward.clone().normalize().applyQuaternion(inverse);
    const worldUp = new Vector3(0, 1, 0).applyQuaternion(inverse);
    const up = worldUp.clone().addScaledVector(d, -worldUp.dot(d));
    if (up.lengthSq() < 1e-8) up.set(1, 0, 0).addScaledVector(d, -d.x);
    up.normalize();
    const east = new Vector3().crossVectors(up, d);
    const n = latLonToVector(latitude, longitude);
    const north = new Vector3(0, 1, 0).addScaledVector(n, -n.y);
    if (north.lengthSq() < 1e-8) north.set(-1, 0, 0);
    north.normalize();
    const localEast = new Vector3().crossVectors(north, n);
    const local = new Matrix4().makeBasis(localEast, north, n);
    const world = new Matrix4().makeBasis(east, up, d);
    const goal = new Quaternion().setFromRotationMatrix(world.multiply(local.transpose()));
    const from = surface.quaternion.clone();
    if (seconds <= 0 || view.reducedMotion) {
      surface.quaternion.copy(goal);
      view.requestRender();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let time = 0;
      const stop = view.addFrameCallback((dt) => {
        time += dt;
        const u = MathUtils.clamp(time / seconds, 0, 1);
        surface.quaternion.slerpQuaternions(from, goal, u * u * (3 - 2 * u));
        if (u >= 1) {
          stop();
          resolve();
        }
        return true;
      });
    });
  };
  return {
    root,
    surface,
    radius,
    ready,
    setCenter(position) {
      setCenter(position);
      view.requestRender();
    },
    setSunDirection(direction) {
      setSun(direction);
      view.requestRender();
    },
    pointAt(latitude, longitude, height = 0, out = new Vector3()) {
      root.updateMatrixWorld(true);
      return surface.localToWorld(
        latLonToVector(latitude, longitude, out).multiplyScalar(radius + height),
      );
    },
    addMarker(latitude, longitude, options = {}) {
      const p = latLonToVector(latitude, longitude)
        .multiplyScalar(radius * 1.002)
        .toArray();
      const ring = (options.style ?? 'ring') === 'ring';
      const set = createMarkers(
        [{ readable: p, true: p, color: options.color ?? COLORS.main, eventIndex: ring ? -1 : 0 }],
        ring,
      );
      // A dot is drawn as the main scene draws the current event: the color in a white ring.
      set.setCurrent(ring ? -10 : 0);
      set.setPixelRatio(view.renderer.getPixelRatio());
      surface.add(set.points);
      markers.add(set);
      sets.add(set);
      view.requestRender();
      return () => {
        surface.remove(set.points);
        set.dispose();
        markers.delete(set);
        sets.delete(set);
        view.requestRender();
      };
    },
    turnTo,
    pick(x, y) {
      const canvas = view.renderer.domElement;
      const pointer = new Vector2(
        (x / Math.max(1, canvas.clientWidth)) * 2 - 1,
        -(y / Math.max(1, canvas.clientHeight)) * 2 + 1,
      );
      const raycaster = new Raycaster();
      raycaster.setFromCamera(pointer, view.camera);
      const hit = raycaster.intersectObject(surface, false)[0];
      if (!hit) return null;
      return vectorToLatLon(surface.worldToLocal(hit.point.clone()));
    },
    dispose() {
      for (const set of markers) {
        surface.remove(set.points);
        set.dispose();
        sets.delete(set);
      }
      markers.clear();
      dispose();
    },
  };
}

/** How sharply a globe is drawn: the size of its map, and how many facets it has. */
interface GlobeQuality {
  tier: TextureTier;
  detail: 'low' | 'high';
}

/** Texture tier and detail for a view. */
function globeQuality(view: MiniView, detail: GlobeOptions['detail']): GlobeQuality {
  const tier = chooseTextureTier(view.renderer.capabilities.maxTextureSize);
  return { tier, detail: detail ?? (tier === '4k' ? 'high' : 'low') };
}

/**
 * The Moon as the main scene draws it (the NASA CGI Moon Kit map, a dim
 * night side), radius about 0.273, centered on the origin, with longitude
 * 0 (the middle of the near side) facing +Z until you turn it.
 */
export function createMoon(options: GlobeOptions): Globe {
  const { view } = options;
  const { tier, detail } = globeQuality(view, options.detail);
  let done: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    done = resolve;
  });
  const texture = loadTexture(
    'moon',
    tier,
    view.renderer.capabilities.getMaxAnisotropy(),
    () => {
      done();
      view.requestRender();
    },
    () => done(),
  );
  const moon = createMoonGlobe(texture, detail);
  const surface = moon.root.children[0] as Mesh;
  return kitGlobe(
    view,
    moon.root,
    surface,
    MOON_RADIUS,
    ready,
    (direction) => moon.setSunDirection(direction),
    (position) => moon.root.position.copy(position),
    () => {
      moon.dispose();
      texture.dispose();
    },
  );
}

/**
 * Earth as the main scene draws it (NASA Blue Marble, a thin glow at the
 * edge on the day side, a dim night side), radius 1, its axis tilted as in
 * space; longitude 0 faces +X until you turn it.
 */
export function createEarth(options: GlobeOptions): Globe {
  const { view } = options;
  const { tier, detail } = globeQuality(view, options.detail);
  let done: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    done = resolve;
  });
  const texture = loadTexture(
    'earth',
    tier,
    view.renderer.capabilities.getMaxAnisotropy(),
    () => {
      done();
      view.requestRender();
    },
    () => done(),
  );
  const earth = createEarthGlobe(texture, detail);
  return kitGlobe(
    view,
    earth.root,
    earth.globe,
    EARTH_RADIUS,
    ready,
    (direction) => earth.setSunDirection(direction),
    (position) => earth.setCenter(position),
    () => {
      earth.dispose();
      texture.dispose();
    },
  );
}

/** Free the shapes and materials of objects you built yourself and added to a view (not kit vehicles or globes: dispose those). */
export function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    const mesh = child as Partial<Mesh>;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}
