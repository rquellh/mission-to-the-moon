import { test, expect } from '../fixtures';
import { EndingPage } from '../pages/EndingPage';
import { EventCardPage } from '../pages/EventCardPage';
import { MissionPage } from '../pages/MissionPage';
import { TourPanelPage } from '../pages/TourPanelPage';
import { TOUR, URLS } from '../utils/vars';

/**
 * A visitor takes the guided tour. Only the whole site has real frames
 * driving the real clock, scene, and interface together, so only here can a
 * trip be seen to arrive on its own. How long a trip takes is the tour's own
 * tests' business (src/app/tour.test.ts), so nothing here times one. What
 * the end of the flight shows is tested in src/ui/ending.test.ts.
 */
test.describe('Guided tour', () => {
  test('a visitor follows the tour from stop to stop, skips to the end, starts again, and leaves', async ({
    sitePage,
  }) => {
    // A trip takes 5 to 15 seconds, and longer on a busy machine drawing in software.
    test.slow();
    const missionPage = new MissionPage(sitePage);
    const tourPage = new TourPanelPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const endingPage = new EndingPage(sitePage);
    const [first, second, third] = TOUR.stops;

    await test.step('Open the tour by its address', async () => {
      await sitePage.goto(URLS.TOUR(TOUR.mission));
      await missionPage.waitForLoad();
      await expect(missionPage.site).toHaveClass(/\bis-touring\b/);
    });

    await test.step('The tour is at stop 1', async () => {
      await expect(tourPage.panel).toHaveAttribute('data-phase', 'stopped');
      await expect(tourPage.count).toContainText('Stop 1 of');
      await expect(cardPage.title).toHaveText(first.title);
      await expect(tourPage.back).toBeDisabled();
    });

    await test.step('Next sets off for stop 2', async () => {
      await tourPage.next.click();
      await expect(tourPage.panel).toHaveAttribute('data-phase', 'traveling');
      await expect(tourPage.count).toContainText('Stop 2 of');
    });

    await test.step('The tour arrives at stop 2 by itself', async () => {
      await expect(tourPage.panel).toHaveAttribute('data-phase', 'stopped', { timeout: 45_000 });
      await expect(tourPage.count).toContainText('Stop 2 of');
      await expect(cardPage.title).toHaveText(second.title);
    });

    await test.step('Next, then Skip, arrives at stop 3 at once', async () => {
      await tourPage.next.click();
      await tourPage.skipTrip();
      await expect(tourPage.count).toContainText('Stop 3 of');
      await expect(cardPage.title).toHaveText(third.title);
    });

    for (let stop = 4; stop <= TOUR.stopCount; stop += 1) {
      await test.step(`Next, then Skip, arrives at stop ${stop}`, async () => {
        await tourPage.next.click();
        await tourPage.skipTrip();
        await expect(tourPage.count).toContainText(`Stop ${stop} of ${TOUR.stopCount}`);
      });
    }

    await test.step('Finish on the last stop ends the flight in the card, with focus on its title', async () => {
      await expect(tourPage.next).toHaveText('Finish');
      await tourPage.next.click();
      await expect(tourPage.panel).toHaveAttribute('data-phase', 'finished');
      await expect(tourPage.panel).toBeHidden();
      await expect(cardPage.card).toBeHidden();
      await expect(endingPage.ending).toBeVisible();
      await expect(endingPage.title).toBeFocused();
      await expect(endingPage.next).toBeVisible();
    });

    await test.step('Start the tour again goes back to stop 1', async () => {
      await expect(endingPage.again).toHaveAttribute('aria-label', 'Start the tour again');
      await endingPage.again.click();
      await expect(endingPage.ending).toBeHidden();
      await expect(tourPage.panel).toHaveAttribute('data-phase', 'stopped', { timeout: 45_000 });
      await expect(tourPage.count).toContainText('Stop 1 of');
      await expect(cardPage.title).toHaveText(first.title);
      await expect(tourPage.next).toBeFocused();
    });

    await test.step('Exit tour returns to exploring', async () => {
      await tourPage.exit.click();
      await expect(tourPage.panel).toBeHidden();
      await expect(tourPage.panel).toHaveAttribute('data-phase', 'off');
      await expect(missionPage.site).not.toHaveClass(/\bis-touring\b/);
      await expect(cardPage.title).toHaveText(first.title);
    });
  });
});
