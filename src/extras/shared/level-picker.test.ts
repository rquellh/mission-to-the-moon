/**
 * The level picker above a game's Start (level-picker.ts): two radio
 * buttons in a group named Level, each named with its level and its best in
 * words, the line for the level chosen under them, and the choice
 * remembered on the device. The picker is put on an empty page, with a game
 * record over the site's real device store, as a game would make it.
 *
 * Run: npx vitest run src/extras/shared/level-picker.test.ts
 */
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '../../test/test-utils.ts';
import { extraStore } from '../../ui/device-store.ts';
import { createLevelPicker } from './level-picker.ts';
import type { Level } from './levels.ts';
import { gameRecord, type GameRecord } from './record.ts';

const DESCRIBE: Record<Level, string> = {
  easy: 'Lots of room.',
  hard: 'Less room.',
};

/** Ends the picker's listening after each test, as a game's dispose does. */
let listening = new AbortController();
afterEach(() => {
  listening.abort();
  listening = new AbortController();
});

/** A game's record on this device, with these runs already ended on it. */
function aRecord(runs: ReadonlyArray<readonly [Level, 0 | 1 | 2 | 3]> = []): GameRecord {
  const record = gameRecord(extraStore('test-game'));
  for (const [level, stars] of runs) record.save(level, stars);
  return record;
}

/** The picker on the page, and the levels it has told the game about. */
function showPicker(record: GameRecord) {
  const chosen: Level[] = [];
  const picker = createLevelPicker({
    record,
    describe: DESCRIBE,
    onChange: (level) => chosen.push(level),
    signal: listening.signal,
  });
  document.body.append(picker.element);
  return { picker, chosen };
}

const theRadio = (name: string | RegExp): HTMLElement => screen.getByRole('radio', { name });

describe('the level picker', () => {
  describe('rendering', () => {
    it('offers Easy and Hard in a group named Level, Easy chosen the first time', () => {
      showPicker(aRecord());

      const group = screen.getByRole('group', { name: 'Level' });
      expect(group).toBeVisible();
      expect(theRadio('Easy. Not tried yet.')).toBeChecked();
      expect(theRadio('Hard. Not tried yet.')).not.toBeChecked();
      expect(screen.getByText('Lots of room.')).toBeVisible();
    });

    it('says each best in words, in the names and on the cards', () => {
      showPicker(
        aRecord([
          ['easy', 2],
          ['hard', 0],
        ]),
      );

      expect(theRadio('Easy. Your best: 2 of 3 stars.')).toBeInTheDocument();
      expect(theRadio('Hard. No stars yet.')).toBeInTheDocument();
      expect(screen.getByText('Your best')).toBeVisible();
      expect(screen.getByText('No stars yet')).toBeVisible();
    });

    it('opens on the level last chosen on this device', () => {
      const record = aRecord();
      record.chooseLevel('hard');

      showPicker(record);

      expect(theRadio(/^Hard\./)).toBeChecked();
      expect(screen.getByText('Less room.')).toBeVisible();
    });

    it("describes each choice by the chosen level's line", () => {
      showPicker(aRecord());

      expect(theRadio(/^Easy\./)).toHaveAccessibleDescription('Lots of room.');
      expect(theRadio(/^Hard\./)).toHaveAccessibleDescription('Lots of room.');
    });
  });

  describe('choosing', () => {
    it('chooses Hard when it is clicked, remembers it, and tells the game', async () => {
      const user = userEvent.setup();
      const record = aRecord();
      const { picker, chosen } = showPicker(record);

      await user.click(screen.getByText('Hard'));

      expect(theRadio(/^Hard\./)).toBeChecked();
      expect(picker.level).toBe('hard');
      expect(record.level()).toBe('hard');
      expect(gameRecord(extraStore('test-game')).level()).toBe('hard');
      expect(chosen).toEqual(['hard']);
      expect(screen.getByText('Less room.')).toBeVisible();
      expect(screen.queryByText('Lots of room.')).not.toBeInTheDocument();
    });

    it('moves between the levels with the arrow keys, as radio buttons do', async () => {
      const user = userEvent.setup();
      const { picker, chosen } = showPicker(aRecord());
      await user.tab();
      expect(theRadio(/^Easy\./)).toHaveFocus();

      await user.keyboard('{ArrowRight}');

      expect(theRadio(/^Hard\./)).toHaveFocus();
      expect(theRadio(/^Hard\./)).toBeChecked();
      expect(picker.level).toBe('hard');

      await user.keyboard('{ArrowLeft}');

      expect(theRadio(/^Easy\./)).toBeChecked();
      expect(chosen).toEqual(['hard', 'easy']);
    });
  });

  describe('after a run', () => {
    it('shows the new best once refreshed', () => {
      const record = aRecord();
      const { picker } = showPicker(record);
      record.save('easy', 3);

      picker.refresh();

      expect(theRadio('Easy. Your best: 3 of 3 stars.')).toBeChecked();
    });

    it('shows the level chosen at the end of a run once refreshed', () => {
      const record = aRecord([['easy', 1]]);
      const { picker } = showPicker(record);
      record.chooseLevel('hard');

      picker.refresh();

      expect(theRadio('Hard. Not tried yet.')).toBeChecked();
      expect(picker.level).toBe('hard');
      expect(screen.getByText('Less room.')).toBeVisible();
    });
  });
});
