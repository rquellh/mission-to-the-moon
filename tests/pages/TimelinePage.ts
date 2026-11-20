import type { Locator, Page } from '@playwright/test';

/**
 * The timeline: Play and Pause, the mission clock, the scrubber, the
 * chapters (buttons on a wide screen, a menu on a phone), and the speed.
 * `play` has `aria-label` Play or Pause.
 */
export class TimelinePage {
  readonly page: Page;
  readonly timeline: Locator;
  readonly play: Locator;
  // The mission clock
  readonly clockTime: Locator;
  readonly clockSince: Locator;
  readonly clockDay: Locator;
  readonly clockFastForward: Locator;
  readonly clockUtc: Locator;
  // Moving through the mission
  readonly scrubber: Locator;
  readonly chapters: Locator;
  readonly chapterSelect: Locator;
  readonly speedSelect: Locator;
  // Dynamic locators (arrow functions)
  readonly chapter: (chapterId: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.timeline = page.getByTestId('timeline');
    this.play = page.getByTestId('timeline-play');
    this.clockTime = page.getByTestId('clock-time');
    this.clockSince = page.getByTestId('clock-since');
    this.clockDay = page.getByTestId('clock-day');
    this.clockFastForward = page.getByTestId('clock-fast-forward');
    this.clockUtc = page.getByTestId('clock-utc');
    this.scrubber = page.getByTestId('timeline-scrubber');
    this.chapters = page.getByTestId('timeline-chapters');
    this.chapterSelect = page.getByTestId('timeline-chapter-select');
    this.speedSelect = page.getByTestId('timeline-speed-select');
    this.chapter = (chapterId: string) => page.getByTestId(`chapter-${chapterId}`);
  }
}
