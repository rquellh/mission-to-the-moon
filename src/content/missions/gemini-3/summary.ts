import type { MissionSummary } from "../../types.ts";

/**
 * Gemini 3 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "gemini-3",
  program: "gemini",
  name: "Gemini 3",
  kind: "flight",
  destination: "earth-orbit",
  blurb:
    "Gemini 3 was the first Gemini flight with a crew. On March 23, 1965, Gus Grissom and John Young circled Earth three times and became the first crew ever to change their orbit with their own thrusters.",
  date: "1965-03-23T14:24:00.064Z",
  duration: "004:52:31",
  hasTour: true,
  status: "ready",
};
