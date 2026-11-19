/**
 * Gemini 9A (NASA wrote it "Gemini IX-A"): three rendezvous with a target
 * that could not be docked with, the "angry alligator", and Gene Cernan's
 * spacewalk, June 3-6, 1966.
 *
 * NASA's own copy of the Gemini IX-A mission report (MSC-G-R-66-6) was not
 * found. Event times come, in this order of preference, from:
 * - Appendix 1 of the Gemini chronology (SP-4002), whose tables give the
 *   flight's elapsed times for station keeping, retrofire, and touchdown,
 *   and its flight entries, which summarize the mission report;
 * - the Gemini IX-A air-to-ground and onboard transcript, where each call
 *   is logged with its ground elapsed time (used for the moments the tables
 *   do not list, and for radio calls);
 * - On the Shoulders of Titans (SP-4203), Summary of Rendezvous Operations
 *   (SP-138), Gemini Control's commentary, NSSDCA, and NASA's pages.
 * Where sources differ, the `discrepancy` field says what the others give
 * and which we follow.
 *
 * Elapsed times are Gemini IX-A's ground elapsed time, counted from its
 * lift-off at 13:39:33.335 UT (8:39:33 a.m. EST) on June 3, 1966 (NSSDCA;
 * Appendix 1 of the chronology prints 8:39:33 a.m.). The transcript's clock
 * is the same one: it logs "LIFT-OFF" at 00:00:01 and retrofire at the
 * chronology's 71:46:44. Where a source gives a time only to the minute,
 * seconds are written as 00 and the text says "about".
 *
 * Universal times are given only where a source states the clock time;
 * Eastern Standard Time is converted by adding 5 hours (our arithmetic).
 *
 * Unit conversions in the text (nautical miles and kilometers to miles,
 * feet to meters, pounds to kilograms) are our arithmetic on the cited
 * values, rounded to the digits the source gives.
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const CHRONOLOGY_1966 = "https://www.nasa.gov/history/SP-4002/p3b.htm";
const CHRONOLOGY_TABLE_A = "https://www.nasa.gov/history/SP-4002/app1a.htm";
const CHRONOLOGY_TABLE_B = "https://www.nasa.gov/history/SP-4002/app1b.htm";
const NMC_GEMINI_9A = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-047A";
const NMC_ATDA = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-046A";
const RENDEZVOUS_PAPER = "https://ntrs.nasa.gov/api/citations/19680005473/downloads/19680005473.pdf";

/** A line of the Gemini IX-A transcript: its time as printed, who spoke, and the words (printed page; the PDF page is one more). */
function transcript(time: string, words: string, page: number): Citation {
  return {
    source: "gemini-9a-voice-transcript",
    locator: `Page ${page} (PDF page ${page + 1}), ${time}: "${words}"`,
  };
}

/** Gemini Control's commentary, by the PDF page of the PAO transcript. */
function pao(pdfPage: number, words: string): Citation {
  return { source: "gemini-9a-pao-commentary", locator: `PDF page ${pdfPage}: ${words}` };
}

/** An entry of the Gemini chronology's 1966 part (Part III (B)). */
function chronology(day: string, words: string): Citation {
  return { source: "gemini-chronology", locator: `Part III (B), ${day}, 1966: ${words}`, url: CHRONOLOGY_1966 };
}

/** Appendix 1 of the Gemini chronology, IX-A column or rows. */
function chronologyTable(table: "A" | "B", rows: string): Citation {
  return {
    source: "gemini-chronology",
    locator: `Appendix 1, Table ${table} (${table === "A" ? "General" : "Orbital Operations"}), IX-A: ${rows}`,
    url: table === "A" ? CHRONOLOGY_TABLE_A : CHRONOLOGY_TABLE_B,
  };
}

/** On the Shoulders of Titans, chapter XIV (printed page; the PDF page is 21 more). */
function titans(page: number, words: string): Citation {
  return { source: "on-the-shoulders-of-titans", locator: `Chapter XIV, "Charting New Space Lanes", page ${page} (PDF page ${page + 21}): ${words}` };
}

/** An NSSDCA Master Catalog page: the Gemini 9A spacecraft or its target. */
function nmc(page: "gemini" | "atda", section: string): Citation {
  return page === "gemini"
    ? { source: "nssdca-master-catalog", locator: `"Gemini 9A" (1966-047A), ${section}`, url: NMC_GEMINI_9A }
    : { source: "nssdca-master-catalog", locator: `"Gemini 9 Target B" (1966-046A), ${section}`, url: NMC_ATDA };
}

/** NASA's Gemini IX mission page. */
function nasaMission(section: string): Citation {
  return { source: "gemini-9a-nasa-mission-page", locator: section };
}

/** NASA's article "Gemini IX and the Angry Alligator". */
function alligator(section: string): Citation {
  return { source: "gemini-9a-nasa-angry-alligator", locator: section };
}

/** Summary of Rendezvous Operations, Gemini Summary Conference (page of the conference volume, and of the NTRS file). */
function rendezvousPaper(locator: string): Citation {
  return { source: "gemini-rendezvous-summary", locator, url: RENDEZVOUS_PAPER };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-9a/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-9a/${nasaId.toLowerCase()}.jpg`,
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
  id: "gemini-9a",
  program: "gemini",
  name: "Gemini 9A",
  kind: "flight",
  destination: "earth-orbit",

  summary: {
    text: {
      short:
        "In June 1966, Tom Stafford and Gene Cernan flew Gemini 9A to a target whose nose cover was stuck half open, like the jaws of an \"angry alligator,\" so they could not dock. They met it three different ways instead, and Cernan made a spacewalk that was much harder than anyone expected.",
      more:
        "Gemini 9 was to be flown by Elliot See and Charles Bassett, who died in a plane crash on February 28, 1966; their backups, Stafford and Cernan, took their place. On May 17, the Agena target rocket they were to dock with fell into the Atlantic Ocean when its Atlas booster failed. NASA renamed the flight Gemini 9A and launched a simpler backup target, the Augmented Target Docking Adapter, or ATDA, on June 1. A ground equipment failure stopped the Gemini countdown that day, and Gemini 9A lifted off on June 3. The crew reached the ATDA on their third trip around Earth, found its nose cover hanging open, and practiced three kinds of rendezvous instead of docking. On the third day Cernan made a spacewalk of more than two hours, but his faceplate fogged, and the test of a rocket backpack was called off. Gemini 9A splashed down in the Atlantic on June 6, 72 hours 20 minutes 50 seconds after liftoff.",
    },
    citations: [
      chronology("February 28", "\"Gemini IX Astronauts Elliot M. See, Jr., and Charles A. Bassett II were killed when their T-38 jet training plane crashed\"; \"NASA Headquarters announced that Stafford and Cernan would fly the Gemini IX mission\""),
      chronology("May 17", "the first entry: \"Gemini Agena target vehicle 5004 failed to achieve orbit\"; the second: \"The mission was redesignated Gemini IX-A.\""),
      chronology("June 1", "the ATDA \"was launched from complex 14\"; the Gemini IX-A launch \"was postponed by a ground equipment failure\""),
      chronology("June 3", "the Gemini IX-A mission entry"),
      titans(331, "\"the Gemini IX Atlas and Agena had plunged into the Atlantic Ocean\""),
      titans(339, "\"The extravehicular exercise had lasted for 128 minutes instead of the planned 167\""),
      chronologyTable("A", "\"G.E.T. to touchdown (hr; min; sec)\" row, 72:20:50"),
      nasaMission("Milestones and Mission Overview"),
      alligator("Paragraphs on the original crew, the May 17 Agena failure, and the ATDA"),
    ],
  },

  crew: {
    value: [
      { name: "Thomas P. Stafford", role: "Command pilot" },
      { name: "Eugene A. Cernan", role: "Pilot" },
    ],
    citations: [
      chronology("June 3", "\"crewed by command pilot Astronaut Thomas P. Stafford and pilot Astronaut Eugene A. Cernan\""),
      chronologyTable("A", "Flight crew, Command pilot and Pilot rows, \"Stafford**\" and \"Cernan**\" (\"Stafford and Cernan, backup crew for Gemini 9, became prime crew\")"),
      nasaMission("Mission Facts: \"Original Backup Crew and New Prime Crew: Thomas P. Stafford (Command Pilot) and Eugene A. Cernan (Pilot)\""),
    ],
  },

  launch: {
    value: {
      utc: "1966-06-03T13:39:33.335Z",
      site: "Launch Complex 19, Cape Kennedy, Florida",
      vehicle: "Titan II Gemini Launch Vehicle (GLV-9)",
    },
    citations: [
      nmc("gemini", "Mission Profile: \"Gemini 9A was launched on 3 June from Complex 19 at 8:39:33 a.m. EST (13:39:33.335 UT)\""),
      chronologyTable("A", "Launch vehicle (GLV-9), Launch date (June 3, 1966), and Time (e.s.t.) (8:39:33 a.m.) rows"),
      chronology("June 3", "\"launched from complex 19 at 8:39 a.m., e.s.t.\""),
      nasaMission("Mission Facts: \"Launch Date: Jun. 3, 1966, 8:39:33 a.m. EST (13:39:33 UT)\""),
      transcript("00:00:41, capsule communicator", "Lift-off 13:39:33!", 4),
    ],
    discrepancy:
      "On the Shoulders of Titans (page 332) says the flight began at 8:39:50 a.m. We follow the chronology and NSSDCA, 8:39:33 a.m. EST, which the transcript's \"Lift-off 13:39:33\" (in G.m.t.) and NASA's Gemini IX page repeat.",
  },

  duration: {
    value: "072:20:50",
    citations: [
      chronologyTable("A", "\"G.E.T. to touchdown (hr; min; sec)\" row, 72:20:50"),
      nasaMission("Mission Facts: \"Duration: 72 hours, 20 minutes, 50 seconds\""),
      nmc("gemini", "Mission Profile: \"Total mission elapsed time was 72:20:50.\""),
      titans(340, "\"72 hours, 20 minutes, and 50 seconds after launch\""),
    ],
  },

  accomplishments: [
    {
      text: {
        short: "Stafford and Cernan met their target three times, each time a different way, in less than a day.",
        more:
          "First they caught the ATDA from below, as planned, on their third trip around Earth. Then they backed away and came back using their eyes, a sextant and charts, as if their radar had failed. Last, they let the ATDA fall behind overnight, climbed above it, and came down to meet it from above.",
      },
      citations: [
        chronology("June 3", "rendezvous \"during the third revolution\"; \"an equi-period rendezvous, using onboard optical techniques\"; \"a rendezvous from above\""),
        titans(336, "\"they plotted their position with a sextant and checked the result against a preplanned chart solution\""),
        titans(337, "\"Three types of rendezvous had been completed in less than 24 hours.\""),
        alligator("\"conducting a second rendezvous, pretending their spacecraft's radar didn't work\""),
      ],
    },
    {
      text: {
        short: "The rendezvous from above practiced a move Apollo might need at the Moon: the command module coming down to meet a lunar module flying in a lower orbit.",
        more:
          "NASA's plan for landing on the Moon depended on spacecraft meeting and docking in orbit. On the Shoulders of Titans says the flight's advanced rendezvous maneuvers proved that flight controllers and crews could handle rendezvous techniques that might be used on Apollo.",
      },
      citations: [
        chronology("June 3", "\"a rendezvous from above, simulating the rendezvous of an Apollo command module with a lunar module in a lower orbit\""),
        nmc("gemini", "Mission Profile: \"a rendezvous from above simulating rendezvous of an Apollo command module with a lunar module after abort from the Moon\""),
        titans(341, "\"the advanced rendezvous maneuvers, proving that the flight controllers and crews could handle sophisticated rendezvous techniques that might be applicable to Apollo\""),
        alligator("Opening paragraph: rendezvous and docking were \"required to implement the Lunar Orbit Rendezvous method NASA chose for the Moon landing missions\""),
      ],
    },
    {
      text: {
        short: "Cernan's spacewalk, the longest yet, showed that working outside a spacecraft was much harder than anyone had thought.",
        more:
          "Every move took longer than in training, his suit could not keep up with the work, and his faceplate fogged over. What NASA learned changed how later spacewalks were trained for and flown; for a start, later crews carried a solution to keep their faceplates from fogging.",
      },
      citations: [
        nmc("gemini", "Mission Profile: \"his total time of 2 hours, 8 minutes was the longest spacewalk yet\""),
        titans(337, "\"He was startled to find that everything took longer than he had assumed it would\""),
        titans(338, "footnote: \"future Gemini crews carried an anti-fog solution to be applied immediately before EVA\""),
        alligator("\"The event resulted in many changes to the training for and execution of future spacewalks.\""),
      ],
    },
    {
      text: {
        short: "Gemini 9A landed less than half a mile from its aiming point, the most accurate landing yet for an American spacecraft.",
        more:
          "Showing that a spacecraft could land precisely was one of the flight's main goals. Gemini 9A came down 0.38 nautical mile (0.70 kilometer) from the planned point in the Atlantic Ocean.",
      },
      citations: [
        chronologyTable("A", "\"Landing accuracy (n.m. from planned landing point)\" row, 0.38"),
        titans(340, "\"Gemini IX-A touched down 0.70 kilometers from the planned impact point\""),
        nasaMission("Objectives: \"Primary mission objectives were to demonstrate (1) rendezvous techniques and docking with a target vehicle ..., (2) an extravehicular activity (EVA) to test the Astronaut Maneuvering Unit (AMU), and (3) precision landing capability.\""),
        alligator("\"only 3,000 yards from the aim point, the most precise landing in the U.S. space program up to that time\""),
      ],
      discrepancy:
        "NASA's \"Angry Alligator\" article puts the landing 3,000 yards (1.5 nautical miles) from the aim point. We follow the chronology, 0.38 nautical mile, which On the Shoulders of Titans and NSSDCA (0.7 km) match.",
    },
  ],

  chapters: [
    { id: "launch", title: "Launch and chase" },
    { id: "alligator", title: "The angry alligator" },
    { id: "rendezvous", title: "Two more meetings" },
    { id: "spacewalk", title: "The spacewalk" },
    { id: "home", title: "Coming home" },
  ],

  events: [
    /* ------------------------- Launch and chase ----------------------- */
    {
      id: "liftoff",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00",
      utc: "1966-06-03T13:39:33.335Z",
      text: {
        short: "A Titan II rocket lifts Tom Stafford and Gene Cernan off the pad. Their target has been circling Earth for two days.",
        more:
          "It was the crew's third time strapped in for this flight. On May 17, the Agena target rocket was lost. On June 1, its backup, the ATDA, reached orbit from Launch Complex 14, although its signals hinted that the shroud, the cover over its docking cone, had not come off. That day's Gemini launch was called off when ground equipment could not send updated numbers to the spacecraft's computer. Two days later, at 8:39:33 a.m. Eastern Standard Time on June 3, Gemini 9A lifted off from Launch Complex 19.",
      },
      citations: [
        nmc("gemini", "Mission Profile: \"8:39:33 a.m. EST (13:39:33.335 UT)\""),
        chronologyTable("A", "Launch date and Time (e.s.t.) rows, \"8:39:33 a.m.\""),
        chronology("June 1", "the ATDA \"was launched from complex 14 at 10:00 a.m., e.s.t.\"; the Gemini launch \"was postponed by a ground equipment failure which prevented the transfer of updating information from Cape Kennedy mission control center to the spacecraft computer\""),
        chronology("June 3", "\"launched from complex 19 at 8:39 a.m., e.s.t.\""),
        titans(332, "\"telemetry signals suggested that the launch shroud covering the docking port had only partially opened and had failed to jettison\""),
        alligator("Photo caption: Stafford and Cernan \"strapped into their spacecraft for the third and successful launch attempt on June 3, 1966\""),
        transcript("00:00:01, capsule communicator", "LIFT-OFF!", 3),
      ],
      discrepancy:
        "On the Shoulders of Titans (page 332) gives liftoff as 8:39:50 a.m. We follow the chronology and NSSDCA, 8:39:33 a.m. EST.",
      photo: nasaPhoto(
        "s66-34098",
        743,
        1600,
        "The white-and-black Titan II rocket climbs from its pad on a bright flame beside an orange service tower, with clouds of white smoke spreading out on both sides under a blue sky.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "target-sighted",
      title: "A faint star ahead",
      chapter: "launch",
      elapsed: "003:21:37",
      text: {
        short: "Tom Stafford spots a faint light ahead, like a dim star. It is their target, the ATDA, shining in the sunlight.",
        more:
          "Gemini 9A had reached orbit about 1,060 kilometers (660 miles) behind its target. A firing at 49 minutes raised the low point of its orbit, and at 2 hours 24 minutes 52 seconds another put it in a nearly round orbit about 12 nautical miles (22 kilometers) below the ATDA, slowly gaining on it. \"I've got it in reflected sunlight now as about a 6-magnitude star,\" Stafford reported, about 93 kilometers (58 miles) away. At 3 hours 35 minutes 52 seconds he fired the thrusters to head straight for it: \"We're burning.\"",
      },
      citations: [
        transcript("03:21:37, command pilot", "I've got it. I've got it in reflected sunlight now as about a 6-magnitude star.", 37),
        titans(332, "\"fired the spacecraft thrusters in the chase toward the target vehicle 1060 kilometers ahead\""),
        titans(333, "the firing \"At 49 minutes into the flight\" that raised the perigee; the orbit \"22 kilometers below\" the target and \"closing with it\"; \"At 3:20 hours, the crew caught sight of their goal 93 kilometers away.\""),
        chronologyTable("B", "Coelliptical rendezvous row (revolution 3), Spacecraft Orbital Parameters: apogee 148.0, perigee 145.2 n.m."),
        transcript("02:24:52, pilot", "8, 9, 50, BURN.", 30),
        rendezvousPaper("Table 2-IV, \"Rendezvous Propellant Usage\" (page 18, PDF page 12), first IX-A row: \"Coelliptic: Δh = 12 n. mi.\""),
        transcript("03:35:52, command pilot", "START COMP. We're burning.", 40),
      ],
      discrepancy:
        "NASA's \"Angry Alligator\" article says Gemini 9A trailed the ATDA by 640 miles in orbit and first spotted it 126 miles away. We follow On the Shoulders of Titans, 1,060 kilometers and 93 kilometers.",
      view: "spacecraft",
    },

    /* ------------------------ The angry alligator ---------------------- */
    {
      id: "half-open",
      title: "The jaws are open",
      chapter: "alligator",
      elapsed: "004:12:40",
      text: {
        short: "Up close, the crew sees the problem. The cover over the ATDA's docking cone never came off. It hangs half open.",
        more:
          "Stafford began braking at 4 hours 6 minutes 2 seconds, with moonlight shining on the target. \"Look at that moose!\" he said as it came into view, and then: \"The shroud is half open on that thing!\" The two halves of the fiberglass shroud, the nose cover that protected the docking cone during launch, were spread apart but still attached. \"You could almost knock it off,\" Cernan said. By 4 hours 15 minutes the crew was station keeping, flying beside the ATDA 10 to 30 feet (3 to 9 meters) away.",
      },
      citations: [
        transcript("04:06:02, command pilot", "I've got a START COMP. Brake her down.", 52),
        transcript("04:11:52, command pilot", "Look at that moose!", 55),
        transcript("04:12:40, command pilot", "The shroud is half open. The shroud is half open on that thing!", 56),
        transcript("04:13:16, pilot", "Half open. ... You could almost knock it off!", 57),
        transcript("04:25:26, command pilot", "Okay. Both the clamshells of the nose cones are still on, but they are open wide.", 58),
        transcript("04:27:37, command pilot", "We're stationkeeping to keep it out here between 10 and 30 feet from it.", 58),
        titans(333, "\"Stafford began slowing his spacecraft at 4:06 hours\"; \"The Moon soon became an asset, however, as its rays reflected off the ATDA.\""),
        chronologyTable("B", "first Station keeping row, Ground Elapsed Time \"To begin (hr:min:sec)\" 4:15:00"),
        nmc("atda", "Description: \"Plans to cut the fiber glass shroud loose were considered but discarded\""),
      ],
      discrepancy:
        "On the Shoulders of Titans says the two vehicles were \"only 30 meters apart\" (100 feet) when the braking was completed (page 333), and that Stafford stayed 9 to 12 meters (30 to 40 feet) from the target (page 334). We follow the command pilot's own report in the transcript, 10 to 30 feet.",
      view: "spacecraft",
    },
    {
      id: "angry-alligator",
      title: "An angry alligator",
      chapter: "alligator",
      elapsed: "004:32:42",
      text: {
        short: "Stafford says the ATDA \"looks like an angry alligator.\" With its jaws stuck open, there is no way to dock.",
        more:
          "\"It looks like an angry alligator out here rotating around,\" Stafford radioed. The ATDA was rolling slowly, about 3 to 4 degrees a second, and he flew around it to look it over, at times only centimeters away. The explosive bolts had fired, but two neatly taped-down cords, called lanyards, were holding the shroud on. He wanted to nudge the jaws open with his spacecraft, but Flight Director Gene Kranz told him not to. Controllers tried tightening and loosening the docking cone by radio, but the shroud stayed put. The workers who fitted it had not known what to do with the lanyards, and taped them down.",
      },
      citations: [
        transcript("04:32:42, command pilot", "It looks like an angry alligator out here rotating around.", 61),
        transcript("04:26:33, command pilot", "Okay. It's about 3 to 4 degrees per second.", 58),
        transcript("04:27:59, command pilot", "Roger. It appears that the basic rate is in roll. ... the big rates are in roll.", 58),
        titans(334, "\"He itched to nudge it with his spacecraft docking bar to open its yawning jaws, but Flight Director Kranz told him to control the urge.\"; \"moved to a ticklish position only centimeters away\"; \"the explosive bolts had fired but that two neatly taped lanyards held the clam shell partially in place\"; controllers \"sent signals to the target to tighten and relax the docking cone\"; the crew fixing the shroud \"looked at the dangling straps, wondered what to do with them, then taped them carefully down\""),
        nmc("atda", "Description: \"The shroud had not jettisoned because the lanyards had been installed improperly with the loose ends taped down\""),
      ],
      photo: nasaPhoto(
        "s66-37972",
        1591,
        1600,
        "Seen from Gemini 9A during one of its three meetings, the ATDA floats above Earth's blue curve and white clouds: a silver cylinder topped by a white cone whose two halves are spread apart like open jaws, with a thin rod sticking out from its side.",
      ),
      view: "spacecraft",
      inTour: true,
    },

    /* ------------------------- Two more meetings ----------------------- */
    {
      id: "by-eye",
      title: "Finding it again by eye",
      chapter: "rendezvous",
      elapsed: "006:36:00",
      text: {
        short: "The crew backs away from the ATDA, then finds their way back to it as if their radar had broken, by sighting the target and checking charts.",
        more:
          "At 5 hours 1 minute, Stafford fired the thrusters to move up and away from the ATDA, into an orbit that took the same time to go around Earth as the target's, an equiperiod orbit. In the dark, the crew measured angles to the ATDA with a sextant and checked them against charts worked out before the flight. At about 6 hours 15 minutes, four small firings started them back, and at 6 hours 36 minutes they were beside the ATDA again. The exercise tried out the methods planned for Gemini 10.",
      },
      citations: [
        transcript("05:01:00, pilot", "MARK. The burn.", 67),
        rendezvousPaper("Page 12 (PDF page 6): \"An upward radial velocity change was used to separate the spacecraft from the target vehicle into an equiperiod orbit\"; the purpose was \"to evaluate the optical rendezvous procedures ... required for the dual rendezvous scheduled for Gemini X\""),
        titans(336, "\"they plotted their position with a sextant and checked the result against a preplanned chart solution\"; \"At 6:15 hours, Stafford began a series of four maneuvers to bring the spacecraft back to stationkeeping\""),
        chronology("June 3", "\"an equi-period rendezvous, using onboard optical techniques and completed at 6 hours 36 minutes ground elapsed time\""),
        chronologyTable("B", "second Station keeping row, \"To begin\" 6:36:00"),
        alligator("\"pretending their spacecraft's radar didn't work\""),
      ],
      view: "spacecraft",
    },
    {
      id: "from-above",
      title: "Coming down from above",
      chapter: "rendezvous",
      elapsed: "021:42:00",
      text: {
        short: "The next day, Gemini 9A climbs above the ATDA and comes down to meet it, the way an Apollo command module might go down to meet a lunar module.",
        more:
          "Overnight, Gemini 9A flew a little lower than the ATDA, and so a little faster, and pulled ahead: at about 16 hours, Gemini Control reported it was leading by some 80 nautical miles (148 kilometers). After the crew woke, firings starting at 18 hours 23 minutes lifted it into an orbit about 7.5 nautical miles (14 kilometers) above the target. Seen from above, the ATDA was very hard to find against the bright Earth; the crew lost sight of it at sunrise and followed the radar in. \"We're in position with them,\" Stafford reported at 21 hours 42 minutes. At 22 hours 59 minutes they left the ATDA for good.",
      },
      citations: [
        pao(164, "Gemini Control at 16 hours 11 minutes 10 seconds: \"At this time the spacecraft is leading the target by some 80 nautical miles.\""),
        titans(336, "the spacecraft, \"being nearer Earth, illustrated the paradox of slowing down to go faster\"; \"A phase adjustment at 18:23 hours\""),
        rendezvousPaper("Page 12 (PDF page 6): \"Two midcourse maneuvers were used to insert the spacecraft into a coelliptical orbit 7.5 nautical miles above the target vehicle\"; \"the probability of success would be very low in case of a radar guidance system failure because of the extremely poor target visibility\""),
        transcript("20:54:43, command pilot", "Here comes sunrise and I may lose the ATDA.", 121),
        transcript("20:57:41, command pilot", "No. That's all she wrote.", 122),
        transcript("21:07:45, command pilot", "And we cannot see him against the sunlit ocean below, even though we are down to 12 miles.", 124),
        titans(337, "\"As the Sun rose, however, they lost sight of it completely\"; \"Without the radar, he said, they would 'have blown that rendezvous.'\""),
        transcript("21:42:09, command pilot", "Okay, Carnarvon. We're in position with them.", 128),
        chronologyTable("B", "third Station keeping row, \"To begin\" 21:42:00 and \"Period\" 1:17:00"),
        chronology("June 3", "\"a rendezvous from above, simulating the rendezvous of an Apollo command module with a lunar module in a lower orbit (completed at 21 hours 42 minutes ground elapsed time). Final separation maneuver was performed at 22 hours 59 minutes after liftoff.\""),
      ],
      discrepancy:
        "The 80 nautical miles is a figure from Gemini Control's commentary (\"some 80\"), in a report the commentator signed off \"At 16 hours, 11 minutes and 10 seconds after lift-off\" (PAO transcript, PDF page 164); two hours earlier the commentary gave \"some 50\" (PDF page 162). On the Shoulders of Titans (page 336) says that the next day the spacecraft led its target by 111 kilometers (60 nautical miles), without a time. We give the commentary's figure, as Gemini Control's, because it is the only one tied to a time.",
      view: "spacecraft",
      inTour: true,
    },

    /* --------------------------- The spacewalk ------------------------- */
    {
      id: "spacewalk",
      title: "Out the hatch",
      chapter: "spacewalk",
      elapsed: "049:22:01",
      text: {
        short: "On the third day, Gene Cernan opens his hatch and climbs outside, on a long hose. Moving around turns out to be very hard.",
        more:
          "At 49 hours 22 minutes 1 second Cernan began opening his hatch: \"Okay. We're opening the hatch now.\" Less than a minute later he called \"Hatches open,\" and soon he stood up in the open hatch at sunrise: \"Boy, is it beautiful out there, Tom!\" It was the second American spacewalk and the third by anyone. He was to work his way to the back of the spacecraft and strap on the Astronaut Maneuvering Unit, a rocket backpack. But every move took longer than in training, there were too few handholds, and the umbilical, the 25-foot (7.6-meter) hose that brought him oxygen and radio, kept pushing him around. He called it \"the snake.\"",
      },
      citations: [
        transcript("49:22:01, pilot", "Okay. We're opening the hatch now.", 192),
        transcript("49:22:51, pilot", "Hatches coming open.", 193),
        transcript("49:22:53 or 49:22:54, pilot (the last digit is unclear in the scan's text; the line falls between 49:22:52 and 49:22:55)", "Hatches open.", 193),
        transcript("49:24:39, pilot", "Boy, is it beautiful out there, Tom!", 194),
        transcript("49:42:27, pilot", "Okay. I've got the snake all over me.", 208),
        titans(337, "\"Near sunrise, Cernan cracked his hatch\"; \"He was startled to find that everything took longer than he had assumed it would\""),
        titans(338, "\"even those [handholds] installed on Spacecraft 9 were inadequate\"; \"He constantly referred to the umbilical as the 'snake.'\""),
        alligator("\"the second American spacewalk in history\"; the Astronaut Maneuvering Unit \"backpack\"; \"his 25-foot umbilical that provided primary life support and communications\"; \"his stiff umbilical caused him to move in unwanted directions\""),
        nasaMission("Milestones: \"Eugene Cernan performs a 2 hour, 7 minute spacewalk (third spacewalk in history)\""),
      ],
      discrepancy:
        "The chronology's June 3 entry gives the hatch opening as 49 hours 23 minutes, and NSSDCA as 10:02 a.m. EST (49:22:27, our arithmetic). We follow the transcript: the pilot says they are opening the hatch at 49:22:01 and calls \"Hatches open\" less than a minute later.",
      photo: nasaPhoto(
        "S66-38515",
        1600,
        1600,
        "Gene Cernan in a white spacesuit and helmet floats in black space beside the edge of the spacecraft, light glinting off his visor, his long hose looping through the dark around him.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "back-inside",
      title: "Back inside, fogged in",
      chapter: "spacewalk",
      elapsed: "051:30:23",
      text: {
        short: "Cernan's faceplate fogs over until he can hardly see. The test of a rocket backpack is called off, and he struggles back inside.",
        more:
          "Getting the backpack ready took four to five times more work than expected. Cernan's suit could not carry away his heat and moisture, his heart rate went above 180 beats a minute, and his faceplate fogged. At 51 hours 3 minutes Stafford called it off: \"I'm giving a No-GO for AMU. Pilot's fogged up completely.\" Cernan felt his way back to the hatch, and the two men struggled to close it. \"Okay, Houston. We've got the hatch closed,\" Stafford reported at 51 hours 30 minutes 23 seconds, 2 hours 8 minutes after Cernan's call that they were opening it.",
      },
      citations: [
        transcript("51:03:32, command pilot", "I'm giving a No-GO for AMU. Pilot's fogged up completely.", 235),
        transcript("51:30:23, command pilot", "Okay, Houston. We've got the hatch closed.", 244),
        transcript("49:22:01, pilot", "Okay. We're opening the hatch now. (from this call to 51:30:23 is 2 hours 8 minutes 22 seconds: our arithmetic)", 192),
        nmc("gemini", "Mission Profile: donning the AMU took \"four to five times more work than anticipated\"; \"his total time of 2 hours, 8 minutes\""),
        chronology("June 3", "\"The extravehicular life support system apparently became overloaded with moisture when Cernan had to work harder than anticipated\""),
        alligator("\"his heart rate topped 180 beats per minute—and his helmet's visor fogged up, virtually blinding him\"; \"made his way back to the hatch, more by feel than vision\"; \"his stiff ballooned spacesuit made it difficult for him to close the hatch\""),
        titans(339, "\"Stafford helped Cernan in and, together, they closed the hatch\"; \"The extravehicular exercise had lasted for 128 minutes instead of the planned 167\""),
      ],
      discrepancy:
        "The chronology's June 3 entry says the hatch was opened at 49 hours 23 minutes and closed at 51 hours 28 minutes, 2 hours 5 minutes apart. NASA's \"Angry Alligator\" article and NASA's Gemini IX page give the spacewalk as 2 hours 7 minutes. NSSDCA says Cernan reentered the spacecraft at 12:05 p.m. EST (51:25:27, our arithmetic) and the hatch was closed at 12:10, and the transcript has the command pilot saying \"We got Gene back in the hatch\" at 51:09:03 (page 237). We follow the transcript's calls, from \"We're opening the hatch now\" (49:22:01) to \"We've got the hatch closed\" (51:30:23), which match NSSDCA's 12:10 p.m. and the 128 minutes in On the Shoulders of Titans.",
      view: "spacecraft",
      inTour: true,
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: "retrofire",
      title: "Retrofire",
      chapter: "home",
      elapsed: "071:46:44",
      utc: "1966-06-06T13:26:17Z",
      text: {
        short: "In darkness over the Pacific Ocean, four small rockets fire to slow Gemini 9A down, and it starts falling toward the Atlantic.",
        more:
          "On the 45th trip around Earth, the equipment section at the back of the spacecraft was cast off, and at 71 hours 46 minutes 44 seconds retrofire began, the engine firing that starts the trip home. \"4 good Retros,\" Cernan reported. Then the section that had held the retrorockets was dropped too. Plunging into the air, the spacecraft was wrapped in a glowing sheath of hot gas that cut off radio contact for a while. \"What a fireball!\" Cernan said.",
      },
      citations: [
        chronologyTable("A", "Retrofire & reentry, \"G.E.T. to retrofire (hr; min; sec)\" row, 71:46:44; At retrofire, Revolution row, 45"),
        nmc("gemini", "Mission Profile: \"Retrofire occurred at the end of the 45th revolution on 6 June at 8:26:17 a.m. EST.\" (UTC is our conversion)"),
        transcript("71:45:48, pilot", "There's OAMS; there's Electric; and here goes Adapter. Wow! That went all right.", 330),
        transcript("71:46:44, capsule communicator", "RETROFIRE!", 330),
        transcript("71:47:09, pilot", "4 good Retros.", 330),
        transcript("71:47:57, pilot", "Okay. Retro jettison armed. Retro-Jett was pushed and we got RETRO JETT.", 331),
        transcript("72:12:00, pilot", "Boy! What a fireball, Whew!", 341),
        alligator("\"In darkness over the Pacific Ocean east of Hawaii, the astronauts fired Gemini IX's retrorockets\"; \"the plasma created formed a sheath around the capsule that temporarily cut off communications with the ground\""),
      ],
      view: "spacecraft",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "home",
      elapsed: "072:20:50",
      utc: "1966-06-06T14:00:23Z",
      text: {
        short: "Gemini 9A splashes down in the Atlantic Ocean, close to the aircraft carrier USS Wasp, which is waiting to pick it up.",
        more:
          "The main parachute was out by 72 hours 17 minutes 22 seconds, and Gemini 9A landed 72 hours 20 minutes 50 seconds after liftoff, at 9:00:23 a.m. Eastern Standard Time on June 6, less than half a mile from its aiming point. Stafford and Cernan stayed inside while the Wasp lifted the spacecraft aboard, 53 minutes after landing. Cernan had lost more than 13 pounds (6 kilograms) during the flight, much of it from the hard work of his spacewalk.",
      },
      citations: [
        transcript("72:17:22, pilot", "Gemini IX. We're on the main chute at this time.", 344),
        chronologyTable("A", "\"G.E.T. to touchdown\" row, 72:20:50; \"Landing accuracy\" row, 0.38; Recovery, Ship \"Wasp\""),
        nasaMission("Mission Facts: \"Landing Date: Jun. 6, 1966, 9:00:23 a.m. EST (14:00:23 UT)\" and \"Landing Site: Western Atlantic Ocean, 27.87° N 75.00° W\""),
        chronology("June 3", "\"The spacecraft landed within a mile of the primary recovery ship, the aircraft carrier Wasp. The crew remained with the spacecraft, which was hoisted aboard 53 minutes after landing.\""),
        titans(340, "\"They were close enough to raise their arms and thumb a ride on the Wasp. Stafford and Cernan stayed in their spacecraft until it was hoisted onto the ship's deck.\""),
        alligator("\"Doctors discovered that Cernan had lost more than 13 pounds during the three-day spaceflight, much of it due to dehydration brought on by his exertions during the spacewalk.\""),
      ],
      discrepancy:
        "The transcript logs the pilot's \"SPLASHDOWN!\" at 72:20:43 (page 347), and NASA's photo caption gives a 72-hour 21-minute flight. NASA's \"Angry Alligator\" article says the spacecraft was hoisted aboard 51 minutes after landing. We follow the chronology. How far the spacecraft came down from the carrier is given three ways: within a mile (the chronology's June 3 entry), within three miles (the \"Angry Alligator\" article), and 3.5 miles (NASA's caption for photo S66-34115); none says how it was measured, so the text gives no number. The 0.38 nautical mile is a different measure, the distance from the planned landing point (Appendix 1, Table A).",
      photo: nasaPhoto(
        "s66-34115",
        1280,
        1600,
        "The small, dark Gemini 9A spacecraft hangs under its big red-and-white striped main parachute just above the rippled blue Atlantic Ocean.",
      ),
      view: "earth",
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: "Gemini IX spacecraft",
        museum: "Kennedy Space Center Visitor Complex",
        place: "Kennedy Space Center, Florida",
      },
      citations: [
        alligator("Closing paragraphs: \"The Gemini IX spacecraft is on display at KSC's Visitor Complex.\" and the photo caption \"The Gemini IX capsule on display at KSC's Visitor Complex\"; KSC is \"NASA's Kennedy Space Center (KSC) in Florida\""),
        { source: "gemini-9a-nasm-capsule", locator: "\"NASA transferred the Gemini 9-A spacecraft to the Smithsonian in 1967.\" Display Status: \"This object is not on display at the National Air and Space Museum. It is either on loan or in storage.\"" },
      ],
    },
  ],
};
