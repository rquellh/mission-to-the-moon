import type { Locator, Page } from '@playwright/test';

/**
 * The moment card (`dock`), always at the bottom during a flight: the story
 * of the moment, the photo's small picture, "Hear the recording", "Try it",
 * Play (TimelinePage), and its two doors, "Tell me more" (`recordsToggle`,
 * which opens RecordsPage) and "Controls" (`controlsToggle`, which opens the
 * tools in TimelinePage and the view buttons in MissionPage). Each door has
 * `aria-expanded` true or false. Previous and next show with Controls.
 */
export class EventCardPage {
  readonly page: Page;
  // The card
  readonly dock: Locator;
  readonly progress: Locator;
  // The story of the moment
  readonly card: Locator;
  readonly eyebrow: Locator;
  readonly title: Locator;
  readonly text: Locator;
  // Beside the story
  readonly photo: Locator;
  readonly photoCredit: Locator;
  readonly recording: Locator;
  readonly tryIt: Locator;
  // The doors
  readonly recordsToggle: Locator;
  readonly controlsToggle: Locator;
  // On a phone, beside Play: the chapter and the day (or the clock, with Controls open)
  readonly status: Locator;
  readonly statusChapter: Locator;
  readonly statusDay: Locator;
  // Previous and next event, among the tools behind Controls
  readonly previous: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dock = page.getByTestId('dock');
    this.progress = page.getByTestId('dock-progress');
    this.card = page.getByTestId('event-card');
    this.eyebrow = page.getByTestId('event-card-eyebrow');
    this.title = page.getByTestId('event-card-title');
    this.text = page.getByTestId('event-card-text');
    this.photo = page.getByTestId('event-card-photo');
    this.photoCredit = page.getByTestId('event-card-photo-credit');
    this.recording = page.getByTestId('event-card-recording');
    this.tryIt = page.getByTestId('event-card-try-it');
    this.recordsToggle = page.getByTestId('records-toggle');
    this.controlsToggle = page.getByTestId('controls-toggle');
    this.status = page.getByTestId('dock-status');
    this.statusChapter = page.getByTestId('dock-status-chapter');
    this.statusDay = page.getByTestId('dock-status-day');
    this.previous = page.getByTestId('event-card-previous');
    this.next = page.getByTestId('event-card-next');
  }
}
