import type { Source } from '../../source-types.ts';

/** Sources cited only by Gemini 12. */
export const sources = {
  'gemini-12-mission-report': {
    title: 'Gemini Program Mission Report: Gemini XII (MSC-G-R-67-1)',
    publisher:
      "NASA Manned Spacecraft Center, Gemini Mission Evaluation Team, January 1967 (a scan of the NASA report hosted by the Virtual AGC project's document library at ibiblio.org; no NASA or Internet Archive copy was found)",
    url: 'https://www.ibiblio.org/apollo/Documents/Gemini12MissionReport.pdf',
    checked: '2026-11-19',
    use: "Gemini 12 event times: the canonical source for this mission's timeline (Tables 4.2-I to 4.2-III), plus the insertion and landing points (Table 4.3-I), the orbits around each maneuver (Table 4.3-II), the maneuvers (Tables 4.3-IV and 4.3-VIII), the Agena's launch (Table 4.3-V), the rendezvous by backup charts, the docking practice, the eclipse, the three periods outside, the tether exercise, retrofire, reentry, and the recovery.",
  },
  'nasa-gemini-12-mission-page': {
    title: 'Gemini XII',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/mission/gemini-xii/',
    checked: '2026-11-19',
    use: 'Gemini XII overview: crew roles, launch and landing times in UT and EST, mission duration, the retrofire time, the length of each period outside, and the rest periods planned for the spacewalk.',
  },
  'nasa-gemini-12-55-years': {
    title: '55 Years Ago: Gemini XII Closes Out a Successful Program, Paves the Way for Apollo',
    publisher: 'NASA Johnson Space Center (John Uri)',
    url: 'https://www.nasa.gov/history/55-years-ago-gemini-xii-closes-out-a-successful-program-paves-the-way-for-apollo/',
    checked: '2026-11-19',
    use: "What Project Gemini had to prove for Apollo, the spacewalk troubles of earlier flights and the underwater training that followed, Aldrin's rendezvous background, crew radio calls, the tether exercise, and where the spacecraft is displayed.",
  },
  'nasm-gemini-12-capsule': {
    title: 'Capsule, Gemini XII',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/capsule-gemini-xii/nasm_A19680265000',
    checked: '2026-11-19',
    use: "Aldrin's three periods outside (5 hours 30 minutes in all) and their handholds and footholds, and that the Smithsonian's capsule is not on display at the National Air and Space Museum.",
  },
  'adler-gemini-12-mission-moon': {
    title: 'Mission Moon',
    publisher: 'Adler Planetarium',
    url: 'https://www.adlerplanetarium.org/experiences/exhibits-spaces/mission-moon/',
    checked: '2026-11-19',
    use: 'That the Mission Moon exhibit displays the actual Gemini 12 spacecraft.',
  },
} as const satisfies Record<string, Source>;
