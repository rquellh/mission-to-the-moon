import { Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3, type Texture } from 'three';
import { MOON_RADIUS } from '../content/physical-constants';

export interface Moon {
  /** Root object; its position is the Moon's center. */
  readonly root: Group;
  /** Move the Moon and keep its near side turned toward Earth. */
  setPosition(position: Vector3, earthCenter: Vector3): void;
  dispose(): void;
}

export function createMoon(texture: Texture, detail: 'low' | 'high'): Moon {
  const root = new Group();
  root.name = 'Moon';

  const segments = detail === 'high' ? [96, 48] as const : [64, 32] as const;
  const globe = new Mesh(
    new SphereGeometry(MOON_RADIUS, segments[0], segments[1]),
    new MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
  );
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
    dispose() {
      globe.geometry.dispose();
      (globe.material as MeshStandardMaterial).dispose();
    },
  };
}
