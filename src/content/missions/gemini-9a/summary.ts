import type { MissionSummary } from '../../types.ts';

/**
 * Gemini 9A in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'gemini-9a',
  program: 'gemini',
  name: 'Gemini 9A',
  kind: 'flight',
  destination: 'earth-orbit',
  blurb:
    'In June 1966, Tom Stafford and Gene Cernan flew Gemini 9A to a target whose nose cover was stuck half open, like the jaws of an "angry alligator," so they could not dock. They met it three different ways instead, and Cernan made a spacewalk that was much harder than anyone expected.',
  date: '1966-06-03T13:39:33.335Z',
  duration: '072:20:50',
  hasTour: true,
  status: 'ready',
};
