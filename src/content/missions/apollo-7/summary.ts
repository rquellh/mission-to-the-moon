import type { MissionSummary } from "../../types.ts";

/**
 * Apollo 7 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "apollo-7",
  program: "apollo",
  name: "Apollo 7",
  kind: "flight",
  destination: "earth-orbit",
  blurb:
    "Apollo 7 was the first Apollo flight with astronauts aboard. In October 1968, Wally Schirra, Donn Eisele, and Walt Cunningham spent nearly 11 days circling Earth, testing the spacecraft that would carry people to the Moon.",
  date: "1968-10-11T15:02:45.36Z",
  duration: "260:09:03",
  hasTour: true,
  status: "ready",
};
