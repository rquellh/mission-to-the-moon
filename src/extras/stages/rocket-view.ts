/**
 * The 3D view of "Drop the stages": the mission's launch stack, built with
 * the scene kit, standing upright with a little room above it.
 *
 * It is a simplified picture, and the page says so. The rocket stays where
 * it is while the ground falls away below it and the haze around it fades
 * to black, to suggest the climb; neither is to scale or timed to the real
 * flight. Dropped parts fall back (a tower goes forward) and fade; with
 * reduced motion they fade where they are and nothing slides.
 *
 * Before a rocket is picked, the view shows the choices side by side, each
 * drawn the same height (not to scale: the page says so), standing in even
 * columns so labels and taps can follow the columns of the canvas.
 */
import {
  Box3,
  CircleGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import type { VehiclePart } from '../../content/vehicle-types.ts';
import { createGlow, createMiniView, createVehicle, type Vehicle } from '../../scene/kit.ts';

export interface RocketView {
  /** Stand a new stack of these parts on the pad, framed, and draw it. */
  show(parts: readonly VehiclePart[], label: string): void;
  /** Make room for `count` rockets side by side, in even columns of the canvas, all drawn the same height. */
  showLineup(count: number, label: string): void;
  /** Stand a rocket of these parts in one place of the lineup (they arrive as their missions load). */
  setLineupRocket(index: number, parts: readonly VehiclePart[]): void;
  /** Mark one place of the lineup, or none. */
  highlight(index: number | null): void;
  /** Take everything off the pad (when a rocket has been picked). */
  clear(): void;
  /** Start or stop the climb's look (the engine glow, the ground falling away). */
  setClimbing(on: boolean): void;
  /** Let go of these parts: they drift off and fade (or fade in place). */
  drop(parts: readonly VehiclePart[]): void;
  /** Move things on: `seconds` since Start, `progress` from liftoff (0) to orbit (1), `dt` this frame. */
  update(seconds: number, progress: number, dt: number): void;
  /** True while a dropped part is still on its way out. */
  readonly busy: boolean;
  /** Run `callback` every frame (it draws the view) until the returned function is called. */
  onFrame(callback: (dt: number) => void): () => void;
  dispose(): void;
}

/** The haze at the pad and the black of space (illustrations, not the real sky that day). */
const HAZE = new Color(0x15212e);
const SPACE = new Color(0x000000);
const GROUND = 0x1b2026;
const PAD = 0x3a3f46;
/** The site's accent, for the lineup place being pointed at. */
const PAD_MARKED = 0xf4b942;
/** The height each rocket of the lineup is drawn at, meters of the model: all the same, so not to scale. */
const LINEUP_HEIGHT = 60;
/** The lineup is seen straight on and level, so the columns stay even and the rockets upright. */
const LINEUP_LOOK = new Vector3(0, 0, 1);
/** The engine glow: a soft warm light at the base while climbing. */
const FLAME = 0xffa64a;
/** Seen from a little to the side and a little below, as from the ground. */
const LOOK = new Vector3(0.3, -0.05, 1).normalize();
/** How long a dropped part takes to leave, real seconds. */
const DRIFT_SECONDS = 2.6;
const FADE_SECONDS = 0.8;

const smoothstep = (low: number, high: number, x: number): number => {
  const u = MathUtils.clamp((x - low) / (high - low), 0, 1);
  return u * u * (3 - 2 * u);
};

/** The box around everything drawn in `object` (hidden parts left out). */
function visibleBox(object: Object3D): Box3 {
  const box = new Box3();
  const part = new Box3();
  object.updateMatrixWorld(true);
  object.traverseVisible((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;
    box.union(part.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld));
  });
  return box;
}

interface Leaving {
  parts: VehiclePart[];
  age: number;
  /** Copies of the parts' materials, so one part can fade without the rest (the kit shares materials between parts). */
  copies: Material[];
}

/** Throws when the browser cannot draw WebGL. */
export function createRocketView(
  canvas: HTMLCanvasElement,
  reducedMotion: () => boolean,
): RocketView {
  const view = createMiniView(canvas, { controls: false });
  const background = new Color().copy(HAZE);
  view.scene.background = background;

  // The ground and the pad: drawn once, scaled to each rocket.
  const land = new Group();
  const groundMaterial = new MeshBasicMaterial({ color: GROUND, transparent: true });
  // The pad lies on the ground; the offset keeps the two from flickering through each other.
  const padMaterial = new MeshBasicMaterial({
    color: PAD,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const disc = new CircleGeometry(1, 72);
  const ground = new Mesh(disc, groundMaterial);
  const pad = new Mesh(disc, padMaterial);
  ground.rotation.x = -Math.PI / 2;
  pad.rotation.x = -Math.PI / 2;
  pad.renderOrder = 1;
  land.add(ground, pad);
  view.scene.add(land);

  const glow = createGlow(FLAME, 1, 0.85);
  // Drawn after the ground, which would otherwise paint over it.
  glow.renderOrder = 3;
  glow.visible = false;
  view.scene.add(glow);

  let rocket: Vehicle | null = null;
  let length = 1;
  let leaving: Leaving[] = [];
  let copies: Material[] = [];
  let goal = new Box3();
  const camera = { y: 0, distance: 1 };
  let climbing = false;
  let look = LOOK;

  interface Lineup {
    vehicles: Array<Vehicle | null>;
    pads: Mesh[];
    materials: MeshBasicMaterial[];
  }
  let lineup: Lineup | null = null;

  /** Where the camera stands: the height it looks at, and how far back it is. */
  interface CameraPlace {
    y: number;
    distance: number;
  }
  /** Where the camera fits a box: its height with a little room below and more above. */
  const fit = (box: Box3): CameraPlace => {
    if (box.isEmpty()) return { ...camera };
    const height = box.max.y - box.min.y;
    const low = box.min.y - height * 0.06;
    const high = box.max.y + height * 0.16;
    const vertical = MathUtils.degToRad(view.camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * view.camera.aspect);
    const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    const distance =
      Math.max((high - low) / 2 / Math.tan(vertical), (width * 1.2) / Math.tan(horizontal)) +
      width / 2;
    return { y: (low + high) / 2, distance };
  };
  const place = (): void => {
    const c = view.camera;
    c.position.set(0, camera.y, 0).addScaledVector(look, camera.distance);
    c.lookAt(0, camera.y, 0);
    // The kit's (switched off) controls still aim the camera at their target each frame.
    view.controls.target.set(0, camera.y, 0);
    c.near = Math.max(0.05, camera.distance * 0.01);
    c.far = Math.max(2000, camera.distance * 40);
    c.updateProjectionMatrix();
  };
  /**
   * Frame the lineup: the height decides the distance, and the places are
   * spread so each stands at the middle of its column of the canvas.
   */
  const layoutLineup = (row: Lineup): void => {
    const count = row.vehicles.length;
    // Room below for the labels under the pads, a little above the tips.
    const low = -LINEUP_HEIGHT * 0.3;
    const high = LINEUP_HEIGHT * 1.08;
    const vertical = MathUtils.degToRad(view.camera.fov / 2);
    const horizontal = Math.tan(vertical) * view.camera.aspect;
    camera.y = (low + high) / 2;
    camera.distance = (high - low) / 2 / Math.tan(vertical);
    row.vehicles.forEach((vehicle, index) => {
      const x = (-1 + (2 * index + 1) / count) * camera.distance * horizontal;
      vehicle?.object.position.set(x, 0, 0);
      row.pads[index]?.position.set(x, 0, 0);
    });
  };
  const snap = (): void => {
    if (lineup) layoutLineup(lineup);
    else Object.assign(camera, fit(goal));
    place();
  };

  /** The nodes a part shows, found by hiding it and seeing what went (the kit has no other way to ask). */
  const nodesOf = (vehicle: Vehicle, part: VehiclePart): Object3D[] => {
    const shown = new Set<Object3D>();
    vehicle.object.traverse((child) => {
      if (child.visible) shown.add(child);
    });
    vehicle.setPartVisible(part, false);
    const nodes: Object3D[] = [];
    vehicle.object.traverse((child) => {
      if (shown.has(child) && !child.visible) nodes.push(child);
    });
    vehicle.setPartVisible(part, true);
    return nodes;
  };

  /** The box of the stack without the parts that are leaving. */
  const boxWithout = (vehicle: Vehicle, parts: readonly VehiclePart[]): Box3 => {
    for (const part of parts) vehicle.setPartVisible(part, false);
    const box = visibleBox(vehicle.object);
    for (const part of parts) vehicle.setPartVisible(part, true);
    return box;
  };

  const setOpacity = (list: readonly Material[], opacity: number): void => {
    for (const material of list) material.opacity = opacity;
  };

  const clearRocket = (): void => {
    if (rocket) {
      view.scene.remove(rocket.object);
      rocket.dispose();
      rocket = null;
    }
    for (const material of copies) material.dispose();
    copies = [];
    leaving = [];
  };
  const clearLineup = (): void => {
    if (!lineup) return;
    for (const vehicle of lineup.vehicles) {
      if (!vehicle) continue;
      view.scene.remove(vehicle.object);
      vehicle.dispose();
    }
    for (const mesh of lineup.pads) land.remove(mesh);
    for (const material of lineup.materials) material.dispose();
    lineup = null;
    pad.visible = true;
    look = LOOK;
  };

  // Keep the stack framed when the canvas changes size (the kit sets the new aspect first).
  const resize = new ResizeObserver(() => {
    const stop = view.addFrameCallback(() => {
      stop();
      snap();
      return true;
    });
  });
  resize.observe(canvas);

  return {
    show(parts, label) {
      clearLineup();
      clearRocket();
      rocket = createVehicle({ layout: 'launch', parts });
      view.scene.add(rocket.object);
      length = Math.max(1, rocket.length);
      goal = visibleBox(rocket.object);
      const width = Math.max(goal.max.x - goal.min.x, goal.max.z - goal.min.z, 1);
      ground.scale.setScalar(length * 8);
      pad.scale.setScalar(width * 2.2);
      land.position.y = 0;
      land.visible = true;
      setOpacity([groundMaterial, padMaterial], 1);
      background.copy(HAZE);
      climbing = false;
      glow.visible = false;
      canvas.setAttribute('aria-label', label);
      snap();
      view.requestRender();
    },
    showLineup(count, label) {
      clearLineup();
      clearRocket();
      const row: Lineup = { vehicles: [], pads: [], materials: [] };
      for (let index = 0; index < count; index += 1) {
        const material = padMaterial.clone();
        const mesh = new Mesh(disc, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 1;
        mesh.scale.setScalar(LINEUP_HEIGHT * 0.11);
        land.add(mesh);
        row.vehicles.push(null);
        row.pads.push(mesh);
        row.materials.push(material);
      }
      lineup = row;
      look = LINEUP_LOOK;
      pad.visible = false;
      ground.scale.setScalar(LINEUP_HEIGHT * 12);
      land.position.y = 0;
      land.visible = true;
      setOpacity([groundMaterial, padMaterial], 1);
      background.copy(HAZE);
      climbing = false;
      glow.visible = false;
      canvas.setAttribute('aria-label', label);
      snap();
      view.requestRender();
    },
    setLineupRocket(index, parts) {
      const row = lineup;
      if (!row || index < 0 || index >= row.vehicles.length || row.vehicles[index]) return;
      const vehicle = createVehicle({ layout: 'launch', parts });
      vehicle.setHeight(LINEUP_HEIGHT);
      view.scene.add(vehicle.object);
      row.vehicles[index] = vehicle;
      snap();
      view.requestRender();
    },
    highlight(index) {
      lineup?.materials.forEach((material, place) =>
        material.color.setHex(place === index ? PAD_MARKED : PAD),
      );
      view.requestRender();
    },
    clear() {
      clearLineup();
      clearRocket();
      glow.visible = false;
      view.requestRender();
    },
    setClimbing(on) {
      climbing = on;
      glow.visible = on && rocket !== null;
      view.requestRender();
    },
    drop(parts) {
      if (!rocket) return;
      const vehicle = rocket;
      const own: Material[] = [];
      for (const part of parts) {
        for (const node of nodesOf(vehicle, part)) {
          node.traverse((child) => {
            const mesh = child as Mesh;
            if (!mesh.isMesh) return;
            const copy = (material: Material): Material => {
              const made = material.clone();
              made.transparent = true;
              own.push(made);
              return made;
            };
            mesh.material = Array.isArray(mesh.material)
              ? mesh.material.map(copy)
              : copy(mesh.material);
          });
        }
      }
      copies.push(...own);
      leaving.push({ parts: [...parts], age: 0, copies: own });
      // With motion, the camera eases to what is left at once; without, it waits until the part has gone.
      if (!reducedMotion()) goal = boxWithout(vehicle, parts);
    },
    update(seconds, progress, dt) {
      const reduced = reducedMotion();
      if (rocket) {
        const vehicle = rocket;
        leaving = leaving.filter((item) => {
          item.age += dt;
          const u = item.age / (reduced ? FADE_SECONDS : DRIFT_SECONDS);
          for (const part of item.parts) vehicle.drift(part, reduced ? 0 : length * 0.8 * u ** 1.5);
          setOpacity(item.copies, reduced ? Math.max(0, 1 - u) : 1 - smoothstep(0.45, 1, u));
          if (u < 1) return true;
          for (const part of item.parts) vehicle.setPartVisible(part, false);
          goal = visibleBox(vehicle.object);
          return false;
        });
      }

      // The climb, suggested: the haze fades to black and the ground falls away (or fades, without motion).
      background.copy(HAZE).lerp(SPACE, smoothstep(0.02, 0.4, progress));
      if (climbing && land.visible) {
        if (reduced) {
          land.position.y = 0;
          setOpacity([groundMaterial, padMaterial], 1 - smoothstep(0.5, 3, seconds));
          if (seconds > 3) land.visible = false;
        } else {
          land.position.y = -length * 0.12 * seconds * seconds;
          setOpacity([groundMaterial, padMaterial], 1 - smoothstep(6, 8, seconds));
          if (seconds > 8) land.visible = false;
        }
      }

      const target = fit(goal);
      if (reduced) Object.assign(camera, target);
      else {
        // Slow enough that a dropped part is seen falling away before the view moves on.
        const k = 1 - Math.exp(-dt * 1.1);
        camera.y += (target.y - camera.y) * k;
        camera.distance += (target.distance - camera.distance) * k;
      }
      place();

      if (glow.visible && !goal.isEmpty()) {
        const width = Math.max(goal.max.x - goal.min.x, goal.max.z - goal.min.z);
        glow.scale.setScalar(width * 2.4);
        glow.position.set(0, goal.min.y - width * 0.35, 0);
      }
    },
    get busy() {
      return leaving.length > 0;
    },
    onFrame(callback) {
      return view.addFrameCallback((dt) => {
        callback(dt);
        return true;
      });
    },
    dispose() {
      resize.disconnect();
      clearLineup();
      clearRocket();
      disc.dispose();
      groundMaterial.dispose();
      padMaterial.dispose();
      glow.material.dispose();
      view.dispose();
    },
  };
}
