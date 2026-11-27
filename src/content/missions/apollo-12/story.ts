/**
 * Apollo 12: the second crewed lunar landing, a pinpoint landing beside the
 * robot lander Surveyor 3, November 14-24, 1969.
 *
 * Event times are copied from Apollo by the Numbers (NASA SP-2000-4029),
 * Apollo 12 Timeline, exactly as printed, and UTC from that table's GMT
 * columns, wherever they agree with the Apollo 12 Mission Report's Table 5-I
 * or Table 5-III to its rounding. Where the two differ, we follow the
 * Mission Report, the more primary source, and the `discrepancy` field gives
 * the timeline's value. The visit to Surveyor 3 is timed only to the minute,
 * so its seconds are 00 and the text says "about".
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (16:22:00 GMT, "the integral second before lift-off", Mission Report
 * Section 2.0). Liftoff itself came 0.68 seconds later.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers, feet
 * to meters, pounds to kilograms) and Eastern times worked out from GMT are
 * our arithmetic on the cited values. So is writing durations of a minute or
 * more as minutes and seconds: the source's 341.3 seconds is "5 minutes
 * 41.3 seconds" here.
 *
 * The flight path itself (orbits, burns, landing and splashdown points) is
 * described in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const ABTN_SUMMARY = `${ABTN}Apollo_12a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_12i_Timeline.htm`;
const ABTN_OBJECTIVES = `${ABTN}Apollo_12b_Objectives.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-03_Crew_Information_-_Lunar_Landings.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_LM_LANDING = `${ABTN}Apollo_18-27_LM_Lunar_Landing.htm`;
const ABTN_EVA = `${ABTN}Apollo_18-30_Extravehicular_Activity.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;
const MISSION_REPORT =
  'https://web.archive.org/web/20251203061616/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a12/A12_MissionReport.pdf';
const NMC_CSM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099A';
const NMC_LM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C';

/** A section of the Apollo by the Numbers Apollo 12 mission summary. */
function summary(section: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 12 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 12 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 12 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the statistical tables in Apollo by the Numbers. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `"${name}" table, ${rows}`,
    url,
  };
}

/** The Apollo by the Numbers Apollo 12 Objectives page. */
function objectives(what: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 12 Objectives, ${what}`,
    url: ABTN_OBJECTIVES,
  };
}

/** A row of the Mission Report's Table 5-I, Sequence of Events (pages 5-1 and 5-2, PDF pages 83 and 84). */
function sequence(row: string, page: '5-1' | '5-2'): Citation {
  return {
    source: 'apollo-12-mission-report',
    locator: `Table 5-I, "Sequence of Events" (page ${page}, PDF page ${page === '5-1' ? 83 : 84}), "${row}" row`,
    url: MISSION_REPORT,
  };
}

/** A passage of the Mission Report, by section, printed page, and PDF page. */
function report(section: string, page: string, pdfPage: number, what: string): Citation {
  return {
    source: 'apollo-12-mission-report',
    locator: `Section ${section} (page ${page}, PDF page ${pdfPage}): ${what}`,
    url: MISSION_REPORT,
  };
}

/** An NSSDCA Master Catalog spacecraft page: the command and service module or the lunar module. */
function nmc(page: 'csm' | 'lm', section: string): Citation {
  return page === 'csm'
    ? {
        source: 'nssdca-master-catalog',
        locator: `"Apollo 12 Command and Service Module (CSM)" (1969-099A), ${section}`,
        url: NMC_CSM,
      }
    : {
        source: 'nssdca-master-catalog',
        locator: `"Apollo 12 Lunar Module / ALSEP" (1969-099C), ${section}`,
        url: NMC_LM,
      };
}

/** NASA's "Apollo 12: The Pinpoint Mission" page. */
function pinpoint(what: string): Citation {
  return { source: 'nasa-apollo-12-pinpoint-mission', locator: what };
}

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-12/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-12/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: 'NASA',
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

const NMC_DIFFERS = "NSSDCA's Master Catalog page for the Apollo 12";

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: 'apollo-12',
  program: 'apollo',
  name: 'Apollo 12',
  kind: 'flight',
  destination: 'moon',

  summary: {
    text: {
      short:
        'Apollo 12 was the second mission to land people on the Moon. In November 1969, Pete Conrad and Alan Bean landed within walking distance of a robot spacecraft, Surveyor 3, while Richard Gordon orbited above.',
      more: 'Apollo 12 launched from Kennedy Space Center on November 14, 1969, in the rain, and was struck by lightning twice in its first minute. On November 19, Conrad and Bean landed the lunar module Intrepid in the Ocean of Storms, 535 feet from Surveyor 3, which had been there since April 1967. Gordon stayed in lunar orbit aboard the command module Yankee Clipper. On two moonwalks, the astronauts set up a station of science instruments, gathered rock and soil, and cut parts off Surveyor 3 to bring home. All three splashed down in the Pacific Ocean on November 24.',
    },
    citations: [
      summary('Background'),
      summary('Ascent Phase'),
      summary('Lunar Orbit/Lunar Surface Phase'),
      summary('Recovery'),
      nmc('csm', 'Description'),
      report(
        '1.0, Summary',
        '1-1',
        7,
        '"lightning striking the space vehicle at 36.5 seconds and 52 seconds"; "The Apollo 12 landing point was 535 feet from the Surveyor III"',
      ),
    ],
  },

  crew: {
    value: [
      { name: 'Charles "Pete" Conrad Jr.', role: 'Commander' },
      { name: 'Richard F. Gordon Jr.', role: 'Command module pilot' },
      { name: 'Alan L. Bean', role: 'Lunar module pilot' },
    ],
    citations: [
      summary('Background'),
      report(
        '1.0, Summary',
        '1-1',
        7,
        '"a crew of Charles Conrad, Jr., Commander; Richard F. Gordon, Command Module Pilot; and Alan L. Bean, Lunar Module Pilot"',
      ),
      table(
        'Crew Information - Lunar Landing Missions',
        'Apollo 12 column: Commander, Command Module Pilot, and Lunar Module Pilot rows',
        ABTN_CREW,
      ),
    ],
  },
  crewPhoto: nasaPhoto(
    'S69-38852',
    960,
    1200,
    'From left, Charles "Pete" Conrad Jr., Richard F. Gordon Jr., and Alan L. Bean stand in white spacesuits in front of a silver lunar module, with gold-colored science equipment on the gravel at their feet.',
  ),

  launch: {
    value: {
      utc: '1969-11-14T16:22:00Z',
      site: 'Launch Complex 39, Pad A, Kennedy Space Center, Florida',
      vehicle: 'Saturn V (SA-507)',
    },
    citations: [
      summary('Ascent Phase'),
      summary('Background'),
      timeline('Range zero.'),
      report(
        '2.0, Introduction',
        '2-1',
        9,
        '"Range zero for this mission was 16:22:00 G.m.t., November 14, 1969"',
      ),
      nmc(
        'csm',
        'Mission Profile: "Saturn V SA-507 on 14 November 1969 at 16:22:00 UT (11:22:00 a.m. EST) from Pad 39A at Kennedy Space Center"',
      ),
    ],
  },

  duration: {
    value: '244:36:25',
    citations: [
      summary('Recovery'),
      table(
        'Entry, Splashdown, and Recovery',
        'Apollo 12 column: Earth Splashdown, GET row',
        ABTN_ENTRY,
      ),
      sequence('Landing', '5-2'),
    ],
    discrepancy: `${NMC_DIFFERS} command and service module gives a mission elapsed time of 244 hours 36 minutes 24 seconds. Apollo by the Numbers and the Mission Report give 244:36:25, which we follow.`,
  },

  callSigns: {
    value: [
      { craft: 'Command module', name: 'Yankee Clipper' },
      { craft: 'Lunar module', name: 'Intrepid' },
    ],
    citations: [
      table('Call Signs', 'Apollo 12 row: Command Module and Lunar Module', ABTN_CALL_SIGNS),
      summary('Background'),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          'Apollo 12 proved that astronauts could land at a chosen spot on the Moon. Intrepid came down just 535 feet (163 meters) from Surveyor 3.',
        more: 'Apollo 11 had come down 22,500 feet (about 4.3 miles, or 6.9 kilometers) west of the center of its landing area. Landing on target was needed before later crews could be sent to rougher places that scientists most wanted to explore. Crew training, careful planning, and navigation updates sent from the ground just before and during the descent made the precision possible.',
      },
      citations: [
        summary('Conclusions'),
        objectives(
          'Spacecraft Primary Objectives, 3: "To develop techniques for a point landing capability. Achieved."',
        ),
        table(
          'LM Lunar Landing',
          'Apollo 11 and Apollo 12 columns, "LM Distance To Target (ft)" row',
          ABTN_LM_LANDING,
        ),
        report(
          '1.0, Summary',
          '1-1',
          7,
          '"This mission demonstrated the capability for a precision landing, a requirement for proceeding to more specific and rougher lunar surface locations having particular scientific interest"',
        ),
        report(
          '5.0, Trajectory',
          '5-7',
          89,
          '"these last-minute updates in the state vector and landing site location could be made, a procedure which is largely responsible for the precision with which the landing was performed"',
        ),
      ],
    },
    {
      text: {
        short:
          'The astronauts set up the first Apollo Lunar Surface Experiments Package, a station of science instruments that sent measurements from the Moon to Earth for almost eight years.',
        more: "Its instruments included a seismometer to feel moonquakes, a magnetometer to measure the Moon's magnetic field, and detectors for the solar wind and for the Moon's very thin atmosphere. A small nuclear generator, which turned the heat of decaying plutonium-238 into electricity, powered it. The station was turned on on November 19, 1969, and shut down by command from Earth, with the other Apollo stations, on September 30, 1977.",
      },
      citations: [
        objectives(
          'Spacecraft Primary Objectives, 2: "To deploy the ALSEP consistent with a seismic event. Achieved." (S-031 to S-058)',
        ),
        summary('Conclusions'),
        nmc(
          'lm',
          'Apollo Lunar Surface Experiments Package (ALSEP), Radioisotope Thermoelectric Generator (RTG), and ALSEP Scientific Instruments',
        ),
        timeline('ALSEP central station turned off by ground command.'),
      ],
    },
    {
      text: {
        short:
          'They brought home pieces of Surveyor 3, including its television camera, so scientists could see what two and a half years on the Moon had done to them.',
        more: "The parts, about 10 kilograms (22 pounds) in all, were the camera, the soil scoop, a cable, and two pieces of tubing. On Earth, scientists studied the camera's gears, motors, optics, metals, and lubricants to learn how long exposure on the Moon affects them.",
      },
      citations: [
        nmc(
          'lm',
          'Mission Profile: "visited the Surveyor 3 spacecraft, bringing back about 10 kg of parts for later examination on Earth"',
        ),
        nmc(
          'csm',
          'Description: "the nearby Surveyor 3 spacecraft which had landed on the Moon 2 1/2 years earlier"',
        ),
        report(
          '3.0, Lunar Surface Exploration',
          '3-2',
          11,
          '"Photographed the Surveyor III and retrieved from it a cable, a painted tube, an unpainted tube, the television camera, and the scoop"',
        ),
        pinpoint(
          'Mission Highlights: "so that extensive studies could be performed on Earth of its gears, motors, optics, metals and lubricants. This would help determine the long-term effects of exposure to the elements."',
        ),
      ],
    },
    {
      text: {
        short:
          'Conrad and Bean made two moonwalks, spending 7 hours 45 minutes 18 seconds outside, and brought back 75.73 pounds (34.35 kilograms) of Moon rocks and soil.',
        more: 'Together they walked about 7,600 feet (2.3 kilometers) and went as far as 1,350 feet (411 meters) from Intrepid. They moved easily in their suits, their backpacks worked very well, and NASA concluded that a longer program of work on the surface was within what the crew and their life support could handle.',
      },
      citations: [
        summary('Lunar Orbit/Lunar Surface Phase'),
        summary('Conclusions'),
        table(
          'Extravehicular Activity',
          'Apollo 12 column: Total Lunar Surface EVA, Total Duration, Total Distance Traveled, and Total Samples Collected (lbm) rows, and Maximum Distance Traveled From LM (ft)',
          ABTN_EVA,
        ),
        nmc('lm', 'Mission Profile: "They collected a total of 34.35 kg of rock and soil samples"'),
      ],
      discrepancy:
        'The Mission Report gives "Approximately 74.7 pounds of lunar material" and a "7-hour 46-minute extravehicular period" (Section 1.0, page 1-2, PDF page 8). We follow Apollo by the Numbers: its 34.35 kilograms is the official total as determined by the Lunar Receiving Laboratory in Houston, and NSSDCA\'s Master Catalog gives the same.',
    },
  ],

  chapters: [
    { id: 'launch', title: 'Launch' },
    { id: 'outbound', title: 'To the Moon' },
    { id: 'landing', title: 'Landing' },
    { id: 'surface', title: 'On the Moon' },
    { id: 'return', title: 'Coming home' },
  ],

  events: [
    /* ---------------------------- Launch ---------------------------- */
    {
      id: 'liftoff',
      handsOn: 'stages',
      title: 'Liftoff',
      chapter: 'launch',
      elapsed: '000:00:00.68',
      utc: '1969-11-14T16:22:00Z',
      text: {
        short:
          'A Saturn V rocket lifts Apollo 12 off its launch pad in Florida, up into rain and thick gray clouds.',
        more: 'Apollo 12 lifted off from Launch Complex 39, Pad A, at Kennedy Space Center at 11:22 a.m. Eastern Standard Time on November 14, 1969. Its crew, all three of them Navy officers, were Charles "Pete" Conrad, commander; Richard Gordon, command module pilot; and Alan Bean, lunar module pilot. It was the first Saturn rocket launched in a rainstorm, with clouds covering the whole sky. Two days before, a leak had been found in one of the service module\'s hydrogen tanks; it was replaced with a tank from the Apollo 13 spacecraft, and the launch was not delayed.',
      },
      citations: [
        timeline('Liftoff (umbilical disconnected).'),
        sequence('Lift-off', '5-1'),
        summary('Background'),
        summary('Launch Preparations'),
        summary('Ascent Phase'),
        report(
          '14.1.2, Hydrogen Tank Leakage',
          '14-2',
          219,
          '"During cryogenic loading about 51 hours before launch, the heat leak of hydrogen tank 2 was unacceptable ... The tank was removed and replaced"',
        ),
      ],
      photo: nasaPhoto(
        'S69-58883',
        1142,
        1600,
        'The white Saturn V rocket rises beside its red launch tower on a column of white smoke and flame, against a dark sky.',
      ),
      view: 'earth',
      keyMoment: true,
    },
    {
      id: 'lightning',
      title: 'Struck by lightning',
      chapter: 'launch',
      elapsed: '000:00:36.5',
      utc: '1969-11-14T16:22:36Z',
      text: {
        short:
          'Lightning strikes the rocket twice in its first minute. Many warning lights come on in the spacecraft, but the rocket keeps climbing, and the crew soon gets the power back.',
        more: "The first strike, 36.5 seconds after liftoff, ran from the clouds to the ground through the rocket; the second, at 52 seconds, went from cloud to cloud. The rocket had set them off itself as it climbed through strong electric fields in the clouds. The service module's fuel cells, which made electricity from hydrogen and oxygen, were cut off, and its batteries carried the load until the crew put the fuel cells back on line 2 minutes 22 seconds into the flight. The rocket came through without significant harm, and the mission went on.",
      },
      citations: [
        timeline('1st electrical disturbance (lightning).'),
        timeline('2nd electrical disturbance (lightning).'),
        timeline('Fuel cell power restored to buses.'),
        summary('Ascent Phase'),
        report(
          '1.0, Summary',
          '1-1',
          7,
          '"lightning striking the space vehicle at 36.5 seconds and 52 seconds"',
        ),
        report(
          '14.1.3, Electrical Potential Discharges',
          '14-2',
          219,
          '"The first, at 36.5 seconds after lift-off, was from the clouds to earth through the vehicle. The second discharge involving the vehicle occurred at 52 seconds and was from cloud to cloud."',
        ),
        report(
          '14.1.3, Electrical Potential Discharges',
          '14-4',
          221,
          '"attributes the lightning to the presence of the vehicle, as it passed through electric fields sufficient in intensity and energy to trigger each discharge"',
        ),
        nmc(
          'csm',
          'Spacecraft and Subsystems, Service Module: "The six sections of the SM held three 31-cell hydrogen oxygen fuel cells which provided 28 volts"',
        ),
        report(
          '14.1.3, Electrical Potential Discharges',
          '14-6',
          223,
          '"the main bus loads of 75 amperes were being supplied totally by entry batteries A and B"; "At 2 minutes 22 seconds into the flight, the crew restored fuel cell power to the buses"',
        ),
        {
          source: 'apollo-12-technical-transcript',
          locator:
            'Tape 1/2, page 2 (PDF page 5): CDR, "Think we need to do a little more all-weather testing." at 00 00 03 17, and CC, "Amen." at 00 00 03 19',
        },
      ],
      discrepancy:
        'Apollo by the Numbers\' mission summary (Ascent Phase) says the first discharge was triggered by the vehicle and that the second "may have been due to a lesser lightning discharge." We follow the Mission Report (Section 14.1.3, page 14-4), which attributes both discharges to the vehicle\'s presence.',
      // NASA's file "Apollo 12: All Weather Testing"
      // (584852main_Apollo-12_All-Weather-Testing.mp3), all of it, 0 to 4.44
      // seconds, shipped unchanged. afinfo only estimates its length (4.49
      // seconds); decoded, by afconvert and by Chrome, it is 4.44. The
      // transcript times Conrad's words at 00 00 03 17, once the power was
      // back after the lightning.
      audio: {
        src: 'media/apollo-12/all-weather-testing.mp3',
        seconds: 4.44,
        transcript: [
          {
            speaker: 'Pete Conrad',
            words: 'Think we need to do a little more all-weather testing.',
          },
          { speaker: 'Mission Control', words: 'Amen.' },
        ],
        credit: 'NASA',
        sourceUrl: 'https://www.nasa.gov/historical-sounds/',
      },
      view: 'earth',
      keyMoment: true,
    },

    /* --------------------------- To the Moon -------------------------- */
    {
      id: 'translunar-injection',
      title: 'Burn toward the Moon',
      chapter: 'outbound',
      elapsed: '002:47:22.7',
      utc: '1969-11-14T19:09:22Z',
      text: {
        short:
          "After a careful check of the spacecraft in Earth orbit, the rocket's third stage fires again for almost 6 minutes and sends Apollo 12 on its way to the Moon.",
        more: 'This firing, translunar injection, began 2 hours 47 minutes after launch, after one and a half trips around Earth, and lasted 5 minutes 41.3 seconds. It aimed Apollo 12 on a free-return path, one that would carry the spacecraft around the Moon and home with only small thruster firings. A course correction the next day, at 30 hours 52 minutes, moved it off that path, the first time an Apollo crew had done so, onto a "hybrid" path that allowed a daylight launch and saved fuel for the main engine.',
      },
      citations: [
        report(
          '5.0, Trajectory',
          '5-6',
          88,
          'Table 5-IV, "Translunar Maneuver Summary": translunar injection, ignition 2:47:22.7, firing time 341.3 seconds',
        ),
        sequence('Translunar injection maneuver', '5-1'),
        timeline('S-IVB 2nd burn ignition.'),
        summary('Earth Orbit Phase'),
        summary('Translunar Phase'),
        report(
          '5.0, Trajectory',
          '5-4',
          86,
          '"For the first time, the S-IVB was targeted for a high-pericynthion free-return translunar profile ... the spacecraft was then intentionally placed on a non-free-return trajectory"; "A free return profile, as used here, is a translunar trajectory that will achieve satisfactory earth entry within the reaction-control velocity correction capability"',
        ),
        sequence('First midcourse correction', '5-2'),
        report(
          '1.0, Summary',
          '1-1',
          7,
          '"A non-free-return translunar trajectory profile was used for the first time in the Apollo 12 mission"',
        ),
        pinpoint(
          'Mission Highlights: "This first non-free-return trajectory on an Apollo mission was designed to allow a daylight launch and a translunar injection above the Pacific Ocean"',
        ),
      ],
      discrepancy:
        "The Apollo by the Numbers Apollo 12 Timeline and Earth Orbit Phase table give ignition at 002:47:22.80 and a 341.14-second burn (5 minutes 41.14 seconds). We follow the Mission Report's Tables 5-III and 5-IV: 2:47:22.7 and 341.3 seconds.",
      view: 'journey',
    },
    {
      id: 'lunar-orbit-insertion',
      title: 'Into orbit around the Moon',
      chapter: 'outbound',
      elapsed: '083:25:23.36',
      utc: '1969-11-18T03:47:23Z',
      text: {
        short:
          'On the far side of the Moon, the spacecraft Yankee Clipper fires its main engine for almost 6 minutes to slow down and go into orbit around the Moon.',
        more: 'The firing began 83 hours 25 minutes after launch and lasted 5 minutes 52.25 seconds, putting Apollo 12 in an orbit 168.8 by 62.6 nautical miles above the Moon (about 194 by 72 miles, or 313 by 116 kilometers). The coast from translunar injection to the end of this firing had lasted 80 hours 38 minutes 1.67 seconds. Two trips around later, a second, 16.91-second firing made the orbit nearly round.',
      },
      citations: [
        timeline('Lunar orbit insertion ignition.'),
        timeline('Lunar orbit circularization ignition.'),
        sequence('Lunar orbit insertion', '5-2'),
        summary('Translunar Phase'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        {
          source: 'apollo-12-mission-report',
          locator:
            'Table 5-VI, "Lunar Orbit Maneuver Summary" (page 5-9, PDF page 91), "Lunar orbit insertion" row: resultant orbit 168.8 by 62.6 miles',
          url: MISSION_REPORT,
        },
        pinpoint(
          'Mission Highlights: "when Apollo 12 went behind the moon at about 97 miles up, the first lunar orbit insertion burn began"',
        ),
      ],
      discrepancy:
        "Apollo by the Numbers (Apollo 12 mission summary, Translunar Phase, and Lunar Orbit Phase table) gives the orbit as 170.20 by 61.66 nautical miles. We follow the Mission Report's Table 5-VI, 168.8 by 62.6.",
      view: 'moon',
    },

    /* ----------------------------- Landing ---------------------------- */
    {
      id: 'undocking',
      title: 'Intrepid undocks',
      chapter: 'landing',
      elapsed: '107:54:02.3',
      utc: '1969-11-19T04:16:02Z',
      text: {
        short:
          'Conrad and Bean, now inside the lunar module Intrepid, undock from Yankee Clipper. Richard Gordon stays behind, circling the Moon alone.',
        more: "Undocking came 107 hours 54 minutes after launch, on November 19. About half an hour later, a short thruster firing moved Yankee Clipper away. Behind the Moon, at 109 hours 23 minutes, Intrepid's descent engine fired for 29 seconds to lower its orbit for the landing.",
      },
      citations: [
        timeline('CSM/LM undocked.'),
        timeline('CSM/LM separation maneuver ignition.'),
        timeline('LM descent orbit insertion ignition (SPS).'),
        sequence('Undocking', '5-2'),
        {
          source: 'apollo-12-mission-report',
          locator:
            'Table 5-VI, "Lunar Orbit Maneuver Summary" (page 5-9, PDF page 91), "Command module/lunar module separation" row: command module reaction control, 108:24:36.8, 14.4 seconds',
          url: MISSION_REPORT,
        },
        summary('Lunar Orbit/Lunar Surface Phase'),
        nmc(
          'csm',
          'Description: "the Command and Service Module (CSM) (with CM pilot Richard F. Gordon) continued in lunar orbit"',
        ),
        pinpoint(
          'Mission Highlights: "with the LM behind the moon in the 14th orbit, and some 109 hours, 23 minutes into the mission, the descent orbit insertion maneuver began. The LM decent engine, or LMDE, fired for 29 seconds"',
        ),
      ],
      discrepancy: `${NMC_DIFFERS} lunar module gives undocking as 04:16:03 UT. Apollo by the Numbers gives 04:16:02 GMT (107:54:02.3), agreeing with the Mission Report's 107:54:02, which we follow.`,
      photo: nasaPhoto(
        'as12-51-7507',
        1591,
        1600,
        'The lunar module Intrepid, gold and silver with its four landing legs spread, flies in black space above the gray, cratered surface of the Moon, photographed from Yankee Clipper in lunar orbit after the two had moved apart.',
      ),
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'landing',
      title: 'Landing next to Surveyor',
      chapter: 'landing',
      elapsed: '110:32:36.2',
      utc: '1969-11-19T06:54:36Z',
      text: {
        short:
          'Intrepid lands in the Ocean of Storms, so close to its target that the robot lander Surveyor 3 sits in a crater just 535 feet (163 meters) away.',
        more: 'Touchdown came at 1:54:36 a.m. Eastern Standard Time on November 19. Early in the descent, Mission Control saw that Intrepid was heading about 4,200 feet (1,280 meters) past its target and sent its computer a corrected landing point. Conrad steered partly by hand for the last 500 feet of the descent, and in the last seconds dust blown up by the engine hid the ground completely. He set Intrepid down about 25 feet from the edge of a crater, with about 1 minute 43 seconds of engine firing time left. Surveyor 3 had landed there on April 20, 1967.',
      },
      citations: [
        timeline('LM lunar landing.'),
        timeline('Lunar dust completely obscured landing site.'),
        sequence('Lunar landing', '5-2'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'LM Lunar Landing',
          'Apollo 12 column: "Hover Time Remaining (sec)" (103), "KSC Time", "GMT Time", and "LM Distance To Target (ft)" ("535 ft NW of Surveyor III") rows',
          ABTN_LM_LANDING,
        ),
        report(
          '1.0, Summary',
          '1-1',
          7,
          '"The spacecraft touched down at 110:32:36 in the Ocean of Storms"; "a precision landing near the Surveyor III spacecraft, which had landed on April 20, 1967. The Apollo 12 landing point was 535 feet from the Surveyor III"',
        ),
        report(
          '5.0, Trajectory',
          '5-7',
          89,
          '"A revised landing site location was also transmitted to the lunar module guidance computer soon after powered descent initiation ... to correct for a 4200-foot downrange error which had been observed from ground tracking data"',
        ),
        pinpoint(
          'Mission Highlights: "update the automatic downrange navigation computer program, shortening the range by 4,190 feet and permitting the precision touchdown at the intended site"; and "With Conrad controlling the descent semi-manually for the last 500 feet, a precision landing occurred"',
        ),
      ],
      discrepancy:
        "NSSDCA's Master Catalog gives the landing as 06:54:35 UT, within about 180 meters of Surveyor 3. Apollo by the Numbers gives 06:54:36 GMT and 535 feet, agreeing with the Mission Report, which we follow. NASA's Apollo 12 page gives the correction as 4,190 feet; the Mission Report gives 4,200. NASA's Image and Video Library caption for AS12-48-7134 dates Surveyor 3's landing April 19, 1967; Apollo by the Numbers, the Mission Report, and NSSDCA give April 20.",
      view: 'moon',
      keyMoment: true,
    },

    /* ---------------------------- On the Moon --------------------------- */
    {
      id: 'first-moonwalk',
      title: 'The first moonwalk',
      chapter: 'surface',
      elapsed: '115:10:35',
      utc: '1969-11-19T11:32:35Z',
      text: {
        short:
          'Conrad climbs down the ladder onto the Moon, and Bean soon follows. They set up science instruments that will send measurements to Earth for years.',
        more: 'Conrad started out of the hatch 115 hours 10 minutes after launch, at 6:32 a.m. Eastern time, and was on the surface about 12 minutes later. He found the soil soft and loose, and his boots dug in as he walked. Bean joined him at 115 hours 51 minutes. The color television camera stopped working soon after it was accidentally pointed at the Sun. The two set up the science station 600 to 700 feet (183 to 213 meters) from Intrepid, and its seismometer picked up their footsteps as they walked back. They were outside for 3 hours 56 minutes 3 seconds.',
      },
      citations: [
        timeline('1st EVA started (egress).'),
        timeline('CDR on lunar surface. Environmental familiarization.'),
        timeline('LMP on lunar surface.'),
        sequence('First extravehicular egress', '5-2'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'Extravehicular Activity',
          'Apollo 12 column: First Surface EVA, Duration row',
          ABTN_EVA,
        ),
        nmc(
          'lm',
          'Mission Profile: "The first was from 11:32:35 to 15:28:38 UT (6:32 a.m. to 10:28 a.m. EST)"; "The TV camera was inadvertantly pointed towards the Sun when it was being set up and the vidicon tube was damaged rendering the camera inoperable"',
        ),
      ],
      view: 'moon',
    },
    {
      id: 'surveyor-3',
      title: 'A visit to Surveyor 3',
      chapter: 'surface',
      elapsed: '133:53:00',
      utc: '1969-11-20T06:15:00Z',
      text: {
        short:
          'On their second moonwalk, Conrad and Bean walk into a crater to visit Surveyor 3, a robot lander that has been on the Moon for two and a half years. They cut off its camera and other parts to bring home.',
        more: 'They reached Surveyor 3 about 133 hours 53 minutes after launch. It stood on a slope of about 12 degrees, coated in a fine, clinging dust, and the whole spacecraft looked brown. The marks its footpads had made in landing were still in the soil. The astronauts photographed it and took its television camera, its soil scoop, a cable, and two pieces of tubing. The second moonwalk lasted 3 hours 49 minutes 15 seconds and covered about 4,300 feet (1.3 kilometers).',
      },
      citations: [
        timeline('Surveyor spacecraft inspected (CDR, LMP).'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'Extravehicular Activity',
          'Apollo 12 column: Second Surface EVA, Duration and Total Distance Traveled rows',
          ABTN_EVA,
        ),
        report(
          '3.0, Lunar Surface Exploration',
          '3-2',
          11,
          '"Photographed the Surveyor III and retrieved from it a cable, a painted tube, an unpainted tube, the television camera, and the scoop"',
        ),
        report(
          '9.10.6, Surveyor Inspection',
          '9-14 and 9-15',
          166,
          '"The Surveyor was sitting on a slope of approximately 12 degrees. All components were covered with a very tenacious dust" (continued on PDF page 167)',
        ),
        nmc(
          'csm',
          'Description: "the nearby Surveyor 3 spacecraft which had landed on the Moon 2 1/2 years earlier"',
        ),
        pinpoint(
          'Mission Highlights: "entering the 650-foot-wide Surveyor Crater to retrieve parts of Surveyor III"',
        ),
      ],
      photo: nasaPhoto(
        'AS12-48-7134',
        1600,
        1600,
        'Black-and-white photo of an astronaut in a white spacesuit reaching out to the camera of Surveyor 3, a spindly robot lander with a tilted flat panel on a mast, on the gray slope of a crater. The lunar module Intrepid stands on the horizon behind them.',
      ),
      view: 'moon',
      keyMoment: true,
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: 'lunar-liftoff',
      title: 'Leaving the Moon',
      chapter: 'return',
      elapsed: '142:03:47.78',
      utc: '1969-11-20T14:25:47Z',
      text: {
        short:
          "Intrepid's top half launches off the Moon and catches up with Yankee Clipper. Later, the empty top half is crashed into the Moon on purpose, so the moonquake detector the crew left behind can feel it.",
        more: 'The ascent engine fired 142 hours 3 minutes after launch, after 31 hours 31 minutes 11.6 seconds on the surface, and Intrepid docked with Yankee Clipper at 145 hours 36 minutes. Once the crew and samples were aboard, the ascent stage was cast off and steered by remote control into the Moon about 40 nautical miles (74 kilometers) from the landing site. The seismometer felt strong shaking for more than half an hour: the first moonquake made on purpose and recorded. About a day later, after 45 trips around the Moon, Yankee Clipper fired its main engine at 172 hours 27 minutes to head home.',
      },
      citations: [
        timeline('LM lunar liftoff ignition (LM APS).'),
        timeline('CSM/LM docked.'),
        timeline('LM ascent stage jettisoned.'),
        timeline('Transearth injection ignition (SPS).'),
        sequence('Lunar lift-off', '5-2'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        report(
          '5.0, Trajectory',
          '5-8',
          90,
          '"The spacecraft impacted approximately 40 miles east-southeast of the Apollo landing site"',
        ),
        nmc(
          'lm',
          'Mission Profile: "the LM was jettisoned at 20:21:30 and intentionally crashed into the Moon ... creating the first recorded artificial moonquake"',
        ),
        pinpoint('Mission Highlights: "strong signals lasted for more than a half hour"'),
      ],
      discrepancy: `${NMC_DIFFERS} lunar module gives docking at 17:58:22 UT. Apollo by the Numbers gives 17:58:20 GMT (145:36:20.2), agreeing with the Mission Report's 145:36:20, which we follow. Apollo by the Numbers puts the impact 39 nautical miles from the landing site; the Mission Report says approximately 40.`,
      view: 'moon',
    },
    {
      id: 'splashdown',
      title: 'Splashdown',
      chapter: 'return',
      elapsed: '244:36:25',
      utc: '1969-11-24T20:58:25Z',
      text: {
        short:
          'The command module splashes down hard in the Pacific Ocean near American Samoa. A helicopter carries the crew to the recovery ship USS Hornet.',
        more: 'Splashdown came at 3:58:25 p.m. Eastern Standard Time on November 24, 3.91 nautical miles (about 4.5 miles, or 7.2 kilometers) from the Hornet. The sea was rough, and the jolt of about 15 g knocked a 16-millimeter film camera loose; it struck Bean above his right eye. The crew were aboard the Hornet 60 minutes after splashdown and went straight into a mobile quarantine facility, a precaution against any germs from the Moon.',
      },
      citations: [
        timeline('Splashdown (went to apex-down).'),
        sequence('Landing', '5-2'),
        summary('Recovery'),
        table(
          'Entry, Splashdown, and Recovery',
          'Apollo 12 column: Earth Splashdown GET, KSC Time, Distance To Recovery Ship (n mi), and Recovery Ship rows',
          ABTN_ENTRY,
        ),
        nmc(
          'csm',
          'Mission Profile: "The splashdown point was 15 deg 47 min S, 165 deg 9 min W, near American Samoa"',
        ),
        report(
          '1.0, Summary',
          '1-2',
          8,
          '"After landing, precautions to avoid lunar organism back-contamination were employed"',
        ),
      ],
      discrepancy: `${NMC_DIFFERS} command and service module gives splashdown as 20:58:24 UT and puts it 6.9 kilometers (4.3 miles) from the Hornet. Apollo by the Numbers gives 20:58:25 GMT and 3.91 nautical miles, agreeing with the Mission Report's 244:36:25, which we follow.`,
      view: 'earth',
      keyMoment: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Command module Yankee Clipper',
        museum: 'Virginia Air and Space Center',
        place: 'Hampton, Virginia',
      },
      citations: [
        {
          source: 'nssdca-apollo-current-locations',
          locator:
            'Apollo 12, Command Module "Yankee Clipper": "Virginia Air and Space Center, Hampton, Virginia"',
        },
        nmc(
          'csm',
          'Mission Profile: "The Apollo 12 Command Module "Yankee Clipper" is on display at the Virginia Air and Space Center in Hampton, Virginia"',
        ),
        {
          source: 'nasm-apollo-12-command-module',
          locator:
            'Display Status: "This object is not on display at the National Air and Space Museum. It is either on loan or in storage."; and "NASA transferred the Apollo 12 capsule to the Smithsonian Institution in 1973"',
        },
      ],
    },
  ],
};
