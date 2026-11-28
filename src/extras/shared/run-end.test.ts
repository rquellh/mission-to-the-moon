/**
 * The end of a run in a game (run-end.ts): the stars it earned with a line
 * that counts them, the three goals with a tip under each one missed, a new
 * best when the run beat the device's best, and Play again and the other
 * level. The block is put on an empty page, with a game record over the
 * site's real device store, as a game would make it; the game's own result
 * line, which keeps the focus, is a paragraph above it.
 *
 * Run: npx vitest run src/extras/shared/run-end.test.ts
 */
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '../../test/test-utils.ts';
import { extraStore } from '../../ui/device-store.ts';
import type { Level } from './levels.ts';
import { gameRecord, type GameRecord } from './record.ts';
import { createRunEnd, type Goal } from './run-end.ts';

/** Ends the block's listening after each test, as a game's dispose does. */
let listening = new AbortController();
afterEach(() => {
  listening.abort();
  listening = new AbortController();
});

/** Three goals of a made-up game, met or not, each with a tip for when it is missed. */
function goals(first: boolean, second: boolean, third: boolean): readonly [Goal, Goal, Goal] {
  return [
    { label: first ? 'Reached the top' : 'Reach the top', met: first, tip: 'Climb first.' },
    { label: 'Soft finish', met: second, tip: 'Slow down at the end.' },
    { label: 'Time to spare', met: third, tip: 'Keep moving.' },
  ];
}

/** The block on the page under a result line that has the focus, and the levels its buttons asked for. */
function showRunEnd(record: GameRecord = gameRecord(extraStore('test-game'))) {
  const played: Level[] = [];
  const runEnd = createRunEnd({
    record,
    onPlay: (level) => played.push(level),
    signal: listening.signal,
  });
  const result = document.createElement('p');
  result.tabIndex = -1;
  result.textContent = 'You made it.';
  document.body.append(result, runEnd.element);
  result.focus();
  return { runEnd, record, played, result };
}

/** The list of goals, named by the line that counts their stars. */
const theGoals = (line: string): HTMLElement => screen.getByRole('list', { name: line });

describe('the end of a run', () => {
  describe('rendering', () => {
    it('is hidden until a run ends', () => {
      showRunEnd();

      expect(screen.queryByRole('button', { name: 'Play again' })).not.toBeInTheDocument();
    });

    it.each<[string, readonly [Goal, Goal, Goal], Level, string, string]>([
      [
        'no goal met',
        goals(false, false, false),
        'hard',
        'No stars this time, on Hard',
        'No stars this time, on Hard.',
      ],
      [
        'one goal met',
        goals(true, false, false),
        'easy',
        '1 of 3 stars on Easy',
        '1 of 3 stars on Easy. New best!',
      ],
      [
        'two goals met',
        goals(true, false, true),
        'hard',
        '2 of 3 stars on Hard',
        '2 of 3 stars on Hard. New best!',
      ],
      [
        'all three met',
        goals(true, true, true),
        'easy',
        'All 3 stars on Easy',
        'All 3 stars on Easy. New best!',
      ],
    ])('counts the stars in words with %s', (_name, met, level, line, spoken) => {
      const { runEnd } = showRunEnd();

      const said = runEnd.show({ level, goals: met });

      expect(screen.getByText(line)).toBeVisible();
      expect(theGoals(line)).toBeVisible();
      expect(said.spoken).toBe(spoken);
      expect(said.stars).toBe(met.filter((goal) => goal.met).length);
    });

    it('says which goals were earned, and gives a tip under each one not yet met', () => {
      const { runEnd } = showRunEnd();

      runEnd.show({ level: 'easy', goals: goals(true, false, true) });

      const items = within(theGoals('2 of 3 stars on Easy')).getAllByRole('listitem');
      expect(items.map((item) => item.textContent)).toEqual([
        'Earned: Reached the top',
        'Not yet: Soft finish. Slow down at the end.',
        'Earned: Time to spare',
      ]);
      expect(screen.queryByText('Climb first.')).not.toBeInTheDocument();
      expect(screen.getByText('Slow down at the end.')).toBeVisible();
    });

    it('leaves out a tip the game does not give', () => {
      const { runEnd } = showRunEnd();

      runEnd.show({
        level: 'hard',
        goals: [
          { label: 'Reach the top', met: false, tip: 'Climb first.' },
          { label: 'Soft finish', met: false },
          { label: 'Time to spare', met: false },
        ],
      });

      const items = within(theGoals('No stars this time, on Hard')).getAllByRole('listitem');
      expect(items.map((item) => item.textContent)).toEqual([
        'Not yet: Reach the top. Climb first.',
        'Not yet: Soft finish',
        'Not yet: Time to spare',
      ]);
    });

    it('never takes the focus from the result line', () => {
      const { runEnd, result } = showRunEnd();

      runEnd.show({ level: 'easy', goals: goals(true, true, true) });

      expect(result).toHaveFocus();
    });
  });

  describe('a new best', () => {
    it('says New best! only when the run beats the best on its level, and remembers it', () => {
      const { runEnd, record } = showRunEnd();

      expect(runEnd.show({ level: 'easy', goals: goals(true, false, true) }).newBest).toBe(true);
      expect(screen.getByText('New best!')).toBeVisible();

      expect(runEnd.show({ level: 'easy', goals: goals(true, true, false) }).spoken).toBe(
        '2 of 3 stars on Easy.',
      );
      expect(screen.getByText('New best!')).not.toBeVisible();

      expect(runEnd.show({ level: 'easy', goals: goals(true, true, true) }).newBest).toBe(true);
      expect(screen.getByText('New best!')).toBeVisible();
      expect(record.best('easy')).toBe(3);
    });

    it('is not said for a run with no stars, though the level now counts as tried', () => {
      const { runEnd, record } = showRunEnd();

      const said = runEnd.show({ level: 'hard', goals: goals(false, false, false) });

      expect(said.newBest).toBe(false);
      expect(screen.getByText('New best!')).not.toBeVisible();
      expect(record.best('hard')).toBe(0);
    });
  });

  describe('playing on', () => {
    it('plays the same level again with Play again, the amber button', async () => {
      const user = userEvent.setup();
      const { runEnd, record, played } = showRunEnd();
      runEnd.show({ level: 'hard', goals: goals(true, false, false) });

      const again = screen.getByRole('button', { name: 'Play again' });
      expect(again).toHaveClass('button--primary');
      await user.click(again);

      expect(played).toEqual(['hard']);
      expect(record.level()).toBe('hard');
    });

    it('switches to Hard with Play on Hard after a run on Easy, and remembers the choice first', async () => {
      const user = userEvent.setup();
      const record = gameRecord(extraStore('test-game'));
      const levelWhenPlayed: Level[] = [];
      const runEnd = createRunEnd({
        record,
        onPlay: () => levelWhenPlayed.push(record.level()),
        signal: listening.signal,
      });
      document.body.append(runEnd.element);
      runEnd.show({ level: 'easy', goals: goals(true, true, false) });

      const other = screen.getByRole('button', { name: 'Play on Hard' });
      expect(other).not.toHaveClass('button--primary');
      await user.click(other);

      expect(levelWhenPlayed).toEqual(['hard']);
      expect(gameRecord(extraStore('test-game')).level()).toBe('hard');
    });

    it('offers Play on Easy after a run on Hard', async () => {
      const user = userEvent.setup();
      const { runEnd, played } = showRunEnd();
      runEnd.show({ level: 'hard', goals: goals(false, false, false) });

      await user.click(screen.getByRole('button', { name: 'Play on Easy' }));

      expect(played).toEqual(['easy']);
    });

    it('hides again once a new run starts', () => {
      const { runEnd } = showRunEnd();
      runEnd.show({ level: 'easy', goals: goals(true, true, true) });

      runEnd.hide();

      expect(screen.queryByRole('button', { name: 'Play again' })).not.toBeInTheDocument();
    });
  });
});
