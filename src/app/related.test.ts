/**
 * What the end of a flight suggests: the next flight to fly, a hands-on
 * extra, and an extra to explore, and how many flights are collected (the
 * numbers the patch book shows too). And what the end of a run in a
 * hands-on extra suggests: the other hands-on extra. How the ending shows
 * them is in src/ui/ending.test.ts, and "Up next" in src/ui/extra-sheet.test.ts.
 *
 * Run: npx vitest run src/app/related.test.ts
 */
import { describe, expect, it } from 'vitest';
import { summary as apollo1 } from '../content/missions/apollo-1/summary.ts';
import { summary as apollo7 } from '../content/missions/apollo-7/summary.ts';
import { story as apollo11Story } from '../content/missions/apollo-11/story.ts';
import { summary as apollo11 } from '../content/missions/apollo-11/summary.ts';
import { story as apollo12Story } from '../content/missions/apollo-12/story.ts';
import { summary as apollo12 } from '../content/missions/apollo-12/summary.ts';
import { summary as apollo13 } from '../content/missions/apollo-13/summary.ts';
import { summary as apollo17 } from '../content/missions/apollo-17/summary.ts';
import { summary as gemini3 } from '../content/missions/gemini-3/summary.ts';
import { story as gemini8Story } from '../content/missions/gemini-8/story.ts';
import { summary as gemini8 } from '../content/missions/gemini-8/summary.ts';
import { story as gemini11Story } from '../content/missions/gemini-11/story.ts';
import { summary as gemini12 } from '../content/missions/gemini-12/summary.ts';
import type { MissionSummary } from '../content/types.ts';
import { meta as docking } from '../extras/docking/meta.ts';
import { meta as landingSites } from '../extras/landing-sites/meta.ts';
import { meta as landing } from '../extras/landing/meta.ts';
import { meta as orbit } from '../extras/orbit/meta.ts';
import { meta as patches } from '../extras/patches/meta.ts';
import { meta as rockets } from '../extras/rockets/meta.ts';
import { meta as stages } from '../extras/stages/meta.ts';
import { explorePick, flightsCollected, handsOnPick, nextFlight, otherHandsOn } from './related.ts';

/** Part of the real mission list, in its date order, with the memorial among the flights. */
const LIST: readonly MissionSummary[] = [
  gemini3,
  gemini8,
  gemini12,
  apollo1,
  apollo7,
  apollo11,
  apollo12,
  apollo13,
  apollo17,
];

/** The real extras list, in its order: hands-on first. */
const EXTRAS = [orbit, stages, docking, landing, patches, landingSites, rockets];

describe('nextFlight', () => {
  it.each([
    ['the next one by date', apollo11, ['apollo-11'], 'apollo-12'],
    ['past the ones already collected', apollo11, ['apollo-11', 'apollo-12'], 'apollo-13'],
    ['past the memorial, which is not a flight', gemini12, ['gemini-12'], 'apollo-7'],
    [
      'the earliest one left, after the last flight',
      apollo17,
      ['gemini-3', 'apollo-17'],
      'gemini-8',
    ],
    [
      'the earliest one left, when every one after it is collected',
      apollo12,
      ['apollo-12', 'apollo-13', 'apollo-17'],
      'gemini-3',
    ],
    ['never this flight, even before it is collected', apollo17, [], 'gemini-3'],
  ])('suggests %s', (_name, current, collected, expected) => {
    expect(nextFlight(LIST, current, new Set(collected))?.id).toBe(expected);
  });

  it('suggests no flight once every flight is collected', () => {
    const everyFlight = LIST.flatMap((summary) => (summary.kind === 'flight' ? [summary.id] : []));

    expect(nextFlight(LIST, apollo11, new Set(everyFlight))).toBeNull();
  });
});

describe('handsOnPick', () => {
  it.each([
    ['a flight that names only its liftoff', apollo12Story, EXTRAS, 'stages', 'liftoff'],
    [
      'a flight with a docking, rather than its liftoff',
      gemini8Story,
      EXTRAS,
      'docking',
      'docking',
    ],
    ['the docking named on a rendezvous', gemini11Story, EXTRAS, 'docking', 'rendezvous'],
    [
      'the liftoff, when the docking is not listed',
      gemini8Story,
      [stages, rockets],
      'stages',
      'liftoff',
    ],
  ])('picks %s', (_name, mission, extras, extra, event) => {
    const pick = handsOnPick(mission, extras);

    expect(pick?.extra.id).toBe(extra);
    expect(pick?.event.id).toBe(event);
  });

  it('picks none when the flight names no listed hands-on extra', () => {
    expect(handsOnPick(apollo11Story, [docking, patches, rockets])).toBeNull();
  });
});

describe('otherHandsOn', () => {
  it.each([
    ['Fly to orbit after the stages', 'stages', EXTRAS, 'orbit'],
    ['the stages after Fly to orbit', 'orbit', EXTRAS, 'stages'],
    [
      'the first hands-on extra listed, never an extra to explore',
      'patches',
      [patches, rockets, docking, stages],
      'docking',
    ],
  ])('picks %s', (_name, current, extras, expected) => {
    expect(otherHandsOn(current, extras)?.id).toBe(expected);
  });

  it('picks none when this is the only hands-on extra listed', () => {
    expect(otherHandsOn('stages', [stages, patches, landingSites, rockets])).toBeNull();
  });
});

describe('explorePick', () => {
  it.each([
    ['the extra about a flight that landed', 'apollo-11', EXTRAS, 'landing-sites'],
    [
      'the rockets for the flight that was meant to land and did not',
      'apollo-13',
      EXTRAS,
      'rockets',
    ],
    ['the rockets for a flight in Earth orbit', 'gemini-8', EXTRAS, 'rockets'],
    [
      'the first explore extra listed when the rockets are not',
      'gemini-8',
      [stages, patches, landingSites],
      'patches',
    ],
  ])('picks %s', (_name, missionId, extras, expected) => {
    expect(explorePick(missionId, extras)?.id).toBe(expected);
  });

  it('picks none when no explore extra is listed', () => {
    expect(explorePick('apollo-11', [stages, docking])).toBeNull();
  });
});

describe('flightsCollected', () => {
  it('counts the listed flights, leaving out the memorial and anything not listed', () => {
    const visited = new Set(['apollo-11', 'gemini-8', 'apollo-1', 'apollo-99']);

    expect(flightsCollected(LIST, visited)).toEqual({ collected: 2, total: 8 });
  });
});
