import type { Source } from "../../source-types.ts";

/** Sources cited only by Apollo 15. */
export const sources = {
  "apollo-15-mission-report": {
    title: "Apollo 15 Mission Report (MSC-05161)",
    publisher:
      "NASA Manned Spacecraft Center (the copy on NASA's Technical Reports Server, a scan with a text layer; NASA's history site has this report only as a word-processor file)",
    url: "https://ntrs.nasa.gov/citations/19720021182",
    checked: "2026-11-19",
    use: "Apollo 15 as flown: the sequence of events (Table 3-I), where the spacecraft was at each maneuver (Table 3-III), the landing and splashdown points, the mission summary, and the main parachute collapse (section 14.1.9). PDF at ntrs.nasa.gov/api/citations/19720021182/downloads/19720021182.pdf.",
  },
  "nasa-apollo-15-mission-details": {
    title: "Apollo 15: Mission Details",
    publisher: "NASA",
    url: "https://www.nasa.gov/missions/apollo/apollo-15-mission-details/",
    checked: "2026-11-19",
    use: "The mission's objectives and records: the first of the J missions, the first car driven on the Moon, the lunar liftoff seen on television, the first satellite placed in lunar orbit by a crewed spacecraft, the first deep-space spacewalk, and the partly collapsed parachute.",
  },
  "nasa-apollo-15-on-the-moon": {
    title: "50 Years Ago: Apollo 15 on the Moon at Hadley-Apennine",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/50-years-ago-apollo-15-on-the-moon-at-hadley-apennine/",
    checked: "2026-11-19",
    use: "Crew radio calls in lunar orbit and on the surface, the first rover test drive, the stops of the three traverses (including the Genesis Rock at Spur Crater), and the hammer-and-feather demonstration.",
  },
  "nasa-apollo-15-heads-home": {
    title: "50 Years Ago: Apollo 15 Heads Home to Earth",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/50-years-ago-apollo-15-heads-home-to-earth/",
    checked: "2026-11-19",
    use: "Worden's science from lunar orbit, the liftoff seen on television, docking, the subsatellite, transearth injection, and Worden's spacewalk on the way home, with crew radio calls.",
  },
  "nasa-apollo-15-home-from-the-moon": {
    title: "Apollo 15 Home from the Moon",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/apollo-15-home-from-the-moon/",
    checked: "2026-11-19",
    use: "Entry, the collapsed main parachute and its likely cause, splashdown speed, recovery by USS Okinawa, and the end of postflight quarantine.",
  },
  "nasm-apollo-15-command-module": {
    title: "Command Module, Apollo 15",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/command-module-apollo-15/nasm_A19740605000",
    checked: "2026-11-19",
    use: "That the Smithsonian owns the Apollo 15 command module Endeavour, that NASA placed it on display at the U.S. Air Force Museum in Ohio in December 1973, and that it is not on display at the National Air and Space Museum (its Display Status).",
  },
} as const satisfies Record<string, Source>;
