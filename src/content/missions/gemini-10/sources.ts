import type { Source } from "../../source-types.ts";

/** Sources cited only by Gemini 10. */
export const sources = {
  "gemini-10-mission-report": {
    title: "Gemini Program Mission Report, Gemini X (MSC-G-R-66-7)",
    publisher: "NASA Manned Spacecraft Center, Houston, Texas, August 1966 (NASA Technical Reports Server copy)",
    url: "https://ntrs.nasa.gov/citations/19750067644",
    checked: "2026-11-19",
    use: "Gemini 10 event times: the canonical source for this mission's timeline (Table 4-II for the spacecraft, Tables 4-III and 4-IV for the Agena), plus launch and insertion conditions, the orbits before and after every maneuver, the docking, the two times outside, the second rendezvous, reentry, and the recovery.",
  },
  "nasa-gemini-x-mission": {
    title: "Gemini X",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/gemini-x/",
    checked: "2026-11-19",
    use: "Gemini X overview: crew roles, launch and landing times in UT and EST, the record altitude, and what the flight demonstrated.",
  },
  "nasa-gemini-x-55-years": {
    title: "55 Years Ago: Gemini X Soars to New Heights",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/55-years-ago-gemini-x-soars-to-new-heights/",
    checked: "2026-11-19",
    use: "Why rendezvous mattered for the Moon landings, the crew's radio call after the first Agena firing, the record height, and where the spacecraft is displayed.",
  },
  "gemini-10-pao-transcript": {
    title: "Gemini X PAO Mission Commentary Transcript",
    publisher: "NASA Johnson Space Center (listed on NASA's Mission Transcripts: Mercury, Gemini and Apollo page)",
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/gt10-pao.pdf",
    checked: "2026-11-19",
    use: "The burn time Houston read up to the crew for the orbit-shaping maneuver on the third day, which the mission report does not print.",
  },
  "cosmosphere-hall-of-space": {
    title: "Hall of Space Museum",
    publisher: "Cosmosphere, Hutchinson, Kansas",
    url: "https://cosmo.org/explore/attractions/hall-of-space-museum/",
    checked: "2026-11-19",
    use: "That the flown Gemini X spacecraft is displayed in the museum's Human Spaceflight gallery.",
  },
} as const satisfies Record<string, Source>;
