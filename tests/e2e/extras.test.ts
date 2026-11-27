import { test, expect } from '../fixtures';
import { DockingPage } from '../pages/DockingPage';
import { EventCardPage } from '../pages/EventCardPage';
import { ExtraSheetPage } from '../pages/ExtraSheetPage';
import { HubPage } from '../pages/HubPage';
import { LandingPage } from '../pages/LandingPage';
import { MissionPage } from '../pages/MissionPage';
import { WelcomePage } from '../pages/WelcomePage';
import { EVENTS, EXTRAS, MISSIONS, URLS } from '../utils/vars';

/**
 * Every extra is in the mission list, and opens and closes, over a mission,
 * with no errors: each loads its own code (some with a 3D view of their
 * own), which only the whole site shows. A draft is listed only on the dev
 * server, so against the built site the list shows that each extra here is
 * ready. What an extra does inside is its own tests' business. Desktop only.
 */
test.describe('Every extra opens and closes', () => {
  test.skip(({ isMobile }) => isMobile, 'One screen is enough to see that every extra loads.');

  test('every extra here is in the mission list on the site, under its title', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const welcomePage = new WelcomePage(sitePage);
    const hubPage = new HubPage(sitePage);

    // The list has no address of its own, so it is opened the way a visitor opens it.
    await test.step('Open the mission list from the welcome', async () => {
      await sitePage.goto(URLS.WELCOME(MISSIONS.DEFAULT));
      await missionPage.waitForLoad();
      await welcomePage.waitForLoad();
      await welcomePage.allMissions.click();
      await hubPage.waitForLoad();
    });

    await test.step('Each extra is listed, under its title', async () => {
      for (const extra of EXTRAS) {
        await expect(hubPage.extra(extra.id)).toBeVisible();
        await expect(hubPage.extra(extra.id)).toContainText(extra.title);
      }
    });
  });

  for (const extra of EXTRAS) {
    test(`${extra.id} opens over the mission and closes back to it`, async ({ sitePage }) => {
      const missionPage = new MissionPage(sitePage);
      const extraSheetPage = new ExtraSheetPage(sitePage);
      const cardPage = new EventCardPage(sitePage);

      await test.step('Open the extra by its address, over the mission', async () => {
        await sitePage.goto(URLS.EXTRA(MISSIONS.DEFAULT, extra.id));
        await missionPage.waitForLoad();
        await extraSheetPage.waitForLoad();
      });

      await test.step('The sheet shows the extra, under its title', async () => {
        await expect(extraSheetPage.sheet).toHaveAttribute('data-extra', extra.id);
        await expect(extraSheetPage.title).toHaveText(extra.title);
        await expect(extraSheetPage.host(extra.id)).toBeVisible();
        await expect(extraSheetPage.failed).toHaveCount(0);
      });

      await test.step('Close returns to the mission', async () => {
        await extraSheetPage.close.click();
        await expect(extraSheetPage.sheet).toBeHidden();
        await expect(extraSheetPage.host(extra.id)).toHaveCount(0);
        await expect(cardPage.title).toBeVisible();
      });
    });
  }
});

/**
 * A hands-on extra opened on its own, with no flight behind it, is played
 * to its end, and "Up next" flies the flight where it really happened: in a
 * real browser on a desktop and on a phone, where the next step is pinned
 * within reach however long the result is. What "Up next" says and offers
 * is tested in the interface tests (src/ui/extra-sheet.test.ts and each
 * extra's own tests).
 */
test.describe('The end of a hands-on extra', () => {
  test('a visitor docks the Gemini with the Agena, and flies the real first docking from Up next', async ({
    sitePage,
  }) => {
    // Closing in on the Agena at the toy's gentlest top speed takes over 20 seconds.
    test.slow();
    const missionPage = new MissionPage(sitePage);
    const extraSheetPage = new ExtraSheetPage(sitePage);
    const dockingPage = new DockingPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const realDocking = EVENTS.GEMINI_8_DOCKING;

    await test.step('Open Dock two spacecraft on its own, over the welcome', async () => {
      await sitePage.goto(URLS.EXTRA_ON_ITS_OWN('docking'));
      await missionPage.waitForLoad();
      await extraSheetPage.waitForLoad();
      await expect(extraSheetPage.sheet).toHaveAttribute('data-extra', 'docking');
    });

    await test.step('Start, line up with the keys, and dock, with focus on the line that says so', async () => {
      await dockingPage.start.click();
      await dockingPage.dockByKeys();
      await expect(dockingPage.docked).toBeFocused();
    });

    await test.step('Up next offers the real docking, its one button in view', async () => {
      await expect(extraSheetPage.upNext).toBeVisible();
      await expect(extraSheetPage.upNextTitle).toHaveText('See the real docking');
      await expect(extraSheetPage.upNextPrimary).toHaveText(`Fly ${realDocking.name}`);
      await expect(extraSheetPage.upNextPrimary).toBeInViewport();
    });

    await test.step('Fly it: the flight opens at its first docking', async () => {
      await extraSheetPage.upNextPrimary.click();
      await expect(sitePage).toHaveURL(
        new RegExp(`mission=${realDocking.mission}&event=${realDocking.id}`),
      );
      await missionPage.waitForLoad();
      await expect(missionPage.missionName).toHaveText(realDocking.name);
      await expect(cardPage.title).toHaveText(realDocking.title);
    });
  });

  test('a visitor lands the lunar module on clear ground, and flies the real first landing from Up next', async ({
    sitePage,
  }) => {
    // Sliding over to the clear ground and coming down on it takes about 18 seconds of the toy's time.
    test.slow();
    const missionPage = new MissionPage(sitePage);
    const extraSheetPage = new ExtraSheetPage(sitePage);
    const landingPage = new LandingPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const realLanding = EVENTS.APOLLO_11_LANDING;

    await test.step('Open Land on the Moon on its own, over the welcome', async () => {
      await sitePage.goto(URLS.EXTRA_ON_ITS_OWN('landing'));
      await missionPage.waitForLoad();
      await extraSheetPage.waitForLoad();
      await expect(extraSheetPage.sheet).toHaveAttribute('data-extra', 'landing');
    });

    await test.step('Start, slide over to the clear ground with the keys, and land, with focus on the line that says so', async () => {
      await landingPage.start.click();
      await landingPage.landByKeys();
      await expect(landingPage.landed).toBeFocused();
    });

    await test.step('Up next offers the real landing, its one button in view', async () => {
      await expect(extraSheetPage.upNext).toBeVisible();
      await expect(extraSheetPage.upNextTitle).toHaveText('See the real landing');
      await expect(extraSheetPage.upNextPrimary).toHaveText(`Fly ${realLanding.name}`);
      await expect(extraSheetPage.upNextPrimary).toBeInViewport();
    });

    await test.step('Fly it: the flight opens at its landing', async () => {
      await extraSheetPage.upNextPrimary.click();
      await expect(sitePage).toHaveURL(
        new RegExp(`mission=${realLanding.mission}&event=${realLanding.id}`),
      );
      await missionPage.waitForLoad();
      await expect(missionPage.missionName).toHaveText(realLanding.name);
      await expect(cardPage.title).toHaveText(realLanding.title);
    });
  });
});
