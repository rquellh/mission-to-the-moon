import { test, expect } from '../fixtures';
import { EventCardPage } from '../pages/EventCardPage';
import { MissionPage } from '../pages/MissionPage';
import { RecordsPage } from '../pages/RecordsPage';
import { ScenePage } from '../pages/ScenePage';
import { TimelinePage } from '../pages/TimelinePage';
import {
  drawn,
  followedShip,
  isInside,
  leftBehindOf,
  overlapping,
  partOf,
  shipOf,
} from '../utils/scene-report';
import { EVENTS, MOMENTS, URLS } from '../utils/vars';

/**
 * What the 3D scene draws, read from the scene report: regression tests for
 * moments the scene has drawn wrong before, and the followed ship kept clear
 * of the moment card and its doors. On desktop and on a phone, where the
 * card takes the bottom of the view.
 */
/** True when the ship the view follows is drawn inside the area the interface leaves clear. */
async function followedShipIsClear(scenePage: ScenePage): Promise<boolean> {
  const report = await scenePage.report();
  const box = followedShip(report).box;
  return box !== null && isInside(box, report.clear);
}

test.describe('What the scene draws', () => {
  test('during an Apollo 17 moonwalk the lander and the rover are drawn, with no label, clear of the card and its doors', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const scenePage = new ScenePage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const recordsPage = new RecordsPage(sitePage);
    const timelinePage = new TimelinePage(sitePage);
    const moonwalk = EVENTS.APOLLO_17_THIRD_MOONWALK;

    await test.step('Open the third moonwalk in the Ship view', async () => {
      await sitePage.goto(URLS.EVENT(moonwalk.mission, moonwalk.id, 'spacecraft'));
      await missionPage.waitForLoad();
      await scenePage.waitForLoad();
    });

    await test.step('The view follows the lander, and the lander and the rover are drawn', async () => {
      await expect
        .poll(async () => {
          const report = await scenePage.report();
          return {
            followed: report.followed,
            lander: shipOf(report, 'lm').box !== null,
            rover: leftBehindOf(report, 'lunar-rover').box !== null,
          };
        })
        .toEqual({ followed: 'lm', lander: true, rover: true });
    });

    await test.step('No label is shown: nothing has been left behind yet', async () => {
      const report = await scenePage.report();
      expect(report.labels.length).toBeGreaterThan(0);
      for (const label of report.labels) {
        expect(label.opacity, label.text).toBe(0);
        expect(label.box, label.text).toBeNull();
      }
    });

    // The camera eases into each new framing, so wait for it to settle around the lander.
    await test.step('The lander is drawn where the card leaves the view clear', async () => {
      await expect.poll(() => followedShipIsClear(scenePage)).toBe(true);
    });

    await test.step('With Controls open, the view makes room and the lander stays clear of them', async () => {
      await cardPage.controlsToggle.click();
      await expect(timelinePage.timeline).toBeVisible();
      await expect.poll(() => followedShipIsClear(scenePage)).toBe(true);
    });

    await test.step('With Tell me more open instead, the lander stays clear of it', async () => {
      await cardPage.controlsToggle.click();
      await expect(timelinePage.timeline).toBeHidden();
      await cardPage.recordsToggle.click();
      await expect(recordsPage.records).toBeVisible();
      await expect.poll(() => followedShipIsClear(scenePage)).toBe(true);
    });
  });

  test('just after Apollo 17 lifts off the Moon, both labels are shown and cover nothing', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const scenePage = new ScenePage(sitePage);
    const afterLiftoff = MOMENTS.APOLLO_17_AFTER_LIFTOFF;

    await test.step('Open the moment after liftoff in the Ship view', async () => {
      await sitePage.goto(URLS.TIME(afterLiftoff.mission, afterLiftoff.t, 'spacecraft'));
      await missionPage.waitForLoad();
      await scenePage.waitForLoad();
    });

    await test.step('Both labels fade in', async () => {
      // A label fades in over half a second, to about 0.8.
      await expect
        .poll(async () =>
          (await scenePage.report()).labels.map(
            (label) => label.opacity > 0.5 && label.box !== null,
          ),
        )
        .toEqual([true, true]);
    });

    await test.step('The labels overlap neither each other, the parts left behind, nor the departing ship', async () => {
      const report = await scenePage.report();
      const labels = report.labels.map((label) => ({
        text: label.text,
        box: drawn(label.box, `The label "${label.text}"`),
      }));
      const parts = {
        'the descent stage': drawn(
          leftBehindOf(report, 'lm-descent-stage').box,
          'The descent stage',
        ),
        'the rover': drawn(leftBehindOf(report, 'lunar-rover').box, 'The rover'),
        'the departing ascent stage': drawn(shipOf(report, 'lm').box, 'The ascent stage'),
      };
      expect(labels).toHaveLength(2);
      for (const label of labels) {
        const otherLabels = Object.fromEntries(
          labels
            .filter((other) => other !== label)
            .map((other) => [`the label "${other.text}"`, other.box]),
        );
        expect(
          overlapping(label.box, { ...otherLabels, ...parts }),
          `What the label "${label.text}" covers`,
        ).toEqual([]);
      }
    });
  });

  test('on the Gemini 4 spacewalk the astronaut and the gas gun are drawn above the capsule', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const scenePage = new ScenePage(sitePage);
    const spacewalk = EVENTS.GEMINI_4_FLOATING_OUT;

    await test.step('Open the spacewalk in the Ship view', async () => {
      await sitePage.goto(URLS.EVENT(spacewalk.mission, spacewalk.id, 'spacecraft'));
      await missionPage.waitForLoad();
      await scenePage.waitForLoad();
    });

    await test.step('The astronaut and the gas gun are drawn', async () => {
      // The figure fades in over a few seconds.
      await expect
        .poll(async () => {
          const report = await scenePage.report();
          return [
            partOf(report, 'gemini', 'spacewalker').box !== null,
            partOf(report, 'gemini', 'gas-gun').box !== null,
          ];
        })
        .toEqual([true, true]);
    });

    await test.step('The astronaut rises above the reentry module rather than being drawn over it', async () => {
      const report = await scenePage.report();
      const figure = drawn(partOf(report, 'gemini', 'spacewalker').box, 'The astronaut');
      const capsule = drawn(
        partOf(report, 'gemini', 'gemini-reentry-module').box,
        'The reentry module',
      );
      // A smaller y is higher on the canvas.
      expect(
        figure.y,
        'the top of the astronaut, against the top of the reentry module',
      ).toBeLessThan(capsule.y);
    });
  });
});
