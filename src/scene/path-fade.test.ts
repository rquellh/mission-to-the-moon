/**
 * Which stretches of a craft's path are stays in orbit, faded lap by lap so
 * only the lap through the craft is drawn: each run of samples low over a
 * body that goes round it more than once. A swing past a body, a climb, or
 * a fall is drawn whole. The paths here are made of revolutions flown at
 * each sample, a tenth of a lap apart, and which samples are low.
 */
import { describe, expect, it } from 'vitest';
import { EARTH_MEAN_RADIUS_KM, MOON_MEAN_RADIUS_KM } from '../content/physical-constants.ts';
import {
  MAX_ORBIT_STAYS,
  ORBIT_STAY_REVOLUTIONS,
  orbitStays,
  MOON_CLOSEST_KM,
  RETURN_EARTH_RADII,
  RETURN_MOON_RADII,
  returnFade,
  returnStarts,
  sampleIndexAt,
  stayAt,
  valueAtIndex,
  WAY_BACK_REVOLUTIONS,
  WAY_DIM_REVOLUTIONS,
  wayDimming,
} from './path-fade.ts';

/** A path of `stretches`, each `laps` long, low over a body or not. */
function path(...stretches: Array<[laps: number, low: boolean]>) {
  const revolutions: number[] = [];
  const low: boolean[] = [];
  let flown = 0;
  for (const [laps, isLow] of stretches) {
    const samples = Math.round(laps * 10);
    for (let i = 0; i < samples; i += 1) {
      revolutions.push(flown);
      low.push(isLow);
      flown += 0.1;
    }
  }
  return { revolutions, low };
}

describe('orbitStays', () => {
  it("finds a Moon flight's parking orbit round Earth and its stay at the Moon", () => {
    const flight = path([1.5, true], [0.4, false], [30, true], [0.4, false]);

    expect(orbitStays(flight.revolutions, flight.low)).toEqual([
      [0, 14],
      [19, 318],
    ]);
  });

  it('leaves a swing past a body, under a lap, drawn whole', () => {
    const flyby = path([0.5, false], [0.6, true], [0.5, false]);

    expect(orbitStays(flyby.revolutions, flyby.low)).toEqual([]);
  });

  it('counts a stay once it goes round more than once', () => {
    const justOver = path([ORBIT_STAY_REVOLUTIONS + 0.2, true], [0.5, false]);
    const justUnder = path([ORBIT_STAY_REVOLUTIONS - 0.1, true], [0.5, false]);

    expect(orbitStays(justOver.revolutions, justOver.low)).toHaveLength(1);
    expect(orbitStays(justUnder.revolutions, justUnder.low)).toEqual([]);
  });

  it('finds a stay that runs to the end of the path', () => {
    const lastStay = path([0.5, false], [3, true]);

    expect(orbitStays(lastStay.revolutions, lastStay.low)).toEqual([[5, 34]]);
  });

  it(`keeps at most ${MAX_ORBIT_STAYS} stays, the first ones`, () => {
    const many = path(
      ...Array.from({ length: MAX_ORBIT_STAYS + 2 }, (): Array<[number, boolean]> => [
        [2, true],
        [0.5, false],
      ]).flat(),
    );

    const stays = orbitStays(many.revolutions, many.low);

    expect(stays).toHaveLength(MAX_ORBIT_STAYS);
    expect(stays[0]).toEqual([0, 19]);
  });
});

describe('stayAt', () => {
  const stays = [
    [0, 14],
    [19, 318],
  ] as const;

  it.each([
    ['in the parking orbit', 7.5, 0],
    ['on the last sample of a stay', 14, 0],
    ['between two stays', 16.5, -1],
    ['at the Moon', 200, 1],
    ['after the last stay', 320, -1],
  ])('finds the stay a craft is in %s', (_name, index, stay) => {
    expect(stayAt(stays, index)).toBe(stay);
  });
});

describe('wayDimming', () => {
  // A parking orbit round Earth (samples 0 to 14), the coast, and a stay at the Moon (19 to 318).
  const flight = path([1.5, true], [0.4, false], [30, true], [0.4, false]);
  const stays = orbitStays(flight.revolutions, flight.low);

  it('dims nothing while the craft is in the stay its path begins with', () => {
    expect(wayDimming(stays, flight.revolutions, 7).before).toBe(0);
  });

  it('leaves the way in bright as the craft arrives in orbit', () => {
    expect(wayDimming(stays, flight.revolutions, 20)).toEqual({ before: 19, dim: 0 });
  });

  it(`dims all of the way in once the craft is ${WAY_DIM_REVOLUTIONS[1]} of a lap into the stay`, () => {
    const index = 19 + WAY_DIM_REVOLUTIONS[1] * 10;

    expect(wayDimming(stays, flight.revolutions, index)).toEqual({
      before: 19,
      dim: expect.closeTo(1, 6),
    });
    expect(wayDimming(stays, flight.revolutions, 200)).toEqual({ before: 19, dim: 1 });
  });

  it('brings it back as the craft leaves, a little at a time', () => {
    const leaving = wayDimming(stays, flight.revolutions, 320);
    const gone = wayDimming(stays, flight.revolutions, 318 + WAY_BACK_REVOLUTIONS * 10);

    expect(leaving.dim).toBeGreaterThan(0.1);
    expect(leaving.dim).toBeLessThan(0.9);
    expect(gone.dim).toBe(0);
  });
});

describe('reading a path between its samples', () => {
  const times = [0, 10, 30];

  it.each([
    ['before the first sample', -1, -1],
    ['at the first', 0, 0],
    ['between two', 20, 1.5],
    ['after the last', 40, 2],
  ])('finds the sample index %s', (_name, t, index) => {
    expect(sampleIndexAt(times, t)).toBe(index);
  });

  it.each([
    ['before the first sample', -1, 0],
    ['between two', 1.5, 1.5],
    ['after the last', 5, 3],
  ])('reads a value %s, held to the ends', (_name, index, value) => {
    expect(valueAtIndex([0, 1, 2, 3], index)).toBe(value);
  });
});

describe('returnStarts', () => {
  // 0 near neither body, 1 Earth, 2 the Moon.
  it('marks a return to Earth from the first sample back near it', () => {
    expect(Array.from(returnStarts([1, 1, 0, 2, 2, 0, 1, 1]))).toEqual([
      -1, -1, -1, -1, -1, -1, 6, 6,
    ]);
  });

  it('leaves a flight that never leaves Earth alone', () => {
    expect(Array.from(returnStarts([1, 1, 1, 1]))).toEqual([-1, -1, -1, -1]);
  });

  it('leaves a single swing round the Moon alone', () => {
    expect(Array.from(returnStarts([1, 0, 2, 2, 0, 1]))).toEqual([-1, -1, -1, -1, -1, 5]);
  });

  it('counts a body left for the other and come straight back to', () => {
    expect(Array.from(returnStarts([1, 2, 1]))).toEqual([-1, -1, 2]);
  });
});

describe('returnFade', () => {
  it.each([
    ['Earth', RETURN_EARTH_RADII],
    ['the Moon', RETURN_MOON_RADII],
  ])('comes in as the craft comes back to %s, none far out and all of it close in', (_, zone) => {
    const [near, full] = zone;
    expect(returnFade(near, zone)).toBe(0);
    expect(returnFade(near + 5, zone)).toBe(0);
    expect(returnFade(full, zone)).toBe(1);
    expect(returnFade(1, zone)).toBe(1);
    const middle = returnFade((near + full) / 2, zone);
    expect(middle).toBeGreaterThan(0.3);
    expect(middle).toBeLessThan(0.7);
  });

  it("keeps Earth's zone apart from the Moon's however near the Moon comes", () => {
    const earth = RETURN_EARTH_RADII[0] * EARTH_MEAN_RADIUS_KM;
    const moon = RETURN_MOON_RADII[0] * MOON_MEAN_RADIUS_KM;
    expect(earth + moon).toBeLessThan(MOON_CLOSEST_KM);
  });
});
