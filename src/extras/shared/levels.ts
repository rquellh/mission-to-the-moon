/**
 * The two levels every game offers: Easy, the game as it first was, and
 * Hard, the same job with less room to get it wrong. Each game says what
 * changes between them in its own rules (its game.ts) and in one short line
 * on its start screen (the level picker's `describe`).
 */

export type Level = 'easy' | 'hard';

/** In the order the start screen shows them. */
export const LEVELS: readonly Level[] = ['easy', 'hard'];

/** Each level's name on screen. */
export const LEVEL_NAME: Record<Level, string> = { easy: 'Easy', hard: 'Hard' };

/** The level that is not this one: what "Play on Hard" or "Play on Easy" switches to. */
export const otherLevel = (level: Level): Level => (level === 'easy' ? 'hard' : 'easy');
