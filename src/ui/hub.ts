import { copy } from '../content/copy';
import type { MissionSummary, Program } from '../content/types';
import type { ExtraMeta } from '../extras/types';
import { button, byId, el, hiddenText } from './dom';
import { formatYears, summaryDates, yearOf } from './format';

export interface HubOptions {
  /** The flight whose scene is loaded behind the hub, or null when none could be loaded. */
  currentId: string | null;
  /** The opening line, when it should differ from the usual one (without a 3D view). */
  lede?: string;
  /** The mission list, in date order. */
  summaries: readonly MissionSummary[];
  /** True for an unfinished mission (only the dev server lists one). */
  isDraft(summary: MissionSummary): boolean;
  /** Start the tour of the loaded mission, in place. */
  onTour(): void;
  /** Explore the loaded mission, in place. */
  onExplore(): void;
  /** The hub closed without a choice: carry on where the visitor was. */
  onReturn(): void;
  /** Open a memorial page over the hub; focus goes back to `from` when it closes. */
  onMemorial(id: string, from: HTMLElement): void;
  /** The extras, listed under the missions: hands-on first, each group in order. */
  extras: readonly ExtraMeta[];
  /** True for an unfinished extra (only the dev server lists one). */
  isExtraDraft(meta: ExtraMeta): boolean;
  /** Open an extra over the hub; focus goes back to `from` when it closes. */
  onExtra(id: string, from: HTMLElement): void;
}

export interface Hub {
  /**
   * Open as a modal dialog over the page, scrolled to the loaded mission.
   * Leaving without a choice (Close, Escape, or a click outside) returns to
   * where the visitor was, with focus on `returnTo`.
   */
  open(returnTo: HTMLElement): void;
}

/**
 * The address of a mission, starting with the tour or exploring. Built from
 * the current address so it works under any path the site is served from.
 */
export function missionAddress(id: string, start: 'tour' | 'explore'): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('mission', id);
  url.searchParams.set('start', start);
  return url.href;
}

/** Missions grouped by program, in the order the list gives them (by date). */
function byProgram(summaries: readonly MissionSummary[]): Map<Program, MissionSummary[]> {
  const groups = new Map<Program, MissionSummary[]>();
  for (const summary of summaries) {
    const group = groups.get(summary.program);
    if (group) group.push(summary);
    else groups.set(summary.program, [summary]);
  }
  return groups;
}

/** A program's name with the years its listed missions span, worked out from their dates. */
function programHeading(program: Program, group: readonly MissionSummary[]): HTMLHeadingElement {
  const heading = el('h3', 'hub__program-title');
  heading.id = `hub-program-${program}`;
  heading.append(el('span', 'hub__program-name', copy.hub.programs[program]));
  const years = group.flatMap((summary) => yearOf(summary.date) ?? []);
  if (years.length) {
    const first = Math.min(...years);
    const last = Math.max(...years);
    const shown = el('span', 'hub__years', formatYears(first, last));
    // An en dash is read out unevenly, so screen readers hear "1965 to 1966".
    shown.setAttribute('aria-hidden', 'true');
    heading.append(' ', shown, hiddenText(`, ${copy.hub.yearsSpoken(first, last)}`));
  }
  return heading;
}

/**
 * The mission picker. Missions are grouped by program, each a compact row:
 * name, dates, a one-line summary, and the ways in (the guided tour and
 * exploring freely, or Read for a memorial). Choosing the loaded mission
 * acts in place; choosing another one loads that mission's page. The extras
 * follow in two small, quieter groups and open over the page in place.
 */
export function setUpHub(options: HubOptions): Hub {
  const { currentId, summaries, isDraft, onTour, onExplore, onReturn, onMemorial } = options;
  const { extras, isExtraDraft, onExtra } = options;
  const dialog = byId('hub', HTMLDialogElement);
  const list = byId('hub-list', HTMLDivElement);
  const closeButton = byId('hub-close', HTMLButtonElement);

  byId('hub-title', HTMLHeadingElement).textContent = copy.hub.title;
  const memorials = summaries
    .filter((summary) => summary.kind === 'memorial')
    .map((summary) => summary.name);
  const opening = options.lede ?? copy.hub.lede;
  const lede = memorials.length
    ? `${opening} ${copy.hub.ledeMemorial(new Intl.ListFormat('en-US').format(memorials), memorials.length)}`
    : opening;
  byId('hub-lede', HTMLParagraphElement).textContent = lede;
  closeButton.textContent = copy.close;

  let isOpen = false;
  let choice: (() => void) | null = null;
  let returnTo: HTMLElement | null = null;
  // While the hub is open the tab shows the site's title; closing gives it back what it said before.
  let titleBefore = '';

  /**
   * Put the page back after the hub closes, then do what was chosen, or what
   * leaving without a choice means. Runs once per opening.
   */
  const finish = (): void => {
    if (!isOpen) return;
    const action = choice;
    isOpen = false;
    choice = null;
    document.title = titleBefore;

    if (action) {
      action();
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

  /* The list ---------------------------------------------------------- */
  let loaded: HTMLLIElement | null = null;

  const entry = (shown: MissionSummary): HTMLLIElement => {
    const memorial = shown.kind === 'memorial';
    const item = el('li', memorial ? 'hub__entry hub__entry--memorial' : 'hub__entry');
    item.setAttribute('data-testid', `hub-mission-${shown.id}`);
    const isCurrent = shown.id === currentId;
    if (isCurrent) {
      item.setAttribute('aria-current', 'true');
      loaded = item;
    }

    // The name (with any mark) over the dates, and the actions beside them.
    const heading = el('div', 'hub__heading');
    const name = el('h4', 'hub__name', shown.name);
    if (isCurrent) name.append(' ', el('span', 'hub__mark hub__mark--current', copy.hub.current));
    if (isDraft(shown)) name.append(' ', el('span', 'hub__mark hub__mark--draft', copy.hub.draft));
    heading.append(name);
    const dates = summaryDates(shown);
    if (dates) heading.append(el('p', 'hub__dates', dates));

    const buttons = el('div', 'hub__actions');
    if (memorial) {
      const read = button('button hub__read', copy.hub.read);
      read.setAttribute('data-testid', `hub-mission-${shown.id}-read`);
      read.setAttribute('aria-label', copy.hub.readAbout(shown.name));
      read.setAttribute('aria-haspopup', 'dialog');
      read.addEventListener('click', () => onMemorial(shown.id, read));
      buttons.append(read);
    } else {
      const go = (start: 'tour' | 'explore'): void => {
        if (isCurrent) choose(start === 'tour' ? onTour : onExplore);
        else window.location.assign(missionAddress(shown.id, start));
      };
      // One amber button in the list: the first way into the loaded mission.
      const primary = (first: boolean): string => (isCurrent && first ? ' button--primary' : '');
      if (shown.hasTour) {
        const tour = button(`button${primary(true)} hub__tour`, copy.hub.tour);
        tour.setAttribute('data-testid', `hub-mission-${shown.id}-tour`);
        tour.setAttribute('aria-label', copy.hub.tourOf(shown.name));
        tour.addEventListener('click', () => go('tour'));
        buttons.append(tour);
      }
      const explore = button(`button${primary(!shown.hasTour)} hub__explore`, copy.hub.explore);
      explore.setAttribute('data-testid', `hub-mission-${shown.id}-explore`);
      explore.setAttribute('aria-label', copy.hub.exploreMission(shown.name));
      explore.addEventListener('click', () => go('explore'));
      buttons.append(explore);
    }

    const top = el('div', 'hub__top');
    top.append(heading, buttons);
    item.append(top, el('p', 'hub__summary', shown.blurb));
    return item;
  };

  const sections: HTMLElement[] = [];
  for (const [program, group] of byProgram(summaries)) {
    const section = el('section', 'hub__program');
    const heading = programHeading(program, group);
    section.setAttribute('aria-labelledby', heading.id);
    const items = el('ul', 'hub__entries');
    items.append(...group.map(entry));
    section.append(heading, items);
    sections.push(section);
  }

  // The extras: quieter rows under the missions, one small group per kind.
  const extraEntry = (meta: ExtraMeta): HTMLLIElement => {
    const item = el('li', 'hub__entry hub__entry--extra');
    item.setAttribute('data-testid', `hub-extra-${meta.id}`);
    const heading = el('div', 'hub__heading');
    const name = el('h4', 'hub__name', meta.title);
    if (isExtraDraft(meta))
      name.append(' ', el('span', 'hub__mark hub__mark--draft', copy.hub.draft));
    heading.append(name, el('p', 'hub__summary', meta.blurb));
    const open = button('button hub__open', copy.hub.open);
    open.setAttribute('data-testid', `hub-extra-${meta.id}-open`);
    open.setAttribute('aria-label', copy.hub.openExtra(meta.title));
    open.setAttribute('aria-haspopup', 'dialog');
    open.addEventListener('click', () => onExtra(meta.id, open));
    const buttons = el('div', 'hub__actions');
    buttons.append(open);
    const top = el('div', 'hub__top');
    top.append(heading, buttons);
    item.append(top);
    return item;
  };
  for (const kind of ['hands-on', 'explore'] as const) {
    const group = extras.filter((meta) => meta.kind === kind);
    if (!group.length) continue;
    const section = el('section', 'hub__program hub__extras');
    const heading = el('h3', 'hub__program-title', copy.hub.extras[kind]);
    heading.id = `hub-extras-${kind}`;
    section.setAttribute('aria-labelledby', heading.id);
    const items = el('ul', 'hub__entries');
    items.append(...group.map(extraEntry));
    section.append(heading, items);
    sections.push(section);
  }
  list.replaceChildren(...sections);

  /** Scroll the list so the loaded mission sits in the middle. */
  const reveal = (): void => {
    list.scrollTop = 0;
    if (!loaded) return;
    const box = loaded.getBoundingClientRect();
    const frame = list.getBoundingClientRect();
    list.scrollTop = Math.max(0, box.top - frame.top - (list.clientHeight - box.height) / 2);
  };

  /* Opening and closing ------------------------------------------------ */
  // Escape.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  // Anything else that closes it.
  dialog.addEventListener('close', finish);

  // A click outside the box closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) close();
  });
  closeButton.addEventListener('click', close);

  // Coming back to this page from another mission's: put the visitor back where they were.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && isOpen) close();
  });

  return {
    open(from) {
      if (dialog.open) return;
      isOpen = true;
      returnTo = from;
      titleBefore = document.title;
      document.title = copy.siteTitle;
      dialog.showModal();
      reveal();
      closeButton.focus({ preventScroll: true });
    },
  };
}
