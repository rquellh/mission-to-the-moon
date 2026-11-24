import type { Source } from '../../source-types.ts';

/** Sources cited only by Apollo 8. */
export const sources = {
  'apollo-8-mission-report': {
    title: 'Apollo 8 Mission Report (MSC-PA-R-69-1)',
    publisher:
      "NASA Manned Spacecraft Center (NASA's own copy, as saved by the Internet Archive; NASA's link to it no longer works)",
    url: 'https://web.archive.org/web/20251209023927/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A08_MissionReport.pdf',
    checked: '2026-11-19',
    use: "Apollo 8 event times (Table 3-I, Sequence of Events) and where the spacecraft was at each burn, over Earth or the Moon (Table 5-II, Trajectory Parameters), the entry interface (Table 5-V), the landing point, what rode in the adapter in place of a lunar module, and the crew's report of the landing.",
  },
  'nasa-apollo-8-mission': {
    title: 'Apollo 8',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/mission/apollo-8/',
    checked: '2026-11-19',
    use: 'Apollo 8 overview: the first crewed launch of the Saturn V, and the crew as the first humans to orbit the Moon and the first to see an Earthrise.',
  },
  'nasa-apollo-8-mission-details': {
    title: 'Apollo 8 Mission Details',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/missions/apollo/apollo-8-mission-details/',
    checked: '2026-11-19',
    use: 'The launch pad, the first midcourse correction as the first check of the service propulsion engine, and circularization made on the far side of the Moon. Its times are rounded and some differ from the Mission Report; they are not used.',
  },
  'nasm-apollo-8-command-module': {
    title: 'Command Module, Apollo 8',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/command-module-apollo-8/nasm_A19711856000',
    checked: '2026-11-19',
    use: 'Apollo 8 as the first crewed mission beyond Earth orbit, and where its command module is displayed (on loan to the Museum of Science and Industry in Chicago).',
  },
  'nasa-svs-earthrise-4k': {
    title: 'Earthrise in 4K',
    publisher: 'NASA Goddard Space Flight Center, Scientific Visualization Studio (Ernie Wright)',
    url: 'https://svs.gsfc.nasa.gov/4593',
    checked: '2026-11-19',
    use: "The Earthrise photographs, timed by matching Apollo 8's own pictures to Lunar Reconnaissance Orbiter maps: the mission time of the visualization's frames, which frames the three photographs fall on, and the transcript of the crew's onboard recording.",
  },
  'nasa-svs-earthrise': {
    title: 'Earthrise',
    publisher: 'NASA Goddard Space Flight Center, Scientific Visualization Studio (Ernie Wright)',
    url: 'https://svs.gsfc.nasa.gov/3936',
    checked: '2026-11-19',
    use: 'Where Apollo 8 was over the Moon when the Earthrise photograph was taken, on its fourth pass, and the black-and-white photograph taken about a minute before the first color one.',
  },
  'apollo-8-technical-transcript': {
    title: 'Apollo 8 Technical Air-to-Ground Voice Transcription, December 1968',
    publisher:
      "NASA Manned Spacecraft Center (a scan with a text layer, listed on NASA's Mission Transcripts page, https://www.nasa.gov/history/mission-transcripts-mercury-gemini-and-apollo/)",
    url: 'https://www.nasa.gov/wp-content/uploads/2026/01/as08-tec.pdf',
    checked: '2026-11-19',
    use: "The words of Borman's close to the Christmas Eve broadcast, heard in NASA's recording of it. Its times are days, hours, minutes and seconds from range zero: 03 14 08 07 is 86:08:07.",
  },
} as const satisfies Record<string, Source>;
