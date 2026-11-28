/**
 * The choice of level above a game's Start button: Easy and Hard as two
 * cards, each with the most stars earned on it, and under them one short
 * line about the level chosen. They are two real radio buttons in a
 * fieldset, so the arrow keys move between them as radio buttons do; the
 * cards around them are their labels. Choosing one remembers it on this
 * device (GameRecord) and tells the game, which shows that level's ground
 * at once.
 *
 * The star pictures are for the eye. Each radio's name says the same in
 * words: "Easy. Your best: 2 of 3 stars." or "Hard. Not tried yet."
 */
import './game.css';
import { el, setText } from '../../ui/dom.ts';
import { LEVELS, LEVEL_NAME, type Level } from './levels.ts';
import type { GameRecord, Stars } from './record.ts';
import { starRow } from './stars.ts';

export interface LevelPicker {
  element: HTMLFieldSetElement;
  readonly level: Level;
  /** Show the bests again, after a run has saved one. */
  refresh(): void;
}

const TEXT = {
  legend: 'Level',
  best: 'Your best',
  noStars: 'No stars yet',
  notTried: 'Not tried yet',
  /** The radio's name: the level, then its best in words. */
  name: (level: Level, best: Stars | null): string => {
    if (best === null) return `${LEVEL_NAME[level]}. Not tried yet.`;
    if (best === 0) return `${LEVEL_NAME[level]}. No stars yet.`;
    return `${LEVEL_NAME[level]}. Your best: ${best} of 3 stars.`;
  },
} as const;

/** The words under a card's stars. */
function bestWords(best: Stars | null): string {
  if (best === null) return TEXT.notTried;
  return best === 0 ? TEXT.noStars : TEXT.best;
}

/** Each picker's radios share a name of their own, so two pickers never join one group. */
let pickers = 0;

/** One level's card: a label around its radio, its name, its best in stars and words. */
function levelCard(level: Level, group: string, lineId: string) {
  const card = el('label', 'game-level');
  const input = el('input', 'game-level__input visually-hidden');
  input.type = 'radio';
  input.name = group;
  input.value = level;
  input.setAttribute('data-testid', `game-level-${level}`);
  input.setAttribute('aria-describedby', lineId);
  const stars = el('span', 'game-level__stars');
  stars.setAttribute('aria-hidden', 'true');
  const best = el('span', 'game-level__best');
  best.setAttribute('aria-hidden', 'true');
  const name = el('span', 'game-level__name', LEVEL_NAME[level]);
  name.setAttribute('aria-hidden', 'true');
  card.append(input, name, stars, best);
  return { card, input, stars, best };
}

/** The level picker, showing the level last chosen on this device. */
export function createLevelPicker(options: {
  record: GameRecord;
  /** One short line for each level, shown under the choices for the one chosen. */
  describe: Record<Level, string>;
  onChange?(level: Level): void;
  signal: AbortSignal;
}): LevelPicker {
  const { record, describe, onChange, signal } = options;
  const n = (pickers += 1);
  const lineId = `game-levels-${n}-line`;

  const element = el('fieldset', 'game-levels');
  element.setAttribute('data-testid', 'game-levels');
  const legend = el('legend', 'game-levels__legend', TEXT.legend);
  const row = el('div', 'game-levels__row');
  const line = el('p', 'game-levels__line');
  line.id = lineId;
  const cards = LEVELS.map((level) => ({
    level,
    ...levelCard(level, `game-level-${n}`, lineId),
  }));
  row.append(...cards.map(({ card }) => card));
  element.append(legend, row, line);

  let chosen = record.level();

  const refresh = (): void => {
    chosen = record.level();
    for (const { level, input, stars, best } of cards) {
      const stored = record.best(level);
      input.checked = level === chosen;
      input.setAttribute('aria-label', TEXT.name(level, stored));
      stars.replaceChildren(...starRow(stored ?? 0, 'game-star--small'));
      setText(best, bestWords(stored));
    }
    setText(line, describe[chosen]);
  };

  for (const { level, input } of cards) {
    input.addEventListener(
      'change',
      () => {
        if (!input.checked) return;
        chosen = level;
        record.chooseLevel(level);
        setText(line, describe[level]);
        onChange?.(level);
      },
      { signal },
    );
  }

  refresh();

  return {
    element,
    get level() {
      return chosen;
    },
    refresh,
  };
}
