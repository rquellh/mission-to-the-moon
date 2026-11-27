/**
 * Gemini 12 (NASA wrote it "Gemini XII"): the last Gemini flight, November
 * 11-15, 1966, with rendezvous and docking, three periods outside the
 * spacecraft, and a tether exercise.
 *
 * Every event time is copied from the Gemini Program Mission Report for
 * Gemini XII (MSC-G-R-67-1, January 1967), the canonical source for this
 * mission: elapsed times exactly as its Tables 4.2-I to 4.2-III ("Sequence
 * of Events") print the actual times. Moments those tables do not list come
 * from other sections of the same report, named in each citation. Where
 * another source gives a different value, the `discrepancy` field says what
 * it gives; we follow the mission report. No NASA or Internet Archive copy
 * of the report was found, so the source registry links to the scan of the
 * NASA report in the Virtual AGC project's library at ibiblio.org. Each
 * citation gives the report's printed page and then the scan's PDF page.
 *
 * Elapsed times are ground elapsed time (g.e.t.), counted from Gemini XII's
 * lift-off at 20:46:33.419 G.m.t. (Table 4.2-I). Where a source gives a time
 * only to the minute, seconds are written as 00 and the citation says so.
 *
 * The Agena target vehicle was launched first, at 19:07:58.688 G.m.t. (Table
 * 4.2-III). Its time on the mission clock, -001:38:34.731, is our
 * subtraction of the two lift-off times; section 4.1 states the same gap,
 * "One hour 38 minutes 34.731 seconds".
 *
 * Universal times are given only where a source states them. The retrofire
 * UTC is NASA's Gemini XII page's 1:46:31 p.m. EST plus five hours, our
 * arithmetic.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers, feet
 * to meters) and the sums of time outside are our arithmetic on the cited
 * values.
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const CHRONOLOGY_1966 = 'https://www.nasa.gov/history/SP-4002/p3b.htm';

/** Printed pages of the mission report and the scan's PDF pages, for the pages cited here. */
const PDF_PAGE = {
  '1-1': 35,
  '1-2': 36,
  '1-3': 37,
  '1-4': 38,
  '2-1': 39,
  '4-1': 75,
  '4-2': 76,
  '4-3': 77,
  '4-5': 79,
  '4-15': 91,
  '4-16': 92,
  '4-17': 93,
  '4-18': 94,
  '4-21': 97,
  '4-22': 98,
  '5-102': 282,
  '6-27': 364,
  '6-28': 365,
  '7-1': 386,
  '7-2': 387,
  '7-3': 388,
  '7-4': 389,
  '7-7': 392,
  '7-8': 393,
  '7-25': 410,
  '7-26': 411,
  '7-27': 412,
  '7-28': 413,
  '7-29': 414,
  '7-30': 415,
  '7-31': 416,
  '7-32': 417,
} as const;

/** A printed page of the mission report listed in PDF_PAGE, such as "4-2". */
type PrintedPage = keyof typeof PDF_PAGE;

/** "page 4-2, PDF page 76" or "pages 4-2 and 4-3, PDF pages 76 and 77". */
function pages(...printed: PrintedPage[]): string {
  const pdf = printed.map((page) => PDF_PAGE[page]);
  return printed.length === 1
    ? `page ${printed[0]}, PDF page ${pdf[0]}`
    : `pages ${printed.join(' and ')}, PDF pages ${pdf.join(' and ')}`;
}

/** A row of Table 4.2-I, the launch phase, quoted as printed. */
function launchEvent(row: string): Citation {
  return {
    source: 'gemini-12-mission-report',
    locator: `Table 4.2-I, "Sequence of Events for Gemini Space Vehicle Launch Phase" (page 4-9, PDF page 85), row "${row}", actual time`,
  };
}

/** A row of Table 4.2-II, the orbital and reentry phases, quoted as printed. */
function sequence(row: string): Citation {
  return {
    source: 'gemini-12-mission-report',
    locator: `Table 4.2-II, "Sequence of Events for Gemini Spacecraft Orbital and Reentry Phases" (page 4-10, PDF page 86), row "${row}", actual time`,
  };
}

/** A row of Table 4.2-III, the Atlas-Agena's launch, quoted as printed. */
function agenaEvent(row: string): Citation {
  return {
    source: 'gemini-12-mission-report',
    locator: `Table 4.2-III, "Sequence of Events for GAATV Launch Phase" (page 4-11, PDF page 87), row "${row}", actual time`,
  };
}

/** A section or table of the mission report. */
function report(section: string, ...printed: PrintedPage[]): Citation {
  return { source: 'gemini-12-mission-report', locator: `${section} (${pages(...printed)})` };
}

const SUMMARY = (...printed: PrintedPage[]): Citation =>
  report('Section 1.0, "Mission Summary"', ...printed);
const ACTUAL_MISSION = (...printed: PrintedPage[]): Citation =>
  report('Section 4.1, "Actual Mission"', ...printed);
const ORBIT = (...printed: PrintedPage[]): Citation =>
  report('Section 4.3.1.2, "Orbit"', ...printed);
const CREW_EVA = (...printed: PrintedPage[]): Citation =>
  report('Section 7.1.1.4, "Extravehicular activity"', ...printed);

/** A row of the recovery timeline in section 6.3.2 of the mission report. */
function recovery(time: string, row: string): Citation {
  return {
    source: 'gemini-12-mission-report',
    locator: `Section 6.3.2, "Location and Retrieval" (pages 6-27 and 6-28, PDF pages 364 and 365), recovery events table, row ${time}: "${row}"`,
  };
}

/** An entry of Project Gemini: A Chronology, Part III (B), 1966. */
function chronology(entry: string): Citation {
  return { source: 'gemini-chronology', locator: `Part III (B), ${entry}`, url: CHRONOLOGY_1966 };
}

/** NASA's Gemini XII mission page. */
function nasaMission(section: string): Citation {
  return { source: 'nasa-gemini-12-mission-page', locator: section };
}

/** NASA's article "55 Years Ago: Gemini XII Closes Out a Successful Program, Paves the Way for Apollo". */
function fiftyFive(section: string): Citation {
  return { source: 'nasa-gemini-12-55-years', locator: section };
}

/** The Smithsonian's page for the Gemini XII capsule. */
function nasm(section: string): Citation {
  return { source: 'nasm-gemini-12-capsule', locator: section };
}

/** On the Shoulders of Titans (PDF page = printed page + 21). */
function titans(chapter: string, page: number, quote: string): Citation {
  return {
    source: 'on-the-shoulders-of-titans',
    locator: `Chapter ${chapter}, page ${page} (PDF page ${page + 21}): ${quote}`,
  };
}
const CURTAIN = 'XV, "The Final Curtain"';

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-12/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-12/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: 'NASA',
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: 'gemini-12',
  program: 'gemini',
  name: 'Gemini 12',
  kind: 'flight',
  destination: 'earth-orbit',

  summary: {
    text: {
      short:
        'Gemini 12 was the last flight of the Gemini program, in November 1966. Jim Lovell and Buzz Aldrin docked with a target rocket, and Aldrin showed that an astronaut could work outside a spacecraft without wearing himself out.',
      more: "Gemini 12 lifted off from Cape Kennedy, Florida, on November 11, 1966, about 1 hour 38 minutes after its target, an uncrewed Agena rocket. When the radar failed during the chase, Aldrin worked out the last steps with a sextant and charts, and the crew docked with the Agena on their third trip around Earth. On earlier flights, spacewalkers had worn themselves out. With handholds, foot restraints, frequent rests, and practice underwater, Aldrin spent about 5 hours 30 minutes outside over three periods and finished every task. The spacecraft's computer steered the reentry, and Gemini 12 splashed down in the Atlantic Ocean on November 15, 94 hours 34 minutes 30 seconds after liftoff.",
    },
    citations: [
      SUMMARY('1-1', '1-2'),
      SUMMARY('1-3', '1-4'),
      sequence('Landing'),
      chronology('November 11, 1966: the Gemini XII mission entry'),
      nasaMission(
        'Mission Overview: "About a dozen two-minute rest periods were scheduled during the EVA to prevent Aldrin from becoming overtaxed as happened to previous spacewalkers"',
      ),
      nasm(
        'Object description: "3 extra-vehicular activities (EVAs) by Aldrin, 5 hours 30 minutes total"',
      ),
      fiftyFive(
        'Paragraph on neutral buoyancy training: Aldrin "became the first astronaut to use neutral buoyancy to train for his Gemini XII spacewalks"',
      ),
    ],
    discrepancy:
      "NASA's 55-years article gives Aldrin's total time outside as 5 hours 48 minutes. We follow the mission report's times for the three periods (2 hours 29 minutes, about 2 hours 6 minutes, and 55 minutes; the sum is ours), which the Smithsonian's 5 hours 30 minutes matches.",
  },

  crew: {
    value: [
      { name: 'James A. Lovell, Jr.', role: 'Command pilot' },
      { name: 'Edwin E. Aldrin, Jr.', role: 'Pilot' },
    ],
    citations: [
      SUMMARY('1-1'),
      nasaMission(
        'Mission Facts: "Crew: James A. Lovell Jr. (Command Pilot) and Edwin E. “Buzz” Aldrin Jr. (Pilot)"',
      ),
      chronology(
        'November 11, 1966: "command pilot Astronaut James A. Lovell, Jr., and pilot Astronaut Edwin E. Aldrin, Jr."',
      ),
    ],
  },
  crewPhoto: nasaPhoto(
    's66-46952',
    949,
    1200,
    "Edwin E. Aldrin, Jr., left, and James A. Lovell, Jr., right, stand in light blue flight suits in the open hatches of a Gemini spacecraft, each holding a camera, with the spacecraft's dark nose pointing toward the viewer.",
  ),

  launch: {
    value: {
      utc: '1966-11-11T20:46:33.419Z',
      site: 'Launch Complex 19, Cape Kennedy, Florida',
      vehicle: 'Titan II Gemini Launch Vehicle (GLV-12)',
    },
    citations: [
      launchEvent('Lift-off (pad disconnect separation) (20:46:33.419 G.m.t.)'),
      SUMMARY('1-1'),
      report(
        'Section 5.2, "Gemini Launch Vehicle Performance": "The Gemini XII Launch Vehicle (GLV-12) was launched on time"',
        '5-102',
      ),
      nasaMission(
        'Mission Facts: "Launch Date: Nov. 11, 1966, 3:46:33 p.m. EST (20:46:33 UT)", Launch Site, and Launch Vehicle',
      ),
    ],
  },

  duration: {
    value: '094:34:30',
    citations: [sequence('Landing'), SUMMARY('1-1')],
    discrepancy:
      "NASA's Gemini XII page gives 94 hours 34 minutes 31 seconds. We follow the mission report's Table 4.2-II.",
  },

  accomplishments: [
    {
      text: {
        short:
          'Aldrin showed that an astronaut could do useful work outside a spacecraft without wearing himself out, a skill astronauts had to master before going to the Moon.',
        more: 'Spacewalkers on Gemini IX, X, and XI had run into serious trouble. For Gemini 12, the tasks were kept simple, handholds, foot restraints, and waist tethers were added, and rests were scheduled often. Aldrin had also practiced in a swimming pool, where floating in a spacesuit is a lot like weightlessness, and Gemini 12 was the first flight whose whole spacewalk plan had been rehearsed that way. In three periods outside, about 5 hours 30 minutes in all, he finished every task without getting too tired or too hot.',
      },
      citations: [
        fiftyFive(
          'Paragraph on spacewalk training: "In preparation for lunar missions, astronauts needed to master working outside their spacecraft" and "astronauts during the Gemini IX, X, and XI missions experienced significant difficulties during their spacewalks", and Aldrin\'s neutral buoyancy training in the McDonogh School\'s pool',
        ),
        report(
          'Section 7.1.2.8.1, "Objectives and general plans": the plan "was simplified to eliminate end-to-end complexity and time-critical tasks" and "Frequent rest periods were scheduled throughout the EVA"',
          '7-28',
        ),
        report(
          'Section 7.1.1.8, "Mission training and training evaluation": "This was the first mission for which the complete EVA timeline was accomplished in a simulated zero-g field."',
          '7-8',
        ),
        CREW_EVA('7-4'),
        nasm(
          'Object description: "5 hours 30 minutes total", "Aldrin made extensive use of handholds and footholds", and "his techniques were an important milestone toward effective astronaut use of EVA"',
        ),
      ],
      discrepancy:
        "NASA's 55-years article gives the total time outside as 5 hours 48 minutes; we follow the mission report's times, which the Smithsonian's total matches.",
    },
    {
      text: {
        short:
          'Gemini 12 closed out the Gemini program. Its ten crewed flights had shown that astronauts could stay in space for up to 14 days, longer than a trip to the Moon and back takes, meet and dock with another spacecraft, and work outside: skills Apollo needed.',
        more: 'That was what Project Gemini was for: proving the techniques the Apollo program needed to land astronauts on the Moon and bring them home before the end of the 1960s. NASA\'s history of the program says Gemini "had dispelled most doubts about man\'s ability to withstand weightlessness, to operate in free space outside his spacecraft, and to seek and find another vehicle in orbital flight." The first Moon landing came less than three years later, and Aldrin was one of the two astronauts who landed.',
      },
      citations: [
        fiftyFive(
          'Opening paragraph: Gemini\'s objectives "included proving the techniques required for the Apollo Program", among them "rendezvous and docking, spacewalking, and ensuring that spacecraft and astronauts could function for at least eight days, the minimum time for a round-trip lunar mission"; and, in the same paragraph, "The nine previous Gemini missions in 1965 and 1966 demonstrated the spacecraft\'s space worthiness, the basic feasibility of spacewalking, extended flight durations to 14 days, and demonstrated space rendezvous and docking techniques."',
        ),
        fiftyFive(
          'Closing paragraph: "Ten crewed missions were flown in 20 months" and "all the major program objectives were accomplished, paving the way for the Apollo program and the first Moon landing less than three years later"',
        ),
        titans(
          'XV, "The Final Curtain"',
          382,
          'Gemini "had dispelled most doubts about man\'s ability to withstand weightlessness, to operate in free space outside his spacecraft, and to seek and find another vehicle in orbital flight"',
        ),
        nasaMission(
          'Crew, Edwin E. “Buzz” Aldrin Jr.: "his historic landing on the Moon with Neil Armstrong on July 20, 1969"',
        ),
      ],
    },
    {
      text: {
        short:
          'When the radar failed, the crew finished the rendezvous with a sextant, paper charts, and their own math, and showed that the backup method worked.',
        more: 'The rendezvous was planned to imitate parts of the climb an Apollo lunar module would make from the Moon to meet its mother ship. Aldrin, nicknamed "Dr. Rendezvous," had helped plan the backup chart procedures. NASA\'s history of Gemini says the radar failure "underscored the fact that backup techniques, using onboard charts and computations, really worked."',
      },
      citations: [
        report(
          'Section 7.1.1.1, "Prelaunch through rendezvous": "The nominal Gemini XII rendezvous plan was designed to simulate certain phases of Lunar Module (LM) lunar ascent"',
          '7-1',
        ),
        SUMMARY('1-2'),
        titans(
          CURTAIN,
          375,
          'Aldrin was "a member of the team that had planned and worked out chart procedures" and "was sometimes called "Dr. Rendezvous""',
        ),
        titans(
          CURTAIN,
          381,
          '"The failure of the radar during the terminal phase of rendezvous, for example, had underscored the fact that backup techniques, using onboard charts and computations, really worked."',
        ),
      ],
    },
    {
      text: {
        short:
          "The spacecraft's computer steered the reentry on its own and brought Gemini 12 down 2.6 nautical miles (about 3 miles) from its target.",
        more: "Demonstrating an automatic reentry was one of the flight's goals. Lovell switched off his hand controller but kept following every steering command, ready to take over at once if something went wrong.",
      },
      citations: [
        report(
          'Section 2.0, "Introduction", secondary objective (d), "To demonstrate automatic reentry"',
          '2-1',
        ),
        SUMMARY('1-4'),
        report(
          'Section 4.3.1.3, "Reentry": "The final landing point was 2.6 nautical miles from the planned landing point."',
          '4-18',
        ),
      ],
    },
  ],

  chapters: [
    { id: 'launch', title: 'Launch' },
    { id: 'agena', title: 'Meeting the Agena' },
    { id: 'outside', title: 'Working outside' },
    { id: 'home', title: 'Coming home' },
  ],

  events: [
    /* ----------------------------- Launch ---------------------------- */
    {
      id: 'agena-launch',
      title: 'The target launches',
      chapter: 'launch',
      elapsed: '-001:38:34.731',
      utc: '1966-11-11T19:07:58.688Z',
      text: {
        short:
          'An Atlas rocket launches the Agena, an uncrewed target rocket, from Cape Kennedy. Gemini 12 will chase it and dock with it.',
        more: "The Atlas-Agena lifted off from Launch Complex 14 at 2:07:59 p.m. Eastern Standard Time on November 11, 1966. The Agena reached a nearly circular orbit 156.4 to 162.7 nautical miles (about 180 to 187 miles, or 290 to 301 kilometers) up. But while it was climbing, its main engine briefly lost some of its push, so flight controllers later decided not to fire that engine again during the crew's flight.",
      },
      citations: [
        agenaEvent('Lift-off (19:07:58.688 G.m.t.)'),
        SUMMARY('1-1'),
        report(
          'Section 4.3.2.1, "Launch": "The GATV achieved a nearly circular orbit with a perigee of 156.4 nautical miles and an apogee of 162.7 nautical miles."',
          '4-18',
        ),
        ACTUAL_MISSION('4-1'),
        titans(
          CURTAIN,
          376,
          '"Eight minutes after the Agena was launched, its main engine suffered a momentary six percent decay in thrust chamber pressure" and the decision that "it should not" be fired',
        ),
        chronology('November 11, 1966: the Agena "was launched from complex 14"'),
      ],
      discrepancy:
        "The mission report's summary (section 1.0) gives the Agena's orbit as 163.6 by 159.0 nautical miles, and section 4.1 as 163 by 156. We follow section 4.3.2.1, 162.7 by 156.4. The Gemini chronology and NASA's Gemini XII page round the launch time to 2:08 p.m. EST.",
      view: 'earth',
    },
    {
      id: 'liftoff',
      handsOn: 'orbit',
      title: 'Liftoff',
      chapter: 'launch',
      elapsed: '000:00:00',
      utc: '1966-11-11T20:46:33.419Z',
      text: {
        short:
          'A Titan II rocket lifts Gemini 12 off the pad with Jim Lovell and Buzz Aldrin aboard. It is the tenth and last crewed Gemini flight.',
        more: "Liftoff came at 3:46:33 p.m. Eastern Standard Time, 1 hour 38 minutes 34.731 seconds after the Agena, right at the start of a launch window only 30 seconds long. Trouble with a backup autopilot in the rocket had put off the launch twice, from November 9. It was Lovell's second spaceflight and Aldrin's first. By 7 minutes 19.8 seconds after liftoff, after a short firing of its thrusters, Gemini 12 was in an orbit 86.8 to 146.1 nautical miles (about 100 to 168 miles, or 161 to 271 kilometers) up, about 500 nautical miles from the Agena.",
      },
      citations: [
        launchEvent('Lift-off (pad disconnect separation) (20:46:33.419 G.m.t.)'),
        SUMMARY('1-1'),
        ACTUAL_MISSION('4-1'),
        chronology(
          'November 8, 1966: the launch "was postponed by a malfunctioning power supply in the launch vehicle secondary autopilot", rescheduled for November 10 and then November 11',
        ),
        nasaMission(
          'Mission Facts: "Launch Date: Nov. 11, 1966, 3:46:33 p.m. EST (20:46:33 UT)"; crew biographies: Lovell flew Gemini VII before Gemini XII, and Aldrin "first launched to space for the Gemini XII mission"',
        ),
        report(
          'Table 4.3-I, "Planned and Actual Gemini Space Vehicle and Spacecraft Trajectory Parameters", spacecraft insertion, "Time from lift-off, sec" (439.8), actual final column',
          '4-21',
        ),
        report(
          'Table 4.3-II, "Spacecraft Orbital Elements Before and After Maneuvers", phase adjust, before maneuver, apogee 146.1 and perigee 86.8, actual column',
          '4-22',
        ),
        ORBIT('4-15'),
      ],
      discrepancy: 'The Gemini chronology rounds the launch time to 3:47 p.m. EST.',
      view: 'earth',
      keyMoment: true,
    },

    /* ------------------------- Meeting the Agena ----------------------- */
    {
      id: 'by-hand',
      title: 'When the radar fails',
      chapter: 'agena',
      elapsed: '003:05:47',
      text: {
        short:
          'As Gemini 12 closes in on the Agena, its radar stops working properly. Aldrin works out the last steps with a sextant, an instrument for measuring angles, and paper charts.',
        more: "After the coelliptic maneuver at 2 hours 22 minutes 55 seconds, which put Gemini 12 in an orbit about 10 nautical miles below the Agena's, the radar's readings became erratic. Aldrin, who had written his doctoral thesis on orbital rendezvous, measured the angle up to the Agena with the sextant, checked it against his charts, and worked out the firings. At 3 hours 5 minutes 47 seconds, with the Agena about 22.1 nautical miles (25 miles, or 41 kilometers) away, the crew fired the thrusters to begin the final approach. After four small corrections and about 13 minutes of braking, Gemini 12 was less than 50 feet (15 meters) from the Agena at 3 hours 46 minutes.",
      },
      citations: [
        sequence('Terminal phase initiate maneuver'),
        sequence('Coelliptic maneuver'),
        ACTUAL_MISSION('4-1'),
        ORBIT('4-15', '4-16'),
        ORBIT('4-17'),
        report(
          'Section 7.1.2.4, "Rendezvous platform alignment": "radar lock with the GATV was lost" and "The crew proceeded with the rest of the rendezvous using preplanned procedures for use in the case of a failed radar"',
          '7-25',
        ),
        titans(
          CURTAIN,
          375,
          '"Aldrin used the sextant to measure the angle between the local horizontal of the spacecraft and that of the Agena" and "checked this information with his rendezvous chart"',
        ),
        fiftyFive(
          'Paragraph on the rendezvous: Aldrin "wrote his doctoral dissertation on the subject of orbital rendezvous"',
        ),
      ],
      discrepancy:
        'Section 4.1 of the mission report and On the Shoulders of Titans put the start of station keeping at 3 hours 45 minutes. We follow section 4.3.1.2 and the mission summary, 3 hours 46 minutes.',
      photo: nasaPhoto(
        'S66-62755',
        1600,
        1600,
        "The end of the chase: the long silver Agena, seen from Gemini 12 about 50 feet away before docking, with an American flag on its side and its dark docking collar at left, floats above Earth's blue oceans and white clouds. A thin rod from Gemini 12 rises at the bottom of the picture.",
      ),
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'docking',
      handsOn: 'docking',
      title: 'Docked',
      chapter: 'agena',
      elapsed: '004:13:52',
      text: {
        short:
          "Lovell eases Gemini 12's nose into the Agena's docking collar, and latches lock the two together. Then the crew practices undocking and docking again.",
        more: 'Over the tracking ship Coastal Sentry Quebec, Lovell docked at 4 hours 13 minutes 52 seconds and radioed, "We are docked." The crew then undocked and flew around the Agena. On a docking try in the dark, the latches caught without locking, and Lovell had to rock the spacecraft back and forth with its thrusters to break free. They docked again at 5 hours 7 minutes 14 seconds and once more at about 6 hours 5 minutes, and stayed docked until the third day.',
      },
      citations: [
        ACTUAL_MISSION('4-1'),
        report('Section 7.1.2.6, "GATV operations"', '7-26'),
        report('Section 7.1.1.2, "Docking"', '7-2'),
        titans(
          CURTAIN,
          375,
          'Lovell "called the Coastal Sentry Quebec at 4:13 hours elapsed time, saying, "We are docked.""',
        ),
        titans(
          CURTAIN,
          376,
          'the night docking practice: "Lovell fired the aft and forward thrusters, trying to rock the spacecraft free"',
        ),
        SUMMARY('1-2'),
      ],
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'eclipse',
      title: 'Chasing an eclipse',
      chapter: 'agena',
      elapsed: '016:01:44',
      text: {
        short:
          "The crew fires the Agena's small engines to change their orbit, so Gemini 12 flies through the Moon's shadow during a total eclipse of the Sun.",
        more: "Because of the trouble with the Agena's main engine, flight controllers canceled the planned firing that would have lifted the docked pair to a much higher orbit, and used the time for the eclipse of November 12, 1966 instead. The crew fired the Agena's smaller engines at 7 hours 5 minutes 6 seconds to slow down, and again at 15 hours 16 minutes 18 seconds to fine-tune their path. At 16 hours 1 minute 44 seconds they passed through totality, when the Moon hides the whole Sun, over South America. They took pictures, though the Agena in front of them got in the way.",
      },
      citations: [
        SUMMARY('1-2'),
        sequence('Eclipse phasing maneuver no. 1 (GATV SPS) (docked)'),
        sequence('Eclipse phasing maneuver no. 2 (GATV SPS) (docked)'),
        ORBIT('4-17'),
        report(
          'Section 7.1.2.7, "Eclipse": "Totality was observed at 16:01:44 g.e.t." and "the docked GATV complicated the photography"',
          '7-27',
        ),
        titans(
          CURTAIN,
          377,
          'the crew saw the eclipse "right on the money at 16:01:44 g.e.t."; its path "cut a swath across South America"',
        ),
        nasaMission(
          'Mission Overview: phasing maneuvers "to allow the spacecraft to rendezvous with the Nov. 12 total eclipse over South America"',
        ),
      ],
      view: 'earth',
    },

    /* -------------------------- Working outside ------------------------ */
    {
      id: 'standup-eva',
      title: 'Standing in the open hatch',
      chapter: 'outside',
      elapsed: '019:29:00',
      text: {
        short:
          "Aldrin opens his hatch and stands up on his seat, with the top half of his body out in space. He takes pictures of stars and gets ready for the next day's work.",
        more: "As the hatch opened, Aldrin exclaimed, \"Man! Look at that!\" He stayed out for 2 hours 29 minutes, working slowly and resting often, so he could compare this with the next day's spacewalk. He photographed stars in ultraviolet light, most of which Earth's air blocks, fixed a handrail from the hatch to the Agena's docking collar, and brought in a collector for tiny specks of space dust from the outside of the spacecraft. He also aimed a camera at himself, taking what NASA calls the first selfies ever made on a spacewalk.",
      },
      citations: [
        SUMMARY('1-2'),
        ACTUAL_MISSION('4-2'),
        CREW_EVA('7-2', '7-3'),
        report('Section 7.1.2.8.2, "Sequence of events"', '7-28'),
        titans(
          CURTAIN,
          377,
          '"Aldrin exclaimed, in near speechless awe, "Man! Look at that!"" and "Aldrin went about his chores slowly and deliberately, working for a short period and then resting"',
        ),
        fiftyFive(
          'Paragraph on the October 31, 1966 press conference: ultraviolet, "a spectrum of light that is 80% filtered out by Earth\'s atmosphere"; paragraph on the first standup spacewalk: the handrail and "obtained the first selfies ever taken during a spacewalk"',
        ),
        nasaMission(
          'Milestones: "Nov. 12, 1966: Aldrin performs a standup EVA lasting 2 hours and 29 minutes."',
        ),
      ],
      discrepancy:
        "Section 7.1.1.4 of the mission report says the crew began repressurizing the cabin at 22 hours 2 minutes. On the Shoulders of Titans calls this a 2-hour-20-minute exercise, and NASA's 55-years article says Aldrin was outside for 2 hours 28 minutes. We follow sections 1.0 and 4.1 of the mission report: hatch opened at 19 hours 29 minutes, 2 hours 29 minutes outside.",
      photo: nasaPhoto(
        'S66-62926',
        1600,
        1590,
        "Buzz Aldrin's face looks out from inside his spacesuit helmet, filling the right side of the picture. Behind him is the blue curve of Earth with white clouds, and in the lower left corner is a camera covered with printed labels.",
      ),
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'umbilical-eva',
      title: 'Working outside',
      chapter: 'outside',
      elapsed: '042:48:26',
      text: {
        short:
          'Aldrin climbs all the way out, tied to the spacecraft by a hose that brings him oxygen. He works on the Agena and at the back of Gemini 12, resting often, and never gets worn out.',
        more: 'Moving hand over hand along his handrail, Aldrin reached the Agena and hooked a 100-foot (30-meter) tether from it to Gemini 12. At the back of the spacecraft he slid his boots into foot restraints that let him relax completely, and at a panel there he tightened bolts, cut cables, and joined and pulled apart connectors. Short waist tethers held him at a second work station on the Agena. Earlier spacewalkers had worn themselves out; Aldrin, who had practiced underwater, finished every task without getting too tired or too hot. The hatch closed at 44 hours 55 minutes, about 2 hours 6 minutes after it opened.',
      },
      citations: [
        ACTUAL_MISSION('4-2'),
        SUMMARY('1-3'),
        CREW_EVA('7-3', '7-4'),
        report(
          'Section 7.1.2.8.2, "Sequence of events": "Resting in the foot restraints enabled complete body relaxation.", the electrical and fluid connectors, and the two waist tethers at the TDA work station',
          '7-29',
          '7-30',
        ),
        titans(
          CURTAIN,
          378,
          'Aldrin "moved, hand over hand, along the rail to the nose of the Agena docking adapter", the "golden slippers", and the "busy box"',
        ),
        fiftyFive(
          'Paragraph on the umbilical spacewalk: the 100-foot tether, the foot restraints, and the Agena work station',
        ),
        nasaMission(
          'Mission Overview: "About a dozen two-minute rest periods were scheduled during the EVA to prevent Aldrin from becoming overtaxed as happened to previous spacewalkers" and "total EVA time was 2 hours and 6 minutes"',
        ),
        fiftyFive('Paragraph on neutral buoyancy training at the McDonogh School pool'),
      ],
      discrepancy:
        'NASA\'s 55-years article says this spacewalk lasted 2 hours 9 minutes. We follow the mission report: hatch opened at 42:48:26 (section 4.1) and closed at 44 hours 55 minutes (sections 1.0, 4.1, and 7.1.1.4), which NASA\'s Gemini XII page\'s 2 hours 6 minutes matches. NASA\'s caption for photo S66-62939 dates it November 12 and "the second day of the four-day mission", but also places Aldrin "at the Agena work station", which he reached only on this umbilical spacewalk, on November 13, the third day (section 7.1.1.4); we show it with this spacewalk.',
      photo: nasaPhoto(
        's66-62939',
        1600,
        1048,
        'Buzz Aldrin in a white spacesuit floats outside the spacecraft against black space, a long hose curving from his chest. The blue edge of Earth fills the left side of the picture.',
      ),
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'tether',
      title: 'Tied together',
      chapter: 'outside',
      elapsed: '047:23:00',
      text: {
        short:
          'Gemini 12 undocks and backs away from the Agena, still tied to it by a long line called a tether. The crew tests whether the two can stay lined up without using fuel.',
        more: "Lovell slowly backed away, with Gemini 12 above the heavier Agena. The tether mostly stayed slack, and with several of Gemini 12's thrusters failing, the spacecraft was hard to steady. In time the two craft settled into a slow swing, one above the other, holding their places without thruster fuel. The crew let the tether go at 51 hours 50 minutes 57 seconds and fired the thrusters to move away from the Agena at 52 hours 14 minutes 27 seconds. On the fourth day Aldrin stood up in the open hatch once more, for 55 minutes, to take more star pictures and throw out equipment they no longer needed.",
      },
      citations: [
        SUMMARY('1-3'),
        ACTUAL_MISSION('4-3'),
        report('Section 7.1.2.9, "Tether evaluation"', '7-30', '7-31'),
        sequence('Separation maneuver'),
        fiftyFive(
          'Paragraph on the tether: "With the heavier Agena orbiting below the lighter Gemini, Lovell turned off the control systems of both vehicles and they maintained their attitude in the gravity gradient mode without the use of thruster fuel"',
        ),
        titans(
          CURTAIN,
          379,
          '"Lovell backed Gemini XII carefully away from the Agena" and the tether "remained slack"',
        ),
        report(
          'Section 7.1.2.8.2, "Sequence of events": the second standup EVA, with ultraviolet photographs and the jettison of the ELSS, the umbilical, and other EVA gear',
          '7-30',
        ),
        nasaMission('Milestones: "Nov. 14, 1966: Standup EVA lasting 55 minutes."'),
      ],
      discrepancy:
        "For the last standup period, section 7.1.1.4 of the mission report gives the hatch opening as 66 hours 8 minutes, section 4.1 (page 4-3, PDF page 77) gives cabin depressurization at 66:05:55 and repressurization at 67:03:03, and NASA's 55-years article says it lasted 1 hour 11 minutes. We follow section 1.0: hatch opened at 66 hours 6 minutes and closed at 67 hours 1 minute.",
      view: 'spacecraft',
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: 'retrofire',
      title: 'Retrofire',
      chapter: 'home',
      elapsed: '093:59:58',
      utc: '1966-11-15T18:46:31Z',
      text: {
        short:
          "Four small rockets fire to slow Gemini 12 so it drops out of orbit. This time the spacecraft's computer does the steering on the way down.",
        more: "Retrofire, the engine firing that starts the trip home, began automatically at exactly the planned time, 93 hours 59 minutes 58 seconds, over the tracking station on Canton Island in the Pacific Ocean, at the end of Gemini 12's 59th trip around Earth. Once guidance began, the computer steered, and Lovell followed every command with his hand controller switched off, ready to take over. At the hardest braking, about 6 g (six times normal weight), a pouch tore loose and landed between his legs, near the ring that would fire the ejection seats. He squeezed his knees together rather than grab for it.",
      },
      citations: [
        sequence('Retrofire initiation'),
        ACTUAL_MISSION('4-5'),
        SUMMARY('1-4'),
        report('Section 7.1.1.6, "Retrofire and reentry"', '7-7'),
        report(
          'Section 7.1.2.10, "Reentry": "The maximum acceleration reached during the reentry was approximately 6g" and the pouch that "slammed into the seat between the command pilot\'s legs"',
          '7-32',
        ),
        titans(
          CURTAIN,
          381,
          '"During the 59th revolution, Gemini XII began its controlled automatic reentry"; Lovell "squeezed his knees together and hoped that the pouch would not go any farther"',
        ),
        nasaMission(
          'Mission Overview: "retrofire at the end of revolution 59 on Nov. 15 at 1:46:31 p.m. EST" (UTC is our conversion)',
        ),
        {
          source: 'nssdca-master-catalog',
          locator:
            '"Gemini 12" (1966-104A), Reentry: "The retrorockets consisted of four spherical-case polysulfide ammonium perchlorate solid-propellant motors"',
          url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-104A',
        },
      ],
      discrepancy:
        "On the Shoulders of Titans says the pouch landed on Lovell's lap; the mission report's pilots' report says it slammed into the seat between his legs. We follow the mission report.",
      view: 'spacecraft',
    },
    {
      id: 'splashdown',
      title: 'Splashdown',
      chapter: 'home',
      elapsed: '094:34:30',
      utc: '1966-11-15T19:21:05Z',
      text: {
        short:
          'Gemini 12 splashes down in the Atlantic Ocean, close to the aircraft carrier USS Wasp. The Gemini program is over, and Apollo is next.',
        more: 'The spacecraft hit the water harder than expected, 2.6 nautical miles (4.8 kilometers) from the planned point and about 3 nautical miles from the Wasp, and some water got inside. Lovell and Aldrin climbed out into a raft, and a helicopter carried them to the carrier, where they were on deck 28 minutes after landing. The ship lifted Gemini 12 aboard 1 hour 7 minutes after it landed.',
      },
      citations: [
        sequence('Landing'),
        SUMMARY('1-1', '1-4'),
        ACTUAL_MISSION('4-5'),
        recovery('19:21 G.m.t. / 94:34 g.e.t.', 'Spacecraft landing'),
        recovery(
          '19:49 G.m.t. / 95:02 g.e.t.',
          'Rescue helicopter with flight crew aboard U.S.S. Wasp',
        ),
        recovery('20:28 G.m.t. / 95:41 g.e.t.', 'Spacecraft aboard U.S.S. Wasp, secured in dolly'),
        report(
          'Section 6.3.2, "Location and Retrieval": "Spacecraft landing occurred at 19:21:05 G.m.t. on November 15, 1966"',
          '6-27',
        ),
        report(
          'Section 7.1.2.10, "Reentry": "The landing impact was quite severe, causing water to enter the spacecraft."',
          '7-32',
        ),
        chronology('November 11, 1966: "The spacecraft was recovered 67 minutes after landing."'),
        titans(
          CURTAIN,
          381,
          '"A helicopter deposited the triumphant astronauts on the deck of the prime recovery vessel 28 minutes after touchdown"',
        ),
      ],
      discrepancy:
        "Section 6.3.2 of the mission report puts the landing 3.8 nautical miles from the target point; we follow sections 1.0, 4.1, and 4.3.1.3, 2.6 nautical miles from the planned landing point, which On the Shoulders of Titans and NASA's Gemini XII page (4.8 kilometers) match. NASA's Gemini XII page gives the landing as 19:21:04 UT; we follow section 6.3.2, 19:21:05 G.m.t.",
      photo: nasaPhoto(
        's66-59936',
        1057,
        1600,
        'Black-and-white view from above of rough gray ocean. Gemini 12, a small dark shape, sits in a long patch of white foam at right, still tied by its lines to its big striped main parachute, which is filled with air above the water at left.',
      ),
      view: 'earth',
      keyMoment: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Gemini XII spacecraft',
        museum: 'Adler Planetarium',
        place: 'Chicago, Illinois',
      },
      citations: [
        {
          source: 'adler-gemini-12-mission-moon',
          locator: 'Mission Moon: "Featuring the actual Gemini 12 spacecraft"',
        },
        fiftyFive(
          'Last paragraph: "The Gemini XII spacecraft is on display at the Adler Planetarium in Chicago."',
        ),
        nasm(
          '"NASA transferred the Gemini XII spacecraft to the Smithsonian in 1968." Display Status: "not on display at the National Air and Space Museum. It is either on loan or in storage."',
        ),
      ],
    },
  ],
};
