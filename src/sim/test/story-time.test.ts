import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { flight as apollo11Flight } from '../../content/missions/apollo-11/flight.ts';
import { story as apollo11 } from '../../content/missions/apollo-11/story.ts';
import { flight as apollo16Flight } from '../../content/missions/apollo-16/flight.ts';
import { story as apollo16 } from '../../content/missions/apollo-16/story.ts';
import { flight as gemini12Flight } from '../../content/missions/gemini-12/flight.ts';
import { story as gemini12 } from '../../content/missions/gemini-12/story.ts';
import { elapsedToSeconds, type Mission } from '../../content/types.ts';
import { buildFlightPath } from '../build.ts';
import { createStoryTime, storyIntervalLength, storyKeyTimes } from '../story-time.ts';
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

describe('story keys', () => {
  /** The keys a flight's clock is built from, as main.ts builds them, and its event times. */
  function keysOf(plan: FlightPlan, mission: Mission) {
    const events = mission.events.map((event) => elapsedToSeconds(event.elapsed));
    const path = buildFlightPath(plan);
    return { path, events, keys: storyKeyTimes(path, events) };
  }

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

  it.each([
    ['a lander that undocks with no event there (Apollo 16)', apollo16Flight, apollo16],
    ['a main ship that undocks into station keeping (Gemini 12)', gemini12Flight, gemini12],
  ])('add nothing for %s', (_name, plan, mission) => {
    const { path, events, keys } = keysOf(plan, mission);

    expect(keys).toEqual([path.start, path.end, ...events]);
  });
});
