import type { MissionSummary } from '../../types.ts';

/**
 * Gemini 11 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'gemini-11',
  program: 'gemini',
  name: 'Gemini 11',
  kind: 'flight',
  destination: 'earth-orbit',
  blurb:
    "In September 1966, Gemini 11 caught and docked with its Agena target on its very first trip around Earth. Then Pete Conrad and Dick Gordon used the Agena's engine to fly higher than any crew had gone before.",
  date: '1966-09-12T14:42:26.546Z',
  duration: '071:17:08',
  hasTour: true,
  status: 'ready',
};
