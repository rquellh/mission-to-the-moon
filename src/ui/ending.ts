import { explorePick, flightsCollected, handsOnPick, nextFlight } from '../app/related';
import { copy } from '../content/copy';
import { emblemFor } from '../content/emblems';
import type { MissionSummary } from '../content/types';
import type { ExtraMeta } from '../extras/types';
import { readVisits } from './device-store';
import { button, byId, el, hiddenText } from './dom';
import { formatDate, summaryDates } from './format';
import { missionAddress } from './hub';
import { icon } from './icons';
import type { MissionIndex } from './mission-index';
import { mediaUrl } from './photo';
import { momentDate } from './records';

/** How the flight was followed to its end: on the guided tour, or exploring. */
export type EndingAfter = 'tour' | 'explore';

export interface EndingOptions {
  index: MissionIndex;
  /** The mission list, in date order: the flights to suggest next, and the count of flights collected. */
  summaries: readonly MissionSummary[];
  /** The extras list: one of each kind is suggested. */
  extras: readonly ExtraMeta[];
  announce(text: string): void;
  /** "Watch again": the flight from the beginning, or the tour from its first stop. */
  onWatchAgain(): void;
  /** "Explore on my own", after the tour: leave the tour and explore the flight from its last moment. */
  onExplore(): void;
  /** Open an extra over the ending; focus comes back to `from` when it closes. */
  onExtra(id: string, params: URLSearchParams, from: HTMLButtonElement): void;
  /** Open "About this mission"; focus comes back to `from`. */
  onAbout(from: HTMLButtonElement): void;
  /** Open "Sources and credits"; focus comes back to `from`. */
  onCredits(from: HTMLButtonElement): void;
  /** Open the mission list; focus comes back to `from` when it closes without a choice. */
  onAllMissions(from: HTMLButtonElement): void;
  /** "More to explore" opened or closed: the card changed size. */
  onLayout(): void;
}

export interface Ending {
  /**
   * Show the end of the flight in the moment's place, with focus on its
   * title, and say so. What it suggests is worked out afresh each time, from
   * what this device has flown.
   */
  show(after: EndingAfter): void;
  /** Take the ending away, closing "More to explore". */
  hide(): void;
}

/**
 * A mission's patch as a small round picture: in color with a thin amber
 * ring once collected, grey and dimmed before. None for a flight whose crew
 * had no patch. Its words are beside it, so the picture says nothing unless
 * it is given words of its own. "Up next", at the end of a run in an extra,
 * shows it too.
 */
export function patch(
  missionId: string,
  collected: boolean,
  className: string,
  alt = '',
): HTMLSpanElement | null {
  const emblem = emblemFor(missionId);
  if (!emblem) return null;
  const frame = el('span', `patch ${collected ? 'patch--collected' : 'patch--faded'} ${className}`);
  const image = el('img', 'patch__image');
  image.src = mediaUrl(emblem.src);
  image.alt = alt;
  image.width = emblem.width;
  image.height = emblem.height;
  image.decoding = 'async';
  // A picture that does not load leaves the words on their own.
  image.addEventListener('error', () => frame.remove());
  frame.append(image);
  return frame;
}

/** A shelf's tile: its name over what it suggests, grouped under that name. */
function tile(shelf: string, name: string, className: string): HTMLDivElement {
  const box = el('div', `tile ${className}`);
  box.setAttribute('role', 'group');
  box.setAttribute('aria-labelledby', `ending-shelf-${shelf}`);
  box.setAttribute('data-testid', `ending-pick-${shelf}`);
  const label = el('p', 'tile__shelf', name);
  label.id = `ending-shelf-${shelf}`;
  box.append(label);
  return box;
}

/** "More to explore" once it is built: the card, and its title, which takes keyboard focus. */
interface MoreCard {
  more: HTMLElement;
  title: HTMLHeadingElement;
}

/**
 * The end of every flight, in the moment card, after the tour or exploring.
 * The card stops telling what is happening and tells what's next: "Watch
 * again" where Play was, the last moment and its date over "That's the
 * flight!", the patch collected, one amber button to the next flight, and
 * "More to explore", which opens the card upward (a taller sheet on a
 * phone) with one pick from each shelf (the next flight, something to try,
 * something to explore) and the quiet ways on. The picks come from
 * src/app/related.ts; nothing here decides them.
 */
export function setUpEnding(options: EndingOptions): Ending {
  const {
    index,
    summaries,
    extras,
    announce,
    onWatchAgain,
    onExplore,
    onExtra,
    onAbout,
    onCredits,
    onAllMissions,
  } = options;
  const { onLayout } = options;
  const mission = index.mission;
  const section = byId('ending', HTMLElement);

  /** What is on show: the line, the door in it, and "More to explore" once it has been opened. */
  let shown: {
    line: HTMLElement;
    door: HTMLButtonElement;
    buildMore(): MoreCard;
    more: MoreCard | null;
  } | null = null;

  /** The last moment's title and its date, for example "Splashdown · July 24, 1969". A long line breaks at the dot. */
  const eyebrow = (testId?: string): HTMLParagraphElement => {
    const last = index.events.length - 1;
    const date = momentDate(index, last);
    const text = el('p', 'ending__eyebrow', index.events[last]?.title ?? mission.name);
    if (date) text.append(' · ', el('span', 'ending__date', formatDate(date)));
    if (testId) text.setAttribute('data-testid', testId);
    return text;
  };

  const title = (id: string): HTMLHeadingElement => {
    const heading = el('h3', 'ending__title', copy.ending.title);
    heading.id = id;
    heading.tabIndex = -1;
    heading.setAttribute('data-testid', id);
    return heading;
  };

  /** Open a flight at its own address, starting it the way this one was started. */
  const fly = (next: MissionSummary, after: EndingAfter): void => {
    window.location.assign(
      missionAddress(next.id, after === 'tour' && next.hasTour ? 'tour' : 'explore'),
    );
  };

  /** The one amber button: to the next flight, or to the mission list once every flight is flown. */
  const primary = (
    next: MissionSummary | null,
    after: EndingAfter,
    className: string,
    label: string,
  ): HTMLButtonElement => {
    const go = button(`button button--primary ${className}`);
    if (next) {
      go.append(label);
      go.addEventListener('click', () => fly(next, after));
    } else {
      go.textContent = copy.ending.allMissions;
      go.setAttribute('aria-haspopup', 'dialog');
      go.addEventListener('click', () => onAllMissions(go));
    }
    return go;
  };

  /** Open or close "More to explore". It is built the first time it opens, so its pictures load only then. */
  const setOpen = (open: boolean): void => {
    if (!shown) return;
    const isOpen = shown.more !== null && !shown.more.more.hidden;
    if (open === isOpen) return;
    if (open && !shown.more) {
      shown.more = shown.buildMore();
      section.append(shown.more.more);
      shown.door.setAttribute('aria-controls', shown.more.more.id);
    }
    if (shown.more) shown.more.more.hidden = !open;
    shown.line.hidden = open;
    shown.door.setAttribute('aria-expanded', String(open));
    onLayout();
    if (open) shown.more?.title.focus({ preventScroll: true });
    else shown.door.focus({ preventScroll: true });
  };

  // "More to explore" is not a dialog, so it handles Escape itself, while focus is inside it.
  section.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !shown?.more || shown.more.more.hidden)
      return;
    event.preventDefault();
    setOpen(false);
  });

  const render = (after: EndingAfter): void => {
    const visits = readVisits();
    const { collected, total } = flightsCollected(summaries, visits);
    const hasPatch = Boolean(emblemFor(mission.id));
    const collectedText = hasPatch
      ? copy.ending.patchCollected(collected, total)
      : copy.ending.flightCollected(collected, total);
    const flew = copy.ending.flew(mission.name);
    const book = (hasPatch ? copy.ending.inYourBook : copy.ending.pageInYourBook)(collected, total);
    const next = nextFlight(
      summaries,
      { id: mission.id, date: mission.launch?.value.utc ?? '' },
      visits,
    );
    const againLabel = after === 'tour' ? copy.ending.tourAgain : copy.ending.watchAgain;

    /* The ending line: in the card's place and size. */
    const line = el('div', 'ending__line');
    const again = button('ending__again');
    again.setAttribute('aria-label', againLabel);
    again.setAttribute('data-testid', 'ending-again');
    again.append(icon('replay'));
    again.addEventListener('click', () => onWatchAgain());

    const titles = el('div', 'ending__titles');
    const collectedLine = el('p', 'ending__collected');
    collectedLine.setAttribute('data-testid', 'ending-collected');
    const smallPatch = patch(mission.id, true, 'patch--small');
    if (smallPatch) collectedLine.append(smallPatch);
    collectedLine.append(el('span', undefined, collectedText));
    titles.append(eyebrow('ending-eyebrow'), title('ending-title'), collectedLine);

    const nextButton = primary(
      next,
      after,
      'ending__next',
      next ? copy.ending.next(next.name) : '',
    );
    if (next) nextButton.append(icon('arrow-right'));
    nextButton.setAttribute('data-testid', 'ending-next');

    const door = button('button ending__door');
    door.setAttribute('aria-expanded', 'false');
    door.setAttribute('data-testid', 'ending-more-toggle');
    door.append(icon('chevron-up'), copy.ending.more);
    door.addEventListener('click', () => setOpen(door.getAttribute('aria-expanded') !== 'true'));
    line.append(again, titles, nextButton, door);

    /* "More to explore": the card opened, one pick from each shelf. */
    const buildMore = (): MoreCard => {
      const more = el('div', 'ending__more');
      more.id = 'ending-more';
      more.setAttribute('data-testid', 'ending-more');

      const head = el('div', 'ending__head');
      const bigPatch = patch(mission.id, true, 'patch--large', emblemFor(mission.id)?.alt);
      if (bigPatch) head.append(bigPatch);
      const headTitles = el('div', 'ending__titles');
      const moreTitle = title('ending-more-title');
      // A wide card has room for a sentence; a phone keeps the short line.
      const sentence = el('p', 'ending__sentence');
      sentence.append(el('span', undefined, flew), ' ', el('span', undefined, book));
      headTitles.append(
        eyebrow(),
        moreTitle,
        sentence,
        el('p', 'ending__collected ending__collected--short', collectedText),
      );
      const less = button('button ending__less');
      less.setAttribute('aria-label', copy.ending.lessLabel);
      less.setAttribute('aria-controls', more.id);
      less.setAttribute('data-testid', 'ending-less');
      less.append(icon('chevron-down'), el('span', 'ending__less-label', copy.ending.less));
      less.addEventListener('click', () => setOpen(false));
      head.append(headTitles, less);

      const shelves = el('div', 'ending__shelves');
      // The next flight: the one amber button while this is open.
      const nextTile = tile('next', copy.ending.nextFlight, 'tile--next');
      if (next) {
        const nextPatch = patch(next.id, false, 'tile__patch');
        if (nextPatch) nextTile.append(nextPatch);
        nextTile.append(el('h4', 'tile__title', next.name));
        const dates = summaryDates(next);
        if (dates) nextTile.append(el('p', 'tile__dates', dates));
        nextTile.append(el('p', 'tile__blurb', next.blurb));
      } else {
        nextTile.append(el('p', 'tile__blurb tile__blurb--whole', copy.ending.allFlown));
      }
      const go = primary(next, after, 'tile__go', next ? copy.ending.fly(next.name) : '');
      go.setAttribute('data-testid', 'ending-pick-next-go');
      nextTile.append(go);
      shelves.append(nextTile);

      // Something to try and something to explore, each opened over the ending, on this flight's page. Only the
      // flight is passed, not the moment: the flight waits at its end, so the extra must not say it waits at liftoff.
      const extraTile = (
        shelf: string,
        name: string,
        meta: ExtraMeta,
        params: URLSearchParams,
      ): HTMLDivElement => {
        const box = tile(shelf, name, 'tile--extra');
        const open = button('button tile__open');
        open.setAttribute('aria-label', copy.ending.openExtra(meta.title));
        open.setAttribute('aria-haspopup', 'dialog');
        open.setAttribute('data-testid', `ending-pick-${shelf}-open`);
        open.append(
          el('span', 'tile__open-label', copy.ending.open),
          icon('next', 'icon tile__chevron'),
        );
        open.addEventListener('click', () => onExtra(meta.id, params, open));
        box.append(el('h4', 'tile__title', meta.title), el('p', 'tile__blurb', meta.blurb), open);
        return box;
      };
      const handsOn = handsOnPick(mission, extras);
      if (handsOn) {
        shelves.append(
          extraTile(
            'hands-on',
            copy.ending.handsOn,
            handsOn.extra,
            new URLSearchParams({ mission: mission.id }),
          ),
        );
      }
      const explore = explorePick(mission.id, extras);
      if (explore)
        shelves.append(
          extraTile(
            'explore',
            copy.ending.explore,
            explore,
            new URLSearchParams({ mission: mission.id }),
          ),
        );

      /* The quiet ways on. A phone keeps Watch again, Explore on my own after a tour, and All missions. */
      const actions = el(
        'div',
        after === 'tour' ? 'ending__actions ending__actions--tour' : 'ending__actions',
      );
      const watch = button('ending__action ending__action--again');
      watch.setAttribute('data-testid', 'ending-watch-again');
      watch.append(icon('replay'), againLabel);
      watch.addEventListener('click', () => onWatchAgain());
      // After the tour, a way to keep exploring this flight. Exploring needs none: Play is one step away.
      const keepExploring: HTMLButtonElement[] = [];
      if (after === 'tour') {
        const onMyOwn = button('ending__action ending__action--explore', copy.ending.keepExploring);
        onMyOwn.setAttribute('data-testid', 'ending-explore');
        onMyOwn.addEventListener('click', () => onExplore());
        keepExploring.push(onMyOwn);
      }
      const about = button('ending__action ending__action--page', copy.ending.about(mission.name));
      about.setAttribute('aria-haspopup', 'dialog');
      about.setAttribute('data-testid', 'ending-about');
      about.addEventListener('click', () => onAbout(about));
      const credits = button('ending__action ending__action--page', copy.ending.credits);
      credits.setAttribute('aria-haspopup', 'dialog');
      credits.setAttribute('data-testid', 'ending-credits');
      credits.addEventListener('click', () => onCredits(credits));
      const all = button('ending__action ending__action--all');
      all.setAttribute('aria-haspopup', 'dialog');
      all.setAttribute('data-testid', 'ending-all-missions');
      // The number is shown in a small pill, and read out with what it counts.
      const count = el('span', 'ending__count', String(summaries.length));
      count.setAttribute('aria-hidden', 'true');
      all.append(
        copy.ending.allMissions,
        hiddenText(`, ${copy.ending.count(summaries.length)}`),
        count,
        icon('next'),
      );
      all.addEventListener('click', () => onAllMissions(all));
      actions.append(watch, ...keepExploring, about, credits, el('span', 'ending__gap'), all);

      more.append(head, shelves, actions);
      return { more, title: moreTitle };
    };

    section.replaceChildren(line);
    shown = { line, door, buildMore, more: null };
    announce(`${copy.ending.title} ${flew} ${book}`);
  };

  return {
    show(after) {
      render(after);
      section.hidden = false;
      byId('ending-title', HTMLHeadingElement).focus({ preventScroll: true });
    },
    hide() {
      section.hidden = true;
      section.replaceChildren();
      shown = null;
    },
  };
}
