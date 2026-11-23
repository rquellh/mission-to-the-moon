import { elapsedToSeconds, type Chapter, type Mission, type MissionEvent } from '../content/types';
import { countsDays } from './format';

/** A chapter with where it starts on the mission clock. */
export interface ChapterStart {
  readonly chapter: Chapter;
  /** Index of the chapter's first event in `events`. */
  readonly firstEvent: number;
  /** Mission elapsed seconds of that event. */
  readonly seconds: number;
}

/**
 * Quick lookups over a mission's events and chapters: which event is current
 * at a time, which chapter an event belongs to, and the mission's span.
 */
export class MissionIndex {
  readonly mission: Mission;
  readonly events: readonly MissionEvent[];
  /** Mission elapsed seconds of each event, in the same order as `events`. */
  readonly seconds: readonly number[];
  readonly chapters: readonly ChapterStart[];
  /** Launch time in milliseconds since 1970, when the content gives it. */
  readonly launchMs: number | null;
  /** Mission elapsed seconds at the start and end of the mission. */
  readonly start: number;
  readonly end: number;
  /** True for a flight long enough to show the day of the flight beside the clock. */
  readonly countsDays: boolean;

  constructor(mission: Mission) {
    this.mission = mission;
    this.events = mission.events;
    this.seconds = mission.events.map((event) => elapsedToSeconds(event.elapsed));

    const chapters: ChapterStart[] = [];
    for (const chapter of mission.chapters) {
      const firstEvent = mission.events.findIndex((event) => event.chapter === chapter.id);
      const seconds = this.seconds[firstEvent];
      if (firstEvent >= 0 && seconds !== undefined) chapters.push({ chapter, firstEvent, seconds });
    }
    chapters.sort((a, b) => a.seconds - b.seconds);
    this.chapters = chapters;

    const launch = mission.launch ? Date.parse(mission.launch.value.utc) : NaN;
    this.launchMs = Number.isFinite(launch) ? launch : null;

    const duration = mission.duration ? elapsedToSeconds(mission.duration.value) : 0;
    const first = this.seconds[0] ?? 0;
    const last = this.seconds[this.seconds.length - 1] ?? 0;
    this.start = Math.min(0, first);
    this.end = Math.max(duration, last, this.start + 1);
    this.countsDays = countsDays(this.end);
  }

  /**
   * The most recent event at a mission time: the last one at or before it.
   * Returns -1 before the first event.
   */
  eventAt(seconds: number): number {
    // A small tolerance so a seek to an event's exact time lands on it.
    const time = seconds + 0.01;
    let low = 0;
    let high = this.seconds.length - 1;
    let found = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if ((this.seconds[mid] ?? Infinity) <= time) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return found;
  }

  /** The index in `chapters` of the chapter in progress at a mission time. */
  chapterAt(seconds: number): number {
    let found = 0;
    this.chapters.forEach((start, i) => {
      if (start.seconds <= seconds + 0.01) found = i;
    });
    return found;
  }

  /** The chapter an event belongs to. */
  chapterOf(event: MissionEvent): Chapter | undefined {
    return this.mission.chapters.find((chapter) => chapter.id === event.chapter);
  }

  /** The date and time at a mission time, or null without a launch time. */
  utcAt(seconds: number): Date | null {
    return this.launchMs === null ? null : new Date(this.launchMs + seconds * 1000);
  }
}
