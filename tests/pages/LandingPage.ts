import { expect, type Locator, type Page } from '@playwright/test';

/**
 * "Land on the Moon", inside the extra's sheet (ExtraSheetPage): Start, the
 * fuel word over the picture (`fuel`: Plenty, Getting low, Almost out,
 * Empty), the falling speed (`falling`: Going up, Hovering, Slow and steady,
 * Too fast) and the sideways slide (`slide`: Almost still, Sliding left,
 * Sliding right), the coach line that says where the lander is and what to
 * push (`coach`, which has focus when the fuel runs out), and the line that
 * says it landed (`landed`, which has focus when it shows). Its end, "Up
 * next", is ExtraSheetPage's.
 */
export class LandingPage {
  readonly page: Page;
  readonly start: Locator;
  readonly fuel: Locator;
  readonly falling: Locator;
  readonly slide: Locator;
  readonly coach: Locator;
  readonly landed: Locator;

  constructor(page: Page) {
    this.page = page;
    this.start = page.getByTestId('landing-start');
    this.fuel = page.getByTestId('landing-fuel');
    this.falling = page.getByTestId('landing-falling');
    this.slide = page.getByTestId('landing-slide');
    this.coach = page.getByTestId('landing-coach');
    this.landed = page.getByTestId('landing-landed');
  }

  /**
   * Bring the lander down on the clear ground with the keys, once started.
   * It begins high over the boulders, left of the clear ground, coming down
   * too fast: slow the fall to slow and steady (Up twice) and slide right
   * (Right three times) until the coach says the clear ground is below; then
   * stop the slide (Left three times) and let it come down. The lander stays
   * over the clear ground for nearly 3 seconds of that slide, far longer
   * than the coach line takes to be read and the keys to be pressed.
   */
  async landByKeys(): Promise<void> {
    const press = async (key: string, times: number): Promise<void> => {
      for (let pressed = 0; pressed < times; pressed += 1) await this.page.keyboard.press(key);
    };
    await press('ArrowUp', 2);
    await expect(this.falling).toHaveText('Slow and steady');
    await press('ArrowRight', 3);
    await expect(this.slide).toHaveText('Sliding right');
    // Sliding over to the clear ground takes about 10 seconds of the toy's time from Start, longer on a busy machine drawing in software.
    await expect(this.coach).toHaveText('Clear ground below. Push Left to stop your slide.', {
      timeout: 45_000,
    });
    await press('ArrowLeft', 3);
    await expect(this.coach).toHaveText('Clear ground below. Come down slowly.');
    // Coming down from there, and settling on the footpads, takes about 8 seconds more of the toy's time.
    await expect(this.landed).toBeVisible({ timeout: 30_000 });
  }
}
