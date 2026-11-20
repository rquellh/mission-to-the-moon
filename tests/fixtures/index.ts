/**
 * The test fixture every spec uses: `sitePage`, a page of the site that
 * keeps every console error and uncaught page error, and fails the test if
 * there were any. A page that draws but logs an error is still broken.
 *
 * Specs import `{ test, expect }` from here, never from @playwright/test.
 */
import { test as base, expect, type Page } from '@playwright/test';

interface SiteFixtures {
  /** A page of the site that fails the test on any console error or uncaught error. */
  sitePage: Page;
}

export const test = base.extend<SiteFixtures>({
  sitePage: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      problems.push(`uncaught error: ${error.message}`);
    });

    await use(page);

    expect(problems, 'The page logged errors').toEqual([]);
  },
});

export { expect };
