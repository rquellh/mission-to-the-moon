/**
 * Which stretches of a craft's path are stays in orbit, faded lap by lap so
 * only the lap through the craft is drawn: each run of samples low over a
 * body that goes round it more than once. A swing past a body, a climb, or
 * a fall is drawn whole. The paths here are made of revolutions flown at
 * each sample, a tenth of a lap apart, and which samples are low.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_ORBIT_STAYS,
  ORBIT_STAY_REVOLUTIONS,
  orbitStays,
  sampleIndexAt,
  valueAtIndex,
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
