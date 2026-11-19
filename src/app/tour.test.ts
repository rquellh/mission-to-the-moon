/**
 * The guided tour with the real mission clock, run without a browser: a fake
 * animation-frame loop stands in for the screen. Every stop must end with
 * the clock exactly on the stop's time, the tour saying it has arrived, and
 * the clock still, on fast screens and on slow ones.
 *
 * Run: node --test src/app/tour.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { elapsedToSeconds, type Mission } from "../content/types.ts";
import type { FlightPlan } from "../sim/types.ts";
import { buildFlightPath, createStoryTime } from "../sim/index.ts";
import type { Director } from "./contract.ts";
import { MissionPlayer } from "./player.ts";
import { Tour } from "./tour.ts";
import { story as gemini7 } from "../content/missions/gemini-7/story.ts";
import { flight as gemini7Flight } from "../content/missions/gemini-7/flight.ts";
import { story as apollo8 } from "../content/missions/apollo-8/story.ts";
import { flight as apollo8Flight } from "../content/missions/apollo-8/flight.ts";
import { story as apollo15 } from "../content/missions/apollo-15/story.ts";
import { flight as apollo15Flight } from "../content/missions/apollo-15/flight.ts";

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
    now: () => nowMs,
    frame(): void {
      nowMs += frameMs;
      const due = queue;
      queue = [];
      for (const callback of due) callback(nowMs);
    },
  };
}

/** The player and tour, built the way main.ts builds them. */
function setUp(mission: Mission, plan: FlightPlan, screen: ReturnType<typeof fakeScreen>) {
  const path = buildFlightPath(plan);
  const story = createStoryTime([path.start, path.end, ...mission.events.map((event) => elapsedToSeconds(event.elapsed))]);
  const keys = story.keyTimes;
  const player = new MissionPlayer(keys[0] ?? path.start, keys[keys.length - 1] ?? path.end, {
    duration: story.length,
    toStory: (seconds) => story.toStory(seconds),
    toElapsed: (seconds) => story.toMission(seconds),
  });
  const director: Director = {
    scaleMode: "readable",
    view: "earth",
    setScaleMode() {},
    setView() {},
    setViewInsets() {},
    subscribe: () => () => {},
  };
  return { player, tour: new Tour(mission, player, director, { now: screen.now }) };
}

const flights: Array<[string, Mission, FlightPlan]> = [
  ["Gemini 7", gemini7, gemini7Flight],
  ["Apollo 8", apollo8, apollo8Flight],
  ["Apollo 15", apollo15, apollo15Flight],
];

describe("the tour stops on each stop's time", () => {
  for (const [name, mission, plan] of flights) {
    for (const [screenName, frameMs] of [["60 frames a second", 1000 / 60], ["4 frames a second", 250], ["1 frame a second", 1000]] as const) {
      it(`${name}, ${screenName}`, () => {
        const screen = fakeScreen(frameMs);
        const { player, tour } = setUp(mission, plan, screen);
        assert.ok(tour.total > 1, `${name} has a tour`);
        // Real seconds at most: the run-up (3) plus its grace (2), plus one frame.
        const frameLimit = Math.ceil((5 * 1000) / frameMs) + 2;
        for (let stop = 0; stop < tour.total; stop += 1) {
          if (stop === 0) tour.start(0);
          else tour.next();
          let frames = 0;
          while (tour.phase === "traveling" && frames < frameLimit) {
            screen.frame();
            frames += 1;
          }
          const event = tour.stop!;
          assert.equal(tour.phase, "stopped", `stop ${stop + 1} (${event.title}) arrives within ${frameLimit} frames`);
          assert.equal(player.playing, false, `the clock is still at stop ${stop + 1}`);
          assert.ok(Math.abs(player.time - elapsedToSeconds(event.elapsed)) < 0.01, `clock on ${event.title}'s time`);
          // Two more seconds of screen: nothing moves.
          for (let i = 0; i < Math.ceil(2000 / frameMs); i += 1) screen.frame();
          assert.ok(Math.abs(player.time - elapsedToSeconds(event.elapsed)) < 0.01, `clock stays on ${event.title}`);
        }
      });
    }
  }
});
