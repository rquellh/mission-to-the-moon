import type { MissionSummary } from '../../types.ts';

/**
 * Apollo 11 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'apollo-11',
  program: 'apollo',
  name: 'Apollo 11',
  kind: 'flight',
  destination: 'moon',
  blurb:
    'Apollo 11 was the first mission to land people on the Moon. In July 1969, Neil Armstrong and Buzz Aldrin walked on the Moon while Michael Collins orbited above.',
  date: '1969-07-16T13:32:00Z',
  duration: '195:18:35',
  hasTour: true,
  status: 'ready',
};
