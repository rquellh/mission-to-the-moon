/**
 * Deep links: every form of address `readDeepLink` takes, and what it
 * turns away. What the site then opens for a link is the browser tests' job.
 *
 * Run: npx vitest run src/app/deep-link.test.ts
 */
import { describe, expect, it } from 'vitest';
import { readDeepLink } from './deep-link.ts';

describe('readDeepLink', () => {
  it('reads an empty address as the default mission, with nothing else asked for', () => {
    const link = readDeepLink('');

    expect(link).toMatchObject({
      mission: null,
      time: null,
      view: null,
      start: null,
      event: null,
      extra: null,
    });
    expect([...link.extraParams]).toEqual([]);
  });

  describe('mission', () => {
    it.each([
      ['?mission=gemini-8', 'gemini-8'],
      ['?mission=%20Apollo-11%20', 'apollo-11'],
      ['?mission=', null],
    ])('%s names %s', (search, mission) => {
      expect(readDeepLink(search).mission).toBe(mission);
    });
  });

  describe('t, the mission time', () => {
    it.each([
      ['plain seconds', '?t=90', 90],
      ['seconds with a fraction', '?t=12.5', 12.5],
      ['seconds before liftoff', '?t=-30', -30],
      ['hours and minutes', '?t=1:30', 5400],
      ['hours, minutes, and seconds', '?t=102:45:40', 369940],
      ['a time before liftoff', '?t=-001:40:59', -6059],
      ['spaces around it', '?t=%2042%20', 42],
    ])('reads %s', (_name, search, seconds) => {
      expect(readDeepLink(search).time).toBe(seconds);
    });

    it.each([
      ['words', '?t=soon'],
      ['too many parts', '?t=1:2:3:4'],
      ['three-digit minutes', '?t=12:345'],
      ['nothing', '?t='],
    ])('turns away %s', (_name, search) => {
      expect(readDeepLink(search).time).toBeNull();
    });
  });

  describe('view', () => {
    it.each([
      ['?view=journey', 'journey'],
      ['?view=both', 'journey'],
      ['?view=earth', 'earth'],
      ['?view=MOON', 'moon'],
      ['?view=spacecraft', 'spacecraft'],
      ['?view=Ship', 'spacecraft'],
      ['?view=mars', null],
    ])('%s is %s', (search, view) => {
      expect(readDeepLink(search).view).toBe(view);
    });
  });

  describe('start', () => {
    it.each([
      ['?start=tour', 'tour'],
      ['?start=Explore', 'explore'],
      ['?start=later', null],
    ])('%s is %s', (search, start) => {
      expect(readDeepLink(search).start).toBe(start);
    });
  });

  describe('event', () => {
    it('keeps the event id as written, trimmed', () => {
      expect(readDeepLink('?event=%20landing%20').event).toBe('landing');
      expect(readDeepLink('?event=').event).toBeNull();
    });
  });

  describe('extra', () => {
    it('names the extra, and passes every other value on to it', () => {
      const link = readDeepLink('?extra=Stages&mission=apollo-11&event=liftoff&level=hard');

      expect(link.extra).toBe('stages');
      expect([...link.extraParams]).toEqual([
        ['mission', 'apollo-11'],
        ['event', 'liftoff'],
        ['level', 'hard'],
      ]);
    });
  });
});
