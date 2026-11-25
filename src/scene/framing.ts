import { MathUtils, Matrix4, Quaternion, Vector3, type PerspectiveCamera } from 'three';

export interface SphereLike {
  readonly center: Vector3;
  readonly radius: number;
}

export interface CameraPose {
  readonly position: Vector3;
  readonly target: Vector3;
}

/** A camera pose with the camera's up, which sets how the picture is turned about the line of sight. */
export interface OrientedPose extends CameraPose {
  readonly up: Vector3;
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

/**
 * Distance from a sphere's center, looking straight at it, at which the
 * sphere (its radius scaled by `margin`) just fits across the clear part of
 * the camera's view. Only the width counts: the Earth and Moon views use it
 * so the low orbits around the body fit across a tall, narrow picture,
 * whose height has room to spare.
 */
export function fitAcross(
  camera: PerspectiveCamera,
  radius: number,
  margin: number,
  clear: ClearArea,
): number {
  const tanV = Math.tan(MathUtils.degToRad(camera.fov) / 2);
  const halfH = Math.atan(tanV * camera.aspect * clear.width);
  return (radius * margin) / Math.sin(halfH);
}

/** The mission clock as the camera sees it (see clockJumped). */
export interface ClockReading {
  /** Story seconds. */
  readonly story: number;
  readonly playing: boolean;
  /** Story seconds per real second it moves at now (Player.speed). */
  readonly speed: number;
}

/**
 * The most real time the clock covers in one step by itself, in seconds: the
 * player's own limit, which lets a playTo trip keep time on a device drawing
 * one frame a second (TRIP_MAX_FRAME_SECONDS in src/app/player.ts). Its pace
 * can change within a step, so a step may go a little farther than the pace
 * at either end of it says: CLOCK_STEP_ALLOWANCE times.
 */
const CLOCK_STEP_SECONDS = 1;
const CLOCK_STEP_ALLOWANCE = 1.5;
/** A change of story time smaller than this, in story seconds, is a rounding error, not a move. */
const CLOCK_ROUNDING = 1e-6;

/**
 * True when the mission clock went from `before` to `after` by a jump (a
 * seek: the visitor scrubbing or stepping to an event, the tour setting off,
 * skipping, or going back) rather than by running. The player tells its
 * subscribers of both alike; what tells them apart is that a running clock
 * moves at most its own pace for one step, however long the frame took. So
 * any move of a stopped clock is a jump, and so is a move of a running one
 * farther than its pace could carry it in a step. A slow frame is not.
 */
export function clockJumped(before: ClockReading, after: ClockReading): boolean {
  const step = Math.abs(after.story - before.story);
  if (step <= CLOCK_ROUNDING) return false;
  if (!before.playing) return true;
  const pace = Math.max(before.speed, after.speed);
  return step > pace * CLOCK_STEP_SECONDS * CLOCK_STEP_ALLOWANCE;
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

/**
 * How far a swing's change of distance runs ahead of its turn when the
 * camera moves away from the body, or behind it when the camera moves in, at
 * most, as a share of the move (0 to 1; the full lead applies from a
 * threefold change of distance). Moving out, the camera backs away a little
 * ahead of turning; moving in, it turns a little ahead of closing in. So the
 * body is not brought into the middle of the picture while it is close
 * (where it would fill the screen), and most of a long swing happens farther
 * out, where the surface slides by more slowly.
 */
const SWING_DISTANCE_LEAD = 0.25;

const _fromDir = new Vector3();
const _toDir = new Vector3();
const _axis = new Vector3();
const _arc = new Quaternion();
const _arcStep = new Quaternion();
const _arcBack = new Quaternion();
const _start = new Quaternion();
const _end = new Quaternion();
const _change = new Quaternion();
const _twist = new Quaternion();
const _across = new Quaternion();
const _share = new Quaternion();
const _toBody = new Vector3();
const _look = new Matrix4();

/** The camera's orientation at a pose (as Object3D.lookAt turns a camera), written to `out`. */
function orientationOf(pose: OrientedPose, out: Quaternion): Quaternion {
  return out.setFromRotationMatrix(_look.lookAt(pose.position, pose.target, pose.up));
}

/**
 * The turn that carries unit vector `a` to unit vector `b` along a great
 * circle. Opposite vectors have no one great circle between them: then the
 * turn starts toward `toward`, so the choice does not jump about.
 */
function arcTurn(a: Vector3, b: Vector3, toward: Vector3, out: Quaternion): Quaternion {
  if (a.dot(b) > -0.9999) return out.setFromUnitVectors(a, b);
  _axis.crossVectors(a, toward);
  if (_axis.lengthSq() < 1e-8) _axis.set(1, 0, 0).cross(a);
  if (_axis.lengthSq() < 1e-8) _axis.set(0, 1, 0).cross(a);
  return out.setFromAxisAngle(_axis.normalize(), Math.PI);
}

/** Points along a straight move that divesPast checks. */
const DIVE_SAMPLES = 32;
/**
 * A straight move dives past a body when it passes nearer the body's center
 * than this share of the nearer end's distance, and within DIVE_NEAR_RADII
 * body radii of the center, where the body looms large (at that distance it
 * spans about half the picture's height). Farther off, the body stays small
 * however the camera passes it.
 */
const DIVE_SHARE = 0.95;
const DIVE_NEAR_RADII = 5;
const _divePose: CameraPose = { position: new Vector3(), target: new Vector3() };

/**
 * True when the straight move between two poses (interpolatePose) would
 * pass close by `body`, closer than both ends are: it would dive past the
 * body, which then swells in the picture and whips by.
 */
export function divesPast(from: CameraPose, to: CameraPose, body: SphereLike): boolean {
  const nearer = Math.min(
    from.position.distanceTo(body.center),
    to.position.distanceTo(body.center),
  );
  const limit = Math.min(nearer * DIVE_SHARE, body.radius * DIVE_NEAR_RADII);
  for (let i = 1; i < DIVE_SAMPLES; i += 1) {
    interpolatePose(from, to, i / DIVE_SAMPLES, _divePose);
    if (_divePose.position.distanceTo(body.center) < limit) return true;
  }
  return false;
}

/** The angle, in radians, through which a move between two poses swings the camera around `center`. */
export function swingAngle(from: CameraPose, to: CameraPose, center: Vector3): number {
  _fromDir.subVectors(from.position, center);
  _toDir.subVectors(to.position, center);
  return _fromDir.angleTo(_toDir);
}

const _sight = new Vector3();
const _toSubject = new Vector3();
const _offSight = new Quaternion();
const _offSightPart = new Quaternion();
const _upTurn = new Quaternion();
const _upPart = new Quaternion();

/**
 * A move between a wide view and a close view of a subject near a body (a
 * craft: `subject` names the end that looks at it), swinging around the
 * body as swingAround does, but keeping the subject in the picture all the
 * way. The camera goes where swingAround takes it; the line of sight turns
 * with it so the subject's angle off it shrinks evenly to nothing on the way
 * in (or grows evenly from nothing on the way out), never more than at the
 * wide end, where the subject is in the picture. A plain swing slides the
 * body's center across the picture instead, and can leave the craft outside
 * until the end. The picture rolls evenly from one end's up to the other's.
 */
export function swingKeeping(
  from: OrientedPose,
  to: OrientedPose,
  center: Vector3,
  subject: 'from' | 'to',
  t: number,
  out: OrientedPose,
): void {
  swingAround(from, to, center, t, out);
  if (t <= 0 || t >= 1) return;
  const inward = subject === 'to';
  const target = inward ? to.target : from.target;
  const wide = inward ? from : to;
  // The turn from the subject to the line of sight, seen from the wide end, taken a share at a
  // time, and carried around the body with the camera (swingAround leaves its turn so far,
  // from the start, in _arcStep), so it stays the same turn as seen from the camera.
  _toSubject.subVectors(target, wide.position).normalize();
  _sight.subVectors(wide.target, wide.position).normalize();
  arcTurn(_toSubject, _sight, wide.up, _offSight);
  // Seen from the far end, it is taken back around the body to the start first.
  if (!inward) _offSight.premultiply(_twist.copy(_arc).invert()).multiply(_arc);
  _offSightPart.identity().slerp(_offSight, inward ? 1 - t : t);
  _offSightPart.premultiply(_arcStep).multiply(_arcBack.copy(_arcStep).invert());
  _sight.subVectors(target, out.position).normalize().applyQuaternion(_offSightPart);
  const fromLook = Math.max(from.position.distanceTo(from.target), 1e-9);
  const toLook = Math.max(to.position.distanceTo(to.target), 1e-9);
  out.target.copy(out.position).addScaledVector(_sight, fromLook * (toLook / fromLook) ** t);
  _upTurn.setFromUnitVectors(from.up, to.up);
  _upPart.identity().slerp(_upTurn, t);
  out.up.copy(from.up).applyQuaternion(_upPart);
}

/** How far off a body a wide view may look and still have it in sight (see swingBodyOf), in degrees. */
const WIDE_VIEW_SIGHT_DEG = 45;
const _lookAlong = new Vector3();
const _toCenter = new Vector3();

/**
 * The body a camera move between two poses swings around (see swingAround),
 * or null when there is none and the camera flies straight across
 * (interpolatePose). In order: a body that both ends look at or near (their
 * targets within `reach` of its radii of its center); one that flying
 * straight would dive past (see divesPast); or one that only one end looks
 * at or near, when the other end is a wider view from farther off with the
 * body in sight (the journey view, say). Flown straight, that last move into
 * or out of a close view of the body sends the body swelling into a corner
 * and the craft out of the picture until the end; around the body, the body
 * slides across the picture instead.
 */
export function swingBodyOf<T extends SphereLike>(
  from: CameraPose,
  to: CameraPose,
  bodies: readonly T[],
  reach: number,
): T | null {
  const near = (pose: CameraPose, body: SphereLike): boolean =>
    pose.target.distanceTo(body.center) < body.radius * reach;
  const shared = bodies.find((body) => near(from, body) && near(to, body));
  if (shared) return shared;
  const passed = bodies.find((body) => divesPast(from, to, body));
  if (passed) return passed;
  for (const [close, wide] of [
    [from, to],
    [to, from],
  ] as const) {
    const body = bodies.find((one) => near(close, one));
    if (!body || bodies.some((one) => near(wide, one))) continue;
    const fartherOff =
      wide.position.distanceTo(body.center) > close.position.distanceTo(body.center);
    _lookAlong.subVectors(wide.target, wide.position);
    _toCenter.subVectors(body.center, wide.position);
    const inSight = _lookAlong.angleTo(_toCenter) < MathUtils.degToRad(WIDE_VIEW_SIGHT_DEG);
    if (fartherOff && inSight) return body;
  }
  return null;
}

/**
 * Interpolate between two camera poses by swinging the camera around a body
 * at `center`, so a move between views goes around the body, never through
 * it or close past it. The camera's direction from the center turns along a
 * great circle, and its distance changes geometrically from one end's to
 * the other's, so the body never looks bigger on the way than at the nearer
 * end. The camera turns with the swing, and through the rest of its turn a
 * share at a time, so the body's center slides along a straight line from
 * where it is on the screen to where it ends up, and the picture rolls
 * evenly about it, without a flip. The target stays on the line of sight,
 * its distance changing geometrically, so it reaches each end's own target.
 * `t` runs from 0 (`from`) to 1 (`to`).
 */
export function swingAround(
  from: OrientedPose,
  to: OrientedPose,
  center: Vector3,
  t: number,
  out: OrientedPose,
): void {
  if (t <= 0 || t >= 1) {
    const end = t <= 0 ? from : to;
    out.position.copy(end.position);
    out.target.copy(end.target);
    out.up.copy(end.up);
    return;
  }
  const fromDistance = Math.max(_fromDir.subVectors(from.position, center).length(), 1e-9);
  const toDistance = Math.max(_toDir.subVectors(to.position, center).length(), 1e-9);
  _fromDir.divideScalar(fromDistance);
  _toDir.divideScalar(toDistance);
  arcTurn(_fromDir, _toDir, from.up, _arc);

  // Moving out, the distance changes ahead of the turn; moving in, behind it
  // (see SWING_DISTANCE_LEAD). Both still only ever move toward the end.
  const zoom = Math.log(toDistance / fromDistance);
  const lead = SWING_DISTANCE_LEAD * Math.sign(zoom) * Math.min(1, Math.abs(zoom) / Math.log(3));
  const bend = lead * t * (1 - t);
  const distance = fromDistance * Math.exp(zoom * (t + bend));
  const turn = t - bend;
  _arcStep.identity().slerp(_arc, turn);

  // The camera's turn from the start's orientation to the end's, as seen from
  // the swing, which carries the line to the body's center along with it. It
  // is split into a turn about that line (a roll about the body) and a turn
  // across it (which slides the body over the screen in a straight line), and
  // each is taken a share at a time.
  orientationOf(from, _start);
  orientationOf(to, _end).premultiply(_arcBack.copy(_arc).invert());
  _change.copy(_start).invert().premultiply(_end);
  _toBody.copy(_fromDir).negate();
  const along = _change.x * _toBody.x + _change.y * _toBody.y + _change.z * _toBody.z;
  _twist.set(_toBody.x * along, _toBody.y * along, _toBody.z * along, _change.w);
  if (_twist.lengthSq() < 1e-12) _twist.identity();
  else _twist.normalize();
  _across.copy(_twist).invert().multiply(_change);
  _change.identity().slerp(_twist, turn).multiply(_share.identity().slerp(_across, turn));
  _start.premultiply(_change).premultiply(_arcStep);

  const fromLook = Math.max(from.position.distanceTo(from.target), 1e-9);
  const toLook = Math.max(to.position.distanceTo(to.target), 1e-9);
  const look = fromLook * (toLook / fromLook) ** t;

  out.position.copy(_fromDir).applyQuaternion(_arcStep).multiplyScalar(distance).add(center);
  out.up.set(0, 1, 0).applyQuaternion(_start);
  out.target.set(0, 0, -1).applyQuaternion(_start).multiplyScalar(look).add(out.position);
}
