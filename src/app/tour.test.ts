import assert from 'node:assert/strict';
/**
 * The guided tour with the real mission clock, run without a browser: a fake
 * animation-frame loop stands in for the screen. Every stop must end with
 * the clock exactly on the stop's time (at a parting, on its rest point just
 * after), the tour saying it has arrived, and the clock still, on fast
 * screens and on slow ones. Next flies the whole stretch to the next stop in
 * its set number of real seconds, on any screen.
 *
 * Run: npx vitest run src/app/tour.test.ts
 */
import { describe, expect, it } from 'vitest';
import { flight as apollo8Flight } from '../content/missions/apollo-8/flight.ts';
import { story as apollo8 } from '../content/missions/apollo-8/story.ts';
import { flight as apollo11Flight } from '../content/missions/apollo-11/flight.ts';
import { story as apollo11 } from '../content/missions/apollo-11/story.ts';
import { flight as apollo12Flight } from '../content/missions/apollo-12/flight.ts';
import { story as apollo12 } from '../content/missions/apollo-12/story.ts';
import { flight as apollo15Flight } from '../content/missions/apollo-15/flight.ts';
import { story as apollo15 } from '../content/missions/apollo-15/story.ts';
import { flight as gemini7Flight } from '../content/missions/gemini-7/flight.ts';
import { story as gemini7 } from '../content/missions/gemini-7/story.ts';
import { elapsedToSeconds, type EventView, type Mission } from '../content/types.ts';
import { buildFlightPath, createStoryTime, partingsAtEvents, storyKeyTimes } from '../sim/index.ts';
import type { FlightPlan } from '../sim/types.ts';
import type { Director, StoryMap } from './contract.ts';
import { MissionPlayer, tripShape } from './player.ts';
import {
  EARLY_VIEW_MISSION_SECONDS,
  PARTING_HOLD_SECONDS,
  PARTING_REST_MAX_SHARE,
  PARTING_REST_STORY_SECONDS,
  PARTING_VIEW_SETTLE_SECONDS,
  restPlaySeconds,
  SKIP_GUARD_MS,
  Tour,
  TRIP_MAX_SECONDS,
  TRIP_MIN_SECONDS,
  tripSeconds,
  VIEW_LEAD_SECONDS,
  type TourOptions,
} from './tour.ts';

type Screen = ReturnType<typeof fakeScreen>;

/** A screen that draws a frame every `frameMs` milliseconds, on demand. */
function fakeScreen(frameMs: number) {
  let queue: FrameRequestCallback[] = [];
  let nowMs = 0;
  globalThis.requestAnimationFrame = (callback) => {
    queue.push(callback);
    return queue.length;
  };
  globalThis.cancelAnimationFrame = () => {
    queue = [];
  };
  return {
    frameMs,
    now: () => nowMs,
    frame(): void {
      nowMs += frameMs;
      const due = queue;
      queue = [];
      for (const callback of due) callback(nowMs);
    },
    /** Let real time pass with no frame drawn (a stalled tab). */
    stall(ms: number): void {
      nowMs += ms;
    },
  };
}

/** The player and tour, built the way main.ts builds them. */
function setUp(mission: Mission, plan: FlightPlan, screen: Screen, options: TourOptions = {}) {
  const path = buildFlightPath(plan);
  const eventTimes = mission.events.map((event) => elapsedToSeconds(event.elapsed));
  const story = createStoryTime(storyKeyTimes(path, eventTimes));
  const keys = story.keyTimes;
  const map: StoryMap = {
    duration: story.length,
    toStory: (seconds) => story.toStory(seconds),
    toElapsed: (seconds) => story.toMission(seconds),
  };
  const player = new MissionPlayer(
    keys[0] ?? path.start,
    keys[keys.length - 1] ?? path.end,
    map,
    screen.now,
  );
  // Every view the tour asks for, when, and how fast the clock was going then.
  const views: Array<{ view: EventView; atMs: number; speed: number }> = [];
  const listeners = new Set<(director: Director) => void>();
  let viewNow: EventView = 'earth';
  let fastForwardNow = false;
  const director: Director = {
    scaleMode: 'readable',
    get view() {
      return viewNow;
    },
    get fastForward() {
      return fastForwardNow;
    },
    setScaleMode() {},
    setView(view) {
      viewNow = view;
      views.push({ view, atMs: screen.now(), speed: player.speed });
      for (const listener of listeners) listener(director);
    },
    setViewInsets() {},
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    player,
    views,
    tour: new Tour(mission, player, director, {
      now: screen.now,
      partings: partingsAtEvents(path, eventTimes),
      ...options,
    }),
    /** The scene starts or stops showing its fast-forward view, and says so. */
    setFastForward(on: boolean): void {
      fastForwardNow = on;
      for (const listener of listeners) listener(director);
    },
  };
}

/** Draw frames while the tour travels, up to a limit. Returns the real seconds it took. */
function travel(tour: Tour, screen: Screen, limitSeconds = TRIP_MAX_SECONDS + 4): number {
  const startMs = screen.now();
  while (tour.phase === 'traveling' && screen.now() - startMs < limitSeconds * 1000) screen.frame();
  return (screen.now() - startMs) / 1000;
}

/** Draw frames for a while, whatever happens. */
function wait(screen: Screen, seconds: number): void {
  const frames = Math.ceil((seconds * 1000) / screen.frameMs);
  for (let i = 0; i < frames; i += 1) screen.frame();
}

/** The tour is stopped at its current stop, with the clock still and exactly on the stop's time. */
function assertAtStop(tour: Tour, player: MissionPlayer, what: string): void {
  const event = tour.stop;
  assert.ok(event, `${what}: the tour has a stop`);
  assert.equal(tour.phase, 'stopped', `${what}: arrived at ${event.title}`);
  assert.equal(player.playing, false, `${what}: the clock is still`);
  assert.ok(
    Math.abs(player.time - elapsedToSeconds(event.elapsed)) < 0.01,
    `${what}: clock on ${event.title}'s time`,
  );
}

const storyOf = (player: MissionPlayer, tour: Tour, index: number): number =>
  player.story.toStory(elapsedToSeconds(tour.stops[index]!.elapsed));

const flights: Array<[string, Mission, FlightPlan]> = [
  ['Gemini 7', gemini7, gemini7Flight],
  ['Apollo 8', apollo8, apollo8Flight],
  ['Apollo 15', apollo15, apollo15Flight],
];

const screens = [
  ['60 frames a second', 1000 / 60],
  ['4 frames a second', 250],
  ['1 frame a second', 1000],
] as const;

describe('the tour flies from stop to stop', () => {
  for (const [name, mission, plan] of flights) {
    for (const [screenName, frameMs] of screens) {
      it(`${name}, ${screenName}: each trip takes its time and lands on the stop`, () => {
        const screen = fakeScreen(frameMs);
        const { player, tour } = setUp(mission, plan, screen);
        assert.ok(tour.total > 1, `${name} has a tour`);
        // Arrival is seen on the first frame at or after the trip's end.
        const tolerance = frameMs / 1000 + 1e-6;
        for (let stop = 0; stop < tour.total; stop += 1) {
          const from = player.storyTime;
          if (stop === 0) tour.start(0);
          else tour.next();
          const to = storyOf(player, tour, stop);
          // The first stop is at the very start of every story here, so starting arrives at once.
          const expected = stop === 0 ? (to > 1e-6 ? 3 : 0) : tripSeconds(to - from);

          // The trip plays on from the stop: no cut, never backward, never past the stop.
          const startMs = screen.now();
          let last = player.storyTime;
          if (stop > 0)
            assert.equal(last, from, `stop ${stop + 1}: the trip starts where the last stop was`);
          while (
            tour.phase === 'traveling' &&
            screen.now() - startMs < (TRIP_MAX_SECONDS + 4) * 1000
          ) {
            screen.frame();
            assert.ok(
              player.storyTime >= last - 1e-9,
              `stop ${stop + 1}: the clock never runs backward`,
            );
            assert.ok(
              player.storyTime <= to + 1e-9,
              `stop ${stop + 1}: the clock never passes the stop`,
            );
            if (tour.phase === 'traveling')
              assert.equal(player.rate, 1, 'a trip leaves the speed alone');
            last = player.storyTime;
          }
          const took = (screen.now() - startMs) / 1000;
          assertAtStop(tour, player, `${name} stop ${stop + 1}`);
          assert.ok(
            took >= expected - 1e-6 && took <= expected + tolerance,
            `stop ${stop + 1}: took ${took.toFixed(3)} s, planned ${expected.toFixed(3)} s`,
          );
          // Two more seconds of screen: nothing moves.
          const at = player.time;
          wait(screen, 2);
          assert.equal(player.time, at, `${name} stop ${stop + 1}: the clock stays put`);
        }
        tour.next();
        assert.equal(tour.phase, 'finished');
      });
    }
  }
});

describe('how long a trip takes', () => {
  it('is the story time between the stops, kept within the limits', () => {
    assert.equal(tripSeconds(9.4), 9.4);
    assert.equal(tripSeconds(2.7), TRIP_MIN_SECONDS);
    assert.equal(tripSeconds(0.1), TRIP_MIN_SECONDS);
    assert.equal(tripSeconds(53.8), TRIP_MAX_SECONDS);
    assert.equal(TRIP_MIN_SECONDS, 5);
    assert.equal(TRIP_MAX_SECONDS, 15);
  });

  it('a short hop still takes the shortest trip (Apollo 12: liftoff to the lightning)', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo12, apollo12Flight, screen);
    tour.start(0);
    travel(tour, screen);
    const from = player.storyTime;
    tour.next();
    const took = travel(tour, screen);
    assert.ok(
      storyOf(player, tour, 1) - from < TRIP_MIN_SECONDS,
      'the two stops are close in story time',
    );
    assert.ok(Math.abs(took - TRIP_MIN_SECONDS) <= 0.02, `took ${took.toFixed(3)} s`);
    assertAtStop(tour, player, 'Apollo 12 stop 2');
  });

  it('a long stretch takes the longest trip (Apollo 8: on the way home to splashdown)', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    tour.start(tour.total - 2);
    travel(tour, screen);
    const from = player.storyTime;
    tour.next();
    const took = travel(tour, screen);
    assert.ok(
      storyOf(player, tour, tour.total - 1) - from > TRIP_MAX_SECONDS,
      'the two stops are far apart in story time',
    );
    assert.ok(Math.abs(took - TRIP_MAX_SECONDS) <= 0.02, `took ${took.toFixed(3)} s`);
    assertAtStop(tour, player, 'Apollo 8 splashdown');
  });

  it('does not depend on the chosen speed, which it leaves alone', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    player.setRate(4);
    tour.start(0);
    travel(tour, screen);
    const from = player.storyTime;
    tour.next();
    const took = travel(tour, screen);
    assert.ok(
      Math.abs(took - tripSeconds(storyOf(player, tour, 1) - from)) <= 0.02,
      `took ${took.toFixed(3)} s`,
    );
    assert.equal(player.rate, 4);
    assertAtStop(tour, player, 'Apollo 8 stop 2');
  });

  it('eases out of one stop and into the next', () => {
    for (const seconds of [3, 5, 9.4, 14]) {
      // A trip as long as the story it covers.
      const shape = (elapsed: number) => tripShape(elapsed, seconds, seconds);
      assert.equal(shape(0).share, 0);
      assert.equal(shape(0).pace, 0, 'it sets off from a standstill');
      assert.ok(Math.abs(shape(seconds).share - 1) < 1e-12);
      assert.ok(shape(seconds).pace < 1e-12, 'it comes to rest at the stop');
      let last = 0;
      for (let i = 1; i <= 1000; i += 1) {
        const now = shape((seconds * i) / 1000).share;
        assert.ok(now >= last - 1e-12, 'it only moves forward');
        // No step is much larger than the top speed allows: no jumps anywhere.
        assert.ok(now - last <= 2.5 / 1000 + 1e-9, `a smooth step at ${i}`);
        last = now;
      }
      // The first half second covers less than the average pace would.
      assert.ok(shape(0.5).share < 0.5 / seconds);
      assert.ok(1 - shape(seconds - 0.5).share < 0.5 / seconds);
    }
  });
});

describe('a long stretch squeezed into the longest trip', () => {
  const seconds = TRIP_MAX_SECONDS;
  /** Real seconds between `from` and `to`, every `step`. */
  const times = (from: number, to: number, step = 0.01): number[] =>
    Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);

  // Story seconds to cover, and the pace that covers them: the first 6 and last 4 real
  // seconds cover 9.5 story seconds between them, eases and all, so 25.5 leaves 16 for
  // the 4 seconds of hurry. 53.8 is the longest stretch between two stops of any tour.
  describe.each([
    [25.5, 4],
    [53.8, 11.075],
  ])('%s story seconds in the longest trip', (span, hurry) => {
    const shape = (elapsed: number) => tripShape(elapsed, seconds, span);
    /** Story seconds per real second. */
    const storyPace = (elapsed: number): number => span * shape(elapsed).pace;

    it('sets off from a standstill, only moves forward, and comes to rest on the stop when planned', () => {
      expect(shape(0)).toEqual({ share: 0, pace: 0 });
      let last = 0;
      for (const t of times(0, seconds)) {
        const { share } = shape(t);
        expect(share).toBeGreaterThanOrEqual(last);
        last = share;
      }
      expect(shape(seconds).share).toBeCloseTo(1, 12);
      expect(storyPace(seconds)).toBeCloseTo(0, 12);
    });

    it('plays at normal speed after easing off from the stop and before easing in to the next', () => {
      for (const t of [...times(1.5, 6), ...times(11, 13.5)])
        expect(storyPace(t)).toBeCloseTo(1, 9);
    });

    it('hurries only in between, at the one pace that arrives on time', () => {
      const fastest = Math.max(...times(0, seconds).map(storyPace));

      expect(fastest).toBeCloseTo(hurry, 9);
      for (const t of times(7, 10)) expect(storyPace(t)).toBeCloseTo(hurry, 9);
      for (const t of [...times(0, 7), ...times(10, seconds)])
        expect(storyPace(t)).toBeLessThanOrEqual(hurry + 1e-9);
    });

    it('says how fast it is going: the pace is the rate at which it moves along', () => {
      const h = 1e-4;
      for (const t of times(0.05, seconds - 0.05, 0.05)) {
        const slope = (span * (shape(t + h).share - shape(t - h).share)) / (2 * h);
        expect(slope).toBeCloseTo(storyPace(t), 5);
      }
    });
  });

  it('a stretch no longer than the trip holds one pace between its two eases, as before', () => {
    for (const span of [5, 12, seconds]) {
      for (const t of times(1.5, seconds - 1.5, 0.25)) {
        const { share, pace } = tripShape(t, seconds, span);
        expect(share).toBeCloseTo((t - 0.75) / (seconds - 1.5), 12);
        expect(pace).toBeCloseTo(1 / (seconds - 1.5), 12);
      }
    }
  });

  it('a trip too short for normal speed at both ends and a hurry between holds one pace between its eases', () => {
    for (const short of [10, 11.5]) {
      for (const t of times(1.5, short - 1.5, 0.25)) {
        expect(tripShape(t, short, 40).share).toBeCloseTo((t - 0.75) / (short - 1.5), 12);
      }
    }
  });
});

describe('the camera on a trip', () => {
  it("keeps its view, and moves to the stop's view a few seconds before arriving", () => {
    for (const [, frameMs] of screens) {
      const screen = fakeScreen(frameMs);
      const { tour, views } = setUp(apollo8, apollo8Flight, screen);
      tour.start(tour.total - 2);
      travel(tour, screen);
      assert.equal(views.length, 1, 'the run-up moves the camera at once');
      const startMs = screen.now();
      tour.next();
      const seconds = TRIP_MAX_SECONDS;
      assert.equal(views.length, 1, 'not yet');
      travel(tour, screen);
      assert.equal(views.length, 2);
      const at = (views[1]!.atMs - startMs) / 1000;
      const planned = seconds - VIEW_LEAD_SECONDS;
      assert.ok(
        at >= planned - 1e-6 && at <= planned + frameMs / 1000 + 1e-6,
        `moved at ${at} s, planned ${planned} s`,
      );
      assert.equal(views[1]!.view, tour.stop!.view);
    }
  });

  /** Apollo 11's tour at "Eagle undocks" (ship view), with Next pressed for "The Eagle has landed" (Moon view). */
  function leavingEagleUndocks(screen: Screen) {
    const set = setUp(apollo11, apollo11Flight, screen);
    const { tour } = set;
    const at = tour.stops.findIndex((stop) => stop.id === 'undocking');
    expect(tour.stops[at + 1]?.id).toBe('landing');
    tour.start(at);
    travel(tour, screen);
    expect(set.views.map(({ view }) => view)).toEqual(['spacecraft']);
    tour.next();
    return { ...set, startMs: screen.now() };
  }

  it("on a long stretch, moves to the stop's view as the clock settles back to normal speed, and arrives on time", () => {
    for (const [, frameMs] of screens) {
      const screen = fakeScreen(frameMs);
      const { player, tour, views, startMs } = leavingEagleUndocks(screen);

      const took = travel(tour, screen);

      // Seen on the first frame at or after the planned moment.
      const frame = frameMs / 1000 + 1e-6;
      const movedAt = (views[1]!.atMs - startMs) / 1000;
      expect(views).toHaveLength(2);
      expect(views[1]?.view).toBe('moon');
      expect(movedAt).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS - VIEW_LEAD_SECONDS - 1e-6);
      expect(movedAt).toBeLessThanOrEqual(TRIP_MAX_SECONDS - VIEW_LEAD_SECONDS + frame);
      expect(views[1]?.speed).toBeCloseTo(1, 9);
      expect(took).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS - 1e-6);
      expect(took).toBeLessThanOrEqual(TRIP_MAX_SECONDS + frame);
      assertAtStop(tour, player, 'The Eagle has landed');
    }
  });

  it("when the ship view's fast-forward view ends on the way, moves to the stop's view then, and still arrives on time", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, views, startMs, setFastForward } = leavingEagleUndocks(screen);

    wait(screen, 7);
    setFastForward(true);
    wait(screen, 2.5);
    expect(views).toHaveLength(1);
    setFastForward(false);
    const movedAt = (screen.now() - startMs) / 1000;
    const took = movedAt + travel(tour, screen);

    expect(views).toHaveLength(2);
    expect(views[1]?.view).toBe('moon');
    expect((views[1]!.atMs - startMs) / 1000).toBeCloseTo(movedAt, 6);
    expect(movedAt).toBeLessThan(TRIP_MAX_SECONDS - VIEW_LEAD_SECONDS);
    expect(took).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS - 1e-6);
    expect(took).toBeLessThanOrEqual(TRIP_MAX_SECONDS + 1 / 60 + 1e-6);
    assertAtStop(tour, player, 'The Eagle has landed');
  });

  it("a fast-forward view that ends hours before the stop leaves the move to the stop's view as planned", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, views, startMs, setFastForward } = leavingEagleUndocks(screen);

    // A second into the trip the landing is still two and a half hours off.
    wait(screen, 0.5);
    setFastForward(true);
    wait(screen, 0.5);
    setFastForward(false);
    expect(elapsedToSeconds('102:45:39.9') - player.time).toBeGreaterThan(
      EARLY_VIEW_MISSION_SECONDS,
    );
    travel(tour, screen);

    const movedAt = (views[1]!.atMs - startMs) / 1000;
    expect(views).toHaveLength(2);
    expect(views[1]?.view).toBe('moon');
    expect(movedAt).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS - VIEW_LEAD_SECONDS - 1e-6);
    expect(movedAt).toBeLessThanOrEqual(TRIP_MAX_SECONDS - VIEW_LEAD_SECONDS + 1 / 60 + 1e-6);
    assertAtStop(tour, player, 'The Eagle has landed');
  });

  it("a fast-forward view that ends outside the ship view leaves the move to the stop's view as planned", () => {
    const screen = fakeScreen(1000 / 60);
    const { tour, views, setFastForward } = setUp(apollo8, apollo8Flight, screen);
    tour.start(tour.total - 2);
    travel(tour, screen);
    expect(views.map(({ view }) => view)).toEqual(['journey']);
    const startMs = screen.now();
    tour.next();

    wait(screen, 6);
    setFastForward(true);
    wait(screen, 2);
    setFastForward(false);
    travel(tour, screen);

    const movedAt = (views[1]!.atMs - startMs) / 1000;
    expect(views).toHaveLength(2);
    expect(movedAt).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS - VIEW_LEAD_SECONDS - 1e-6);
    expect(movedAt).toBeLessThanOrEqual(TRIP_MAX_SECONDS - VIEW_LEAD_SECONDS + 1 / 60 + 1e-6);
  });

  it("Skip arrives in the stop's view; leaving the tour keeps the view it is in", () => {
    const screen = fakeScreen(1000 / 60);
    const { tour, views } = setUp(apollo8, apollo8Flight, screen);
    tour.start(0);
    tour.next();
    wait(screen, 1);
    assert.equal(views.length, 1);
    tour.next();
    assert.equal(views.length, 2, 'Skip moves the camera');
    assert.equal(views[1]!.view, tour.stop!.view);
    tour.next();
    wait(screen, 1);
    tour.exit();
    wait(screen, 14);
    assert.equal(views.length, 2, 'no move after leaving');
  });
});

describe('a stop where two craft part: Eagle undocks from Columbia', () => {
  const undocking = elapsedToSeconds('100:12:00');
  /** Columbia's separation burn, when the two stop flying side by side. */
  const separation = elapsedToSeconds('100:39:52.9');

  /** Apollo 11's tour at "Into orbit around the Moon" (Moon view), with Next pressed for "Eagle undocks" (Ship view). */
  function headingForEagleUndocks(screen: Screen, options: TourOptions = {}) {
    const set = setUp(apollo11, apollo11Flight, screen, options);
    const { player, tour } = set;
    const at = tour.stops.findIndex((stop) => stop.id === 'undocking');
    tour.start(at - 1);
    travel(tour, screen);
    expect(set.views.map(({ view }) => view)).toEqual(['moon']);
    const from = player.storyTime;
    tour.next();
    /** The event and the rest point, in story seconds. */
    const event = player.story.toStory(undocking);
    const rest = event + PARTING_REST_STORY_SECONDS;
    return { ...set, at, event, rest, trip: tripSeconds(event - from), startMs: screen.now() };
  }

  /** Draw frames until the tour stops, noting each: real seconds since `startMs`, the clock, and the tour. */
  function follow(tour: Tour, player: MissionPlayer, screen: Screen, startMs: number) {
    const samples: Array<{ at: number; story: number; playing: boolean; phase: string }> = [];
    while (tour.phase === 'traveling' && screen.now() - startMs < 40_000) {
      screen.frame();
      samples.push({
        at: (screen.now() - startMs) / 1000,
        story: player.storyTime,
        playing: player.playing,
        phase: tour.phase,
      });
    }
    return samples;
  }

  /** Draw frames until the clock reaches the event. */
  function untilTheEvent(player: MissionPlayer, screen: Screen, event: number): void {
    while (player.storyTime < event) screen.frame();
  }

  /** At "Eagle undocks", stopped, with the clock still on the rest point. */
  function expectAtRest(tour: Tour, player: MissionPlayer, rest: number): void {
    expect(tour.stop?.id).toBe('undocking');
    expect(tour.phase).toBe('stopped');
    expect(player.playing).toBe(false);
    expect(player.storyTime).toBeCloseTo(rest, 9);
  }

  for (const [screenName, frameMs] of screens) {
    it(`a trip reaches the event, holds there, plays on to the rest point, and only then stops, ${screenName}`, () => {
      const screen = fakeScreen(frameMs);
      const { player, tour, views, event, rest, trip, startMs } = headingForEagleUndocks(screen);
      const frame = frameMs / 1000 + 1e-6;

      const samples = follow(tour, player, screen, startMs);

      // The trip lands on the event in its usual time, with the camera moved 4 seconds before.
      const reached = samples.find(({ story }) => story === event)!;
      expect(reached.at).toBeGreaterThanOrEqual(trip - 1e-6);
      expect(reached.at).toBeLessThanOrEqual(trip + frame);
      expect(views.map(({ view }) => view)).toEqual(['moon', 'spacecraft']);
      expect((views[1]!.atMs - startMs) / 1000).toBeLessThanOrEqual(
        trip - VIEW_LEAD_SECONDS + frame,
      );
      // It holds there with the clock still for the short hold, still on its way.
      const playsOn = samples.find(({ at, playing }) => at > reached.at && playing)!;
      const held = samples.filter(({ at }) => at >= reached.at && at < playsOn.at);
      expect(playsOn.at - reached.at).toBeGreaterThanOrEqual(PARTING_HOLD_SECONDS - 1e-6);
      expect(playsOn.at - reached.at).toBeLessThanOrEqual(PARTING_HOLD_SECONDS + frame);
      for (const sample of held)
        expect(sample).toMatchObject({ story: event, playing: false, phase: 'traveling' });
      // Then it plays on to the rest point, forward only, still on its way, and stops there.
      const playing = samples.filter(({ at }) => at >= playsOn.at);
      const last = playing[playing.length - 1]!;
      expect(last.at - playsOn.at).toBeGreaterThanOrEqual(
        restPlaySeconds(PARTING_REST_STORY_SECONDS) - 1e-6,
      );
      expect(last.at - playsOn.at).toBeLessThanOrEqual(
        restPlaySeconds(PARTING_REST_STORY_SECONDS) + frame,
      );
      for (let i = 1; i < playing.length - 1; i += 1) {
        expect(playing[i]!.story).toBeGreaterThanOrEqual(playing[i - 1]!.story);
        expect(playing[i]!.story).toBeLessThanOrEqual(rest + 1e-9);
        expect(playing[i]!.phase).toBe('traveling');
      }
      expectAtRest(tour, player, rest);
      // About 100:24, twelve minutes after the undocking, and long before Columbia's separation burn.
      expect(player.time).toBeGreaterThan(elapsedToSeconds('100:24:00'));
      expect(player.time).toBeLessThan(elapsedToSeconds('100:24:30'));
      // The card stays on its stop, and the clock stays put.
      wait(screen, 2);
      expectAtRest(tour, player, rest);
    });
  }

  it('rests no more than 60% of the way through a short station keeping', () => {
    /** Eagle beside Columbia for five minutes only: shorter than any real parting. */
    const fiveMinutes = [{ start: undocking, end: undocking + 300 }];
    const screen = fakeScreen(1000 / 60);
    const { player, tour, event } = headingForEagleUndocks(screen, { partings: fiveMinutes });
    wait(screen, 1);

    tour.next();

    const share = (player.storyTime - event) / (player.story.toStory(undocking + 300) - event);
    expect(tour.phase).toBe('stopped');
    expect(share).toBeCloseTo(PARTING_REST_MAX_SHARE, 9);
  });

  it('while the scene fast-forwards all the way, moves the camera to the Ship view only on reaching the event, and holds longer', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, views, event, rest, startMs, setFastForward } =
      headingForEagleUndocks(screen);
    setFastForward(true);

    const samples = follow(tour, player, screen, startMs);

    const reached = samples.find(({ story }) => story === event)!;
    const playsOn = samples.find(({ at, playing }) => at > reached.at && playing)!;
    expect(views.map(({ view }) => view)).toEqual(['moon', 'spacecraft']);
    expect((views[1]!.atMs - startMs) / 1000).toBeCloseTo(reached.at, 9);
    expect(playsOn.at - reached.at).toBeGreaterThanOrEqual(PARTING_VIEW_SETTLE_SECONDS - 1e-6);
    expect(playsOn.at - reached.at).toBeLessThanOrEqual(
      PARTING_VIEW_SETTLE_SECONDS + 1 / 60 + 1e-6,
    );
    expectAtRest(tour, player, rest);
  });

  it('when the fast-forward view ends after the camera was due to move, moves it then, and holds until the move has settled', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, views, event, trip, startMs, setFastForward } =
      headingForEagleUndocks(screen);
    setFastForward(true);
    wait(screen, trip - 0.5);
    expect(views).toHaveLength(1);

    setFastForward(false);
    const movedAt = (screen.now() - startMs) / 1000;
    const samples = follow(tour, player, screen, startMs);

    const reached = samples.find(({ story }) => story === event)!;
    const playsOn = samples.find(({ at, playing }) => at > reached.at && playing)!;
    expect(views).toHaveLength(2);
    expect((views[1]!.atMs - startMs) / 1000).toBeCloseTo(movedAt, 9);
    expect(playsOn.at - movedAt).toBeGreaterThanOrEqual(PARTING_VIEW_SETTLE_SECONDS - 1e-6);
    expect(playsOn.at - movedAt).toBeLessThanOrEqual(PARTING_VIEW_SETTLE_SECONDS + 1 / 60 + 1e-6);
  });

  it.each([
    ['on the trip', (_player: MissionPlayer, screen: Screen) => wait(screen, 2)],
    [
      'while the clock holds on the event',
      (player: MissionPlayer, screen: Screen, event: number) => {
        untilTheEvent(player, screen, event);
        wait(screen, PARTING_HOLD_SECONDS / 2);
        expect(player.playing).toBe(false);
      },
    ],
    [
      'while it plays on to the rest point',
      (player: MissionPlayer, screen: Screen, event: number) => {
        untilTheEvent(player, screen, event);
        wait(screen, PARTING_HOLD_SECONDS + 2);
        expect(player.storyTime).toBeGreaterThan(event);
      },
    ],
  ])('Skip %s arrives on the rest point at once', (_when, getThere) => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, event, rest } = headingForEagleUndocks(screen);
    getThere(player, screen, event);
    expect(tour.phase).toBe('traveling');

    tour.next();

    expectAtRest(tour, player, rest);
    wait(screen, 2);
    expectAtRest(tour, player, rest);
  });

  it('Next from the rest point flies the whole stretch to the landing from there, with the two side by side as it sets off', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, rest } = headingForEagleUndocks(screen);
    travel(tour, screen, 30);
    const startMs = screen.now();

    tour.next();

    expect(tour.stop?.id).toBe('landing');
    expect(player.storyTime).toBeCloseTo(rest, 9);
    wait(screen, 4);
    expect(player.time).toBeLessThan(separation);
    const took = (screen.now() - startMs) / 1000 + travel(tour, screen);
    expect(took).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS - 1e-6);
    expect(took).toBeLessThanOrEqual(TRIP_MAX_SECONDS + 1 / 60 + 1e-6);
    assertAtStop(tour, player, 'The Eagle has landed');
  });

  it('Back from the landing, and starting at the stop, play the run-up, hold, play on, and rest', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, at, rest } = headingForEagleUndocks(screen);
    travel(tour, screen, 30);
    tour.next();
    travel(tour, screen);
    expect(tour.stop?.id).toBe('landing');
    // The run-up, the short hold, and the play on to the rest point, each landing on a frame.
    const planned = 3 + PARTING_HOLD_SECONDS + restPlaySeconds(PARTING_REST_STORY_SECONDS);

    tour.back();
    const backTook = travel(tour, screen);
    expectAtRest(tour, player, rest);
    tour.start(at);
    const startTook = travel(tour, screen);

    expectAtRest(tour, player, rest);
    for (const took of [backTook, startTook]) {
      expect(took).toBeGreaterThanOrEqual(planned - 1e-6);
      expect(took).toBeLessThanOrEqual(planned + 3 / 60 + 1e-6);
    }
  });

  it('with reduced motion, goes straight to the rest point', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, rest } = headingForEagleUndocks(screen, { jumpStraight: () => true });

    expectAtRest(tour, player, rest);
    tour.next();
    tour.back();
    expectAtRest(tour, player, rest);
  });
});

describe('Next on the way to a stop', () => {
  it('arrives at the stop at once, after a short guard, and does not skip a stop', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    tour.start(0);
    travel(tour, screen);
    tour.next();
    assert.equal(tour.phase, 'traveling');
    assert.equal(tour.index, 1);

    // A double tap: the second press comes too soon and is ignored.
    tour.next();
    assert.equal(tour.phase, 'traveling', 'a press at once is ignored');
    wait(screen, (SKIP_GUARD_MS - 100) / 1000);
    tour.next();
    assert.equal(tour.phase, 'traveling', 'a press inside the guard is ignored');
    assert.equal(tour.index, 1);

    wait(screen, 0.2);
    tour.next();
    assert.equal(tour.index, 1, 'Skip arrives at the stop it was heading for');
    assertAtStop(tour, player, 'after Skip');
    const at = player.time;
    wait(screen, 2);
    assert.equal(player.time, at, 'the clock stays put after Skip');

    // The next Next starts the next trip as usual.
    tour.next();
    assert.equal(tour.phase, 'traveling');
    assert.equal(tour.index, 2);
    travel(tour, screen);
    assertAtStop(tour, player, 'the stop after');
  });

  it('on the way to the last stop arrives there rather than finishing', () => {
    const screen = fakeScreen(250);
    const { player, tour } = setUp(gemini7, gemini7Flight, screen);
    tour.start(tour.total - 2);
    travel(tour, screen);
    tour.next();
    wait(screen, 1);
    tour.next();
    assert.equal(tour.index, tour.total - 1);
    assertAtStop(tour, player, 'the last stop');
    tour.next();
    assert.equal(tour.phase, 'finished');
  });
});

describe('the short run-up stays as it was', () => {
  it('starting, going back, and starting over cut to just before the stop and play 3 seconds', () => {
    for (const [, frameMs] of screens) {
      const screen = fakeScreen(frameMs);
      const { player, tour } = setUp(apollo15, apollo15Flight, screen);
      const tolerance = frameMs / 1000 + 1e-6;
      const runUp = (what: string, go: () => void): void => {
        go();
        assert.equal(tour.phase, 'traveling', `${what}: on the way`);
        const target = storyOf(player, tour, tour.index);
        assert.ok(
          Math.abs(player.storyTime - Math.max(0, target - 3 * player.rate)) < 1e-9,
          `${what}: starts 3 story seconds before`,
        );
        const took = travel(tour, screen);
        assert.ok(took >= 3 - 1e-6 && took <= 3 + tolerance, `${what}: took ${took.toFixed(3)} s`);
        assertAtStop(tour, player, what);
      };
      runUp('start', () => tour.start(3));
      runUp('back', () => tour.back());
      // Back partway through a trip returns to the stop just left.
      tour.next();
      wait(screen, 2);
      assert.equal(tour.index, 3);
      runUp('back during a trip', () => tour.back());
      assert.equal(tour.index, 2);
      // Starting again from the ending.
      tour.start(tour.total - 1);
      travel(tour, screen);
      tour.next();
      assert.equal(tour.phase, 'finished');
      runUp('back from the ending', () => tour.back());
      assert.equal(tour.index, tour.total - 1);
      // Starting over from the ending: the first stop is at the start of the story, so the tour is there at once.
      tour.next();
      tour.start(0);
      assertAtStop(tour, player, 'start over');
      // At double speed the run-up covers twice the story in the same real time, as before.
      player.setRate(2);
      runUp('start at double speed', () => tour.start(4));
    }
  });

  it('with reduced motion, every move jumps straight to the stop', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen, { jumpStraight: () => true });
    tour.start(0);
    assertAtStop(tour, player, 'start');
    tour.next();
    assert.equal(tour.index, 1);
    assertAtStop(tour, player, 'next');
    tour.next();
    tour.back();
    assert.equal(tour.index, 1);
    assertAtStop(tour, player, 'back');
    wait(screen, 1);
    assertAtStop(tour, player, 'a second later');
  });

  it('Next uses the run-up when the clock was moved away from the stop', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    tour.start(0);
    travel(tour, screen);
    player.seekStory(player.storyTime + 1);
    tour.next();
    const target = storyOf(player, tour, 1);
    assert.ok(
      Math.abs(player.storyTime - (target - 3)) < 1e-9,
      'a run-up, not a trip from wherever the clock is',
    );
    travel(tour, screen);
    assertAtStop(tour, player, 'stop 2');
  });
});

describe('the clock interrupted on a trip', () => {
  for (const [what, interrupt] of [
    ['paused', (player: MissionPlayer) => player.pause()],
    ['sought', (player: MissionPlayer) => player.seek(player.start)],
    ['sought in story time', (player: MissionPlayer) => player.seekStory(player.storyTime + 0.5)],
  ] as const) {
    it(`${what}: the trip ends and the tour arrives, and carries on from there`, () => {
      const screen = fakeScreen(1000 / 60);
      const { player, tour } = setUp(apollo15, apollo15Flight, screen);
      tour.start(1);
      travel(tour, screen);
      tour.next();
      wait(screen, 2);
      assert.equal(tour.phase, 'traveling');
      interrupt(player);
      assert.equal(tour.index, 2);
      assertAtStop(tour, player, `after the clock was ${what}`);
      wait(screen, 1);
      assertAtStop(tour, player, 'a second later');
      tour.next();
      assert.equal(tour.phase, 'traveling');
      travel(tour, screen);
      assert.equal(tour.index, 3);
      assertAtStop(tour, player, 'the next stop');
    });
  }

  it('played: the clock plays on at its own speed, and the tour still arrives', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo15, apollo15Flight, screen);
    tour.start(1);
    travel(tour, screen);
    tour.next();
    wait(screen, 2);
    player.play();
    assert.equal(player.playing, true);
    travel(tour, screen, 60);
    assert.equal(tour.index, 2);
    assertAtStop(tour, player, 'after play');
  });

  it('leaving the tour on a trip stops the clock where it is', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo15, apollo15Flight, screen);
    tour.start(1);
    travel(tour, screen);
    tour.next();
    wait(screen, 2);
    tour.exit();
    assert.equal(tour.phase, 'off');
    assert.equal(player.playing, false);
    const at = player.storyTime;
    wait(screen, 1);
    assert.equal(player.storyTime, at);
    assert.ok(at < storyOf(player, tour, 2), 'short of the stop');
  });
});

describe("the mission clock's playTo", () => {
  const make = (screen: Screen): MissionPlayer => {
    const map: StoryMap = { duration: 100, toStory: (s) => s, toElapsed: (s) => s };
    return new MissionPlayer(0, 100, map, screen.now);
  };

  for (const [screenName, frameMs] of screens) {
    it(`takes its real seconds and stops exactly on the target, ${screenName}`, () => {
      const screen = fakeScreen(frameMs);
      const player = make(screen);
      player.seekStory(10);
      player.playTo(47.3, 7);
      assert.equal(player.playing, true);
      const startMs = screen.now();
      while (player.playing && screen.now() - startMs < 20_000) {
        screen.frame();
        assert.equal(player.rate, 1);
      }
      const took = (screen.now() - startMs) / 1000;
      assert.equal(player.storyTime, 47.3);
      assert.equal(player.playing, false);
      assert.equal(player.speed, 0);
      assert.ok(took >= 7 - 1e-6 && took <= 7 + frameMs / 1000 + 1e-6, `took ${took} s`);
    });
  }

  for (const [screenName, frameMs] of screens) {
    it(`a squeezed trip tells its true pace on the way and lands on time, ${screenName}`, () => {
      const screen = fakeScreen(frameMs);
      const player = make(screen);
      player.seekStory(10);
      // 25.5 story seconds in the longest trip: normal speed at both ends, 4 in the middle.
      player.playTo(35.5, TRIP_MAX_SECONDS);
      const startMs = screen.now();
      const paces: Array<[number, number]> = [];
      while (player.playing && screen.now() - startMs < 20_000) {
        screen.frame();
        paces.push([(screen.now() - startMs) / 1000, player.speed]);
      }
      const took = (screen.now() - startMs) / 1000;

      expect(player.storyTime).toBe(35.5);
      expect(took).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS - 1e-6);
      expect(took).toBeLessThanOrEqual(TRIP_MAX_SECONDS + frameMs / 1000 + 1e-6);
      const paceWhen = (from: number, to: number): number[] =>
        paces.flatMap(([t, pace]) => (t >= from && t <= to ? [pace] : []));
      for (const pace of [...paceWhen(1.5, 6), ...paceWhen(11, 13.5)])
        expect(pace).toBeCloseTo(1, 9);
      for (const pace of paceWhen(7, 10)) expect(pace).toBeCloseTo(4, 9);
    });
  }

  it('does not leap after a stalled tab', () => {
    const screen = fakeScreen(1000 / 60);
    const player = make(screen);
    player.playTo(50, 10);
    wait(screen, 2);
    const before = player.storyTime;
    screen.stall(30_000);
    screen.frame();
    assert.equal(player.playing, true, 'still on its way');
    assert.ok(player.storyTime - before < 10, "moved no more than about a second's worth");
  });

  it('is ended by pause, seek, and play', () => {
    const screen = fakeScreen(1000 / 60);
    const player = make(screen);
    player.playTo(50, 10);
    wait(screen, 3);
    assert.ok(player.speed > 1, "the trip's own pace");
    player.pause();
    const paused = player.storyTime;
    wait(screen, 1);
    assert.equal(player.playing, false);
    assert.equal(player.storyTime, paused);

    player.playTo(80, 10);
    wait(screen, 3);
    player.seekStory(20);
    assert.equal(player.playing, false, 'a jump ends the trip');
    wait(screen, 1);
    assert.equal(player.storyTime, 20);

    player.setRate(2);
    player.playTo(80, 10);
    wait(screen, 3);
    player.play();
    assert.equal(player.playing, true);
    assert.equal(player.speed, 2);
    const from = player.storyTime;
    wait(screen, 1);
    assert.ok(Math.abs(player.storyTime - from - 2) < 0.05, 'plays on at the chosen speed');
    player.pause();
  });
});
