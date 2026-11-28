import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The welcome: the first screen on an address with no `start`. It features
 * the mission on show, with Take the tour, Explore on my own, All missions,
 * which opens the mission list (HubPage), and Play a game (`games`), which
 * opens the same list at its games. While it shows, `site` has the class
 * is-welcome and the rest of the interface is hidden.
 */
export class WelcomePage {
  readonly page: Page;
  readonly welcome: Locator;
  readonly title: Locator;
  readonly summary: Locator;
  readonly dates: Locator;
  readonly tour: Locator;
  readonly explore: Locator;
  readonly allMissions: Locator;
  readonly games: Locator;
  // Without a 3D view
  readonly note: Locator;
  readonly reload: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcome = page.getByTestId('welcome');
    this.title = page.getByTestId('welcome-title');
    this.summary = page.getByTestId('welcome-summary');
    this.dates = page.getByTestId('welcome-dates');
    this.tour = page.getByTestId('welcome-tour');
    this.explore = page.getByTestId('welcome-explore');
    this.allMissions = page.getByTestId('welcome-all-missions');
    this.games = page.getByTestId('welcome-games');
    this.note = page.getByTestId('welcome-note');
    this.reload = page.getByTestId('welcome-reload');
  }

  /** Wait until the welcome shows, filled in for the mission on show. */
  async waitForLoad(): Promise<void> {
    await expect(this.welcome).toBeVisible();
    await expect(this.title).not.toBeEmpty();
    await expect(this.allMissions).toBeVisible();
  }
}
