import { test, expect } from '../fixtures';
import { EventCardPage } from '../pages/EventCardPage';
import { MissionPage } from '../pages/MissionPage';
import { TimelinePage } from '../pages/TimelinePage';
import { clockSeconds, withoutWebGL } from '../utils/helpers';
import { MISSIONS, URLS } from '../utils/vars';

/**
 * Without WebGL the mission can still be read. Only the whole site can show
 * the fallback: src/main.ts finds no WebGL and mounts the interface without
 * a scene. Desktop only: the fallback does not depend on the screen.
 */
test.describe('Without WebGL', () => {
  test.skip(({ isMobile }) => isMobile, 'The fallback does not depend on the screen.');

  test('the site says there is no 3D view, and the card, Controls, and Play still work', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const timelinePage = new TimelinePage(sitePage);
    let clockBefore = 0;

    await test.step('Open the mission in a browser that has no WebGL', async () => {
      await withoutWebGL(sitePage);
      await sitePage.goto(URLS.EXPLORE(MISSIONS.DEFAULT));
      await missionPage.waitForLoad();
    });

    await test.step('The page says there is no 3D view, in place of the view buttons', async () => {
      await expect(missionPage.site).toHaveClass(/\bno-3d\b/);
      await expect(missionPage.stageNote).toBeVisible();
      await expect(missionPage.stageNoteText).toContainText('can’t show the 3D view');
      // Reloading cannot bring WebGL back, so it is not offered.
      await expect(missionPage.stageNoteReload).toHaveCount(0);
      await expect(missionPage.views).toBeHidden();
    });

    await test.step('Controls open with no view buttons, and step the card to the next event', async () => {
      await expect(cardPage.title).toHaveText('Liftoff');
      await cardPage.controlsToggle.click();
      await expect(missionPage.views).toBeHidden();
      await cardPage.next.click();
      await expect(cardPage.title).toHaveText('First stage separates');
    });

    await test.step('Play runs the mission clock', async () => {
      clockBefore = clockSeconds(await timelinePage.clockTime.innerText());
      await timelinePage.play.click();
      await expect(timelinePage.play).toHaveAttribute('aria-label', 'Pause');
      await expect
        .poll(async () => clockSeconds(await timelinePage.clockTime.innerText()))
        .toBeGreaterThan(clockBefore);
    });
  });
});
