/**
 * Gemini 8 (NASA wrote it "Gemini VIII"): the first docking of two
 * spacecraft in orbit, and an emergency landing, March 16-17, 1966.
 *
 * Every event time is copied from the Gemini Program Mission Report for
 * Gemini VIII (MSC-G-R-66-4, April 1966), the canonical source for this
 * mission: elapsed times exactly as its Table 4.2-I ("Sequence of Events -
 * Gemini Space Vehicle") prints the actual times. Moments that table does
 * not list come from other sections of the same report, named in each
 * citation. Where another NASA source gives a different value, the
 * `discrepancy` field says what it gives; we always follow the mission
 * report. NASA's own link to the report no longer works, so the source
 * registry links to NASA's copy as saved by the Internet Archive. The scan
 * hosted by the Apollo Lunar Surface Journal is the same file.
 *
 * Elapsed times are ground elapsed time (g.e.t.), counted from Gemini 8's
 * lift-off at 16:41:02.389 G.m.t. (section 4.1). Where the report gives a
 * time only to the minute, seconds are written as 00 and the citation says so.
 *
 * The Agena target vehicle was launched first, at 15:00:03.127 G.m.t.
 * (section 4.1). Its time on the mission clock, -001:40:59.262, is our
 * subtraction of the two lift-off times; section 4.1 states the same gap,
 * "One hour 40 minutes 59.262 seconds".
 *
 * Universal times are given only where a source states them. The report's
 * own summary prints the two lift-offs an hour earlier in e.s.t. than its
 * G.m.t. times allow; we use the G.m.t. times (see the launch discrepancy).
 * The retrofire UTC is NSSDCA's 9:45:49 p.m. EST plus five hours, our
 * arithmetic.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers, feet
 * to meters, feet per second to inches and centimeters per second, degrees
 * per second to turns) are our arithmetic on the cited values.
 *
 * Durations of a minute or more are written in the text as minutes and
 * seconds, with the source's full precision kept: the 154.61 seconds in the
 * source is "2 minutes 34.61 seconds" here. That is our arithmetic too.
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * src/sim/, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const CHRONOLOGY = "https://www.nasa.gov/history/SP-4002/";
const CHRONOLOGY_1966 = `${CHRONOLOGY}p3b.htm`;
const CHRONOLOGY_TABLE_A = `${CHRONOLOGY}app1a.htm`;
const CHRONOLOGY_TABLE_B = `${CHRONOLOGY}app1b.htm`;

const NMC_GEMINI = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-020A";
const NMC_AGENA = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-019A";

/** A row of the mission report's Table 4.2-I, the spacecraft's sequence of events, quoted as printed. */
function sequence(row: string, page: "4-10" | "4-11"): Citation {
  return {
    source: "gemini-8-mission-report",
    locator: `Table 4.2-I, "Sequence of Events - Gemini Space Vehicle" (page ${page}), row "${row}", actual time`,
  };
}

/** A row of the mission report's Table 4.2-II, the Agena's sequence of events, quoted as printed. */
function agenaSequence(row: string): Citation {
  return {
    source: "gemini-8-mission-report",
    locator: `Table 4.2-II, "Gemini Atlas-Agena Target Vehicle Sequence of Events" (page 4-12), row "${row}", actual time from lift-off`,
  };
}

/** A section of the mission report. */
function report(section: string, pages: string): Citation {
  return { source: "gemini-8-mission-report", locator: `Section ${section} (page ${pages})` };
}

/** A row of the recovery timeline in section 6.3.2 of the mission report. */
function recovery(time: string, row: string): Citation {
  return {
    source: "gemini-8-mission-report",
    locator: `Section 6.3.2, "Location and Retrieval" (pages 6-32 to 6-34), recovery events table, row ${time}: "${row}"`,
  };
}

/** The March 16, 1966 entries of Project Gemini: A Chronology. */
function chronology(entry: string): Citation {
  return { source: "gemini-chronology", locator: `Part III (B), March 16, 1966: ${entry}`, url: CHRONOLOGY_1966 };
}

/** Appendix 1 of Project Gemini: A Chronology, Gemini VIII column. */
function chronologyTable(table: "A" | "B", rows: string): Citation {
  return {
    source: "gemini-chronology",
    locator: `Appendix 1, Table ${table} (${table === "A" ? "General" : "Orbital Operations"}), Gemini VIII: ${rows}`,
    url: table === "A" ? CHRONOLOGY_TABLE_A : CHRONOLOGY_TABLE_B,
  };
}

/** An NSSDCA Master Catalog page: the Gemini 8 spacecraft or its Agena target. */
function nmc(page: "gemini" | "agena", section: string): Citation {
  return page === "gemini"
    ? { source: "nssdca-master-catalog", locator: `"Gemini 8" (1966-020A), ${section}`, url: NMC_GEMINI }
    : { source: "nssdca-master-catalog", locator: `"Gemini 8 Target" (1966-019A), ${section}`, url: NMC_AGENA };
}

/** NASA's Gemini VIII mission page. */
function nasaMission(section: string): Citation {
  return { source: "nasa-gemini-viii-mission", locator: section };
}

/** NASA's article "55 Years Ago: Gemini VIII, the First Docking in Space". */
function fiftyFive(section: string): Citation {
  return { source: "nasa-gemini-viii-55-years", locator: section };
}

/** NASA's article "Gemini's First Docking Turns to Wild Ride in Orbit". */
function wildRide(section: string): Citation {
  return { source: "nasa-gemini-viii-wild-ride", locator: section };
}

/** On the Shoulders of Titans, chapter XIII, "Agena on Trial". */
function titans(pages: string): Citation {
  return { source: "on-the-shoulders-of-titans", locator: `Chapter XIII, "Agena on Trial", page ${pages}` };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-8/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-8/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: "NASA",
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

const NMC_HOUR_EARLY =
  "NSSDCA's Master Catalog page for Gemini 8, and NASA's Gemini VIII page, which repeats it,";

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: "gemini-8",
  program: "gemini",
  name: "Gemini 8",
  kind: "flight",
  destination: "earth-orbit",

  summary: {
    text: {
      short:
        "Gemini 8 made the first docking of two spacecraft in orbit, in March 1966. Then a stuck thruster set it spinning, and Neil Armstrong and David Scott had to come home early.",
      more:
        "Gemini 8 lifted off from Cape Kennedy, Florida, on March 16, 1966, about an hour and 41 minutes after its target, an uncrewed Agena rocket. Armstrong and Scott chased the Agena down and docked with it. Less than half an hour later, a thruster on Gemini 8 stuck on and the joined spacecraft began to roll. After the crew undocked, Gemini 8 spun even faster, until the astronauts stopped it with the thrusters saved for reentry. Mission rules then called for an early landing, and they splashed down in the western Pacific Ocean 10 hours 41 minutes 26 seconds after liftoff, instead of after the planned three days.",
    },
    citations: [
      report("1.0, \"Mission Summary\"", "1-1 to 1-3"),
      report("4.1, \"Actual Mission\"", "4-1 to 4-5"),
      sequence("Landing", "4-11"),
      chronology("the Gemini VIII mission entry"),
      nmc("gemini", "Mission Profile"),
      nasaMission("Mission overview"),
      wildRide("\"An hour and 41 minutes later, Gemini VIII was boosted by a Titan II\""),
    ],
  },

  crew: {
    value: [
      { name: "Neil A. Armstrong", role: "Command pilot" },
      { name: "David R. Scott", role: "Pilot" },
    ],
    citations: [
      report("1.0, \"Mission Summary\"", "1-1"),
      nasaMission("Mission Facts: \"Crew: Neil A. Armstrong (Command Pilot) and David R. Scott (Pilot)\""),
      chronologyTable("A", "Flight crew, Command pilot and Pilot rows"),
    ],
  },

  launch: {
    value: {
      utc: "1966-03-16T16:41:02.389Z",
      site: "Launch Complex 19, Cape Kennedy, Florida",
      vehicle: "Titan II Gemini Launch Vehicle (GLV-8)",
    },
    citations: [
      report("4.1, \"Actual Mission\"", "4-1"),
      sequence("Lift-off (pad disconnect separation)", "4-10"),
      report("1.0, \"Mission Summary\"", "1-1"),
      report("3.0, \"Vehicle Description\"", "3-1"),
      nasaMission("Mission Facts: Launch Date, Launch Site, and Launch Vehicle"),
      chronologyTable("A", "Launch vehicle, Launch date, and Time (e.s.t.) rows"),
    ],
    discrepancy:
      "The mission report's summary (section 1.0) gives liftoff as 10:41:02 a.m. e.s.t., and the Gemini chronology's March 16 entry gives 10:41 a.m.; neither matches the 16:41:02.389 G.m.t. that section 4.1 of the same report gives, which is 11:41:02 a.m. EST. Appendix 1 of the chronology, NASA's Gemini VIII page, and NSSDCA all give 11:41:02 a.m. EST. We follow the mission report's G.m.t. time.",
  },

  duration: {
    value: "010:41:26",
    citations: [
      sequence("Landing", "4-11"),
      chronologyTable("A", "G.E.T. to touchdown row"),
      nasaMission("Mission Facts: \"Duration: 10 hours, 41 minutes, 26 seconds\""),
      nmc("gemini", "Mission Profile"),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          "Gemini 8 made the first docking of two spacecraft in orbit, joining up with an uncrewed Agena target rocket.",
        more:
          "Rendezvous and docking were among the main skills Project Gemini had to prove, because NASA's plan for landing on the Moon depended on them. Armstrong flew the nose of Gemini 8 into the Agena's docking collar, and latches locked the two craft together. For 27 minutes the joined spacecraft flew smoothly, until the thruster trouble began.",
      },
      citations: [
        report("1.0, \"Mission Summary\"", "1-1 and 1-2"),
        nasaMission("Photo caption: \"the first-ever linking of two spacecraft together in Earth orbit\""),
        nmc("gemini", "Mission Profile: \"the first docking ever to take place in space\""),
        fiftyFive("Opening paragraph: rendezvous and docking \"required to implement the Lunar Orbit Rendezvous method NASA chose for the Moon landing missions\""),
        { source: "nasm-gemini-viii-capsule", locator: "Object description: \"the first docking of two spacecraft in history\"" },
      ],
    },
    {
      text: {
        short:
          "Armstrong and Scott caught up with the Agena in less than six hours, on their fourth trip around Earth.",
        more:
          "Starting about 1,060 nautical miles (about 1,220 miles) behind, the crew made nine maneuvers to reach the Agena. For the final approach they relied on Gemini 8's own radar and onboard computer. It was the second rendezvous in the Gemini program, and rendezvous and docking on the fourth revolution was one of the goals the flight met.",
      },
      citations: [
        report("1.0, \"Mission Summary\"", "1-1 and 1-2"),
        report("4.1, \"Actual Mission\"", "4-2 and 4-3"),
        wildRide("\"Soon the second rendezvous in the Gemini program had been achieved.\""),
        titans("311"),
      ],
    },
    {
      text: {
        short:
          "When a stuck thruster sent Gemini 8 spinning, Armstrong and Scott stopped the spin and brought the spacecraft safely home.",
        more:
          "NASA's mission report praised the crew's \"calm attitude and deliberate manner\" in finding the problem and getting the spacecraft back under control. They then steered their reentry and landed close to their new target in the Pacific. Both astronauts received Exceptional Service Medals for their response to the emergency. For later flights, a master switch was added to the Gemini spacecraft so astronauts could turn off single parts of a system that was not working properly.",
      },
      citations: [
        report("1.0, \"Mission Summary\"", "1-1 and 1-3"),
        fiftyFive("Paragraph on the return to Cape Kennedy: \"received Exceptional Service Medals for their heroic response to the in-flight emergency\""),
        wildRide("\"for future missions, a master switch was added to the Gemini spacecraft\""),
      ],
    },
    {
      text: {
        short:
          "After the crew went home, flight controllers kept flying the Agena by radio and parked it in a higher orbit, where a later crew visited it.",
        more:
          "Ground controllers fired the Agena's main engine nine times, four more than its contract required, and left it in a nearly circular orbit about 220 nautical miles (about 253 miles, or 407 kilometers) up. In July 1966, the Gemini X crew flew to it, and Michael Collins retrieved a micrometeorite collector panel from its outside during a spacewalk. The Agena fell back into the atmosphere on September 15, 1967.",
      },
      citations: [
        { source: "gemini-chronology", locator: "Part III (B), March 16, 1966: second entry, on GATV 5003 after the flight", url: CHRONOLOGY_1966 },
        report("1.0, \"Mission Summary\"", "1-3"),
        report("4.1, \"Actual Mission\"", "4-5"),
        fiftyFive("Paragraph on Gemini X and the Agena's reentry"),
        nmc("agena", "Description"),
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for the Gemini 8 Target gives eight orbital firings of the main engine and a near-circular 380 km orbit at the end. The Gemini chronology gives nine firings and a 220-nautical-mile circular orbit, and the mission report counts nine Primary Propulsion System firings. We follow the chronology and the mission report.",
    },
  ],

  chapters: [
    { id: "target", title: "The target" },
    { id: "launch", title: "Launch" },
    { id: "chase", title: "The chase" },
    { id: "docking", title: "Docking" },
    { id: "emergency", title: "Emergency" },
    { id: "coming-home", title: "Coming home" },
    { id: "splashdown", title: "Splashdown" },
  ],

  events: [
    /* --------------------------- The target -------------------------- */
    {
      id: "agena-launch",
      title: "The target launches",
      chapter: "target",
      elapsed: "-001:40:59.262",
      utc: "1966-03-16T15:00:03.127Z",
      text: {
        short:
          "An Atlas rocket launches the Agena, an uncrewed target rocket, from Cape Kennedy. Gemini 8 will have to catch it and dock with it.",
        more:
          "The Agena lifted off from Launch Complex 14 on the morning of March 16, 1966, 1 hour 40 minutes 59.262 seconds before Gemini 8, after a countdown with no holds. Once free of the Atlas, the Agena fired its own engine, which shut down 9 minutes 20.40 seconds after liftoff. That left it in a nearly circular orbit about 183 to 186 miles (294 to 299 kilometers) up. Its front end carried a docking cone made to hold the nose of a Gemini spacecraft.",
      },
      citations: [
        agenaSequence("Lift-off"),
        agenaSequence("PPS engine cutoff (VMCO)"),
        report("4.1, \"Actual Mission\"", "4-1"),
        report("1.0, \"Mission Summary\"", "1-1"),
        chronology("the Gemini VIII mission entry"),
        chronologyTable("B", "Target vehicle, Target launch vehicle, and Launch Time (e.s.t.) columns"),
        nmc("agena", "Description and \"Gemini Agena Target Vehicle\""),
      ],
      discrepancy:
        "The mission report's summary gives the Agena's launch as 9:00:03 a.m. e.s.t., and the Gemini chronology's March 16 entry, NASA's Gemini VIII page, and NSSDCA's page for Gemini 8 give 9:00 a.m. None of these match the 15:00:03.127 G.m.t. in section 4.1 of the same report, which is 10:00:03 a.m. EST. NSSDCA's page for the Agena (1966-019A) and Appendix 1 of the chronology give 10:00:03 a.m. EST, and NASA's \"Wild Ride\" article gives 10 a.m. EST. We follow the mission report's G.m.t. time.",
      photo: nasaPhoto(
        "S66-24482",
        1600,
        1600,
        "A white Atlas rocket with the Agena on top rises beside a red launch tower on a burst of orange flame and billowing white smoke, under a blue sky crossed by a jet's contrail.",
      ),
      view: "earth",
      inTour: true,
    },

    /* ----------------------------- Launch ---------------------------- */
    {
      id: "liftoff",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00",
      utc: "1966-03-16T16:41:02.389Z",
      text: {
        short:
          "A Titan II rocket lifts Gemini 8 off the pad, carrying Neil Armstrong and David Scott. Their job: catch the Agena and dock with it.",
        more:
          "Gemini 8 lifted off from Launch Complex 19 at Cape Kennedy at 11:41 a.m. Eastern Standard Time on March 16, 1966. Neil Armstrong was the command pilot and David Scott the pilot. The flight was planned to last three days, with rendezvous and docking with the Agena and a spacewalk by Scott.",
      },
      citations: [
        sequence("Lift-off (pad disconnect separation)", "4-10"),
        report("4.1, \"Actual Mission\"", "4-1"),
        report("1.0, \"Mission Summary\"", "1-1"),
        report("2.0, \"Introduction\", primary objectives", "2-1"),
        nasaMission("Mission Facts: Launch Date and Launch Site"),
        chronologyTable("A", "Launch date and Time (e.s.t.) rows"),
        fiftyFive("Paragraph on the planned flight: \"Scott would exit the Gemini spacecraft for a planned two-hour spacewalk\""),
      ],
      discrepancy:
        "The mission report's summary gives liftoff as 10:41:02 a.m. e.s.t., an hour earlier than the 16:41:02.389 G.m.t. in its section 4.1; NASA's Gemini VIII page and Appendix 1 of the Gemini chronology give 11:41:02 a.m. EST, which matches. We follow the mission report's G.m.t. time.",
      photo: nasaPhoto(
        "KSC-66PC-0038",
        1600,
        1280,
        "A white-and-black Titan II rocket climbs away from its red launch tower on a column of exhaust, with tan smoke spreading across the pad under a blue sky with white clouds.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "staging",
      title: "First stage falls away",
      chapter: "launch",
      elapsed: "000:02:34.61",
      text: {
        short:
          "The rocket's first stage shuts down and drops away. The second stage lights up and keeps pushing Gemini 8 toward orbit.",
        more:
          "The first stage shut down 2 minutes 34.61 seconds after liftoff, and the signal to start the second-stage engine went out at the same moment. The two stages began to separate at 2 minutes 35.29 seconds. The second stage then burned until 5 minutes 37.54 seconds after liftoff.",
      },
      citations: [
        sequence("BECO (stage I engine shutdown (87FS2))", "4-10"),
        sequence("Stage II engine ignition signal (91FS1)", "4-10"),
        sequence("Stage separation begins", "4-10"),
        sequence("SECO (stage II engine shutdown (91FS2))", "4-10"),
        report("1.0, \"Mission Summary\": \"Staging was nominal\"", "1-2"),
      ],
      view: "earth",
    },
    {
      id: "in-orbit",
      title: "In orbit",
      chapter: "launch",
      elapsed: "000:06:05.66",
      text: {
        short:
          "Six minutes after liftoff, Gemini 8 separates from its rocket and is in orbit. The Agena is far ahead, about 1,220 miles (1,963 kilometers) away.",
        more:
          "The spacecraft separated from the rocket's second stage 6 minutes 5.66 seconds after liftoff, and the crew fired its thrusters for 8.0 seconds to move away. Gemini 8's orbit ranged from 86.3 to 146.7 nautical miles up (about 99 to 169 miles, or 160 to 272 kilometers). The Agena was about 1,060 nautical miles ahead, as planned.",
      },
      citations: [
        sequence("Spacecraft separation (shape-charge fired)", "4-10"),
        report("4.1, \"Actual Mission\"", "4-1 and 4-2"),
        report("1.0, \"Mission Summary\"", "1-2"),
        chronologyTable("A", "At insertion, Apogee and Perigee rows"),
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for Gemini 8 says the spacecraft was inserted into orbit at 11:47:36 a.m. EST, about 6 minutes 34 seconds after liftoff. We follow the mission report's Table 4.2-I, where the spacecraft separated from the second stage at 365.66 seconds (6 minutes 5.66 seconds).",
      view: "earth",
    },

    /* ---------------------------- The chase --------------------------- */
    {
      id: "chase-begins",
      title: "The chase begins",
      chapter: "chase",
      elapsed: "001:34:36",
      text: {
        short:
          "Over Texas, Armstrong fires the thrusters for the first of nine maneuvers that will bring Gemini 8 to the Agena.",
        more:
          "This first firing, 1 hour 34 minutes 36 seconds after liftoff, lowered the high point of Gemini 8's orbit slightly, from 147 to 145.5 nautical miles. In the next hour and a half the crew made three more changes: a push to speed up and raise the orbit's low point, a sideways push to move into the same plane as the Agena's orbit, and a small fine-tuning push.",
      },
      citations: [
        sequence("Height-adjust maneuver", "4-11"),
        sequence("Phase-adjust maneuver", "4-11"),
        sequence("Plane-change maneuver", "4-11"),
        sequence("Vernier-height-adjust maneuver", "4-11"),
        report("4.1, \"Actual Mission\"", "4-2"),
        report("1.0, \"Mission Summary\"", "1-2"),
      ],
      discrepancy:
        "Section 4.1 of the mission report gives this firing as 1:34:37, which is the planned time in Table 4.2-I. We follow the table's actual time, 01:34:36.",
      view: "earth",
    },
    {
      id: "radar-contact",
      title: "Radar finds the Agena",
      chapter: "chase",
      elapsed: "003:27:48",
      text: {
        short:
          "Gemini 8's radar picks up the Agena, still about 208 miles (335 kilometers) ahead. Now the crew can measure how far away it is and how fast they are closing in.",
        more:
          "The radar first caught the Agena on and off 3 hours 27 minutes 48 seconds after liftoff, and locked on solidly about three and a half minutes later, at a range of 181 nautical miles. At 3 hours 48 minutes 10 seconds, on the third revolution, the crew fired the thrusters to put Gemini 8 into an orbit that ran almost parallel to the Agena's, 13.5 to 14.7 nautical miles (about 16 to 17 miles, or 25 to 27 kilometers) below it.",
      },
      citations: [
        report("5.1.5, \"Guidance and Control System\", rendezvous radar", "5-20"),
        sequence("Coelliptic maneuver", "4-11"),
        report("4.1, \"Actual Mission\"", "4-2 and 4-3"),
        titans("311"),
      ],
      discrepancy:
        "The mission report's summary and section 4.1 give the lock-on range as 180 nautical miles, its pilots' report (section 7.1.2.4) gives 179.11 nautical miles, and On the Shoulders of Titans gives 332 kilometers. We follow section 5.1.5, which pairs 181 nautical miles with the lock-on time. On the Shoulders of Titans also puts the new orbit close to 28 kilometers below the Agena's; we follow section 4.1 of the mission report, 13.5 to 14.7 nautical miles.",
      photo: nasaPhoto(
        "S66-25771",
        1600,
        1454,
        "Earth's curved edge at sunrise, seen from Gemini 8 on its third trip around Earth: a thin glowing band of orange and blue light under black space, with cloud tops showing as dark shapes along it.",
      ),
      view: "earth",
    },
    {
      id: "agena-in-sight",
      title: "The Agena comes into view",
      chapter: "chase",
      elapsed: "004:40:00",
      text: {
        short:
          "Armstrong spots the Agena shining in the sunlight far ahead. Soon there is no doubt: it is a very bright cylinder.",
        more:
          "Armstrong first saw the Agena in reflected sunlight about 76 nautical miles (about 87 miles, or 141 kilometers) away. By 4 hours 40 minutes after liftoff, he could clearly see it as a very bright, cylinder-shaped object. When Gemini 8 passed into Earth's shadow, the crew kept the Agena in view by its acquisition lights, which looked about as bright as a faint star.",
      },
      citations: [
        report("7.2.2.2.5, \"Vision\": \"At 4 hours 40 minutes ground elapsed time (g.e.t.), the GATV was definitely identified\" (time given to the minute; seconds written as 00)", "7-33"),
        report("7.1.2.16, \"Visual sightings\"", "7-25 and 7-26"),
        report("4.1, \"Actual Mission\": \"optical contact at 76 nautical miles\"", "4-3"),
        wildRide("\"OK we've got a visual on the Agena at 76 miles\""),
      ],
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "closing-in",
      title: "Closing in",
      chapter: "chase",
      elapsed: "005:43:09",
      text: {
        short:
          "Armstrong fires the thrusters to slow down as Gemini 8 closes in on the Agena, judging the approach by eye.",
        more:
          "The final approach began at 5 hours 14 minutes 56 seconds, when the crew fired the thrusters to head for the Agena, followed by two small corrections. Braking began at 5 hours 43 minutes 9 seconds, about 1.7 nautical miles (about 2 miles) from the Agena: one big firing and eight short ones over the next 10 minutes. Armstrong judged the braking by eye while Scott called out the radar's readings of distance and closing speed.",
      },
      citations: [
        sequence("Terminal-phase-initiation maneuver", "4-11"),
        sequence("Braking maneuver", "4-11"),
        report("4.1, \"Actual Mission\"", "4-3"),
        report("7.1.2.5, \"Terminal phase\"", "7-19"),
        titans("311"),
        wildRide("\"Armstrong judged his braking action by eye as Scott called out radar range and the closing rates\""),
      ],
      photo: nasaPhoto(
        "s66-25779",
        1358,
        1600,
        "The Agena, a long silver cylinder with a thin antenna, floats in black space above the blue Earth and white clouds. The edge of Gemini 8 shows at lower left.",
      ),
      view: "spacecraft",
    },

    /* ----------------------------- Docking ---------------------------- */
    {
      id: "station-keeping",
      title: "Side by side",
      chapter: "docking",
      elapsed: "005:56:56",
      text: {
        short:
          "The chase is over. Gemini 8 stops about 150 feet (46 meters) from the Agena, and the crew looks it over before docking.",
        more:
          "Station keeping, flying in formation with the Agena, began 5 hours 56 minutes 56 seconds after liftoff at a range of 150 feet, and Armstrong soon closed in to about 50 feet (15 meters). For about 36 minutes he held Gemini 8 in place while Scott checked the Agena, using the magnifying sight of a hand-held sextant to read the lights on its status panel.",
      },
      citations: [
        report("7.1.1.2.3, \"Station keeping and docking\"", "7-4"),
        report("4.1, \"Actual Mission\"", "4-3"),
        report("1.0, \"Mission Summary\"", "1-2"),
        titans("311"),
      ],
      discrepancy: `The mission report's summary and the Gemini chronology's March 16 entry say the rendezvous ended at 5 hours 58 minutes; ${NMC_HOUR_EARLY} gives 4:39 p.m. EST, an hour earlier than the mission report's times allow. We follow section 7.1.1.2.3 of the mission report, which gives 5:56:56.`,
      photo: nasaPhoto(
        "S66-25782",
        1600,
        1600,
        "Close view of the silver Agena floating in black space, with its engine end at left and its docking collar and a coiled antenna at right. Earth's blue edge is at the bottom, and part of Gemini 8 is in the foreground.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "docking",
      title: "The first docking",
      chapter: "docking",
      elapsed: "006:33:16",
      text: {
        short:
          "Armstrong eases Gemini 8's nose into the Agena's docking collar, and latches lock them together. It is the first time two spacecraft have docked in orbit.",
        more:
          "Over the tracking ship Rose Knot Victor, a capsule communicator radioed, \"Go ahead and dock.\" Armstrong moved in from about 2 feet (0.6 meter) away, touching at about 9 inches (23 centimeters) per second. The nose slid smoothly into the docking cone, the latches caught right away, and by 6 hours 33 minutes 22 seconds the two craft were rigidly joined. Armstrong radioed, \"Flight, we are docked.\" About a quarter of an hour later, Scott commanded the Agena to turn the joined spacecraft 90 degrees, which took 55 seconds.",
      },
      citations: [
        sequence("Docking", "4-11"),
        sequence("Rigidizing", "4-11"),
        sequence("90° yaw maneuver", "4-11"),
        report("1.0, \"Mission Summary\"", "1-2"),
        report("4.1, \"Actual Mission\"", "4-3 and 4-4"),
        report("7.1.2.7, \"Docking\", and 7.1.2.8, \"GATV yaw maneuver\"", "7-19 and 7-20"),
        wildRide("\"Go ahead and dock.\" and \"Flight, we are docked\""),
        fiftyFive("\"Flight, we are docked.\""),
        titans("311 and 312"),
        nasaMission("Photo caption: \"the first-ever linking of two spacecraft together in Earth orbit\""),
      ],
      discrepancy: `Appendix 1 (Table B) of the Gemini chronology gives docking as 6:33:22, the time the mission report's Table 4.2-I lists for rigidizing; ${NMC_HOUR_EARLY} gives 5:14 p.m. EST, an hour earlier than the mission report's time allows. We follow Table 4.2-I, 06:33:16. For the closing speed, On the Shoulders of Titans gives 8 centimeters (3 inches) per second and NASA's 55-years article one foot per second; we follow the mission report's summary, about three-fourths of a foot per second at contact.`,
      photo: nasaPhoto(
        "s66-25784",
        1600,
        1600,
        "The round docking collar of the Agena fills the view just ahead of Gemini 8, with a coiled antenna rising above it. The dark nose of Gemini 8 is in the lower left corner.",
      ),
      view: "spacecraft",
      inTour: true,
    },

    /* ---------------------------- Emergency --------------------------- */
    {
      id: "trouble-begins",
      title: "Something is wrong",
      chapter: "emergency",
      elapsed: "007:00:26.7",
      text: {
        short:
          "Out of radio contact with the ground, the joined spacecraft start to roll without warning. The crew thinks the Agena is to blame.",
        more:
          "At 7 hours 0 minutes 26.7 seconds, one of Gemini 8's thrusters, number 8, began firing on its own, even though power to the thrusters' controls was switched off. The crew felt nothing and heard no thruster noise, but Scott saw a tilt on his attitude display: \"Neil, we're in a bank.\" They had been warned that the Agena's controls might act up, so they switched them off. Armstrong steadied the pair again and again with Gemini's thrusters, but the rolling kept coming back, and the fuel for those thrusters dropped to 30 percent.",
      },
      citations: [
        sequence("Thruster anomaly start", "4-11"),
        report("7.1.1.4, \"Control systems\"", "7-6 and 7-7"),
        report("4.1, \"Actual Mission\"", "4-4"),
        wildRide("\"Neil, we're in a bank\" and \"the crew's first reaction was to blame the Agena\""),
        titans("312 and 314"),
        fiftyFive("\"Armstrong noticed the Gemini's fuel supply had dropped to 30%\""),
      ],
      discrepancy: `The mission report's summary gives about 7:00:30; ${NMC_HOUR_EARLY} gives 5:41 p.m. EST, an hour earlier than the mission report's time allows. We follow Table 4.2-I, 07:00:26.7.`,
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "undocking",
      title: "Undocking",
      chapter: "emergency",
      elapsed: "007:15:12.3",
      text: {
        short:
          "To find out which spacecraft has the problem, the crew undocks from the Agena and backs Gemini 8 away.",
        more:
          "When the rolling had slowed enough that the two craft would not bump, Scott pressed the undock button and Armstrong fired the thrusters to pull straight back. Before leaving, Scott handed control of the Agena back to the ground, so flight controllers could still command it.",
      },
      citations: [
        sequence("Undocking", "4-11"),
        report("4.1, \"Actual Mission\"", "4-4"),
        report("5.1.5, \"Guidance and Control System\"", "5-26"),
        titans("314"),
        wildRide("\"So Scott pushed the undock button, and Armstrong backed Gemini away from the Agena.\""),
      ],
      discrepancy:
        "The Agena section of the mission report (section 5.4.5, page 5-194) gives undocking as 7:15:06. We follow Table 4.2-I, 07:15:12.3.",
      view: "spacecraft",
    },
    {
      id: "spin",
      title: "Spinning faster",
      chapter: "emergency",
      elapsed: "007:15:44.7",
      text: {
        short:
          "Without the heavy Agena attached, Gemini 8 spins faster and faster, close to a full turn every second. The astronauts' vision starts to blur.",
        more:
          "The stuck thruster kept firing. At 7 hours 15 minutes 44.7 seconds, power to Gemini 8's control electronics was cut by accident, so the hand controllers stopped working, and over the next three minutes the roll rate climbed to 296 degrees per second. When Gemini 8 came within range of the tracking ship Coastal Sentry Quebec, Scott reported, \"We have serious problems here. We're tumbling end over end.\" The astronauts were dizzy and their vision was blurred.",
      },
      citations: [
        report("5.1.5, \"Guidance and Control System\"", "5-26"),
        report("7.1.1.4, \"Control systems\"", "7-8"),
        fiftyFive("\"We have serious problems here. We're tumbling end over end.\""),
        wildRide("\"As the spin rate approached one revolution per second, the astronauts' vision became blurred.\""),
        titans("314 and 315"),
      ],
      discrepancy:
        "The mission report's summary gives about 300 degrees per second. NASA's Gemini VIII page and NSSDCA say the rate approached and possibly exceeded one revolution per second, and the Smithsonian's Gemini VIII page, On the Shoulders of Titans, and NASA's 55-years article give one revolution per second (360 degrees per second). We follow the mission report's control system analysis (section 5.1.5), 296 degrees per second.",
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "control-regained",
      title: "Back under control",
      chapter: "emergency",
      elapsed: "007:25:30",
      text: {
        short:
          "The crew shuts off the faulty thrusters and uses the small thrusters meant for reentry to stop the spin. Gemini 8 is steady again.",
        more:
          "At 7 hours 16 minutes 25.1 seconds, the crew switched on the reentry control system, a separate set of thrusters in the spacecraft's nose saved for the trip home. At 7 hours 18 minutes 15.7 seconds they opened the circuit breakers for the maneuvering thrusters, which finally stopped thruster 8. Armstrong fired the reentry thrusters directly with his hand controller, using both rings of them at first and then only one to save fuel, and by 7 hours 25 minutes 30 seconds the spacecraft was steady. A few minutes later the crew tested the thrusters one at a time and found the culprit: an electrical failure had left thruster 8 switched on.",
      },
      citations: [
        sequence("Activate Reentry Control System", "4-11"),
        sequence("TCA no. 8 circuit breaker off", "4-11"),
        sequence("Rates under control", "4-11"),
        report("1.0, \"Mission Summary\"", "1-3"),
        report("4.1, \"Actual Mission\"", "4-4"),
        report("5.1.5, \"Guidance and Control System\"", "5-26"),
        report("7.1.1.4, \"Control systems\"", "7-8"),
        wildRide("\"use the re-entry control system, or RCS, thrusters on the nose of the spacecraft\""),
      ],
      discrepancy: `${NMC_HOUR_EARLY} gives 6:06:30 p.m. EST for the moment the spacecraft was stabilized, an hour earlier than the mission report's time allows. We follow Table 4.2-I, 07:25:30.`,
      view: "spacecraft",
      inTour: true,
    },

    /* --------------------------- Coming home -------------------------- */
    {
      id: "come-home-early",
      title: "Coming home early",
      chapter: "coming-home",
      elapsed: "007:43:00",
      utc: "1966-03-17T00:24:00Z",
      text: {
        short:
          "Mission rules say that once the reentry thrusters have been used, the flight must end soon. Mission Control picks a landing spot in the western Pacific Ocean.",
        more:
          "Flight controllers saw that both rings of reentry thrusters had been turned on and that less than half of their fuel was left, so the rules required ending the mission early. They chose to bring Gemini 8 down on its seventh trip around Earth, in a backup landing area about 500 miles east of Okinawa. At 7 hours 43 minutes, the destroyer USS Leonard F. Mason was ordered there at its best speed. Scott's planned spacewalk and the extra docking tests were canceled.",
      },
      citations: [
        recovery("00:24 G.m.t. / 7:43 g.e.t. (both given to the minute; seconds written as 00)", "U.S.S. Leonard Mason ordered to proceed at best speed to 7-3 aiming point"),
        report("6.1, \"Flight Control\"", "6-8 and 6-9"),
        report("4.1, \"Actual Mission\"", "4-4"),
        fiftyFive("Paragraph on the emergency: the mission rule to land at the next opportunity, and the spacewalk and extra docking tests called off"),
        titans("315"),
      ],
      view: "earth",
    },
    {
      id: "retrofire",
      title: "Retrofire",
      chapter: "coming-home",
      elapsed: "010:04:47",
      utc: "1966-03-17T02:45:49Z",
      text: {
        short:
          "Over Africa, four small rockets fire to slow Gemini 8 down, so it drops out of orbit and heads for the Pacific.",
        more:
          "About a minute before, at 10 hours 3 minutes 48 seconds, the equipment section at the back of the spacecraft was cast off. Retrofire began exactly on time, at 10 hours 4 minutes 47 seconds, in darkness, and all four retrorockets fired in the automatic sequence. Afterward the section that had held the retrorockets was dropped as well, uncovering the heat shield for the plunge through the atmosphere.",
      },
      citations: [
        sequence("Retrofire initiation", "4-11"),
        sequence("Adapter equipment section separation", "4-11"),
        report("1.0, \"Mission Summary\"", "1-3"),
        report("4.1, \"Actual Mission\"", "4-5"),
        report("7.1.2.11, \"Retrofire\"", "7-22"),
        chronologyTable("A", "G.E.T. to retrofire row"),
        nmc("gemini", "Mission Profile (retrofire at 9:45:49 p.m. EST; UTC is our conversion) and Reentry"),
        recovery("02:45 G.m.t. / 10:04 g.e.t.", "Spacecraft retrofire"),
        fiftyFive("\"fired their spacecraft's retrorockets in the darkness over south-central Africa\""),
      ],
      discrepancy:
        "Section 5.1.8.3 of the mission report gives retrofire as 10:04:46.6. We follow Table 4.2-I, 10:04:47, which Appendix 1 of the Gemini chronology also gives.",
      view: "spacecraft",
      inTour: true,
    },

    /* ---------------------------- Splashdown --------------------------- */
    {
      id: "parachutes",
      title: "Parachutes open",
      chapter: "splashdown",
      elapsed: "010:36:47",
      text: {
        short:
          "A small drogue parachute opens high above the Pacific. Then the big main parachute opens to lower Gemini 8 to the sea.",
        more:
          "Coming through the atmosphere, the crew felt a peak of 6 g, six times their normal weight. The drogue parachute went out at about 50,000 feet (15,200 meters). At 10 hours 38 minutes 8 seconds, at about 10,000 feet (3,050 meters), the main parachute was deployed, and the crew turned the spacecraft into its landing position. The crew of a rescue airplane spotted Gemini 8 hanging under its main parachute.",
      },
      citations: [
        sequence("Drogue parachute deployment", "4-11"),
        sequence("Pilot parachute deploy/main parachute deploy", "4-11"),
        report("7.1.2.12, \"Reentry\"", "7-23"),
        report("4.1, \"Actual Mission\"", "4-5"),
        recovery("03:20 G.m.t. / 10:39 g.e.t.", "Naha Rescue 1 sighted spacecraft on main parachute at a range of 3 nautical miles"),
      ],
      discrepancy:
        "The mission report's landing-system figure (figure 5.1.11-1, page 5-108) gives drogue deployment as 10:36:34.4 and main parachute deployment as 10:38:10.6, and its section 5.1.8.2 says the drogue was out at 10:36:41. We follow Table 4.2-I: 10:36:47 and 10:38:08.",
      view: "earth",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "splashdown",
      elapsed: "010:41:26",
      utc: "1966-03-17T03:22:28Z",
      text: {
        short:
          "Gemini 8 lands in the western Pacific Ocean, 10 hours 41 minutes after liftoff. It was supposed to stay up for three days.",
        more:
          "The spacecraft came down in a backup landing area about 500 miles (800 kilometers) east of Okinawa, less than 7 nautical miles from the planned point. It was 10:22 p.m. Eastern Standard Time, but daytime where Gemini 8 landed. Three Air Force pararescuemen jumped from a rescue plane and, fighting rough seas, attached a flotation collar within 45 minutes while the astronauts waited inside.",
      },
      citations: [
        sequence("Landing", "4-11"),
        report("1.0, \"Mission Summary\"", "1-1 and 1-3"),
        report("4.1, \"Actual Mission\"", "4-4 and 4-5"),
        nasaMission("Mission Facts: \"Landing Date: Mar. 16, 1966, 10:22:28 p.m. EST (Mar. 17, 1966, 03:22:28 UT)\""),
        nmc("gemini", "Mission Profile"),
        titans("318 and 319"),
        wildRide("\"three U.S. Air Force pararescuers jumped from an aircraft into the sea\""),
      ],
      discrepancy:
        "The mission report says Gemini 8 landed less than 7 nautical miles from the planned point; Appendix 1 of the Gemini chronology gives 1.1 nautical miles, NSSDCA 2 km, and NASA's 55-years article 1.6 miles. NSSDCA also places the landing about 800 km west of Okinawa, where the mission report and On the Shoulders of Titans say east. The pilots' report (section 7.1.2.13) says the collar was not secured and the hatches opened until about 1 hour 15 minutes after landing. We follow the mission report's sections 1.0 and 4.1.",
      photo: nasaPhoto(
        "s66-18602",
        1600,
        1600,
        "Seen from above, Gemini 8 floats in deep blue water inside a yellow flotation collar with both hatches open. Armstrong and Scott sit inside in white spacesuits while three rescue swimmers hold on to the spacecraft, and a yellow raft floats alongside.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "recovery",
      title: "Aboard the destroyer",
      chapter: "splashdown",
      elapsed: "013:47:00",
      utc: "1966-03-17T06:28:00Z",
      text: {
        short:
          "About three hours after splashdown, the destroyer USS Leonard F. Mason arrives. The astronauts climb aboard, and the ship lifts Gemini 8 out of the sea.",
        more:
          "Armstrong and Scott climbed a ladder from the spacecraft to the ship 13 hours 47 minutes after liftoff, and Gemini 8 was secured on deck nine minutes later. The ship's doctor found the crew in good condition. The Mason reached Okinawa the next day, and the astronauts flew home from there.",
      },
      citations: [
        recovery("06:28 G.m.t. / 13:47 g.e.t. (both given to the minute; seconds written as 00)", "Flight crew boarded U.S.S. Mason"),
        recovery("06:37 G.m.t. / 13:56 g.e.t.", "Spacecraft secured onboard U.S.S. Mason"),
        recovery("07:15 G.m.t. / 14:34 g.e.t.", "Condition of flight crew reported as good by doctor onboard U.S.S. Mason"),
        report("7.1.2.13, \"Recovery\": \"Egress was directly from the spacecraft to the destroyer ladder\"", "7-24"),
        chronologyTable("A", "Recovery, Ship, Date, and Time (e.s.t.) Crew and Spacecraft rows"),
        titans("319"),
      ],
      photo: nasaPhoto(
        "s66-26037",
        1600,
        1600,
        "A ship's crane lifts the dark, cone-shaped Gemini 8 spacecraft, still wrapped in its yellow flotation collar, over the deck of a destroyer while sailors in orange life vests and an officer in khaki watch.",
      ),
      view: "earth",
    },
  ],

  whereNow: [
    {
      value: {
        object: "Gemini VIII spacecraft",
        museum: "Armstrong Air & Space Museum",
        place: "Wapakoneta, Ohio",
      },
      citations: [
        { source: "armstrong-museum-exhibitions", locator: "Featured exhibits, \"Gemini VIII Spacecraft\": \"The museum is proud to display the Gemini VIII spacecraft in the Early Space Gallery.\"" },
        { source: "nasm-gemini-viii-capsule", locator: "Display Status: \"not on display at the National Air and Space Museum. It is either on loan or in storage.\"" },
        fiftyFive("\"The Gemini VIII spacecraft is on display at the Neil Armstrong Air and Space Museum in Wapakoneta, Ohio.\""),
      ],
    },
  ],
};
