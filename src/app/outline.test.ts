/**
 * What the interface reads from a flight's plan and vehicle file (how many
 * ships, a Moon landing, a splashdown, a published spin), and every source
 * a flight cites, wherever it is cited.
 *
 * Run: npx vitest run src/app/outline.test.ts
 */
import { describe, expect, it } from 'vitest';
import { bundle as apollo8 } from '../content/missions/apollo-8/index.ts';
import { bundle as apollo11 } from '../content/missions/apollo-11/index.ts';
import { bundle as gemini7 } from '../content/missions/gemini-7/index.ts';
import { bundle as gemini8 } from '../content/missions/gemini-8/index.ts';
import { outlineOf, sourcesCitedBy } from './outline.ts';

describe('outlineOf', () => {
  it('Apollo 11: two ships, a Moon landing, and a splashdown', () => {
    expect(outlineOf(apollo11)).toEqual({ ships: 2, landsOnMoon: true, splashdown: true, turns: false });
  });

  it('Apollo 8: one ship around the Moon and home, with no landing', () => {
    expect(outlineOf(apollo8)).toEqual({ ships: 1, landsOnMoon: false, splashdown: true, turns: false });
  });

  it('Gemini 8: two ships in Earth orbit, and a published spin', () => {
    expect(outlineOf(gemini8)).toEqual({ ships: 2, landsOnMoon: false, splashdown: true, turns: true });
  });
});

describe('sourcesCitedBy', () => {
  it("finds a flight's own sources, the shared ones, and those kept with other missions", () => {
    const cited = sourcesCitedBy(gemini7);

    expect(cited).toContain('gemini-7-nasa-mission-page');
    expect(cited).toContain('gemini-6a-gemini-vii-mission-report');
    expect(cited).toContain('gemini-8-mission-report');
    expect(cited).not.toContain('gemini-6a-nasa-mission-page');
  });
});
