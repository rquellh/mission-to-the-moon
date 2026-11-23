import type { Source } from '../../source-types.ts';

/** Sources cited only by Apollo 11. */
export const sources = {
  'nasa-apollo-11-mission': {
    title: 'Apollo 11',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/mission/apollo-11/',
    checked: '2026-11-15',
    use: "Apollo 11 overview: the primary objective and President Kennedy's national goal, the launch from Kennedy Space Center in Florida, Neil Armstrong as the first person to walk on the Moon, and the 21-day quarantine.",
  },
  'nasm-apollo-11-command-module': {
    title: 'Apollo 11 Command Module Columbia',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/command-module-apollo-11/nasm_A19700102000',
    checked: '2026-11-15',
    use: 'Where the Apollo 11 command module Columbia is displayed today (its Display Status), and that the command module was the only part of the spacecraft to return to Earth.',
  },
  'apollo-11-mission-report': {
    title: 'Apollo 11 Mission Report (MSC-00171)',
    publisher: 'NASA Manned Spacecraft Center',
    url: 'https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf',
    checked: '2026-11-15',
    use: 'Apollo 11 as flown: where the spacecraft was at each burn and which way it moved (Table 7-II), the entry interface altitude (Table 7-VII), the radius of the landing site that lunar altitudes are measured from (Table 5-IV), and that only one of the four planned translunar midcourse corrections was made (section 3.0 and section 7.4.3). Its figures that differ from Apollo by the Numbers (the separation maneuver in Table 7-V, the downrange error on page 5-5, the map coordinates of the landing point) are given in discrepancy notes.',
  },
  'apollo-11-pao-transcript': {
    title: 'Apollo 11 PAO Mission Commentary Transcript, July 16-24, 1969',
    publisher:
      "NASA Manned Spacecraft Center (a scan with a text layer, listed on NASA's Mission Transcripts page, https://www.nasa.gov/history/mission-transcripts-mercury-gemini-and-apollo/)",
    url: 'https://www.nasa.gov/wp-content/uploads/2026/01/as11-pao.pdf',
    checked: '2026-11-19',
    use: "Mission Control's predicted time for the main parachutes to open, read out before entry, and the public affairs commentary as the command module came down on its parachutes. Each tape's heading gives the time it starts; the lines under it carry no time of their own.",
  },
  'apollo-11-technical-transcript': {
    title: 'Apollo 11 Technical Air-to-Ground Voice Transcription',
    publisher:
      "NASA Manned Spacecraft Center, prepared for the Apollo Spacecraft Program Office (a scan with a text layer, listed on NASA's Mission Transcripts page, https://www.nasa.gov/history/mission-transcripts-mercury-gemini-and-apollo/)",
    url: 'https://www.nasa.gov/wp-content/uploads/2026/01/as11-tec.pdf',
    checked: '2026-11-19',
    use: "Crew and ground radio calls with their times, written as days, hours, minutes and seconds on the mission clock counted from range zero: the landing call, Armstrong's first words on the surface, his reading of the plaque, and the calls during the parachute descent.",
  },
  'nasa-apollo-11-mission-overview': {
    title: 'Apollo 11 Mission Overview',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/missions/apollo/apollo-11-mission-overview/',
    checked: '2026-11-15',
    use: 'The shape of the Apollo 11 flight: the free-return trajectory, and lunar orbit insertion and transearth injection made behind the Moon.',
  },
} as const satisfies Record<string, Source>;
