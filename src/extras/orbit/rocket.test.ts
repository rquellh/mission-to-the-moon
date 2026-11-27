/**
 * The rocket "Fly to orbit" flies, read from a flight's own files: its
 * stages from what stood on the pad, the ones the player drops with every
 * part that goes with each, and the real event the end of a climb tells.
 * Every flight is checked in src/sim/test/all-missions.test.ts; these are
 * the three rockets, the flight whose stages once read wrong, and the edges
 * no flight has.
 *
 * Run: npx vitest run src/extras/orbit/rocket.test.ts
 */
import { describe, expect, it } from 'vitest';
import { bundle as apollo7 } from '../../content/missions/apollo-7/index.ts';
import { bundle as apollo11 } from '../../content/missions/apollo-11/index.ts';
import { bundle as apollo12 } from '../../content/missions/apollo-12/index.ts';
import type { MissionBundle } from '../../content/missions/bundle.ts';
import { bundle as gemini8 } from '../../content/missions/gemini-8/index.ts';
import { bundle as gemini12 } from '../../content/missions/gemini-12/index.ts';
import { realEnd, rocketFrom } from './rocket.ts';

/** Apollo 11 with no vehicle file, so its files show no climb (every real flight has one). */
const withoutAVehicle: MissionBundle = { ...apollo11, vehicle: [] };

/** Apollo 12, whose story has no event at orbit insertion, without its liftoff either (every real flight has one). */
const withoutLiftoff: MissionBundle = {
  ...apollo12,
  mission: {
    ...apollo12.mission,
    events: apollo12.mission.events.filter((event) => event.id !== 'liftoff'),
  },
};

/** How many stages the rocket has, and the parts that go with each stage the player drops. */
function shapeOf(bundle: MissionBundle) {
  const rocket = rocketFrom(bundle);
  return rocket && { stages: rocket.stages, drops: rocket.drops.map(({ parts }) => parts) };
}

/** The event the end of a climb tells, by id, and whether it is the one at orbit insertion. */
function endOf(bundle: MissionBundle) {
  const rocket = rocketFrom(bundle);
  const end = rocket && realEnd(rocket);
  return end && { event: end.event.id, atOrbit: end.atOrbit };
}

describe('rocketFrom', () => {
  it.each([
    [
      "Apollo 11's Saturn V: three stages, with the ring and the escape tower going with the first",
      apollo11,
      { stages: 3, drops: [['first-stage', 'aft-interstage', 'escape-tower'], ['second-stage']] },
    ],
    [
      "Apollo 7's Saturn IB: two stages, with the escape tower going with the first",
      apollo7,
      { stages: 2, drops: [['saturn-ib-first-stage', 'escape-tower']] },
    ],
    ["Gemini 8's Titan II: two stages", gemini8, { stages: 2, drops: [['titan-first-stage']] }],
    [
      "Gemini 12's Titan II: two stages, though its orbit came 73 seconds after the second let go",
      gemini12,
      { stages: 2, drops: [['titan-first-stage']] },
    ],
  ])('reads %s', (_name, bundle, expected) => {
    expect(shapeOf(bundle)).toEqual(expected);
  });

  it('reads no rocket from files that show no climb', () => {
    expect(rocketFrom(withoutAVehicle)).toBeNull();
  });
});

describe('realEnd', () => {
  it.each([
    [
      'the event at orbit insertion, when the story has one',
      apollo11,
      { event: 'earth-orbit-insertion', atOrbit: true },
    ],
    [
      'the liftoff, when the story has no event at orbit',
      apollo12,
      { event: 'liftoff', atOrbit: false },
    ],
  ])('tells %s', (_name, bundle, expected) => {
    expect(endOf(bundle)).toEqual(expected);
  });

  it('tells nothing when the story has neither', () => {
    expect(endOf(withoutLiftoff)).toBeNull();
  });
});
