/**
 * The "Fly to orbit" view, checked without drawing: the kit's view is
 * replaced by a plain three.js scene and camera, the size of a phone's or a
 * computer's canvas, with the kit's own rule for widening the field of view
 * on a tall canvas. The rocket and the spacecraft are the kit's real models.
 * What is guarded is what cannot be seen in a test but must hold in the
 * picture: the whole play area in frame under the fuel strip, the rocket's
 * middle on the flight's point after a drop, and the spacecraft coming to
 * rest in view, in the same place with and without motion.
 *
 * Run: npx vitest run src/extras/orbit/scene.test.ts
 */
import {
  Box3,
  Vector3,
  type BufferGeometry,
  type Mesh,
  type MeshBasicMaterial,
  type Object3D,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { VehiclePart } from '../../scene/kit.ts';
import { RULES, startFlight, type Flight } from './game.ts';
import { createOrbitScene, type OrbitScene } from './scene.ts';

/** The canvas the fake view stands for, CSS pixels. */
const canvasSize = vi.hoisted(() => ({ width: 358, height: 440 }));

vi.mock('../../scene/kit.ts', async (importOriginal) => {
  const kit = await importOriginal<typeof import('../../scene/kit.ts')>();
  const three = await import('three');
  return {
    ...kit,
    createMiniView(_canvas: HTMLCanvasElement, options: { fov?: number } = {}) {
      const { width, height } = canvasSize;
      const aspect = width / height;
      // The kit widens the field on a tall canvas so at least 36 degrees show across, up to 66 degrees.
      const across = three.MathUtils.degToRad(36);
      const vertical = three.MathUtils.radToDeg(2 * Math.atan(Math.tan(across / 2) / aspect));
      const fov = three.MathUtils.clamp(vertical, options.fov ?? 40, 66);
      const camera = new three.PerspectiveCamera(fov, aspect, 1, 2000);
      return {
        renderer: {
          getSize: (out: InstanceType<typeof three.Vector2>) => out.set(width, height),
        },
        scene: new three.Scene(),
        camera,
        controls: { target: new three.Vector3() },
        reducedMotion: false,
        setControls() {},
        setSunDirection() {},
        frame() {},
        requestRender() {},
        addFrameCallback: () => () => {},
        dispose() {},
      };
    },
  };
});

/** The Saturn V as Apollo 11's vehicle file lists it at liftoff, and the parts the screen drops at each stage. */
const SATURN_V: readonly VehiclePart[] = [
  'first-stage',
  'aft-interstage',
  'second-stage',
  'third-stage',
  'adapter',
  'lm-descent-stage',
  'lm-ascent-stage',
  'service-module',
  'command-module',
  'escape-tower',
];
const FIRST_DROP: readonly VehiclePart[] = ['first-stage', 'aft-interstage', 'escape-tower'];
const SECOND_DROP: readonly VehiclePart[] = ['second-stage'];

/** The fuel strip's height over the top of the view, and room above the orbit line for its label, CSS pixels. */
const STRIP_PX = 56;
const LABEL_PX = 20;
const FRAME = 1 / 60;

function sceneOn(width: number, height: number): OrbitScene {
  canvasSize.width = width;
  canvasSize.height = height;
  return createOrbitScene(document.createElement('canvas'));
}

/** The box around the meshes drawn in `object`, in the world (hidden ones left out). */
function drawnBox(object: Object3D): Box3 {
  const box = new Box3();
  const piece = new Box3();
  object.updateMatrixWorld(true);
  object.traverseVisible((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox)
      box.union(piece.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld));
  });
  return box;
}

function named(scene: OrbitScene, name: string): Object3D {
  const object = scene.view.scene.getObjectByName(name);
  if (!object) throw new Error(`The view has no "${name}".`);
  return object;
}

/** Tick until nothing moves (at most a minute of frames). */
function settle(scene: OrbitScene, still: boolean): void {
  for (let frame = 0; frame < 3600 && scene.tick(FRAME, still); frame += 1);
}

/** A Saturn V run out of fuel high up and nearly flat, near the right side: its two lower stages dropped, the last one empty. */
function outOfFuel(scene: OrbitScene, still: boolean): Flight {
  scene.setRocket(SATURN_V);
  const flight = startFlight('easy', 3);
  scene.fly(flight, null, 0, still);
  scene.drop(FIRST_DROP, still);
  scene.drop(SECOND_DROP, still);
  Object.assign(flight, { x: 30, height: 34, tilt: 5, stage: 2, fuel: 0 });
  scene.fly(flight, null, FRAME, still);
  scene.comeHome(flight, still);
  settle(scene, still);
  return flight;
}

describe('the orbit view', () => {
  describe('the camera', () => {
    it.each([
      ['a phone', 358, 440],
      ['a computer', 850, 630],
      ['the shorter view after an ending', 358, 248],
    ])(
      'keeps the whole play area in frame on %s, its top under the fuel strip',
      (_, width, height) => {
        const scene = sceneOn(width, height);
        const bottomLeft = scene.spot(0, -RULES.groundDepth + 0.01);
        const topRight = scene.spot(RULES.width, RULES.top);
        const orbit = scene.spot(0, RULES.orbitHeight);

        expect(bottomLeft).not.toBeNull();
        expect(topRight).not.toBeNull();
        expect(bottomLeft!.top * height).toBeGreaterThan(height - 1);
        expect(topRight!.top * height).toBeGreaterThanOrEqual(STRIP_PX - 0.01);
        expect(orbit!.top * height).toBeGreaterThan(STRIP_PX + LABEL_PX);
        scene.dispose();
      },
    );
  });

  describe('the sky and the ground', () => {
    it.each([
      ['a phone', 358, 440],
      ['a computer', 850, 630],
    ])(
      'scatters small stars on %s across the sky above the thick air, clear of the fuel strip',
      (_, width, height) => {
        const scene = sceneOn(width, height);
        const position = (named(scene, 'stars') as Mesh).geometry.getAttribute('position');
        const pixelsPerUnit = (scene.spot(0, 20)!.top - scene.spot(0, 21)!.top) * height;
        const lefts: number[] = [];
        for (let k = 0; k < position.count / 4; k += 1) {
          const [x0, y0, x1, y1] = [
            position.getX(k * 4),
            position.getY(k * 4),
            position.getX(k * 4 + 2),
            position.getY(k * 4 + 2),
          ];
          expect((x1 - x0) * pixelsPerUnit).toBeGreaterThanOrEqual(1 - 0.01);
          expect((x1 - x0) * pixelsPerUnit).toBeLessThanOrEqual(2 + 0.01);
          expect(y0).toBeGreaterThan(RULES.thickAirTop);
          expect(scene.spot(x1, y1)!.top * height).toBeGreaterThan(STRIP_PX);
          lefts.push(scene.spot(x0, y0)!.left);
        }
        expect(position.count / 4).toBeGreaterThanOrEqual(60);
        expect(Math.min(...lefts)).toBeLessThan(0.1);
        expect(Math.max(...lefts)).toBeGreaterThan(0.9);
        scene.dispose();
      },
    );

    it('draws the ground over everything else, so nothing shows below its edge', () => {
      const scene = sceneOn(358, 440);
      scene.setRocket(SATURN_V);
      scene.fly(startFlight('easy', 3), null, FRAME, false);
      const ground = named(scene, 'ground') as Mesh<BufferGeometry, MeshBasicMaterial>;
      const onTheGround = new Set(['ground', 'pad', 'ground-edge']);
      let latest = -Infinity;
      scene.view.scene.traverse((object) => {
        if (!onTheGround.has(object.name)) latest = Math.max(latest, object.renderOrder);
      });

      expect(ground.material.depthTest).toBe(false);
      expect(latest).toBeLessThan(ground.renderOrder);
      scene.dispose();
    });
  });

  describe('the rocket', () => {
    it('ends a drop with the middle of the stack that is left on the flight point', () => {
      const scene = sceneOn(358, 440);
      scene.setRocket(SATURN_V);
      const flight = startFlight('easy', 3);
      scene.fly(flight, null, 0, false);
      scene.drop(FIRST_DROP, false);
      for (let frame = 0; frame < 300; frame += 1) {
        flight.height += 0.01;
        scene.fly(flight, null, FRAME, false);
        scene.tick(FRAME, false);
      }
      const middle = drawnBox(named(scene, 'rocket')).getCenter(new Vector3());

      expect(middle.x).toBeCloseTo(flight.x, 2);
      expect(middle.y).toBeCloseTo(flight.height, 2);
      scene.dispose();
    });
  });

  describe('out of fuel', () => {
    it('brings the spacecraft to rest under its parachutes inside the play area', () => {
      const scene = sceneOn(358, 440);
      outOfFuel(scene, false);
      const craft = drawnBox(named(scene, 'spacecraft'));
      const chutes = drawnBox(named(scene, 'parachutes'));
      const rocket = drawnBox(named(scene, 'rocket'));

      expect(craft.isEmpty()).toBe(false);
      expect(rocket.isEmpty()).toBe(true);
      for (const box of [craft, chutes]) {
        expect(box.min.x).toBeGreaterThan(0);
        expect(box.max.x).toBeLessThan(RULES.width);
        expect(box.min.y).toBeGreaterThan(-RULES.groundDepth);
        expect(box.max.y).toBeLessThan(RULES.top);
      }
      // The parachutes hang above it, their lines meeting at its top.
      expect(chutes.min.y).toBeGreaterThan(craft.getCenter(new Vector3()).y);
      expect(chutes.max.y).toBeGreaterThan(craft.max.y + 2);
      scene.dispose();
    });

    it('ends on the same picture without motion', () => {
      const moving = sceneOn(358, 440);
      const still = sceneOn(358, 440);
      outOfFuel(moving, false);
      outOfFuel(still, true);

      for (const name of ['spacecraft', 'parachutes']) {
        const a = drawnBox(named(moving, name));
        const b = drawnBox(named(still, name));
        expect(a.min.distanceTo(b.min)).toBeLessThan(1e-6);
        expect(a.max.distanceTo(b.max)).toBeLessThan(1e-6);
      }
      moving.dispose();
      still.dispose();
    });
  });
});
