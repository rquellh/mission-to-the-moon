import { expect, type Locator, type Page } from '@playwright/test';
import type { EventView } from '../../src/content/types';

/**
 * The mission's page around the 3D view: the header, the view buttons and
 * True scale with its note (shown at the top left while Controls are open),
 * the note shown without a 3D view, and the loading and error messages. The
 * moment card, "Tell me more", the tour, Controls, the mission list, and
 * the dialogs have page objects of their own.
 */
export class MissionPage {
  readonly page: Page;
  // The page as a whole: <body>, which carries is-ready, is-welcome, is-touring, and no-3d.
  readonly site: Locator;
  // Header
  readonly masthead: Locator;
  readonly missionsButton: Locator;
  readonly missionName: Locator;
  readonly missionDates: Locator;
  // Views and scale, shown with Controls
  readonly views: Locator;
  readonly viewButtons: Locator;
  readonly scaleToggle: Locator;
  readonly scaleNote: Locator;
  // Without a 3D view
  readonly stageNote: Locator;
  readonly stageNoteText: Locator;
  readonly stageNoteReload: Locator;
  // Loading and messages
  readonly loading: Locator;
  readonly loadingText: Locator;
  readonly message: Locator;
  readonly messageText: Locator;
  readonly messageReload: Locator;
  readonly messageAction: Locator;
  readonly announcer: Locator;
  // Dynamic locators (arrow functions)
  readonly viewButton: (view: EventView) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.site = page.getByTestId('site');
    this.masthead = page.getByTestId('masthead');
    this.missionsButton = page.getByTestId('masthead-missions');
    this.missionName = page.getByTestId('masthead-mission-name');
    this.missionDates = page.getByTestId('masthead-mission-dates');
    this.views = page.getByTestId('views');
    this.viewButtons = page.getByTestId('view-buttons');
    this.scaleToggle = page.getByTestId('scale-toggle');
    this.scaleNote = page.getByTestId('scale-note');
    this.stageNote = page.getByTestId('stage-note');
    this.stageNoteText = page.getByTestId('stage-note-text');
    this.stageNoteReload = page.getByTestId('stage-note-reload');
    this.loading = page.getByTestId('loading');
    this.loadingText = page.getByTestId('loading-text');
    this.message = page.getByTestId('message');
    this.messageText = page.getByTestId('message-text');
    this.messageReload = page.getByTestId('message-reload');
    this.messageAction = page.getByTestId('message-action');
    this.announcer = page.getByTestId('announcer');
    this.viewButton = (view: EventView) => page.getByTestId(`view-button-${view}`);
  }

  /**
   * Wait until the site is ready: the mission has loaded, the scene (if
   * there is one) has its textures, and the page is revealed. The address
   * has been acted on by then (a tour started, a dialog opened).
   */
  async waitForLoad(): Promise<void> {
    await expect(this.site).toHaveClass(/\bis-ready\b/);
    await expect(this.loading).toBeHidden();
    await expect(this.missionName).not.toBeEmpty();
    await expect(this.message).toBeHidden();
  }
}
