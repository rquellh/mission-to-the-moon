/**
 * The pure helpers that write times and dates, case by case. The
 * interface tests show them in place; these pin down the edges.
 */
import { describe, expect, it } from 'vitest';
import { summary as apollo1Summary } from '../content/missions/apollo-1/summary.ts';
import { story as apollo11 } from '../content/missions/apollo-11/story.ts';
import { story as apollo14 } from '../content/missions/apollo-14/story.ts';
import { story as gemini3 } from '../content/missions/gemini-3/story.ts';
import { story as gemini8 } from '../content/missions/gemini-8/story.ts';
import type { Mission } from '../content/types.ts';
import {
  countsDays,
  flightDay,
  formatElapsed,
  formatIsoDay,
  formatYears,
  missionDates,
  speakElapsed,
  summaryDates,
} from './format.ts';

const HOUR = 3600;

/** Apollo 11's story, launched on New Year's Eve 1968 for two days: no real flight crossed a new year. */
const acrossTheNewYear: Mission = {
  ...apollo11,
  launch: {
    ...apollo11.launch!,
    value: { ...apollo11.launch!.value, utc: '1968-12-31T12:00:00Z' },
  },
  duration: { ...apollo11.duration!, value: '048:00:00' },
};

/** Apollo 11's story with no launch time. */
function withoutLaunch(mission: Mission): Mission {
  const fixture = { ...mission };
  delete fixture.launch;
  return fixture;
}

describe('formatElapsed', () => {
  it.each([
    ['liftoff', 0, '00:00:00'],
    ['Apollo 11 landing', 102 * HOUR + 45 * 60 + 39.9, '102:45:39'],
    ['the Agena launch, before Gemini 8', -(1 * HOUR + 40 * 60 + 59.262), '−01:40:59'],
    ['less than a second before liftoff', -0.4, '00:00:00'],
  ])('%s reads %s seconds as %s', (_name, seconds, text) => {
    expect(formatElapsed(seconds)).toBe(text);
  });
});

describe('speakElapsed', () => {
  it.each([
    [30, 'at liftoff'],
    [-30, 'just before liftoff'],
    [2 * 60 + 42, '2 minutes after liftoff'],
    [HOUR, '1 hour after liftoff'],
    [HOUR + 5 * 60, '1 hour 5 minutes after liftoff'],
    [-(1 * HOUR + 40 * 60 + 59), '1 hour 40 minutes before liftoff'],
  ])('%s seconds is "%s"', (seconds, words) => {
    expect(speakElapsed(seconds)).toBe(words);
  });
});

describe('flight days', () => {
  it('counts days only on a flight longer than two days', () => {
    expect(countsDays(48 * HOUR)).toBe(false);
    expect(countsDays(48 * HOUR + 1)).toBe(true);
  });

  it.each([
    [0, 1],
    [24 * HOUR - 1, 1],
    [24 * HOUR, 2],
    [102 * HOUR, 5],
    [-1, null],
  ])('%s seconds is in day %s', (seconds, day) => {
    expect(flightDay(seconds)).toBe(day);
  });
});

describe('missionDates', () => {
  it.each([
    ['in one month', apollo11, 'July 16–24, 1969'],
    ['across two months', apollo14, 'January 31 – February 9, 1971'],
    ['across two days', gemini8, 'March 16–17, 1966'],
    ['on one day', gemini3, 'March 23, 1965'],
    ['across two years', acrossTheNewYear, 'December 31, 1968 – January 2, 1969'],
    ['with no launch time', withoutLaunch(apollo11), ''],
  ])('a flight %s', (_name, mission, dates) => {
    expect(missionDates(mission)).toBe(dates);
  });

  it("gives a memorial's one day", () => {
    expect(summaryDates(apollo1Summary)).toBe('January 27, 1967');
  });
});

describe('formatYears', () => {
  it('writes a span of years, or one year', () => {
    expect(formatYears(1965, 1966)).toBe('1965–1966');
    expect(formatYears(1969, 1969)).toBe('1969');
  });
});

describe('formatIsoDay', () => {
  it('writes a day in words, and leaves anything else as it is', () => {
    expect(formatIsoDay('2026-11-15')).toBe('November 15, 2026');
    expect(formatIsoDay('someday')).toBe('someday');
  });
});
