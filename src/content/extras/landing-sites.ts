import type { Source } from '../source-types.ts';

/** Sources cited only by the landing sites extra. */
export const sources = {} as const satisfies Record<string, Source>;
