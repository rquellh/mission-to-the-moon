import { copy } from '../content/copy';
import type { AudioPlayer } from './audio-player';
import { sourcesList } from './citations';
import { byId, el } from './dom';
import {
  flightDay,
  formatDate,
  formatElapsed,
  formatUtc,
  isBeforeLiftoff,
  missionDates,
} from './format';
import type { MissionIndex } from './mission-index';
import { fillPhoto } from './photo';

export interface Records {
  /**
   * Show a moment: an event by its index in the mission, or the mission
   * itself for -1. `recording` is the player for the event's recording, which
   * the card shares (one recording, two buttons).
   */
  show(eventIndex: number, recording: AudioPlayer | null): void;
  /** Scroll the photo into view, when the moment has one. */
  revealPhoto(): void;
}

export interface RecordsOptions {
  index: MissionIndex;
  reducedMotion(): boolean;
}

/** The date and time of an event: its own, when the sources give one, or the launch time plus the mission time. */
function dateOf(index: MissionIndex, eventIndex: number): Date | null {
  const event = index.events[eventIndex];
  if (!event) return null;
  const date = event.utc ? new Date(event.utc) : index.utcAt(index.seconds[eventIndex] ?? 0);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * The small line over a moment's title: its chapter, the day of the flight
 * (on flights long enough to count days, once past liftoff), and its date,
 * for example "Landing · Day 5 · July 20, 1969". Before the first event,
 * the mission's dates.
 */
export function momentEyebrow(index: MissionIndex, eventIndex: number): string {
  const event = index.events[eventIndex];
  if (!event) return missionDates(index.mission);
  const parts: string[] = [];
  const chapter = index.chapterOf(event);
  if (chapter) parts.push(chapter.title);
  const day = index.countsDays ? flightDay(index.seconds[eventIndex] ?? 0) : null;
  if (day !== null) parts.push(copy.timeline.day(day));
  const date = dateOf(index, eventIndex);
  if (date) parts.push(formatDate(date));
  return parts.join(' · ');
}

/** One part of the records: the section to hide while the moment has nothing for it, and the box its content goes in. */
interface RecordsPart {
  section: HTMLDivElement;
  content: HTMLDivElement;
}

/** A part of the records: a small heading over its content. Hidden while the moment has nothing for it. */
function part(id: string, title: string): RecordsPart {
  const section = el('div', 'records__section');
  section.setAttribute('data-testid', `records-${id}`);
  const heading = el('h4', 'records__heading', title);
  heading.id = `records-${id}-title`;
  const content = el('div', 'records__content');
  section.append(heading, content);
  return { section, content };
}

/**
 * "Tell me more": the records of the moment on the card. A head with the
 * moment's chapter, day, and date, its title, and its exact time, then the
 * parts the moment has (the full story, what they said, the photo) and
 * always its sources. The reference links at the end open the mission's
 * own pages. Opening and closing belong to the card's door (see dock.ts).
 */
export function setUpRecords({ index, reducedMotion }: RecordsOptions): Records {
  const mission = index.mission;
  const eyebrow = byId('records-eyebrow', HTMLParagraphElement);
  const title = byId('records-title', HTMLHeadingElement);
  const time = byId('records-time', HTMLParagraphElement);
  const body = byId('records-body', HTMLDivElement);
  const scroll = byId('records-scroll', HTMLDivElement);

  // The short text again, for a phone, where the card's own copy steps aside while this is open.
  const short = el('p', 'records__short');
  const story = part('story', copy.records.fullStory);
  const storyText = el('p', 'records__story');
  story.content.append(storyText);
  const said = part('recording', copy.audio.transcript);
  const photo = part('photo', copy.records.photo);
  const figure = el('figure', 'card__photo records__photo');
  photo.content.append(figure);
  const sources = part('sources', copy.card.sources);
  body.replaceChildren(short, story.section, said.section, photo.section, sources.section);

  // The reference links: the mission's own pages, the same for every moment.
  byId('records-about-name', HTMLSpanElement).textContent =
    `${copy.about.titlePrefix} ${mission.name}`;
  byId('records-about-line', HTMLSpanElement).textContent = copy.records.aboutLine(
    Boolean(mission.callSigns?.value.length),
  );
  byId('records-how-drawn-name', HTMLSpanElement).textContent = copy.howDrawn.title;
  byId('records-credits-name', HTMLSpanElement).textContent = copy.records.credits;

  const show = (eventIndex: number, recording: AudioPlayer | null): void => {
    const event = index.events[eventIndex];
    eyebrow.textContent = momentEyebrow(index, eventIndex);
    title.textContent = event ? event.title : mission.name;
    if (event) {
      const seconds = index.seconds[eventIndex] ?? 0;
      time.replaceChildren(
        el('span', 'records__met', formatElapsed(seconds)),
        ` ${isBeforeLiftoff(seconds) ? copy.card.beforeLiftoff : copy.card.afterLiftoff}`,
      );
      const date = dateOf(index, eventIndex);
      if (date) time.append(el('span', 'records__utc', formatUtc(date)));
    } else {
      time.replaceChildren();
    }
    time.hidden = !event;

    const fact = event ?? mission.summary;
    short.textContent = fact.text.short;
    storyText.textContent = fact.text.more ?? '';
    story.section.hidden = !fact.text.more;

    said.content.replaceChildren(...(recording ? [recording.element] : []));
    said.section.hidden = !recording;

    if (event?.photo) {
      fillPhoto(figure, event.photo);
      // A photo that does not load hides its figure (see fillPhoto); its part goes with it.
      figure.querySelector('img')?.addEventListener('error', () => {
        photo.section.hidden = true;
      });
    } else {
      figure.replaceChildren();
    }
    photo.section.hidden = !event?.photo;

    sources.content.replaceChildren(...sourcesList(fact.citations, fact.discrepancy));
  };

  return {
    show,
    revealPhoto() {
      if (photo.section.hidden) return;
      // The body scrolls on a wide screen; on a phone the whole panel under the head does.
      const scroller = [body, scroll].find((box) => box.scrollHeight > box.clientHeight);
      if (!scroller) return;
      const by =
        photo.section.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12;
      scroller.scrollBy({ top: by, behavior: reducedMotion() ? 'auto' : 'smooth' });
    },
  };
}
