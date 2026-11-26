/**
 * Fast forward's two rules: a craft is replaced by its ring when it laps
 * its body faster than once in about 20 seconds, and drawn again below once
 * in about 24 (with nothing in between); and the ring is drawn only through
 * a lap of the path that closes on itself, with no chord where its ends
 * meet. Then its stand-in: its model glides round the ring at a calm pace
 * of its own, sitting on the ring as drawn, and hands back to its true place
 * with a dip that never shows it in two places. The paths here are drawn
 * around a body at the origin, in the plane y = 0, starting along +x.
 */
import { describe, expect, it } from 'vitest';
import {
  closedLapStart,
  FAST_FORWARD_GLIDE_EASE_SECONDS,
  FAST_FORWARD_GLIDE_LAP_SECONDS,
  FAST_FORWARD_HANDBACK_SECONDS,
  FAST_FORWARD_ON_LAP_SECONDS,
  glideRate,
  glideRevolutions,
  handBackEases,
  handBackOpacity,
  HANDBACK_SWITCH,
  inFastForward,
  ringHeadingAt,
  ringPointAt,
  seedShare,
  stepHandBack,
  writeLap,
  type LapPath,
} from './fast-forward.ts';

const ORIGIN = [0, 0, 0];
const SAMPLES_PER_LAP = 200;

/**
 * A path going around the origin for `laps` revolutions, its distance from
 * the center given at each revolution flown. The same at both scales.
 */
function pathAround(laps: number, radiusAt: (revolution: number) => number): LapPath {
  const n = Math.round(laps * SAMPLES_PER_LAP) + 1;
  const revolutions = new Float64Array(n);
  const positions = new Float32Array(3 * n);
  for (let i = 0; i < n; i += 1) {
    const revolution = i / SAMPLES_PER_LAP;
    const angle = revolution * Math.PI * 2;
    const radius = radiusAt(revolution);
    revolutions[i] = revolution;
    positions[3 * i] = radius * Math.cos(angle);
    positions[3 * i + 2] = radius * Math.sin(angle);
  }
  return { revolutions, truePositions: positions, readablePositions: positions };
}

/** Each ring point's distance from the next one, the last one's from the first. */
function steps(points: Float32Array, count: number): number[] {
  return Array.from({ length: count }, (_, j) => {
    const k = (j + 1) % count;
    return Math.hypot(
      (points[3 * k] as number) - (points[3 * j] as number),
      (points[3 * k + 1] as number) - (points[3 * j + 1] as number),
      (points[3 * k + 2] as number) - (points[3 * j + 2] as number),
    );
  });
}

/** Seconds of real time a lap takes, as laps per second. */
const lapIn = (seconds: number): number => 1 / seconds;

describe('inFastForward', () => {
  it.each([
    ['a lap in 25 seconds', 25, false],
    ['a lap in 21 seconds', 21, false],
    ['a lap in 19 seconds', 19, true],
    ['a lap in 8.8 seconds (Eagle before its descent, at normal speed)', 8.8, true],
    ['a lap in 5.2 seconds (Eagle and Columbia before docking)', 5.2, true],
    ['a lap in 4.4 seconds', 4.4, true],
  ])('draws the craft or its ring for %s, starting from the craft', (_name, seconds, ring) => {
    expect(inFastForward(lapIn(seconds), false)).toBe(ring);
  });

  it.each([
    ['a lap in 21 seconds', 21, true],
    ['a lap in 23.5 seconds', 23.5, true],
    ['a lap in 24.5 seconds', 24.5, false],
    ['a stopped clock', Infinity, false],
  ])(
    'keeps the ring or goes back to the craft for %s, starting from the ring',
    (_name, seconds, ring) => {
      expect(inFastForward(lapIn(seconds), true)).toBe(ring);
    },
  );
});

describe('closedLapStart', () => {
  it('centers the lap on now in a steady orbit', () => {
    const orbit = pathAround(6, () => 1.1);

    expect(closedLapStart(orbit, 3.2, ORIGIN)).toBeCloseTo(2.7, 9);
  });

  it('takes the lap behind just before the craft leaves orbit, and none once it has left', () => {
    // Three laps in orbit, then the path swings out quickly, as at a burn toward the Moon or home.
    const leaving = pathAround(5, (r) => (r < 3 ? 1.1 : 1.1 + 6 * (r - 3) ** 2));

    const before = closedLapStart(leaving, 2.95, ORIGIN);
    const after = closedLapStart(leaving, 3.4, ORIGIN);

    // Mostly behind now, ending about where the path swings out.
    expect(before).toBeLessThan(2.95 - 0.5);
    expect(before + 1).toBeLessThan(3.1);
    expect(after).toBeNaN();
  });

  it('takes the lap ahead just after the craft arrives in orbit, and none on the way in', () => {
    // Coming in from far away over one lap, then three laps in orbit.
    const arriving = pathAround(4, (r) => (r < 1 ? 1.1 + 6 * (1 - r) ** 2 : 1.1));

    const onTheWay = closedLapStart(arriving, 0.6, ORIGIN);
    const justAfter = closedLapStart(arriving, 1.05, ORIGIN);

    // Mostly ahead of now, starting about where the path settles into orbit.
    expect(onTheWay).toBeNaN();
    expect(justAfter).toBeGreaterThan(1.05 - 0.5);
    expect(justAfter).toBeGreaterThan(0.9);
  });

  it('takes a lap across a small burn, as in a rendezvous', () => {
    const rendezvous = pathAround(6, (r) => (r < 3 ? 1.1 : 1.13));

    expect(closedLapStart(rendezvous, 3, ORIGIN)).toBeCloseTo(2.5, 9);
  });

  it('finds no lap when the orbit changes by a lot both before and after now within a lap', () => {
    const twoBigBurns = pathAround(6, (r) => (r < 3 ? 1.1 : r < 3.5 ? 1.4 : 1.8));

    expect(closedLapStart(twoBigBurns, 3.25, ORIGIN)).toBeNaN();
  });

  it('finds no lap at the ends of a path that is shorter than one', () => {
    const short = pathAround(0.8, () => 1.1);

    expect(closedLapStart(short, 0.4, ORIGIN)).toBeNaN();
  });
});

describe('writeLap', () => {
  const COUNT = 64;

  it('puts each point at its own place around the body, whatever lap it draws', () => {
    const orbit = pathAround(6, () => 1.1);
    const one = new Float32Array(3 * COUNT);
    const another = new Float32Array(3 * COUNT);

    writeLap(orbit, 1.3, 0, one, COUNT);
    writeLap(orbit, 2.85, 0, another, COUNT);

    // Point 0 is along +x, a quarter of the way round is along +z.
    expect([one[0], one[2]]).toEqual([expect.closeTo(1.1, 4), expect.closeTo(0, 4)]);
    expect([one[3 * 16], one[3 * 16 + 2]]).toEqual([expect.closeTo(0, 4), expect.closeTo(1.1, 4)]);
    for (let k = 0; k < 3 * COUNT; k += 1) expect(another[k]).toBeCloseTo(one[k] as number, 4);
  });

  it('closes a lap that spirals a little without a chord across it', () => {
    // The orbit grows by 6% each lap, as two orbits a small burn apart.
    const spiral = pathAround(6, (r) => 1.1 * (1 + 0.06 * r));
    const points = new Float32Array(3 * COUNT);

    writeLap(spiral, 2.4, 0, points, COUNT);

    const between = steps(points, COUNT).sort((a, b) => a - b);
    const typical = between[COUNT / 2] as number;
    expect(between[COUNT - 1]).toBeLessThan(1.05 * typical);
  });

  it('draws at the scale asked for, between readable and true', () => {
    const orbit = pathAround(3, () => 1.1);
    const lifted = pathAround(3, () => 1.5);
    const both: LapPath = { ...orbit, readablePositions: lifted.readablePositions };
    const points = new Float32Array(3 * COUNT);

    writeLap(both, 0.5, 0.5, points, COUNT);

    expect(Math.hypot(points[0] as number, points[2] as number)).toBeCloseTo(1.3, 4);
  });
});

describe("the stand-in's glide", () => {
  const enteredAt = 1 / FAST_FORWARD_ON_LAP_SECONDS;
  const calm = 1 / FAST_FORWARD_GLIDE_LAP_SECONDS;

  it('sets off at the pace the craft went into fast forward at, and eases to its own', () => {
    expect(glideRate(0, enteredAt)).toBeCloseTo(enteredAt, 9);
    expect(glideRate(FAST_FORWARD_GLIDE_EASE_SECONDS / 2, enteredAt)).toBeCloseTo(
      (enteredAt + calm) / 2,
      9,
    );
    expect(glideRate(FAST_FORWARD_GLIDE_EASE_SECONDS, enteredAt)).toBeCloseTo(calm, 9);
    expect(glideRate(30, enteredAt)).toBeCloseTo(calm, 9);
  });

  it('goes round once in 40 seconds of real time once it has eased, whatever it set off at', () => {
    for (const start of [enteredAt, calm, 0]) {
      const later = glideRevolutions(12, start);
      expect(glideRevolutions(12 + 40, start) - later).toBeCloseTo(1, 9);
    }
  });

  it('starts from where the craft is and moves on at its pace, never back', () => {
    const steps = Array.from({ length: 301 }, (_, k) => k / 100);
    const glided = steps.map((s) => glideRevolutions(s, enteredAt));

    expect(glided[0]).toBe(0);
    for (let k = 1; k < steps.length; k += 1) {
      const step = (glided[k] as number) - (glided[k - 1] as number);
      expect(step).toBeGreaterThan(0);
      // The laps glided over each hundredth of a second are its pace then.
      const middle = ((steps[k] as number) + (steps[k - 1] as number)) / 2;
      expect(step / 0.01).toBeCloseTo(glideRate(middle, enteredAt), 4);
    }
  });

  it('is at the true place as it sets off, and on the ring once it has eased', () => {
    expect(seedShare(0)).toBe(1);
    expect(seedShare(FAST_FORWARD_GLIDE_EASE_SECONDS / 2)).toBeCloseTo(0.5, 9);
    expect(seedShare(FAST_FORWARD_GLIDE_EASE_SECONDS)).toBe(0);
    expect(seedShare(10)).toBe(0);
  });
});

describe('a place on a ring', () => {
  const COUNT = 64;

  it('is where the craft is round the lap, at the share of a lap it has flown', () => {
    const orbit = pathAround(6, () => 1.1);
    const ring = new Float32Array(3 * COUNT);
    writeLap(orbit, 2.3, 0, ring, COUNT);
    const point = [0, 0, 0];
    const angle = 0.125 * Math.PI * 2;

    // A craft that has flown 3.125 laps is an eighth of the way round, as on any other lap.
    for (const phase of [0.125, 3.125, -0.875]) {
      ringPointAt(ring, COUNT, phase, point);
      expect(point[0]).toBeCloseTo(1.1 * Math.cos(angle), 3);
      expect(point[2]).toBeCloseTo(1.1 * Math.sin(angle), 3);
    }
  });

  it('is on the ring as drawn, straight between its points, the last leading to the first', () => {
    const square = new Float32Array([1, 0, 0, 0, 0, 1, -1, 0, 0, 0, 0, -1]);
    const point = [0, 0, 0];

    ringPointAt(square, 4, 0.125, point);
    expect(point).toEqual([0.5, 0, 0.5]);
    ringPointAt(square, 4, 0.875, point);
    expect(point).toEqual([0.5, 0, -0.5]);
    ringPointAt(square, 4, 1, point);
    expect(point).toEqual([1, 0, 0]);
  });

  it('heads the way the craft flies, turning smoothly from one point to the next', () => {
    const orbit = pathAround(6, () => 1.1);
    const ring = new Float32Array(3 * COUNT);
    writeLap(orbit, 2.3, 0, ring, COUNT);
    const heading = [0, 0, 0];
    let last: number[] | null = null;
    // Across two stretches between points, in small steps.
    for (let k = 0; k <= 40; k += 1) {
      const phase = 0.25 + (k / 40) * (2 / COUNT);
      ringHeadingAt(ring, COUNT, phase, heading);
      const angle = phase * Math.PI * 2;
      // Along the orbit, the way it is flown (from +x toward +z).
      expect(heading[0]).toBeCloseTo(-Math.sin(angle), 2);
      expect(heading[2]).toBeCloseTo(Math.cos(angle), 2);
      if (last) {
        const dot =
          (heading[0] as number) * (last[0] as number) +
          (heading[2] as number) * (last[2] as number);
        expect(Math.acos(Math.min(1, dot))).toBeLessThan(0.01);
      }
      last = [...heading];
    }
  });
});

describe('the hand-back', () => {
  it('fades the model out where it stands in, then in at its true place, with nothing at the switch', () => {
    expect(handBackOpacity(0)).toBe(1);
    expect(handBackOpacity(HANDBACK_SWITCH / 2)).toBeCloseTo(0.5, 9);
    expect(handBackOpacity(HANDBACK_SWITCH)).toBe(0);
    expect(handBackOpacity((HANDBACK_SWITCH + 1) / 2)).toBeCloseTo(0.5, 9);
    expect(handBackOpacity(1)).toBe(1);
  });

  it('takes about half a second', () => {
    let progress = 0;
    let frames = 0;
    while (progress < 1) {
      progress = stepHandBack(progress, 1 / 60);
      frames += 1;
    }
    expect(FAST_FORWARD_HANDBACK_SECONDS).toBe(0.5);
    expect(frames / 60).toBeCloseTo(0.5, 1);
  });

  it.each([
    ['at 60 frames a second', 1 / 60],
    ['at 10 frames a second', 0.1],
    ['after a slow frame', 0.3],
  ])('draws one frame with the model hidden as it moves, %s', (_name, dt) => {
    const drawn: number[] = [];
    let progress = 0;
    while (progress < 1) {
      progress = stepHandBack(progress, dt);
      drawn.push(progress);
    }
    expect(drawn).toContain(HANDBACK_SWITCH);
  });

  it('goes back toward the stand-in when fast forward comes back before the model has moved', () => {
    expect(stepHandBack(0.3, -0.05)).toBeCloseTo(0.2, 9);
    expect(stepHandBack(0.05, -0.1)).toBe(0);
    expect(stepHandBack(0.6, -0.1)).toBe(HANDBACK_SWITCH);
  });

  it('eases across, without the dip, only when the stand-in is within a few degrees of the true place', () => {
    const at = (degrees: number, radius = 1.1): number[] => {
      const angle = (degrees * Math.PI) / 180;
      return [radius * Math.cos(angle), 0, radius * Math.sin(angle)];
    };

    expect(handBackEases(at(2), at(0), ORIGIN)).toBe(true);
    expect(handBackEases(at(358), at(1), ORIGIN)).toBe(true);
    expect(handBackEases(at(10), at(0), ORIGIN)).toBe(false);
    expect(handBackEases(at(180), at(0), ORIGIN)).toBe(false);
    // Right above it but well off its orbit (a ring left from before a burn) is not close.
    expect(handBackEases(at(0, 1.4), at(0), ORIGIN)).toBe(false);
  });
});
