import { copy } from '../content/copy';
import type { MissionSummary, Program } from '../content/types';
import type { ExtraMeta } from '../extras/types';
import { button, byId, el, hiddenText } from './dom';
import { formatYears, summaryDates, yearOf } from './format';

export type HubMode = 'welcome' | 'return';

/** An entry in the list: a mission (or memorial) or an extra. */
export type HubTarget = { mission: string } | { extra: string };

const keyOf = (target: HubTarget): string => ('mission' in target ? `mission:${target.mission}` : `extra:${target.extra}`);

export interface HubOptions {
  /** The flight whose scene is loaded behind the hub, or null when none could be loaded. */
  currentId: string | null;
  /** Its name, for the page title once the hub closes. */
  currentName?: string;
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
  /** The hub closed without a choice after being reopened: carry on where the visitor was. */
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
   * The first thing a visitor sees, over the bare 3D view. The rest of the
   * interface is hidden; the 3D view can still be turned. Leaving without a
   * choice (Escape) explores the loaded mission. The list scrolls to the
   * entry `reveal` names, or to the loaded mission.
   */
  welcome(reveal?: HubTarget): void;
  /**
   * Reopen over the interface as a modal dialog. Leaving without a choice
   * (Close, Escape, or a click outside) returns to where the visitor was.
   */
  open(returnTo: HTMLElement): void;
  /** How the hub is open now, or null when it is closed. */
  readonly mode: HubMode | null;
  /** The button that opens an entry (Explore, Read, or Open), so focus can come back to it. */
  actionFor(target: HubTarget): HTMLButtonElement | null;
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
  const { currentId, currentName, summaries, isDraft, onTour, onExplore, onReturn, onMemorial } = options;
  const { extras, isExtraDraft, onExtra } = options;
  const dialog = byId('hub', HTMLDialogElement);
  const title = byId('hub-title', HTMLHeadingElement);
  const list = byId('hub-list', HTMLDivElement);
  const closeButton = byId('hub-close', HTMLButtonElement);

  title.textContent = copy.siteTitle;
  const memorials = summaries.filter((summary) => summary.kind === 'memorial').map((summary) => summary.name);
  const opening = options.lede ?? copy.hub.lede;
  const lede = memorials.length
    ? `${opening} ${copy.hub.ledeMemorial(new Intl.ListFormat('en-US').format(memorials), memorials.length)}`
    : opening;
  byId('hub-lede', HTMLParagraphElement).textContent = lede;
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
    document.title = currentName ? copy.pageTitle(currentName) : copy.siteTitle;

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
    // The welcome is not modal, so Escape is handled here rather than by the
    // browser. A dialog open over it (a memorial page) takes Escape for itself.
    if (event.key !== 'Escape' || mode !== 'welcome') return;
    if (document.querySelector('dialog.dialog[open]')) return;
    event.preventDefault();
    close();
  };

  /* The list ---------------------------------------------------------- */
  const entries = new Map<string, HTMLLIElement>();
  const actions = new Map<string, HTMLButtonElement>();

  const entry = (shown: MissionSummary): HTMLLIElement => {
    const memorial = shown.kind === 'memorial';
    const item = el('li', memorial ? 'hub__entry hub__entry--memorial' : 'hub__entry');
    item.setAttribute('data-testid', `hub-mission-${shown.id}`);
    const isCurrent = shown.id === currentId;
    if (isCurrent) item.setAttribute('aria-current', 'true');
    entries.set(keyOf({ mission: shown.id }), item);

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
      actions.set(keyOf({ mission: shown.id }), read);
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
      actions.set(keyOf({ mission: shown.id }), explore);
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
    const key = keyOf({ extra: meta.id });
    entries.set(key, item);
    const heading = el('div', 'hub__heading');
    const name = el('h4', 'hub__name', meta.title);
    if (isExtraDraft(meta)) name.append(' ', el('span', 'hub__mark hub__mark--draft', copy.hub.draft));
    heading.append(name, el('p', 'hub__summary', meta.blurb));
    const open = button('button hub__open', copy.hub.open);
    open.setAttribute('data-testid', `hub-extra-${meta.id}-open`);
    open.setAttribute('aria-label', copy.hub.openExtra(meta.title));
    open.setAttribute('aria-haspopup', 'dialog');
    open.addEventListener('click', () => onExtra(meta.id, open));
    actions.set(key, open);
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

  /** Scroll the list so an entry (the loaded mission, unless another is named) sits in the middle. */
  const reveal = (to?: HubTarget): void => {
    list.scrollTop = 0;
    const loaded = currentId ? entries.get(keyOf({ mission: currentId })) : undefined;
    const target = (to ? entries.get(keyOf(to)) : undefined) ?? loaded;
    if (!target) return;
    const box = target.getBoundingClientRect();
    const frame = list.getBoundingClientRect();
    list.scrollTop = Math.max(0, box.top - frame.top - (list.clientHeight - box.height) / 2);
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
    welcome(to) {
      if (dialog.open) return;
      show('welcome');
      document.body.classList.add('is-welcome');
      document.addEventListener('keydown', onKey);
      dialog.show();
      reveal(to);
      title.focus({ preventScroll: true });
    },
    open(from) {
      if (dialog.open) return;
      show('return');
      returnTo = from;
      dialog.showModal();
      reveal();
      closeButton.focus({ preventScroll: true });
    },
    get mode() {
      return mode;
    },
    actionFor(target) {
      return actions.get(keyOf(target)) ?? null;
    },
  };
}
