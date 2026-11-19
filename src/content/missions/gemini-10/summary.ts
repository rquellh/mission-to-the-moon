import type { MissionSummary } from "../../types.ts";

/**
 * Gemini 10 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "gemini-10",
  program: "gemini",
  name: "Gemini 10",
  kind: "flight",
  destination: "earth-orbit",
  blurb:
    "Gemini 10 flew for three days in July 1966. John Young and Michael Collins docked with an uncrewed target rocket called an Agena, rode its engine higher than anyone had flown before, and then met a second Agena, where Collins floated across on a spacewalk.",
  date: "1966-07-18T22:20:26.648Z",
  duration: "070:46:39",
  hasTour: true,
  status: "ready",
};
