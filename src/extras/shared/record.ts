/**
 * What this device remembers about one game: the level last chosen, and the
 * most stars earned on each level. It is kept in the extra's own store
 * (`context.store`, private to each extra), under two keys:
 *
 *   "level"   "easy" or "hard"
 *   "best"    { easy?: 0 | 1 | 2 | 3; hard?: 0 | 1 | 2 | 3 }
 *
 * The store never throws but may forget (a private window, say), and what
 * comes back may be anything an older build or another hand put there:
 * whatever is not one of the values above counts as nothing remembered. What
 * is saved is also kept here, so a store that forgets still remembers for as
 * long as the game stays open.
 */
import type { ExtraContext } from '../types.ts';
import { LEVELS, type Level } from './levels.ts';

/** How many stars a run earned: one for each of its three goals met. */
export type Stars = 0 | 1 | 2 | 3;

export interface GameRecord {
  /** The level last chosen on this device. Easy the first time. */
  level(): Level;
  chooseLevel(level: Level): void;
  /** The most stars earned on a level; null when no run on it has ever ended. */
  best(level: Level): Stars | null;
  /** Record the stars of a run that ended. True when it beats the best so far, and it is at least one star. */
  save(level: Level, stars: Stars): boolean;
}

/** The store's keys. */
const LEVEL_KEY = 'level';
const BEST_KEY = 'best';

const isLevel = (value: unknown): value is Level => LEVELS.includes(value as Level);

const isStars = (value: unknown): value is Stars =>
  value === 0 || value === 1 || value === 2 || value === 3;

/** What may be kept under "best": an object with a value for either level, not yet checked. */
interface StoredBests {
  easy?: unknown;
  hard?: unknown;
}

const isStoredBests = (value: unknown): value is StoredBests =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The bests in the store, level by level; a level whose value is not a count of stars has none. */
function readBests(store: ExtraContext['store']): Partial<Record<Level, Stars>> {
  const stored = store.get<unknown>(BEST_KEY);
  const bests: Partial<Record<Level, Stars>> = {};
  if (!isStoredBests(stored)) return bests;
  for (const level of LEVELS) {
    const stars = stored[level];
    if (isStars(stars)) bests[level] = stars;
  }
  return bests;
}

/** What this device remembers about the game whose store this is. */
export function gameRecord(store: ExtraContext['store']): GameRecord {
  const stored = store.get<unknown>(LEVEL_KEY);
  let chosen: Level = isLevel(stored) ? stored : 'easy';
  const bests = readBests(store);

  return {
    level: () => chosen,
    chooseLevel(level) {
      chosen = level;
      store.set(LEVEL_KEY, level);
    },
    best: (level) => bests[level] ?? null,
    save(level, stars) {
      const before = bests[level];
      if (before !== undefined && stars <= before) return false;
      bests[level] = stars;
      store.set(BEST_KEY, { ...bests });
      return stars > 0;
    },
  };
}
