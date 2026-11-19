/**
 * Gemini 5 (NASA wrote it "Gemini V"): the eight-day endurance flight,
 * August 21-29, 1965.
 *
 * Every event time is copied from the Gemini Program Mission Report for
 * Gemini V (MSC-G-R-65-4, October 1965), the canonical source for this
 * mission: elapsed times exactly as its Table 4.2-I ("Sequence of Events")
 * prints the actual times. Moments that table does not list come from other
 * sections of the same report, named in each citation. Where another source
 * gives a different value, the `discrepancy` field says what it gives; we
 * follow the mission report. No NASA or Internet Archive copy of the report
 * was found, so the source registry links to the scan of the NASA report in
 * the Virtual AGC project's library at ibiblio.org. Each citation gives the
 * report's printed page and then the scan's PDF page.
 *
 * Elapsed times are ground elapsed time (g.e.t.), counted from Gemini V's
 * lift-off at 13:59:59.518 G.m.t. (Table 4.2-I and section 4.1). Where a
 * source gives a time only to the minute, seconds are written as 00 and the
 * citation says so.
 *
 * Universal times are given only where a source states them. The retrofire
 * UTC is NASA's Gemini V page's 7:27:42 a.m. EST plus five hours, our
 * arithmetic.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers,
 * feet to meters, kilograms to pounds) are our arithmetic on the cited
 * values.
 *
 * The flight path itself (orbit, retrofire, splashdown point) is described
 * in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const CHRONOLOGY_1965 = "https://www.nasa.gov/history/SP-4002/p3a.htm";
const NMC_GEMINI = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-068A";

/** Printed pages of the mission report and the scan's PDF pages, for the pages cited here. */
const PDF_PAGE: Record<string, number> = {
  "1-1": 30,
  "1-2": 31,
  "2-1": 32,
  "2-2": 33,
  "4-1": 62,
  "4-2": 63,
  "4-3": 64,
  "4-4": 65,
  "4-5": 66,
  "4-6": 67,
  "4-7": 68,
  "4-10": 71,
  "4-11": 72,
  "4-15": 76,
  "4-16": 77,
  "4-17": 78,
  "4-18": 79,
  "4-20": 81,
  "4-21": 82,
  "4-22": 83,
  "4-23": 84,
  "5-68": 171,
  "5-69": 172,
  "5-111": 214,
  "6-14": 261,
  "6-15": 262,
  "6-24": 271,
  "6-25": 272,
};

/** "page 4-2, PDF page 63" or "pages 4-2 and 4-3, PDF pages 63 and 64". */
function pages(...printed: string[]): string {
  const pdf = printed.map((page) => {
    const n = PDF_PAGE[page];
    if (n === undefined) throw new Error(`No PDF page recorded for printed page ${page}`);
    return n;
  });
  return printed.length === 1
    ? `page ${printed[0]}, PDF page ${pdf[0]}`
    : `pages ${printed.join(" and ")}, PDF pages ${pdf.join(" and ")}`;
}

/** A row of the mission report's Table 4.2-I, the sequence of events, quoted as printed. */
function sequence(row: string, page: "4-10" | "4-11"): Citation {
  return {
    source: "gemini-5-mission-report",
    locator: `Table 4.2-I, "Sequence of Events" (${pages(page)}), row "${row}", actual time`,
  };
}

/** A section or table of the mission report. */
function report(section: string, ...printed: string[]): Citation {
  return { source: "gemini-5-mission-report", locator: `${section} (${pages(...printed)})` };
}

const SUMMARY = (...printed: string[]): Citation => report('Section 1.0, "Mission Summary"', ...printed);
const ACTUAL_MISSION = (...printed: string[]): Citation => report('Section 4.1, "Actual Mission"', ...printed);

/** An entry of Project Gemini: A Chronology, Part III (A), 1965. */
function chronology(entry: string): Citation {
  return { source: "gemini-chronology", locator: `Part III (A), ${entry}`, url: CHRONOLOGY_1965 };
}

/** The NSSDCA Master Catalog page for Gemini 5. */
function nmc(section: string): Citation {
  return { source: "nssdca-master-catalog", locator: `"Gemini 5" (1965-068A), ${section}`, url: NMC_GEMINI };
}

/** NASA's Gemini V mission page. */
function nasaMission(section: string): Citation {
  return { source: "nasa-gemini-v-mission", locator: section };
}

/** NASA's article "55 Years Ago: Gemini 5 Sets a New Record". */
function fiftyFive(section: string): Citation {
  return { source: "nasa-gemini-5-55-years", locator: section };
}

/** The Smithsonian's page for the Gemini V capsule. */
function nasm(section: string): Citation {
  return { source: "nasm-gemini-v-capsule", locator: section };
}

/** On the Shoulders of Titans, chapter XI, "Pillars of Confidence" (PDF page = printed page + 21). */
function titans(page: number, quote: string): Citation {
  return {
    source: "on-the-shoulders-of-titans",
    locator: `Chapter XI, "Pillars of Confidence", page ${page} (PDF page ${page + 21}): ${quote}`,
  };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-5/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-5/${nasaId.toLowerCase()}.jpg`,
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
  id: "gemini-5",
  program: "gemini",
  name: "Gemini 5",
  kind: "flight",
  destination: "earth-orbit",

  summary: {
    text: {
      short:
        "Gemini 5 stayed in orbit for almost eight days in August 1965, about as long as a trip to the Moon and back. Gordon Cooper and Pete Conrad set a new record, even after trouble with their spacecraft's new power supply.",
      more:
        "Gemini 5 lifted off from Cape Kennedy, Florida, on August 21, 1965. It was the first American spacecraft to make its electricity with fuel cells, which combine hydrogen and oxygen and make water as they work. On the first day, the pressure in the oxygen tank feeding the fuel cells fell, and the crew powered down and gave up a planned exercise with a small pod they had released. The pressure held, and the flight went on. On the third day, Cooper and Conrad practiced the firings for a rendezvous with an imaginary target. They circled Earth 120 times and splashed down in the Atlantic Ocean on August 29, 190 hours 55 minutes 14 seconds after liftoff.",
    },
    citations: [
      SUMMARY("1-1", "1-2"),
      ACTUAL_MISSION("4-1", "4-2"),
      sequence("Landing", "4-11"),
      chronology("August 21, 1965: the Gemini 5 mission entry"),
      nasaMission("Mission Facts: \"Revolutions Completed: 120\" and \"Duration: 190 hours, 55 minutes, 14 seconds\""),
      nasm("Object description: \"the crew circled the Earth 120 times\" and \"the first U.S. space mission to carry fuel cells\""),
      fiftyFive("Paragraph on Gemini 5's goals: fuel cells \"that produced electricity by combining hydrogen and oxygen, creating water as a byproduct\""),
    ],
  },

  crew: {
    value: [
      { name: "L. Gordon Cooper, Jr.", role: "Command pilot" },
      { name: "Charles Conrad, Jr.", role: "Pilot" },
    ],
    citations: [
      SUMMARY("1-1"),
      nasaMission("Mission Facts: \"Crew: L. Gordon Cooper Jr. (Command Pilot) and Charles “Pete” Conrad Jr. (Pilot)\""),
      chronology("August 21, 1965: \"command pilot Astronaut L. Gordon Cooper, Jr., and pilot Astronaut Charles Conrad, Jr.\""),
    ],
  },
  crewPhoto: nasaPhoto(
    "S65-46990",
    1190,
    1200,
    "Charles Conrad, Jr., left, and L. Gordon Cooper, Jr., right, grin in white spacesuits without their helmets, standing in front of a red launch tower at Cape Kennedy under a blue sky.",
  ),

  launch: {
    value: {
      utc: "1965-08-21T13:59:59.518Z",
      site: "Launch Complex 19, Cape Kennedy, Florida",
      vehicle: "Titan II Gemini Launch Vehicle (GLV-5)",
    },
    citations: [
      sequence("Lift-off (pad disconnect separation) (13:59:59.518 G.m.t.)", "4-10"),
      ACTUAL_MISSION("4-1"),
      SUMMARY("1-1"),
      { source: "gemini-5-mission-report", locator: 'Section 3.2, "Gemini Launch Vehicle" (page 3-25, PDF page 58): "the Gemini launch vehicle (GLV-5)"' },
      nasaMission("Mission Facts: \"Launch Date: Aug. 21, 1965, 8:59:59 a.m. EST (13:59:59 UT)\", Launch Site, and Launch Vehicle"),
    ],
  },

  duration: {
    value: "190:55:14",
    citations: [
      sequence("Landing", "4-11"),
      nasaMission("Mission Facts: \"Duration: 190 hours, 55 minutes, 14 seconds (7 days, 22 hours, 55 minutes, 14 seconds)\""),
      nmc("Mission Profile: \"a total mission time of 190:55:14\""),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          "Gemini 5 showed that astronauts and their spacecraft could last eight days in space, about the time a trip to the Moon and back would take.",
        more:
          "Project Gemini had to prove the skills NASA needed to land on the Moon, and one was staying in space long enough for the whole trip. The crew's heart rates dropped in weightlessness and leveled off by the fourth day, then returned to normal by their second day back on Earth. In his report for the President, Hugh Dryden wrote that the flight \"duplicated the period required for the manned lunar exploration mission.\"",
      },
      citations: [
        fiftyFive("Opening paragraph: Gemini had to ensure \"that spacecraft and astronauts could function for at least eight days, considered the minimum time for a roundtrip mission to the Moon\""),
        titans(263, "Dryden's report for the President, \"This milestone duplicated the period required for the manned lunar exploration mission\", and the crew's heartbeat rates"),
        report('Section 2.0, "Introduction", primary objectives (b) and (c)', "2-1"),
        SUMMARY("1-1"),
      ],
    },
    {
      text: {
        short:
          "Gemini 5 became the longest crewed spaceflight up to that time, beating a record set by a Soviet cosmonaut two years before.",
        more:
          "At 119 hours 6 minutes, Gemini 5 passed the time Valeri Bykovski had spent in orbit aboard Vostok 5. By landing, Cooper and Conrad had spent more time in space than all earlier American flights put together.",
      },
      citations: [
        fiftyFive("\"At 119 hours and six minutes into the flight, Gemini 5 became the longest crewed space mission, surpassing the mark set by Soviet cosmonaut Valeri I. Bykovski aboard Vostok 5 just two years earlier\" and \"Gemini 5 would spend more time in space than all previous American missions combined\""),
        nasm("Object description: \"Gemini 5 set a new human spaceflight endurance record, exceeding the Soviet record of 5 days\""),
      ],
    },
    {
      text: {
        short:
          "It was the first American spacecraft to get its electricity from fuel cells, which make power by combining hydrogen and oxygen.",
        more:
          "The flight was too long to rely on batteries alone. Trouble with the fuel cells' oxygen supply nearly ended the flight on its first day, but the fuel cells kept working, and testing them under real flight loads was one of the mission's goals.",
      },
      citations: [
        nasm("Object description: \"the first U.S. space mission to carry fuel cells, but their weak performance almost forced an early termination of the flight\""),
        fiftyFive("Paragraph on Gemini 5's goals: \"the spacecraft could no longer rely on just batteries for power but instead used fuel cells\""),
        report('Section 2.0, "Introduction", second-order objective (b), "Evaluate the performance of the fuel cell under flight electrical load conditions"', "2-2"),
        report('Section 5.1.7.2, "Reactant supply system"', "5-68", "5-69"),
      ],
    },
    {
      text: {
        short:
          "Cooper and Conrad practiced the engine firings for meeting another spacecraft in orbit, using an imaginary target, and showed the method worked.",
        more:
          "It was the first time the middle steps of a rendezvous had been flown in space. Ground tracking showed the practice rendezvous would have brought Gemini 5 within 0.3 mile of a real Agena target rocket, and mission planners came away ready for Gemini VI, planned as the first rendezvous with an Agena.",
      },
      citations: [
        SUMMARY("1-2"),
        report('Section 4.3.1.2.2, "Simulated rendezvous": the maneuvers were flown "to evaluate the techniques to be used for the first Gemini-Agena rendezvous mission", and "This is the first time rendezvous midcourse maneuvers have been attempted."', "4-15", "4-16"),
        titans(258, "\"Doubts about being able to accomplish rendezvous faded, and the mission planners were confident and ready for Gemini VI.\""),
        fiftyFive("\"Cooper and Conrad conducted four engine burns to simulate the rendezvous profile planned for the Gemini 6 mission\""),
      ],
    },
  ],

  chapters: [
    { id: "launch", title: "Launch" },
    { id: "power", title: "The power scare" },
    { id: "eight-days", title: "Eight days in orbit" },
    { id: "home", title: "Coming home" },
  ],

  events: [
    /* ----------------------------- Launch ---------------------------- */
    {
      id: "liftoff",
      handsOn: "stages",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00",
      utc: "1965-08-21T13:59:59.518Z",
      text: {
        short:
          "A Titan II rocket lifts Gemini 5 off the pad at Cape Kennedy, with Gordon Cooper and Pete Conrad aboard. They plan to stay in space for eight days.",
        more:
          "Liftoff came on August 21, 1965, at 8:59:59 a.m. Eastern Standard Time, less than half a second earlier than planned. A first try two days before had been called off when a computer problem and thunderstorms stopped the countdown. Cooper had designed a mission patch with a covered wagon on it, for a long journey.",
      },
      citations: [
        sequence("Lift-off (pad disconnect separation) (13:59:59.518 G.m.t.)", "4-10"),
        ACTUAL_MISSION("4-1"),
        SUMMARY("1-1"),
        nasaMission("Mission Facts: \"Launch Date: Aug. 21, 1965, 8:59:59 a.m. EST (13:59:59 UT)\""),
        chronology("August 19, 1965: the countdown hold and scrub, \"rescheduled for August 21\""),
        fiftyFive("Paragraph on the patch: \"a Conestoga covered wagon to symbolize the long journey\""),
      ],
      photo: nasaPhoto(
        "S65-28694",
        1223,
        1600,
        "A white-and-black Titan II rocket marked United States climbs away from a red launch tower on a short flame, with orange-tinted smoke billowing across the pad under a blue sky.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "in-orbit",
      title: "In orbit",
      chapter: "launch",
      elapsed: "000:05:56.91",
      text: {
        short:
          "About six minutes after liftoff, Gemini 5 separates from its rocket and is in orbit, circling Earth between about 101 and 217 miles up.",
        more:
          "The second stage shut down 5 minutes 33.28 seconds after liftoff, and the spacecraft separated 23.6 seconds later. The report called it the most accurate insertion into orbit yet in the Gemini program: 87.4 by 188.9 nautical miles (162 by 350 kilometers). At 56 minutes, the crew fired the thrusters to raise the orbit's low point to 92.4 nautical miles (about 106 miles, or 171 kilometers).",
      },
      citations: [
        sequence("SECO (stage II engine shutdown (91FS2))", "4-10"),
        sequence("Spacecraft separation (shape charge fired)", "4-11"),
        sequence("Perigee adjust maneuver initiate", "4-11"),
        ACTUAL_MISSION("4-1"),
        SUMMARY("1-1"),
        report('Table 4.3-II, "Comparison of Orbital Elements", revolutions "Insertion" and "2 (after perigee adjust)", apogee and perigee, actual final column', "4-20"),
      ],
      view: "earth",
    },

    /* ------------------------- The power scare ------------------------ */
    {
      id: "pod-released",
      title: "The pod goes out",
      chapter: "power",
      elapsed: "002:07:15",
      text: {
        short:
          "The crew releases a small pod from the back of the spacecraft and tracks it with radar, practicing for a meeting with a target. Then they notice a problem with their power supply.",
        more:
          "The pod weighed about 76 pounds (34.5 kilograms) and was a stand-in for the Agena target rockets planned for later flights. It drifted out to 7,721 feet (2,353 meters) away. But the pressure in the oxygen tank that fed the fuel cells was falling: a heater in the tank had failed 25 minutes 51 seconds after liftoff. Out of radio range of the ground and afraid the fuel cells might stop, Cooper powered the spacecraft down, and the exercise with the pod was given up.",
      },
      citations: [
        sequence("REP ejection maneuver initiate", "4-11"),
        ACTUAL_MISSION("4-2"),
        SUMMARY("1-1"),
        report('Section 5.1.7.2, "Reactant supply system": the heater circuit failed "at 25 minutes 51 seconds g.e.t."', "5-68"),
        nasaMission("Mission Overview: \"The rendezvous evaluation pod (REP), a 34.5 kg optical and electronic duplicate of the Agena\""),
        fiftyFive("\"the astronauts commanded the ejection of the Rendezvous Evaluation Pod (REP) from the aft Adaptor Section\""),
        titans(257, "\"Gemini V was out of communications range\" and \"he reluctantly elected to power down\""),
      ],
      discrepancy:
        "On the Shoulders of Titans says the pod was ejected at 2 hours 13 minutes. We follow the mission report's Table 4.2-I, 02:07:15.",
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "pressure-holds",
      title: "The pressure holds",
      chapter: "power",
      elapsed: "004:22:00",
      text: {
        short:
          "The oxygen pressure finally stops falling. Engineers find that the fuel cells can still make enough electricity, so Gemini 5 can stay in space.",
        more:
          "At about 4 hours 22 minutes, the pressure leveled off at about 70 pounds per square inch, down from 853 when the heater failed. While the spacecraft drifted with most equipment off, flight controllers decided the flight could go on, and on the seventh revolution the crew began slowly turning equipment back on. From then on, the flight plan was rewritten as the flight went along.",
      },
      citations: [
        report('Section 5.1.7.2.1, "RSS oxygen": stabilization "at approximately 70 psia around 4 hours 22 minutes g.e.t." (time given to the minute; seconds written as 00)', "5-68", "5-69"),
        ACTUAL_MISSION("4-2"),
        SUMMARY("1-1"),
        chronology("August 21, 1965: the pressure \"stabilized at 70 psia at 4 hours 22 minutes\""),
        titans(257, "\"Kraft decided Cooper and Conrad could fly for at least one day\""),
      ],
      discrepancy:
        "NASA's Gemini V page and NSSDCA give the lowest pressure as 65 psia, and On the Shoulders of Titans says the pressure stabilized at 71 pounds during the fourth revolution. We follow the mission report's section 5.1.7.2.1, about 70 psia around 4 hours 22 minutes, which the Gemini chronology also gives.",
      view: "earth",
    },

    /* ------------------------ Eight days in orbit ---------------------- */
    {
      id: "phantom-rendezvous",
      title: "Chasing an imaginary target",
      chapter: "eight-days",
      elapsed: "050:49:57",
      text: {
        short:
          "On the third day, Cooper and Conrad chase a target that is not really there: an imaginary Agena rocket. Four engine firings put Gemini 5 exactly where the chase called for.",
        more:
          "Flight controllers worked out the orbit of a make-believe Agena and radioed the numbers up, just as they would for a real target. Starting at 50 hours 49 minutes 57 seconds, the crew made four firings, the last starting 2 hours 14 minutes 7 seconds after the first and lasting 22.5 seconds: one to lower the orbit's high point, one to change their timing, one sideways to match the target's orbit, and a last one to settle into an orbit that kept a steady 15-nautical-mile difference in height from the target's.",
      },
      citations: [
        sequence("Height adjustment initiate", "4-11"),
        sequence("Phase adjustment initiate", "4-11"),
        sequence("Plane change initiate", "4-11"),
        sequence("Coelliptic maneuver initiate", "4-11"),
        report('Table 4.3-IV, "Rendezvous Maneuvers", actual column', "4-23"),
        ACTUAL_MISSION("4-3", "4-4"),
        report('Section 4.3.1.2.2, "Simulated rendezvous": "the spacecraft was in the planned coelliptic orbit with a 15-nautical-mile differential altitude"', "4-15", "4-16"),
        titans(258, "the \"phantom rendezvous\": \"the flight controllers would pass information to the crew, just as though the target vehicle really existed\" and Cooper brought \"his spacecraft to the exact position Kraft had asked for\""),
      ],
      discrepancy:
        "Table 4.3-IV of the mission report gives the first firing as 50:49:57 in its ground-directed column and 50:49:58 in its actual column. We follow the sequence of events, Table 4.2-I, 50:49:57.",
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "record",
      title: "A new record",
      chapter: "eight-days",
      elapsed: "119:06:00",
      text: {
        short:
          "Gemini 5 has now been in space longer than any crew before. But some of the small thrusters that turn the spacecraft have started to fail.",
        more:
          "The record came at 119 hours 6 minutes, when Gemini 5 passed the flight of Soviet cosmonaut Valeri Bykovski aboard Vostok 5. At about 118 hours, the crew had reported that the maneuvering thrusters were sluggish and that thruster 7 no longer worked, and thruster 8 failed early on the sixth day. For the rest of the flight the spacecraft mostly drifted, and the crew fired the thrusters only to stop it from turning too fast.",
      },
      citations: [
        fiftyFive("\"At 119 hours and six minutes into the flight, Gemini 5 became the longest crewed space mission, surpassing the mark set by Soviet cosmonaut Valeri I. Bykovski aboard Vostok 5\" (time given to the minute; seconds written as 00)"),
        nasm("Object description: \"Gemini 5 set a new human spaceflight endurance record\""),
        ACTUAL_MISSION("4-5"),
        titans(259, "\"Two thrusters had now stopped. The spacecraft drifted for the rest of the mission, with Cooper only turning on the system occasionally to stop excessive tumbling.\""),
      ],
      photo: nasaPhoto(
        "s65-45683",
        1600,
        1600,
        "Pete Conrad, wearing his spacesuit helmet, looks into the camera from inside the cramped Gemini 5 cabin, with a bright window behind him. Gordon Cooper took the picture at some point during the flight.",
      ),
      view: "spacecraft",
      inTour: true,
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: "retrofire",
      title: "Retrofire",
      chapter: "home",
      elapsed: "190:27:43",
      utc: "1965-08-29T12:27:42Z",
      text: {
        short:
          "In darkness near Hawaii, four small rockets fire one after another to slow Gemini 5 down, and it starts to fall toward the Atlantic Ocean.",
        more:
          "Retrofire, the engine firing that starts the trip home, came exactly on time, at 190 hours 27 minutes 43 seconds. Flight controllers had moved the landing one revolution earlier to stay clear of bad weather from Hurricane Betsy. Just before retrofire, the equipment section at the back of the spacecraft was cast off; just after, the section that had held the retrorockets was dropped too, uncovering the heat shield.",
      },
      citations: [
        sequence("Initiate retrorocket 1", "4-11"),
        sequence("Equipment adapter separation", "4-11"),
        sequence("Retroadapter separate", "4-11"),
        SUMMARY("1-2"),
        ACTUAL_MISSION("4-6"),
        report('Section 6.3.2, "Location and Retrieval": landing area 121-1 "rather than the planned 122-1 area, because of expected poor weather conditions associated with Hurricane Betsy"', "6-24"),
        titans(260, "\"In the darkness near Hawaii, on the morning of 29 August, at 190 hours 27 minutes 43 seconds, the first retrorocket went off\""),
        fiftyFive("\"in darkness over Hawaii, Cooper and Conrad fired Gemini 5's retrorockets\""),
        nasaMission("Mission Overview: retrofire \"at 7:27:42 a.m. EST on Aug. 29\" (UTC is our conversion)"),
        nmc("Reentry: \"The retrorocket module would then be jettisonned, exposing the heat shield\""),
      ],
      discrepancy:
        "NASA's Gemini V page and NSSDCA say retrofire was made on revolution 120, and the Gemini chronology says the 121st revolution; the mission report says the landing was in the planned area for revolution 121. The text does not number the revolution.",
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "home",
      elapsed: "190:55:14",
      utc: "1965-08-29T12:55:13Z",
      text: {
        short:
          "Gemini 5 splashes down gently in the Atlantic Ocean after almost eight days in space. A mistake in numbers sent up from the ground makes it land about 102 miles short of its target.",
        more:
          "The drogue parachute came out early, at 69,000 feet (about 21,000 meters) instead of the usual 50,000, and the main parachute came out at 10,600 feet (about 3,230 meters). Gemini 5 landed 89 nautical miles (165 kilometers) short of the planned point. The ground had sent the spacecraft's computer a wrong starting position, because the number of days since launch was left out of one calculation. Cooper saw that the computer's readings did not make sense and steered by a backup method, which brought the spacecraft down closer to the ship than it would otherwise have landed.",
      },
      citations: [
        sequence("Drogue parachute deployment", "4-11"),
        sequence("Pilot parachute deployment/main parachute initiate", "4-11"),
        sequence("Landing", "4-11"),
        report('Section 5.1.11, "Landing System": the drogue was "inadvertently deployed at an altitude of 69 000 feet instead of the normal altitude of 50 000 feet"', "5-111"),
        ACTUAL_MISSION("4-6"),
        report('Section 4.3.1.3, "Reentry": "The actual landing point was 89 nautical miles short of the predicted landing point."', "4-17"),
        report('Section 6.2.2.2.1: "The 7.89° error resulted from an omission of the elapsed number of days in the G.m.t. of retrofire term."', "6-14", "6-15"),
        titans(262, "\"Cooper's efforts to compensate for what he recognized as an erroneous reading had brought them down closer to the ship than they would otherwise have been\""),
        nasaMission("Mission Facts: \"Landing Date: Aug. 29, 1965, 7:55:13 EST (12:55:13 UT)\""),
      ],
      discrepancy:
        "For how far short Gemini 5 landed, NASA's Gemini V page and NSSDCA give 169 km, NASA's 55-years article 98 miles, and On the Shoulders of Titans 130 kilometers; we follow section 4.3.1.3 of the mission report, 89 nautical miles. The 55-years article puts the drogue at 39,000 feet and On the Shoulders of Titans at 20,000 meters; we follow section 5.1.11, 69,000 feet. On the Shoulders of Titans says the error was an Earth rotation rate entered as 360 degrees a day instead of 360.98; we follow the mission report's section 6.2.2.2.1, which says the program used 360.98 degrees and the number of elapsed days was left out.",
      photo: nasaPhoto(
        "s65-51653",
        1200,
        788,
        "Seen from above, the dark Gemini 5 spacecraft floats in a sparkling blue sea inside a yellow flotation collar. An astronaut in a white suit steps from the spacecraft onto a yellow raft, while two other men stand at the open hatch.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "on-the-carrier",
      title: "Aboard the carrier",
      chapter: "home",
      elapsed: "192:26:00",
      text: {
        short:
          "A helicopter carries Cooper and Conrad to the aircraft carrier USS Lake Champlain. After eight days in space, both have stubbly beards and are in excellent health.",
        more:
          "Swimmers dropped from a helicopter fastened a flotation collar around the spacecraft. The crew climbed out through the left hatch and rode the helicopter to the carrier, landing on its deck 192 hours 26 minutes after liftoff. The carrier lifted Gemini 5 aboard at 194 hours 50 minutes. A healthy crew after eight days gave NASA new confidence that astronauts could make the trip to the Moon.",
      },
      citations: [
        report('Section 6.3.2, "Location and Retrieval": "The recovery helicopter landed aboard the carrier (U.S.S. Lake Champlain) at 192 hours 26 minutes g.e.t." (given to the minute; seconds written as 00)', "6-24"),
        ACTUAL_MISSION("4-7"),
        SUMMARY("1-1"),
        chronology("August 21, 1965: \"The astronauts arrived on board the prime recovery ship, the aircraft carrier Lake Champlain, at 9:25. The spacecraft was recovered at 11:51 a.m.\""),
        titans(262, "\"A helicopter soon arrived over the spacecraft and three swimmers dropped into the water\" and \"he and Conrad rode the helicopter to the Lake Champlain\""),
        titans(263, "\"A safe landing and healthy crew after an eight-day space voyage increased NASA's confidence in achieving its lunar-landing goal\""),
        fiftyFive("Photo caption: \"Conrad, left, and Cooper compare their 8-day beards on the deck of the USS Lake Champlain\""),
      ],
      discrepancy:
        "NASA's Gemini V page and NSSDCA give 9:26 for the crew's arrival and 11:50 for the spacecraft's recovery, and the Gemini chronology 9:25 and 11:51 a.m. (EST). We follow the mission report's ground elapsed times, 192 hours 26 minutes and 194 hours 50 minutes.",
      photo: nasaPhoto(
        "s65-46638",
        1360,
        1360,
        "On the carrier's deck, a grinning Pete Conrad in a white spacesuit and sunglasses tugs at Gordon Cooper's stubbly eight-day beard, while sailors and photographers crowd behind them under a blue sky.",
      ),
      view: "earth",
    },
  ],

  whereNow: [
    {
      value: {
        object: "Gemini V spacecraft",
        museum: "Space Center Houston",
        place: "Houston, Texas",
      },
      citations: [
        { source: "space-center-houston-starship-gallery", locator: "\"Top Starship Gallery Attractions\": \"Gemini V\"" },
        fiftyFive("Last paragraph: \"The Gemini 5 capsule is currently on display at Space Center Houston.\""),
        nasm("\"In 1967 NASA transferred Gemini 5 to the Smithsonian Institution, but it has been on exhibit in Houston since before that time.\" Display Status: \"not on display at the National Air and Space Museum\""),
      ],
    },
  ],
};
