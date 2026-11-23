import { copy } from '../content/copy';
import { byId, wideLayoutQuery } from './dom';
import { icon } from './icons';

/** Where the guided tour is, as the card sees it: not touring, touring (at a stop or on the way), or at its ending. */
export type DockTour = 'off' | 'touring' | 'ending';

export interface DockOptions {
  /** False without a 3D view: then "Look at" and True scale are never shown. */
  has3D: boolean;
  /** Something the 3D view frames itself around opened, closed, or moved. */
  onLayout(): void;
}

export interface Dock {
  /** Open "Tell me more", as its door does, with keyboard focus on its heading. */
  openRecords(): void;
  /** True while "Tell me more" is open. */
  readonly recordsOpen: boolean;
  /**
   * Follow the guided tour. While it runs, Controls are closed and out of
   * reach; at its ending, the ending takes the moment's place and "Tell me
   * more" closes.
   */
  setTour(tour: DockTour): void;
}

/**
 * The moment card's two doors, each a toggle that opens and closes on its
 * own. "Tell me more" opens the records of the moment: a panel at the side
 * on a wide screen, one sheet with the card on a phone. "Controls" opens the
 * tools for moving through the flight inside the card, and "Look at" with
 * True scale at the top left. Neither is needed to follow the flight, and
 * neither is remembered from one visit to the next.
 */
export function setUpDock({ has3D, onLayout }: DockOptions): Dock {
  const panel = byId('records', HTMLElement);
  const panelTitle = byId('records-title', HTMLHeadingElement);
  const closeButton = byId('records-close', HTMLButtonElement);
  const recordsDoor = byId('records-toggle', HTMLButtonElement);
  const controlsDoor = byId('controls-toggle', HTMLButtonElement);
  const tools = byId('timeline', HTMLElement);
  const views = byId('views', HTMLDivElement);
  const transport = byId('dock-transport', HTMLDivElement);
  const status = byId('dock-status', HTMLDivElement);
  const where = byId('dock-where', HTMLParagraphElement);
  const clock = byId('clock', HTMLParagraphElement);
  const chapterPick = byId('chapter-select', HTMLSelectElement).closest('label');
  const wide = wideLayoutQuery();

  // A door points right while closed and down while open; Controls point up, as the tools open above them on a phone.
  recordsDoor.append(
    icon('next', 'icon dock__door-closed'),
    icon('chevron-down', 'icon dock__door-open'),
  );
  byId('controls-toggle-label', HTMLSpanElement).textContent = copy.card.controls;
  status.setAttribute('aria-label', copy.card.where);
  controlsDoor.prepend(
    icon('chevron-up', 'icon dock__door-closed'),
    icon('chevron-down', 'icon dock__door-open'),
  );
  controlsDoor.setAttribute('aria-controls', has3D ? 'timeline views' : 'timeline');
  // "Close" at the side of a wide screen; "Show less" on a phone, where the panel folds back into the card.
  closeButton.append(
    icon('close', 'icon records__close-wide'),
    icon('chevron-down', 'icon records__close-phone'),
  );

  let recordsOpen = false;
  let toolsOpen = false;
  let tour: DockTour = 'off';

  const render = (): void => {
    panel.hidden = !recordsOpen;
    recordsDoor.setAttribute('aria-expanded', String(recordsOpen));
    controlsDoor.hidden = tour !== 'off';
    controlsDoor.setAttribute('aria-expanded', String(toolsOpen));
    tools.hidden = !toolsOpen;
    views.hidden = !toolsOpen || !has3D;
    // The tour's ending takes the moment's place, Play and all.
    transport.hidden = tour === 'ending';
    // On a phone, the clock takes the place of the chapter and the day while the tools are open.
    where.hidden = toolsOpen;
    clock.hidden = !toolsOpen;
  };

  // The clock sits among the tools on a wide screen, and in the card's status on a phone.
  const fitLayout = (): void => {
    if (wide.matches) chapterPick?.before(clock);
    else status.append(clock);
    closeButton.setAttribute('aria-label', wide.matches ? copy.close : copy.card.tellLess);
  };
  wide.addEventListener('change', fitLayout);
  fitLayout();

  const openRecords = (): void => {
    if (!recordsOpen) {
      recordsOpen = true;
      render();
      onLayout();
    }
    panelTitle.focus({ preventScroll: true });
  };
  const closeRecords = (): void => {
    if (!recordsOpen) return;
    recordsOpen = false;
    render();
    onLayout();
    recordsDoor.focus({ preventScroll: true });
  };

  recordsDoor.addEventListener('click', () => (recordsOpen ? closeRecords() : openRecords()));
  closeButton.addEventListener('click', closeRecords);
  // The panel is not a dialog, so it handles Escape itself, while focus is inside it.
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    closeRecords();
  });

  controlsDoor.addEventListener('click', () => {
    toolsOpen = !toolsOpen;
    render();
    onLayout();
  });

  render();
  return {
    openRecords,
    get recordsOpen() {
      return recordsOpen;
    },
    setTour(next) {
      if (next === tour) return;
      tour = next;
      if (tour !== 'off') toolsOpen = false;
      // The ending's title takes keyboard focus (see tour-panel.ts), so nothing is handed back here.
      if (tour === 'ending') recordsOpen = false;
      render();
      onLayout();
    },
  };
}
