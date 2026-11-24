import type { MissionSummary } from '../../types.ts';

/**
 * Apollo 13 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'apollo-13',
  program: 'apollo',
  name: 'Apollo 13',
  kind: 'flight',
  destination: 'moon',
  blurb:
    'Apollo 13 was meant to be the third Moon landing. On the way, an oxygen tank burst, so the crew used their lunar module as a lifeboat, swung around the Moon, and came home safely.',
  date: '1970-04-11T19:13:00Z',
  duration: '142:54:41',
  hasTour: true,
  status: 'ready',
};
