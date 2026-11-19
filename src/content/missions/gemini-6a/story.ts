/**
 * Gemini 6A (NASA wrote it "Gemini VI-A"): the first rendezvous of two
 * crewed spacecraft, with Gemini 7 (Gemini VII), December 15-16, 1965.
 *
 * NASA's own copy of the Gemini VI-A mission report (MSC-G-R-66-2) was not
 * found. Event times come, in this order of preference, from:
 * - the report's Supplemental Report 5, the onboard computer's analysis
 *   (NASA's scan, hosted at ibiblio.org);
 * - Appendix 1 of the Gemini chronology (SP-4002), whose tables give the
 *   flight's elapsed times for station keeping, retrofire, and touchdown;
 * - the Gemini VI air-to-ground and onboard transcript, where each call is
 *   logged with its ground elapsed time (used for the burns and radio calls
 *   the tables do not list);
 * - On the Shoulders of Titans (SP-4203), NSSDCA, and NASA's pages.
 * The Gemini VII mission report (MSC-G-R-66-1) covers the meeting from the
 * other spacecraft. Where sources differ, the `discrepancy` field says what
 * the others give and which we follow.
 *
 * Elapsed times are Gemini VI-A's ground elapsed time, counted from its
 * lift-off at 13:37:26.471 UT (8:37:26 a.m. EST) on December 15, 1965
 * (NSSDCA; the Gemini VII mission report prints 13:37:26.47 G.m.t.). The
 * transcript's clock is the same one: it logs "Lift-off 13:37:26" at
 * 00:00:01. Where a source gives a time only to the minute, seconds are
 * written as 00 and the text says "about".
 *
 * Universal times are given only where a source states the clock time;
 * Eastern Standard Time is converted by adding 5 hours (our arithmetic).
 * Times on Gemini VII's clock are converted by subtracting 258:07:22.77, the
 * Gemini VII elapsed time of Gemini VI-A's lift-off (Gemini VII mission
 * report, page 4-6): our arithmetic.
 *
 * Unit conversions in the text (nautical miles and kilometers to miles,
 * meters to feet, feet per second to miles per hour) are our arithmetic on
 * the cited values, rounded to the digits the source gives.
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const CHRONOLOGY_1965 = "https://www.nasa.gov/history/SP-4002/p3a.htm";
const CHRONOLOGY_TABLE_A = "https://www.nasa.gov/history/SP-4002/app1a.htm";
const CHRONOLOGY_TABLE_B = "https://www.nasa.gov/history/SP-4002/app1b.htm";
const NMC_GEMINI_6A = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-104A";
const RENDEZVOUS_PAPER = "https://ntrs.nasa.gov/api/citations/19680005473/downloads/19680005473.pdf";

/** A line of the Gemini VI transcript: its time as printed, who spoke, and the words. */
function transcript(time: string, words: string, page: number): Citation {
  return {
    source: "gemini-6a-voice-transcript",
    locator: `Page ${page} (PDF page ${page + 1}), ${time}: "${words}"`,
  };
}

/** The Gemini chronology's December 1965 entries (Part III (A)). */
function chronology(day: "December 12" | "December 15", words: string): Citation {
  return { source: "gemini-chronology", locator: `Part III (A), ${day}, 1965: ${words}`, url: CHRONOLOGY_1965 };
}

/** Appendix 1 of the Gemini chronology, Gemini VI-A column or rows. */
function chronologyTable(table: "A" | "B", rows: string): Citation {
  return {
    source: "gemini-chronology",
    locator: `Appendix 1, Table ${table} (${table === "A" ? "General" : "Orbital Operations"}), VI-A: ${rows}`,
    url: table === "A" ? CHRONOLOGY_TABLE_A : CHRONOLOGY_TABLE_B,
  };
}

/** On the Shoulders of Titans, chapter XII (printed page; the PDF page is 21 more). */
function titans(page: number, words: string): Citation {
  return { source: "on-the-shoulders-of-titans", locator: `Chapter XII, "Spirit of 76", page ${page} (PDF page ${page + 21}): ${words}` };
}

/** NSSDCA's Master Catalog page for Gemini 6A. */
function nmc(section: string): Citation {
  return { source: "nssdca-master-catalog", locator: `"Gemini 6A" (1965-104A), ${section}`, url: NMC_GEMINI_6A };
}

/** NASA's Gemini VI mission page. */
function nasaMission(section: string): Citation {
  return { source: "gemini-6a-nasa-mission-page", locator: section };
}

/** NASA's article "55 Years Ago: The Spirit of 76 - The First Rendezvous in Space". */
function spirit(section: string): Citation {
  return { source: "gemini-6a-nasa-spirit-of-76", locator: section };
}

/** The Smithsonian's story "The World's First Space Rendezvous". */
function nasmStory(section: string): Citation {
  return { source: "gemini-6a-nasm-first-rendezvous", locator: section };
}

/** The Gemini VII mission report. */
function geminiVII(locator: string): Citation {
  return { source: "gemini-6a-gemini-vii-mission-report", locator };
}

/** Supplemental Report 5 to the Gemini VI-A mission report. */
function supplemental(locator: string): Citation {
  return { source: "gemini-6a-supplemental-report-5", locator };
}

/** Summary of Rendezvous Operations, Gemini Summary Conference (page of the conference volume, and of the NTRS file). */
function rendezvousPaper(locator: string): Citation {
  return { source: "gemini-rendezvous-summary", locator, url: RENDEZVOUS_PAPER };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-6a/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-6a/${nasaId.toLowerCase()}.jpg`,
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
  id: "gemini-6a",
  program: "gemini",
  name: "Gemini 6A",
  kind: "flight",
  destination: "earth-orbit",

  summary: {
    text: {
      short:
        "Gemini 6A made the first rendezvous of two crewed spacecraft, in December 1965. Wally Schirra and Tom Stafford caught up with Gemini 7 in orbit and flew beside it for more than five hours.",
      more:
        "Gemini 6 was first meant to chase and dock with an uncrewed Agena target rocket, but on October 25, 1965, the Agena was lost on its way to orbit. NASA then launched Gemini 7 first, on December 4, for a two-week flight, and sent Gemini 6, renamed 6A, up to meet it. After a launch attempt that ended on the pad on December 12, Gemini 6A lifted off on December 15 and reached Gemini 7 less than six hours later. The two crews flew in formation for 5 hours 17 minutes 29 seconds, sometimes only a foot apart. Gemini 6A landed in the western Atlantic Ocean the next day, 25 hours 51 minutes 24 seconds after liftoff, while Gemini 7 stayed in orbit until December 18.",
    },
    citations: [
      chronology("December 15", "the Gemini VI-A mission entry"),
      chronologyTable("A", "Launch date and Time (e.s.t.) rows, and \"G.E.T. to touchdown\" row, 25:51:24"),
      chronologyTable("B", "Station keeping row, Ground Elapsed Time \"To begin\" 5:56:00 and \"Period\" 5:17:29"),
      spirit("Paragraphs on the original Gemini VI plan, the Oct. 25, 1965, Agena launch, the decision to use Gemini VII as the target, and the Dec. 12 abort"),
      nasaMission("Milestones and Mission Overview"),
      geminiVII("Section 1.0, \"Mission Summary\" (page 1-1, PDF page 31): Gemini VII \"was launched ... on December 4, 1965\" and \"The flight was successfully concluded on December 18, 1965\""),
      nmc("Description and Mission Profile"),
    ],
  },

  crew: {
    value: [
      { name: "Walter M. Schirra Jr.", role: "Command pilot" },
      { name: "Thomas P. Stafford", role: "Pilot" },
    ],
    citations: [
      nasaMission("Mission Facts: \"Crew: Walter M. Schirra Jr. (Command Pilot) and Thomas P. Stafford (Pilot)\""),
      chronologyTable("A", "Flight crew, Command pilot and Pilot rows"),
      chronology("December 15", "\"crewed by command pilot Astronaut Walter M. Schirra, Jr., and pilot Astronaut Thomas P. Stafford\""),
    ],
  },
  crewPhoto: nasaPhoto(
    "S65-56151",
    1200,
    935,
    "Thomas P. Stafford, left, and Walter M. Schirra Jr., right, pose in white spacesuits without their helmets, name tags on their chests, against a dark blue backdrop.",
  ),

  launch: {
    value: {
      utc: "1965-12-15T13:37:26.471Z",
      site: "Launch Complex 19, Cape Kennedy, Florida",
      vehicle: "Titan II Gemini Launch Vehicle (GLV-6)",
    },
    citations: [
      nmc("Mission Profile: \"8:37:26 a.m. EST (13:37:26.471 UT)\""),
      geminiVII("Section 4.1, \"Actual Mission\" (page 4-6, PDF page 84): \"Gemini VI-A was launched at 13:37:26.47 G.m.t.\""),
      nasaMission("Mission Facts: Launch Date, Launch Site, and Launch Vehicle"),
      chronologyTable("A", "Launch vehicle (GLV-6), Launch date, and Time (e.s.t.) rows"),
      chronology("December 15", "\"launched from complex 19 at 8:37 a.m., e.s.t.\""),
      geminiVII("Section 1.0, \"Mission Summary\" (page 1-1, PDF page 31): Gemini VII \"was launched from Complex 19, Cape Kennedy, Florida\""),
      { source: "gemini-chronology", locator: "Part III (A), August 4, 1965: \"McDonnell delivered Gemini spacecraft No. 6 to Cape Kennedy.\"", url: CHRONOLOGY_1965 },
    ],
    discrepancy:
      "NASA's Gemini VI page, a current page, gives the launch site as \"Complex 19, Cape Canaveral\". We follow the documents of the time: the Gemini VII mission report names the same complex \"Complex 19, Cape Kennedy, Florida\", and the Gemini chronology has spacecraft No. 6 delivered to Cape Kennedy.",
  },

  duration: {
    value: "025:51:24",
    citations: [
      chronologyTable("A", "\"G.E.T. to touchdown (hr; min; sec)\" row, 25:51:24"),
      nasaMission("Mission Facts: \"Duration: 25 hours, 51 minutes, 24 seconds\""),
      nmc("Mission Profile: \"Total mission elapsed time was 25:51:24.\""),
    ],
    discrepancy:
      "On the Shoulders of Titans (page 291) gives the flight as 25 hours, 15 minutes, 58 seconds, which is the chronology's time to retrofire; NASA's 55-years article gives 25 hours and 16 minutes, and the Smithsonian's capsule page 26 hours. We follow the chronology's time to touchdown, which NSSDCA and NASA's Gemini VI page repeat.",
  },

  accomplishments: [
    {
      text: {
        short: "Gemini 6A and Gemini 7 made the first rendezvous in space: two spacecraft with crews met and flew side by side.",
        more:
          "In 1962 two Soviet Vostok spacecraft had passed within about 5 kilometers (3 miles) of each other, but they were in different orbits and could not steer toward each other. Schirra and Stafford flew Gemini 6A to Gemini 7 and stopped beside it, with no motion between them. It was the first time two spacecraft were maneuvered with respect to each other by their crews.",
      },
      citations: [
        titans(287, "\"The world's first manned space rendezvous was now a fact\" and the paragraph on Vostok III and Vostok IV"),
        rendezvousPaper("Introduction (page 7, PDF page 1): the Gemini VI-A crew, \"using the Gemini VII spacecraft as the target vehicle, completed the first space rendezvous operation\""),
        nmc("Mission Profile: \"This marked the first time two spacecraft were maneuvered with respect to each other by their crews.\""),
        { source: "gemini-6a-nasm-capsule", locator: "Object description: \"the first rendezvous in space history\"" },
      ],
    },
    {
      text: {
        short: "It proved a skill Apollo needed to land on the Moon: finding another spacecraft in orbit and meeting it.",
        more:
          "NASA's plan for the Moon landings, lunar orbit rendezvous, depended on spacecraft meeting in orbit: each landing mission required one rendezvous and two dockings. Proving rendezvous was one of the main goals of Project Gemini, and Gemini 6A showed that a crew could do it with their spacecraft's own radar and computer.",
      },
      citations: [
        spirit("Opening paragraph: \"Paramount among those techniques was rendezvous and docking necessary to implement the Lunar Orbit Rendezvous method NASA chose for the Moon landing missions.\""),
        rendezvousPaper("Introduction (page 7, PDF page 1): \"One of the major objectives of the Gemini Program was to develop and to demonstrate techniques for the rendezvous and docking of space vehicles\"; \"lunar orbital rendezvous has been selected as the primary mode for the Apollo lunar-landing mission which requires one rendezvous and two dockings\""),
        titans(287, "the radar \"lock-on\" and the \"computer (or automatic) rendezvous mode\""),
        titans(286, "\"achieving rendezvous would be navigationally significant to the Apollo program\""),
        nasaMission("Objectives: \"The mission priorities were to demonstrate on-time launch procedures, closed-loop rendezvous capabilities, and stationkeeping techniques with Gemini VII.\""),
      ],
    },
    {
      text: {
        short: "For more than five hours the two spacecraft flew in formation, as close as one foot apart.",
        more:
          "Station keeping, flying in formation without docking, lasted 5 hours 17 minutes 29 seconds, over more than three trips around Earth, at distances from about 1 foot to 300 feet (0.3 to 90 meters). Pushes on the thrusters as small as 0.10 foot per second gave such fine control that Schirra and Stafford concluded docking with a target would be no problem. All four astronauts took turns flying.",
      },
      citations: [
        chronologyTable("B", "Station keeping row, \"Period (hr:min:sec)\" 5:17:29"),
        chronology("December 15", "\"Stationkeeping maneuvers continued for three and a half orbits at distances from 1 to 300 feet.\""),
        titans(288, "ranges \"from 0.30 meters to 90 meters\"; \"Velocity inputs as low as 0.03 meter (0.10 foot) per second\"; \"nuzzling into and docking with a target vehicle would be no problem\""),
        nmc("Mission Profile: \"all four astronauts on both spacecraft took turns in the formation flying activities\""),
      ],
    },
    {
      text: {
        short: "Coming home, the crew steered Gemini 6A through the atmosphere and landed close to the planned spot, a first for an American crew.",
        more:
          "A Gemini spacecraft could steer on the way down by banking, rolling to one side, which cut its lift and shortened how far it flew. Gemini 6A splashed down about 7 nautical miles (13 kilometers) from its aiming point, the first successfully controlled reentry to a planned landing point in the U.S. crewed spaceflight program.",
      },
      citations: [
        titans(291, "\"Gemini VI-A landed about 13 kilometers from its planned impact point, recording the first successfully controlled reentry\""),
        titans(291, "\"Since the Gemini spacecraft obtained its greatest lift flying straight ahead, banking cut lift and shortened range.\" (the sentence begins on page 289)"),
        chronologyTable("A", "\"Landing accuracy (n.m. from planned landing point)\" row, 7"),
        nmc("Mission Profile: \"This was the first successful controlled reentry to a predetermined point in the U.S. manned spaceflight program.\""),
      ],
    },
    {
      text: {
        short: "When Gemini 6A reached orbit, four people were in space at the same time for the first time.",
      },
      citations: [spirit("Paragraph on the Dec. 15 launch: \"When they reached orbit, for the first time in history, four people were in space simultaneously.\"")],
    },
  ],

  chapters: [
    { id: "launch", title: "Launch" },
    { id: "chase", title: "The chase" },
    { id: "approach", title: "Closing in" },
    { id: "together", title: "Side by side" },
    { id: "coming-home", title: "Coming home" },
    { id: "splashdown", title: "Splashdown" },
  ],

  events: [
    /* ----------------------------- Launch ---------------------------- */
    {
      id: "liftoff",
      handsOn: "stages",
      title: "Liftoff, at last",
      chapter: "launch",
      elapsed: "000:00:00",
      utc: "1965-12-15T13:37:26.471Z",
      text: {
        short: "A Titan II rocket lifts Wally Schirra and Tom Stafford into the sky. Their job: catch up with Gemini 7, which is already in orbit.",
        more:
          "This was the third try. The first plan ended on October 25, 1965, when the Agena rocket they were to chase was lost on its way to orbit. On December 12, the Titan's engines lit and then shut down 1.2 seconds later, with the rocket still on the pad. Schirra chose not to eject, because he could tell the rocket had not moved. An electrical plug had dropped out of the rocket's tail too early, and engineers also found a dust cover left inside one engine. Three days later, at 8:37 a.m. Eastern Standard Time on December 15, Gemini 6A lifted off from Launch Complex 19. \"For the third time, go,\" Schirra urged.",
      },
      citations: [
        nmc("Mission Profile: \"8:37:26 a.m. EST (13:37:26.471 UT)\""),
        chronologyTable("A", "Launch date and Time (e.s.t.) rows, \"8:37:26 a.m.\""),
        chronology("December 12", "the aborted launch: \"an electrical umbilical connector separated prematurely\"; \"a protective dust cap inadvertently left in place\""),
        chronology("December 15", "\"launched from complex 19 at 8:37 a.m., e.s.t.\""),
        spirit("Paragraphs on the Oct. 25 Agena launch and the Dec. 12 abort: \"shut off after just 1.2 seconds\"; \"Schirra made the split-second decision not to eject\""),
        titans(283, "\"an electrical tail plug dropped from the base of the booster\"; Schirra \"knew GLV-6 had not moved, and he knew the clock was wrong\""),
        titans(284, "\"a dust cover that had accidentally been left in the engine\""),
        titans(286, "\"At 8:37 a.m. Gemini VI-A rose from its pad. As if forcing it to move by will power alone, Schirra urged, 'for the third time, go.'\""),
      ],
      photo: nasaPhoto(
        "S65-44293",
        1600,
        1228,
        "Black-and-white view from a distance: the Titan II rocket climbs on a thin trail of flame above the launch pads, beside a huge white cloud of exhaust smoke, with a tall service tower at left.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "in-orbit",
      title: "In orbit, far behind",
      chapter: "launch",
      elapsed: "000:05:58.557",
      utc: "1965-12-15T13:43:25Z",
      text: {
        short: "Six minutes after liftoff, Gemini 6A is in orbit. Gemini 7 is about 1,240 miles (1,992 kilometers) ahead, so the chase begins.",
        more:
          "The rocket's second stage shut down 5 minutes 38.728 seconds after liftoff, and about 20 seconds later the spacecraft was on its own in an orbit 87 by 140 nautical miles (about 100 to 161 miles, or 161 to 259 kilometers) high. \"Good velocity. 25,710,\" Stafford called, reading their speed in feet per second, about 17,500 miles per hour. Borman and Lovell in Gemini 7 could not see the liftoff, but they followed the rocket's climb by eye and with an instrument. With Gemini 6A in orbit, four people were in space at once for the first time.",
      },
      citations: [
        supplemental("Ascent report, section 2.7 (page 12, PDF page 18): \"the corrected time for delivery of the IGS SECO discrete is 338.728 ± 0.015 seconds after lift-off\""),
        supplemental("Ascent report, Table 3, \"IGS Injection Conditions (At Approximately SECO +20: 358.557)\" (page 10, PDF page 16)"),
        nmc("Mission Profile: \"inserted into a 161.0 x 259.4 km orbit at 8:43:25\""),
        chronology("December 15", "\"inserted the spacecraft into an 87 by 140 nautical mile orbit\""),
        titans(286, "\"At insertion, the chase vehicle trailed its target by 1992 kilometers.\""),
        transcript("00:05:58, pilot", "Good velocity. 25,710.", 4),
        geminiVII("Section 4.1, \"Actual Mission\" (page 4-6, PDF page 84): \"The actual lift-off was not seen from spacecraft 7, but tracking of powered flight was achieved both visually and with experiment D-4/D-7 equipment.\""),
        spirit("\"When they reached orbit, for the first time in history, four people were in space simultaneously.\""),
      ],
      discrepancy:
        "On the Shoulders of Titans (page 286) gives the computer's reading at engine cutoff as 7830 meters per second (25,690 feet per second); we quote Stafford's call in the transcript. NSSDCA puts Gemini 7 about 1,900 km ahead at insertion; we follow On the Shoulders of Titans, 1992 km.",
      view: "earth",
      inTour: true,
    },

    /* ---------------------------- The chase --------------------------- */
    {
      id: "height-adjust",
      title: "The first push",
      chapter: "chase",
      elapsed: "001:34:04",
      text: {
        short: "Schirra fires the thrusters for the first time. This small push starts closing the gap to Gemini 7.",
        more:
          "Over New Orleans, 94 minutes after liftoff, Schirra called \"Mark. Burning.\" and fired the thrusters for 23 seconds, speeding up by about 4 meters (13 feet) per second. That raised the high point of Gemini 6A's orbit to 272 kilometers (169 miles). Flying lower than Gemini 7, and so faster, Gemini 6A was now 1,175 kilometers (730 miles) behind.",
      },
      citations: [
        transcript("01:34:04, command pilot", "... MARK. Burning.", 17),
        transcript("01:34:27, command pilot", "MARK. Burn complete.", 17),
        titans(286, "\"Over New Orleans, after 94 minutes in space, Schirra ignited the thrusters to speed up by 4 meters per second\"; \"kicked the apogee up to 272 kilometers\"; \"now lagged only 1175 kilometers behind Gemini VII\""),
        chronology("December 15", "\"The first maneuver, a height adjustment, came an hour and a half after insertion, at first perigee\""),
      ],
      discrepancy:
        "NSSDCA says the four catch-up burns started at 9:11 a.m. EST, 34 minutes after liftoff; the transcript, the chronology, and On the Shoulders of Titans all put the first at about 1 hour 34 minutes. We follow the transcript.",
      view: "earth",
    },
    {
      id: "phase-adjust",
      title: "Speeding up the catch-up",
      chapter: "chase",
      elapsed: "002:18:02",
      text: {
        short: "A longer push speeds up the chase. Later, a sideways push lines Gemini 6A up with Gemini 7's path around Earth.",
        more:
          "Schirra fired the thrusters from 2 hours 18 minutes 2 seconds until 2 hours 19 minutes 17 seconds, adding 19 meters (62 feet) per second. That raised the low point of the orbit to 224 kilometers (139 miles). At 2 hours 42 minutes 8 seconds, over the Pacific, he turned the spacecraft 90 degrees and fired for about 40 seconds to move into the same plane as Gemini 7's orbit. The gap between them had shrunk to 483 kilometers (300 miles).",
      },
      citations: [
        transcript("02:18:02, command pilot", "MARK.", 22),
        transcript("02:19:17, command pilot", "MARK.", 23),
        transcript("02:42:08, pilot", "MARK.", 30),
        transcript("02:42:47, command pilot", "Burn complete.", 30),
        titans(286, "\"Near Carnarvon, at 2 hours 18 minutes ground elapsed time, Schirra began a phase adjustment\"; \"add 19 meters per second\"; perigee \"to 224 kilometers\"; the plane change \"less than half an hour later\"; \"the distance between the two vehicles had narrowed to 483 kilometers\""),
        chronology("December 15", "\"a phase adjustment at second apogee, a plane change, and another height adjustment at second perigee followed\""),
      ],
      view: "earth",
    },
    {
      id: "coelliptic",
      title: "Lined up below Gemini 7",
      chapter: "chase",
      elapsed: "003:47:40",
      text: {
        short: "Gemini 6A's radar has found Gemini 7. Schirra settles into a round orbit about 17 miles (28 kilometers) below it, slowly gaining on it.",
        more:
          "The radar locked on to Gemini 7 about 434 kilometers (270 miles) away. At 3 hours 47 minutes, the thrusters fired for 54 seconds and added 13 meters (43 feet) per second. That made the orbit almost a circle, 270 by 274 kilometers (168 by 170 miles) high. It was a coelliptic orbit, one that stays a set distance below the target's, here 15 nautical miles, so Gemini 6A gained on Gemini 7 at a steady rate. The two were now 319 kilometers (198 miles) apart. A few minutes later the crew switched the computer to its rendezvous mode.",
      },
      citations: [
        transcript("03:47:40, command pilot", "Burning.", 43),
        titans(287, "\"a solid lock-on at 434 kilometers range\"; \"at 3 hours 47 minutes, the aft thrusters fired for 54 seconds to add 13 meters per second\"; \"almost a circle, measuring 270 by 274 kilometers\"; \"319 kilometers apart\"; computer rendezvous mode \"at 3 hours 51 minutes\""),
        geminiVII("Section 5.1.2, \"Communications Systems\" (page 5-3, PDF page 121): the distance \"was in excess of 235 nautical miles because rendezvous radar lock-on occurred at this distance\""),
        spirit("\"At a distance of 270 miles, Gemini VI's rendezvous radar established a solid lock on Gemini VII.\""),
        rendezvousPaper("Table 2-IV (page 18, PDF page 12), VI-A: conditions at start of terminal phase, \"Coelliptic: Δh = 15 n. mi.\""),
        rendezvousPaper("Page 10 (PDF page 4), on the Gemini VI-A, VIII, and X rendezvous: \"At the third spacecraft apogee, a coelliptical maneuver ... was performed to produce a constant altitude differential of 15 nautical miles.\""),
        chronology("December 15", "\"The coelliptic maneuver was performed at third apogee, 3 hours 47 minutes after launch.\""),
      ],
      discrepancy:
        "The chronology's December 15 entry gives the first radar lock-on as 246 miles, and NSSDCA as 396 km. We follow the Gemini VII mission report (more than 235 nautical miles, about 270 miles), which On the Shoulders of Titans (434 km) and NASA's 55-years article (270 miles) match.",
      view: "earth",
    },
    {
      id: "bright-star",
      title: "A bright star ahead",
      chapter: "chase",
      elapsed: "005:04:50",
      text: {
        short: "Schirra spots a bright light ahead. Is it the star Sirius, or Gemini 7? It is Gemini 7, shining in the sunlight about 60 miles (100 kilometers) away.",
        more:
          "At about 5 hours 4 minutes, Schirra exclaimed, \"My gosh, there is a real bright star out there. That must be Sirius.\" He radioed, \"This is Gemini VI. I have a lighted target at about 12 o'clock. It may be a star and it may be VII. We'll check her out.\" Half a minute later he reported, \"We either have Sirius or VII in sight! It's right in the middle of the reticle,\" the aiming marks of his sight. The \"star\" was Gemini 7, reflecting sunlight.",
      },
      citations: [
        transcript("05:04:50, command pilot", "This is Gemini VI. I have a lighted target at about 12 o'clock. It may be a star and it may be VII. We'll check her out.", 53),
        transcript("05:05:17, command pilot", "RKV, we either have Sirius or VII in sight! It's right in the middle of the reticle. Radar is locked on.", 53),
        titans(287, "\"At 5 hours 4 minutes, he exclaimed, 'My gosh, there is a real bright star out there. That must be Sirius.' The 'star' was Gemini VII, reflecting the Sun's rays from 100 kilometers away.\""),
        spirit("\"Once the distance between the two spacecraft had closed to 60 miles, Schirra could see Gemini VII\""),
      ],
      view: "spacecraft",
      inTour: true,
    },

    /* ---------------------------- Closing in -------------------------- */
    {
      id: "final-approach",
      title: "Heading straight for Gemini 7",
      chapter: "approach",
      elapsed: "005:18:59",
      text: {
        short: "Now Schirra aims Gemini 6A straight at Gemini 7 and fires the thrusters. The final approach has begun.",
        more:
          "When this terminal phase, the final approach, began, Gemini 6A was 15 nautical miles (17 miles) below Gemini 7 and 25 nautical miles (29 miles) behind it. \"We're burning,\" Schirra said as the thrusters fired, and the two closed at better than 3 kilometers (2 miles) every minute and a half. When Gemini 7 passed into Earth's shadow the crew briefly lost sight of it, then picked up its flashing lights. Two small corrections followed, at 5 hours 32 minutes and 5 hours 44 minutes, of 11 and 7 feet per second.",
      },
      citations: [
        supplemental("Rendezvous and catch-up report, Introduction (page 1, PDF page 50): \"TPI at 19,139 seconds elapsed time\" (5 hours 18 minutes 59 seconds)"),
        transcript("05:18:58, command pilot", "We're burning.", 58),
        rendezvousPaper("Table 2-IV (page 18, PDF page 12), VI-A: \"Coelliptic: Δh = 15 n. mi. ΔX = 25 n. mi.\""),
        rendezvousPaper("Table 2-V, \"Vernier Correction Solutions for Primary Rendezvous\" (page 18, PDF page 12), VI-A row, actual correction: first 11, second 7 ft/sec"),
        titans(287, "\"closed on Gemini VII at a rate of better than three kilometers every minute and a half\"; \"briefly lost sight of Gemini VII when it passed into darkness but soon picked up the target's running lights\"; corrections \"at 5 hours 32 minutes and 5 hours 44 minutes\""),
        geminiVII("Section 3.1.2.4, \"Guidance and control system\" (page 3-4, PDF page 40): two acquisition lights on Gemini VII \"automatically controlled to flash at a frequency of approximately 65 flashes per minute\""),
      ],
      discrepancy:
        "On the Shoulders of Titans says the slow catch-up \"lasted until 5 hours 16 minutes\", and the chronology puts terminal phase initiation \"an hour and a half\" after 3:47. We follow the onboard computer analysis, 5 hours 18 minutes 59 seconds (19,139 seconds), which matches Schirra's \"We're burning\" at 05:18:58 in the transcript.",
      view: "spacecraft",
    },
    {
      id: "braking",
      title: "Braking",
      chapter: "approach",
      elapsed: "005:50:34",
      text: {
        short: "Gemini 7 is only half a mile away. Schirra fires the thrusters to slow down while Stafford calls out how far they still have to go.",
        more:
          "\"Brake at .48 nautical miles,\" Stafford called, about 2,900 feet (890 meters) from Gemini 7. The crew saw the twin stars Castor and Pollux, in the constellation Gemini, lined up with their target. Then Gemini 7 flashed into sunlight, so bright that from 200 meters (660 feet) it looked like a carbon arc lamp. Aboard Gemini 7, Borman and Lovell could see Gemini 6A's thrusters firing.",
      },
      citations: [
        transcript("05:50:34, pilot", "Brake at .48 nautical miles.", 72),
        chronology("December 15", "\"Two midcourse corrections preceded final braking maneuvers at 5 hours 50 minutes into the flight.\""),
        titans(287, "braking began \"at a range of 900 meters\"; \"the VI-A astronauts saw the stars Castor and Pollux in the Gemini (Twin) constellation aligned with their sister ship\"; \"From a distance of 200 meters, it resembled a carbon arc light.\""),
        geminiVII("Section 4.1, \"Actual Mission\" (page 4-6, PDF page 84): \"After closing to approximately 1/2 mile, the actual thruster firings of spacecraft 6 could be seen by the Gemini VII crew.\""),
        nmc("Mission Profile: \"the final braking maneuver at 2:27 p.m. EST\""),
      ],
      view: "spacecraft",
      inTour: true,
    },

    /* --------------------------- Side by side ------------------------- */
    {
      id: "rendezvous",
      title: "Rendezvous",
      chapter: "together",
      elapsed: "005:56:00",
      text: {
        short: "Gemini 6A stops about 120 feet (37 meters) from Gemini 7. For the first time, two spacecraft with crews have met in space.",
        more:
          "Station keeping, flying in formation without docking, began 5 hours 56 minutes after liftoff, with no motion left between the two spacecraft. \"We have 120 feet steady,\" Stafford reported, and Schirra joked, \"We're all sitting up here playing bridge together.\" In Mission Control in Houston, flight controllers waved small American flags and lit cigars. As Schirra put it, a rendezvous is not over until the two craft are \"completely stopped\" beside each other, about 120 feet apart.",
      },
      citations: [
        chronologyTable("B", "Station keeping row, Ground Elapsed Time \"To begin (hr:min:sec)\" 5:56:00"),
        chronology("December 15", "\"Rendezvous was technically accomplished and stationkeeping began some 6 minutes later when the two spacecraft were about 120 feet apart and their relative motion had stopped.\""),
        transcript("05:56:51, pilot", "Roger. We have 120 feet steady.", 76),
        transcript("05:56:41, command pilot", "Roger. We're all sitting up here playing bridge together.", 76),
        titans(287, "\"the cheering throng of flight controllers waved small American flags, while Kraft, Gilruth, and others of the jubilant crowd lit cigars\"; \"At 2:33 p.m., 15 December 1965, Gemini VI-A had rendezvoused with Gemini VII.\""),
        titans(288, "Schirra: \"I don't think rendezvous is over until you are stopped-completely stopped-with no relative motion between the two vehicles, at a range of approximately 120 feet\""),
      ],
      discrepancy:
        "NSSDCA gives the distance as 110 meters, NASA's 55-years article 130 feet, and On the Shoulders of Titans 40 meters; we follow the chronology and the transcript, 120 feet. The Gemini VII mission report (page 1-2) says the rendezvous was accomplished at 263:58 on Gemini VII's clock, which is 5:50:37 on Gemini 6A's (our arithmetic), when braking began; we follow the chronology's start of station keeping.",
      photo: nasaPhoto(
        "S65-63209",
        1600,
        1600,
        "Gemini 7, a white cone with a dark nose, floats high above the deep blue ocean and scattered white clouds, seen from Gemini 6A about 122 feet away. A thin strap trails from its wide end.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "trailing-cords",
      title: "Looking each other over",
      chapter: "together",
      elapsed: "005:57:01",
      text: {
        short: "The crews look each other over. Long loose cords are flapping from the backs of both spacecraft.",
        more:
          "\"You got a lot of stuff all around the back end of you,\" Frank Borman told the Gemini 6A crew, and Schirra answered that Gemini 7 had the same. Cords and strips 3 to 5 meters (10 to 16 feet) long streamed and flapped behind both spacecraft. On Gemini 7 they hung from the end where it had separated from its rocket.",
      },
      citations: [
        transcript("05:57:01, Gemini VII command pilot", "You got a lot of stuff all around the back end of you.", 76),
        titans(288, "Borman: \"You've got a lot of stuff all around the back end of you.\" \"Minutes later, during stationkeeping, Schirra told Borman, 'So do you.' Cords and stringers three to five meters long streamed and flapped behind both spacecraft.\""),
        geminiVII("Section 9.0, \"Conclusions\", item 9 (page 9-2, PDF page 438): photographs of \"the spacecraft 7 launch vehicle-spacecraft separation plane, taken after rendezvous and during station keeping by the spacecraft 6 crew, identified several loose strands of material hanging from the spacecraft\""),
      ],
      photo: nasaPhoto(
        "S65-63220",
        1600,
        1600,
        "Gemini 7 seen close up from Gemini 6A, its wide end toward the camera showing gold foil and loose wires, with Earth's blue curve and clouds behind it and the edge of Gemini 6A at lower left.",
      ),
      view: "spacecraft",
    },
    {
      id: "nose-to-nose",
      title: "Nose to nose",
      chapter: "together",
      elapsed: "006:13:41",
      text: {
        short: "The two spacecraft fly nose to nose, only about 15 feet (4.6 meters) apart. At times they come within a foot of each other.",
        more:
          "\"Right now, VI is about 10 feet above and to the left of VII. We're just flying nose to nose, approximately 15 feet apart,\" Borman reported. During the hours together the spacecraft circled each other, moved in and backed off, and parked in set positions. As a joke, Schirra and Stafford, who had both gone to the Naval Academy, held a \"Beat Army\" sign in their window for Borman, who had gone to West Point.",
      },
      citations: [
        transcript("06:13:41, Gemini VII command pilot", "Right now, VI is about 10 feet above and to the left of VII. We're just flying nose to nose, approximately 15 feet apart.", 81),
        titans(288, "\"On another, they flew nose to nose\"; ranges \"from 0.30 meters to 90 meters\""),
        nasmStory("\"at least once coming nose-to-nose a short distance apart. As a joke, Schirra and Stafford held a 'Beat Army' sign in the window\"; \"Both had gone to the Naval Academy\"; \"Their target was Borman, a West Pointer.\""),
        nmc("Mission Profile: \"Stationkeeping maneuvers involving the spacecraft circling each other and approaching and backing off\""),
        spirit("\"the two spacecraft stayed at ranges of 300 feet to as close as one foot from each other\""),
      ],
      discrepancy:
        "The Smithsonian's capsule page says Gemini 6A came within 6 inches of Gemini 7. The chronology, On the Shoulders of Titans, and NASA's 55-years article give about one foot; we follow them.",
      photo: nasaPhoto(
        "s65-64040",
        1600,
        1600,
        "Gemini 6A seen nose on from Gemini 7, about 38 feet away, against black space: its nose, at the top, glares white in the sunlight, and the words UNITED STATES show on its side.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "night-formation",
      title: "Formation in the dark",
      chapter: "together",
      elapsed: "006:54:16",
      text: {
        short: "Night falls. In the dark, the two crews stay about 20 feet (6 meters) apart, lit by their docking lights and cabin lights.",
        more:
          "Asked about station keeping at night, Stafford answered, \"No trouble at all. We're about 20 feet apart, using the docking lights and the cabin lights of the spacecraft.\" Schirra had worried that he would not see well in the dark, but the docking light, a handheld penlight, and even Gemini 7's cabin lights showed up clearly.",
      },
      citations: [
        transcript("06:54:16, pilot", "No trouble at all. We're about 20 feet apart, using the docking lights and the cabin lights of the spacecraft.", 85),
        titans(288, "\"On the first night pass, the two spacecraft faced each other at distances ranging from 6 to 18 meters. Schirra had worried about visibility during darkness, but it turned out to be excellent-docking light, handheld penlight, and even VII's cabin lights were clearly visible to him.\""),
      ],
      view: "spacecraft",
    },
    {
      id: "gemini-7-turn",
      title: "Gemini 7 takes a turn",
      chapter: "together",
      elapsed: "007:22:34",
      text: {
        short: "Now it is Gemini 7's turn to drive. Frank Borman and Jim Lovell each fly their spacecraft beside Gemini 6A for about five minutes.",
        more:
          "Borman asked for a turn: \"In fact, how about that right now?\" Then, \"Okay, we'll just coast around here a little bit and see what it looks like.\" Gemini 7 had little fuel to spare: flight controllers told its crew to stop maneuvering when their tanks fell to 11 percent. Borman and Lovell found station keeping easier than in their docking trainer.",
      },
      citations: [
        transcript("07:22:34, Gemini VII command pilot", "In fact, how about that right now?", 88),
        transcript("07:22:38, Gemini VII command pilot", "Okay, we'll just coast around here a little bit and see what it looks like.", 89),
        geminiVII("Section 1.0, \"Mission Summary\" (page 1-2, PDF page 32): \"each spacecraft 7 crew member spent approximately 5 minutes conducting station keeping with spacecraft 6 as the passive target vehicle\""),
        geminiVII("Section 7.1.2.3.4, \"Rendezvous\" (page 7-52, PDF page 308): station keeping \"was not difficult and was judged to be similar to, but less difficult than, that experienced in the docking trainer\""),
        titans(288, "\"Flight Control told them to stop maneuvers when the VII tanks dropped to an 11 percent supply\""),
      ],
      photo: nasaPhoto(
        "s65-63898",
        1600,
        1600,
        "Taken from Gemini 7 during station keeping, about 40 feet away: Gemini 6A seen nearly end on against dark space, a glowing ring of sunlit metal around its dark front, with a bright flash of light at lower left.",
      ),
      view: "spacecraft",
    },
    {
      id: "moving-apart",
      title: "Apart for the night",
      chapter: "together",
      elapsed: "011:13:29",
      text: {
        short: "After more than five hours together, Gemini 6A backs away for the night. The two crews sleep about 10 miles (16 kilometers) apart.",
        more:
          "Station keeping ended 11 hours 13 minutes 29 seconds after liftoff. As bedtime approached, Schirra turned the spacecraft blunt end first and fired the thrusters gently to drift away, and the crews settled down about 16 kilometers (10 miles) apart. Borman, who often caught sight of Gemini 6A in the distance, radioed, \"We have company tonight.\" Schirra and Stafford, exhausted and hungry, ate a good meal and went to sleep.",
      },
      citations: [
        chronologyTable("B", "Station keeping row, \"To begin\" 5:56:00 and \"Period (hr:min:sec)\" 5:17:29 (the end, 11:13:29, is our sum)"),
        titans(289, "\"Schirra flipped the spacecraft blunt-end forward and fired his thrusters to impart a small separation speed. Eventually, the crews settled down 16 kilometers apart.\"; \"We have company tonight.\"; \"They ate a good meal and went to sleep.\""),
        spirit("\"Schirra backed away to a safe overnight position about 10 miles away.\""),
        chronology("December 15", "\"Spacecraft No. 6 then initiated a separation maneuver\""),
      ],
      discrepancy:
        "The chronology's December 15 entry says Gemini 6A withdrew to about 30 miles, and NSSDCA to roughly 50 km; we follow On the Shoulders of Titans and NASA's 55-years article. The Gemini VII mission report (page 4-6) puts the separation maneuver at approximately 269:30 on Gemini VII's clock, about 11:23 on Gemini 6A's (our arithmetic); we follow the chronology's end of station keeping.",
      view: "earth",
      inTour: true,
    },

    /* --------------------------- Coming home -------------------------- */
    {
      id: "jingle-bells",
      title: "A visitor from the north",
      chapter: "coming-home",
      elapsed: "023:57:30",
      text: {
        short: "Gemini 6A reports a strange \"satellite\" heading from north to south. Then Schirra and Stafford play \"Jingle Bells\" on a tiny harmonica and bells. It is a Christmas joke.",
        more:
          "\"Gemini VII, this is Gemini VI. We have an object, looks like a satellite going from north to south, probably in a polar orbit,\" the crew radioed, adding that it looked as if it might be going to reenter soon. Then came the music. They were the first musical instruments played in space, and the harmonica and bells are now at the Smithsonian's National Air and Space Museum.",
      },
      citations: [
        transcript("23:57:30, command pilot", "Gemini VII, this is Gemini VI. We have an object, looks like a satellite going from north to south, probably in a polar orbit.", 116),
        transcript("23:58:03", "(Music - JINGLE BELLS - from Spacecraft VI)", 116),
        titans(289, "the report of the \"object\" and the strains of \"Jingle Bells\" on harmonica and bells"),
        spirit("The exchange and the paragraph that follows: \"the first musical instruments played in outer space. Both are on display at the Smithsonian Institution's National Air and Space Museum\""),
        nasmStory("\"Schirra and Stafford then played 'Jingle Bells' on a tiny harmonica and set of bells, which are today exhibited in our Apollo to the Moon gallery\""),
      ],
      discrepancy:
        "On the Shoulders of Titans says Stafford made the report; the Smithsonian's story says Schirra, and the transcript logs it to the command pilot's position. We do not name who spoke.",
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "retrofire",
      title: "Retrofire",
      chapter: "coming-home",
      elapsed: "025:15:58",
      utc: "1965-12-16T14:53:24Z",
      text: {
        short: "Four small rockets fire to slow Gemini 6A down, and it starts falling out of orbit toward the Atlantic Ocean.",
        more:
          "\"Really a good job, Frank and Jim. We'll see you on the beach,\" Schirra told the Gemini 7 crew. He turned the spacecraft blunt end first, the equipment section at the back was cast off, and retrofire, the engine firing that starts the trip home, followed automatically as Houston counted down to zero. About two minutes later the crew reported that the section that had held the retrorockets was gone too.",
      },
      citations: [
        chronologyTable("A", "\"G.E.T. to retrofire (hr; min; sec)\" row, 25:15:58"),
        nmc("Mission Profile: \"the retrorockets were fired at 9:53:24 a.m. EST on 16 December\""),
        transcript("25:15:49, capsule communicator", "10, 9, 8, 7, 6, 5, 4, 3, 2, 1, Retrofire.", 122),
        transcript("25:18:12, command pilot", "Hawaii, we're all clean and Reentry Attitude now.", 123),
        nmc("Spacecraft description, Reentry section: \"The retrorockets consisted of four spherical-case polysulfide ammonium perchlorate solid-propellant motors mounted near the center of the reentry adaptor module\""),
        titans(289, "Schirra: \"Really a good job, Frank and Jim. We'll see you on the beach.\" \"He then flipped VI-A blunt-end forward and jettisoned the equipment section; retrofire followed automatically.\""),
      ],
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "parachutes",
      title: "Steering home",
      chapter: "coming-home",
      elapsed: "025:45:55",
      text: {
        short: "The crew steers Gemini 6A through the air by tilting it left and right. Then the parachutes open over the Atlantic.",
        more:
          "Schirra turned the spacecraft heads down to watch the horizon and held it tilted 55 degrees to the left until the computer took over the steering at 85,000 meters (279,000 feet). The spacecraft was heading past its landing point, so it banked first left, then right, to come down shorter. The crew turned the computer off at 24,000 meters (79,000 feet). The small drogue parachute opened at 14,000 meters (46,000 feet), and Schirra radioed, \"Drogue is out.\" The big main parachute followed at 3,200 meters (10,500 feet), and the spacecraft came down at 30 feet (9 meters) per second.",
      },
      citations: [
        transcript("25:45:55, command pilot", "Drogue is out.", 127),
        transcript("25:50:53, command pilot", "Gemini VI, 1,000 feet, 30 feet per second.", 128),
        titans(289, "the heads-down attitude, the 55-degree left bank until computer guidance at 85 000 meters, and banking \"first left, then right\""),
        titans(291, "\"The crew turned the computer off at 24 000 meters, deployed the drogue parachute at 14 000 meters, and punched out the main parachute at 3200 meters.\""),
      ],
      discrepancy:
        "NASA's 55-years article gives the drogue at 45,000 feet and the main parachute at 10,000 feet. We follow On the Shoulders of Titans.",
      view: "earth",
    },

    /* ---------------------------- Splashdown --------------------------- */
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "splashdown",
      elapsed: "025:51:24",
      utc: "1965-12-16T15:28:50Z",
      text: {
        short: "Gemini 6A splashes down in the Atlantic Ocean, about 8 miles (13 kilometers) from where it was aimed. The flight lasted just under 26 hours.",
        more:
          "Gemini 6A landed at 10:28:50 a.m. Eastern Standard Time on December 16, 25 hours 51 minutes 24 seconds after liftoff, in the western Atlantic, about 7 nautical miles from its planned point. It was the first time an American crew had steered a reentry to a planned point. Navy swimmers helped the crew open the hatches, and for another first, television viewers watched the recovery live, sent from the carrier USS Wasp by satellite.",
      },
      citations: [
        chronologyTable("A", "\"G.E.T. to touchdown\" row, 25:51:24; Landing coordinates, 23°35' N, 67°50' W; \"Landing accuracy\" row, 7"),
        nasaMission("Mission Facts: \"Landing Date: Dec. 16, 1965, 10:28:50 a.m. EST (15:28:50 UT)\" and \"Landing Site: Western Atlantic, 23.58° N, 67.83° W\""),
        chronology("December 15", "\"landing in the West Atlantic, just 7 miles from the planned landing point, at 10:29 a.m., December 16\""),
        titans(291, "\"recording the first successfully controlled reentry. For another first, they did it in full view of live television beamed from the Wasp via satellite transmission.\""),
        nmc("Mission Profile: \"only 13 km from the target\""),
        nasaMission("Photo caption, December 16, 1965: \"A water level view of Navy divers assisting Gemini VI crew members Stafford and Schirra to open hatches after landing in the Atlantic.\""),
      ],
      photo: nasaPhoto(
        "s65-61886",
        1600,
        1254,
        "Water-level view of Gemini 6A floating in blue waves with both hatches open. Two astronauts in white suits and helmets sit inside while Navy swimmers in black wetsuits stand beside them on the yellow flotation collar.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "aboard-wasp",
      title: "Aboard the Wasp",
      chapter: "splashdown",
      elapsed: "026:55:00",
      utc: "1965-12-16T16:32:00Z",
      text: {
        short: "The aircraft carrier USS Wasp lifts Gemini 6A out of the sea, with Schirra and Stafford still inside.",
        more:
          "As on his Mercury flight, Schirra chose to stay in his spacecraft while it was hauled onto the carrier's deck, at about 11:32 a.m. Eastern Standard Time, and cheering sailors greeted the crew. The recovery and rendezvous section from the spacecraft's nose, which had come down in the same area, was picked up too: the first time the service section was recovered. Gemini 7 stayed in orbit two more days, and the Wasp picked it up too, on December 18.",
      },
      citations: [
        chronologyTable("A", "Recovery: Ship, U.S.S. \"Wasp\"; Date, \"Dec. 16, 1965\"; Time (e.s.t.), Crew and Spacecraft, both \"11:32 a.m.\" (given to the minute; 26:54:33.5 after liftoff, our arithmetic, written to the minute)"),
        nmc("Mission Profile: \"The spacecraft and crew were brought aboard the aircraft carrier U.S.S. Wasp at 11:32 a.m. The recovery and rendezvous section of the spacecraft splashed down in the same area and was retrieved, this was the first time the service section was recovered.\""),
        titans(291, "\"As on his Mercury flight, Schirra elected to remain aboard his spacecraft while it was hauled onto the carrier deck.\""),
        spirit("\"a throng of cheering sailors greeted them\""),
        geminiVII("Section 1.0, \"Mission Summary\" (page 1-1, PDF page 31): the flight \"concluded on December 18, 1965, with the recovery of the spacecraft\" \"by the prime recovery ship (U.S.S. Wasp)\""),
      ],
      photo: nasaPhoto(
        "s65-61888",
        1600,
        1597,
        "Sailors in white crowd the decks of the aircraft carrier USS Wasp as a crane lifts the small Gemini 6A spacecraft, in its yellow collar, up the ship's side from a patch of green dye in the sea. A large dish antenna stands on the deck above.",
      ),
      view: "earth",
    },
  ],

  whereNow: [
    {
      value: {
        object: "Gemini VI-A spacecraft",
        museum: "Stafford Air & Space Museum",
        place: "Weatherford, Oklahoma",
      },
      citations: [
        spirit("Closing paragraph: \"The Gemini VI and VII spacecraft can be viewed at the Stafford Air and Space Museum in Weatherford, Oklahoma, and the National Air and Space Museum's Steven F. Udvar-Hazy Center in Chantilly, Virginia, respectively.\""),
        { source: "gemini-6a-nasm-capsule", locator: "Display Status: \"This object is not on display at the National Air and Space Museum. It is either on loan or in storage.\" Also: \"NASA transferred the spacecraft to the Smithsonian in 1968.\"" },
      ],
    },
  ],
};
