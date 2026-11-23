import { test, expect } from '../fixtures';
import { HubPage } from '../pages/HubPage';
import { MissionPage } from '../pages/MissionPage';
import { ScenePage } from '../pages/ScenePage';
import { WelcomePage } from '../pages/WelcomePage';
import { followedShip } from '../utils/scene-report';
import { FLIGHT_IDS, MISSIONS, URLS } from '../utils/vars';

/**
 * Every mission opens: a smoke test per flight, so a new mission is covered
 * the moment it is listed. Its content rules are checked for every mission
 * in src/sim/test/all-missions.test.ts; this checks that the whole site
 * loads it, draws it, and logs no errors. Desktop only: 21 pages are enough.
 */
test.describe('Every mission opens', () => {
  test.skip(({ isMobile }) => isMobile, 'One screen is enough to see that every mission loads.');

  test('the flight list here matches the mission list on the site', async ({ sitePage }) => {
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

    await test.step('Every flight and the memorial page are listed, and nothing else', async () => {
      const listed = await hubPage.missions.evaluateAll((entries) =>
        entries.map((entry) => entry.getAttribute('data-testid')),
      );
      const expected = [...FLIGHT_IDS, MISSIONS.MEMORIAL].map((id) => `hub-mission-${id}`);
      expect([...listed].sort()).toEqual([...expected].sort());
    });
  });

  for (const id of FLIGHT_IDS) {
    test(`${id} opens in the Ship view with its craft drawn`, async ({ sitePage }) => {
      const missionPage = new MissionPage(sitePage);
      const scenePage = new ScenePage(sitePage);

      await test.step('Open the mission in the Ship view', async () => {
        await sitePage.goto(URLS.EXPLORE(id, 'spacecraft'));
        await missionPage.waitForLoad();
        await scenePage.waitForLoad();
      });

      await test.step('The Ship view is on and the followed craft is drawn', async () => {
        await expect(missionPage.viewButton('spacecraft')).toHaveAttribute('aria-pressed', 'true');
        await expect
          .poll(async () => {
            const report = await scenePage.report();
            return { view: report.view, drawn: followedShip(report).box !== null };
          })
          .toEqual({ view: 'spacecraft', drawn: true });
      });
    });
  }
});
