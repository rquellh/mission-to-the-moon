/**
 * The camera's moves between views (swingAround, divesPast, swingAngle). A
 * move between two views of a body must go around it, never coming closer
 * to it than the nearer end, so the body never looks bigger on the way; it
 * must slide the body across the picture in a straight line; and it must
 * turn the picture a little at a time, with no sudden turn and no flip.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { divesPast, swingAngle, swingAround, type OrientedPose } from './framing.ts';

/** A body of radius 1 at (10, 0, 0), where the Moon sits in the scene. */
const CENTER = new Vector3(10, 0, 0);
const BODY = { center: CENTER, radius: 1 };

const pose = (position: Vector3, target: Vector3, up = new Vector3(0, 1, 0)): OrientedPose => ({
  position,
  target,
  up,
});

/** Just behind and above a ship over the body's far side, looking at the ship, with the ground below. */
const chase = pose(new Vector3(11.75, 0.25, -0.35), new Vector3(11.3, 0, 0), new Vector3(1, 0, 0));
/** Far out on the near side, looking at the body's middle. */
const wide = pose(new Vector3(5.5, 1.6, 2.2), CENTER.clone());
/** Straight across the body from `wide`, as far out. */
const across = pose(new Vector3(14.5, -1.6, -2.2), CENTER.clone());
/** High above the whole flight, looking at a point between Earth and the body, as the journey view does. */
const journey = pose(new Vector3(5, 40, 25), new Vector3(5, 0, 0));

/** The move from one pose to another, at `steps` + 1 even steps. */
function path(from: OrientedPose, to: OrientedPose, steps = 400): OrientedPose[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const out = pose(new Vector3(), new Vector3(), new Vector3());
    swingAround(from, to, CENTER, i / steps, out);
    return out;
  });
}

const distanceOf = (p: OrientedPose): number => p.position.distanceTo(CENTER);

/** The camera's orientation at a pose, as Object3D.lookAt turns a camera. */
const orientationOf = (p: OrientedPose): Quaternion =>
  new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(p.position, p.target, p.up));

/** Where the body's center is in the picture: across and up, as a share of the distance in front. */
function onScreen(p: OrientedPose): [number, number] {
  const seen = CENTER.clone().sub(p.position).applyQuaternion(orientationOf(p).invert());
  return [seen.x / -seen.z, seen.y / -seen.z];
}

/** How far a point is from the line through two others, in the same units. */
function offLine(
  [x, y]: [number, number],
  [ax, ay]: [number, number],
  [bx, by]: [number, number],
): number {
  return Math.abs((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / Math.hypot(bx - ax, by - ay);
}

/** The largest turn of the camera from one step to the next, in degrees. */
function largestStep(poses: readonly OrientedPose[]): number {
  const turns = poses.slice(1).map((p, i) => orientationOf(p).angleTo(orientationOf(poses[i]!)));
  return (Math.max(...turns) * 180) / Math.PI;
}

describe('swingAround', () => {
  it('starts at the first pose and ends at the second', () => {
    const poses = path(chase, wide);
    const first = poses[0]!;
    const last = poses.at(-1)!;

    expect(first.position.toArray()).toEqual(chase.position.toArray());
    expect(first.target.toArray()).toEqual(chase.target.toArray());
    expect(last.position.toArray()).toEqual(wide.position.toArray());
    expect(last.target.toArray()).toEqual(wide.target.toArray());
  });

  it.each([
    ['out from the ship to the wide view', chase, wide],
    ['in from the wide view to the ship', wide, chase],
  ])('never comes closer to the body than the nearer end on the way %s', (_name, from, to) => {
    const distances = path(from, to).map(distanceOf);
    const nearer = Math.min(distanceOf(from), distanceOf(to));
    const farther = Math.max(distanceOf(from), distanceOf(to));

    expect(Math.min(...distances)).toBeGreaterThanOrEqual(nearer - 1e-9);
    expect(Math.max(...distances)).toBeLessThanOrEqual(farther + 1e-9);
  });

  it('changes its distance from the body one way only', () => {
    const distances = path(chase, wide).map(distanceOf);
    const steps = distances.slice(1).map((d, i) => d - distances[i]!);

    expect(Math.min(...steps)).toBeGreaterThanOrEqual(-1e-9);
  });

  it('backs away from the body a little ahead of turning, and turns a little ahead of closing in', () => {
    const halfwayOut = path(chase, wide, 2)[1]!;
    const halfwayIn = path(wide, chase, 2)[1]!;
    const middle = Math.sqrt(distanceOf(chase) * distanceOf(wide));

    expect(distanceOf(halfwayOut)).toBeGreaterThan(middle);
    expect(distanceOf(halfwayIn)).toBeGreaterThan(middle);
  });

  it('swings around the body at an even rate when its distance stays the same', () => {
    const halfway = path(wide, across, 2)[1]!;
    const turned = halfway.position.clone().sub(CENTER).angleTo(wide.position.clone().sub(CENTER));

    expect(turned).toBeCloseTo(swingAngle(wide, across, CENTER) / 2, 6);
    expect(distanceOf(halfway)).toBeCloseTo(distanceOf(wide), 6);
  });

  it.each([
    ['out from the ship to the wide view', chase, wide],
    ['in from the wide view to the ship', wide, chase],
  ])('slides the body across the picture in a straight line on the way %s', (_name, from, to) => {
    const spots = path(from, to, 40).map(onScreen);
    const start = onScreen(from);
    const end = onScreen(to);

    expect(Math.max(...spots.map((spot) => offLine(spot, start, end)))).toBeLessThan(1e-6);
  });

  it.each([
    ['out from the ship to the wide view', chase, wide],
    ['in from the wide view to the ship', wide, chase],
    ['across to the far side', wide, across],
    ['in from high above the flight', journey, chase],
  ])('turns the camera a little at a time on the way %s', (_name, from, to) => {
    expect(largestStep(path(from, to))).toBeLessThan(1.5);
  });
});

describe('divesPast', () => {
  it('finds a straight move that would pass close by the body, closer than either end', () => {
    expect(divesPast(journey, chase, BODY)).toBe(true);
    expect(divesPast(chase, wide, BODY)).toBe(true);
  });

  it('lets a straight move that keeps its distance from the body be', () => {
    expect(divesPast(wide, across, BODY)).toBe(false);
    expect(divesPast(journey, wide, BODY)).toBe(false);
  });

  it('lets a straight move that passes the body far off be, where it stays small', () => {
    const highOverEarth = pose(new Vector3(0, 0, 20), new Vector3(0, 0, 0));
    const pastTheBody = pose(new Vector3(20, 0, 6), new Vector3(20, 0, 0));

    expect(divesPast(highOverEarth, pastTheBody, BODY)).toBe(false);
    expect(divesPast(highOverEarth, pastTheBody, { center: CENTER, radius: 3 })).toBe(true);
  });
});

describe('swingAngle', () => {
  it('measures the turn around the body between two poses, in radians', () => {
    const side = pose(new Vector3(12, 0, 0), CENTER.clone());
    const top = pose(new Vector3(10, 0, 5), CENTER.clone());

    expect(swingAngle(wide, across, CENTER)).toBeCloseTo(Math.PI, 6);
    expect(swingAngle(side, top, CENTER)).toBeCloseTo(Math.PI / 2, 6);
  });
});
