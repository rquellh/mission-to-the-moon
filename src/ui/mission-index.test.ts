/**
 * The lookups over a mission's events: which event is current at a time,
 * which chapter, and the date and time at a moment of the flight.
 */
import { describe, expect, it } from 'vitest';
import { story as apollo11 } from '../content/missions/apollo-11/story.ts';
import { story as gemini8 } from '../content/missions/gemini-8/story.ts';
import { elapsedToSeconds, type Mission } from '../content/types.ts';
import { MissionIndex } from './mission-index.ts';

const index = new MissionIndex(apollo11);
const secondsOf = (eventId: string): number =>
  elapsedToSeconds(apollo11.events.find((event) => event.id === eventId)!.elapsed);

/** Apollo 11's story with no launch time. */
function withoutLaunch(mission: Mission): Mission {
  const fixture = { ...mission };
  delete fixture.launch;
  return fixture;
}

describe('MissionIndex', () => {
  describe('eventAt', () => {
    it('is -1 before the first event', () => {
      expect(index.eventAt(0)).toBe(-1);
      expect(new MissionIndex(gemini8).eventAt(-2 * 3600)).toBe(-1);
    });

    it('lands on an event at its exact time, and keeps it until the next one', () => {
      const staging = secondsOf('first-stage-separation');

      expect(index.events[index.eventAt(staging)]?.id).toBe('first-stage-separation');
      expect(index.events[index.eventAt(staging + 60)]?.id).toBe('first-stage-separation');
    });

    it('allows a hundredth of a second, so a seek to an event lands on it', () => {
      const staging = secondsOf('first-stage-separation');

      expect(index.events[index.eventAt(staging - 0.005)]?.id).toBe('first-stage-separation');
      expect(index.events[index.eventAt(staging - 0.02)]?.id).toBe('liftoff');
    });
  });

  describe('chapterAt', () => {
    it('is the chapter in progress, and the first one before any event', () => {
      expect(index.chapters[index.chapterAt(secondsOf('landing'))]?.chapter.title).toBe('Landing');
      expect(index.chapters[index.chapterAt(secondsOf('flag'))]?.chapter.title).toBe('On the Moon');
      expect(index.chapterAt(-100)).toBe(0);
    });
  });

  describe('utcAt', () => {
    it('is the launch time plus the mission time', () => {
      expect(index.utcAt(0)?.toISOString()).toBe('1969-07-16T13:32:00.000Z');
      expect(index.utcAt(secondsOf('splashdown'))?.toISOString()).toBe('1969-07-24T16:50:35.000Z');
    });

    it('is null for a mission with no launch time', () => {
      expect(new MissionIndex(withoutLaunch(apollo11)).utcAt(0)).toBeNull();
    });
  });

  describe('countsDays', () => {
    it('is true for a long flight and false for a short one', () => {
      expect(index.countsDays).toBe(true);
      expect(new MissionIndex(gemini8).countsDays).toBe(false);
    });
  });
});
