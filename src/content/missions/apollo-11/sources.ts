import type { Source } from "../../source-types.ts";

/** Sources cited only by Apollo 11. */
export const sources = {
  "nasa-apollo-11-mission": {
    title: "Apollo 11",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/apollo-11/",
    checked: "2026-11-15",
    use: "Apollo 11 overview: the primary objective and President Kennedy's national goal, the launch from Kennedy Space Center in Florida, Neil Armstrong as the first person to walk on the Moon, and the 21-day quarantine.",
  },
  "nasm-apollo-11-command-module": {
    title: "Apollo 11 Command Module Columbia",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/command-module-apollo-11/nasm_A19700102000",
    checked: "2026-11-15",
    use: "Where the Apollo 11 command module Columbia is displayed today (its Display Status), and that the command module was the only part of the spacecraft to return to Earth.",
  },
  "apollo-11-mission-report": {
    title: "Apollo 11 Mission Report (MSC-00171)",
    publisher: "NASA Manned Spacecraft Center",
    url: "https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf",
    checked: "2026-11-15",
    use: "Apollo 11 trajectory: where the spacecraft was at each burn (Table 7-II), the lunar orbit maneuvers (Table 7-V), the entry interface (Table 7-VII), and the radius of the landing site that lunar altitudes are measured from (Table 5-IV).",
  },
  "nasa-apollo-11-mission-overview": {
    title: "Apollo 11 Mission Overview",
    publisher: "NASA",
    url: "https://www.nasa.gov/missions/apollo/apollo-11-mission-overview/",
    checked: "2026-11-15",
    use: "The shape of the Apollo 11 flight: the free-return trajectory, and lunar orbit insertion and transearth injection made behind the Moon.",
  },
  "apollo-11-flight-journal": {
    title: "Apollo 11 Flight Journal",
    publisher: "Apollo Flight Journal (W. David Woods, Kenneth D. MacTaggart and Frank O'Brien)",
    url: "https://www.apollojournals.org/afj/ap11fj/index.html",
    checked: "2026-11-15",
    use: "The corrected transcript of the flight with commentary. Used for moments NASA's statistical timeline does not time, such as when the main parachutes were reported open. These are reported times, not measured ones.",
  },
} as const satisfies Record<string, Source>;
