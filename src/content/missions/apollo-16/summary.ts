import type { MissionSummary } from "../../types.ts";

/**
 * Apollo 16 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "apollo-16",
  program: "apollo",
  name: "Apollo 16",
  kind: "flight",
  destination: "moon",
  blurb:
    "Apollo 16 was the first visit to the Moon's rugged highlands. In 1972, John Young and Charles Duke explored the Descartes region for almost three days with a rover, while Ken Mattingly studied the Moon from orbit.",
  date: "1972-04-16T17:54:00Z",
  duration: "265:51:05",
  hasTour: true,
  status: "ready",
};
