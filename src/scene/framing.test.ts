/**
 * The camera's moves between views (swingAround, swingKeeping, divesPast,
 * swingAngle, swingBodyOf). A move between two views of a body must go around it, never
 * coming closer to it than the nearer end, so the body never looks bigger on
 * the way; it must slide the body across the picture in a straight line; and
 * it must turn the picture a little at a time, with no sudden turn and no
 * flip. Also how far back a view stands to fit a craft's orbit across a
 * narrow picture (fitAcross), and what counts as a jump of the clock, which
 * is the only thing besides the visitor that moves the camera in the Earth
 * and Moon views (clockJumped).
 */
import { PerspectiveCamera, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  clockJumped,
  divesPast,
  fitAcross,
  fitDistance,
  swingAngle,
  swingAround,
  swingBodyOf,
  swingKeeping,
  type ClockReading,
  type OrientedPose,
} from './framing.ts';

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

describe('swingKeeping', () => {
  /** The move between the journey view and the ship view of a craft near the body, at `steps` + 1 even steps. */
  function keeping(from: OrientedPose, to: OrientedPose, subject: 'from' | 'to', steps = 200) {
    return Array.from({ length: steps + 1 }, (_, i) => {
      const out = pose(new Vector3(), new Vector3(), new Vector3());
      swingKeeping(from, to, CENTER, subject, i / steps, out);
      return out;
    });
  }
  const craft = chase.target;
  /** How far off the line of sight the craft is, in degrees. */
  const offSight = (p: OrientedPose): number =>
    (p.target.clone().sub(p.position).angleTo(craft.clone().sub(p.position)) * 180) / Math.PI;

  it('starts at the first pose and ends at the second', () => {
    const poses = keeping(journey, chase, 'to');
    const last = poses.at(-1)!;

    expect(poses[0]!.position.distanceTo(journey.position)).toBeLessThan(1e-9);
    expect(poses[0]!.target.distanceTo(journey.target)).toBeLessThan(1e-9);
    expect(last.position.distanceTo(chase.position)).toBeLessThan(1e-9);
    expect(last.target.distanceTo(chase.target)).toBeLessThan(1e-9);
    expect(last.up.distanceTo(chase.up)).toBeLessThan(1e-9);
  });

  it.each([
    ['in from the journey view to the craft', journey, chase, 'to' as const],
    ['out from the craft to the journey view', chase, journey, 'from' as const],
  ])('keeps the craft in the picture on the way %s', (_name, from, to, subject) => {
    const angles = keeping(from, to, subject).map(offSight);
    const wide = Math.max(angles[0]!, angles.at(-1)!);

    expect(Math.max(...angles)).toBeLessThanOrEqual(wide + 0.5);
  });

  it('never comes closer to the body than the nearer end', () => {
    const distances = keeping(journey, chase, 'to').map(distanceOf);

    expect(Math.min(...distances)).toBeGreaterThanOrEqual(distanceOf(chase) - 1e-9);
  });

  // Turning to keep a craft in sight while swinging close past it takes a little more turning than a plain swing.
  it('turns the camera a little at a time', () => {
    expect(largestStep(keeping(journey, chase, 'to', 400))).toBeLessThan(2);
    expect(largestStep(keeping(chase, journey, 'from', 400))).toBeLessThan(2);
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

describe('swingBodyOf', () => {
  /** Earth at the origin and the Moon where BODY is, at the scene's readable scale. */
  const EARTH = { center: new Vector3(0, 0, 0), radius: 1.02 };
  const MOON = { center: CENTER, radius: 0.27 };
  const BODIES = [MOON, EARTH];
  const REACH = 3;
  /** The journey view: high over the flight, looking at a point between Earth and the Moon. */
  const overTheFlight = pose(new Vector3(4.6, 17, 10.6), new Vector3(4.6, 0, 0));
  /** The ship view of a craft about half an Earth radius up, just after it left for the Moon. */
  const shipNearEarth = pose(new Vector3(1.8, 0.65, -1.6), new Vector3(1.2, 0.3, -1));
  const earthView = pose(new Vector3(2, 1, 4), new Vector3(0, 0, 0));
  const moonView = pose(new Vector3(10, 0.5, 1.4), CENTER.clone());
  /** The ship view of a craft halfway to the Moon, far from both. */
  const shipInSpace = pose(new Vector3(5.7, 0.5, -0.1), new Vector3(5, 0.2, -0.5));

  it.each([
    ['from the journey view in to a craft near Earth', overTheFlight, shipNearEarth, EARTH],
    ['from a craft near Earth out to the journey view', shipNearEarth, overTheFlight, EARTH],
    ['from the journey view in to the Moon view', overTheFlight, moonView, MOON],
    ['between the Earth view and a craft near Earth', earthView, shipNearEarth, EARTH],
  ])('swings around the body on the way %s', (_name, from, to, body) => {
    expect(swingBodyOf(from, to, BODIES, REACH)).toBe(body);
  });

  it.each([
    ['from the Earth view to the Moon view', earthView, moonView],
    ['between the journey view and a craft far from both', overTheFlight, shipInSpace],
    [
      'from the Earth view out to a view that looks away from Earth',
      earthView,
      pose(new Vector3(0, 0, 20), new Vector3(0, 0, 30)),
    ],
  ])('flies straight %s', (_name, from, to) => {
    expect(swingBodyOf(from, to, BODIES, REACH)).toBeNull();
  });
});

describe('fitAcross', () => {
  /** A phone held upright, its picture clear of the card below. */
  const phone = new PerspectiveCamera(66, 390 / 844);
  const phoneClear = { width: 0.86, height: 0.63 };
  /** A wide desktop window, its picture clear of the dock below. */
  const desktop = new PerspectiveCamera(40, 1440 / 900);
  const desktopClear = { width: 1, height: 0.69 };
  const around = (camera: PerspectiveCamera, radius: number, clear: typeof phoneClear): number =>
    fitDistance(
      camera,
      CENTER,
      new Vector3(0, 0, 1),
      [{ center: CENTER, radius }],
      1,
      clear,
      new Vector3(0, 1, 0),
    );

  it("puts a sphere's sides at the sides of the clear part of the picture", () => {
    const distance = fitAcross(phone, 1.4, 1, phoneClear);
    const halfWidth = Math.atan(Math.tan((33 * Math.PI) / 180) * phone.aspect * phoneClear.width);

    expect(Math.asin(1.4 / distance)).toBeCloseTo(halfWidth, 9);
  });

  it('stands back as far as fitting the whole sphere does, on a tall narrow screen', () => {
    expect(fitAcross(phone, 1.4, 1.1, phoneClear)).toBeCloseTo(
      around(phone, 1.4 * 1.1, phoneClear),
      9,
    );
  });

  it('asks for less room than fitting the whole sphere does, on a wide screen', () => {
    expect(fitAcross(desktop, 1.4, 1.1, desktopClear)).toBeLessThan(
      around(desktop, 1.4 * 1.1, desktopClear),
    );
  });
});

describe('clockJumped', () => {
  const playing = (story: number, speed = 1): ClockReading => ({ story, playing: true, speed });
  const stopped = (story: number): ClockReading => ({ story, playing: false, speed: 0 });

  it.each([
    ['plays on for a frame', playing(100), playing(100.016)],
    ['takes a slow frame of nearly half a second', playing(100), playing(100.45)],
    [
      'stalls for a second in the hurried middle of a tour trip',
      playing(100, 40),
      playing(140, 40),
    ],
    ['lands at the end of a trip and stops', playing(100, 0.2), stopped(100.05)],
    ['is paused', playing(100), stopped(100)],
    ['starts playing', stopped(100), playing(100)],
    [
      'is put back on the same moment, give or take a rounding error',
      stopped(100),
      stopped(100 + 1e-9),
    ],
  ])('does not count a clock that %s', (_name, before, after) => {
    expect(clockJumped(before, after)).toBe(false);
  });

  it.each([
    ['moves while stopped (a step to the next event)', stopped(100), stopped(130)],
    ['moves while stopped, if only a little (the scrubber)', stopped(100), stopped(100.5)],
    ['moves ahead while playing farther than its pace could take it', playing(100), playing(130)],
    ['moves back while playing', playing(100), playing(90)],
    ['starts over from the end when played', stopped(500), playing(0)],
  ])('counts a clock that %s', (_name, before, after) => {
    expect(clockJumped(before, after)).toBe(true);
  });
});
