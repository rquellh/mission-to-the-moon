import { copy } from '../content/copy';
import type { AudioClip } from '../content/types';
import { externalLink } from './citations';
import { button, el, hiddenText } from './dom';
import { icon } from './icons';
import { mediaUrl } from './photo';

export interface AudioPlayer {
  /** The whole player, for "Tell me more": Play and Pause with the length and progress, the words, and the credit. */
  readonly element: HTMLElement;
  /** A second Play and Pause for the same recording, for the card: "Listen" (with its length on a wide screen). */
  readonly button: HTMLElement;
  /** Stop and go back to the start. */
  stop(): void;
  /** Stop for good and let go of the file. */
  dispose(): void;
}

/** "0:12", "1:05". */
function clockText(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** "12 seconds", "1 minute 5 seconds". */
function spokenLength(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (!minutes) return copy.time.seconds(rest);
  return rest
    ? `${copy.time.minutes(minutes)} ${copy.time.seconds(rest)}`
    : copy.time.minutes(minutes);
}

/** Only one recording plays at a time, across the whole page. */
let playingNow: { pause(): void } | null = null;

/** Pause whatever recording is playing, for example when something covers the card. */
export function pauseAllAudio(): void {
  playingNow?.pause();
}

// A recording should not keep talking from a tab no one is looking at.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseAllAudio();
});

/** What a button says while the recording is stopped or paused, and while it loads. */
interface Words {
  readonly play: string;
  readonly playLabel: (length: string) => string;
  readonly loading: string;
}

/** The player in "Tell me more" says what it is and that it is loading. */
const fullWords: Words = {
  play: copy.audio.play,
  playLabel: copy.audio.playLabel,
  loading: copy.audio.loading,
};

/** The card's button is short. Once pressed it says Pause, which is what pressing it again does. */
const cardWords: Words = {
  play: copy.audio.listen,
  playLabel: copy.audio.listenLabel,
  loading: copy.audio.pause,
};

/** One Play and Pause button, with its words, its time, and a status beside it that says what happened. */
interface Control {
  readonly words: Words;
  readonly toggle: HTMLButtonElement;
  readonly label: HTMLSpanElement;
  readonly time: HTMLSpanElement;
  readonly status: HTMLParagraphElement;
}

function makeControl(className: string, words: Words): Control {
  const toggle = button(className);
  const label = el('span', 'audio__label', words.play);
  // The length is in the button's spoken label, so its digits are not read twice.
  const time = el('span', 'audio__time');
  time.setAttribute('aria-hidden', 'true');
  toggle.append(icon('play', 'icon icon--play'), icon('pause', 'icon icon--pause'), label, time);
  // State changes are spoken here, next to the button that caused them.
  const status = el('p', 'visually-hidden');
  status.setAttribute('role', 'status');
  return { words, toggle, label, time, status };
}

/**
 * A recording with two ways to play it that share one state: the whole
 * player (one Play/Pause button with the length, the words always written
 * out, speaker then words, and the credit with a link to the original) and
 * a single "Listen" button for the card. Starting it from
 * either shows it playing in both. It never plays by itself, and the file
 * is fetched only when it is first asked to play. It stops when neither of
 * its buttons can be seen (the card is hidden and "Tell me more" is closed).
 */
export function createAudioPlayer(clip: AudioClip): AudioPlayer {
  const root = el('section', 'audio');
  root.setAttribute('aria-label', copy.audio.label);

  const full = makeControl('button audio__toggle', fullWords);
  const bar = el('span', 'audio__bar');
  bar.setAttribute('aria-hidden', 'true');
  bar.append(el('span', 'audio__played'));
  const controls = el('div', 'audio__controls');
  controls.append(full.toggle, bar);

  const transcript = el('ul', 'audio__transcript');
  transcript.setAttribute('aria-label', copy.audio.transcript);
  for (const line of clip.transcript) {
    const item = el('li', 'audio__line');
    item.append(el('span', 'audio__speaker', line.speaker), hiddenText(':'), ' ', line.words);
    transcript.append(item);
  }

  // A short note about the recording, when it has one (for example, a stumble in it).
  const note = clip.note ? el('p', 'audio__note', clip.note) : null;

  const credit = el('p', 'audio__credit');
  credit.append(
    `${copy.audio.credit} ${clip.credit}. `,
    externalLink(clip.sourceUrl, copy.card.original),
  );
  root.append(controls, transcript, ...(note ? [note] : []), credit, full.status);

  // The card's button: the same state, with no bar or words of its own.
  const mini = makeControl('button audio-mini__toggle', cardWords);
  const miniRoot = el('div', 'audio-mini');
  miniRoot.append(mini.toggle, mini.status);

  type State = 'idle' | 'loading' | 'playing' | 'paused' | 'failed';
  let state: State = 'idle';
  let audio: HTMLAudioElement | null = null;
  // The control last pressed speaks what happens next.
  let speaker: Control = full;

  const render = (): void => {
    const on = state === 'loading' || state === 'playing';
    const total = audio && Number.isFinite(audio.duration) ? audio.duration : clip.seconds;
    const at = audio && state !== 'idle' ? audio.currentTime : 0;
    const length = spokenLength(clip.seconds);
    const shownTime =
      state === 'idle' || state === 'failed'
        ? clockText(total)
        : `${clockText(at)} / ${clockText(total)}`;
    root.classList.toggle('audio--on', on);
    miniRoot.classList.toggle('audio--on', on);
    for (const control of [full, mini]) {
      const { words } = control;
      control.label.textContent =
        state === 'loading' ? words.loading : on ? copy.audio.pause : words.play;
      control.toggle.setAttribute(
        'aria-label',
        on ? copy.audio.pauseLabel : words.playLabel(length),
      );
      control.time.textContent = shownTime;
    }
    bar.style.setProperty('--progress', String(total > 0 ? Math.min(1, at / total) : 0));
  };
  const say = (text: string): void => {
    for (const control of [full, mini])
      control.status.textContent = control === speaker ? text : '';
  };

  const self = {
    pause(): void {
      if (state !== 'loading' && state !== 'playing') return;
      audio?.pause();
      state = 'paused';
      render();
      say(copy.audio.paused);
    },
  };

  /** The audio element, made on first use so nothing is fetched before Play. */
  const element = (): HTMLAudioElement => {
    if (audio) return audio;
    const made = new Audio();
    made.preload = 'auto';
    // Events from an element this player has let go of are ignored.
    const mine = (): boolean => audio === made;
    made.addEventListener('playing', () => {
      if (!mine() || (state !== 'loading' && state !== 'playing')) return;
      state = 'playing';
      render();
      say(copy.audio.playing);
    });
    made.addEventListener('timeupdate', () => {
      if (mine()) render();
    });
    // Paused from outside, for example by the system's media keys.
    made.addEventListener('pause', () => {
      if (mine() && state === 'playing' && !made.ended) self.pause();
    });
    made.addEventListener('ended', () => {
      if (!mine()) return;
      state = 'idle';
      made.currentTime = 0;
      if (playingNow === self) playingNow = null;
      render();
      say(copy.audio.ended);
    });
    made.addEventListener('error', () => {
      if (!mine()) return;
      state = 'failed';
      // Start over with a fresh element next time, in case the network comes back.
      audio = null;
      if (playingNow === self) playingNow = null;
      render();
      say(copy.audio.failed);
    });
    made.src = mediaUrl(clip.src);
    audio = made;
    return made;
  };

  const play = (): void => {
    if (playingNow && playingNow !== self) playingNow.pause();
    playingNow = self;
    const media = element();
    state = 'loading';
    render();
    media.play().catch((error: unknown) => {
      // Pausing before playback starts rejects the promise; that is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (state === 'loading') {
        state = 'failed';
        render();
        say(copy.audio.failed);
      }
    });
  };

  for (const control of [full, mini]) {
    control.toggle.addEventListener('click', () => {
      speaker = control;
      if (state === 'loading' || state === 'playing') self.pause();
      else play();
    });
  }

  const stop = (): void => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (playingNow === self) playingNow = null;
    if (state !== 'failed') state = 'idle';
    render();
  };

  // Neither button can be seen (the card is hidden and "Tell me more" closed): stop.
  const seen = new ResizeObserver(() => {
    const hidden = root.offsetParent === null && miniRoot.offsetParent === null;
    if (hidden && (state === 'loading' || state === 'playing')) stop();
  });
  seen.observe(root);
  seen.observe(miniRoot);

  render();
  return {
    element: root,
    button: miniRoot,
    stop,
    dispose() {
      stop();
      seen.disconnect();
      if (audio) {
        // Let go of the file and stop any download still running.
        const media = audio;
        audio = null;
        media.removeAttribute('src');
        media.load();
      }
    },
  };
}
