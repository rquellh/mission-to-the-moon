import { expect, type Locator, type Page } from '@playwright/test';

/** A press in the climb: Tip over once the stage burning has `fuelLeft` (0 to 1) of its tank left, or Drop it. */
type Press = { key: 'ArrowRight'; fuelLeft: number } | { key: 'Space' };

/**
 * A clean climb with the Saturn V on Easy, as the interface tests fly it
 * (THREE_STAGES in src/extras/orbit/orbit.test.ts): Tip over at 3.8, 6.3,
 * 8.8, 11.3, 13.8 and 16.3 seconds after Start, and Drop it as soon as each
 * stage is empty (at about 7.1 and 15.2). The toy runs slower than the clock
 * when Chrome draws in software, so each tip waits for the fuel bar to run
 * down to where it is at that second. The stages burn for 7, 8 and 9
 * seconds, and a stage lights no sooner than the ones below it have burned,
 * so a tip timed from the soonest it could light may come late, never early.
 */
const CLIMB: readonly Press[] = [
  // At 3.8 and 6.3 seconds: the first stage, from Start.
  { key: 'ArrowRight', fuelLeft: (7 - 3.8) / 7 },
  { key: 'ArrowRight', fuelLeft: (7 - 6.3) / 7 },
  { key: 'Space' },
  // At 8.8, 11.3 and 13.8 seconds: the second stage, lit at 7 seconds at the soonest.
  { key: 'ArrowRight', fuelLeft: (15 - 8.8) / 8 },
  { key: 'ArrowRight', fuelLeft: (15 - 11.3) / 8 },
  { key: 'ArrowRight', fuelLeft: (15 - 13.8) / 8 },
  { key: 'Space' },
  // At 16.3 seconds: the third stage, lit at 15 seconds at the soonest.
  { key: 'ArrowRight', fuelLeft: (24 - 16.3) / 9 },
];

/**
 * How the climb watches the fuel: often, so each press comes well within
 * the second it may be late (expect.poll's own reads grow to a second
 * apart), and for longer than the default, since the 2.5 seconds of the
 * toy's time between presses take longer on a busy machine drawing in software.
 */
const WATCH = { intervals: [50], timeout: 30_000 };

/**
 * "Fly to orbit", inside the extra's sheet (ExtraSheetPage): the rocket on
 * the pad (`rocket`: "Apollo 11's rocket: the Saturn V"), the level picker
 * above Start (`levels`, a group of two radio buttons, `levelEasy` and
 * `levelHard`, named like "Easy. Your best: 3 of 3 stars."), Start, and
 * while flying the fuel strip's word for the stage burning (`fuel`: Plenty,
 * Getting low, Almost out, Empty) and its bar's fill (`fuelFill`, as wide
 * as the share of the tank left, to a tenth of a percent), the height
 * (`height`: Thick air, Thin air, Space), the sideways speed (`speed`:
 * Slow, Picking up, Fast, Orbit speed), the tilt (`tilt`: Straight up,
 * Leaning over, Halfway over, Nearly flat, Flat), and the coach line
 * (`coach`, which has focus when the fuel runs out). In orbit: the result
 * line (`result`: "You are in orbit.", which has focus when it shows) and
 * the title of the real event at orbit (`realTitle`). Each run ends with
 * the games' shared end of a run under its result line (or under the coach
 * line when the fuel runs out): the stars box (`starsBox`, with
 * `starsLine`: "All 3 stars on Easy"), `playAgain` (amber) and `otherLevel`
 * ("Play on Hard" or "Play on Easy"). Its end, "Up next", is
 * ExtraSheetPage's. The keys work on the page: the arrows tip the rocket,
 * and the space bar presses Drop it, which has the focus from Start.
 */
export class OrbitPage {
  readonly page: Page;
  readonly rocket: Locator;
  readonly levels: Locator;
  readonly levelEasy: Locator;
  readonly levelHard: Locator;
  readonly start: Locator;
  readonly fuel: Locator;
  readonly fuelFill: Locator;
  readonly height: Locator;
  readonly speed: Locator;
  readonly tilt: Locator;
  readonly coach: Locator;
  readonly result: Locator;
  readonly realTitle: Locator;
  readonly starsBox: Locator;
  readonly starsLine: Locator;
  readonly playAgain: Locator;
  readonly otherLevel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rocket = page.getByTestId('orbit-rocket');
    this.levels = page.getByTestId('game-levels');
    this.levelEasy = page.getByTestId('game-level-easy');
    this.levelHard = page.getByTestId('game-level-hard');
    this.start = page.getByTestId('orbit-start');
    this.fuel = page.getByTestId('orbit-fuel');
    this.fuelFill = page.getByTestId('orbit-fuel-fill');
    this.height = page.getByTestId('orbit-height');
    this.speed = page.getByTestId('orbit-speed');
    this.tilt = page.getByTestId('orbit-tilt');
    this.coach = page.getByTestId('orbit-coach');
    this.result = page.getByTestId('orbit-result');
    this.realTitle = page.getByTestId('orbit-real-title');
    this.starsBox = page.getByTestId('game-result');
    this.starsLine = page.getByTestId('game-stars-line');
    this.playAgain = page.getByTestId('game-play-again');
    this.otherLevel = page.getByTestId('game-other-level');
  }

  /**
   * Fly the Saturn V to orbit with the keys, once started on Easy (the level
   * a first visit starts on; CLIMB above).
   * Each tip waits until the bar shows the share of the tank left at its
   * second; the bar is rounded to a tenth of a percent, so it must read a
   * twentieth below that share for the tank to be there. Each drop waits for
   * the strip to say Empty, and then for the next stage to light with a
   * full tank.
   */
  async flyToOrbitByKeys(): Promise<void> {
    for (const press of CLIMB) {
      if (press.key === 'Space') {
        await expect.poll(() => this.fuel.textContent(), WATCH).toBe('Empty');
        await this.page.keyboard.press('Space');
        await expect(this.fuel).toHaveText('Plenty');
      } else {
        await expect
          .poll(() => this.fuelFill.evaluate((fill) => parseFloat(fill.style.width)), WATCH)
          .toBeLessThanOrEqual(press.fuelLeft * 100 - 0.05);
        await this.page.keyboard.press('ArrowRight');
      }
    }
    // Orbit comes about 6 seconds of the toy's time after the last tip (about 22 from Start), longer on a busy machine drawing in software.
    await expect(this.result).toBeVisible({ timeout: 30_000 });
  }
}
