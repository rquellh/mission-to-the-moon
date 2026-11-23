import type { Source } from '../../source-types.ts';

/** Sources cited only by Gemini 5. */
export const sources = {
  'gemini-5-mission-report': {
    title: 'Gemini Program Mission Report: Gemini V (MSC-G-R-65-4)',
    publisher:
      "NASA Manned Spacecraft Center, Gemini Mission Evaluation Team, October 1965 (a scan of the NASA report hosted by the Virtual AGC project's document library at ibiblio.org; no NASA or Internet Archive copy was found)",
    url: 'https://www.ibiblio.org/apollo/Documents/Gemini5MissionReport.pdf',
    checked: '2026-11-19',
    use: "Gemini 5 event times: the canonical source for this mission's timeline (Table 4.2-I), plus launch and landing points (Table 4.3-I), the orbit through the flight (Table 4.3-II), the pod exercise, the fuel-cell oxygen problem, the simulated rendezvous (Table 4.3-IV), retrofire, the landing system, and the recovery.",
  },
  'nasa-gemini-v-mission': {
    title: 'Gemini V',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/mission/gemini-v/',
    checked: '2026-11-19',
    use: "Gemini V overview: crew roles, launch and landing times in UT and EST, the pod's mass, the oxygen pressure, revolutions completed, and the recovery ship.",
  },
  'nasa-gemini-5-55-years': {
    title: '55 Years Ago: Gemini 5 Sets a New Record',
    publisher: 'NASA Johnson Space Center (John Uri)',
    url: 'https://www.nasa.gov/history/55-years-ago-gemini-5-sets-a-new-record/',
    checked: '2026-11-19',
    use: 'Why eight days mattered for the Moon, the fuel cells, the mission patch, the endurance record, retrofire over Hawaii, and where the spacecraft is displayed.',
  },
  'nasm-gemini-v-capsule': {
    title: 'Capsule, Gemini V',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/capsule-gemini-v/nasm_A19710156000',
    checked: '2026-11-19',
    use: "Gemini 5 as the first U.S. spacecraft with fuel cells, its 120 trips around Earth and endurance record, and that the Smithsonian's capsule is on exhibit in Houston, not at the National Air and Space Museum.",
  },
  'space-center-houston-starship-gallery': {
    title: 'Starship Gallery',
    publisher: 'Space Center Houston',
    url: 'https://spacecenter.org/exhibits-and-experiences/starship-gallery/',
    checked: '2026-11-19',
    use: 'That the Gemini V spacecraft is displayed in the Starship Gallery.',
  },
} as const satisfies Record<string, Source>;
