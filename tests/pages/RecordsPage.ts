import type { Locator, Page } from '@playwright/test';

/**
 * "Tell me more": the records of the moment on the card, opened with the
 * card's door (EventCardPage.recordsToggle). A panel at the side on a wide
 * screen; on a phone, one sheet with the card. Its head (eyebrow, title,
 * time, Close), its parts (the full story, the recording, the photo, the
 * sources), and the links to the mission's own pages (DialogsPage).
 */
export class RecordsPage {
  readonly page: Page;
  readonly records: Locator;
  // The head
  readonly eyebrow: Locator;
  readonly title: Locator;
  readonly time: Locator;
  readonly close: Locator;
  // The parts
  readonly body: Locator;
  readonly story: Locator;
  readonly recording: Locator;
  readonly photo: Locator;
  readonly sources: Locator;
  // The mission's own pages
  readonly about: Locator;
  readonly howDrawn: Locator;
  readonly credits: Locator;

  constructor(page: Page) {
    this.page = page;
    this.records = page.getByTestId('records');
    this.eyebrow = page.getByTestId('records-eyebrow');
    this.title = page.getByTestId('records-title');
    this.time = page.getByTestId('records-time');
    this.close = page.getByTestId('records-close');
    this.body = page.getByTestId('records-body');
    this.story = page.getByTestId('records-story');
    this.recording = page.getByTestId('records-recording');
    this.photo = page.getByTestId('records-photo');
    this.sources = page.getByTestId('records-sources');
    this.about = page.getByTestId('records-about');
    this.howDrawn = page.getByTestId('records-how-drawn');
    this.credits = page.getByTestId('records-credits');
  }
}
