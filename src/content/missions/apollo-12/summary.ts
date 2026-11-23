import type { MissionSummary } from '../../types.ts';

/**
 * Apollo 12 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'apollo-12',
  program: 'apollo',
  name: 'Apollo 12',
  kind: 'flight',
  destination: 'moon',
  blurb:
    'Apollo 12 was the second mission to land people on the Moon. In November 1969, Pete Conrad and Alan Bean landed within walking distance of a robot spacecraft, Surveyor 3, while Richard Gordon orbited above.',
  date: '1969-11-14T16:22:00Z',
  duration: '244:36:25',
  hasTour: true,
  status: 'ready',
};
