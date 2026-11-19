import type { MissionSummary } from "../../types.ts";

/**
 * Apollo 9 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "apollo-9",
  program: "apollo",
  name: "Apollo 9",
  kind: "flight",
  destination: "earth-orbit",
  blurb:
    "Apollo 9 was the first time astronauts flew a lunar module, the craft built to land people on the Moon. In March 1969, James McDivitt, David Scott, and Rusty Schweickart tested it for ten days in orbit around Earth.",
  date: "1969-03-03T16:00:00Z",
  duration: "241:00:54",
  hasTour: true,
  status: "ready",
};
