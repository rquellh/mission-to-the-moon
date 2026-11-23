import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The full-screen sheet an extra opens in: its title, Close, and a body the
 * extra fills. `sheet` has `data-extra` set to the open extra's id. If the
 * extra fails to load, the body says so and offers Back and Reload.
 *
 * At the end of a run, a hands-on extra shows "Up next" (`upNext`), which
 * the sheet builds: the next step's title and its one amber button
 * (`upNextPrimary`: back to the flight, or fly the real one), one pick from
 * each shelf, the run again (`upNextAgain`), and All missions when the
 * sheet was opened from the list. On a phone the next step is pinned at the
 * bottom of the screen, and `upNextMoreToggle` ("More to explore", with
 * `aria-expanded`) pulls it up with the picks; `upNextLess` puts it back.
 */
export class ExtraSheetPage {
  readonly page: Page;
  readonly sheet: Locator;
  readonly title: Locator;
  readonly close: Locator;
  readonly body: Locator;
  readonly status: Locator;
  // When an extra fails to load
  readonly failed: Locator;
  readonly back: Locator;
  readonly reload: Locator;
  // "Up next", at the end of a run
  readonly upNext: Locator;
  readonly upNextTitle: Locator;
  readonly upNextPrimary: Locator;
  readonly upNextMoreToggle: Locator;
  readonly upNextLess: Locator;
  readonly upNextMore: Locator;
  readonly upNextPickHandsOn: Locator;
  readonly upNextPickHandsOnOpen: Locator;
  readonly upNextPickExplore: Locator;
  readonly upNextPickExploreOpen: Locator;
  readonly upNextAgain: Locator;
  readonly upNextAllMissions: Locator;
  // Dynamic locators (arrow functions)
  readonly host: (extraId: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.sheet = page.getByTestId('extra-sheet');
    this.title = page.getByTestId('extra-sheet-title');
    this.close = page.getByTestId('extra-sheet-close');
    this.body = page.getByTestId('extra-sheet-body');
    this.status = page.getByTestId('extra-sheet-status');
    this.failed = page.getByTestId('extra-sheet-failed');
    this.back = page.getByTestId('extra-sheet-back');
    this.reload = page.getByTestId('extra-sheet-reload');
    this.upNext = page.getByTestId('up-next');
    this.upNextTitle = page.getByTestId('up-next-title');
    this.upNextPrimary = page.getByTestId('up-next-primary');
    this.upNextMoreToggle = page.getByTestId('up-next-more-toggle');
    this.upNextLess = page.getByTestId('up-next-less');
    this.upNextMore = page.getByTestId('up-next-more');
    this.upNextPickHandsOn = page.getByTestId('up-next-pick-hands-on');
    this.upNextPickHandsOnOpen = page.getByTestId('up-next-pick-hands-on-open');
    this.upNextPickExplore = page.getByTestId('up-next-pick-explore');
    this.upNextPickExploreOpen = page.getByTestId('up-next-pick-explore-open');
    this.upNextAgain = page.getByTestId('up-next-again');
    this.upNextAllMissions = page.getByTestId('up-next-all-missions');
    this.host = (extraId: string) => page.getByTestId(`extra-sheet-host-${extraId}`);
  }

  /** Wait until the sheet is open and the extra has finished loading (or failed to). */
  async waitForLoad(): Promise<void> {
    await expect(this.sheet).toBeVisible();
    await expect(this.title).not.toBeEmpty();
    await expect(this.body).not.toHaveAttribute('aria-busy', 'true');
  }
}
