import type { Source } from '../../source-types.ts';

/** Sources cited only by Apollo 9 (its photograph captions are from the shared "nasa-image-and-video-library"). */
export const sources = {
  'apollo-9-mission-report': {
    title: 'Apollo 9 Mission Report (MSC-PA-R-69-2)',
    publisher:
      "NASA Manned Spacecraft Center (NASA's own copy, as saved by the Internet Archive; NASA's link to it no longer works)",
    url: 'https://web.archive.org/web/20250815162504/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A09_MissionReport.pdf',
    checked: '2026-11-19',
    use: "Apollo 9 event times (Table 3-I, the sequence of events), the spacewalk's timeline (section 4.2), the rendezvous maneuvers and orbits (section 5 and Table 5-II), positions at each maneuver (Table 7-II), the orbit after each firing (Table 7-III), the entry interface and drogue parachute point (Table 7-IV), the descent stage's fall from orbit (section 7.3.2), and the crew's report of staging (section 10).",
  },
  'nasa-apollo-9-completes-its-mission': {
    title: '50 Years Ago: Apollo 9 Completes its Mission',
    publisher: 'NASA (John Uri, Johnson Space Center)',
    url: 'https://www.nasa.gov/history/50-years-ago-apollo-9-completes-its-mission/',
    checked: '2026-11-19',
    use: 'What the multispectral photography experiment was for and what it led to, that the command module is displayed at the San Diego Air and Space Museum, and that Apollo 10 was the next step.',
  },
  'nasm-apollo-9-command-module': {
    title: 'Command Module, Apollo 9',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/command-module-apollo-9/nasm_A19740649000',
    checked: '2026-11-19',
    use: 'That the Smithsonian holds the Apollo 9 command module Gumdrop and that it is not on display at the National Air and Space Museum (its Display Status), and that the spacewalk tested the new lunar spacesuits.',
  },
} as const satisfies Record<string, Source>;
