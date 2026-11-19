import type { Source } from "../../source-types.ts";

/** Sources cited only by Apollo 13. */
export const sources = {
  "apollo-13-mission-report": {
    title: "Apollo 13 Mission Report (MSC-02680)",
    publisher: "NASA Manned Spacecraft Center, Mission Evaluation Team (NASA Technical Reports Server copy)",
    url: "https://ntrs.nasa.gov/citations/19710003598",
    checked: "2026-11-19",
    use: "Apollo 13 trajectory and events: the sequence of events (Table 3-I), where the spacecraft was at each burn and at entry (Table 4-II), the closest approaches to the Moon each burn aimed for (Table 4-III), the mission description, and the crew's account of casting off the service module.",
  },
  "apollo-13-review-board": {
    title: "Report of Apollo 13 Review Board",
    publisher: "NASA, Apollo 13 Review Board (NASA Technical Reports Server copy)",
    url: "https://ntrs.nasa.gov/citations/20170000913",
    checked: "2026-11-19",
    use: "What caused the accident: the board's findings on the fire in oxygen tank no. 2 and the loss of oxygen and power that ended the landing.",
  },
  "apollo-13-air-to-ground-transcript": {
    title: "Apollo 13 Technical Air-to-Ground Voice Transcription (April 1970)",
    publisher: "NASA Manned Spacecraft Center (hosted on NASA's Mission Transcripts page)",
    url: "https://www.nasa.gov/history/mission-transcripts-mercury-gemini-and-apollo/",
    checked: "2026-11-19",
    use: "The radio calls reporting the drogue and main parachutes open, which NASA's statistical timeline does not time. These are reported times, not measured ones. Also the calls that reported the accident (\"we've had a problem\"), whose words are heard in NASA's recording of them.",
  },
} as const satisfies Record<string, Source>;
