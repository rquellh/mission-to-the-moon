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
  Vector3,
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
  attribute float timeStart;
  attribute float timeEnd;

  varying vec2 vUv;
  varying float vSample;
  varying float vTime;

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
    vTime = position.y < 0.5 ? timeStart : timeEnd;
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
  uniform vec2 uHidden[MAX_HIDDEN];
  uniform float uTimeNow;
  uniform vec2 uFutureFade;
  uniform vec3 uPastFade;

  varying vec2 vUv;
  varying float vSample;
  varying float vTime;

  void main() {
    #include <logdepthbuf_fragment>

    // Stretches drawn by another ship's line (while docked to it).
    for (int i = 0; i < MAX_HIDDEN; i++) {
      if (vSample > uHidden[i].x && vSample < uHidden[i].y) discard;
    }

    // Round caps.
    if (abs(vUv.y) > 1.0) {
      float a = vUv.x;
      float b = vUv.y > 0.0 ? vUv.y - 1.0 : vUv.y + 1.0;
      if (a * a + b * b > 1.0) discard;
    }

    float alpha = vSample <= uNow ? 1.0 : uFutureOpacity;
    // Optionally, the far future fades out and older stretches dim (see PathFade).
    float ahead = vTime - uTimeNow;
    if (uFutureFade.y > 0.0 && ahead > 0.0) alpha *= 1.0 - smoothstep(uFutureFade.x, uFutureFade.y, ahead);
    if (uPastFade.y > 0.0 && ahead < 0.0) alpha *= mix(1.0, uPastFade.z, smoothstep(uPastFade.x, uPastFade.y, -ahead));
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(diffuse, alpha);
    #include <colorspace_fragment>
  }
`;

/** Most stretches one line can leave out. */
const MAX_HIDDEN = 4;

/** Corner layout of one segment: a quad with a cap at each end (as in three's LineSegmentsGeometry). */
const QUAD_POSITIONS = [-1, 2, 0, 1, 2, 0, -1, 1, 0, 1, 1, 0, -1, 0, 0, 1, 0, 0, -1, -1, 0, 1, -1, 0];
const QUAD_UVS = [-1, 2, 1, 2, -1, 1, 1, 1, -1, -1, 1, -1, -1, -2, 1, -2];
const QUAD_INDEX = [0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 5, 3, 4, 6, 5, 6, 7, 5];

/**
 * How a long path is kept readable when it goes around and around (an
 * Earth orbit): the part still to come fades out between `future[0]` and
 * `future[1]` seconds ahead of now, and the flown part dims from full
 * brightness to `past[2]` between `past[0]` and `past[1]` seconds ago.
 */
export interface PathFade {
  future: readonly [number, number];
  past: readonly [number, number, number];
}

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
 * Build the line for one ship. `hidden` lists stretches of mission time
 * [start, end] the line leaves out, because the ship rides with another one
 * then and that ship's line shows the way (a stretch running to the end of
 * the path just stops the line early). `stencilRef` must differ between
 * lines.
 */
export function createPathLine(
  polyline: Polyline,
  color: number,
  stencilRef: number,
  hidden: readonly (readonly [number, number])[] = [],
  fade: PathFade | null = null,
): PathLine {
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
  // Each sample's time, from the first sample (single precision keeps hundredths of a second over a day).
  const t0 = polyline.times[0] ?? 0;
  const relative = Float32Array.from(polyline.times, (time) => time - t0);
  const clock = new InstancedInterleavedBuffer(relative, 1, 1);
  geometry.setAttribute('timeStart', new InterleavedBufferAttribute(clock, 1, 0));
  geometry.setAttribute('timeEnd', new InterleavedBufferAttribute(clock, 1, 1));

  const times = polyline.times;
  let samples = times.length;
  const lastTime = times[times.length - 1] ?? 0;
  const gaps: Vector2[] = [];
  for (const [from, to] of hidden) {
    if (to >= lastTime) {
      const last = Math.floor(sampleIndexAt(times, from));
      if (last >= 1) samples = Math.min(samples, last + 1);
    } else if (gaps.length < MAX_HIDDEN) {
      gaps.push(new Vector2(sampleIndexAt(times, from), sampleIndexAt(times, to)));
    }
  }
  while (gaps.length < MAX_HIDDEN) gaps.push(new Vector2(-2, -2));
  geometry.instanceCount = Math.max(0, samples - 1);

  const material = new ShaderMaterial({
    uniforms: {
      diffuse: { value: new Color(color) },
      linewidth: { value: PATH_WIDTH_PX },
      resolution: { value: new Vector2(1, 1) },
      uMix: { value: 0 },
      uNow: { value: -1 },
      uFutureOpacity: { value: PATH_FUTURE_OPACITY },
      uHidden: { value: gaps },
      uTimeNow: { value: 0 },
      uFutureFade: { value: new Vector2(fade?.future[0] ?? 0, fade?.future[1] ?? 0) },
      uPastFade: { value: new Vector3(fade?.past[0] ?? 0, fade?.past[1] ?? 0, fade?.past[2] ?? 1) },
    },
    defines: { MAX_HIDDEN },
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
    uTimeNow: { value: number };
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
      uniforms.uTimeNow.value = t - t0;
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
