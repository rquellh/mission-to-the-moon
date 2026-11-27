import { defineConfig } from 'vitest/config';

/**
 * One runner, two kinds of test (see .claude/skills/test-planning):
 *
 * - "flight": the mission content and the flight math, run in plain Node.
 *   Nothing here touches a page.
 * - "ui": the interface (src/ui, src/extras) mounted over the real
 *   index.html in jsdom, with the 3D scene and the screen's clock replaced
 *   at their seams (src/test).
 *
 * The browser tests are not here: Playwright runs them (tests/).
 */
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'flight',
          environment: 'node',
          include: [
            'src/sim/**/*.test.ts',
            'src/app/**/*.test.ts',
            'src/content/**/*.test.ts',
            'src/scene/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/ui/**/*.test.ts', 'src/extras/**/*.test.ts'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
