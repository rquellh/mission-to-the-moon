import type { Locator, Page } from '@playwright/test';

/**
 * The event card and the sheet it sits in. On a phone the sheet rises from
 * the bottom (`data-state` compact or expanded); on a wide screen it is a
 * panel at the side.
 */
export class EventCardPage {
  readonly page: Page;
  // The sheet
  readonly sheet: Locator;
  readonly sheetHandle: Locator;
  // The card
  readonly card: Locator;
  readonly title: Locator;
  readonly time: Locator;
  readonly previous: Locator;
  readonly next: Locator;
  readonly line: Locator;
  readonly body: Locator;
  readonly audio: Locator;
  readonly moreToggle: Locator;
  readonly more: Locator;
  readonly photo: Locator;
  readonly sources: Locator;
  readonly tryIt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sheet = page.getByTestId('sheet');
    this.sheetHandle = page.getByTestId('sheet-handle');
    this.card = page.getByTestId('event-card');
    this.title = page.getByTestId('event-card-title');
    this.time = page.getByTestId('event-card-time');
    this.previous = page.getByTestId('event-card-previous');
    this.next = page.getByTestId('event-card-next');
    this.line = page.getByTestId('event-card-line');
    this.body = page.getByTestId('event-card-body');
    this.audio = page.getByTestId('event-card-audio');
    this.moreToggle = page.getByTestId('event-card-more-toggle');
    this.more = page.getByTestId('event-card-more');
    this.photo = page.getByTestId('event-card-photo');
    this.sources = page.getByTestId('event-card-sources');
    this.tryIt = page.getByTestId('event-card-try-it');
  }
}
