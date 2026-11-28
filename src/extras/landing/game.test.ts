/**
 * The rules of "Land on the Moon", with no drawing and no page: a run that
 * lands, the ways a touchdown can go wrong, the patch of clear ground with
 * boulders on both sides, the edges of the play area, and the fuel, all on
 * Easy (the game as it first was); then what Hard changes, measured by
 * flying it (a clean run, doing nothing, and how exact the stop must be);
 * and which runs earn which of the three stars on each level. The flights
 * are let along in tenths of a second, as the frames would.
 *
 * Run: npx vitest run src/extras/landing/game.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { Level } from '../shared/levels.ts';
import {
  advance,
  ahead,
  driftShows,
  fallingSpeed,
  fuelLeft,
  groundUnder,
  landingRoom,
  LEVEL_RULES,
  overClear,
  pastClear,
  push,
  RULES,
  runGoals,
  slideSpeed,
  startFlight,
  type Contact,
  type Flight,
  type RunGoals,
  type Thrust,
} from './game.ts';

/** One frame of the screen's clock. */
const FRAME = 0.1;

const EASY = LEVEL_RULES.easy;
const HARD = LEVEL_RULES.hard;

/** The middle of the clear patch on Easy, where a lander has room to slide a little either way. */
const MIDDLE_OF_THE_PATCH = (EASY.clearFrom + RULES.clearTo) / 2;
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

/** Let frames pass until `done` says so or something happens: the first thing that happened, if anything did. */
function flyUntil(flight: Flight, done: (flight: Flight) => boolean): Contact | null {
  for (let frame = 0; frame < 600 && !done(flight); frame += 1) {
    const contact = advance(flight, FRAME);
    if (contact) return contact;
  }
  return null;
}

/** Let frames pass until the run ends, on the ground or with the tank dry, bumps and all. */
function flyToTheEnd(flight: Flight): Extract<Contact, { kind: 'landed' | 'empty' }> {
  for (;;) {
    const contact = advance(flight, FRAME);
    if (contact && contact.kind !== 'bump') return contact;
  }
}

/** Seconds flown so far: the engine burns a second of fuel every second. */
const secondsFlown = (flight: Flight): number =>
  LEVEL_RULES[flight.level].fuelSeconds - flight.fuel;

/** A start on Easy with the fall stopped, so the lander hovers where it is. */
function hovering(): Flight {
  const flight = startFlight('easy');
  press(flight, 'up', RULES.startFalling);
  return flight;
}

/** A lander a meter above whatever is under `x` on Easy, sliding and falling by these pushes, with fuel to spare. */
const justAbove = (x: number, pushesX: number, pushesDown: number): Flight => ({
  ...startFlight('easy'),
  x,
  height: groundUnder('easy', x) + 1,
  pushesX,
  pushesDown,
});

/**
 * When the scripted clean run stops its slide of three pushes, on each
 * level: with the lander's middle at 9.8 on Easy and 12 on Hard, inside the
 * room each level gives (see landingRoom).
 */
const STOP_AT: Record<Level, number> = { easy: 11, hard: 12.2 };

/**
 * A clean run: slow to slow and steady (Slower twice), slide right at three
 * pushes (on Hard, two more first, to cancel the slide it starts with), stop
 * the slide over the clear ground, and come down. Gentle, it also pushes
 * Slower once more about 2 m up; with `hover`, it first hovers that many
 * seconds over the clear ground.
 */
function cleanRun(level: Level, { gentle = false, hover = 0 } = {}) {
  const flight = startFlight(level);
  let presses = 0;
  const pressed = (thrust: Thrust, times: number): void => {
    press(flight, thrust, times);
    presses += times;
  };
  pressed('up', 2);
  pressed('right', 3 - LEVEL_RULES[level].startSideways);
  expect(fly(flight, STOP_AT[level])).toBeNull();
  pressed('left', 3);
  if (hover > 0) {
    pressed('up', 3);
    expect(fly(flight, hover)).toBeNull();
    pressed('down', 3);
  }
  if (gentle) {
    expect(flyUntil(flight, (f) => f.height <= 2)).toBeNull();
    pressed('up', 1);
  }
  const end = flyToTheEnd(flight);
  return { flight, end, presses, seconds: secondsFlown(flight), goals: runGoals(flight, end) };
}

/**
 * A run with one bump on the boulders: the slide stopped a second and a
 * half too early, short of the clear ground; after the bump, a second to
 * read why, one push Right to slide over, then stopped over the clear ground
 * and brought down gently.
 */
function oneBumpRun(level: Level) {
  const flight = startFlight(level);
  press(flight, 'up', 2);
  press(flight, 'right', 3 - LEVEL_RULES[level].startSideways);
  expect(fly(flight, STOP_AT[level] - 1.5)).toBeNull();
  press(flight, 'left', 3);
  press(flight, 'down', 1);
  expect(flyUntil(flight, () => false)).toMatchObject({ kind: 'bump', rocks: true });
  expect(fly(flight, 1)).toBeNull();
  press(flight, 'right', 1);
  const room = landingRoom(level);
  expect(flyUntil(flight, (f) => f.x >= room.from + 0.4)).toBeNull();
  press(flight, 'left', 1);
  press(flight, 'down', 3);
  const end = flyToTheEnd(flight);
  return { flight, end, seconds: secondsFlown(flight), goals: runGoals(flight, end) };
}

/** The stop times, a tenth of a second apart, at which stopping the clean run's slide still lands without a bump. */
function stopTimesThatLand(level: Level): number[] {
  const landing: number[] = [];
  for (let tenths = 50; tenths <= 200; tenths += 1) {
    const flight = startFlight(level);
    press(flight, 'up', 2);
    press(flight, 'right', 3 - LEVEL_RULES[level].startSideways);
    if (fly(flight, tenths / 10) !== null) continue;
    press(flight, 'left', 3);
    if (flyUntil(flight, () => false)?.kind === 'landed') landing.push(tenths / 10);
  }
  return landing;
}

/** A press of a control, at this many seconds into the run. */
type TimedPress = readonly [seconds: number, thrust: Thrust];

/** `times` presses of one control, a person's 0.3 seconds apart, the first at `from` seconds. */
const presses = (from: number, thrust: Thrust, times: number): TimedPress[] =>
  Array.from({ length: times }, (_, index) => [from + 0.3 * index, thrust] as const);

/**
 * A run on Hard pressed the way a person presses: the first press a second
 * after Start, and never two within 0.3 seconds. It flies until the run
 * ends, and says how long it took, how many presses, and the fuel left.
 */
function pressedLikeAPerson(timed: readonly TimedPress[]) {
  const ordered = [...timed].sort(([a], [b]) => a - b);
  expect(ordered[0]?.[0]).toBeGreaterThanOrEqual(1);
  ordered.slice(1).forEach(([at], index) => {
    expect(at - (ordered[index]?.[0] ?? 0)).toBeGreaterThan(0.3 - 1e-9);
  });
  const flight = startFlight('hard');
  let next = 0;
  let bumps = 0;
  for (let frame = 0; frame < 300; frame += 1) {
    const now = frame * FRAME;
    for (; next < ordered.length && (ordered[next]?.[0] ?? Infinity) <= now + 1e-9; next += 1)
      push(flight, ordered[next]?.[1] ?? 'up');
    const contact = advance(flight, FRAME);
    if (contact?.kind === 'bump') bumps += 1;
    else if (contact) {
      return {
        end: contact,
        bumps,
        presses: ordered.length,
        seconds: secondsFlown(flight),
        fuelLeft: flight.fuel,
        goals: runGoals(flight, contact),
      };
    }
  }
  throw new Error('The run did not end.');
}

/**
 * A bold run on Hard, as a practised player flies it: no slowing first.
 * Seven pushes Right (two cancel the slide the run starts with) slide it
 * across at five pushes; Slower is pressed late, about 4 m up; the slide is
 * stopped late, over the clear ground. Gentle, the fall is slowed to two
 * steps (Slower three times); firm, only to three (Slower twice).
 */
const boldRun = ({ gentle }: { gentle: boolean }) =>
  pressedLikeAPerson([
    ...presses(1, 'right', 7),
    ...presses(8, 'up', gentle ? 3 : 2),
    ...presses(9, 'left', 4),
  ]);

/**
 * The fastest gentle run found, pressed like a person: Faster once as well,
 * to fall faster still, Slower four times at 7.5 seconds, and the slide
 * stopped at 9.3 seconds.
 */
const fastestRun = () =>
  pressedLikeAPerson([
    ...presses(1, 'right', 7),
    [3.1, 'down'],
    ...presses(7.5, 'up', 4),
    ...presses(9.3, 'left', 4),
  ]);

/** The goals as stars met: landed, gentle, fuel to spare. */
const stars = (goals: RunGoals): [boolean, boolean, boolean] => [
  goals.landed,
  goals.gentle,
  goals.spareFuel,
];

describe('the landing game', () => {
  describe('landing', () => {
    it('lands after slowing the fall, sliding over to the clear ground, and stopping the slide', () => {
      const flight = startFlight('easy');
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
        EASY.clearFrom + RULES.footHalfSpan - 0.1,
        RULES.roughHeight,
        false,
        false,
      ],
      [
        'both footpads are just inside the near edge',
        EASY.clearFrom + RULES.footHalfSpan + 0.1,
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
      const flight = { ...startFlight('easy'), x };

      expect(groundUnder('easy', x)).toBe(ground);
      expect(overClear(flight)).toBe(clear);
      expect(pastClear(flight)).toBe(past);
    });
  });

  describe('bumps', () => {
    it('bumps too fast on the boulders after about 9.6 seconds when nothing is pressed', () => {
      const flight = startFlight('easy');

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
      const flight = startFlight('easy');

      press(flight, 'right', 3);
      press(flight, 'left', 3);
      press(flight, 'down', 1);
      press(flight, 'up', 1);

      expect(flight).toEqual(startFlight('easy'));
    });

    it('stops adding pushes at the most the lander can have', () => {
      const flight = startFlight('easy');

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

      expect(fly(flight, EASY.fuelSeconds - 1)).toBeNull();
      expect(fly(flight, 2)).toEqual({ kind: 'empty' });
      expect(fuelLeft(flight)).toBe(0);
    });
  });

  describe('looking ahead', () => {
    it('looks five seconds ahead, and leaves the flight where it is', () => {
      const flight = startFlight('easy');

      const there = ahead(flight);

      expect(there.x).toBeCloseTo(RULES.startX);
      expect(there.height).toBeCloseTo(
        RULES.startHeight - RULES.aheadSeconds * RULES.startFalling * RULES.fallPush,
      );
      expect(flight).toEqual(startFlight('easy'));
    });

    it('stays above the ground and inside the play area', () => {
      const flight = startFlight('easy');

      expect(ahead(flight, 30)).toEqual({ x: RULES.startX, height: RULES.roughHeight });
      expect(ahead(justAbove(MIDDLE_OF_THE_PATCH, 0, 2), 30)).toEqual({
        x: MIDDLE_OF_THE_PATCH,
        height: 0,
      });

      press(flight, 'right', RULES.maxSideways);

      expect(ahead(flight, 30)).toEqual({ x: RULES.maxSide, height: RULES.roughHeight });
    });

    it('is worth a line only when the spot ahead is clear of the lander itself', () => {
      const flight = startFlight('easy');

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

  describe('the hard level', () => {
    it('starts sliding left by two pushes, away from the clear ground, with less fuel', () => {
      const flight = startFlight('hard');

      expect(flight.pushesX).toBe(-2);
      expect(flight.pushesDown).toBe(RULES.startFalling);
      expect(flight.fuel).toBe(HARD.fuelSeconds);
      expect(HARD.fuelSeconds).toBeLessThan(EASY.fuelSeconds);
      expect(startFlight('easy').pushesX).toBe(0);
    });

    it('gives the lander half the room to stop in: 2.5 m instead of 5.1 m, ending in the same place', () => {
      const easy = landingRoom('easy');
      const hard = landingRoom('hard');

      expect(easy.to - easy.from).toBeCloseTo(5.1);
      expect(hard.to - hard.from).toBeCloseTo(2.5);
      expect(hard.to).toBe(easy.to);
    });

    it.each<[string, number, number, boolean]>([
      [
        'its left footpad is still over the near boulders',
        landingRoom('hard').from - 0.1,
        RULES.roughHeight,
        false,
      ],
      ['both footpads are just inside the near edge', landingRoom('hard').from + 0.1, 0, true],
      [
        'it is where Easy has clear ground but Hard has boulders',
        landingRoom('easy').from + 0.5,
        RULES.roughHeight,
        false,
      ],
    ])('has rough ground under the lander when %s', (_name, x, ground, clear) => {
      expect(groundUnder('hard', x)).toBe(ground);
      expect(overClear({ ...startFlight('hard'), x })).toBe(clear);
    });

    it('lands a clean run in about 17 seconds and 10 presses, with 4 to 6 seconds of fuel in hand', () => {
      const run = cleanRun('hard');

      expect(run.end).toEqual({ kind: 'landed', falling: 3 });
      expect(run.presses).toBe(10);
      expect(run.seconds).toBeGreaterThan(17);
      expect(run.seconds).toBeLessThan(17.5);
      expect(run.flight.fuel).toBeGreaterThan(4);
      expect(run.flight.fuel).toBeLessThan(6);
      expect(run.flight.x).toBeCloseTo(11.96);
    });

    it('slides to the left edge when nothing is pressed, bumps too fast on the boulders after about 9.6 seconds, then runs out of fuel', () => {
      const flight = startFlight('hard');

      expect(fly(flight, 9)).toBeNull();
      expect(flight.x).toBe(-RULES.maxSide);
      expect(fly(flight, 1)).toEqual({ kind: 'bump', tooFast: true, sliding: false, rocks: true });
      expect(flyUntil(flight, () => false)).toEqual({ kind: 'empty' });
      expect(secondsFlown(flight)).toBeCloseTo(HARD.fuelSeconds);
    });

    it('needs the slide stopped within about 1.4 seconds, half the time Easy gives', () => {
      const easy = stopTimesThatLand('easy');
      const hard = stopTimesThatLand('hard');

      expect([easy[0], easy.at(-1)]).toEqual([10.2, 12.9]);
      expect([hard[0], hard.at(-1)]).toEqual([11.6, 12.9]);
      expect(hard).toHaveLength(14);
      expect(easy).toHaveLength(28);
    });
  });

  describe('the stars', () => {
    it('earns a star for landing, one for a gentle touchdown, and one for fuel to spare', () => {
      const flight = { ...justAbove(MIDDLE_OF_THE_PATCH, 0, RULES.lightFalling), height: 0.3 };

      const end = flyToTheEnd(flight);

      expect(end).toEqual({ kind: 'landed', falling: RULES.lightFalling });
      expect(runGoals(flight, end)).toEqual({ landed: true, gentle: true, spareFuel: true });
    });

    it('earns none when the fuel runs out', () => {
      const flight = hovering();

      const end = flyToTheEnd(flight);

      expect(end).toEqual({ kind: 'empty' });
      expect(runGoals(flight, end)).toEqual({ landed: false, gentle: false, spareFuel: false });
    });

    it('calls a touchdown at more than two falling steps firm, not gentle', () => {
      const flight = { ...justAbove(MIDDLE_OF_THE_PATCH, 0, RULES.lightFalling + 1), height: 0.3 };

      const end = flyToTheEnd(flight);

      expect(runGoals(flight, end).gentle).toBe(false);
    });

    it.each<[Level, string, () => { goals: RunGoals }, [boolean, boolean, boolean]]>([
      ['easy', 'the scripted clean run, firm', () => cleanRun('easy'), [true, false, true]],
      ['easy', 'a clean, gentle run', () => cleanRun('easy', { gentle: true }), [true, true, true]],
      [
        'easy',
        'a gentle run that hovers 5 seconds',
        () => cleanRun('easy', { gentle: true, hover: 5 }),
        [true, true, false],
      ],
      [
        'easy',
        'a gentle run with one bump on the boulders',
        () => oneBumpRun('easy'),
        [true, true, false],
      ],
      ['hard', 'the clean run, firm', () => cleanRun('hard'), [true, false, false]],
      [
        'hard',
        'a clean, gentle run',
        () => cleanRun('hard', { gentle: true }),
        [true, true, false],
      ],
      ['hard', 'a bold, gentle run', () => boldRun({ gentle: true }), [true, true, true]],
      ['hard', 'the same bold run, firm', () => boldRun({ gentle: false }), [true, false, true]],
      ['hard', 'the fastest gentle run', fastestRun, [true, true, true]],
      [
        'hard',
        'a gentle run that hovers 3 seconds',
        () => cleanRun('hard', { gentle: true, hover: 3 }),
        [true, true, false],
      ],
      [
        'hard',
        'a gentle run that hovers 5 seconds, which runs dry',
        () => cleanRun('hard', { gentle: true, hover: 5 }),
        [false, false, false],
      ],
      [
        'hard',
        'a gentle run with one bump on the boulders',
        () => oneBumpRun('hard'),
        [true, true, false],
      ],
    ])('on %s, %s earns these stars', (_level, _name, run, earned) => {
      expect(stars(run().goals)).toEqual(earned);
    });

    it('on Easy, gives the star for fuel to spare to a clean, gentle run with 2 to 3 seconds in hand', () => {
      const { flight } = cleanRun('easy', { gentle: true });
      const needed = EASY.spareFuel * EASY.fuelSeconds;

      expect(flight.fuel - needed).toBeGreaterThan(2);
      expect(flight.fuel - needed).toBeLessThan(3);
    });

    it('on Hard, keeps the star for fuel to spare for a bold run: about 8.7 seconds left, a second under what the bold, gentle run leaves', () => {
      const needed = HARD.spareFuel * HARD.fuelSeconds;
      const bold = boldRun({ gentle: true });

      expect(needed).toBeCloseTo(8.74);
      expect(bold.fuelLeft - needed).toBeGreaterThan(0.9);
      expect(bold.fuelLeft - needed).toBeLessThan(1.1);
      expect(cleanRun('hard', { gentle: true }).flight.fuel).toBeLessThan(needed - 3);
    });
  });

  describe('bold runs on Hard, pressed like a person', () => {
    it('lands the bold, gentle run in about 13.3 seconds and 14 presses, with about 9.7 seconds of fuel left', () => {
      const run = boldRun({ gentle: true });

      expect(run.end).toEqual({ kind: 'landed', falling: 2 });
      expect(run.bumps).toBe(0);
      expect(run.presses).toBe(14);
      expect(run.seconds).toBeCloseTo(13.3);
      expect(run.fuelLeft).toBeCloseTo(9.7);
    });

    it('lands the same bold run firm in about 11.8 seconds and 13 presses, with about 11.2 seconds left', () => {
      const run = boldRun({ gentle: false });

      expect(run.end).toEqual({ kind: 'landed', falling: 3 });
      expect(run.bumps).toBe(0);
      expect(run.presses).toBe(13);
      expect(run.seconds).toBeCloseTo(11.8);
      expect(run.fuelLeft).toBeCloseTo(11.2);
    });

    it('lands the fastest gentle run found in about 11.4 seconds and 16 presses, with about 11.6 seconds left', () => {
      const run = fastestRun();

      expect(run.end).toEqual({ kind: 'landed', falling: 2 });
      expect(run.bumps).toBe(0);
      expect(run.presses).toBe(16);
      expect(run.seconds).toBeCloseTo(11.4);
      expect(run.fuelLeft).toBeCloseTo(11.6);
    });
  });
});
