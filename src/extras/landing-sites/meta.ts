import type { ExtraMeta } from '../types.ts';

/**
 * The six flights whose lunar modules landed on the Moon, in flight order.
 * Kept here, with the meta that loads with the page, so the end of each of
 * those flights can suggest this extra; landings.ts reads the same list.
 */
export const LANDING_MISSIONS = [
  'apollo-11',
  'apollo-12',
  'apollo-14',
  'apollo-15',
  'apollo-16',
  'apollo-17',
] as const;

export const meta: ExtraMeta = {
  id: 'landing-sites',
  title: 'Six landings on the Moon',
  blurb: 'Turn the Moon and find the six places where an Apollo lunar module landed.',
  kind: 'explore',
  order: 40,
  status: 'ready',
  missions: LANDING_MISSIONS,
};
