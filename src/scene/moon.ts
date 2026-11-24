import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Texture,
} from 'three';
import { MOON_RADIUS } from '../content/physical-constants';
import { addNightSide } from './night-side';

/** Night-side light, as a share of the surface color (linear): dim and slightly cool. */
const NIGHT_TINT = new Color(0.2, 0.22, 0.29);

export interface Moon {
  /** Root object; its position is the Moon's center. */
  readonly root: Group;
  /** Move the Moon and keep its near side turned toward Earth. */
  setPosition(position: Vector3, earthCenter: Vector3): void;
  /** Point the day side toward the Sun. */
  setSunDirection(direction: Vector3): void;
  dispose(): void;
}

export function createMoon(texture: Texture, detail: 'low' | 'high'): Moon {
  const root = new Group();
  root.name = 'Moon';

  const segments = detail === 'high' ? ([96, 48] as const) : ([64, 32] as const);
  const globe = new Mesh(
    new SphereGeometry(MOON_RADIUS, segments[0], segments[1]),
    new MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
  );
  const nightSide = addNightSide(globe.material as MeshStandardMaterial, NIGHT_TINT);
  globe.name = 'Moon globe';

  // The CGI Moon Kit color map is centered on 0 degrees longitude, the
  // middle of the near side (the face seen from Earth). On a three.js sphere
  // the texture's center lands on local +X. Object3D.lookAt points an
  // object's +Z axis at its target, so turn the globe -90 degrees about Y to
  // carry +X onto +Z; then root.lookAt(Earth) turns the near side to Earth.
  globe.rotation.y = -Math.PI / 2;
  root.add(globe);

  return {
    root,
    setPosition(position, earthCenter) {
      root.position.copy(position);
      root.lookAt(earthCenter);
    },
    setSunDirection(direction) {
      nightSide.setSunDirection(direction);
    },
    dispose() {
      globe.geometry.dispose();
      (globe.material as MeshStandardMaterial).dispose();
    },
  };
}
