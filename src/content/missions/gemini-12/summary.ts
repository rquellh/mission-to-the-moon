import type { MissionSummary } from '../../types.ts';

/**
 * Gemini 12 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'gemini-12',
  program: 'gemini',
  name: 'Gemini 12',
  kind: 'flight',
  destination: 'earth-orbit',
  blurb:
    'Gemini 12 was the last flight of the Gemini program, in November 1966. Jim Lovell and Buzz Aldrin docked with a target rocket, and Aldrin showed that an astronaut could work outside a spacecraft without wearing himself out.',
  date: '1966-11-11T20:46:33.419Z',
  duration: '094:34:30',
  hasTour: true,
  status: 'ready',
};
