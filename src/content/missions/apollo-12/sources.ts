import type { Source } from '../../source-types.ts';

/** Sources cited only by Apollo 12. */
export const sources = {
  'apollo-12-mission-report': {
    title: 'Apollo 12 Mission Report (MSC-01855)',
    publisher:
      "NASA Manned Spacecraft Center (NASA's own copy, as saved by the Internet Archive; NASA's link to it no longer works)",
    url: 'https://web.archive.org/web/20251203061616/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a12/A12_MissionReport.pdf',
    checked: '2026-11-19',
    use: "Apollo 12 event times (Table 5-I, Sequence of Events), where the spacecraft was at each burn over Earth or the Moon (Table 5-III, Trajectory Parameters), the orbit after each lunar burn (Table 5-VI), the entry interface (Table 5-IX), the landing point, the lightning strikes and their effects (Section 14.1.3), and the crew's report of the Surveyor 3 visit.",
  },
  'nasa-apollo-12-pinpoint-mission': {
    title: 'Apollo 12: The Pinpoint Mission',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/missions/apollo/apollo-12-the-pinpoint-mission/',
    checked: '2026-11-19',
    use: "The far-side lunar orbit insertion, Conrad's hand-steered last 500 feet of the landing, why parts of Surveyor 3 were brought back, and how long the seismometer felt the ascent stage's impact. Its times are rounded and are not used.",
  },
  'nasm-apollo-12-command-module': {
    title: 'Command Module, Apollo 12',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/command-module-apollo-12/nasm_A19730364000',
    checked: '2026-11-19',
    use: "The Apollo 12 command module as the Smithsonian's object (transferred from NASA in 1973), on loan or in storage rather than on display at the museum itself.",
  },
  'apollo-12-technical-transcript': {
    title: 'Apollo 12 Technical Air-to-Ground Voice Transcription, November 1969',
    publisher:
      "NASA Manned Spacecraft Center, prepared for the Apollo Spacecraft Program Office (a scan with a text layer, listed on NASA's Mission Transcripts page, https://www.nasa.gov/history/mission-transcripts-mercury-gemini-and-apollo/)",
    url: 'https://www.nasa.gov/wp-content/uploads/2026/01/as12-tec.pdf',
    checked: '2026-11-19',
    use: "The words of Conrad's remark about the lightning and Mission Control's answer, heard in NASA's recording of them. Its times are days, hours, minutes and seconds from range zero: 00 00 03 17 is 0:03:17.",
  },
} as const satisfies Record<string, Source>;
