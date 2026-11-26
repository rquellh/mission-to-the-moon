/**
 * Apollo 10: the dress rehearsal for the first Moon landing, May 18-26,
 * 1969.
 *
 * Event times are copied from Apollo by the Numbers (NASA SP-2000-4029),
 * Apollo 10 Timeline, exactly as printed, and UTC from that table's GMT
 * columns, wherever they agree with the Apollo 10 Mission Report's Table
 * 3-I to its rounding. Where the two differ, we follow the Mission Report,
 * the more primary source, and the `discrepancy` field gives the
 * timeline's value; the UTC is then range zero plus the report's time.
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (16:49:00 GMT, "the integral second before lift-off", Mission Report
 * Section 2.0). Liftoff itself came 0.58 seconds later.
 *
 * Unit conversions in the text (nautical miles and feet to miles and
 * kilometers, feet per second to miles and kilometers per hour) are our
 * arithmetic on the cited values. So is writing durations of a minute or
 * more as minutes and seconds: the source's 356.1 seconds is "5 minutes
 * 56.1 seconds" here.
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const ABTN_SUMMARY = `${ABTN}Apollo_10a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_10i_Timeline.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-02_Crew_Information_-_E-Orbit_and_L-Orbit.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_TLI = `${ABTN}Apollo_18-24_Translunar_Injection.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;
const ABTN_LUNAR_ORBIT = `${ABTN}Apollo_10g_Lunar_Orbit_Phase.htm`;
const MISSION_REPORT =
  'https://web.archive.org/web/20250207014556/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A10_MissionReport.pdf';
const NMC_CSM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-043A';

/** A section of the Apollo by the Numbers Apollo 10 mission summary. */
function summary(section: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 10 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 10 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 10 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the Apollo by the Numbers phase or statistical tables. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `"${name}" table, Apollo 10: ${rows}`,
    url,
  };
}

/** A row of the Mission Report's Table 3-I, Sequence of Events (pages 3-3 and 3-4, PDF pages 14 and 15). */
function sequence(row: string, page: '3-3' | '3-4' = '3-3'): Citation {
  return {
    source: 'apollo-10-mission-report',
    locator: `Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === '3-3' ? 14 : 15}), "${row}" row`,
    url: MISSION_REPORT,
  };
}

/** A passage of the Mission Report, by section, printed page, and PDF page. */
function report(section: string, page: string, pdfPage: number, what: string): Citation {
  return {
    source: 'apollo-10-mission-report',
    locator: `Section ${section} (page ${page}, PDF page ${pdfPage}): ${what}`,
    url: MISSION_REPORT,
  };
}

/** The NASA "Apollo 10: Mission Details" page. */
function nasaDetails(what: string): Citation {
  return { source: 'nasa-apollo-10-mission-details', locator: what };
}

/** NASA's history article "Charlie Brown and Snoopy in Lunar Orbit". */
function lunarOrbitArticle(what: string): Citation {
  return { source: 'nasa-apollo-10-charlie-brown-and-snoopy', locator: what };
}

/** The NSSDCA Master Catalog page for the Apollo 10 command and service module. */
function nmc(what: string): Citation {
  return {
    source: 'nssdca-master-catalog',
    locator: `"Apollo 10 Command and Service Module (CSM)" (1969-043A), Description: ${what}`,
    url: NMC_CSM,
  };
}

/** The Smithsonian record of the Apollo 10 command module. */
function nasm(what: string): Citation {
  return { source: 'nasm-apollo-10-command-module', locator: what };
}

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-10/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-10/${nasaId.toLowerCase()}.jpg`,
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
  id: 'apollo-10',
  program: 'apollo',
  name: 'Apollo 10',
  kind: 'flight',
  destination: 'moon',

  summary: {
    text: {
      short:
        'Apollo 10 was the practice run for the first Moon landing. In May 1969, Tom Stafford and Gene Cernan flew the lunar module Snoopy down to about 9 miles above the Moon, then flew back up to John Young in the command module Charlie Brown.',
      more: 'Apollo 10 launched from Kennedy Space Center on May 18, 1969, the first launch with a crew from Pad B of Launch Complex 39. It was the first trip to the Moon with both Apollo spacecraft, and it did everything the first landing would do except land. In orbit around the Moon, Stafford and Cernan took Snoopy low over the site planned for Apollo 11, tested its landing radar, and then met up with Young again, just as a crew lifting off from the Moon would. It was also the first flight on which all three crew members had flown in space before. They splashed down in the Pacific Ocean on May 26.',
    },
    citations: [
      summary('Background'),
      summary('Ascent Phase'),
      summary('Lunar Orbit Phase'),
      summary('Recovery'),
      report(
        '2.0, Introduction',
        '2-1',
        11,
        '"the first lunar flight of the complete spacecraft" and "The purpose of the mission was to confirm all aspects of the lunar landing mission exactly as it would be performed, except for the actual descent, landing, lunar stay, and ascent from the lunar surface"',
      ),
      report(
        '6.5, Lunar Orbit Insertion and Circularization',
        '6-4',
        45,
        '"the lowest approach to the lunar surface (from landing radar determination) was 47 400 feet"',
      ),
      nasm(
        'Object description: "The mission was a dress rehearsal for the Apollo 11 landing on the moon"',
      ),
    ],
  },

  crew: {
    value: [
      { name: 'Thomas P. Stafford', role: 'Commander' },
      { name: 'John W. Young', role: 'Command module pilot' },
      { name: 'Eugene A. Cernan', role: 'Lunar module pilot' },
    ],
    citations: [
      summary('Background'),
      report(
        '1.0, Summary',
        '1-1',
        9,
        '"with a crew of Thomas P. Stafford, Commander, John W. Young, Command Module Pilot, and Eugene A. Cernan, Lunar Module Pilot"',
      ),
      table(
        'Crew Information - Earth Orbit and Lunar Orbit Missions',
        'Commander, Command Module Pilot, and Lunar Module Pilot rows',
        ABTN_CREW,
      ),
    ],
  },
  crewPhoto: nasaPhoto(
    's69-34385',
    822,
    1200,
    'From left, Eugene A. Cernan, John W. Young, and Thomas P. Stafford stand on the grass in white spacesuits. Behind them, their Saturn V rocket stands beside its red launch tower on Pad B at the Kennedy Space Center.',
  ),

  launch: {
    value: {
      utc: '1969-05-18T16:49:00Z',
      site: 'Launch Complex 39, Pad B, Kennedy Space Center, Florida',
      vehicle: 'Saturn V (SA-505)',
    },
    citations: [
      summary('Ascent Phase'),
      summary('Background'),
      timeline('Range zero.'),
      report(
        '2.0, Introduction',
        '2-1',
        11,
        '"Range zero for this mission was 16:49:00 G.m.t., May 18, 1969"',
      ),
      nasaDetails('Launch: "May 18, 1969; 12:49 p.m. EDT Launch Pad 39B Saturn-V AS-505"'),
    ],
  },

  duration: {
    value: '192:03:23',
    citations: [
      summary('Recovery'),
      table('Entry, Splashdown, and Recovery', 'Earth Splashdown, GET row', ABTN_ENTRY),
      sequence('Landing', '3-4'),
    ],
  },

  callSigns: {
    value: [
      { craft: 'Command module', name: 'Charlie Brown' },
      { craft: 'Lunar module', name: 'Snoopy' },
    ],
    citations: [
      table('Call Signs', 'Command Module and Lunar Module', ABTN_CALL_SIGNS),
      summary('Background'),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          'Apollo 10 did everything the first Moon landing would do, except land. It was the full dress rehearsal for Apollo 11.',
        more: 'Its purpose was to try out every part of a landing mission exactly as it would be flown, except the descent to the surface, the stay there, and the liftoff. It was the first flight to the Moon with the complete Apollo spacecraft, the command and service module and the lunar module together. Afterward NASA concluded that both were ready for a landing with a crew.',
      },
      citations: [
        summary('Background'),
        summary('Conclusions'),
        report(
          '2.0, Introduction',
          '2-1',
          11,
          '"the first lunar flight of the complete spacecraft" and "The purpose of the mission was to confirm all aspects of the lunar landing mission exactly as it would be performed, except for the actual descent, landing, lunar stay, and ascent from the lunar surface"',
        ),
        nasaDetails(
          '"The Apollo 10 mission encompassed all aspects of an actual crewed lunar landing, except the landing"',
        ),
        nasm(
          'Object description: "The mission was a dress rehearsal for the Apollo 11 landing on the moon"',
        ),
      ],
    },
    {
      text: {
        short:
          'Snoopy was the first lunar module to fly at the Moon. It flew on its own for more than 8 hours and came within about 9 miles of the surface.',
        more: 'Stafford and Cernan flew Snoopy apart from Charlie Brown for 8 hours 10 minutes 5 seconds. They tried out its landing radar over the Moon, its rendezvous radar, and both of its engines, and showed that a crew could check out a lunar module, start down toward the surface, and meet up again without being overloaded with work.',
      },
      citations: [
        summary('Lunar Orbit Phase'),
        summary('Conclusions'),
        nasm('Object description: "was the first time the Lunar Module was tested in lunar orbit"'),
        lunarOrbitArticle(
          '"During its 8-hour 10-minute solo flight Snoopy met all planned objectives"',
        ),
      ],
    },
    {
      text: {
        short:
          'The crew photographed the place where Apollo 11 was planned to land, in the Sea of Tranquility, from close up.',
        more: "From Snoopy's low pass and from Charlie Brown, they took stereo photographs of Apollo Landing Site 2, the planned site of the first landing, and described the landmarks on the way to it.",
      },
      citations: [
        summary('Background'),
        summary('Lunar Orbit Phase'),
        report(
          '3.0, Mission Description',
          '3-1',
          12,
          '"visual observation and stereo photography of Apollo Landing Site 2, the planned location of the first lunar landing, were to be completed"',
        ),
        nasaDetails('"The LM flew over Landing Site 2 in the Sea of Tranquility"'),
        lunarOrbitArticle(
          '"a running commentary describing the landscape below them including all the landmarks leading up to the planned Apollo 11 landing site" and "Stafford, Cernan, and Young took stereo images of the Apollo 11 landing site"',
        ),
      ],
    },
    {
      text: {
        short:
          "Tracking two spacecraft at the Moon taught NASA much more about the pull of the Moon's gravity, which made the navigation for a landing more accurate.",
        more: "Mission Control showed it could guide and follow two spacecraft at the Moon's distance at the same time. The improved model of the Moon's gravity, worked out from Apollo 8 and Apollo 10 tracking, was expected to be good enough to guide a lunar module down to the surface and back up.",
      },
      citations: [
        summary('Conclusions'),
        report(
          '1.0, Summary',
          '1-2',
          10,
          '"Valuable data concerning lunar gravitation were obtained during the 60 hours of lunar orbit"',
        ),
        report(
          '6.11, Lunar Orbit Determination',
          '6-6',
          47,
          '"the general quality of the orbit determination and prediction capabilities was considerably better than that of Apollo 8 because of a more effective data processing procedure and the use of a greatly improved lunar potential model"',
        ),
      ],
    },
  ],

  chapters: [
    { id: 'launch', title: 'Launch' },
    { id: 'outbound', title: 'To the Moon' },
    { id: 'lunar-orbit', title: "Snoopy's flight" },
    { id: 'return', title: 'Coming home' },
  ],

  events: [
    /* ---------------------------- Launch ---------------------------- */
    {
      id: 'liftoff',
      handsOn: 'stages',
      title: 'Liftoff',
      chapter: 'launch',
      elapsed: '000:00:00.58',
      utc: '1969-05-18T16:49:00Z',
      text: {
        short:
          'A Saturn V rocket lifts Apollo 10 off its launch pad in Florida. It is the first time astronauts have launched from this pad, Pad B.',
        more: 'Apollo 10 lifted off from Launch Complex 39, Pad B, at Kennedy Space Center at 12:49 p.m. Eastern Daylight Time on May 18, 1969, under cloudy skies. Aboard were Thomas Stafford, commander; John Young, command module pilot; and Eugene Cernan, lunar module pilot. Stafford and Young were each making their third spaceflight and Cernan his second; all their earlier flights had been Gemini missions.',
      },
      citations: [
        timeline('Liftoff (umbilical disconnected).'),
        sequence('Lift-off'),
        summary('Ascent Phase'),
        summary('Launch Preparations'),
        summary('Background'),
        table(
          'Crew Information - Earth Orbit and Lunar Orbit Missions',
          'Prior Space Flights rows',
          ABTN_CREW,
        ),
      ],
      photo: nasaPhoto(
        'S69-34143',
        723,
        1600,
        'The white Saturn V rocket rises on a bright flame beside its red launch tower, under a gray, cloudy sky, with smoke spreading across the pad below.',
      ),
      view: 'earth',
      keyMoment: true,
    },

    /* --------------------------- To the Moon -------------------------- */
    {
      id: 'translunar-injection',
      title: 'Leaving Earth orbit',
      chapter: 'outbound',
      elapsed: '002:33:27.52',
      utc: '1969-05-18T19:22:27Z',
      text: {
        short:
          "After one and a half trips around Earth, the rocket's third stage fires again and sends Apollo 10 on its way to the Moon.",
        more: 'Apollo 10 first circled Earth about 115 miles (185 kilometers) up while the crew checked the spacecraft. Then the third stage, the S-IVB, fired again for translunar injection, the engine firing that leaves Earth orbit for the Moon. It began at 2 hours 33 minutes 27.52 seconds on the mission clock and ended at 2 hours 39 minutes 10.58 seconds. Ten seconds later Apollo 10 was moving at 35,562.96 feet per second, about 24,250 miles per hour (39,020 kilometers per hour).',
      },
      citations: [
        timeline('S-IVB 2nd burn ignition.'),
        timeline('S-IVB 2nd burn cutoff.'),
        timeline('Translunar injection.'),
        sequence('S-IVB ignition (translunar injection)'),
        table(
          'Apollo 10 Earth Orbit Phase',
          '"Earth orbit insertion" row, Apogee and Perigee (n mi)',
          `${ABTN}Apollo_10e_Earth_Orbit_Phase.htm`,
        ),
        table('Translunar Injection', '"GET" and "Space-Fixed Velocity (ft/sec)" rows', ABTN_TLI),
        summary('Earth Orbit Phase'),
      ],
      view: 'journey',
    },
    {
      id: 'docking-with-snoopy',
      title: 'Picking up Snoopy',
      chapter: 'outbound',
      elapsed: '003:17:37',
      utc: '1969-05-18T20:06:37Z',
      text: {
        short:
          "Charlie Brown separates from the rocket's third stage, turns around, and docks nose to nose with Snoopy, the lunar module, which rode on top of the stage under a cover.",
        more: 'The command and service module separated from the third stage at 3 hours 2 minutes 42.4 seconds on the mission clock and docked with the lunar module at 3 hours 17 minutes 37 seconds. Color television showed the docking to people on Earth. At 3 hours 56 minutes 25.7 seconds the docked spacecraft pulled Snoopy free of the stage, which was then sent past the Moon and into orbit around the Sun.',
      },
      citations: [
        timeline('CSM separated from S-IVB (ignition).'),
        timeline('CSM/LM ejected from S-IVB.'),
        sequence('First docking'),
        report(
          '6.3, Translunar Injection and Separation',
          '6-2',
          43,
          '"Separation of the command and service modules from the S-IVB was initiated at 3:02:42 and docking was completed at 3:17:37"',
        ),
        summary('Translunar Phase'),
        nasaDetails(
          '"The first live color TV transmissions to Earth began three hours after launch ... The transmission showed the docking process and the interior of the CSM"',
        ),
        nasaDetails(
          '"The orbital vehicle was comprised of the S-IVB stage, and its payload of the CSM, the LM and spacecraft-lunar module adapter, or SLA, shroud"',
        ),
      ],
      discrepancy:
        'The Apollo by the Numbers Apollo 10 Timeline and mission summary give the docking as 003:17:36.0. We follow the Mission Report (Table 3-I and Section 6.3), 3:17:37.',
      view: 'spacecraft',
    },

    /* ------------------------- Snoopy's flight ------------------------ */
    {
      id: 'lunar-orbit-insertion',
      title: 'Into orbit around the Moon',
      chapter: 'lunar-orbit',
      elapsed: '075:55:54.0',
      utc: '1969-05-21T20:44:54Z',
      text: {
        short:
          'Behind the Moon, out of radio contact with Earth, Apollo 10 fires its main engine to slow down and slips into orbit around the Moon.',
        more: 'The firing began at 75 hours 55 minutes 54.0 seconds on the mission clock and lasted 5 minutes 56.1 seconds, putting Apollo 10 in an orbit 170.0 by 60.2 nautical miles above the Moon (about 196 by 69 miles, or 315 by 111 kilometers). When Apollo 10 came back around, Stafford radioed, "You can tell the world that we have arrived." After two trips around the Moon, a 13.9-second firing made the orbit nearly round, 61.0 by 59.2 nautical miles.',
      },
      citations: [
        timeline('Lunar orbit insertion ignition.'),
        timeline('Lunar orbit insertion cutoff.'),
        timeline('Lunar orbit circularization ignition.'),
        sequence('Lunar orbit insertion'),
        table(
          'Apollo 10 Lunar Orbit Phase',
          '"Lunar orbit insertion cutoff" and "Lunar orbit circularization cutoff" rows',
          ABTN_LUNAR_ORBIT,
        ),
        summary('Translunar Phase'),
        summary('Lunar Orbit Phase'),
        lunarOrbitArticle(
          '"The Lunar Orbit Insertion (LOI) maneuver, a six–minute firing of the Service Propulsion System (SPS) engine, took place behind the Moon" and "As Apollo 10 rounded the backside of the Moon and communications were restored, Stafford radioed to Mission Control, \'You can tell the world that we have arrived.\'"',
        ),
      ],
      view: 'moon',
      keyMoment: true,
    },
    {
      id: 'undocking',
      title: 'Snoopy flies on its own',
      chapter: 'lunar-orbit',
      elapsed: '098:11:57',
      utc: '1969-05-22T19:00:57Z',
      text: {
        short:
          'Stafford and Cernan climb into Snoopy and undock from Charlie Brown, behind the Moon. Young stays behind to fly Charlie Brown by himself.',
        more: 'Before undocking, the crew found Snoopy had slipped 3.5 degrees out of line with the command module; Mission Control said anything under 6 degrees was safe. Undocking came at 98 hours 11 minutes 57 seconds on the mission clock. Young looked Snoopy over, showing it on television, and then, at 98 hours 47 minutes, fired Charlie Brown\'s thrusters to move away. "We\'ll see you back in about six hours," Stafford said.',
      },
      citations: [
        timeline('CSM/LM undocked.'),
        timeline('CSM/LM separation maneuver ignition.'),
        sequence('Undocking'),
        table('Apollo 10 Lunar Orbit Phase', '"CSM/LM undocked" row', ABTN_LUNAR_ORBIT),
        summary('Lunar Orbit Phase'),
        lunarOrbitArticle(
          '"Mission Control gave the crew the GO to undock just before the spacecraft went out of communication behind the Moon"; "Young began a 20-minute TV transmission, at first showing Snoopy a short distance away"; "Young then fired Charlie Brown\'s thrusters to separate from Snoopy"; "Stafford added, \'We\'ll see you back in about six hours.\'"',
        ),
      ],
      discrepancy:
        'The Apollo by the Numbers mission summary (Lunar Orbit Phase section) says undocking occurred at 098:29:20. Its Timeline and Lunar Orbit Phase table, and the Mission Report (Tables 3-I and 6-II), give 098:11:57, which we follow.',
      photo: nasaPhoto(
        'as10-27-3873',
        1600,
        1600,
        'Charlie Brown, the command and service module, seen nose-on from Snoopy: a shiny cone catching the sunlight above the gray, crater-covered Moon, with the curved horizon and black sky behind.',
      ),
      view: 'spacecraft',
    },
    {
      id: 'low-pass',
      title: 'Swooping low over the Moon',
      chapter: 'lunar-orbit',
      elapsed: '100:41:43',
      utc: '1969-05-22T21:30:43Z',
      text: {
        short:
          'Snoopy dips to about 9 miles above the Moon, near the place where Apollo 11 is planned to land, and tests the radar a lander needs to touch down.',
        more: 'Behind the Moon, at 99 hours 46 minutes, Snoopy\'s descent engine fired for 27.4 seconds to lower its orbit\'s low point to 8.5 nautical miles. Its lowest point, measured by its landing radar, was 47,400 feet (about 9 miles, or 14.4 kilometers) above the surface, at 100 hours 41 minutes 43 seconds. "We is down among them, Charlie," Cernan told Charles Duke in Mission Control. Over Apollo Landing Site 2 in the Sea of Tranquility, Snoopy was 56,783 feet (about 10.8 miles, or 17.3 kilometers) up. At 100 hours 58 minutes its descent engine fired again to swing it out into a long, high orbit.',
      },
      citations: [
        timeline('Descent orbit insertion ignition (SPS).'),
        timeline('LM closest approach to lunar surface.'),
        timeline('Phasing maneuver ignition.'),
        table(
          'Apollo 10 Lunar Orbit Phase',
          '"LM descent orbit insertion cutoff", "LM closest approach to lunar surface", and "LM phasing cutoff" rows',
          ABTN_LUNAR_ORBIT,
        ),
        summary('Lunar Orbit Phase'),
        summary('Conclusions'),
        report(
          '6.5, Lunar Orbit Insertion and Circularization',
          '6-4',
          45,
          '"The altitude of the lunar module above the vicinity of Apollo Landing Site 2 was 56 783 feet. However, the lowest approach to the lunar surface (from landing radar determination) was 47 400 feet"',
        ),
        lunarOrbitArticle(
          'DOI "took place behind the Moon so the low point would be reached on the nearside near the Apollo 11 landing area in the Sea of Tranquility", and "Cernan reporting to Capcom Charles M. Duke, \'We is down among them, Charlie\'"',
        ),
      ],
      view: 'moon',
      keyMoment: true,
    },
    {
      id: 'staging',
      title: 'A wild spin',
      chapter: 'lunar-orbit',
      elapsed: '102:45:16.9',
      utc: '1969-05-22T23:34:16Z',
      text: {
        short:
          'Snoopy suddenly starts to spin. Seconds later it lets go of its bottom half, the descent stage, keeping its top half to fly back to Charlie Brown, and Stafford and Cernan quickly get the spin under control.',
        more: "Seconds before staging, Snoopy began a rapid roll. The ascent stage separated from the descent stage at 102 hours 45 minutes 16.9 seconds, 31.4 nautical miles above the Moon, and the motion stopped about 8 seconds later. The cause was a switch left in the wrong position, so Snoopy's backup guidance system tried to turn it toward Charlie Brown. The descent stage was left in orbit around the Moon. About 10 minutes later the ascent engine fired for 15.55 seconds, putting Snoopy in the same orbit a crew lifting off from the Moon would reach.",
      },
      citations: [
        timeline('LM in rapid roll.'),
        timeline('LM ascent stage/descent stage separated.'),
        timeline('Ascent orbit insertion ignition'),
        sequence('Lunar module staging'),
        summary('Lunar Orbit Phase'),
        report(
          '9.9.5, Staging and Insertion',
          '9-15',
          163,
          '"At approximately 5 seconds before staging, the spacecraft started a motion that was characterized by a rapid roll rate accompanied by small yaw and pitch rates"',
        ),
        report(
          '9.9.5, Staging and Insertion',
          '9-16',
          164,
          '"Spacecraft motion stopped in approximately 8 seconds"',
        ),
        report(
          '1.0, Summary',
          '1-1',
          9,
          '"Conditions following this maneuver were identical to those expected after a normal ascent from the lunar surface"',
        ),
        lunarOrbitArticle(
          '"During the staging, Snoopy experienced some unexpected motions in all three axes that Stafford and Cernan quickly brought under control. The gyrations were later attributed to a switch placed in the wrong position. Ten minutes later, they fired Snoopy\'s Ascent Propulsion System (APS) engine for 15 seconds that simulated a liftoff from the Moon"',
        ),
        nmc('"The LM descent stage was jettisoned into lunar orbit"'),
      ],
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'redocking',
      title: 'Back together',
      chapter: 'lunar-orbit',
      elapsed: '106:22:02',
      utc: '1969-05-23T03:11:02Z',
      text: {
        short:
          'After a long chase around the Moon, Snoopy catches up with Charlie Brown, and Young docks the two spacecraft. "Snoopy and Charlie Brown are hugging each other," Stafford says.',
        more: 'Snoopy used the same series of engine firings a crew coming up from the Moon would use to catch the command module. Docking came at 106 hours 22 minutes 2 seconds on the mission clock, 8 hours 10 minutes 5 seconds after the two had parted; at times they had been up to 390 miles apart. Stafford and Cernan moved back into Charlie Brown with their film, and at 108 hours 24 minutes 36 seconds the crew let Snoopy go. Its ascent engine was then fired by remote control for 4 minutes 9.0 seconds, until its propellant ran out, sending it out of lunar orbit and into orbit around the Sun.',
      },
      citations: [
        timeline('CSM/LM docked.'),
        timeline('LM ascent stage jettisoned.'),
        timeline('LM ascent propulsion system ignition.'),
        sequence('Second docking', '3-4'),
        summary('Lunar Orbit Phase'),
        table(
          'Apollo 10 Lunar Orbit Phase',
          '"LM ascent propulsion system depletion" row, Event Duration (sec)',
          ABTN_LUNAR_ORBIT,
        ),
        report(
          '3.0, Mission Description',
          '3-2',
          13,
          '"docking was performed from the command module an hour later" and "the ascent propulsion system was fired to propellant depletion at 109 hours. The firing was nominal and placed the vehicle into a solar orbit"',
        ),
        lunarOrbitArticle(
          '"Young completed the docking just after the two spacecraft reappeared from behind the Moon, and Stafford exclaimed, \'Snoopy and Charlie Brown are hugging each other.\' Snoopy had been on a very long leash, travelling up to 390 miles from Charlie Brown"',
        ),
        {
          source: 'nssdca-apollo-current-locations',
          locator: 'Apollo 10, Lunar Module "Snoopy": "In heliocentric orbit"',
        },
      ],
      photo: nasaPhoto(
        'as10-34-5112',
        1600,
        1600,
        "Snoopy's ascent stage, a small, angular craft of silver and black, approaches against the gray, cratered Moon, seen through Charlie Brown's window, whose frame shows as a blurred red and blue band.",
      ),
      view: 'spacecraft',
      keyMoment: true,
    },

    /* --------------------------- Coming home -------------------------- */
    {
      id: 'transearth-injection',
      title: 'Heading home',
      chapter: 'return',
      elapsed: '137:36:28.9',
      utc: '1969-05-24T10:25:28Z',
      text: {
        short:
          'After 31 trips around the Moon, Apollo 10 fires its main engine behind the Moon and heads back to Earth.',
        more: "The 2-minute 44.8-second firing began at 137 hours 36 minutes 28.9 seconds on the mission clock and left Apollo 10 moving at 8,987.2 feet per second (about 6,130 miles per hour, or 9,860 kilometers per hour) relative to the Moon. The trip home took about 54 hours, faster than the trip out, and needed only one small course correction, about 3 hours before reaching Earth's atmosphere.",
      },
      citations: [
        timeline('Transearth injection ignition (SPS).'),
        timeline('Transearth injection cutoff.'),
        sequence('Transearth injection', '3-4'),
        summary('Lunar Orbit Phase'),
        summary('Transearth Phase'),
        summary('Translunar Phase'),
        report(
          '3.0, Mission Description',
          '3-2',
          13,
          '"The fast-return flight of about 54 hours duration was completed normally"',
        ),
        report(
          '6.8, Transearth Midcourse Corrections',
          '6-5',
          46,
          '"The only transearth midcourse correction, a 2.2 ft/sec impulse, was initiated about 3 hours before entry"',
        ),
        nasaDetails(
          '"Apollo 10 was on the back side of the moon when it was injected into a trans-Earth trajectory"',
        ),
      ],
      view: 'journey',
    },
    {
      id: 'splashdown',
      title: 'Splashdown',
      chapter: 'return',
      elapsed: '192:03:23',
      utc: '1969-05-26T16:52:23Z',
      text: {
        short:
          'The command module Charlie Brown parachutes into the Pacific Ocean near the recovery ship USS Princeton. A helicopter carries the crew to the ship.',
        more: 'Charlie Brown reached the top of the atmosphere moving at 36,314 feet per second, about 24,760 miles per hour (39,850 kilometers per hour). Splashdown came at 192 hours 3 minutes 23 seconds on the mission clock, at 12:52 p.m. Eastern Daylight Time on May 26, about 400 miles east of American Samoa and 2.9 nautical miles from the Princeton. Recovery forces saw Charlie Brown come in as a streak on the night sky, then on its main parachutes in the predawn twilight; the crew were picked up at daybreak and were aboard the ship 39 minutes after splashdown.',
      },
      citations: [
        timeline('Entry.'),
        timeline('Splashdown (went to apex-up).'),
        timeline('Crew aboard recovery ship.'),
        sequence('Landing', '3-4'),
        table(
          'Entry, Splashdown, and Recovery',
          'Earth Entry Velocity (ft/sec), and Earth Splashdown GET, Distance To Recovery Ship (n mi), and Recovery Ship rows',
          ABTN_ENTRY,
        ),
        summary('Recovery'),
        report(
          '1.0, Summary',
          '1-2',
          10,
          '"it landed near the primary recovery vessel, USS Princeton, at about 192 hours. At daybreak, the crew were retrieved by helicopter"',
        ),
        report(
          '12.3.1, Command Module Location and Retrieval',
          '12-4',
          213,
          '"appeared as a streak on the night sky", "the spacecraft was observed descending on the main parachutes in predawn twilight", and "The crew was retrieved and onboard the Princeton 39 minutes after landing"',
        ),
        nmc(
          '"The splashdown point was 15 deg 2 min S, 164 deg 39 min W, 400 miles east of American Samoa"',
        ),
      ],
      photo: nasaPhoto(
        'S69-36593',
        1048,
        1600,
        'The three Apollo 10 astronauts in blue flight suits stand in the doorway of a Navy helicopter at the top of a red-carpeted stairway on the deck of the USS Princeton, one of them waving. A man in a white shirt stands at the foot of the stairs.',
      ),
      view: 'earth',
      keyMoment: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Command module Charlie Brown',
        museum: 'Science Museum',
        place: 'London, England',
      },
      citations: [
        {
          source: 'nssdca-apollo-current-locations',
          locator: 'Apollo 10, Command Module "Charlie Brown": "Science Museum, London, England"',
        },
        nasm(
          'Object description: "in 1978 the spacecraft was place on loan to the London Science Museum, where it has remained on public display"',
        ),
        nmc(
          `"The Apollo 10 Command Module "Charlie Brown" is on display at the Science Museum, London, England"`,
        ),
      ],
    },
  ],
};
