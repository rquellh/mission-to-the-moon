import { test, expect } from '../fixtures';
import { EventCardPage } from '../pages/EventCardPage';
import { MissionPage } from '../pages/MissionPage';
import { RecordsPage } from '../pages/RecordsPage';
import { TimelinePage } from '../pages/TimelinePage';
import { EVENTS, URLS } from '../utils/vars';

/**
 * The moment card's two doors, in a real browser on a desktop and a phone:
 * "Tell me more" opens the records with focus on their title and gives
 * focus back to its door, and "Controls" opens the tools. What each holds,
 * and every way to close them, are tested in the interface tests
 * (src/ui/records.test.ts, src/ui/timeline.test.ts).
 */
test.describe("The moment card's doors", () => {
  test('a visitor opens Tell me more, closes it, and steps on with Controls', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const recordsPage = new RecordsPage(sitePage);
    const timelinePage = new TimelinePage(sitePage);
    const { APOLLO_11_LANDING: landing, APOLLO_11_FIRST_STEP: firstStep } = EVENTS;

    await test.step('Open the landing', async () => {
      await sitePage.goto(URLS.EVENT(landing.mission, landing.id));
      await missionPage.waitForLoad();
    });

    await test.step('The card tells the moment, with both doors closed', async () => {
      await expect(cardPage.title).toHaveText(landing.title);
      await expect(cardPage.recordsToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(cardPage.controlsToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(recordsPage.records).toBeHidden();
      await expect(timelinePage.timeline).toBeHidden();
      await expect(missionPage.views).toBeHidden();
    });

    await test.step('Tell me more opens the records of the moment, with focus on their title', async () => {
      await cardPage.recordsToggle.click();
      await expect(cardPage.recordsToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(recordsPage.records).toBeVisible();
      await expect(recordsPage.title).toHaveText(landing.title);
      await expect(recordsPage.title).toBeFocused();
      await expect(recordsPage.recording).toBeVisible();
    });

    await test.step('Close shuts them and gives focus back to the door', async () => {
      await recordsPage.close.click();
      await expect(recordsPage.records).toBeHidden();
      await expect(cardPage.recordsToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(cardPage.recordsToggle).toBeFocused();
    });

    await test.step('Controls opens the tools and the view buttons', async () => {
      await cardPage.controlsToggle.click();
      await expect(cardPage.controlsToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(timelinePage.timeline).toBeVisible();
      await expect(timelinePage.scrubber).toBeVisible();
      await expect(timelinePage.clockTime).toHaveText(landing.clock);
      await expect(missionPage.views).toBeVisible();
    });

    await test.step('Next event moves the card on', async () => {
      await cardPage.next.click();
      await expect(cardPage.title).toHaveText(firstStep.title);
      await expect(timelinePage.clockTime).toHaveText(firstStep.clock);
    });

    await test.step('Controls closes the tools again', async () => {
      await cardPage.controlsToggle.click();
      await expect(cardPage.controlsToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(timelinePage.timeline).toBeHidden();
      await expect(missionPage.views).toBeHidden();
    });
  });
});
