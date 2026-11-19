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
 */

/** Where a push from the thruster buttons goes. */
export type Thrust = "up" | "down" | "left" | "right" | "forward" | "back";

/** The toy's numbers: generous, slow, and made up. */
export const RULES = {
  /** How far the nose starts from the cone, and how far off to the side. */
  startGap: 9,
  startX: -1.2,
  startY: 0.5,
  /** How it is already drifting at the start, in pushes: slowly closing, and slowly sliding further left. */
  startClosing: 1,
  startSideways: -1,
  /** Speed added by one push: sideways and up or down, and forward or back. */
  sidePush: 0.04,
  forwardPush: 0.1,
  /** Close enough to the middle of the cone to count as lined up. */
  linedUp: 0.35,
  /** The fastest closing speed, in pushes, that still counts as gentle. */
  gentlePushes: 4,
  /** How far the Gemini can wander before it stops at an edge of the play area. */
  maxSide: 2.5,
  maxGap: 16,
  /** How deep the nose sits in the cone once docked, as the kit's docked model draws it. */
  latchDepth: 0.55,
} as const;

export interface Flight {
  x: number;
  y: number;
  gap: number;
  /** Speeds, in whole pushes: right, up, and closing (toward the Agena). */
  pushesX: number;
  pushesY: number;
  pushesClosing: number;
}

/** What happened when the nose reached the cone. */
export type Contact =
  | { kind: "docked" }
  | { kind: "bump"; tooFast: boolean; offCenter: boolean };

/** A fresh start: a short way back, a little off to one side, drifting slowly. */
export function startFlight(): Flight {
  return {
    x: RULES.startX,
    y: RULES.startY,
    gap: RULES.startGap,
    pushesX: RULES.startSideways,
    pushesY: 0,
    pushesClosing: RULES.startClosing,
  };
}

/** One push. It keeps going until pushed the other way. */
export function push(flight: Flight, thrust: Thrust): void {
  switch (thrust) {
    case "up":
      flight.pushesY += 1;
      break;
    case "down":
      flight.pushesY -= 1;
      break;
    case "right":
      flight.pushesX += 1;
      break;
    case "left":
      flight.pushesX -= 1;
      break;
    case "forward":
      flight.pushesClosing += 1;
      break;
    case "back":
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
export const isLinedUp = (flight: Flight): boolean => offCenter(flight) <= RULES.linedUp;
export const isTooFast = (flight: Flight): boolean => flight.pushesClosing > RULES.gentlePushes;

/**
 * Move the Gemini on by `seconds`. When the nose reaches the cone, says
 * whether it docked or bumped. A bump sends it gently back (slowly moving
 * away, its sideways drift unchanged), so the visitor can line up and try
 * again.
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
  if (!tooFast && !offCenterNow) return { kind: "docked" };
  flight.pushesClosing = -1;
  return { kind: "bump", tooFast, offCenter: offCenterNow };
}
