import type { Source } from '../../source-types.ts';

/** Sources cited only by Apollo 7 (its photograph captions are from the shared "nasa-image-and-video-library"). */
export const sources = {
  'apollo-7-mission-report': {
    title: 'Apollo 7 Mission Report (MSC-PA-R-68-15)',
    publisher:
      "NASA Manned Spacecraft Center (NASA's own copy, as saved by the Internet Archive; NASA's link to it no longer works)",
    url: 'https://web.archive.org/web/20250207014232/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A07_MissionReport.pdf',
    checked: '2026-11-19',
    use: "Apollo 7 event times (Table 2-I, the sequence of events), orbits before and after each maneuver (Table 2-II), positions at insertion and at each maneuver (Tables 3-II and 3-III), firing times (Table 3-V), the entry interface (Table 3-VI), the landing point, the recovery, the earth landing system, the cabin atmosphere, and the crew's report.",
  },
  'nasa-apollo-7-first-crewed-mission': {
    title: 'About Apollo 7, the First Crewed Apollo Space Mission',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/missions/apollo/about-apollo-7-the-first-crewed-apollo-space-mission/',
    checked: '2026-11-19',
    use: 'Apollo 7 crew radio calls at launch and at the first main-engine firing, the transposition and simulated docking with the spent stage, the first live television broadcasts, why the service propulsion engine mattered for Moon flights, and that the flight cleared the way for the lunar orbit mission that followed.',
  },
  'nasm-apollo-7-command-module': {
    title: 'Command Module, Apollo 7',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/command-module-apollo-7/nasm_A19740718000',
    checked: '2026-11-19',
    use: 'That the Smithsonian holds the Apollo 7 command module and that it is not on display at the National Air and Space Museum (its Display Status), and that it was the first of the redesigned Block II spacecraft.',
  },
  'apollo-7-frontiers-of-flight-exhibits': {
    title: 'Exhibits',
    publisher: 'Frontiers of Flight Museum',
    url: 'https://flightmuseum.com/exhibits/',
    checked: '2026-11-19',
    use: 'That the museum displays the Apollo 7 command module in its Space Flight gallery.',
  },
} as const satisfies Record<string, Source>;
