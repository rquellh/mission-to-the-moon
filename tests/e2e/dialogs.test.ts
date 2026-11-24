import { test, expect } from '../fixtures';
import { DialogsPage } from '../pages/DialogsPage';
import { EventCardPage } from '../pages/EventCardPage';
import { MissionPage } from '../pages/MissionPage';
import { RecordsPage } from '../pages/RecordsPage';
import { MISSIONS, URLS } from '../utils/vars';

/**
 * A dialog opens and gives focus back: focus moving into a dialog and out
 * again needs a real browser. What the dialogs show is tested in the
 * interface tests.
 */
test.describe('Dialogs', () => {
  test('About this mission opens from Tell me more, closes with Escape, and gives focus back', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const recordsPage = new RecordsPage(sitePage);
    const dialogsPage = new DialogsPage(sitePage);

    await test.step('Open the mission, exploring, with Tell me more open', async () => {
      await sitePage.goto(URLS.EXPLORE(MISSIONS.DEFAULT));
      await missionPage.waitForLoad();
      await cardPage.recordsToggle.click();
      await expect(recordsPage.records).toBeVisible();
    });

    await test.step('Open About this mission from the link at the end of Tell me more', async () => {
      await recordsPage.about.click();
      await expect(dialogsPage.about).toBeVisible();
      await expect(dialogsPage.aboutTitle).toHaveText('About Apollo 11');
      await expect(dialogsPage.aboutClose).toBeFocused();
    });

    await test.step('Escape closes it and focus returns to the link', async () => {
      await sitePage.keyboard.press('Escape');
      await expect(dialogsPage.about).toBeHidden();
      await expect(recordsPage.about).toBeFocused();
      await expect(recordsPage.records).toBeVisible();
    });
  });
});
