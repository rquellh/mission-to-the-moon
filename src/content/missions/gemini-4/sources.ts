import type { Source } from "../../source-types.ts";

/** Sources cited only by Gemini 4. */
export const sources = {
  "gemini-4-mission-report": {
    title: "Gemini Program Mission Report: Gemini IV (MSC-G-R-65-3)",
    publisher:
      "NASA Manned Spacecraft Center, Gemini Mission Evaluation Team, June 1965, with Change 1 of December 9, 1965 (NASA Technical Reports Server copy)",
    url: "https://ntrs.nasa.gov/citations/19670095754",
    checked: "2026-11-19",
    use: "Gemini 4 event times: the canonical source for this mission's timeline (Table 4-I), plus the launch and landing points (Table 4-II), the orbit through the flight (Table 4-III), the station-keeping attempt (Table 4-IV), the spacewalk, the hatch trouble, the computer failure, retrofire, the landing system, and the recovery.",
  },
  "gemini-4-nasa-mission-page": {
    title: "Gemini IV",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/gemini-iv/",
    checked: "2026-11-19",
    use: "Gemini IV overview: crew roles, launch and landing times in EST and UT, the spacewalk's clock times in EST, the duration, and the recovery ship.",
  },
  "gemini-4-learning-to-walk": {
    title: "Gemini IV: Learning to Walk in Space",
    publisher: "NASA (Bob Granath)",
    url: "https://www.nasa.gov/centers-and-facilities/kennedy/gemini-iv-learning-to-walk-in-space-2/",
    checked: "2026-11-19",
    use: "Crew radio calls during the spacewalk, the \"zip gun\", the longest American flight before Gemini IV, the sextant experiment's purpose for Apollo, and spacewalks as preparation for walking on the Moon.",
  },
  "gemini-4-spacewalking-history": {
    title: "Space Station 20th: Spacewalking History",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/space-station-20th-spacewalking-history/",
    checked: "2026-11-19",
    use: "That NASA considered mastering spacewalking a critical task for the Apollo Moon landings, and how Gemini spacewalks after White's led up to Gemini XII.",
  },
  "gemini-4-nasm-capsule": {
    title: "Capsule, Gemini IV",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/capsule-gemini-iv/nasm_A19670209000",
    checked: "2026-11-19",
    use: "The Gemini IV spacecraft, White's 22-minute spacewalk ten weeks after Leonov's, and that the capsule is on display in the Boeing Milestones of Flight Hall in Washington, DC.",
  },
} as const satisfies Record<string, Source>;
