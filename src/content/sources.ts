/**
 * The registry of sources the site cites. A fact may only cite a source
 * listed here, and the type checker enforces that (see types.ts).
 *
 * Only add a source after opening its URL and confirming it says what we
 * need. `checked` is the date the URL was last confirmed to work.
 */

export interface Source {
  /** The publication or page title, as the source gives it. */
  title: string;
  /** Who publishes it. */
  publisher: string;
  /** The main address: a table of contents or landing page. */
  url: string;
  /** ISO date this URL was last confirmed to work. */
  checked: string;
  /** What we use it for. */
  use: string;
}

export const SOURCES = {
  "apollo-by-the-numbers": {
    title: "Apollo by the Numbers: A Statistical Reference (NASA SP-2000-4029)",
    publisher: "NASA History Division",
    url: "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_00g_Table_of_Contents.htm",
    checked: "2026-11-15",
    use: "Apollo event times, crews, call signs, orbits, burns, landing and splashdown data. The canonical source for Apollo timelines.",
  },
  "gemini-chronology": {
    title: "Project Gemini: A Chronology (NASA SP-4002)",
    publisher: "NASA",
    url: "https://www.nasa.gov/history/SP-4002/",
    checked: "2026-11-15",
    use: "Gemini crews, launch vehicles, launch times, orbits, and landing points for all twelve flights (Appendix 1).",
  },
  "on-the-shoulders-of-titans": {
    title: "On the Shoulders of Titans: A History of Project Gemini (NASA SP-4203)",
    publisher: "NASA",
    url: "https://www.nasa.gov/wp-content/uploads/2023/03/sp-4203.pdf",
    checked: "2026-11-15",
    use: "The narrative history of each Gemini flight.",
  },
  "nssdca-master-catalog": {
    title: "NSSDCA Master Catalog",
    publisher: "NASA Space Science Data Coordinated Archive, Goddard Space Flight Center",
    url: "https://nssdc.gsfc.nasa.gov/nmc/",
    checked: "2026-11-15",
    use: "Per-spacecraft facts for every flight: launch time, vehicle, orbit, and landing position.",
  },
  "nssdca-apollo-landing-sites": {
    title: "Apollo Landing Site Coordinates",
    publisher: "NASA Space Science Data Coordinated Archive, Goddard Space Flight Center",
    url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
    checked: "2026-11-15",
    use: "Where each lunar module landed. The canonical source for landing coordinates.",
  },
  "nssdca-apollo-current-locations": {
    title: "Apollo: Where are they now?",
    publisher: "NASA Space Science Data Coordinated Archive, Goddard Space Flight Center",
    url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html",
    checked: "2026-11-15",
    use: "Where each Apollo command module is displayed today.",
  },
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
  "apollo-11-mission-report": {
    title: "Apollo 11 Mission Report (MSC-00171)",
    publisher: "NASA Manned Spacecraft Center",
    url: "https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf",
    checked: "2026-11-15",
    use: "Apollo 11 trajectory: where the spacecraft was at each burn (Table 7-II), the lunar orbit maneuvers (Table 7-V), the entry interface (Table 7-VII), and the radius of the landing site that lunar altitudes are measured from (Table 5-IV).",
  },
  "apollo-lunar-descent-ascent-trajectories": {
    title: "Apollo Lunar Descent and Ascent Trajectories (NASA TM X-58040)",
    publisher: "NASA Manned Spacecraft Center",
    url: "https://ntrs.nasa.gov/citations/19700024568",
    checked: "2026-11-15",
    use: "How the Apollo 11 lunar module came down and went back up: descent orbit geometry, the direction of travel over the landing site, and orbit insertion after liftoff.",
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
  "jpl-horizons": {
    title: "Horizons System",
    publisher: "NASA Jet Propulsion Laboratory, Solar System Dynamics Group",
    url: "https://ssd.jpl.nasa.gov/horizons/",
    checked: "2026-11-15",
    use: "Where the Moon and Sun were during a mission, and which point on Earth was directly below the Moon, so Earth can be turned correctly in the flight path's frame.",
  },
} as const satisfies Record<string, Source>;

/** The id of a registered source. */
export type SourceId = keyof typeof SOURCES;
