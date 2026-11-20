import { expect, type Locator, type Page } from '@playwright/test';
import type { SceneReport } from '../../src/scene/report';

/**
 * The 3D view. A canvas cannot be looked into, so the scene describes what
 * it draws in a report (src/scene/report.ts); tests read that, never pixels.
 * The helpers in tests/utils/scene-report.ts find things in a report.
 */
export class ScenePage {
  readonly page: Page;
  readonly site: Locator;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.site = page.getByTestId('site');
    this.canvas = page.getByTestId('scene-canvas');
  }

  /** Wait until the scene has loaded and drawn, and can be asked for a report. */
  async waitForLoad(): Promise<void> {
    await expect(this.site).toHaveClass(/\bis-ready\b/);
    await expect(this.site).not.toHaveClass(/\bno-3d\b/);
    await expect(this.canvas).toHaveClass(/\bstage--visible\b/);
    await this.page.waitForFunction(() => typeof window.__missionScene === 'function');
  }

  /**
   * What the scene draws now. Things fade and fly in over a few frames, so
   * read it inside `expect.poll(...)` or `expect(...).toPass()`.
   */
  async report(): Promise<SceneReport> {
    const report = await this.page.evaluate(() => window.__missionScene?.() ?? null);
    if (!report) throw new Error('There is no scene report: the page has no 3D view.');
    return report;
  }
}
