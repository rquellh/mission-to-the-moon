/**
 * Gemini 11 (NASA wrote it "Gemini XI"): rendezvous and docking on the first
 * orbit, a record-high orbit, and a tether between two spacecraft,
 * September 12-15, 1966.
 *
 * NASA's mission report for this flight was not found. Event times come
 * from, in the order we follow them: Appendix 1 of the Gemini chronology
 * (SP-4002; Tables A, B and D) and its September 12, 1966 entry; the
 * Gemini XI voice transcript (air-to-ground and onboard), whose times are
 * ground elapsed time; Summary of Rendezvous Operations in the Gemini
 * Summary Conference (SP-138); and NASA's public affairs mission commentary.
 * NSSDCA, NASA's Gemini XI page, NASA's 55-years article, the Smithsonian,
 * and On the Shoulders of Titans (SP-4203) fill in the story. Where they
 * disagree, the `discrepancy` field says what each gives and which we
 * follow.
 *
 * The voice transcript marks each line with a letter and prints no key for
 * them: CC for the ground's capsule communicator, and C and P for the crew.
 * We read C as the command pilot, Conrad, and P as the pilot, Gordon: the
 * lines Gordon spoke opening his hatch for the spacewalk ("Hatch is open,"
 * 24:02:47) and his remark that riding the Agena's engine was "the biggest
 * thrill we've had all day" (04:38:02), which On the Shoulders of Titans
 * gives to Gordon (page 360), are marked P, and Conrad's "We are docked"
 * (01:34:17), which that book gives to Conrad (page 359), is marked C.
 *
 * Elapsed times are ground elapsed time (g.e.t.), counted from Gemini XI's
 * lift-off at 14:42:26.546 UT (NSSDCA; 9:42:26 a.m. e.s.t. in Appendix 1 of
 * the chronology). Where a source gives a time only to the minute, seconds
 * are written as 00, the citation says so, and the text says "about".
 *
 * The Agena was launched first, at 8:05:01.725 a.m. e.s.t. (Appendix 1,
 * Table B), 13:05:01.725 UT (NSSDCA). Its time on the mission clock,
 * -001:37:24.821, is our subtraction of the two lift-off times.
 *
 * Universal times are given only where a source states them, or states an
 * Eastern Standard Time that we convert (plus 5 hours, our arithmetic).
 *
 * Unit conversions in the text (nautical miles to miles and kilometers,
 * kilometers to miles, feet to meters) are our arithmetic on the cited
 * values (1 nautical mile = 1.852 km = 1.15078 miles; 1 foot = 0.3048 m).
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const CHRONOLOGY_1966 = 'https://www.nasa.gov/history/SP-4002/p3b.htm';
const CHRONOLOGY_TABLE_A = 'https://www.nasa.gov/history/SP-4002/app1a.htm';
const CHRONOLOGY_TABLE_B = 'https://www.nasa.gov/history/SP-4002/app1b.htm';
const CHRONOLOGY_TABLE_D = 'https://www.nasa.gov/history/SP-4002/app1d.htm';
const NMC_GEMINI = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-081A';
const NMC_AGENA = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-080A';
const TRANSCRIPT = 'https://www.nasa.gov/wp-content/uploads/2026/01/gt11-tec.pdf';
const COMMENTARY = 'https://www.nasa.gov/wp-content/uploads/2026/01/gt11-pao.pdf';
const RENDEZVOUS_PAPER =
  'https://ntrs.nasa.gov/api/citations/19680005473/downloads/19680005473.pdf';

/** An entry of Project Gemini: A Chronology, Part III (B), 1966. */
function chronology(date: string, quote: string): Citation {
  return {
    source: 'gemini-chronology',
    locator: `Part III (B), ${date}: "${quote}"`,
    url: CHRONOLOGY_1966,
  };
}

/** The chronology's September 12, 1966 entry, on the Gemini XI mission, with an optional note of ours. */
function mission(quote: string, note?: string): Citation {
  const citation = chronology('September 12, 1966', quote);
  return note ? { ...citation, locator: `${citation.locator} (${note})` } : citation;
}

/** Appendix 1 of the chronology: Table A (General), B (Orbital Operations), or D (Extravehicular Activity). */
function chronologyTable(table: 'A' | 'B' | 'D', rows: string): Citation {
  const name = {
    A: 'General',
    B: 'Orbital Operations',
    D: 'Extravehicular Activity on Gemini Missions',
  }[table];
  const url = { A: CHRONOLOGY_TABLE_A, B: CHRONOLOGY_TABLE_B, D: CHRONOLOGY_TABLE_D }[table];
  return {
    source: 'gemini-chronology',
    locator: `Appendix 1, Table ${table} (${name}), Gemini XI: ${rows}`,
    url,
  };
}

/** An NSSDCA Master Catalog page: Gemini 11 or its Agena target. */
function nmc(page: 'gemini' | 'agena', section: string): Citation {
  return page === 'gemini'
    ? {
        source: 'nssdca-master-catalog',
        locator: `"Gemini 11" (1966-081A), ${section}`,
        url: NMC_GEMINI,
      }
    : {
        source: 'nssdca-master-catalog',
        locator: `"Gemini 11 Target" (1966-080A), ${section}`,
        url: NMC_AGENA,
      };
}

/** The transcript's printed page: one less than the PDF page up to PDF page 20, the same from PDF page 21 on. */
function transcriptPage(pdfPage: number): string {
  return pdfPage <= 20
    ? `page ${pdfPage - 1}, PDF page ${pdfPage}`
    : `page ${pdfPage}, PDF page ${pdfPage}`;
}

/** A line of the Gemini XI voice transcript: its time as printed, the speaker, and the words. */
function voice(time: string, speaker: string, words: string, pdfPage: number): Citation {
  return {
    source: 'gemini-11-voice-transcript',
    locator: `${time} g.e.t. (${transcriptPage(pdfPage)}), ${speaker}: "${words}"`,
    url: TRANSCRIPT,
  };
}

/** A page of the public affairs mission commentary. */
function commentary(tape: number, page: number, pdfPage: number, quote: string): Citation {
  return {
    source: 'gemini-11-mission-commentary',
    locator: `Tape ${tape}, page ${page} (PDF page ${pdfPage}): "${quote}"`,
    url: COMMENTARY,
  };
}

/** Summary of Rendezvous Operations (Gemini Summary Conference, SP-138). */
function rendezvousPaper(locator: string): Citation {
  return { source: 'gemini-rendezvous-summary', locator, url: RENDEZVOUS_PAPER };
}

/** On the Shoulders of Titans, chapter XV, "The Final Curtain" (PDF page = printed page + 21). */
function titans(page: number, quote: string): Citation {
  return {
    source: 'on-the-shoulders-of-titans',
    locator: `Chapter XV, "The Final Curtain", page ${page} (PDF page ${page + 21}): ${quote}`,
  };
}

/** NASA's Gemini XI mission page. */
function nasaMission(section: string): Citation {
  return { source: 'nasa-gemini-11-mission', locator: section };
}

/** NASA's article "55 Years Ago: Gemini XI Achieves One-Orbit Rendezvous, Record Altitude". */
function fiftyFive(section: string): Citation {
  return { source: 'nasa-gemini-11-55-years', locator: section };
}

/** The Smithsonian's page for the Gemini XI capsule. */
function nasm(section: string): Citation {
  return { source: 'nasm-gemini-11-capsule', locator: section };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-11/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-11/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: 'NASA',
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

const HIGH_POINT_DISCREPANCY =
  "For the orbit's high point, the chronology's September 12 entry gives 741 nautical miles; NSSDCA gives 1,374.1 km and NASA's Gemini XI page 1,374 km (742 nautical miles, our conversion); in the voice transcript the ground gives the orbit as \"156 by 742\" at 41:05:16 (page 129); NASA's 55-years article gives 853 miles. We follow Appendix 1 of the chronology (Tables A and B), 739.2 nautical miles.";

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: 'gemini-11',
  program: 'gemini',
  name: 'Gemini 11',
  kind: 'flight',
  destination: 'earth-orbit',

  summary: {
    text: {
      short:
        "In September 1966, Gemini 11 caught and docked with its Agena target on its very first trip around Earth. Then Pete Conrad and Dick Gordon used the Agena's engine to fly higher than any crew had gone before.",
      more: "Gemini 11 lifted off from Cape Kennedy, Florida, on September 12, 1966, 1 hour 37 minutes after its target, an uncrewed Agena rocket. Conrad and Gordon docked with it 1 hour 34 minutes after liftoff. On the second day Gordon went outside to tie a tether between the two spacecraft, but the work wore him out, and he came back in after 33 minutes. On the third day the Agena's engine boosted them to 739.2 nautical miles (851 miles) above Earth. Then they flew tied to the Agena by the tether, met it once more, and let the computer steer them home to a splashdown in the Atlantic Ocean, 71 hours 17 minutes 8 seconds after liftoff.",
    },
    citations: [
      mission(
        'The primary objective of the Gemini XI mission was to rendezvous with the Gemini Agena target vehicle (GATV) during the first revolution and dock.',
      ),
      chronologyTable(
        'A',
        '"G.E.T. to touchdown" row (71:17:08) and "At retrofire, Highest apogee (n.m.)" row (739.2)',
      ),
      chronologyTable(
        'B',
        'Gemini XI row, Launch "Time (e.s.t.)" 8:05:01.725 a.m.; "Docking" row, "To begin" 1:34:16',
      ),
      chronologyTable('D', '"Umbilical" row: hatch opening 24:02, hatch closing 24:35'),
      nmc('gemini', 'Mission Profile'),
      nasaMission(
        'Introduction: "performed a spacecraft rendezvous in the first orbit of a spaceflight for the first time, and reached a record-high altitude of 1,374 km"',
      ),
      nasm(
        'Object description: "rendezvoused and docked with their Agena target vehicle on their first orbit around the Earth"',
      ),
      fiftyFive('Photo caption: "depart for Launch Pad 19 at the Cape Kennedy Air Force Station"'),
    ],
    discrepancy: HIGH_POINT_DISCREPANCY,
  },

  crew: {
    value: [
      { name: 'Charles Conrad, Jr.', role: 'Command pilot' },
      { name: 'Richard F. Gordon, Jr.', role: 'Pilot' },
    ],
    citations: [
      mission(
        'carrying command pilot Astronaut Charles Conrad, Jr., and pilot Astronaut Richard F. Gordon, Jr.',
      ),
      chronologyTable('A', '"Flight crew" rows: Command pilot Conrad, Pilot Gordon'),
      nasaMission(
        'Mission Facts: "Crew: Charles “Pete” Conrad Jr. (Command Pilot) and Richard F. Gordon Jr. (Pilot)"',
      ),
      nasm('Object description: "Astronauts Pete Conrad (commander) and Dick Gordon (pilot)"'),
    ],
  },
  crewPhoto: nasaPhoto(
    's65-58504',
    1200,
    950,
    'Richard F. Gordon, Jr., left, and Charles Conrad, Jr., right, smile in light blue flight suits, holding a small model of the Gemini spacecraft between them, an American flag and a NASA flag behind them.',
  ),

  launch: {
    value: {
      utc: '1966-09-12T14:42:26.546Z',
      site: 'Launch Complex 19, Cape Kennedy, Florida',
      vehicle: 'Titan II Gemini Launch Vehicle (GLV-11)',
    },
    citations: [
      nmc(
        'gemini',
        'Mission Profile: "launched on 12 September 1966 at 9:42:26 a.m. EST (14:42:26.546 UT) from Complex 19"',
      ),
      chronologyTable(
        'A',
        '"Launch vehicle" (GLV-11), "Launch date" (Sept. 12, 1966) and "Time (e.s.t.)" (9:42:26 a.m.) rows',
      ),
      mission('was launched from complex 19 at 9:42 a.m.'),
      nasaMission(
        'Mission Facts: "Launch Date: Sept. 12, 1966, 9:42:26 a.m. EST (14:42:26 UT)" and "Launch Vehicle: Titan II"',
      ),
      fiftyFive('Photo caption: "depart for Launch Pad 19 at the Cape Kennedy Air Force Station"'),
    ],
  },

  duration: {
    value: '071:17:08',
    citations: [
      chronologyTable('A', '"G.E.T. to touchdown (hr; min; sec)" row: 71:17:08'),
      nasaMission(
        'Mission Facts: "Duration: 71 hours, 17 minutes, 8 seconds (2 days, 23 hours, 17 minutes, and 8 seconds)"',
      ),
      nmc('gemini', 'Mission Profile: "Total mission elapsed time was 71:17:08"'),
    ],
    discrepancy:
      "The heading of NASA's Gemini XI page gives the mission duration as 2 days, 23 hours, 17 minutes, 9 seconds; its Mission Facts give 71 hours, 17 minutes, 8 seconds. We follow the chronology's Table A.",
  },

  accomplishments: [
    {
      text: {
        short:
          'Gemini 11 caught and docked with its target on the first trip around Earth, the way an Apollo lunar module would later have to catch its command module after lifting off from the Moon.',
        more: "Project Gemini's job was to prove the skills Apollo needed to land on the Moon, and meeting and docking in orbit was one of them. Earlier Gemini crews had taken three or four orbits to reach a target. Conrad and Gordon did it in less than an hour and a half, working out much of the chase on board, and used less fuel than expected.",
      },
      citations: [
        fiftyFive(
          'Opening paragraph: Gemini\'s goals "included proving the techniques required for the Apollo Program"; and on the plan: "This maneuver simulated an Apollo Lunar Module lifting off from the surface and performing a rendezvous with the Command Module in lunar orbit."',
        ),
        nasm(
          'Object description: "pioneering a technique that would later be used in the Apollo lunar landings"',
        ),
        {
          source: 'gemini-chronology',
          locator:
            'Appendix 1, Table B (Orbital Operations), "Revolution" column: the first rendezvous on revolution 4 for Gemini VI-A, VIII and X, revolution 3 for IX-A, and revolution 1 for XI',
          url: CHRONOLOGY_TABLE_B,
        },
        mission(
          'Five maneuvers completed the spacecraft/GATV rendezvous at 1 hour 25 minutes ground elapsed time',
        ),
        nmc(
          'gemini',
          'Mission Profile: "Docking was completed at 11:16 a.m. on the first orbit, consuming less fuel than expected."',
        ),
        titans(
          359,
          '"Conrad and Gordon checked these calculations against their own and found the differences so minor they could have used either set to do the job. They decided to stick with their own solutions."',
        ),
      ],
    },
    {
      text: {
        short:
          "The Agena's engine lifted the docked spacecraft to 739.2 nautical miles (851 miles) above Earth, higher than any crew had ever flown. The record stood until Apollo 8 went to the Moon.",
        more: "It broke the record set by Gemini X. From so high, the crew could see Earth's curve plainly, and Conrad said he could see around about 150 degrees of the horizon.",
      },
      citations: [
        chronologyTable(
          'B',
          '"High-altitude excursion" row (revolution 26), Spacecraft Orbital Parameters, Apogee: 739.2 n.m.',
        ),
        chronologyTable('A', '"At retrofire, Highest apogee (n.m.)" row: 739.2'),
        nmc(
          'gemini',
          'Mission Profile: "(A record altitude for an astronaut mission that would stand until Apollo 8 went to the Moon.)"',
        ),
        fiftyFive(
          '"The 26-second burn raised the apogee, or orbital high point, of the docked spacecraft to 853 miles, breaking Gemini X\'s record"',
        ),
        voice(
          '41:04:47',
          'the command pilot',
          'the end, around the top of the world all the way around about 150 degrees, including the horizon all the way around.',
          129,
        ),
        titans(363, '"The curvature of the earth stands out a lot."'),
      ],
      discrepancy: HIGH_POINT_DISCREPANCY,
    },
    {
      text: {
        short:
          'Tied together by a 100-foot (30-meter) tether, Gemini 11 and the Agena turned slowly around each other. The turning made a tiny pull like gravity, the first made in space, though far too weak for the crew to feel.',
        more: 'The first try, to let the pair hang one below the other with the heavier Agena pointing at Earth, could not be finished, and the spinning puzzled the crew at first. But after three hours tied together, the turning had shown that two craft could keep station this way using less fuel than expected.',
      },
      citations: [
        nmc(
          'gemini',
          'Mission Profile: "The circular motion at the end of the tether imparted a slight artificial “gravitational acceleration” within Gemini 11, the first time such artificial gravity was demonstrated in space."',
        ),
        fiftyFive(
          '"they generated an artificial gravity field of about 0.00015 g, too weak for the astronauts to feel" and the "100-foot tether"',
        ),
        titans(
          368,
          '"There had been some disappointment that the gravity-gradient mode could not be completed, but confidence rose when the spinup proved that stationkeeping could be done economically." and "they were using less fuel than had been expected" and "After they had been roped to the Agena for three hours" and "an interesting and puzzling experience"',
        ),
        fiftyFive(
          '"After a brief but unsuccessful attempt at achieving a gravity-gradient attitude, with the heavier Agena pointing toward the Earth"',
        ),
      ],
    },
    {
      text: {
        short:
          "For the first time in the American space program, a spacecraft's computer steered it down through the atmosphere by firing the thrusters itself. It landed Gemini 11 about 3 miles from its target.",
        more: "It was the first closed-loop automatic reentry in the American space program: the computer's commands went straight to the reentry thrusters, which turned the spacecraft to steer it, while Conrad and Gordon watched the computer closely. It landed 2.65 nautical miles (4.9 kilometers) from the planned point.",
      },
      citations: [
        nmc(
          'gemini',
          'Mission Profile: "This was the first closed-loop, automatic reentry (guided by computer commands directly to the thrusters) in the U.S. space program."',
        ),
        chronologyTable('A', '"Landing accuracy (n.m. from planned landing point)" row: 2.65'),
        titans(
          370,
          '"Conrad and Gordon watched the computer closely." and "The accuracy of automatic reentry was thoroughly demonstrated"',
        ),
      ],
    },
  ],

  chapters: [
    { id: 'launch', title: 'Two launches' },
    { id: 'first-orbit', title: 'Caught on the first orbit' },
    { id: 'docked', title: 'Docked to the Agena' },
    { id: 'tether', title: 'The tether' },
    { id: 'home', title: 'Coming home' },
  ],

  events: [
    /* --------------------------- Two launches -------------------------- */
    {
      id: 'agena-launch',
      title: 'The target launches',
      chapter: 'launch',
      elapsed: '-001:37:24.821',
      utc: '1966-09-12T13:05:01.725Z',
      text: {
        short:
          'An Atlas rocket launches the Agena, an uncrewed target rocket, from Cape Kennedy. Gemini 11 will have to catch it on its very first trip around Earth.',
        more: "The Atlas-Agena lifted off from Launch Complex 14 at 8:05 a.m. Eastern Standard Time on September 12, 1966. Two earlier tries had been called off: on September 9 a pinhole leak turned up in the first stage of Gemini 11's Titan rocket, and on September 10 the Atlas seemed to have an autopilot problem. This time all went well. NASA's commentator called 7 minutes 38 seconds after liftoff and, a few seconds later, the Agena's own engine shut down, leaving it in a nearly circular orbit about 300 kilometers (186 miles) up. Conrad and Gordon were already in their seats on Launch Complex 19, about 1,800 meters (a little over a mile) from the Atlas's pad.",
      },
      citations: [
        chronologyTable(
          'B',
          'Gemini XI row: Target vehicle GATV-5006, Target launch vehicle TLV-5306, Launch date Sept. 12, 1966, "Time (e.s.t.)" 8:05:01.725 a.m.',
        ),
        nmc(
          'agena',
          'Description: "launched from Cape Canaveral at 8:05:01 a.m. EST (13:05:01.725 UT) on 12 September 1966 using an Atlas-Agena D rocket into a near-circular 300 km orbit"',
        ),
        mission(
          'The Gemini XI mission began with the launch of the Gemini Atlas-Agena target vehicle from complex 14 at 8:05 a.m., e.s.t.',
        ),
        chronology(
          'September 9, 1966',
          'The scheduled launch of Gemini XI was postponed when a pinhole leak was discovered in the stage I oxidizer tank of the launch vehicle',
        ),
        chronology(
          'September 10, 1966',
          'The scheduled Atlas-Agena launch was postponed because of apparent problems with the target launch vehicle autopilot.',
        ),
        commentary(
          31,
          1,
          78,
          'Still looking good, 7 minutes, 38 seconds ... Just a few seconds away from this Agena burn. Coming up on the cutoff now... Mark PPS cutoff.',
        ),
        titans(
          357,
          '"the Atlas, only 1800 meters away, was having a problem with its autopilot" (on September 10, as the crew headed for pad 19)',
        ),
        titans(
          358,
          '"Conrad and Gordon arrived at the pad and stepped into their seats exactly on time" and "At 8:05 a.m., the Atlas roared into action."',
        ),
      ],
      discrepancy:
        "NASA's 55-years article blames the September 10 delay on a problem with the Agena's guidance system; the chronology and On the Shoulders of Titans say it was the Atlas's autopilot. We follow the chronology.",
      view: 'earth',
    },
    {
      id: 'liftoff',
      handsOn: 'stages',
      title: 'Liftoff',
      chapter: 'launch',
      elapsed: '000:00:00',
      utc: '1966-09-12T14:42:26.546Z',
      text: {
        short:
          'A Titan II rocket lifts Gemini 11 off the pad with Pete Conrad and Dick Gordon aboard. To catch the Agena on the first orbit, it has to leave within a two-second window.',
        more: 'Liftoff came at 9:42:26 a.m. Eastern Standard Time, half a second into the two-second launch window, the shortest of the Gemini program. Conrad was the command pilot and Gordon the pilot. At 2 minutes 35 seconds Conrad called, "It\'s good Staging and engine ignition," as the first stage fell away. About 6 minutes after liftoff, Gemini 11 was in orbit, 86.6 by 150.6 nautical miles (160 by 279 kilometers) up, with the Agena about 430 kilometers (267 miles) away.',
      },
      citations: [
        nmc(
          'gemini',
          'Mission Profile: "launched on 12 September 1966 at 9:42:26 a.m. EST (14:42:26.546 UT) from Complex 19 and inserted into a 160.5 x 279.1 km Earth orbit at 9:48:28"',
        ),
        nasaMission('Mission Facts: "Launch Date: Sept. 12, 1966, 9:42:26 a.m. EST (14:42:26 UT)"'),
        chronologyTable(
          'A',
          '"Flight crew" rows (Command pilot Conrad, Pilot Gordon), "Launch date" and "Time (e.s.t.)" rows, and "At insertion" Apogee 150.6 and Perigee 86.6 rows',
        ),
        titans(
          358,
          '"It was the shortest launch window in the Gemini program" and "This was at 9:42:26.5, just half a second into the two-second period." and "help them catch a target 430 kilometers away"',
        ),
        voice('00:02:35', 'the command pilot', "It's good Staging and engine ignition.", 4),
        fiftyFive(
          '"To successfully complete this so-called M=1 rendezvous, Gemini XI needed to liftoff within a two-second launch window."',
        ),
      ],
      photo: nasaPhoto(
        'S66-53900',
        1284,
        1600,
        'A white-and-black Titan II rocket rises past its red launch tower on a short bright flame, with clouds of tan and white smoke billowing across the pad under a pale blue sky streaked with high clouds.',
      ),
      view: 'earth',
      inTour: true,
    },

    /* ----------------------- Caught on the first orbit ---------------------- */
    {
      id: 'rendezvous',
      handsOn: 'docking',
      title: 'Caught on the first orbit',
      chapter: 'first-orbit',
      elapsed: '001:25:00',
      text: {
        short:
          'Less than an hour and a half after liftoff, Gemini 11 pulls up beside the Agena. No crew had ever caught a target on its first trip around Earth.',
        more: 'The crew worked out most of the chase themselves, with their own radar and onboard computer. At 49 minutes 43 seconds, about 10 nautical miles (19 kilometers) below and 15 (28 kilometers) behind the Agena, they fired the thrusters to start the final approach, and over California, at about 1 hour 25 minutes, they reached it. Gordon radioed, "Tell Mr. Kraft - would he believe M equals 1." (M equals 1 meant a meeting on the first orbit.) At 1 hour 34 minutes 16 seconds the spacecraft\'s nose slid into the Agena\'s docking cone, and a second later Conrad reported, "We are docked." Later each of them practiced undocking and docking again, the first time a Gemini pilot, not only the command pilot, had docked with a target.',
      },
      citations: [
        mission(
          'Five maneuvers completed the spacecraft/GATV rendezvous at 1 hour 25 minutes ground elapsed time, and the two vehicles docked nine minutes later.',
          'given to the minute; seconds written as 00',
        ),
        chronologyTable(
          'B',
          '"Rendezvous at first apogee" row (revolution 1) and "Docking" row (revolution 1), Ground Elapsed Time "To begin": 1:34:16',
        ),
        rendezvousPaper(
          'Figure 2-8, "Relative trajectory, terminal phase. Gemini XI mission" (page 11, PDF page 5): "Terminal-phase initiation 90 seconds before apogee ... g.e.t. = 00:49:43"; and text, page 12 (PDF page 6): "the spacecraft 10 nautical miles below and 15 nautical miles behind the target vehicle"',
        ),
        rendezvousPaper('Text, page 7 (PDF page 1): "first orbit (M = 1)"'),
        voice('01:30:15', 'the pilot', 'Tell Mr. Kraft - would he believe M equals 1.', 24),
        voice('01:34:17', 'the command pilot', 'We are docked.', 25),
        titans(
          358,
          '"The first onboard calculations had succeeded" and "They turned on the rendezvous radar"',
        ),
        titans(
          359,
          '"the crew switched the onboard computer to the rendezvous mode", "Over the coast of California, only 85 minutes after launch, rendezvous in the first orbit was achieved.", "Each man pulled out and drove back once in daylight and once in darkness." and "For the first time, also, a copilot was given the chance to dock with a target vehicle."',
        ),
        nmc(
          'agena',
          'Gemini Agena Target Vehicle: "The GATV had a docking cone at the forward end into which the nose of the Gemini spacecraft could be inserted and held with docking latches."',
        ),
        nasaMission(
          'Introduction: "performed a spacecraft rendezvous in the first orbit of a spaceflight for the first time"',
        ),
        fiftyFive(
          '"Just 85 minutes after launch" and "Nine minutes later, he docked the two spacecraft. Conrad and Gordon then undocked and redocked three more times"',
        ),
      ],
      discrepancy:
        'NASA\'s 55-years article has Conrad radio "Would you believe M=1?"; the voice transcript gives the call to Gordon, the pilot, at 1:30:15, and On the Shoulders of Titans to "a gleeful crew". We follow the transcript. The sources count the practice dockings differently (three more, NASA\'s article; two each, NSSDCA), so the text gives no number.',
      view: 'spacecraft',
      inTour: true,
    },

    /* -------------------------- Docked to the Agena ------------------------- */
    {
      id: 'spacewalk',
      title: "Riding the spacecraft's nose",
      chapter: 'docked',
      elapsed: '024:02:00',
      text: {
        short:
          "Dick Gordon opens his hatch and climbs out. Sitting on the spacecraft's nose like a rider on a horse, he hooks a 100-foot (30-meter) line from the Agena to Gemini 11.",
        more: "Gordon opened the hatch at about 24 hours 2 minutes, already worn out from fighting to fit a sun visor onto his helmet in the cramped cabin. Outside, with nothing to brace his feet against, it took him six minutes of struggling to clamp the tether to the spacecraft's docking bar. Then sweat ran into his right eye, and he could hardly see. Conrad called him back in and told the ground he had \"brought Dick back in ... He got so hot and sweaty, he couldn't see.\" The hatch closed after only 33 minutes instead of the planned 107. Gordon's struggle showed that working outside a spacecraft was still much harder than expected.",
      },
      citations: [
        chronologyTable(
          'D',
          '"Umbilical" row: "Cabin pressure to zero" 24:02:16 (T, from telemetry), "Hatch opening" 24:02 (V, from voice transcriptions; given to the minute, seconds written as 00), "Crewman outside" 24:09 (V), "Hatch closing" 24:35 (E, estimated)',
        ),
        mission(
          'Umbilical EVA began at 24 hours 2 minutes ground elapsed time and ended 33 minutes later. Gordon became fatigued while attaching the tether from the GATV to the spacecraft docking bar.',
        ),
        voice('24:02:47', 'the pilot', 'Hatch is open.', 83),
        titans(360, '"Gordon began putting a sun visor on his faceplate, a real chore"'),
        titans(
          361,
          '"attach a 30-meter tether, housed in the Agena target docking adapter, to the spacecraft docking bar" and "pull himself astride the spacecraft nose" and "he had neither saddle nor stirrups to help him" and "He struggled for six minutes, finally securing the line."',
        ),
        titans(
          362,
          '"His right eye was still burning" and "brought Dick back in, ... He got so hot and sweaty, he couldn\'t see." and "It had been open only 33 minutes, instead of the planned 107."',
        ),
        nmc(
          'gemini',
          'Mission Profile: "the heavy perspiration inside the suit obscured his vision and finally blinded his right eye"',
        ),
        nasm(
          'Object description: "Gordon experienced overheating and exhaustion during his space walk which showed that the problems of extra-vehicular activity (EVA) had not yet been solved"',
        ),
        fiftyFive('"a 100-foot tether"'),
      ],
      discrepancy:
        "NASA's 55-years article and the Smithsonian give the spacewalk as 38 minutes, and NSSDCA's page for the Agena as 20 minutes. We follow the chronology: 33 minutes, from 24:02 to 24:35 in its Table D.",
      photo: nasaPhoto(
        'S66-54455',
        1600,
        1084,
        'Dick Gordon in a white spacesuit sits astride the dark front of the docked spacecraft, with a long antenna pole rising above him. The blue, cloud-covered Earth curves away at left, and the edge of the open hatch frames the right side of the picture.',
      ),
      view: 'spacecraft',
      inTour: true,
    },
    {
      id: 'high-burn',
      title: 'Up to the high orbit',
      chapter: 'docked',
      elapsed: '040:31:52',
      text: {
        short:
          "With Gemini 11 still docked, the crew fires the Agena's big engine. In less than half a minute it pushes them into a stretched-out orbit that climbs higher than any crew has ever flown.",
        more: "On the 26th trip around Earth, small thrusters on the Agena fired first, to settle its propellants: NASA's commentator said beforehand they would run for some 1 minute 8 seconds. Then the main engine fired for about 25 seconds, shutting down at 40 hours 31 minutes 52 seconds. Facing the Agena, the astronauts were thrown forward against their harnesses. The new orbit's high point was 739.2 nautical miles (1,369 kilometers, or 851 miles) above Earth, while its low point stayed at 156.3 nautical miles (289 kilometers). Mission planners put the high part of the orbit over Australia, where the radiation belts around Earth are weaker.",
      },
      citations: [
        voice('40:31:52', 'the Canary Islands capsule communicator', 'Cut-off.', 126),
        commentary(
          157,
          1,
          369,
          'The Secondary Propulsion System will be used first for some 68 seconds to insure the proper position of fuels in the thrust chambers for the large engine to make it burn properly. ... We have an ullage burn starting - it started at about 40:30:20, 40 hours 30 minutes 20 seconds ... 40 hours 31 minutes 20 seconds - we should be just a few seconds away from the PPS. We have a PPS start. ... We have a cut-off.',
        ),
        nmc(
          'gemini',
          'Mission Profile: "the Agena primary propulsion system was fired for 25 seconds at 2:12:41 a.m. EST on 14 September, raising the docked spacecraft apogee to 1374.1 km"',
        ),
        mission(
          'At 40 hours 30 minutes after liftoff, the GATV primary propulsion system (PPS) was fired to raise the apogee of the docked vehicles to 741 nautical miles for two revolutions.',
        ),
        chronologyTable(
          'B',
          '"High-altitude excursion" row (revolution 26), Spacecraft Orbital Parameters: Apogee 739.2, Perigee 156.3',
        ),
        titans(
          363,
          '"At 40:30 hours into the flight, in the 26th revolution" and "Since they faced the Agena, the acceleration forced the crew forward onto the seat harnesses."',
        ),
        titans(
          365,
          '"High apogee orbits for Gemini XI were therefore planned to take place over Australia, because the level there is comparatively low."',
        ),
      ],
      discrepancy: `On the Shoulders of Titans and NASA's 55-years article give the main engine's firing as 26 seconds. NSSDCA gives 25 seconds starting at 2:12:41 a.m. EST (40:30:14 on the mission clock, our arithmetic), which matches when the commentary says the small thrusters started, about 40:30:20; the chronology gives 40 hours 30 minutes. The text gives the time the voice transcript logs for the cutoff. ${HIGH_POINT_DISCREPANCY}`,
      view: 'earth',
    },
    {
      id: 'top-of-the-world',
      title: 'The world is round',
      chapter: 'docked',
      elapsed: '041:02:40',
      text: {
        short:
          "Climbing toward the top of the orbit over Australia, the crew sees Earth as a giant blue ball. Conrad radios, \"I'll tell you, it's GO up here and the world's round.\"",
        more: 'Talking to the tracking station at Carnarvon, Australia, Conrad said he could see "around the top of the world all the way around about 150 degrees." Gordon photographed the land and clouds far below. On the next trip around, when Gordon read out the radiation meter, astronaut Alan Bean, talking to the crew from the ground, joked, "Sounds like it\'s safer up there than a chest x-ray." After two trips around Earth in the high orbit, about 3 hours 23 minutes after the first firing, they fired the Agena\'s engine again, this time pointed ahead to slow down. That brought the orbit\'s high point back down to 164.0 nautical miles (304 kilometers).',
      },
      citations: [
        voice(
          '41:02:40',
          'the command pilot',
          "I'll tell you, it's GO up here and the world's round.",
          128,
        ),
        voice(
          '41:04:47',
          'the command pilot',
          'the end, around the top of the world all the way around about 150 degrees, including the horizon all the way around.',
          129,
        ),
        voice(
          '43:18:18',
          'the capsule communicator',
          "Sounds like it's safer up there than a chest x-ray.",
          140,
        ),
        voice('43:18:01', 'the pilot', 'Houston, radiation revised is .2 rads per hour', 140),
        titans(
          365,
          `Gordon: "Houston, radiation is revised to .2rads per hour." To which Bean replied, "Sounds like it's safer up there than a chest x-ray."`,
        ),
        titans(360, '"Now Alan Bean, who had taken over from Young as CapCom"'),
        titans(
          363,
          '"From Carnarvon, 1372 kilometers below came, “Hello, up there.”" and "Gordon snapped synoptic terrain and synoptic weather photographs"',
        ),
        mission(
          'The PPS was fired again, 3 hours 23 minutes later, to reduce apogee to 164 nautical miles.',
        ),
        commentary(
          172,
          2,
          406,
          'The Agena/Gemini configuration is in an attitude with the big engine leading and it will fire into the direction of flight. In other words, a retrograde type burn',
        ),
        chronologyTable(
          'B',
          '"Tethered operations" row (revolution 32), Spacecraft Orbital Parameters: Apogee 164.0',
        ),
        nmc(
          'gemini',
          'Mission Profile: "After two orbits the Agena was fired again for 22.5 seconds"',
        ),
      ],
      photo: nasaPhoto(
        's66-54706',
        1484,
        1600,
        'Looking down from high above, the western half of Australia spreads across the curved Earth, reddish-brown land dotted with small white clouds and edged by blue sea, under black space. A thin pole with a yellow tip rises into the view from the docked spacecraft at the bottom of the picture.',
      ),
      view: 'earth',
      inTour: true,
    },

    /* ------------------------------- The tether ------------------------------ */
    {
      id: 'tether',
      title: 'Two spacecraft on a rope',
      chapter: 'tether',
      elapsed: '050:13:00',
      text: {
        short:
          'Gemini 11 undocks but stays tied to the Agena by the tether. Conrad sets the two spacecraft slowly turning around each other, like two balls on the ends of a string.',
        more: "Earlier, from about 46 hours 7 minutes, Gordon had spent 2 hours 8 minutes standing up in the open hatch, photographing stars with an ultraviolet camera; at one point both astronauts dozed off. After undocking, Conrad backed away to the end of the tether, and at about 50 hours 13 minutes he fired the thrusters to start the pair turning. It soon settled into a steady turn of 38 degrees a minute. When they turned faster, at 55 degrees a minute, a camera let go in the cabin drifted toward the back of the spacecraft: a tiny artificial gravity, about 0.00015 of Earth's, too weak to feel. After about three hours they let the tether go and flew free.",
      },
      citations: [
        chronologyTable(
          'D',
          '"Standup" row: "Hatch opening" 46:07 (E, estimated; given to the minute, seconds written as 00), "Hatch closing" 48:15 (V, from voice transcriptions)',
        ),
        mission(
          'The spacecraft was then undocked to begin the tether evaluation. At 50 hours 13 minutes ground elapsed time, the crew initiated rotation.',
          'given to the minute; seconds written as 00',
        ),
        mission(
          'At about 53 hours into the mission, the crew released the tether, separated from the GATV',
        ),
        chronologyTable(
          'B',
          '"Tethered operations" row (revolution 32): Ground Elapsed Time "To begin" 49:55:00, "Period" 3:03:00',
        ),
        voice(
          '49:50:46',
          'the command pilot',
          "Roger, Hawaii. This is Gemini XI, and we've undocked from the Agena",
          188,
        ),
        voice('50:15:05', 'the command pilot', 'We are spinning, after a fashion.', 198),
        titans(
          365,
          '"Gordon\'s main task during two night passes of open-hatch work was to photograph several star fields, using the S-13 ultraviolet astronomical camera."',
        ),
        titans(
          366,
          '"he was asleep hanging out the hatch on his tether and I was asleep sitting inside the spacecraft"',
        ),
        titans(
          367,
          '"A 38-degree-per-minute rotational rate was obtained and remained steady throughout the nightside pass."',
        ),
        titans(
          368,
          '"The rotation rate checked out at 55 degrees per minute" and "When they put a camera against the instrument panel and then let it go, it moved in a straight line to the rear of the cockpit"',
        ),
        fiftyFive(
          '"they generated an artificial gravity field of about 0.00015 g, too weak for the astronauts to feel" and "After three hours of tether operations, the astronauts jettisoned it from the Gemini spacecraft"',
        ),
        nmc(
          'gemini',
          'Mission Profile: "At 7:49 a.m. Gordon opened his hatch to begin a 2 hour 8 minute standup EVA", "Gemini 11 moved to the end of the 30 meter tether attaching the two spacecraft" and "At 11:55 a.m. Conrad initiated a slow rotation"',
        ),
      ],
      discrepancy:
        "The chronology's September 12 entry says the standup spacewalk began at 47 hours 7 minutes; its own Table D gives the hatch opening at 46:07 and closing at 48:15, and NSSDCA gives 7:49 a.m. EST (about 46:07 on the mission clock, our arithmetic). We follow Table D. NSSDCA puts the start of the turning at 11:55 a.m. EST (about 50:13, our arithmetic); we follow the chronology's 50 hours 13 minutes. Table B has the tethered operations beginning at 49:55:00, but the voice transcript has the crew already undocked at 49:50:46.",
      photo: nasaPhoto(
        's66-54571',
        1466,
        1600,
        'The Agena, a small dark cylinder, floats far out above the blue ocean and scattered white clouds, with a thin tether line stretching toward it from the lower left. The curved edge of Earth and black space are at the top.',
      ),
      view: 'spacecraft',
      inTour: true,
    },
    {
      id: 'rerendezvous',
      title: 'One more rendezvous',
      chapter: 'tether',
      elapsed: '066:40:43',
      text: {
        short:
          'On the last day, the crew chases the Agena one more time and stops about 50 feet (15 meters) from it. Then they say goodbye and back away.',
        more: 'After letting go of the tether, Gemini 11 dropped into the Agena\'s own orbit about 30 kilometers (16 nautical miles) behind it. The plan was a "stable orbit": the two would keep about the same distance apart using very little fuel. When the crew woke on their 41st trip around Earth, the Agena was 46 kilometers (25 nautical miles) ahead. Ground controllers worked out the steering for this chase, and the crew finished it by eye, without radar. The chase began at about 65 hours 27 minutes, and at 66 hours 40 minutes 43 seconds Conrad reported, "Okay. We\'re Stationkeeping." By 67 hours 8 minutes they had made a small backward push of 3 feet (about 1 meter) per second and left the Agena behind. "We were sorry to see that Agena go. It was very kind to us," Gordon said later.',
      },
      citations: [
        voice(
          '66:39:5_ (last digit unreadable)',
          'the command pilot',
          "I'm still braking a little bit, but we're here, about 50 feet out.",
          323,
        ),
        voice('66:40:43', 'the command pilot', "Okay. We're Stationkeeping.", 323),
        voice(
          '67:07:45',
          'the Carnarvon capsule communicator',
          'Roger. How did your SEP burn go?',
          325,
        ),
        mission('A rerendezvous was accomplished at 66 hours 40 minutes ground elapsed time'),
        rendezvousPaper(
          'Text, page 12 (PDF page 6): "This rendezvous was ground controlled except that the terminal braking and line-of-sight control phases were performed by the crew using visual observations (no radar)." and "the spacecraft was in a nearly circular orbit at the same altitude as the target vehicle, but with a trailing displacement of approximately 25 nautical miles" and "the rendezvous was referred to as a stable-orbit rendezvous"',
        ),
        titans(
          368,
          '"The spacecraft would follow the Agena by 28 kilometers and in its exact orbital path. If the plan succeeded, the crew would, in essence, be stationkeeping at very long range and with the use of very little fuel." and "the spacecraft dropped into the Agena\'s lane 30 kilometers behind the target"',
        ),
        titans(
          369,
          '"when the crew broke their sleep period, in revolution 41, the target was 46 kilometers ahead" and "At 65:27 hours of flight time, Conrad tilted the spacecraft nose 53 degrees above level flight and fired the forward thrusters." (given to the minute) and "We made the 3 foot [1 meter] per second retrograde burn and left the best friend we ever had." Gordon added, "We were sorry to see that Agena go. It was very kind to us."',
        ),
        nmc(
          'gemini',
          'Mission Profile: "At 4:22 a.m. on 15 September a final rerendezvous maneuver without use of the rendezvous radar, which had malfunctioned, was accomplished."',
        ),
        fiftyFive('"coming within 50 feet of the target vehicle"'),
      ],
      discrepancy:
        'NSSDCA gives the rerendezvous as 4:22 a.m. EST (about 66:40 on the mission clock, our arithmetic) and the chronology as 66 hours 40 minutes; we follow the voice transcript, 66:40:43. On the Shoulders of Titans says the spacecraft was to trail the Agena by 28 km, dropped in 30 km behind it, and found it 46 km ahead when the crew woke in revolution 41; SP-138 gives a trailing distance of about 25 nautical miles at the start of the chase, which the flight path uses. On the Shoulders of Titans says the crew broke away twelve minutes after reaching the Agena, about 66:53; the crew did not log the time of that burn, and the transcript shows only that it had been made by 67:07:45.',
      view: 'spacecraft',
    },

    /* ------------------------------ Coming home ----------------------------- */
    {
      id: 'retrofire',
      title: 'Retrofire, and the computer takes over',
      chapter: 'home',
      elapsed: '070:41:36',
      utc: '1966-09-15T13:24:03Z',
      text: {
        short:
          "Small rockets fire to slow Gemini 11 down so it falls out of orbit. This time the spacecraft's computer, not the pilot, steers it down through the air.",
        more: "Retrofire, the firing of small rockets that starts the trip home, came at 70 hours 41 minutes 36 seconds, at the end of the 44th trip around Earth. Just before, the crew cast off the equipment section at the back of the spacecraft. Then Conrad let the onboard computer fly the reentry: its commands went straight to the thrusters, changing the spacecraft's bank to steer it toward the landing point, while Conrad and Gordon watched the computer closely. It was the first closed-loop automatic reentry, guided by the computer's commands to the thrusters, in the American space program.",
      },
      citations: [
        chronologyTable('A', '"G.E.T. to retrofire (hr; min; sec)" row: 70:41:36'),
        nmc(
          'gemini',
          'Mission Profile: "Retrofire occurred at the end of the 44th revolution at 8:24:03 a.m. EST on 15 September. This was the first closed-loop, automatic reentry (guided by computer commands directly to the thrusters) in the U.S. space program." (UTC is our conversion)',
        ),
        commentary(
          254,
          1,
          632,
          'The Gemini 11 crew has separated the equipment adapter. 30 seconds from retrofire.',
        ),
        voice('70:43:18', 'the command pilot', '... Automatic Retrofire.', 342),
        titans(
          370,
          '"Conrad and Gordon watched the computer closely." and "Conrad then disengaged his handcontroller and put the system on automatic. When the first crossrange errors developed, the computer commanded bank angle changes."',
        ),
      ],
      discrepancy:
        "The voice transcript logs the ground's countdown ending in \"Retrofire !\" at 70:41:37. We follow the chronology's Table A, 70:41:36, which NSSDCA's 8:24:03 a.m. EST matches.",
      view: 'spacecraft',
    },
    {
      id: 'splashdown',
      title: 'Splashdown',
      chapter: 'home',
      elapsed: '071:17:08',
      utc: '1966-09-15T13:59:35Z',
      text: {
        short:
          'Gemini 11 splashes down in the Atlantic Ocean about 3 miles from its target, so close to the recovery ship USS Guam that the sailors can see it. A helicopter carries Conrad and Gordon to the ship.',
        more: 'The computer brought the spacecraft down 2.65 nautical miles (4.9 kilometers) from the planned point, 71 hours 17 minutes 8 seconds after liftoff. Just before the landing, Houston told the crew, "You\'re on TV now." Swimmers fastened a flotation collar around the spacecraft, Conrad and Gordon climbed out into a raft, and a helicopter lifted them to the Guam\'s deck at about 9:23 a.m. Eastern Standard Time. The ship hoisted Gemini 11 aboard at about 9:58 a.m.',
      },
      citations: [
        chronologyTable(
          'A',
          '"G.E.T. to touchdown" row (71:17:08); "Landing accuracy (n.m. from planned landing point)" row (2.65); Recovery: W/Atlantic, area 45-1, Primary, Ship U.S.S. Guam, Sept. 15, 1966, "Time (e.s.t.)" Crew 9:23 a.m. and Spacecraft 9:58 a.m.',
        ),
        nasaMission(
          'Mission Facts: "Landing Date: Sept. 15, 1966, 8:59:35 a.m. EST (13:59:35 UT)", "Landing Site: Western Atlantic Ocean, 24.25° N 70.00° W" and "Recovery Ship: U.S.S. Guam"',
        ),
        nmc(
          'gemini',
          'Mission Profile: "Splashdown in the western Atlantic at 24.25 N, 70.00 W, 4.9 km from the target point, occurred at 8:59:35 a.m. EST. The crew was picked up by helicopter and brought to the U.S.S. Guam at 9:23 a.m. and the spacecraft was recovered at 9:58 a.m."',
        ),
        voice(
          '71:13:39',
          'Guam Control',
          'Gemini XI, this is Guam Control. Our lookouts have you in sight on my port side.',
          345,
        ),
        voice(
          '71:13:45',
          'the capsule communicator',
          "Gemini XI, this is Houston. You're on TV now.",
          345,
        ),
        commentary(
          258,
          1,
          641,
          'At the present time the flotation collar is being placed around the spacecraft',
        ),
        fiftyFive(
          '"Conrad and Gordon elected to exit their spacecraft in the water and onto a life raft. Rescue crews hoisted them aboard a helicopter that flew them to the deck of the carrier"',
        ),
        titans(
          370,
          '"the spacecraft landed within 4.6 kilometers of the U.S.S. Guam, the prime recovery ship"',
        ),
      ],
      discrepancy:
        "The chronology's September 12 entry says the spacecraft landed less than three miles from the planned point, NASA's 55-years article within two miles of the target, and NSSDCA 4.9 km from it. We follow the chronology's Table A, 2.65 nautical miles. The 3 miles in the short text is our conversion of that.",
      view: 'earth',
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Gemini XI spacecraft',
        museum: 'California Science Center',
        place: 'Los Angeles, California',
      },
      citations: [
        fiftyFive(
          'Last paragraph: "Today, the Gemini XI spacecraft is on display at the California Science Center in Los Angeles."',
        ),
        nasm(
          '"The National Aeronautics and Space Administration transferred Gemini 11 to the Smithsonian in August 1967." Display Status: "This object is not on display at the National Air and Space Museum. It is either on loan or in storage."',
        ),
      ],
    },
  ],
};
