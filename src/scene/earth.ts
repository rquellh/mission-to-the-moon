import {
  AdditiveBlending,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Texture,
} from 'three';
import { EARTH_AXIAL_TILT_RAD, EARTH_RADIUS } from '../content/physical-constants';
import { addNightSide } from './night-side';

export interface Earth {
  /** Root object, positioned at the origin. */
  readonly root: Group;
  /**
   * The textured globe. Its local frame is Earth-fixed: longitude 0 on +X,
   * east toward -Z, north on +Y. Things fixed to the ground go in it.
   */
  readonly globe: Mesh;
  /**
   * Turn Earth as the flight path says: `axisAngle` turns the tilted axis
   * so it stays fixed among the stars while the frame turns with the Moon,
   * and `spinAngle` is the daily spin (see FlightPath.earthAxisAngle and
   * earthSpinAngle).
   */
  setOrientation(axisAngle: number, spinAngle: number): void;
  /** Point the day side (and the atmosphere's glow) toward the Sun. */
  setSunDirection(direction: Vector3): void;
  dispose(): void;
}

/**
 * The atmosphere: a thin blue glow at Earth's edge, computed per pixel from
 * the line of sight (how close it passes to Earth's center), so it is smooth
 * at any zoom and does not show the facets of the shell it is drawn on. The
 * shell's own edge is where the glow has faded to nothing. Only the sunlit
 * part glows; the night side gets no band.
 */
const atmosphereVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDirection;
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform float uThickness;
  varying vec3 vWorldPosition;

  void main() {
    vec3 ray = normalize(vWorldPosition - cameraPosition);
    vec3 fromCenter = cameraPosition - uCenter;
    // The point of the sight line closest to Earth's center, and its distance.
    vec3 closest = fromCenter - ray * dot(fromCenter, ray);
    float d = length(closest);
    float glow = d >= uRadius
      ? pow(1.0 - clamp((d - uRadius) / uThickness, 0.0, 1.0), 2.6)
      : exp((d - uRadius) / (uThickness * 0.3));
    float daylight = smoothstep(-0.05, 0.4, dot(closest / max(d, 1e-6), uSunDirection));
    float strength = glow * daylight * 0.6;
    gl_FragColor = vec4(uColor * strength, strength);
    #include <colorspace_fragment>
  }
`;

/** Height of the glow above the surface, as a share of Earth's radius. */
const ATMOSPHERE_THICKNESS = 0.045;
/** Night-side light, as a share of the surface color (linear): dim and slightly cool. */
const NIGHT_TINT = new Color(0.34, 0.4, 0.55);

export function createEarth(texture: Texture, detail: 'low' | 'high'): Earth {
  const root = new Group();
  root.name = 'Earth';

  // Tilt Earth's axis from ecliptic north. A rotation of -tilt about +X leans
  // the north pole toward -Z; turning the group about Y (order "YXZ") then
  // keeps the axis fixed among the stars as the frame turns with the Moon.
  // See the frame description in src/sim/frames.ts.
  const tilt = new Group();
  tilt.rotation.set(-EARTH_AXIAL_TILT_RAD, 0, 0, 'YXZ');
  root.add(tilt);

  const segments = detail === 'high' ? [128, 64] as const : [72, 40] as const;
  // Matte (Lambert): no shiny sheen where the ground is seen edge-on near the horizon.
  const globeMaterial = new MeshLambertMaterial({ map: texture });
  const nightSide = addNightSide(globeMaterial, NIGHT_TINT);
  const globe = new Mesh(new SphereGeometry(EARTH_RADIUS, segments[0], segments[1]), globeMaterial);
  globe.name = 'Earth globe';
  tilt.add(globe);

  const atmosphereMaterial = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(0.22, 0.48, 1.0) },
      uSunDirection: { value: new Vector3(1, 0, 0) },
      uCenter: { value: new Vector3(0, 0, 0) },
      uRadius: { value: EARTH_RADIUS },
      uThickness: { value: EARTH_RADIUS * ATMOSPHERE_THICKNESS },
    },
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
  });
  const atmosphere = new Mesh(
    new SphereGeometry(EARTH_RADIUS * (1 + ATMOSPHERE_THICKNESS), 96, 64),
    atmosphereMaterial,
  );
  atmosphere.name = 'Earth atmosphere';
  root.add(atmosphere);

  return {
    root,
    globe,
    setOrientation(axisAngle, spinAngle) {
      tilt.rotation.y = axisAngle;
      globe.rotation.y = spinAngle;
    },
    setSunDirection(direction) {
      (atmosphereMaterial.uniforms.uSunDirection!.value as Vector3).copy(direction).normalize();
      nightSide.setSunDirection(direction);
    },
    dispose() {
      globe.geometry.dispose();
      globeMaterial.dispose();
      atmosphere.geometry.dispose();
      atmosphereMaterial.dispose();
    },
  };
}
