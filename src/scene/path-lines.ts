import {
  Color,
  Float32BufferAttribute,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Mesh,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ShaderMaterial,
  Vector2,
} from 'three';
import type { Polyline } from '../sim';
import { PATH_FUTURE_OPACITY, PATH_WIDTH_PX } from './config';

/**
 * A ship's path as a line of steady on-screen width. The vertex shader
 * blends the readable and true samples by the scale mix, so the line moves
 * with the Moon without rebuilding any buffer, and the fragment shader
 * splits it exactly at "now": bright where the ship has been, dim ahead.
 *
 * The screen-space line technique follows three.js's LineMaterial (round
 * caps, segments trimmed at the camera plane). A stencil test draws each
 * pixel of a path once, so overlapping orbits do not pile up, and the part
 * already flown, drawn first, wins where the two overlap.
 */

const vertexShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>

  uniform float linewidth;
  uniform vec2 resolution;
  uniform float uMix;

  attribute vec3 instanceStart;
  attribute vec3 instanceEnd;
  attribute vec3 trueStart;
  attribute vec3 trueEnd;

  varying vec2 vUv;
  varying float vSample;

  float trimSegmentAlpha(const in vec4 start, const in vec4 end) {
    float a = projectionMatrix[2][2];
    float b = projectionMatrix[3][2];
    float nearEstimate = -0.5 * b / a;
    return (nearEstimate - start.z) / (end.z - start.z);
  }

  void main() {
    float aspect = resolution.x / resolution.y;
    vec4 start = modelViewMatrix * vec4(mix(instanceStart, trueStart, uMix), 1.0);
    vec4 end = modelViewMatrix * vec4(mix(instanceEnd, trueEnd, uMix), 1.0);

    // Sample index along the path: this segment runs from sample i to i + 1.
    vSample = float(gl_InstanceID) + (position.y < 0.5 ? 0.0 : 1.0);
    vUv = uv;

    // Pull the line a hair toward the camera along each sight line, so it
    // is not swallowed by the ground it starts from. Its screen position does
    // not change.
    start.xyz *= 0.9975;
    end.xyz *= 0.9975;

    if (start.z < 0.0 && end.z >= 0.0) {
      end.xyz = mix(start.xyz, end.xyz, trimSegmentAlpha(start, end));
    } else if (end.z < 0.0 && start.z >= 0.0) {
      start.xyz = mix(end.xyz, start.xyz, trimSegmentAlpha(end, start));
    }

    vec4 clipStart = projectionMatrix * start;
    vec4 clipEnd = projectionMatrix * end;
    vec2 ndcStart = clipStart.xy / clipStart.w;
    vec2 ndcEnd = clipEnd.xy / clipEnd.w;

    vec2 dir = ndcEnd - ndcStart;
    dir.x *= aspect;
    dir = length(dir) > 1e-9 ? normalize(dir) : vec2(1.0, 0.0);

    vec2 offset = vec2(dir.y, -dir.x);
    dir.x /= aspect;
    offset.x /= aspect;
    if (position.x < 0.0) offset *= -1.0;
    if (position.y < 0.0) offset += -dir;
    else if (position.y > 1.0) offset += dir;
    offset *= linewidth;
    offset /= resolution.y;

    vec4 clip = position.y < 0.5 ? clipStart : clipEnd;
    offset *= clip.w;
    clip.xy += offset;
    gl_Position = clip;

    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>

  uniform vec3 diffuse;
  uniform float uNow;
  uniform float uFutureOpacity;

  varying vec2 vUv;
  varying float vSample;

  void main() {
    #include <logdepthbuf_fragment>

    // Round caps.
    if (abs(vUv.y) > 1.0) {
      float a = vUv.x;
      float b = vUv.y > 0.0 ? vUv.y - 1.0 : vUv.y + 1.0;
      if (a * a + b * b > 1.0) discard;
    }

    float alpha = vSample <= uNow ? 1.0 : uFutureOpacity;
    gl_FragColor = vec4(diffuse, alpha);
    #include <colorspace_fragment>
  }
`;

/** Corner layout of one segment: a quad with a cap at each end (as in three's LineSegmentsGeometry). */
const QUAD_POSITIONS = [-1, 2, 0, 1, 2, 0, -1, 1, 0, 1, 1, 0, -1, 0, 0, 1, 0, 0, -1, -1, 0, 1, -1, 0];
const QUAD_UVS = [-1, 2, 1, 2, -1, 1, 1, 1, -1, -1, 1, -1, -1, -2, 1, -2];
const QUAD_INDEX = [0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 5, 3, 4, 6, 5, 6, 7, 5];

export interface PathLine {
  readonly mesh: Mesh;
  /** Mission time at each sample. */
  readonly times: Float64Array;
  setMix(mix: number): void;
  /** Light the line up to mission time t. */
  setTime(t: number): void;
  setResolution(width: number, height: number): void;
  dispose(): void;
}

/**
 * Index position of mission time t along the samples: i + fraction when t
 * lies between sample i and i + 1; -1 before the first; the last index after.
 */
export function sampleIndexAt(times: Float64Array, t: number): number {
  const n = times.length;
  if (n === 0 || t < (times[0] as number)) return -1;
  if (t >= (times[n - 1] as number)) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] as number) <= t) lo = mid;
    else hi = mid;
  }
  const a = times[lo] as number;
  const b = times[hi] as number;
  return lo + (b > a ? (t - a) / (b - a) : 0);
}

/**
 * Build the line for one ship. `endTime` stops the line early (for a ship
 * that is drawn with the other from then on). `stencilRef` must differ
 * between lines.
 */
export function createPathLine(polyline: Polyline, color: number, stencilRef: number, endTime = Infinity): PathLine {
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(QUAD_INDEX);
  geometry.setAttribute('position', new Float32BufferAttribute(QUAD_POSITIONS, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(QUAD_UVS, 2));

  // Each instance is one segment; its start and end read consecutive samples
  // straight from the model's arrays.
  const readable = new InstancedInterleavedBuffer(polyline.readablePositions, 3, 1);
  const real = new InstancedInterleavedBuffer(polyline.truePositions, 3, 1);
  geometry.setAttribute('instanceStart', new InterleavedBufferAttribute(readable, 3, 0));
  geometry.setAttribute('instanceEnd', new InterleavedBufferAttribute(readable, 3, 3));
  geometry.setAttribute('trueStart', new InterleavedBufferAttribute(real, 3, 0));
  geometry.setAttribute('trueEnd', new InterleavedBufferAttribute(real, 3, 3));

  const times = polyline.times;
  let samples = times.length;
  if (Number.isFinite(endTime)) {
    const last = Math.floor(sampleIndexAt(times, endTime));
    if (last >= 1) samples = last + 1;
  }
  geometry.instanceCount = Math.max(0, samples - 1);

  const material = new ShaderMaterial({
    uniforms: {
      diffuse: { value: new Color(color) },
      linewidth: { value: PATH_WIDTH_PX },
      resolution: { value: new Vector2(1, 1) },
      uMix: { value: 0 },
      uNow: { value: -1 },
      uFutureOpacity: { value: PATH_FUTURE_OPACITY },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    stencilWrite: true,
    stencilRef,
    stencilFunc: NotEqualStencilFunc,
    stencilZPass: ReplaceStencilOp,
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.name = 'Path';

  const uniforms = material.uniforms as {
    uMix: { value: number };
    uNow: { value: number };
    resolution: { value: Vector2 };
  };

  return {
    mesh,
    times,
    setMix(mix) {
      uniforms.uMix.value = mix;
    },
    setTime(t) {
      uniforms.uNow.value = sampleIndexAt(times, t);
    },
    setResolution(width, height) {
      uniforms.resolution.value.set(width, height);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
