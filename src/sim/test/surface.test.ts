/**
 * Where the craft the story follows rests on a surface (staysOnSurface),
 * and whether nothing it does moves between two moments (stillBetween): the
 * rule by which an every-event tour turns straight to the next stop.
 */
import { describe, expect, it } from 'vitest';
import { flight as apollo8Flight } from '../../content/missions/apollo-8/flight.ts';
import { flight as apollo11Flight } from '../../content/missions/apollo-11/flight.ts';
import { flight as apollo13Flight } from '../../content/missions/apollo-13/flight.ts';
import { flight as apollo17Flight } from '../../content/missions/apollo-17/flight.ts';
import { flight as gemini3Flight } from '../../content/missions/gemini-3/flight.ts';
import { elapsedToSeconds } from '../../content/types.ts';
import { buildFlightPath } from '../build.ts';
import { stillBetween, staysOnSurface, type Stay } from '../surface.ts';
import type { FlightPlan } from '../types.ts';

const staysOf = (plan: FlightPlan): Stay[] => staysOnSurface(buildFlightPath(plan));

describe('staysOnSurface', () => {
  it.each([
    ['Apollo 11: Eagle at Tranquility Base', apollo11Flight, '102:45:39.9', '124:22:00.79'],
    ['Apollo 17: Challenger at Taurus-Littrow', apollo17Flight, '110:21:57', '185:21:37'],
  ] as const)('is the lander from its landing to its liftoff (%s)', (_name, plan, from, to) => {
    expect(staysOf(plan)).toEqual([{ start: elapsedToSeconds(from), end: elapsedToSeconds(to) }]);
  });

  it.each([
    ['a flight with no lander (Apollo 8)', apollo8Flight],
    ['a lander that never lands (Apollo 13)', apollo13Flight],
    ['a capsule floating after splashdown, with no lander (Gemini 3)', gemini3Flight],
  ] as const)('is none for %s', (_name, plan) => {
    expect(staysOf(plan)).toEqual([]);
  });
});

describe('stillBetween', () => {
  const stays: Stay[] = [{ start: 1000, end: 5000 }];

  it.each([
    ['two moments inside a stay', 2000, 3000, true],
    ['the same two, the other way round', 3000, 2000, true],
    ['the stay from end to end', 1000, 5000, true],
    ['a hair outside its ends, as the story clock reads them back', 999.9995, 5000.0005, true],
    ['from before the landing', 900, 3000, false],
    ['to after the liftoff', 3000, 5100, false],
    ['across two stays', 2000, 7000, false],
  ] as const)('%s: %s', (_name, a, b, still) => {
    expect(stillBetween([...stays, { start: 6000, end: 8000 }], a, b)).toBe(still);
  });

  it('is never true with no stays', () => {
    expect(stillBetween([], 2000, 3000)).toBe(false);
  });
});
