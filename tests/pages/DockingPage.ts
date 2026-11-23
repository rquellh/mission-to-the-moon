import { expect, type Locator, type Page } from '@playwright/test';

/**
 * "Dock two spacecraft", inside the extra's sheet (ExtraSheetPage): Start,
 * the "Off center" read-out (`aim`, which says "Lined up" once the nose is
 * lined up with the cone), and the line that says it docked (`docked`,
 * which has focus when it shows). Its end, "Up next", is ExtraSheetPage's.
 */
export class DockingPage {
  readonly page: Page;
  readonly start: Locator;
  readonly aim: Locator;
  readonly docked: Locator;

  constructor(page: Page) {
    this.page = page;
    this.start = page.getByTestId('docking-start');
    this.aim = page.getByTestId('docking-aim');
    this.docked = page.getByTestId('docking-docked');
  }

  /**
   * Fly the Gemini into the cone with the keys, once started. It begins off
   * to the left and a little high, drifting left: close in at the gentlest
   * top speed (F three times), and push right and down until the read-out
   * says it is lined up; then stop the sideways drift (it is still lined up,
   * since it crosses the ring for over two seconds) and let it close in.
   */
  async dockByKeys(): Promise<void> {
    const press = async (key: string, times: number): Promise<void> => {
      for (let pressed = 0; pressed < times; pressed += 1) await this.page.keyboard.press(key);
    };
    await press('f', 3);
    await press('ArrowRight', 7);
    await press('ArrowDown', 2);
    await expect(this.aim).toHaveText('Lined up');
    await press('ArrowLeft', 6);
    await press('ArrowUp', 2);
    await expect(this.aim).toHaveText('Lined up');
    // Closing in takes about 22 seconds of the toy's time from Start, longer on a busy machine drawing in software.
    await expect(this.docked).toBeVisible({ timeout: 60_000 });
  }
}
