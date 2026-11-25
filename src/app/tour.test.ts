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
import { flight as gemini10Flight } from '../content/missions/gemini-10/flight.ts';
import { story as gemini10 } from '../content/missions/gemini-10/story.ts';
import { elapsedToSeconds, type EventView, type Mission } from '../content/types.ts';
import {
  buildFlightPath,
  createStoryTime,
  partingsAtEvents,
  storyKeyTimes,
  type StoryTimeOptions,
} from '../sim/index.ts';
import type { FlightPlan } from '../sim/types.ts';
import type { Director, StoryMap } from './contract.ts';
import { MissionPlayer, tripShape } from './player.ts';
import {
  CAMERA_SETTLE_MAX_SECONDS,
  EARLY_VIEW_MISSION_SECONDS,
  PARTING_HOLD_SECONDS,
  PARTING_REST_MAX_SHARE,
  PARTING_REST_STORY_SECONDS,
  PARTING_VIEW_SETTLE_SECONDS,
  playSeconds,
  RUN_UP_MAX_MISSION_SECONDS,
  RUN_UP_MIN_STORY_SECONDS,
  RUN_UP_STORY_SECONDS,
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

/**
 * The player and tour, built the way main.ts builds them. `scene` says
 * whether the fake scene reports a moving camera (`Director.moving`): left
 * out, it does not say, as the real scene did when this was written.
 * `clock` changes how the story clock is built, for a case no real flight's
 * clock has.
 */
function setUp(
  mission: Mission,
  plan: FlightPlan,
  screen: Screen,
  options: TourOptions = {},
  scene: { reportsMoving?: boolean } = {},
  clock: StoryTimeOptions = {},
) {
  const path = buildFlightPath(plan);
  const eventTimes = mission.events.map((event) => elapsedToSeconds(event.elapsed));
  const story = createStoryTime(storyKeyTimes(path, eventTimes), clock);
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
  // Every view the tour asks for, when, how fast the clock was going then, and the moment it asked to frame.
  const views: Array<{ view: EventView; atMs: number; speed: number; at: number | undefined }> = [];
  const listeners = new Set<(director: Director) => void>();
  let viewNow: EventView = 'earth';
  let fastForwardNow = false;
  let movingNow = false;
  const director: Director = {
    scaleMode: 'readable',
    get view() {
      return viewNow;
    },
    get fastForward() {
      return fastForwardNow;
    },
    setScaleMode() {},
    setView(view, viewOptions) {
      viewNow = view;
      views.push({ view, atMs: screen.now(), speed: player.speed, at: viewOptions?.at });
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
  // A scene that says whether its camera is moving has the member at all; one that does not, lacks it.
  if (scene.reportsMoving) Object.defineProperty(director, 'moving', { get: () => movingNow });
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
    /** The scene's camera starts or stops moving, and the scene says so (with `reportsMoving`). */
    setMoving(on: boolean): void {
      movingNow = on;
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

/** What the tour's listeners hear from now on: its phase and the stop on screen, each time it tells them. */
function heard(tour: Tour): string[] {
  const told: string[] = [];
  tour.subscribe(() => told.push(`${tour.phase}: ${tour.shownStop?.id ?? 'none'}`));
  return told;
}

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

  /** Apollo 11's tour at a stop, with Next pressed for the one after. */
  function leavingApollo11(stopId: string, screen: Screen) {
    const set = setUp(apollo11, apollo11Flight, screen);
    const at = set.tour.stops.findIndex((stop) => stop.id === stopId);
    set.tour.start(at);
    travel(set.tour, screen);
    expect(set.views).toHaveLength(1);
    set.tour.next();
    return { ...set, startMs: screen.now() };
  }

  it.each([
    ['the Moon view: "Eagle undocks" to "The Eagle has landed"', 'undocking', 'moon'],
    ['the journey view: "Back together" to "Heading home"', 'docking', 'journey'],
  ] as const)(
    'heading for %s, waits while fast forward shows when the move is due, and moves as it ends',
    (_name, from, view) => {
      const screen = fakeScreen(1000 / 60);
      const { player, tour, views, startMs, setFastForward } = leavingApollo11(from, screen);
      const due = TRIP_MAX_SECONDS - VIEW_LEAD_SECONDS;
      wait(screen, due - 1);
      setFastForward(true);

      wait(screen, 2.5);
      expect(views).toHaveLength(1);
      setFastForward(false);
      const endedAt = (screen.now() - startMs) / 1000;
      const took = endedAt + travel(tour, screen);

      expect(views).toHaveLength(2);
      expect(views[1]?.view).toBe(view);
      expect((views[1]!.atMs - startMs) / 1000).toBeCloseTo(endedAt, 6);
      expect(took).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS - 1e-6);
      expect(took).toBeLessThanOrEqual(TRIP_MAX_SECONDS + 1 / 60 + 1e-6);
      assertAtStop(tour, player, tour.stop!.title);
    },
  );

  it('a fast-forward view that lasts until the stop moves the camera on arriving', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, views, setFastForward } = setUp(apollo8, apollo8Flight, screen);
    tour.start(tour.stops.findIndex((stop) => stop.id === 'christmas-eve-broadcast'));
    travel(tour, screen);
    expect(views.map(({ view }) => view)).toEqual(['moon']);
    tour.next();
    expect(tour.stop?.id).toBe('transearth-injection');

    wait(screen, 1);
    setFastForward(true);
    travel(tour, screen);

    expect(views.map(({ view }) => view)).toEqual(['moon', 'journey']);
    // On the frame that arrives, not when it was due, four seconds before.
    expect(views[1]?.atMs).toBe(screen.now());
    assertAtStop(tour, player, 'Heading home');
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
  function headingForEagleUndocks(
    screen: Screen,
    options: TourOptions = {},
    scene: { reportsMoving?: boolean } = {},
  ) {
    const set = setUp(apollo11, apollo11Flight, screen, options, scene);
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
    const samples: Array<{
      at: number;
      story: number;
      playing: boolean;
      phase: string;
      shown: string | undefined;
    }> = [];
    while (tour.phase === 'traveling' && screen.now() - startMs < 40_000) {
      screen.frame();
      samples.push({
        at: (screen.now() - startMs) / 1000,
        story: player.storyTime,
        playing: player.playing,
        phase: tour.phase,
        shown: tour.shownStop?.id,
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
        playSeconds(PARTING_REST_STORY_SECONDS) - 1e-6,
      );
      expect(last.at - playsOn.at).toBeLessThanOrEqual(
        playSeconds(PARTING_REST_STORY_SECONDS) + frame,
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
      // The Ship view was asked to frame the two there, not at the undocking.
      expect(views[1]?.at).toBeCloseTo(player.time, 3);
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

  it('shows the stop just left until the clock reaches the undocking, then "Eagle undocks" as the hold begins, not at rest', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, event, startMs } = headingForEagleUndocks(screen);
    const told = heard(tour);

    const samples = follow(tour, player, screen, startMs);

    const reached = samples.findIndex(({ story }) => story === event);
    expect(new Set(samples.slice(0, reached).map(({ shown }) => shown))).toEqual(
      new Set(['lunar-orbit-insertion']),
    );
    expect(new Set(samples.slice(reached).map(({ shown }) => shown))).toEqual(
      new Set(['undocking']),
    );
    expect(samples[reached]).toMatchObject({ phase: 'traveling', playing: false });
    expect(told).toEqual(['traveling: undocking', 'stopped: undocking']);
  });

  describe('with a scene that says when its camera is moving', () => {
    it('holds on the event only as long as the hold, when the camera has already settled', () => {
      const screen = fakeScreen(1000 / 60);
      const { player, tour, views, event, rest, startMs, setFastForward } = headingForEagleUndocks(
        screen,
        {},
        { reportsMoving: true },
      );
      // The camera moves on reaching the event, and the scene says at once that it has settled.
      setFastForward(true);

      const samples = follow(tour, player, screen, startMs);

      const reached = samples.find(({ story }) => story === event)!;
      const playsOn = samples.find(({ at, playing }) => at > reached.at && playing)!;
      expect((views[1]!.atMs - startMs) / 1000).toBeCloseTo(reached.at, 9);
      expect(playsOn.at - reached.at).toBeGreaterThanOrEqual(PARTING_HOLD_SECONDS - 1e-6);
      expect(playsOn.at - reached.at).toBeLessThanOrEqual(PARTING_HOLD_SECONDS + 1 / 60 + 1e-6);
      expectAtRest(tour, player, rest);
    });

    it('holds on the event until the camera has settled, and then plays the two apart', () => {
      const screen = fakeScreen(1000 / 60);
      const { player, tour, event, rest, setMoving } = headingForEagleUndocks(
        screen,
        {},
        { reportsMoving: true },
      );
      untilTheEvent(player, screen, event);
      setMoving(true);

      wait(screen, PARTING_HOLD_SECONDS + 1);
      expect(player.storyTime).toBe(event);
      expect(player.playing).toBe(false);
      setMoving(false);
      screen.frame();

      expect(player.playing).toBe(true);
      travel(tour, screen);
      expectAtRest(tour, player, rest);
    });

    it('plays on after 3 seconds when the scene never says the camera has settled', () => {
      const screen = fakeScreen(1000 / 60);
      const { player, tour, event, startMs, setMoving } = headingForEagleUndocks(
        screen,
        {},
        { reportsMoving: true },
      );
      setMoving(true);

      const samples = follow(tour, player, screen, startMs);

      const reached = samples.find(({ story }) => story === event)!;
      const playsOn = samples.find(({ at, playing }) => at > reached.at && playing)!;
      expect(playsOn.at - reached.at).toBeGreaterThanOrEqual(CAMERA_SETTLE_MAX_SECONDS - 1e-6);
      expect(playsOn.at - reached.at).toBeLessThanOrEqual(
        CAMERA_SETTLE_MAX_SECONDS + 1 / 60 + 1e-6,
      );
    });
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

  it('Back from the landing, and starting at the stop, play the last 30 minutes up to the event, hold, play on, and rest', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, at, event, rest } = headingForEagleUndocks(screen);
    travel(tour, screen, 30);
    tour.next();
    travel(tour, screen);
    expect(tour.stop?.id).toBe('landing');
    // The day in lunar orbit slows into the undocking: its last 30 minutes are 2.7 story seconds.
    const from = player.story.toStory(undocking - RUN_UP_MAX_MISSION_SECONDS);
    expect(event - from).toBeGreaterThan(2);
    expect(event - from).toBeLessThan(RUN_UP_STORY_SECONDS);
    // The camera moved to the Ship view as the run-up began, so it has settled by the event: the short hold.
    const takes =
      playSeconds(event - from) + PARTING_HOLD_SECONDS + playSeconds(PARTING_REST_STORY_SECONDS);

    // From the Moon view.
    tour.back();
    expect(player.storyTime).toBeCloseTo(from, 9);
    expect(tour.phase).toBe('traveling');
    const backTook = travel(tour, screen);
    expectAtRest(tour, player, rest);
    // Already in the Ship view.
    tour.start(at);
    expect(player.storyTime).toBeCloseTo(from, 9);
    const startTook = travel(tour, screen);

    expectAtRest(tour, player, rest);
    expect(backTook).toBeGreaterThanOrEqual(takes - 1e-6);
    expect(backTook).toBeLessThanOrEqual(takes + 3 / 60 + 1e-6);
    expect(startTook).toBeGreaterThanOrEqual(takes - 1e-6);
    expect(startTook).toBeLessThanOrEqual(takes + 3 / 60 + 1e-6);
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

describe('the stop on screen', () => {
  it('is none until the tour starts, and none once it has finished', () => {
    const screen = fakeScreen(1000 / 60);
    const { tour } = setUp(gemini7, gemini7Flight, screen);
    expect(tour.shownStop).toBeNull();
    tour.start(tour.total - 1);
    travel(tour, screen);
    expect(tour.shownStop?.id).toBe('splashdown');

    tour.next();

    expect(tour.phase).toBe('finished');
    expect(tour.shownStop).toBeNull();
  });

  it('on a trip, is the stop just left until the clock reaches the next one', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    tour.start(0);
    const told = heard(tour);
    tour.next();
    const target = storyOf(player, tour, 1);

    const shown = new Set<string | undefined>();
    while (tour.phase === 'traveling') {
      screen.frame();
      if (player.storyTime < target) shown.add(tour.shownStop?.id);
    }

    expect(shown).toEqual(new Set(['liftoff']));
    expect(tour.shownStop?.id).toBe('translunar-injection');
    expect(told).toEqual(['traveling: liftoff', 'stopped: translunar-injection']);
  });

  it('on a run-up, follows the clock: the stop before, until the clock reaches the stop', () => {
    const screen = fakeScreen(1000 / 60);
    const { tour } = setUp(apollo11, apollo11Flight, screen);
    tour.start(2);
    travel(tour, screen);
    expect(tour.shownStop?.id).toBe('transposition-docking');
    const told = heard(tour);

    // The run-up to the burn starts in Earth orbit, half an hour before it.
    tour.back();
    travel(tour, screen);

    expect(told).toEqual(['traveling: liftoff', 'stopped: translunar-injection']);
  });

  it('before the first stop, is the first stop (Gemini 10: the Agena flies first)', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(gemini10, gemini10Flight, screen);
    const told = heard(tour);

    tour.start(0);
    expect(player.time).toBeLessThan(0);
    travel(tour, screen);

    expect(told).toEqual(['traveling: liftoff', 'stopped: liftoff']);
  });
});

describe('stopping once the camera has settled', () => {
  /** Apollo 8 at liftoff, with Next pressed for "Leaving Earth behind", in a scene that says when its camera moves. */
  function onTheWay(screen: Screen) {
    const set = setUp(apollo8, apollo8Flight, screen, {}, { reportsMoving: true });
    set.tour.start(0);
    expect(set.tour.phase).toBe('stopped');
    set.tour.next();
    return { ...set, startMs: screen.now(), event: elapsedToSeconds(set.tour.stops[1]!.elapsed) };
  }

  it('stays on the way at the stop while the camera is still moving, and stops once it has settled', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, setMoving, event } = onTheWay(screen);
    wait(screen, TRIP_MAX_SECONDS - 1);
    setMoving(true);

    wait(screen, 2);

    expect(tour.phase).toBe('traveling');
    expect(player.playing).toBe(false);
    expect(player.time).toBeCloseTo(event, 6);
    expect(tour.shownStop?.id).toBe('translunar-injection');
    setMoving(false);
    assertAtStop(tour, player, 'Leaving Earth behind');
  });

  it('stops 3 seconds after arriving at most, when the scene never says the camera has settled', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, setMoving } = onTheWay(screen);
    setMoving(true);

    const took = travel(tour, screen, 30);

    expect(took).toBeGreaterThanOrEqual(TRIP_MAX_SECONDS + CAMERA_SETTLE_MAX_SECONDS - 1e-6);
    expect(took).toBeLessThanOrEqual(TRIP_MAX_SECONDS + CAMERA_SETTLE_MAX_SECONDS + 2 / 60 + 1e-6);
    assertAtStop(tour, player, 'Leaving Earth behind');
  });

  it('Skip stops at the stop at once, with the camera still moving', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, setMoving } = onTheWay(screen);
    wait(screen, 2);
    setMoving(true);

    tour.next();

    assertAtStop(tour, player, 'Leaving Earth behind');
  });

  it('waits for the camera after a cut straight to a stop as well', () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, setMoving } = setUp(
      apollo11,
      apollo11Flight,
      screen,
      {},
      { reportsMoving: true },
    );
    setMoving(true);

    // Liftoff is at the very start of the clock, with nothing before it to run up from.
    tour.start(0);

    expect(tour.phase).toBe('traveling');
    expect(tour.shownStop?.id).toBe('liftoff');
    setMoving(false);
    assertAtStop(tour, player, 'Liftoff');
  });
});

describe('the moment each view frames', () => {
  it("is where the clock rests at the stop, on every move to a stop's view", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour, views, setFastForward } = setUp(apollo11, apollo11Flight, screen);
    /** Arrive, then check each move the tour asked for on the way against where the clock rests. */
    const arrive = (from: number): void => {
      travel(tour, screen, 30);
      expect(tour.phase).toBe('stopped');
      for (const { at } of views.slice(from)) expect(at).toBeCloseTo(player.time, 2);
    };

    tour.start(0);
    arrive(0);
    for (let stop = 1; stop < tour.total; stop += 1) {
      const from = views.length;
      tour.next();
      // A time-lapse late in every trip, so some moves wait for it to end.
      wait(screen, 10);
      setFastForward(true);
      wait(screen, 2);
      setFastForward(false);
      arrive(from);
    }
    // Back, and Skip.
    let from = views.length;
    tour.back();
    arrive(from);
    from = views.length;
    tour.next();
    wait(screen, 1);
    tour.next();
    arrive(from);

    // One move for every stop reached.
    expect(views).toHaveLength(tour.total + 2);
  });
});

describe('the short run-up', () => {
  it('starting, going back, and starting over cut to shortly before the stop and play up to it, never faster than exploring', () => {
    for (const [, frameMs] of screens) {
      const screen = fakeScreen(frameMs);
      const { player, tour } = setUp(apollo15, apollo15Flight, screen);
      const frame = frameMs / 1000 + 1e-6;
      const runUp = (go: () => void): void => {
        go();
        expect(tour.phase).toBe('traveling');
        const target = storyOf(player, tour, tour.index);
        const eventTime = elapsedToSeconds(tour.stops[tour.index]!.elapsed);
        const story = target - player.storyTime;
        const mission = eventTime - player.time;
        // No more than 3 story seconds before the stop, and no more than 30 minutes: one or the other.
        expect(story).toBeLessThanOrEqual(RUN_UP_STORY_SECONDS + 1e-9);
        expect(mission).toBeLessThanOrEqual(RUN_UP_MAX_MISSION_SECONDS + 1e-6);
        expect(
          Math.min(RUN_UP_STORY_SECONDS - story, (RUN_UP_MAX_MISSION_SECONDS - mission) / 60),
        ).toBeCloseTo(0, 6);
        let fastest = 0;
        const startMs = screen.now();
        while (tour.phase === 'traveling' && screen.now() - startMs < 10_000) {
          screen.frame();
          fastest = Math.max(fastest, player.speed);
        }
        const took = (screen.now() - startMs) / 1000;
        // At normal speed between the eases, one story second per real second, and no faster.
        expect(fastest).toBeLessThanOrEqual(1 + 1e-9);
        expect(took).toBeGreaterThanOrEqual(playSeconds(story) - 1e-6);
        expect(took).toBeLessThanOrEqual(playSeconds(story) + frame);
        assertAtStop(tour, player, `run-up to stop ${tour.index + 1}`);
      };
      // Landing at Hadley: the last 30 minutes, 2.7 story seconds.
      runUp(() => tour.start(3));
      runUp(() => tour.back());
      // Back partway through a trip returns to the stop just left.
      tour.next();
      wait(screen, 2);
      expect(tour.index).toBe(3);
      runUp(() => tour.back());
      expect(tour.index).toBe(2);
      // Starting again from the ending: the last 3 story seconds before splashdown, under 7 minutes.
      tour.start(tour.total - 1);
      travel(tour, screen);
      tour.next();
      expect(tour.phase).toBe('finished');
      runUp(() => tour.back());
      expect(tour.index).toBe(tour.total - 1);
      // Starting over from the ending: the first stop is at the start of the story, so the tour is there at once.
      tour.next();
      tour.start(0);
      assertAtStop(tour, player, 'start over');
      // The speed chosen for exploring makes no difference: a run-up leaves it alone, as a trip does.
      player.setRate(4);
      runUp(() => tour.start(5));
      expect(player.rate).toBe(4);
    }
  });

  it('cuts straight to a stop when 30 minutes before it is less than a story second', () => {
    const screen = fakeScreen(1000 / 60);
    // Every real flight's clock slows into its events, so its last 30 minutes before a stop are
    // two story seconds or more. Played evenly, as it once was, Apollo 11's is not.
    const { player, tour, views } = setUp(
      apollo11,
      apollo11Flight,
      screen,
      {},
      {},
      { ease: false },
    );
    const orbit = tour.stops.findIndex((stop) => stop.id === 'lunar-orbit-insertion');
    // Played evenly, the three-day coast the orbit insertion closes has its last 30 minutes in a seventh of a story second.
    expect(
      storyOf(player, tour, orbit) -
        player.story.toStory(elapsedToSeconds('075:49:50.37') - RUN_UP_MAX_MISSION_SECONDS),
    ).toBeLessThan(RUN_UP_MIN_STORY_SECONDS);

    tour.start(orbit);

    assertAtStop(tour, player, 'Into orbit around the Moon, at once');
    expect(views.map(({ view }) => view)).toEqual(['moon']);
    tour.next();
    travel(tour, screen, 30);
    tour.back();
    assertAtStop(tour, player, 'Back to Into orbit around the Moon, at once');
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
    // A run-up, not a trip from wherever the clock is: the last 30 minutes before leaving Earth.
    expect(elapsedToSeconds(tour.stops[1]!.elapsed) - RUN_UP_MAX_MISSION_SECONDS).toBeCloseTo(
      player.time,
      6,
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
