import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Mission to the Moon.
 *
 * - Page objects hold the locators; specs in e2e/ use them (see
 *   .claude/skills/e2e-testing).
 * - The tests drive the Google Chrome already installed on the machine
 *   (`channel: 'chrome'`), so there is no browser to download. Chrome draws
 *   the 3D scene in software, the same on a laptop and on a build server.
 * - The site is started for you: the dev server by default, or the built
 *   site with E2E_TARGET=preview (run `npm run build` first; `npm run
 *   test:e2e:preview` does both). A server that is already running is reused.
 * - A desktop window and a phone, in parallel.
 */

const preview = process.env.E2E_TARGET === 'preview';
const port = preview ? 4173 : 5173;
// The site is served from the root of the server; its own links are relative.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}/`;

/** Software WebGL, so the scene draws without a graphics card (as tools/screenshot.mjs does). */
const WEBGL_IN_SOFTWARE = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const config = defineConfig({
  testDir: './e2e',

  fullyParallel: true,

  // Fail the build if a test.only was left in the source.
  forbidOnly: !!process.env.CI,

  // Retry on the build server only, for the odd slow frame.
  retries: process.env.CI ? 2 : 0,

  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { outputFolder: 'e2e/report', open: 'never' }]]
    : [['html', { outputFolder: 'e2e/report', open: 'never' }], ['list']],

  // Traces of failed tests.
  outputDir: 'e2e/results',

  // The scene's textures load before a page is ready; software drawing is slow.
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    headless: true,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    launchOptions: { args: WEBGL_IN_SOFTWARE },
  },

  projects: [
    {
      name: 'chrome-desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'chrome-phone',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],

  webServer: {
    command: preview ? `npm run preview -- --port ${port} --strictPort` : `npm run dev -- --port ${port} --strictPort`,
    cwd: '..',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

// Each page draws a 3D scene in software, which keeps a processor core busy.
// On a laptop Playwright picks the count (half the cores).
if (process.env.CI) config.workers = 2;

export default config;
