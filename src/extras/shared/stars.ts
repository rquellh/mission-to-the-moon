/**
 * The star pictures of the level picker and the end of a run: filled amber
 * for a star earned, an outline for one not earned. They are for the eye
 * only; the words beside them say the same for a screen reader.
 */
import type { Stars } from './record.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A five-pointed star on the 24-unit icon grid. */
const STAR =
  'M12 2.8l2.83 5.73 6.32.92-4.57 4.46 1.08 6.3L12 17.23l-5.66 2.98 1.08-6.3-4.57-4.46 6.32-.92z';

/** One star, earned (filled) or not (an outline), with a size class: `game-star--small` or `game-star--large`. */
export function starIcon(earned: boolean, size: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `game-star ${size} ${earned ? 'game-star--on' : 'game-star--off'}`);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', STAR);
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

/** Three stars in a row, the first `count` of them earned. */
export function starRow(count: Stars, size: string): SVGSVGElement[] {
  return [0, 1, 2].map((index) => starIcon(index < count, size));
}
