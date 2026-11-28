/**
 * The rules of "Fly to orbit", with no drawing in them.
 *
 * A SIMPLIFICATION, said on screen: this is a practice toy, not a simulator.
 * The rocket climbs only while its engine burns and points up, at a steady
 * speed; a real rocket speeds up as it climbs, and keeps coasting upward
 * for a while after its engine stops. Here, while an empty stage is still
 * on, the rocket sinks a little instead, and less the faster it is going
 * sideways. Nothing ever slows the sideways speed: no air or gravity takes
 * any of it away. Tipping is instant: one press turns the whole rocket one
 * step at once, where a real rocket was tipped over little by little.
 * The thick air is two made-up rules, not real air: low down the rocket
 * cannot tip far, and below the orbit line the engine cannot push the
 * sideways speed past a limit, so the player must climb before going fast.
 * Every distance, speed and time here is made up to make a kind game for a
 * ten-year-old; none of them is a real figure for any rocket.
 *
 * Distances are in "units" of the picture. `x` runs across, to the right,
 * from the left edge, and `height` is above the ground; both are measured
 * at the middle of the rocket. Tilt is counted in whole steps, so that a
 * step over and a step back always cancel exactly. Each stage burns for a
 * set number of seconds, whatever the tilt.
 *
 * A step of time is split wherever something changes partway through it:
 * a stage runs dry, the rocket reaches the orbit line, it reaches orbit
 * speed, or an empty stage drops by itself. So the same presses at the
 * same moments fly the same flight, however the frames fall.
 *
 * There are two levels. RULES holds the numbers both share, and
 * LEVEL_RULES the few that differ, none of which the picture draws: the
 * fuel in each stage, how long an empty stage hangs on before it drops by
 * itself, and the fuel a run must save for its third star. A flight is
 * started on a level and carries it, so every rule below reads that
 * level's numbers from the flight it is given.
 */
import type { Level } from '../shared/levels.ts';

/** One press of a tilt control: "over" tips toward flat, "back" toward straight up. */
export type Tip = 'over' | 'back';

/** The toy's numbers on both levels: made up, and the same whatever the level. */
export const RULES = {
  /** The picture: its width, how far it shows above the ground, and how far below. */
  width: 36,
  top: 41.4,
  groundDepth: 2.6,
  /** Where the launch pad is across the picture, and how long the whole rocket is drawn. */
  padX: 8,
  rocketLength: 10,
  /** The top of the thick air, and the height of the orbit line. */
  thickAirTop: 9.8,
  orbitHeight: 35,
  /** The highest the rocket's middle can go. */
  maxHeight: 40,
  /** Tilt in whole steps: 0 is straight up, `maxTilt` is flat. */
  maxTilt: 6,
  tiltStepDegrees: 15,
  /** The most tilt the thick air allows. */
  thickAirTilt: 1,
  /** Units a second the engine lifts the rocket when it points straight up. */
  climbSpeed: 2.6,
  /** Sideways speed the engine adds each second when the rocket is flat. */
  sidePush: 0.2,
  /** The sideways speed that counts as orbit, and the most the air allows below the orbit line. */
  orbitSpeed: 2.75,
  thinAirSpeed: 2.05,
  /** With no engine burning, how fast the rocket sinks. */
  sinkSpeed: 0.8,
  /** Seconds between the points of the path ahead. */
  aheadStep: 0.5,
} as const;

/** How many stages a rocket has. */
export type Stages = 2 | 3;

/** The numbers that differ between the levels. */
export interface LevelRules {
  /** Seconds of burning in each stage, from the first up, for a rocket of two stages and one of three. */
  stageSeconds: Readonly<Record<Stages, readonly number[]>>;
  /** How long an empty stage stays on before it drops by itself, in seconds. */
  dropsItselfAfter: number;
  /** The third star, "Fuel to spare": the least share of the last stage's tank left at orbit that earns it, for each rocket size. */
  spareFuel: Readonly<Record<Stages, number>>;
}

/**
 * Each level's own numbers, measured by the scripted runs in game.test.ts.
 * The rocket flies the same whichever stage is burning, so a clean run
 * burns about 21.8 seconds of fuel on either rocket, and each second a run
 * is late burns about one second more. `spareFuel` is set so that a clean
 * run earns the third star with about half a second of burning in hand,
 * and a run one second late on every tip does not. An empty stage left on
 * burns no fuel, though: it costs height and time, so a run that waits for
 * it to drop can still have fuel to spare (it misses the second star).
 */
export const LEVEL_RULES: Readonly<Record<Level, Readonly<LevelRules>>> = {
  /** The game as it first was: 24 seconds of fuel on either rocket, so a clean run has about 2.2 seconds in hand and every tip may come 2 seconds late. */
  easy: {
    stageSeconds: { 2: [11, 13], 3: [7, 8, 9] },
    dropsItselfAfter: 2,
    // About 1.6 seconds of burning left in the last stage.
    spareFuel: { 2: 0.12, 3: 0.18 },
  },
  /** A second less fuel, in every stage, so a clean run has about 1.2 seconds in hand and every tip may come only 1 second late; and an empty stage left on hangs on twice as long. */
  hard: {
    stageSeconds: { 2: [10.5, 12.5], 3: [6.5, 7.75, 8.75] },
    dropsItselfAfter: 4,
    // About 0.8 seconds of burning left in the last stage.
    spareFuel: { 2: 0.06, 3: 0.09 },
  },
};

export interface Flight {
  /** The level it is flown on, whose numbers the rules read (LEVEL_RULES). */
  readonly level: Level;
  x: number;
  height: number;
  /** Whole steps of tilt, 0 to RULES.maxTilt. */
  tilt: number;
  /** Sideways speed, units a second. */
  sideways: number;
  /** How many stages the rocket has, and which one is on the bottom now (0 is the first). */
  stages: Stages;
  stage: number;
  /** Seconds of burning left in the bottom stage. */
  fuel: number;
  /** Seconds the bottom stage has been empty and still on. 0 while it burns. */
  emptyFor: number;
  /** Set once a stage has been left on until it dropped by itself in this run. */
  droppedItself: boolean;
  /** Set once orbit is reached; nothing moves the flight after that. */
  inOrbit: boolean;
}

/** What happened during a step of time. Usually nothing. */
export type Happening =
  | { kind: 'stage-empty'; stage: number }
  | { kind: 'dropped'; stage: number; byItself: boolean }
  /** The thick air stood the rocket back up to the most tilt it allows. */
  | { kind: 'stood-up' }
  /** `fuelLeft` is 0 to 1: the fuel still on board as a share of the last stage's tank, never more than 1. */
  | { kind: 'orbit'; fuelLeft: number }
  | { kind: 'out-of-fuel' };

export interface Ahead {
  /** The path from where the rocket is now, one point every RULES.aheadStep seconds, the last one being `end`. */
  points: { x: number; height: number }[];
  end: { x: number; height: number };
  /** orbit: it will get there. low: it ends below the orbit line. slow: high enough, but too slow. */
  outcome: 'orbit' | 'low' | 'slow';
}

/** The middle of the rocket standing on the pad: where it starts, and the lowest it can sink. */
const PAD_HEIGHT = RULES.rocketLength / 2;
/** The rocket's middle must be this high for its tail, standing upright, to clear the thick air. */
const CLEAR_OF_THICK_AIR = RULES.thickAirTop + RULES.rocketLength / 2;
/** The farthest right the rocket's middle can go, so it stays in the picture. */
const X_STOP = RULES.width - 2;

/** Seconds of burning in a full tank of one of the flight's stages, on its level. */
const tank = ({ level, stages }: Pick<Flight, 'level' | 'stages'>, stage: number): number =>
  LEVEL_RULES[level].stageSeconds[stages][stage] ?? 0;

const onLastStage = (flight: Flight): boolean => flight.stage >= flight.stages - 1;

/** Nothing moves any more: in orbit, or the last stage is empty. */
const isOver = (flight: Flight): boolean =>
  flight.inOrbit || (onLastStage(flight) && flight.fuel <= 0);

const inThickAir = (flight: Flight): boolean => flight.height < CLEAR_OF_THICK_AIR;

/** A number so close to 0 that it only comes from rounding: the cosine of a right angle, say. */
const tidy = (value: number): number => (Math.abs(value) < 1e-9 ? 0 : value);

/** How much of the engine's push goes up, and how much sideways, at this tilt. Flat is exactly flat. */
function lean(tilt: number) {
  const turn = (tilt * RULES.tiltStepDegrees * Math.PI) / 180;
  return { up: tidy(Math.cos(turn)), side: tidy(Math.sin(turn)) };
}

/** The fuel still on board, the bottom stage's and every full tank above it, as a share of the last stage's tank. */
function fuelOnBoard(flight: Flight): number {
  let seconds = flight.fuel;
  for (let stage = flight.stage + 1; stage < flight.stages; stage += 1) {
    seconds += tank(flight, stage);
  }
  return Math.min(1, seconds / tank(flight, flight.stages - 1));
}

/** The empty bottom stage comes off, and the next one lights with a full tank. */
function nextStage(flight: Flight): void {
  flight.stage += 1;
  flight.fuel = tank(flight, flight.stage);
  flight.emptyFor = 0;
}

/** A fresh start on a level: standing on the pad, straight up, with the first stage full and burning. */
export function startFlight(level: Level, stages: Stages): Flight {
  return {
    level,
    x: RULES.padX,
    height: PAD_HEIGHT,
    tilt: 0,
    sideways: 0,
    stages,
    stage: 0,
    fuel: tank({ level, stages }, 0),
    emptyFor: 0,
    droppedItself: false,
    inOrbit: false,
  };
}

/**
 * One press. 'thick-air' and 'limit' leave the flight unchanged. Once the
 * run is over (in orbit, or out of fuel) every press is 'limit', so nothing
 * moves the flight after its end.
 */
export function tip(flight: Flight, way: Tip): 'tipped' | 'thick-air' | 'limit' {
  if (isOver(flight)) return 'limit';
  if (way === 'back') {
    if (flight.tilt <= 0) return 'limit';
    flight.tilt -= 1;
    return 'tipped';
  }
  if (flight.tilt >= RULES.maxTilt) return 'limit';
  if (inThickAir(flight) && flight.tilt >= RULES.thickAirTilt) return 'thick-air';
  flight.tilt += 1;
  return 'tipped';
}

/** Drop the bottom stage if it is empty and not the last. */
export function drop(flight: Flight): 'dropped' | 'not-yet' | 'last-stage' {
  if (onLastStage(flight)) return 'last-stage';
  if (!canDrop(flight)) return 'not-yet';
  nextStage(flight);
  return 'dropped';
}

/** The thick air stands a rocket that has sunk back into it up to the most tilt it allows. */
function standUp(flight: Flight, happened: Happening[]): void {
  if (inThickAir(flight) && flight.tilt > RULES.thickAirTilt) {
    flight.tilt = RULES.thickAirTilt;
    happened.push({ kind: 'stood-up' });
  }
}

/**
 * Burn for up to `seconds`, stopping early where something changes: the
 * tank runs dry, the rocket reaches the orbit line (above it the sideways
 * speed has no limit), or it reaches orbit speed. Says how many seconds
 * it used.
 */
function burn(flight: Flight, seconds: number, happened: Happening[]): number {
  const { up, side } = lean(flight.tilt);
  const climb = RULES.climbSpeed * up;
  const push = RULES.sidePush * side;
  const belowLine = flight.height < RULES.orbitHeight;
  // Below the orbit line the engine cannot push the sideways speed past the
  // thin-air limit. It never takes speed away, though: speed the rocket
  // already had (from above the line, before it sank back) is kept.
  const most = belowLine ? Math.max(RULES.thinAirSpeed, flight.sideways) : Infinity;

  const toLine = belowLine && climb > 0 ? (RULES.orbitHeight - flight.height) / climb : Infinity;
  const toOrbitSpeed =
    !belowLine && push > 0 ? (RULES.orbitSpeed - flight.sideways) / push : Infinity;
  const step = Math.max(0, Math.min(seconds, flight.fuel, toLine, toOrbitSpeed));

  // The sideways speed grows steadily until it meets the limit, then holds.
  const before = flight.sideways;
  const free = before + push * step;
  let after = free;
  let across = ((before + free) / 2) * step;
  if (free > most) {
    const toMost = (most - before) / push;
    after = most;
    across = ((before + most) / 2) * toMost + most * (step - toMost);
  }

  // Where the step stopped at a change, land on it exactly, so rounding cannot leave it a hair short.
  flight.sideways = step === toOrbitSpeed ? RULES.orbitSpeed : after;
  flight.height =
    step === toLine ? RULES.orbitHeight : Math.min(flight.height + climb * step, RULES.maxHeight);
  flight.x = Math.min(flight.x + across, X_STOP);
  flight.fuel = step === flight.fuel ? 0 : flight.fuel - step;

  // Orbit comes before the empty tank, so reaching it on the last of the fuel counts.
  if (flight.height >= RULES.orbitHeight && flight.sideways >= RULES.orbitSpeed) {
    flight.inOrbit = true;
    happened.push({ kind: 'orbit', fuelLeft: fuelOnBoard(flight) });
  } else if (flight.fuel <= 0) {
    happened.push(
      onLastStage(flight) ? { kind: 'out-of-fuel' } : { kind: 'stage-empty', stage: flight.stage },
    );
  }
  return step;
}

/**
 * With the bottom stage empty and still on, sink for up to `seconds`, and
 * drop the stage by itself once it has been empty long enough. Says how
 * many seconds it used.
 */
function coast(flight: Flight, seconds: number, happened: Happening[]): number {
  const { dropsItselfAfter } = LEVEL_RULES[flight.level];
  const untilItDrops = dropsItselfAfter - flight.emptyFor;
  const step = Math.max(0, Math.min(seconds, untilItDrops));
  const sink = RULES.sinkSpeed * (1 - speedShare(flight));

  flight.height = Math.max(flight.height - sink * step, PAD_HEIGHT);
  flight.x = Math.min(flight.x + flight.sideways * step, X_STOP);
  flight.emptyFor = step === untilItDrops ? dropsItselfAfter : flight.emptyFor + step;

  if (flight.emptyFor >= dropsItselfAfter) {
    happened.push({ kind: 'dropped', stage: flight.stage, byItself: true });
    flight.droppedItself = true;
    nextStage(flight);
  }
  return step;
}

/** Move the flight on by `seconds`, and say what happened on the way, in order. */
export function advance(flight: Flight, seconds: number): Happening[] {
  const happened: Happening[] = [];
  // A frame with no time in it changes nothing, and nothing moves after the end.
  if (!(seconds > 0) || isOver(flight)) return happened;

  standUp(flight, happened);
  let left = seconds;
  while (left > 0 && !isOver(flight)) {
    left -= flight.fuel > 0 ? burn(flight, left, happened) : coast(flight, left, happened);
    standUp(flight, happened);
  }
  return happened;
}

/**
 * Where the flight ends if the tilt is held and every empty stage is dropped
 * at once. Leaves `flight` alone. The first point is where the rocket is
 * now; an empty stage still on is dropped at once, before the first step.
 */
export function ahead(flight: Flight): Ahead {
  const copy: Flight = { ...flight };
  const points = [{ x: copy.x, height: copy.height }];
  while (!isOver(copy)) {
    let left: number = RULES.aheadStep;
    while (left > 0 && !isOver(copy)) {
      if (canDrop(copy)) drop(copy);
      // Stop where the tank runs dry, so the empty stage is dropped at that very moment.
      const step = Math.min(left, copy.fuel);
      advance(copy, step);
      left -= step;
    }
    points.push({ x: copy.x, height: copy.height });
  }
  const end = { x: copy.x, height: copy.height };
  if (copy.inOrbit) return { points, end, outcome: 'orbit' };
  return { points, end, outcome: copy.height < RULES.orbitHeight ? 'low' : 'slow' };
}

/** An engine is burning: the bottom stage has fuel and orbit is not reached. */
export function burning(flight: Flight): boolean {
  return !flight.inOrbit && flight.fuel > 0;
}

/** The bottom stage is empty and can be dropped. */
export function canDrop(flight: Flight): boolean {
  return !flight.inOrbit && flight.fuel <= 0 && !onLastStage(flight);
}

export function tiltDegrees(flight: Flight): number {
  return flight.tilt * RULES.tiltStepDegrees;
}

/** 'thick' until the rocket's tail, standing upright, clears the thick air; 'space' at or above the orbit line. */
export function heightBand(flight: Flight): 'thick' | 'thin' | 'space' {
  if (inThickAir(flight)) return 'thick';
  return flight.height >= RULES.orbitHeight ? 'space' : 'thin';
}

/** 0 to 1 of orbit speed. */
export function speedShare(flight: Flight): number {
  return Math.min(1, Math.max(0, flight.sideways / RULES.orbitSpeed));
}

/** 0 to 1 of the bottom stage's tank. */
export function fuelShare(flight: Flight): number {
  return Math.min(1, Math.max(0, flight.fuel / tank(flight, flight.stage)));
}

/** How a run that ended went, goal by goal: one star for each. */
export interface RunGoals {
  /** Reached orbit. */
  orbit: boolean;
  /** Every stage dropped with "Drop it": none was left on until it dropped by itself. */
  droppedAll: boolean;
  /** At least the level's share of the last stage's tank still left at orbit (LEVEL_RULES spareFuel). */
  spareFuel: boolean;
}

/** The goals a run met, from how it ended: orbit (with the fuel left) or out of fuel, which meets none of them. */
export function runGoals(
  flight: Flight,
  end: Extract<Happening, { kind: 'orbit' | 'out-of-fuel' }>,
): RunGoals {
  if (end.kind === 'out-of-fuel') return { orbit: false, droppedAll: false, spareFuel: false };
  return {
    orbit: true,
    droppedAll: !flight.droppedItself,
    spareFuel: end.fuelLeft >= LEVEL_RULES[flight.level].spareFuel[flight.stages],
  };
}
