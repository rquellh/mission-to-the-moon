import type { MissionSummary } from '../../types.ts';

/**
 * Gemini 5 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: 'gemini-5',
  program: 'gemini',
  name: 'Gemini 5',
  kind: 'flight',
  destination: 'earth-orbit',
  blurb:
    "Gemini 5 stayed in orbit for almost eight days in August 1965, about as long as a trip to the Moon and back. Gordon Cooper and Pete Conrad set a new record, even after trouble with their spacecraft's new power supply.",
  date: '1965-08-21T13:59:59.518Z',
  duration: '190:55:14',
  hasTour: true,
  status: 'ready',
};
