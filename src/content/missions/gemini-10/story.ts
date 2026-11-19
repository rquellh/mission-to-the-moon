/**
 * Gemini 10 (NASA wrote it "Gemini X"): a docking, a ride on the Agena's
 * engine to a record height, and a second rendezvous with the Agena left in
 * orbit by Gemini 8, July 18-21, 1966.
 *
 * Every event time is copied from the Gemini Program Mission Report for
 * Gemini X (MSC-G-R-66-7, August 1966), the canonical source for this
 * mission: elapsed times exactly as its Table 4-II ("Sequence of Events for
 * Gemini Spacecraft Orbital and Reentry Phases") prints the actual times.
 * Moments that table does not list come from other sections of the same
 * report, named in each citation. Where another source gives a different
 * value, the `discrepancy` field says what it gives; we follow the mission
 * report. Each citation gives the report's printed page and then the PDF's
 * page.
 *
 * Elapsed times are ground elapsed time (g.e.t.), counted from Gemini X's
 * lift-off at 22:20:26.648 G.m.t. (Table 4-I and section 4.1). Where a
 * source gives a time only to the minute, seconds are written as 00 and the
 * citation says so.
 *
 * The Agena target vehicle was launched first, at 20:39:46.131 G.m.t.
 * (Table 4-III). Its time on the mission clock, -001:40:40.517, is our
 * subtraction of the two lift-off times; section 4.1 states the same gap,
 * "One hour, 40 minutes, and 40.517 seconds".
 *
 * Universal times are given only where a source states them.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers,
 * feet to meters, feet per second to meters per second, pounds to
 * kilograms) are our arithmetic on the cited values.
 *
 * Durations of a minute or more are written in the text as minutes and
 * seconds, with the source's full precision kept: the 80.0-second burn in
 * the source is "1 minute 20.0 seconds" here. That is our arithmetic too.
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const CHRONOLOGY_1966 = "https://www.nasa.gov/history/SP-4002/p3b.htm";

/** Printed pages of the mission report and the PDF's pages, for the pages cited here. */
const PDF_PAGE: Record<string, number> = {
  "1-1": 35,
  "1-2": 36,
  "1-3": 37,
  "2-1": 39,
  "3-30": 71,
  "4-1": 80,
  "4-2": 81,
  "4-3": 82,
  "4-6": 85,
  "4-7": 86,
  "4-8": 87,
  "4-9": 88,
  "4-12": 91,
  "4-13": 92,
  "4-14": 93,
  "4-16": 95,
  "4-17": 96,
  "4-20": 99,
  "4-21": 100,
  "4-22": 101,
  "4-25": 104,
  "5-48": 192,
  "5-101": 253,
  "5-103": 255,
  "5-104": 256,
  "5-107": 259,
  "5-141": 293,
  "5-146": 298,
  "6-9": 345,
  "6-13": 349,
  "6-30": 366,
  "6-31": 367,
  "6-32": 368,
  "7-1": 382,
  "7-4": 385,
  "7-5": 386,
  "7-6": 387,
  "7-9": 390,
  "7-10": 391,
  "7-27": 409,
  "7-28": 410,
};

/** "page 4-2, PDF page 81" or "pages 4-2 and 4-3, PDF pages 81 and 82". */
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

/** A row of the mission report's Table 4-II, the spacecraft's sequence of events, quoted as printed. */
function sequence(row: string): Citation {
  return {
    source: "gemini-10-mission-report",
    locator: `Table 4-II, "Sequence of Events for Gemini Spacecraft Orbital and Reentry Phases" (${pages("4-13")}), row "${row}", actual time`,
  };
}

/** A row of Table 4-I, the launch phase, quoted as printed. */
function launchSequence(row: string): Citation {
  return {
    source: "gemini-10-mission-report",
    locator: `Table 4-I, "Sequence of Events for Gemini Space Vehicle Launch Phase" (${pages("4-12")}), row "${row}", actual time`,
  };
}

/** A section or table of the mission report. */
function report(section: string, ...printed: string[]): Citation {
  return { source: "gemini-10-mission-report", locator: `${section} (${pages(...printed)})` };
}

const SUMMARY = (...printed: string[]): Citation => report('Section 1.0, "Mission Summary"', ...printed);
const ACTUAL_MISSION = (...printed: string[]): Citation => report('Section 4.1, "Actual Mission"', ...printed);
const FIRST_RENDEZVOUS = (...printed: string[]): Citation => report('Section 4.3.1.2.1, "First rendezvous"', ...printed);
const SECOND_RENDEZVOUS = (...printed: string[]): Citation => report('Section 4.3.1.2.2, "Second rendezvous"', ...printed);

/** A row of the recovery events table in section 6.3.2 of the mission report. */
function recovery(time: string, row: string): Citation {
  return {
    source: "gemini-10-mission-report",
    locator: `Section 6.3.2, "Location and Retrieval" (${pages("6-31", "6-32")}), recovery events table, row ${time}: "${row}"`,
  };
}

/** The July 18, 1966 entry of Project Gemini: A Chronology. */
function chronology(entry: string): Citation {
  return { source: "gemini-chronology", locator: `Part III (B), July 18, 1966: ${entry}`, url: CHRONOLOGY_1966 };
}

/** NASA's Gemini X mission page. */
function nasaMission(section: string): Citation {
  return { source: "nasa-gemini-x-mission", locator: section };
}

/** NASA's article "55 Years Ago: Gemini X Soars to New Heights". */
function fiftyFive(section: string): Citation {
  return { source: "nasa-gemini-x-55-years", locator: section };
}

/** On the Shoulders of Titans, chapter XIV, "Charting New Space Lanes" (PDF page = printed page + 21). */
function titans(page: number, quote: string): Citation {
  return {
    source: "on-the-shoulders-of-titans",
    locator: `Chapter XIV, "Charting New Space Lanes", page ${page} (PDF page ${page + 21}): ${quote}`,
  };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-10/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-10/${nasaId.toLowerCase()}.jpg`,
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
  id: "gemini-10",
  program: "gemini",
  name: "Gemini 10",
  kind: "flight",
  destination: "earth-orbit",

  summary: {
    text: {
      short:
        "Gemini 10 flew for three days in July 1966. John Young and Michael Collins docked with an uncrewed target rocket called an Agena, rode its engine higher than anyone had flown before, and then met a second Agena, where Collins floated across on a spacewalk.",
      more:
        "Gemini 10 lifted off from Cape Kennedy, Florida, on July 18, 1966, 1 hour 40 minutes 40.517 seconds after its target, an uncrewed Agena rocket. Young and Collins caught the Agena and docked with it on their fourth trip around Earth, but the chase used so much fuel that the plan had to change: they stayed docked for 38 hours 47 minutes and let the Agena's engines move them. Its main engine lifted them to a record height, then brought them down close to the orbit of a second Agena, the one Gemini 8 had left behind in March. After letting go of their own Agena, they reached the old one with Gemini 10's thrusters, and Collins went outside and floated over to it. They splashed down in the Atlantic Ocean 70 hours 46 minutes 39 seconds after liftoff.",
    },
    citations: [
      SUMMARY("1-1", "1-2"),
      SUMMARY("1-3"),
      ACTUAL_MISSION("4-1", "4-2"),
      sequence("Landing"),
      report('Section 5.4.1.5, "Orbital phase": "the spacecraft remained docked to the GATV for 38 hours and 47 minutes"', "5-141"),
      chronology("the Gemini X mission entry"),
      fiftyFive('Opening paragraph: "The goals of the three-day Gemini X mission included docking with one target vehicle, conducting a rendezvous with a second target, and performing two spacewalks."'),
      nasaMission("Mission overview: \"Gemini X was launched on Jul. 18, 1966, from Complex 19\""),
    ],
  },

  crew: {
    value: [
      { name: "John W. Young", role: "Command pilot" },
      { name: "Michael Collins", role: "Pilot" },
    ],
    citations: [
      SUMMARY("1-1"),
      nasaMission('Mission Facts: "Crew: John W. Young (Command Pilot) and Michael Collins (Pilot)"'),
      chronology('"manned by command pilot Astronaut John W. Young and pilot Astronaut Michael Collins"'),
    ],
  },
  crewPhoto: nasaPhoto(
    "s66-42725",
    788,
    1200,
    "John W. Young, left, and Michael Collins, right, stand in white spacesuits and helmets with the visors raised, in front of a large radar dish at Kennedy Space Center.",
  ),

  launch: {
    value: {
      utc: "1966-07-18T22:20:26.648Z",
      site: "Launch Complex 19, Cape Kennedy, Florida",
      vehicle: "Titan II Gemini Launch Vehicle (GLV-10)",
    },
    citations: [
      launchSequence("Lift-off (pad disconnect separation) (22:20:26.648 G.m.t.)"),
      ACTUAL_MISSION("4-1"),
      SUMMARY("1-1"),
      report('Section 3.2, "Gemini Launch Vehicle": "Gemini Launch Vehicle 10 (GLV-10)"', "3-30"),
      nasaMission("Mission Facts: Launch Date, Launch Site, and Launch Vehicle"),
    ],
    discrepancy:
      "NASA's Gemini X page gives liftoff as 5:20:26 p.m. EST (22:20:28 UT) in its Mission Facts and as 5:20:26 p.m. EST (22:20:26 UT) in its Mission Overview, and the mission report's summary gives 5:20:27 p.m. e.s.t. We follow the report's Table 4-I: 22:20:26.648 G.m.t.",
  },

  duration: {
    value: "070:46:39",
    citations: [
      sequence("Landing"),
      SUMMARY("1-1"),
      nasaMission('Mission Facts: "Duration: 70 hours, 46 minutes, 39 seconds"'),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          "Gemini 10 practiced meeting other spacecraft in orbit twice in one flight. The Moon landings would depend on that skill.",
        more:
          "The way NASA chose to land on the Moon, lunar orbit rendezvous, needed crews who could find another spacecraft in orbit, fly up to it, and dock. NASA's history of Gemini calls the practice of several kinds of rendezvous perhaps the greatest benefit that Gemini 9A and Gemini 10 gave Apollo. Gemini 10's second target was dead, with no radar beacon to help, so the crew found it and closed in by sight alone.",
      },
      citations: [
        fiftyFive('Opening paragraph: rendezvous and docking were "required to implement the Lunar Orbit Rendezvous method NASA chose for the Moon landing missions"'),
        titans(350, '"Gemini IX-A and X had successfully grappled with some of the specific needs of the Apollo program" and "Perhaps the greatest benefit to Apollo was the demonstration and practice of several types of rendezvous" (the sentence ends on page 351)'),
        titans(342, '"VIII\'s Agena, having run out of electrical power, was dead, with no radar transponder or other apparatus to help in the search"'),
        report('Section 7.1.1, "Crew Activities": "The visual rendezvous with the passive GATV was accomplished"', "7-1"),
        report('Section 2.0, "Introduction", primary objective "to rendezvous and dock" and secondary objective (b), "attempt dual rendezvous"', "2-1"),
      ],
    },
    {
      text: {
        short:
          "With their Agena's big engine pushing them, Young and Collins climbed to about 474 miles (763 kilometers) above Earth, higher than any people had been before.",
        more:
          "No crew had fired a docked Agena's main engine before. The firing raised the high point of their orbit to 412.2 nautical miles. It also showed that a docked rocket with its own fuel could move a crewed spacecraft around in orbit, like a tugboat.",
      },
      citations: [
        report('Table 4-VII, "Spacecraft Orbital Elements Before and After Maneuvers", second rendezvous phase adjust (NCH1) (docked), apogee after the maneuver, actual column', "4-20"),
        report('Table 4-V, "Planned and Actual Gemini Launch Vehicle and Spacecraft Trajectory Parameters - Concluded", maximum conditions: "Altitude, statute miles" 474.0 and "Altitude, n. mi." 412.2, actual final column', "4-17"),
        titans(345, '"Young and Collins now viewed Earth from a higher elevation than any human beings ever had."'),
        titans(342, '"Since neither Gemini VIII nor IX-A had provided the hoped-for experience of firing the Agena\'s main engine while it was docked to a spacecraft"'),
        titans(351, 'one vehicle could "latch onto it, and use it as a kind of space tug"'),
        nasaMission('Mission overview: "the use of powered, fueled satellite to provide propulsion for a docked spacecraft" and "boosting to a record altitude (for a crewed spaceflight)"'),
      ],
      discrepancy:
        "NASA's 55-years article gives the record height as 473 miles, NASA's Gemini X page as 763.8 kilometers, and the caption of NASA photo S66-46124 as 413 nautical miles. We follow the mission report: 412.2 nautical miles (Table 4-VII) and 474.0 statute miles (Table 4-V); the 763 kilometers is our conversion.",
    },
    {
      text: {
        short:
          "Michael Collins showed that an astronaut could cross over to another spacecraft in orbit and come back, carrying an experiment with him.",
        more:
          "Collins pushed off from Gemini 10, caught the old Agena, and brought back a package that had been collecting tiny specks of space dust on its outside. He also tried out a hand-held gas gun for moving around in space.",
      },
      citations: [
        nasaMission('Mission overview: "Gemini X demonstrated the ability of an astronaut to travel to another spacecraft and back"'),
        SUMMARY("1-3"),
        report('Section 5.1.10.5.3, "Hand Held Maneuvering Unit"', "5-103"),
        titans(349, '"Collins pushed off from the spacecraft, floated freely in space, and grasped the outer lip of the docking cone on the target"'),
      ],
    },
  ],

  chapters: [
    { id: "launch", title: "Two launches" },
    { id: "first-agena", title: "Catching the Agena" },
    { id: "riding-agena", title: "Riding the Agena" },
    { id: "old-agena", title: "The old Agena" },
    { id: "home", title: "Coming home" },
  ],

  events: [
    /* --------------------------- Two launches -------------------------- */
    {
      id: "agena-launch",
      title: "The target launches",
      chapter: "launch",
      elapsed: "-001:40:40.517",
      utc: "1966-07-18T20:39:46.131Z",
      text: {
        short:
          "An Atlas rocket launches an uncrewed target rocket called an Agena. Gemini 10 will chase it, dock with it, and then use its engine.",
        more:
          "The Atlas-Agena lifted off from Launch Complex 14 at Cape Kennedy at 3:39 p.m. Eastern Standard Time on July 18, 1966, after a countdown with no holds. The Agena reached a nearly circular orbit 156.6 to 162.0 nautical miles up (about 180 to 186 miles, or 290 to 300 kilometers). A second target was already up there: the Agena launched for Gemini 8 in March, no longer working.",
      },
      citations: [
        { source: "gemini-10-mission-report", locator: `Table 4-III, "Sequence of Events for GAATV Launch Phase" (${pages("4-14")}), row "Lift-off" (20:39:46.131 G.m.t.)` },
        SUMMARY("1-1"),
        ACTUAL_MISSION("4-1"),
        chronology('"The Gemini X mission began with the launch of the Gemini Atlas-Agena target vehicle from complex 14 at 3:40 p.m., e.s.t."'),
        fiftyFive('"the Gemini VIII Agena, in orbit since March 1966 and no longer functioning"'),
      ],
      discrepancy:
        "The mission report's summary gives the Agena's launch as 3:39:46 p.m. e.s.t., the Gemini chronology as 3:40 p.m., and On the Shoulders of Titans (page 344) as 3:39 p.m. We follow the report's Table 4-III, 20:39:46.131 G.m.t.",
      photo: nasaPhoto(
        "s66-42751",
        962,
        1600,
        "A silver Atlas rocket with the white-tipped Agena on top rises beside a red launch tower on a bright flame, with yellow smoke and a white cloud of steam rolling across the pad under a deep blue sky.",
      ),
      view: "earth",
    },
    {
      id: "liftoff",
      handsOn: "stages",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00",
      utc: "1966-07-18T22:20:26.648Z",
      text: {
        short:
          "A Titan II rocket launches John Young and Michael Collins in Gemini 10. Their plan: catch two different Agena rockets, one after the other.",
        more:
          "Gemini 10 lifted off from Launch Complex 19 at 5:20 p.m. Eastern Standard Time, 1 hour 40 minutes 40.517 seconds after the Agena, at the start of a launch window only 35 seconds long. It separated from its rocket 6 minutes 11.44 seconds after liftoff, in an orbit 86.3 to 145.1 nautical miles up (about 99 to 167 miles, or 160 to 269 kilometers). The Agena was about 1,000 nautical miles (1,150 miles) ahead.",
      },
      citations: [
        launchSequence("Lift-off (pad disconnect separation) (22:20:26.648 G.m.t.)"),
        launchSequence("Spacecraft separation (shaped charge fired)"),
        ACTUAL_MISSION("4-1"),
        SUMMARY("1-1"),
        report('Table 4-VII, "Spacecraft Orbital Elements Before and After Maneuvers", first rendezvous phase adjust (NC1), before the maneuver, actual column', "4-20"),
        chronology('"Spacecraft No. 10 was inserted into a 145- by 86-nautical-mile elliptical orbit. Slant range between the two vehicles was very close to the nominal 1000 miles."'),
        nasaMission("Mission Facts: Launch Date and Launch Site"),
      ],
      discrepancy:
        "NASA's Gemini X page says Gemini X was about 1,600 kilometers behind its Agena at insertion, and On the Shoulders of Titans (page 344) says 1,800 kilometers. We follow the mission report's summary, a slant range very close to the nominal 1,000 nautical miles.",
      view: "earth",
      inTour: true,
    },

    /* ------------------------- Catching the Agena ------------------------ */
    {
      id: "docking",
      handsOn: "docking",
      title: "Closing in and docking",
      chapter: "first-agena",
      elapsed: "005:52:37.1",
      text: {
        short:
          "On their fourth trip around Earth, Young flies Gemini 10's nose into the Agena's docking cone, and the two lock together. The chase has used much more fuel than planned.",
        more:
          "Near the end of the chase, Gemini 10 drifted off to one side, and Young had to brake almost nonstop for about 15 minutes. The final approach used about 400 pounds (180 kilograms) of propellant, more than three times the average on earlier flights. By 5 hours 15 minutes the crew was flying less than 200 feet (61 meters) from the Agena, and they docked at 5 hours 52 minutes 37.1 seconds. To save fuel, the practice dockings were dropped, and the crew stayed docked so the Agena's engines could do the work.",
      },
      citations: [
        report('Section 5.4.5.2.1, "Docking": "Docking occurred at 5:52:37.1 g.e.t."', "5-146"),
        FIRST_RENDEZVOUS("4-7"),
        report('Section 7.1.1.3.2, "Terminal-phase rendezvous maneuvers": "This resulted in an approach from the side, and a high propellant expenditure"', "7-4"),
        SUMMARY("1-2"),
        ACTUAL_MISSION("4-1"),
        titans(345, '"Five hours and 52 minutes after launch, Young reported a rigid dock."'),
      ],
      discrepancy:
        "Section 1.0 of the mission report and the Gemini chronology say the rendezvous was completed at 5 hours 23 minutes and docking came about 30 minutes later; section 5.4.1.4 gives 5 hours 53 minutes; NASA's Gemini X page gives 11:13:03 p.m. EST. We follow section 5.4.5.2.1, 5:52:37.1.",
      photo: nasaPhoto(
        "s66-46124",
        1600,
        1600,
        "Before docking: the Agena, a silver cylinder with an American flag on its side and a coiled antenna on top, floats free in black space about 41 feet from Gemini 10. Earth's blue curve is at lower left, and the dark nose of Gemini 10 curves up at lower right.",
      ),
      view: "spacecraft",
      inTour: true,
    },

    /* -------------------------- Riding the Agena ------------------------- */
    {
      id: "high-orbit",
      title: "A record climb",
      chapter: "riding-agena",
      elapsed: "007:38:34",
      text: {
        short:
          "Young fires the Agena's big engine while Gemini 10 is still docked. The pair climbs to about 474 miles (763 kilometers) above Earth, higher than people had ever been.",
        more:
          "The firing lasted 1 minute 20.0 seconds and added 423.6 feet per second (129.1 meters per second) to their speed. The crew was riding backward, so the push threw them forward against their straps. \"That was really something,\" Young said. The new orbit ran from 158.5 to 412.2 nautical miles up and took longer to go around Earth, which let the old Gemini 8 Agena, trailing behind, catch up.",
      },
      citations: [
        sequence("Second rendezvous: Phase adjust maneuver (07:38:34)"),
        report('Table 4-VIII, "Rendezvous Maneuvers", second rendezvous phase adjust (NCH1), actual column: "Delta V, ft/sec" 423.6 and "Delta t, sec" 80.0', "4-25"),
        report('Table 4-VII, "Spacecraft Orbital Elements Before and After Maneuvers", second rendezvous phase adjust (NCH1) (docked): perigee 158.5, apogee 412.2, period 90.56 before and 95.31 minutes after, actual columns', "4-20"),
        report('Table 4-V, "Planned and Actual Gemini Launch Vehicle and Spacecraft Trajectory Parameters - Concluded", maximum conditions: "Altitude, statute miles" 474.0 and "Altitude, n. mi." 412.2, actual final column', "4-17"),
        SECOND_RENDEZVOUS("4-8"),
        ACTUAL_MISSION("4-1"),
        report('Section 6.1, "Flight Control": "Because the Gemini VIII GATV was behind the docked spacecraft/GATV, creating a negative phase angle"', "6-9"),
        titans(345, '"The crew, at the moment flying backward ... were thrown forward from the seats against the body straps"'),
        fiftyFive('"they fired the Agena\'s big engine to raise the high point of their orbit to a then-record 473 miles. “That was really something,” said Young."'),
      ],
      discrepancy:
        "NASA's 55-years article gives the record height as 473 miles, NASA's Gemini X page as 763.8 kilometers, and Gemini flight control's tracking (section 6.1) as 413.6 nautical miles. We follow the mission report: 412.2 nautical miles (Table 4-VII) and 474.0 statute miles (Table 4-V); the 763 kilometers is our conversion. Section 4.3.1.2.2 gives the speed change as approximately 424 feet per second; we follow Table 4-VIII's 423.6.",
      photo: nasaPhoto(
        "s66-46249",
        1557,
        1600,
        "Seen from the window of Gemini 10, docked to the Agena, the round, dark docking end of the Agena fills the lower half of the view, with its lit display panel and a tall coiled antenna. A white glow from one of the Agena's main-engine firings spreads out behind it, over Earth's dark blue edge.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "standup-eva",
      title: "Standing in the hatch",
      chapter: "riding-agena",
      elapsed: "023:24:00",
      text: {
        short:
          "Collins opens his hatch and stands up in his seat to photograph stars with a camera that sees ultraviolet light.",
        more:
          "Earlier that day, two more firings of the Agena's engine had brought the pair down into a nearly round orbit 203.9 to 208.7 nautical miles up, about nine miles below the old Agena's. The hatch opened at sunset, 23 hours 24 minutes after liftoff, and through the night Collins photographed stars of the southern Milky Way. After sunrise, both astronauts' eyes began to sting and water so badly that they could hardly see, and Young ordered Collins back in. The hatch closed at 24 hours 13 minutes, about six minutes early.",
      },
      citations: [
        report('Section 7.1.1.5.1, "Standup EVA": "The EVA started at 23:24:00 g.e.t. (sunset)" and "they terminated the EVA six minutes early at 24:13:00 g.e.t."', "7-5"),
        report('Section 5.1.10.5, "Extravehicular equipment"', "5-101"),
        SUMMARY("1-2"),
        ACTUAL_MISSION("4-1", "4-2"),
        SECOND_RENDEZVOUS("4-8"),
        report('Table 4-VII, "Spacecraft Orbital Elements Before and After Maneuvers", coelliptic (NSR) (docked), after the maneuver, actual column', "4-21"),
        titans(347, '"At sunset, Collins stood in his seat" and "Collins aimed the camera at the southern Milky Way"'),
        nasaMission('Mission overview: "Young and Collins began to experience severe eye irritation from an unidentified source and Young ordered termination of the EVA"'),
      ],
      view: "spacecraft",
    },

    /* --------------------------- The old Agena -------------------------- */
    {
      id: "undocking",
      title: "Letting go",
      chapter: "old-agena",
      elapsed: "044:40:16",
      text: {
        short:
          "After almost 39 hours together, the crew lets go of their Agena. Now they chase the old Gemini 8 Agena with Gemini 10's own small thrusters.",
        more:
          "The old Agena's electrical power had run out on its 10th day in orbit, so it had no radar beacon to help the crew find it; they had to spot it by eye. At 45 hours 38 minutes Young reported a first sighting, but it turned out to be their own Agena, only about 3.4 miles (5.5 kilometers) away; the old one was still about 95 nautical miles off. They first saw the real target, a dim, starlike dot, at about 47 hours 7 minutes.",
      },
      citations: [
        sequence("Second rendezvous: Spacecraft separation and phase adjust maneuver"),
        report('Section 5.4.1.5, "Orbital phase": "the spacecraft remained docked to the GATV for 38 hours and 47 minutes"', "5-141"),
        ACTUAL_MISSION("4-2"),
        titans(342, '"VIII\'s Agena, having run out of electrical power, was dead, with no radar transponder or other apparatus to help in the search. Could he even find the old Agena, using only optical equipment?"'),
        { source: "gemini-chronology", locator: 'Part III (B), March 16, 1966: second entry, on GATV 5003 after the flight: "GATV 5003 electrical power was exhausted during the 10th day of orbit"', url: CHRONOLOGY_1966 },
        titans(348, '"45:38. First sighting of Gemini VIII," Young said; "Your range, Gemini X, is 95 [nautical] miles"; "what they had been looking at was their own Agena just 5.5 kilometers away" (time given to the minute; seconds written as 00)'),
        report('Section 7.1.1.4, "Second rendezvous": "The Gemini VIII GATV was reported visible during the platform alignment at 47 hours 7 minutes"', "7-4", "7-5"),
        report('Section 7.1.2.5.2, "Second rendezvous": "it was possible to see the target for the first time as a dim star-like dot"', "7-27"),
      ],
      view: "spacecraft",
    },
    {
      id: "old-agena",
      title: "Beside the old Agena",
      chapter: "old-agena",
      elapsed: "047:59:22",
      text: {
        short:
          "Gemini 10 pulls up beside the Agena that Gemini 8 left in orbit four months earlier. It is the second spacecraft Young and Collins have met on this flight.",
        more:
          "Young fired the thrusters to start the final approach at 47 hours 26 minutes 44 seconds, about 14.2 nautical miles (16 miles) away. Without radar, the crew had to judge distance and speed by eye and with a sextant, and braking began about 1.5 nautical miles out. Station keeping, flying in formation with the old Agena, began at 47 hours 59 minutes 22 seconds, three minutes before nightfall. The Agena was holding steady, and its paint showed small bubbles and slight aging after four months in space.",
      },
      citations: [
        SECOND_RENDEZVOUS("4-9"),
        sequence("Second rendezvous: Terminal phase initiate maneuver"),
        report('Section 7.1.1.4, "Second rendezvous": "braking was initiated at a range of 1.5 nautical miles" and "station-keeping was initiated with three minutes remaining before darkness"', "7-5"),
        report('Section 7.1.2.5.2, "Second rendezvous": the crew\'s ranges from "the onboard sextant"', "7-27", "7-28"),
        report('Section 5.4.1.5, "Orbital phase": bubbles in the paint "were also noted on the Gemini VIII GATV" and "the Gemini VIII GATV showed evidence of slight aging in the space environment"', "5-141"),
        nasaMission('Mission overview: "the GATV-8, which had been launched on Mar. 16 for the Gemini VIII mission"'),
      ],
      discrepancy:
        "Section 4.1 of the mission report puts the start of station keeping at 48 hours 3 minutes, and section 1.0 says the second rendezvous was completed at 48 hours. We follow section 4.3.1.2.2, 47:59:22.",
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "spacewalk",
      title: "Over to the Agena",
      chapter: "old-agena",
      elapsed: "048:42:00",
      text: {
        short:
          "Collins floats across to the old Agena on a 50-foot hose and brings back a box that had been catching tiny specks of space dust.",
        more:
          "The hatch opened at sunrise, 48 hours 42 minutes after liftoff. Collins took a similar package off Gemini 10's own side, then pushed off and grabbed the Agena's docking cone. Its smooth edge gave him nothing to hold, and he slipped away, tumbling slightly. He used a hand-held gas gun, which pushed him along with squirts of nitrogen, to fly back to the spacecraft, then went across again, held on to wires and struts, and took the package. With Gemini 10's fuel running low, Mission Control called him in, and he was back inside at 49 hours 20 minutes, after 38 minutes. The package from Gemini 10's side later floated out of the cabin and was lost.",
      },
      citations: [
        report('Section 7.1.1.5.2, "Umbilical EVA": "the hatch was opened at sunrise at about 48 hours 42 minutes g.e.t." and "The pilot ingressed at 49 hours 20 minutes g.e.t" (both given to the minute; seconds written as 00)', "7-6"),
        report('Section 5.1.10.5, "Extravehicular equipment": "umbilical EVA from 48 hours 42 minutes to 49 hours 20 minutes g.e.t"', "5-101"),
        report('Section 5.1.10.5.3, "Hand Held Maneuvering Unit": "This first use was initiated when the pilot was in a slight tumble after letting go of the GATV."', "5-103"),
        report('Section 5.1.10.5.5, "GATV provisions": "He attempted to grasp the smooth leading edge of the docking cone" and then "grasped wire bundles and struts"', "5-104"),
        SUMMARY("1-3"),
        report('Section 6.1, "Flight Control": "the crew was advised to terminate the EVA and discontinue station keeping with the Gemini VIII GATV"', "6-13"),
        titans(349, '"Collins pushed off from the spacecraft, floated freely in space, and grasped the outer lip of the docking cone" and "he propelled himself first to the spacecraft and then back to the Agena, using a series of squirts"'),
      ],
      discrepancy:
        "NASA's Gemini X page, NASA's 55-years article, and the Gemini chronology give the spacewalk as 39 minutes; we follow the mission report's 48 hours 42 minutes to 49 hours 20 minutes (38 minutes). On the Shoulders of Titans gives the umbilical as 15 meters and NASA's 55-years article as 45 feet; we follow the mission report's 50 feet.",
      view: "spacecraft",
      inTour: true,
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: "retrofire",
      title: "Retrofire",
      chapter: "home",
      elapsed: "070:10:24",
      text: {
        short:
          "Four small rockets fire one after another to slow Gemini 10 down, and it begins its fall toward the Atlantic Ocean.",
        more:
          "On the third day, at 51 hours 38 minutes 52 seconds, a firing of the thrusters had lowered the orbit's low point to 157.9 nautical miles, to make the landing more accurate. Retrofire, the engine firing that starts the trip home, came 70 hours 10 minutes 24 seconds after liftoff, in darkness on the 43rd trip around Earth. The crew flew blunt end forward, and the retrorockets changed their speed by 325.5 feet per second (99.2 meters per second).",
      },
      citations: [
        sequence("Retrofire initiation"),
        {
          source: "gemini-10-pao-transcript",
          locator: 'Mission commentary, 7/21/66, 2:30 p.m., tape 230 (PDF page 509): "he apparently got four good retros. They fire sequentially, all four of them"',
        },
        sequence("True anomaly adjust maneuver"),
        sequence("Equipment adapter separation"),
        report('Table 4-VII, "Spacecraft Orbital Elements Before and After Maneuvers", after separation, true anomaly adjust: perigee after the maneuver, actual column', "4-22"),
        report('Section 6.1, "Flight Control": the true anomaly adjust "shaped the spacecraft orbit so that retrofire for the revolution 44 primary landing area would occur at a true anomaly of 240 degrees"', "6-13"),
        SUMMARY("1-3"),
        report('Section 7.1.1.8, "Retrofire and reentry"', "7-9", "7-10"),
        report('Table 5.1.5-XII, "Translation Maneuvers - Concluded", "Retrofire" row, "Delta V total, ft/sec" column', "5-48"),
        titans(350, '"70 hours and 10 minutes after liftoff, the crew felt the first retrorocket ignite as they passed over the Canton Island tracking station during their 43rd revolution"'),
      ],
      discrepancy:
        "Sections 1.0 and 6.1.4 of the mission report give retrofire as 70:10:25, and Table 5.1.5-XII as 70:10:24.5. We follow Table 4-II, 70:10:24.",
      view: "spacecraft",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "home",
      elapsed: "070:46:39",
      utc: "1966-07-21T21:07:05Z",
      text: {
        short:
          "Gemini 10 splashes down in the Atlantic Ocean within sight of the ship waiting for it. A helicopter carries Young and Collins to the USS Guadalcanal.",
        more:
          "The drogue parachute opened late, at about 40,000 feet (12,200 meters) instead of 50,000, and the spacecraft swung hard beneath it before the main parachute opened. Gemini 10 landed 3.4 nautical miles (6.3 kilometers) from its aiming point, 70 hours 46 minutes 39 seconds after liftoff. Swimmers fixed a flotation collar around it, the astronauts climbed out into a raft, and the helicopter landed them on the ship's deck 71 hours 14 minutes after liftoff. By 71 hours 41 minutes the spacecraft was resting in its cradle aboard the ship.",
      },
      citations: [
        sequence("Landing"),
        sequence("Drogue parachute deployment"),
        report('Section 5.1.11, "Landing System": "The drogue parachute was deployed at approximately 40 000 feet instead of the design altitude of 50 000 feet. The delayed deployment contributed to the subsequent large oscillations"', "5-107"),
        report('Section 6.3.2, "Location and Retrieval": landed "3.4 nautical miles from the aiming point"', "6-30", "6-31"),
        recovery("21:12 G.m.t. / 70:52 g.e.t.", "Flotation collar installed and inflated"),
        recovery("21:34 G.m.t. / 71:14 g.e.t. (given to the minute; seconds written as 00)", "Rescue helicopter with flight crew aboard U.S.S. Guadalcanal"),
        recovery("22:01 G.m.t. / 71:41 g.e.t. (given to the minute; seconds written as 00)", "Spacecraft resting in cradle aboard U.S.S. Guadalcanal"),
        report('Section 7.1.1.9, "Landing and recovery": "The crew completed their postflight checks, then egressed to the swimmer\'s liferaft."', "7-10"),
        SUMMARY("1-1"),
        nasaMission('Mission Facts: "Landing Date: Jul. 21, 1966, 4:07:05 p.m. EST (21:07:05 UT)"'),
      ],
      discrepancy:
        "The crew's report (section 7.1.1.8) gives the drogue as 38,000 feet; we follow section 5.1.11, about 40,000 feet. For the miss distance, sections 4.1 and 4.3.1.3 of the mission report say within three nautical miles, and On the Shoulders of Titans (page 350) says 5.4 kilometers; we follow section 6.3.2 (pages 6-30 and 6-31, PDF pages 366 and 367), 3.4 nautical miles, which NASA's Gemini X page gives as 6.3 kilometers.",
      photo: nasaPhoto(
        "s66-42795",
        1039,
        1600,
        "A black-and-white photo looking down on a rippled sea: the small cone-shaped Gemini 10 hangs on long lines below a striped main parachute, just above the water.",
      ),
      view: "earth",
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: "Gemini X spacecraft",
        museum: "Cosmosphere",
        place: "Hutchinson, Kansas",
      },
      citations: [
        { source: "cosmosphere-hall-of-space", locator: 'Human Spaceflight gallery, "Significant artifacts", Flown: "Gemini X spacecraft"' },
        fiftyFive('"The Gemini X spacecraft is on display at the Cosmosphere in Hutchinson, Kansas."'),
      ],
    },
  ],
};
