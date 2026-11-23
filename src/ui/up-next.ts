import { explorePick, otherHandsOn } from '../app/related';
import { copy } from '../content/copy';
import { emblemFor } from '../content/emblems';
import type { ExtraMeta, ExtraOrigin, UpNextOptions, UpNextQuietAction } from '../extras/types';
import { readVisits } from './device-store';
import { button, el, wideLayoutQuery } from './dom';
import { patch } from './ending';
import { icon } from './icons';

/** What the sheet knows that the extra does not, for building "Up next". */
export interface UpNextHost {
  /** The extra whose run has ended: the other hands-on extra is suggested. */
  extraId: string;
  /** How the sheet was opened: All missions is offered only from the list. */
  origin: ExtraOrigin;
  /** The flight behind the sheet: the picks are for it when the next step goes back to it. */
  missionId: string;
  /** The extras list, to pick from. */
  extras: readonly ExtraMeta[];
  /** Open a picked extra in this one's place. */
  openExtra(id: string, params: URLSearchParams): void;
  /** "All missions": close the sheet and show the mission list. */
  onAllMissions(): void;
  /** Aborted when the extra is taken down. */
  signal: AbortSignal;
}

/** Each block's ids are its own, so a new run's block never shares one with the last. */
let blocks = 0;

/**
 * "Up next", at the end of a run in a hands-on extra: one recommended next
 * step in amber (what the extra says: back to the flight, or the flight
 * where it really happened), one pick from each shelf (the other hands-on
 * extra, and an extra to explore, from src/app/related.ts), and the quiet
 * actions (the extra's own, then All missions when the sheet was opened
 * from the list).
 *
 * Wide, it is a softly tinted box in the extra's column. On a phone the
 * next step is pinned at the bottom of the screen with the "again" action
 * and "More to explore" in reach; that door pulls it up into a sheet with
 * the picks and the other actions, and Show less (or Escape) puts it back.
 */
export function buildUpNext(host: UpNextHost, options: UpNextOptions): HTMLElement {
  const { signal } = host;
  const n = (blocks += 1);
  const idOf = (part: string): string => `up-next-${n}-${part}`;
  const wide = wideLayoutQuery();
  // The picks are for the flight the next step flies, or else the flight waiting behind the sheet.
  const flight = options.mission ?? host.missionId;

  const block = el('section', 'up-next');
  block.setAttribute('data-testid', 'up-next');

  const grip = el('span', 'up-next__grip');
  grip.setAttribute('aria-hidden', 'true');

  /* "Up next", and on a phone pulled up, the way to put it back. */
  const top = el('div', 'up-next__top');
  const eyebrow = el('p', 'ending__eyebrow up-next__eyebrow', copy.upNext.title);
  eyebrow.id = idOf('label');
  block.setAttribute('aria-labelledby', eyebrow.id);
  const less = button('button up-next__less');
  less.setAttribute('aria-label', copy.upNext.lessLabel);
  less.setAttribute('data-testid', 'up-next-less');
  less.append(icon('chevron-down'));
  top.append(eyebrow, less);

  /* The next step: its title, a line, a sentence, and the one amber button. */
  const step = el('div', 'up-next__step');
  if (options.mission) {
    const collected = readVisits().has(options.mission);
    const picture = patch(options.mission, collected, 'up-next__patch');
    if (picture) step.append(picture);
  }
  const titles = el('div', 'up-next__titles');
  const title = el('h3', 'up-next__title', options.title);
  title.tabIndex = -1;
  title.setAttribute('data-testid', 'up-next-title');
  titles.append(title);
  if (options.line) titles.append(el('p', 'up-next__line', options.line));
  step.append(titles);
  // Flying a flight collects its patch; say so until it is collected.
  const toCollect =
    options.mission !== undefined &&
    emblemFor(options.mission) !== undefined &&
    !readVisits().has(options.mission);
  const sentence = [options.sentence, toCollect ? copy.upNext.collect : undefined]
    .filter(Boolean)
    .join(' ');
  if (sentence) step.append(el('p', 'up-next__sentence', sentence));
  const go = button('button button--primary up-next__go');
  go.setAttribute('data-testid', 'up-next-primary');
  go.append(options.primary.label, icon('arrow-right'));
  go.addEventListener('click', () => options.primary.run(), { signal });
  step.append(go);

  /* One pick from each shelf, each opened in this extra's place, for the same flight. */
  const picks = el('div', 'up-next__picks');
  picks.id = idOf('picks');
  picks.setAttribute('data-testid', 'up-next-more');
  const pick = (shelf: 'hands-on' | 'explore', name: string, meta: ExtraMeta): HTMLDivElement => {
    const box = el('div', 'tile tile--extra up-next__pick');
    box.setAttribute('role', 'group');
    box.setAttribute('data-testid', `up-next-pick-${shelf}`);
    const label = el('p', 'tile__shelf', name);
    label.id = idOf(`shelf-${shelf}`);
    box.setAttribute('aria-labelledby', label.id);
    const open = button('button tile__open');
    open.setAttribute('aria-label', copy.upNext.openExtra(meta.title));
    open.setAttribute('data-testid', `up-next-pick-${shelf}-open`);
    open.append(
      el('span', 'tile__open-label', copy.upNext.open),
      icon('next', 'icon tile__chevron'),
    );
    open.addEventListener(
      'click',
      () => host.openExtra(meta.id, new URLSearchParams({ mission: flight })),
      { signal },
    );
    box.append(label, el('h4', 'tile__title', meta.title), open);
    return box;
  };
  const toTry = otherHandsOn(host.extraId, host.extras);
  if (toTry) picks.append(pick('hands-on', copy.upNext.handsOn, toTry));
  const toExplore = explorePick(flight, host.extras);
  if (toExplore) picks.append(pick('explore', copy.upNext.explore, toExplore));

  /* The quiet actions: the extra's own, then All missions from the list. On a phone, the door. */
  const actions = el('div', 'up-next__actions');
  /** The quiet actions a phone keeps in the pulled-up sheet; "again" stays in reach. */
  const folded: HTMLButtonElement[] = [];
  let again: HTMLButtonElement | null = null;
  const quiet = (action: UpNextQuietAction): HTMLButtonElement => {
    const control = button('ending__action up-next__action');
    if (action.again && !again) {
      again = control;
      control.setAttribute('data-testid', 'up-next-again');
      control.append(icon('replay'), action.label);
    } else {
      control.textContent = action.label;
      folded.push(control);
    }
    control.addEventListener('click', () => action.run(), { signal });
    return control;
  };
  actions.append(...(options.actions ?? []).map(quiet));
  if (host.origin === 'list') {
    const all = button('ending__action up-next__action', copy.upNext.allMissions);
    all.setAttribute('aria-haspopup', 'dialog');
    all.setAttribute('data-testid', 'up-next-all-missions');
    all.addEventListener('click', () => host.onAllMissions(), { signal });
    folded.push(all);
    actions.append(all);
  }
  const door = button('ending__action up-next__door');
  door.setAttribute('data-testid', 'up-next-more-toggle');
  door.append(icon('chevron-up'), copy.upNext.more);
  actions.append(door);
  const hasPicks = picks.childElementCount > 0;
  const hasMore = hasPicks || folded.length > 0;
  if (hasPicks) {
    door.setAttribute('aria-controls', picks.id);
    less.setAttribute('aria-controls', picks.id);
  }

  block.append(grip, top, step);
  if (hasPicks) block.append(picks);
  block.append(actions);

  /* Pulled up or not: only on a phone. Wide, everything shows. */
  let open = false;
  const render = (): void => {
    const phone = !wide.matches;
    const pulledUp = phone && open;
    const pinned = phone && !open;
    block.classList.toggle('is-pinned', pinned);
    block.classList.toggle('is-open', pulledUp);
    picks.hidden = pinned;
    for (const control of folded) control.hidden = pinned;
    door.hidden = !pinned || !hasMore;
    door.setAttribute('aria-expanded', String(pulledUp));
    less.hidden = !pulledUp;
  };
  const setOpen = (next: boolean): void => {
    if (next === open) return;
    open = next;
    render();
    if (open) title.focus({ preventScroll: true });
    else door.focus({ preventScroll: true });
  };
  door.addEventListener('click', () => setOpen(true), { signal });
  less.addEventListener('click', () => setOpen(false), { signal });
  // Pulled up, it is not a dialog of its own, so it takes Escape while focus is inside it (and the sheet stays open).
  block.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !open || wide.matches) return;
      event.preventDefault();
      setOpen(false);
    },
    { signal },
  );
  wide.addEventListener('change', render, { signal });
  render();
  return block;
}
