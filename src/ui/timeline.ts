import type { Player } from '../app/contract';
import { copy } from '../content/copy';
import { button, byId, el, setText } from './dom';
import { flightDay, formatElapsed, formatMonthDay, formatTimeOfDay, isBeforeLiftoff, speakMissionTime } from './format';
import { icon } from './icons';
import type { MissionIndex } from './mission-index';

const SPEEDS: ReadonlyArray<{ rate: number; label: string }> = [
  { rate: 0.5, label: '½×' },
  { rate: 1, label: '1×' },
  { rate: 2, label: '2×' },
  { rate: 4, label: '4×' },
];

/** Arrow keys move the scrubber by this share of the whole story. */
const ARROW_STEP = 1 / 100;

export interface Timeline {
  /** Lock the controls while the guided tour drives the clock. */
  setLocked(locked: boolean): void;
}

/**
 * Play and pause, the scrubber (in story time, with a tick for every event
 * and labeled chapters), the speed choice, and the mission clock.
 */
export function setUpTimeline(player: Player, index: MissionIndex): Timeline {
  const region = byId('timeline', HTMLElement);
  const play = byId('play', HTMLButtonElement);
  const met = byId('clock-met', HTMLSpanElement);
  const since = byId('clock-since', HTMLSpanElement);
  const day = byId('clock-day', HTMLSpanElement);
  const utc = byId('clock-utc', HTMLSpanElement);
  let shownUtc = '';
  const scrubber = byId('scrubber', HTMLDivElement);
  const ticks = byId('scrubber-ticks', HTMLDivElement);
  const input = byId('scrubber-input', HTMLInputElement);
  const chapterSelect = byId('chapter-select', HTMLSelectElement);
  const chapterRow = byId('chapters', HTMLDivElement);
  const speedSelect = byId('speed-select', HTMLSelectElement);

  const story = player.story;
  const fraction = (seconds: number): number =>
    story.duration > 0 ? Math.min(1, Math.max(0, story.toStory(seconds) / story.duration)) : 0;

  /* Play and pause ------------------------------------------------- */
  const playIcon = icon('play', 'icon icon--play');
  const pauseIcon = icon('pause', 'icon icon--pause');
  play.append(playIcon, pauseIcon);
  play.addEventListener('click', () => (player.playing ? player.pause() : player.play()));

  /* Scrubber: ticks for events, taller ones for chapter starts ----- */
  input.max = String(story.duration);
  const eventTicks = index.events.map((event, i) => {
    const tick = el('span', event.inTour ? 'tick tick--tour' : 'tick');
    tick.style.setProperty('--at', String(fraction(index.seconds[i] ?? 0)));
    return tick;
  });
  const chapterTicks = index.chapters.map((start) => {
    const tick = el('span', 'tick tick--chapter');
    tick.style.setProperty('--at', String(fraction(start.seconds)));
    return tick;
  });
  ticks.replaceChildren(...chapterTicks, ...eventTicks);

  let dragging = false;
  let resumeAfterDrag = false;
  input.addEventListener('pointerdown', () => {
    dragging = true;
    resumeAfterDrag = player.playing;
    player.pause();
  });
  const endDrag = (): void => {
    if (!dragging) return;
    dragging = false;
    if (resumeAfterDrag) player.play();
  };
  input.addEventListener('pointerup', endDrag);
  input.addEventListener('pointercancel', endDrag);
  input.addEventListener('change', endDrag);
  input.addEventListener('input', () => player.seekStory(Number(input.value)));

  const seekEvent = (step: 1 | -1): void => {
    const current = index.eventAt(player.time);
    const target = Math.min(index.events.length - 1, Math.max(0, current + step));
    const seconds = index.seconds[target];
    if (seconds !== undefined) player.seek(seconds);
  };
  input.addEventListener('keydown', (event) => {
    const step = story.duration * ARROW_STEP;
    const actions: Record<string, () => void> = {
      ArrowRight: () => player.seekStory(player.storyTime + step),
      ArrowUp: () => player.seekStory(player.storyTime + step),
      ArrowLeft: () => player.seekStory(player.storyTime - step),
      ArrowDown: () => player.seekStory(player.storyTime - step),
      PageUp: () => seekEvent(1),
      PageDown: () => seekEvent(-1),
      Home: () => player.seekStory(0),
      End: () => player.seekStory(story.duration),
    };
    const action = actions[event.key];
    if (!action || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    action();
  });

  /* Chapters: buttons along the ruler (wide), a menu (narrow) ------ */
  const chapterButtons = index.chapters.map((start, i) => {
    const next = index.chapters[i + 1];
    const from = fraction(start.seconds);
    const to = next ? fraction(next.seconds) : 1;
    // The label cuts itself off, not the button, so the button's taller tap area is not clipped.
    const chapterButton = button('chapters__item');
    chapterButton.append(el('span', 'chapters__label', start.chapter.title));
    // The full name, for when a short chapter cuts its label off.
    chapterButton.title = start.chapter.title;
    chapterButton.style.setProperty('--at', String(from));
    chapterButton.style.setProperty('--span', String(Math.max(0, to - from)));
    chapterButton.addEventListener('click', () => player.seek(start.seconds));
    return chapterButton;
  });
  chapterRow.replaceChildren(...chapterButtons);

  chapterSelect.replaceChildren(
    ...index.chapters.map((start, i) => {
      const option = el('option', undefined, start.chapter.title);
      option.value = String(i);
      return option;
    }),
  );
  chapterSelect.addEventListener('change', () => {
    const start = index.chapters[Number(chapterSelect.value)];
    if (start) player.seek(start.seconds);
  });

  /* Speed ---------------------------------------------------------- */
  speedSelect.replaceChildren(
    ...SPEEDS.map((speed) => {
      const option = el('option', undefined, speed.label);
      option.value = String(speed.rate);
      return option;
    }),
  );
  speedSelect.addEventListener('change', () => player.setRate(Number(speedSelect.value)));

  /* Keep everything in step with the clock -------------------------- */
  let shownEvent = -2;
  let shownChapter = -1;

  // A short chapter has no room for its name. A name that does not fit is
  // hidden (the button stays, and its tick still marks the spot), and the
  // current chapter grows over its neighbors so it can always be read,
  // without running past the row's end. A chapter with keyboard focus does
  // the same while it has focus, so a focused button is never a blank box.
  let focusedChapter = -1;
  const fitCurrentChapter = (): void => {
    const featured = focusedChapter >= 0 ? focusedChapter : shownChapter;
    for (const chapterButton of chapterButtons) {
      chapterButton.style.removeProperty('--grow');
      chapterButton.style.removeProperty('--shift');
      chapterButton.classList.remove('chapters__item--hidden', 'chapters__item--featured');
    }
    const current = chapterButtons[featured];
    if (!current || current.offsetParent === null) return;
    current.classList.add('chapters__item--featured');

    // Measure every name before changing anything, so nothing is laid out twice.
    // The natural width is the label's full text plus the padding before it.
    const rowWidth = chapterRow.clientWidth;
    const boxes = chapterButtons.map((chapterButton) => ({
      left: chapterButton.offsetLeft,
      width: chapterButton.clientWidth,
      natural:
        (chapterButton.firstElementChild?.scrollWidth ?? 0) + parseFloat(getComputedStyle(chapterButton).paddingLeft),
    }));
    const box = boxes[featured]!;
    const grows = box.natural > box.width + 1;
    // The measured width leaves out the padding after the text, so add it back.
    const grown = Math.ceil(box.natural + parseFloat(getComputedStyle(current).paddingRight)) + 1;
    const shift = grows ? Math.min(0, rowWidth - (box.left + grown)) : 0;
    const currentLeft = box.left + shift;
    const currentRight = currentLeft + (grows ? grown : box.width);

    chapterButtons.forEach((chapterButton, i) => {
      if (i === featured) return;
      const other = boxes[i]!;
      const cutOff = other.natural > other.width + 1;
      const covered = grows && other.left < currentRight && other.left + other.width > currentLeft;
      chapterButton.classList.toggle('chapters__item--hidden', cutOff || covered);
    });
    if (grows) {
      current.style.setProperty('--grow', `${grown}px`);
      current.style.setProperty('--shift', `${shift}px`);
    }
  };
  new ResizeObserver(fitCurrentChapter).observe(chapterRow);
  chapterRow.addEventListener('focusin', (event) => {
    focusedChapter = chapterButtons.indexOf(event.target as HTMLButtonElement);
    fitCurrentChapter();
  });
  chapterRow.addEventListener('focusout', () => {
    focusedChapter = -1;
    fitCurrentChapter();
  });
  let lastValueText = '';
  let lastValueTextAt = 0;

  const update = (): void => {
    const time = player.time;
    const progress = story.duration > 0 ? player.storyTime / story.duration : 0;
    scrubber.style.setProperty('--progress', String(progress));
    if (!dragging) input.value = String(player.storyTime);

    play.setAttribute('aria-label', player.playing ? copy.timeline.pause : copy.timeline.play);
    play.classList.toggle('play--playing', player.playing);

    setText(met, formatElapsed(time));
    setText(since, isBeforeLiftoff(time) ? copy.timeline.beforeLiftoff : copy.timeline.sinceLiftoff);
    // On a long flight, which day it is means more than the hours alone.
    const dayNumber = index.countsDays ? flightDay(time) : null;
    day.hidden = dayNumber === null;
    setText(day, dayNumber === null ? '' : copy.timeline.day(dayNumber));
    // "Jul 20, 1969 20:17:39 UTC". The year has its own span so a phone can
    // leave it out to make room for the day (the header shows the year).
    const date = index.utcAt(time);
    const utcKey = date ? `${formatMonthDay(date)}|${date.getUTCFullYear()}|${formatTimeOfDay(date)}` : '';
    if (utcKey !== shownUtc) {
      shownUtc = utcKey;
      if (date) {
        utc.replaceChildren(
          formatMonthDay(date),
          el('span', 'clock__year', `, ${date.getUTCFullYear()}`),
          ` ${formatTimeOfDay(date)} UTC`,
        );
      } else {
        utc.replaceChildren();
      }
    }

    const current = index.eventAt(time);
    if (current !== shownEvent) {
      eventTicks[shownEvent]?.classList.remove('tick--current');
      eventTicks[current]?.classList.add('tick--current');
      shownEvent = current;
    }

    const chapter = index.chapterAt(time);
    if (chapter !== shownChapter) {
      chapterButtons[shownChapter]?.removeAttribute('aria-current');
      chapterButtons[chapter]?.setAttribute('aria-current', 'step');
      if (document.activeElement !== chapterSelect) chapterSelect.value = String(chapter);
      shownChapter = chapter;
      fitCurrentChapter();
    }

    // Describe the position for screen readers, but not every frame while playing.
    const now = performance.now();
    if (!player.playing || now - lastValueTextAt > 1000) {
      const event = index.events[current];
      const spoken = speakMissionTime(time, index.countsDays);
      const text = event ? `${spoken}. ${event.title}` : spoken;
      if (text !== lastValueText) {
        input.setAttribute('aria-valuetext', text);
        lastValueText = text;
      }
      lastValueTextAt = now;
    }

    speedSelect.value = String(player.rate);
  };
  player.subscribe(update);
  update();

  const controls: Array<HTMLButtonElement | HTMLInputElement | HTMLSelectElement> = [
    play,
    input,
    chapterSelect,
    speedSelect,
    ...chapterButtons,
  ];
  return {
    setLocked(locked) {
      region.classList.toggle('timeline--locked', locked);
      region.title = locked ? copy.timeline.lockedDuringTour : '';
      for (const control of controls) control.disabled = locked;
      if (locked) endDrag();
    },
  };
}
