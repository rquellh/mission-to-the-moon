/**
 * The rules of the landing toy, with no drawing in them.
 *
 * A SIMPLIFICATION, said on screen: this is a practice toy, not a simulator.
 * Nothing here pulls the lander down faster and faster, as the Moon's
 * gravity really does: the engine simply holds whatever falling speed the
 * player has set. The lander does not tilt to steer, either; a sideways
 * push moves it sideways at once. Apart from the lander's own size, the
 * distances and speeds are made up to make a kind game for a ten-year-old;
 * none of them is a real Apollo figure.
 *
 * Distances are in meters at the scale of the app's lunar module model
 * (about 8.4 m across the footpads). `x` runs across the ground, to the
 * right, from the middle of the view, and `height` is from the bottom of
 * the footpads down to the level of the clear ground. Speeds are counted in
 * whole pushes, so that two pushes one way and two the other always cancel
 * exactly. The engine burns fuel every second of the flight, whatever the
 * player does, so taking too long runs the tank dry.
 *
 * There are two levels. RULES holds the numbers both share, and
 * LEVEL_RULES the few that differ: how the run starts sliding, where the
 * patch of clear ground begins, the fuel, and the fuel a run must save for
 * its third star. A flight is started on a level and carries it, so every
 * rule below reads that level's numbers from the flight it is given.
 */
import type { Level } from '../shared/levels.ts';

/** One press of a control. "up" slows the fall by one step; "down" speeds it up by one step. */
export type Thrust = 'up' | 'down' | 'left' | 'right';

/** The toy's numbers on both levels: generous, slow, and made up. */
export const RULES = {
  /** Where a run starts: over the boulders, coming down too fast to land. */
  startX: -10,
  startHeight: 18,
  startFalling: 5,
  /** Speed added by one press, in meters a second. */
  sidePush: 0.6,
  fallPush: 0.35,
  /** The most falling steps that still make a soft touchdown, and the most the lander can have. */
  gentleFalling: 4,
  maxFalling: 6,
  /** A touchdown at this many falling steps or fewer is told as gentle; a faster one that still lands, as firm. */
  lightFalling: 2,
  /** The most steps the lander can be rising by. */
  maxRising: 2,
  /** The most sideways pushes that still count as almost still, and the most the lander can have. */
  stillSideways: 1,
  maxSideways: 6,
  /** From the middle of the lander out to the edge of a footpad. */
  footHalfSpan: 4.2,
  /** The far edge of the patch of clear, flat ground; its near edge is each level's `clearFrom`. Boulders lie on both sides of it. */
  clearTo: 17.5,
  /** How high the boulders stand above the clear ground. */
  roughHeight: 1.2,
  /** The edges of the play area: how far the lander's middle can go to each side, and how high its footpads can go. */
  maxSide: 16.5,
  maxHeight: 24,
  /** How far ahead the drift line looks, and the shortest drift worth drawing, in meters. */
  aheadSeconds: 5,
  aheadMin: 1.5,
} as const;

/** The numbers that differ between the levels. */
export interface LevelRules {
  /** Whole sideways pushes at the start; negative is to the left, away from the clear ground. */
  startSideways: number;
  /** The near edge of the patch of clear ground (its far edge is RULES.clearTo). */
  clearFrom: number;
  /** Seconds of engine time in the tank. */
  fuelSeconds: number;
  /** The third star, "Fuel to spare": the least share of the tank left at touchdown that earns it. */
  spareFuel: number;
}

/**
 * Each level's own numbers, measured by the scripted runs in game.test.ts.
 * On Easy, `spareFuel` is set so that a clean, gentle run earns the third
 * star with 2 to 3 seconds in hand, and a run with a bump on the boulders,
 * or about 5 seconds of hovering, does not. On Hard the third star is for a
 * bold run: a careful clean run lands with about 5 seconds left and misses
 * it, and a bold, gentle run a practised player can fly (sliding across at
 * five pushes without slowing first, then slowing the fall and stopping the
 * slide late) lands with about 9.7 seconds left and earns it, with about a
 * second in hand.
 */
export const LEVEL_RULES: Readonly<Record<Level, Readonly<LevelRules>>> = {
  /** The game as it first was: no slide at the start, 5.1 m to stop in, and about twice the fuel a clean run takes. */
  easy: { startSideways: 0, clearFrom: 4, fuelSeconds: 32, spareFuel: 0.36 },
  /** Sliding away from the clear ground at the start, 2.5 m to stop in, about 6 seconds to spare after a clean run, and a star for about 8.7 of them. */
  hard: { startSideways: -2, clearFrom: 6.6, fuelSeconds: 23, spareFuel: 0.38 },
};

export interface Flight {
  /** The level it is flown on, whose numbers the rules read (LEVEL_RULES). */
  readonly level: Level;
  x: number;
  height: number;
  /** Whole sideways pushes; positive is to the right. */
  pushesX: number;
  /** Whole falling steps; positive is falling, 0 is hovering, negative is rising. */
  pushesDown: number;
  /** Seconds of engine time left. */
  fuel: number;
}

/** What happened when the footpads reached the ground, or the tank ran dry. */
export type Contact =
  /** Down softly on clear ground. `falling` is the falling steps at the touch. */
  | { kind: 'landed'; falling: number }
  /** Touched but did not stay: too fast, still sliding, or on the boulders. */
  | { kind: 'bump'; tooFast: boolean; sliding: boolean; rocks: boolean }
  /** The fuel ran out before a landing. */
  | { kind: 'empty' };

/** Keeps `value` between `low` and `high`. */
const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/** A fresh start on a level: high over the boulders, coming down too fast to land, with a full tank. */
export function startFlight(level: Level): Flight {
  const { startSideways, fuelSeconds } = LEVEL_RULES[level];
  return {
    level,
    x: RULES.startX,
    height: RULES.startHeight,
    pushesX: startSideways,
    pushesDown: RULES.startFalling,
    fuel: fuelSeconds,
  };
}

/** One push. It keeps going until pushed the other way, up to the most the lander can have. */
export function push(flight: Flight, thrust: Thrust): void {
  switch (thrust) {
    case 'right':
      flight.pushesX = clamp(flight.pushesX + 1, -RULES.maxSideways, RULES.maxSideways);
      break;
    case 'left':
      flight.pushesX = clamp(flight.pushesX - 1, -RULES.maxSideways, RULES.maxSideways);
      break;
    case 'down':
      flight.pushesDown = clamp(flight.pushesDown + 1, -RULES.maxRising, RULES.maxFalling);
      break;
    case 'up':
      flight.pushesDown = clamp(flight.pushesDown - 1, -RULES.maxRising, RULES.maxFalling);
      break;
  }
}

/** Meters a second; positive is to the right. */
export const slideSpeed = (flight: Flight): number => flight.pushesX * RULES.sidePush;
/** Meters a second; positive is falling. */
export const fallingSpeed = (flight: Flight): number => flight.pushesDown * RULES.fallPush;

/**
 * The clear ground is a patch with boulders on both sides, so both footpads
 * are over it only while the lander's middle is at least half its span in
 * from each edge.
 */
const clearUnder = (level: Level, x: number): boolean =>
  x - RULES.footHalfSpan >= LEVEL_RULES[level].clearFrom && x + RULES.footHalfSpan <= RULES.clearTo;

/** The room the lander's middle has to stop in on a level: where both footpads are over the clear patch. */
export function landingRoom(level: Level) {
  return {
    from: LEVEL_RULES[level].clearFrom + RULES.footHalfSpan,
    to: RULES.clearTo - RULES.footHalfSpan,
  };
}

/** The height of whatever a lander centered at `x` would touch first, on a level's ground. */
export const groundUnder = (level: Level, x: number): number =>
  clearUnder(level, x) ? 0 : RULES.roughHeight;
/** Both footpads are over clear ground. */
export const overClear = (flight: Flight): boolean => clearUnder(flight.level, flight.x);
/** The lander has slid on past the clear patch: its right footpad is over the boulders beyond it. */
export const pastClear = (flight: Flight): boolean => flight.x + RULES.footHalfSpan > RULES.clearTo;
/** Falling faster than a soft touchdown allows. */
export const isTooFast = (flight: Flight): boolean => flight.pushesDown > RULES.gentleFalling;
/** Sliding so little that it counts as almost still. */
export const isStill = (flight: Flight): boolean => Math.abs(flight.pushesX) <= RULES.stillSideways;
/** 1 with a full tank, 0 when empty. */
export const fuelLeft = (flight: Flight): number =>
  flight.fuel / LEVEL_RULES[flight.level].fuelSeconds;

/** Where the lander will be in `seconds` if nothing is pressed, kept inside the play area and above the ground. */
export function ahead(flight: Flight, seconds: number = RULES.aheadSeconds) {
  const x = clamp(flight.x + slideSpeed(flight) * seconds, -RULES.maxSide, RULES.maxSide);
  const height = clamp(
    flight.height - fallingSpeed(flight) * seconds,
    groundUnder(flight.level, x),
    RULES.maxHeight,
  );
  return { x, height };
}

/**
 * Whether a line to where the lander will be in five seconds is worth
 * drawing: only when that spot is clear of where the lander is now, out past
 * a footpad or well below the footpads. A short drift, or any drift upward,
 * would put the line's end on top of the lander itself. Pass the spot when
 * it is already worked out, to save working it out again.
 */
export function driftShows(flight: Flight, spot = ahead(flight)): boolean {
  return (
    Math.abs(spot.x - flight.x) > RULES.footHalfSpan + 1 ||
    flight.height - spot.height >= RULES.aheadMin
  );
}

/**
 * Move the lander on by `seconds`, burning fuel as it goes. When the
 * footpads reach the ground, says whether it landed or bumped; otherwise
 * says when the tank runs dry. A bump sends it gently back up (slowly
 * rising, its slide unchanged), so the player can set it right and try
 * again. Nobody crashes.
 */
export function advance(flight: Flight, seconds: number): Contact | null {
  // A frame with no time in it changes nothing, not even the fuel.
  if (!(seconds > 0)) return null;

  // The engine holds the lander up the whole time, so it burns fuel whatever is pressed.
  flight.fuel = Math.max(0, flight.fuel - seconds);
  flight.x += slideSpeed(flight) * seconds;
  flight.height -= fallingSpeed(flight) * seconds;

  // The edges of the play area stop the drift there, so the lander stays in view.
  if (Math.abs(flight.x) > RULES.maxSide) {
    flight.x = Math.sign(flight.x) * RULES.maxSide;
    flight.pushesX = 0;
  }
  if (flight.height > RULES.maxHeight) {
    flight.height = RULES.maxHeight;
    flight.pushesDown = Math.max(0, flight.pushesDown);
  }

  // The touch comes before the empty tank, so a landing on the last of the fuel still counts.
  const ground = groundUnder(flight.level, flight.x);
  if (flight.height <= ground) {
    const tooFast = isTooFast(flight);
    const sliding = !isStill(flight);
    const rocks = !overClear(flight);
    if (!tooFast && !sliding && !rocks) {
      const falling = Math.max(0, flight.pushesDown);
      flight.height = 0;
      flight.pushesX = 0;
      flight.pushesDown = 0;
      return { kind: 'landed', falling };
    }
    flight.height = ground;
    flight.pushesDown = -1;
    return { kind: 'bump', tooFast, sliding, rocks };
  }

  if (flight.fuel <= 0) return { kind: 'empty' };
  return null;
}

/** How a run that ended went, goal by goal: one star for each. */
export interface RunGoals {
  /** Down on clear ground, both footpads on the patch. */
  landed: boolean;
  /** A gentle touchdown: falling no faster than RULES.lightFalling steps at the touch. */
  gentle: boolean;
  /** At least the level's share of the tank still left at touchdown (LEVEL_RULES spareFuel). */
  spareFuel: boolean;
}

/**
 * The goals a run met, from how it ended: a landing (with its falling steps
 * at the touch) or the tank running dry, which meets none of them.
 */
export function runGoals(
  flight: Flight,
  end: Extract<Contact, { kind: 'landed' | 'empty' }>,
): RunGoals {
  if (end.kind === 'empty') return { landed: false, gentle: false, spareFuel: false };
  return {
    landed: true,
    gentle: end.falling <= RULES.lightFalling,
    spareFuel: fuelLeft(flight) >= LEVEL_RULES[flight.level].spareFuel,
  };
}
