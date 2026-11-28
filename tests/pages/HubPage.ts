import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The mission list, titled "All missions": a modal dialog opened from the
 * welcome's All missions (WelcomePage) and from the mission's name in the
 * header, or from the welcome's "Play a game", which opens it at the games
 * with focus on their heading. Each mission is an entry with Tour and
 * Explore (or Read, for a memorial page); the extras follow in two groups,
 * the games ("hands-on"), each with Play, then the rest ("explore"), each
 * with Open (`extraOpen` finds either).
 */
export class HubPage {
  readonly page: Page;
  readonly hub: Locator;
  readonly title: Locator;
  readonly lede: Locator;
  readonly close: Locator;
  readonly list: Locator;
  /** Every mission entry (not its buttons, whose ids continue the entry's). */
  readonly missions: Locator;
  // Dynamic locators (arrow functions)
  readonly mission: (id: string) => Locator;
  readonly missionTour: (id: string) => Locator;
  readonly missionExplore: (id: string) => Locator;
  readonly missionRead: (id: string) => Locator;
  readonly extra: (id: string) => Locator;
  readonly extraOpen: (id: string) => Locator;
  /** The heading of a group of extras, by kind: "hands-on" (Play a game) or "explore" (More to explore). */
  readonly extrasTitle: (kind: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.hub = page.getByTestId('hub');
    this.title = page.getByTestId('hub-title');
    this.lede = page.getByTestId('hub-lede');
    this.close = page.getByTestId('hub-close');
    this.list = page.getByTestId('hub-list');
    this.missions = this.list.locator('li[data-testid^="hub-mission-"]');
    this.mission = (id: string) => page.getByTestId(`hub-mission-${id}`);
    this.missionTour = (id: string) => page.getByTestId(`hub-mission-${id}-tour`);
    this.missionExplore = (id: string) => page.getByTestId(`hub-mission-${id}-explore`);
    this.missionRead = (id: string) => page.getByTestId(`hub-mission-${id}-read`);
    this.extra = (id: string) => page.getByTestId(`hub-extra-${id}`);
    this.extraOpen = (id: string) => page.getByTestId(`hub-extra-${id}-open`);
    this.extrasTitle = (kind: string) => page.getByTestId(`hub-extras-${kind}-title`);
  }

  /** Wait until the list is open and filled. */
  async waitForLoad(): Promise<void> {
    await expect(this.hub).toBeVisible();
    await expect(this.title).toBeVisible();
    await expect(this.missions.first()).toBeVisible();
  }
}
