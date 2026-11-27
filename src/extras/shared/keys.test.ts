/**
 * The keys a flown game listens for (keys.ts): which presses reach the game,
 * which are left to the page and the browser, and the space bar left to a
 * focused button so that the button gets its normal press. The game here
 * steers with the arrows and drops with the space bar, as "Fly to orbit"
 * does. Keys reach the page as the browser sends them: a keydown on the
 * element with the focus, bubbling up to the document.
 *
 * Run: npx vitest run src/extras/shared/keys.test.ts
 */
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { onGameKeys } from './keys.ts';

/** The game listening in each test: what it was pressed with, and whether it takes keys now. */
interface Game {
  readonly pressed: string[];
  playing: boolean;
  /** Ends the listening, as an extra's dispose does. */
  readonly listening: AbortController;
}

let game: Game;

beforeEach(() => {
  const playing: Game = { pressed: [], playing: true, listening: new AbortController() };
  const press = (name: string) => () => {
    playing.pressed.push(name);
  };
  onGameKeys(
    [
      { key: 'ArrowLeft', press: press('tip back') },
      { key: 'ArrowRight', press: press('tip over') },
      { key: ' ', press: press('drop'), yieldsToControls: true },
    ],
    { signal: playing.listening.signal, active: () => playing.playing },
  );
  game = playing;
});

afterEach(() => game.listening.abort());

/** Put an element on the page, with these attributes. */
function make(tag: string, attributes: Record<string, string> = {}, text = ''): HTMLElement {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  element.textContent = text;
  document.body.append(element);
  return element;
}

/** Send a keydown as the browser does, on `on` (the page itself by default); the event, to see whether its default was stopped. */
function keydown(
  key: string,
  { on = document.body, ...held }: KeyboardEventInit & { on?: Element } = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...held });
  on.dispatchEvent(event);
  return event;
}

describe('game keys', () => {
  it('presses the game for each of its keys, and stops their default so the arrows do not scroll the page', () => {
    const presses = [keydown('ArrowLeft'), keydown('ArrowRight'), keydown(' ')];

    expect(presses.map((event) => event.defaultPrevented)).toEqual([true, true, true]);
    expect(game.pressed).toEqual(['tip back', 'tip over', 'drop']);
  });

  it('leaves a key that is not one of the game keys to the page', () => {
    expect(keydown('ArrowUp').defaultPrevented).toBe(false);
    expect(game.pressed).toEqual([]);
  });

  it('leaves every key to the page while the game is not taking keys, and takes them again once it is', () => {
    game.playing = false;

    expect(keydown('ArrowLeft').defaultPrevented).toBe(false);
    expect(game.pressed).toEqual([]);

    game.playing = true;

    expect(keydown('ArrowLeft').defaultPrevented).toBe(true);
    expect(game.pressed).toEqual(['tip back']);
  });

  it.each<[string, KeyboardEventInit]>([
    ['Alt', { altKey: true }],
    ['Control', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
  ])('leaves a key pressed with %s held to the browser', (_name, held) => {
    expect(keydown('ArrowRight', held).defaultPrevented).toBe(false);
    expect(game.pressed).toEqual([]);
  });

  it.each<[string, () => HTMLElement]>([
    ['a text field', () => make('input', { type: 'text' })],
    ['a box of text', () => make('textarea')],
    ['a list to pick from', () => make('select')],
    [
      'editable text',
      () => {
        const paragraph = make('p', { contenteditable: 'true' }, 'Notes');
        // jsdom does not work out isContentEditable; a browser says true here.
        Object.defineProperty(paragraph, 'isContentEditable', { value: true });
        return paragraph;
      },
    ],
  ])('leaves keys alone while typing in %s', (_name, field) => {
    const typing = field();

    expect(keydown('ArrowLeft', { on: typing }).defaultPrevented).toBe(false);
    expect(keydown(' ', { on: typing }).defaultPrevented).toBe(false);
    expect(game.pressed).toEqual([]);
  });

  it('counts a key held down once, but still stops its default each time it repeats', () => {
    const held = [
      keydown('ArrowRight'),
      keydown('ArrowRight', { repeat: true }),
      keydown('ArrowRight', { repeat: true }),
    ];

    expect(held.map((event) => event.defaultPrevented)).toEqual([true, true, true]);
    expect(game.pressed).toEqual(['tip over']);
  });

  it('stops listening once its signal aborts', () => {
    game.listening.abort();

    expect(keydown('ArrowLeft').defaultPrevented).toBe(false);
    expect(keydown(' ').defaultPrevented).toBe(false);
    expect(game.pressed).toEqual([]);
  });

  describe('a key that yields to controls (the space bar)', () => {
    it.each<[string, () => HTMLElement]>([
      ['a button', () => make('button', { type: 'button' }, 'Start over')],
      ['a link', () => make('a', { href: '#sources' }, 'Sources')],
      [
        'a summary',
        () => {
          const details = make('details');
          const summary = document.createElement('summary');
          summary.textContent = 'How it works';
          details.append(summary);
          return summary;
        },
      ],
      ['anything with role="button"', () => make('div', { role: 'button', tabindex: '0' }, 'Go')],
    ])('is left alone while the focus is on %s', (_name, control) => {
      const focused = control();
      focused.focus();

      expect(keydown(' ', { on: focused }).defaultPrevented).toBe(false);
      expect(game.pressed).toEqual([]);
    });

    it('lets a focused button take its own press from the space bar', async () => {
      const user = userEvent.setup();
      const startOver = make('button', { type: 'button' }, 'Start over');
      let clicks = 0;
      startOver.addEventListener('click', () => {
        clicks += 1;
      });
      startOver.focus();

      await user.keyboard(' ');

      expect(clicks).toBe(1);
      expect(game.pressed).toEqual([]);
    });

    it('drops when the focus is anywhere else on the page', () => {
      make('button', { type: 'button' }, 'Start over');
      const result = make('p', { tabindex: '-1' }, 'You are in orbit.');
      result.focus();

      expect(keydown(' ', { on: result }).defaultPrevented).toBe(true);
      expect(keydown(' ').defaultPrevented).toBe(true);
      expect(game.pressed).toEqual(['drop', 'drop']);
    });

    it('does not stop the arrows, which still steer while a button has the focus', () => {
      const dropIt = make('button', { type: 'button' }, 'Drop it');
      dropIt.focus();

      expect(keydown('ArrowLeft', { on: dropIt }).defaultPrevented).toBe(true);
      expect(game.pressed).toEqual(['tip back']);
    });
  });
});
