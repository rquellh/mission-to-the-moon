import { BackSide, Mesh, MeshBasicMaterial, SphereGeometry, type Texture } from 'three';
import { EARTH_AXIAL_TILT_RAD } from '../content/physical-constants';
import { STAR_BRIGHTNESS } from './config';

export interface Starfield {
  readonly mesh: Mesh;
  dispose(): void;
}

/**
 * A large sphere, seen from inside, carrying the NASA SVS Deep Star Maps 2020
 * map in celestial (equatorial) coordinates. The texture is mirrored in
 * src/scene/textures.ts so right ascension runs eastward (toward local -Z)
 * from 0h at local +X, matching the way longitude runs on the Earth globe.
 *
 * The sphere is tilted like Earth's axis so the celestial poles line up with
 * Earth's poles. It follows the camera each frame, so it always looks
 * infinitely far away.
 */
export function createStarfield(texture: Texture, radius: number): Starfield {
  // Brightness is set in display terms; the material color is linear.
  const linearBrightness = Math.pow(STAR_BRIGHTNESS, 2.2);
  const material = new MeshBasicMaterial({
    map: texture,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  material.color.setScalar(linearBrightness);

  const mesh = new Mesh(new SphereGeometry(radius, 64, 32), material);
  mesh.name = 'Stars';
  mesh.rotation.x = -EARTH_AXIAL_TILT_RAD;
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;

  return {
    mesh,
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
