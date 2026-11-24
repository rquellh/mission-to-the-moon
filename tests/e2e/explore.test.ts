import { test, expect } from '../fixtures';
import { EventCardPage } from '../pages/EventCardPage';
import { HubPage } from '../pages/HubPage';
import { MissionPage } from '../pages/MissionPage';
import { ScenePage } from '../pages/ScenePage';
import { TimelinePage } from '../pages/TimelinePage';
import { clockSeconds } from '../utils/helpers';
import { followedShip, isInside } from '../utils/scene-report';
import { MISSIONS, URLS } from '../utils/vars';

/**
 * A visitor opens a mission and looks around: the view buttons move the
 * real camera, True scale redraws the scene, and Play runs the real clock.
 * The scene report says what the camera shows; the interface tests cover
 * which view the buttons ask for.
 */
test.describe('Exploring a mission', () => {
  test('a visitor chooses Explore from the welcome and looks through each view', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const hubPage = new HubPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const scenePage = new ScenePage(sitePage);

    await test.step('Open the mission, which starts with the welcome', async () => {
      await sitePage.goto(URLS.WELCOME(MISSIONS.DEFAULT));
      await missionPage.waitForLoad();
      await hubPage.waitForLoad();
      await expect(hubPage.hub).toHaveAttribute('data-mode', 'welcome');
      await expect(missionPage.site).toHaveClass(/\bis-welcome\b/);
    });

    await test.step('Choose Explore on the loaded mission', async () => {
      await hubPage.missionExplore(MISSIONS.DEFAULT).click();
      await expect(hubPage.hub).toBeHidden();
      await expect(missionPage.site).not.toHaveClass(/\bis-welcome\b/);
      await expect(cardPage.title).toBeVisible();
    });

    for (const view of ['earth', 'moon', 'journey', 'spacecraft'] as const) {
      await test.step(`Press the ${view} view button and the scene follows`, async () => {
        await missionPage.viewButton(view).click();
        await expect(missionPage.viewButton(view)).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(async () => (await scenePage.report()).view).toBe(view);
      });
    }

    await test.step('In the Ship view, the craft is drawn where the interface leaves the view clear', async () => {
      // The camera eases into the view, so wait for it to settle around the craft.
      await expect
        .poll(async () => {
          const report = await scenePage.report();
          const box = followedShip(report).box;
          return box !== null && isInside(box, report.clear);
        })
        .toBe(true);
    });

    await test.step('True scale redraws the scene at true scale', async () => {
      await missionPage.scaleToggle.click();
      await expect(missionPage.scaleToggle).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => (await scenePage.report()).scaleMode).toBe('true');
    });
  });

  test('Play runs the mission clock, and the scene with it', async ({ sitePage }) => {
    const missionPage = new MissionPage(sitePage);
    const timelinePage = new TimelinePage(sitePage);
    const scenePage = new ScenePage(sitePage);
    let clockBefore = 0;
    let sceneBefore = 0;

    await test.step('Open the mission, exploring', async () => {
      await sitePage.goto(URLS.EXPLORE(MISSIONS.DEFAULT));
      await missionPage.waitForLoad();
      await scenePage.waitForLoad();
      await expect(timelinePage.play).toHaveAttribute('aria-label', 'Play');
      clockBefore = clockSeconds(await timelinePage.clockTime.innerText());
      sceneBefore = (await scenePage.report()).time;
    });

    await test.step('Press Play', async () => {
      await timelinePage.play.click();
      await expect(timelinePage.play).toHaveAttribute('aria-label', 'Pause');
    });

    await test.step('The clock and the scene move on', async () => {
      await expect
        .poll(async () => clockSeconds(await timelinePage.clockTime.innerText()))
        .toBeGreaterThan(clockBefore);
      await expect.poll(async () => (await scenePage.report()).time).toBeGreaterThan(sceneBefore);
    });
  });
});
