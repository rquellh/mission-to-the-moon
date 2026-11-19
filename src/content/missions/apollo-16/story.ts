/**
 * Apollo 16: the first landing in the Moon's highlands, April 16 to 27,
 * 1972.
 *
 * Every event time is copied from Apollo by the Numbers (NASA SP-2000-4029):
 * elapsed times exactly as its Apollo 16 Timeline prints them, and UTC from
 * that table's GMT columns. The Apollo 16 Mission Report's sequence of
 * events (Table 3-I) agrees with them to the second, except for the
 * undocking and the command module's separation from the service module
 * (see the discrepancies on the "engine-problem" and "splashdown" events).
 * Where another NASA
 * source gives a different value, the `discrepancy` field says what it
 * gives and which we follow.
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (17:54:00 GMT on April 16, 1972). Liftoff itself came 0.59 seconds later.
 * Mission Control moved its own clock forward twice during the flight to
 * match the flight plan; those updates are not used here, as they are not in
 * the sources' tables (Mission Report section 2.0).
 *
 * Unit conversions in the text (nautical miles to miles and kilometers,
 * miles to kilometers, feet per second to miles and kilometers per hour,
 * feet to meters, pounds to kilograms) are our arithmetic on the cited
 * values.
 *
 * Durations of a minute or more are written in the text as minutes and
 * seconds, with the source's full precision kept: the 341.92 seconds in the
 * source is "5 minutes 41.92 seconds" here. That is our arithmetic too.
 *
 * The flight path itself (orbits, burns, landing and splashdown points) is
 * described in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const ABTN_SUMMARY = `${ABTN}Apollo_16a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_16i_Timeline.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-03_Crew_Information_-_Lunar_Landings.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_EVA = `${ABTN}Apollo_18-30_Extravehicular_Activity.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;

const MISSION_REPORT = "https://www.nasa.gov/wp-content/uploads/static/history/alsj/a16/A16_MissionReport.pdf";

const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-031A";
const NMC_LM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-031C";

/** A section of the Apollo by the Numbers Apollo 16 mission summary. */
function summary(section: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 16 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 16 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 16 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the statistical tables in Apollo by the Numbers, Apollo 16 column. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `"${name}" table, Apollo 16 column: ${rows}`,
    url,
  };
}

/** A place in the Apollo 16 Mission Report, with its printed and PDF page. */
function report(place: string): Citation {
  return { source: "apollo-16-mission-report", locator: place, url: MISSION_REPORT };
}

/** An NSSDCA Master Catalog spacecraft page: the command and service module, or the lunar module. */
function nmc(page: "csm" | "lm", section: string): Citation {
  if (page === "csm") {
    return {
      source: "nssdca-master-catalog",
      locator: `"Apollo 16 Command and Service Module (CSM)" (1972-031A), ${section}`,
      url: NMC_CSM,
    };
  }
  return {
    source: "nssdca-master-catalog",
    locator: `"Apollo 16 Lunar Module /ALSEP" (1972-031C), ${section}`,
    url: NMC_LM,
  };
}

const details = (section: string): Citation => ({ source: "nasa-apollo-16-mission-details", locator: section });
const landingSite = (place: string): Citation => ({ source: "nasa-apollo-16-landing-site", locator: place });
const onTheMoon = (place: string): Citation => ({ source: "nasa-apollo-16-on-the-moon", locator: place });
const headsHome = (place: string): Citation => ({ source: "nasa-apollo-16-heads-home", locator: place });
const splashesDown = (place: string): Citation => ({ source: "nasa-apollo-16-splashes-down", locator: place });

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-16/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-16/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: "NASA",
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: "apollo-16",
  program: "apollo",
  name: "Apollo 16",
  kind: "flight",
  destination: "moon",

  summary: {
    text: {
      short:
        "Apollo 16 was the first visit to the Moon's rugged highlands. In 1972, John Young and Charles Duke explored the Descartes region for almost three days with a rover, while Ken Mattingly studied the Moon from orbit.",
      more:
        "Apollo 16 launched from Kennedy Space Center on April 16, 1972. A problem with the main engine of the command module Casper held up the landing by almost six hours, but late on April 20, Eastern time, Young and Duke set the lunar module Orion down in the Descartes highlands. In three moonwalks they drove the Lunar Roving Vehicle 26.9 kilometers (16.7 miles), set up experiments, and collected 211.00 pounds (95.71 kilograms) of rock and soil. Because of the engine problem, the flight was cut one day short. On the way home Mattingly made a spacewalk to bring in film from Casper's cameras, and the crew splashed down in the Pacific Ocean on April 27.",
    },
    citations: [
      summary("Background"),
      summary("Ascent Phase"),
      summary("Lunar Orbit/Lunar Surface Phase"),
      summary("Transearth Phase"),
      summary("Recovery"),
      summary("Conclusions"),
      report('Section 2.0, "Introduction" (printed page 2-1, PDF page 13): the Descartes highlands were chosen because "an area of this type had not been previously visited"'),
      report('Section 1.0, "Summary" (printed page 1-1, PDF page 10): "The powered descent to the lunar surface was delayed approximately 5 3/4 hours"'),
      landingSite('Paragraph on the Descartes site: "the first location in the lunar highlands to be sampled"'),
      details("Mission Highlights"),
    ],
  },

  crew: {
    value: [
      { name: "John W. Young", role: "Commander" },
      { name: "Thomas K. Mattingly II", role: "Command module pilot" },
      { name: "Charles M. Duke Jr.", role: "Lunar module pilot" },
    ],
    citations: [
      summary("Background"),
      table("Crew Information - Lunar Landing Missions", "Commander, Command Module Pilot, and Lunar Module Pilot rows", ABTN_CREW),
      report('Section 1.0, "Summary" (printed page 1-1, PDF page 10): "Captain John W. Young, Commander; Lt. Commander Thomas K. Mattingly II, Command Module Pilot; and Lt. Colonel Charles M. Duke, Jr., Lunar Module Pilot"'),
      details("Crew"),
    ],
  },

  launch: {
    value: {
      utc: "1972-04-16T17:54:00Z",
      site: "Launch Complex 39, Pad A, Kennedy Space Center, Florida",
      vehicle: "Saturn V (SA-511)",
    },
    citations: [
      summary("Ascent Phase"),
      summary("Background"),
      timeline("Range zero."),
      details("Launch"),
      report('Section 1.0, "Summary" (printed page 1-1, PDF page 10): launched from Launch Complex 39A at 17:54:00 G.m.t. on April 16, 1972'),
    ],
  },

  duration: {
    value: "265:51:05",
    citations: [
      summary("Recovery"),
      table("Entry, Splashdown and Recovery", "Earth Splashdown, GET row", ABTN_ENTRY),
      report('Section 1.0, "Summary" (printed page 1-3, PDF page 12): "Total time for the Apollo 16 mission was 265 hours, 51 minutes, and 5 seconds"'),
    ],
  },

  callSigns: {
    value: [
      { craft: "Command module", name: "Casper" },
      { craft: "Lunar module", name: "Orion" },
    ],
    citations: [table("Call Signs", "Command Module and Lunar Module", ABTN_CALL_SIGNS), summary("Background"), details("Payload")],
  },

  accomplishments: [
    {
      text: {
        short:
          "Apollo 16 was the first mission to explore the Moon's highlands, its hilly, rugged parts. It showed that a crew could land safely in such rough country.",
        more:
          "Descartes was the first place in the lunar highlands to be sampled, and no crew had visited this kind of place before. At the time, most geologists believed the highlands had been made by volcanoes. The rocks Young and Duke found told a different story: they were breccias, rocks made of broken pieces stuck together, not the lava flows that had been widely expected. The flight also showed that the rover could drive in such hilly country, on slopes of up to 20 degrees.",
      },
      citations: [
        report('Section 2.0, "Introduction" (printed page 2-1, PDF page 13): "an area of this type had not been previously visited"'),
        report('Section 4.11.2, "Summary of Geology" (printed pages 4-22 and 4-23, PDF pages 38 and 39): "The Cayley formation appears to consist of light- and dark-colored breccias", and "It does not consist, at least in this area, of lava flows, as had been widely supposed"'),
        landingSite('Paragraph on the Descartes site: "At the time, most geologists believed the highlands to be of volcanic origin"'),
        details("Mission Objective"),
        summary("Conclusions"),
      ],
    },
    {
      text: {
        short:
          "On three moonwalks, Young and Duke spent more than 20 hours outside and brought home 211.00 pounds (95.71 kilograms) of Moon rocks and soil.",
        more:
          "In all they were outside for 20 hours 14 minutes 14 seconds and drove the rover 26.9 kilometers (16.7 miles). Their farthest point was 15,092 feet (4.6 kilometers) from Orion. They also set up a station of experiments that sent data to Earth until 1977.",
      },
      citations: [
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "Total Lunar Surface EVA, Total Duration, Total Distance Traveled, Total Samples Collected (lbm), and Maximum Distance Traveled From LM (ft) rows", ABTN_EVA),
        timeline("ALSEP central station turned off by ground command."),
        nmc("lm", "Apollo Lunar Surface Experiments Package: the central station \"was turned on at 19:38 UT on 21 April 1972 and shut down along with the other ALSEP stations on 30 September 1977\""),
      ],
      discrepancy:
        "NASA's mission details page and history article give 209 pounds of samples, and the Mission Report 26.7 kilometers driven. Apollo by the Numbers gives 211.00 pounds (95.71 kilograms, the official total from the Lunar Receiving Laboratory) and 26.9 kilometers, which we follow.",
    },
    {
      text: {
        short:
          "Young and Duke set up the first telescope on the Moon, a camera that took pictures of Earth and the stars in ultraviolet light, which cannot be seen from the ground on Earth.",
        more:
          "The far ultraviolet camera stood in Orion's shade and ran for about 51 hours. Its pictures were the first taken of the geocorona, a glow of hydrogen gas around Earth, from outside Earth's atmosphere. They showed that the glow is nearly round and reaches out more than 10 times Earth's radius, and they revealed two new belts of aurora, glowing light high in Earth's air, one on each side of Earth's magnetic equator.",
      },
      citations: [
        onTheMoon('First paragraph: "set up the first telescope on the Moon"; paragraph on the first Moon walk: the far ultraviolet camera/spectrograph set up "in the LM\'s shadow"'),
        details('Mission Objective: "an ultraviolet stellar camera to return photography of the Earth and celestial regions in spectral bands not seen from Earth"'),
        report('Section 4.8, "Far Ultraviolet Camera/Spectroscope Experiment" (printed page 4-16, PDF page 32): deployed "with the camera in the shade", operated "for a span of approximately 51 hours"; imagery showed "the geocorona is nearly spherical and extends out more than 10 earth radii" and "two auroral belts - one on either side of the magnetic equator"'),
        {
          ...summary("Conclusions"),
          locator:
            'Apollo 16 mission summary, "Conclusions" section: "the first photography obtained of the geocorona in the hydrogen (Lyman alpha) wavelength from outside Earth\'s atmosphere, and the discovery of two new auroral belts around Earth"',
        },
      ],
    },
    {
      text: {
        short:
          "While his crewmates were on the Moon, Ken Mattingly mapped and photographed it from orbit. On the way home he made a spacewalk to bring in the cameras' film.",
        more:
          "During 37 trips around the Moon on his own, he ran the cameras and instruments in the service module's science bay. He photographed the near and far sides, mapped what the surface is made of, and measured the Moon's very thin atmosphere. His results checked those of Apollo 15 and covered ground it had not.",
      },
      citations: [
        headsHome("Paragraph on Mattingly's work in lunar orbit: his 37 solo revolutions"),
        details("Mission Highlights: \"The results verified Apollo 15 data and provided information on lunar terrain not previously covered\""),
        report('Section 1.0, "Summary" (printed pages 1-2 and 1-3, PDF pages 11 and 12): orbital science, and the transearth extravehicular activity to retrieve the film cassettes'),
        summary("Transearth Phase"),
      ],
    },
  ],

  chapters: [
    { id: "launch", title: "Launch" },
    { id: "lunar-orbit", title: "At the Moon" },
    { id: "surface", title: "On the Moon" },
    { id: "return", title: "Coming home" },
  ],

  events: [
    /* ---------------------------- Launch ---------------------------- */
    {
      id: "liftoff",
      handsOn: "stages",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00.59",
      utc: "1972-04-16T17:54:00Z",
      text: {
        short:
          "A Saturn V rocket lifts Apollo 16 off the launch pad in Florida. Its three astronauts are headed for the highlands of the Moon, a kind of place no one has explored before.",
        more:
          "Apollo 16 lifted off from Launch Complex 39, Pad A, at Kennedy Space Center at 12:54 p.m. Eastern Standard Time on April 16, 1972, under a fair sky. John Young, the commander, was making his fourth spaceflight. For Ken Mattingly, the command module pilot, and Charles Duke, the lunar module pilot, it was the first. Mattingly had been taken off the Apollo 13 crew because he might catch German measles.",
      },
      citations: [
        timeline("Liftoff (umbilical disconnected)."),
        summary("Ascent Phase"),
        summary("Launch Preparations"),
        summary("Background"),
        report('Section 2.0, "Introduction" (printed page 2-1, PDF page 13): "an area of this type had not been previously visited"'),
      ],
      photo: nasaPhoto(
        "S72-35345",
        1600,
        814,
        "The white Saturn V climbs on a column of flame beside its orange launch tower, seen past palm trees and scrub, with huge clouds of exhaust rolling out on both sides under a blue sky.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "translunar-injection",
      title: "On the way to the Moon",
      chapter: "launch",
      elapsed: "002:33:36.50",
      utc: "1972-04-16T20:27:36Z",
      text: {
        short:
          "After going around Earth one and a half times, the rocket's third stage fires its engine again for almost 6 minutes. This big push sends Apollo 16 toward the Moon.",
        more:
          "This firing, called translunar injection, began 2 hours 33 minutes after launch and lasted 5 minutes 41.92 seconds. Ten seconds after it ended, Apollo 16 was moving at about 24,250 miles per hour (39,030 kilometers per hour). About 25 minutes later, the command and service module separated from the stage, turned around, and docked with the lunar module, which had ridden on top of the stage. The crew named the command module Casper, after Casper the Friendly Ghost, because their white suits looked shapeless on television, and the lunar module Orion, after the constellation, because they would find their way by sighting stars.",
      },
      citations: [
        timeline("S-IVB 2nd burn ignition."),
        timeline("Translunar injection."),
        timeline("CSM separated from S-IVB."),
        timeline("CSM docked with LM/S-IVB."),
        summary("Translunar Phase"),
        table("Call Signs", "Command Module and Lunar Module", ABTN_CALL_SIGNS),
      ],
      view: "journey",
    },

    /* --------------------------- At the Moon -------------------------- */
    {
      id: "engine-problem",
      title: "Trouble with Casper's engine",
      chapter: "lunar-orbit",
      // The Timeline prints this row to the minute (097:40, 19:34 GMT), so
      // the seconds are 00 and the text says "about".
      elapsed: "097:40:00",
      utc: "1972-04-20T19:34:00Z",
      text: {
        short:
          "Orion has just undocked to go and land when Casper's main engine shows a problem. The landing has to wait while engineers on Earth work out whether the engine is safe.",
        more:
          "At 74 hours 28 minutes, Casper's main engine had begun a 6-minute 14.90-second firing to put Apollo 16 into orbit around the Moon, and Young and Duke undocked in Orion at 96 hours 13 minutes. At about 97 hours 40 minutes, behind the Moon, Mattingly was checking Casper's engine before firing it to move into a higher, rounder orbit. A backup system that steers the engine made it swing back and forth and shake the spacecraft. \"I be a sorry bird,\" he radioed. Without that engine, the crew would have had to use Orion's descent engine to leave the Moon. Casper flew back close to Orion while tests and analysis went on for 5 hours 45 minutes. They showed that the backup system was still usable and safe, so the two spacecraft separated again, and Mattingly fired the engine at 103 hours 21 minutes.",
      },
      citations: [
        timeline("Lunar orbit insertion ignition (SPS)."),
        timeline("Lunar orbit insertion cutoff."),
        summary("Translunar Phase"),
        timeline("LM undocking and separation."),
        timeline(
          "CSM checkout indicated no rate feedback and SPS engine gimbal Position indicator showed yaw oscillations. Planned circularization maneuver at 097:41:44 not performed.",
        ),
        timeline("Rendezvous (CSM active)."),
        timeline("LM separation from CSM."),
        timeline("CSM orbit circularization ignition (SPS)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        report('Section 1.0, "Summary" (printed page 1-1, PDF page 10): oscillations in "a secondary yaw gimbal actuator on the service propulsion system engine"; "A command-and-service-module-active rendezvous was performed to place the vehicles in close proximity"; "the redundant system was still usable and safe"'),
        onTheMoon('Paragraph on undocking and the engine problem: "I be a sorry bird"; "Without a working SPS, the astronauts would have to rely on the LM\'s descent engine to fire them out of lunar orbit"'),
      ],
      discrepancy:
        "The Mission Report's Table 3-I gives undocking at 96:14:00, and NSSDCA's Master Catalog at 18:08:00 UT. Apollo by the Numbers and the Mission Report's Table 3-III give 96:13:31 (18:07:31 GMT), which we follow.",
      view: "spacecraft",
      inTour: true,
    },

    /* ---------------------------- On the Moon --------------------------- */
    {
      id: "landing",
      title: "Landing at Descartes",
      chapter: "surface",
      elapsed: "104:29:35",
      utc: "1972-04-21T02:23:35Z",
      text: {
        short:
          "Almost six hours late, Young and Duke land Orion in the Moon's hilly highlands, at a place called Descartes.",
        more:
          "Orion's descent engine fired at 104 hours 17 minutes, and Orion touched down 12 minutes 10 seconds later, at 9:23 p.m. Eastern Standard Time on April 20, 1972. Near the end, Young took over the controls to steer past a small crater the computer was heading for. Looking out the window, he said, \"Well, we don't have to walk far to pick up rocks, Houston. We're among them!\" Because the landing was so late, the two astronauts slept before their first moonwalk.",
      },
      citations: [
        timeline("LM powered descent engine ignition (LM DPS)."),
        timeline("LM lunar landing."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        report('Section 3.3.2, "Descent" (printed page 3-7, PDF page 20): "Landing occurred 12 minutes and 10 seconds after engine ignition"'),
        report('Section 1.0, "Summary" (printed page 1-1, PDF page 10): the descent "was delayed approximately 5 3/4 hours"'),
        onTheMoon("Paragraphs on the descent and landing: Young took manual control at about 300 feet to avoid a crater; his words after touchdown; the sleep period before the first excursion"),
      ],
      view: "moon",
      inTour: true,
    },
    {
      id: "first-moonwalk",
      title: "First moonwalk",
      chapter: "surface",
      elapsed: "118:53:38",
      utc: "1972-04-21T16:47:38Z",
      text: {
        short:
          "Young and Duke climb down to the surface and unload their rover. Young jumps high off the ground as he salutes the flag.",
        more:
          "The first moonwalk began when the air was let out of Orion's cabin at 118 hours 53 minutes. Stepping off the ladder, Young said, \"There you are: Mysterious and Unknown Descartes. Highland plains. Apollo 16 is gonna change your image.\" The astronauts set up the rover, an ultraviolet camera, the flag, and a station of experiments. Young tripped on a cable and broke it, so the experiment that was to measure heat flowing out of the Moon could not work. Then they drove west to Flag and Plum craters, where they picked up \"Big Muley.\" At nearly 26 pounds (almost 12 kilograms), it was the largest single rock any Apollo crew brought back. This moonwalk lasted 7 hours 11 minutes 2 seconds.",
      },
      citations: [
        timeline("1st EVA started (LM cabin depressurized)."),
        timeline("Lunar roving vehicle (LRV) offloaded."),
        timeline("United States flag deployed."),
        timeline("1st EVA ended (LM cabin repressurized)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "First Surface EVA, Duration row", ABTN_EVA),
        report('Section 4.11.2, "Summary of Geology" (printed page 4-22, PDF page 38): "station 1 (Flag and Plum Craters)"'),
        onTheMoon("Paragraphs on the first Moon walk: Young's words, the far ultraviolet camera, the flag and Young's leaping salute, the broken Heat Flow Experiment cable, and Big Muley at Plum Crater"),
        nmc("lm", "ALSEP instruments: \"a heat flow experiment, designed to measure the rate of heat loss from the lunar interior\""),
      ],
      photo: nasaPhoto(
        "as16-113-18339",
        1600,
        1600,
        "Young, in a white spacesuit, hangs in the air a little above the gray ground as he salutes the United States flag. To the left stand the lunar module Orion and the parked rover, with the rounded slope of Stone Mountain behind, under a black sky.",
      ),
      view: "moon",
      inTour: true,
    },
    {
      id: "second-moonwalk",
      title: "Up the side of Stone Mountain",
      chapter: "surface",
      elapsed: "142:39:35",
      utc: "1972-04-22T16:33:35Z",
      text: {
        short:
          "On their second drive, Young and Duke steer the rover up the slope of Stone Mountain to collect rocks high above their landing site.",
        more:
          "They drove 3.2 miles (5.1 kilometers) south to their first stop, near Cinco Craters, and parked on the mountain's slope. From there they could see Orion on the plain 2.5 miles (4.0 kilometers) away and 430 feet (131 meters) below. Gathering samples on the slope was the hardest work of the mission. On the way back they stopped at several more craters. This moonwalk lasted 7 hours 23 minutes 9 seconds, the longest yet, and brought back 63.93 pounds (29.0 kilograms) of rock and soil.",
      },
      citations: [
        timeline("2nd EVA started (LM cabin depressurized)."),
        timeline("2nd EVA ended (LM cabin repressurized)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "Second Surface EVA, Duration and Samples Collected (lbm) rows", ABTN_EVA),
        details("Mission Highlights: \"Second EVA began with drive south to Stone Mountain, where surface and core samples were collected at two stations in the area of Cinco Craters\""),
        onTheMoon("Paragraphs on the second Moon walk: the 3.2-mile drive, the view of the LM 2.5 miles away and 430 feet lower, the most difficult work of the mission, and the longest Moon walk to that time"),
      ],
      view: "moon",
    },
    {
      id: "third-moonwalk",
      title: "North Ray Crater",
      chapter: "surface",
      elapsed: "165:31:28",
      utc: "1972-04-23T15:25:28Z",
      text: {
        short:
          "On the last drive, Young and Duke go north to North Ray Crater, the biggest crater any Apollo crew explored. On its rim sits a boulder as big as a house.",
        more:
          "Because the landing had been late, this moonwalk was cut to about five hours, and four planned stops were dropped. North Ray Crater is about 1,500 feet (460 meters) wide. The astronauts took samples from the giant boulder, which they called House Rock. At another boulder, Shadow Rock, Duke crawled under an overhang to scoop up soil that had probably always been in shadow. Young parked the rover about 300 feet (91 meters) east of Orion so its TV camera could watch the liftoff. This moonwalk lasted 5 hours 40 minutes 3 seconds.",
      },
      citations: [
        timeline("3rd EVA started (LM cabin depressurized)."),
        timeline("3rd EVA ended (LM cabin repressurized)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "Third Surface EVA, Duration row", ABTN_EVA),
        report('Section 4.11.1, "Sample Collection" (printed page 4-22, PDF page 38): the third extravehicular activity was "limited to 5 hours"; at station 13, "a soil sample that had probably been in permanent shadow was obtained from the base of a large overhang"'),
        onTheMoon("Paragraphs on the third Moon walk: North Ray Crater, \"the largest crater – 1,500 feet in diameter and two hundred feet deep – explored by any Apollo crew\"; House Rock; Shadow Rock; the Rover parked 300 feet east of the LM"),
      ],
      view: "moon",
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: "lunar-liftoff",
      title: "Liftoff from the Moon",
      chapter: "return",
      elapsed: "175:31:47.9",
      utc: "1972-04-24T01:25:47Z",
      text: {
        short:
          "Orion's top half lifts off, leaving its bottom half and the rover behind, and climbs back to orbit to meet Mattingly in Casper.",
        more:
          "The ascent engine fired at 175 hours 31 minutes, after Orion had been on the Moon for 71 hours 2 minutes 13 seconds, and the rover's TV camera showed the liftoff on Earth. \"What a ride! What a ride!\" Duke called out. Orion docked with Casper a little over 2 hours later. The next morning, Mission Control told the crew that because of the earlier engine trouble, Apollo 16 would come home one day early. Orion's top half was let go, but it began to tumble, so it could not be steered into the Moon as planned. At 200 hours 21 minutes, behind the Moon, Casper fired its engine for 2 minutes 42.29 seconds to head for home.",
      },
      citations: [
        timeline("LM lunar liftoff ignition (LM APS)."),
        timeline("CSM/LM docked."),
        timeline("LM ascent stage jettisoned."),
        timeline("Transearth injection ignition (SPS)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        headsHome("Paragraphs on the liftoff, the docking, and the next morning: Duke's words, the decision to leave lunar orbit one day early, and the tumbling LM"),
        report('Section 3.3.4, "Lunar Module Deorbit Maneuver" (printed page 3-7, PDF page 20): attitude control was lost after jettison, and the ascent stage remained in lunar orbit'),
      ],
      view: "moon",
    },
    {
      id: "spacewalk",
      title: "A spacewalk on the way home",
      chapter: "return",
      elapsed: "218:39:46",
      utc: "1972-04-25T20:33:46Z",
      text: {
        short:
          "On the way home, Mattingly climbs out of Casper, far out in space, to bring in the film from the cameras on the side of the service module.",
        more:
          "Duke stood in the open hatch and passed the film cassettes to Young inside, while a TV camera Mattingly had set up showed the spacewalk on Earth. Mattingly made two trips to the science bay, looked over the instruments, and held a small experiment out toward the Sun for ten minutes to learn how microbes respond to space. He was outside for 1 hour 23 minutes 42 seconds.",
      },
      citations: [
        timeline("Transearth EVA started (Mattingly)."),
        timeline("Transearth EVA ended."),
        summary("Transearth Phase"),
        table("Extravehicular Activity", "Transearth EVA, Participant and Duration rows", ABTN_EVA),
        headsHome("Paragraph on the spacewalk: the TV camera, two trips to the SIM bay, Duke in the open hatch, the microbial experiment pointed at the Sun for 10 minutes"),
      ],
      discrepancy:
        "NSSDCA's Master Catalog gives the start as 20:43 UT and the length as 1 hour 24 minutes. Apollo by the Numbers gives 218:39:46 (20:33:46 GMT) and 1 hour 23 minutes 42 seconds, which match the start and end times in the Mission Report's Table 3-I; we follow them.",
      photo: nasaPhoto(
        "S72-37001",
        1600,
        1115,
        "A film frame taken from the open hatch: Mattingly, in a white spacesuit and a helmet with a red stripe, floats outside the spacecraft against black space. The back of Duke's white helmet fills the lower left corner.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "return",
      elapsed: "265:51:05",
      utc: "1972-04-27T19:45:05Z",
      text: {
        short:
          "Casper falls back through Earth's air and splashes down under three parachutes in the Pacific Ocean, close to the Navy recovery ship USS Ticonderoga.",
        more:
          "The command module separated from the service module at 265 hours 22 minutes and reached the top of the atmosphere 15 minutes later, moving at about 24,680 miles per hour (39,720 kilometers per hour). As the air slowed it, the crew felt a peak of 7.19 g, about seven times their normal weight. Splashdown came 265 hours 51 minutes 5 seconds after launch, 2.7 nautical miles (5.0 kilometers) from Ticonderoga. Casper landed upside down, but three balloons inflated and turned it upright in 4 minutes 25 seconds. A helicopter carried the crew to the ship, and they were aboard 37 minutes after splashdown.",
      },
      citations: [
        report('Table 3-I, "Sequence of Events" (printed page 3-2, PDF page 15): "Command module/service module separation" at 265:22:33'),
        timeline("Entry."),
        timeline("Splashdown (went to apex-down)."),
        timeline("CM returned to apex-up position."),
        summary("Recovery"),
        table(
          "Entry, Splashdown and Recovery",
          "Earth Entry GET, Velocity (ft/sec), and Maximum g rows; Earth Splashdown GET, Distance To Recovery Ship (n mi), Minutes To Crew Pickup, and Recovery Ship rows",
          ABTN_ENTRY,
        ),
        splashesDown("Paragraph on splashdown and recovery: \"Three self-inflating balloons righted the spacecraft\""),
      ],
      discrepancy:
        "Apollo by the Numbers' Apollo 16 Timeline gives the separation from the service module at 265:22:23. Its mission summary and the Mission Report's Table 3-I give 265:22:33, which we follow.",
      photo: nasaPhoto(
        "s72-36293",
        1600,
        1531,
        "Seen from above, the command module hits the dark blue Pacific in a burst of white spray, under three red-and-white striped parachutes.",
      ),
      view: "earth",
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: "Command module Casper",
        museum: "U.S. Space and Rocket Center",
        place: "Huntsville, Alabama",
      },
      citations: [
        { source: "nssdca-apollo-current-locations", locator: "Apollo 16, Command Module \"Casper\"" },
        nmc("csm", "Mission Profile"),
        {
          source: "nasm-apollo-16-command-module",
          locator:
            "Object description (\"NASA transferred the Apollo 16 Command Module to the Smithsonian Institution in 1974\") and Display Status (\"not on display at the National Air and Space Museum. It is either on loan or in storage\")",
        },
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for the command and service module names the Alabama Space and Rocket Center in Huntsville. NSSDCA's \"Where are they now?\" page names the U.S. Space and Rocket Center in Huntsville, which we follow.",
    },
  ],
};
