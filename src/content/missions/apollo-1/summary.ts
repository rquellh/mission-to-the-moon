import type { MissionSummary } from "../../types.ts";

/**
 * Apollo 1 in the mission list. Every value repeats one from memorial.ts,
 * copied rather than imported so the list can load without the whole page.
 */
export const summary: MissionSummary = {
  id: "apollo-1",
  program: "apollo",
  name: "Apollo 1",
  kind: "memorial",
  blurb:
    "Gus Grissom, Ed White, and Roger Chaffee were getting ready to fly the first Apollo mission with a crew. On January 27, 1967, during a practice countdown on the launch pad, a fire broke out inside their spacecraft, and all three astronauts died.",
  date: "1967-01-27",
  hasTour: false,
  status: "draft",
};
