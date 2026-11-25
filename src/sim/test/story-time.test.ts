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
import { flight as gemini7Flight } from '../../content/missions/gemini-7/flight.ts';
import { story as gemini7 } from '../../content/missions/gemini-7/story.ts';
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
  EASE_FULL_PACE,
  EASE_GENTLE_PACE,
  EASE_RAMP_MISSION_SECONDS,
  EASE_SHOULDER_STORY_SECONDS,
  EASE_START_PACE,
  partingsAtEvents,
  storyIntervalLength,
  storyKeyTimes,
  type StoryTime,
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

/** Mission seconds per story second just after story time `at` (just before it, at the end of the clock). */
function paceAt(story: StoryTime, at: number): number {
  const step = 1e-4;
  const from = Math.min(at, story.length - step);
  return (story.toMission(from + step) - story.toMission(from)) / step;
}

/** A clock of one stretch of `interval` mission seconds played over `length` story seconds, whatever its mission length. */
function oneStretch(interval: number, length: number, ease = true): StoryTime {
  return createStoryTime([0, interval], { minSeconds: length, maxSeconds: length, ease });
}

/** The mission time of an Apollo 11 event, by its id. */
function apollo11Event(id: string): number {
  const event = apollo11.events.find((one) => one.id === id);
  if (!event) throw new Error(`Apollo 11 has no event "${id}"`);
  return elapsedToSeconds(event.elapsed);
}

/** Story seconds of two shoulders and two of the longest ramps (a ramp from the gentle pace lasts at most EASE_RAMP_MISSION_SECONDS / EASE_GENTLE_PACE). */
const longestEnds =
  2 * (EASE_SHOULDER_STORY_SECONDS + EASE_RAMP_MISSION_SECONDS / EASE_GENTLE_PACE);

/** A number rounded to thousandths, to compare a measured pace or time with the one expected. */
const toThousandths = (value: number): number => Math.round(value * 1000) / 1000;

/** Story seconds into a shoulder, on either side of an event. */
const intoTheShoulder = [0.25, 0.75, 1.25];

describe('a long stretch eased into and out of its ends', () => {
  it('plays the last moments before Apollo 11 enters lunar orbit, and the first after it leaves for home, at the gentle pace', () => {
    const story = createStoryTime(keysOf(apollo11Flight, apollo11).keys);
    const arrival = apollo11Event('lunar-orbit-insertion');
    const departure = apollo11Event('transearth-injection');

    const before = intoTheShoulder.map(
      (seconds) => arrival - story.toMission(story.toStory(arrival) - seconds),
    );
    const after = intoTheShoulder.map(
      (seconds) => story.toMission(story.toStory(departure) + seconds) - departure,
    );

    // Played evenly, each of those two stretches covers more than 13,000 mission seconds a story second.
    expect(before.map((seconds) => toThousandths(seconds / EASE_GENTLE_PACE))).toEqual(
      intoTheShoulder,
    );
    expect(after.map((seconds) => toThousandths(seconds / EASE_GENTLE_PACE))).toEqual(
      intoTheShoulder,
    );
  });

  it.each<[string, FlightPlan, Mission]>([
    ['Apollo 11', apollo11Flight, apollo11],
    ['Apollo 8', apollo8Flight, apollo8],
    ['Gemini 7', gemini7Flight, gemini7],
    ['Gemini 6A', gemini6aFlight, gemini6a],
  ])(
    'keeps every key of %s at its story second, and the flight its story length',
    (_name, plan, mission) => {
      const { keys } = keysOf(plan, mission);

      const eased = createStoryTime(keys);
      const even = createStoryTime(keys, { ease: false });

      expect(eased.keyTimes).toEqual(even.keyTimes);
      expect(eased.length).toBe(even.length);
      expect(eased.keyTimes.map((key) => eased.toStory(key))).toEqual(
        even.keyTimes.map((key) => even.toStory(key)),
      );
    },
  );

  it('only ever runs forward, and its two directions undo each other (Apollo 11)', () => {
    const story = createStoryTime(keysOf(apollo11Flight, apollo11).keys);
    const steps = 200_000;
    let backward = 0;
    let storyError = 0;
    let missionError = 0;
    let previous = -Infinity;

    for (let k = 0; k <= steps; k++) {
      const s = (story.length * k) / steps;
      const t = story.toMission(s);
      if (!(t > previous)) backward += 1;
      previous = t;
      storyError = Math.max(storyError, Math.abs(story.toStory(t) - s));
      missionError = Math.max(missionError, Math.abs(story.toMission(story.toStory(t)) - t));
    }

    expect(backward).toBe(0);
    expect(storyError).toBeLessThan(1e-9);
    expect(missionError).toBeLessThan(1e-6);
  });

  it.each([
    ['a day', 86_400],
    ['three days', 3 * 86_400],
    ['two weeks', 14 * 86_400],
  ])(
    'over %s, grows the pace past each shoulder with the square of the mission time, with no jump, and hurries the middle no more than about twice the even pace',
    (_name, interval) => {
      const story = createStoryTime([0, interval]);
      const step = 0.01;
      const paces = Array.from({ length: Math.floor(story.length / step) }, (_, k) =>
        paceAt(story, k * step),
      );
      const top = Math.max(...paces);
      const changes = paces.slice(1).map((pace, k) => Math.max(pace / paces[k]!, paces[k]! / pace));
      // A tenth and a half of a story second into the ramp: mission seconds past the shoulder.
      const intoTheRamp = [0.1, 0.5].map((seconds) => EASE_SHOULDER_STORY_SECONDS + seconds);
      const past = intoTheRamp.map(
        (at) => story.toMission(at) - EASE_GENTLE_PACE * EASE_SHOULDER_STORY_SECONDS,
      );

      expect(paces[0]).toBeCloseTo(EASE_GENTLE_PACE, 6);
      expect(paceAt(story, story.length)).toBeCloseTo(EASE_GENTLE_PACE, 6);
      // Measured against (1 + t / EASE_RAMP_MISSION_SECONDS)^2 times the gentle pace.
      expect(
        intoTheRamp.map((at, k) =>
          toThousandths(
            paceAt(story, at) /
              (EASE_GENTLE_PACE * (1 + past[k]! / EASE_RAMP_MISSION_SECONDS) ** 2),
          ),
        ),
      ).toEqual([1, 1]);
      // The pace changes fastest at the far end of a ramp, where it meets the middle's, and nowhere faster.
      const steepest = Math.exp(
        ((2 * Math.sqrt(top * EASE_GENTLE_PACE)) / EASE_RAMP_MISSION_SECONDS) * step,
      );
      expect(Math.max(...changes)).toBeLessThanOrEqual(steepest * (1 + 1e-6));
      expect(top / (interval / story.length)).toBeLessThan(2.25);
    },
  );

  it.each([
    [
      'a stretch already gentle: Apollo 11 from Columbia’s separation burn to the powered descent',
      createStoryTime(keysOf(apollo11Flight, apollo11).keys),
      createStoryTime(keysOf(apollo11Flight, apollo11).keys, { ease: false }),
      elapsedToSeconds('100:39:52.9'),
      apollo11Event('powered-descent'),
    ],
    [
      'a stretch at the start pace',
      oneStretch(EASE_START_PACE * 10, 10),
      oneStretch(EASE_START_PACE * 10, 10, false),
      0,
      EASE_START_PACE * 10,
    ],
    [
      'a stretch too short for two shoulders and two of the longest ramps',
      oneStretch(86_400, longestEnds),
      oneStretch(86_400, longestEnds, false),
      0,
      86_400,
    ],
  ])('plays %s evenly, exactly as before', (_name, eased, even, from, to) => {
    const start = even.toStory(from);
    const end = even.toStory(to);
    const at = Array.from({ length: 101 }, (_, k) => start + ((end - start) * k) / 100);

    expect(at.map((s) => eased.toMission(s))).toEqual(at.map((s) => even.toMission(s)));
  });

  it('eases a stretch just faster than the start pace for a moment only, and one at the full pace with whole shoulders', () => {
    const interval = EASE_START_PACE * 1.001 * 10;
    const justFaster = oneStretch(interval, 10);
    const justEven = oneStretch(interval, 10, false);
    const full = oneStretch(EASE_FULL_PACE * 10, 10);

    const apart = Math.max(
      ...Array.from({ length: 10_001 }, (_, k) =>
        Math.abs(justFaster.toMission(k / 1000) - justEven.toMission(k / 1000)),
      ),
    );

    // Just faster: the gentle pace for its first hundredth of a second, and never more than 0.2% of the stretch from even.
    expect(paceAt(justFaster, 0.005)).toBeCloseTo(EASE_GENTLE_PACE, 6);
    expect(apart / interval).toBeLessThan(0.002);
    expect(paceAt(full, EASE_SHOULDER_STORY_SECONDS - 0.01)).toBeCloseTo(EASE_GENTLE_PACE, 6);
    expect(paceAt(full, EASE_SHOULDER_STORY_SECONDS + 0.1)).toBeGreaterThan(EASE_GENTLE_PACE);
  });

  it('gives a stretch with less than a second of middle shorter shoulders', () => {
    // Half a second of room past two shoulders and two of the longest ramps: each end half its full length.
    const story = oneStretch(86_400, longestEnds + 0.5);
    const shoulder = EASE_SHOULDER_STORY_SECONDS / 2;

    expect(paceAt(story, shoulder - 0.01)).toBeCloseTo(EASE_GENTLE_PACE, 6);
    expect(paceAt(story, shoulder + 0.05)).toBeGreaterThan(EASE_GENTLE_PACE);
    expect(paceAt(story, story.length - shoulder + 0.01)).toBeCloseTo(EASE_GENTLE_PACE, 6);
  });
});
