import type { Locator, Page } from '@playwright/test';

/**
 * The end of a flight, in the moment card (`ending`, inside EventCardPage's
 * `dock`): shown after the tour's last stop, or with "Finish" once exploring
 * has reached the end of the clock (EventCardPage.finish). The ending line
 * has Watch again (`again`, named "Start the tour again" after a tour), the
 * last moment and its date, the title, the patch collected, the next flight
 * (`next`, or All missions once every flight is flown), and the "More to
 * explore" door (`moreToggle`, with `aria-expanded`). The door opens `more`
 * (built when it first opens): its head with Less, one pick from each shelf,
 * and the quiet ways on (with Explore on my own after a tour).
 */
export class EndingPage {
  readonly page: Page;
  readonly ending: Locator;
  // The ending line
  readonly again: Locator;
  readonly eyebrow: Locator;
  readonly title: Locator;
  readonly collected: Locator;
  readonly next: Locator;
  readonly moreToggle: Locator;
  // "More to explore", opened
  readonly more: Locator;
  readonly moreTitle: Locator;
  readonly less: Locator;
  readonly pickNext: Locator;
  readonly pickNextGo: Locator;
  readonly pickHandsOn: Locator;
  readonly pickHandsOnOpen: Locator;
  readonly pickExplore: Locator;
  readonly pickExploreOpen: Locator;
  // The quiet ways on (Explore on my own only after a tour)
  readonly watchAgain: Locator;
  readonly explore: Locator;
  readonly about: Locator;
  readonly credits: Locator;
  readonly allMissions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.ending = page.getByTestId('ending');
    this.again = page.getByTestId('ending-again');
    this.eyebrow = page.getByTestId('ending-eyebrow');
    this.title = page.getByTestId('ending-title');
    this.collected = page.getByTestId('ending-collected');
    this.next = page.getByTestId('ending-next');
    this.moreToggle = page.getByTestId('ending-more-toggle');
    this.more = page.getByTestId('ending-more');
    this.moreTitle = page.getByTestId('ending-more-title');
    this.less = page.getByTestId('ending-less');
    this.pickNext = page.getByTestId('ending-pick-next');
    this.pickNextGo = page.getByTestId('ending-pick-next-go');
    this.pickHandsOn = page.getByTestId('ending-pick-hands-on');
    this.pickHandsOnOpen = page.getByTestId('ending-pick-hands-on-open');
    this.pickExplore = page.getByTestId('ending-pick-explore');
    this.pickExploreOpen = page.getByTestId('ending-pick-explore-open');
    this.watchAgain = page.getByTestId('ending-watch-again');
    this.explore = page.getByTestId('ending-explore');
    this.about = page.getByTestId('ending-about');
    this.credits = page.getByTestId('ending-credits');
    this.allMissions = page.getByTestId('ending-all-missions');
  }
}
