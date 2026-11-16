import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  MathUtils,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Director, Player, ViewInsets } from '../app/contract';
import type { LeftBehind, VehicleChange } from '../content/missions/apollo-11-vehicle';
import { EARTH_RADIUS, MOON_RADIUS } from '../content/physical-constants';
import { elapsedToSeconds, type EventView, type Mission } from '../content/types';
import type { FlightPath } from '../sim';
import {
  AMBIENT_INTENSITY,
  BODY_VIEW_ANGLE_DEG,
  CAMERA_FOV,
  JOURNEY_ELEVATION_DEG,
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
  TRANSITION_MS,
  type ScaleMode,
} from './config';
import { createEarth, type Earth } from './earth';
import { fitDistance, interpolatePose, type CameraPose, type ClearArea, type SphereLike } from './framing';
import { createMarkers, type MarkerPoint, type MarkerSet } from './markers';
import { createMoon, type Moon } from './moon';
import { createPathLine, type PathLine } from './path-lines';
import { createStarfield, type Starfield } from './stars';
import { chooseTextureTier, loadStageTextures, type TextureTier } from './textures';
import { easeInOutCubic, Tween } from './tween';
import {
  buildFleet,
  type Fleet,
  type LeftBehindModel,
  type PoseContext,
  type ShipModel,
  type ShipPose,
} from './vehicles';

export interface StageOptions {
  /** The flight path, from buildFlightPath. */
  path: FlightPath;
  /** The mission clock; the scene draws the mission at `player.time`. */
  player: Player;
  /** The mission, for its events. */
  mission: Mission;
  /** Cited moments at which each ship changes shape. */
  vehicle: readonly VehicleChange[];
  /** Cited parts that stay behind (Eagle's descent stage at Tranquility Base). */
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

type ShipId = 'csm' | 'lm';

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
/** The ship being followed in the ship view is drawn this much larger. */
const SUBJECT_SCALE = 1.35;
/** A ship this many body radii up (or less) counts as near that body for the Earth and Moon views. */
const NEAR_BODY_RADII = 4;
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

/** Vertical field of view for a screen shape; wider on tall screens. */
function fieldOfViewFor(aspect: number): number {
  const minHorizontal = MathUtils.degToRad(PORTRAIT_MIN_HORIZONTAL_FOV);
  const vertical = MathUtils.radToDeg(2 * Math.atan(Math.tan(minHorizontal / 2) / aspect));
  return MathUtils.clamp(vertical, CAMERA_FOV, PORTRAIT_MAX_FOV);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Per-ship state for the current frame. */
interface ShipState extends ShipPose {
  readonly id: ShipId;
}

/**
 * The 3D scene: Earth, the Moon, the stars, and the Apollo 11 flight drawn
 * at the mission clock's time, with the camera views the interface asks for.
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
  private eventMarkers: MarkerSet | null = null;
  private earthSites: MarkerSet | null = null;
  private moonSites: MarkerSet | null = null;
  private readonly moonAnchor = new Group();
  /** The landing site relative to the Moon's center (it does not change with the scale), and Eagle's facing there. */
  private readonly landingOffset = new Vector3();
  private readonly landingFront = new Vector3(0, 0, 1);
  private readonly sitePosition = new Vector3();
  private readonly siteUp = new Vector3();
  private fleet: Fleet | null = null;

  /* Clock and scale. */
  private mode: ScaleMode = 'readable';
  private mix = 0;
  private mixTween: Tween | null = null;
  private shownTime = Number.NaN;
  private shownMix = Number.NaN;
  private lastStory = Number.NaN;
  private wasPlaying = false;
  private readonly eventSeconds: number[];
  private currentEvent = -2;

  /* Ships. */
  private readonly ships: Record<ShipId, ShipState>;
  private readonly shipList: ShipState[];
  private followed: ShipId = 'csm';

  /* Views and camera. */
  private viewNow: EventView = 'journey';
  /** Set by setView; the framing waits a frame so any seek made with it is in place. */
  private pendingView: 'tween' | 'instant' | null = 'instant';
  private cameraTween: Tween | null = null;
  private readonly tweenFrom: CameraPose = { position: new Vector3(), target: new Vector3() };
  private readonly tweenTo: CameraPose = { position: new Vector3(), target: new Vector3() };
  private readonly tweenPose: CameraPose = { position: new Vector3(), target: new Vector3() };
  private readonly tweenFromUp = new Vector3(0, 1, 0);
  private readonly upTurn = new Quaternion();
  private readonly upStep = new Quaternion();
  private readonly worldUp = new Vector3(0, 1, 0);
  /** Camera offset from the anchor once settled (world space), for the Earth, Moon, and journey views. */
  private readonly settledOffset = new Vector3(0, 0, 10);
  /** True once the person moves the camera themselves after a framing. */
  private userMovedCamera = false;
  /** Ship view: the smoothed ship frame, the camera's direction in it, and its distance. */
  private readonly chaseFrame = new Quaternion();
  private readonly chaseDirection = CHASE_OFFSET.clone();
  private chaseZoom = 1;
  private chaseDistance = 1;
  private chaseReady = false;
  private readonly chaseForward = new Vector3(1, 0, 0);

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
  private readonly q1 = new Quaternion();
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
  };

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: StageOptions,
  ) {
    if (typeof WebGL2RenderingContext === 'undefined') {
      throw new WebGLUnavailableError();
    }
    try {
      this.renderer = new WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'default' });
    } catch (error) {
      throw new WebGLUnavailableError(error);
    }
    this.path = options.path;
    this.player = options.player;
    this.eventSeconds = options.mission.events.map((event) => elapsedToSeconds(event.elapsed));
    this.ships = {
      csm: { id: 'csm', exists: false, position: new Vector3(), forward: new Vector3(1, 0, 0), up: new Vector3(0, 1, 0) },
      lm: { id: 'lm', exists: false, position: new Vector3(), forward: new Vector3(1, 0, 0), up: new Vector3(0, 1, 0) },
    };
    this.shipList = [this.ships.csm, this.ships.lm];
    this.journeyPoints = this.sampleJourney();
    this.journeyCenter.readable.copy(this.boundsCenter(this.journeyPoints.readable, MOON_DISTANCE.readable));
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
    this.shipScene.add(this.shipSun, this.shipSun.target, new AmbientLight(0xffffff, SHIP_AMBIENT_INTENSITY));

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.addEventListener('start', this.handleControlStart);

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
    this.cleanups.push(this.player.subscribe(() => {
      this.needsRender = true;
    }));

    this.handleResize();
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
      this.startTween(this.transitionMs, to);
    }
    this.needsRender = true;
    this.notify();
  }

  get view(): EventView {
    return this.viewNow;
  }

  /** Move the camera to a view. With `instant`, jump there (also the case with reduced motion). */
  setView(view: EventView, instant = false): void {
    this.viewNow = view;
    this.userMovedCamera = false;
    this.pendingView = instant || !this.running ? 'instant' : 'tween';
    if (view === 'spacecraft') {
      this.chaseReady = false;
      this.chaseDirection.copy(CHASE_OFFSET);
      this.chaseZoom = 1;
    }
    this.needsRender = true;
    this.notify();
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

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    for (const cleanup of this.cleanups) cleanup();
    this.controls.removeEventListener('start', this.handleControlStart);
    this.controls.dispose();
    this.earth?.dispose();
    this.moon?.dispose();
    this.stars?.dispose();
    for (const line of this.lines) line.dispose();
    this.eventMarkers?.dispose();
    this.earthSites?.dispose();
    this.moonSites?.dispose();
    this.fleet?.dispose();
    this.renderer.dispose();
  }

  /* ---------------------------------------------------------------- */
  /* Building the mission                                              */
  /* ---------------------------------------------------------------- */

  private buildMission(): void {
    const earth = this.earth;
    if (!earth) return;

    // Paths. The lunar module's stops at docking; from then on it rides with Columbia.
    const dockTime = this.lmDockingTime();
    const ids: ShipId[] = ['csm', 'lm'];
    ids.forEach((id, i) => {
      const polyline = this.path.polyline(id);
      if (!polyline) return;
      const line = createPathLine(polyline, SHIP_COLORS[id], i + 1, id === 'lm' ? dockTime : Infinity);
      line.mesh.renderOrder = 1 + i;
      line.setResolution(this.cssWidth, this.cssHeight);
      this.lines.push(line);
      this.scene.add(line.mesh);
    });

    // Event markers, on the path of the ship the story follows at each event.
    const points: MarkerPoint[] = [];
    this.eventSeconds.forEach((t, index) => {
      const ship = this.followedAt(t);
      const readable = [0, 0, 0];
      const real = [0, 0, 0];
      if (!this.path.position(ship, t, 0, readable) || !this.path.position(ship, t, 1, real)) return;
      points.push({ readable, true: real, color: SHIP_COLORS[ship], eventIndex: index });
    });
    this.eventMarkers = createMarkers(points, false);
    this.scene.add(this.eventMarkers.points);

    // Launch site and splashdown point, fixed to the turning Earth.
    const earthPoints: MarkerPoint[] = [];
    for (const t of [this.path.start, this.path.end]) {
      if (!this.path.position('csm', t, 1, this.scratch)) continue;
      earth.setOrientation(this.path.earthAxisAngle(t), this.path.earthSpinAngle(t));
      earth.root.updateMatrixWorld(true);
      const local = earth.globe.worldToLocal(this.v1.fromArray(this.scratch));
      earthPoints.push({ readable: local.toArray(), true: local.toArray(), color: 0xffffff, eventIndex: -1 });
    }
    this.earthSites = createMarkers(earthPoints, true);
    earth.globe.add(this.earthSites.points);

    // Landing site, fixed to the Moon (which does not turn in this frame).
    const landing = this.lmSurfaceTime();
    const center = [0, 0, 0];
    if (landing !== undefined && this.path.position('lm', landing, 0, this.scratch)) {
      this.path.moonPosition(0, center);
      const offset = this.v1.fromArray(this.scratch).sub(this.v2.fromArray(center)).toArray();
      this.landingOffset.fromArray(offset);
      // Which way Eagle faced as it set down: its travel just before landing, along the ground.
      if (this.path.direction('lm', landing - 20, 0, this.scratch)) this.landingFront.fromArray(this.scratch);
      this.moonSites = createMarkers([{ readable: offset, true: offset, color: 0xffffff, eventIndex: -1 }], true);
      this.moonAnchor.add(this.moonSites.points);
    }

    // The spacecraft.
    this.fleet = buildFleet(
      this.options.vehicle,
      this.options.leftBehind,
      (moment) => elapsedToSeconds(moment.at.value),
      SHIP_COLORS,
    );
    for (const ship of this.fleet.ships) this.shipScene.add(ship.halo, ship.root);
    for (const part of this.fleet.leftBehind) this.shipScene.add(part.root);

    const ratio = this.renderer.getPixelRatio();
    for (const set of [this.eventMarkers, this.earthSites, this.moonSites]) set?.setPixelRatio(ratio);
  }

  private lmDockingTime(): number {
    const lm = this.path.ships.find((ship) => ship.id === 'lm');
    const docked = lm?.phases.find((phase) => phase.kind === 'docked');
    return docked ? elapsedToSeconds(docked.start.value) : Infinity;
  }

  private lmSurfaceTime(): number | undefined {
    const lm = this.path.ships.find((ship) => ship.id === 'lm');
    const surface = lm?.phases.find((phase) => phase.kind === 'surface');
    return surface ? elapsedToSeconds(surface.start.value) : undefined;
  }

  /** The ship the story follows: the lunar module while it flies apart from Columbia, otherwise Columbia. */
  private followedAt(t: number): ShipId {
    const phase = this.path.phaseAt('lm', t);
    return phase && phase.kind !== 'docked' ? 'lm' : 'csm';
  }

  /** A few hundred points along both paths, for framing the journey view. */
  private sampleJourney(): { readable: Float32Array; true: Float32Array } {
    const readable: number[] = [];
    const real: number[] = [];
    for (const id of ['csm', 'lm']) {
      const line = this.path.polyline(id);
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

  /** Where each ship is and which way it is going. */
  private updateShips(): void {
    const t = this.player.time;
    for (let i = 0; i < this.shipList.length; i += 1) {
      const ship = this.shipList[i] as ShipState;
      ship.exists = this.path.position(ship.id, t, this.mix, this.scratch);
      if (!ship.exists) continue;
      ship.position.fromArray(this.scratch);
      if (this.path.direction(ship.id, t, this.mix, this.scratch)) ship.forward.fromArray(this.scratch);
      this.radialUp(ship.position, ship.up);
    }
    this.followed = this.followedAt(t);
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
        return out.set(MOON_DISTANCE.readable + (MOON_DISTANCE.true - MOON_DISTANCE.readable) * mix, 0, 0);
      case 'spacecraft':
        return out.copy(this.ships[this.followed].position);
      case 'journey':
        return out.lerpVectors(this.journeyCenter.readable, this.journeyCenter.true, mix);
    }
  }

  /** Bodies for framing and occlusion. */
  private moonSphere(mix: number): SphereLike {
    return {
      center: new Vector3(MOON_DISTANCE.readable + (MOON_DISTANCE.true - MOON_DISTANCE.readable) * mix, 0, 0),
      radius: MOON_RADIUS,
    };
  }

  /**
   * The settled camera offset (from the anchor) for the current view at the
   * current time, written to `out`. For the ship view this also resets the
   * chase so it starts behind and above the ship.
   */
  private framingOffset(out: Vector3, mix = this.mix): Vector3 {
    const ship = this.ships[this.followed];
    switch (this.viewNow) {
      case 'journey':
        return this.journeyOffset(out, mix);
      case 'earth':
      case 'moon': {
        const isEarth = this.viewNow === 'earth';
        const center = isEarth ? this.origin : this.moonSphere(mix).center;
        const radius = isEarth ? EARTH_FRAME_RADIUS : MOON_RADIUS;
        const direction = this.bodyDirection(center, radius, this.v3);
        const spheres: SphereLike[] = [{ center, radius }];
        if (ship.exists && ship.position.distanceTo(center) < radius * (1 + NEAR_BODY_RADII)) {
          spheres.push({ center: ship.position.clone(), radius: radius * 0.12 });
        }
        const distance = fitDistance(this.camera, center, direction, spheres, 1.2, this.clear, this.worldUp);
        return out.copy(direction).multiplyScalar(distance);
      }
      case 'spacecraft': {
        this.chaseFrameFor(ship, this.chaseFrame);
        this.chaseReady = true;
        this.chaseDistance = this.chaseAutoDistance(ship);
        return out.copy(this.chaseDirection).applyQuaternion(this.chaseFrame).multiplyScalar(this.chaseDistance * this.chaseZoom);
      }
    }
  }

  /**
   * The journey view is a diagram with one fixed orientation for the whole
   * mission: seen from the north (above the plane of the path), Earth on the
   * left, the Moon on the right. It never turns to follow the ship; a ship
   * behind Earth or the Moon is drawn anyway (see updateFleet).
   */
  private journeyOffset(out: Vector3, mix: number): Vector3 {
    const center = this.viewAnchor(new Vector3(), mix);
    const spheres: SphereLike[] = [{ center: this.origin, radius: EARTH_FRAME_RADIUS }, this.moonSphere(mix)];
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
    // Leave room at the edges for a spacecraft model drawn at the end of the path.
    const clear: ClearArea = {
      width: Math.max(0.2, this.clear.width - (2 * JOURNEY_EDGE_PX) / this.cssWidth),
      height: Math.max(0.2, this.clear.height - (2 * JOURNEY_EDGE_PX) / this.cssHeight),
    };
    // From the +Z side, raised toward ecliptic north: +X (the Moon) is to the right.
    const elevation = MathUtils.degToRad(JOURNEY_ELEVATION_DEG);
    const direction = new Vector3(0, Math.sin(elevation), Math.cos(elevation));
    const distance = fitDistance(this.camera, center, direction, spheres, 1.05, clear, this.worldUp);
    return out.copy(direction).multiplyScalar(distance);
  }

  /**
   * The Earth and Moon views look at the body from the side the ship is on,
   * turned away from straight overhead toward the Sun (and north), so the
   * ship stands out against the lit side and its shape reads. Without a ship
   * nearby, they show the body's day side.
   */
  private bodyDirection(center: Vector3, radius: number, out: Vector3): Vector3 {
    const ship = this.ships[this.followed];
    const lean = this.v1.copy(this.sunDirection).addScaledVector(this.v2.set(0, 1, 0), 0.6);
    if (ship.exists && ship.position.distanceTo(center) < radius * (1 + NEAR_BODY_RADII)) {
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
    return out.set(-1, 0.3, 0).addScaledVector(this.sunDirection, 0.7).normalize();
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
    direction.copy(away).multiplyScalar(Math.cos(minAngle)).addScaledVector(side, Math.sin(minAngle)).normalize();
  }

  /**
   * The ship view's frame: x along the ship's horizontal travel, y up (away
   * from the nearby body, or ecliptic north far from both), z to the side.
   */
  private chaseFrameFor(ship: ShipState, out: Quaternion): Quaternion {
    const up = this.v1;
    const toEarth = ship.position.length() - EARTH_RADIUS;
    const toMoon = ship.position.distanceTo(this.moonCenter) - MOON_RADIUS;
    const nearMoon = toMoon / MOON_RADIUS < toEarth / EARTH_RADIUS;
    const height = nearMoon ? toMoon / MOON_RADIUS : toEarth / EARTH_RADIUS;
    const weight = 1 - smoothstep(1.5, 5, height);
    up.copy(ship.up).multiplyScalar(weight).add(this.v2.set(0, 1 - weight, 0));
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

  /** How far the ship view stands off: enough to see the nearby body, farther out in open space. */
  private chaseAutoDistance(ship: ShipState): number {
    const toEarth = ship.position.length() - EARTH_RADIUS;
    const toMoon = ship.position.distanceTo(this.moonCenter) - MOON_RADIUS;
    const nearMoon = toMoon / MOON_RADIUS < toEarth / EARTH_RADIUS;
    const radius = nearMoon ? MOON_RADIUS : EARTH_RADIUS;
    const height = Math.max(0, nearMoon ? toMoon : toEarth);
    return MathUtils.clamp(0.75 * radius + 0.5 * height, 0.15, 3.5);
  }

  /** Start a camera move from where the camera is to the current view's framing. */
  private startTween(durationMs: number, mix = this.mix): void {
    this.settleDamping();
    this.tweenFrom.position.copy(this.camera.position);
    this.tweenFrom.target.copy(this.controls.target);
    this.tweenFromUp.copy(this.camera.up);
    this.framingOffset(this.settledOffset, mix);
    const toMix = mix;
    this.controls.minDistance = 0;
    this.controls.maxDistance = Infinity;
    this.cameraTween?.cancel();
    this.cameraTween = new Tween(durationMs, (t) => {
      // The destination moves with its anchor (a ship, or the Moon as the scale changes).
      const anchorMix = this.viewNow === 'journey' ? toMix : this.mix;
      this.viewAnchor(this.tweenTo.target, anchorMix);
      this.destinationOffset(this.v1);
      this.tweenTo.position.copy(this.tweenTo.target).add(this.v1);
      interpolatePose(this.tweenFrom, this.tweenTo, t, this.tweenPose);
      // Roll from the old "up" to the new one along the way.
      this.desiredUp(this.v1);
      this.upTurn.setFromUnitVectors(this.tweenFromUp, this.v1);
      this.upStep.identity().slerp(this.upTurn, t);
      this.setCameraUp(this.v1.copy(this.tweenFromUp).applyQuaternion(this.upStep));
      this.applyPose(this.tweenPose);
    }, easeInOutCubic);
    this.needsRender = true;
  }

  /**
   * Screen "up": the ship's own up in the ship view (so a rocket on the pad
   * stands upright with the ground below), otherwise ecliptic north.
   */
  private desiredUp(out: Vector3): Vector3 {
    if (this.viewNow === 'spacecraft' && this.chaseReady) return out.set(0, 1, 0).applyQuaternion(this.chaseFrame);
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
    const internals = this.controls as unknown as { _quat?: Quaternion; _quatInverse?: Quaternion };
    if (internals._quat && internals._quatInverse) {
      internals._quat.setFromUnitVectors(up, this.worldUp);
      internals._quatInverse.copy(internals._quat).invert();
    }
  }

  /** The settled offset for the view now (the ship view's follows the ship). */
  private destinationOffset(out: Vector3): Vector3 {
    if (this.viewNow === 'spacecraft' && this.chaseReady) {
      return out.copy(this.chaseDirection).applyQuaternion(this.chaseFrame).multiplyScalar(this.chaseDistance * this.chaseZoom);
    }
    return out.copy(this.settledOffset);
  }

  /** Frame the current view now: instantly, or with a camera move. */
  private applyFraming(instant: boolean): void {
    if (instant) {
      this.cameraTween?.cancel();
      this.cameraTween = null;
      this.framingOffset(this.settledOffset);
      this.setCameraUp(this.desiredUp(this.v1));
      this.viewAnchor(this.tweenPose.target);
      this.tweenPose.position.copy(this.tweenPose.target).add(this.destinationOffset(this.v1));
      this.applyPose(this.tweenPose);
      this.applyLimits();
    } else {
      this.startTween(this.transitionMs);
    }
  }

  /** After the interface or window changes size: refit unless the person has taken the camera. */
  private reframeAfterLayout(): void {
    this.needsRender = true;
    if (!this.earth || this.userMovedCamera || this.pendingView) return;
    if (this.cameraTween && !this.cameraTween.done) return;
    if (this.viewNow === 'spacecraft') return;
    if (this.reducedMotion) this.applyFraming(true);
    else this.startTween(REFRAME_MS);
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
    this.controls.update();
    this.controls.enableDamping = damping;
  }

  private applyLimits(): void {
    if (this.viewNow === 'spacecraft') return;
    if (this.viewNow === 'journey') {
      this.controls.minDistance = EARTH_RADIUS * 1.5;
    } else {
      const radius = this.viewNow === 'moon' ? MOON_RADIUS : EARTH_FRAME_RADIUS;
      this.controls.minDistance = radius * MIN_DISTANCE_FACTOR;
    }
    this.controls.maxDistance = Math.max(MAX_DISTANCE[this.mode], this.settledOffset.length() * 1.5);
  }

  private readonly handleControlStart = (): void => {
    // The person took over: stop any camera flight where it is.
    if (this.cameraTween && !this.cameraTween.done) {
      this.cameraTween.cancel();
      this.cameraTween = null;
      if (this.viewNow === 'spacecraft') this.readChase();
      else this.settledOffset.subVectors(this.camera.position, this.controls.target);
      this.applyLimits();
    }
    this.userMovedCamera = true;
  };

  /** Arrow keys turn the view and +/- zoom while the canvas has focus. */
  private handleKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => this.controls.rotateLeft(KEY_ROTATE_STEP),
      ArrowRight: () => this.controls.rotateLeft(-KEY_ROTATE_STEP),
      ArrowUp: () => this.controls.rotateUp(KEY_ROTATE_STEP),
      ArrowDown: () => this.controls.rotateUp(-KEY_ROTATE_STEP),
      '+': () => this.controls.dollyIn(KEY_ZOOM_STEP),
      '=': () => this.controls.dollyIn(KEY_ZOOM_STEP),
      '-': () => this.controls.dollyOut(KEY_ZOOM_STEP),
      _: () => this.controls.dollyOut(KEY_ZOOM_STEP),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    this.handleControlStart();
    action();
    if (this.viewNow === 'spacecraft') this.readChase();
    this.needsRender = true;
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
    const p = this.v1.copy(ship.position).project(this.camera);
    return Math.abs(p.x) > 0.98 || Math.abs(p.y) > 0.98 || p.z > 1;
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

  /** Per frame: keep the camera on its anchor, follow the ship, and run any move. */
  private updateCamera(dt: number, jumped: boolean, paused: boolean): boolean {
    let moved = false;

    if (this.pendingView) {
      const instant = this.pendingView === 'instant' || this.reducedMotion;
      this.pendingView = null;
      this.applyFraming(instant);
      moved = true;
    } else if (
      (jumped || paused) &&
      !this.userMovedCamera &&
      (this.viewNow === 'earth' || this.viewNow === 'moon')
    ) {
      // After a seek or a pause, bring the ship back into view if it is hidden.
      // (The journey view keeps its one orientation; the ship view follows anyway.)
      const tweening = this.cameraTween !== null && !this.cameraTween.done;
      if (!tweening && this.shipHidden(this.ships[this.followed])) {
        this.applyFraming(this.reducedMotion);
        moved = true;
      }
    }

    // The ship view turns with the ship and eases its distance.
    if (this.viewNow === 'spacecraft' && this.chaseReady) {
      const ship = this.ships[this.followed];
      this.chaseFrameFor(ship, this.q1);
      const auto = this.chaseAutoDistance(ship);
      if (jumped || this.reducedMotion) {
        this.chaseFrame.copy(this.q1);
        this.chaseDistance = auto;
      } else {
        this.chaseFrame.slerp(this.q1, 1 - Math.exp(-dt / CHASE_TURN_SECONDS));
        this.chaseDistance += (auto - this.chaseDistance) * (1 - Math.exp(-dt / CHASE_DISTANCE_SECONDS));
      }
    }

    if (this.cameraTween) {
      this.cameraTween.step(this.nowMs);
      moved = true;
      if (this.cameraTween.done) {
        this.cameraTween = null;
        this.applyLimits();
        this.controls.update();
      }
      return moved;
    }

    // Settled: carry the camera with its anchor, keeping the view's up.
    this.setCameraUp(this.desiredUp(this.v1));
    this.viewAnchor(this.anchor);
    const delta = this.v1.subVectors(this.anchor, this.controls.target);
    if (delta.lengthSq() > 0) {
      this.controls.target.add(delta);
      this.camera.position.add(delta);
      moved = true;
    }
    if (this.viewNow === 'spacecraft' && this.chaseReady) {
      this.destinationOffset(this.v1);
      this.camera.position.copy(this.controls.target).add(this.v1);
      this.controls.minDistance = this.chaseDistance * 0.08;
      this.controls.maxDistance = this.chaseDistance * 40;
      moved = true;
    }
    const changed = this.controls.update(dt);
    if (this.viewNow === 'spacecraft' && this.chaseReady && changed) this.readChase();
    else if (changed) this.settledOffset.subVectors(this.camera.position, this.controls.target);
    return moved || changed;
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
    for (const set of [this.eventMarkers, this.earthSites, this.moonSites]) set?.setPixelRatio(ratio);
    this.reframeAfterLayout();
    // Draw right away so the canvas never shows a stretched frame.
    if (this.earth) this.renderFrame(0);
  }

  /* ---------------------------------------------------------------- */
  /* The loop                                                          */
  /* ---------------------------------------------------------------- */

  private nowMs = 0;

  private syncLoop(): void {
    const shouldRun = this.running && document.visibilityState === 'visible';
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

    // A seek (or the tour jumping ahead) moves story time more than playback would.
    const story = this.player.storyTime;
    const playing = this.player.playing;
    const step = Number.isNaN(this.lastStory) ? 0 : Math.abs(story - this.lastStory);
    const jumped = step > (playing ? Math.max(0.3, this.player.rate * 0.25) : 1e-9) || (!playing && step > 0);
    const paused = this.wasPlaying && !playing;
    this.lastStory = story;
    this.wasPlaying = playing;

    let animating = false;
    if (this.mixTween) {
      this.mixTween.step(time);
      animating = true;
      if (this.mixTween.done) this.mixTween = null;
    }

    const worldChanged = this.updateWorld();
    if (worldChanged) this.updateShips();
    const offsetMoving = this.updateViewOffset(dt);
    const cameraMoved = this.updateCamera(dt, jumped, paused);

    if (animating || worldChanged || offsetMoving || cameraMoved || this.needsRender) {
      this.renderFrame(dt, jumped);
    }
  };

  /** Size, place, and show or hide each spacecraft for this frame. */
  private updateFleet(dt: number, snap: boolean): void {
    if (!this.fleet) return;
    const context = this.poseContext;
    context.time = this.player.time;
    context.storyTime = this.player.storyTime;
    context.dt = dt;
    context.snap = snap;
    // Smaller clear areas (phones) get somewhat smaller models.
    const clearPixels = Math.min(this.clear.width * this.cssWidth, this.clear.height * this.cssHeight);
    const screenScale = MathUtils.clamp(Math.sqrt(clearPixels / 600), 0.75, 1);
    // The journey view is a small diagram: no model longer than JOURNEY_SHIP_MAX_PX.
    // Elsewhere every model stays inside the clear area around the point it is drawn at.
    const journey = this.viewNow === 'journey';
    context.maxPixels = journey ? JOURNEY_SHIP_MAX_PX : Infinity;
    context.maxReachPixels = journey ? JOURNEY_SHIP_REACH_PX : Math.max(24, clearPixels / 2 - SHIP_EDGE_PX);
    this.camera.getWorldDirection(this.cameraForward);
    const tanHalf = Math.tan(MathUtils.degToRad(this.camera.fov) / 2);
    const models = this.fleet.ships;
    for (let i = 0; i < models.length; i += 1) {
      const model = models[i] as ShipModel;
      const ship = this.ships[model.shipId];
      let unitsPerPixel = 0;
      // The journey view is a diagram: a ship behind Earth or the Moon is drawn anyway.
      if (ship.exists && (this.viewNow === 'journey' || !this.occluded(ship.position))) {
        const depth = this.v1.subVectors(ship.position, this.camera.position).dot(this.cameraForward);
        if (depth > this.camera.near) unitsPerPixel = (2 * depth * tanHalf) / this.cssHeight;
      }
      context.unitsPerPixel = unitsPerPixel;
      context.sizeScale = screenScale * (this.viewNow === 'spacecraft' && model.shipId === this.followed ? SUBJECT_SCALE : 1);
      model.update(ship, context);
    }

    // Parts left behind stand at the landing site from their cited moment on.
    const parts = this.fleet.leftBehind;
    this.sitePosition.copy(this.moonCenter).add(this.landingOffset);
    this.siteUp.copy(this.landingOffset).normalize();
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i] as LeftBehindModel;
      const shown = this.player.time >= part.from - 1e-6;
      let unitsPerPixel = 0;
      if (shown && (this.viewNow === 'journey' || !this.occluded(this.sitePosition))) {
        const depth = this.v1.subVectors(this.sitePosition, this.camera.position).dot(this.cameraForward);
        if (depth > this.camera.near) unitsPerPixel = (2 * depth * tanHalf) / this.cssHeight;
      }
      context.unitsPerPixel = unitsPerPixel;
      // Sized like the ascent stage that lifted off from it (smaller in the journey view).
      if (this.viewNow === 'journey') context.maxPixels = JOURNEY_LEFT_BEHIND_MAX_PX;
      context.sizeScale = screenScale * (this.viewNow === 'spacecraft' && this.followed === 'lm' ? SUBJECT_SCALE : 1);
      part.update(shown, this.sitePosition, this.siteUp, this.landingFront, context);
    }
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
