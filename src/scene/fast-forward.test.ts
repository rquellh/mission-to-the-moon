/**
 * Fast forward's two rules: a craft is replaced by its ring when it laps
 * its body faster than once in 20 seconds, and drawn again below once in 24
 * (with nothing in between); and the ring is drawn only through a lap of
 * the path that closes on itself, with no chord where its ends meet. The
 * paths here are drawn around a body at the origin, in the plane y = 0,
 * starting along +x.
 */
import { describe, expect, it } from 'vitest';
import {
  CALM_LAP_STORY_SECONDS,
  EASE_GENTLE_PACE,
  PLAIN_ORBIT_SECONDS,
  SWING_LAP_STORY_SECONDS,
} from '../sim/story-time.ts';
import {
  closedLapStart,
  FAST_FORWARD_OFF_LAP_SECONDS,
  FAST_FORWARD_ON_LAP_SECONDS,
  inFastForward,
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
    ['a lap in 30 seconds (low Earth orbit either side of an event, at normal speed)', 30, false],
    ['a lap in 21 seconds', 21, false],
    ['a lap in 19 seconds', 19, true],
    ['a lap in 8.8 seconds (once called "better" than 4.4, since still too fast)', 8.8, true],
    ['a lap in 4.4 seconds', 4.4, true],
  ])('draws the craft or its ring for %s, starting from the craft', (_name, seconds, ring) => {
    expect(inFastForward(lapIn(seconds), false)).toBe(ring);
  });

  it.each([
    ['a lap in 19 seconds', 19, true],
    ['a lap in 23.5 seconds', 23.5, true],
    ['a lap in 24.5 seconds', 24.5, false],
    ['a stopped clock', Infinity, false],
  ])(
    'keeps the ring or goes back to the craft for %s, starting from the ring',
    (_name, seconds, ring) => {
      expect(inFastForward(lapIn(seconds), true)).toBe(ring);
    },
  );

  it("matches the story clock's own figures for a calm craft", () => {
    // The clock plays a stretch evenly, and a parting or docking approach at no more than a pace,
    // at which a craft laps once in the scene's slower threshold: drawn, and never between the two.
    expect(CALM_LAP_STORY_SECONDS).toBe(FAST_FORWARD_OFF_LAP_SECONDS);
    // On no closed lap, where no ring can stand in, it keeps a craft slower than the faster one.
    expect(SWING_LAP_STORY_SECONDS).toBeGreaterThan(FAST_FORWARD_ON_LAP_SECONDS);
    // Either side of an event, a low Earth orbit is drawn, slower than either threshold.
    const lapAtTheEvents = PLAIN_ORBIT_SECONDS / EASE_GENTLE_PACE;
    expect(inFastForward(lapIn(lapAtTheEvents), true)).toBe(false);
    expect(lapAtTheEvents).toBeGreaterThan(FAST_FORWARD_OFF_LAP_SECONDS);
  });
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
