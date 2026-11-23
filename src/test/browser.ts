/**
 * The few browser features jsdom does not have, filled in for the interface
 * tests. Each one stands in for the browser at its edge, and does as little
 * as it can: nothing here knows about the site.
 *
 * - Dialogs: show, showModal, and close, with their "close" and "cancel"
 *   events, and Escape closing the top modal dialog.
 * - Media queries (matchMedia): a phone-sized screen with no preference for
 *   reduced motion, unless a test asks for another (see setScreen).
 * - ResizeObserver: nothing is ever laid out in jsdom, so it never calls back.
 * - Element.animate and Element.scrollBy: accepted and ignored.
 * - Sound (HTMLMediaElement): play, pause, and load, driven by the test
 *   through `sound`.
 * - Leaving the page (location.assign and reload): recorded in `navigation`
 *   instead of loading anything.
 *
 * setup.ts installs them once per test file and resets them after each test.
 */

/* Dialogs ----------------------------------------------------------- */

/** Modal dialogs, newest last. Escape closes the last one. */
const modals: HTMLDialogElement[] = [];

function invalidState(message: string): DOMException {
  return new DOMException(message, 'InvalidStateError');
}

function installDialogs(): void {
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement): void {
    if (this.open) return;
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement): void {
    if (this.open && modals.includes(this)) return;
    if (this.open) throw invalidState('The dialog is already open as a non-modal dialog.');
    this.setAttribute('open', '');
    modals.push(this);
  };
  // The browser fires "close" a moment later; the site never waits for it, so it fires at once here.
  HTMLDialogElement.prototype.close = function close(
    this: HTMLDialogElement,
    returnValue?: string,
  ): void {
    if (!this.open) return;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.removeAttribute('open');
    const at = modals.indexOf(this);
    if (at >= 0) modals.splice(at, 1);
    this.dispatchEvent(new Event('close'));
  };
  // Escape asks the top modal dialog to cancel, after the page's own key handlers have had their turn.
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const top = modals[modals.length - 1];
    if (!top) return;
    const cancel = new Event('cancel', { cancelable: true });
    if (top.dispatchEvent(cancel)) top.close();
  });
}

/** Close every open dialog, firing "close" so the page can tidy up, as leaving it would. */
export function closeAllDialogs(): void {
  for (const dialog of document.querySelectorAll('dialog')) dialog.close();
  modals.length = 0;
}

/* Media queries ----------------------------------------------------- */

export interface ScreenSettings {
  /** The wide layout (a laptop, or a phone on its side): the card floats at the bottom, "Tell me more" at the side. */
  wide: boolean;
  /** The visitor has asked the system to reduce motion. */
  reducedMotion: boolean;
}

const PHONE: ScreenSettings = { wide: false, reducedMotion: false };
let settings: ScreenSettings = { ...PHONE };

/** Every media query list handed out, so each can hear when its answer changes. */
const lists = new Set<FakeMediaQueryList>();

function matchesQuery(query: string): boolean {
  if (query.includes('prefers-reduced-motion: reduce')) return settings.reducedMotion;
  if (query.includes('min-width')) return settings.wide;
  return false;
}

class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media: string;
  onchange: MediaQueryList['onchange'] = null;
  private answer: boolean;

  constructor(media: string) {
    super();
    this.media = media;
    this.answer = matchesQuery(media);
  }

  get matches(): boolean {
    return this.answer;
  }

  /** Called when the screen changes: tell listeners if this query's answer did. */
  recheck(): void {
    const next = matchesQuery(this.media);
    if (next === this.answer) return;
    this.answer = next;
    const event = new Event('change');
    Object.defineProperty(event, 'matches', { value: next });
    this.dispatchEvent(event);
  }

  addListener(listener: (event: Event) => void): void {
    this.addEventListener('change', listener);
  }

  removeListener(listener: (event: Event) => void): void {
    this.removeEventListener('change', listener);
  }
}

/** Change the screen the page is on. Media query lists already handed out hear about it. */
export function setScreen(next: Partial<ScreenSettings>): void {
  settings = { ...settings, ...next };
  for (const list of lists) list.recheck();
}

function installMediaQueries(): void {
  window.matchMedia = (query: string): MediaQueryList => {
    const list = new FakeMediaQueryList(query);
    lists.add(list);
    return list;
  };
}

/* Layout ------------------------------------------------------------ */

class InertResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** An animation that is over as soon as it starts: jsdom draws nothing, so nothing moves. */
class InertAnimation extends EventTarget implements Animation {
  currentTime: CSSNumberish | null = null;
  effect: AnimationEffect | null = null;
  readonly finished: Promise<Animation> = Promise.resolve(this);
  id = '';
  oncancel: Animation['oncancel'] = null;
  onfinish: Animation['onfinish'] = null;
  onremove: Animation['onremove'] = null;
  readonly overallProgress: number | null = null;
  readonly pending = false;
  readonly playState: AnimationPlayState = 'finished';
  playbackRate = 1;
  readonly ready: Promise<Animation> = Promise.resolve(this);
  readonly replaceState: AnimationReplaceState = 'active';
  startTime: CSSNumberish | null = null;
  timeline: AnimationTimeline | null = null;
  cancel(): void {}
  commitStyles(): void {}
  finish(): void {}
  pause(): void {}
  persist(): void {}
  play(): void {}
  reverse(): void {}
  updatePlaybackRate(): void {}
}

function installLayout(): void {
  window.ResizeObserver = InertResizeObserver;
  Element.prototype.animate = function animate(): Animation {
    return new InertAnimation();
  };
  Element.prototype.scrollBy = function scrollBy(): void {};
}

/* Sound ------------------------------------------------------------- */

interface PendingPlay {
  media: HTMLMediaElement;
  resolve(): void;
  reject(error: DOMException): void;
}

let pending: PendingPlay | null = null;
let current: HTMLMediaElement | null = null;

function abort(): void {
  pending?.reject(new DOMException('The play() request was interrupted.', 'AbortError'));
  pending = null;
}

function requireCurrent(): HTMLMediaElement {
  if (!current) throw new Error('No recording has been asked to play.');
  return current;
}

/**
 * The speakers. A recording asked to play waits here until the test says
 * how the file went: it starts, plays on, ends, or does not load.
 */
export const sound = {
  /** The file has loaded and the recording can be heard. */
  starts(): void {
    const media = requireCurrent();
    pending?.resolve();
    pending = null;
    media.dispatchEvent(new Event('playing'));
  },
  /** The recording has played up to this many seconds. */
  reaches(seconds: number): void {
    const media = requireCurrent();
    media.currentTime = seconds;
    media.dispatchEvent(new Event('timeupdate'));
  },
  /** The recording has played to its end. */
  ends(): void {
    requireCurrent().dispatchEvent(new Event('ended'));
  },
  /** The file did not load (for example, the connection dropped). */
  fails(): void {
    const media = requireCurrent();
    media.dispatchEvent(new Event('error'));
    pending?.reject(new DOMException('The file could not be loaded.', 'NotSupportedError'));
    pending = null;
  },
};

function installSound(): void {
  HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement): Promise<void> {
    current = this;
    return new Promise<void>((resolve, reject) => {
      pending = { media: this, resolve, reject };
    });
  };
  HTMLMediaElement.prototype.pause = function pause(this: HTMLMediaElement): void {
    if (pending?.media === this) abort();
    // The browser tells the page a moment later, as it does for a real pause.
    queueMicrotask(() => this.dispatchEvent(new Event('pause')));
  };
  HTMLMediaElement.prototype.load = function load(this: HTMLMediaElement): void {
    if (pending?.media === this) abort();
  };
}

/* Leaving the page -------------------------------------------------- */

/** Where the page asked to go. Nothing is loaded; the test reads it here. */
export const navigation = {
  /** The last address the page asked to open, or null. */
  address: null as string | null,
  /** True once the page has asked to reload. */
  reloaded: false,
};

function installNavigation(): void {
  const real = window.location;
  const location = {
    get href() {
      return real.href;
    },
    get origin() {
      return real.origin;
    },
    get pathname() {
      return real.pathname;
    },
    get search() {
      return real.search;
    },
    get hash() {
      return real.hash;
    },
    assign(url: string | URL) {
      navigation.address = String(url);
    },
    replace(url: string | URL) {
      navigation.address = String(url);
    },
    reload() {
      navigation.reloaded = true;
    },
    toString() {
      return real.href;
    },
  };
  Object.defineProperty(window, 'location', { configurable: true, get: () => location });
}

/* Setup and reset --------------------------------------------------- */

let installed = false;

/** Fill in what jsdom lacks. Safe to call more than once. */
export function installBrowser(): void {
  if (installed) return;
  installed = true;
  installDialogs();
  installMediaQueries();
  installLayout();
  installSound();
  installNavigation();
}

/** Put the browser back as a fresh page has it: a phone screen, nothing playing, nowhere asked to go. */
export function resetBrowser(): void {
  closeAllDialogs();
  settings = { ...PHONE };
  lists.clear();
  pending = null;
  current = null;
  navigation.address = null;
  navigation.reloaded = false;
}
