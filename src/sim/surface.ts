/**
 * Where the craft the story follows rests on a surface. Nothing it does
 * moves while it is there, so an every-event tour turns straight from one
 * stop to the next within such a stay rather than play it (see
 * StyleRules.pageTurns in src/app/tour.ts).
 */
import { elapsedToSeconds } from '../content/types.ts';
import type { ShipTrack } from './types.ts';

/** A span of mission seconds over which the craft the story follows rests on a surface. */
export interface Stay {
  readonly start: number;
  readonly end: number;
}

/**
 * Two mission times this close, in seconds, are the same: a time read back
 * from the story clock (a stop's rest point, the clock itself) can be off by
 * a hair from the phase's own.
 */
const SAME_MISSION_SECONDS = 1e-3;

/**
 * Every stay on a surface by a craft the story follows there: each surface
 * phase of a lander that docks with a ship again afterwards. The scene
 * follows a lander while it flies apart from its ship with a docking still
 * to come (see followedAt in src/scene/stage.ts), so through such a stay the
 * lander sits still in view, from its landing to its liftoff, while the ship
 * it left goes round overhead.
 */
export function staysOnSurface(path: { readonly ships: readonly ShipTrack[] }): Stay[] {
  const stays: Stay[] = [];
  for (const ship of path.ships) {
    if (ship.role !== 'lander') continue;
    ship.phases.forEach((phase, k) => {
      if (phase.kind !== 'surface') return;
      if (!ship.phases.slice(k + 1).some((later) => later.kind === 'docked')) return;
      stays.push({
        start: elapsedToSeconds(phase.start.value),
        end: elapsedToSeconds(phase.end.value),
      });
    });
  }
  return stays;
}

/**
 * True when one stay covers all the mission time between `a` and `b`
 * (either may come first), its ends included: from the landing to the
 * liftoff, the craft the story follows does not move.
 */
export function stillBetween(stays: readonly Stay[], a: number, b: number): boolean {
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  return stays.some(
    ({ start, end }) => from >= start - SAME_MISSION_SECONDS && to <= end + SAME_MISSION_SECONDS,
  );
}
