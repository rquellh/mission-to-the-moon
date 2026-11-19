/**
 * Apollo 9: the first flight of the lunar module with a crew, ten days in
 * Earth orbit, March 3-13, 1969.
 *
 * Event times come from the Apollo 9 Mission Report (MSC-PA-R-69-2), Table
 * 3-I, "Sequence of Events", the more primary source, or its section 4.2 for
 * the spacewalk; Apollo by the Numbers (NASA SP-2000-4029) is used where it
 * prints the same moment to the hundredth of a second, and for moments the
 * report's table does not list. Universal times come from the GMT column of
 * Apollo by the Numbers' Apollo 9 Timeline. Where a source gives a different
 * value, the `discrepancy` field says what it gives and which we follow.
 * NASA's own link to the mission report no longer works, so the source
 * registry links to NASA's copy as saved by the Internet Archive.
 *
 * Elapsed times are ground elapsed time, counted from range zero (16:00:00
 * G.m.t. on March 3, 1969). Lift-off itself came 0.67 second later.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers) are
 * our arithmetic on the cited values, as are durations between two cited
 * times (for example, the spacewalk from 72:59:02 to 73:46:03 is 47 minutes
 * 1 second) and durations of a minute or more written as minutes and
 * seconds with the source's full precision kept (371.51 seconds is "6
 * minutes 11.51 seconds").
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const MISSION_REPORT =
  "https://web.archive.org/web/20250815162504/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A09_MissionReport.pdf";
const ABTN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const ABTN_SUMMARY = `${ABTN}Apollo_09a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_09f_Timeline.htm`;
const ABTN_EARTH_ORBIT = `${ABTN}Apollo_09e_Earth_Orbit_Phase.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-02_Crew_Information_-_E-Orbit_and_L-Orbit.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_EVA = `${ABTN}Apollo_18-30_Extravehicular_Activity.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;
const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-018A";
const NMC_APOLLO_11_LM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C";

/** A section of the mission report. */
function report(section: string, pages: string): Citation {
  return { source: "apollo-9-mission-report", locator: `Section ${section} (${pages})`, url: MISSION_REPORT };
}

/** A row of the mission report's Table 3-I, the sequence of events. */
function sequence(row: string, page: "3-4" | "3-5"): Citation {
  return {
    source: "apollo-9-mission-report",
    locator: `Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === "3-4" ? 14 : 15}), "${row}" row`,
    url: MISSION_REPORT,
  };
}

/** A table of the mission report. */
function reportTable(table: string, pages: string, rows: string): Citation {
  return { source: "apollo-9-mission-report", locator: `${table} (${pages}), ${rows}`, url: MISSION_REPORT };
}

/** A section of the Apollo by the Numbers Apollo 9 mission summary. */
function summary(section: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `Apollo 9 mission summary, "${section}" section`, url: ABTN_SUMMARY };
}

/** A row of the Apollo by the Numbers Apollo 9 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `Apollo 9 Timeline, row "${row}"`, url: ABTN_TIMELINE };
}

/** One of the statistical tables in Apollo by the Numbers, Apollo 9 column. */
function table(name: string, rows: string, url: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `"${name}" table, Apollo 9 column: ${rows}`, url };
}

/** NSSDCA's Master Catalog page for the Apollo 9 command and service module. */
function nmc(section: string): Citation {
  return { source: "nssdca-master-catalog", locator: `"Apollo 9" (1969-018A), ${section}`, url: NMC_CSM };
}

/** NASA's article "50 Years Ago: Apollo 9 Completes its Mission". */
function nasaArticle(passage: string): Citation {
  return { source: "nasa-apollo-9-completes-its-mission", locator: passage };
}

/** NASA's caption for a photograph in the NASA Image and Video Library. */
function caption(nasaId: string, passage: string): Citation {
  return {
    source: "nasa-image-and-video-library",
    locator: `Caption of ${nasaId}: ${passage}`,
    url: `https://images-api.nasa.gov/search?nasa_id=${nasaId}`,
  };
}

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-9/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-9/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: "NASA",
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

/** How a lunar module's two stages work, from NSSDCA's description of the design (on its Apollo 11 lunar module page). */
const LM_DESIGN: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 11 Lunar Module / EASEP" (1969-059C), Lunar Module Spacecraft and Subsystems: "The descent stage contained the landing rocket", "The descent stage served as a platform for launching the ascent stage", and "the ascent stage functioned as a single spacecraft for rendezvous and docking with the command and service module"',
  url: NMC_APOLLO_11_LM,
};

const SPACEWALK_TIMES = report(
  '4.2, "Actual Timeline"',
  'page 4-2, PDF page 29: the Lunar Module Pilot "began his egress to the forward platform at 72:59:02" and "began his ingress at 73:45:00 and completed it at 73:46:03"',
);

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: "apollo-9",
  program: "apollo",
  name: "Apollo 9",
  kind: "flight",
  destination: "earth-orbit",

  summary: {
    text: {
      short:
        "Apollo 9 was the first time astronauts flew a lunar module, the craft built to land people on the Moon. In March 1969, James McDivitt, David Scott, and Rusty Schweickart tested it for ten days in orbit around Earth.",
      more:
        "Apollo 9 lifted off from Kennedy Space Center on March 3, 1969. The command module's radio name was Gumdrop, because during shipment it was covered in blue wrappings that made it look like a wrapped gumdrop candy, and the lunar module's was Spider, for its bug-like shape. The crew docked with Spider, fired its engines, and tested the Moon suit outside. Then McDivitt and Schweickart flew Spider away on its own for more than six hours and docked again, as a crew coming back from the Moon would have to. All three splashed down in the Atlantic Ocean on March 13.",
    },
    citations: [
      summary("Background"),
      summary("Ascent Phase"),
      summary("Earth Orbit Phase"),
      summary("Recovery"),
      report('1.0, "Summary"', "page 1-1, PDF page 8"),
      table("Call Signs", "Command Module (Gumdrop) and Lunar Module (Spider)", ABTN_CALL_SIGNS),
      nmc("Description"),
    ],
  },

  crew: {
    value: [
      { name: "James A. McDivitt", role: "Commander" },
      { name: "David R. Scott", role: "Command module pilot" },
      { name: "Russell L. \"Rusty\" Schweickart", role: "Lunar module pilot" },
    ],
    citations: [
      summary("Background"),
      table("Crew Information - Earth Orbit and Lunar Orbit Missions", "Commander, Command Module Pilot, and Lunar Module Pilot rows", ABTN_CREW),
      report('1.0, "Summary"', "page 1-1, PDF page 8"),
    ],
  },

  launch: {
    value: {
      utc: "1969-03-03T16:00:00Z",
      site: "Launch Complex 39, Pad A, Kennedy Space Center, Florida",
      vehicle: "Saturn V (SA-504)",
    },
    citations: [
      summary("Ascent Phase"),
      summary("Background"),
      timeline("Range zero."),
      timeline("Liftoff (umbilical disconnected)."),
      report('2.0, "Introduction"', 'page 2-1, PDF page 10: "Range zero for this mission was 16:00:00 G.m.t., March 3, 1969"'),
      nmc("Alternate Names (SA-504) and Facts in Brief"),
    ],
  },

  duration: {
    value: "241:00:54",
    citations: [sequence("Landing", "3-5"), summary("Recovery"), table("Entry, Splashdown, and Recovery", "Earth Splashdown, GET row", ABTN_ENTRY)],
  },

  callSigns: {
    value: [
      { craft: "Command module", name: "Gumdrop" },
      { craft: "Lunar module", name: "Spider" },
    ],
    citations: [table("Call Signs", "Command Module and Lunar Module", ABTN_CALL_SIGNS), summary("Background")],
  },

  accomplishments: [
    {
      text: {
        short:
          "Apollo 9 was the first flight of a lunar module with astronauts aboard. It showed that the lunar module was ready to carry a crew on a Moon mission.",
        more:
          "Its descent engine fired both while docked and while flying free, its ascent engine fired with the crew aboard and again with no one aboard, and its systems worked well enough for a lunar mission. Two parts could not be fully tried in Earth orbit: the steerable antenna, which was not used, and the landing radar. A lunar module had first flown, without a crew, on Apollo 5 in January 1968.",
      },
      citations: [
        report('1.0, "Summary"', "page 1-1, PDF page 8"),
        report('3.0, "Mission Description"', "page 3-2, PDF page 12"),
        summary("Background"),
        summary("Conclusions"),
        nmc("Description"),
      ],
    },
    {
      text: {
        short:
          "Spider flew far away from Gumdrop and came back to dock, the way a lunar module leaving the Moon would meet the command module waiting in orbit.",
        more:
          "Spider's own guidance computer steered the rendezvous, while Scott, alone in Gumdrop, worked out matching backup maneuvers in case Gumdrop had to go and rescue Spider. The two were as much as 98 nautical miles (113 miles, or 181 kilometers) apart. NASA concluded that the equipment and methods in both spacecraft were precise enough for a lunar landing mission.",
      },
      citations: [
        report('1.0, "Summary"', "page 1-2, PDF page 9"),
        report('5.3.1, "Lunar Module"', 'page 5-10, PDF page 53: "the maximum range of 98 miles was observed"'),
        report('7.3.1, "Docked Firings"', 'page 7-2, PDF page 84: after the third firing "the command and service module rescue capability for the lunar module rendezvous was established"'),
        summary("Conclusions"),
      ],
    },
    {
      text: {
        short:
          "Rusty Schweickart's spacewalk tested the suit and backpack made for walking on the Moon. They worked very well.",
        more:
          "The backpack supplied oxygen and radio and pumped water through the suit to keep him cool. NASA concluded that the suit would work on the lunar surface, and that a crew could move from one spacecraft to the other outside, if the tunnel between them could not be used.",
      },
      citations: [
        report('1.0, "Summary"', "page 1-2, PDF page 9"),
        report('4.0, "Extravehicular Activity"', "page 4-1, PDF page 28"),
        summary("Earth Orbit Phase"),
        summary("Conclusions"),
        { source: "nasm-apollo-9-command-module", locator: 'Object description: "an extra-vehicular activity (EVA) was performed to test the new Lunar EVA spacesuits"' },
      ],
    },
    {
      text: {
        short:
          "The crew photographed Earth with four cameras at once, each seeing a different kind of light. The experiment helped pave the way for the Earth-watching satellites later named Landsat.",
        more:
          "The four cameras looked out of the command module's hatch window, each with a different film and filter, some of them for near-infrared light. The aim was to learn how such pictures could help study crops, forests, rocks, oceans, and water. NASA found the pictures better than any taken from orbit before, partly because the crew had four days to wait for clouds to clear.",
      },
      citations: [
        summary("Earth Orbit Phase"),
        nasaArticle('Paragraphs on Experiment S065: "a cluster of four Hasselblad 70 mm cameras pointed out the Command Module\'s (CM) round hatch window", for "agriculture, forestry, geology, oceanography, hydrology, and geography", and "a precursor for the Earth Resources Technology Satellite (ERTS), later renamed Landsat"'),
      ],
    },
  ],

  chapters: [
    { id: "launch", title: "Launch and docking" },
    { id: "docked", title: "Testing Spider docked" },
    { id: "free-flight", title: "Spider on its own" },
    { id: "home", title: "Coming home" },
  ],

  events: [
    /* ------------------------ Launch and docking ------------------------ */
    {
      id: "liftoff",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00.67",
      utc: "1969-03-03T16:00:00Z",
      text: {
        short:
          "A Saturn V rocket lifts Apollo 9 off the launch pad in Florida. Packed inside is a lunar module, the craft built to land astronauts on the Moon.",
        more:
          "Apollo 9 lifted off from Launch Complex 39, Pad A, at Kennedy Space Center at 11:00 a.m. Eastern Standard Time on March 3, 1969. The launch had been set for February 28, but the crew had come down with a mild viral illness, so it was put off three days. James McDivitt was the commander, David Scott the command module pilot, and Rusty Schweickart the lunar module pilot. About 11 minutes after liftoff they were in orbit around Earth.",
      },
      citations: [
        timeline("Liftoff (umbilical disconnected)."),
        sequence("Lift-off", "3-4"),
        timeline("Earth orbit insertion. S-IVB 1st burn maximum Earth-fixed velocity."),
        summary("Background"),
        summary("Launch Preparations"),
        summary("Ascent Phase"),
        report('7.1, "Launch Phase"', 'page 7-1, PDF page 83: "the 3-day lift-off postponement"'),
        caption("S69-25862", '"the Apollo 9 (Spacecraft 104/Lunar Module 3/ Saturn 504) space vehicle is launched from Pad A, Launch Complex 39, Kennedy Space Center (KSC) at 11 a.m. (EST), March 3, 1969"'),
      ],
      photo: nasaPhoto(
        "S69-25862",
        1106,
        1600,
        "The white Saturn V rocket rises from its launch pad on a bright burst of flame and smoke, seen far off between the trunks of tall palm trees under a cloudy sky.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "transposition-docking",
      title: "Turning around to dock with Spider",
      chapter: "launch",
      elapsed: "003:01:59.3",
      utc: "1969-03-03T19:01:59Z",
      text: {
        short:
          "Gumdrop, the crew's command module, pulls away from the rocket, turns around, and docks nose to nose with Spider, the lunar module still sitting on top of the rocket's third stage.",
        more:
          "At 2 hours 41 minutes, the command and service module separated from the S-IVB, the rocket's third stage, and the panels that had covered the lunar module during launch were thrown off. The crew turned their spacecraft around and docked with Spider about 3 hours after launch. At 4 hours 8 minutes, an ejection mechanism, used for the first time, pushed the two docked spacecraft free of the stage. The empty S-IVB then fired its engine twice more and went into orbit around the Sun.",
      },
      citations: [
        sequence("Docking", "3-4"),
        sequence("Command and service module/S-IVB separation command", "3-4"),
        sequence("Spacecraft ejection from S-IVB", "3-4"),
        timeline("Formation flying. CSM docked with LM/S-IVB."),
        summary("Earth Orbit Phase"),
        report('3.0, "Mission Description"', 'page 3-1, PDF page 11: "an ejection mechanism, used for the first time on this mission, ejected the docked spacecraft from the S-IVB"'),
        report('7.2, "Spacecraft/S-IVB Separation"', "pages 7-1 and 7-2, PDF pages 83 and 84"),
        caption("as9-19-2919", '"The Lunar Module (LM) "Spider", still attached to the Saturn V third (S-IVB) stage, is photographed from the Command and Service Modules (CSM) "Gumdrop"" and "The Spacecraft Lunar Module Adapter (SLA) panels have already been jettisoned"'),
      ],
      discrepancy:
        'The mission report gives the ejection from the S-IVB at 4:08:06 (Table 3-I and section 7.2). Apollo by the Numbers (Timeline, "CSM/LM ejected from S-IVB.", and its mission summary) gives 004:08:09. We follow the mission report.',
      photo: nasaPhoto(
        "as9-19-2919",
        1600,
        1600,
        "Looking down on the lunar module Spider, a boxy silver craft with gold foil and folded legs, still mounted on top of the rocket's round third stage, with white clouds far below.",
      ),
      view: "spacecraft",
      inTour: true,
    },

    /* ----------------------- Testing Spider docked ---------------------- */
    {
      id: "docked-descent-engine",
      title: "Spider's engine fires while docked",
      chapter: "docked",
      elapsed: "049:41:34.46",
      utc: "1969-03-05T17:41:34Z",
      text: {
        short:
          "McDivitt and Schweickart move into Spider. With the two spacecraft still joined, they fire Spider's descent engine, the one built to bring a lunar module down onto the Moon.",
        more:
          "On the third day, the commander and lunar module pilot moved into Spider, unfolded its landing legs, checked its systems, and sent a five-minute television broadcast from inside. The descent engine then fired for 6 minutes 11.51 seconds, and the crew throttled it by hand up to full thrust. On the first two days, Gumdrop's main engine had fired four times with Spider attached, the longest for 4 minutes 39.88 seconds, to test how the joined spacecraft held up and handled.",
      },
      citations: [
        timeline("DPS docked ignition."),
        sequence("First descent propulsion maneuver", "3-4"),
        { source: "apollo-by-the-numbers", locator: 'Apollo 9 Timeline, rows "LMP entered LM." at 043:15 and "CDR entered LM." at 044:04', url: ABTN_TIMELINE },
        timeline("Landing gear deployed."),
        timeline("TV transmission (approximately 5 minutes)."),
        { source: "apollo-by-the-numbers", locator: 'Apollo 9 Earth Orbit Phase table, "DPS docked cutoff" and "3rd SPS cutoff" rows, Event Duration (sec)', url: ABTN_EARTH_ORBIT },
        summary("Earth Orbit Phase"),
        report('1.0, "Summary"', "page 1-1, PDF page 8"),
        LM_DESIGN,
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for Apollo 9 gives the descent engine firing as 6 minutes 7 seconds, and section 3.0 of the mission report as 6 minutes 12 seconds. We follow Apollo by the Numbers, 6 minutes 11.51 seconds, which agrees with the mission report's Table 7-III (6 minutes 11.5 seconds).",
      view: "spacecraft",
    },
    {
      id: "spacewalk",
      title: "Stepping outside in a Moon suit",
      chapter: "docked",
      elapsed: "072:59:02",
      utc: "1969-03-06T16:59:02Z",
      text: {
        short:
          "Rusty Schweickart climbs out of Spider's hatch onto its small front porch. He is testing the suit and backpack that astronauts will wear to walk on the Moon.",
        more:
          "Schweickart kept his feet in gold-painted foot restraints, nicknamed the golden slippers, on the platform outside Spider's hatch, tied on by a 25-foot nylon rope. Scott leaned out of Gumdrop's open side hatch. Both took pictures and collected samples of materials from the outside of the spacecraft. The spacewalk was cut from a planned 2 hours 15 minutes to about 47 minutes, because Schweickart had been sick the day before and the next day's rendezvous needed preparing.",
      },
      citations: [
        SPACEWALK_TIMES,
        table("Extravehicular Activity", 'Earth Orbit EVA, "2nd EVA Participant" (Schweickart) and "2nd EVA Duration Outside LM" (00:47:01) rows', ABTN_EVA),
        timeline("LMP started egress."),
        timeline("CM side hatch open."),
        summary("Earth Orbit Phase"),
        report('1.0, "Summary"', "pages 1-1 and 1-2, PDF pages 8 and 9"),
        report('4.0, "Extravehicular Activity"', "page 4-1, PDF page 28"),
        caption("as9-19-2994", '"He holds, in his right hand, a thermal sample which he is retrieving from the Lunar Module (LM) exterior" and he "is standing in "golden slippers" on the LM porch" (the Apollo by the Numbers Timeline places the sample retrieval at 073:39, later in the walk)'),
      ],
      discrepancy:
        "NSSDCA's Master Catalog page gives the spacewalk as 37.5 minutes, and Apollo by the Numbers' mission summary says it was cut to 39 minutes; its Extravehicular Activity table gives 1 hour 7 minutes from depressurization to repressurization and 47 minutes 1 second outside the lunar module. We follow the mission report: about 47 minutes, from the start of egress at 72:59:02 to the end of ingress at 73:46:03.",
      photo: nasaPhoto(
        "as9-19-2994",
        1600,
        1600,
        "Later in the spacewalk, Rusty Schweickart, in a white spacesuit and a boxy white backpack, leans over the edge of the lunar module with one arm reaching out toward its equipment, against black space. His helmet shows a gold visor with an orange-red outer visor over its upper half.",
      ),
      view: "spacecraft",
      inTour: true,
    },

    /* ------------------------- Spider on its own ------------------------ */
    {
      id: "undocking",
      title: "Spider flies on its own",
      chapter: "free-flight",
      elapsed: "092:39:36",
      utc: "1969-03-07T12:39:36Z",
      text: {
        short:
          "McDivitt and Schweickart undock Spider from Gumdrop and fly it on its own. Scott stays in Gumdrop and watches it go.",
        more:
          "The first try at undocking, at about 92 hours 38 minutes, failed when the latches holding the two together did not let go; moments later they released. Spider rolled around so Scott could look it over, its landing legs spread as if ready for the Moon. About 23 minutes after undocking, a short firing of Gumdrop's thrusters started the two spacecraft drifting apart.",
      },
      citations: [
        sequence("First undocking", "3-5"),
        timeline("Unsuccessful undocking attempt. Capture latches failed to release."),
        timeline("CSM/LM reported undocked."),
        timeline("CSM/LM separation maneuver ignition."),
        summary("Earth Orbit Phase"),
        caption("as9-21-3199", '"the Apollo 9 Lunar Module, "Spider," in a lunar landing configuration, as photographed from the Command and Service Modules on the fifth day" and "The landing gear on the "Spider" has been deployed"'),
      ],
      photo: nasaPhoto(
        "as9-21-3199",
        1591,
        1600,
        "The lunar module Spider, a dark boxy craft on four thin landing legs spread wide, floats above white clouds and blue ocean far below.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "descent-stage-jettison",
      title: "Leaving the descent stage behind",
      chapter: "free-flight",
      elapsed: "096:16:06.54",
      utc: "1969-03-07T16:16:06Z",
      text: {
        short:
          "Far from Gumdrop, Spider lets go of its bottom half, the descent stage, and flies on with just its top half. A lunar module does the same when it leaves the Moon.",
        more:
          "Spider's descent engine had fired twice more, carrying it far from Gumdrop. The time shown is when its small thrusters began firing to start the chase back; the descent stage came off immediately after, with a loud bang and a cloud of small pieces. About 42 minutes later Spider fired its ascent engine, the one built to lift astronauts off the Moon. The descent stage stayed in orbit until March 22, when it fell into the atmosphere over the Indian Ocean.",
      },
      citations: [
        {
          source: "apollo-by-the-numbers",
          locator: 'Apollo 9 Timeline, row "LM coelliptic sequence initiation maneuver ignition. Approximate time of LM descent stage jettison." (096:16:06.54 is the firing\'s ignition and only the approximate time of staging)',
          url: ABTN_TIMELINE,
        },
        sequence("Coelliptic sequence initiation maneuver", "3-5"),
        sequence("Constant delta height maneuver (first ascent propulsion)", "3-5"),
        report('5.3.1, "Lunar Module"', 'page 5-9, PDF page 52: "coelliptic sequence initiation was performed at 96:16:06, with the descent stage being jettisoned immediately after the start of reaction control system thrusting" (no time is given for the jettison itself)'),
        report('10.2.7, "Rendezvous", in the pilots\' report', 'page 10-16, PDF page 277: staging made "a loud bang and a cloud of small pieces of debris, typical of pyrotechnic separations"'),
        report('3.0, "Mission Description"', "page 3-2, PDF page 12"),
        report('7.3.2, "Undocked Firings"', 'page 7-3, PDF page 85: the descent stage "entered the earth\'s atmosphere on March 22, 1969, at 0345 G.m.t., impacting in the Indian Ocean"'),
        LM_DESIGN,
      ],
      discrepancy:
        "Apollo by the Numbers' mission summary says the descent stage stayed in orbit until 03:45 GMT on March 23, though its Timeline gives March 22, as do NSSDCA and the mission report, which we follow.",
      view: "spacecraft",
    },
    {
      id: "docking",
      title: "Back together",
      chapter: "free-flight",
      elapsed: "099:02:26",
      utc: "1969-03-07T19:02:26Z",
      text: {
        short:
          "Spider's top half catches up with Gumdrop, and the two dock again. It is the same chase a lunar module makes when coming back from the Moon.",
        more:
          "A thruster firing just before 98 hours set Spider on its final approach. It braked, then flew in formation with Gumdrop while both crews took pictures, and docked 99 hours 2 minutes after launch. Spider had been apart from Gumdrop for 6 hours 22 minutes 50 seconds. A tracking light on Spider had failed, so Scott could not spot it that way, but the radar and the equipment in both spacecraft did their job.",
      },
      citations: [
        sequence("Docking", "3-5"),
        sequence("Terminal phase initiation", "3-5"),
        timeline("Terminal phase braking."),
        { source: "apollo-by-the-numbers", locator: 'Apollo 9 Timeline, row "Formation flying and photography." at 098:40', url: ABTN_TIMELINE },
        timeline("CSM/LM docked."),
        summary("Earth Orbit Phase"),
        summary("Conclusions"),
        report('3.0, "Mission Description"', 'page 3-2, PDF page 12: "stationkeeping was instituted to permit photography from both spacecraft"'),
        report('5.3.1, "Lunar Module"', 'page 5-10, PDF page 53: "the command module was unable to acquire the lunar module tracking light"'),
      ],
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "ascent-stage-jettison",
      title: "Letting Spider go",
      chapter: "free-flight",
      elapsed: "101:22:45.0",
      utc: "1969-03-07T21:22:45Z",
      text: {
        short:
          "With all three astronauts back in Gumdrop, the crew lets go of Spider's empty top half. Its engine then fires, with no one aboard, until its fuel runs out.",
        more:
          "About half an hour later, the ascent engine fired for 6 minutes 2.3 seconds until its propellant ran out. That sent the ascent stage into a long, stretched orbit reaching 3,760.9 nautical miles (about 4,328 miles, or 6,965 kilometers) above Earth at its highest. It stayed in orbit until October 23, 1981.",
      },
      citations: [
        timeline("LM ascent stage jettisoned."),
        sequence("Lunar module jettison", "3-5"),
        timeline("LM ascent engine depletion ignition."),
        reportTable('Table 7-III, "Maneuver Summary"', "page 7-9, PDF page 91", '"Ascent propulsion firing to depletion" row: firing time 362.3 seconds, apogee 3760.9 miles'),
        report('1.0, "Summary"', "page 1-1, PDF page 8"),
        summary("Earth Orbit Phase"),
        nmc("Description"),
      ],
      discrepancy:
        "Section 3.0 of the mission report gives the firing as 6 minutes 2.4 seconds. We follow its Table 7-III and Apollo by the Numbers, 6 minutes 2.3 seconds.",
      view: "spacecraft",
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: "deorbit",
      title: "Heading home",
      chapter: "home",
      elapsed: "240:31:14.84",
      utc: "1969-03-13T16:31:14Z",
      text: {
        short:
          "After ten days and 151 trips around Earth, Gumdrop fires its main engine one last time to slow down and drop out of orbit.",
        more:
          "In the last days in orbit, the crew photographed the southern United States, Mexico, Brazil, and Africa for the four-camera experiment. The final firing, over Hawaii, lasted 11.74 seconds. It came one revolution later than planned because of bad weather in the planned landing area. Almost 5 minutes later the command module let go of the service module, and it reached the top of the atmosphere, 400,000 feet up, at 240 hours 44 minutes.",
      },
      citations: [
        timeline("8th SPS ignition (deorbit)."),
        sequence("Eighth service propulsion maneuver (deorbit)", "3-5"),
        sequence("Command module/service module separation", "3-5"),
        sequence("Entry interface (400 000 feet altitude)", "3-5"),
        { source: "apollo-by-the-numbers", locator: 'Apollo 9 Earth Orbit Phase table, "8th SPS cutoff" row, Event Duration (sec)', url: ABTN_EARTH_ORBIT },
        summary("Earth Orbit Phase"),
        summary("Recovery"),
        report('7.3.2, "Undocked Firings"', 'page 7-4, PDF page 86: the deorbit firing "occurred at 240:31:14.9 over Hawaii"'),
      ],
      view: "earth",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "home",
      elapsed: "241:00:54",
      utc: "1969-03-13T17:00:54Z",
      text: {
        short:
          "Gumdrop splashes down in the Atlantic Ocean under its parachutes, within sight of the recovery ship USS Guadalcanal. The lunar module has passed its test.",
        more:
          "Splashdown came 241 hours and 54 seconds after launch, about 2.7 nautical miles (3.1 miles, or 5 kilometers) from the target point and 3 nautical miles from the Guadalcanal. The command module floated upright, and a helicopter had the crew aboard the ship 49 minutes after splashdown. Next, Apollo 10 would test a lunar module in orbit around the Moon.",
      },
      citations: [
        sequence("Landing", "3-5"),
        timeline("Splashdown (went to apex-up)."),
        summary("Recovery"),
        table("Entry, Splashdown, and Recovery", "Earth Splashdown GET, GMT Time, Distance To Target (n mi), Distance To Recovery Ship (n mi), Minutes To Crew Pickup, Flotation Attitude, and Recovery Ship rows", ABTN_ENTRY),
        nmc("Description"),
        nasaArticle('Closing paragraphs: "The next step tested the LM in lunar orbit" with Apollo 10'),
      ],
      view: "earth",
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: "Command module Gumdrop",
        museum: "San Diego Air and Space Museum",
        place: "San Diego, California",
      },
      citations: [
        { source: "nssdca-apollo-current-locations", locator: 'Apollo 9, Command Module "Gumdrop"' },
        nmc("Description"),
        nasaArticle('Paragraph on the recovery: "It is currently on display at the San Diego Air and Space Museum"'),
        { source: "nasm-apollo-9-command-module", locator: 'Object description ("The spacecraft was transferred to the Smithsonian by NASA in 1973") and Display Status' },
      ],
    },
  ],
};
