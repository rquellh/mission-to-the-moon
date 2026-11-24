import type { Source } from '../../source-types.ts';

/** Sources cited only by Gemini 3. */
export const sources = {
  'gemini-3-voice-transcript': {
    title: 'Composite Air-to-Ground and Onboard Voice Tape Transcription of the GT-3 Mission',
    publisher:
      'NASA Manned Spacecraft Center, April 1965 (a scan of the NASA document, hosted by NASA on its page "Mission Transcripts: Mercury, Gemini, and Apollo")',
    url: 'https://www.nasa.gov/wp-content/uploads/2026/01/gt03-tec.pdf',
    checked: '2026-11-19',
    use: "Gemini 3 moments on the mission clock, from the crew's and the ground's own words with their elapsed times: staging, separation, the start and end of each orbit change, the turn to blunt end forward, the adapter's separation, retrofire, the retrorockets' jettison, the parachutes, landing, and the parachute's release. Also the radio calls quoted on the site.",
  },
  'nasa-gemini-3-mission': {
    title: 'Gemini III',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/mission/gemini-iii/',
    checked: '2026-11-19',
    use: 'Gemini III overview: crew roles, launch and landing times in UT and EST, the duration, the three orbit changes with their times and orbit sizes, retrofire, the landing point and how far short it was, and the recovery times.',
  },
  'nasa-gemini-3-60-years': {
    title: "60 Years Ago: Gemini III, America's First Two-Person Flight",
    publisher: 'NASA Johnson Space Center (John Uri)',
    url: 'https://www.nasa.gov/history/60-years-ago-gemini-iii-americas-first-two-person-flight/',
    checked: '2026-11-19',
    use: "The first orbital maneuvers of a crewed spacecraft as a step toward rendezvous, Young's radio call during the first one, Grissom as the first person in space twice, the last flight controlled from Cape Kennedy, the sandwich, the parachute heights, and the recovery.",
  },
  'nasm-gemini-3-capsule': {
    title: 'Capsule, Gemini 3',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/capsule-gemini-3/nasm_A19710063000',
    checked: '2026-11-19',
    use: "Why Grissom named the spacecraft Molly Brown, that the flight made the first orbit-changing maneuvers in space, and that the Smithsonian's capsule is not on display at the National Air and Space Museum (its Display Status).",
  },
  'gemini-3-spring-mill-state-park': {
    title: 'State Parks: Spring Mill State Park',
    publisher: 'Indiana Department of Natural Resources',
    url: 'https://www.in.gov/dnr/state-parks/parks-lakes/spring-mill-state-park/',
    checked: '2026-11-19',
    use: "That the park's Grissom Memorial, in Mitchell, Indiana, displays the Gemini 3 Molly Brown spacecraft.",
  },
} as const satisfies Record<string, Source>;
