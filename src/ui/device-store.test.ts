/**
 * What the site keeps on this device: the missions visited (read by the
 * patch book extra), and each extra's own small values, kept apart.
 * Nothing here may ever throw, whatever the browser's storage does.
 */
import { describe, expect, it, vi } from 'vitest';
import { visitedMissions } from '../test/test-utils.ts';
import { extraStore, recordVisit } from './device-store.ts';

describe('the device store', () => {
  describe('visits', () => {
    it('notes each mission once, oldest first', () => {
      recordVisit('apollo-11');
      recordVisit('gemini-8');
      recordVisit('apollo-11');

      expect(visitedMissions()).toEqual(['apollo-11', 'gemini-8']);
    });

    it('starts the list over when what is stored is not a list', () => {
      window.localStorage.setItem('mission-to-the-moon/site/visited-missions', '"not a list"');

      recordVisit('apollo-17');

      expect(visitedMissions()).toEqual(['apollo-17']);
    });

    it('lets every extra read the visits by name', () => {
      recordVisit('gemini-4');

      expect(extraStore('patches').get('visited-missions')).toEqual(['gemini-4']);
    });
  });

  describe("an extra's own values", () => {
    it('keeps them, and forgets one set to undefined', () => {
      const store = extraStore('stages');

      store.set('best-score', 3);
      expect(store.get('best-score')).toBe(3);

      store.set('best-score', undefined);
      expect(store.get('best-score')).toBeUndefined();
    });

    it("keeps one extra's values apart from another's", () => {
      extraStore('stages').set('level', 'hard');

      expect(extraStore('docking').get('level')).toBeUndefined();
    });

    it("does not let an extra change the site's own values", () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      recordVisit('apollo-8');

      extraStore('patches').set('visited-missions', ['apollo-13']);

      expect(extraStore('patches').get('visited-missions')).toEqual(['apollo-8']);
      expect(warn).toHaveBeenCalledWith('"visited-missions" is kept by the site; extras can read it but not change it.');
    });
  });

  describe('storage that fails', () => {
    it('forgets quietly when the browser refuses to store anything', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Storage is turned off', 'SecurityError');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage is full', 'QuotaExceededError');
      });

      expect(() => recordVisit('apollo-11')).not.toThrow();
      expect(() => extraStore('stages').set('level', 'easy')).not.toThrow();
      expect(extraStore('stages').get('level')).toBeUndefined();
    });
  });
});
