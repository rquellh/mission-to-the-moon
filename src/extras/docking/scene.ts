/**
 * The docking toy's 3D view, drawn with the scene kit: the Gemini and the
 * Agena, and the docked pair that takes their place once they join. The
 * camera rides over the Gemini's shoulder, looking ahead at the Agena.
 *
 * World axes: the Agena's docking cone opens toward +Z, its mouth at the
 * origin; the Gemini comes in from +Z, nose first (toward -Z), with its
 * hatches on top (+Y). Positions come from the toy's made-up distances in
 * game.ts, one toy meter to one meter of the models, which the kit draws
 * at roughly their real sizes.
 */
import { MathUtils, Vector3 } from "three";
import { COLORS, createGlow, createMiniView, createVehicle, type MiniView, type VehiclePart } from "../../scene/kit.ts";
import type { Flight, Thrust } from "./game.ts";

export interface DockingParts {
  gemini: readonly VehiclePart[];
  agena: readonly VehiclePart[];
  docked: readonly VehiclePart[];
}

export interface DockingScene {
  readonly view: MiniView;
  /** Put the Gemini where the flight is, with the camera behind it, swaying gently unless `still`. */
  fly(flight: Flight, seconds: number, still: boolean): void;
  /** A short puff of thruster light on the side opposite the push. */
  puff(thrust: Thrust, still: boolean): void;
  /** The two craft become one docked model; the camera moves out to the side to show the pair (or jumps there when `still`). */
  join(still: boolean): void;
  /** Two craft again, apart. */
  separate(): void;
  /** Run the puff and the camera move on by `seconds`; true while either is still going. */
  tick(seconds: number, still: boolean): boolean;
  dispose(): void;
}

/** Where the camera sits from the Gemini's nose (behind, above, a little to the right) and where it looks. */
const CAMERA_FROM_NOSE = new Vector3(3.6, 7.2, 15.5);
const LOOK_FROM_NOSE = new Vector3(0.6, -1.6, -8);
/** A narrow lens from well back, so the Gemini does not hide the Agena. */
const FOV = 26;
/** The side view of the docked pair. */
const PAIR_DIRECTION = new Vector3(0.78, 0.36, 0.52).normalize();
const PAIR_SECONDS = 1.8;
const PUFF_SECONDS = 0.35;

/** Model +Y (a craft's way of travel) to world -Z, and model +Z (its top) to world +Y. */
const LYING_DOWN = -Math.PI / 2;

export function createDockingScene(canvas: HTMLCanvasElement, parts: DockingParts): DockingScene {
  const view = createMiniView(canvas, { stars: true, controls: false, fov: FOV });
  const { camera, scene } = view;
  const near = (): void => {
    camera.near = 0.1;
    camera.updateProjectionMatrix();
  };
  near();

  // The Agena flies cone first toward the Gemini: "backward" turns it end for end, its top kept on top.
  const agena = createVehicle({ layout: "alone", parts: parts.agena, facing: "backward" });
  agena.object.rotation.x = LYING_DOWN;
  // Its cone end is its lowest point along the model's +Y; that goes to z = 0.
  agena.object.position.set(0, 0, agena.bottom);
  const agenaEngineZ = agena.bottom - agena.top;

  const gemini = createVehicle({ layout: "alone", parts: parts.gemini });
  gemini.object.rotation.x = LYING_DOWN;

  // The docked pair, with its Agena where the lone Agena is (its engine end is the pair's top).
  const docked = createVehicle({ layout: "docked", parts: parts.docked });
  docked.object.rotation.x = LYING_DOWN;
  docked.object.position.set(0, 0, agenaEngineZ + docked.top);
  docked.object.visible = false;

  // A soft aqua glow behind the Agena, as the main scene draws one so a craft can be found (aqua: not the crew's ship).
  const beacon = createGlow(COLORS.other, 6, 0.4);
  beacon.position.set(0, 0, -1.5);

  const glow = createGlow(0xffffff, 1.3, 0.9);
  glow.visible = false;
  scene.add(agena.object, gemini.object, docked.object, beacon, glow);

  const nose = new Vector3();
  const look = new Vector3();
  let clock = 0;
  let puffLeft = 0;
  let pair: { t: number; fromPosition: Vector3; toPosition: Vector3; fromLook: Vector3; toLook: Vector3 } | null = null;

  const placeGemini = (flight: Flight): void => {
    nose.set(flight.x, flight.y, flight.gap);
    gemini.object.position.set(flight.x, flight.y, flight.gap + gemini.top);
  };

  // The kit's look-around controls turn the camera toward their target on every frame, so the target is kept on the point looked at.
  const aim = (): void => {
    view.controls.target.copy(look);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
  };

  const placeCamera = (still: boolean): void => {
    camera.position.copy(nose).add(CAMERA_FROM_NOSE);
    look.copy(nose).add(LOOK_FROM_NOSE);
    if (!still) {
      // A slow, small sway, as if the camera floated: never under reduced motion.
      camera.position.x += Math.sin(clock * 0.53) * 0.08;
      camera.position.y += Math.sin(clock * 0.41 + 1.2) * 0.07;
    }
    aim();
  };

  const puffAt = (thrust: Thrust, out: Vector3): Vector3 => {
    const center = gemini.object.position;
    switch (thrust) {
      case "left":
        return out.set(center.x + 1.7, center.y, center.z);
      case "right":
        return out.set(center.x - 1.7, center.y, center.z);
      case "up":
        return out.set(center.x, center.y - 1.7, center.z);
      case "down":
        return out.set(center.x, center.y + 1.7, center.z);
      case "forward":
        // Behind the aft end.
        return out.set(center.x, center.y, center.z - gemini.bottom + 0.4);
      case "back":
        // Just ahead of the nose, off to one side so it is not hidden behind the cabin.
        return out.set(center.x + 0.6, center.y + 0.3, nose.z - 0.2);
    }
  };

  return {
    view,
    fly(flight, seconds, still) {
      clock += seconds;
      placeGemini(flight);
      placeCamera(still);
      view.requestRender();
    },
    puff(thrust, still) {
      puffAt(thrust, glow.position);
      glow.visible = true;
      glow.material.opacity = still ? 0.6 : 0.9;
      puffLeft = PUFF_SECONDS;
      view.requestRender();
    },
    join(still) {
      gemini.object.visible = false;
      agena.object.visible = false;
      docked.object.visible = true;
      glow.visible = false;
      beacon.visible = false;
      puffLeft = 0;
      // Where the kit's framing would put the camera to show the whole pair from the side.
      const fromPosition = camera.position.clone();
      const fromLook = look.clone();
      const center = docked.object.position.clone();
      view.frame(center, docked.length * 0.4, PAIR_DIRECTION);
      const toPosition = camera.position.clone();
      if (still) {
        pair = null;
      } else {
        camera.position.copy(fromPosition);
        look.copy(fromLook);
        aim();
        pair = { t: 0, fromPosition, toPosition, fromLook, toLook: center };
      }
      view.requestRender();
    },
    separate() {
      gemini.object.visible = true;
      agena.object.visible = true;
      docked.object.visible = false;
      beacon.visible = true;
      pair = null;
      // Undo the distance limits the kit's framing of the pair set.
      view.controls.minDistance = 0;
      view.controls.maxDistance = Infinity;
      near();
      view.requestRender();
    },
    tick(seconds, still) {
      let moving = false;
      if (puffLeft > 0) {
        puffLeft -= seconds;
        if (puffLeft <= 0) glow.visible = false;
        // Fades out, or (under reduced motion) simply goes after a moment.
        else if (!still) glow.material.opacity = 0.9 * (puffLeft / PUFF_SECONDS);
        moving = true;
      }
      if (pair) {
        pair.t = Math.min(1, pair.t + seconds / PAIR_SECONDS);
        const u = still ? 1 : MathUtils.smootherstep(pair.t, 0, 1);
        camera.position.lerpVectors(pair.fromPosition, pair.toPosition, u);
        look.lerpVectors(pair.fromLook, pair.toLook, u);
        aim();
        if (pair.t >= 1 || still) pair = null;
        moving = true;
      }
      if (moving) view.requestRender();
      return moving;
    },
    dispose() {
      scene.remove(agena.object, gemini.object, docked.object, beacon, glow);
      agena.dispose();
      gemini.dispose();
      docked.dispose();
      // The glow's picture is shared by the kit; only its material is ours.
      glow.material.dispose();
      beacon.material.dispose();
      view.dispose();
    },
  };
}
