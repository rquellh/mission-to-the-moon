import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The guided tour's panel in the card sheet: which stop this is, a dot for
 * each stop, Back, Next (Skip while on the way, Finish at the last stop), and
 * Exit tour. `panel` has `data-phase`: off, traveling, stopped, or finished.
 * Once finished, the panel is hidden and the end of the flight (EndingPage)
 * takes the moment's place.
 */
export class TourPanelPage {
  readonly page: Page;
  readonly panel: Locator;
  readonly count: Locator;
  readonly back: Locator;
  readonly next: Locator;
  readonly exit: Locator;
  // Dynamic locators (arrow functions)
  readonly dot: (stopId: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.getByTestId('tour-panel');
    this.count = page.getByTestId('tour-count');
    this.back = page.getByTestId('tour-back');
    this.next = page.getByTestId('tour-next');
    this.exit = page.getByTestId('tour-exit');
    this.dot = (stopId: string) => page.getByTestId(`tour-dot-${stopId}`);
  }

  /**
   * Press Skip on a trip that has just begun, and wait until the tour is at
   * the stop. The tour ignores a Skip in a trip's first 400 ms (so a double
   * tap on Next does not skip the trip it started), so press again until it
   * takes, but only while the tour is still on its way. It must arrive
   * within 4 seconds: sooner than any trip ends by itself (5 at the least),
   * so a Skip that did nothing fails here.
   */
  async skipTrip(): Promise<void> {
    await expect(this.panel).toHaveAttribute('data-phase', 'traveling');
    await expect(async () => {
      if ((await this.panel.getAttribute('data-phase')) === 'traveling') await this.next.click();
      await expect(this.panel).toHaveAttribute('data-phase', 'stopped', { timeout: 250 });
    }).toPass({ intervals: [250], timeout: 4_000 });
  }
}
