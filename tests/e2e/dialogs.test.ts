import { test, expect } from '../fixtures';
import { DialogsPage } from '../pages/DialogsPage';
import { MissionPage } from '../pages/MissionPage';
import { MISSIONS, URLS } from '../utils/vars';

/**
 * A dialog opens and gives focus back: focus moving into a dialog and out
 * again needs a real browser. What the dialogs show is tested in the
 * interface tests.
 */
test.describe('Dialogs', () => {
  test('About this mission opens from the header, closes with Escape, and gives focus back', async ({ sitePage }) => {
    const missionPage = new MissionPage(sitePage);
    const dialogsPage = new DialogsPage(sitePage);

    await test.step('Open the mission, exploring', async () => {
      await sitePage.goto(URLS.EXPLORE(MISSIONS.DEFAULT));
      await missionPage.waitForLoad();
    });

    await test.step('Open About this mission from the header', async () => {
      await missionPage.aboutButton.click();
      await expect(dialogsPage.about).toBeVisible();
      await expect(dialogsPage.aboutTitle).toHaveText('About Apollo 11');
      await expect(dialogsPage.aboutClose).toBeFocused();
    });

    await test.step('Escape closes it and focus returns to the About button', async () => {
      await sitePage.keyboard.press('Escape');
      await expect(dialogsPage.about).toBeHidden();
      await expect(missionPage.aboutButton).toBeFocused();
    });
  });
});
