import type { MissionSummary } from '../../types.ts';

/**
 * Apollo 14 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'apollo-14',
  program: 'apollo',
  name: 'Apollo 14',
  kind: 'flight',
  destination: 'moon',
  blurb:
    'Apollo 14 was the third mission to land people on the Moon. In February 1971, Alan Shepard and Edgar Mitchell explored the hilly Fra Mauro highlands while Stuart Roosa orbited above.',
  date: '1971-01-31T21:03:02Z',
  duration: '216:01:58.1',
  hasTour: true,
  status: 'ready',
};
