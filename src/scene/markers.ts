import { BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial } from 'three';
import { MARKER_CURRENT_SIZE_PX, MARKER_SIZE_PX, SITE_MARKER_SIZE_PX } from './config';

/**
 * Small round markers of steady on-screen size, drawn as points:
 * - event markers, one at each event's place on the path, blended between
 *   the readable and true positions by the scale mix; the current event's
 *   marker is drawn larger with a ring;
 * - site markers (launch site, landing site, splashdown point), fixed to the
 *   ground and drawn as open rings.
 * Markers on the far side of Earth or the Moon are hidden by depth testing.
 */

const vertexShader = /* glsl */ `
  uniform float uMix;
  uniform float uPixelRatio;
  uniform float uCurrent;
  uniform float uSize;
  uniform float uCurrentSize;

  attribute vec3 truePosition;
  attribute vec3 aColor;
  attribute float eventIndex;
  attribute float aGroup;
  uniform float uGroupOpacity[MAX_GROUPS];

  varying vec3 vColor;
  varying float vGroupOpacity;
  varying float vKind;
  varying float vAhead;

  void main() {
    vec4 mv = modelViewMatrix * vec4(mix(position, truePosition, uMix), 1.0);
    // Drawn just in front of the path line and the ground at the same spot.
    mv.xyz *= 0.995;
    gl_Position = projectionMatrix * mv;

    bool current = eventIndex >= 0.0 && abs(eventIndex - uCurrent) < 0.5;
    vKind = eventIndex < 0.0 ? 2.0 : (current ? 1.0 : 0.0);
    vAhead = eventIndex > uCurrent + 0.5 ? 1.0 : 0.0;
    gl_PointSize = (current ? uCurrentSize : uSize) * uPixelRatio;
    vColor = aColor;
    vGroupOpacity = aGroup < 0.0 ? 1.0 : uGroupOpacity[int(aGroup + 0.5)];
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;

  varying vec3 vColor;
  varying float vKind;
  varying float vAhead;
  varying float vGroupOpacity;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    float aa = fwidth(r) * 1.2;
    float outside = 1.0 - smoothstep(1.0 - aa, 1.0, r);
    if (outside <= 0.0) discard;

    vec3 rim = vec3(0.02, 0.03, 0.05);
    vec3 color;
    float alpha;
    if (vKind > 1.5) {
      // Site: a white ring, outlined in dark, around an open middle.
      float hollow = 1.0 - smoothstep(0.3 - aa, 0.3, r);
      float ring = smoothstep(0.48 - aa, 0.48, r) * (1.0 - smoothstep(0.8 - aa, 0.8, r));
      color = mix(rim, vec3(1.0), ring);
      alpha = outside * (1.0 - hollow) * 0.95;
    } else if (vKind > 0.5) {
      // Current event: the ship's color in a white ring.
      float fill = 1.0 - smoothstep(0.45 - aa, 0.45, r);
      float ring = smoothstep(0.6 - aa, 0.6, r) * (1.0 - smoothstep(0.84 - aa, 0.84, r));
      color = fill > 0.0 ? mix(rim, vColor, fill) : mix(rim, vec3(1.0), ring);
      alpha = outside;
    } else {
      // Event: a dot of the ship's color with a dark rim; dimmer when still to come.
      float fill = 1.0 - smoothstep(0.62 - aa, 0.62, r);
      color = mix(rim, vColor, fill);
      alpha = outside * (vAhead > 0.5 ? 0.6 : 1.0);
    }
    if (vGroupOpacity < 0.01) discard;
    gl_FragColor = vec4(color, alpha * uOpacity * vGroupOpacity);
    #include <colorspace_fragment>
  }
`;

export interface MarkerSet {
  readonly points: Points;
  setMix(mix: number): void;
  /** Emphasize the event at this index (-1 for none). */
  setCurrent(index: number): void;
  /** Fade the whole set (0 hidden, 1 shown). */
  setOpacity(opacity: number): void;
  /** Fade the markers of one group (a ship's, see MarkerPoint.group). */
  setGroupOpacity(group: number, opacity: number): void;
  setPixelRatio(ratio: number): void;
  dispose(): void;
}

export interface MarkerPoint {
  readable: ArrayLike<number>;
  true: ArrayLike<number>;
  color: number;
  /** The event's index, or -1 for a site marker. */
  eventIndex: number;
  /** The group it fades with (the index of the ship it is drawn on), if any. */
  group?: number;
}

/** Most groups of markers that fade separately. */
const MAX_GROUPS = 8;

export function createMarkers(points: readonly MarkerPoint[], site: boolean): MarkerSet {
  const geometry = new BufferGeometry();
  const readable: number[] = [];
  const real: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const groups: number[] = [];
  const color = new Color();
  for (const point of points) {
    readable.push(point.readable[0] ?? 0, point.readable[1] ?? 0, point.readable[2] ?? 0);
    real.push(point.true[0] ?? 0, point.true[1] ?? 0, point.true[2] ?? 0);
    color.set(point.color);
    colors.push(color.r, color.g, color.b);
    indices.push(point.eventIndex);
    groups.push(point.group !== undefined && point.group < MAX_GROUPS ? point.group : -1);
  }
  geometry.setAttribute('position', new Float32BufferAttribute(readable, 3));
  geometry.setAttribute('truePosition', new Float32BufferAttribute(real, 3));
  geometry.setAttribute('aColor', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('eventIndex', new Float32BufferAttribute(indices, 1));
  geometry.setAttribute('aGroup', new Float32BufferAttribute(groups, 1));

  const material = new ShaderMaterial({
    uniforms: {
      uMix: { value: 0 },
      uPixelRatio: { value: 1 },
      uCurrent: { value: -10 },
      uSize: { value: site ? SITE_MARKER_SIZE_PX : MARKER_SIZE_PX },
      uCurrentSize: { value: MARKER_CURRENT_SIZE_PX },
      uOpacity: { value: 1 },
      uGroupOpacity: { value: new Array<number>(MAX_GROUPS).fill(1) },
    },
    defines: { MAX_GROUPS },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new Points(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.name = site ? 'Site markers' : 'Event markers';
  const uniforms = material.uniforms as {
    uMix: { value: number };
    uPixelRatio: { value: number };
    uCurrent: { value: number };
    uOpacity: { value: number };
    uGroupOpacity: { value: number[] };
  };

  return {
    points: mesh,
    setMix(mix) {
      uniforms.uMix.value = mix;
    },
    setCurrent(index) {
      uniforms.uCurrent.value = index;
    },
    setOpacity(opacity) {
      uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.01;
    },
    setGroupOpacity(group, opacity) {
      if (group >= 0 && group < MAX_GROUPS) uniforms.uGroupOpacity.value[group] = opacity;
    },
    setPixelRatio(ratio) {
      uniforms.uPixelRatio.value = ratio;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
