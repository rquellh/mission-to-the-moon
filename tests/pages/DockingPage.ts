import { expect, type Locator, type Page } from '@playwright/test';

/**
 * "Dock two spacecraft", inside the extra's sheet (ExtraSheetPage): the
 * level picker above Start (`levels`, a group of two radio buttons,
 * `levelEasy` and `levelHard`, named like "Easy. Your best: 2 of 3
 * stars."), Start, the "Off center" read-out (`aim`, which says "Lined up"
 * once the nose is lined up with the cone), and the line that says it
 * docked (`docked`, which has focus when it shows). Each docking ends with
 * the games' shared end of a run under that line: the stars box (`result`,
 * with `starsLine`: "2 of 3 stars on Easy"), `playAgain` (amber) and
 * `otherLevel` ("Play on Hard" or "Play on Easy"). Its end, "Up next", is
 * ExtraSheetPage's.
 */
export class DockingPage {
  readonly page: Page;
  readonly levels: Locator;
  readonly levelEasy: Locator;
  readonly levelHard: Locator;
  readonly start: Locator;
  readonly aim: Locator;
  readonly docked: Locator;
  readonly result: Locator;
  readonly starsLine: Locator;
  readonly playAgain: Locator;
  readonly otherLevel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.levels = page.getByTestId('game-levels');
    this.levelEasy = page.getByTestId('game-level-easy');
    this.levelHard = page.getByTestId('game-level-hard');
    this.start = page.getByTestId('docking-start');
    this.aim = page.getByTestId('docking-aim');
    this.docked = page.getByTestId('docking-docked');
    this.result = page.getByTestId('game-result');
    this.starsLine = page.getByTestId('game-stars-line');
    this.playAgain = page.getByTestId('game-play-again');
    this.otherLevel = page.getByTestId('game-other-level');
  }

  /**
   * Fly the Gemini into the cone with the keys, once started on Easy (the
   * level a first visit starts on). It begins off to the left and a little
   * high, drifting left: close in at the gentlest top speed (F three times),
   * and push right and down until the read-out says it is lined up; then
   * stop the sideways drift (it is still lined up, since it crosses the ring
   * for over two seconds) and let it close in. It touches at Easy's fastest
   * gentle speed with no bump: two of the three stars.
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
