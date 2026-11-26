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
import { flight as apollo12Flight } from '../../content/missions/apollo-12/flight.ts';
import { story as apollo12 } from '../../content/missions/apollo-12/story.ts';
import { flight as apollo15Flight } from '../../content/missions/apollo-15/flight.ts';
import { story as apollo15 } from '../../content/missions/apollo-15/story.ts';
import { flight as apollo16Flight } from '../../content/missions/apollo-16/flight.ts';
import { story as apollo16 } from '../../content/missions/apollo-16/story.ts';
import { flight as apollo17Flight } from '../../content/missions/apollo-17/flight.ts';
import { story as apollo17 } from '../../content/missions/apollo-17/story.ts';
import { flight as gemini4Flight } from '../../content/missions/gemini-4/flight.ts';
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
  CALM_LAP_STORY_SECONDS,
  createStoryTime,
  EASE_GENTLE_PACE,
  EASE_MAX_HURRY,
  EASE_RAMP_MISSION_SECONDS,
  EASE_SHOULDER_MIN_STORY_SECONDS,
  EASE_SHOULDER_STORY_SECONDS,
  EASE_START_PACE,
  onNoClosedLap,
  partingsAtEvents,
  PLAIN_ORBIT_SECONDS,
  storyIntervalLength,
  storyKeyTimes,
  SWING_LAP_STORY_SECONDS,
  type StoryKeys,
  type StoryTime,
  type Turns,
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

  it('gives each interval a watchable length, and plays no interval shorter than that', () => {
    const even = createStoryTime(keyTimes, { ease: false });
    const keys = story.keyTimes;
    let total = 0;
    for (let i = 1; i < keys.length; i++) {
      const s = even.toStory(keys[i]!) - even.toStory(keys[i - 1]!);
      assert.ok(s >= 2 && s <= 14, `interval ${i} plays ${s.toFixed(2)} s`);
      total += s;
      const played = story.toStory(keys[i]!) - story.toStory(keys[i - 1]!);
      assert.ok(played >= s - 1e-9, `interval ${i} plays ${played.toFixed(2)} s, under ${s}`);
    }
    assert.ok(Math.abs(total - even.length) < 1e-9);
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

/** The mission time of a flight's event, by its id. */
function eventOf(mission: Mission, id: string): number {
  const event = mission.events.find((one) => one.id === id);
  if (!event) throw new Error(`${mission.name} has no event "${id}"`);
  return elapsedToSeconds(event.elapsed);
}

/** The mission time of an Apollo 11 event, by its id. */
const apollo11Event = (id: string): number => eventOf(apollo11, id);

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

  it('add only the end of the undocking and the start of the docking to Apollo 11, and hold both', () => {
    const { path, events, keys } = keysOf(apollo11Flight, apollo11);
    const apart = elapsedToSeconds('100:39:52.9');
    const approach = elapsedToSeconds('127:46:38.2');

    expect(keys.times).toEqual([path.start, path.end, ...events, apart, approach]);
    expect(keys.held).toEqual([
      [apollo11Event('undocking'), apart],
      [approach, apollo11Event('docking')],
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
    const without = keys.times.filter(
      (key) => !approachesAtEvents(path, events).some((one) => one.start === key),
    );

    // Played evenly: the key's own share, before the approach is held to a calm pace (see below).
    const added =
      createStoryTime(keys, { ease: false }).length -
      createStoryTime(without, { ease: false }).length;

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

    expect(keys.times).toEqual([path.start, path.end, ...events]);
    expect(keys.held).toEqual([]);
  });

  it('add no key for a main ship that undocks into station keeping, only for its docking (Gemini 12)', () => {
    const { path, events, keys } = keysOf(gemini12Flight, gemini12);

    expect(keys.times).toEqual([path.start, path.end, ...events, elapsedToSeconds('003:46:00')]);
  });
});

describe("the craft's turning", () => {
  it('counts a transfer between Earth and the Moon, and the entry it leads into, as on no closed lap', () => {
    const csm = apollo8Flight.ships.find((ship) => ship.id === 'csm')!;
    const kinds = csm.phases.map((phase, k) => [phase.kind, onNoClosedLap(csm.phases, k)]);
    const gemini = gemini4Flight.ships[0]!;

    expect(kinds).toContainEqual(['transfer', true]);
    expect(kinds).toContainEqual(['entry', true]);
    expect(kinds).toContainEqual(['orbit', false]);
    expect(kinds).toContainEqual(['burn', false]);
    // Entering from Earth orbit, the craft closes on the lap before.
    expect(gemini.phases.map((_phase, k) => onNoClosedLap(gemini.phases, k))).not.toContain(true);
  });

  it('reads a low lunar orbit at about one lap in two hours, the docked lander riding with its ship (Apollo 11)', () => {
    const { keys } = keysOf(apollo11Flight, apollo11);
    const turns = keys.turns!;
    // Docked again, an hour before the ascent stage is let go.
    const docked = apollo11Event('ascent-stage-jettison') - 3600;
    const coasting = apollo11Event('transearth-injection') + 20 * 3600;

    expect(1 / turns.rate(docked)).toBeGreaterThan(6800);
    expect(1 / turns.rate(docked)).toBeLessThan(7400);
    expect(turns.openRate(docked)).toBe(0);
    // Twenty hours on the way home: on no closed lap, and slow.
    expect(turns.openRate(coasting)).toBeGreaterThan(0);
    expect(turns.openRate(coasting)).toBe(turns.rate(coasting));
    expect(1 / turns.openRate(coasting)).toBeGreaterThan(30 * 86_400);
  });

  it('gives the times at which its rates change course, sorted, between the times asked', () => {
    const { keys } = keysOf(apollo11Flight, apollo11);
    const from = apollo11Event('lunar-orbit-insertion');
    const to = from + 3600;
    const samples = keys.turns!.samples(from, to);

    expect(samples.length).toBeGreaterThan(10);
    expect(samples.every((t, k) => t >= from && t <= to && (k === 0 || t > samples[k - 1]!))).toBe(
      true,
    );
  });
});

/** Mission seconds per story second just after story time `at` (just before it, at the end of the clock). */
function paceAt(story: StoryTime, at: number): number {
  const step = 1e-4;
  const from = Math.min(at, story.length - step);
  return (story.toMission(from + step) - story.toMission(from)) / step;
}

/** Mission seconds per story second at mission time `t`, from the story seconds either side of it. */
function paceAtMission(story: StoryTime, t: number): number {
  const h = 0.5;
  return (2 * h) / (story.toStory(t + h) - story.toStory(t - h));
}

/** Turning for a test: every craft on a closed lap of `orbit` mission seconds, or none at all. */
function steadyTurns(orbit: number): Turns {
  return { rate: () => 1 / orbit, openRate: () => 0, open: [], samples: () => [] };
}

/** A clock of one stretch of `interval` mission seconds played over `length` story seconds, whatever its mission length. */
function oneStretch(
  interval: number,
  length: number,
  ease = true,
  turns: Turns | undefined = undefined,
): StoryTime {
  const keys: StoryKeys = turns ? { times: [0, interval], turns } : { times: [0, interval] };
  return createStoryTime(keys, { minSeconds: length, maxSeconds: length, ease });
}

/** A number rounded to thousandths, to compare a measured pace or time with the one expected. */
const toThousandths = (value: number): number => Math.round(value * 1000) / 1000;

/** Story seconds into a shoulder, on either side of an event. */
const intoTheShoulder = [0.25, 0.75, 1.25];

/** Story seconds an eased stretch plays at the gentle pace from its start. */
function shoulderOf(story: StoryTime, start = 0): number {
  let y = 0;
  while (paceAt(story, start + y + 0.001) <= EASE_GENTLE_PACE * (1 + 1e-6)) y += 0.001;
  return y;
}

describe('which stretches are eased', () => {
  const story = createStoryTime(keysOf(apollo11Flight, apollo11).keys);
  const playOf = (from: number, to: number) =>
    story.stretches.find((one) => one.from === from && one.to === to)?.play;

  it.each([
    // Calm played evenly: the lander and its ship lap the Moon once in about 29 seconds.
    ['the two craft flying side by side after undocking', 'undocking', '100:39:52.9', 'held'],
    ['Eagle closing in on Columbia', '127:46:38.2', 'docking', 'held'],
    // Columbia laps the Moon once in about 30 seconds while the two walk.
    ['Aldrin joining Armstrong, to the flag', 'aldrin-on-surface', 'flag', 'even'],
    ['the powered descent', 'powered-descent', 'program-alarm', 'even'],
    // Played evenly, a craft would lap faster than once in 24 seconds from the start.
    ['the descent orbit, before the powered descent', '100:39:52.9', 'powered-descent', 'eased'],
    ['the Earth parking orbit', 'earth-orbit-insertion', 'translunar-injection', 'eased'],
    ['the hours after the landing', 'landing', 'first-step', 'eased'],
    // No craft laps there, but played evenly the coast would rush through its events.
    [
      'the coast to the first midcourse correction',
      'lm-extraction',
      'midcourse-correction',
      'eased',
    ],
  ])('plays %s of Apollo 11 %4$s', (_name, from, to, play) => {
    const at = (key: string) =>
      key.includes(':') ? elapsedToSeconds(key as ElapsedTime) : apollo11Event(key);

    expect(playOf(at(from), at(to))).toBe(play);
  });

  it('plays a stretch evenly at the pace where a low Earth orbit is calm, and eases one just faster, when it has no flight to read', () => {
    const calm = PLAIN_ORBIT_SECONDS / CALM_LAP_STORY_SECONDS;

    expect(oneStretch(calm * 10, 10).stretches[0]?.play).toBe('even');
    expect(oneStretch(calm * 1.01 * 10, 10).stretches[0]?.play).toBe('eased');
  });

  it('eases a stretch with no craft going round a body only past the start pace', () => {
    const none = steadyTurns(Infinity);

    expect(oneStretch(EASE_START_PACE * 10, 10, true, none).stretches[0]?.play).toBe('even');
    expect(oneStretch(EASE_START_PACE * 1.01 * 10, 10, true, none).stretches[0]?.play).toBe(
      'eased',
    );
  });

  it.each([
    [
      'the two craft flying side by side after undocking (Apollo 11)',
      createStoryTime(keysOf(apollo11Flight, apollo11).keys),
      createStoryTime(keysOf(apollo11Flight, apollo11).keys, { ease: false }),
      apollo11Event('undocking'),
      elapsedToSeconds('100:39:52.9'),
    ],
    [
      'Aldrin joining Armstrong, to the flag (Apollo 11)',
      createStoryTime(keysOf(apollo11Flight, apollo11).keys),
      createStoryTime(keysOf(apollo11Flight, apollo11).keys, { ease: false }),
      apollo11Event('aldrin-on-surface'),
      apollo11Event('flag'),
    ],
    [
      'a stretch at the calm pace for a low Earth orbit',
      oneStretch((PLAIN_ORBIT_SECONDS / CALM_LAP_STORY_SECONDS) * 10, 10),
      oneStretch((PLAIN_ORBIT_SECONDS / CALM_LAP_STORY_SECONDS) * 10, 10, false),
      0,
      (PLAIN_ORBIT_SECONDS / CALM_LAP_STORY_SECONDS) * 10,
    ],
  ])('plays %s evenly, exactly as the even clock does', (_name, eased, even, from, to) => {
    // From where each clock has the stretch start (stretches before it may play longer).
    const start = even.toStory(from);
    const end = even.toStory(to);
    const at = Array.from({ length: 101 }, (_, k) => ((end - start) * k) / 100);

    expect(eased.toStory(to) - eased.toStory(from)).toBeCloseTo(end - start, 9);
    expect(at.map((s) => toThousandths(eased.toMission(eased.toStory(from) + s)))).toEqual(
      at.map((s) => toThousandths(even.toMission(start + s))),
    );
  });
});

describe('a held stretch', () => {
  it('plays a docking approach that would be too fast evenly, at the pace where the two lap once in 24 seconds, and longer (Gemini 10)', () => {
    const { keys } = keysOf(gemini10Flight, gemini10);
    const story = createStoryTime(keys);
    const start = elapsedToSeconds('005:15:00');
    const end = eventOf(gemini10, 'docking');
    const stretch = story.stretches.find((one) => one.from === start && one.to === end)!;
    let fastest = 0;
    for (const t of keys.turns!.samples(start, end))
      fastest = Math.max(fastest, keys.turns!.rate(t));
    const s0 = story.toStory(start);
    const paces = Array.from({ length: 21 }, (_, k) =>
      paceAt(story, s0 + (stretch.length * k) / 21),
    );

    expect(stretch.play).toBe('held');
    expect(stretch.length).toBeGreaterThan(storyIntervalLength(end - start) + 1);
    expect(stretch.length).toBeCloseTo((end - start) * CALM_LAP_STORY_SECONDS * fastest, 6);
    // One even pace all through, so the two stay drawn.
    expect(Math.max(...paces) / Math.min(...paces)).toBeLessThan(1 + 1e-6);
  });
});

describe('an eased stretch', () => {
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

  it.each([
    ['a day', 86_400],
    ['three days', 3 * 86_400],
    ['two weeks', 14 * 86_400],
  ])(
    'over %s, grows the pace past each shoulder with the square of the mission time, with no jump, and hurries the middle no more than EASE_MAX_HURRY times the even pace',
    (_name, interval) => {
      const story = createStoryTime([0, interval]);
      const step = 0.01;
      const paces = Array.from({ length: Math.floor(story.length / step) }, (_, k) =>
        paceAt(story, k * step),
      );
      const top = Math.max(...paces);
      const changes = paces.slice(1).map((pace, k) => Math.max(pace / paces[k]!, paces[k]! / pace));
      const shoulder = shoulderOf(story);
      // A tenth and a half of a story second into the ramp: mission seconds past the shoulder.
      const intoTheRamp = [0.1, 0.5].map((seconds) => shoulder + seconds);
      const past = intoTheRamp.map((at) => story.toMission(at) - EASE_GENTLE_PACE * shoulder);

      expect(paces[0]).toBeCloseTo(EASE_GENTLE_PACE, 6);
      // Read from mission times of a million seconds or more, to a ten-thousandth.
      expect(paceAt(story, story.length)).toBeCloseTo(EASE_GENTLE_PACE, 4);
      expect(shoulder).toBeGreaterThanOrEqual(EASE_SHOULDER_MIN_STORY_SECONDS - 0.002);
      expect(shoulder).toBeLessThanOrEqual(EASE_SHOULDER_STORY_SECONDS + 0.002);
      // Measured against (1 + t / EASE_RAMP_MISSION_SECONDS)^2 times the gentle pace, to a percent.
      expect(
        intoTheRamp.map((at, k) =>
          Math.round(
            (100 * paceAt(story, at)) /
              (EASE_GENTLE_PACE * (1 + past[k]! / EASE_RAMP_MISSION_SECONDS) ** 2),
          ),
        ),
      ).toEqual([100, 100]);
      // The pace changes fastest at the far end of a ramp, where it meets the middle's, and nowhere much faster.
      const steepest = Math.exp(
        ((2 * Math.sqrt(top * EASE_GENTLE_PACE)) / EASE_RAMP_MISSION_SECONDS) * step,
      );
      expect(Math.max(...changes)).toBeLessThanOrEqual(steepest * 1.03);
      expect(top / (interval / story.length)).toBeLessThanOrEqual(EASE_MAX_HURRY * (1 + 1e-9));
    },
  );

  it('gives a stretch whole shoulders when it has the room, and shorter ones, down to the least, before it plays longer', () => {
    // A day in Earth orbit over 30 story seconds has room; over 9 it has not; over 6 not even for the least.
    const roomy = oneStretch(86_400 / 3, 30);
    const tight = oneStretch(9000, 9);
    const short = oneStretch(5000, 6);

    expect(shoulderOf(roomy)).toBeCloseTo(EASE_SHOULDER_STORY_SECONDS, 2);
    expect(roomy.length).toBe(30);
    expect(shoulderOf(tight)).toBeLessThan(EASE_SHOULDER_STORY_SECONDS - 0.1);
    expect(shoulderOf(tight)).toBeGreaterThanOrEqual(EASE_SHOULDER_MIN_STORY_SECONDS - 0.002);
    expect(tight.length).toBe(9);
    expect(shoulderOf(short)).toBeCloseTo(EASE_SHOULDER_MIN_STORY_SECONDS, 2);
    expect(short.length).toBeGreaterThan(6);
  });

  it('keeps Apollo 12 leaving the Moon, with no event at its burn, to one lap in 22 seconds, and plays the stretch from liftoff to splashdown longer for it', () => {
    const { path, keys } = keysOf(apollo12Flight, apollo12);
    const story = createStoryTime(keys);
    const csm = path.ships.find((ship) => ship.id === 'csm')!;
    const home = csm.phases.find((phase) => phase.kind === 'transfer' && phase.to === 'earth')!;
    const leaves = elapsedToSeconds(home.start.value);
    const liftoff = eventOf(apollo12, 'lunar-liftoff');
    const stretch = story.stretches.find((one) => one.from === liftoff)!;
    const laps = Array.from({ length: 241 }, (_, k) => {
      const t = leaves + k * 60;
      return paceAtMission(story, t) * keys.turns!.openRate(t);
    });

    expect(stretch.play).toBe('eased');
    expect(stretch.length).toBeGreaterThan(storyIntervalLength(stretch.to - stretch.from) + 5);
    expect(Math.max(...laps)).toBeLessThanOrEqual((1 / SWING_LAP_STORY_SECONDS) * 1.001);
    // Played evenly the craft would swing round the Moon several times a second.
    const even = createStoryTime(keys, { ease: false });
    expect(
      paceAtMission(even, leaves + 1800) * keys.turns!.openRate(leaves + 1800),
    ).toBeGreaterThan(1);
  });

  it.each<[string, FlightPlan, Mission]>([
    ['Gemini 7', gemini7Flight, gemini7],
    ['Gemini 6A', gemini6aFlight, gemini6a],
  ])(
    'keeps every key of %s at its story second on the even clock, as every stretch fits',
    (_name, plan, mission) => {
      const { keys } = keysOf(plan, mission);

      const eased = createStoryTime(keys);
      const even = createStoryTime(keys, { ease: false });

      expect(eased.keyTimes).toEqual(even.keyTimes);
      expect(eased.length).toBeCloseTo(even.length, 9);
      expect(eased.keyTimes.map((key) => toThousandths(eased.toStory(key)))).toEqual(
        even.keyTimes.map((key) => toThousandths(even.toStory(key))),
      );
    },
  );

  it.each<[string, FlightPlan, Mission]>([
    ['Apollo 11', apollo11Flight, apollo11],
    ['Apollo 8', apollo8Flight, apollo8],
  ])(
    'keeps every key of %s at the story seconds its stretches add up to, each as long as usual or longer',
    (_name, plan, mission) => {
      const { keys } = keysOf(plan, mission);

      const eased = createStoryTime(keys);
      const even = createStoryTime(keys, { ease: false });
      let sum = 0;

      expect(eased.keyTimes).toEqual(even.keyTimes);
      eased.keyTimes.forEach((key, i) => {
        expect(eased.toStory(key)).toBeCloseTo(sum, 9);
        expect(eased.toMission(sum)).toBeCloseTo(key, 6);
        const stretch = eased.stretches[i];
        if (stretch) {
          expect(stretch.length).toBeGreaterThanOrEqual(
            storyIntervalLength(stretch.to - stretch.from) - 1e-9,
          );
          sum += stretch.length;
        }
      });
      expect(eased.length).toBeCloseTo(sum, 9);
      expect(eased.length).toBeGreaterThan(even.length);
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
});

describe('the even clock', () => {
  it.each<[string, FlightPlan, Mission]>([
    ['Apollo 11', apollo11Flight, apollo11],
    ['Apollo 12', apollo12Flight, apollo12],
  ])(
    'plays every stretch of %s at one pace for its usual length, whatever its craft',
    (_name, plan, mission) => {
      const { keys } = keysOf(plan, mission);
      const even = createStoryTime(keys, { ease: false });
      const plain = createStoryTime(keys.times, { ease: false });
      let sum = 0;

      even.keyTimes.forEach((key, i) => {
        const next = even.keyTimes[i + 1];
        expect(even.toStory(key)).toBeCloseTo(sum, 9);
        if (next === undefined) return;
        const length = storyIntervalLength(next - key);
        expect(even.toStory((key + next) / 2)).toBeCloseTo(sum + length / 2, 9);
        expect(even.stretches[i]?.play).toBe('even');
        sum += length;
      });
      expect(even.length).toBeCloseTo(sum, 9);
      // The craft's turning, and the held stretches, change nothing.
      expect(even.keyTimes.map((key) => plain.toStory(key))).toEqual(
        even.keyTimes.map((key) => even.toStory(key)),
      );
    },
  );
});
