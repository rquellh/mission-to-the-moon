import { test, expect } from '../fixtures';
import { DockingPage } from '../pages/DockingPage';
import { EventCardPage } from '../pages/EventCardPage';
import { ExtraSheetPage } from '../pages/ExtraSheetPage';
import { MissionPage } from '../pages/MissionPage';
import { EVENTS, EXTRAS, MISSIONS, URLS } from '../utils/vars';

/**
 * Every extra opens and closes, over a mission, with no errors: each loads
 * its own code (some with a 3D view of their own), which only the whole site
 * shows. What an extra does inside is its own tests' business. Desktop only.
 */
test.describe('Every extra opens and closes', () => {
  test.skip(({ isMobile }) => isMobile, 'One screen is enough to see that every extra loads.');

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
});
