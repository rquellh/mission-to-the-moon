import type { MissionSummary } from "../../types.ts";

/**
 * Gemini 8 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "gemini-8",
  program: "gemini",
  name: "Gemini 8",
  kind: "flight",
  destination: "earth-orbit",
  blurb:
    "Gemini 8 made the first docking of two spacecraft in orbit, in March 1966. Then a stuck thruster set it spinning, and Neil Armstrong and David Scott had to come home early.",
  date: "1966-03-16T16:41:02.389Z",
  duration: "010:41:26",
  hasTour: true,
  status: "ready",
};
