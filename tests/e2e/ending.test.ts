import { test, expect } from '../fixtures';
import { EndingPage } from '../pages/EndingPage';
import { EventCardPage } from '../pages/EventCardPage';
import { MissionPage } from '../pages/MissionPage';
import { ScenePage } from '../pages/ScenePage';
import { followedShip, isInside } from '../utils/scene-report';
import { EVENTS, URLS } from '../utils/vars';

/**
 * A visitor explores a flight to its end, finishes, and flies on: the end of
 * the flight takes the card's place, "More to explore" opens the card
 * upward (a taller sheet on a phone) with the 3D view framed around it, and
 * the next flight opens at its own address, in a real browser on a desktop
 * and a phone. What the ending says and suggests is tested in the interface
 * tests (src/ui/ending.test.ts), and how the picks are chosen in
 * src/app/related.test.ts.
 */
/** True when the ship the view follows is drawn inside the area the interface leaves clear. */
async function followedShipIsClear(scenePage: ScenePage): Promise<boolean> {
  const report = await scenePage.report();
  const box = followedShip(report).box;
  return box !== null && isInside(box, report.clear);
}

test.describe('The end of a flight', () => {
  test('a visitor explores to the end, finishes, looks at what is next, and flies the next flight', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const scenePage = new ScenePage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const endingPage = new EndingPage(sitePage);
    const splashdown = EVENTS.APOLLO_11_SPLASHDOWN;

    await test.step('Open the last moment of the flight, at the end of the clock, in the Ship view', async () => {
      await sitePage.goto(URLS.EVENT(splashdown.mission, splashdown.id, 'spacecraft'));
      await missionPage.waitForLoad();
      await scenePage.waitForLoad();
    });

    await test.step('The last moment stays on the card, with Finish', async () => {
      await expect(cardPage.title).toHaveText(splashdown.title);
      await expect(cardPage.finish).toBeVisible();
      await expect(endingPage.ending).toBeHidden();
    });

    await test.step('Finish ends the flight in the card, with focus on its title', async () => {
      await cardPage.finish.click();
      await expect(cardPage.card).toBeHidden();
      await expect(endingPage.ending).toBeVisible();
      await expect(endingPage.title).toBeFocused();
      await expect(endingPage.next).toHaveText(`Next: ${splashdown.next.name}`);
    });

    await test.step('More to explore opens the card, and the ship stays clear of it', async () => {
      await endingPage.moreToggle.click();
      await expect(endingPage.more).toBeVisible();
      await expect(endingPage.moreTitle).toBeFocused();
      await expect(endingPage.pickNext).toBeVisible();
      // The camera eases into the framing the taller card leaves.
      await expect.poll(() => followedShipIsClear(scenePage)).toBe(true);
    });

    await test.step('Less puts the ending line back, with focus on its door', async () => {
      await endingPage.less.click();
      await expect(endingPage.more).toBeHidden();
      await expect(endingPage.moreToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(endingPage.moreToggle).toBeFocused();
    });

    await test.step('The next flight opens at its own address, exploring', async () => {
      await endingPage.next.click();
      await expect(sitePage).toHaveURL(
        new RegExp(`mission=${splashdown.next.mission}&start=explore`),
      );
      await missionPage.waitForLoad();
      await expect(missionPage.missionName).toHaveText(splashdown.next.name);
      await expect(missionPage.site).not.toHaveClass(/\bis-welcome\b/);
      await expect(cardPage.title).toHaveText(splashdown.next.firstTitle);
      await expect(endingPage.ending).toBeHidden();
    });
  });
});
