/**
 * Shared helpers for the browser tests. Element access belongs in the page
 * objects (tests/pages); waits belong on elements and the scene report.
 * Nothing here sleeps.
 */
import type { Page } from '@playwright/test';

/**
 * Open the next page as a browser without WebGL would: every canvas refuses
 * a WebGL context, so the site must fall back to reading without a 3D view.
 * Call before `goto`.
 */
export async function withoutWebGL(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
      const [kind] = args;
      if (typeof kind === 'string' && kind.toLowerCase().includes('webgl')) return null;
      return getContext.apply(this, args as Parameters<typeof getContext>);
    } as typeof getContext;
  });
}

/** Seconds since liftoff from the mission clock's text ("102:45:39", or "−00:00:10" before liftoff). */
export function clockSeconds(text: string): number {
  const negative = /^[−-]/.test(text.trim());
  const [hours = 0, minutes = 0, seconds = 0] = text
    .trim()
    .replace(/^[−-]/, '')
    .split(':')
    .map((part) => Number(part));
  const total = hours * 3600 + minutes * 60 + seconds;
  return negative ? -total : total;
}
