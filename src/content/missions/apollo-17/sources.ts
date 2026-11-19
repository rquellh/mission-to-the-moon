import type { Source } from "../../source-types.ts";

/** Sources cited only by Apollo 17. */
export const sources = {
  "apollo-17-mission-report": {
    title: "Apollo 17 Mission Report (JSC-07904)",
    publisher:
      "NASA Lyndon B. Johnson Space Center (NASA's own copy, a scan with a text layer, as saved by the Internet Archive; NASA's link to it no longer works)",
    url: "https://web.archive.org/web/20250206054342/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a17/A17_MissionReport.pdf",
    checked: "2026-11-19",
    use: "Apollo 17 as flown: the mission summary (section 1.0), the sequence of events (Table 3-I), where the spacecraft was at each maneuver (Table 3-III), the maneuver summary (Table 3-V), the landing and splashdown points, and the farthest the crew drove from the lunar module.",
  },
  "apollo-17-technical-transcript": {
    title: "Apollo 17 Technical Air-to-Ground Voice Transcription",
    publisher:
      "NASA Manned Spacecraft Center, Test Division, Apollo Spacecraft Program Office (a scan with a text layer, on NASA's history site)",
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/as17-tec.pdf",
    checked: "2026-11-19",
    use: "Crew and ground radio calls with their times, on the mission clock counted from range zero (this transcript does not apply the 065:00 clock update): the film-magazine report after the Blue Marble photographs, the full-Earth remark, Cernan's call on seeing Camelot crater, and the landing call. Linked from NASA's Mission Transcripts page (https://www.nasa.gov/history/mission-transcripts-mercury-gemini-and-apollo/).",
  },
  "nasa-apollo-17-night-sky": {
    title: "50 Years Ago: Apollo 17 Lights Up the Night Sky on its Way to the Moon",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/50-years-ago-apollo-17-lights-up-the-night-sky-on-its-way-to-the-moon/",
    checked: "2026-11-19",
    use: "The countdown hold and the first night launch, the ride to orbit, translunar injection, transposition and docking, the Blue Marble photographs, and the coast to the Moon, with crew radio calls.",
  },
  "nasa-apollo-17-lands": {
    title: "50 Years Ago: Apollo 17 Lands at Taurus-Littrow",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/50-years-ago-apollo-17-lands-at-taurus-littrow/",
    checked: "2026-11-19",
    use: "Lunar orbit insertion, undocking, the landing, and the three moonwalks: the stations visited, the rover fender, the orange soil, Split Rock, and Cernan's words as he left the surface, with crew radio calls.",
  },
  "nasa-apollo-17-heads-home": {
    title: "50 Years Ago: Apollo 17 Heads Home to Earth",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/50-years-ago-apollo-17-heads-home-to-earth/",
    checked: "2026-11-19",
    use: "The lunar liftoff seen on the rover's TV camera, the rendezvous and docking, the ascent stage's crash into the Moon, transearth injection, and Evans's spacewalk on the way home, with crew radio calls.",
  },
  "nasa-apollo-17-splashdown": {
    title: "50 Years Ago: Apollo 17 Splash Down Ends the Beginning of Lunar Exploration",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/50-years-ago-apollo-17-splash-down-ends-the-beginning-of-lunar-exploration/",
    checked: "2026-11-19",
    use: "Entry, the three main parachutes, splashdown near American Samoa, and the recovery by USS Ticonderoga.",
  },
  "nasa-apollo-17-blue-marble": {
    title: "Blue Marble - Image of the Earth from Apollo 17",
    publisher: "NASA",
    url: "https://www.nasa.gov/image-article/blue-marble-image-of-earth-from-apollo-17/",
    checked: "2026-11-19",
    use: "NASA's caption for the Blue Marble photograph (AS17-148-22727): what it shows, and that it was the first time an Apollo flight's path allowed a photograph of the south polar ice cap.",
  },
  "nasa-apollo-17-remembering-cernan": {
    title: "Remembering Gene Cernan",
    publisher: "NASA (Heather Deiss)",
    url: "https://www.nasa.gov/missions/apollo/apollo-17/remembering-gene-cernan/",
    checked: "2026-11-19",
    use: "The whole-Earth photograph taken on the way out, known as the Blue Marble.",
  },
  "apollo-17-nasa-artemis-iv": {
    title: "Artemis IV",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/artemis-iv/",
    checked: "2026-11-19",
    use: "What NASA says of Artemis IV today: a crewed surface landing, launching in early 2028, at one of the sites chosen \"for the first crewed landing on the Moon in more than 50 years.\"",
  },
  "apollo-17-nasa-artemis": {
    title: "Moon to Mars: NASA's Artemis Program",
    publisher: "NASA",
    url: "https://www.nasa.gov/humans-in-space/artemis/",
    checked: "2026-11-19",
    use: "That in April 2026 Artemis II \"launched on a nearly 10-day voyage around the Moon\", and that \"NASA's first crewed Moon landing under the Artemis program will take place in 2028.\"",
  },
  "apollo-17-blue-marble-history": {
    title: "History of the Blue Marble",
    publisher: "NASA Earth Observatory (NASA Science)",
    url: "https://science.nasa.gov/earth/earth-observatory/history-of-the-blue-marble/",
    checked: "2026-11-19",
    use: "Its distance for the Blue Marble photograph, \"about 45,000 km (28,000 mi)\", noted where it differs from other NASA sources.",
  },
  "apollo-17-changing-views-of-earth": {
    title: "90 Years of Our Changing Views of Earth",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/90-years-of-our-changing-views-of-earth/",
    checked: "2026-11-19",
    use: "Its distance for the Blue Marble photograph, \"from 72,000 miles away\", noted where it differs from other NASA sources.",
  },
} as const satisfies Record<string, Source>;
