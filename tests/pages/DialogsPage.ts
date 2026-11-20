import type { Locator, Page } from '@playwright/test';

/**
 * The dialogs over the mission: About this mission, How this is drawn,
 * Sources and credits, and a memorial page. Each has a title, a Close
 * button, and a body. (The extras' sheet has ExtraSheetPage.)
 */
export class DialogsPage {
  readonly page: Page;
  // About this mission
  readonly about: Locator;
  readonly aboutTitle: Locator;
  readonly aboutClose: Locator;
  readonly aboutBody: Locator;
  // How this is drawn
  readonly howDrawn: Locator;
  readonly howDrawnTitle: Locator;
  readonly howDrawnClose: Locator;
  readonly howDrawnBody: Locator;
  // Sources and credits
  readonly credits: Locator;
  readonly creditsTitle: Locator;
  readonly creditsClose: Locator;
  readonly creditsBody: Locator;
  // A memorial page
  readonly memorial: Locator;
  readonly memorialTitle: Locator;
  readonly memorialClose: Locator;
  readonly memorialBody: Locator;

  constructor(page: Page) {
    this.page = page;
    this.about = page.getByTestId('about-dialog');
    this.aboutTitle = page.getByTestId('about-dialog-title');
    this.aboutClose = page.getByTestId('about-dialog-close');
    this.aboutBody = page.getByTestId('about-dialog-body');
    this.howDrawn = page.getByTestId('drawn-dialog');
    this.howDrawnTitle = page.getByTestId('drawn-dialog-title');
    this.howDrawnClose = page.getByTestId('drawn-dialog-close');
    this.howDrawnBody = page.getByTestId('drawn-dialog-body');
    this.credits = page.getByTestId('credits-dialog');
    this.creditsTitle = page.getByTestId('credits-dialog-title');
    this.creditsClose = page.getByTestId('credits-dialog-close');
    this.creditsBody = page.getByTestId('credits-dialog-body');
    this.memorial = page.getByTestId('memorial-dialog');
    this.memorialTitle = page.getByTestId('memorial-dialog-title');
    this.memorialClose = page.getByTestId('memorial-dialog-close');
    this.memorialBody = page.getByTestId('memorial-dialog-body');
  }
}
