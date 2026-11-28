/**
 * The rules of "Fly to orbit", with no drawing and no page, all on Easy (the
 * game as it first was): a clean climb to orbit for each rocket, the same
 * climb made late, a climb with nothing pressed, one tipped flat too soon,
 * the path ahead, the stages, the thick air, and the tilt controls; then
 * what Hard changes, measured by flying it (a clean run, late runs, and
 * pressing nothing); and which runs earn which of the three stars on each
 * level. The flights are let along in tenths of a second, as the frames
 * would, and an empty stage is dropped on the frame after it runs dry, as
 * soon as a player could press "Drop it".
 *
 * Run: npx vitest run src/extras/orbit/game.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { Level } from '../shared/levels.ts';
import {
  advance,
  ahead,
  burning,
  canDrop,
  drop,
  fuelShare,
  heightBand,
  LEVEL_RULES,
  RULES,
  runGoals,
  speedShare,
  startFlight,
  tiltDegrees,
  tip,
  type Ahead,
  type Flight,
  type Happening,
  type RunGoals,
  type Stages,
} from './game.ts';

/** One frame of the screen's clock. */
const FRAME = 0.1;
const ROCKETS = [3, 2] as const;
const LEVELS = ['easy', 'hard'] as const;

const EASY = LEVEL_RULES.easy;
const HARD = LEVEL_RULES.hard;

/**
 * The clean run's presses of "Tip over", in seconds from the start, the
 * same for both rockets: the first on the frame the rocket's tail clears
 * the thick air, then one every two and a half seconds until it is flat,
 * just above the orbit line. Each empty stage is dropped at once.
 */
const CLEAN_TIPS = [3.8, 6.3, 8.8, 11.3, 13.8, 16.3];

/** The middle of the rocket on the pad, and the height at which its tail clears the thick air. */
const PAD_HEIGHT = RULES.rocketLength / 2;
const CLEAR_OF_THICK_AIR = RULES.thickAirTop + RULES.rocketLength / 2;

/** Seconds of burning in a full tank, on Easy unless another level is named. */
const tank = (stages: Stages, stage: number, level: Level = 'easy'): number =>
  LEVEL_RULES[level].stageSeconds[stages][stage] ?? 0;
const lastStage = (stages: Stages): number => stages - 1;
/** Seconds of burning in all of a rocket's stages together. */
const allTanks = (stages: Stages, level: Level): number =>
  LEVEL_RULES[level].stageSeconds[stages].reduce((sum, seconds) => sum + seconds, 0);
/** When a stage runs dry if every stage below it is dropped at once: its tank and all those below it. */
const emptyAt = (stages: Stages, stage: number, level: Level): number =>
  LEVEL_RULES[level].stageSeconds[stages]
    .slice(0, stage + 1)
    .reduce((sum, seconds) => sum + seconds, 0);

interface Pilot {
  /** When to press "Tip over", in seconds from the start. */
  tips?: readonly number[];
  /** Press "Tip over" on every frame, as far over as the rules allow. */
  flatOut?: boolean;
  /** Drop each empty stage on the next frame (the default), or leave it to drop by itself. */
  drops?: boolean;
  /** Stages left on to drop by themselves, while the others are dropped at once. */
  leaveOn?: readonly number[];
  /** Called at the start of every frame, after the presses. */
  watch?: (flight: Flight, seconds: number) => void;
}

/** How a run ends. */
type Ending = Extract<Happening, { kind: 'orbit' | 'out-of-fuel' }>;
const isEnding = (one: Happening): one is Ending =>
  one.kind === 'orbit' || one.kind === 'out-of-fuel';

interface Run {
  flight: Flight;
  /** Everything that happened, in order. */
  happened: Happening[];
  /** How the run ended: 'orbit' or 'out-of-fuel'. */
  end: Ending;
  /** Seconds from the start to the end of the frame the run ended in. */
  seconds: number;
  /** Every press that did something, as [seconds from the start, press]. */
  presses: [number, 'over' | 'back' | 'drop'][];
  /** Presses of "Tip over" or "Tip back" that the rules turned away. */
  refused: number;
  /** The farthest right the rocket's middle went. */
  farthest: number;
}

/** Fly a rocket a frame at a time until the run ends, pressing as `pilot` says, on Easy unless another level is named. */
function fly(stages: Stages, pilot: Pilot = {}, level: Level = 'easy'): Run {
  const flight = startFlight(level, stages);
  const run: Omit<Run, 'end' | 'seconds'> = {
    flight,
    happened: [],
    presses: [],
    refused: 0,
    farthest: flight.x,
  };
  for (let frame = 0; frame < 600; frame += 1) {
    const now = frame / 10;
    for (const at of pilot.tips ?? []) {
      if (Math.round(at * 10) !== frame) continue;
      if (tip(flight, 'over') === 'tipped') run.presses.push([now, 'over']);
      else run.refused += 1;
    }
    if (pilot.flatOut) {
      while (tip(flight, 'over') === 'tipped') run.presses.push([now, 'over']);
    }
    if ((pilot.drops ?? true) && canDrop(flight) && !pilot.leaveOn?.includes(flight.stage)) {
      expect(drop(flight)).toBe('dropped');
      run.presses.push([now, 'drop']);
    }
    pilot.watch?.(flight, now);

    const happened = advance(flight, FRAME);
    run.happened.push(...happened);
    run.farthest = Math.max(run.farthest, flight.x);
    const end = happened.find(isEnding);
    if (end) return { ...run, end, seconds: (frame + 1) / 10 };
  }
  throw new Error('The run never ended.');
}

/** The tilt presses of a run, shifted later by `late` seconds. */
const lateBy = (late: number): number[] => CLEAN_TIPS.map((at) => at + late);

/** The clean run's tilt presses, with those after `from` seconds held back by `wait` seconds more. */
const waitingAfter = (from: number, wait: number): number[] =>
  CLEAN_TIPS.map((at) => (at > from ? at + wait : at));

/** Seconds of burning left in the last stage at the end of a run: none when it ran out of fuel. */
function inHand(run: Run, stages: Stages, level: Level = 'easy'): number {
  const share = run.end.kind === 'orbit' ? run.end.fuelLeft : 0;
  return share * tank(stages, lastStage(stages), level);
}

/** The goals a run met, as stars: reached orbit, dropped every stage, fuel to spare. */
function stars(run: Run): [boolean, boolean, boolean] {
  const goals: RunGoals = runGoals(run.flight, run.end);
  return [goals.orbit, goals.droppedAll, goals.spareFuel];
}

/**
 * Fly `flight` on by `seconds` (or to its end) with the tilt held, a frame
 * at a time, dropping each empty stage the moment it runs dry.
 */
function holdFor(flight: Flight, seconds: number): Happening[] {
  const happened: Happening[] = [];
  let left = seconds;
  while (left > 0 && !flight.inOrbit && (flight.fuel > 0 || canDrop(flight))) {
    if (canDrop(flight)) drop(flight);
    const step = Math.min(left, FRAME, flight.fuel);
    happened.push(...advance(flight, step));
    left -= step;
  }
  return happened;
}

/** Where and how a copy of `flight` ends with the tilt held, in the words the path ahead uses. */
function holdOn(flight: Flight): Pick<Ahead, 'end' | 'outcome'> {
  const copy = { ...flight };
  holdFor(copy, Infinity);
  const end = { x: copy.x, height: copy.height };
  if (copy.inOrbit) return { end, outcome: 'orbit' };
  return { end, outcome: copy.height < RULES.orbitHeight ? 'low' : 'slow' };
}

/** A flight on its last stage, flat, high above the orbit line, a little short of orbit speed. */
const nearlyInOrbit = (stages: 2 | 3): Flight => ({
  ...startFlight('easy', stages),
  stage: lastStage(stages),
  fuel: tank(stages, lastStage(stages)),
  height: RULES.orbitHeight + 1,
  tilt: RULES.maxTilt,
  sideways: RULES.orbitSpeed - RULES.sidePush,
});

describe('the orbit game', () => {
  describe('a clean run', () => {
    it.each(ROCKETS)(
      'reaches orbit with a rocket of %i stages, 20 to 26 seconds after liftoff, with 15 to 35 percent of the last stage left',
      (stages) => {
        const run = fly(stages, { tips: CLEAN_TIPS });

        expect(run.end.kind).toBe('orbit');
        expect(run.seconds).toBeGreaterThanOrEqual(20);
        expect(run.seconds).toBeLessThanOrEqual(26);
        const fuelLeft = run.end.kind === 'orbit' ? run.end.fuelLeft : NaN;
        expect(fuelLeft).toBeGreaterThanOrEqual(0.15);
        expect(fuelLeft).toBeLessThanOrEqual(0.35);
        expect(run.flight.inOrbit).toBe(true);
        expect(run.flight.height).toBeGreaterThanOrEqual(RULES.orbitHeight);
      },
    );

    it.each(ROCKETS)(
      'takes no more than 8 tilt presses with a rocket of %i stages, every one of them taken, and drops each stage at once',
      (stages) => {
        const run = fly(stages, { tips: CLEAN_TIPS });

        const tilts = run.presses.filter(([, press]) => press !== 'drop');
        expect(tilts.length).toBeLessThanOrEqual(8);
        expect(run.refused).toBe(0);
        expect(run.flight.tilt).toBe(RULES.maxTilt);
        expect(run.presses.filter(([, press]) => press === 'drop')).toHaveLength(stages - 1);
        expect(run.happened.some((one) => one.kind === 'dropped' && one.byItself)).toBe(false);
      },
    );

    it('goes straight up until the tail clears the thick air, then starts tipping', () => {
      const flight = startFlight('easy', 3);
      const frames = Math.round((CLEAN_TIPS[0] ?? 0) * 10);
      for (let frame = 0; frame < frames - 1; frame += 1) advance(flight, FRAME);

      expect(heightBand(flight)).toBe('thick');

      advance(flight, FRAME);

      expect(heightBand(flight)).toBe('thin');
    });

    it.each(ROCKETS)(
      'ends between 60 and 90 percent of the way across with a rocket of %i stages, short of the stop at the right',
      (stages) => {
        const run = fly(stages, { tips: CLEAN_TIPS });

        expect(run.flight.x).toBeGreaterThanOrEqual(0.6 * RULES.width);
        expect(run.flight.x).toBeLessThanOrEqual(0.9 * RULES.width);
        expect(run.farthest).toBeLessThan(RULES.width - 2);
      },
    );
  });

  describe('a late run', () => {
    it.each(ROCKETS)(
      'still reaches orbit with a rocket of %i stages when every tilt press is a second late',
      (stages) => {
        expect(fly(stages, { tips: lateBy(1) }).end.kind).toBe('orbit');
      },
    );

    it.each(ROCKETS)(
      'runs out of fuel with a rocket of %i stages when every tilt press is three seconds late',
      (stages) => {
        const run = fly(stages, { tips: lateBy(3) });

        expect(run.end.kind).toBe('out-of-fuel');
        expect(run.flight.inOrbit).toBe(false);
      },
    );
  });

  describe('pressing nothing', () => {
    it.each(ROCKETS)(
      'goes straight up with a rocket of %i stages, its stages dropping by themselves, and stops at the top with no sideways speed',
      (stages) => {
        let highest = 0;
        const run = fly(stages, {
          drops: false,
          watch: (flight) => {
            highest = Math.max(highest, flight.height);
            expect(flight.tilt).toBe(0);
          },
        });

        expect(run.end.kind).toBe('out-of-fuel');
        expect(run.presses).toEqual([]);
        expect(run.happened.filter((one) => one.kind === 'dropped')).toEqual(
          Array.from({ length: stages - 1 }, (_, stage) => ({
            kind: 'dropped',
            stage,
            byItself: true,
          })),
        );
        expect(run.flight.height).toBe(RULES.maxHeight);
        expect(highest).toBeLessThanOrEqual(RULES.maxHeight);
        expect(run.flight.sideways).toBe(0);
        expect(run.flight.x).toBe(RULES.padX);
      },
    );

    it.each(ROCKETS)(
      'shows a path ahead that ends too slow the whole way with a rocket of %i stages',
      (stages) => {
        const outcomes = new Set<string>();
        const run = fly(stages, {
          drops: false,
          watch: (flight) => outcomes.add(ahead(flight).outcome),
        });

        expect(outcomes).toEqual(new Set(['slow']));
        expect(ahead(run.flight).outcome).toBe('slow');
      },
    );
  });

  describe('tipping flat too soon', () => {
    it.each(ROCKETS)(
      'never reaches orbit with a rocket of %i stages, and the path ahead ends low once it is flat',
      (stages) => {
        const whileFlat: string[] = [];
        const run = fly(stages, {
          flatOut: true,
          watch: (flight) => {
            if (flight.tilt === RULES.maxTilt) whileFlat.push(ahead(flight).outcome);
          },
        });

        expect(run.presses[0]).toEqual([0, 'over']);
        expect(run.end.kind).toBe('out-of-fuel');
        expect(run.flight.height).toBeLessThan(RULES.orbitHeight);
        expect(run.flight.sideways).toBe(RULES.thinAirSpeed);
        expect(whileFlat.length).toBeGreaterThan(0);
        expect(new Set(whileFlat)).toEqual(new Set(['low']));
        expect(ahead(run.flight).outcome).toBe('low');
      },
    );
  });

  describe('the path ahead', () => {
    /** Moments from runs that end every way: clean, late, untouched, and flat too soon. */
    function moments(): Flight[] {
      const found: Flight[] = [];
      const watch = (flight: Flight, seconds: number): void => {
        if (Math.round(seconds * 10) % 5 === 0) found.push({ ...flight });
      };
      for (const stages of ROCKETS) {
        fly(stages, { tips: CLEAN_TIPS, watch });
        fly(stages, { tips: lateBy(1), watch });
        fly(stages, { tips: lateBy(3), watch });
        fly(stages, { drops: false, watch });
        fly(stages, { flatOut: true, watch });
      }
      return found;
    }

    it('leaves the flight untouched, and ends where the flight does when the tilt is held and each stage is dropped at once', () => {
      const outcomes = new Set<string>();
      for (const flight of moments()) {
        const before = { ...flight };
        const look = ahead(flight);
        expect(flight).toEqual(before);

        const held = holdOn(flight);
        expect(look.outcome).toBe(held.outcome);
        expect(look.end.x).toBeCloseTo(held.end.x, 6);
        expect(look.end.height).toBeCloseTo(held.end.height, 6);
        outcomes.add(look.outcome);
      }

      expect(outcomes).toEqual(new Set(['orbit', 'low', 'slow']));
    });

    it('starts where the rocket is, puts a point every half second, and ends on the end', () => {
      const flight = startFlight('easy', 3);
      advance(flight, 5);
      tip(flight, 'over');

      const look = ahead(flight);

      expect(look.points[0]).toEqual({ x: flight.x, height: flight.height });
      expect(look.points.at(-1)).toEqual(look.end);
      const copy = { ...flight };
      for (const point of look.points.slice(1)) {
        holdFor(copy, RULES.aheadStep);
        expect(point.x).toBeCloseTo(copy.x, 6);
        expect(point.height).toBeCloseTo(copy.height, 6);
      }
      expect(look.end.x).toBeCloseTo(holdOn(flight).end.x, 6);
    });

    it('drops an empty stage at once, before the path sets off', () => {
      const flight: Flight = { ...startFlight('easy', 2), height: 20, fuel: 0, emptyFor: 1 };

      const look = ahead(flight);

      expect(look.points[0]).toEqual({ x: flight.x, height: 20 });
      expect(look.points[1]?.height).toBeCloseTo(20 + RULES.climbSpeed * RULES.aheadStep);
    });

    it('is just where the rocket is once the run is over', () => {
      const run = fly(3, { tips: CLEAN_TIPS });

      const look = ahead(run.flight);

      expect(look.outcome).toBe('orbit');
      expect(look.points).toEqual([look.end]);
      expect(look.end).toEqual({ x: run.flight.x, height: run.flight.height });
    });
  });

  describe('tipping', () => {
    it('cancels a press over with a press back', () => {
      const flight: Flight = { ...startFlight('easy', 3), height: 20 };

      expect(tip(flight, 'over')).toBe('tipped');
      expect(tip(flight, 'over')).toBe('tipped');
      expect(tiltDegrees(flight)).toBe(2 * RULES.tiltStepDegrees);
      expect(tip(flight, 'back')).toBe('tipped');
      expect(tip(flight, 'back')).toBe('tipped');

      expect(flight).toEqual({ ...startFlight('easy', 3), height: 20 });
    });

    it('never tips past straight up or past flat', () => {
      const flight: Flight = { ...startFlight('easy', 3), height: 20 };

      for (let press = 0; press < RULES.maxTilt; press += 1) tip(flight, 'over');
      expect(flight.tilt).toBe(RULES.maxTilt);
      expect(tip(flight, 'over')).toBe('limit');
      expect(flight.tilt).toBe(RULES.maxTilt);

      for (let press = 0; press < RULES.maxTilt; press += 1) tip(flight, 'back');
      expect(flight.tilt).toBe(0);
      expect(tip(flight, 'back')).toBe('limit');
      expect(flight.tilt).toBe(0);
    });

    it('tips only one step in the thick air, and leaves the flight alone when it says no', () => {
      const flight = startFlight('easy', 2);

      expect(tip(flight, 'over')).toBe('tipped');
      const before = { ...flight };
      expect(tip(flight, 'over')).toBe('thick-air');
      expect(flight).toEqual(before);
      expect(flight.tilt).toBe(RULES.thickAirTilt);
    });

    it('takes no more presses once the run is over', () => {
      const flight: Flight = { ...nearlyInOrbit(3), tilt: 3, inOrbit: true };

      expect(tip(flight, 'over')).toBe('limit');
      expect(tip(flight, 'back')).toBe('limit');
      expect(flight.tilt).toBe(3);
    });
  });

  describe('a step of time', () => {
    it('changes nothing in a step of no time, or after the end', () => {
      const flight = startFlight('easy', 3);
      expect(advance(flight, 0)).toEqual([]);
      expect(advance(flight, -1)).toEqual([]);
      expect(flight).toEqual(startFlight('easy', 3));

      const inOrbit: Flight = { ...nearlyInOrbit(3), inOrbit: true };
      const outOfFuel: Flight = { ...nearlyInOrbit(2), fuel: 0 };
      for (const ended of [inOrbit, outOfFuel]) {
        const before = { ...ended };
        expect(advance(ended, 5)).toEqual([]);
        expect(ended).toEqual(before);
      }
    });

    it('climbs straight up at the climb speed, burning a second of fuel each second', () => {
      const flight = startFlight('easy', 3);

      expect(advance(flight, 2)).toEqual([]);

      expect(flight.height).toBeCloseTo(PAD_HEIGHT + 2 * RULES.climbSpeed);
      expect(flight.fuel).toBeCloseTo(tank(3, 0) - 2);
      expect(flight.sideways).toBe(0);
      expect(flight.x).toBe(RULES.padX);
    });

    it('flies the same flight however the frames fall', () => {
      const start: Flight = { ...nearlyInOrbit(3), height: 30, tilt: 4, sideways: 1.5 };
      const inOne = { ...start };
      const inFrames = { ...start };
      const inOddSteps = { ...start };

      const once = advance(inOne, 10);
      const framed = Array.from({ length: 100 }, () => advance(inFrames, FRAME)).flat();
      const odd = [0.37, 1.1, 2.9, 0.03, 5.6].flatMap((seconds) => advance(inOddSteps, seconds));

      expect(once).toEqual([{ kind: 'orbit', fuelLeft: expect.any(Number) }]);
      for (const [flight, happened] of [
        [inFrames, framed],
        [inOddSteps, odd],
      ] as const) {
        expect(happened).toHaveLength(1);
        expect(happened[0]?.kind).toBe('orbit');
        for (const key of ['x', 'height', 'sideways', 'fuel'] as const) {
          expect(flight[key]).toBeCloseTo(inOne[key], 9);
        }
      }
    });

    it('holds the sideways speed to the thin-air limit below the orbit line, and not above it', () => {
      const below: Flight = {
        ...startFlight('easy', 3),
        height: 20,
        tilt: RULES.maxTilt,
        sideways: 1.9,
      };
      const above: Flight = { ...below, height: RULES.orbitHeight };

      advance(below, 2);
      advance(above, 2);

      expect(below.sideways).toBe(RULES.thinAirSpeed);
      expect(above.sideways).toBeCloseTo(1.9 + 2 * RULES.sidePush);
    });

    it('keeps sideways speed the rocket already had when it sinks back below the orbit line', () => {
      const flight: Flight = {
        ...startFlight('easy', 3),
        height: RULES.orbitHeight - 0.1,
        tilt: RULES.maxTilt,
        sideways: RULES.thinAirSpeed + 0.3,
      };

      advance(flight, 1);

      expect(flight.sideways).toBeCloseTo(RULES.thinAirSpeed + 0.3);
    });

    it('stops the rocket at the top of the picture and at the stop on the right, keeping its speed', () => {
      const flight: Flight = {
        ...startFlight('easy', 3),
        height: RULES.maxHeight - 1,
        x: RULES.width - 3,
        tilt: 1,
        sideways: 2,
      };

      advance(flight, 2);

      expect(flight.height).toBe(RULES.maxHeight);
      expect(flight.x).toBe(RULES.width - 2);
      expect(flight.sideways).toBeGreaterThan(2);
    });
  });

  describe('the stages', () => {
    it('does not burn past empty when a stage runs out partway through a step', () => {
      const flight: Flight = { ...startFlight('easy', 3), height: 20, fuel: 0.5 };

      expect(advance(flight, 1.5)).toEqual([{ kind: 'stage-empty', stage: 0 }]);

      expect(flight.fuel).toBe(0);
      expect(flight.emptyFor).toBeCloseTo(1);
      expect(flight.height).toBeCloseTo(20 + 0.5 * RULES.climbSpeed - 1 * RULES.sinkSpeed);
      expect(burning(flight)).toBe(false);
      expect(canDrop(flight)).toBe(true);
    });

    it('stands a rocket that sinks back into the thick air up to the most tilt it allows', () => {
      const flight: Flight = {
        ...startFlight('easy', 3),
        height: CLEAR_OF_THICK_AIR + 0.2,
        tilt: RULES.maxTilt,
        fuel: 0,
      };

      expect(advance(flight, 0.1)).toEqual([]);
      expect(advance(flight, 1)).toEqual([{ kind: 'stood-up' }]);

      expect(flight.tilt).toBe(RULES.thickAirTilt);
      expect(heightBand(flight)).toBe('thick');
    });

    it('sinks more slowly the faster it goes sideways, and never below the pad', () => {
      const still: Flight = { ...startFlight('easy', 3), height: 20, fuel: 0 };
      const fast: Flight = { ...still, sideways: RULES.orbitSpeed / 2 };
      const low: Flight = { ...still, height: PAD_HEIGHT + 0.1 };

      advance(still, 1);
      advance(fast, 1);
      advance(low, 1);

      expect(still.height).toBeCloseTo(20 - RULES.sinkSpeed);
      expect(fast.height).toBeCloseTo(20 - RULES.sinkSpeed / 2);
      expect(low.height).toBe(PAD_HEIGHT);
    });

    it('drops an empty stage by itself after a while, and the next one lights with a full tank', () => {
      const flight: Flight = { ...startFlight('easy', 3), height: 20, fuel: 0 };

      expect(advance(flight, EASY.dropsItselfAfter - FRAME)).toEqual([]);
      expect(advance(flight, 2 * FRAME)).toEqual([{ kind: 'dropped', stage: 0, byItself: true }]);

      expect(flight.stage).toBe(1);
      expect(flight.fuel).toBeCloseTo(tank(3, 1) - FRAME);
      expect(flight.emptyFor).toBe(0);
      expect(burning(flight)).toBe(true);
    });

    it('drops a stage only when it is empty, and never the last one', () => {
      const flight = startFlight('easy', 2);

      expect(drop(flight)).toBe('not-yet');
      expect(flight).toEqual(startFlight('easy', 2));

      advance(flight, tank(2, 0));
      expect(drop(flight)).toBe('dropped');
      expect(flight.stage).toBe(1);
      expect(fuelShare(flight)).toBe(1);
      expect(burning(flight)).toBe(true);

      expect(drop(flight)).toBe('last-stage');
      advance(flight, tank(2, 1));
      expect(canDrop(flight)).toBe(false);
      expect(drop(flight)).toBe('last-stage');
    });

    it('runs out of fuel on the last stage, and nothing moves after that', () => {
      const flight: Flight = { ...nearlyInOrbit(3), sideways: 1, fuel: 0.5 };

      expect(advance(flight, 1)).toEqual([{ kind: 'out-of-fuel' }]);
      const after = { ...flight };
      expect(advance(flight, 1)).toEqual([]);
      expect(flight).toEqual(after);
    });
  });

  describe('orbit', () => {
    it('counts orbit reached on the last of the fuel', () => {
      const flight: Flight = { ...nearlyInOrbit(3), fuel: 1 };

      expect(advance(flight, 2)).toEqual([{ kind: 'orbit', fuelLeft: 0 }]);
      expect(flight.inOrbit).toBe(true);
      expect(burning(flight)).toBe(false);
    });

    it('stops at the very moment of orbit, and says how much of the last tank is left', () => {
      const flight = nearlyInOrbit(2);

      expect(advance(flight, 3)).toEqual([
        { kind: 'orbit', fuelLeft: (tank(2, 1) - 1) / tank(2, 1) },
      ]);
      expect(flight.sideways).toBe(RULES.orbitSpeed);
      expect(speedShare(flight)).toBe(1);
    });

    it('never says more than a full tank is left, even with stages still to burn', () => {
      const flight: Flight = { ...nearlyInOrbit(3), stage: 0, fuel: tank(3, 0) };

      expect(advance(flight, 2)).toEqual([{ kind: 'orbit', fuelLeft: 1 }]);
      expect(canDrop(flight)).toBe(false);
    });
  });

  describe('the read-outs', () => {
    it.each<['thick' | 'thin' | 'space', string, number]>([
      ['thick', 'on the pad', PAD_HEIGHT],
      ['thick', 'a hair short of clearing the thick air', CLEAR_OF_THICK_AIR - 0.01],
      ['thin', 'just clear of the thick air', CLEAR_OF_THICK_AIR],
      ['thin', 'a hair under the orbit line', RULES.orbitHeight - 0.01],
      ['space', 'on the orbit line', RULES.orbitHeight],
    ])("says '%s' when the rocket is %s", (band, _where, height) => {
      expect(heightBand({ ...startFlight('easy', 3), height })).toBe(band);
    });

    it('gives speed and fuel as shares from 0 to 1', () => {
      const flight: Flight = { ...startFlight('easy', 3), sideways: RULES.orbitSpeed / 4 };

      expect(speedShare(flight)).toBeCloseTo(0.25);
      expect(fuelShare(flight)).toBe(1);

      advance(flight, tank(3, 0) / 2);

      expect(fuelShare(flight)).toBeCloseTo(0.5);
    });
  });

  describe('the hard level', () => {
    it.each(ROCKETS)(
      'gives a rocket of %i stages less fuel in every stage, a second less in all',
      (stages) => {
        const easy = EASY.stageSeconds[stages];
        const hard = HARD.stageSeconds[stages];

        expect(hard).toHaveLength(easy.length);
        expect(hard.every((seconds, stage) => seconds < (easy[stage] ?? 0))).toBe(true);
        expect(allTanks(stages, 'hard')).toBe(allTanks(stages, 'easy') - 1);
        expect(startFlight('hard', stages)).toMatchObject({ level: 'hard', fuel: hard[0] });
      },
    );

    it('leaves an empty stage on twice as long as Easy does, 4 seconds, before it drops by itself', () => {
      const flight: Flight = { ...startFlight('hard', 3), height: 20, fuel: 0 };

      expect(advance(flight, HARD.dropsItselfAfter - FRAME)).toEqual([]);
      expect(advance(flight, 2 * FRAME)).toEqual([{ kind: 'dropped', stage: 0, byItself: true }]);

      expect(HARD.dropsItselfAfter).toBe(2 * EASY.dropsItselfAfter);
      expect(flight.fuel).toBeCloseTo(tank(3, 1, 'hard') - FRAME);
    });

    it.each(ROCKETS)(
      'reaches orbit on the clean run with a rocket of %i stages as soon as on Easy and with the same presses, with 1 to 1.5 seconds of burning in hand instead of 2 to 2.5',
      (stages) => {
        const easy = fly(stages, { tips: CLEAN_TIPS });

        const run = fly(stages, { tips: CLEAN_TIPS }, 'hard');

        expect(run.end.kind).toBe('orbit');
        expect(run.seconds).toBe(easy.seconds);
        expect(run.presses.filter(([, press]) => press !== 'drop')).toHaveLength(6);
        expect(run.presses.filter(([, press]) => press === 'drop')).toHaveLength(stages - 1);
        expect(run.refused).toBe(0);
        expect(inHand(run, stages, 'hard')).toBeGreaterThan(1);
        expect(inHand(run, stages, 'hard')).toBeLessThan(1.5);
        expect(inHand(easy, stages)).toBeGreaterThan(2);
        expect(inHand(easy, stages)).toBeLessThan(2.5);
      },
    );

    it.each(ROCKETS)(
      'still just reaches orbit with a rocket of %i stages when every tilt press is a second late, with less than half a second in hand',
      (stages) => {
        const run = fly(stages, { tips: lateBy(1) }, 'hard');

        expect(run.end.kind).toBe('orbit');
        expect(inHand(run, stages, 'hard')).toBeGreaterThan(0);
        expect(inHand(run, stages, 'hard')).toBeLessThan(0.5);
      },
    );

    it.each(ROCKETS)(
      'runs out of fuel with a rocket of %i stages when every tilt press is a second and a half late, which Easy forgives',
      (stages) => {
        expect(fly(stages, { tips: lateBy(1.5) }, 'hard').end.kind).toBe('out-of-fuel');
        expect(fly(stages, { tips: lateBy(1.5) }).end.kind).toBe('orbit');
      },
    );

    it.each(ROCKETS)(
      'goes straight up with a rocket of %i stages when nothing is pressed, each empty stage hanging on 4 seconds, and runs out of fuel at the top',
      (stages) => {
        const run = fly(stages, { drops: false }, 'hard');

        expect(run.end.kind).toBe('out-of-fuel');
        expect(run.presses).toEqual([]);
        expect(run.happened.filter((one) => one.kind === 'dropped')).toHaveLength(stages - 1);
        expect(run.flight.height).toBe(RULES.maxHeight);
        expect(run.flight.sideways).toBe(0);
        // Every tank burned dry, and each stage under the last one left on for the wait.
        expect(run.seconds).toBeCloseTo(
          allTanks(stages, 'hard') + (stages - 1) * HARD.dropsItselfAfter,
          0,
        );
      },
    );
  });

  describe('the stars', () => {
    it('earns all three for reaching orbit with every stage dropped by hand and fuel to spare', () => {
      const run = fly(3, { tips: CLEAN_TIPS });

      expect(runGoals(run.flight, run.end)).toEqual({
        orbit: true,
        droppedAll: true,
        spareFuel: true,
      });
    });

    it('earns none when the fuel runs out', () => {
      const run = fly(3, { tips: lateBy(3) });

      expect(run.end).toEqual({ kind: 'out-of-fuel' });
      expect(runGoals(run.flight, run.end)).toEqual({
        orbit: false,
        droppedAll: false,
        spareFuel: false,
      });
    });

    it('remembers a stage that dropped by itself, and not one dropped with Drop it', () => {
      const byHand: Flight = { ...startFlight('easy', 3), height: 20, fuel: 0 };
      const byItself: Flight = { ...byHand };

      drop(byHand);
      advance(byHand, EASY.dropsItselfAfter + FRAME);
      advance(byItself, EASY.dropsItselfAfter + FRAME);

      expect(startFlight('easy', 3).droppedItself).toBe(false);
      expect(byHand.droppedItself).toBe(false);
      expect(byItself.droppedItself).toBe(true);
    });

    it.each<[Level, Stages, string, () => Run, [boolean, boolean, boolean]]>([
      ['easy', 3, 'the clean run', () => fly(3, { tips: CLEAN_TIPS }), [true, true, true]],
      [
        'easy',
        3,
        'every tip a second late',
        () => fly(3, { tips: lateBy(1) }),
        [true, true, false],
      ],
      [
        'easy',
        3,
        'the clean tips with the first stage left on, which runs out of fuel',
        () => fly(3, { tips: CLEAN_TIPS, leaveOn: [0] }),
        [false, false, false],
      ],
      [
        'easy',
        3,
        'the second stage left on and the last tip held back until it drops, as an empty stage burns no fuel',
        () =>
          fly(3, {
            tips: waitingAfter(emptyAt(3, 1, 'easy'), EASY.dropsItselfAfter),
            leaveOn: [1],
          }),
        [true, false, true],
      ],
      ['easy', 2, 'the clean run', () => fly(2, { tips: CLEAN_TIPS }), [true, true, true]],
      [
        'easy',
        2,
        'every tip a second late',
        () => fly(2, { tips: lateBy(1) }),
        [true, true, false],
      ],
      [
        'easy',
        2,
        'the clean tips with the first stage left on, which runs out of fuel',
        () => fly(2, { tips: CLEAN_TIPS, leaveOn: [0] }),
        [false, false, false],
      ],
      [
        'easy',
        2,
        'the first stage left on and the tips after it held back until it drops, as an empty stage burns no fuel',
        () =>
          fly(2, {
            tips: waitingAfter(emptyAt(2, 0, 'easy'), EASY.dropsItselfAfter),
            leaveOn: [0],
          }),
        [true, false, true],
      ],
      ['hard', 3, 'the clean run', () => fly(3, { tips: CLEAN_TIPS }, 'hard'), [true, true, true]],
      [
        'hard',
        3,
        'every tip a second late',
        () => fly(3, { tips: lateBy(1) }, 'hard'),
        [true, true, false],
      ],
      [
        'hard',
        3,
        'the clean tips with the first stage left on, which runs out of fuel',
        () => fly(3, { tips: CLEAN_TIPS, leaveOn: [0] }, 'hard'),
        [false, false, false],
      ],
      [
        'hard',
        3,
        'the second stage left on and the last tip held back until it drops, which sinks too far',
        () =>
          fly(
            3,
            {
              tips: waitingAfter(emptyAt(3, 1, 'hard'), HARD.dropsItselfAfter),
              leaveOn: [1],
            },
            'hard',
          ),
        [false, false, false],
      ],
      ['hard', 2, 'the clean run', () => fly(2, { tips: CLEAN_TIPS }, 'hard'), [true, true, true]],
      [
        'hard',
        2,
        'every tip a second late',
        () => fly(2, { tips: lateBy(1) }, 'hard'),
        [true, true, false],
      ],
      [
        'hard',
        2,
        'the clean tips with the first stage left on, which runs out of fuel',
        () => fly(2, { tips: CLEAN_TIPS, leaveOn: [0] }, 'hard'),
        [false, false, false],
      ],
      [
        'hard',
        2,
        'the first stage left on and the tips after it held back until it drops, which sinks too far',
        () =>
          fly(
            2,
            {
              tips: waitingAfter(emptyAt(2, 0, 'hard'), HARD.dropsItselfAfter),
              leaveOn: [0],
            },
            'hard',
          ),
        [false, false, false],
      ],
    ])(
      'on %s with a rocket of %i stages, %s earns these stars',
      (_level, _stages, _name, run, earned) => {
        expect(stars(run())).toEqual(earned);
      },
    );

    it.each(LEVELS.flatMap((level) => ROCKETS.map((stages) => [level, stages] as const)))(
      'on %s with a rocket of %i stages, gives the star for fuel to spare to the clean run with about half a second of burning in hand',
      (level, stages) => {
        const run = fly(stages, { tips: CLEAN_TIPS }, level);
        const needed =
          LEVEL_RULES[level].spareFuel[stages] * tank(stages, lastStage(stages), level);

        expect(inHand(run, stages, level) - needed).toBeGreaterThan(0.3);
        expect(inHand(run, stages, level) - needed).toBeLessThan(0.7);
      },
    );
  });
});
