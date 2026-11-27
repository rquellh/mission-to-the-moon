/**
 * Apollo 13: the third planned lunar landing, which became a flight around
 * the Moon and home after an oxygen tank failed, April 11-17, 1970.
 *
 * Event times are copied from Apollo by the Numbers (NASA SP-2000-4029),
 * Apollo 13 Timeline, exactly as printed there, and UTC from that table's
 * GMT columns, except where the Apollo 13 Mission Report (MSC-02680), the
 * more primary source, gives a different time: then we follow the Mission
 * Report and the `discrepancy` field gives the other value.
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (19:13:00 GMT, April 11, 1970). Liftoff itself came 0.65 seconds later.
 * A time the source gives only to the minute has 00 seconds here, and the
 * text says "about".
 *
 * Unit conversions in the text (nautical miles to miles and kilometers, feet
 * per second to miles and kilometers per hour) are our arithmetic on the
 * cited values, and so are durations worked out between two cited times.
 *
 * Durations of a minute or more are written in the text as minutes and
 * seconds, with the source's full precision kept: a firing the source
 * times to a hundredth of a second, such as the burn after the Moon, is
 * "4 minutes 23.82 seconds" here. That is our arithmetic.
 *
 * The flight path itself is described in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const ABTN_SUMMARY = `${ABTN}Apollo_13a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_13h_Timeline.htm`;
const ABTN_TRANSLUNAR = `${ABTN}Apollo_13f_Translunar_Phase.htm`;
const ABTN_TRANSEARTH = `${ABTN}Apollo_13g_Transearth_Phase.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-03_Crew_Information_-_Lunar_Landings.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;

const MISSION_REPORT = 'https://ntrs.nasa.gov/api/citations/19710003598/downloads/19710003598.pdf';
const REVIEW_BOARD = 'https://ntrs.nasa.gov/api/citations/20170000913/downloads/20170000913.pdf';
const NMC_CSM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1970-029A';

/** A section of the Apollo by the Numbers Apollo 13 mission summary. */
function summary(section: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 13 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 13 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 13 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the tables in Apollo by the Numbers. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `"${name}" table, ${rows}`,
    url,
  };
}

/** A place in the Apollo 13 Mission Report: section or table, printed page, and PDF page. */
function report(where: string): Citation {
  return { source: 'apollo-13-mission-report', locator: where, url: MISSION_REPORT };
}

/** A place in the Report of Apollo 13 Review Board. */
function board(where: string): Citation {
  return { source: 'apollo-13-review-board', locator: where, url: REVIEW_BOARD };
}

/** The NSSDCA Master Catalog page for the Apollo 13 command and service module. */
function nmc(section: string): Citation {
  return {
    source: 'nssdca-master-catalog',
    locator: `"Apollo 13 Command and Service Module (CSM)" (1970-029A), ${section}`,
    url: NMC_CSM,
  };
}

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-13/. */
function nasaPhoto(
  nasaId: string,
  width: number,
  height: number,
  alt: string,
  credit = 'NASA',
): Photo {
  return {
    src: `media/apollo-13/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit,
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

const SEQUENCE_OF_EVENTS = 'Table 3-I, "Sequence of Events" (printed page 3-2, PDF page 13)';
const MANEUVERS = 'Table 4-III, "Maneuver Summary" (printed page 4-5, PDF page 20)';

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: 'apollo-13',
  program: 'apollo',
  name: 'Apollo 13',
  kind: 'flight',
  destination: 'moon',

  summary: {
    text: {
      short:
        'Apollo 13 was meant to be the third Moon landing. On the way, an oxygen tank burst, so the crew used their lunar module as a lifeboat, swung around the Moon, and came home safely.',
      more: 'Apollo 13 launched on April 11, 1970, to explore the Fra Mauro highlands of the Moon. Nearly 56 hours into the flight, oxygen tank 2 in the service module failed, and the loss of oxygen and electrical power ended the landing. James Lovell, Jack Swigert, and Fred Haise moved into the lunar module Aquarius, fired its descent engine to get onto a path around the Moon and back to Earth, and splashed down in the Pacific Ocean on April 17.',
    },
    citations: [
      summary('Background'),
      summary('Translunar Phase'),
      summary('Recovery'),
      report('Section 1.0, "Summary" (printed pages 1-1 and 1-2, PDF pages 9 and 10)'),
      nmc('Description'),
      nmc('Mission Profile'),
    ],
  },

  crew: {
    value: [
      { name: 'James A. Lovell Jr.', role: 'Commander' },
      { name: 'John L. "Jack" Swigert Jr.', role: 'Command module pilot' },
      { name: 'Fred W. Haise Jr.', role: 'Lunar module pilot' },
    ],
    citations: [
      summary('Background'),
      table(
        'Crew Information - Lunar Landing Missions',
        'Apollo 13 column, Commander, Command Module Pilot, and Lunar Module Pilot rows',
        ABTN_CREW,
      ),
      nmc('Description'),
    ],
  },
  crewPhoto: nasaPhoto(
    'S70-36485',
    960,
    1200,
    'From left, James A. Lovell Jr., John L. "Jack" Swigert Jr., and Fred W. Haise Jr. in dark business suits and ties, gathered around a globe of the Moon in front of a backdrop of glowing red and orange stars.',
  ),

  launch: {
    value: {
      utc: '1970-04-11T19:13:00Z',
      site: 'Launch Complex 39, Pad A, Kennedy Space Center, Florida',
      vehicle: 'Saturn V (SA-508)',
    },
    citations: [
      summary('Ascent Phase'),
      summary('Background'),
      timeline('Range zero.'),
      nmc('Mission Profile'),
    ],
  },

  duration: {
    value: '142:54:41',
    citations: [
      summary('Recovery'),
      table(
        'Entry, Splashdown and Recovery',
        'Apollo 13 column, Earth Splashdown, GET row',
        ABTN_ENTRY,
      ),
      report(SEQUENCE_OF_EVENTS + ', "Landing" row'),
    ],
  },

  callSigns: {
    value: [
      { craft: 'Command module', name: 'Odyssey' },
      { craft: 'Lunar module', name: 'Aquarius' },
    ],
    citations: [
      table('Call Signs', 'Apollo 13 row, Command Module and Lunar Module', ABTN_CALL_SIGNS),
      summary('Background'),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          'The crew came home safely after an accident far from Earth. NASA credited the astronauts, the people working on the ground, and the lunar module.',
        more: 'Apollo by the Numbers calls the accident nearly catastrophic and concludes: "Only outstanding performances by the crew and ground support personnel, and the excellent performance of the LM systems made a safe return possible." It was the first time the abort techniques worked out over the years of human spaceflight had to be used.',
      },
      citations: [
        summary('Conclusions'),
        report(
          'Section 4.0, "Trajectory" (printed page 4-1, PDF page 16): "Apollo 13 presented the first situation in which their use was necessary"',
        ),
      ],
    },
    {
      text: {
        short:
          'The lunar module Aquarius kept three astronauts alive for more than three days. It was built to carry two people for a much shorter time.',
        more: "Aquarius was the crew's lifeboat and control center from about 58 hours 40 minutes into the flight until it was cast off at 141 hours 30 minutes, nearly 83 hours later. Its systems supported the crew for twice their intended design lifetime. Water, battery power, oxygen, and the canisters that clean carbon dioxide from the air all had to be stretched, and at splashdown many hours of each were left.",
      },
      citations: [
        summary('Translunar Phase'),
        summary('Conclusions'),
        timeline('CSM systems powered down. LM systems powered up.'),
        timeline('LM jettisoned.'),
      ],
    },
    {
      text: {
        short:
          'Investigators found the cause: wires inside the oxygen tank had been damaged on the ground before launch. In flight they short-circuited and started a fire inside the tank.',
        more: 'The Apollo 13 Review Board concluded that "an electrically initiated fire in oxygen tank no. 2" caused the accident. During an unusual procedure to empty the tank at Kennedy Space Center, its heater switches welded shut, the heaters overheated, and the insulation on the fan motor wires was badly damaged. Nearly 56 hours into the flight, the wiring short-circuited and set the insulation on fire. The board recommended removing wiring and unsealed motors from contact with the oxygen in the tanks.',
      },
      citations: [
        board('Chapter 5, Part 1, "Introduction" (printed page 5-1, PDF page 167)'),
        board(
          'Chapter 5, Part 1, findings f through m (printed pages 5-2 and 5-3, PDF pages 168 and 169)',
        ),
        board('Chapter 5, Part 4, "Recommendations," item 1 (printed page 5-40, PDF page 206)'),
        summary('How the Problem Occurred'),
      ],
    },
    {
      text: {
        short:
          "Even without a landing, the crew carried out three planned experiments. One was crashing the rocket's third stage into the Moon so instruments could measure the shaking.",
        more: 'The three experiments completed were photographs of Earth, a study of lightning, and the impact of the S-IVB third stage on the Moon, which the seismometer left by Apollo 12 recorded for 3 hours 20 minutes. Apollo 13 was the first flight to aim its spent third stage at the Moon; on earlier flights the stage had been sent past the Moon into orbit around the Sun.',
      },
      citations: [summary('Conclusions'), summary('Translunar Phase')],
    },
  ],

  chapters: [
    { id: 'launch', title: 'Launch' },
    { id: 'outbound', title: 'To the Moon' },
    { id: 'accident', title: 'The accident' },
    { id: 'moon', title: 'Around the Moon' },
    { id: 'return', title: 'Coming home' },
    { id: 'splashdown', title: 'Splashdown' },
  ],

  events: [
    /* ---------------------------- Launch ---------------------------- */
    {
      id: 'liftoff',
      handsOn: 'stages',
      title: 'Liftoff',
      chapter: 'launch',
      elapsed: '000:00:00.65',
      utc: '1970-04-11T19:13:00Z',
      text: {
        short:
          'A Saturn V rocket lifts Apollo 13 off its launch pad in Florida. The three astronauts are on their way to land on the Moon.',
        more: 'Apollo 13 lifted off from Launch Complex 39, Pad A, at Kennedy Space Center at 2:13 p.m. Eastern Standard Time on April 11, 1970. The crew were James A. Lovell Jr., commander; John L. "Jack" Swigert Jr., command module pilot; and Fred W. Haise Jr., lunar module pilot. Swigert, the backup command module pilot, had joined the crew shortly before launch, after Ken Mattingly was exposed to German measles and found to have no immunity. The plan was to land in the hilly Fra Mauro highlands.',
      },
      citations: [
        report(SEQUENCE_OF_EVENTS + ', "Lift-off - 19:13:00.65 G.m.t., April 11, 1970"'),
        timeline('Range zero.'),
        summary('Ascent Phase'),
        summary('Background'),
        nmc('Mission Profile'),
      ],
      discrepancy:
        "Apollo by the Numbers' Apollo 13 Timeline gives liftoff (umbilical disconnected) at 000:00:00.61, 19:13:00 GMT. We follow the Mission Report's 19:13:00.65 GMT.",
      photo: nasaPhoto(
        'S70-34852',
        739,
        1600,
        'The white Saturn V rocket lifts off beside its red launch tower as clouds of smoke billow out across the ground on both sides of the pad.',
      ),
      view: 'earth',
      keyMoment: true,
    },
    {
      id: 'center-engine-out',
      title: 'An engine shuts down early',
      chapter: 'launch',
      elapsed: '000:05:30.64',
      utc: '1970-04-11T19:18:30Z',
      text: {
        short:
          "During the climb, one of the five engines on the rocket's second stage shuts down more than two minutes early. The other engines burn longer to make up for it.",
        more: "The second stage's center engine shut down 2 minutes 12.36 seconds early because of strong shaking (oscillations) in the engine's structure and propellant system. The other four engines shut down 34.53 seconds later than planned, and the third stage burned 9 seconds longer. Apollo 13 still reached its planned orbit around Earth, 100.3 by 99.3 nautical miles (about 115 by 114 miles) high, 12 minutes 39.83 seconds after launch.",
      },
      citations: [
        timeline(
          'S-II center (or "inboard") engine cutoff (S-II engine #5 cutoff 132.36 seconds early).',
        ),
        timeline('S-II outboard engine cutoff (34.53 seconds later than planned).'),
        timeline('S-IVB 1st burn cutoff (9 seconds later than planned).'),
        timeline('Earth orbit insertion.'),
        summary('Ascent Phase'),
        report(
          'Section 5.1, "Structural and Mechanical Systems" (printed page 5-1, PDF page 22): "longitudinal oscillations in the S-II engine structure and propellant system caused early shutdown of the center engine"',
        ),
      ],
      discrepancy:
        "The Mission Report (section 4.0, printed page 4-1) gives the parking orbit as 100.2 by 98.0 miles, measured above its oblate Earth model (Table 4-I). We follow Apollo by the Numbers, whose 100.3 by 99.3 nautical miles are measured above Earth's equatorial radius, as the flight path's orbit sizes are.",
      view: 'earth',
    },
    {
      id: 'translunar-injection',
      title: 'Burn toward the Moon',
      chapter: 'launch',
      elapsed: '002:35:46.4',
      utc: '1970-04-11T21:48:46Z',
      text: {
        short:
          'The third stage fires its engine again for almost 6 minutes. This big push sends Apollo 13 out of Earth orbit toward the Moon.',
        more: 'The firing, called translunar injection, began after one and a half trips around Earth and lasted 5 minutes 50.85 seconds. Ten seconds after it ended, Apollo 13 was moving at 35,538.4 feet per second, about 24,230 miles per hour (39,000 kilometers per hour). It was on a free-return path: one that would loop around the Moon and back to Earth without another big engine firing.',
      },
      citations: [
        report(
          'Table 4-II, "Trajectory Parameters" (printed page 4-3, PDF page 18), "S-IVB second ignition" row',
        ),
        timeline('S-IVB 2nd burn ignition.'),
        timeline('S-IVB 2nd burn cutoff.'),
        timeline('Translunar injection.'),
        summary('Ascent Phase'),
        summary('Translunar Phase'),
      ],
      discrepancy:
        "Apollo by the Numbers' Apollo 13 Timeline gives ignition at 002:35:46.30 (21:48:46 GMT). We follow the Mission Report's 2:35:46.4.",
      view: 'journey',
    },

    /* --------------------------- To the Moon -------------------------- */
    {
      id: 'transposition-docking',
      title: 'Odyssey docks with Aquarius',
      chapter: 'outbound',
      elapsed: '003:19:08.8',
      utc: '1970-04-11T22:32:08Z',
      text: {
        short:
          "The command module Odyssey separates from the rocket, turns around, and docks with the lunar module Aquarius. Later in the flight, Aquarius will become the crew's lifeboat.",
        more: 'Odyssey separated from the S-IVB stage 3 hours 6 minutes after launch, turned around, and docked with Aquarius, still riding on the S-IVB, at 3 hours 19 minutes. The docked spacecraft were pulled free of the stage at 4 hours 1 minute, while television showed the docking to viewers on Earth. Odyssey was named for the long voyage of Odysseus in Greek mythology, and Aquarius for the water carrier.',
      },
      citations: [
        timeline('CSM docked with LM/S-IVB.'),
        timeline('CSM separated from S-IVB.'),
        timeline('CSM/LM ejected from S-IVB.'),
        summary('Translunar Phase'),
        table('Call Signs', 'Apollo 13 row', ABTN_CALL_SIGNS),
      ],
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'hybrid-midcourse',
      title: 'Leaving the free-return path',
      chapter: 'outbound',
      elapsed: '030:40:49.65',
      utc: '1970-04-13T01:53:49Z',
      text: {
        short:
          "A short firing of the service module's main engine aims Apollo 13 closer to the Moon, as planned. After it, the spacecraft is no longer on a path that would bring it home by itself.",
        more: "This midcourse correction, a 3.49-second firing of the service module's main engine, changed the speed by 23.2 feet per second. It lowered the closest approach to the Moon to the planned orbit height of 60 nautical miles (about 69 miles) and, on purpose, took Apollo 13 off the free-return path, as Apollo 12 had done. Television showed the preparations and the burn.",
      },
      citations: [
        timeline(
          'Midcourse correction ignition (SPS) - transfer to hybrid non-free return trajectory.',
        ),
        table(
          'Translunar Phase',
          '"Midcourse correction cutoff" row (030:40:53.14), Event Duration and Velocity Change',
          ABTN_TRANSLUNAR,
        ),
        summary('Translunar Phase'),
        report('Section 4.0, "Trajectory" (printed page 4-1, PDF page 16)'),
        report('Section 3.0, "Mission Description" (printed page 3-1, PDF page 12)'),
        report(
          'Section 2.0, "Introduction" (printed page 2-1, PDF page 11): "All references to mileage distance are in nautical miles"',
        ),
      ],
      discrepancy:
        "The Mission Report's maneuver table (Table 4-III, printed page 4-5) gives the closest approach this burn aimed for as 63 and a tenths digit that cannot be read in the scan; the Apollo 13 Review Board report gives 62 nautical miles on printed page 3-28 and 64 on printed page 4-27. The text follows the Mission Report's section 4.0 and Apollo by the Numbers: the planned 60 nautical miles. The drawn path uses the maneuver table's 63, the only figure given with the speed and time of that closest approach.",
      view: 'journey',
    },

    /* --------------------------- The accident ------------------------- */
    {
      id: 'oxygen-tank',
      title: 'A loud bang',
      chapter: 'accident',
      elapsed: '055:54:53.555',
      utc: '1970-04-14T03:07:53Z',
      text: {
        short:
          'Nearly 56 hours into the flight, an oxygen tank in the service module bursts. The crew hears a loud bang, and Jack Swigert radios, "Okay, Houston, we\'ve had a problem here."',
        more: 'Mission Control had asked the crew to stir the tanks, a routine job, and the fans in oxygen tank 2 came on at 55 hours 53 minutes 20 seconds. About a minute and a half later, the tank lost its pressure and a panel blew off the side of the service module. Radio data from the spacecraft stopped for 1.8 seconds, and an alarm warned of low voltage on main bus B, one of the two main electrical lines. Swigert and Haise also felt a slight shudder. Then Lovell repeated: "Houston, we\'ve had a problem. We\'ve had a main B bus undervolt."',
      },
      citations: [
        timeline(
          'Telemetry loss for 1.8 seconds. Master caution and warning triggered by DC main bus B undervoltage. Alarm turned off in 6 seconds. Indications were that the cryogenic oxygen tank #2 lost pressure during this time period and the panel separated. It was at this time that the crew heard a loud bang.',
        ),
        timeline(
          'CAPCOM (Jack Lousma): "13, we\'ve got one more item for you, when you get a chance. We\'d like you to stir up your cryo tanks. In addition, I have shaft and trunnion..."',
        ),
        timeline('CMP: "Okay, Houston, we\'ve had a problem here."'),
        timeline('CDR: "Houston, we\'ve had a problem. We\'ve had a main B bus undervolt."'),
        summary('Translunar Phase'),
        summary('How the Problem Occurred'),
        report('Section 8.7.3, "Cryogenic Oxygen Tank Incident" (printed page 8-8, PDF page 63)'),
        report(SEQUENCE_OF_EVENTS + ', "Cryogenic oxygen tank incident" row, 55:54:53'),
        {
          source: 'apollo-13-air-to-ground-transcript',
          locator:
            'Tape 36/13, page 160 (PDF page 167): LMP, "Okay, Houston - -" at 02 07 55 19; CDR, "I believe we\'ve had a problem here." at 02 07 55 20; CC, "This is Houston. Say again, please." at 02 07 55 28; CDR, "Houston, we\'ve had a problem. We\'ve had a MAIN B BUS UNDERVOLT." at 02 07 55 35; CC, "Roger. MAIN B UNDERVOLT." at 02 07 55 42; CC, "Okay, stand by, 13. We\'re looking at it." at 02 07 55 58; and the handwritten note in the left margin, "Swigert first transmission, Lovell second"',
          url: 'https://www.nasa.gov/wp-content/uploads/2026/01/as13-tec.pdf',
        },
      ],
      discrepancy:
        "NASA's technical air-to-ground transcript gives the first call as two lines, the lunar module pilot's \"Okay, Houston - -\" and the commander's \"I believe we've had a problem here.\", though a handwritten note in its margin says Swigert made the first transmission and Lovell the second. In NASA's recording the words are heard as \"Okay, Houston, we've had a problem here,\" the way Apollo by the Numbers' timeline gives them for the command module pilot, Swigert, which we follow. NASA's recording also shortens the pauses between the calls: the transcript times them from 02 07 55 19 to 02 07 55 58 (55:55:19 to 55:55:58), 39 seconds, and the recording lasts 17 seconds.",
      // NASA's file "Apollo 13: Houston, We've Had a Problem"
      // (574928main_houston_problem.mp3), all of it, 0 to 17.04 seconds,
      // encoded as AAC to make it smaller (NASA's MP3 is 413 kB). Nothing is cut.
      audio: {
        src: 'media/apollo-13/we-ve-had-a-problem.m4a',
        seconds: 17.04,
        transcript: [
          { speaker: 'Jack Swigert', words: "Okay, Houston, we've had a problem here." },
          { speaker: 'Mission Control', words: 'This is Houston. Say again, please.' },
          {
            speaker: 'Jim Lovell',
            words: "Houston, we've had a problem. We've had a main B bus undervolt.",
          },
          { speaker: 'Mission Control', words: 'Roger. Main B undervolt.' },
          { speaker: 'Mission Control', words: "Okay, stand by, 13. We're looking at it." },
        ],
        credit: 'NASA',
        sourceUrl: 'https://www.nasa.gov/historical-sounds/',
      },
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'venting',
      title: 'Venting into space',
      chapter: 'accident',
      elapsed: '056:09:07',
      utc: '1970-04-14T03:22:07Z',
      text: {
        short:
          'Jim Lovell looks out the hatch and sees something spraying out of the service module. The oxygen the crew needs is leaking away into space.',
        more: 'Lovell reported, "We are venting something out into the - into space." Oxygen tank 2 read empty, and the pressure in tank 1 was falling. Soon fuel cells 1 and 3, which used the oxygen to make electricity, were reported off line, and the crew powered down to ease the load on the last one. By about 90 minutes after the accident, it was clear that the leak in tank 1 could not be stopped and that the lunar module would have to be used as a lifeboat.',
      },
      citations: [
        timeline(
          'CDR: "...It looks to me, looking out the hatch, that we are venting something. We are venting something out into the - into space."',
        ),
        timeline('LMP reported fuel cell #1 off line.'),
        timeline('LMP reported fuel cell #3 off line.'),
        timeline('Emergency power-down.'),
        summary('Translunar Phase'),
        report('Section 8.7.3, "Cryogenic Oxygen Tank Incident" (printed page 8-9, PDF page 64)'),
        board('Chapter 5, Part 2, finding 1.a (printed page 5-5, PDF page 171)'),
      ],
      photo: nasaPhoto(
        'S70-34902',
        1600,
        1040,
        'A black-and-white photo of Mission Control in Houston, taken hours after the crew reported the trouble. Men in a polo shirt, a dark suit, a white shirt and tie, a striped shirt, and a dark jacket gather at a console, several wearing headsets, and one points at papers spread on the desk.',
      ),
      view: 'spacecraft',
    },
    {
      id: 'lifeboat',
      title: 'Aquarius becomes a lifeboat',
      chapter: 'accident',
      elapsed: '058:40:00',
      utc: '1970-04-14T05:53:00Z',
      text: {
        short:
          'The crew powers up the lunar module Aquarius and shuts down Odyssey. Aquarius was built to land two astronauts on the Moon. Now it has to keep all three alive.',
        more: "The last fuel cell was shut down at 58 hours. By about 58 hours 40 minutes Aquarius was running, its guidance system had been set from Odyssey's, and Odyssey's systems were off, with its batteries kept for the end of the flight. Later, Aquarius ran short of the canisters that clean carbon dioxide from the air. Engineers in Houston worked out a way to use Odyssey's canisters instead, and the crew built the adapter in this photo from materials on board.",
      },
      citations: [
        timeline('CSM systems powered down. LM systems powered up.'),
        timeline('Shutdown of fuel cell #2.'),
        summary('Translunar Phase'),
        report(
          'Section 5.2.1, "Batteries" (printed page 5-2, PDF page 23): at 58 hours 40 minutes batteries A and B "were also isolated from the spacecraft buses"',
        ),
        report(
          'Section 8.9.1, "Coast Phase Activities" (printed page 8-12, PDF page 67): with too few lithium hydroxide cartridges in the lunar module, "With ground instructions, a system was constructed which attached a command module lithium hydroxide cartridge to each of two lunar module suit hoses"',
        ),
      ],
      photo: nasaPhoto(
        'as13-62-8929',
        1591,
        1600,
        'Inside the lunar module, a homemade square filter box with a taped, gridded face is fastened to the cabin wall, with a white hose running down from it.',
      ),
      view: 'spacecraft',
      keyMoment: true,
    },

    /* ------------------------- Around the Moon ------------------------ */
    {
      id: 'free-return-burn',
      title: 'Back on a path home',
      chapter: 'moon',
      elapsed: '061:29:43.49',
      utc: '1970-04-14T08:42:43Z',
      text: {
        short:
          'Aquarius fires its descent engine, the engine built for landing on the Moon, for about half a minute. Now Apollo 13 is on a path that will loop around the Moon and back to Earth.',
        more: "The 34.23-second firing changed the speed by 37.8 feet per second. Odyssey's big engine was not used: it needed a lot of electrical power, and no one knew how badly the service module was damaged. The crew lined up the docked spacecraft by hand before the burn. On this path alone, the command module would have splashed down in the Indian Ocean south of Mauritius at about 152 hours, where there was little recovery support.",
      },
      citations: [
        timeline('Midcourse correction ignition to free-return trajectory (LM DPS).'),
        table(
          'Translunar Phase',
          '"Midcourse correction cutoff" row (061:30:17.72), Event Duration and Velocity Change',
          ABTN_TRANSLUNAR,
        ),
        summary('Translunar Phase'),
        report('Section 4.0, "Trajectory" (printed page 4-4, PDF page 19)'),
        report('Section 3.0, "Mission Description" (printed page 3-3, PDF page 14)'),
        report(
          'Section 8.7.4, "Midcourse Correction to a Free Return" (printed page 8-10, PDF page 65)',
        ),
      ],
      view: 'journey',
      keyMoment: true,
    },
    {
      id: 'far-side',
      title: 'Behind the Moon',
      chapter: 'moon',
      elapsed: '077:08:35',
      utc: '1970-04-15T00:21:35Z',
      text: {
        short:
          'Apollo 13 swings around the far side of the Moon, out of radio contact with Earth for about 25 minutes. It never goes into orbit around the Moon, and it never lands.',
        more: 'Radio contact was lost at 77 hours 8 minutes 35 seconds and came back 24 minutes 35 seconds later. The burn back to a free return had aimed the closest approach at about 136 nautical miles (252 kilometers) above the far side, at 77 hours 20 minutes 57 seconds. The crew took pictures of the far side as they passed, like this one of a large crater.',
      },
      citations: [
        timeline('Lunar occultation entered.'),
        timeline('Lunar occultation exited.'),
        summary('Translunar Phase'),
        report(
          MANEUVERS +
            ', part (a) Translunar, "Second midcourse correction" row, "Resultant pericynthion conditions": altitude 136 (the digit after the decimal point is not legible in the scan) and "Pericynthion arrival time" 77:20:57',
        ),
      ],
      photo: nasaPhoto(
        'as13-60-8635',
        1596,
        1600,
        'A slanting view across the rugged, cratered far side of the Moon, half in black shadow, with a large crater that has ridges in its center.',
      ),
      view: 'moon',
      keyMoment: true,
    },
    {
      id: 's-ivb-impact',
      title: 'The third stage hits the Moon',
      chapter: 'moon',
      elapsed: '077:56:40.0',
      utc: '1970-04-15T01:09:40Z',
      text: {
        short:
          "The rocket's empty third stage crashes into the Moon, as planned. An instrument that Apollo 12 left on the Moon feels the shaking.",
        more: 'After the spacecraft pulled away from it, the S-IVB stage was steered onto a path to hit the Moon, so the seismometer left by Apollo 12 could record the impact. It struck at 8,465 feet per second (about 5,770 miles per hour), at 2.4 degrees south and 27.9 degrees west, 74 nautical miles (about 85 miles) from the seismometer. The signals lasted 3 hours 20 minutes and were so strong that the instrument had to be turned down to keep the recording on the scale.',
      },
      citations: [
        timeline('S-IVB impact on lunar surface.'),
        summary('Translunar Phase'),
        report('Section 4.0, "Trajectory" (printed page 4-4, PDF page 19)'),
        report(
          'Section 2.0, "Introduction" (printed page 2-1, PDF page 11): "All references to mileage distance are in nautical miles"',
        ),
      ],
      discrepancy:
        'Apollo by the Numbers (Apollo 13 mission summary, "Translunar Phase") puts the impact at 2.75 degrees south, 27.86 degrees west, 73 nautical miles from the seismometer, and NSSDCA\'s Master Catalog page for the command and service module gives the same place. We follow the Mission Report: 2.4 degrees south, 27.9 degrees west, 74 nautical miles (the report gives all distances in nautical miles).',
      view: 'moon',
    },
    {
      id: 'pc2-burn',
      title: 'Speeding up the trip home',
      chapter: 'moon',
      elapsed: '079:27:38.95',
      utc: '1970-04-15T02:40:39Z',
      text: {
        short:
          'Two hours after its closest pass by the Moon, Aquarius fires its descent engine for about four and a half minutes. The trip home gets shorter, and the landing moves to the Pacific Ocean, where the recovery ships are.',
        more: 'This firing came two hours after pericynthion, the closest point to the Moon, so it was called the PC+2 burn. It lasted 4 minutes 23.82 seconds and added 860.5 feet per second (about 587 miles per hour). It cut about 9 hours from the trip home and moved the splashdown from the Indian Ocean to the South Pacific. Afterward the crew powered Aquarius down to save electricity and water.',
      },
      citations: [
        timeline('Transearth injection ignition (LM DPS).'),
        table(
          'Transearth Phase',
          '"Transearth injection cutoff" row, Event Duration and Velocity Change',
          ABTN_TRANSEARTH,
        ),
        summary('Translunar Phase'),
        report('Section 4.0, "Trajectory" (printed page 4-4, PDF page 19)'),
        report('Section 8.9.1, "Coast Phase Activities" (printed page 8-12, PDF page 67)'),
      ],
      discrepancy:
        "The Apollo 13 Review Board report (printed page 3-28) and NSSDCA's Master Catalog give the firing as 4 minutes 23.4 seconds. We follow the Mission Report (4 minutes 23.8 seconds) and Apollo by the Numbers, which gives the same time to one more digit (4 minutes 23.82 seconds).",
      photo: nasaPhoto(
        'as13-60-8703',
        1576,
        1600,
        'A nearly full Moon against black space, showing its dark gray plains and bright cratered highlands. A dark blur covers part of its lower right edge.',
      ),
      view: 'journey',
      keyMoment: true,
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: 'steering-by-earth',
      title: 'Steering by Earth',
      chapter: 'return',
      elapsed: '105:18:28.0',
      utc: '1970-04-16T04:31:28Z',
      text: {
        short:
          "To save power, Aquarius's main guidance system is switched off. So the crew lines up the spacecraft by hand, using Earth as a guide, and fires the engine for 14 seconds to fix the path home.",
        more: "The burn after the Moon had left Apollo 13 headed into the atmosphere at an angle outside the allowed limits. To line up, the crew placed the tips of the terminator, the line between day and night on Earth, on a line in the crew's alignment sight. Haise controlled pitch and Lovell controlled roll, while Swigert called out when to start and stop the engine. The 14-second firing at 10 percent thrust changed the speed by 7.8 feet per second and set the entry angle at minus 6.52 degrees.",
      },
      citations: [
        timeline('Midcourse correction ignition (LM DPS).'),
        table(
          'Transearth Phase',
          '"Midcourse correction cutoff" row (105:18:42.0), Event Duration and Velocity Change',
          ABTN_TRANSEARTH,
        ),
        report('Section 3.0, "Mission Description" (printed page 3-3, PDF page 14)'),
        report('Section 4.0, "Trajectory" (printed page 4-4, PDF page 19)'),
        report('Section 8.9.1, "Coast Phase Activities" (printed page 8-13, PDF page 68)'),
      ],
      discrepancy:
        'Apollo by the Numbers\' mission summary ("Translunar Phase") gives the time of this correction as 105:18:42.0, which its own timeline lists as cutoff. We use the ignition time, 105:18:28.0, as the timeline and the Mission Report give it.',
      view: 'journey',
    },
    {
      id: 'service-module-separation',
      title: 'Seeing the damage',
      chapter: 'return',
      elapsed: '138:01:48.0',
      utc: '1970-04-17T13:14:48Z',
      text: {
        short:
          'The crew lets go of the damaged service module. As it drifts away, they see that one whole side panel has been blown off.',
        more: "The service module had been kept attached until now to protect the command module's heat shield. Aquarius's thrusters moved the docked pair away from it about 4 hours 39 minutes before entry. When it came into view about 80 feet away, the crew saw that the entire bay 4 outer panel was missing, with torn insulation sticking out. They also reported that the high-gain antenna was damaged and that fuel cells were tilted, and they photographed the damage.",
      },
      citations: [
        timeline('SM separation.'),
        timeline('SM photographed.'),
        summary('Translunar Phase'),
        report('Section 3.0, "Mission Description" (printed page 3-3, PDF page 14)'),
        report(
          'Section 8.9.4, "Service Module Separation and Photography" (printed pages 8-15 and 8-16, PDF pages 70 and 71)',
        ),
        nmc('Mission Profile'),
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for the command and service module gives the separation as 13:15:06 UT. Apollo by the Numbers gives 138:01:48.0, 13:14:48 GMT, and the Mission Report the same elapsed time, which we follow.",
      // Cropped from NASA's full frame, in which the service module is small near the middle.
      photo: nasaPhoto(
        'as13-58-8458',
        1100,
        1100,
        'The cast-off service module, small and lit by the Sun against black space. A dark, ragged gap runs along one side where a whole panel was blown away.',
        'NASA (cropped)',
      ),
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'farewell-aquarius',
      title: 'Farewell, Aquarius',
      chapter: 'return',
      elapsed: '141:30:00.2',
      utc: '1970-04-17T16:43:00Z',
      text: {
        short:
          "About 70 minutes before entry, the crew is back in Odyssey and lets Aquarius go. The lunar module that kept them alive burns up in Earth's atmosphere.",
        more: 'Aquarius was kept as long as possible so that Odyssey could save its own power for entry. Odyssey had been powered up with its three entry batteries, charged earlier with power from Aquarius. When the two undocked, the air pressure in the tunnel between them pushed them apart. Pieces of Aquarius that survived entry, including the radioactive fuel capsule meant to power experiments on the Moon, fell into the open sea between Samoa and New Zealand.',
      },
      citations: [
        timeline('LM jettisoned.'),
        summary('Translunar Phase'),
        report(
          'Section 3.0, "Mission Description" (printed pages 3-3 and 3-4, PDF pages 14 and 15)',
        ),
        {
          source: 'nssdca-apollo-current-locations',
          locator:
            'Apollo 13, Lunar Module "Aquarius": "Burned up in Earth\'s atmosphere 17 April 1970"',
        },
        nmc('Mission Profile'),
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for the command and service module gives the jettison as 16:43:02 UT. Apollo by the Numbers gives 141:30:00.2, 16:43:00 GMT, and the Mission Report the same elapsed time, which we follow.",
      photo: nasaPhoto(
        'AS13-59-8562',
        1600,
        1593,
        'A black-and-white view of the lunar module Aquarius against black space, seen from above: its bright, boxy upper stage with the round docking hatch at the center, an antenna dish at the top, and part of a landing leg below.',
      ),
      view: 'spacecraft',
      keyMoment: true,
    },

    /* ----------------------------- Splashdown ---------------------------- */
    {
      id: 'entry',
      title: 'Entering the atmosphere',
      chapter: 'splashdown',
      elapsed: '142:40:45.7',
      utc: '1970-04-17T17:53:45Z',
      text: {
        short:
          "Odyssey reaches the top of Earth's atmosphere moving at about 24,700 miles per hour (39,700 kilometers per hour). Its heat shield protects the crew from the heat.",
        more: "Entry is counted from 400,000 feet, about 76 miles (122 kilometers) up, which Odyssey reached 63 hours 8 minutes 42.9 seconds after the burn that sped up the trip home ended. Odyssey had been fully powered up again 2½ hours before entry. The crew felt a peak of 5.56 g, a little over five and a half times their normal weight. A heat shield made of ablative material covered the command module's base.",
      },
      citations: [
        timeline('Entry.'),
        summary('Recovery'),
        table(
          'Entry, Splashdown and Recovery',
          'Apollo 13 column, Earth Entry, GET, Velocity (ft/sec), and Maximum g rows',
          ABTN_ENTRY,
        ),
        report('Section 8.9.5, "Command Module Activation" (printed page 8-16, PDF page 71)'),
        nmc('Spacecraft and Subsystems'),
      ],
      view: 'earth',
    },
    {
      id: 'splashdown',
      title: 'Splashdown',
      chapter: 'splashdown',
      elapsed: '142:54:41',
      utc: '1970-04-17T18:07:41Z',
      text: {
        short:
          "Odyssey's parachutes lower it into the South Pacific Ocean near the recovery ship USS Iwo Jima. All three astronauts are home safe.",
        more: 'Splashdown came at 1:07:41 p.m. Eastern Standard Time on April 17, 1970, about 1 nautical mile from the target point and 3.5 nautical miles from the Iwo Jima. A helicopter picked up the crew, who were aboard the ship 45 minutes after splashdown. The mission had lasted 142 hours 54 minutes 41 seconds and traveled an estimated 541,103 nautical miles (about 622,700 miles, or 1,002,100 kilometers).',
      },
      citations: [
        timeline('Splashdown (went to apex-up).'),
        summary('Recovery'),
        table(
          'Entry, Splashdown and Recovery',
          'Apollo 13 column, Earth Splashdown GET, KSC Time, Distance To Target (n mi), Distance To Recovery Ship (n mi), Distance Traveled (n mi), Minutes To Crew Pickup, and Recovery Ship rows',
          ABTN_ENTRY,
        ),
        report('Section 3.0, "Mission Description" (printed page 3-4, PDF page 15)'),
      ],
      photo: nasaPhoto(
        's70-35644',
        1600,
        1041,
        'The command module floats on the blue Pacific Ocean as its three red-and-white striped main parachutes settle onto the water. The recovery ship sits on the horizon at the upper left.',
      ),
      view: 'earth',
      keyMoment: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Command module Odyssey',
        museum: 'Kansas Cosmosphere and Space Center',
        place: 'Hutchinson, Kansas',
      },
      citations: [
        {
          source: 'nssdca-apollo-current-locations',
          locator: 'Apollo 13, Command Module "Odyssey"',
        },
        nmc('Mission Profile'),
      ],
    },
  ],
};
