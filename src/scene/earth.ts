import {
  AdditiveBlending,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Texture,
} from 'three';
import { EARTH_AXIAL_TILT_RAD, EARTH_RADIUS } from '../content/physical-constants';

export interface Earth {
  /** Root object, positioned at the origin. */
  readonly root: Group;
  /** The textured globe; spin it around its local Y axis. */
  readonly globe: Mesh;
  /** Point the atmosphere's day-side brightening toward the Sun. */
  setSunDirection(direction: Vector3): void;
  dispose(): void;
}

/**
 * The texture's center (longitude 0) maps to the sphere's local +X axis, and
 * east longitude increases toward local -Z. This turn brings Cape Canaveral
 * (about 80.6 degrees west) toward the default Earth view.
 */
const INITIAL_GLOBE_ROTATION = (-23 * Math.PI) / 180;

const atmosphereVertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDirection;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vWorldNormal);
    // Brightest where the line of sight grazes the edge of the globe.
    float rim = pow(1.0 - clamp(dot(normal, viewDirection), 0.0, 1.0), 3.0);
    // Fade on the night side, with a little left over at the terminator.
    float daylight = smoothstep(-0.35, 0.5, dot(normal, uSunDirection));
    float strength = rim * mix(0.06, 1.0, daylight);
    gl_FragColor = vec4(uColor * strength, strength);
    #include <colorspace_fragment>
  }
`;

export function createEarth(texture: Texture, detail: 'low' | 'high'): Earth {
  const root = new Group();
  root.name = 'Earth';

  // Tilt Earth's axis from ecliptic north. A rotation of -tilt about +X leans
  // the north pole toward ecliptic longitude 90 degrees (-Z), as it is in the
  // sky; see the frame description in src/scene/config.ts.
  const tilt = new Group();
  tilt.rotation.x = -EARTH_AXIAL_TILT_RAD;
  root.add(tilt);

  const segments = detail === 'high' ? [128, 64] as const : [72, 40] as const;
  const globe = new Mesh(
    new SphereGeometry(EARTH_RADIUS, segments[0], segments[1]),
    new MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0 }),
  );
  globe.name = 'Earth globe';
  globe.rotation.y = INITIAL_GLOBE_ROTATION;
  tilt.add(globe);

  const atmosphereMaterial = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(0.35, 0.6, 1.0) },
      uSunDirection: { value: new Vector3(1, 0, 0) },
    },
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
  });
  const atmosphere = new Mesh(
    new SphereGeometry(EARTH_RADIUS * 1.02, segments[0], segments[1]),
    atmosphereMaterial,
  );
  atmosphere.name = 'Earth atmosphere';
  root.add(atmosphere);

  return {
    root,
    globe,
    setSunDirection(direction) {
      (atmosphereMaterial.uniforms.uSunDirection!.value as Vector3).copy(direction).normalize();
    },
    dispose() {
      globe.geometry.dispose();
      (globe.material as MeshStandardMaterial).dispose();
      atmosphere.geometry.dispose();
      atmosphereMaterial.dispose();
    },
  };
}
