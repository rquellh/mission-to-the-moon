import type { MissionSummary } from "../../types.ts";

/**
 * Gemini 6A in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "gemini-6a",
  program: "gemini",
  name: "Gemini 6A",
  kind: "flight",
  destination: "earth-orbit",
  blurb:
    "Gemini 6A made the first rendezvous of two crewed spacecraft, in December 1965. Wally Schirra and Tom Stafford caught up with Gemini 7 in orbit and flew beside it for more than five hours.",
  date: "1965-12-15T13:37:26.471Z",
  duration: "025:51:24",
  hasTour: true,
  status: "ready",
};
