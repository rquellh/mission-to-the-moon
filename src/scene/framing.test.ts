/**
 * The camera's moves between views (swingAround, divesPast, swingAngle,
 * swingBodyOf), keeping a craft in sight on the way (seenAt, aimAt), and how
 * a move is paced (easeMove, moveDuration). A move between two views of a
 * body must go around it, never coming closer to it than the nearer end, so
 * the body never looks bigger on the way; it must slide the body across the
 * picture in a straight line, or keep the craft on one; it must turn the
 * picture a little at a time, with no sudden turn and no flip; and it must
 * take long enough that the picture never turns fast. Also how far back a
 * view stands to fit a craft's orbit across a narrow picture (fitAcross),
 * and what counts as a jump of the clock, which is the only thing besides
 * the visitor that moves the camera in the Earth and Moon views
 * (clockJumped). And how a move's up can be carried along its line of sight
 * so the picture rolls only as one even roll (carryUp).
 */
import { PerspectiveCamera, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  aimAt,
  bodyTop,
  calmestWay,
  carriedUp,
  carriedUpAt,
  carryPose,
  carryUp,
  clockJumped,
  divesPast,
  easeMove,
  fitAcross,
  fitDistance,
  keepBodyUp,
  moveDuration,
  moveShare,
  moveTurn,
  seenAt,
  swingAngle,
  swingAround,
  swingBodyOf,
  type ClockReading,
  type OrientedPose,
  type Spot,
  type SwingWay,
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

describe('swingAround, which way round', () => {
  /** A quarter of the way round the body from `wide`, looking at its middle. */
  const side = pose(new Vector3(12.2, 1, 2), CENTER.clone());
  const sight = CENTER.clone().sub(side.position).normalize();
  /**
   * Halfway through a move whose end rolls on, a full turn in 5 degree steps,
   * as the ship view's chase does under a move that follows its craft.
   */
  function rollingOn(way?: SwingWay): OrientedPose[] {
    return Array.from({ length: 73 }, (_, i) => {
      const up = side.up.clone().applyAxisAngle(sight, (i * 5 * Math.PI) / 180);
      const out = pose(new Vector3(), new Vector3(), new Vector3());
      swingAround(wide, pose(side.position, side.target, up), CENTER, 0.5, out, way);
      return out;
    });
  }

  it('keeps rolling the way it set off as its end rolls on, never flipping over', () => {
    expect(
      largestStep(rollingOn({ longArc: false, longTwist: false, twist: Number.NaN })),
    ).toBeLessThan(5);
  });

  it('would flip over to roll the other way without it', () => {
    expect(largestStep(rollingOn())).toBeGreaterThan(90);
  });

  it.each([
    ['round the body the long way', { longArc: true, longTwist: false, twist: Number.NaN }],
    ['rolling the long way', { longArc: false, longTwist: true, twist: Number.NaN }],
  ])('can go %s and still end where it should', (_name, way) => {
    const steps = Array.from({ length: 201 }, (_, i) => {
      const out = pose(new Vector3(), new Vector3(), new Vector3());
      swingAround(wide, side, CENTER, i / 200, out, { ...way });
      return out;
    });

    expect(steps.at(-1)!.position.distanceTo(side.position)).toBeLessThan(1e-9);
    expect(largestStep(steps)).toBeLessThan(5);
    expect(Math.min(...steps.map(distanceOf))).toBeGreaterThanOrEqual(
      Math.min(distanceOf(wide), distanceOf(side)) - 1e-9,
    );
  });
});

describe('calmestWay', () => {
  const side = pose(new Vector3(12.2, 1, 2), CENTER.clone());
  const sight = CENTER.clone().sub(side.position).normalize();
  /** `side`, its picture rolled by `degrees` about its line of sight. */
  const rolled = (degrees: number): OrientedPose =>
    pose(
      side.position,
      side.target,
      side.up.clone().applyAxisAngle(sight, (degrees * Math.PI) / 180),
    );
  /** The roll a swing from `wide` takes, the short way round, to `rolled(degrees)`, in degrees. */
  const rollTo = (degrees: number): number => {
    const way: SwingWay = { longArc: false, longTwist: false, twist: Number.NaN };
    swingAround(
      wide,
      rolled(degrees),
      CENTER,
      0.5,
      pose(new Vector3(), new Vector3(), new Vector3()),
      way,
    );
    return (way.twist * 180) / Math.PI;
  };
  // An end whose roll, the short way, is 170 degrees: nearly half a turn.
  const nearHalf = Array.from({ length: 360 }, (_, a) => a).reduce((best, a) =>
    Math.abs(Math.abs(rollTo(a)) - 170) < Math.abs(Math.abs(rollTo(best)) - 170) ? a : best,
  );
  // Rolling the end on by a degree that way adds a degree to the roll the short way.
  const onward = Math.sign(rollTo(nearHalf)) * Math.sign(rollTo(nearHalf + 1) - rollTo(nearHalf));
  const ways = (): SwingWay[] => [
    { longArc: false, longTwist: false, twist: Number.NaN },
    { longArc: false, longTwist: true, twist: Number.NaN },
    { longArc: true, longTwist: false, twist: Number.NaN },
    { longArc: true, longTwist: true, twist: Number.NaN },
  ];
  /** The move to an end that rolls on by `drift` degrees as the move goes (as the chase does, carried with its craft). */
  const toRolling =
    (drift: number) => (way: SwingWay, t: number, out: OrientedPose, share: number) =>
      swingAround(wide, rolled(nearHalf + onward * drift * share), CENTER, t, out, way);
  const turnOf = (drift: number, way: SwingWay): number =>
    (moveTurn((t, out, share) => toRolling(drift)(way, t, out, share)) * 180) / Math.PI;

  it('takes the short way round when the end holds still', () => {
    const way = calmestWay(ways(), toRolling(0), (3 * Math.PI) / 180);

    expect(way.longArc).toBe(false);
    expect(way.longTwist).toBe(false);
  });

  it('rolls the other way to meet an end that rolls on away from the short way', () => {
    const way = calmestWay(ways(), toRolling(80), (3 * Math.PI) / 180);
    const short = { longArc: false, longTwist: false, twist: Number.NaN };

    expect(way.longArc).toBe(false);
    expect(way.longTwist).toBe(true);
    // Left for the move to set as it goes.
    expect(Number.isNaN(way.twist)).toBe(true);
    expect(turnOf(80, way)).toBeLessThan(turnOf(80, short) - 90);
  });
});

describe('carryPose', () => {
  /** A craft 1.3 radii round the body, `angle` radians along its orbit (about +Y). */
  const craftAt = (angle: number): Vector3 =>
    CENTER.clone().add(new Vector3(1.3, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), angle));
  /** The chase of that craft: behind, above and beside it, with its up away from the body. */
  const chaseAt = (angle: number): OrientedPose => {
    const turn = (v: Vector3) => v.applyAxisAngle(new Vector3(0, 1, 0), angle);
    return pose(
      craftAt(angle).add(turn(new Vector3(0.3, 0.4, 0.5))),
      craftAt(angle),
      turn(new Vector3(1, 0, 0)),
    );
  };

  it('finds the chase of a craft further along its orbit, carried round with it', () => {
    const out = pose(new Vector3(), new Vector3(), new Vector3());
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 1.2);

    carryPose(chaseAt(0.4), craftAt(0.4), craftAt(1.6), turn, out);

    expect(out.position.distanceTo(chaseAt(1.6).position)).toBeLessThan(1e-9);
    expect(out.target.distanceTo(chaseAt(1.6).target)).toBeLessThan(1e-9);
    expect(out.up.distanceTo(chaseAt(1.6).up)).toBeLessThan(1e-9);
  });

  it('only moves with a craft when the chase does not turn', () => {
    const out = pose(new Vector3(), new Vector3(), new Vector3());
    const offset = chaseAt(0.4).position.sub(craftAt(0.4));

    carryPose(chaseAt(0.4), craftAt(0.4), craftAt(0.9), new Quaternion(), out);

    expect(out.position.clone().sub(craftAt(0.9)).distanceTo(offset)).toBeLessThan(1e-9);
    expect(out.up.distanceTo(chaseAt(0.4).up)).toBeLessThan(1e-9);
  });
});

describe('seenAt', () => {
  /** At the origin, looking down -Z with +Y up. */
  const ahead = pose(new Vector3(0, 0, 0), new Vector3(0, 0, -5));

  it('sees a point on the line of sight in the middle of the picture', () => {
    const spot: Spot = { x: 1, y: 1 };

    expect(seenAt(ahead, new Vector3(0, 0, -3), spot)).toBe(true);
    expect(spot.x).toBeCloseTo(0, 12);
    expect(spot.y).toBeCloseTo(0, 12);
  });

  it('sees a point to the right and above as shares of its distance in front', () => {
    const spot: Spot = { x: 0, y: 0 };

    expect(seenAt(ahead, new Vector3(1, 2, -4), spot)).toBe(true);
    expect(spot.x).toBeCloseTo(0.25, 12);
    expect(spot.y).toBeCloseTo(0.5, 12);
  });

  it('turns with the camera: a camera rolled over sees above as below', () => {
    const upsideDown = pose(new Vector3(0, 0, 0), new Vector3(0, 0, -5), new Vector3(0, -1, 0));
    const spot: Spot = { x: 0, y: 0 };

    seenAt(upsideDown, new Vector3(1, 2, -4), spot);

    expect(spot.x).toBeCloseTo(-0.25, 12);
    expect(spot.y).toBeCloseTo(-0.5, 12);
  });

  it.each([
    ['behind the camera', new Vector3(0, 0, 3)],
    ['beside it', new Vector3(5, 0, 0)],
  ])('finds no spot for a point %s', (_name, point) => {
    expect(seenAt(ahead, point, { x: 0, y: 0 })).toBe(false);
  });
});

describe('aimAt', () => {
  const craft = chase.target;

  it('turns the camera so the point is seen where asked', () => {
    const aimed = pose(wide.position.clone(), wide.target.clone(), wide.up.clone());
    const spot: Spot = { x: 0, y: 0 };

    aimAt(aimed, craft, { x: -0.1, y: 0.05 });
    seenAt(aimed, craft, spot);

    expect(spot.x).toBeCloseTo(-0.1, 9);
    expect(spot.y).toBeCloseTo(0.05, 9);
  });

  it('leaves the camera where it is, looking as far', () => {
    const aimed = pose(wide.position.clone(), wide.target.clone(), wide.up.clone());

    aimAt(aimed, craft, { x: 0.2, y: -0.1 });

    expect(aimed.position.distanceTo(wide.position)).toBe(0);
    expect(aimed.target.distanceTo(aimed.position)).toBeCloseTo(
      wide.target.distanceTo(wide.position),
      9,
    );
  });

  it('turns the camera as little as it must: a pose that already sees the point there stays as it is', () => {
    const spot: Spot = { x: 0, y: 0 };
    seenAt(wide, craft, spot);
    const aimed = pose(wide.position.clone(), wide.target.clone(), wide.up.clone());

    aimAt(aimed, craft, spot);

    expect(orientationOf(aimed).angleTo(orientationOf(wide))).toBeLessThan(1e-6);
  });
});

describe('a swing that keeps a craft in sight', () => {
  /**
   * The stage's move between the wide view (looking at the body, the craft in
   * the picture) and the ship view (looking at the craft): a swing around the
   * body, turned at each step so the craft is seen a share of the way from
   * where it is at the start to where it is at the end.
   */
  const craft = chase.target;
  function keeping(from: OrientedPose, to: OrientedPose, steps = 400): OrientedPose[] {
    const start: Spot = { x: 0, y: 0 };
    const end: Spot = { x: 0, y: 0 };
    seenAt(from, craft, start);
    seenAt(to, craft, end);
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const out = pose(new Vector3(), new Vector3(), new Vector3());
      swingAround(from, to, CENTER, t, out);
      if (t > 0 && t < 1)
        aimAt(out, craft, {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        });
      return out;
    });
  }
  const spotOf = (p: OrientedPose): [number, number] => {
    const spot: Spot = { x: 0, y: 0 };
    seenAt(p, craft, spot);
    return [spot.x, spot.y];
  };

  it.each([
    ['in from the wide view to the craft', wide, chase],
    ['out from the craft to the wide view', chase, wide],
    ['in from high above the flight', journey, chase],
  ])('keeps the craft on a straight line across the picture on the way %s', (_name, from, to) => {
    const spots = keeping(from, to).map(spotOf);
    const start = spots[0]!;
    const end = spots.at(-1)!;

    expect(Math.max(...spots.map((spot) => offLine(spot, start, end)))).toBeLessThan(1e-6);
    // ...and between its two ends, so on screen all the way when it is at both.
    for (const [x] of spots) {
      expect(x).toBeGreaterThanOrEqual(Math.min(start[0], end[0]) - 1e-6);
      expect(x).toBeLessThanOrEqual(Math.max(start[0], end[0]) + 1e-6);
    }
  });

  it('starts at the first pose and ends at the second', () => {
    const poses = keeping(wide, chase);

    expect(poses[0]!.position.distanceTo(wide.position)).toBeLessThan(1e-9);
    expect(poses[0]!.target.distanceTo(wide.target)).toBeLessThan(1e-9);
    expect(poses.at(-1)!.position.distanceTo(chase.position)).toBeLessThan(1e-9);
    expect(poses.at(-1)!.target.distanceTo(chase.target)).toBeLessThan(1e-9);
    expect(poses.at(-1)!.up.distanceTo(chase.up)).toBeLessThan(1e-9);
  });

  // Turning to keep a craft in sight while swinging close past it takes a little more turning than a plain swing.
  it('turns the camera a little at a time', () => {
    expect(largestStep(keeping(journey, chase))).toBeLessThan(2);
    expect(largestStep(keeping(wide, chase))).toBeLessThan(2);
    expect(largestStep(keeping(chase, wide))).toBeLessThan(2);
  });
});

describe('bodyTop', () => {
  /** Looking straight at the body from 4 radii off: its top edge 1/sqrt(15) up. */
  const facing = pose(new Vector3(10, 0, 4), CENTER.clone());

  it('finds the top edge of a body ahead as a share of the distance in front', () => {
    expect(bodyTop(facing, CENTER, 1)).toBeCloseTo(1 / Math.sqrt(15), 9);
  });

  it('finds a body below the line of sight lower in the picture', () => {
    const lookingUp = pose(new Vector3(10, 0, 4), new Vector3(10, 2, 0));

    expect(bodyTop(lookingUp, CENTER, 1)).toBeLessThan(0);
  });

  it('has no top edge from inside the body', () => {
    expect(bodyTop(pose(new Vector3(10, 0, 0.5), CENTER.clone()), CENTER, 1)).toBeNaN();
  });
});

describe('keepBodyUp', () => {
  /** Close over the body's horizon, looking out level, the body below the picture. */
  const level = (): OrientedPose =>
    pose(new Vector3(10, 1.2, 0), new Vector3(10, 1.2, -5), new Vector3(0, 1, 0));

  it('tips the camera down until the top edge is as high as asked, and no further', () => {
    const tipped = level();
    keepBodyUp(tipped, CENTER, 1, -0.2);

    expect(bodyTop(tipped, CENTER, 1)).toBeCloseTo(-0.2, 9);
    expect(tipped.position.toArray()).toEqual(level().position.toArray());
    expect(tipped.target.distanceTo(tipped.position)).toBeCloseTo(5, 9);
    // Down, not round: the picture's horizontal stays where it was.
    const right = (p: OrientedPose) => new Vector3(1, 0, 0).applyQuaternion(orientationOf(p));
    expect(right(tipped).distanceTo(right(level()))).toBeLessThan(1e-9);
  });

  it('leaves a camera that already sees the top edge high enough as it is', () => {
    const kept = level();
    const top = bodyTop(kept, CENTER, 1);
    keepBodyUp(kept, CENTER, 1, top - 0.1);

    expect(orientationOf(kept).angleTo(orientationOf(level()))).toBeLessThan(1e-6);
  });
});

describe('easeMove', () => {
  it('sets off from the start and comes to rest at the end', () => {
    expect(easeMove(0)).toBe(0);
    expect(easeMove(1)).toBe(1);
    expect(easeMove(-1)).toBe(0);
    expect(easeMove(2)).toBe(1);
    expect(easeMove(0.5)).toBeCloseTo(0.5, 12);
  });

  it('only ever moves forward, slowly at each end and at most π/2 times its average pace', () => {
    const steps = 1000;
    const paces = Array.from(
      { length: steps },
      (_, i) => (easeMove((i + 1) / steps) - easeMove(i / steps)) * steps,
    );

    expect(Math.min(...paces)).toBeGreaterThan(0);
    expect(paces[0]!).toBeLessThan(0.01);
    expect(paces.at(-1)!).toBeLessThan(0.01);
    expect(Math.max(...paces)).toBeLessThanOrEqual(Math.PI / 2 + 1e-6);
  });
});

describe('moveShare', () => {
  it.each([0, 0.1, 0.25, 0.5, 0.8, 1])('undoes easeMove at %s of the move’s time', (share) => {
    expect(moveShare(easeMove(share))).toBeCloseTo(share, 9);
  });

  it('stays within the move', () => {
    expect(moveShare(-0.1)).toBe(0);
    expect(moveShare(1.1)).toBe(1);
  });
});

describe('moveDuration', () => {
  /** A move around the body at an even rate, the camera always looking at its middle, through `degrees`. */
  const around = (degrees: number) => (t: number, out: OrientedPose) => {
    const angle = (degrees * t * Math.PI) / 180;
    out.position.set(10 + 3 * Math.sin(angle), 0, 3 * Math.cos(angle));
    out.target.copy(CENTER);
    out.up.set(0, 1, 0);
  };
  /** How fast the picture turns at its fastest on a move of `ms`, in degrees a second. */
  function fastestTurn(poseAt: (t: number, out: OrientedPose) => void, ms: number): number {
    const steps = 2000;
    const a = pose(new Vector3(), new Vector3(), new Vector3());
    const b = pose(new Vector3(), new Vector3(), new Vector3());
    let fastest = 0;
    for (let i = 0; i < steps; i += 1) {
      poseAt(easeMove(i / steps), a);
      poseAt(easeMove((i + 1) / steps), b);
      const degrees = (orientationOf(a).angleTo(orientationOf(b)) * 180) / Math.PI;
      fastest = Math.max(fastest, degrees / (ms / 1000 / steps));
    }
    return fastest;
  }

  it('takes the shortest time for a move that hardly turns the picture', () => {
    const closer = (t: number, out: OrientedPose) => {
      out.position.set(10, 0, 6 - 3 * t);
      out.target.copy(CENTER);
      out.up.set(0, 1, 0);
    };

    expect(moveDuration(closer, 90, 1500, 3000)).toBe(1500);
    expect(moveDuration(around(10), 90, 1500, 3000)).toBe(1500);
  });

  it('takes longer the farther the picture turns, so it never turns faster than asked', () => {
    const ms = moveDuration(around(120), 90, 1500, 3000);

    expect(ms).toBeGreaterThan(1500);
    expect(ms).toBeLessThan(3000);
    expect(ms).toBeGreaterThan(moveDuration(around(100), 90, 1500, 3000));
    expect(fastestTurn(around(120), ms)).toBeLessThanOrEqual(90 * 1.01);
    expect(fastestTurn(around(120), ms)).toBeGreaterThan(90 * 0.95);
  });

  it('counts a roll of the picture as a turn', () => {
    const rolling = (t: number, out: OrientedPose) => {
      const angle = (150 * t * Math.PI) / 180;
      out.position.set(10, 0, 3);
      out.target.copy(CENTER);
      out.up.set(Math.sin(angle), Math.cos(angle), 0);
    };

    expect(moveDuration(rolling, 90, 1500, 3000)).toBeGreaterThan(2500);
  });

  it('takes no longer than the longest time, however far the picture turns', () => {
    expect(moveDuration(around(179), 90, 1500, 3000)).toBe(3000);
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

describe('carryUp', () => {
  const blank = (): OrientedPose => pose(new Vector3(), new Vector3(), new Vector3());
  // The roll from one up to the next about the second's line of sight, in radians (as check.py measures it).
  const rollBetween = (a: OrientedPose, b: OrientedPose): number => {
    const look = b.target.clone().sub(b.position).normalize();
    const from = a.up.clone().addScaledVector(look, -a.up.dot(look)).normalize();
    const to = b.up.clone().addScaledVector(look, -b.up.dot(look)).normalize();
    return Math.atan2(new Vector3().crossVectors(from, to).dot(look), from.dot(to));
  };
  // A camera that goes a quarter of the way round a body's axis from above its equator, looking at
  // its center, the axis up: a turn of the picture that is partly a roll.
  const around = (t: number, out: OrientedPose): void => {
    const angle = (Math.PI / 2) * t;
    out.position.set(Math.cos(angle), 0.8, Math.sin(angle)).normalize().multiplyScalar(4);
    out.target.set(0, 0, 0);
    out.up.set(0, 1, 0);
  };
  const height = Math.atan2(0.8, 1);

  it("is short of the end's up by the roll the way needs", () => {
    const plan = carryUp(around, new Vector3(0, 1, 0), carriedUp());
    // Round the axis from above the equator, the up rolls by the turn times the sine of the height.
    expect(Math.abs(plan.left)).toBeCloseTo((Math.PI / 2) * Math.sin(height), 1);
  });

  it("starts on the first pose's up and ends on the end's", () => {
    const plan = carryUp(around, new Vector3(0, 1, 0), carriedUp());
    for (const t of [0, 1]) {
      const at = blank();
      around(t, at);
      const look = at.target.clone().sub(at.position).normalize();
      const wanted = at.up.clone().addScaledVector(look, -at.up.dot(look)).normalize();
      carriedUpAt(plan, t, at);
      expect(at.up.distanceTo(wanted)).toBeLessThan(1e-3);
    }
  });

  it('rolls the picture evenly, the same small step each step of the move', () => {
    const plan = carryUp(around, new Vector3(0, 1, 0), carriedUp());
    const steps = 20;
    let last = blank();
    around(0, last);
    carriedUpAt(plan, 0, last);
    for (let i = 1; i <= steps; i += 1) {
      const next = blank();
      around(i / steps, next);
      carriedUpAt(plan, i / steps, next);
      expect(rollBetween(last, next)).toBeCloseTo(plan.left / steps, 2);
      last = next;
    }
  });

  it('leaves no roll to a move that only backs away along its line of sight', () => {
    const away = (t: number, out: OrientedPose): void => {
      out.position.set(0, 1, 3 + 5 * t);
      out.target.set(0, 0, 0);
      out.up.set(0, 1, 0);
    };
    expect(Math.abs(carryUp(away, new Vector3(0, 1, 0), carriedUp()).left)).toBeLessThan(1e-6);
  });
});
