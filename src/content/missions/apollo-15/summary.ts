import type { MissionSummary } from "../../types.ts";

/**
 * Apollo 15 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "apollo-15",
  program: "apollo",
  name: "Apollo 15",
  kind: "flight",
  destination: "moon",
  blurb:
    "Apollo 15 was the first long science trip to the Moon, and the first to bring a car. In 1971, David Scott and James Irwin explored the Moon for almost three days and drove the Lunar Roving Vehicle, while Alfred Worden studied the Moon from orbit.",
  date: "1971-07-26T13:34:00Z",
  duration: "295:11:53.0",
  hasTour: true,
  status: "ready",
};
