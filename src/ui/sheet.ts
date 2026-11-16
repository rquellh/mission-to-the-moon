import { copy } from '../content/copy';
import { byId, wideLayoutQuery } from './dom';

export interface Sheet {
  setExpanded(expanded: boolean): void;
  readonly expanded: boolean;
}

/** How far a swipe on the handle must travel to count, in CSS pixels. */
const SWIPE_DISTANCE = 24;

/**
 * On phones the event card sits in a bottom sheet with a compact state
 * (title, time, one line) and an expanded state. Tap or swipe the handle,
 * or tap the compact card, to switch. In the wide layout the card is a
 * side panel and always shows everything.
 */
export function setUpSheet(): Sheet {
  const sheet = byId('sheet', HTMLElement);
  const handle = byId('sheet-handle', HTMLButtonElement);
  const label = byId('sheet-handle-label', HTMLSpanElement);
  const card = byId('card', HTMLElement);
  const wide = wideLayoutQuery();

  let expanded = false;
  const setExpanded = (next: boolean): void => {
    expanded = next;
    sheet.dataset['state'] = next ? 'expanded' : 'compact';
    handle.setAttribute('aria-expanded', String(next));
    label.textContent = next ? copy.card.collapse : copy.card.expand;
    if (!next) card.scrollTop = 0;
  };
  setExpanded(false);

  // A swipe should not also count as a tap.
  let swiped = false;
  handle.addEventListener('click', () => {
    if (swiped) {
      swiped = false;
      return;
    }
    setExpanded(!expanded);
  });

  // Tapping the compact card (but not its buttons) opens it.
  card.addEventListener('click', (event) => {
    if (wide.matches || expanded) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    setExpanded(true);
  });

  // Swipe up or down on the handle.
  let startY: number | null = null;
  handle.addEventListener('pointerdown', (event) => {
    startY = event.clientY;
  });
  handle.addEventListener('pointerup', (event) => {
    if (startY === null) return;
    const moved = event.clientY - startY;
    startY = null;
    if (Math.abs(moved) < SWIPE_DISTANCE) return;
    setExpanded(moved < 0);
    swiped = true;
    window.setTimeout(() => {
      swiped = false;
    }, 400);
  });
  handle.addEventListener('pointercancel', () => {
    startY = null;
  });

  return {
    setExpanded,
    get expanded() {
      return expanded;
    },
  };
}
