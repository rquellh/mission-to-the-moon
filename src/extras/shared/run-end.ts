/**
 * The end of a run in a game: how many stars it earned, the three goals the
 * stars are for, and the two ways to play on. A run earns one star for each
 * goal met, so the big stars fill from the left. A missed goal is muted, with
 * an empty star and, when the game gives one, a short tip under it. Under the
 * goals sit "Play again" (amber: the one main action of this screen, the same
 * level again) and "Play on Hard" or "Play on Easy" (plain: the other level).
 *
 * The game places the block under its own result line and keeps focus on
 * that line; this block never takes focus. `show` remembers the run's stars
 * on this device (GameRecord) and gives back what to tell a screen reader,
 * so the game can say its result and the stars in one message.
 */
import './game.css';
import { button, el, hiddenText, setText } from '../../ui/dom.ts';
import { icon } from '../../ui/icons.ts';
import { LEVEL_NAME, otherLevel, type Level } from './levels.ts';
import type { GameRecord, Stars } from './record.ts';
import { starIcon, starRow } from './stars.ts';

export interface Goal {
  /** What the star is for, worded for how it went: "Landed on clear ground", or "Land on clear ground" when it did not happen. */
  label: string;
  met: boolean;
  /** One short tip, shown only when the goal was missed. */
  tip?: string;
}

export interface RunEnd {
  element: HTMLElement;
  /** Show the result of a run that just ended, and remember it. Returns what to tell a screen reader. */
  show(result: { level: Level; goals: readonly [Goal, Goal, Goal] }): {
    stars: Stars;
    newBest: boolean;
    /** "2 of 3 stars on Easy." or "All 3 stars on Easy. New best!" or "No stars this time, on Hard." */
    spoken: string;
  };
  hide(): void;
}

const TEXT = {
  /** The line beside the big stars. */
  stars: (stars: Stars, level: Level): string => {
    const name = LEVEL_NAME[level];
    if (stars === 0) return `No stars this time, on ${name}`;
    if (stars === 3) return `All 3 stars on ${name}`;
    return `${stars} of 3 stars on ${name}`;
  },
  newBest: 'New best!',
  // Said before each goal, for a screen reader only: the star pictures say it to the eye.
  earned: 'Earned: ',
  notYet: 'Not yet: ',
  playAgain: 'Play again',
  playOn: (level: Level): string => `Play on ${LEVEL_NAME[level]}`,
} as const;

/** Each block's ids are its own. */
let blocks = 0;

/** One goal in the list: its star, its words, and its tip when missed. */
function goalItem({ label, met, tip }: Goal): HTMLLIElement {
  const item = el('li', met ? 'game-goal' : 'game-goal game-goal--missed');
  const words = el('span', 'game-goal__words');
  words.append(hiddenText(met ? TEXT.earned : TEXT.notYet), label);
  if (!met && tip) {
    // A pause between the goal and its tip, for a screen reader; the eye sees a new line.
    words.append(hiddenText('. '), el('span', 'game-goal__tip', tip));
  }
  item.append(starIcon(met, 'game-star--small'), words);
  return item;
}

/** The end-of-run block, hidden until a run ends. */
export function createRunEnd(options: {
  record: GameRecord;
  /** Start a new run on this level. Called by "Play again" with the same level and by "Play on Hard" / "Play on Easy" with the other one, after the record's chosen level is updated. */
  onPlay(level: Level): void;
  signal: AbortSignal;
}): RunEnd {
  const { record, onPlay, signal } = options;
  const n = (blocks += 1);

  const element = el('div', 'game-run-end');
  element.hidden = true;

  const result = el('div', 'game-result');
  result.setAttribute('data-testid', 'game-result');
  const head = el('div', 'game-result__head');
  const bigStars = el('span', 'game-result__stars');
  bigStars.setAttribute('aria-hidden', 'true');
  const words = el('p', 'game-result__words');
  const line = el('span', 'game-result__line');
  line.id = `game-result-${n}-line`;
  line.setAttribute('data-testid', 'game-stars-line');
  const best = el('span', 'game-result__best', TEXT.newBest);
  words.append(line, best);
  head.append(bigStars, words);
  // The goals are listed under the line that counts their stars.
  const goals = el('ul', 'game-goals');
  // Said again, because Safari drops a list's role when its bullets are styled away.
  goals.setAttribute('role', 'list');
  goals.setAttribute('aria-labelledby', line.id);
  result.append(head, goals);

  const again = el('div', 'game-again');
  const playAgain = button('button button--primary button--large');
  playAgain.setAttribute('data-testid', 'game-play-again');
  playAgain.append(icon('replay'), TEXT.playAgain);
  const playOther = button('button button--large');
  playOther.setAttribute('data-testid', 'game-other-level');
  again.append(playAgain, playOther);
  element.append(result, again);

  // The level of the run on show.
  let level: Level = record.level();
  const play = (next: Level): void => {
    record.chooseLevel(next);
    onPlay(next);
  };
  playAgain.addEventListener('click', () => play(level), { signal });
  playOther.addEventListener('click', () => play(otherLevel(level)), { signal });

  return {
    element,
    show(run) {
      level = run.level;
      const stars = run.goals.filter((goal) => goal.met).length as Stars;
      const newBest = record.save(level, stars);
      const said = TEXT.stars(stars, level);
      bigStars.replaceChildren(...starRow(stars, 'game-star--large'));
      setText(line, said);
      best.hidden = !newBest;
      goals.replaceChildren(...run.goals.map(goalItem));
      setText(playOther, TEXT.playOn(otherLevel(level)));
      element.hidden = false;
      return { stars, newBest, spoken: newBest ? `${said}. ${TEXT.newBest}` : `${said}.` };
    },
    hide() {
      element.hidden = true;
    },
  };
}
