import {
  Color,
  DynamicDrawUsage,
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
  attribute float revStart;
  attribute float revEnd;
  attribute float runStart;

  varying vec2 vUv;
  varying float vSample;
  varying float vRev;
  varying float vRun;

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
    vRev = position.y < 0.5 ? revStart : revEnd;
    // The whole segment fades with the stretch its first sample is in.
    vRun = runStart;
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
  uniform float uRevNow;
  uniform vec2 uRunBounds[MAX_RUNS];
  uniform vec2 uFutureFade;
  uniform vec3 uPastFade;
  uniform vec2 uGoneFade;

  varying vec2 vUv;
  varying float vSample;
  varying float vRev;
  varying float vRun;

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
    // In a stretch that goes around and around, loops still to come fade
    // out, and older ones dim and then go (see PathFade). Counted in
    // revolutions from now, held to the stretch's ends.
    if (vRun > -0.5) {
      vec2 bounds = uRunBounds[int(vRun + 0.5)];
      float ahead = vRev - clamp(uRevNow, bounds.x, bounds.y);
      if (ahead > 0.0) {
        alpha *= 1.0 - smoothstep(uFutureFade.x, uFutureFade.y, ahead);
      } else {
        alpha *= mix(1.0, uPastFade.z, smoothstep(uPastFade.x, uPastFade.y, -ahead));
        alpha *= 1.0 - smoothstep(uGoneFade.x, uGoneFade.y, -ahead);
      }
    }
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(diffuse, alpha);
    #include <colorspace_fragment>
  }
`;


/** The bright ring drawn for an orbit while many revolutions pass in a moment: even, with soft edges. */
const ringFragmentShader = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>

  uniform vec3 diffuse;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    #include <logdepthbuf_fragment>
    if (abs(vUv.y) > 1.0) {
      float a = vUv.x;
      float b = vUv.y > 0.0 ? vUv.y - 1.0 : vUv.y + 1.0;
      if (a * a + b * b > 1.0) discard;
    }
    float alpha = uOpacity * (1.0 - smoothstep(0.35, 1.0, abs(vUv.x)));
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(diffuse, alpha);
    #include <colorspace_fragment>
  }
`;

/** Most stretches one line can leave out, and most stretches that fade loop by loop. */
const MAX_HIDDEN = 4;
const MAX_RUNS = 4;

/** Corner layout of one segment: a quad with a cap at each end (as in three's LineSegmentsGeometry). */
const QUAD_POSITIONS = [-1, 2, 0, 1, 2, 0, -1, 1, 0, 1, 1, 0, -1, 0, 0, 1, 0, 0, -1, -1, 0, 1, -1, 0];
const QUAD_UVS = [-1, 2, 1, 2, -1, 1, 1, 1, -1, -1, 1, -1, -1, -2, 1, -2];
const QUAD_INDEX = [0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 5, 3, 4, 6, 5, 6, 7, 5];

/**
 * How a long path is kept readable where it goes around and around (an
 * Earth orbit, or days in lunar orbit). Distances are in revolutions of the
 * orbit being flown, counted from now: in each faded stretch the part still
 * to come fades out between `future[0]` and `future[1]` revolutions ahead,
 * the flown part dims from full brightness to `past[2]` between `past[0]`
 * and `past[1]` revolutions ago, and is gone between `gone[0]` and
 * `gone[1]` revolutions ago, so old loops never pile up. Outside the
 * stretches, nothing fades. When now is outside a stretch, it counts from
 * the stretch's nearer end.
 */
export interface PathFade {
  future: readonly [number, number];
  past: readonly [number, number, number];
  gone: readonly [number, number];
  /** Revolutions flown at each sample, from the path's start (never decreasing). */
  revolutions: Float64Array;
  /** The faded stretches, as sample index ranges [first, last] (at most four). */
  runs: readonly (readonly [number, number])[];
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

/** The value of a per-sample array at a fractional sample index (clamped to the ends). */
export function valueAtIndex(values: ArrayLike<number>, index: number): number {
  const n = values.length;
  if (n === 0) return 0;
  if (index <= 0) return values[0] as number;
  if (index >= n - 1) return values[n - 1] as number;
  const i = Math.floor(index);
  const a = values[i] as number;
  const b = values[i + 1] as number;
  return a + (b - a) * (index - i);
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

  const times = polyline.times;
  const n = times.length;
  // Revolutions flown at each sample, and the faded stretch each sample is in (-1 for none).
  const revolutions = fade?.revolutions ?? new Float64Array(n);
  const runOf = new Float32Array(n).fill(-1);
  const bounds: Vector2[] = [];
  for (const [first, last] of (fade?.runs ?? []).slice(0, MAX_RUNS)) {
    for (let i = Math.max(0, first); i <= Math.min(n - 1, last); i += 1) runOf[i] = bounds.length;
    bounds.push(new Vector2(valueAtIndex(revolutions, first), valueAtIndex(revolutions, last)));
  }
  while (bounds.length < MAX_RUNS) bounds.push(new Vector2(0, 0));
  const revs = new InstancedInterleavedBuffer(Float32Array.from(revolutions), 1, 1);
  geometry.setAttribute('revStart', new InterleavedBufferAttribute(revs, 1, 0));
  geometry.setAttribute('revEnd', new InterleavedBufferAttribute(revs, 1, 1));
  geometry.setAttribute('runStart', new InterleavedBufferAttribute(new InstancedInterleavedBuffer(runOf, 1, 1), 1, 0));

  let samples = n;
  const lastTime = times[n - 1] ?? 0;
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
      uRevNow: { value: 0 },
      uRunBounds: { value: bounds },
      uFutureFade: { value: new Vector2(fade?.future[0] ?? 0, fade?.future[1] ?? 1) },
      uPastFade: { value: new Vector3(fade?.past[0] ?? 0, fade?.past[1] ?? 1, fade?.past[2] ?? 1) },
      uGoneFade: { value: new Vector2(fade?.gone[0] ?? 1e6, fade?.gone[1] ?? 2e6) },
    },
    defines: { MAX_HIDDEN, MAX_RUNS },
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
    uRevNow: { value: number };
    resolution: { value: Vector2 };
  };

  return {
    mesh,
    times,
    setMix(mix) {
      uniforms.uMix.value = mix;
    },
    setTime(t) {
      const index = sampleIndexAt(times, t);
      uniforms.uNow.value = index;
      uniforms.uRevNow.value = valueAtIndex(revolutions, index);
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

/** The bright ring that stands for an orbit while many revolutions pass in a moment (see stage.ts). */
export interface OrbitRing {
  readonly mesh: Mesh;
  /** Draw it through these points (scene units, x, y, z each; at most `capacity` points) as a closed loop. */
  setPoints(points: Float32Array, count: number): void;
  setOpacity(opacity: number): void;
  setColor(color: Color): void;
  setResolution(width: number, height: number): void;
  readonly capacity: number;
  dispose(): void;
}

/** A closed line of steady on-screen width with soft edges, its points set each frame. */
export function createOrbitRing(color: number, widthPx: number, capacity = 256): OrbitRing {
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(QUAD_INDEX);
  geometry.setAttribute('position', new Float32BufferAttribute(QUAD_POSITIONS, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(QUAD_UVS, 2));
  const positions = new Float32Array((capacity + 1) * 3);
  const buffer = new InstancedInterleavedBuffer(positions, 3, 1);
  buffer.setUsage(DynamicDrawUsage); // rewritten every frame it shows
  geometry.setAttribute('instanceStart', new InterleavedBufferAttribute(buffer, 3, 0));
  geometry.setAttribute('instanceEnd', new InterleavedBufferAttribute(buffer, 3, 3));
  geometry.setAttribute('trueStart', new InterleavedBufferAttribute(buffer, 3, 0));
  geometry.setAttribute('trueEnd', new InterleavedBufferAttribute(buffer, 3, 3));
  const zeros = new InstancedInterleavedBuffer(new Float32Array(capacity + 1), 1, 1);
  geometry.setAttribute('revStart', new InterleavedBufferAttribute(zeros, 1, 0));
  geometry.setAttribute('revEnd', new InterleavedBufferAttribute(zeros, 1, 0));
  geometry.setAttribute('runStart', new InterleavedBufferAttribute(zeros, 1, 0));
  geometry.instanceCount = 0;

  const material = new ShaderMaterial({
    uniforms: {
      diffuse: { value: new Color(color) },
      linewidth: { value: widthPx },
      resolution: { value: new Vector2(1, 1) },
      uMix: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader,
    fragmentShader: ringFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.name = 'Orbit ring';
  mesh.visible = false;
  const uniforms = material.uniforms as { uOpacity: { value: number }; resolution: { value: Vector2 }; diffuse: { value: Color } };

  return {
    mesh,
    capacity,
    setPoints(points, count) {
      const used = Math.min(count, capacity);
      positions.set(points.subarray(0, used * 3));
      // Close the loop.
      positions[used * 3] = points[0] ?? 0;
      positions[used * 3 + 1] = points[1] ?? 0;
      positions[used * 3 + 2] = points[2] ?? 0;
      buffer.needsUpdate = true;
      geometry.instanceCount = used;
    },
    setOpacity(opacity) {
      uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.01;
    },
    setColor(value) {
      uniforms.diffuse.value.copy(value);
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
