import {
  AmbientLight,
  Color,
  DirectionalLight,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EARTH_RADIUS, MOON_RADIUS } from '../content/physical-constants';
import {
  AMBIENT_INTENSITY,
  CAMERA_FOV,
  EARTH_SPIN_RATE,
  MAX_DISTANCE,
  MIN_DISTANCE_FACTOR,
  MOON_DIRECTION,
  MOON_DISTANCE,
  PORTRAIT_MAX_FOV,
  PORTRAIT_MIN_HORIZONTAL_FOV,
  SUN_DIRECTION,
  SUN_INTENSITY,
  TRANSITION_MS,
  VIEW_DIRECTION,
  type ScaleMode,
} from './config';
import { createEarth, type Earth } from './earth';
import { framePose, interpolatePose, type CameraPose, type SphereLike } from './framing';
import { createMoon, type Moon } from './moon';
import { createStarfield, type Starfield } from './stars';
import { chooseTextureTier, loadStageTextures, type TextureTier } from './textures';
import { Tween } from './tween';

export type FocusTarget = 'overview' | 'earth' | 'moon';

export interface StageCallbacks {
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

const MAX_PIXEL_RATIO = 2;
const CAMERA_FAR = 2000;
const STAR_SPHERE_RADIUS = 900;
/** The atmosphere shell is slightly larger than the globe. */
const EARTH_FRAME_RADIUS = EARTH_RADIUS * 1.02;
/** Keep the camera at least this far outside a body's surface, as a radius multiple. */
const SURFACE_CLEARANCE = 1.06;
/** Arrow-key turn per press, in radians, and zoom factor per +/- press. */
const KEY_ROTATE_STEP = Math.PI / 36;
const KEY_ZOOM_STEP = 1.15;

/** Vertical field of view for a screen shape; wider on tall screens. */
function fieldOfViewFor(aspect: number): number {
  const minHorizontal = MathUtils.degToRad(PORTRAIT_MIN_HORIZONTAL_FOV);
  const vertical = MathUtils.radToDeg(2 * Math.atan(Math.tan(minHorizontal / 2) / aspect));
  return MathUtils.clamp(vertical, CAMERA_FOV, PORTRAIT_MAX_FOV);
}

/**
 * The 3D stage: Earth, the Moon, and stars, with camera controls.
 * Create it with `Stage.create`, then `await stage.load(...)`, then `start()`.
 */
export class Stage {
  readonly textureTier: TextureTier;

  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly sun = new DirectionalLight(0xffffff, SUN_INTENSITY);
  private readonly ambient = new AmbientLight(0xffffff, AMBIENT_INTENSITY);

  private earth: Earth | null = null;
  private moon: Moon | null = null;
  private stars: Starfield | null = null;

  private mode: ScaleMode = 'readable';
  private focus: FocusTarget = 'overview';
  private moonDistance = MOON_DISTANCE.readable;
  private reducedMotion = false;

  private running = false;
  private needsRender = true;
  private lastTime: number | null = null;
  private cameraTween: Tween | null = null;
  private moonTween: Tween | null = null;
  /** True once the person moves the camera themselves after a framing. */
  private userMovedCamera = false;
  /** Canvas area covered by the title (top) and controls (bottom), in CSS pixels. */
  private insets = { top: 0, bottom: 0 };
  /** Share of the canvas height left for framing between the insets. */
  private contentHeightFraction = 1;

  private readonly resizeObserver: ResizeObserver;
  private readonly cleanups: Array<() => void> = [];

  private readonly earthCenter = new Vector3(0, 0, 0);
  private readonly tmpPose: CameraPose = { position: new Vector3(), target: new Vector3() };
  private readonly tmpVec = new Vector3();

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: StageCallbacks,
  ) {
    if (typeof WebGL2RenderingContext === 'undefined') {
      throw new WebGLUnavailableError();
    }
    try {
      this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
    } catch (error) {
      throw new WebGLUnavailableError(error);
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setClearColor(0x000000, 1);
    this.textureTier = chooseTextureTier(this.renderer.capabilities.maxTextureSize);

    this.camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.01, CAMERA_FAR);
    this.scene.background = new Color(0x000000);

    this.sun.position.copy(SUN_DIRECTION).multiplyScalar(100);
    this.scene.add(this.sun, this.sun.target, this.ambient);

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
      this.callbacks.onContextLost();
    });
    this.listen(canvas, 'webglcontextrestored', () => {
      this.callbacks.onContextRestored();
      this.needsRender = true;
      this.syncLoop();
    });
    this.listen(canvas, 'keydown', (event) => this.handleKey(event as KeyboardEvent));

    this.handleResize();
  }

  /** Create the stage. Throws WebGLUnavailableError if WebGL 2 is missing. */
  static create(canvas: HTMLCanvasElement, callbacks: StageCallbacks): Stage {
    return new Stage(canvas, callbacks);
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
    this.earth.setSunDirection(SUN_DIRECTION);
    this.moon = createMoon(textures.moon, detail);
    this.placeMoon(this.moonDistance);
    this.scene.add(this.stars.mesh, this.earth.root, this.moon.root);

    this.applyPose(this.poseFor('overview'));
    this.applyLimits();

    // Upload textures and compile shaders now so the first frames are smooth.
    for (const texture of [textures.earth, textures.moon, textures.stars]) {
      this.renderer.initTexture(texture);
    }
    if (this.renderer.extensions.has('KHR_parallel_shader_compile')) {
      await this.renderer.compileAsync(this.scene, this.camera);
    } else {
      this.renderer.compile(this.scene, this.camera);
    }
    this.renderFrame();
  }

  start(): void {
    this.running = true;
    this.syncLoop();
  }

  get scaleMode(): ScaleMode {
    return this.mode;
  }

  /**
   * Switch between "readable" (Moon at 10 Earth radii) and "true" (Moon at
   * its real mean distance). Animates the Moon and reframes the camera.
   */
  setScaleMode(mode: ScaleMode): void {
    if (mode === this.mode) return;
    this.mode = mode;

    const from = this.moonDistance;
    const to = MOON_DISTANCE[mode];
    this.moonTween?.cancel();
    this.moonTween = new Tween(this.transitionMs, (t) => {
      this.moonDistance = from + (to - from) * t;
      this.placeMoon(this.moonDistance);
    });
    // Frame for where the Moon will end up, not where it is now.
    this.flyTo('overview', MOON_DISTANCE[mode]);
  }

  /** Smoothly move the camera to frame Earth, the Moon, or both. */
  focusOn(target: FocusTarget): void {
    this.flyTo(target, MOON_DISTANCE[this.mode]);
  }

  /**
   * Tell the stage how much of the top and bottom of the canvas is covered
   * by interface (in CSS pixels), so framed views stay clear of it.
   */
  setViewInsets(top: number, bottom: number): void {
    if (top === this.insets.top && bottom === this.insets.bottom) return;
    this.insets = { top: Math.max(0, top), bottom: Math.max(0, bottom) };
    this.handleResize();
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
    this.renderer.dispose();
  }

  /* ---------------------------------------------------------------- */

  private get transitionMs(): number {
    return this.reducedMotion ? 0 : TRANSITION_MS;
  }

  private listen(
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
  ): void {
    target.addEventListener(type, handler);
    this.cleanups.push(() => target.removeEventListener(type, handler));
  }

  private readonly handleControlStart = (): void => {
    // The person took over: stop any camera flight where it is.
    if (this.cameraTween && !this.cameraTween.done) {
      this.cameraTween.cancel();
      this.cameraTween = null;
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
    this.needsRender = true;
  }

  private handleResize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = fieldOfViewFor(this.camera.aspect);

    // Center the picture in the space between the title and the controls by
    // shifting the projection, without changing the camera's position.
    const top = Math.min(this.insets.top, height / 3);
    const bottom = Math.min(this.insets.bottom, height / 3);
    const shift = (bottom - top) / 2;
    if (Math.abs(shift) >= 0.5) {
      this.camera.setViewOffset(width, height, 0, shift, width, height);
    } else {
      this.camera.clearViewOffset();
    }
    this.contentHeightFraction = (height - top - bottom) / height;
    this.camera.updateProjectionMatrix();

    // If the person has not moved the camera since the last framing, reframe
    // for the new shape (for example, after rotating a phone).
    const flying = this.cameraTween !== null && !this.cameraTween.done;
    if (this.earth && !flying) {
      if (!this.userMovedCamera) this.applyPose(this.poseFor(this.focus));
      this.applyLimits();
    }
    this.needsRender = true;
    // Draw right away so the canvas never shows a stretched frame.
    if (this.earth) this.renderFrame();
  }

  private placeMoon(distance: number): void {
    this.moon?.setPosition(this.tmpVec.copy(MOON_DIRECTION).multiplyScalar(distance), this.earthCenter);
    this.needsRender = true;
  }

  private spheres(moonDistance: number): { earth: SphereLike; moon: SphereLike } {
    return {
      earth: { center: this.earthCenter, radius: EARTH_FRAME_RADIUS },
      moon: { center: MOON_DIRECTION.clone().multiplyScalar(moonDistance), radius: MOON_RADIUS },
    };
  }

  /** The camera pose that frames a target, for a given Earth-Moon distance. */
  private poseFor(target: FocusTarget, moonDistance = this.moonDistance): CameraPose {
    const { earth, moon } = this.spheres(moonDistance);
    const free = this.contentHeightFraction;
    switch (target) {
      case 'earth':
        return framePose(this.camera, earth.center, VIEW_DIRECTION.earth, [earth], 1.2, free);
      case 'moon':
        return framePose(this.camera, moon.center, VIEW_DIRECTION.moon, [moon], 1.2, free);
      case 'overview': {
        const portrait = this.camera.aspect < 0.9;
        const direction = portrait ? VIEW_DIRECTION.overviewPortrait : VIEW_DIRECTION.overviewLandscape;
        const center = earth.center.clone().lerp(moon.center, 0.5);
        return framePose(this.camera, center, direction, [earth, moon], 1.12, free);
      }
    }
  }

  private flyTo(target: FocusTarget, moonDistance: number): void {
    this.focus = target;
    this.userMovedCamera = false;

    // Settle any leftover drag momentum so it does not resume after the flight.
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = damping;

    const from: CameraPose = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
    const to = this.poseFor(target, moonDistance);

    // Allow the whole flight; tighten the limits when it ends.
    this.controls.minDistance = 0;
    this.controls.maxDistance = Infinity;

    this.cameraTween?.cancel();
    this.cameraTween = new Tween(this.transitionMs, (t) => {
      interpolatePose(from, to, t, this.tmpPose);
      this.applyPose(this.tmpPose);
      if (t >= 1) this.applyLimits();
    });
    this.needsRender = true;
  }

  private applyPose(pose: CameraPose): void {
    this.controls.target.copy(pose.target);
    this.camera.position.copy(pose.position);
    this.camera.lookAt(pose.target);
    this.needsRender = true;
  }

  private applyLimits(): void {
    const radius = this.focus === 'moon' ? MOON_RADIUS : EARTH_FRAME_RADIUS;
    this.controls.minDistance =
      this.focus === 'overview' ? EARTH_RADIUS * 1.5 : radius * MIN_DISTANCE_FACTOR;
    // Always leave room to zoom out past the overview on any screen shape.
    const overview = this.poseFor('overview');
    const overviewDistance = overview.position.distanceTo(overview.target);
    this.controls.maxDistance = Math.max(MAX_DISTANCE[this.mode], overviewDistance * 1.5);
  }

  /** Push the camera back out if it ends up inside (or too close to) a body. */
  private keepCameraOutsideBodies(): void {
    if (!this.moon) return;
    const bodies: Array<[Vector3, number]> = [
      [this.earthCenter, EARTH_FRAME_RADIUS],
      [this.moon.root.position, MOON_RADIUS],
    ];
    for (const [center, radius] of bodies) {
      const offset = this.tmpVec.subVectors(this.camera.position, center);
      const min = radius * SURFACE_CLEARANCE;
      if (offset.lengthSq() < min * min) {
        if (offset.lengthSq() < 1e-12) offset.set(0, 0, 1);
        this.camera.position.copy(center).addScaledVector(offset.normalize(), min);
        this.camera.lookAt(this.controls.target);
      }
    }
  }

  /** Keep the near plane close to the nearest surface for good depth precision. */
  private updateNearPlane(): void {
    if (!this.moon) return;
    const toEarth = this.camera.position.distanceTo(this.earthCenter) - EARTH_FRAME_RADIUS;
    const toMoon = this.camera.position.distanceTo(this.moon.root.position) - MOON_RADIUS;
    const near = Math.min(Math.max(Math.min(toEarth, toMoon) * 0.5, 0.005), 1);
    if (Math.abs(near - this.camera.near) / this.camera.near > 0.1) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
  }

  private syncLoop(): void {
    const shouldRun = this.running && document.visibilityState === 'visible';
    if (shouldRun) {
      this.lastTime = null;
      this.renderer.setAnimationLoop(this.tick);
    } else {
      this.renderer.setAnimationLoop(null);
    }
  }

  private readonly tick = (time: number): void => {
    const dt = this.lastTime === null ? 0 : Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    const spinning = !this.reducedMotion && this.earth !== null;
    if (spinning && this.earth) {
      this.earth.globe.rotation.y += EARTH_SPIN_RATE * dt;
    }

    let animating = false;
    if (this.moonTween) {
      this.moonTween.step(time);
      animating = true;
      if (this.moonTween.done) this.moonTween = null;
    }

    let controlsChanged = false;
    if (this.cameraTween) {
      this.cameraTween.step(time);
      animating = true;
      if (this.cameraTween.done) {
        this.cameraTween = null;
        // Sync the controls' internal state with the final pose.
        this.controls.update();
      }
    } else {
      controlsChanged = this.controls.update(dt);
    }

    if (spinning || animating || controlsChanged || this.needsRender) {
      this.renderFrame();
    }
  };

  private renderFrame(): void {
    this.keepCameraOutsideBodies();
    this.updateNearPlane();
    if (this.stars) this.stars.mesh.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
  }
}
