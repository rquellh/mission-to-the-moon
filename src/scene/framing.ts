import { MathUtils, Quaternion, Vector3, type PerspectiveCamera } from 'three';

export interface SphereLike {
  readonly center: Vector3;
  readonly radius: number;
}

export interface CameraPose {
  readonly position: Vector3;
  readonly target: Vector3;
}

/**
 * The share of the view left clear of interface, as fractions (0 to 1] of
 * the canvas width and height. The camera's view axis passes through the
 * middle of the clear area (see Stage.applyViewOffset).
 */
export interface ClearArea {
  width: number;
  height: number;
}

const _forward = new Vector3();
const _right = new Vector3();
const _up = new Vector3();
const _rel = new Vector3();

/**
 * Distance from `target` along `direction` (a unit vector pointing from the
 * target toward the camera) at which every sphere fits inside the clear
 * part of the camera's view. `margin` (> 1) scales each sphere's size and
 * offset to leave room. `up` is the camera's up once it gets there.
 */
export function fitDistance(
  camera: PerspectiveCamera,
  target: Vector3,
  direction: Vector3,
  spheres: readonly SphereLike[],
  margin: number,
  clear: ClearArea,
  up: Vector3 = camera.up,
): number {
  const tanV = Math.tan(MathUtils.degToRad(camera.fov) / 2);
  const halfV = Math.atan(tanV * clear.height);
  const halfH = Math.atan(tanV * camera.aspect * clear.width);

  // Camera basis for a camera at target + direction * d, looking at target.
  _forward.copy(direction).negate();
  _right.crossVectors(_forward, up);
  if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
  _right.normalize();
  _up.crossVectors(_right, _forward).normalize();

  let distance = 0;
  for (const sphere of spheres) {
    _rel.subVectors(sphere.center, target);
    const x = Math.abs(_rel.dot(_right)) * margin;
    const y = Math.abs(_rel.dot(_up)) * margin;
    const r = sphere.radius * margin;
    // The sphere stays inside a frustum side plane when its depth z satisfies
    // z >= offset / tan(half angle) + r / sin(half angle).
    const needH = x / Math.tan(halfH) + r / Math.sin(halfH);
    const needV = y / Math.tan(halfV) + r / Math.sin(halfV);
    // Depth of the sphere center = distance + (center - target) . forward.
    distance = Math.max(distance, Math.max(needH, needV) - _rel.dot(_forward));
  }
  return distance;
}

const _dirA = new Vector3();
const _dirB = new Vector3();
const _q = new Quaternion();
const _qFull = new Quaternion();

/**
 * Interpolate between two camera poses. The target moves in a straight line;
 * the camera's offset from the target turns along an arc and its length
 * changes geometrically, so large zoom changes feel even.
 */
export function interpolatePose(
  from: CameraPose,
  to: CameraPose,
  t: number,
  out: CameraPose,
): void {
  out.target.lerpVectors(from.target, to.target, t);

  _dirA.subVectors(from.position, from.target);
  _dirB.subVectors(to.position, to.target);
  const lenA = Math.max(_dirA.length(), 1e-6);
  const lenB = Math.max(_dirB.length(), 1e-6);
  _dirA.divideScalar(lenA);
  _dirB.divideScalar(lenB);

  if (_dirA.dot(_dirB) < -0.9999) {
    // Opposite directions: turn about any axis across them.
    _up.set(0, 1, 0);
    if (Math.abs(_dirA.y) > 0.9) _up.set(1, 0, 0);
    _qFull.setFromAxisAngle(_up.cross(_dirA).normalize(), Math.PI);
  } else {
    _qFull.setFromUnitVectors(_dirA, _dirB);
  }
  _q.identity().slerp(_qFull, t);
  const length = lenA * Math.pow(lenB / lenA, t);

  out.position.copy(_dirA).applyQuaternion(_q).multiplyScalar(length).add(out.target);
}
