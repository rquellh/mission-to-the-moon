import type { Director } from '../app/contract';
import { copy } from '../content/copy';

/**
 * The whole orbits the followed ship has really flown in the fast forward
 * now showing (0 before the first), or null when no fast forward shows.
 */
export function orbitsInFastForward(director: Director): number | null {
  if (director.fastForward !== true) return null;
  const laps = director.fastForwardLaps ?? 0;
  return Number.isFinite(laps) && laps >= 1 ? Math.floor(laps) : 0;
}

/**
 * Fill a fast-forward mark: "Fast forward", then "· 12 orbits" in `count`
 * once the ship has really gone all the way around (the dot is drawn by
 * the stylesheet, so screen readers skip it). Returns a function that sets
 * the count. The mark is never a live region: the count is read only when
 * a visitor goes to it, and the interface says why once (see interface.ts).
 */
export function fillFastForwardMark(
  mark: HTMLElement,
  count: HTMLElement,
): (orbits: number) => void {
  count.hidden = true;
  mark.replaceChildren(`${copy.timeline.fastForward} `, count);
  mark.title = copy.timeline.fastForwardHint;
  let shown = 0;
  return (orbits) => {
    if (orbits === shown) return;
    shown = orbits;
    count.hidden = orbits === 0;
    count.textContent = orbits === 0 ? '' : copy.timeline.fastForwardOrbits(orbits);
  };
}
