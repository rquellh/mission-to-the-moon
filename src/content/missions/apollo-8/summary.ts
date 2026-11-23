import type { MissionSummary } from '../../types.ts';

/**
 * Apollo 8 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'apollo-8',
  program: 'apollo',
  name: 'Apollo 8',
  kind: 'flight',
  destination: 'moon',
  blurb:
    'Apollo 8 was the first mission to carry people to the Moon and back. In December 1968, Frank Borman, Jim Lovell, and Bill Anders circled the Moon ten times without landing, then came safely home.',
  date: '1968-12-21T12:51:00Z',
  duration: '147:00:42.0',
  hasTour: true,
  status: 'ready',
};
