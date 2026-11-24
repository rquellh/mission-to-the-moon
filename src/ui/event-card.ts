import { copy } from '../content/copy';
import type { MissionEvent } from '../content/types';
import { createAudioPlayer, type AudioPlayer } from './audio-player';
import { byId, el } from './dom';
import { icon } from './icons';
import type { MissionIndex } from './mission-index';
import { mediaUrl } from './photo';
import { momentEyebrow, type Records } from './records';

export interface EventCard {
  /** Show an event by its index in the mission, or the mission summary for -1. */
  show(eventIndex: number): void;
  /** The event index on show. */
  readonly shown: number;
  /** Hide the moment (for the end of the flight, which takes its place) or show it again. */
  setHidden(hidden: boolean): void;
  /** Allow "Try it" or hide it (it is hidden while the tour travels between stops). */
  setTryItAllowed(allowed: boolean): void;
  /** Offer "Finish" or take it away (it is offered while exploring, once the clock has reached the end). */
  setFinishOffered(offered: boolean): void;
  /** The "Try it" button, while it is showing, so focus can come back to it. */
  readonly tryItButton: HTMLButtonElement | null;
}

export interface EventCardOptions {
  index: MissionIndex;
  /** "Tell me more", which always shows the same moment as the card. */
  records: Records;
  /** Asked to step to the previous (-1) or next (+1) event, from the buttons in Controls. */
  onStep(step: 1 | -1): void;
  reducedMotion(): boolean;
  /** The title of a listed extra by id, or undefined when it is not listed (so no "Try it"). */
  extraTitle(id: string): string | undefined;
  /** "Try it" was pressed on an event. */
  onTryIt(extraId: string, event: MissionEvent, from: HTMLButtonElement): void;
  /** The photo's small picture was pressed: open "Tell me more" at the photo. */
  onPhoto(): void;
  /** "Finish" was pressed: show the end of the flight. */
  onFinish(): void;
}

/**
 * The moment card's story: the moment on the clock, with its chapter, day,
 * and date over its title, and its short text in full. Beside it, the
 * photo's small picture, "Finish" once the clock has reached the end of the
 * flight, "Hear the recording", the "Tell me more" door (named "Sources"
 * when the moment has nothing more than its sources), "Try it" when the
 * event has a hands-on extra, and the photo's credit.
 * It keeps "Tell me more" on the same moment, and the previous and next
 * buttons in Controls in step with it.
 */
export function setUpEventCard(options: EventCardOptions): EventCard {
  const { index, records, onStep, reducedMotion, extraTitle, onTryIt, onPhoto, onFinish } = options;
  const card = byId('card', HTMLElement);
  const eyebrow = byId('card-eyebrow', HTMLParagraphElement);
  const title = byId('card-title', HTMLHeadingElement);
  const short = byId('card-short', HTMLParagraphElement);
  const media = byId('dock-media', HTMLDivElement);
  const doorLabel = byId('records-toggle-label', HTMLSpanElement);
  const tryButton = byId('card-try', HTMLButtonElement);
  const finishButton = byId('card-finish', HTMLButtonElement);
  const credit = byId('card-photo-credit', HTMLParagraphElement);
  const previous = byId('event-previous', HTMLButtonElement);
  const next = byId('event-next', HTMLButtonElement);

  // The photo's small picture. The button says what it does; the picture itself
  // is described where it is shown in full, in "Tell me more".
  const thumb = byId('card-photo', HTMLButtonElement);
  thumb.setAttribute('aria-label', copy.card.seePhoto);
  const thumbImage = el('img', 'card__thumb-image');
  thumbImage.alt = '';
  thumbImage.decoding = 'async';
  thumbImage.addEventListener('error', () => {
    thumb.hidden = true;
  });
  thumb.replaceChildren(thumbImage);
  thumb.addEventListener('click', () => onPhoto());

  previous.setAttribute('aria-label', copy.card.previous);
  previous.replaceChildren(icon('previous'));
  next.setAttribute('aria-label', copy.card.next);
  next.replaceChildren(icon('next'));
  previous.addEventListener('click', () => onStep(-1));
  next.addEventListener('click', () => onStep(1));

  // The last moment stays on the card to be read; "Finish" moves on to the end of the flight when the visitor is ready.
  finishButton.textContent = copy.card.finish;
  finishButton.addEventListener('click', () => onFinish());

  // One recording at a time, for the moment on show. Its card button goes first among the actions, after "Finish".
  let player: AudioPlayer | null = null;
  const renderAudio = (event: MissionEvent | undefined): void => {
    player?.dispose();
    player?.button.remove();
    player = event?.audio ? createAudioPlayer(event.audio) : null;
    if (player) {
      player.button.setAttribute('data-testid', 'event-card-recording');
      finishButton.after(player.button);
    }
  };

  let tryAllowed = true;
  let tryTarget: { extra: string; event: MissionEvent } | null = null;
  const renderTryIt = (event: MissionEvent | undefined): void => {
    const id = event?.handsOn;
    const name = id ? extraTitle(id) : undefined;
    tryTarget = event && id && name ? { extra: id, event } : null;
    if (name) tryButton.textContent = copy.card.tryItLabel(name);
    tryButton.hidden = !tryTarget || !tryAllowed;
  };
  tryButton.addEventListener('click', () => {
    if (tryTarget) onTryIt(tryTarget.extra, tryTarget.event, tryButton);
  });

  const renderPhoto = (event: MissionEvent | undefined): void => {
    const photo = event?.photo;
    if (!photo) {
      thumb.hidden = true;
      thumbImage.removeAttribute('src');
      credit.hidden = true;
      credit.textContent = '';
      return;
    }
    thumbImage.src = mediaUrl(photo.src);
    thumb.hidden = false;
    credit.textContent = `${copy.card.photoCredit} ${photo.credit}`;
    credit.hidden = false;
  };

  let shown = -2;
  const show = (eventIndex: number): void => {
    if (eventIndex === shown) return;
    const firstRender = shown === -2;
    shown = eventIndex;
    const event = index.events[eventIndex];

    // Before the first event, the card shows what the mission is.
    const fact = event ?? index.mission.summary;
    eyebrow.textContent = momentEyebrow(index, eventIndex);
    title.textContent = event ? event.title : index.mission.name;
    short.textContent = fact.text.short;
    renderPhoto(event);
    renderAudio(event);
    renderTryIt(event);
    // With nothing more to tell, the same door holds just the sources, and says so.
    const more = Boolean(fact.text.more || event?.audio || event?.photo);
    doorLabel.textContent = more ? copy.card.tellMore : copy.card.sources;
    records.show(eventIndex, player);

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
    setHidden(hidden) {
      card.hidden = hidden;
      media.hidden = hidden;
      if (hidden) player?.stop();
    },
    setTryItAllowed(allowed) {
      tryAllowed = allowed;
      tryButton.hidden = !tryTarget || !tryAllowed;
    },
    setFinishOffered(offered) {
      finishButton.hidden = !offered;
    },
    get tryItButton() {
      return tryButton.hidden ? null : tryButton;
    },
  };
}
