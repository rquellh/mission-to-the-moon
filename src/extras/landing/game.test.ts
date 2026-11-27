/**
 * The rules of "Land on the Moon", with no drawing and no page: a run that
 * lands, the ways a touchdown can go wrong, the patch of clear ground with
 * boulders on both sides, the edges of the play area, and the fuel. The
 * flights are let along in tenths of a second, as the frames would.
 *
 * Run: npx vitest run src/extras/landing/game.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  advance,
  ahead,
  driftShows,
  fallingSpeed,
  fuelLeft,
  groundUnder,
  overClear,
  pastClear,
  push,
  RULES,
  slideSpeed,
  startFlight,
  type Contact,
  type Flight,
  type Thrust,
} from './game.ts';

/** One frame of the screen's clock. */
const FRAME = 0.1;

/** The middle of the clear patch, where a lander has room to slide a little either way. */
const MIDDLE_OF_THE_PATCH = (RULES.clearFrom + RULES.clearTo) / 2;
/** Far enough right that the right footpad is out over the boulders beyond the patch. */
const PAST_THE_PATCH = RULES.clearTo - RULES.footHalfSpan + 1;

/** Press one control `times` times. */
function press(flight: Flight, thrust: Thrust, times: number): void {
  for (let pressed = 0; pressed < times; pressed += 1) push(flight, thrust);
}

/** Let `seconds` pass a frame at a time, and say the first thing that happened, if anything did. */
function fly(flight: Flight, seconds: number): Contact | null {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame += 1) {
    const contact = advance(flight, FRAME);
    if (contact) return contact;
  }
  return null;
}

/** A start with the fall stopped, so the lander hovers where it is. */
function hovering(): Flight {
  const flight = startFlight();
  press(flight, 'up', RULES.startFalling);
  return flight;
}

/** A lander a meter above whatever is under `x`, sliding and falling by these pushes, with fuel to spare. */
const justAbove = (x: number, pushesX: number, pushesDown: number): Flight => ({
  ...startFlight(),
  x,
  height: groundUnder(x) + 1,
  pushesX,
  pushesDown,
});

describe('the landing game', () => {
  describe('landing', () => {
    it('lands after slowing the fall, sliding over to the clear ground, and stopping the slide', () => {
      const flight = startFlight();
      press(flight, 'up', 2);
      press(flight, 'right', 3);

      expect(fly(flight, 11)).toBeNull();
      expect(flight.x).toBeCloseTo(9.8);
      expect(flight.height).toBeCloseTo(6.45);

      press(flight, 'left', 3);

      expect(fly(flight, 8)).toEqual({ kind: 'landed', falling: 3 });
      expect(flight.height).toBe(0);
      expect(slideSpeed(flight)).toBe(0);
      expect(fallingSpeed(flight)).toBe(0);
      expect(fuelLeft(flight)).toBeGreaterThan(0.4);
      expect(fuelLeft(flight)).toBeLessThan(0.5);
    });

    it('counts a landing that touches down just as the fuel runs out', () => {
      const flight = { ...justAbove(MIDDLE_OF_THE_PATCH, 0, 2), height: 0.3, fuel: 0.5 };

      expect(advance(flight, 0.5)).toEqual({ kind: 'landed', falling: 2 });
      expect(fuelLeft(flight)).toBe(0);
    });
  });

  describe('the clear ground', () => {
    it.each<[string, number, number, boolean, boolean]>([
      [
        'its left footpad is still over the near boulders',
        RULES.clearFrom + RULES.footHalfSpan - 0.1,
        RULES.roughHeight,
        false,
        false,
      ],
      [
        'both footpads are just inside the near edge',
        RULES.clearFrom + RULES.footHalfSpan + 0.1,
        0,
        true,
        false,
      ],
      [
        'both footpads are just inside the far edge',
        RULES.clearTo - RULES.footHalfSpan - 0.1,
        0,
        true,
        false,
      ],
      [
        'its right footpad is out over the far boulders',
        RULES.clearTo - RULES.footHalfSpan + 0.1,
        RULES.roughHeight,
        false,
        true,
      ],
    ])('when %s', (_name, x, ground, clear, past) => {
      const flight = { ...startFlight(), x };

      expect(groundUnder(x)).toBe(ground);
      expect(overClear(flight)).toBe(clear);
      expect(pastClear(flight)).toBe(past);
    });
  });

  describe('bumps', () => {
    it('bumps too fast on the boulders after about 9.6 seconds when nothing is pressed', () => {
      const flight = startFlight();

      expect(fly(flight, 9)).toBeNull();
      expect(fly(flight, 1)).toEqual({
        kind: 'bump',
        tooFast: true,
        sliding: false,
        rocks: true,
      });
      expect(flight.height).toBe(RULES.roughHeight);
    });

    it.each([
      [
        'too fast',
        justAbove(MIDDLE_OF_THE_PATCH, 0, RULES.gentleFalling + 1),
        { tooFast: true, sliding: false },
      ],
      [
        'still sliding',
        justAbove(MIDDLE_OF_THE_PATCH, RULES.stillSideways + 1, 2),
        { tooFast: false, sliding: true },
      ],
      [
        'too fast and still sliding',
        justAbove(MIDDLE_OF_THE_PATCH, -(RULES.stillSideways + 1), RULES.gentleFalling + 1),
        { tooFast: true, sliding: true },
      ],
    ])('bumps on clear ground when %s, and says why', (_name, flight, why) => {
      expect(fly(flight, 2)).toEqual({ kind: 'bump', rocks: false, ...why });
    });

    it('bumps on the far boulders after sliding on past the clear ground', () => {
      const flight = justAbove(PAST_THE_PATCH, 0, 2);

      expect(fly(flight, 2)).toEqual({
        kind: 'bump',
        tooFast: false,
        sliding: false,
        rocks: true,
      });
      expect(flight.height).toBe(RULES.roughHeight);
    });

    it('sends the lander back up after a bump, its slide unchanged', () => {
      const flight = justAbove(RULES.startX, 2, RULES.gentleFalling + 1);
      expect(fly(flight, 2)).toMatchObject({ kind: 'bump' });

      expect(fly(flight, 2)).toBeNull();

      expect(fallingSpeed(flight)).toBeLessThan(0);
      expect(flight.height).toBeCloseTo(RULES.roughHeight + 2 * RULES.fallPush);
      expect(slideSpeed(flight)).toBeCloseTo(2 * RULES.sidePush);
    });
  });

  describe('pressing', () => {
    it('cancels a press with a press the other way', () => {
      const flight = startFlight();

      press(flight, 'right', 3);
      press(flight, 'left', 3);
      press(flight, 'down', 1);
      press(flight, 'up', 1);

      expect(flight).toEqual(startFlight());
    });

    it('stops adding pushes at the most the lander can have', () => {
      const flight = startFlight();

      press(flight, 'right', 10);
      press(flight, 'down', 10);

      expect(flight.pushesX).toBe(RULES.maxSideways);
      expect(flight.pushesDown).toBe(RULES.maxFalling);

      press(flight, 'left', 20);
      press(flight, 'up', 20);

      expect(flight.pushesX).toBe(-RULES.maxSideways);
      expect(flight.pushesDown).toBe(-RULES.maxRising);
    });
  });

  describe('the edges', () => {
    it.each<[Thrust, number]>([
      ['left', -RULES.maxSide],
      ['right', RULES.maxSide],
    ])('stops the lander at the %s side, and stops its slide there', (side, edge) => {
      const flight = hovering();
      press(flight, side, RULES.maxSideways);

      expect(fly(flight, 10)).toBeNull();

      expect(flight.x).toBe(edge);
      expect(slideSpeed(flight)).toBe(0);
    });

    it('leaves a lander stopped against the right side over the far boulders, where it cannot land', () => {
      const flight = hovering();
      press(flight, 'right', RULES.maxSideways);
      expect(fly(flight, 10)).toBeNull();

      expect(overClear(flight)).toBe(false);
      expect(pastClear(flight)).toBe(true);

      press(flight, 'down', RULES.gentleFalling);

      expect(fly(flight, 15)).toEqual({
        kind: 'bump',
        tooFast: false,
        sliding: false,
        rocks: true,
      });
    });

    it('stops the lander at the top, and stops it rising there', () => {
      const flight = hovering();
      press(flight, 'up', RULES.maxRising);

      expect(fly(flight, 10)).toBeNull();

      expect(flight.height).toBe(RULES.maxHeight);
      expect(fallingSpeed(flight)).toBe(0);
    });
  });

  describe('fuel', () => {
    it('runs out while hovering, and says so', () => {
      const flight = hovering();

      expect(fly(flight, RULES.fuelSeconds - 1)).toBeNull();
      expect(fly(flight, 2)).toEqual({ kind: 'empty' });
      expect(fuelLeft(flight)).toBe(0);
    });
  });

  describe('looking ahead', () => {
    it('looks five seconds ahead, and leaves the flight where it is', () => {
      const flight = startFlight();

      const there = ahead(flight);

      expect(there.x).toBeCloseTo(RULES.startX);
      expect(there.height).toBeCloseTo(
        RULES.startHeight - RULES.aheadSeconds * RULES.startFalling * RULES.fallPush,
      );
      expect(flight).toEqual(startFlight());
    });

    it('stays above the ground and inside the play area', () => {
      const flight = startFlight();

      expect(ahead(flight, 30)).toEqual({ x: RULES.startX, height: RULES.roughHeight });
      expect(ahead(justAbove(MIDDLE_OF_THE_PATCH, 0, 2), 30)).toEqual({
        x: MIDDLE_OF_THE_PATCH,
        height: 0,
      });

      press(flight, 'right', RULES.maxSideways);

      expect(ahead(flight, 30)).toEqual({ x: RULES.maxSide, height: RULES.roughHeight });
    });

    it('is worth a line only when the spot ahead is clear of the lander itself', () => {
      const flight = startFlight();

      // Coming down at the start, the spot is well below the footpads.
      expect(driftShows(flight)).toBe(true);

      // Hovering, it is where the lander already is.
      press(flight, 'up', RULES.startFalling);
      expect(driftShows(flight)).toBe(false);

      // Rising, it is somewhere up the lander's own body.
      press(flight, 'up', 1);
      expect(driftShows(flight)).toBe(false);

      // One sideways push ends under a footpad; two carry it out past one.
      press(flight, 'right', 1);
      expect(driftShows(flight)).toBe(false);
      press(flight, 'right', 1);
      expect(driftShows(flight)).toBe(true);
    });
  });
});
