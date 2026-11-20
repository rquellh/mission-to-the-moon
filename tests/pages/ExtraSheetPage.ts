import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The full-screen sheet an extra opens in: its title, Close, and a body the
 * extra fills. `sheet` has `data-extra` set to the open extra's id. If the
 * extra fails to load, the body says so and offers Back and Reload.
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
    this.host = (extraId: string) => page.getByTestId(`extra-sheet-host-${extraId}`);
  }

  /** Wait until the sheet is open and the extra has finished loading (or failed to). */
  async waitForLoad(): Promise<void> {
    await expect(this.sheet).toBeVisible();
    await expect(this.title).not.toBeEmpty();
    await expect(this.body).not.toHaveAttribute('aria-busy', 'true');
  }
}
