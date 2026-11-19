/**
 * Apollo 15: the first long science mission to the Moon and the first to
 * carry the Lunar Roving Vehicle, July 26 to August 7, 1971.
 *
 * Every event time is copied from Apollo by the Numbers (NASA SP-2000-4029):
 * elapsed times exactly as its Apollo 15 Timeline prints them, and UTC from
 * that table's GMT columns. The Apollo 15 Mission Report's sequence of
 * events (Table 3-I) agrees with them to within a second. Where another NASA
 * source gives a different value, the `discrepancy` field says what it
 * gives and which we follow.
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (13:34:00 GMT on July 26, 1971). Liftoff itself came 0.58 seconds later.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers,
 * kilometers to miles, feet per second to miles and kilometers per hour,
 * feet to meters) are our arithmetic on the cited values.
 *
 * Durations of a minute or more are written in the text as minutes and
 * seconds, with the source's full precision kept: the 398.36 seconds in the
 * source is "6 minutes 38.36 seconds" here. That is our arithmetic too.
 *
 * The flight path itself (orbits, burns, landing and splashdown points) is
 * described in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const ABTN_SUMMARY = `${ABTN}Apollo_15a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_15i_Timeline.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-03_Crew_Information_-_Lunar_Landings.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_LM_LANDING = `${ABTN}Apollo_18-27_LM_Lunar_Landing.htm`;
const ABTN_EVA = `${ABTN}Apollo_18-30_Extravehicular_Activity.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;

const MISSION_REPORT = "https://ntrs.nasa.gov/api/citations/19720021182/downloads/19720021182.pdf";

const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063A";
const NMC_LM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C";
const NMC_SUBSATELLITE = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063D";

/** A section of the Apollo by the Numbers Apollo 15 mission summary. */
function summary(section: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 15 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 15 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 15 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the statistical tables in Apollo by the Numbers, Apollo 15 column. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `"${name}" table, Apollo 15 column: ${rows}`,
    url,
  };
}

/** A place in the Apollo 15 Mission Report, with its printed and PDF page. */
function report(place: string): Citation {
  return { source: "apollo-15-mission-report", locator: place, url: MISSION_REPORT };
}

/** An NSSDCA Master Catalog spacecraft page: the command and service module, the lunar module, or the subsatellite. */
function nmc(page: "csm" | "lm" | "subsatellite", section: string): Citation {
  if (page === "csm") {
    return {
      source: "nssdca-master-catalog",
      locator: `"Apollo 15 Command and Service Module (CSM)" (1971-063A), ${section}`,
      url: NMC_CSM,
    };
  }
  if (page === "lm") {
    return {
      source: "nssdca-master-catalog",
      locator: `"Apollo 15 Lunar Module /ALSEP" (1971-063C), ${section}`,
      url: NMC_LM,
    };
  }
  return {
    source: "nssdca-master-catalog",
    locator: `"Apollo 15 Subsatellite" (1971-063D), ${section}`,
    url: NMC_SUBSATELLITE,
  };
}

const details = (section: string): Citation => ({ source: "nasa-apollo-15-mission-details", locator: section });
const onTheMoon = (place: string): Citation => ({ source: "nasa-apollo-15-on-the-moon", locator: place });
const headsHome = (place: string): Citation => ({ source: "nasa-apollo-15-heads-home", locator: place });
const homeFromTheMoon = (place: string): Citation => ({ source: "nasa-apollo-15-home-from-the-moon", locator: place });

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-15/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-15/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: "NASA",
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

const NMC_DIFFERS = "NSSDCA's Master Catalog page for the Apollo 15";

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: "apollo-15",
  program: "apollo",
  name: "Apollo 15",
  kind: "flight",
  destination: "moon",

  summary: {
    text: {
      short:
        "Apollo 15 was the first long science trip to the Moon, and the first to bring a car. In 1971, David Scott and James Irwin explored the Moon for almost three days and drove the Lunar Roving Vehicle, while Alfred Worden studied the Moon from orbit.",
      more:
        "Apollo 15 launched from Kennedy Space Center on July 26, 1971. On July 30, Scott and Irwin landed the lunar module Falcon at Hadley-Apennine, a plain at the foot of the Apennine Mountains beside a winding canyon called Hadley Rille. In three moonwalks they drove the rover about 27.9 kilometers (17.3 miles) and collected 170.44 pounds (77.31 kilograms) of rock and soil. Worden, circling the Moon in the command module Endeavour, ran a new bay of cameras and instruments and later released a small satellite into lunar orbit. On the way home he made the first spacewalk in deep space, and the crew splashed down in the Pacific Ocean on August 7.",
    },
    citations: [
      summary("Background"),
      summary("Ascent Phase"),
      summary("Lunar Orbit/Lunar Surface Phase"),
      summary("Transearth Phase"),
      summary("Recovery"),
      details("Mission Objective and Mission Highlights"),
      nmc("csm", "Mission Profile"),
    ],
  },

  crew: {
    value: [
      { name: "David R. Scott", role: "Commander" },
      { name: "Alfred M. Worden", role: "Command module pilot" },
      { name: "James B. Irwin", role: "Lunar module pilot" },
    ],
    citations: [
      summary("Background"),
      table("Crew Information - Lunar Landing Missions", "Commander, Command Module Pilot, and Lunar Module Pilot rows", ABTN_CREW),
      details("Crew"),
    ],
    discrepancy:
      "The Mission Report (page 1-1, PDF page 10) prints the command module pilot as \"Alfred J. Worden.\" Apollo by the Numbers gives Alfred Merrill Worden, and NASA's mission details page Alfred M. Worden, which we follow.",
  },
  crewPhoto: nasaPhoto(
    "S71-37963",
    1200,
    923,
    "From left, David R. Scott, Alfred M. Worden, and James B. Irwin in white spacesuits. Worden sits in front, between the other two, beneath a large Apollo 15 emblem on a cratered backdrop that looks like the Moon's surface.",
  ),

  launch: {
    value: {
      utc: "1971-07-26T13:34:00Z",
      site: "Launch Complex 39, Pad A, Kennedy Space Center, Florida",
      vehicle: "Saturn V (SA-510)",
    },
    citations: [
      summary("Ascent Phase"),
      summary("Background"),
      timeline("Range zero."),
      details("Launch"),
      report("Section 1.0, \"Mission Summary\" (printed page 1-1, PDF page 10): launched from Complex 39A at 13:34:00.6 G.m.t. on July 26, 1971"),
    ],
  },

  duration: {
    value: "295:11:53.0",
    citations: [
      summary("Recovery"),
      table("Entry, Splashdown and Recovery", "Earth Splashdown, GET row", ABTN_ENTRY),
    ],
  },

  callSigns: {
    value: [
      { craft: "Command module", name: "Endeavour" },
      { craft: "Lunar module", name: "Falcon" },
    ],
    citations: [
      table("Call Signs", "Command Module and Lunar Module", ABTN_CALL_SIGNS),
      summary("Background"),
      { source: "nasm-apollo-15-command-module", locator: "Object description" },
    ],
    discrepancy:
      "Apollo by the Numbers' Call Signs table, NSSDCA, and NASA's mission details page spell the command module's name \"Endeavor.\" Apollo by the Numbers' mission summary, the Smithsonian, and NASA's history articles spell it \"Endeavour,\" like Captain James Cook's ship it was named for; we follow them.",
  },

  accomplishments: [
    {
      text: {
        short:
          "Apollo 15 was the first of three missions built for longer stays and more science on the Moon. Falcon stayed on the surface for almost three days.",
        more:
          "Apollo 15 was the first \"J\" mission. Its lunar module was changed to carry more equipment and to stay longer, and the crew wore improved spacesuits and backpacks. Falcon stayed on the Moon for 66 hours 54 minutes 53.9 seconds, and Scott and Irwin spent 18 hours 34 minutes 46 seconds outside on three moonwalks, more than any crew before them.",
      },
      citations: [
        summary("Background"),
        summary("Lunar Orbit/Lunar Surface Phase"),
        summary("Conclusions"),
        table("Extravehicular Activity", "Total Lunar Surface EVA, Total Duration row", ABTN_EVA),
        details("Mission Objective and Mission Highlights"),
      ],
      discrepancy:
        "NSSDCA's Master Catalog gives 18 hours 35 minutes outside and NASA's mission details page 18 hours 37 minutes. Apollo by the Numbers gives 18 hours 34 minutes 46 seconds, which we follow.",
    },
    {
      text: {
        short:
          "Scott and Irwin drove the first car on the Moon, the Lunar Roving Vehicle. It let them explore much farther from their lander than earlier crews could walk.",
        more:
          "The rover was a light, four-wheeled car powered by two 36-volt batteries. It weighed 462 pounds on Earth and rode to the Moon folded up in a bay of Falcon's descent stage. On three drives the astronauts covered about 27.9 kilometers (17.3 miles), and their farthest point was 16,470 feet (5.0 kilometers) from Falcon.",
      },
      citations: [
        summary("Background"),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "Total Lunar Surface EVA, Total Distance Traveled and Maximum Distance Traveled From LM (ft) rows", ABTN_EVA),
        details("Mission Highlights"),
        nmc("lm", "Mission Profile"),
      ],
    },
    {
      text: {
        short:
          "The astronauts brought home 170.44 pounds (77.31 kilograms) of Moon rocks and soil, including a white rock that became known as the Genesis Rock.",
        more:
          "They collected samples at stops along all three drives, from the slopes of the Apennine Mountains to the rim of Hadley Rille. The Genesis Rock, a white crystalline rock, was found at Spur Crater on the second drive. They also drilled a core sample from about 10 feet (3 meters) below the surface, and set up a station of experiments that sent data to Earth until 1977.",
      },
      citations: [
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "Total Lunar Surface EVA, Total Samples Collected (lbm) row", ABTN_EVA),
        onTheMoon("Paragraph on the second Moon walk: Station 7 at Spur Crater, \"a white crystalline rock later dubbed the Genesis Rock\""),
        details("Mission Highlights: \"obtained a core sample from about 10 feet beneath the lunar surface\""),
        nmc("lm", "Mission Profile and ALSEP Scientific Instruments"),
        timeline("ALSEP central station turned off by ground command."),
      ],
    },
    {
      text: {
        short:
          "Alfred Worden studied the Moon from orbit with a new bay of cameras and instruments. Before leaving, the crew put the first satellite into lunar orbit ever launched by astronauts.",
        more:
          "The service module carried a new scientific instrument module, or SIM bay. While his crewmates were on the surface, Worden circled the Moon 34 times, photographing it and mapping what its surface is made of. The small subsatellite measured particles and magnetic fields around the Moon.",
      },
      citations: [
        summary("Background"),
        summary("Lunar Orbit/Lunar Surface Phase"),
        report("Section 1.0, \"Mission Summary\" (printed page 1-3, PDF page 12): 34 lunar orbits with the scientific instrument module experiments and cameras"),
        details("Mission Objective and Mission Highlights: \"the first satellite placed in lunar orbit by a crewed spacecraft\""),
        nmc("subsatellite", "Description"),
      ],
    },
    {
      text: {
        short: "On the way home, Worden made the first spacewalk in deep space, far from Earth, to bring in the cameras' film.",
        more:
          "It took place on August 5, 1971, on the way from the Moon to Earth, and lasted 39 minutes 7 seconds.",
      },
      citations: [
        summary("Transearth Phase"),
        table("Extravehicular Activity", "Transearth EVA, Participant and Duration rows", ABTN_EVA),
        nmc("csm", "Mission Profile: \"Worden carried out the first deep space EVA\""),
        details("Mission Highlights: \"Alfred Worden became the first human to carry out a deep space EVA\""),
      ],
    },
  ],

  chapters: [
    { id: "launch", title: "Launch" },
    { id: "outbound", title: "To the Moon" },
    { id: "lunar-orbit", title: "Lunar orbit" },
    { id: "surface", title: "On the Moon" },
    { id: "reunion", title: "Back to orbit" },
    { id: "return", title: "Coming home" },
    { id: "splashdown", title: "Splashdown" },
  ],

  events: [
    /* ---------------------------- Launch ---------------------------- */
    {
      id: "liftoff",
      handsOn: "stages",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00.58",
      utc: "1971-07-26T13:34:00Z",
      text: {
        short:
          "A Saturn V rocket lifts Apollo 15 off the launch pad in Florida. Its three astronauts are headed for the mountains of the Moon.",
        more:
          "Apollo 15 lifted off from Launch Complex 39, Pad A, at Kennedy Space Center at 9:34 a.m. Eastern Daylight Time on July 26, 1971. All three crew members were Air Force officers: David Scott, commander; Alfred Worden, command module pilot; and James Irwin, lunar module pilot. The weather was fair, with high cirrus clouds over 70 percent of the sky.",
      },
      citations: [
        timeline("Liftoff (umbilical disconnected)."),
        summary("Ascent Phase"),
        summary("Launch Preparations"),
        summary("Background"),
      ],
      photo: nasaPhoto(
        "S71-41356",
        753,
        1600,
        "The white Saturn V rocket rises beside its orange launch tower on a column of bright flame, with clouds of exhaust billowing at its base under a deep blue sky.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "translunar-injection",
      title: "Burn toward the Moon",
      chapter: "launch",
      elapsed: "002:50:02.90",
      utc: "1971-07-26T16:24:02Z",
      text: {
        short:
          "After going around Earth one and a half times, the rocket's third stage fires its engine again for almost 6 minutes. This big push sends Apollo 15 toward the Moon.",
        more:
          "This firing, called translunar injection, began 2 hours 50 minutes after launch and lasted 5 minutes 50.71 seconds. Ten seconds after it ended, Apollo 15 was moving at about 24,300 miles per hour (39,000 kilometers per hour), on its way out of Earth orbit.",
      },
      citations: [
        timeline("S-IVB 2 nd burn ignition."),
        timeline("Translunar injection."),
        summary("Translunar Phase"),
      ],
      view: "journey",
      inTour: true,
    },

    /* --------------------------- To the Moon -------------------------- */
    {
      id: "transposition-docking",
      title: "Turning around to dock with Falcon",
      chapter: "outbound",
      elapsed: "003:33:49.5",
      utc: "1971-07-26T17:07:49Z",
      text: {
        short:
          "Endeavour separates from the rocket, turns around, and docks with the lunar module Falcon, which rode inside the rocket's top stage.",
        more:
          "The command and service module Endeavour separated from the S-IVB stage 3 hours 22 minutes after launch, turned around, and docked with Falcon 11 minutes later, while a color television camera on board covered the docking. The docked spacecraft pulled free of the stage at 4 hours 18 minutes. The empty stage was then steered to crash into the Moon, and on July 29 the seismometers left by Apollo 12 and Apollo 14 felt it hit.",
      },
      citations: [
        timeline("CSM separated from S-IVB."),
        timeline("CSM docked with LM/S-IVB."),
        timeline("CSM/LM ejected from S-IVB."),
        timeline("S-IVB impact on lunar surface."),
        summary("Translunar Phase"),
        report("Section 1.0, \"Mission Summary\" (printed page 1-1, PDF page 10): \"the impact of the S-IVB stage was sensed by the Apollo 12 and 14 seismometers\""),
      ],
      discrepancy: `${NMC_DIFFERS} command and service module (1971-063A) gives the separation from the S-IVB as 16:56:24 UT. Apollo by the Numbers gives 003:22:27.2, 16:56:27 GMT, which we follow; the Mission Report's Table 3-I agrees with it.`,
      view: "spacecraft",
    },
    {
      id: "sim-door-jettison",
      title: "Uncovering the science bay",
      chapter: "outbound",
      elapsed: "074:06:47.1",
      utc: "1971-07-29T15:40:47Z",
      text: {
        short:
          "As they near the Moon, the crew casts off a door on the side of the service module. Behind it is a bay full of cameras and instruments for studying the Moon from orbit.",
        more:
          "The door covered the scientific instrument module, or SIM bay, new on Apollo 15. Irwin photographed the door as it tumbled slowly away; it went on into orbit around the Sun. The bay held a panoramic camera, a mapping camera, and X-ray and gamma-ray instruments for mapping what the Moon's surface is made of, as well as a small satellite to be released later.",
      },
      citations: [
        timeline("Scientific instrument module door jettisoned."),
        summary("Background"),
        summary("Translunar Phase"),
        nmc("csm", "Spacecraft and Subsystems, Service Module"),
        report("Section 1.0, \"Mission Summary\" (printed page 1-3, PDF page 12): gamma-ray and X-ray surveys, panoramic and mapping camera photographs"),
        headsHome("Paragraph on Worden's work in lunar orbit: X-ray and gamma-ray spectrometers"),
      ],
      view: "spacecraft",
    },

    /* --------------------------- Lunar orbit -------------------------- */
    {
      id: "lunar-orbit-insertion",
      title: "Into orbit around the Moon",
      chapter: "lunar-orbit",
      elapsed: "078:31:46.70",
      utc: "1971-07-29T20:05:46Z",
      text: {
        short:
          "Behind the Moon and out of contact with Earth, Endeavour fires its main engine for almost 7 minutes to slow down and go into orbit around the Moon.",
        more:
          "The firing began 78 hours 31 minutes after launch and lasted 6 minutes 38.36 seconds. It put the spacecraft in an oval orbit about 196 by 66 miles (315 by 107 kilometers) above the Moon. Coming out from behind the Moon, Scott radioed, \"Hello, Houston, the Endeavour's on station with cargo, and what a fantastic sight.\" About four hours later, with Falcon still attached, a second firing dropped the orbit's low point to about 11 miles (18 kilometers), saving the lunar module's fuel for landing.",
      },
      citations: [
        timeline("Lunar orbit insertion ignition (SPS)."),
        timeline("Descent orbit insertion ignition (SPS)."),
        summary("Translunar Phase"),
        summary("Lunar Orbit/Lunar Surface Phase"),
        onTheMoon("Second paragraph: lunar orbit insertion and Scott's radio call; third paragraph: the descent orbit firing \"saved propellent in the LM\""),
      ],
      discrepancy: `${NMC_DIFFERS} command and service module gives lunar orbit insertion as 20:05:47 UT. Apollo by the Numbers gives 078:31:46.70, 20:05:46 GMT, which we follow.`,
      view: "moon",
      inTour: true,
    },
    {
      id: "undocking",
      title: "Falcon undocks",
      chapter: "lunar-orbit",
      elapsed: "100:39:16.2",
      utc: "1971-07-30T18:13:16Z",
      text: {
        short:
          "Scott and Irwin, now inside Falcon, undock from Endeavour on the second try. Alfred Worden stays in Endeavour, circling the Moon.",
        more:
          "The first try, at about 100 hours 14 minutes on the far side of the Moon, did not work. Worden went into the tunnel between the two spacecraft and found a loose electrical plug. After he reconnected it, Falcon separated about 25 minutes late, only about 8.5 miles (13.7 kilometers) above the Moon, because the docked spacecraft were already in the low orbit for landing.",
      },
      citations: [
        timeline("CM/LM undocking failure due to loose CM/LM umbilical."),
        timeline("LM undocking and separation."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("csm", "Mission Profile"),
      ],
      discrepancy: `${NMC_DIFFERS} command and service module and lunar module give the separation as 18:13:30 UT. Apollo by the Numbers gives 100:39:16.2, 18:13:16 GMT, which we follow; the Mission Report's Table 3-I agrees with it.`,
      view: "spacecraft",
    },
    {
      id: "science-orbit",
      title: "Worden's science orbit",
      chapter: "lunar-orbit",
      elapsed: "101:38:58.98",
      utc: "1971-07-30T19:12:59Z",
      text: {
        short:
          "Alone in Endeavour, Alfred Worden fires the main engine to move into a higher, nearly round orbit. From there he will photograph and map the Moon.",
        more:
          "The 3.67-second firing put Endeavour in an orbit of about 75 by 63 miles (121 by 101 kilometers). While Falcon was on the Moon, Worden circled it 34 times, running the cameras and instruments in the SIM bay. He photographed the near and far sides, mapped what the surface is made of, and measured the Moon's very thin atmosphere. Careful tracking of his orbit also showed where dense areas under the surface tug on passing spacecraft.",
      },
      citations: [
        timeline("CSM orbit circularization ignition (SPS)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        report("Section 1.0, \"Mission Summary\" (printed page 1-3, PDF page 12): \"the Command Module Pilot completed 34 lunar orbits\""),
        headsHome("Paragraph on Worden's 34 solo revolutions and the mascons"),
      ],
      view: "spacecraft",
    },

    /* ---------------------------- On the Moon --------------------------- */
    {
      id: "landing",
      title: "Landing at Hadley",
      chapter: "surface",
      elapsed: "104:42:29.3",
      utc: "1971-07-30T22:16:29Z",
      text: {
        short:
          "Scott flies Falcon steeply down past tall mountains and lands on a plain beside a winding canyon called Hadley Rille.",
        more:
          "Powered descent began at 104 hours 30 minutes. To clear the Apennine Mountains, Falcon came down at an angle of 26 degrees, the steepest approach yet. It touched down at 6:16 p.m. EDT on July 30, 1971, about 1,800 feet (550 meters) northwest of the planned spot, with 1 minute 43 seconds of engine firing time to spare. Scott reported, \"Okay, Houston. The Falcon is on the Plain at Hadley.\" Endeavour's mapping camera took this picture of the area shortly after the landing.",
      },
      citations: [
        timeline("LM powered descent engine ignition."),
        timeline("LM lunar landing (right side and forward footpad contact)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("LM Lunar Landing", "Landing Site, GET, KSC Time, GMT Time, Hover Time Remaining (sec), and LM Distance To Target (ft) rows", ABTN_LM_LANDING),
        report("Section 3.2.2, \"Descent\" (printed page 3-7, PDF page 22): \"about 550 meters (1800 feet) northwest of the premission target point\""),
        details("Mission Highlights: \"at an angle of 26 degrees, the steepest approach yet used in Apollo missions\""),
        onTheMoon("Paragraph on the descent: Scott's call \"Okay, Houston. The Falcon is on the Plain at Hadley.\""),
      ],
      discrepancy:
        "NASA's mission details page says Falcon landed \"about 1,500 feet north and east of the targeted landing point.\" The Mission Report and Apollo by the Numbers say 1,800 feet (550 meters) northwest, which we follow.",
      photo: nasaPhoto(
        "S71-44671",
        1442,
        1600,
        "Black-and-white view from high above the Moon: a flat gray plain on the left, rugged mountains with long shadows on the right, and the winding channel of Hadley Rille running between them near Falcon's landing site.",
      ),
      view: "moon",
      inTour: true,
    },
    {
      id: "standup-eva",
      title: "A look from the top hatch",
      chapter: "surface",
      elapsed: "106:42:49",
      utc: "1971-07-31T00:16:49Z",
      text: {
        short:
          "Two hours after landing, Scott stands up through Falcon's top hatch to look around and photograph the landing site.",
        more:
          "Standing on the ascent engine cover with his head and shoulders out of the hatch, about 23 feet (7 meters) above the ground, Scott took photographs all the way around and described the area for geologists in Mission Control. This stand-up spacewalk lasted 33 minutes 7 seconds. Then, for the first time on the Moon, the astronauts took off their spacesuits to sleep, in hammocks.",
      },
      citations: [
        timeline("Stand-up EVA started (Scott)."),
        timeline("Stand-up EVA ended."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "LM Stand-Up EVA, Participant and Duration rows", ABTN_EVA),
        onTheMoon("Paragraph on the standup spacewalk and the first night's sleep"),
      ],
      view: "moon",
    },
    {
      id: "first-moonwalk",
      title: "First moonwalk",
      chapter: "surface",
      elapsed: "119:39:17",
      utc: "1971-07-31T13:13:17Z",
      text: {
        short:
          "Scott climbs down the ladder and steps onto the Moon. He says, \"Man must explore. And this is exploration at its greatest.\"",
        more:
          "The first moonwalk began when the air was let out of Falcon's cabin, 119 hours 39 minutes after launch. Scott's full words were, \"As I stand out here in the wonders of the unknown at Hadley, I sort of realize there's a fundamental truth to our nature. Man must explore. And this is exploration at its greatest.\" Irwin joined him and picked up a first, quick sample of soil. At 120 hours 18 minutes they unloaded the folded rover from Falcon's descent stage and set it up. Its front-wheel steering did not work, so the first drive was made without it.",
      },
      citations: [
        timeline("1 st EVA started (LM cabin depressurized)."),
        timeline("Contingency sample collected."),
        timeline("Lunar rover vehicle (LRV) offloaded."),
        summary("Background"),
        summary("Lunar Orbit/Lunar Surface Phase"),
        onTheMoon("Paragraph on the first Moon walk: Scott's words on the surface"),
      ],
      discrepancy: `${NMC_DIFFERS} lunar module (1971-063C) gives the first moonwalk as starting at 13:13:10 UT. Apollo by the Numbers gives 119:39:17, 13:13:17 GMT, which we follow; the Mission Report's Table 3-I agrees with it.`,
      view: "moon",
      inTour: true,
    },
    {
      id: "first-drive",
      title: "Driving on the Moon",
      chapter: "surface",
      elapsed: "121:44:55",
      utc: "1971-07-31T15:18:55Z",
      text: {
        short:
          "Scott and Irwin set off in the rover, the first car on the Moon. They drive south along the edge of Hadley Rille to a crater called Elbow.",
        more:
          "Scott had already taken the rover for a short test drive by Falcon. A TV camera on the rover, aimed by a controller in Houston, sent pictures of the trip to Earth. After Elbow Crater they drove on to St. George Crater, then found their way back with the rover's navigation system and set up a station of experiments 360 feet (110 meters) from Falcon. On this moonwalk, which lasted 6 hours 32 minutes 42 seconds, they drove about 10.3 kilometers (6.4 miles) and collected 31.97 pounds (14.5 kilograms) of samples.",
      },
      citations: [
        timeline("Departed for station 1."),
        timeline("1 st EVA ended (cabin repressurized )."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "First Surface EVA, Duration, Total Distance Traveled, and Samples Collected (lbm) rows", ABTN_EVA),
        details("Mission Highlights: \"the first car that humans have ever driven on the moon\""),
        onTheMoon("Paragraphs on the first Moon walk: the test drive, the TV camera operated from Mission Control, and the stops at Elbow and St. George craters"),
      ],
      photo: nasaPhoto(
        "as15-85-11451",
        1600,
        1600,
        "Scott, in a white spacesuit, works at the parked rover on a gray slope. Behind him the deep, shadowed channel of Hadley Rille curves away under a black sky.",
      ),
      view: "moon",
      inTour: true,
    },
    {
      id: "second-moonwalk",
      title: "Second moonwalk: the mountain slopes",
      chapter: "surface",
      elapsed: "142:14:48",
      utc: "1971-08-01T11:48:48Z",
      text: {
        short:
          "On their second drive, Scott and Irwin head for the foot of the Apennine Mountains. At Spur Crater they find a white rock later called the Genesis Rock.",
        more:
          "They drove south to the Apennine Front and parked on a steep slope about 5 kilometers (3 miles) from Falcon, farther than any astronauts had been from their spacecraft. The Genesis Rock, a white crystalline rock, was one of many samples. Back near Falcon, Scott finished drilling for an experiment that measures heat flowing out of the Moon, and at the end they put up the United States flag. This moonwalk lasted 7 hours 12 minutes 14 seconds and brought back 76.94 pounds (34.9 kilograms) of samples.",
      },
      citations: [
        timeline("2 nd EVA started (cabin depressurized)."),
        timeline("Arrived at LM. Deployed United States flag and started EVA closeout."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "Second Surface EVA, Duration and Samples Collected (lbm) rows", ABTN_EVA),
        onTheMoon("Paragraph on the second Moon walk: Station 6 about 5 km from Falcon, and the Genesis Rock at Station 7, Spur Crater"),
        nmc("lm", "ALSEP Scientific Instruments: \"a heat flow experiment, designed to measure the rate of heat loss from the lunar interior\""),
      ],
      photo: nasaPhoto(
        "as15-88-11866",
        1600,
        1600,
        "Irwin, in a white spacesuit, salutes beside the United States flag. Behind him stand the lunar module Falcon and, at right, the rover with its dish antenna, below the broad gray slope of Hadley Delta.",
      ),
      view: "moon",
      inTour: true,
    },
    {
      id: "third-moonwalk",
      title: "Third moonwalk: the edge of the rille",
      chapter: "surface",
      elapsed: "163:18:14",
      utc: "1971-08-02T08:52:14Z",
      text: {
        short:
          "On the last drive, Scott and Irwin go west to the rim of Hadley Rille and photograph its far wall, where layers of rock show.",
        more:
          "The moonwalk started later than planned, so a trip north to an area called the North Complex was dropped. They stopped at Scarp Crater, Rim Crater, and The Terrace on the rille's edge. Back at Falcon, Scott dropped a hammer and a falcon feather in front of the TV camera. With no air on the Moon to slow the feather, both hit the ground at the same time. \"How about that!\" he said. He parked the rover about 500 feet (150 meters) away so its camera could show the liftoff. This moonwalk lasted 4 hours 49 minutes 50 seconds.",
      },
      citations: [
        timeline("3 rd EVA started (LM cabin depressurized)."),
        timeline("LRV parked in final position."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "Third Surface EVA, Duration row", ABTN_EVA),
        onTheMoon("Paragraphs on the third Moon walk: the hammer and feather, and the Rover parked about 500 feet from the LM"),
        nmc("lm", "Mission Profile: \"a hammer and feather falling at the same rate in the lunar vacuum\""),
      ],
      photo: nasaPhoto(
        "as15-82-11168",
        1542,
        1600,
        "Irwin, in a white spacesuit and holding a camera, walks toward the photographer, away from the parked rover. The gray plain near the rim of Hadley Rille is dotted with small rocks under a black sky.",
      ),
      view: "moon",
    },

    /* --------------------------- Back to orbit -------------------------- */
    {
      id: "lunar-liftoff",
      title: "Liftoff from the Moon",
      chapter: "reunion",
      elapsed: "171:37:23.2",
      utc: "1971-08-02T17:11:23Z",
      text: {
        short:
          "Falcon's top half blasts off from the Moon, leaving its bottom half and the rover behind. For the first time, people on Earth watch a liftoff from the Moon live, through the rover's TV camera.",
        more:
          "The ascent engine fired 171 hours 37 minutes after launch, after Falcon had been on the Moon for 66 hours 54 minutes 53.9 seconds. The firing lasted 7 minutes 11.0 seconds and put the ascent stage in an orbit of about 49 by 10 miles (79 by 17 kilometers). To mark the all-Air Force crew, Worden played part of the Air Force song.",
      },
      citations: [
        timeline("LM lunar liftoff ignition (LM APS)."),
        timeline("Lunar ascent orbit cutoff."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        details("Mission Highlights: \"For the first time, the lunar liftoff was seen on Earth via the LRV television camera\""),
        headsHome("Paragraph on the liftoff: the TV camera on the Rover and the Air Force song"),
        nmc("lm", "Lunar Module Spacecraft and Subsystems"),
      ],
      discrepancy: `${NMC_DIFFERS} command and service module and lunar module give liftoff as 17:11:22 UT. Apollo by the Numbers gives 171:37:23.2, 17:11:23 GMT, which we follow.`,
      view: "moon",
      inTour: true,
    },
    {
      id: "docking",
      title: "Back together",
      chapter: "reunion",
      elapsed: "173:36:25.5",
      utc: "1971-08-02T19:10:25Z",
      text: {
        short:
          "Falcon catches up with Endeavour, and the two spacecraft dock. Scott radios, \"The Falcon is back on its roost and going to sleep.\"",
        more:
          "Falcon used the direct rendezvous method, first tried on Apollo 14, and docked about 2 hours after liftoff. The two spacecraft had been apart for 72 hours 57 minutes 9.3 seconds. Scott and Irwin moved the rock samples into Endeavour. Falcon's ascent stage was let go at 179 hours 30 minutes, a revolution later than planned, and then steered to crash into the Moon, where the seismometers left by Apollo 12, 14, and 15 felt it hit.",
      },
      citations: [
        timeline("CSM/LM docked."),
        timeline("LM ascent stage jettisoned."),
        timeline("LM ascent stage impact on lunar surface."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        report("Section 3.2.3, \"Ascent and Rendezvous\" (printed page 3-7, PDF page 22): \"The direct rendezvous technique, first used on Apollo 14\""),
        headsHome("Paragraph on the rendezvous and docking: Scott's radio call"),
      ],
      discrepancy: `${NMC_DIFFERS} command and service module and lunar module give docking as 19:09:47 UT. Apollo by the Numbers gives 173:36:25.5, 19:10:25 GMT, which we follow; the Mission Report's Table 3-I agrees with it.`,
      photo: nasaPhoto(
        "as15-88-11961",
        1600,
        1600,
        "Endeavour, a cone-shaped command module on a silver cylindrical service module with a dish antenna, flies above the gray, cratered Moon, seen past the dark edge of Falcon's window.",
      ),
      view: "spacecraft",
    },
    {
      id: "subsatellite",
      title: "A small satellite for the Moon",
      chapter: "reunion",
      elapsed: "222:39:29.1",
      utc: "1971-08-04T20:13:29Z",
      text: {
        short:
          "Before heading home, the crew launches a small satellite from Endeavour's science bay into orbit around the Moon. It is the first satellite ever put there by astronauts.",
        more:
          "About an hour and 20 minutes after a short firing to reshape Endeavour's orbit, springs pushed the 36.3-kilogram (80-pound) Particles and Fields Subsatellite out of the bay, spinning. It measured charged particles and magnetic fields around the Moon, and tracking its path helped map the Moon's gravity. It sent back data until January 1973.",
      },
      citations: [
        timeline("Orbit shaping maneuver ignition."),
        timeline("Subsatellite deployed."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        details("Mission Objective and Mission Highlights"),
        nmc("subsatellite", "Description, Spacecraft and Subsystems, and Mission Profile"),
        headsHome("Paragraph on the last day in lunar orbit: the 80-pound subsatellite"),
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for the subsatellite (1971-063D) gives its release as 21:00:31 UT, and its page for the command and service module as 20:13:19 UT. Apollo by the Numbers gives 222:39:29.1, 20:13:29 GMT, which we follow; the Mission Report's Table 3-I agrees with it.",
      view: "spacecraft",
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: "transearth-injection",
      title: "Heading home",
      chapter: "return",
      elapsed: "223:48:45.84",
      utc: "1971-08-04T21:22:45Z",
      text: {
        short:
          "Behind the Moon, Endeavour fires its main engine for more than 2 minutes to leave lunar orbit and head back to Earth.",
        more:
          "The firing, called transearth injection, began 223 hours 48 minutes after launch and lasted 2 minutes 20.90 seconds. Endeavour had circled the Moon 74 times over 145 hours 12 minutes 41.68 seconds, the longest any crew had spent in lunar orbit. Coming around the Moon, Scott radioed, \"Hello, Houston. Endeavour's on the way home.\"",
      },
      citations: [
        timeline("Transearth injection ignition (SPS)."),
        timeline("Transearth injection cutoff."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        details("Mission Highlights: \"longest time in lunar orbit (about 145 hours)\""),
        headsHome("Paragraphs on transearth injection and Scott's radio call"),
      ],
      view: "journey",
    },
    {
      id: "spacewalk",
      title: "A spacewalk far from Earth",
      chapter: "return",
      elapsed: "241:57:12",
      utc: "1971-08-05T15:31:12Z",
      text: {
        short:
          "Worden climbs out of the command module, far out in space, and moves back along the service module to bring in the film from the science bay's cameras.",
        more:
          "This was the first spacewalk in deep space, about 200,000 miles (320,000 kilometers) from Earth. Irwin stood in the open hatch while Worden made three trips to the SIM bay: two to bring back the film from the panoramic and mapping cameras, and one to look over the instruments. A TV camera on the hatch showed him working. \"Jim, you look absolutely fantastic against that Moon back there,\" Worden said. The spacewalk lasted 39 minutes 7 seconds.",
      },
      citations: [
        timeline("Transearth EVA started (Worden)."),
        timeline("Transearth EVA - Camera cassette retrieved."),
        timeline("Transearth EVA ended."),
        summary("Transearth Phase"),
        table("Extravehicular Activity", "Transearth EVA, Participant and Duration rows", ABTN_EVA),
        nmc("csm", "Mission Profile: \"the first deep space EVA\""),
        headsHome("Paragraph on the cislunar spacewalk: 200,000 miles from Earth, the TV camera on the hatch, Irwin in the open hatch, and Worden's words"),
      ],
      discrepancy:
        "The Mission Report's summary (printed page 1-4, PDF page 13) says the spacewalk lasted \"approximately 38 minutes,\" NSSDCA's Master Catalog 38 minutes 12 seconds, and NASA's mission details page 18 minutes. Apollo by the Numbers gives 39 minutes 7 seconds, which matches the start and end times in the Mission Report's Table 3-I; we follow it.",
      photo: nasaPhoto(
        "S71-43202",
        1138,
        1600,
        "A film frame taken from the open hatch: Worden, in a white spacesuit with a tether trailing behind him, works beside the instrument bay on the side of the service module, against black space.",
      ),
      view: "spacecraft",
      inTour: true,
    },

    /* ----------------------------- Splashdown ---------------------------- */
    {
      id: "entry",
      title: "Entering the atmosphere",
      chapter: "splashdown",
      elapsed: "294:58:54.7",
      utc: "1971-08-07T20:32:54Z",
      text: {
        short:
          "Only the cone-shaped command module is left. It reaches the top of Earth's atmosphere moving at about 24,600 miles per hour (39,600 kilometers per hour).",
        more:
          "The crew cast off the service module 15 minutes before entry, at 294 hours 43 minutes. Entry is counted from 400,000 feet, about 76 miles (122 kilometers) up. As the air slowed the command module, the crew felt a peak of 6.23 g, about six times their normal weight.",
      },
      citations: [
        timeline("CM/SM separation."),
        timeline("Entry."),
        summary("Recovery"),
        table("Entry, Splashdown and Recovery", "Earth Entry, GET, Velocity (ft/sec), and Maximum g rows", ABTN_ENTRY),
        report("Section 3.3, \"Transearth and Entry Trajectory\" (printed page 3-9, PDF page 24): \"The service module was separated from the command module 15 minutes prior to entry\""),
      ],
      view: "earth",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "splashdown",
      elapsed: "295:11:53.0",
      utc: "1971-08-07T20:45:53Z",
      text: {
        short:
          "On the way down, one of Endeavour's three big parachutes collapses. The other two still bring the crew safely down into the Pacific Ocean, north of Hawaii.",
        more:
          "At about 6,000 feet, one main parachute shrank to about a fifth of its full width, most likely damaged by leftover thruster fuel the command module was dumping. The landing system was built to land safely on two parachutes, so no one was hurt, but Endeavour hit the water at 21.8 miles per hour (35 kilometers per hour) instead of the planned 19. Splashdown came 295 hours 11 minutes 53.0 seconds after launch, about 330 miles (530 kilometers) north of Honolulu and 5 nautical miles (9 kilometers) from the recovery ship USS Okinawa. A helicopter carried the crew to the ship, and they were aboard 39 minutes after splashdown. They were the first Moon landing crew not kept in quarantine afterward.",
      },
      citations: [
        timeline("Main parachute deployed."),
        timeline("Splashdown (went to apex-up)."),
        summary("Recovery"),
        table(
          "Entry, Splashdown and Recovery",
          "Earth Splashdown GET, GMT Time, Distance To Recovery Ship (n mi), Minutes To Crew Pickup, and Recovery Ship rows",
          ABTN_ENTRY,
        ),
        report("Section 6.1 (printed page 6-1, PDF page 61): \"at approximately 6000 feet, one of the three main parachutes was observed to have collapsed\""),
        report("Section 14.1.9, \"Main Parachute Collapse\" (printed page 14-17, PDF page 218): deflated \"to approximately one-fifth of its full diameter\"; \"the fuel dump is considered to be the most likely cause\""),
        details("Mission Highlights: \"the CM impacted at 21.8 mph, instead of the planned 19 mph\""),
        nmc("csm", "Mission Profile: descent velocity of 35 km/hr (21.8 mph), splashdown 330 miles north of Honolulu"),
        homeFromTheMoon("Paragraphs on the descent and recovery: the landing system designed to land safely on two parachutes, and the end of the postflight quarantine"),
        { source: "nasm-apollo-15-command-module", locator: "Object description: \"The crew was the first crew for which post-flight quarantine was not required\"" },
      ],
      discrepancy:
        "NASA's mission details page puts the splashdown about 335 miles north of Honolulu. NSSDCA, NASA's history article, and NASA's photo caption say 330 miles, which we follow. NSSDCA gives the distance to USS Okinawa as 9.8 kilometers (6.1 miles); we follow Apollo by the Numbers' 5 nautical miles.",
      photo: nasaPhoto(
        "s71-41999",
        1257,
        1600,
        "Seen from above, the small cone-shaped command module hangs under three red-and-white striped parachutes over the dark blue Pacific. Two are fully open; the third, at left, has collapsed into a narrow bundle.",
      ),
      view: "earth",
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: "Command module Endeavour",
        museum: "U.S. Air Force Museum, Wright-Patterson Air Force Base",
        place: "Dayton, Ohio",
      },
      citations: [
        { source: "nssdca-apollo-current-locations", locator: "Apollo 15, Command Module \"Endeavor\"" },
        nmc("csm", "Mission Profile"),
        {
          source: "nasm-apollo-15-command-module",
          locator:
            "Object description (\"placed on display by NASA at the U.S. Air Force Museum in Ohio in December 1973. Ownership was transferred to the National Air and Space Museum in July 1974\") and Display Status",
        },
      ],
    },
  ],
};
