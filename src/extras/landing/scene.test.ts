/**
 * The boulders of the "Land on the Moon" view are placed by hand around the
 * patch of clear ground, where the rules say the ground is flat: a boulder
 * drawn there would look like rock the lander could not land on. Only
 * pebbles may lie on the patch, on either level. Hard's patch starts
 * farther right, and the strip of ground it gives up is rough, so the view
 * covers that strip with boulders of its own on Hard. Nothing is drawn; the
 * test reads the view's tables of boulders. The rules themselves are tested
 * in game.test.ts.
 *
 * Run: npx vitest run src/extras/landing/scene.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { Level } from '../shared/levels.ts';
import { LEVEL_RULES, RULES } from './game.ts';
import { BOULDERS, HARD_ONLY_BOULDERS, bouldersOn, type Boulder } from './scene.ts';

/** Narrower than this, a rock is a pebble, too small to look like a boulder. */
const PEBBLE_WIDTH = 0.5;
/** Nearer the lander's path than this, a boulder is one the footpads would meet. */
const ON_THE_PATH = 1.2;

/**
 * How far a boulder reaches to each side of its middle as the view draws
 * it: its width and its depth, turned about the vertical by its turn.
 */
function reach([, , width, , depth, turn]: Boulder): number {
  return (width / 2) * Math.abs(Math.cos(turn)) + (depth / 2) * Math.abs(Math.sin(turn));
}

/** Whether any part of a boulder is over a level's clear patch. */
function overThePatch(boulder: Boulder, level: Level): boolean {
  const [x] = boulder;
  return x + reach(boulder) > LEVEL_RULES[level].clearFrom && x - reach(boulder) < RULES.clearTo;
}

describe('the landing view', () => {
  describe('the boulders', () => {
    it.each<Level>(['easy', 'hard'])(
      'keeps every boulder off the clear patch on %s, leaving it to pebbles',
      (level) => {
        const onThePatch = bouldersOn(level).filter(
          (boulder) => boulder[2] >= PEBBLE_WIDTH && overThePatch(boulder, level),
        );

        expect(onThePatch).toEqual([]);
      },
    );

    it('shows the boulders of both levels on each, and the ones only Hard has on Hard alone', () => {
      expect(bouldersOn('easy')).toEqual(BOULDERS);
      expect(bouldersOn('hard')).toEqual([...BOULDERS, ...HARD_ONLY_BOULDERS]);
    });

    it("covers the lander's path across the strip Hard gives up, which is clear ground on Easy", () => {
      const from = LEVEL_RULES.easy.clearFrom;
      const to = LEVEL_RULES.hard.clearFrom;

      const onThePath = HARD_ONLY_BOULDERS.filter(([, z]) => Math.abs(z) < ON_THE_PATH);

      expect(onThePath.length).toBeGreaterThan(0);
      for (const [x] of onThePath) {
        expect(x).toBeGreaterThan(from);
        expect(x).toBeLessThan(to);
      }
      // The strip is rough on Hard all the way to its patch: the nearest boulder on the path ends within half a meter of it.
      const nearest = Math.max(...onThePath.map((boulder) => boulder[0] + reach(boulder)));
      expect(to - nearest).toBeLessThan(0.5);
    });
  });
});
