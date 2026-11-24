/**
 * Apollo 17: the last Apollo flight to the Moon, and the sixth and last
 * Apollo landing, December 7 to 19, 1972.
 *
 * Event times are copied from Apollo by the Numbers (NASA SP-2000-4029):
 * elapsed times exactly as its Apollo 17 Timeline prints them, and UTC from
 * that table's GMT columns. Where the Apollo 17 Mission Report's sequence of
 * events (Table 3-I) gives a different time, we follow the Mission Report
 * and the `discrepancy` field says what Apollo by the Numbers gives. No
 * source records when the Blue Marble photographs were taken; that event is
 * placed at a radio call stamped in NASA's technical air-to-ground voice
 * transcription, and its text says so.
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (05:33:00 GMT on December 7, 1972). Liftoff itself came 0.63 seconds
 * later. At 065:00 the clocks were set ahead 2 hours 40 minutes to make up
 * for the launch delay (Mission Report Table 3-I, "Mission control center
 * time update (+2:40:00)" at 65:00:00, defined in Table 3-II; Apollo by the
 * Numbers Timeline, "Mission clock updated (002:40:00 added)."; NASA's
 * article "50 Years Ago: Apollo 17 Lights Up the Night Sky", "At 65 hours
 * into the flight, Mission Control adjusted all the clocks ahead by 2 hours
 * and 40 minutes"). From then on, NASA's public affairs transcript and photo
 * captions read 2 hours 40 minutes later than the times here (photo
 * S72-55421 puts the lunar liftoff at 188:01:36). NASA's technical
 * air-to-ground transcript does not: it stamps "The Challenger has landed"
 * at 04 14 22 11, which is 110:22:11. The update is not applied here.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers,
 * kilometers to miles, feet per second to miles and kilometers per hour,
 * feet to meters) are our arithmetic on the cited values.
 *
 * Durations of a minute or more are written in the text as minutes and
 * seconds, with the source's full precision kept: the 393.16 seconds in the
 * source is "6 minutes 33.16 seconds" here. That is our arithmetic too.
 *
 * The flight path itself (orbits, burns, landing and splashdown points) is
 * described in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const ABTN_SUMMARY = `${ABTN}Apollo_17a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_17i_Timeline.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-03_Crew_Information_-_Lunar_Landings.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_LM_LANDING = `${ABTN}Apollo_18-27_LM_Lunar_Landing.htm`;
const ABTN_EVA = `${ABTN}Apollo_18-30_Extravehicular_Activity.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;

const MISSION_REPORT =
  'https://web.archive.org/web/20250206054342/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a17/A17_MissionReport.pdf';

const NMC_CSM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096A';
const NMC_LM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096C';

/** A section of the Apollo by the Numbers Apollo 17 mission summary. */
function summary(section: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 17 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 17 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 17 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the statistical tables in Apollo by the Numbers, Apollo 17 column. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `"${name}" table, Apollo 17 column: ${rows}`,
    url,
  };
}

/** A place in the Apollo 17 Mission Report, with its printed and PDF page. */
function report(place: string): Citation {
  return { source: 'apollo-17-mission-report', locator: place, url: MISSION_REPORT };
}

/** A row of the Mission Report's sequence of events. */
function eventsTable(row: string): Citation {
  return report(`Table 3-I, "Sequence of Events" (printed page 3-2, PDF page 20), "${row}" row`);
}

/** An NSSDCA Master Catalog spacecraft page: the command and service module, or the lunar module. */
function nmc(page: 'csm' | 'lm', section: string): Citation {
  if (page === 'csm') {
    return {
      source: 'nssdca-master-catalog',
      locator: `"Apollo 17 Command and Service Module (CSM)" (1972-096A), ${section}`,
      url: NMC_CSM,
    };
  }
  return {
    source: 'nssdca-master-catalog',
    locator: `"Apollo 17 Lunar Module /ALSEP" (1972-096C), ${section}`,
    url: NMC_LM,
  };
}

const nightSky = (place: string): Citation => ({
  source: 'nasa-apollo-17-night-sky',
  locator: place,
});
const lands = (place: string): Citation => ({ source: 'nasa-apollo-17-lands', locator: place });
const headsHome = (place: string): Citation => ({
  source: 'nasa-apollo-17-heads-home',
  locator: place,
});
const splashdown = (place: string): Citation => ({
  source: 'nasa-apollo-17-splashdown',
  locator: place,
});
const transcript = (place: string): Citation => ({
  source: 'apollo-17-technical-transcript',
  locator: place,
});
const rememberingCernan = (place: string): Citation => ({
  source: 'nasa-apollo-17-remembering-cernan',
  locator: place,
});
const blueMarble = (place: string): Citation => ({
  source: 'nasa-apollo-17-blue-marble',
  locator: place,
});

/** NSSDCA: Apollo 17 was the last Apollo mission to walk on the Moon. */
const LAST_APOLLO_LANDING: Citation = nmc(
  'csm',
  'Description: "Apollo 17 was the sixth and last Apollo mission in which humans walked on the lunar surface."',
);

/** NASA's Artemis IV page: the next crewed landing it plans, and how long it has been. */
const ARTEMIS_IV: Citation = {
  source: 'apollo-17-nasa-artemis-iv',
  locator:
    'Mission Type "Crewed Surface Landing" and Launch "Early 2028"; caption of the landing-regions image: "This image shows nine candidate landing regions for NASA\'s Artemis campaign, with each region containing multiple potential sites for the first crewed landing on the Moon in more than 50 years."',
};

/** NASA's Artemis program page: Artemis II's flight around the Moon. */
const ARTEMIS_II: Citation = {
  source: 'apollo-17-nasa-artemis',
  locator:
    'Artemis Missions, "Artemis II": "In April 2026, Artemis II launched on a nearly 10-day voyage around the Moon, marking the first crewed flight of NASA\'s Orion spacecraft aboard the SLS rocket."',
};

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-17/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-17/${nasaId.toLowerCase()}.jpg`,
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
  id: 'apollo-17',
  program: 'apollo',
  name: 'Apollo 17',
  kind: 'flight',
  destination: 'moon',

  summary: {
    text: {
      short:
        'Apollo 17 was the last Apollo flight to the Moon. In December 1972, Gene Cernan and the geologist Jack Schmitt explored a mountain valley there for three days, the last Apollo astronauts to walk on the Moon, while Ron Evans studied it from orbit.',
      more: 'Apollo 17 lifted off from Kennedy Space Center at 12:33 a.m. Eastern Standard Time on December 7, 1972, the first Apollo launch at night. On December 11, Cernan and Schmitt landed the lunar module Challenger in the valley of Taurus-Littrow, between tall mountains at the edge of the Sea of Serenity. On three moonwalks they drove the rover about 35.7 kilometers (22.2 miles) and collected 243.65 pounds (110.52 kilograms) of rock and soil. Evans, circling the Moon in the command module America, ran cameras and instruments that mapped the Moon and probed beneath its surface. On the way home he made a spacewalk to bring in the film, and the crew splashed down in the Pacific Ocean on December 19. NASA says its next planned crewed landing, Artemis IV, set for early 2028, will be the first crewed landing on the Moon in more than 50 years.',
    },
    citations: [
      summary('Background'),
      summary('Ascent Phase'),
      summary('Lunar Orbit/Lunar Surface Phase'),
      summary('Transearth Phase'),
      summary('Recovery'),
      nmc('csm', 'Mission Profile: "the first nighttime launch of an Apollo"'),
      nmc(
        'lm',
        'Mission Profile: landed "on the southeastern rim of Mare Serenitatis (the Sea of Serenity)"',
      ),
      LAST_APOLLO_LANDING,
      ARTEMIS_IV,
    ],
    discrepancy:
      'NSSDCA\'s Master Catalog gives the rover\'s total distance as 30 kilometers. Apollo by the Numbers gives 19.3 nautical miles (35.7 kilometers), and the Mission Report (section 1.0, printed page 1-2, PDF page 14) "about 36 kilometers"; we follow them.',
  },

  crew: {
    value: [
      { name: 'Eugene A. Cernan', role: 'Commander' },
      { name: 'Ronald E. Evans', role: 'Command module pilot' },
      { name: 'Harrison H. Schmitt', role: 'Lunar module pilot' },
    ],
    citations: [
      summary('Background'),
      table(
        'Crew Information - Lunar Landing Missions',
        'Commander, Command Module Pilot, and Lunar Module Pilot rows',
        ABTN_CREW,
      ),
      report('Section 1.0, "Summary" (printed page 1-1, PDF page 13)'),
    ],
  },
  crewPhoto: nasaPhoto(
    'S72-50438',
    1200,
    901,
    'Eugene A. Cernan sits on a lunar rover trainer in a white spacesuit. Behind him stand Harrison H. Schmitt, at left, and Ronald E. Evans, at right, also in spacesuits. Their Saturn V rocket stands on its launch pad in the distance, and the Apollo 17 emblem is set into the upper left corner.',
  ),

  launch: {
    value: {
      utc: '1972-12-07T05:33:00Z',
      site: 'Launch Complex 39, Pad A, Kennedy Space Center, Florida',
      vehicle: 'Saturn V (SA-512)',
    },
    citations: [
      summary('Ascent Phase'),
      summary('Background'),
      timeline('Range zero.'),
      report(
        'Section 1.0, "Summary" (printed page 1-1, PDF page 13): launched at 05:33:00 G.m.t. on December 7, 1972, from Launch Complex 39',
      ),
    ],
  },

  duration: {
    value: '301:51:59',
    citations: [
      summary('Recovery'),
      table('Entry, Splashdown and Recovery', 'Earth Splashdown, GET row', ABTN_ENTRY),
      report(
        'Section 1.0, "Summary" (printed page 1-3, PDF page 15): "301 hours, 51 minutes, and 59 seconds"',
      ),
    ],
  },

  callSigns: {
    value: [
      { craft: 'Command module', name: 'America' },
      { craft: 'Lunar module', name: 'Challenger' },
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
          'Cernan and Schmitt were the last Apollo astronauts to walk on the Moon. NASA says its next planned crewed landing will be the first in more than 50 years.',
        more: "Apollo 17 was the sixth and last Apollo mission in which people walked on the Moon. In April 2026, NASA's Artemis II crew set off on a nearly 10-day voyage around the Moon. NASA says Artemis IV, a crewed landing planned for early 2028, will be the first crewed landing on the Moon in more than 50 years.",
      },
      citations: [LAST_APOLLO_LANDING, ARTEMIS_IV, ARTEMIS_II],
    },
    {
      text: {
        short: 'Jack Schmitt, a geologist, was the first scientist to explore the Moon.',
        more: 'Schmitt had a doctorate in geology from Harvard University and was chosen as an astronaut in 1965. NASA concluded afterward that the mission had shown scientists could be trained as astronauts while keeping their scientific expertise.',
      },
      citations: [
        summary('Background'),
        summary(
          'Conclusions: "demonstrated the practicality of training scientists to become qualified astronauts while retaining their expertise and scientific knowledge"',
        ),
        nmc('lm', 'Description: "Schmitt was the first scientist-astronaut to walk on the Moon"'),
      ],
    },
    {
      text: {
        short:
          'Apollo 17 stayed on the Moon the longest, spent the most time outside, and brought home the most rock and soil of any Apollo flight.',
        more: 'Challenger stood on the Moon for 74 hours 59 minutes 40 seconds. Cernan and Schmitt spent 22 hours 3 minutes 57 seconds outside on their three moonwalks and brought back 243.65 pounds (110.52 kilograms) of samples. Among them were orange soil made of tiny glass beads believed to come from volcanoes, and chips from a boulder 4.6 billion years old, the oldest samples returned from the Moon. Apollo by the Numbers calls Apollo 17 the most productive and trouble-free of the crewed missions.',
      },
      citations: [
        summary('Lunar Orbit/Lunar Surface Phase'),
        summary('Conclusions: "the most productive and trouble-free piloted mission"'),
        table(
          'Extravehicular Activity',
          'Total Lunar Surface EVA, Total Duration and Total Samples Collected (lbm) rows, the largest in the table',
          ABTN_EVA,
        ),
        eventsTable('Lunar landing'),
        eventsTable('Lunar ascent'),
        headsHome(
          'Paragraph on the liftoff: "Apollo 17 set another record of 75 hours for a lunar surface stay duration"',
        ),
        lands(
          'Paragraphs on the second excursion: the 4.6-billion-year-old samples from Station 2, and the orange soil of "small spherical glass beads with a high titanium content"',
        ),
      ],
      discrepancy:
        "The Mission Report's summary (section 1.0, printed page 1-3, PDF page 15) gives the stay as 74 hours 59 minutes 39 seconds. Apollo by the Numbers gives 74 hours 59 minutes 40 seconds, the span between the landing and liftoff times in the Mission Report's own sequence of events (Table 3-I); we follow it.",
    },
    {
      text: {
        short:
          'From orbit, Ron Evans ran cameras and instruments that mapped the Moon, measured how warm its surface was, and probed beneath it.',
        more: "Besides a panoramic camera, a mapping camera, and a laser altimeter flown on earlier missions, America's service module carried three new instruments: an ultraviolet spectrometer for the Moon's thin atmosphere, an infrared radiometer that mapped how warm the surface was, and a lunar sounder that gathered data on what lies beneath the surface. The instruments Cernan and Schmitt left on the surface sent data to Earth until September 1977.",
      },
      citations: [
        summary('Lunar Orbit/Lunar Surface Phase'),
        report(
          'Section 1.0, "Summary" (printed page 1-2, PDF page 14): the three new scientific instrument module experiments',
        ),
        timeline('ALSEP central station turned off by ground command.'),
        nmc(
          'lm',
          'ALSEP Scientific Instruments: "shut down along with the other ALSEP stations on 30 September 1977"',
        ),
      ],
    },
    {
      text: {
        short:
          'On the way to the Moon, the crew took a photograph of the whole, sunlit Earth. Known as the Blue Marble, it is one of the most famous photographs ever made of Earth.',
        more: "It was the first time an Apollo flight's path made it possible to photograph the ice cap around the South Pole. The picture is said to be the most reproduced photograph of all time.",
      },
      citations: [
        nightSky(
          'Paragraph after the S-IVB\'s departure: "One of this series, known as the Blue Marble photographs, has the reputation as the most reproduced photograph of all time"',
        ),
        rememberingCernan(
          'Paragraph beginning "Cernan concluded his historic space exploration career": the "whole Earth" view known as the "Blue Marble"',
        ),
        {
          source: 'apollo-17-blue-marble-history',
          locator:
            'Paragraph on the Apollo photographs: the crew of Apollo 17 "took one of the most famous photographs ever made of the Earth"',
        },
        blueMarble(
          'Caption: "the first time the Apollo trajectory made it possible to photograph the South polar ice cap"',
        ),
      ],
    },
  ],

  chapters: [
    { id: 'launch', title: 'Launch' },
    { id: 'outbound', title: 'To the Moon' },
    { id: 'lunar-orbit', title: 'Lunar orbit' },
    { id: 'surface', title: 'On the Moon' },
    { id: 'reunion', title: 'Back to orbit' },
    { id: 'return', title: 'Coming home' },
    { id: 'splashdown', title: 'Splashdown' },
  ],

  events: [
    /* ---------------------------- Launch ---------------------------- */
    {
      id: 'liftoff',
      handsOn: 'stages',
      title: 'A launch in the night',
      chapter: 'launch',
      elapsed: '000:00:00.63',
      utc: '1972-12-07T05:33:00Z',
      text: {
        short:
          'Just after midnight, a Saturn V rocket lifts Apollo 17 off the launch pad in Florida, lighting up the night sky. It is the first Apollo launch in the dark.',
        more: 'Liftoff from Launch Complex 39, Pad A, came at 12:33 a.m. Eastern Standard Time on December 7, 1972, 2 hours 40 minutes late. Thirty seconds before the planned launch, the countdown stopped automatically: 2 minutes 47 seconds before launch, the sequencer running it had failed to send the command to pressurize the oxygen tank in the rocket\'s third stage. It was the only Apollo launch delay caused by a hardware failure. Once in orbit, Cernan radioed, "that was quite a booster ride!"',
      },
      citations: [
        timeline('Liftoff (umbilical disconnected).'),
        summary('Launch Preparations'),
        summary('Ascent Phase'),
        report(
          'Section 1.0, "Summary" (printed page 1-1, PDF page 13): "the only launch delay in the Apollo program that was caused by hardware failure"',
        ),
        nmc('csm', 'Mission Profile: "the first nighttime launch of an Apollo"'),
        nightSky(
          'Paragraphs on the countdown hold and the ascent: the sequencer failure and Cernan\'s call "that was quite a booster ride!"',
        ),
      ],
      photo: nasaPhoto(
        'S72-55482',
        1600,
        1600,
        'At night, the Saturn V rocket rises from its launch tower on a blinding white flame that lights up clouds of exhaust, above a dark line of trees.',
      ),
      view: 'earth',
      inTour: true,
    },
    {
      id: 'translunar-injection',
      title: 'Burn toward the Moon',
      chapter: 'launch',
      elapsed: '003:12:36.60',
      utc: '1972-12-07T08:45:36Z',
      text: {
        short:
          "After going around Earth twice, the rocket's third stage fires its engine again for almost 6 minutes. This big push sends Apollo 17 toward the Moon.",
        more: 'This firing, called translunar injection, began 3 hours 12 minutes after launch and lasted 5 minutes 51.04 seconds, as the spacecraft passed into an orbital sunrise. Ten seconds after it ended, Apollo 17 was moving at about 24,200 miles per hour (39,000 kilometers per hour), on its way out of Earth orbit.',
      },
      citations: [
        timeline('S-IVB 2 nd burn ignition.'),
        timeline('Translunar injection.'),
        summary('Translunar Phase'),
        nightSky(
          'Paragraph on the parking orbit and translunar injection: "The burn took place as the spacecraft passed into an orbital sunrise"',
        ),
      ],
      discrepancy:
        'NASA\'s history article "Apollo 17 Lights Up the Night Sky" says the engine "fired for 5 minutes and 52 seconds." Apollo by the Numbers gives 351.04 seconds (5 minutes 51.04 seconds), and the Mission Report\'s maneuver summary (Table 3-V, printed page 3-6, PDF page 24) 351.0 seconds; we follow them.',
      view: 'journey',
    },

    /* --------------------------- To the Moon -------------------------- */
    {
      id: 'transposition-docking',
      title: 'Turning around to dock with Challenger',
      chapter: 'outbound',
      elapsed: '003:56:45',
      utc: '1972-12-07T09:29:45Z',
      text: {
        short:
          "America separates from the rocket, turns around, and docks with the lunar module Challenger, which rode inside the rocket's top stage.",
        more: 'Evans separated America from the S-IVB stage 3 hours 42 minutes 29 seconds after launch, turned it around, and docked with Challenger 14 minutes 16 seconds later. A warning showed that the docking latches had not all closed, so the crew opened the tunnel between the two spacecraft and found three that had not locked. They set them by hand, and at about 4 hours 45 minutes the docked spacecraft pulled free of the stage. The empty stage was then steered to crash into the Moon, and all four seismometers left by earlier Apollo crews felt it hit.',
      },
      citations: [
        eventsTable('S-IVB/command and service module separation'),
        eventsTable('Translunar docking'),
        eventsTable('Spacecraft ejection'),
        nmc('csm', 'Mission Profile: "CSM-LM docking took place at 09:29:45 UT"'),
        summary(
          'Translunar Phase: the latch problem, and the S-IVB\'s impact, which "was recorded by all four instruments" (the Apollo 12, 14, 15, and 16 seismometers)',
        ),
        report(
          'Section 1.0, "Summary" (printed page 1-1, PDF page 13): the S-IVB\'s impact "was recorded by the Apollo 12, 14, 15, and 16 passive seismometers"',
        ),
        nightSky(
          'Paragraph on transposition and docking: Evans flew the docking, and three latches had not activated',
        ),
      ],
      discrepancy:
        'Apollo by the Numbers (Apollo 17 Timeline, rows "CSM separated from S-IVB." and "CSM docked with LM/S-IVB.") gives the separation at 003:42:27.6 and the docking at 003:57:10.7. We follow the Mission Report\'s sequence of events (Table 3-I), 003:42:29 and 003:56:45.',
      view: 'spacecraft',
    },
    {
      id: 'blue-marble',
      title: 'The Blue Marble',
      chapter: 'outbound',
      elapsed: '005:08:14',
      text: {
        short:
          'About five hours after launch, the crew looks back, sees the whole Earth lit by the Sun, and takes four photographs. One of them, the Blue Marble, is one of the most famous photographs ever made of Earth.',
        more: "The exact moment the photographs were taken was not recorded. They came about five hours into the flight, shortly after the spent third stage moved away; at 5 hours 8 minutes 14 seconds, Houston read back the film count Evans had just reported for his camera magazine. The pictures show Africa, the Arabian Peninsula, the island of Madagascar, and, for the first time on an Apollo flight's path, the ice cap around the South Pole under heavy clouds. A little after 5 hours 20 minutes, Houston gave the crew's distance from Earth as 18,100 miles, and Cernan said, \"I suppose we're seeing as 100 percent full Earth as we'll ever see.\"",
      },
      citations: [
        transcript(
          'Houston\'s reply stamped 00 05 08 14 (tape 6/6, PDF page 64), "Okay, Ron. Magazine November November is on 1/23.", to Evans\'s report "Houston, magazine November November is on about 1/23 right now." at the foot of PDF page 63',
        ),
        transcript(
          'The exchange beginning at 00 05 20 36 (tape 6/8, PDF page 66): "18,100, FIDO says," and the commander\'s "And I suppose we\'re seeing as 100 percent full Earth as we\'ll ever see"',
        ),
        nightSky(
          'Paragraph after the S-IVB\'s departure: "Shortly after the S-IVB departed, Evans took four photographs showing the full disk of the Earth, with Africa in the center and Antarctica at the bottom"',
        ),
        timeline('S-IVB APS evasive maneuver ignition.'),
        blueMarble(
          'Caption: Africa, the Arabian Peninsula, the Malagasy Republic, heavy cloud in the Southern Hemisphere, and "the first time the Apollo trajectory made it possible to photograph the South polar ice cap"',
        ),
        {
          source: 'apollo-17-blue-marble-history',
          locator:
            'Paragraph on the Apollo photographs: "one of the most famous photographs ever made of the Earth"',
        },
      ],
      discrepancy:
        'NASA sources give different distances for the photograph itself: NASA\'s article "Apollo 17 Lights Up the Night Sky" 18,300 miles (in a photo caption), NASA Earth Observatory\'s "History of the Blue Marble" about 45,000 kilometers (28,000 miles), and NASA\'s "90 Years of Our Changing Views of Earth" 72,000 miles. The text gives only the distance Houston radioed about 12 minutes after the film-count report.',
      photo: nasaPhoto(
        'as17-148-22727',
        1600,
        1600,
        'The whole Earth as a round, blue ball against black space. Brown and tan Africa and the Arabian Peninsula are at the top, swirls of white cloud cover the blue ocean, and the white ice of Antarctica is at the bottom.',
      ),
      view: 'earth',
      inTour: true,
    },

    /* --------------------------- Lunar orbit -------------------------- */
    {
      id: 'lunar-orbit-insertion',
      title: 'Into orbit around the Moon',
      chapter: 'lunar-orbit',
      elapsed: '086:14:22.60',
      utc: '1972-12-10T19:47:22Z',
      text: {
        short:
          'Behind the Moon and out of contact with Earth, America fires its main engine for more than 6 minutes to slow down and go into orbit around the Moon.',
        more: 'The firing began 86 hours 14 minutes after launch and lasted 6 minutes 33.16 seconds. It put the spacecraft in an oval orbit about 196 by 61 miles (315 by 97 kilometers) above the Moon. Coming out from behind the Moon, Cernan radioed, "You can breathe easier, America has arrived on station for the challenge ahead." About four hours later, with Challenger still attached, a second firing dropped the orbit\'s low point to about 17 miles (27 kilometers), saving the lunar module\'s fuel for landing.',
      },
      citations: [
        timeline('Lunar orbit insertion ignition (SPS).'),
        timeline('1 st descent orbit insertion ignition (SPS).'),
        summary('Translunar Phase'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        lands(
          'Paragraphs on lunar orbit insertion (Cernan\'s radio call) and descent orbit insertion ("provided additional fuel for the Lunar Module")',
        ),
      ],
      view: 'moon',
      inTour: true,
    },
    {
      id: 'undocking',
      title: 'Challenger undocks',
      chapter: 'lunar-orbit',
      elapsed: '107:47:56',
      utc: '1972-12-11T17:20:56Z',
      text: {
        short:
          'Cernan and Schmitt, now inside Challenger, undock from America on the far side of the Moon. Ron Evans stays in America, circling the Moon.',
        more: "The two spacecraft had spent 17 hours in the low orbit together. After they separated, Evans fired America's engine to move into a higher, nearly round orbit of about 81 by 62 miles (130 by 100 kilometers) for his science work, and Challenger's thrusters lowered its own orbit's low point to about 7 miles (11.5 kilometers).",
      },
      citations: [
        timeline('CSM/LM separation maneuver initiated (RCS).'),
        eventsTable('Lunar module undocking and separation'),
        timeline('CSM orbit circularization ignition (SPS).'),
        timeline('2 nd descent orbit insertion ignition (LM RCS).'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        lands('Paragraph on landing day: the undocking "on the Moon\'s farside"'),
      ],
      view: 'spacecraft',
    },

    /* ---------------------------- On the Moon --------------------------- */
    {
      id: 'landing',
      title: 'Landing at Taurus-Littrow',
      chapter: 'surface',
      elapsed: '110:21:57',
      utc: '1972-12-11T19:54:57Z',
      text: {
        short:
          'Cernan flies Challenger down into a valley between tall mountains and lands smoothly. "Okay, Houston. The Challenger has landed!"',
        more: 'Powered descent began 110 hours 9 minutes 53 seconds after launch, and Challenger touched down 12 minutes 4 seconds later, at 110 hours 21 minutes 57 seconds. As the lunar module tipped upright, Cernan spotted a crater just beyond the landing spot: "And there it is, Houston. There\'s Camelot! Wow! Right on target." Challenger came down within 656 feet (200 meters) of the planned point with 1 minute 57 seconds of engine firing time left, the most of any Apollo landing. Taurus-Littrow was chosen because it was certain to have rocks from the old highlands, promised good coverage for the cameras in orbit, and made better use of the rover.',
      },
      citations: [
        eventsTable('Lunar landing'),
        timeline('LM powered descent engine ignition (DPS).'),
        summary('Background'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'LM Lunar Landing',
          'Landing Site, Hover Time Remaining (sec), and LM Distance To Target (ft) rows, the largest hover time in the table',
          ABTN_LM_LANDING,
        ),
        nmc('lm', 'Mission Profile: "landed at 19:54:57 UT"'),
        lands(
          'Paragraphs on the descent and landing: the pitchover, Camelot crater "just beyond their landing zone", and 117 seconds of fuel remaining, "the most of any Apollo landing"',
        ),
        transcript(
          'Calls stamped 04 14 19 21 (tape 74A/14, PDF page 580), "And there it is, Houston. There\'s Camelot! Wow! Right on target.", and 04 14 22 11 (tape 75A/1, PDF page 588), "Okay, Houston. The Challenger has landed!"',
        ),
      ],
      discrepancy:
        "Apollo by the Numbers (Timeline and LM Lunar Landing table) and the Mission Report's own summary (section 1.0, printed page 1-1, PDF page 13) give the landing as 110:21:58, 19:54:58 GMT. We follow the Mission Report's sequence of events (Table 3-I), 110:21:57, which NSSDCA's 19:54:57 UT also matches.",
      view: 'moon',
      inTour: true,
    },
    {
      id: 'first-moonwalk',
      title: 'First moonwalk',
      chapter: 'surface',
      elapsed: '114:21:49',
      utc: '1972-12-11T23:54:49Z',
      text: {
        short:
          'Cernan steps onto the Moon, followed by Schmitt. They unload the rover, set up a station of experiments, and drive to their first stop.',
        more: 'Stepping off the footpad, Cernan said, "we\'d like to dedicate the first step of Apollo 17 to all those who made it possible." They set up the experiments 185 meters (607 feet) west-northwest of Challenger, and Cernan drilled holes for a heat-flow experiment and a deep core sample. A hammer in his pocket knocked off part of the rover\'s right rear fender, and when the taped-on piece fell off later, the wheel threw dust all over them. This moonwalk lasted 7 hours 11 minutes 53 seconds; they drove 3.3 kilometers (2.1 miles) and collected 31.53 pounds (14.3 kilograms) of samples.',
      },
      citations: [
        timeline('1 st EVA started (LM cabin depressurized).'),
        timeline('Lunar roving vehicle (LRV) offloaded.'),
        timeline('1 st EVA ended (LM cabin repressurized).'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'Extravehicular Activity',
          'First Surface EVA, Duration and Samples Collected (lbm) rows',
          ABTN_EVA,
        ),
        lands(
          "Paragraphs on the first excursion: Cernan's words at the first step, the hammer and the fender, and the dust",
        ),
      ],
      photo: nasaPhoto(
        'as17-147-22527',
        1600,
        1600,
        'Cernan, in a white spacesuit, sits in the rover on the dark gray ground, with the gold-wrapped lunar module Challenger behind him and a rounded gray mountain under the black sky.',
      ),
      view: 'moon',
      inTour: true,
    },
    {
      id: 'second-moonwalk',
      title: 'Second moonwalk: orange soil',
      chapter: 'surface',
      elapsed: '137:55:06',
      utc: '1972-12-12T23:28:06Z',
      text: {
        short:
          'On the longest moonwalk of Apollo, Cernan and Schmitt drive to the foot of the mountains. At a crater called Shorty, Schmitt calls out, "There is orange soil!"',
        more: "Before leaving, they fixed the rover's fender with four maps taped together and two clamps from lamps, a repair worked out overnight in Houston. At the foot of South Massif they chipped a boulder whose samples, at 4.6 billion years old, are the oldest brought back from the Moon. The orange soil turned out to be tiny beads of glass, believed to come from volcanoes. They drove 7,370 meters (about 4.6 miles) away from Challenger, farther than any other Apollo crew. This moonwalk lasted 7 hours 36 minutes 56 seconds; they drove 20.3 kilometers (12.6 miles) and collected 75.18 pounds (34.1 kilograms) of samples.",
      },
      citations: [
        timeline('2 nd EVA started (LM cabin depressurized).'),
        timeline(
          'Arrived at station 4. Traverse gravimeter experiment reading obtained, gathered samples including a trench sample and a double core-tube sample, and performed documentary and panoramic photography.',
        ),
        timeline('2 nd EVA ended (LM cabin repressurized).'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'Extravehicular Activity',
          'Second Surface EVA, Duration and Samples Collected (lbm) rows, the longest surface EVA in the table',
          ABTN_EVA,
        ),
        report(
          'Section 1.0, "Summary" (printed page 1-2, PDF page 14): "The crew traveled 7370 meters away from the lunar module, and this is the greatest radial distance any crew has traveled away from the lunar module"',
        ),
        lands(
          'Paragraphs on the second excursion: the fender repair, the oldest samples at Station 2, Schmitt\'s call "There is orange soil!!", and the glass beads',
        ),
      ],
      discrepancy:
        "Apollo by the Numbers (Extravehicular Activity table) gives the farthest distance from the lunar module as 25,029 feet (7.6 kilometers). We follow the Mission Report's 7,370 meters.",
      photo: nasaPhoto(
        'as17-137-20990',
        1481,
        1600,
        'A patch of rusty orange soil in the gray ground on the rim of Shorty Crater, with a small tripod-like measuring tool standing on it and gray boulders behind.',
      ),
      view: 'moon',
      inTour: true,
    },
    {
      id: 'third-moonwalk',
      title: 'Third moonwalk: boulders on the mountainside',
      chapter: 'surface',
      elapsed: '160:52:48',
      utc: '1972-12-13T22:25:48Z',
      text: {
        short:
          'On the last drive, Cernan and Schmitt head north to the North Massif, a mountain where huge boulders have rolled down from above, and sample a giant broken one.',
        more: "At Station 6, about 250 feet up the mountain's slope, they studied Split Rock, a large boulder that had broken into five pieces after tumbling down long ago. They went on to the Sculptured Hills and Van Serg Crater, and on the drive back downhill they set a lunar speed record of 18 kilometers per hour (11 miles per hour). This moonwalk lasted 7 hours 15 minutes 8 seconds; they drove 12.1 kilometers (7.5 miles) and collected 136.69 pounds (62.0 kilograms) of samples.",
      },
      citations: [
        timeline('3 rd EVA started (LM cabin depressurized).'),
        timeline(
          'Arrived at station 6. Traverse gravimeter experiment reading obtained, gathered samples including a single core-tube sample, a rake sample, and performed documentary, panoramic , and 500 mm photography.',
        ),
        timeline('3 rd EVA ended (LM cabin repressurized).'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        table(
          'Extravehicular Activity',
          'Third Surface EVA, Duration and Samples Collected (lbm) rows',
          ABTN_EVA,
        ),
        lands(
          'Paragraphs on the third excursion: Split Rock at Station 6, Stations 7 to 9, and the speed record',
        ),
      ],
      photo: nasaPhoto(
        'as17-146-22294',
        1600,
        1600,
        'Schmitt, in a white spacesuit, stands beside a huge gray boulder much taller than he is. The front of the rover, with its dish antenna, is at left, on a gray slope under a black sky.',
      ),
      view: 'moon',
      inTour: true,
    },
    {
      id: 'last-steps',
      title: 'The last steps on the Moon',
      chapter: 'surface',
      elapsed: '168:07:56',
      utc: '1972-12-14T05:40:56Z',
      text: {
        short:
          "Schmitt climbs back into Challenger first. Cernan follows, taking the final step off the Moon's surface. Apollo 17 was the last Apollo mission to walk on the Moon.",
        more: 'Before going in, they dedicated a rock to students from around the world, and Cernan uncovered a plaque on Challenger\'s leg: "Here man completed his first exploration of the Moon, December 1972 A.D. May the spirit of peace in which he came be reflected in the lives of all mankind." He parked the rover so its TV camera could watch the liftoff. At the foot of the ladder he said, "as we leave the Moon at Taurus-Littrow, we leave as we came and, God willing, as we shall return, with peace and hope for all mankind." The moonwalk ended when the cabin was filled with air again, 168 hours 7 minutes 56 seconds after launch. NASA\'s Artemis IV page says the crewed landing it plans for early 2028 will be the first on the Moon in more than 50 years.',
      },
      citations: [
        timeline('LRV positioned to monitor LM ascent.'),
        timeline('3 rd EVA ended (LM cabin repressurized).'),
        eventsTable('End third extravehicular activity'),
        report(
          'Section 1.0, "Summary" (printed pages 1-2 and 1-3, PDF pages 14 and 15): the breccia rock "dedicated to nations represented by students", and the plaque on the landing gear',
        ),
        nmc(
          'lm',
          'Mission Profile: the plaque\'s words, and "The EVA ended with Gene Cernan taking the final step off the lunar surface"',
        ),
        lands(
          "Last paragraph: Schmitt climbed the ladder first, and Cernan's words as he prepared to climb it",
        ),
        LAST_APOLLO_LANDING,
        ARTEMIS_IV,
      ],
      view: 'moon',
      inTour: true,
    },

    /* --------------------------- Back to orbit -------------------------- */
    {
      id: 'lunar-liftoff',
      title: 'Liftoff from the Moon',
      chapter: 'reunion',
      elapsed: '185:21:37',
      utc: '1972-12-14T22:54:37Z',
      text: {
        short:
          "Challenger's top half blasts off, leaving its bottom half and the rover behind. The rover's TV camera, steered from Houston, follows it up into the black sky.",
        more: 'Schmitt\'s call of "Ignition" was the last word spoken from the Moon, and Cernan radioed, "We\'re on our way, Houston." Challenger had stood on the Moon for 74 hours 59 minutes 40 seconds. Because radio signals take time to cross to the Moon, the controller in Houston had to tilt the camera upward several seconds before liftoff to follow the climb. The ascent engine fired for 7 minutes 21 seconds and put the ascent stage in an orbit of about 56 by 10 miles (90 by 17 kilometers).',
      },
      citations: [
        timeline('LM lunar liftoff ignition (LM APS).'),
        timeline('LM ascent orbit cutoff.'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        report(
          'Table 3-V, "Maneuver Summary" (printed page 3-6, PDF page 24), "Ascent" row: firing time 441 seconds, orbit 48.5 by 9.1 miles',
        ),
        headsHome(
          'Paragraph on the liftoff: "Ignition," "the last word spoken from the Moon," "We\'re on our way, Houston," and the TV camera aimed from Mission Control',
        ),
      ],
      discrepancy:
        'NASA\'s history article "Apollo 17 Heads Home to Earth" says the ascent engine burned for 7 minutes 18 seconds. Apollo by the Numbers and the Mission Report give 441 seconds (7 minutes 21 seconds), which we follow.',
      photo: nasaPhoto(
        'S72-55421',
        1600,
        1268,
        'A blurry frame from a TV screen: the small, bright ascent stage of Challenger rising above the gray lunar ground and dark hills, with the descent stage left on the ground below.',
      ),
      view: 'moon',
      inTour: true,
    },
    {
      id: 'docking',
      title: 'Back together',
      chapter: 'reunion',
      elapsed: '187:37:15',
      utc: '1972-12-15T01:10:15Z',
      text: {
        short:
          'Challenger catches up with America, and Evans docks the two spacecraft 2 hours 15 minutes 38 seconds after liftoff from the Moon. The crew is together again.',
        more: "The two spacecraft had been apart for 79 hours 49 minutes 19 seconds. Cernan and Schmitt moved the samples and equipment into America, and 3 hours 41 minutes 16 seconds after docking Challenger's ascent stage was let go. It was then steered to crash into the Moon, and the seismometers left by Apollo 12, 14, 15, and 16 recorded the impact.",
      },
      citations: [
        timeline('CSM/LM docked.'),
        timeline('LM ascent stage jettisoned.'),
        timeline('LM ascent stage impact on lunar surface.'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        headsHome('Paragraph on the rendezvous and docking: "Evans completed the docking"'),
      ],
      photo: nasaPhoto(
        'as17-149-22857',
        1600,
        1600,
        "Challenger's ascent stage, an angular craft covered in silver and gold panels with a round dish antenna, floats against black space on its way to meet America.",
      ),
      view: 'spacecraft',
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: 'transearth-injection',
      title: 'Heading home',
      chapter: 'return',
      elapsed: '234:02:09.18',
      utc: '1972-12-16T23:35:09Z',
      text: {
        short:
          'After an extra day of science in lunar orbit, America fires its main engine behind the Moon to leave lunar orbit and head back to Earth.',
        more: 'The firing, called transearth injection, began 234 hours 2 minutes after launch and lasted 2 minutes 23.69 seconds. America had circled the Moon 75 times over 147 hours 43 minutes 37.11 seconds. Coming around the Moon, Cernan radioed, "America has found some fair winds and following seas, and we\'re on our way home."',
      },
      citations: [
        timeline('Transearth injection ignition (SPS).'),
        timeline('Transearth injection cutoff.'),
        summary('Lunar Orbit/Lunar Surface Phase'),
        headsHome("Paragraph on transearth injection: Cernan's radio call"),
      ],
      view: 'journey',
    },
    {
      id: 'spacewalk',
      title: 'A spacewalk far from Earth',
      chapter: 'return',
      elapsed: '254:54:40',
      utc: '1972-12-17T20:27:40Z',
      text: {
        short:
          "Evans climbs out of the command module and moves hand over hand back along the service module to bring in the film from the science bay's cameras.",
        more: 'In three trips he brought back the film from the lunar sounder, the panoramic camera, and the mapping camera, handing each one to Schmitt, who stood in the open hatch. A TV camera on a pole outside the hatch showed him working. The spacewalk lasted 1 hour 5 minutes 44 seconds.',
      },
      citations: [
        timeline('Transearth EVA started (Evans).'),
        timeline('Transearth EVA ended.'),
        summary('Transearth Phase'),
        table('Extravehicular Activity', 'Transearth EVA, Participant and Duration rows', ABTN_EVA),
        eventsTable('Start transearth extravehicular activity'),
        headsHome(
          "Paragraph on Evans' spacewalk: the TV camera on a pole, the handholds, and Schmitt in the hatch",
        ),
      ],
      discrepancy:
        "The Mission Report's summary (section 1.0, printed page 1-3, PDF page 15) and NASA's history article give 1 hour 6 minutes, and NSSDCA's Master Catalog 67 minutes. Apollo by the Numbers gives 1 hour 5 minutes 44 seconds, which matches the start and end times in the Mission Report's Table 3-I; we follow it.",
      view: 'spacecraft',
    },

    /* ----------------------------- Splashdown ---------------------------- */
    {
      id: 'entry',
      title: 'Entering the atmosphere',
      chapter: 'splashdown',
      elapsed: '301:38:38',
      utc: '1972-12-19T19:11:38Z',
      text: {
        short:
          "Only the cone-shaped command module is left. It reaches the top of Earth's atmosphere moving at about 24,600 miles per hour (39,600 kilometers per hour).",
        more: 'The crew cast off the service module at 301 hours 23 minutes 49 seconds, 14 minutes 49 seconds before entry. Entry is counted from 400,000 feet, about 76 miles (122 kilometers) up. Glowing hot gas around the capsule cut off radio contact for 3 minutes 20 seconds.',
      },
      citations: [
        eventsTable('Command module/service module separation'),
        eventsTable('Entry interface (400 000 feet)'),
        eventsTable('Begin blackout'),
        eventsTable('End blackout'),
        report(
          'Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 22), "Entry" row: space-fixed velocity 36 090.3 feet per second',
        ),
        summary('Recovery'),
        splashdown('Paragraph on entry: the plasma sheath "blocking out communications"'),
      ],
      discrepancy:
        "NASA's history article \"Apollo 17 Splash Down Ends the Beginning of Lunar Exploration\" says the blackout lasted about three and a half minutes. The Mission Report's sequence of events (Table 3-I) gives 301:38:55 to 301:42:15, 3 minutes 20 seconds, which we follow. The peak force on the crew is left out: Apollo by the Numbers' Entry table gives 6.49 g, but says some of its Apollo 17 entry data are preflight predictions, and the Mission Report does not give it.",
      view: 'earth',
    },
    {
      id: 'splashdown',
      title: 'Splashdown',
      chapter: 'splashdown',
      elapsed: '301:51:59',
      utc: '1972-12-19T19:24:59Z',
      text: {
        short:
          'Under three big parachutes, America splashes down in the South Pacific Ocean, southeast of Samoa. The last Apollo trip to the Moon is over.',
        more: 'Splashdown came 301 hours 51 minutes 59 seconds after launch, about 1.0 nautical mile from the target point, 350 nautical miles (650 kilometers) southeast of the Samoan Islands, and 3.5 nautical miles (6.5 kilometers) from the recovery ship USS Ticonderoga. A helicopter carried Schmitt, Evans, and Cernan to the ship, and they were aboard 52 minutes after splashdown.',
      },
      citations: [
        timeline('Main parachute deployed.'),
        timeline('Splashdown (went to apex-up).'),
        summary('Recovery'),
        table(
          'Entry, Splashdown and Recovery',
          'Earth Splashdown GET, GMT Time, Distance To Target (n mi), Distance To Recovery Ship (n mi), Minutes To Crew Pickup, and Recovery Ship rows',
          ABTN_ENTRY,
        ),
        nmc('csm', 'Mission Profile: "350 nautical miles SE of the Samoan Islands"'),
        report(
          'Section 1.0, "Summary" (printed page 1-3, PDF page 15): "The Apollo 17 mission thus brought to a close the Apollo Program"',
        ),
        splashdown(
          'Paragraph on entry and descent: "At 10,000 feet, the three 83-foot-wide main parachutes deployed"',
        ),
        splashdown(
          'Paragraph on the recovery: first Schmitt, then Evans, and finally Cernan lifted aboard the helicopter',
        ),
      ],
      discrepancy:
        'The Mission Report\'s section 3.4 (printed page 3-9, PDF page 27) says the landing "occurred 1.3 miles short of the targeted point." We follow Apollo by the Numbers\' 1.0 nautical mile, which the Mission Report\'s summary (section 1.0, printed page 1-3, PDF page 15) also gives as "about 1 mile from the planned location."',
      photo: nasaPhoto(
        's72-55834',
        1535,
        1600,
        'Seen from above, three red-and-white striped parachutes carry the small cone-shaped command module down to the deep blue Pacific Ocean, seconds before it hits the water.',
      ),
      view: 'earth',
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Command module America',
        museum: 'NASA Johnson Space Center',
        place: 'Houston, Texas',
      },
      citations: [
        {
          source: 'nssdca-apollo-current-locations',
          locator: 'Apollo 17, Command Module "America"',
        },
        nmc(
          'csm',
          'Mission Profile: the command module capsule "America" "is on display at the Johnson Space Center in Houston, Texas"',
        ),
      ],
    },
  ],
};
