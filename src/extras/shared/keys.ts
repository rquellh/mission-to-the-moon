/**
 * The keys a flown game listens for, such as the arrows that push a lander
 * or the space bar that drops a stage. One listener on the document handles
 * them all, and leaves a key alone whenever it belongs to something else:
 * the game is not running, Alt, Control or Meta is held (a browser or system
 * shortcut), or the person is typing in a field. A key the game takes has its
 * default stopped, since the arrows would otherwise scroll the page, and a
 * key held down counts as one press.
 *
 * A key that also works a focused control can say so (`yieldsToControls`):
 * the space bar presses a focused button, so while focus is on a button, a
 * link, a summary or anything with role="button", that key is not touched at
 * all and the control gets its normal press.
 *
 * The docking and landing games still carry their own copies of this
 * listener (in their index.ts) until they are moved over to this one.
 */

export interface GameKey {
  /** `KeyboardEvent.key`, for example 'ArrowLeft' or ' ' for the space bar. */
  key: string;
  press: () => void;
  /**
   * For a key that also works a focused control (the space bar presses a focused button): when
   * true, the key is left alone while focus is on a button, a link, a summary or anything with
   * role="button", so that control gets its normal press.
   */
  yieldsToControls?: boolean;
}

/** Where a key is typed into the page rather than played. */
const FIELDS = 'input, textarea, select';

/** What a key such as the space bar presses by itself when it has the focus. */
const CONTROLS = 'button, a[href], summary, [role="button"]';

/**
 * Listens on the document for a game's keys until `signal` aborts. A key is ignored unless
 * `active()` is true, when Alt, Control or Meta is held, and while typing in a field. A handled key
 * has its default stopped (arrows would scroll the page); a key held down counts once.
 */
export function onGameKeys(
  keys: readonly GameKey[],
  options: { signal: AbortSignal; active: () => boolean },
): void {
  const { signal, active } = options;
  document.addEventListener(
    'keydown',
    (event) => {
      if (!active() || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest(FIELDS)))
        return;
      const gameKey = keys.find((each) => each.key === event.key);
      if (!gameKey) return;
      if (gameKey.yieldsToControls && target instanceof Element && target.closest(CONTROLS)) return;
      event.preventDefault();
      // A key held down repeats; only its first keydown is a press.
      if (event.repeat) return;
      gameKey.press();
    },
    { signal },
  );
}
