/**
 * Apollo 11: the first crewed lunar landing, July 16-24, 1969.
 *
 * Every event time is copied from Apollo by the Numbers (NASA SP-2000-4029),
 * the canonical source for Apollo timelines: elapsed times exactly as its
 * Apollo 11 Timeline prints them, and UTC from that table's GMT columns.
 * Where another NASA source gives a different value, the `discrepancy` field
 * says what it gives; we follow Apollo by the Numbers unless the note says
 * otherwise.
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (13:32:00 GMT). Liftoff itself came 0.63 seconds later.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers, feet
 * per second to miles and kilometers per hour) are our arithmetic on the
 * cited values.
 *
 * Durations of a minute or more are written in the text as minutes and
 * seconds, with the source's full precision kept: the 357.53 seconds in the
 * source is "5 minutes 57.53 seconds" here. That is our arithmetic too.
 *
 * The flight path itself (orbits, burns, landing and splashdown points) is
 * described in src/sim/, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const ABTN_SUMMARY = `${ABTN}Apollo_11a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_11i_Timeline.htm`;
const ABTN_OBJECTIVES = `${ABTN}Apollo_11b_Objectives.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-03_Crew_Information_-_Lunar_Landings.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_LM_LANDING = `${ABTN}Apollo_18-27_LM_Lunar_Landing.htm`;
const ABTN_EVA = `${ABTN}Apollo_18-30_Extravehicular_Activity.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;

const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059A";
const NMC_LM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C";

/** A section of the Apollo by the Numbers Apollo 11 mission summary. */
function summary(section: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 11 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 11 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 11 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the statistical tables in Apollo by the Numbers, Apollo 11 column. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `"${name}" table, Apollo 11 column: ${rows}`,
    url,
  };
}

/** The Apollo by the Numbers Apollo 11 Objectives page. */
function objectives(section: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 11 Objectives, ${section}`,
    url: ABTN_OBJECTIVES,
  };
}

/** An NSSDCA Master Catalog spacecraft page: the command and service module or the lunar module. */
function nmc(page: "csm" | "lm", section: string): Citation {
  return page === "csm"
    ? {
        source: "nssdca-master-catalog",
        locator: `"Apollo 11 Command and Service Module (CSM)" (1969-059A), ${section}`,
        url: NMC_CSM,
      }
    : {
        source: "nssdca-master-catalog",
        locator: `"Apollo 11 Lunar Module / EASEP" (1969-059C), ${section}`,
        url: NMC_LM,
      };
}

/** The NASA Apollo 11 mission page. */
function nasaMission(section: string): Citation {
  return { source: "nasa-apollo-11-mission", locator: section };
}

/** A place in the Apollo 11 Mission Report (MSC-00171). */
function missionReport(place: string): Citation {
  return {
    source: "apollo-11-mission-report",
    locator: place,
    url: "https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf",
  };
}

/**
 * A line of NASA's Apollo 11 technical air-to-ground transcript. Its times
 * are days, hours, minutes and seconds from range zero: 04 13 24 48 is
 * 109:24:48.
 */
function transcript(place: string): Citation {
  return {
    source: "apollo-11-technical-transcript",
    locator: place,
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/as11-tec.pdf",
  };
}

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-11/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-11/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: "NASA",
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

const NMC_DIFFERS = "NSSDCA's Master Catalog page for the Apollo 11";

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: "apollo-11",
  program: "apollo",
  name: "Apollo 11",
  kind: "flight",
  destination: "moon",

  summary: {
    text: {
      short:
        "Apollo 11 was the first mission to land people on the Moon. In July 1969, Neil Armstrong and Buzz Aldrin walked on the Moon while Michael Collins orbited above.",
      more:
        "Apollo 11 launched from Kennedy Space Center on July 16, 1969. On July 20, Armstrong and Aldrin landed the lunar module Eagle in the Sea of Tranquility while Collins stayed in lunar orbit aboard the command module Columbia. The two moonwalkers spent about two and a half hours outside and collected rock and soil. All three splashed down in the Pacific Ocean on July 24, meeting the national goal set by President John F. Kennedy in 1961.",
    },
    citations: [
      summary("Background"),
      summary("Ascent Phase"),
      summary("Lunar Orbit/Lunar Surface Phase"),
      summary("Recovery"),
      nmc("csm", "Description"),
      nasaMission(
        "Mission overview: \"The primary objective of Apollo 11 was to complete a national goal set by President John F. Kennedy on May 25, 1961\"",
      ),
    ],
  },

  crew: {
    value: [
      { name: "Neil A. Armstrong", role: "Commander" },
      { name: "Michael Collins", role: "Command module pilot" },
      { name: "Edwin E. \"Buzz\" Aldrin Jr.", role: "Lunar module pilot" },
    ],
    citations: [
      summary("Background"),
      table(
        "Crew Information - Lunar Landing Missions",
        "Commander, Command Module Pilot, and Lunar Module Pilot rows",
        ABTN_CREW,
      ),
    ],
  },

  launch: {
    value: {
      utc: "1969-07-16T13:32:00Z",
      site: "Launch Complex 39, Pad A, Kennedy Space Center, Florida",
      vehicle: "Saturn V (SA-506)",
    },
    citations: [
      summary("Ascent Phase"),
      summary("Background"),
      timeline("Range zero."),
      nasaMission("Photo caption: \"Apollo 11 lifts off from Kennedy Space Center in Florida.\""),
    ],
    discrepancy: `The Mission Profile on ${NMC_DIFFERS} command and service module (1969-059A) says the rocket was Saturn V SA-504, though the same page lists SA-506 among its alternate names. Apollo by the Numbers says SA-506, which we follow.`,
  },

  duration: {
    value: "195:18:35",
    citations: [
      summary("Recovery"),
      table("Entry, Splashdown and Recovery", "Earth Splashdown, GET row", ABTN_ENTRY),
    ],
  },

  callSigns: {
    value: [
      { craft: "Command module", name: "Columbia" },
      { craft: "Lunar module", name: "Eagle" },
    ],
    citations: [
      table("Call Signs", "Command Module and Lunar Module", ABTN_CALL_SIGNS),
      summary("Background"),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          "Apollo 11 was the first mission to land people on the Moon and bring them safely back to Earth.",
        more:
          "Landing astronauts on the Moon and returning them safely was the primary objective of the Apollo program, and Apollo 11 achieved it. President John F. Kennedy set this as a national goal on May 25, 1961. With Apollo 11, the goal of landing humans on the Moon and returning them safely to Earth before the end of the decade was met.",
      },
      citations: [
        summary("Background"),
        summary("Recovery"),
        objectives("\"Spacecraft Primary Objective\""),
        nmc("csm", "Description"),
        nasaMission(
          "Mission overview: \"The primary objective of Apollo 11 was to complete a national goal set by President John F. Kennedy on May 25, 1961: perform a crewed lunar landing and return to Earth.\"",
        ),
      ],
    },
    {
      text: {
        short:
          "Neil Armstrong and Buzz Aldrin became the first people to walk on the Moon. They spent about two and a half hours outside.",
        more:
          "Armstrong and Aldrin were outside Eagle for 2 hours 31 minutes 40 seconds. A television camera sent live pictures, and the astronauts read the plaque on Eagle to a worldwide television audience. Both said they could move around more easily than expected, and NASA concluded that adapting to the Moon's gravity, one-sixth of Earth's, was relatively quick.",
      },
      citations: [
        summary("Lunar Orbit/Lunar Surface Phase"),
        summary("Conclusions"),
        table("Extravehicular Activity", "First Surface EVA, Duration row", ABTN_EVA),
        nmc("lm", "Description"),
      ],
    },
    {
      text: {
        short:
          "The astronauts collected 47.51 pounds (21.55 kilograms) of Moon rocks and soil and brought them back to Earth.",
        more:
          "Armstrong collected a first, contingency sample of soil near Eagle's ladder soon after stepping onto the surface. Later the crew gathered a bulk sample of soil and rock chunks, two core samples, and more selected rocks. Aldrin had to push hard to drive the core tubes into the ground. The official total, 21.55 kilograms, was determined by the Lunar Receiving Laboratory in Houston.",
      },
      citations: [
        summary("Lunar Orbit/Lunar Surface Phase"),
        {
          source: "apollo-by-the-numbers",
          locator: "Apollo 11 mission summary, footnote 2",
          url: ABTN_SUMMARY,
        },
        table("Extravehicular Activity", "Total Lunar Surface EVA, Total Samples Collected (lbm) row", ABTN_EVA),
        nmc("lm", "Mission Profile"),
      ],
    },
    {
      text: {
        short:
          "They left science experiments on the Moon, including a seismometer to measure moonquakes and a reflector for laser beams.",
        more:
          "The seismometer picked up the astronauts walking on the surface and, later, moving around inside Eagle. It ran on solar power, so it could work only during the lunar day. As its power began to drop about 5 hours before sunset at the site, a command from Earth stopped its transmissions at 10:58:46 UT on August 3, 1969. It was turned on again the next lunar day, but on August 27, 1969, it no longer accepted commands from Earth, and the experiment was ended. The laser ranging retroreflector required no power. A third experiment, a solar wind collector, was set out in direct sunlight and then packed up and brought back to Earth.",
      },
      citations: [
        summary("Lunar Orbit/Lunar Surface Phase"),
        objectives("\"Experiments\" (S-031, S-078, S-080)"),
        timeline("EASEP turned off by ground command."),
        nmc("lm", "Early Apollo Surface Experiments Package (EASEP)"),
        nmc("lm", "Mission Profile"),
      ],
      discrepancy:
        "Apollo by the Numbers' Apollo 11 Timeline lists \"EASEP turned off by ground command.\" on August 27, 1969, with no time. We follow NSSDCA's Master Catalog, which says the ground command stopped transmission at 10:58:46 UT on August 3, 1969, and that on August 27 the package no longer accepted commands from Earth and the experiment was ended.",
    },
    {
      text: {
        short:
          "Eagle's top half launched from the Moon and docked with Columbia in orbit around the Moon. Then all three astronauts headed home in Columbia.",
        more:
          "Eagle's ascent stage lifted off after 21 hours 36 minutes on the surface, using the descent stage as its launch platform. It reached lunar orbit about 7 minutes later. After several engine firings to catch up, it docked with Columbia about 3½ hours after liftoff, and the crew and samples moved into Columbia for the trip home.",
      },
      citations: [
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("lm", "Lunar Module Spacecraft and Subsystems"),
      ],
    },
    {
      text: {
        short:
          "Back on Earth, the crew was kept in quarantine for 21 days to guard against any \"lunar germs.\" No germs from the Moon were found.",
        more:
          "The crew put on biological isolation garments before leaving the spacecraft and rode to Houston in a Mobile Quarantine Facility. The crew and spacecraft were released from quarantine on August 10, 1969. No microorganisms from beyond Earth were found on the crew or the spacecraft, and the quarantine was never broken.",
      },
      citations: [
        summary("Recovery"),
        summary("Conclusions"),
        timeline("Crew released from quarantine."),
        nasaMission(
          "Article summary, \"55 Years Ago: Apollo 11 Astronauts End Quarantine, Feted from Coast to Coast\": \"completed their 21-day quarantine\"",
        ),
      ],
    },
  ],

  chapters: [
    { id: "launch", title: "Launch" },
    { id: "earth-orbit", title: "Earth orbit" },
    { id: "outbound", title: "To the Moon" },
    { id: "lunar-orbit", title: "Lunar orbit" },
    { id: "landing", title: "Landing" },
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
      elapsed: "000:00:00.63",
      utc: "1969-07-16T13:32:00Z",
      text: {
        short:
          "A Saturn V rocket lifts Apollo 11 off the launch pad in Florida, carrying three astronauts toward the Moon.",
        more:
          "Apollo 11 lifted off from Launch Complex 39, Pad A, at Kennedy Space Center at 9:32 a.m. Eastern Daylight Time on July 16, 1969. The crew were Neil Armstrong, commander; Michael Collins, command module pilot; and Buzz Aldrin, lunar module pilot. Clouds and distant thunderstorms were reported at launch time.",
      },
      citations: [
        timeline("Liftoff (umbilical disconnected) (1.07 g)."),
        summary("Ascent Phase"),
        summary("Launch Preparations"),
        summary("Background"),
        nasaMission("Photo caption: \"Apollo 11 lifts off from Kennedy Space Center in Florida.\""),
      ],
      photo: nasaPhoto(
        "S69-39961",
        1107,
        1600,
        "View looking down from the launch tower as the white Saturn V rocket climbs past on a column of flame and smoke, with the Florida coast far below.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "first-stage-separation",
      title: "First stage separates",
      chapter: "launch",
      elapsed: "000:02:42.30",
      utc: "1969-07-16T13:34:42Z",
      text: {
        short:
          "The rocket's giant first stage shuts down and falls away. The second stage fires its engines to keep climbing.",
        more:
          "The first stage, called the S-IC, shut down its engines about 2 minutes 41 seconds after liftoff and separated a moment later. The second stage, the S-II, ignited at 2 minutes 44 seconds. The first stage fell into the Atlantic Ocean about 9 minutes after launch.",
      },
      citations: [
        timeline("S-IC maximum Earth-fixed velocity. S-IC/S-II separation command."),
        timeline("S-II ignition."),
        summary("Ascent Phase"),
      ],
      view: "earth",
    },

    /* -------------------------- Earth orbit -------------------------- */
    {
      id: "earth-orbit-insertion",
      title: "In orbit around Earth",
      chapter: "earth-orbit",
      elapsed: "000:11:49.33",
      utc: "1969-07-16T13:43:49Z",
      text: {
        short:
          "About 12 minutes after liftoff, Apollo 11 is circling Earth. The crew checks the spacecraft before heading for the Moon.",
        more:
          "The second stage shut down at 9 minutes 8 seconds, and the third stage, the S-IVB, took over. It shut down at 11 minutes 39 seconds, and Apollo 11 was in Earth orbit ten seconds later. The spacecraft made one and a half trips around Earth while its systems were checked.",
      },
      citations: [
        timeline("Earth orbit insertion. S-IVB 1st burn maximum Earth-fixed velocity."),
        summary("Ascent Phase"),
        summary("Earth Orbit Phase"),
      ],
      view: "earth",
    },
    {
      id: "translunar-injection",
      title: "Burn toward the Moon",
      chapter: "earth-orbit",
      elapsed: "002:44:16.2",
      utc: "1969-07-16T16:16:16Z",
      text: {
        short:
          "The third stage fires its engine again for almost 6 minutes. This big push sends Apollo 11 out of Earth orbit toward the Moon.",
        more:
          "This firing, called translunar injection, began 2 hours 44 minutes after launch and lasted 5 minutes 46.83 seconds. When it ended, Apollo 11 was moving at about 24,200 miles per hour (39,000 kilometers per hour) on its way to the Moon.",
      },
      citations: [
        timeline("S-IVB 2nd burn ignition (STDV open)."),
        timeline("Translunar injection."),
        summary("Earth Orbit Phase"),
      ],
      discrepancy: `${NMC_DIFFERS} command and service module gives the burn as 5 minutes 48 seconds. Apollo by the Numbers gives 5 minutes 46.83 seconds, which we follow.`,
      view: "journey",
      inTour: true,
    },

    /* --------------------------- To the Moon -------------------------- */
    {
      id: "transposition-docking",
      title: "Turning around to dock with Eagle",
      chapter: "outbound",
      elapsed: "003:24:03.7",
      utc: "1969-07-16T16:56:03Z",
      text: {
        short:
          "Columbia separates from the rocket, turns around, and docks with the lunar module Eagle, which rode inside the rocket's top stage.",
        more:
          "About 3 hours 15 minutes after launch, the command and service module Columbia separated from the S-IVB stage. The crew turned Columbia around and docked with the lunar module Eagle, still attached to the S-IVB, at 3 hours 24 minutes. This move is called transposition and docking.",
      },
      citations: [
        timeline("CSM docked with LM/S-IVB."),
        timeline("CSM separated from S-IVB."),
        summary("Translunar Phase"),
        nmc("csm", "Mission Profile"),
      ],
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "lm-extraction",
      title: "Pulling Eagle free",
      chapter: "outbound",
      elapsed: "004:17:03.0",
      utc: "1969-07-16T17:49:03Z",
      text: {
        short:
          "With Eagle docked to its nose, Columbia pulls away from the rocket stage. Now the two spacecraft fly on together.",
        more:
          "The docked spacecraft were released from the S-IVB at 4 hours 17 minutes. A short firing at 4 hours 40 minutes moved them away from it. A command from the ground then had the S-IVB vent its leftover propellants so that it would fly past the Moon and into orbit around the Sun.",
      },
      citations: [
        timeline("CSM/LM ejected from S-IVB."),
        timeline("CSM/LM evasive maneuver from S-IVB ignition."),
        summary("Translunar Phase"),
        nmc("csm", "Spacecraft and Subsystems, Command Module"),
      ],
      view: "spacecraft",
    },
    {
      id: "midcourse-correction",
      title: "A small course correction",
      chapter: "outbound",
      elapsed: "026:44:58.64",
      utc: "1969-07-17T16:16:58Z",
      text: {
        short:
          "On July 17, a 3-second firing of the main engine fine-tunes Apollo 11's path to the Moon. It is the only correction needed on the way.",
        more:
          "Apollo 11's path after leaving Earth orbit was nearly perfect. Of the four chances planned for a midcourse correction on the way to the Moon, only one was used: a 3.13-second firing. The changes that would have been needed at the later chances were very small, so no more corrections were required. During the long coast, the crew slowly rotated the spacecraft in a \"barbecue\" roll to keep its temperatures within limits.",
      },
      citations: [
        timeline("Midcourse correction ignition."),
        summary("Translunar Phase"),
        summary("Transearth Phase"),
        missionReport(
          'Section 3.0, "Mission Description", page 3-1 (PDF page 15): "Trajectory parameters after the translunar injection firing were nearly perfect ... Only one of the four options for midcourse corrections during the translunar phase was exercised."',
        ),
        missionReport(
          'Section 7.4.3, "Translunar Midcourse Correction", pages 7-2 and 7-3 (PDF pages 110 and 111): the first option point was passed up, then "The first and only translunar midcourse correction was initiated on time"; "Two other opportunities for midcourse correction were available during the translunar phase, but the velocity changes required ... were well below the levels at which normal lunar orbit insertion can be retargeted. Therefore, no further translunar midcourse corrections were required."',
        ),
        nmc("csm", "Mission Profile"),
      ],
      photo: nasaPhoto(
        "as11-36-5355",
        1600,
        1600,
        "Earth seen from space as a partly lit globe against black space, showing the tan deserts of northern Africa under swirls of white cloud.",
      ),
      view: "journey",
    },

    /* --------------------------- Lunar orbit -------------------------- */
    {
      id: "lunar-orbit-insertion",
      title: "Into orbit around the Moon",
      chapter: "lunar-orbit",
      elapsed: "075:49:50.37",
      utc: "1969-07-19T17:21:50Z",
      text: {
        short:
          "Behind the Moon and out of contact with Earth, Columbia fires its main engine for about 6 minutes to slow down and go into orbit around the Moon.",
        more:
          "The firing began 75 hours 49 minutes after launch and lasted 5 minutes 57.53 seconds. The coast from Earth to the Moon had lasted 73 hours 5 minutes 34.83 seconds. On the second orbit, the crew sent live color television of the Moon's surface and the approach path to the landing site.",
      },
      citations: [
        timeline("Lunar orbit insertion ignition."),
        summary("Translunar Phase"),
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("csm", "Mission Profile"),
      ],
      photo: nasaPhoto(
        "as11-44-6550",
        1600,
        1600,
        "Earth, half lit in blue and white, rising above the gray, cratered horizon of the Moon against black space.",
      ),
      view: "moon",
      inTour: true,
    },
    {
      id: "undocking",
      title: "Eagle undocks",
      chapter: "lunar-orbit",
      elapsed: "100:12:00.0",
      utc: "1969-07-20T17:44:00Z",
      text: {
        short:
          "Armstrong and Aldrin, now inside Eagle, undock from Columbia. Michael Collins stays in Columbia, circling the Moon.",
        more:
          "Undocking came 100 hours 12 minutes after launch. Collins looked Eagle over from Columbia before a short firing moved the two spacecraft apart. Less than an hour and a half after undocking, Eagle's descent engine fired for 30 seconds to put it into a lower orbit for the landing.",
      },
      citations: [
        timeline("CSM/LM undocked."),
        timeline("LM descent orbit insertion ignition (LM SPS)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("lm", "Mission Profile"),
      ],
      photo: nasaPhoto(
        "as11-44-6581",
        1600,
        1600,
        "The lunar module Eagle, a boxy gold-and-black craft with four spindly landing legs extended, floating against black space.",
      ),
      view: "spacecraft",
      inTour: true,
    },

    /* ----------------------------- Landing ---------------------------- */
    {
      id: "powered-descent",
      title: "Powered descent begins",
      chapter: "landing",
      elapsed: "102:33:05.01",
      utc: "1969-07-20T20:05:05Z",
      text: {
        short: "Eagle fires its descent engine to begin the final, 12½-minute drop to the Moon's surface.",
        more:
          "The descent engine firing began 102 hours 33 minutes after launch and lasted 12 minutes 36.39 seconds, ending just after touchdown. It started on time, but Eagle was about 4.6 miles (7.4 kilometers) farther along its path than expected, so its landing point moved about that far past the planned one.",
      },
      citations: [
        timeline("LM powered descent engine ignition."),
        timeline("LM powered descent engine cutoff."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("LM Lunar Landing", "PDI Burn Duration (sec) row", ABTN_LM_LANDING),
      ],
      discrepancy: `${NMC_DIFFERS} lunar module gives the burn as 12 minutes 36.3 seconds. Apollo by the Numbers gives 12 minutes 36.39 seconds, which we follow. How far along Eagle was: the text follows Apollo by the Numbers' mission summary, "about 4 n mi" (our conversion: about 4.6 miles, 7.4 kilometers), farther downrange at the start of the firing, and the landing point shifted by about the same. The Apollo 11 Mission Report (section 5.3, "Powered Descent", page 5-5, PDF page 54) gives a "20 000-foot downrange error" at powered descent initiation, about 3.3 nautical miles (our conversion). NASA TM X-58040, Apollo Lunar Descent and Ascent Trajectories, says the lunar module's down-range position was in error by "approximately 3 nautical miles" at powered descent initiation and through the descent (PDF page 20), and that the landing was "approximately 3 nautical miles down range from the target" (PDF page 33).`,
      view: "moon",
    },
    {
      id: "program-alarm",
      title: "Computer alarms",
      chapter: "landing",
      elapsed: "102:38:22",
      utc: "1969-07-20T20:10:22Z",
      text: {
        short:
          "Eagle's computer sounds an alarm because it has too much work to do. It is judged safe to keep going, and the landing continues.",
        more:
          "The first of five computer alarms came 102 hours 38 minutes after launch, caused by a computer overload. It was determined that it was safe to continue the landing. The timeline lists them as alarms 1202 and 1201; the last came at 102:42:58, less than three minutes before touchdown.",
      },
      citations: [
        timeline("LM 1202 alarm."),
        timeline("LM 1201 alarm."),
        summary("Lunar Orbit/Lunar Surface Phase"),
      ],
      view: "spacecraft",
    },
    {
      id: "landing",
      title: "The Eagle has landed",
      chapter: "landing",
      elapsed: "102:45:39.9",
      utc: "1969-07-20T20:17:39Z",
      text: {
        short:
          "Armstrong flies Eagle past a crater full of boulders and lands on the Moon's Sea of Tranquility. People have landed on the Moon for the first time.",
        more:
          "Eagle touched down at 4:17:39 p.m. EDT on July 20, 1969. Armstrong had taken manual control to fly past a large, rugged crater with boulders. About 45 seconds of engine firing time remained at landing. Armstrong reported, \"Houston, Tranquility Base here - the Eagle has landed.\"",
      },
      citations: [
        timeline("LM lunar landing."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        {
          source: "apollo-by-the-numbers",
          locator: "Apollo 11 mission summary, footnote 1",
          url: ABTN_SUMMARY,
        },
        table("LM Lunar Landing", "Landing Site, GET, KSC Time, GMT Time, and Hover Time Remaining (sec) rows", ABTN_LM_LANDING),
        nmc("lm", "Description and Mission Profile"),
        transcript(
          'Tape 66/12, page 317 (PDF page 319): CDR, "Houston, Tranquility Base here." at 04 06 45 59, and CDR, "THE EAGLE HAS LANDED." at 04 06 46 04',
        ),
        transcript(
          'Tape 66/12, page 317 (PDF page 319): CC, "Roger, Tranquility. We copy you on the ground. You got a bunch of guys about to turn blue. We\'re breathing again. Thanks a lot." at 04 06 46 06',
        ),
      ],
      discrepancy:
        "NSSDCA gives the landing time as 20:17:40 UT (4:17:40 p.m. EDT), on its Apollo 11 page (nssdc.gsfc.nasa.gov/planetary/lunar/apollo11info.html) and its Master Catalog pages. Apollo by the Numbers gives 102:45:39.9 elapsed, 20:17:39 GMT, which we follow. The radio call is quoted as NSSDCA's Master Catalog prints it, with a dash. NASA's Apollo 11 mission page has \"Houston, Tranquility Base here, the Eagle has landed.\" NASA's technical air-to-ground transcript has \"Houston, Tranquility Base here.\" and \"THE EAGLE HAS LANDED.\" as two lines, at 04 06 45 59 and 04 06 46 04 (102:45:59 and 102:46:04). In NASA's recording, Mission Control's answer begins \"Roger, Twan - Tranquility\"; the transcript writes it \"Roger, Tranquility.\"",
      photo: nasaPhoto(
        "as11-37-5458",
        1600,
        1600,
        "The flat, gray surface of the Moon, scattered with small rocks and shallow craters, stretching to a sharp horizon under a black sky, seen from Eagle's window.",
      ),
      // NASA's file "Apollo 11: Eagle Has Landed Extended"
      // (590333main_ringtone_eagleHasLanded_extended.mp3), all of it, 0 to
      // 14.78 seconds, shipped unchanged.
      audio: {
        src: "media/apollo-11/the-eagle-has-landed.mp3",
        seconds: 14.78,
        note: "On the recording, Mission Control starts to say \"Tranquility\", stumbles, and says it again. That is the \"Twan\".",
        transcript: [
          { speaker: "Neil Armstrong", words: "Houston, Tranquility Base here. The Eagle has landed." },
          {
            speaker: "Mission Control",
            words: "Roger, Twan - Tranquility. We copy you on the ground. You got a bunch of guys about to turn blue. We're breathing again. Thanks a lot.",
          },
        ],
        credit: "NASA",
        sourceUrl: "https://www.nasa.gov/historical-sounds/",
      },
      view: "moon",
      inTour: true,
    },

    /* ---------------------------- On the Moon --------------------------- */
    {
      id: "first-step",
      title: "First step on the Moon",
      chapter: "surface",
      elapsed: "109:24:15",
      utc: "1969-07-21T02:56:15Z",
      text: {
        short: "Neil Armstrong climbs down Eagle's ladder and becomes the first person to step onto the Moon.",
        more:
          "Armstrong's left foot touched the surface at 10:56:15 p.m. EDT on July 20 (02:56:15 UTC on July 21), while a camera on Eagle sent live television of his climb down. His first words on the surface were, \"That's one small step for man, one giant leap for mankind.\" He reported that the fine, powdery soil stuck to his boots in a thin layer.",
      },
      citations: [
        timeline("1st step taken lunar surface (CDR)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("lm", "Mission Profile"),
        nasaMission("Article summary for students: \"Neil Armstrong was the first person to walk on the moon.\""),
        transcript(
          'Tape 70/24, page 377 (PDF page 379): CDR, "THAT\'S ONE SMALL STEP FOR MAN, ONE GIANT LEAP FOR MANKIND." at 04 13 24 48',
        ),
      ],
      discrepancy:
        "Apollo by the Numbers' mission summary, NSSDCA's Master Catalog, and NASA's technical air-to-ground transcript have \"one small step for man\"; the Apollo by the Numbers timeline has \"one small step for a man\"; NASA's Apollo 11 mission page has \"one small step for [a] man.\" We quote the Apollo by the Numbers summary. NSSDCA agrees on the time, 02:56:15 UT. The transcript stamps the words at 04 13 24 48, that is 109:24:48, 33 seconds after the 109:24:15 that Apollo by the Numbers gives for the foot touching the surface. In NASA's recording the words are heard as \"one small step for man,\" as the technical transcript has them; NASA's Historical Sounds page titles the recording \"That's One Small Step for (a) Man.\"",
      photo: nasaPhoto(
        "s69-42583",
        1600,
        1215,
        "Grainy black-and-white television picture of Neil Armstrong in his spacesuit on Eagle's ladder, just before his first step onto the bright lunar surface. A dark band crosses the image.",
      ),
      // NASA's file "Apollo 11: That's One Small Step for (a) Man"
      // (590331main_ringtone_smallStep.mp3, 12.98 seconds once decoded), from
      // 3.00 seconds to its end, encoded as AAC. NASA's file opens with an
      // earlier line joined to this one ("I'm going to step off the LM now.",
      // which the transcript places about a minute before), so the clip starts
      // after it and holds only this moment.
      audio: {
        src: "media/apollo-11/one-small-step.m4a",
        seconds: 9.98,
        transcript: [{ speaker: "Neil Armstrong", words: "That's one small step for man, one giant leap for mankind." }],
        credit: "NASA",
        sourceUrl: "https://www.nasa.gov/historical-sounds/",
      },
      view: "moon",
      inTour: true,
    },
    {
      id: "aldrin-on-surface",
      title: "Aldrin joins Armstrong",
      chapter: "surface",
      elapsed: "109:43:16",
      utc: "1969-07-21T03:15:16Z",
      text: {
        short:
          "Buzz Aldrin climbs down the ladder and joins Armstrong on the Moon. He calls the lunar surface \"magnificent desolation.\"",
        more:
          "Aldrin stepped onto the surface about 19 minutes after Armstrong. The two then unveiled a plaque on Eagle. It says, \"Here men from the planet Earth first set foot upon the Moon July 1969, A.D. We came in peace for all mankind,\" and carries the signatures of the three astronauts and President Richard M. Nixon. Armstrong read it aloud for the television audience; NASA's transcript records him reading, \"Here Man from the planet Earth first set foot upon the Moon.\"",
      },
      citations: [
        timeline("LMP on lunar surface."),
        timeline("Plaque unveiled (CDR)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("lm", "Mission Profile"),
        transcript(
          'Tape 71/5, page 385 (PDF page 387): the CDR line at the top of the page (stamped 04 13 52 40, faint on the scan), "For those who haven\'t read the plaque, we\'ll read the plaque ... Underneath it says \"Here Man from the planet Earth first set foot upon the Moon, July 1969 A.D. We came in peace for all mankind.\""',
        ),
      ],
      discrepancy:
        "NSSDCA's Master Catalog prints the plaque as \"first set foot on the Moon.\" Apollo by the Numbers prints \"first set foot upon the Moon,\" which we follow.",
      photo: nasaPhoto(
        "as11-40-5868",
        1586,
        1600,
        "Buzz Aldrin, in a white spacesuit and backpack, climbs down the ladder of the gold-wrapped lunar module toward the bright lunar surface, with black sky behind.",
      ),
      view: "moon",
      inTour: true,
    },
    {
      id: "flag",
      title: "Planting the flag",
      chapter: "surface",
      elapsed: "110:09:43",
      utc: "1969-07-21T03:41:43Z",
      text: {
        short:
          "The astronauts put up a United States flag. A few minutes later, President Richard Nixon talks with them by radio from the White House.",
        more:
          "Armstrong and Aldrin raised a three-by-five-foot United States flag on an eight-foot aluminum staff. About seven minutes later, President Richard M. Nixon spoke with them in a call from the White House and offered congratulations and good wishes.",
      },
      citations: [
        timeline("United States flag deployed (CDR, LMP)."),
        timeline("Presidential message from White House and response from CDR."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("lm", "Mission Profile"),
      ],
      photo: nasaPhoto(
        "as11-40-5875",
        1392,
        1440,
        "Buzz Aldrin in a white spacesuit stands beside the United States flag on the Moon. Bootprints cover the gray soil, and a leg of the lunar module is at the left.",
      ),
      view: "moon",
    },
    {
      id: "experiments",
      title: "Setting up experiments",
      chapter: "surface",
      elapsed: "110:55:42",
      utc: "1969-07-21T04:27:42Z",
      text: {
        short:
          "The astronauts set up a seismometer to measure moonquakes and a reflector for laser beams. Both stay on the Moon when the crew leaves.",
        more:
          "The seismometer was set up south of Eagle 110 hours 55 minutes after launch, and the laser ranging retroreflector about 8 minutes later. The seismometer's first data reached Earth while the crew was still outside, and it picked up their footsteps. Earlier, Aldrin had set out a solar wind experiment, which he collected again before going back inside.",
      },
      citations: [
        timeline("Passive seismometer deployed."),
        timeline("Lunar ranging retroreflector deployed (CDR)."),
        timeline("1st passive seismic experiment data received on Earth."),
        timeline("Solar wind composition experiment retrieved (LMP) ."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("lm", "Early Apollo Surface Experiments Package (EASEP)"),
      ],
      photo: nasaPhoto(
        "as11-40-5948",
        1440,
        1440,
        "Buzz Aldrin stands at the left beside a seismometer with fold-out solar panels on the gray lunar surface. The flag and the lunar module Eagle stand in the background.",
      ),
      view: "moon",
    },
    {
      id: "moonwalk-ends",
      title: "Moonwalk ends",
      chapter: "surface",
      elapsed: "111:39:13",
      utc: "1969-07-21T05:11:13Z",
      text: {
        short:
          "After about two and a half hours outside, Armstrong and Aldrin climb back into Eagle with their Moon samples and close the hatch.",
        more:
          "Aldrin went back inside first. Armstrong followed after the sample containers were passed up. Closing the hatch ended the first human exploration of the Moon. The two had spent 2 hours 31 minutes 40 seconds outside and gathered 47.51 pounds (21.55 kilograms) of rock and soil.",
      },
      citations: [
        timeline("EVA ended (hatch closed)."),
        timeline("LMP inside LM."),
        timeline("Transfer of sample containers reported complete."),
        timeline("CDR inside LM, assisted and monitored by LMP."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        table("Extravehicular Activity", "First Surface EVA, Duration and Samples Collected (lbm) rows", ABTN_EVA),
      ],
      view: "moon",
    },

    /* --------------------------- Back to orbit -------------------------- */
    {
      id: "lunar-liftoff",
      title: "Liftoff from the Moon",
      chapter: "reunion",
      elapsed: "124:22:00.79",
      utc: "1969-07-21T17:54:00Z",
      text: {
        short:
          "Eagle's top half fires its engine and launches off the Moon, using its bottom half as a launch pad. The bottom half stays behind on the Moon.",
        more:
          "The ascent engine fired 124 hours 22 minutes after launch, after Eagle had been on the Moon for 21 hours 36 minutes 20.9 seconds. About 7 minutes later, the ascent stage was in orbit around the Moon, ready to catch up with Columbia.",
      },
      citations: [
        timeline("LM lunar liftoff ignition (LM APS)."),
        timeline("LM orbit insertion cutoff."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        nmc("lm", "Lunar Module Spacecraft and Subsystems"),
      ],
      discrepancy: `${NMC_DIFFERS} lunar module gives liftoff as 17:54:01 UT. Apollo by the Numbers gives 17:54:00 GMT, which we follow.`,
      view: "moon",
      inTour: true,
    },
    {
      id: "docking",
      title: "Back together",
      chapter: "reunion",
      elapsed: "128:03:00",
      utc: "1969-07-21T21:35:00Z",
      text: {
        short:
          "Eagle catches up with Columbia and the two spacecraft dock. Armstrong and Aldrin move back into Columbia with Collins.",
        more:
          "After several engine firings to catch up, Eagle docked with Columbia 128 hours 3 minutes after launch. The two had been apart for exactly 27 hours 51 minutes. While turning to line up, Eagle's guidance platform reached gimbal lock and the craft briefly tumbled, but the crew recovered quickly and finished docking.",
      },
      citations: [timeline("CSM/LM docked."), summary("Lunar Orbit/Lunar Surface Phase")],
      discrepancy: `${NMC_DIFFERS} command and service module gives docking as 21:34:00 UT. Apollo by the Numbers gives 21:35:00 GMT, which we follow.`,
      photo: nasaPhoto(
        "as11-44-6642",
        1600,
        1544,
        "Eagle's upper stage approaches the camera above the gray surface of the Moon, with a half-lit Earth rising above the lunar horizon.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "ascent-stage-jettison",
      title: "Letting Eagle go",
      chapter: "reunion",
      elapsed: "130:09:31.2",
      utc: "1969-07-21T23:41:31Z",
      text: {
        short:
          "With the crew and Moon samples safely in Columbia, the astronauts let go of Eagle's top half. It is left behind in orbit around the Moon.",
        more:
          "The ascent stage was cast off 130 hours 9 minutes after launch, and a short firing about 20 minutes later moved Columbia away from it. It was left in lunar orbit. Its fate is not known; NSSDCA assumes it crashed into the Moon within the following one to four months.",
      },
      citations: [
        timeline("LM ascent stage jettisoned."),
        timeline("CSM/LM final separation ignition."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        { source: "nssdca-apollo-current-locations", locator: "Apollo 11, Lunar Module \"Eagle\"" },
        nmc("lm", "Mission Profile"),
      ],
      discrepancy: `${NMC_DIFFERS} lunar module says Eagle was jettisoned at 00:01:01 UT on July 22. Apollo by the Numbers gives 23:41:31 GMT on July 21, which we follow; NSSDCA's "Where are they now?" page agrees with it (23:41 UT).`,
      view: "spacecraft",
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: "transearth-injection",
      title: "Heading home",
      chapter: "return",
      elapsed: "135:23:42.28",
      utc: "1969-07-22T04:55:42Z",
      text: {
        short:
          "Columbia fires its main engine for about two and a half minutes to leave lunar orbit and head back to Earth.",
        more:
          "The firing, called transearth injection, began 135 hours 23 minutes after launch and lasted 2 minutes 31.41 seconds. Apollo 11 had circled the Moon 30 times over 59 hours 30 minutes 25.79 seconds. As on the way out, only one small course correction was needed on the trip home.",
      },
      citations: [
        timeline("Transearth injection ignition (SPS)."),
        summary("Lunar Orbit/Lunar Surface Phase"),
        summary("Transearth Phase"),
      ],
      discrepancy: `${NMC_DIFFERS} command and service module gives the start of the firing as 04:54:42 UT. Apollo by the Numbers gives 04:55:42 GMT, which we follow.`,
      view: "journey",
      inTour: true,
    },
    {
      id: "cm-sm-separation",
      title: "Letting go of the service module",
      chapter: "return",
      elapsed: "194:49:12.7",
      utc: "1969-07-24T16:21:12Z",
      text: {
        short:
          "Shortly before reaching Earth, the crew lets go of the service module. Only the cone-shaped command module will come home.",
        more:
          "The service module carried the main engine and most of the supplies, including oxygen, water, and fuel. It was cast off 194 hours 49 minutes after launch. The command module then followed an automatic path into the atmosphere. It was the only part of the spacecraft to return to Earth.",
      },
      citations: [
        timeline("CM/SM separation."),
        summary("Recovery"),
        nmc("csm", "Spacecraft and Subsystems"),
        { source: "nasm-apollo-11-command-module", locator: "Object description" },
      ],
      discrepancy: `${NMC_DIFFERS} command and service module gives the separation as 16:21:13 UT. Apollo by the Numbers gives 16:21:12 GMT, which we follow.`,
      view: "spacecraft",
    },
    {
      id: "entry",
      title: "Entering the atmosphere",
      chapter: "return",
      elapsed: "195:03:05.7",
      utc: "1969-07-24T16:35:05Z",
      text: {
        short:
          "Columbia reaches the top of Earth's atmosphere moving at about 24,700 miles per hour (39,700 kilometers per hour). The air begins to slow it down.",
        more:
          "Entry is counted from 400,000 feet, about 76 miles (122 kilometers) up, which Columbia reached 195 hours 3 minutes after launch. The crew felt a peak of 6.56 g, or about six and a half times their normal weight. A heat shield made of ablative material covered the command module's base.",
      },
      citations: [
        timeline("Entry."),
        summary("Recovery"),
        table("Entry, Splashdown and Recovery", "Earth Entry, GET, Velocity (ft/sec), and Maximum g rows", ABTN_ENTRY),
        nmc("csm", "Spacecraft and Subsystems, Command Module"),
      ],
      view: "earth",
    },

    /* ----------------------------- Splashdown ---------------------------- */
    {
      id: "parachutes",
      title: "Parachutes open",
      chapter: "splashdown",
      elapsed: "195:12:06.9",
      utc: "1969-07-24T16:44:06Z",
      text: {
        short:
          "Two small drogue parachutes open as Columbia falls toward the Pacific Ocean. It also carries three big main parachutes for splashdown.",
        more:
          "The drogue parachutes opened 195 hours 12 minutes after launch. Columbia carried two drogue parachutes 16 feet (5 meters) across and three main parachutes 83 feet (25.4 meters) across. A recovery aircraft had already spotted the spacecraft, and the recovery ship had it on radar.",
      },
      citations: [
        timeline("Drogue parachute deployed"),
        timeline("Visual contact with CM established by aircraft."),
        timeline("Radar contact with CM established by recovery ship."),
        nmc("csm", "Spacecraft and Subsystems, Command Module"),
      ],
      view: "earth",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "splashdown",
      elapsed: "195:18:35",
      utc: "1969-07-24T16:50:35Z",
      text: {
        short:
          "Columbia splashes down in the Pacific Ocean. A helicopter picks up the astronauts and flies them to the recovery ship USS Hornet.",
        more:
          "Splashdown came about 15 miles (24 kilometers) from the Hornet. Columbia first floated upside down until inflatable bags turned it upright. The crew put on isolation garments, were scrubbed with iodine in a raft, and reached the Hornet 63 minutes after splashdown. In all, the mission traveled an estimated 953,700 miles (1,534,800 kilometers).",
      },
      citations: [
        timeline("Splashdown (went to apex-down)."),
        summary("Recovery"),
        table(
          "Entry, Splashdown and Recovery",
          "Earth Splashdown GET, GMT Time, Distance To Recovery Ship (n mi), Distance Traveled (n mi), Minutes To Crew Pickup, and Recovery Ship rows",
          ABTN_ENTRY,
        ),
        nmc("csm", "Mission Profile"),
      ],
      photo: nasaPhoto(
        "s69-21698",
        1193,
        1200,
        "The cone-shaped command module Columbia floats in the blue Pacific inside an orange flotation collar, with white balloons on top. Beside it, the crew and a Navy swimmer sit in an orange raft.",
      ),
      view: "earth",
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: "Command module Columbia",
        museum: "National Air and Space Museum",
        place: "Washington, D.C.",
      },
      citations: [
        { source: "nasm-apollo-11-command-module", locator: "Display Status" },
        { source: "nssdca-apollo-current-locations", locator: "Apollo 11, Command Module \"Columbia\"" },
        nmc("csm", "Mission Profile"),
      ],
    },
  ],
};
