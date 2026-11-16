import { copy } from '../content/copy';
import type { Mission, Program } from '../content/types';
import { button, byId, el } from './dom';
import { missionDates } from './format';

export type HubMode = 'welcome' | 'return';

export interface HubOptions {
  /** The mission whose scene is loaded behind the hub. */
  mission: Mission;
  /** Every mission on the site, in flight order. */
  missions: readonly Mission[];
  /** Start the tour of the loaded mission, in place. */
  onTour(): void;
  /** Explore the loaded mission, in place. */
  onExplore(): void;
  /** The hub closed without a choice after being reopened: carry on where the visitor was. */
  onReturn(): void;
}

export interface Hub {
  /**
   * The first thing a visitor sees, over the bare 3D view. The rest of the
   * interface is hidden; the 3D view can still be turned. Leaving without a
   * choice (Escape) explores the loaded mission.
   */
  welcome(): void;
  /**
   * Reopen over the interface as a modal dialog. Leaving without a choice
   * (Close, Escape, or a click outside) returns to where the visitor was.
   */
  open(returnTo: HTMLElement): void;
  /** How the hub is open now, or null when it is closed. */
  readonly mode: HubMode | null;
}

/**
 * The address of a mission, starting with the tour or exploring. Built from
 * the current address so it works under any path the site is served from.
 */
function missionAddress(id: string, start: 'tour' | 'explore'): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('mission', id);
  url.searchParams.set('start', start);
  return url.href;
}

/** Missions grouped by program, each group and each mission in flight order. */
function byProgram(missions: readonly Mission[]): Map<Program, Mission[]> {
  const groups = new Map<Program, Mission[]>();
  for (const mission of missions) {
    const group = groups.get(mission.program);
    if (group) group.push(mission);
    else groups.set(mission.program, [mission]);
  }
  return groups;
}

/**
 * The mission picker. It lists every mission under its program, with its
 * dates, its summary, and two ways in: the guided tour and exploring freely.
 * Choosing the loaded mission acts in place; choosing another one loads that
 * mission's page.
 */
export function setUpHub({ mission, missions, onTour, onExplore, onReturn }: HubOptions): Hub {
  const dialog = byId('hub', HTMLDialogElement);
  const title = byId('hub-title', HTMLHeadingElement);
  const list = byId('hub-list', HTMLDivElement);
  const closeButton = byId('hub-close', HTMLButtonElement);

  title.textContent = copy.siteTitle;
  byId('hub-lede', HTMLParagraphElement).textContent = copy.hub.lede;
  closeButton.textContent = copy.close;

  let mode: HubMode | null = null;
  let choice: (() => void) | null = null;
  let returnTo: HTMLElement | null = null;

  /**
   * Put the page back after the hub closes, then do what was chosen, or what
   * leaving without a choice means. Runs once per opening.
   */
  const finish = (): void => {
    if (mode === null) return;
    const was = mode;
    const action = choice;
    mode = null;
    choice = null;
    dialog.dataset['mode'] = '';
    document.body.classList.remove('is-welcome');
    document.removeEventListener('keydown', onKey);
    document.title = copy.pageTitle(mission.name);

    if (action) {
      action();
    } else if (was === 'welcome') {
      onExplore();
    } else {
      if (returnTo?.isConnected) returnTo.focus();
      onReturn();
    }
    returnTo = null;
  };

  // The browser fires "close" only with its next frame, so the page is put
  // back straight away rather than waiting for it.
  const close = (): void => {
    if (dialog.open) dialog.close();
    finish();
  };

  /** Close the hub and then do what was chosen. */
  const choose = (action: () => void): void => {
    choice = action;
    close();
  };

  const onKey = (event: KeyboardEvent): void => {
    // The welcome is not modal, so Escape is handled here rather than by the browser.
    if (event.key === 'Escape' && mode === 'welcome') {
      event.preventDefault();
      close();
    }
  };

  /* The list ---------------------------------------------------------- */
  let current: HTMLLIElement | null = null;
  const entry = (shown: Mission): HTMLLIElement => {
    const item = el('li', 'hub__entry');
    const isCurrent = shown.id === mission.id;
    if (isCurrent) {
      item.setAttribute('aria-current', 'true');
      current = item;
    }

    // Name, dates, and the "now showing" mark share a line, wrapping when it is narrow.
    const line = el('div', 'hub__line');
    line.append(el('h4', 'hub__name', shown.name));
    const dates = missionDates(shown);
    if (dates) line.append(el('p', 'hub__dates', dates));
    if (isCurrent) line.append(el('p', 'hub__current', copy.hub.current));
    const text = el('div', 'hub__text');
    text.append(line, el('p', 'hub__summary', shown.summary.text.short));
    item.append(text);

    const go = (start: 'tour' | 'explore'): void => {
      if (isCurrent) choose(start === 'tour' ? onTour : onExplore);
      else window.location.assign(missionAddress(shown.id, start));
    };
    const actions = el('div', 'hub__actions');
    if (shown.events.some((event) => event.inTour)) {
      const tour = button('button button--primary hub__tour', copy.hub.tour);
      tour.setAttribute('aria-label', copy.hub.tourOf(shown.name));
      tour.addEventListener('click', () => go('tour'));
      actions.append(tour);
    }
    if (shown.kind === 'flight') {
      const explore = button('button hub__explore', copy.hub.explore);
      explore.setAttribute('aria-label', copy.hub.exploreMission(shown.name));
      explore.addEventListener('click', () => go('explore'));
      actions.append(explore);
    }
    if (actions.childElementCount) item.append(actions);
    return item;
  };

  const sections: HTMLElement[] = [];
  for (const [program, group] of byProgram(missions)) {
    const section = el('section', 'hub__program');
    const heading = el('h3', 'hub__program-title', copy.hub.programs[program]);
    heading.id = `hub-program-${program}`;
    section.setAttribute('aria-labelledby', heading.id);
    const entries = el('ul', 'hub__entries');
    entries.append(...group.map(entry));
    section.append(heading, entries);
    sections.push(section);
  }
  list.replaceChildren(...sections);

  /** Scroll the list so the loaded mission is in sight. */
  const revealCurrent = (): void => {
    list.scrollTop = 0;
    current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  };

  /* Opening and closing ------------------------------------------------ */
  // Escape on the reopened (modal) hub.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  // Anything else that closes it.
  dialog.addEventListener('close', finish);

  // Reopened over the interface: a click outside the box closes it.
  dialog.addEventListener('click', (event) => {
    if (mode !== 'return' || event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    if (outside) close();
  });
  closeButton.addEventListener('click', close);

  // Coming back to this page from another mission's: put the visitor back where they were.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && mode === 'return') close();
  });

  const show = (next: HubMode): void => {
    mode = next;
    dialog.dataset['mode'] = next;
    closeButton.hidden = next === 'welcome';
    document.title = copy.siteTitle;
  };

  return {
    welcome() {
      if (dialog.open) return;
      show('welcome');
      document.body.classList.add('is-welcome');
      document.addEventListener('keydown', onKey);
      dialog.show();
      revealCurrent();
      title.focus({ preventScroll: true });
    },
    open(from) {
      if (dialog.open) return;
      show('return');
      returnTo = from;
      dialog.showModal();
      revealCurrent();
      closeButton.focus({ preventScroll: true });
    },
    get mode() {
      return mode;
    },
  };
}
