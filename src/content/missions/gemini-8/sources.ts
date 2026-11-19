import type { Source } from "../../source-types.ts";

/** Sources cited only by Gemini 8. */
export const sources = {
  "gemini-8-mission-report": {
    title: "Gemini Program Mission Report: Gemini VIII (MSC-G-R-66-4)",
    publisher: "NASA Manned Spacecraft Center, Gemini Mission Evaluation Team (NASA's own copy, as saved by the Internet Archive; NASA's link to it no longer works)",
    url: "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf",
    checked: "2026-11-15",
    use: "Gemini 8 event times: the canonical source for this mission's timeline (Table 4.2-I for the spacecraft, Table 4.2-II for the Agena target vehicle), plus the mission narrative, the thruster failure, the landing-system sequence, and the recovery timeline.",
  },
  "nasa-gemini-viii-mission": {
    title: "Gemini VIII",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/gemini-viii/",
    checked: "2026-11-15",
    use: "Gemini VIII overview: crew roles, launch site and vehicle, mission duration, the landing time in UT, and the first linking of two spacecraft in Earth orbit.",
  },
  "nasa-gemini-viii-55-years": {
    title: "55 Years Ago: Gemini VIII, the First Docking in Space",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/55-years-ago-gemini-viii-the-first-docking-in-space/",
    checked: "2026-11-15",
    use: "Gemini VIII crew radio calls, the canceled spacewalk, rendezvous and docking as a technique the Moon landings needed, the Agena's later visit by Gemini X, and where the spacecraft is displayed.",
  },
  "nasa-gemini-viii-wild-ride": {
    title: "Gemini's First Docking Turns to Wild Ride in Orbit",
    publisher: "NASA (Bob Granath)",
    url: "https://www.nasa.gov/missions/gemini/gemini-viii/geminis-first-docking-turns-to-wild-ride-in-orbit/",
    checked: "2026-11-15",
    use: "Gemini VIII crew radio calls during the chase, docking, and emergency, and the crew's blurred vision during the spin.",
  },
  "nasm-gemini-viii-capsule": {
    title: "Capsule, Gemini VIII",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/capsule-gemini-viii/nasm_A19721289000",
    checked: "2026-11-15",
    use: "That the Smithsonian holds the Gemini VIII spacecraft and that it is not on display at the National Air and Space Museum (its Display Status).",
  },
  "armstrong-museum-exhibitions": {
    title: "Exhibitions",
    publisher: "Armstrong Air & Space Museum",
    url: "https://www.armstrongmuseum.org/exhibitions",
    checked: "2026-11-15",
    use: "That the museum displays the Gemini VIII spacecraft in its Early Space Gallery.",
  },
} as const satisfies Record<string, Source>;
