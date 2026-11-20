/**
 * Which camera views a mission offers, its home view, and the view used
 * when one is asked for that the mission does not offer.
 *
 * Run: npx vitest run src/app/views.test.ts
 */
import { describe, expect, it } from 'vitest';
import { story as apollo17 } from '../content/missions/apollo-17/story.ts';
import { story as gemini8 } from '../content/missions/gemini-8/story.ts';
import { homeView, nearestView, viewsFor } from './views.ts';

describe('views', () => {
  it('a Moon flight offers Earth, the Moon, the ship, and both, and starts with both', () => {
    expect(viewsFor(apollo17)).toEqual(['earth', 'moon', 'spacecraft', 'journey']);
    expect(homeView(apollo17)).toBe('journey');
  });

  it('an Earth-orbit flight offers Earth and the ship, and starts with Earth', () => {
    expect(viewsFor(gemini8)).toEqual(['earth', 'spacecraft']);
    expect(homeView(gemini8)).toBe('earth');
  });

  it('keeps a view the mission offers, and goes home from one it does not', () => {
    expect(nearestView(apollo17, 'moon')).toBe('moon');
    expect(nearestView(gemini8, 'spacecraft')).toBe('spacecraft');
    expect(nearestView(gemini8, 'moon')).toBe('earth');
    expect(nearestView(gemini8, 'journey')).toBe('earth');
  });
});
