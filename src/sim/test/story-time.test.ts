import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { flight as apollo8Flight } from '../../content/missions/apollo-8/flight.ts';
import { story as apollo8 } from '../../content/missions/apollo-8/story.ts';
import { flight as apollo9Flight } from '../../content/missions/apollo-9/flight.ts';
import { story as apollo9 } from '../../content/missions/apollo-9/story.ts';
import { flight as apollo10Flight } from '../../content/missions/apollo-10/flight.ts';
import { story as apollo10 } from '../../content/missions/apollo-10/story.ts';
import { flight as apollo11Flight } from '../../content/missions/apollo-11/flight.ts';
import { story as apollo11 } from '../../content/missions/apollo-11/story.ts';
import { flight as apollo15Flight } from '../../content/missions/apollo-15/flight.ts';
import { story as apollo15 } from '../../content/missions/apollo-15/story.ts';
import { flight as apollo16Flight } from '../../content/missions/apollo-16/flight.ts';
import { story as apollo16 } from '../../content/missions/apollo-16/story.ts';
import { flight as apollo17Flight } from '../../content/missions/apollo-17/flight.ts';
import { story as apollo17 } from '../../content/missions/apollo-17/story.ts';
import { flight as gemini6aFlight } from '../../content/missions/gemini-6a/flight.ts';
import { story as gemini6a } from '../../content/missions/gemini-6a/story.ts';
import { flight as gemini8Flight } from '../../content/missions/gemini-8/flight.ts';
import { story as gemini8 } from '../../content/missions/gemini-8/story.ts';
import { flight as gemini10Flight } from '../../content/missions/gemini-10/flight.ts';
import { story as gemini10 } from '../../content/missions/gemini-10/story.ts';
import { flight as gemini12Flight } from '../../content/missions/gemini-12/flight.ts';
import { story as gemini12 } from '../../content/missions/gemini-12/story.ts';
import { elapsedToSeconds, type ElapsedTime, type Mission } from '../../content/types.ts';
import { buildFlightPath } from '../build.ts';
import {
  approachesAtEvents,
  createStoryTime,
  partingsAtEvents,
  storyIntervalLength,
  storyKeyTimes,
} from '../story-time.ts';
import type { FlightPlan } from '../types.ts';

/** Every phase boundary of every ship, as the timeline might pass them. */
const keyTimes = apollo11Flight.ships.flatMap((ship) =>
  ship.phases.flatMap((phase) => [
    elapsedToSeconds(phase.start.value),
    elapsedToSeconds(phase.end.value),
  ]),
);

describe('story time', () => {
  const story = createStoryTime(keyTimes);

  it('gives each interval a watchable length', () => {
    const keys = story.keyTimes;
    let total = 0;
    for (let i = 1; i < keys.length; i++) {
      const s = story.toStory(keys[i]!) - story.toStory(keys[i - 1]!);
      assert.ok(s >= 2 && s <= 14, `interval ${i} plays ${s.toFixed(2)} s`);
      total += s;
    }
    assert.ok(Math.abs(total - story.length) < 1e-9);
    assert.equal(storyIntervalLength(3 * 86_400), 14);
    assert.ok(storyIntervalLength(73 * 3600) <= 14);
    assert.ok(storyIntervalLength(1) < 2.1);
  });

  it('round-trips between mission time and story time', () => {
    const start = story.keyTimes[0]!;
    const end = story.keyTimes[story.keyTimes.length - 1]!;
    for (let k = 0; k <= 5000; k++) {
      const t = start + ((end - start) * k) / 5000;
      const back = story.toMission(story.toStory(t));
      assert.ok(Math.abs(back - t) < 1e-6 * Math.max(1, t), `round trip ${t} -> ${back}`);
    }
    for (let s = 0; s <= story.length; s += story.length / 997) {
      assert.ok(Math.abs(story.toStory(story.toMission(s)) - s) < 1e-9);
    }
  });

  it('is monotone and clamps outside the key times', () => {
    let prev = -Infinity;
    for (let t = -100; t < 800_000; t += 97) {
      const s = story.toStory(t);
      assert.ok(s >= prev);
      prev = s;
    }
    assert.equal(story.toStory(-1e9), 0);
    assert.equal(story.toStory(1e9), story.length);
    assert.equal(story.toMission(-5), story.keyTimes[0]);
  });

  it('accepts unsorted times with duplicates, and degenerate lists', () => {
    const a = createStoryTime([300, 100, 100, 200]);
    assert.deepEqual([...a.keyTimes], [100, 200, 300]);
    const empty = createStoryTime([]);
    assert.equal(empty.length, 0);
    assert.equal(empty.toStory(5), 0);
    const one = createStoryTime([42]);
    assert.equal(one.toMission(10), 42);
  });
});

/** The keys a flight's clock is built from, as main.ts builds them, and its event times. */
function keysOf(plan: FlightPlan, mission: Mission) {
  const events = mission.events.map((event) => elapsedToSeconds(event.elapsed));
  const path = buildFlightPath(plan);
  return { path, events, keys: storyKeyTimes(path, events) };
}

describe('partings at events', () => {
  it('find Eagle undocking from Columbia, with the end of its station keeping beside it (Apollo 11)', () => {
    const { path, events } = keysOf(apollo11Flight, apollo11);

    expect(partingsAtEvents(path, events)).toEqual([
      { start: elapsedToSeconds('100:12:00'), end: elapsedToSeconds('100:39:52.9') },
    ]);
  });

  it.each([
    ['a flight with no lander (Apollo 8)', apollo8Flight, apollo8],
    ['a lander that undocks with no event there (Apollo 16)', apollo16Flight, apollo16],
    ['a main ship that undocks into station keeping (Gemini 12)', gemini12Flight, gemini12],
  ])('find none for %s', (_name, plan, mission) => {
    const { path, events } = keysOf(plan, mission);

    expect(partingsAtEvents(path, events)).toEqual([]);
  });
});

describe('approaches at events', () => {
  it.each<[string, FlightPlan, Mission, ElapsedTime, ElapsedTime]>([
    [
      'Eagle closing in on Columbia, from the end of its braking burn (Apollo 11)',
      apollo11Flight,
      apollo11,
      '127:46:38.2',
      '128:03:00',
    ],
    [
      'a lunar module closing in, from the end of its terminal phase initiation burn (Apollo 10)',
      apollo10Flight,
      apollo10,
      '105:23:12.08',
      '106:22:02',
    ],
    [
      'a lunar module closing in, from when it was alongside (Apollo 9)',
      apollo9Flight,
      apollo9,
      '098:30:51.2',
      '099:02:26',
    ],
    [
      'Gemini keeping station beside the Agena (Gemini 10)',
      gemini10Flight,
      gemini10,
      '005:15:00',
      '005:52:37.1',
    ],
    [
      'Gemini keeping station from the event that marks it (Gemini 8)',
      gemini8Flight,
      gemini8,
      '005:56:56',
      '006:33:16',
    ],
  ])('find %s', (_name, plan, mission, start, end) => {
    const { path, events } = keysOf(plan, mission);

    expect(approachesAtEvents(path, events)).toEqual([
      { start: elapsedToSeconds(start), end: elapsedToSeconds(end) },
    ]);
  });

  it.each([
    ['a flight with no docking (Apollo 8)', apollo8Flight, apollo8],
    ['a docking with no event there (Apollo 16)', apollo16Flight, apollo16],
    ['a rendezvous with no docking (Gemini 6A)', gemini6aFlight, gemini6a],
  ])('find none for %s', (_name, plan, mission) => {
    const { path, events } = keysOf(plan, mission);

    expect(approachesAtEvents(path, events)).toEqual([]);
  });
});

describe('story keys', () => {
  it('give the final approach to a docking at an event a calm stretch of its own (Apollo 11)', () => {
    const { keys } = keysOf(apollo11Flight, apollo11);
    const approach = elapsedToSeconds('127:46:38.2');
    const docking = elapsedToSeconds('128:03:00');
    const story = createStoryTime(keys);
    const storySeconds = story.toStory(docking) - story.toStory(approach);

    expect(story.keyTimes).toContain(approach);
    expect(storySeconds).toBeCloseTo(storyIntervalLength(docking - approach));
    // Six story seconds for sixteen minutes: about a tenth of a lap of the Moon (two hours).
    expect(storySeconds).toBeGreaterThan(6);
  });

  it('add only the end of the undocking and the start of the docking to Apollo 11', () => {
    const { path, events, keys } = keysOf(apollo11Flight, apollo11);

    expect(keys).toEqual([
      path.start,
      path.end,
      ...events,
      elapsedToSeconds('100:39:52.9'),
      elapsedToSeconds('127:46:38.2'),
    ]);
  });

  it.each([
    ['Apollo 9', apollo9Flight, apollo9],
    ['Apollo 10', apollo10Flight, apollo10],
    ['Apollo 11', apollo11Flight, apollo11],
    ['Apollo 15', apollo15Flight, apollo15],
    ['Apollo 17', apollo17Flight, apollo17],
    ['Gemini 10', gemini10Flight, gemini10],
    ['Gemini 12', gemini12Flight, gemini12],
  ])('lengthen %s by 6 to 7.5 story seconds, for its docking', (_name, plan, mission) => {
    const { path, events, keys } = keysOf(plan, mission);
    const without = keys.filter(
      (key) => !approachesAtEvents(path, events).some((one) => one.start === key),
    );

    const added = createStoryTime(keys).length - createStoryTime(without).length;

    expect(added).toBeGreaterThan(5.9);
    expect(added).toBeLessThan(7.5);
  });

  it('add no key where an event already marks the final approach (Gemini 8)', () => {
    const { path, events, keys } = keysOf(gemini8Flight, gemini8);

    expect(createStoryTime(keys).keyTimes).toEqual(
      createStoryTime([path.start, path.end, ...events]).keyTimes,
    );
  });

  it('give a lander flying beside the ship it undocked from, at an event, a stretch of its own', () => {
    const { path, keys } = keysOf(apollo11Flight, apollo11);
    const beside = path.ships.find((ship) => ship.role === 'lander')?.phases[0];
    const undocking = elapsedToSeconds('100:12:00');
    const apart = elapsedToSeconds('100:39:52.9');
    const story = createStoryTime(keys);

    expect(beside).toMatchObject({ kind: 'station', target: 'csm' });
    expect(story.keyTimes).toContain(apart);
    expect(story.toStory(apart) - story.toStory(undocking)).toBeCloseTo(
      storyIntervalLength(apart - undocking),
    );
  });

  it('add nothing for a lander that undocks and docks with no event there (Apollo 16)', () => {
    const { path, events, keys } = keysOf(apollo16Flight, apollo16);

    expect(keys).toEqual([path.start, path.end, ...events]);
  });

  it('add no key for a main ship that undocks into station keeping, only for its docking (Gemini 12)', () => {
    const { path, events, keys } = keysOf(gemini12Flight, gemini12);

    expect(keys).toEqual([path.start, path.end, ...events, elapsedToSeconds('003:46:00')]);
  });
});
