import type { MissionSummary } from "../../types.ts";

/**
 * Gemini 4 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "gemini-4",
  program: "gemini",
  name: "Gemini 4",
  kind: "flight",
  destination: "earth-orbit",
  blurb:
    "Gemini 4 stayed in orbit for four days in June 1965. On the first day, Ed White floated outside on a tether, the first American to walk in space, while Jim McDivitt flew the spacecraft.",
  date: "1965-06-03T15:15:59.562Z",
  duration: "097:56:12",
  hasTour: true,
  status: "ready",
};
