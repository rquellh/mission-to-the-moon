/**
 * The guided tour with the real mission clock, run without a browser: a fake
 * animation-frame loop stands in for the screen. Every stop must end with
 * the clock exactly on the stop's time, the tour saying it has arrived, and
 * the clock still, on fast screens and on slow ones. Next flies the whole
 * stretch to the next stop in its set number of real seconds, on any screen.
 *
 * Run: npx vitest run src/app/tour.test.ts
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { elapsedToSeconds, type EventView, type Mission } from "../content/types.ts";
import type { FlightPlan } from "../sim/types.ts";
import { buildFlightPath, createStoryTime } from "../sim/index.ts";
import type { Director, StoryMap } from "./contract.ts";
import { MissionPlayer, tripShape } from "./player.ts";
import { SKIP_GUARD_MS, Tour, TRIP_MAX_SECONDS, TRIP_MIN_SECONDS, tripSeconds, VIEW_LEAD_SECONDS, type TourOptions } from "./tour.ts";
import { story as gemini7 } from "../content/missions/gemini-7/story.ts";
import { flight as gemini7Flight } from "../content/missions/gemini-7/flight.ts";
import { story as apollo8 } from "../content/missions/apollo-8/story.ts";
import { flight as apollo8Flight } from "../content/missions/apollo-8/flight.ts";
import { story as apollo12 } from "../content/missions/apollo-12/story.ts";
import { flight as apollo12Flight } from "../content/missions/apollo-12/flight.ts";
import { story as apollo15 } from "../content/missions/apollo-15/story.ts";
import { flight as apollo15Flight } from "../content/missions/apollo-15/flight.ts";

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
  const story = createStoryTime([path.start, path.end, ...mission.events.map((event) => elapsedToSeconds(event.elapsed))]);
  const keys = story.keyTimes;
  const map: StoryMap = {
    duration: story.length,
    toStory: (seconds) => story.toStory(seconds),
    toElapsed: (seconds) => story.toMission(seconds),
  };
  const player = new MissionPlayer(keys[0] ?? path.start, keys[keys.length - 1] ?? path.end, map, screen.now);
  // Every view the tour asks for, and when.
  const views: Array<{ view: EventView; atMs: number }> = [];
  const director: Director = {
    scaleMode: "readable",
    view: "earth",
    setScaleMode() {},
    setView(view) {
      views.push({ view, atMs: screen.now() });
    },
    setViewInsets() {},
    subscribe: () => () => {},
  };
  return { player, views, tour: new Tour(mission, player, director, { now: screen.now, ...options }) };
}

/** Draw frames while the tour travels, up to a limit. Returns the real seconds it took. */
function travel(tour: Tour, screen: Screen, limitSeconds = TRIP_MAX_SECONDS + 4): number {
  const startMs = screen.now();
  while (tour.phase === "traveling" && screen.now() - startMs < limitSeconds * 1000) screen.frame();
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
  assert.equal(tour.phase, "stopped", `${what}: arrived at ${event.title}`);
  assert.equal(player.playing, false, `${what}: the clock is still`);
  assert.ok(Math.abs(player.time - elapsedToSeconds(event.elapsed)) < 0.01, `${what}: clock on ${event.title}'s time`);
}

const storyOf = (player: MissionPlayer, tour: Tour, index: number): number =>
  player.story.toStory(elapsedToSeconds(tour.stops[index]!.elapsed));

const flights: Array<[string, Mission, FlightPlan]> = [
  ["Gemini 7", gemini7, gemini7Flight],
  ["Apollo 8", apollo8, apollo8Flight],
  ["Apollo 15", apollo15, apollo15Flight],
];

const screens = [
  ["60 frames a second", 1000 / 60],
  ["4 frames a second", 250],
  ["1 frame a second", 1000],
] as const;

describe("the tour flies from stop to stop", () => {
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
          if (stop > 0) assert.equal(last, from, `stop ${stop + 1}: the trip starts where the last stop was`);
          while (tour.phase === "traveling" && screen.now() - startMs < (TRIP_MAX_SECONDS + 4) * 1000) {
            screen.frame();
            assert.ok(player.storyTime >= last - 1e-9, `stop ${stop + 1}: the clock never runs backward`);
            assert.ok(player.storyTime <= to + 1e-9, `stop ${stop + 1}: the clock never passes the stop`);
            if (tour.phase === "traveling") assert.equal(player.rate, 1, "a trip leaves the speed alone");
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
        assert.equal(tour.phase, "finished");
      });
    }
  }
});

describe("how long a trip takes", () => {
  it("is the story time between the stops, kept within the limits", () => {
    assert.equal(tripSeconds(9.4), 9.4);
    assert.equal(tripSeconds(2.7), TRIP_MIN_SECONDS);
    assert.equal(tripSeconds(0.1), TRIP_MIN_SECONDS);
    assert.equal(tripSeconds(53.8), TRIP_MAX_SECONDS);
    assert.equal(TRIP_MIN_SECONDS, 5);
    assert.equal(TRIP_MAX_SECONDS, 14);
  });

  it("a short hop still takes the shortest trip (Apollo 12: liftoff to the lightning)", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo12, apollo12Flight, screen);
    tour.start(0);
    travel(tour, screen);
    const from = player.storyTime;
    tour.next();
    const took = travel(tour, screen);
    assert.ok(storyOf(player, tour, 1) - from < TRIP_MIN_SECONDS, "the two stops are close in story time");
    assert.ok(Math.abs(took - TRIP_MIN_SECONDS) <= 0.02, `took ${took.toFixed(3)} s`);
    assertAtStop(tour, player, "Apollo 12 stop 2");
  });

  it("a long stretch takes the longest trip (Apollo 8: on the way home to splashdown)", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    tour.start(tour.total - 2);
    travel(tour, screen);
    const from = player.storyTime;
    tour.next();
    const took = travel(tour, screen);
    assert.ok(storyOf(player, tour, tour.total - 1) - from > TRIP_MAX_SECONDS, "the two stops are far apart in story time");
    assert.ok(Math.abs(took - TRIP_MAX_SECONDS) <= 0.02, `took ${took.toFixed(3)} s`);
    assertAtStop(tour, player, "Apollo 8 splashdown");
  });

  it("does not depend on the chosen speed, which it leaves alone", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    player.setRate(4);
    tour.start(0);
    travel(tour, screen);
    const from = player.storyTime;
    tour.next();
    const took = travel(tour, screen);
    assert.ok(Math.abs(took - tripSeconds(storyOf(player, tour, 1) - from)) <= 0.02, `took ${took.toFixed(3)} s`);
    assert.equal(player.rate, 4);
    assertAtStop(tour, player, "Apollo 8 stop 2");
  });

  it("eases out of one stop and into the next", () => {
    for (const seconds of [3, 5, 9.4, 14]) {
      assert.equal(tripShape(0, seconds).share, 0);
      assert.equal(tripShape(0, seconds).pace, 0, "it sets off from a standstill");
      assert.ok(Math.abs(tripShape(seconds, seconds).share - 1) < 1e-12);
      assert.ok(tripShape(seconds, seconds).pace < 1e-12, "it comes to rest at the stop");
      let last = 0;
      for (let i = 1; i <= 1000; i += 1) {
        const now = tripShape((seconds * i) / 1000, seconds).share;
        assert.ok(now >= last - 1e-12, "it only moves forward");
        // No step is much larger than the top speed allows: no jumps anywhere.
        assert.ok(now - last <= 2.5 / 1000 + 1e-9, `a smooth step at ${i}`);
        last = now;
      }
      // The first half second covers less than the average pace would.
      assert.ok(tripShape(0.5, seconds).share < 0.5 / seconds);
      assert.ok(1 - tripShape(seconds - 0.5, seconds).share < 0.5 / seconds);
    }
  });
});

describe("the camera on a trip", () => {
  it("keeps its view, and moves to the stop's view a few seconds before arriving", () => {
    for (const [, frameMs] of screens) {
      const screen = fakeScreen(frameMs);
      const { tour, views } = setUp(apollo8, apollo8Flight, screen);
      tour.start(tour.total - 2);
      travel(tour, screen);
      assert.equal(views.length, 1, "the run-up moves the camera at once");
      const startMs = screen.now();
      tour.next();
      const seconds = TRIP_MAX_SECONDS;
      assert.equal(views.length, 1, "not yet");
      travel(tour, screen);
      assert.equal(views.length, 2);
      const at = (views[1]!.atMs - startMs) / 1000;
      const planned = seconds - VIEW_LEAD_SECONDS;
      assert.ok(at >= planned - 1e-6 && at <= planned + frameMs / 1000 + 1e-6, `moved at ${at} s, planned ${planned} s`);
      assert.equal(views[1]!.view, tour.stop!.view);
    }
  });

  it("Skip arrives in the stop's view; leaving the tour keeps the view it is in", () => {
    const screen = fakeScreen(1000 / 60);
    const { tour, views } = setUp(apollo8, apollo8Flight, screen);
    tour.start(0);
    tour.next();
    wait(screen, 1);
    assert.equal(views.length, 1);
    tour.next();
    assert.equal(views.length, 2, "Skip moves the camera");
    assert.equal(views[1]!.view, tour.stop!.view);
    tour.next();
    wait(screen, 1);
    tour.exit();
    wait(screen, 14);
    assert.equal(views.length, 2, "no move after leaving");
  });
});

describe("Next on the way to a stop", () => {
  it("arrives at the stop at once, after a short guard, and does not skip a stop", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    tour.start(0);
    travel(tour, screen);
    tour.next();
    assert.equal(tour.phase, "traveling");
    assert.equal(tour.index, 1);

    // A double tap: the second press comes too soon and is ignored.
    tour.next();
    assert.equal(tour.phase, "traveling", "a press at once is ignored");
    wait(screen, (SKIP_GUARD_MS - 100) / 1000);
    tour.next();
    assert.equal(tour.phase, "traveling", "a press inside the guard is ignored");
    assert.equal(tour.index, 1);

    wait(screen, 0.2);
    tour.next();
    assert.equal(tour.index, 1, "Skip arrives at the stop it was heading for");
    assertAtStop(tour, player, "after Skip");
    const at = player.time;
    wait(screen, 2);
    assert.equal(player.time, at, "the clock stays put after Skip");

    // The next Next starts the next trip as usual.
    tour.next();
    assert.equal(tour.phase, "traveling");
    assert.equal(tour.index, 2);
    travel(tour, screen);
    assertAtStop(tour, player, "the stop after");
  });

  it("on the way to the last stop arrives there rather than finishing", () => {
    const screen = fakeScreen(250);
    const { player, tour } = setUp(gemini7, gemini7Flight, screen);
    tour.start(tour.total - 2);
    travel(tour, screen);
    tour.next();
    wait(screen, 1);
    tour.next();
    assert.equal(tour.index, tour.total - 1);
    assertAtStop(tour, player, "the last stop");
    tour.next();
    assert.equal(tour.phase, "finished");
  });
});

describe("the short run-up stays as it was", () => {
  it("starting, going back, and starting over cut to just before the stop and play 3 seconds", () => {
    for (const [, frameMs] of screens) {
      const screen = fakeScreen(frameMs);
      const { player, tour } = setUp(apollo15, apollo15Flight, screen);
      const tolerance = frameMs / 1000 + 1e-6;
      const runUp = (what: string, go: () => void): void => {
        go();
        assert.equal(tour.phase, "traveling", `${what}: on the way`);
        const target = storyOf(player, tour, tour.index);
        assert.ok(Math.abs(player.storyTime - Math.max(0, target - 3 * player.rate)) < 1e-9, `${what}: starts 3 story seconds before`);
        const took = travel(tour, screen);
        assert.ok(took >= 3 - 1e-6 && took <= 3 + tolerance, `${what}: took ${took.toFixed(3)} s`);
        assertAtStop(tour, player, what);
      };
      runUp("start", () => tour.start(3));
      runUp("back", () => tour.back());
      // Back partway through a trip returns to the stop just left.
      tour.next();
      wait(screen, 2);
      assert.equal(tour.index, 3);
      runUp("back during a trip", () => tour.back());
      assert.equal(tour.index, 2);
      // Starting again from the ending.
      tour.start(tour.total - 1);
      travel(tour, screen);
      tour.next();
      assert.equal(tour.phase, "finished");
      runUp("back from the ending", () => tour.back());
      assert.equal(tour.index, tour.total - 1);
      // Starting over from the ending: the first stop is at the start of the story, so the tour is there at once.
      tour.next();
      tour.start(0);
      assertAtStop(tour, player, "start over");
      // At double speed the run-up covers twice the story in the same real time, as before.
      player.setRate(2);
      runUp("start at double speed", () => tour.start(4));
    }
  });

  it("with reduced motion, every move jumps straight to the stop", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen, { jumpStraight: () => true });
    tour.start(0);
    assertAtStop(tour, player, "start");
    tour.next();
    assert.equal(tour.index, 1);
    assertAtStop(tour, player, "next");
    tour.next();
    tour.back();
    assert.equal(tour.index, 1);
    assertAtStop(tour, player, "back");
    wait(screen, 1);
    assertAtStop(tour, player, "a second later");
  });

  it("Next uses the run-up when the clock was moved away from the stop", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo8, apollo8Flight, screen);
    tour.start(0);
    travel(tour, screen);
    player.seekStory(player.storyTime + 1);
    tour.next();
    const target = storyOf(player, tour, 1);
    assert.ok(Math.abs(player.storyTime - (target - 3)) < 1e-9, "a run-up, not a trip from wherever the clock is");
    travel(tour, screen);
    assertAtStop(tour, player, "stop 2");
  });
});

describe("the clock interrupted on a trip", () => {
  for (const [what, interrupt] of [
    ["paused", (player: MissionPlayer) => player.pause()],
    ["sought", (player: MissionPlayer) => player.seek(player.start)],
    ["sought in story time", (player: MissionPlayer) => player.seekStory(player.storyTime + 0.5)],
  ] as const) {
    it(`${what}: the trip ends and the tour arrives, and carries on from there`, () => {
      const screen = fakeScreen(1000 / 60);
      const { player, tour } = setUp(apollo15, apollo15Flight, screen);
      tour.start(1);
      travel(tour, screen);
      tour.next();
      wait(screen, 2);
      assert.equal(tour.phase, "traveling");
      interrupt(player);
      assert.equal(tour.index, 2);
      assertAtStop(tour, player, `after the clock was ${what}`);
      wait(screen, 1);
      assertAtStop(tour, player, "a second later");
      tour.next();
      assert.equal(tour.phase, "traveling");
      travel(tour, screen);
      assert.equal(tour.index, 3);
      assertAtStop(tour, player, "the next stop");
    });
  }

  it("played: the clock plays on at its own speed, and the tour still arrives", () => {
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
    assertAtStop(tour, player, "after play");
  });

  it("leaving the tour on a trip stops the clock where it is", () => {
    const screen = fakeScreen(1000 / 60);
    const { player, tour } = setUp(apollo15, apollo15Flight, screen);
    tour.start(1);
    travel(tour, screen);
    tour.next();
    wait(screen, 2);
    tour.exit();
    assert.equal(tour.phase, "off");
    assert.equal(player.playing, false);
    const at = player.storyTime;
    wait(screen, 1);
    assert.equal(player.storyTime, at);
    assert.ok(at < storyOf(player, tour, 2), "short of the stop");
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

  it("does not leap after a stalled tab", () => {
    const screen = fakeScreen(1000 / 60);
    const player = make(screen);
    player.playTo(50, 10);
    wait(screen, 2);
    const before = player.storyTime;
    screen.stall(30_000);
    screen.frame();
    assert.equal(player.playing, true, "still on its way");
    assert.ok(player.storyTime - before < 10, "moved no more than about a second's worth");
  });

  it("is ended by pause, seek, and play", () => {
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
    assert.equal(player.playing, false, "a jump ends the trip");
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
    assert.ok(Math.abs(player.storyTime - from - 2) < 0.05, "plays on at the chosen speed");
    player.pause();
  });
});
