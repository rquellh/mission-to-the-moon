import { test, expect } from '../fixtures';
import { HubPage } from '../pages/HubPage';
import { MissionPage } from '../pages/MissionPage';
import { ScenePage } from '../pages/ScenePage';
import { TourPanelPage } from '../pages/TourPanelPage';
import { WelcomePage } from '../pages/WelcomePage';
import { overlaps } from '../utils/scene-report';
import { MISSIONS, URLS } from '../utils/vars';

/**
 * A visitor arrives at the welcome, in a real browser with the real 3D
 * scene: the scene frames itself beside the welcome (on a desktop) or above
 * it (on a phone), the mission list opens from it and gives focus back, and
 * the tour starts from it. What the welcome says is tested in the interface
 * tests (src/ui/welcome.test.ts).
 */
test.describe('The welcome', () => {
  test('a visitor arrives, looks at all missions, comes back, and takes the tour', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const welcomePage = new WelcomePage(sitePage);
    const hubPage = new HubPage(sitePage);
    const scenePage = new ScenePage(sitePage);
    const tourPage = new TourPanelPage(sitePage);

    await test.step('Open the mission, which starts with the welcome', async () => {
      await sitePage.goto(URLS.WELCOME(MISSIONS.DEFAULT));
      await missionPage.waitForLoad();
      await scenePage.waitForLoad();
      await welcomePage.waitForLoad();
      await expect(missionPage.site).toHaveClass(/\bis-welcome\b/);
      await expect(welcomePage.title).toBeFocused();
    });

    await test.step('The 3D view leaves the welcome out of the area it frames', async () => {
      await expect
        .poll(async () => {
          const report = await scenePage.report();
          const welcome = await welcomePage.welcome.boundingBox();
          return welcome !== null && !overlaps(welcome, report.clear);
        })
        .toBe(true);
    });

    await test.step('All missions opens the list over the welcome', async () => {
      await welcomePage.allMissions.click();
      await hubPage.waitForLoad();
      await expect(hubPage.close).toBeFocused();
    });

    await test.step('Escape closes the list, not the welcome, and focus returns to All missions', async () => {
      await sitePage.keyboard.press('Escape');
      await expect(hubPage.hub).toBeHidden();
      await expect(welcomePage.welcome).toBeVisible();
      await expect(missionPage.site).toHaveClass(/\bis-welcome\b/);
      await expect(welcomePage.allMissions).toBeFocused();
    });

    await test.step('Take the tour starts the tour at its first stop', async () => {
      await welcomePage.tour.click();
      await expect(welcomePage.welcome).toBeHidden();
      await expect(missionPage.site).not.toHaveClass(/\bis-welcome\b/);
      await expect(missionPage.site).toHaveClass(/\bis-touring\b/);
      await expect(tourPage.count).toContainText('Stop 1 of');
      await expect(tourPage.next).toBeFocused();
    });
  });
});
