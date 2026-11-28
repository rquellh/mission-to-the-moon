/**
 * The rules of the docking toy, with no drawing in them.
 *
 * A SIMPLIFICATION, said on screen: the Gemini moves in straight lines
 * near a target that stays still, as if nothing else pulled on either craft.
 * Real spacecraft in orbit do not move like this. Every distance and speed
 * here is made up to make a kind game for a ten-year-old (in "toy meters"
 * and toy meters per second); none of them is a real Gemini or Agena figure.
 *
 * Positions are of the Gemini's nose, measured from the middle of the
 * Agena's docking cone: `x` to the right and `y` up (as seen from behind
 * the Gemini), and `gap` straight ahead, from the nose to the cone's mouth.
 * Speeds are counted in whole pushes, so that two pushes one way and two
 * the other always cancel exactly.
 *
 * There are two levels. RULES holds the numbers both share, and
 * LEVEL_RULES the few that differ: where the Gemini starts off to the side
 * and how it drifts, how close to the middle of the cone counts as lined
 * up, the fastest closing speed that is still gentle, and the closing speed
 * a run must touch at for its third star. A flight is started on a level
 * and carries it, so every rule below reads that level's numbers from the
 * flight it is given.
 */
import type { Level } from '../shared/levels.ts';

/** Where a push from the thruster buttons goes. */
export type Thrust = 'up' | 'down' | 'left' | 'right' | 'forward' | 'back';

/** The toy's numbers on both levels: generous, slow, and made up. */
export const RULES = {
  /** How far the nose starts from the cone. */
  startGap: 9,
  /** How fast it is already closing in at the start, in pushes: slowly. */
  startClosing: 1,
  /** Speed added by one push: sideways and up or down, and forward or back. */
  sidePush: 0.04,
  forwardPush: 0.1,
  /** How far the Gemini can wander before it stops at an edge of the play area. */
  maxSide: 2.5,
  maxGap: 16,
  /** How deep the nose sits in the cone once docked, as the kit's docked model draws it. */
  latchDepth: 0.55,
} as const;

/** The numbers that differ between the levels. */
export interface LevelRules {
  /** Where the nose starts, off to the side: to the right of the cone's middle and up from it (negative is left, or down). */
  startX: number;
  startY: number;
  /** How it is already drifting at the start, in whole pushes: to the right (negative is left) and up (negative is down). */
  startSideways: number;
  startUpDown: number;
  /** Close enough to the middle of the cone to count as lined up. */
  linedUp: number;
  /** The fastest closing speed, in pushes, that still counts as gentle. */
  gentlePushes: number;
  /** The third star, "A soft touch": the fastest closing speed at the touch, in pushes, that earns it. */
  softPushes: number;
}

/**
 * Each level's own numbers, measured by the scripted runs in game.test.ts.
 * `softPushes` is set so that a run that closes in at the fastest gentle
 * speed does not earn the third star, and one that pushes Back before the
 * touch to come in at half that speed or slower does.
 */
export const LEVEL_RULES: Readonly<Record<Level, Readonly<LevelRules>>> = {
  /** The game as it first was: a little off to the left and up, drifting slowly left. */
  easy: {
    startX: -1.2,
    startY: 0.5,
    startSideways: -1,
    startUpDown: 0,
    linedUp: 0.35,
    gentlePushes: 4,
    softPushes: 2,
  },
  /** Further off, sliding left twice as fast and drifting up, with a smaller ring to hit and a lower gentle speed. */
  hard: {
    startX: -1.6,
    startY: 0.7,
    startSideways: -2,
    startUpDown: 1,
    linedUp: 0.25,
    gentlePushes: 3,
    softPushes: 2,
  },
};

export interface Flight {
  /** The level it is flown on, whose numbers the rules read (LEVEL_RULES). */
  readonly level: Level;
  x: number;
  y: number;
  gap: number;
  /** Speeds, in whole pushes: right, up, and closing (toward the Agena). */
  pushesX: number;
  pushesY: number;
  pushesClosing: number;
  /** How many times the nose has bumped the cone in this run. */
  bumps: number;
}

/** What happened when the nose reached the cone. */
export type Contact =
  /** Lined up and gentle: it docked. `closing` is the closing speed at the touch, in pushes. */
  | { kind: 'docked'; closing: number }
  /** Touched but did not latch: too fast, off center, or both. */
  | { kind: 'bump'; tooFast: boolean; offCenter: boolean };

/** A fresh start on a level: a short way back, off to one side, drifting slowly. */
export function startFlight(level: Level): Flight {
  const rules = LEVEL_RULES[level];
  return {
    level,
    x: rules.startX,
    y: rules.startY,
    gap: RULES.startGap,
    pushesX: rules.startSideways,
    pushesY: rules.startUpDown,
    pushesClosing: RULES.startClosing,
    bumps: 0,
  };
}

/** Straight back to the start of the same run, as reduced motion makes a bump: its bumps still counted. */
export function backToStart(flight: Flight): Flight {
  return { ...startFlight(flight.level), bumps: flight.bumps };
}

/** One push. It keeps going until pushed the other way. */
export function push(flight: Flight, thrust: Thrust): void {
  switch (thrust) {
    case 'up':
      flight.pushesY += 1;
      break;
    case 'down':
      flight.pushesY -= 1;
      break;
    case 'right':
      flight.pushesX += 1;
      break;
    case 'left':
      flight.pushesX -= 1;
      break;
    case 'forward':
      flight.pushesClosing += 1;
      break;
    case 'back':
      flight.pushesClosing -= 1;
      break;
  }
}

/** Speeds in toy meters per second. */
export const speedX = (flight: Flight): number => flight.pushesX * RULES.sidePush;
export const speedY = (flight: Flight): number => flight.pushesY * RULES.sidePush;
export const closingSpeed = (flight: Flight): number => flight.pushesClosing * RULES.forwardPush;

/** How far the nose is from the middle of the cone, sideways and up or down. */
export const offCenter = (flight: Flight): number => Math.hypot(flight.x, flight.y);
export const isLinedUp = (flight: Flight): boolean =>
  offCenter(flight) <= LEVEL_RULES[flight.level].linedUp;
export const isTooFast = (flight: Flight): boolean =>
  flight.pushesClosing > LEVEL_RULES[flight.level].gentlePushes;

/**
 * Move the Gemini on by `seconds`. When the nose reaches the cone, says
 * whether it docked or bumped. A bump is counted, and sends it gently back
 * (slowly moving away, its sideways drift unchanged), so the visitor can
 * line up and try again. Nobody crashes.
 */
export function advance(flight: Flight, seconds: number): Contact | null {
  flight.x += speedX(flight) * seconds;
  flight.y += speedY(flight) * seconds;
  flight.gap -= closingSpeed(flight) * seconds;

  // The edges of the play area stop the drift there, so the Agena stays in view.
  if (Math.abs(flight.x) > RULES.maxSide) {
    flight.x = Math.sign(flight.x) * RULES.maxSide;
    flight.pushesX = 0;
  }
  if (Math.abs(flight.y) > RULES.maxSide) {
    flight.y = Math.sign(flight.y) * RULES.maxSide;
    flight.pushesY = 0;
  }
  if (flight.gap > RULES.maxGap) {
    flight.gap = RULES.maxGap;
    flight.pushesClosing = Math.max(0, flight.pushesClosing);
  }

  if (flight.gap > 0) return null;
  flight.gap = 0;
  // Resting against the cone without closing in is not a touch yet.
  if (flight.pushesClosing <= 0) return null;
  const tooFast = isTooFast(flight);
  const offCenterNow = !isLinedUp(flight);
  if (!tooFast && !offCenterNow) return { kind: 'docked', closing: flight.pushesClosing };
  flight.bumps += 1;
  flight.pushesClosing = -1;
  return { kind: 'bump', tooFast, offCenter: offCenterNow };
}

/** How a run that docked went, goal by goal: one star for each. */
export interface RunGoals {
  /** Docked: always, as docking is the one way a run ends. */
  docked: true;
  /** No bump in the run. */
  firstTry: boolean;
  /** Closing no faster than the level's soft speed at the touch (LEVEL_RULES softPushes). */
  softTouch: boolean;
}

/** The goals a run met, from the flight that docked and its touch. */
export function runGoals(flight: Flight, end: Extract<Contact, { kind: 'docked' }>): RunGoals {
  return {
    docked: true,
    firstTry: flight.bumps === 0,
    softTouch: end.closing <= LEVEL_RULES[flight.level].softPushes,
  };
}
