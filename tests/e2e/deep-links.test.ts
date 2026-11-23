import { test, expect } from '../fixtures';
import { DialogsPage } from '../pages/DialogsPage';
import { EventCardPage } from '../pages/EventCardPage';
import { MissionPage } from '../pages/MissionPage';
import { ScenePage } from '../pages/ScenePage';
import { TimelinePage } from '../pages/TimelinePage';
import { WelcomePage } from '../pages/WelcomePage';
import { EVENTS, MISSIONS, URLS } from '../utils/vars';

/**
 * A deep link opens the right place. Reading the address is unit-tested
 * (src/app/deep-link.ts); these check that the whole site goes where a
 * shared link says. The layout does not matter here, so desktop only.
 */
test.describe('Deep links', () => {
  test.skip(({ isMobile }) => isMobile, 'Where a link opens does not depend on the screen.');

  test('an event link opens paused at that event, in its view', async ({ sitePage }) => {
    const missionPage = new MissionPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const timelinePage = new TimelinePage(sitePage);
    const scenePage = new ScenePage(sitePage);
    const landing = EVENTS.APOLLO_11_LANDING;

    await test.step('Open a link to the landing', async () => {
      await sitePage.goto(URLS.LINK({ mission: landing.mission, event: landing.id }));
      await missionPage.waitForLoad();
    });

    await test.step('The card, the clock, and the view are the landing, paused', async () => {
      await expect(missionPage.site).not.toHaveClass(/\bis-welcome\b/);
      await expect(cardPage.title).toHaveText(landing.title);
      await expect(timelinePage.clockTime).toHaveText(landing.clock);
      await expect(timelinePage.play).toHaveAttribute('aria-label', 'Play');
      await expect(missionPage.viewButton('moon')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => (await scenePage.report()).view).toBe('moon');
    });
  });

  test('a time in the link wins over an event', async ({ sitePage }) => {
    const missionPage = new MissionPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const timelinePage = new TimelinePage(sitePage);
    const { APOLLO_11_LANDING: landing, APOLLO_11_FIRST_STEP: firstStep } = EVENTS;

    await test.step('Open a link with both the landing and the time of the first step', async () => {
      await sitePage.goto(
        URLS.LINK({ mission: landing.mission, event: landing.id, t: firstStep.clock }),
      );
      await missionPage.waitForLoad();
    });

    await test.step('The page opens at the time, not the event', async () => {
      await expect(timelinePage.clockTime).toHaveText(firstStep.clock);
      await expect(cardPage.title).toHaveText(firstStep.title);
      await expect(timelinePage.play).toHaveAttribute('aria-label', 'Play');
    });
  });

  test('an unknown mission opens the welcome for the default mission', async ({ sitePage }) => {
    const missionPage = new MissionPage(sitePage);
    const welcomePage = new WelcomePage(sitePage);

    await test.step('Open a link to a mission the site does not have', async () => {
      await sitePage.goto(URLS.WELCOME(MISSIONS.UNKNOWN));
      await missionPage.waitForLoad();
      await welcomePage.waitForLoad();
    });

    await test.step('The default mission is loaded, and the welcome features it', async () => {
      await expect(missionPage.site).toHaveClass(/\bis-welcome\b/);
      await expect(missionPage.missionName).toHaveText('Apollo 11');
      await expect(welcomePage.title).toHaveText('Ride along on Apollo 11');
    });
  });

  test('a memorial link opens its page over the welcome', async ({ sitePage }) => {
    const missionPage = new MissionPage(sitePage);
    const welcomePage = new WelcomePage(sitePage);
    const dialogsPage = new DialogsPage(sitePage);

    await test.step('Open the link to the Apollo 1 memorial', async () => {
      await sitePage.goto(URLS.WELCOME(MISSIONS.MEMORIAL));
      await missionPage.waitForLoad();
    });

    await test.step('The memorial page is open and has loaded', async () => {
      await expect(dialogsPage.memorial).toBeVisible();
      await expect(dialogsPage.memorialTitle).toHaveText('Apollo 1');
      await expect(dialogsPage.memorialBody).not.toHaveAttribute('aria-busy', 'true');
      await expect(dialogsPage.memorialBody).not.toBeEmpty();
    });

    await test.step('The welcome is under it', async () => {
      await expect(missionPage.site).toHaveClass(/\bis-welcome\b/);
      await expect(welcomePage.welcome).toBeVisible();
    });

    await test.step('Closing the page gives focus to All missions on the welcome', async () => {
      await dialogsPage.memorialClose.click();
      await expect(dialogsPage.memorial).toBeHidden();
      await expect(welcomePage.allMissions).toBeFocused();
    });
  });
});
