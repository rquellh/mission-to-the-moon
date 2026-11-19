import type { MissionSummary } from "../../types.ts";

/**
 * Apollo 10 in the mission list. Every value repeats one from story.ts,
 * copied rather than imported so the list can load without the whole story.
 */
export const summary: MissionSummary = {
  id: "apollo-10",
  program: "apollo",
  name: "Apollo 10",
  kind: "flight",
  destination: "moon",
  blurb:
    "Apollo 10 was the practice run for the first Moon landing. In May 1969, Tom Stafford and Gene Cernan flew the lunar module Snoopy down to about 9 miles above the Moon, then flew back up to John Young in the command module Charlie Brown.",
  date: "1969-05-18T16:49:00Z",
  duration: "192:03:23",
  hasTour: true,
  status: "ready",
};
