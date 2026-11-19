import { copy } from '../content/copy';
import type { MissionEvent } from '../content/types';
import { sourcesBlock } from './citations';
import { button, byId, el } from './dom';
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
}

export interface EventCardOptions {
  index: MissionIndex;
  /** Asked to step to the previous (-1) or next (+1) event. */
  onStep(step: 1 | -1): void;
  reducedMotion(): boolean;
}

/**
 * The event card: the most recent event's title and time, its short text,
 * "Tell me more", its photo, and its sources.
 */
export function setUpEventCard({ index, onStep, reducedMotion }: EventCardOptions): EventCard {
  const card = byId('card', HTMLElement);

  // Built once; the content changes with each event.
  const head = el('header', 'card__head');
  const titles = el('div', 'card__titles');
  const title = el('h3', 'card__title');
  title.id = 'card-title';
  const time = el('p', 'card__time');
  titles.append(title, time);

  const nav = el('div', 'card__nav');
  const previous = button('icon-button');
  previous.setAttribute('aria-label', copy.card.previous);
  previous.append(icon('previous'));
  const next = button('icon-button');
  next.setAttribute('aria-label', copy.card.next);
  next.append(icon('next'));
  nav.append(previous, next);
  head.append(titles, nav);

  const line = el('p', 'card__line');
  const body = el('div', 'card__body');
  body.id = 'card-body';
  const short = el('p', 'card__short');
  const figure = el('figure', 'card__photo');
  const moreToggle = button('disclosure');
  moreToggle.setAttribute('aria-expanded', 'false');
  moreToggle.setAttribute('aria-controls', 'card-more');
  const moreLabel = el('span', 'disclosure__label', copy.card.tellMore);
  moreToggle.append(moreLabel, icon('chevron-down', 'icon disclosure__icon'));
  const more = el('div', 'card__more');
  more.id = 'card-more';
  more.hidden = true;
  const sources = el('div', 'card__sources');
  body.append(short, moreToggle, more, figure, sources);
  card.append(head, line, body);

  let moreOpen = false;
  const setMoreOpen = (open: boolean): void => {
    moreOpen = open;
    moreToggle.setAttribute('aria-expanded', String(open));
    moreLabel.textContent = open ? copy.card.tellLess : copy.card.tellMore;
    more.hidden = !open;
  };
  moreToggle.addEventListener('click', () => setMoreOpen(!moreOpen));
  previous.addEventListener('click', () => onStep(-1));
  next.addEventListener('click', () => onStep(1));

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
      more.replaceChildren();
      moreToggle.hidden = true;
      more.hidden = true;
      sources.replaceChildren(sourcesBlock(mission.summary.citations));
    }

    previous.disabled = eventIndex <= 0;
    next.disabled = eventIndex >= index.events.length - 1;

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
    },
  };
}
