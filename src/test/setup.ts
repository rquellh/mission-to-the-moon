/**
 * Runs before every interface test file (the "ui" project in vitest.config.ts).
 *
 * - Adds the jest-dom matchers (toBeInTheDocument, toBeVisible, toHaveAccessibleName, ...).
 * - Fills in the browser features jsdom lacks (src/test/browser.ts).
 * - After each test: closes any open dialog (so the page can tidy up), empties
 *   the page and the device's storage, puts the screen, sound, and address
 *   back, and undoes every stub and spy. Each test starts from a fresh page.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { installBrowser, resetBrowser } from './browser.ts';

installBrowser();

afterEach(() => {
  resetBrowser();
  document.body.replaceChildren();
  document.body.className = '';
  window.localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
