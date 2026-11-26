/**
 * A trip's plan (planTrip): the usual shape where the clock's craft allow it,
 * and one held to the clock's hurry limit where they do not. The clocks here
 * are made up: story seconds map to a thousand mission seconds each, and the
 * limit is set by hand, so each rule is seen on its own.
 */
import { describe, expect, it } from 'vitest';
import type { StoryMap } from './contract.ts';
import {
  planTrip,
  TRIP_ARRIVE_SECONDS,
  TRIP_DEPART_SECONDS,
  TRIP_EASE_SECONDS,
  TRIP_FINAL_RUN_MISSION_SECONDS,
  TRIP_LIMITED_MAX_SECONDS,
  tripShape,
  type TripPlan,
} from './player.ts';

/** A clock of 200 story seconds, a thousand mission seconds each, limited by `limit` (none when left out). */
function clock(limit?: (storySeconds: number) => number): StoryMap {
  const map = {
    duration: 200,
    toStory: (seconds: number) => seconds / 1000,
    toElapsed: (seconds: number) => seconds * 1000,
  };
  return limit ? { ...map, hurryLimit: limit } : map;
}

/** The limit is `low` story seconds per real second within [from, to] story seconds, and none elsewhere. */
const heldBetween =
  (from: number, to: number, low = 1) =>
  (s: number): number =>
    s >= from && s <= to ? low : Infinity;

/** Real seconds from 0 to `to`, every `step`. */
const times = (to: number, step = 0.01): number[] =>
  Array.from({ length: Math.floor(to / step) + 1 }, (_, i) => i * step);

/** Story seconds per real second, `elapsed` into a plan over `span` story seconds. */
const speedOf = (plan: TripPlan, span: number, elapsed: number): number =>
  span * plan.at(elapsed).pace;

describe('a trip the clock does not hold back', () => {
  it.each([
    ['with no limit at all', clock()],
    ['with a limit it never meets', clock(() => 50)],
    ['with a limit only where it goes at normal speed', clock(heldBetween(1, 4))],
  ])('keeps the usual shape and length, %s', (_name, map) => {
    const plan = planTrip(map, 0, 60, 15);

    expect(plan.limited).toBe(false);
    expect(plan.seconds).toBe(15);
    expect(plan.over).toBe(1);
    expect(plan.finalRun).toBe(TRIP_ARRIVE_SECONDS);
    for (const t of times(15, 0.05)) expect(plan.at(t)).toEqual(tripShape(t, 15, 60));
  });

  it('that does not hurry keeps the usual shape, whatever the limit', () => {
    // As long in real seconds as in story seconds: it hurries nowhere, and is left as it is.
    const plan = planTrip(clock(heldBetween(0, 100, 1)), 0, 10, 10);

    expect(plan.hurries).toBe(false);
    expect(plan.limited).toBe(false);
    for (const t of times(10, 0.05)) expect(plan.at(t)).toEqual(tripShape(t, 10, 10));
  });

  it('is planned once for the tour and the player alike', () => {
    const map = clock(heldBetween(30, 40));

    expect(planTrip(map, 0, 60, 15)).toBe(planTrip(map, 0, 60, 15));
  });
});

describe('a trip the clock holds back', () => {
  // Sixty story seconds, the usual hurry over four times normal speed, held to normal speed between
  // 30 and 40 story seconds in.
  const span = 60;
  const limit = heldBetween(30, 40);
  const plan = planTrip(clock(limit), 0, span, 15);
  const usual = (t: number) => tripShape(t, 15, span);
  const hurry = Math.max(...times(15).map((t) => span * usual(t).pace));

  it('goes no faster than the limit anywhere, and no faster than the usual hurry', () => {
    expect(plan.limited).toBe(true);
    for (const t of times(plan.seconds)) {
      const speed = speedOf(plan, span, t);
      expect(speed).toBeLessThanOrEqual(limit(span * plan.at(t).share) * (1 + 1e-9));
      expect(speed).toBeLessThanOrEqual(hurry * (1 + 1e-9));
    }
  });

  it('takes longer by what the slow part costs, within TRIP_LIMITED_MAX_SECONDS', () => {
    // Ten story seconds at normal speed that the usual hurry crossed in about two.
    expect(plan.seconds).toBeGreaterThan(15 + 7);
    expect(plan.seconds).toBeLessThan(TRIP_LIMITED_MAX_SECONDS);
    expect(plan.over).toBe(1);
  });

  it('sets off and arrives as the usual shape does, at normal speed', () => {
    for (const t of times(TRIP_DEPART_SECONDS - 0.01)) expect(plan.at(t)).toEqual(usual(t));
    for (const t of times(TRIP_DEPART_SECONDS).filter((t) => t >= TRIP_EASE_SECONDS))
      expect(speedOf(plan, span, t)).toBeCloseTo(1, 9);
    const arriving = times(TRIP_ARRIVE_SECONDS - TRIP_EASE_SECONDS).map(
      (t) => plan.seconds - TRIP_ARRIVE_SECONDS + t,
    );
    for (const t of arriving) expect(speedOf(plan, span, t)).toBeCloseTo(1, 6);
    expect(plan.at(0)).toEqual({ share: 0, pace: 0 });
    expect(plan.at(plan.seconds).share).toBeCloseTo(1, 12);
    expect(speedOf(plan, span, plan.seconds)).toBeCloseTo(0, 9);
  });

  it('changes its speed no faster than the usual ease into its hurry, with no jump', () => {
    // The usual ease: half a cosine from 1 to the hurry over a second, at its steepest.
    const steepest = (Math.PI / 2) * (hurry - 1);
    const step = 0.01;
    let last = 0;
    for (const t of times(plan.seconds, step).slice(1)) {
      const speed = speedOf(plan, span, t);
      expect(Math.abs(speed - speedOf(plan, span, t - step))).toBeLessThanOrEqual(
        steepest * step * 1.01 + 1e-9,
      );
      const share = plan.at(t).share;
      expect(share).toBeGreaterThanOrEqual(last);
      last = share;
    }
  });

  it('says how fast it is going: the pace is the rate at which it moves along', () => {
    // To a thousandth: where its rate of change of speed changes, the two sides differ a little.
    const h = 1e-4;
    for (const t of times(plan.seconds - 0.05, 0.05).slice(1)) {
      const slope = (span * (plan.at(t + h).share - plan.at(t - h).share)) / (2 * h);
      expect(slope).toBeCloseTo(speedOf(plan, span, t), 3);
    }
  });
});

describe("a trip's final run", () => {
  it('is the usual arrival when the limit holds the trip back only on its way out', () => {
    const plan = planTrip(clock(heldBetween(6, 16)), 0, 60, 15);

    expect(plan.limited).toBe(true);
    expect(plan.finalRun).toBe(TRIP_ARRIVE_SECONDS);
  });

  it('is the whole swing in when the limit holds the trip back on its way in', () => {
    // Held from 45 story seconds, fifteen thousand mission seconds (about four hours) before the stop.
    const plan = planTrip(clock(heldBetween(45, 58)), 0, 60, 15);
    const heldFrom = times(plan.seconds).find((t) => 60 * plan.at(t).share >= 45)!;

    expect(15_000).toBeLessThan(TRIP_FINAL_RUN_MISSION_SECONDS);
    expect(plan.finalRun).toBeGreaterThan(TRIP_ARRIVE_SECONDS + 5);
    // It begins where the limit takes hold, as the trip comes down to it.
    expect(plan.seconds - plan.finalRun).toBeLessThanOrEqual(heldFrom + 0.02);
    expect(plan.seconds - plan.finalRun).toBeGreaterThan(heldFrom - 1);
  });

  it('does not begin farther from the stop than TRIP_FINAL_RUN_MISSION_SECONDS', () => {
    // Held from 20 story seconds, forty thousand mission seconds (eleven hours) before the stop.
    const plan = planTrip(clock(heldBetween(20, 58)), 0, 60, 15);
    const near = times(plan.seconds).find(
      (t) => (60 - 60 * plan.at(t).share) * 1000 <= TRIP_FINAL_RUN_MISSION_SECONDS,
    )!;

    expect(plan.seconds - plan.finalRun).toBeGreaterThanOrEqual(near - 0.05);
  });
});

describe('a trip that would take longer than TRIP_LIMITED_MAX_SECONDS', () => {
  // Held to normal speed for 45 of its 60 story seconds: at the limit, more than 50 real seconds.
  const span = 60;
  const limit = heldBetween(8, 53);
  const plan = planTrip(clock(limit), 0, span, 15);

  it('takes that long and goes over the limit by one even factor where it holds the trip back', () => {
    expect(plan.seconds).toBeCloseTo(TRIP_LIMITED_MAX_SECONDS, 6);
    expect(plan.over).toBeGreaterThan(1.5);
    let fastestHeld = 0;
    for (const t of times(plan.seconds)) {
      const s = span * plan.at(t).share;
      const speed = speedOf(plan, span, t);
      expect(speed).toBeLessThanOrEqual(plan.over * limit(s) * (1 + 1e-9));
      if (s > 9 && s < 52) fastestHeld = Math.max(fastestHeld, speed);
    }
    expect(fastestHeld).toBeCloseTo(plan.over, 6);
  });
});
