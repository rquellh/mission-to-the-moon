/**
 * Where a craft lets go of a part at one of the flight's events
 * (dropsAtEvents), read from the vehicle file: the stops an every-event tour
 * rests just after, so the part is seen falling away.
 */
import { describe, expect, it } from 'vitest';
import { bundle as apollo9 } from '../content/missions/apollo-9/index.ts';
import { bundle as apollo11 } from '../content/missions/apollo-11/index.ts';
import type { MissionBundle } from '../content/missions/bundle.ts';
import { bundle as gemini3 } from '../content/missions/gemini-3/index.ts';
import { elapsedToSeconds } from '../content/types.ts';
import { dropsAtEvents } from './drops.ts';

/** The ids of the events at which the flight lets go of a part. */
function dropsOf(bundle: MissionBundle): string[] {
  const times = bundle.mission.events.map((event) => elapsedToSeconds(event.elapsed));
  return dropsAtEvents(bundle, times).map((time) => bundle.mission.events[times.indexOf(time)]!.id);
}

describe('dropsAtEvents', () => {
  it('finds each stage and module let go at an event (Apollo 11)', () => {
    expect(dropsOf(apollo11)).toEqual([
      'first-stage-separation',
      'lm-extraction',
      'ascent-stage-jettison',
      'cm-sm-separation',
    ]);
  });

  it('leaves out parts another ship takes on (Eagle undocking), parts left on the Moon (its liftoff), and parachutes opening', () => {
    const ids = dropsOf(apollo11);

    for (const id of ['undocking', 'lunar-liftoff', 'docking', 'parachutes'])
      expect(ids).not.toContain(id);
  });

  it("finds a lander's two stages let go in Earth orbit (Apollo 9)", () => {
    expect(dropsOf(apollo9)).toEqual(['descent-stage-jettison', 'ascent-stage-jettison']);
  });

  it('finds none where a part comes off at no event (Gemini 3)', () => {
    expect(dropsOf(gemini3)).toEqual([]);
  });

  it('finds none when no event is at the change', () => {
    expect(dropsAtEvents(apollo11, [])).toEqual([]);
  });
});
