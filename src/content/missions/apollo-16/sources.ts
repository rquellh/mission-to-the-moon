import type { Source } from "../../source-types.ts";

/** Sources cited only by Apollo 16. */
export const sources = {
  "apollo-16-mission-report": {
    title: "Apollo 16 Mission Report (MSC-07230)",
    publisher: "NASA Manned Spacecraft Center (a scan with a text layer, on NASA's history site)",
    url: "https://www.nasa.gov/wp-content/uploads/static/history/alsj/a16/A16_MissionReport.pdf",
    checked: "2026-11-19",
    use: "Apollo 16 as flown: the mission summary (section 1.0), the sequence of events (Table 3-I), where the spacecraft was at each maneuver (Table 3-III), the landing and splashdown points, the geology results (section 4.11.2), and the service propulsion engine's yaw gimbal problem.",
  },
  "nasa-apollo-16-mission-details": {
    title: "Apollo 16: Mission Details",
    publisher: "NASA",
    url: "https://www.nasa.gov/missions/apollo/apollo-16-mission-details/",
    checked: "2026-11-19",
    use: "The mission's objectives (why Descartes was chosen, the ultraviolet camera), the crew, and the highlights of the flight.",
  },
  "nasa-apollo-16-landing-site": {
    title: "50 Years Ago: NASA Selects Landing Site for Apollo 16",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/50-years-ago-nasa-selects-landing-site-for-apollo-16/",
    checked: "2026-11-19",
    use: "Why the Descartes highlands were chosen: the first place in the lunar highlands to be sampled, thought at the time to be volcanic.",
  },
  "nasa-apollo-16-on-the-moon": {
    title: "Apollo 16 on the Moon at Descartes",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/apollo-16-on-the-moon-at-descartes/",
    checked: "2026-11-19",
    use: "The engine problem before the landing, crew radio calls in lunar orbit and on the surface, the far ultraviolet camera, Big Muley, and the three rover traverses (Stone Mountain, North Ray Crater, House Rock, and Shadow Rock).",
  },
  "nasa-apollo-16-heads-home": {
    title: "Apollo 16 Heads Home to Earth",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/apollo-16-heads-home-to-earth/",
    checked: "2026-11-19",
    use: "Mattingly's work in lunar orbit, the liftoff from the Moon, docking, the tumbling ascent stage, the decision to come home a day early, and Mattingly's spacewalk on the way home.",
  },
  "nasa-apollo-16-splashes-down": {
    title: "Apollo 16 Splashes Down",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/apollo-16-splashes-down/",
    checked: "2026-11-19",
    use: "Entry, the parachutes, splashdown, the balloons that turned the command module upright, and recovery by USS Ticonderoga.",
  },
  "nasm-apollo-16-command-module": {
    title: "Command Module, Apollo 16",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/command-module-apollo-16/nasm_A19740499000",
    checked: "2026-11-19",
    use: "That NASA transferred the Apollo 16 command module to the Smithsonian in 1974, and that it is not on display at the National Air and Space Museum (on loan or in storage).",
  },
} as const satisfies Record<string, Source>;
