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

/**
 * Where a point is seen from a camera pose: across (x, to the right) and up
 * (y), each as a share of the point's distance in front of the camera. The
 * picture is a flat projection of these, so a straight line between two
 * spots is a straight line on the screen, and a spot inside the clear area
 * at both ends of that line stays inside it all the way (see aimAt).
 */
export interface Spot {
  x: number;
  y: number;
}

/** Farther off the line of sight than this (as a Spot's share, about 76 degrees), a point is taken as out of sight. */
const SPOT_LIMIT = 4;
const _seen = new Vector3();
const _seenTurn = new Quaternion();

/**
 * Where `point` is seen from `pose` (see Spot), written to `out`. False when
 * it is behind the camera or nearly beside it, where there is no such spot.
 */
export function seenAt(pose: OrientedPose, point: Vector3, out: Spot): boolean {
  orientationOf(pose, _seenTurn).invert();
  _seen.subVectors(point, pose.position).applyQuaternion(_seenTurn);
  if (_seen.z > -1e-12) return false;
  out.x = _seen.x / -_seen.z;
  out.y = _seen.y / -_seen.z;
  return Math.abs(out.x) < SPOT_LIMIT && Math.abs(out.y) < SPOT_LIMIT;
}

const _aim = new Quaternion();
const _aimBack = new Quaternion();
const _aimTurn = new Quaternion();
const _have = new Vector3();
const _want = new Vector3();

/**
 * Turn a pose's line of sight as little as possible so that `point` is seen
 * at `spot` (see seenAt). The camera stays where it is, and so does the
 * distance it looks to its target; its up turns with it. A camera move that
 * does this at each step, with the spot taken a share of the way from where
 * the point is seen at the start to where it is seen at the end, keeps the
 * point on a straight line across the picture between the two.
 */
export function aimAt(pose: OrientedPose, point: Vector3, spot: Spot): void {
  orientationOf(pose, _aim);
  _have.subVectors(point, pose.position).applyQuaternion(_aimBack.copy(_aim).invert());
  if (_have.lengthSq() < 1e-24) return;
  _have.normalize();
  _want.set(spot.x, spot.y, -1).normalize();
  _aim.multiply(_aimTurn.setFromUnitVectors(_want, _have));
  const look = pose.position.distanceTo(pose.target);
  pose.target.set(0, 0, -1).applyQuaternion(_aim).multiplyScalar(look).add(pose.position);
  pose.up.set(0, 1, 0).applyQuaternion(_aim);
}

const _toCenterSeen = new Vector3();
const _limbTurn = new Quaternion();
const _limbBack = new Quaternion();
const _pitch = new Quaternion();
const _pitchAxis = new Vector3(1, 0, 0);

/**
 * How high a body's outline reaches in a pose's picture, as an angle above
 * the line of sight, measured about the picture's horizontal (so tipping the
 * camera down raises it by just as much): NaN from inside the body, and
 * Infinity when the body reaches round to the picture's horizontal, where
 * it has no top edge. Leaves the camera's orientation in _limbTurn.
 */
function topAngle(pose: OrientedPose, center: Vector3, radius: number): number {
  orientationOf(pose, _limbTurn);
  _toCenterSeen
    .subVectors(center, pose.position)
    .applyQuaternion(_limbBack.copy(_limbTurn).invert());
  const distance = _toCenterSeen.length();
  if (distance <= radius) return Number.NaN;
  _toCenterSeen.divideScalar(distance);
  // The center's height, and the outline's reach above it, in the plane the camera tips in.
  const across = Math.hypot(_toCenterSeen.y, _toCenterSeen.z);
  const reach = radius / distance / Math.max(across, 1e-12);
  if (reach >= 1) return Number.POSITIVE_INFINITY;
  return Math.atan2(_toCenterSeen.y, -_toCenterSeen.z) + Math.asin(reach);
}

/**
 * How high a body's top edge is in a pose's picture, as a Spot's height (see
 * Spot): Infinity when it reaches above the picture altogether, and NaN from
 * inside the body.
 */
export function bodyTop(pose: OrientedPose, center: Vector3, radius: number): number {
  const angle = topAngle(pose, center, radius);
  if (Number.isNaN(angle)) return angle;
  return angle < Math.PI / 2 ? Math.tan(angle) : Number.POSITIVE_INFINITY;
}

/**
 * Tip a pose's line of sight down, about the picture's horizontal and as
 * little as it must, so the body's top edge is no lower in the picture than
 * `floor` (see bodyTop). A camera that backs away from a body below it
 * while turning to look at it would otherwise let the body sink out of the
 * bottom of the picture (behind the card) on the way.
 */
export function keepBodyUp(
  pose: OrientedPose,
  center: Vector3,
  radius: number,
  floor: number,
): void {
  if (!Number.isFinite(floor)) return;
  const height = topAngle(pose, center, radius);
  const wanted = Math.atan(floor);
  // Not for a body whose top edge is behind the camera altogether.
  if (!(height < wanted) || height <= -Math.PI / 2) return;
  _limbTurn.multiply(_pitch.setFromAxisAngle(_pitchAxis, height - wanted));
  const look = pose.position.distanceTo(pose.target);
  pose.target.set(0, 0, -1).applyQuaternion(_limbTurn).multiplyScalar(look).add(pose.position);
  pose.up.set(0, 1, 0).applyQuaternion(_limbTurn);
}

/**
 * The easing of a camera move between views: it sets off and comes to rest
 * gently, and its pace in the middle, its fastest, is π/2 times its average
 * (a cubic ease's is three times).
 */
export function easeMove(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return (1 - Math.cos(Math.PI * t)) / 2;
}

/** How far through its time a move eased by easeMove is when it is `eased` of the way there: easeMove undone. */
export function moveShare(eased: number): number {
  return Math.acos(MathUtils.clamp(1 - 2 * eased, -1, 1)) / Math.PI;
}

/** Steps over which moveDuration measures a move. */
const MOVE_SAMPLES = 48;
const _sample: OrientedPose = { position: new Vector3(), target: new Vector3(), up: new Vector3() };
const _turnA = new Quaternion();
const _turnB = new Quaternion();

/**
 * A camera move's pose at `t` (0, its start, to 1, its end, as easeMove
 * eases it), written to `out`. `share` is how far through the move's time
 * that is (0 to 1, not eased), for a move whose end moves on the way.
 */
export type MovePose = (t: number, out: OrientedPose, share: number) => void;

/**
 * How long a camera move takes, in milliseconds: the least time in which,
 * eased by easeMove, the picture never turns faster than
 * `degreesPerSecond` (its turn and its roll together, as the camera's
 * orientation turns), but no less than `shortestMs` and no more than
 * `longestMs`. A move that turns the picture far takes longer, and one that
 * hardly turns it the shortest time. A move whose end moves on the way is
 * measured as it will go only if `poseAt` moves the end over the time asked
 * about (see MovePose).
 */
export function moveDuration(
  poseAt: MovePose,
  degreesPerSecond: number,
  shortestMs: number,
  longestMs: number,
): number {
  const seconds = MathUtils.radToDeg(measureMove(poseAt).peak) / Math.max(degreesPerSecond, 1e-9);
  return MathUtils.clamp(seconds * 1000, shortestMs, longestMs);
}

/**
 * How far a camera move turns the picture in all (its turn and its roll
 * together, as the camera's orientation turns), in radians. Of the ways a
 * move can go, the one that turns it least is the calmest.
 */
export function moveTurn(poseAt: MovePose): number {
  return measureMove(poseAt).total;
}

/**
 * Of the ways round a swing can go (see SwingWay), the one along which the
 * move (`poseAt`, given the way) turns the picture least in all, roll
 * included. Another way must be calmer than the first by `margin` radians to
 * be taken over it, so the short way round wins a near tie. Measured with the
 * move's end where `poseAt` puts it at each moment: for an end that moves on
 * the way (the ship view's chase, carried round the body with its craft),
 * where it will be, not where it is as the move sets off, so a roll that the
 * end's own turn would lengthen gives way to one it shortens. Each way's
 * `twist` is left unset, for the move to set as it goes.
 */
export function calmestWay(
  ways: readonly SwingWay[],
  poseAt: (way: SwingWay, t: number, out: OrientedPose, share: number) => void,
  margin: number,
): SwingWay {
  let calmest = ways[0] as SwingWay;
  let least = Number.POSITIVE_INFINITY;
  for (const way of ways) {
    way.twist = Number.NaN;
    const turn = moveTurn((t, out, share) => poseAt(way, t, out, share));
    way.twist = Number.NaN;
    if (turn < least - margin) {
      least = turn;
      calmest = way;
    }
  }
  return calmest;
}

/**
 * Where a chase camera (`pose`, looking at its craft at `subject`) will be
 * once the craft is at `subjectTo` and the chase has turned by `turn` with it
 * (carried round the body as the craft goes round), written to `out`: as far
 * from the craft, turned with it, still looking at it.
 */
export function carryPose(
  pose: OrientedPose,
  subject: Vector3,
  subjectTo: Vector3,
  turn: Quaternion,
  out: OrientedPose,
): OrientedPose {
  out.position.subVectors(pose.position, subject).applyQuaternion(turn).add(subjectTo);
  out.target.subVectors(pose.target, subject).applyQuaternion(turn).add(subjectTo);
  out.up.copy(pose.up).applyQuaternion(turn);
  return out;
}

/** A move's turn of the camera, eased by easeMove: in all, and at its fastest (radians per unit of the move's time). */
interface MoveTurn {
  total: number;
  peak: number;
}

const _measure: MoveTurn = { total: 0, peak: 0 };

/** Measures a move's turn of the camera (see MoveTurn) at MOVE_SAMPLES eased steps. */
function measureMove(poseAt: MovePose): MoveTurn {
  _measure.total = 0;
  _measure.peak = 0;
  poseAt(0, _sample, 0);
  orientationOf(_sample, _turnA);
  for (let i = 1; i <= MOVE_SAMPLES; i += 1) {
    poseAt(easeMove(i / MOVE_SAMPLES), _sample, i / MOVE_SAMPLES);
    orientationOf(_sample, _turnB);
    const step = _turnA.angleTo(_turnB);
    _measure.total += step;
    _measure.peak = Math.max(_measure.peak, step * MOVE_SAMPLES);
    _turnA.copy(_turnB);
  }
  return _measure;
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
 * Which way round a swing goes (see swingAround). Each turn of it can go the
 * short way round or the long way: its swing around the body, and its roll
 * about the line to the body. A move whose end moves on the way (the ship
 * view follows its craft) keeps rolling the way it set off: `twist` is the
 * roll it took last, in radians, which the next step stays nearest to, so
 * the picture never flips over to roll the other way. NaN before the first
 * step.
 */
export interface SwingWay {
  readonly longArc: boolean;
  readonly longTwist: boolean;
  twist: number;
}

const _partAxis = new Vector3();

/** A share of the turn `turn` (taken the short way round, or the long way when `long`), into `out`. */
function partTurn(turn: Quaternion, share: number, long: boolean, out: Quaternion): Quaternion {
  const sign = turn.w < 0 ? -1 : 1;
  const across = Math.hypot(turn.x, turn.y, turn.z);
  if (across < 1e-12) return out.identity();
  let angle = 2 * Math.atan2(across, sign * turn.w);
  if (long) angle -= 2 * Math.PI;
  _partAxis.set(turn.x, turn.y, turn.z).multiplyScalar(sign / across);
  return out.setFromAxisAngle(_partAxis, angle * share);
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
 * `t` runs from 0 (`from`) to 1 (`to`). Each turn goes the short way round,
 * or as `way` says (see SwingWay).
 */
export function swingAround(
  from: OrientedPose,
  to: OrientedPose,
  center: Vector3,
  t: number,
  out: OrientedPose,
  way?: SwingWay,
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
  partTurn(_arc, turn, way?.longArc ?? false, _arcStep);

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
  // The roll about the line to the body, as a signed angle: the short way round, or as `way` has it.
  let roll =
    2 * Math.atan2(_twist.x * _toBody.x + _twist.y * _toBody.y + _twist.z * _toBody.z, _twist.w);
  if (roll > Math.PI) roll -= 2 * Math.PI;
  else if (roll <= -Math.PI) roll += 2 * Math.PI;
  if (way) {
    const other = roll > 0 ? roll - 2 * Math.PI : roll + 2 * Math.PI;
    if (Number.isNaN(way.twist)) {
      if (way.longTwist) roll = other;
    } else if (Math.abs(other - way.twist) < Math.abs(roll - way.twist)) {
      roll = other;
    }
    way.twist = roll;
  }
  _change.setFromAxisAngle(_toBody, roll * turn).multiply(partTurn(_across, turn, false, _share));
  _start.premultiply(_change).premultiply(_arcStep);

  const fromLook = Math.max(from.position.distanceTo(from.target), 1e-9);
  const toLook = Math.max(to.position.distanceTo(to.target), 1e-9);
  const look = fromLook * (toLook / fromLook) ** t;

  out.position.copy(_fromDir).applyQuaternion(_arcStep).multiplyScalar(distance).add(center);
  out.up.set(0, 1, 0).applyQuaternion(_start);
  out.target.set(0, 0, -1).applyQuaternion(_start).multiplyScalar(look).add(out.position);
}
