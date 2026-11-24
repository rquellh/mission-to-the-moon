import { copy } from '../content/copy';
import type { MissionEvent } from '../content/types';
import { createAudioPlayer, type AudioPlayer } from './audio-player';
import { sourcesBlock } from './citations';
import { button, byId, el, wideLayoutQuery } from './dom';
import { formatElapsed, formatUtc, isBeforeLiftoff, missionDates } from './format';
import { icon } from './icons';
import type { MissionIndex } from './mission-index';
import { fillPhoto } from './photo';

export interface EventCard {
  /** Show an event by its index in the mission, or the mission summary for -1. */
  show(eventIndex: number): void;
  /** The event index on show. */
  readonly shown: number;
  /** Hide the previous and next buttons while the tour has its own. */
  setTourMode(touring: boolean): void;
  /** Hide the card (for the end of the tour) or show it again. */
  setHidden(hidden: boolean): void;
  /** Allow "Try it" or hide it (it is hidden while the tour travels between stops). */
  setTryItAllowed(allowed: boolean): void;
  /** The "Try it" button, while it is showing, so focus can come back to it. */
  readonly tryItButton: HTMLButtonElement | null;
}

export interface EventCardOptions {
  index: MissionIndex;
  /** Asked to step to the previous (-1) or next (+1) event. */
  onStep(step: 1 | -1): void;
  reducedMotion(): boolean;
  /** The title of a listed extra by id, or undefined when it is not listed (so no "Try it"). */
  extraTitle(id: string): string | undefined;
  /** "Try it" was pressed on an event. */
  onTryIt(extraId: string, event: MissionEvent, from: HTMLButtonElement): void;
}

/**
 * The event card: the most recent event's title and time, its short text,
 * "Try it" when the event has a hands-on extra, its recording, "Tell me
 * more", its photo, and its sources.
 */
export function setUpEventCard({
  index,
  onStep,
  reducedMotion,
  extraTitle,
  onTryIt,
}: EventCardOptions): EventCard {
  const card = byId('card', HTMLElement);

  // Built once; the content changes with each event.
  const head = el('header', 'card__head');
  const titles = el('div', 'card__titles');
  const title = el('h3', 'card__title');
  title.id = 'card-title';
  title.setAttribute('data-testid', 'event-card-title');
  const time = el('p', 'card__time');
  time.setAttribute('data-testid', 'event-card-time');
  titles.append(title, time);

  const nav = el('div', 'card__nav');
  const previous = button('icon-button');
  previous.setAttribute('data-testid', 'event-card-previous');
  previous.setAttribute('aria-label', copy.card.previous);
  previous.append(icon('previous'));
  const next = button('icon-button');
  next.setAttribute('data-testid', 'event-card-next');
  next.setAttribute('aria-label', copy.card.next);
  next.append(icon('next'));
  nav.append(previous, next);
  head.append(titles, nav);

  const line = el('p', 'card__line');
  line.setAttribute('data-testid', 'event-card-line');
  const body = el('div', 'card__body');
  body.id = 'card-body';
  body.setAttribute('data-testid', 'event-card-body');
  const short = el('p', 'card__short');
  const figure = el('figure', 'card__photo');
  figure.setAttribute('data-testid', 'event-card-photo');
  const moreToggle = button('disclosure');
  moreToggle.setAttribute('data-testid', 'event-card-more-toggle');
  moreToggle.setAttribute('aria-expanded', 'false');
  moreToggle.setAttribute('aria-controls', 'card-more');
  const moreLabel = el('span', 'disclosure__label', copy.card.tellMore);
  moreToggle.append(moreLabel, icon('chevron-down', 'icon disclosure__icon'));
  const more = el('div', 'card__more');
  more.id = 'card-more';
  more.setAttribute('data-testid', 'event-card-more');
  more.hidden = true;
  const sources = el('div', 'card__sources');
  sources.setAttribute('data-testid', 'event-card-sources');
  const sound = el('div', 'card__audio');
  sound.setAttribute('data-testid', 'event-card-audio');
  sound.hidden = true;
  body.append(short, sound, moreToggle, more, figure, sources);

  const tryRow = el('div', 'card__try');
  tryRow.hidden = true;
  const tryButton = button('button card__try-button');
  tryButton.setAttribute('data-testid', 'event-card-try-it');
  tryRow.append(tryButton);
  card.append(head, line, body);
  // "Try it" follows the event's text in the side panel. On a phone it sits
  // under the one-line text instead, outside the body, so the compact card shows it too.
  const wide = wideLayoutQuery();
  const placeTryIt = (): void => (wide.matches ? short.after(tryRow) : line.after(tryRow));
  wide.addEventListener('change', placeTryIt);
  placeTryIt();

  let moreOpen = false;
  const setMoreOpen = (open: boolean): void => {
    moreOpen = open;
    moreToggle.setAttribute('aria-expanded', String(open));
    moreLabel.textContent = open ? copy.card.tellLess : copy.card.tellMore;
    more.hidden = !open;
  };
  moreToggle.addEventListener('click', () => {
    setMoreOpen(!moreOpen);
    if (moreOpen) revealMore();
  });

  // The fuller text opens under its button. If it starts out of sight below
  // the card's edge (often on a phone), scroll just enough to bring the
  // button to the top so the new text can be read.
  const revealMore = (): void => {
    const view = card.getBoundingClientRect();
    const start = more.getBoundingClientRect().top;
    if (start < view.bottom - 48) return;
    const by = moreToggle.getBoundingClientRect().top - view.top - 8;
    card.scrollBy({ top: by, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  previous.addEventListener('click', () => onStep(-1));
  next.addEventListener('click', () => onStep(1));

  // One recording player at a time, for the event on show.
  let player: AudioPlayer | null = null;
  const renderAudio = (event: MissionEvent | undefined): void => {
    player?.dispose();
    player = event?.audio ? createAudioPlayer(event.audio) : null;
    sound.replaceChildren(...(player ? [player.element] : []));
    sound.hidden = !player;
  };

  let tryAllowed = true;
  let tryTarget: { extra: string; event: MissionEvent } | null = null;
  const renderTryIt = (event: MissionEvent | undefined): void => {
    const id = event?.handsOn;
    const name = id ? extraTitle(id) : undefined;
    tryTarget = event && id && name ? { extra: id, event } : null;
    if (name) tryButton.textContent = copy.card.tryItLabel(name);
    tryRow.hidden = !tryTarget || !tryAllowed;
  };
  tryButton.addEventListener('click', () => {
    if (tryTarget) onTryIt(tryTarget.extra, tryTarget.event, tryButton);
  });

  const renderPhoto = (event: MissionEvent | undefined): void => {
    const photo = event?.photo;
    if (!photo) {
      figure.hidden = true;
      figure.replaceChildren();
      return;
    }
    fillPhoto(figure, photo);
  };

  let shown = -2;
  const show = (eventIndex: number): void => {
    if (eventIndex === shown) return;
    const firstRender = shown === -2;
    shown = eventIndex;
    const event = index.events[eventIndex];

    if (event) {
      const seconds = index.seconds[eventIndex] ?? 0;
      title.textContent = event.title;
      const date = event.utc ? new Date(event.utc) : index.utcAt(seconds);
      time.replaceChildren(
        el('span', 'card__met', formatElapsed(seconds)),
        ` ${isBeforeLiftoff(seconds) ? copy.card.beforeLiftoff : copy.card.afterLiftoff}`,
      );
      if (date && !Number.isNaN(date.getTime())) {
        time.append(el('span', 'card__utc', formatUtc(date)));
      }
      line.textContent = event.text.short;
      short.textContent = event.text.short;
      renderPhoto(event);
      renderAudio(event);
      renderTryIt(event);

      const moreParts: HTMLElement[] = [];
      if (event.text.more) moreParts.push(el('p', 'card__more-text', event.text.more));
      more.replaceChildren(...moreParts);
      moreToggle.hidden = moreParts.length === 0;
      more.hidden = moreParts.length === 0 || !moreOpen;
      sources.replaceChildren(sourcesBlock(event.citations, event.discrepancy));
    } else {
      // Before the first event: show what the mission is.
      const mission = index.mission;
      title.textContent = mission.name;
      time.textContent = missionDates(mission);
      line.textContent = mission.summary.text.short;
      short.textContent = mission.summary.text.short;
      renderPhoto(undefined);
      renderAudio(undefined);
      renderTryIt(undefined);
      more.replaceChildren();
      moreToggle.hidden = true;
      more.hidden = true;
      sources.replaceChildren(sourcesBlock(mission.summary.citations));
    }

    previous.disabled = eventIndex <= 0;
    next.disabled = eventIndex >= index.events.length - 1;
    // Stepping to the first or last event disables the button just pressed;
    // keep keyboard focus on the one that can still be used.
    if (document.activeElement === next && next.disabled && !previous.disabled) previous.focus();
    if (document.activeElement === previous && previous.disabled && !next.disabled) next.focus();

    if (!firstRender && !reducedMotion()) {
      card.animate(
        [
          { opacity: 0.35, transform: 'translateY(3px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
    }
  };

  return {
    show,
    get shown() {
      return shown;
    },
    setTourMode(touring) {
      nav.hidden = touring;
    },
    setHidden(hidden) {
      card.hidden = hidden;
      if (hidden) player?.stop();
    },
    setTryItAllowed(allowed) {
      tryAllowed = allowed;
      tryRow.hidden = !tryTarget || !tryAllowed;
    },
    get tryItButton() {
      return tryRow.hidden ? null : tryButton;
    },
  };
}
