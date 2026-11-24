import type { Source } from '../../source-types.ts';

/** Sources cited only by Apollo 10. */
export const sources = {
  'apollo-10-mission-report': {
    title: 'Apollo 10 Mission Report (MSC-00126)',
    publisher:
      "NASA Manned Spacecraft Center (NASA's own copy, as saved by the Internet Archive; NASA's link to it no longer works)",
    url: 'https://web.archive.org/web/20250207014556/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A10_MissionReport.pdf',
    checked: '2026-11-19',
    use: "Apollo 10 event times (Table 3-I, Sequence of Events), where the spacecraft were at each burn, over Earth or the Moon (Table 6-II, Trajectory Parameters), the lunar orbit burns (Table 6-IV), the entry interface (Table 6-VII), the lowest point of the lunar module's pass, the crew's report of staging and landing, and the landing point.",
  },
  'nasa-apollo-10-mission-details': {
    title: 'Apollo 10: Mission Details',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/missions/apollo/apollo-10-mission-details/',
    checked: '2026-11-19',
    use: 'The launch pad, the mission as a rehearsal of everything but the landing, the television of the docking, the burn home made behind the Moon, and where the third stage and both lunar module stages went. Several of its numbers differ from the Mission Report and are not used.',
  },
  'nasa-apollo-10-charlie-brown-and-snoopy': {
    title: 'Charlie Brown and Snoopy in Lunar Orbit',
    publisher: 'NASA (John Uri, NASA Johnson Space Center History Office)',
    url: 'https://www.nasa.gov/history/charlie-brown-and-snoopy-in-lunar-orbit/',
    checked: '2026-11-19',
    use: "The crew's radio calls in lunar orbit, the misalignment found before undocking, the burns made behind the Moon, the switch that caused the spin at staging, the docking, and the lunar module's trip into orbit around the Sun.",
  },
  'nasm-apollo-10-command-module': {
    title: 'Command Module, Apollo 10',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/command-module-apollo-10/nasm_A19740525000',
    checked: '2026-11-19',
    use: 'Apollo 10 as the dress rehearsal for the Apollo 11 landing, and where the command module Charlie Brown is displayed (on loan to the Science Museum in London since 1978).',
  },
} as const satisfies Record<string, Source>;
