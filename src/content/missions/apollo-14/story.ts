/**
 * Apollo 14: the third crewed lunar landing, at Fra Mauro, January 31 to
 * February 9, 1971.
 *
 * Event times are copied from Apollo by the Numbers (NASA SP-2000-4029),
 * Apollo 14 Timeline, exactly as printed, and UTC from that table's GMT
 * columns. They agree with the Apollo 14 Mission Report's Table 6-I, which
 * rounds to the second. Where another source gives a different value, the
 * `discrepancy` field says what it gives and which we follow.
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (21:03:02 GMT on January 31, 1971, "the integral second before lift-off",
 * Mission Report Section 2.0). Liftoff itself came 0.57 seconds later. At
 * 54:53:36 the crew's onboard clock was moved ahead by 40 minutes 2.90
 * seconds to match the flight plan after the launch delay; the times here,
 * like those in both sources, do not include that change.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers),
 * Eastern times worked out from GMT, and writing durations of a minute or
 * more as minutes and seconds (the source's 370.84 seconds is "6 minutes
 * 10.84 seconds" here) are our arithmetic on the cited values.
 *
 * The flight path itself (orbits, burns, landing and splashdown points) is
 * described in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const ABTN_SUMMARY = `${ABTN}Apollo_14a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_14i_Timeline.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-03_Crew_Information_-_Lunar_Landings.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_LM_LANDING = `${ABTN}Apollo_18-27_LM_Lunar_Landing.htm`;
const ABTN_EVA = `${ABTN}Apollo_18-30_Extravehicular_Activity.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;
const MISSION_REPORT =
  'https://web.archive.org/web/20251201235420/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a14/A14MRntrs.pdf';

const NMC_CSM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-008A';
const NMC_LM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-008C';

/** A section of the Apollo by the Numbers Apollo 14 mission summary. */
function summary(section: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 14 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 14 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 14 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the statistical tables in Apollo by the Numbers, Apollo 14 column. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `"${name}" table, Apollo 14 column: ${rows}`,
    url,
  };
}

/** A row of the Mission Report's Table 6-I, Sequence of Events (page 6-2, PDF page 45). */
function sequence(row: string): Citation {
  return {
    source: 'apollo-14-mission-report',
    locator: `Table 6-I, "Sequence of Events" (page 6-2, PDF page 45), "${row}" row`,
    url: MISSION_REPORT,
  };
}

/** A passage of the Mission Report, by section, printed page, and PDF page. */
function report(section: string, page: string, pdfPage: number, what: string): Citation {
  return {
    source: 'apollo-14-mission-report',
    locator: `Section ${section} (page ${page}, PDF page ${pdfPage}): ${what}`,
    url: MISSION_REPORT,
  };
}

/** An NSSDCA Master Catalog spacecraft page: the command and service module or the lunar module. */
function nmc(page: 'csm' | 'lm', section: string): Citation {
  return page === 'csm'
    ? {
        source: 'nssdca-master-catalog',
        locator: `"Apollo 14 Command and Service Module (CSM)" (1971-008A), ${section}`,
        url: NMC_CSM,
      }
    : {
        source: 'nssdca-master-catalog',
        locator: `"Apollo 14 Lunar Module /ALSEP" (1971-008C), ${section}`,
        url: NMC_LM,
      };
}

/** The NASA Apollo 14 mission page. */
function nasaMission(what: string): Citation {
  return { source: 'nasa-apollo-14-mission', locator: what };
}

/** The Smithsonian record of the Apollo 14 command module. */
function nasm(what: string): Citation {
  return { source: 'nasm-apollo-14-command-module', locator: what };
}

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-14/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-14/${nasaId.toLowerCase()}.jpg`,
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
  id: 'apollo-14',
  program: 'apollo',
  name: 'Apollo 14',
  kind: 'flight',
  destination: 'moon',

  summary: {
    text: {
      short:
        'Apollo 14 was the third mission to land people on the Moon. In February 1971, Alan Shepard and Edgar Mitchell explored the hilly Fra Mauro highlands while Stuart Roosa orbited above.',
      more: 'Apollo 14 launched from Kennedy Space Center on January 31, 1971, after a weather delay of 40 minutes. On the way out, it took six tries to dock the command module Kitty Hawk with the lunar module Antares. On February 5, Shepard and Mitchell landed Antares at Fra Mauro, the site Apollo 13 had been meant to explore. On two moonwalks they set up science instruments, pulled a cart of tools and samples, and climbed to within about 50 feet of the rim of Cone Crater. The crew splashed down in the Pacific Ocean on February 9.',
    },
    citations: [
      summary('Background'),
      summary('Launch Preparations'),
      summary('Ascent Phase'),
      summary('Translunar Phase'),
      summary('Lunar Orbit/Lunar Surface Phase'),
      summary('Recovery'),
      nmc('csm', 'Description'),
      report(
        '1.0, Mission Summary',
        '1-2',
        9,
        '"they reached a point within approximately 50 feet of the rim of the crater"',
      ),
      report(
        '9.10.5, Lunar Surface Crew Equipment',
        '9-13',
        114,
        '"The modular equipment transporter was stable, easily pulled, and proved to be a very handy device for both extravehicular activities"',
      ),
    ],
  },

  crew: {
    value: [
      { name: 'Alan B. Shepard Jr.', role: 'Commander' },
      { name: 'Stuart A. Roosa', role: 'Command module pilot' },
      { name: 'Edgar D. Mitchell', role: 'Lunar module pilot' },
    ],
    citations: [
      summary('Background'),
      report(
        '1.0, Mission Summary',
        '1-1',
        8,
        '"manned by Alan Shepard, Jr., Commander; Stuart A. Roosa, Command Module Pilot; and Edgar D. Mitchell, Lunar Module Pilot"',
      ),
      table(
        'Crew Information - Lunar Landing Missions',
        'Commander, Command Module Pilot, and Lunar Module Pilot rows',
        ABTN_CREW,
      ),
    ],
  },
  crewPhoto: nasaPhoto(
    'S70-55635',
    1200,
    800,
    'From left, Edgar D. Mitchell, Alan B. Shepard Jr., and Stuart A. Roosa in white spacesuits, in front of a large Apollo 14 emblem on a starry backdrop.',
  ),

  launch: {
    value: {
      utc: '1971-01-31T21:03:02Z',
      site: 'Launch Complex 39, Pad A, Kennedy Space Center, Florida',
      vehicle: 'Saturn V (SA-509)',
    },
    citations: [
      summary('Ascent Phase'),
      summary('Background'),
      timeline('Range zero.'),
      report(
        '2.0, Introduction',
        '2-1',
        10,
        '"Range zero for this mission was 21:03:02 G.m.t., January 31, 1971"',
      ),
      nmc('csm', 'Mission Profile: "from pad 39A of Kennedy Space Center on Saturn V SA-509"'),
    ],
  },

  duration: {
    value: '216:01:58.1',
    citations: [
      summary('Recovery'),
      table('Entry, Splashdown, and Recovery', 'Earth Splashdown, GET row', ABTN_ENTRY),
      sequence('Landing'),
    ],
  },

  callSigns: {
    value: [
      { craft: 'Command module', name: 'Kitty Hawk' },
      { craft: 'Lunar module', name: 'Antares' },
    ],
    citations: [
      {
        source: 'apollo-by-the-numbers',
        locator: '"Call Signs" table, Apollo 14 row: Command Module and Lunar Module',
        url: ABTN_CALL_SIGNS,
      },
      summary('Background'),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          'Apollo 14 made the third Moon landing, in the hilly Fra Mauro highlands that Apollo 13 had been meant to explore.',
        more: "Its main goals were the same as Apollo 13's: to explore and sample a chosen part of the Fra Mauro formation, set up a station of science instruments, learn more about working on the Moon, and photograph places later missions might visit. NASA found that every objective was met except some of the photography. Changes made after Apollo 13's oxygen tank failed (a redesigned tank, a third oxygen tank, and an extra battery) worked as intended.",
      },
      citations: [
        summary('Background'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        summary('Conclusions'),
        nasm(
          'Object description: "the Fra Mauro region of the moon, the original goal of the aborted Apollo 13 mission"',
        ),
      ],
    },
    {
      text: {
        short:
          'Alan Shepard, who in 1961 became the first American in space, became the oldest person to walk on the Moon, at 47.',
        more: "An ear disorder, Meniere's syndrome, had grounded Shepard, and he became chief of the astronaut office. Surgery in 1969 corrected the problem, and that August he was assigned to command Apollo 14. Stuart Roosa and Edgar Mitchell were making their first spaceflights.",
      },
      citations: [
        summary('Background'),
        nasaMission(
          'Crew, Alan B. Shepard, Jr.: "holds the distinction of being the first American to journey into space. On May 5, 1961, in the Freedom 7 spacecraft, he was launched by a Redstone vehicle"',
        ),
        table(
          'Crew Information - Lunar Landing Missions',
          'Commander, Age On Launch Date row (47)',
          ABTN_CREW,
        ),
      ],
    },
    {
      text: {
        short:
          'On two moonwalks, Shepard and Mitchell spent 9 hours 22 minutes 31 seconds outside and gathered 93.21 pounds (42.28 kilograms) of Moon rocks and soil.',
        more: 'A two-wheeled cart called the modular equipment transporter, used for the first time, carried their tools, cameras, and samples. In all they walked more than 13,100 feet (4 kilometers) and went as far as 4,770 feet from Antares. The official sample total was found by the Lunar Receiving Laboratory in Houston.',
      },
      citations: [
        summary('Background'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'Extravehicular Activity',
          'Total Lunar Surface EVA, Total Duration, Total Samples Collected (lbm), and Maximum Distance Traveled From LM (ft) rows',
          ABTN_EVA,
        ),
        report(
          '1.0, Mission Summary',
          '1-2',
          9,
          '"A modular equipment transporter, used on this mission for the first time, assisted the crew in carrying equipment and lunar samples"',
        ),
        nmc('lm', 'Mission Profile: "collected 42.28 kg of lunar samples"'),
      ],
      discrepancy:
        'The Mission Report, written soon after the flight, gives "about 96 pounds" of samples and "approximately 9-1/4 hours" outside (Section 1.0, page 1-2). NSSDCA gives 9 hours 23 minutes, 42.28 kilograms, and 3.45 kilometers walked. Apollo by the Numbers\' mission summary says "more than 13,100 feet (4 km)" were walked, and its Extravehicular Activity table "~13,000 ft". We follow Apollo by the Numbers\' mission summary, whose sample weight is the official total from the Lunar Receiving Laboratory and agrees with NSSDCA\'s.',
    },
    {
      text: {
        short:
          'The crew left science instruments on the Moon that radioed measurements to Earth until 1977. Parts of the spacecraft were crashed into the Moon on purpose so seismometers could feel the shaking.',
        more: "The station included a seismometer for moonquakes and instruments that measured charged particles, the Moon's very thin atmosphere, and dust; a laser reflector was set beside it. The rocket's third stage struck the Moon 94 nautical miles southwest of the seismometer Apollo 12 had left, which felt the shaking for more than three hours. Antares' top half was later crashed between the Apollo 12 and Apollo 14 stations. All the stations were turned off on September 30, 1977.",
      },
      citations: [
        summary('Translunar Phase'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        timeline('ALSEP central station turned off by ground command.'),
        nmc(
          'lm',
          'Apollo Lunar Surface Experiments Package (ALSEP) and ALSEP Scientific Instruments',
        ),
        nmc(
          'lm',
          'Mission Profile: "impacted the Moon at 3.42 S, 19.67 W, between the Apollo 12 and Apollo 14 seismic stations"',
        ),
        {
          source: 'nssdca-apollo-current-locations',
          locator:
            'Introduction: "The Apollo Lunar Modules were deliberately targeted to impact the Moon to provide artificial moonquake sources for seismic experiments"',
        },
      ],
    },
    {
      text: {
        short:
          'After lifting off from the Moon, Antares met Kitty Hawk within its first trip around, the first time an Apollo crew used this faster way of meeting up.',
        more: 'Flying straight to the meeting cut about two hours from the time between liftoff and docking on earlier missions, though it left the crew much less time for each task.',
      },
      citations: [summary('Lunar Orbit/Lunar Surface Phase'), summary('Conclusions')],
    },
  ],

  chapters: [
    { id: 'outbound', title: 'To the Moon' },
    { id: 'landing', title: 'Landing at Fra Mauro' },
    { id: 'surface', title: 'On the Moon' },
    { id: 'return', title: 'Coming home' },
  ],

  events: [
    /* --------------------------- To the Moon -------------------------- */
    {
      id: 'liftoff',
      handsOn: 'orbit',
      title: 'Liftoff',
      chapter: 'outbound',
      elapsed: '000:00:00.57',
      utc: '1971-01-31T21:03:02Z',
      text: {
        short:
          'After a wait for rain clouds to move away, a Saturn V rocket lifts Apollo 14 off its launch pad in Florida, carrying three astronauts toward the Moon.',
        more: 'Apollo 14 lifted off from Launch Complex 39, Pad A, at Kennedy Space Center at 4:03:02 p.m. Eastern Standard Time on January 31, 1971. Rain showers, clouds, and the risk of lightning had stopped the countdown for 40 minutes 2 seconds, the first launch delay of the Apollo program. The crew were Alan Shepard, commander; Stuart Roosa, command module pilot; and Edgar Mitchell, lunar module pilot.',
      },
      citations: [
        timeline('Liftoff (umbilical disconnected).'),
        timeline('Unscheduled 40-minute 2-second weather hold at T-8 minutes.'),
        summary('Launch Preparations'),
        summary('Ascent Phase'),
        summary('Background'),
        report(
          '1.0, Mission Summary',
          '1-1',
          8,
          '"Because of unsatisfactory weather conditions at the planned time of launch, a launch delay (about 40 minutes) was experienced for the first time in the Apollo program"',
        ),
      ],
      photo: nasaPhoto(
        's71-18395',
        1243,
        1600,
        'The white Saturn V rocket rises beside its orange launch tower in clouds of smoke and steam, under a dark blue sky, with black birds flying in the foreground.',
      ),
      view: 'earth',
      keyMoment: true,
    },
    {
      id: 'docking',
      title: 'Six tries to dock',
      chapter: 'outbound',
      elapsed: '004:56:56.7',
      utc: '1971-02-01T01:59:58Z',
      text: {
        short:
          'Kitty Hawk turns around to pick up the lunar module Antares, but the latches that should hold them together do not catch. On the sixth try, they finally lock.',
        more: "The rocket's third stage fired for 5 minutes 50.84 seconds to send Apollo 14 toward the Moon. At 3 hours 2 minutes the command and service module Kitty Hawk separated from the stage and turned around to dock with Antares, which rode inside it. Each time Kitty Hawk's docking probe touched Antares, its small capture latches failed to grab. The sixth try worked, 4 hours 56 minutes after launch. When the crew took the probe out to look at it, it worked normally; NASA's best explanation was that the capture latches had not been in their locked position during the first five tries.",
      },
      citations: [
        timeline('CSM docked with LM/S-IVB (initial docking latch triggered).'),
        timeline('CSM separated from S-IVB.'),
        timeline('1st docking attempt - 1st contact.'),
        timeline('6th docking attempt.'),
        summary('Ascent Phase'),
        summary('Translunar Phase'),
        sequence('Translunar docking'),
        report(
          '1.0, Mission Summary',
          '1-1',
          8,
          '"during transposition and docking following translunar injection, six attempts were required to achieve docking because of mechanical difficulties"',
        ),
        report(
          '9.5.1, Transposition and Docking',
          '9-3',
          104,
          '"At contact, the capture latches did not lock with the drogue"',
        ),
        nmc(
          'csm',
          'Mission Profile: "The CSM separated from the S-IVB stage containing the LM" and "Five attempts were made to dock the CSM and the LM, all unsuccessful because the catches on the docking ring did not release"',
        ),
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for the Apollo 14 command and service module gives the successful sixth attempt as 02:00:02 UT. Apollo by the Numbers gives docking at 004:56:56.7 (01:59:58 GMT), which the Mission Report's Table 6-I agrees with (04:56:56), and we follow it. The crew's account in the Mission Report (Section 9.5.1, page 9-3) describes a \"fifth and final attempt\"; its editor's note explains that six contacts were made, which the rest of the report calls six docking attempts, and that the pilots counted the first two as one. We follow the count of six, as Apollo by the Numbers and the rest of the report give it.",
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'lunar-orbit-insertion',
      title: 'Into orbit around the Moon',
      chapter: 'outbound',
      elapsed: '081:56:40.70',
      utc: '1971-02-04T06:59:42Z',
      text: {
        short:
          "Kitty Hawk fires its main engine for about 6 minutes to slow down and go into orbit around the Moon. Later, another firing lowers the orbit's low point to about 10 miles (17 kilometers) above the surface.",
        more: "The firing began 81 hours 56 minutes after launch and lasted 6 minutes 10.84 seconds. Because of the launch delay, the first course correction on the way out was made early so Apollo 14 would still arrive on schedule, and the crew's clock was set 40 minutes 2.90 seconds ahead to match the flight plan. About four hours later, Kitty Hawk's engine lowered the orbit to 58.8 by 9.1 nautical miles with Antares still attached. On earlier landings the lunar module's own engine had made this firing. Because the Fra Mauro site was more rugged, Kitty Hawk made it instead, so Antares had more fuel to spare for the landing.",
      },
      citations: [
        timeline('Lunar orbit insertion ignition (SPS).'),
        timeline('Descent orbit insertion ignition (SPS).'),
        summary('Translunar Phase'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        report(
          '2.0, Introduction',
          '2-1',
          10,
          '"The clock onboard the spacecraft was changed at 54:53:36 by adding 40 minutes and 2.90 seconds"; without it, the crew\'s times "would have been in error by the amount of the delay in lift-off since the midcourse corrections were targeted to achieve the prelaunch-desired lunar orbit insertion time"',
        ),
        nmc(
          'csm',
          'Mission Profile: "An early first mid-course correction was made to make up for the launch delay so the spacecraft would arrive at the Moon on schedule"',
        ),
      ],
      discrepancy:
        'Apollo by the Numbers\' mission summary says the clock update added "40 minutes 20.9 seconds"; its own timeline ("000:040:02.9 added") and the Mission Report (40 minutes 2.90 seconds) agree with each other, and we follow the Mission Report. NSSDCA\'s Master Catalog gives lunar orbit insertion at 06:59:43 UT; we follow Apollo by the Numbers, 06:59:42 GMT.',
      view: 'moon',
    },

    /* ------------------------ Landing at Fra Mauro ----------------------- */
    {
      id: 'undocking',
      title: 'Antares undocks',
      chapter: 'landing',
      elapsed: '103:47:41.6',
      utc: '1971-02-05T04:50:43Z',
      text: {
        short:
          'Shepard and Mitchell, inside Antares, undock from Kitty Hawk. Stuart Roosa stays in Kitty Hawk, circling the Moon alone.',
        more: "Undocking came 103 hours 47 minutes after launch, and less than an hour and a half later Roosa raised Kitty Hawk's orbit to 63.9 by 56.0 nautical miles. Meanwhile Mission Control saw that Antares' computer was receiving an abort signal, the command to give up the landing, though no one had pressed the abort switch. The fault was traced to the switch, and a way around it was worked out on the ground: the crew keyed entries into the computer so it would ignore the signal.",
      },
      citations: [
        timeline('CSM/LM undocking and separation ignition (SM RCS).'),
        timeline('CSM orbit circularization ignition (SPS).'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        report(
          '1.0, Mission Summary',
          '1-1',
          8,
          '"an abort command was delivered to the computer as the result of a malfunction but a routine was manually loaded in the computer that inhibited the recognition of an abort discrete"',
        ),
      ],
      view: 'spacecraft',
    },
    {
      id: 'landing',
      title: 'Landing at Fra Mauro',
      chapter: 'landing',
      elapsed: '108:15:09.30',
      utc: '1971-02-05T09:18:11Z',
      text: {
        short:
          'Antares lands in the hilly Fra Mauro highlands, the place Apollo 13 was meant to visit. It is the third time people have landed on the Moon.',
        more: 'Powered descent, the engine firing that brings the lunar module down to the surface, began 108 hours 2 minutes after launch, 7.8 nautical miles up. Before it started, the landing radar had switched itself to the wrong range setting, which would have kept it from measuring the height until too late to land; turning its circuit breaker off and on fixed it. The first footpad touched down at 4:18:11 a.m. Eastern Standard Time on February 5, with about 1 minute 8 seconds of engine firing time left. Antares came to rest tilted 7 degrees to one side.',
      },
      citations: [
        timeline('LM lunar landing (left pad touchdown).'),
        timeline('LM powered descent engine ignition (DPS).'),
        timeline('LM landing radar switched to low scale.'),
        sequence('Lunar landing'),
        summary('Background'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'LM Lunar Landing',
          'Landing Site and Hover Time Remaining (sec) rows',
          ABTN_LM_LANDING,
        ),
        nmc(
          'csm',
          'Mission Profile: "landed at 09:18:11 UT in the hilly upland region 24 km north of the rim of Fra Mauro crater"',
        ),
        nmc(
          'lm',
          'Mission Profile: "landed at 09:18:11 UT (4:18:11 a.m. EST) on 5 February 1971 in the lunar highlands near the crater Fra Mauro"',
        ),
        report(
          '9.9, Powered Descent',
          '9-8',
          109,
          '"the vehicle came to rest within 1 degree of zero in pitch and yaw attitudes, and with a 7-degree right roll attitude (northeast tilt)"',
        ),
      ],
      discrepancy:
        "Apollo by the Numbers' LM Lunar Landing table gives 108:15:11.40 (09:18:13 GMT), when the other three footpads touched down. We follow the Mission Report, which times the landing from the first pad's contact (Table 6-II), 108:15:09, as the Apollo 14 Timeline does (108:15:09.30, 09:18:11 GMT). For the tilt, NSSDCA's lunar module page gives 8 degrees and Apollo by the Numbers' LM Lunar Landing table gives 1 degree pitch down, 6.9 degrees roll right, and 1.4 degrees yaw left; we follow the Mission Report's 7 degrees of roll.",
      view: 'moon',
      keyMoment: true,
    },

    /* ---------------------------- On the Moon --------------------------- */
    {
      id: 'first-moonwalk',
      title: 'First moonwalk',
      chapter: 'surface',
      elapsed: '113:39:11',
      utc: '1971-02-05T14:42:13Z',
      text: {
        short:
          'Shepard and Mitchell step out onto the Moon. Alan Shepard, who in 1961 became the first American in space, is now walking on the Moon.',
        more: "The crew began letting the air out of Antares' cabin 113 hours 39 minutes after launch, 49 minutes late because the radios in the astronauts' backpacks kept cutting out. Shepard went down the ladder first, and Mitchell followed eight minutes later. They put up a television camera, an antenna, and the flag, unloaded their cart, and set up the science station about 500 feet west of Antares. The moonwalk lasted 4 hours 47 minutes 50 seconds, and they gathered 45.19 pounds (20.5 kilograms) of rock and soil.",
      },
      citations: [
        timeline('1st EVA started (LM cabin depressurization started).'),
        timeline('United States flag deployed and photographed.'),
        timeline('1st ALSEP data received on Earth.'),
        sequence('Start first extravehicular activity'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        summary('Background'),
        table(
          'Extravehicular Activity',
          'First Surface EVA, Duration and Samples Collected (lbm) rows',
          ABTN_EVA,
        ),
        nasaMission(
          'Crew, Alan B. Shepard, Jr.: "the first American to journey into space. On May 5, 1961"',
        ),
        nmc('lm', 'Mission Profile: "The first EVA began at 14:42:13 UT and ended at 19:30:03 UT"'),
      ],
      photo: nasaPhoto(
        'as14-66-09277',
        1600,
        1600,
        'The lunar module Antares, wrapped in gold and silver foil, stands on four legs on the gray, dusty surface of the Moon under a black sky. A United States flag stands at the left, and bootprints cover the ground in front.',
      ),
      view: 'moon',
      keyMoment: true,
    },
    {
      id: 'cone-crater',
      title: 'The walk toward Cone Crater',
      chapter: 'surface',
      elapsed: '131:08:13',
      utc: '1971-02-06T08:11:15Z',
      text: {
        short:
          'On their second moonwalk, Shepard and Mitchell pull their cart up the slopes toward Cone Crater. They have trouble finding their way among the ridges and, running late, stop about 50 feet (15 meters) from the rim.',
        more: 'Cone Crater lies 0.7 nautical miles (1.3 kilometers) east-northeast of the landing site. Finding the way over the slopes was harder than expected, and the crew fell 30 minutes behind schedule. They collected rocks in a field of boulders near the rim, which met the goals for reaching the crater. Back at Antares, Shepard dropped a golf ball and swung at it with the head of a 6-iron fixed to the handle of a sample tool; his second ball flew into a crater about 50 feet away. The moonwalk lasted 4 hours 34 minutes 41 seconds and covered about 9,800 feet (3 kilometers).',
      },
      citations: [
        timeline('2nd EVA started (cabin depressurization started).'),
        timeline('Departed LM for station A (CDR).'),
        sequence('Start second extravehicular activity'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        summary('Conclusions'),
        table(
          'Extravehicular Activity',
          'Second Surface EVA, Duration and Total Distance Traveled rows',
          ABTN_EVA,
        ),
        report(
          '1.0, Mission Summary',
          '1-2',
          9,
          '"Although the crew experienced difficulties in navigating, they reached a point within approximately 50 feet of the rim of the crater"',
        ),
        report(
          '9.10.5, Lunar Surface Crew Equipment',
          '9-13',
          114,
          '"The modular equipment transporter was stable, easily pulled, and proved to be a very handy device for both extravehicular activities"',
        ),
        report(
          '9.10.3, Lunar Surface Operations',
          '9-11',
          112,
          '"The landmarks that were clearly apparent on the navigational maps were not at all apparent on the surface"',
        ),
        nmc(
          'lm',
          'Mission Profile: "the astronauts walked almost to the rim of nearby Cone crater"',
        ),
      ],
      photo: nasaPhoto(
        'as14-64-9140',
        1600,
        1600,
        'Black-and-white photo of Edgar Mitchell in his white spacesuit and backpack, standing beside the two-wheeled equipment cart on a wide, gently rolling gray plain under a black sky. Small crosshair marks from the camera dot the picture.',
      ),
      view: 'moon',
      keyMoment: true,
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: 'lunar-liftoff',
      title: 'Liftoff and a fast rendezvous',
      chapter: 'return',
      elapsed: '141:45:40',
      utc: '1971-02-06T18:48:42Z',
      text: {
        short:
          "Antares' top half lifts off from the Moon, using its bottom half as a launch pad. It catches up with Kitty Hawk and docks in less than two hours.",
        more: 'The ascent engine fired 141 hours 45 minutes after launch, after 33 hours 30 minutes 31 seconds on the surface, and burned for 7 minutes 12.1 seconds. For the first time in Apollo, the lunar module went straight onto a path that met the command module in its first orbit. Docking came 1 hour 47 minutes 10 seconds after liftoff. The crew moved the samples into Kitty Hawk and let Antares go, and it was steered by remote control to crash into the Moon, 36 nautical miles west of the landing site.',
      },
      citations: [
        timeline('LM lunar liftoff ignition (LM APS).'),
        timeline('CSM/LM docked.'),
        timeline('LM ascent stage jettisoned.'),
        sequence('Lunar lift-off'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        summary('Conclusions'),
        report(
          '6.2.3, Lunar Ascent and Rendezvous',
          '6-10',
          53,
          '"Direct rendezvous was nominal and docking occurred 1 hour 47 minutes 10 seconds after lunar lift-off"',
        ),
        nmc('lm', 'Lunar Module Spacecraft and Subsystems'),
      ],
      view: 'moon',
    },
    {
      id: 'transearth-injection',
      title: 'Heading home',
      chapter: 'return',
      elapsed: '148:36:02.30',
      utc: '1971-02-07T01:39:04Z',
      text: {
        short:
          'Kitty Hawk fires its main engine for about two and a half minutes to leave lunar orbit and head back to Earth.',
        more: "The firing began 148 hours 36 minutes after launch, after 34 trips around the Moon, and lasted 2 minutes 29.23 seconds. On the way home the crew made one tiny course correction, tested the oxygen supply for spacewalks on later missions, practiced finding their way home with only the spacecraft's own navigation system, and showed on television how liquids and other materials behave without gravity.",
      },
      citations: [
        timeline('Transearth injection ignition (SPS).'),
        timeline('Transearth injection cutoff.'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        summary('Transearth Phase'),
        sequence('Transearth injection'),
      ],
      view: 'journey',
    },
    {
      id: 'splashdown',
      title: 'Splashdown',
      chapter: 'return',
      elapsed: '216:01:58.1',
      utc: '1971-02-09T21:05:00Z',
      text: {
        short:
          'Kitty Hawk splashes down in the Pacific Ocean under three big parachutes. A helicopter carries the astronauts to the recovery ship USS New Orleans.',
        more: 'Splashdown came at 4:05 p.m. Eastern Standard Time on February 9, 765 nautical miles south of American Samoa and 3.8 nautical miles from the New Orleans. The capsule floated upright, and the crew was aboard the ship 48 minutes later. Apollo 14 had traveled an estimated 1,000,279 nautical miles (about 1,151,100 miles, or 1,852,500 kilometers). The crew stayed in quarantine until February 27. No sign of life from the Moon had been found, so later crews were not quarantined.',
      },
      citations: [
        timeline('Splashdown (went to apex-up).'),
        timeline('Crew aboard recovery ship.'),
        timeline('Crew released from quarantine.'),
        sequence('Landing'),
        summary('Recovery'),
        table(
          'Entry, Splashdown, and Recovery',
          'Earth Splashdown GET, KSC Time, Distance To Recovery Ship (n mi), Distance Traveled (n mi), Minutes To Crew Pickup, and Recovery Ship rows',
          ABTN_ENTRY,
        ),
        nmc('csm', 'Spacecraft and Subsystems, Command Module: the three main parachutes'),
        {
          source: 'apollo-14-cm-onboard-transcription',
          locator:
            'Day 9, page 233 (PDF page 239): "08 23 56 58 CMP And there go the drogues. And the mains are out free. Oh, we got all three."',
          url: 'https://www.nasa.gov/wp-content/uploads/2026/01/as14-cm.pdf',
        },
        nmc(
          'csm',
          'Mission Profile: "765 nautical miles south of American Samoa" and "This was the last Apollo mission in which the astronauts were put in quarantine after their return"',
        ),
      ],
      photo: nasaPhoto(
        's71-18753',
        1600,
        1600,
        'The cone-shaped command module hangs under three large orange-and-white striped parachutes just above the deep blue Pacific Ocean, with white clouds in the sky.',
      ),
      view: 'earth',
      keyMoment: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Command module Kitty Hawk',
        museum: "Kennedy Space Center Visitor's Center",
        place: 'Florida',
      },
      citations: [
        {
          source: 'nssdca-apollo-current-locations',
          locator:
            'Apollo 14, Command Module "Kitty Hawk": "Visitor\'s Center, Kennedy Space Center, Florida (formerly at U.S. Astronaut Hall of Fame, Titusville, Florida)"',
        },
        nasm(
          'Object description: "was declared surplus and transferred from NASA to the Smithsonian in 1974"; Display Status: "This object is not on display at the National Air and Space Museum. It is either on loan or in storage."',
        ),
      ],
      discrepancy:
        'NSSDCA\'s Master Catalog page for the Apollo 14 command and service module (1971-008A) says Kitty Hawk "is currently on display at the Astronaut Hall of Fame in Titusville, Florida." NSSDCA\'s "Where are they now?" page, marked "Last Updated: 28 March 2023", lists the Kennedy Space Center visitor center and gives the Astronaut Hall of Fame as its former location. We follow the "Where are they now?" page.',
    },
  ],
};
