import type { Source } from "../../source-types.ts";

/** Sources cited only by Apollo 14. */
export const sources = {
  "apollo-14-mission-report": {
    title: "Apollo 14 Mission Report (MSC-04112)",
    publisher:
      "NASA Manned Spacecraft Center (NASA's own copy, as saved by the Internet Archive; NASA's link to it no longer works)",
    url: "https://web.archive.org/web/20251201235420/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a14/A14MRntrs.pdf",
    checked: "2026-11-19",
    use: "Apollo 14 event times (Table 6-I, Sequence of Events), where the spacecraft was at each burn over the Moon and at entry (Table 6-III, Trajectory Parameters), the clock update during the flight, the hybrid path to the Moon, the landing and splashdown points, and the crew's account of the docking attempts and the landing.",
  },
  "nasa-apollo-14-mission": {
    title: "Apollo 14",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/apollo-14/",
    checked: "2026-11-19",
    use: "Apollo 14 overview and crew biographies: Alan Shepard as the first American in space, on May 5, 1961, in Freedom 7.",
  },
  "nasm-apollo-14-command-module": {
    title: "Command Module, Apollo 14",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/command-module-apollo-14/nasm_A19750212000",
    checked: "2026-11-19",
    use: "That the Smithsonian holds the Apollo 14 command module Kitty Hawk (transferred from NASA in 1974) and that it is on loan or in storage, not on display at the museum itself.",
  },
  "apollo-14-cm-onboard-transcription": {
    title: "Apollo 14 Onboard Voice Transcription, Recorded on the Command Module Onboard Recorder Data Storage Equipment (March 1971)",
    publisher:
      "NASA Manned Spacecraft Center (listed on NASA's Mission Transcripts page, https://www.nasa.gov/history/mission-transcripts-mercury-gemini-and-apollo/)",
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/as14-cm.pdf",
    checked: "2026-11-19",
    use: "The crew's words recorded aboard the command module, timed in true mission-elapsed time (days, hours, minutes, seconds). Used for when the crew saw the main parachutes open.",
  },
} as const satisfies Record<string, Source>;
