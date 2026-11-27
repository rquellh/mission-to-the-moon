/**
 * The boulders of the "Land on the Moon" view are placed by hand around the
 * patch of clear ground, where the rules say the ground is flat: a boulder
 * drawn there would look like rock the lander could not land on. Only
 * pebbles may lie on the patch. Nothing is drawn; the test reads the view's
 * table of boulders. The rules themselves are tested in game.test.ts.
 *
 * Run: npx vitest run src/extras/landing/scene.test.ts
 */
import { describe, expect, it } from 'vitest';
import { RULES } from './game.ts';
import { BOULDERS, type Boulder } from './scene.ts';

/** Narrower than this, a rock is a pebble, too small to look like a boulder. */
const PEBBLE_WIDTH = 0.5;

/**
 * How far a boulder reaches to each side of its middle as the view draws
 * it: its width and its depth, turned about the vertical by its turn.
 */
function reach([, , width, , depth, turn]: Boulder): number {
  return (width / 2) * Math.abs(Math.cos(turn)) + (depth / 2) * Math.abs(Math.sin(turn));
}

/** Whether any part of a boulder is over the clear patch. */
function overThePatch(boulder: Boulder): boolean {
  const [x] = boulder;
  return x + reach(boulder) > RULES.clearFrom && x - reach(boulder) < RULES.clearTo;
}

describe('the landing view', () => {
  describe('the boulders', () => {
    it('keeps every boulder off the clear patch, leaving it to pebbles', () => {
      const onThePatch = BOULDERS.filter(
        (boulder) => boulder[2] >= PEBBLE_WIDTH && overThePatch(boulder),
      );

      expect(onThePatch).toEqual([]);
    });
  });
});
