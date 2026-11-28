/**
 * The rules of "Dock two spacecraft", with no drawing and no page: a run
 * that docks, the ways a touch can go wrong (too fast, off center, or
 * both), the bumps a run counts, and the edges of the play area, all on
 * Easy (the game as it first was); then each level measured by flying it (a
 * clean run, doing nothing, and how exact the aim must be); and which runs
 * earn which of the three stars on each level. The flights are let along in
 * tenths of a second, as the frames would.
 *
 * Run: npx vitest run src/extras/docking/game.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { Level } from '../shared/levels.ts';
import {
  advance,
  backToStart,
  closingSpeed,
  isLinedUp,
  LEVEL_RULES,
  offCenter,
  push,
  RULES,
  runGoals,
  speedX,
  speedY,
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

/** Let frames pass, touching nothing, until `done` says so: the seconds that took. */
function flyUntil(flight: Flight, done: (flight: Flight) => boolean): number {
  let frames = 0;
  for (; frames < 3000 && !done(flight); frames += 1) expect(advance(flight, FRAME)).toBeNull();
  return frames * FRAME;
}

/** How the nose touched the cone, and the seconds it took to get there. */
interface Touch {
  contact: Contact;
  seconds: number;
}

/** A docking, and the seconds it took, bumps and all. */
interface Docking {
  end: Extract<Contact, { kind: 'docked' }>;
  seconds: number;
}

/** Let frames pass until the nose touches the cone: how it touched, and the seconds it took. */
function flyToTheTouch(flight: Flight): Touch {
  for (let frame = 1; frame <= 3000; frame += 1) {
    const contact = advance(flight, FRAME);
    if (contact) return { contact, seconds: frame * FRAME };
  }
  throw new Error('The nose never reached the cone.');
}

/** Let frames pass until it docks, bumps and all: the docking, and the seconds it took. */
function flyToTheEnd(flight: Flight): Docking {
  let seconds = 0;
  for (;;) {
    const touch = flyToTheTouch(flight);
    seconds += touch.seconds;
    if (touch.contact.kind === 'docked') return { end: touch.contact, seconds };
  }
}

/** The Gemini half a meter from the cone, at this place off center and closing at these pushes, on Easy. */
const nearTheCone = (x: number, y: number, pushesClosing: number): Flight => ({
  ...startFlight('easy'),
  x,
  y,
  gap: 0.5,
  pushesX: 0,
  pushesY: 0,
  pushesClosing,
});

/**
 * When the clean run stops its drift, on each level: with the nose
 * inside each level's ring, near the middle of the times that dock (see
 * stopTimesThatDock).
 */
const STOP_AT: Record<Level, number> = { easy: 10, hard: 13.5 };

/**
 * Aim at the middle of the cone: drift right by three pushes and down by
 * one, whatever drift the level starts with (Easy: Right 4 and Down 1, as
 * the interface and browser tests fly it; Hard: Right 5 and Down 2), and
 * close in at the level's fastest gentle speed.
 */
function aim(flight: Flight): number {
  const { startSideways, startUpDown, gentlePushes } = LEVEL_RULES[flight.level];
  const presses: [Thrust, number][] = [
    ['right', 3 - startSideways],
    ['down', 1 + startUpDown],
    ['forward', gentlePushes - RULES.startClosing],
  ];
  for (const [thrust, times] of presses) press(flight, thrust, times);
  return presses.reduce((sum, [, times]) => sum + times, 0);
}

/** Stop the drift off center: Left 3 and Up 1, undoing what `aim` added. */
function stopTheDrift(flight: Flight): number {
  press(flight, 'left', 3);
  press(flight, 'up', 1);
  return 4;
}

/**
 * A clean run: aim, stop the drift once lined up, and let it close
 * in. With `back`, it also pushes Back that many times about a meter and a
 * half from the cone, to come in slower.
 */
function cleanRun(level: Level, { back = 0 } = {}) {
  const flight = startFlight(level);
  let presses = aim(flight);
  expect(fly(flight, STOP_AT[level])).toBeNull();
  presses += stopTheDrift(flight);
  let seconds = STOP_AT[level];
  if (back > 0) {
    seconds += flyUntil(flight, (f) => f.gap <= 1.5);
    press(flight, 'back', back);
    presses += back;
  }
  const { end, seconds: rest } = flyToTheEnd(flight);
  seconds += rest;
  return { flight, end, presses, seconds, goals: runGoals(flight, end) };
}

/**
 * A run with one bump: aimed and lined up, but closing in one push too fast;
 * after the bump it backs away, and pushing Forward `forward` times brings it
 * back in.
 */
function oneBumpRun(level: Level, forward: number) {
  const flight = startFlight(level);
  aim(flight);
  press(flight, 'forward', 1);
  expect(fly(flight, STOP_AT[level])).toBeNull();
  stopTheDrift(flight);
  expect(flyToTheTouch(flight).contact).toEqual({ kind: 'bump', tooFast: true, offCenter: false });
  press(flight, 'forward', forward);
  const { end } = flyToTheEnd(flight);
  return { flight, end, goals: runGoals(flight, end) };
}

/** The stop times, a tenth of a second apart, at which stopping the clean run's drift still docks without a bump. */
function stopTimesThatDock(level: Level): number[] {
  const docking: number[] = [];
  for (let tenths = 1; tenths <= 250; tenths += 1) {
    const flight = startFlight(level);
    aim(flight);
    if (fly(flight, tenths / 10) !== null) continue;
    stopTheDrift(flight);
    if (flyToTheTouch(flight).contact.kind === 'docked') docking.push(tenths / 10);
  }
  return docking;
}

/** The goals as stars met: docked, on the first try, a soft touch. */
const stars = (goals: RunGoals): [boolean, boolean, boolean] => [
  goals.docked,
  goals.firstTry,
  goals.softTouch,
];

describe('the docking game', () => {
  describe('docking', () => {
    it('docks after lining up the nose with the cone and closing in gently', () => {
      const flight = startFlight('easy');
      press(flight, 'right', 4);
      press(flight, 'down', 1);
      press(flight, 'forward', 3);

      expect(fly(flight, 10)).toBeNull();
      expect(flight.x).toBeCloseTo(0);
      expect(flight.y).toBeCloseTo(0.1);
      expect(flight.gap).toBeCloseTo(5);
      expect(isLinedUp(flight)).toBe(true);

      press(flight, 'left', 3);
      press(flight, 'up', 1);

      expect(fly(flight, 13)).toEqual({ kind: 'docked', closing: 4 });
      expect(flight.gap).toBe(0);
      expect(flight.bumps).toBe(0);
    });

    it('does not count resting against the cone without closing in as a touch', () => {
      const flight = { ...nearTheCone(1, 1, 0), gap: 0 };

      expect(fly(flight, 2)).toBeNull();
      expect(flight.bumps).toBe(0);
    });
  });

  describe('bumps', () => {
    it.each([
      ['too fast', nearTheCone(0, 0, EASY.gentlePushes + 1), { tooFast: true, offCenter: false }],
      ['off center', nearTheCone(EASY.linedUp + 0.05, 0, 2), { tooFast: false, offCenter: true }],
      [
        'too fast and off center',
        nearTheCone(0, -(EASY.linedUp + 0.05), EASY.gentlePushes + 1),
        { tooFast: true, offCenter: true },
      ],
    ])('bumps when %s, says why, and counts it', (_name, flight, why) => {
      expect(fly(flight, 3)).toEqual({ kind: 'bump', ...why });
      expect(flight.bumps).toBe(1);
    });

    it('sends the Gemini slowly back after a bump, its drift off center unchanged', () => {
      const flight = { ...nearTheCone(1, 0, 2), pushesY: 1 };
      expect(fly(flight, 3)).toMatchObject({ kind: 'bump' });

      expect(fly(flight, 2)).toBeNull();

      expect(closingSpeed(flight)).toBeLessThan(0);
      expect(flight.gap).toBeCloseTo(2 * RULES.forwardPush);
      expect(speedY(flight)).toBeCloseTo(RULES.sidePush);
    });

    it('counts every bump in a run', () => {
      const flight = nearTheCone(1, 0, 2);
      expect(fly(flight, 3)).toMatchObject({ kind: 'bump' });
      press(flight, 'forward', 3);

      expect(fly(flight, 5)).toMatchObject({ kind: 'bump' });

      expect(flight.bumps).toBe(2);
    });

    it('keeps the bumps counted when a bump sends the Gemini straight back to the start', () => {
      const flight = nearTheCone(1, 0, 2);
      expect(fly(flight, 3)).toMatchObject({ kind: 'bump' });

      const again = backToStart(flight);

      expect(again).toEqual({ ...startFlight('easy'), bumps: 1 });
    });
  });

  describe('pressing', () => {
    it('cancels a press with a press the other way', () => {
      const flight = startFlight('easy');

      press(flight, 'right', 3);
      press(flight, 'left', 3);
      press(flight, 'down', 2);
      press(flight, 'up', 2);
      press(flight, 'forward', 1);
      press(flight, 'back', 1);

      expect(flight).toEqual(startFlight('easy'));
    });
  });

  describe('the edges', () => {
    it.each<[Thrust, 'x' | 'y', number]>([
      ['left', 'x', -RULES.maxSide],
      ['right', 'x', RULES.maxSide],
      ['down', 'y', -RULES.maxSide],
      ['up', 'y', RULES.maxSide],
    ])('stops the Gemini at the %s edge, and stops its drift there', (side, axis, edge) => {
      const flight = { ...startFlight('easy'), pushesX: 0, pushesClosing: 0 };
      press(flight, side, 10);

      expect(fly(flight, 20)).toBeNull();

      expect(flight[axis]).toBe(edge);
      expect(speedX(flight)).toBe(0);
      expect(speedY(flight)).toBe(0);
    });

    it('stops the Gemini at the far edge when it backs away, and stops it backing there', () => {
      const flight = startFlight('easy');
      press(flight, 'back', 3);

      expect(fly(flight, 40)).toBeNull();

      expect(flight.gap).toBe(RULES.maxGap);
      expect(closingSpeed(flight)).toBe(0);
    });
  });

  describe('the easy level', () => {
    it('starts a little off to the left and up, drifting slowly left and closing in slowly', () => {
      expect(startFlight('easy')).toEqual({
        level: 'easy',
        x: -1.2,
        y: 0.5,
        gap: 9,
        pushesX: -1,
        pushesY: 0,
        pushesClosing: 1,
        bumps: 0,
      });
    });

    it('docks a clean run in about 22.5 seconds and 12 presses, closing at 4 pushes', () => {
      const run = cleanRun('easy');

      expect(run.end).toEqual({ kind: 'docked', closing: 4 });
      expect(run.presses).toBe(12);
      expect(run.seconds).toBeGreaterThan(22.4);
      expect(run.seconds).toBeLessThan(22.7);
    });

    it('drifts to the left edge after about 32.5 seconds when nothing is pressed, and bumps off center after about 90', () => {
      const flight = startFlight('easy');

      expect(fly(flight, 32)).toBeNull();
      expect(flight.x).toBeGreaterThan(-RULES.maxSide);
      expect(fly(flight, 1)).toBeNull();
      expect(flight.x).toBe(-RULES.maxSide);
      expect(fly(flight, 56)).toBeNull();
      expect(fly(flight, 2)).toEqual({ kind: 'bump', tooFast: false, offCenter: true });
    });
  });

  describe('the hard level', () => {
    it('starts further off, sliding left twice as fast and drifting up, with a smaller ring and a lower gentle speed', () => {
      const easy = startFlight('easy');
      const hard = startFlight('hard');

      expect(offCenter(hard)).toBeGreaterThan(offCenter(easy) + 0.4);
      expect(hard.pushesX).toBe(2 * easy.pushesX);
      expect(hard.pushesY).toBe(1);
      expect(hard.gap).toBe(easy.gap);
      expect(hard.pushesClosing).toBe(easy.pushesClosing);
      expect(HARD.linedUp).toBe(0.25);
      expect(HARD.gentlePushes).toBe(EASY.gentlePushes - 1);
    });

    it('docks a clean run in about 30 seconds and 13 presses, closing at 3 pushes', () => {
      const run = cleanRun('hard');

      expect(run.end).toEqual({ kind: 'docked', closing: 3 });
      expect(run.presses).toBe(13);
      expect(run.seconds).toBeGreaterThan(29.9);
      expect(run.seconds).toBeLessThan(30.2);
    });

    it('drifts to the left edge after about 11 seconds and to the top edge after 45 when nothing is pressed, and bumps off center after about 90', () => {
      const flight = startFlight('hard');

      expect(fly(flight, 11)).toBeNull();
      expect(flight.x).toBeGreaterThan(-RULES.maxSide);
      expect(fly(flight, 1)).toBeNull();
      expect(flight.x).toBe(-RULES.maxSide);
      expect(fly(flight, 32)).toBeNull();
      expect(flight.y).toBeLessThan(RULES.maxSide);
      expect(fly(flight, 2)).toBeNull();
      expect(flight.y).toBe(RULES.maxSide);
      expect(fly(flight, 43)).toBeNull();
      expect(fly(flight, 2)).toEqual({ kind: 'bump', tooFast: false, offCenter: true });
    });

    it("bumps too fast when closing in at Easy's fastest gentle speed", () => {
      const flight = startFlight('hard');
      aim(flight);
      press(flight, 'forward', 1);
      expect(fly(flight, STOP_AT.hard)).toBeNull();
      stopTheDrift(flight);

      expect(flyToTheTouch(flight).contact).toEqual({
        kind: 'bump',
        tooFast: true,
        offCenter: false,
      });
    });

    it('needs the drift stopped within about 3 seconds, a little over half the time Easy gives', () => {
      const easy = stopTimesThatDock('easy');
      const hard = stopTimesThatDock('hard');

      expect([easy[0], easy.at(-1)]).toEqual([7.6, 12.9]);
      expect(easy).toHaveLength(54);
      expect([hard[0], hard.at(-1)]).toEqual([12.3, 15.2]);
      expect(hard).toHaveLength(30);
    });
  });

  describe('the stars', () => {
    it('earns a star for docking, one for the first try, and one for a soft touch', () => {
      const flight = nearTheCone(0, 0, EASY.softPushes);

      const { end } = flyToTheEnd(flight);

      expect(end).toEqual({ kind: 'docked', closing: EASY.softPushes });
      expect(runGoals(flight, end)).toEqual({ docked: true, firstTry: true, softTouch: true });
    });

    it.each<Level>(['easy', 'hard'])(
      'on %s, calls a touch one push faster than the soft speed not soft',
      (level) => {
        const flight = {
          ...nearTheCone(0, 0, LEVEL_RULES[level].softPushes + 1),
          level,
        };

        const { end } = flyToTheEnd(flight);

        expect(runGoals(flight, end).softTouch).toBe(false);
      },
    );

    it('does not give the star for the first try to a run that bumped, even when the bump sent it back to the start', () => {
      const flight = nearTheCone(0, 0, EASY.gentlePushes + 1);
      expect(fly(flight, 3)).toMatchObject({ kind: 'bump' });
      const again = backToStart(flight);
      aim(again);
      expect(fly(again, STOP_AT.easy)).toBeNull();
      stopTheDrift(again);

      const { end } = flyToTheEnd(again);

      expect(stars(runGoals(again, end))).toEqual([true, false, false]);
    });

    it.each<[Level, string, () => { goals: RunGoals }, [boolean, boolean, boolean]]>([
      ['easy', 'the scripted clean run, at 4 pushes', () => cleanRun('easy'), [true, true, false]],
      [
        'easy',
        'a clean run that pushes Back once, to 3 pushes',
        () => cleanRun('easy', { back: 1 }),
        [true, true, false],
      ],
      [
        'easy',
        'a clean run that pushes Back twice, to 2 pushes',
        () => cleanRun('easy', { back: 2 }),
        [true, true, true],
      ],
      [
        'easy',
        'a run with one bump, too fast, that comes back in at 2 pushes',
        () => oneBumpRun('easy', 3),
        [true, false, true],
      ],
      [
        'easy',
        'a run with one bump, too fast, that comes back in at 4 pushes',
        () => oneBumpRun('easy', 5),
        [true, false, false],
      ],
      ['hard', 'the clean run, at 3 pushes', () => cleanRun('hard'), [true, true, false]],
      [
        'hard',
        'a clean run that pushes Back once, to 2 pushes',
        () => cleanRun('hard', { back: 1 }),
        [true, true, true],
      ],
      [
        'hard',
        'a run with one bump, too fast, that comes back in at 2 pushes',
        () => oneBumpRun('hard', 3),
        [true, false, true],
      ],
    ])('on %s, %s earns these stars', (_level, _name, run, earned) => {
      expect(stars(run().goals)).toEqual(earned);
    });

    it.each<[Level, number]>([
      ['easy', 26.3],
      ['hard', 32.5],
    ])(
      'on %s, costs a clean run under 4 seconds more to come in softly: about %s seconds in all',
      (level, seconds) => {
        const run = cleanRun(level, {
          back: LEVEL_RULES[level].gentlePushes - LEVEL_RULES[level].softPushes,
        });

        expect(run.seconds).toBeCloseTo(seconds, 0);
        expect(run.seconds - cleanRun(level).seconds).toBeLessThan(4);
      },
    );
  });
});
