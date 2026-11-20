import { test, expect } from '../fixtures';
import { EventCardPage } from '../pages/EventCardPage';
import { ExtraSheetPage } from '../pages/ExtraSheetPage';
import { MissionPage } from '../pages/MissionPage';
import { EXTRAS, MISSIONS, URLS } from '../utils/vars';

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
