/**
 * What a device remembers about one game (record.ts): the level last
 * chosen and the most stars on each level, kept in the game's own store
 * (the site's real device store, over jsdom's localStorage). Anything odd
 * that comes back counts as nothing remembered, and a store that forgets
 * still leaves the record working for as long as the game stays open.
 *
 * Run: npx vitest run src/extras/shared/record.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import { extraStore } from '../../ui/device-store.ts';
import { gameRecord } from './record.ts';

/** The store of a game made up for these tests, so nothing here meets a real game's keys. */
const theStore = () => extraStore('test-game');

describe('a game record', () => {
  describe('the level', () => {
    it('is Easy the first time', () => {
      expect(gameRecord(theStore()).level()).toBe('easy');
    });

    it('remembers the level last chosen, for the next time the game opens', () => {
      gameRecord(theStore()).chooseLevel('hard');

      expect(gameRecord(theStore()).level()).toBe('hard');
    });
  });

  describe('the bests', () => {
    it('has none on a level where no run has ended', () => {
      const record = gameRecord(theStore());

      expect(record.best('easy')).toBeNull();
      expect(record.best('hard')).toBeNull();
    });

    it('remembers the most stars on each level, for the next time the game opens', () => {
      const record = gameRecord(theStore());
      record.save('easy', 2);
      record.save('hard', 0);

      const reopened = gameRecord(theStore());

      expect(reopened.best('easy')).toBe(2);
      expect(reopened.best('hard')).toBe(0);
    });

    it('keeps the best when a later run earns fewer stars', () => {
      const record = gameRecord(theStore());
      record.save('easy', 3);

      record.save('easy', 1);

      expect(record.best('easy')).toBe(3);
      expect(gameRecord(theStore()).best('easy')).toBe(3);
    });
  });

  describe('a new best', () => {
    it.each<[string, () => boolean]>([
      ['the first run on a level that earns a star', () => gameRecord(theStore()).save('easy', 1)],
      [
        'a run that earns more stars than the best so far',
        () => {
          const record = gameRecord(theStore());
          record.save('easy', 2);
          return record.save('easy', 3);
        },
      ],
      [
        'a run with stars after runs with none',
        () => {
          const record = gameRecord(theStore());
          record.save('hard', 0);
          return record.save('hard', 1);
        },
      ],
    ])('is %s', (_name, save) => {
      expect(save()).toBe(true);
    });

    it.each<[string, () => boolean]>([
      ['a first run with no stars', () => gameRecord(theStore()).save('easy', 0)],
      [
        'a run that only equals the best',
        () => {
          const record = gameRecord(theStore());
          record.save('easy', 2);
          return record.save('easy', 2);
        },
      ],
      [
        'a run with fewer stars than the best',
        () => {
          const record = gameRecord(theStore());
          record.save('easy', 3);
          return record.save('easy', 2);
        },
      ],
      [
        "a run that beats only the other level's best",
        () => {
          const record = gameRecord(theStore());
          record.save('easy', 3);
          record.save('hard', 2);
          return record.save('hard', 2);
        },
      ],
    ])('is not %s', (_name, save) => {
      expect(save()).toBe(false);
    });
  });

  describe('what the store gives back', () => {
    it.each<[string, unknown, unknown]>([
      ['a level that is not one', 'medium', { easy: 'three' }],
      ['a list', ['hard'], [3, 3]],
      ['counts out of range', 2, { easy: 4, hard: -1 }],
      ['counts that are not whole', true, { easy: 1.5, hard: '2' }],
      ['nothing at all', null, null],
    ])('treats %s as nothing remembered', (_name, level, best) => {
      theStore().set('level', level);
      theStore().set('best', best);

      const record = gameRecord(theStore());

      expect(record.level()).toBe('easy');
      expect(record.best('easy')).toBeNull();
      expect(record.best('hard')).toBeNull();
    });

    it("keeps one level's best when the other's is not a count of stars", () => {
      theStore().set('best', { easy: 'lots', hard: 2 });

      const record = gameRecord(theStore());

      expect(record.best('easy')).toBeNull();
      expect(record.best('hard')).toBe(2);
    });

    it('treats a value that is not JSON as nothing remembered', () => {
      window.localStorage.setItem('mission-to-the-moon/extras/test-game/best', '{easy: 3');

      expect(gameRecord(theStore()).best('easy')).toBeNull();
    });
  });

  describe('a store that forgets', () => {
    it('still remembers the level and the bests for as long as the game is open', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage is full', 'QuotaExceededError');
      });
      const record = gameRecord(theStore());

      record.chooseLevel('hard');
      expect(record.save('hard', 2)).toBe(true);

      expect(record.level()).toBe('hard');
      expect(record.best('hard')).toBe(2);
      expect(record.save('hard', 2)).toBe(false);
      expect(gameRecord(theStore()).best('hard')).toBeNull();
    });

    it('works with a store that cannot be read at all', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Storage is turned off', 'SecurityError');
      });
      const record = gameRecord(theStore());

      expect(record.level()).toBe('easy');
      expect(record.save('easy', 3)).toBe(true);
      expect(record.best('easy')).toBe(3);
    });
  });
});
