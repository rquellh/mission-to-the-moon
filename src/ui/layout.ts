import type { ViewInsets } from '../app/contract';
import { wideLayoutQuery } from './dom';

type Side = 'top' | 'bottom' | 'right';

export interface CoveringPart {
  element: HTMLElement;
  /**
   * Which edge of the view it covers; may differ between the phone and wide
   * layouts. Null means the part does not count right now, for example a
   * dialog that sits over the view without moving the camera.
   */
  side: Side | ((wide: boolean) => Side | null);
}

function isShown(element: HTMLElement): boolean {
  if (element.getClientRects().length === 0) return false;
  return getComputedStyle(element).visibility !== 'hidden';
}

/**
 * Report how much of the window the interface covers on each side, now and
 * whenever a part changes size, appears, or disappears, or the window
 * changes. The 3D view fills the window, so the window is the reference.
 */
export function watchViewInsets(
  parts: readonly CoveringPart[],
  onChange: (insets: ViewInsets) => void,
): () => void {
  const wide = wideLayoutQuery();
  let last = '';
  let frame: number | null = null;

  const measure = (): void => {
    frame = null;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const insets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };
    for (const part of parts) {
      if (!isShown(part.element)) continue;
      const box = part.element.getBoundingClientRect();
      const side = typeof part.side === 'function' ? part.side(wide.matches) : part.side;
      if (side === null) continue;
      if (side === 'top') insets.top = Math.max(insets.top, box.bottom);
      if (side === 'bottom') insets.bottom = Math.max(insets.bottom, height - box.top);
      if (side === 'right') insets.right = Math.max(insets.right, width - box.left);
    }
    const rounded: ViewInsets = {
      top: Math.max(0, Math.round(insets.top)),
      right: Math.max(0, Math.round(insets.right)),
      bottom: Math.max(0, Math.round(insets.bottom)),
      left: 0,
    };
    const key = `${rounded.top},${rounded.right},${rounded.bottom}`;
    if (key === last) return;
    last = key;
    onChange(rounded);
  };

  const schedule = (): void => {
    if (frame === null) frame = requestAnimationFrame(measure);
  };

  const observer = new ResizeObserver(schedule);
  for (const part of parts) observer.observe(part.element);
  window.addEventListener('resize', schedule);
  wide.addEventListener('change', schedule);
  measure();

  return schedule;
}
