import type { MissionSummary } from "../../types.ts";

/**
 * Apollo 17 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "apollo-17",
  program: "apollo",
  name: "Apollo 17",
  kind: "flight",
  destination: "moon",
  blurb:
    "Apollo 17 was the last Apollo flight to the Moon. In December 1972, Gene Cernan and the geologist Jack Schmitt explored a mountain valley there for three days, the last Apollo astronauts to walk on the Moon, while Ron Evans studied it from orbit.",
  date: "1972-12-07T05:33:00Z",
  duration: "301:51:59",
  hasTour: true,
  status: "ready",
};
