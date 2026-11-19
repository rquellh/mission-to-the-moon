import type { MissionSummary } from "../../types.ts";

/**
 * Gemini 7 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "gemini-7",
  program: "gemini",
  name: "Gemini 7",
  kind: "flight",
  destination: "earth-orbit",
  blurb:
    "Gemini 7 kept Frank Borman and Jim Lovell in orbit for almost 14 days in December 1965, to test whether people could stay in space longer than a Moon landing mission would need. Partway through, Gemini 6A flew up to meet them: the first meeting of two spacecraft with crews.",
  date: "1965-12-04T19:30:03.702Z",
  duration: "330:35:01",
  hasTour: true,
  status: "ready",
};
