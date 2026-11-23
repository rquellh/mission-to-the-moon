/**
 * Gemini 4 (NASA wrote it "Gemini IV"): four days in orbit and the first
 * American spacewalk, June 3-7, 1965.
 *
 * Every event time is copied from the Gemini Program Mission Report for
 * Gemini IV (MSC-G-R-65-3, June 1965, with Change 1 of December 9, 1965),
 * the canonical source for this mission: elapsed times exactly as its
 * Table 4-I ("Sequence of Events") prints the actual times. That table
 * covers only the launch and the reentry, so the moments in between come
 * from other sections and tables of the same report, named in each
 * citation. The report prints no time for the hatch opening; that one time
 * comes from the Gemini chronology (NASA SP-4002), and the time White went
 * to sleep from On the Shoulders of Titans (NASA SP-4203). Where another
 * NASA source gives a different value, the `discrepancy` field says what it
 * gives; we follow the mission report. The source registry links to NASA's
 * Technical Reports Server copy of the report. Each citation gives the
 * report's printed page and then the PDF's page.
 *
 * Elapsed times are ground elapsed time (g.e.t.), counted from Gemini IV's
 * lift-off at 15:15:59.562 G.m.t. (Table 4-I and section 4.1). Where a
 * source gives a time only to the minute, seconds are written as 00 and the
 * citation says so. Table 4-IV prints its times in minutes and seconds
 * ("86:46.297"); they are written here as hours, minutes and seconds.
 *
 * Universal times are given only where a source states them: launch
 * (Table 4-I), landing (NASA's Gemini IV page), and retrofire and the
 * crew's arrival on the carrier, which are NASA's Gemini IV page's EST
 * times plus five hours, our arithmetic.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers,
 * feet to meters, pounds to kilograms, feet per second to miles per hour)
 * are our arithmetic on the cited values.
 *
 * The flight path itself (orbit, retrofire, splashdown point) is described
 * in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const REPORT_PDF = 'https://ntrs.nasa.gov/api/citations/19670095754/downloads/19670095754.pdf';
const CHRONOLOGY_1965 = 'https://www.nasa.gov/history/SP-4002/p3a.htm';
const NMC_GEMINI = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-043A';

/**
 * The PDF page of a printed page of the report: each section's pages run
 * on from a fixed offset in the scan (page 4-13 is PDF page 91).
 */
const PDF_OFFSET = new Map([
  ['1', 35],
  ['2', 37],
  ['3', 39],
  ['4', 78],
  ['5', 116],
  ['6', 235],
  ['7', 259],
  ['9', 370],
]);

function pdfPage(printed: string): number {
  const [section = '', page = ''] = printed.split('-');
  const offset = PDF_OFFSET.get(section);
  if (offset === undefined) throw new Error(`No PDF offset recorded for printed page ${printed}`);
  return offset + Number(page);
}

/** "page 4-2, PDF page 80" or "pages 4-2 and 4-3, PDF pages 80 and 81". */
function pages(...printed: string[]): string {
  const pdf = printed.map(pdfPage);
  return printed.length === 1
    ? `page ${printed[0]}, PDF page ${pdf[0]}`
    : `pages ${printed.join(' and ')}, PDF pages ${pdf.join(' and ')}`;
}

/** A section or table of the mission report. */
function report(section: string, ...printed: string[]): Citation {
  return {
    source: 'gemini-4-mission-report',
    locator: `${section} (${pages(...printed)})`,
    url: REPORT_PDF,
  };
}

/** A row of the mission report's Table 4-I, the sequence of events, quoted as printed. */
function sequence(row: string, page: '4-12' | '4-13'): Citation {
  return report(`Table 4-I, "Sequence of Events", row "${row}", actual time`, page);
}

const SUMMARY = (...printed: string[]): Citation =>
  report('Section 1.0, "Mission Summary"', ...printed);
const ACTUAL_MISSION = (...printed: string[]): Citation =>
  report('Section 4.1, "Actual Mission"', ...printed);
const PILOTS_EVA = (...printed: string[]): Citation =>
  report('Section 7.1.2.4.2, pilots\' report, "Extravehicular activity"', ...printed);
const CREW_EVA = (...printed: string[]): Citation =>
  report('Section 7.1.1.4, "Extravehicular activity"', ...printed);

/** The June 3, 1965 entry of Project Gemini: A Chronology, Part III (A). */
function chronology(detail: string): Citation {
  return {
    source: 'gemini-chronology',
    locator: `Part III (A), June 3, 1965: ${detail}`,
    url: CHRONOLOGY_1965,
  };
}

/** The NSSDCA Master Catalog page for Gemini 4. */
function nmc(section: string): Citation {
  return {
    source: 'nssdca-master-catalog',
    locator: `"Gemini 4" (1965-043A), ${section}`,
    url: NMC_GEMINI,
  };
}

/** NASA's Gemini IV mission page. */
function nasaMission(section: string): Citation {
  return { source: 'gemini-4-nasa-mission-page', locator: section };
}

/** NASA's article "Gemini IV: Learning to Walk in Space". */
function learning(section: string): Citation {
  return { source: 'gemini-4-learning-to-walk', locator: section };
}

/** The Smithsonian's page for the Gemini IV capsule. */
function nasm(section: string): Citation {
  return { source: 'gemini-4-nasm-capsule', locator: section };
}

/** On the Shoulders of Titans, chapter XI, "Pillars of Confidence" (PDF page = printed page + 21). */
function titans(page: number, quote: string): Citation {
  return {
    source: 'on-the-shoulders-of-titans',
    locator: `Chapter XI, "Pillars of Confidence", page ${page} (PDF page ${page + 21}): ${quote}`,
  };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-4/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-4/${nasaId.toLowerCase()}.jpg`,
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
  id: 'gemini-4',
  program: 'gemini',
  name: 'Gemini 4',
  kind: 'flight',
  destination: 'earth-orbit',

  summary: {
    text: {
      short:
        'Gemini 4 stayed in orbit for four days in June 1965. On the first day, Ed White floated outside on a tether, the first American to walk in space, while Jim McDivitt flew the spacecraft.',
      more: "Gemini 4 lifted off from Cape Kennedy, Florida, on June 3, 1965. It was the second Gemini flight with a crew, and the first run from NASA's new Mission Control Center in Houston. In the first hour and a half, the crew tried and failed to fly close beside the empty second stage of their rocket. A few hours later, White opened his hatch and spent about 22 minutes outside, steering at first with a hand-held gas gun. The crew then let the spacecraft drift much of the time to save fuel, and ran 11 experiments. After their computer failed, they flew a simpler rolling reentry and splashed down in the Atlantic Ocean 97 hours 56 minutes 12 seconds after liftoff.",
    },
    citations: [
      SUMMARY('1-1', '1-2'),
      ACTUAL_MISSION('4-1', '4-2'),
      CREW_EVA('7-8'),
      sequence('Landing', '4-13'),
      chronology('the Gemini 4 mission entry'),
      nasaMission('Mission Facts: "Duration: 97 hours, 56 minutes, 12 seconds"'),
      nasm(
        'Object description: the flight "lasted four days and included a historic space walk by White, the first by an American"',
      ),
    ],
  },

  crew: {
    value: [
      { name: 'James A. McDivitt', role: 'Command pilot' },
      { name: 'Edward H. White II', role: 'Pilot' },
    ],
    citations: [
      SUMMARY('1-1'),
      chronology(
        '"Command pilot Astronaut James A. McDivitt and pilot Astronaut Edward H. White II were the crew"',
      ),
      nasaMission(
        'Mission Facts: "Crew: James A. McDivitt Jr. (Command Pilot) and Edward H. White II (Pilot)"',
      ),
    ],
  },
  crewPhoto: nasaPhoto(
    'S65-19528',
    962,
    1200,
    'Edward H. White II, left, and James A. McDivitt, right, smile in white spacesuits and helmets with the visors raised, standing in front of a launch tower at Cape Kennedy.',
  ),

  launch: {
    value: {
      utc: '1965-06-03T15:15:59.562Z',
      site: 'Launch Complex 19, Cape Kennedy, Florida',
      vehicle: 'Titan II Gemini Launch Vehicle (GLV-4)',
    },
    citations: [
      sequence('Lift-off (pad disconnect separation) (15:15:59.562 G.m.t.)', '4-12'),
      ACTUAL_MISSION('4-1'),
      SUMMARY('1-1'),
      report(
        'Section 3.0, "Vehicle Description": "the Gemini launch vehicle designated GLV-4"',
        '3-1',
      ),
      nasaMission(
        'Mission Facts: "Launch Date: Jun. 3, 1965, 10:15:59 a.m. EST (15:15:59 UT)", Launch Site, and "Launch Vehicle: Titan II"',
      ),
    ],
  },

  duration: {
    value: '097:56:12',
    citations: [
      sequence('Landing', '4-13'),
      nasaMission(
        'Mission Facts: "Duration: 97 hours, 56 minutes, 12 seconds (4 days, 1 hour, 56 minutes, 12 seconds)"',
      ),
      nmc('Mission Profile: "Total elapsed mission time was 97:56:12"'),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          'Ed White made the first American spacewalk, floating outside Gemini 4 on a tether for about 22 minutes.',
        more: "He was the second person ever to leave a spacecraft in orbit, eleven weeks after the Soviet cosmonaut Alexei Leonov made the first spacewalk, on March 18, 1965. White's hand-held gas gun worked well for steering until its gas ran out, and NASA's report on the flight concluded that working outside a spacecraft could be done as a routine part of spaceflight. It also showed what needed changing: the tether, fastened at the hatch, kept swinging White back toward the rear of the spacecraft, and there was almost nothing on the outside to hold on to.",
      },
      citations: [
        SUMMARY('1-2'),
        CREW_EVA('7-8'),
        report('Section 9.0, "Conclusions", items 13 and 14', '9-2'),
        report(
          'Section 5.1.10.4.3, "Umbilical guide": "the lack of handholds on any surface of the spacecraft except the open hatch"',
          '5-42',
        ),
        nasm(
          "Object description: \"Ten weeks earlier, Soviet cosmonaut Alexei Leonov had become the first human to 'walk in space'\" and \"White's 22-minute 'extra-vehicular activity' (EVA)\"",
        ),
        {
          source: 'gemini-4-spacewalking-history',
          locator:
            'Second paragraph: "on March 18, Soviet cosmonaut Aleksei A. Leonov took the world\'s first spacewalk" (eleven weeks before June 3 is our count)',
        },
      ],
      discrepancy:
        "The Smithsonian's Gemini IV page says Leonov walked \"ten weeks earlier.\" From NASA's date for Leonov's walk, March 18, 1965, to June 3 is 77 days, eleven weeks (our count), which the text gives.",
    },
    {
      text: {
        short:
          "Gemini 4 began NASA's practice at working outside a spacecraft, a skill Apollo astronauts needed to walk on the Moon.",
        more: "NASA considered mastering spacewalks a critical task for the Apollo Moon landings. White's walk looked easy, but later Gemini spacewalkers found that doing real work outside was hard. By the last Gemini flight, Buzz Aldrin, who had trained underwater, showed that spacewalks could get useful work done. That experience in Earth orbit helped prepare the Apollo crews for their moonwalks.",
      },
      citations: [
        {
          source: 'gemini-4-spacewalking-history',
          locator:
            'Second paragraph: "Because NASA considered mastering spacewalking a critical task for the Apollo Moon landing program", later Gemini spacewalkers "found accomplishing actual work quite challenging", and Aldrin on the final Gemini flight "proved that EVAs could be productive"',
        },
        learning(
          '"In the following years, it was a skill that allowed Apollo explorers to walk on the moon" and "Experience during spacewalks in orbit around the Earth, proved valuable in preparing for lunar extravehicular activities"',
        ),
      ],
    },
    {
      text: {
        short:
          'Gemini 4 stayed in space for four days, much longer than any American flight before, and its crew came home healthy.',
        more: "Before Gemini 4, the longest American flight was Gordon Cooper's 34 hours aboard Mercury 9 in May 1963. Seeing how two astronauts and their spacecraft held up for about four days, to prepare for longer flights, was the mission's main goal. McDivitt and White finished in excellent physical condition, and the report found no lasting effects on them. They also showed that the flight plan could be rewritten as the flight went along, which they did often to save fuel.",
      },
      citations: [
        learning(
          '"Before June 1965, the longest American spaceflight was Gordon Cooper\'s 34 hours in space during May 1963 aboard Mercury 9"',
        ),
        SUMMARY('1-1'),
        report('Section 2.0, "Introduction", first-order objectives (a) to (c)', '2-1'),
        report('Section 9.0, "Conclusions", items 18 and 19', '9-3'),
        report(
          'Section 7.1.2.4.6, "Real-time flight planning": "This flight was the first experience with real-time flight planning"',
          '7-26',
        ),
      ],
    },
    {
      text: {
        short:
          "Gemini 4 was the first flight run from NASA's new Mission Control Center in Houston, which ran every American crewed flight after it.",
        more: 'The flights before had been controlled from Cape Kennedy. Because Gemini 4 lasted four days, flight controllers worked in three shifts for the first time, led by Christopher Kraft, Eugene Kranz, and John Hodge.',
      },
      citations: [
        SUMMARY('1-2'),
        chronology(
          '"Gemini 4 was the first mission to be controlled from the mission control center in Houston"',
        ),
        learning(
          '"Gemini 4 was the first flight to be followed by the mission control at the new Manned Spacecraft Center (MSC) in Houston"; it "became the primary flight control center for all subsequent U.S. manned space missions"; "For all previous Mercury and Gemini missions the control center was at the Cape Kennedy launch site"',
        ),
        titans(
          250,
          'ground control "moved for the first time into a three-shift operation", with Kraft, Eugene F. Kranz, and John Hodge directing the shifts',
        ),
        {
          source: 'on-the-shoulders-of-titans',
          locator:
            'Page 89 (PDF page 110), for Kraft\'s full name: "the Flight Operations Division under Christopher C. Kraft, Jr."',
        },
      ],
    },
    {
      text: {
        short:
          'The failed chase of the rocket stage taught NASA that to catch something in orbit, you first slow down, not speed up.',
        more: 'An engineer, Andre Meyer, said later that no one had yet worked out the orbital mechanics, and that because of it "we all got a whole lot smarter and really perfected rendezvous maneuvers, which Apollo now uses." Looking back, the report on the flight suggested that if the crew had first set up a closing speed toward the stage that they could clearly see, they might have managed to fly close beside it.',
      },
      citations: [
        titans(
          248,
          'Andre Meyer: the crew, like everyone else at MSC, "just didn\'t understand or reason out the orbital mechanics involved. As a result, we all got a whole lot smarter and really perfected rendezvous maneuvers, which Apollo now uses"; "The proper technique is for the spacecraft to reduce its speed"',
        ),
        report(
          'Section 4.3.1.3, "Station keeping": a procedure "that required the crew (1) to initially establish a clearly perceptible closing rate with the target at all times"',
          '4-9',
        ),
      ],
    },
  ],

  chapters: [
    { id: 'launch', title: 'Launch' },
    { id: 'stage', title: 'Chasing the rocket stage' },
    { id: 'spacewalk', title: 'The spacewalk' },
    { id: 'four-days', title: 'Four days in orbit' },
    { id: 'home', title: 'Coming home' },
    { id: 'splashdown', title: 'Splashdown' },
  ],

  events: [
    /* ----------------------------- Launch ---------------------------- */
    {
      id: 'liftoff',
      handsOn: 'stages',
      title: 'Liftoff',
      chapter: 'launch',
      elapsed: '000:00:00',
      utc: '1965-06-03T15:15:59.562Z',
      text: {
        short:
          'A Titan II rocket lifts Gemini 4 off the pad at Cape Kennedy, carrying Jim McDivitt and Ed White. They plan to stay in space for four days.',
        more: 'Liftoff came at 10:16 a.m. Eastern Standard Time on June 3, 1965, about an hour and a quarter late. A wiring error had kept the tower beside the rocket, called the erector, from being lowered, and the countdown was held for 1 hour 15 minutes while it was fixed. For the first time, television showed a launch overseas, to 12 European countries by the Early Bird satellite. The spacecraft had no name, though a few reporters called it "Little Eva," for the extravehicular activity, or spacewalk, planned for the first day.',
      },
      citations: [
        sequence('Lift-off (pad disconnect separation) (15:15:59.562 G.m.t.)', '4-12'),
        ACTUAL_MISSION('4-1'),
        SUMMARY('1-1', '1-2'),
        report(
          'Section 7.1.2.1, "Prelaunch": "the 1 hour 15 minute hold caused by the malfunctioning erector"',
          '7-16',
        ),
        nasaMission('Mission Facts: "Launch Date: Jun. 3, 1965, 10:15:59 a.m. EST (15:15:59 UT)"'),
        titans(
          245,
          'the launch "was broadcast to 12 European nations via Early Bird satellite", and the footnote: the spacecraft "had no name" and "A few of the newsmen called the ship \'Little Eva\'"',
        ),
      ],
      discrepancy:
        "On the Shoulders of Titans gives the hold as 1 hour 16 minutes. We follow the mission report's sections 1.0 and 7.1.2.1, 1 hour 15 minutes.",
      photo: nasaPhoto(
        'S65-29636',
        747,
        1600,
        'A white Titan II rocket with black bands climbs on a bright flame above its red launch tower, as orange and white smoke billows across the pad under a blue sky.',
      ),
      view: 'earth',
      inTour: true,
    },
    {
      id: 'in-orbit',
      title: 'In orbit',
      chapter: 'launch',
      elapsed: '000:06:05.55',
      text: {
        short:
          'Six minutes after liftoff, Gemini 4 separates from its rocket and is in orbit, about 101 to 175 miles above Earth.',
        more: 'The second stage shut down 5 minutes 33.75 seconds after liftoff, and the spacecraft separated 31.8 seconds later. The crew fired the thrusters at the back of the spacecraft for 5 seconds to move away. The orbit ranged from 87.6 to 152.2 nautical miles up (162 to 282 kilometers), close to the planned 87 by 159. Then the crew turned the spacecraft around to look for the empty second stage, which they could see clearly against the black sky, its lights flashing.',
      },
      citations: [
        sequence('SECO (stage II engine shutdown (91FS2))', '4-13'),
        sequence('Spacecraft separation (shaped charge fired)', '4-13'),
        ACTUAL_MISSION('4-1'),
        report(
          'Table 4-III, "Comparison of Orbital Elements", revolution "Insertion", apogee and perigee, actual final column',
          '4-15',
        ),
        report('Section 7.1.2.3, "Insertion", and 7.1.2.4.1, "Station keeping"', '7-17', '7-18'),
      ],
      view: 'earth',
    },

    /* ----------------------- Chasing the rocket stage ---------------------- */
    {
      id: 'chasing-stage',
      title: 'Chasing the rocket stage',
      chapter: 'stage',
      elapsed: '000:08:47.164',
      text: {
        short:
          'The crew tries to fly right beside the empty second stage of their rocket, as practice for meeting other spacecraft. But each push toward it seems to carry them farther away.',
        more: "The stage was 200 to 500 feet (60 to 150 meters) behind when the crew first saw it, tumbling. McDivitt pointed Gemini 4 at it and fired the thrusters, but the stage dropped below and away. Speeding up toward a target in orbit lifts a spacecraft into a higher orbit, where it takes longer to go around Earth, so the target pulls ahead; the right way is to slow down first, into a lower orbit that catches up. Like everyone else at NASA's Manned Spacecraft Center, the crew had not yet worked that out. Gemini 4 had no radar to measure the distance, and in the dark the crew had only the stage's two flashing lights to go by, then just one once the tumbling hid the other.",
      },
      citations: [
        report(
          'Table 4-IV, "Detailed List of Maneuvers During Gemini IV Station-Keeping Attempt", first firing after separation, 8:47.164 (minutes and seconds)',
          '4-16',
        ),
        report(
          'Section 2.0, "Introduction", second-order objective (b): "Conduct station keeping and rendezvous maneuvers with the expended second stage"',
          '2-1',
        ),
        report('Section 7.1.2.4.1, "Station keeping"', '7-18', '7-19'),
        report('Section 4.3.1.3, "Station keeping"', '4-7', '4-8'),
        SUMMARY('1-2'),
        titans(
          246,
          'McDivitt "thrusted toward the target" and "the booster seemed to move away and downward"',
        ),
        titans(
          248,
          '"Adding speed also raises altitude, moving the spacecraft into a higher orbit than its target" and "The proper technique is for the spacecraft to reduce its speed, dropping to a lower and thus shorter orbit"',
        ),
        learning(
          '"There were only two running lights on the stage, and there was no radar on board to give a precise range to the target."',
        ),
      ],
      view: 'spacecraft',
      inTour: true,
    },
    {
      id: 'chase-called-off',
      title: 'Giving up the chase',
      chapter: 'stage',
      elapsed: '001:26:46.297',
      text: {
        short:
          'After 74 small firings, the stage is about 3 miles away and getting farther. Mission Control tells the crew to stop and save their fuel for the rest of the flight.',
        more: 'In about 80 minutes the crew used 115 pounds (52 kilograms) of propellant, most of what had been set aside for this exercise, and came no closer than about 0.3 nautical mile (560 meters). The planned rendezvous with the stage later in the flight was called off. The firings had also raised the orbit to 90.4 by 159.9 nautical miles (167 by 296 kilometers). Left behind, the stage fell back into the atmosphere about two days later and broke up.',
      },
      citations: [
        report(
          'Table 4-IV, "Detailed List of Maneuvers During Gemini IV Station-Keeping Attempt" - Concluded, last firing, 86:46.297 (minutes and seconds)',
          '4-17',
        ),
        ACTUAL_MISSION('4-1', '4-2'),
        SUMMARY('1-1'),
        report(
          'Section 6.1.2.2, "Orbital": "the crew was advised over Guaymas to discontinue the rendezvous attempt"',
          '6-3',
        ),
        report(
          'Section 7.1.2.4.1, "Station keeping": the launch vehicle was "below and ahead of the spacecraft at a range of approximately 3 miles"',
          '7-19',
        ),
        report(
          'Table 4-III, "Comparison of Orbital Elements", revolution 2 (after station-keeping), apogee and perigee, actual final column',
          '4-15',
        ),
        report(
          'Section 4.3.2, "Launch Vehicle Second Stage": its "2-day lifetime" and reentry on revolution 33, when it "broke up"',
          '4-11',
        ),
        titans(
          248,
          '"When McDivitt and White broke off their futile chase, they had exhausted nearly half their load of propellants"',
        ),
      ],
      discrepancy:
        "NSSDCA's Master Catalog page for Gemini 4, and NASA's Gemini IV page, which repeats it, say the exercise was canceled early in the second revolution, after 42 percent of the fuel was used. We follow the mission report: it ended at the end of the first revolution (section 4.1), after 115 pounds of propellant.",
      view: 'earth',
    },

    /* ----------------------------- The spacewalk --------------------------- */
    {
      id: 'getting-ready',
      title: 'Getting ready to go outside',
      chapter: 'spacewalk',
      elapsed: '001:35:00',
      text: {
        short:
          'White starts getting ready for his spacewalk. It takes so long that the crew decides to wait one more trip around Earth so they are not rushed.',
        more: 'While McDivitt read the checklist, White put together the hand-held gas gun he would steer with, pulled out the 25-foot (7.6-meter) hose and tether that would bring him oxygen, and hooked up a chest pack with emergency oxygen. Nearing the tracking station at Carnarvon, Australia, the crew saw they had been rushing, and McDivitt thought White already looked tired and hot. They asked to put off the spacewalk by one revolution, and Mission Control agreed. On the third revolution they went back through the whole checklist, item by item.',
      },
      citations: [
        CREW_EVA('7-7'),
        ACTUAL_MISSION('4-2'),
        PILOTS_EVA('7-19'),
        report('Section 3.1.2.3.1, "Umbilical assembly": "a 25-foot umbilical assembly"', '3-3'),
        titans(
          248,
          '"White put the zip gun together, while McDivitt read off a list" and "the commander noticed that his copilot already looked tired and hot"',
        ),
        chronology(
          '"McDivitt decided to delay EVA for one revolution" and "Ground control approved the decision"',
        ),
      ],
      discrepancy:
        'Section 4.1 of the mission report says the preparations began at approximately 01:40:00. We follow section 7.1.1.4, 01:35:00.',
      view: 'spacecraft',
    },
    {
      id: 'hatch-opens',
      title: 'The hatch opens',
      chapter: 'spacewalk',
      elapsed: '004:18:00',
      text: {
        short:
          'McDivitt lets the air out of the cabin, and White opens the hatch above his seat. He rises up through it and sets up a camera to film his spacewalk.',
        more: "The astronauts' pressurized spacesuits kept them alive with the cabin open to space. McDivitt stopped letting out air at 2 pounds per square inch for a last check of the suits, then let the cabin go to vacuum. At first the hatch would not unlatch, because a spring had failed, and White worked at the latch until it suddenly cracked open. Standing in the hatch, he mounted a movie camera outside, fitted a guard on the sill to protect his hose, and put together the gas gun with a small camera on it. That took 4 or 5 minutes. Then the tracking station in Hawaii gave him permission to go out.",
      },
      citations: [
        chronology(
          '"The spacecraft hatch was opened at 4 hours 18 minutes into the flight" (time given to the minute; seconds written as 00; the mission report prints no time for it)',
        ),
        nasaMission('Mission Overview: "the hatch was opened at 2:34" p.m. EST'),
        PILOTS_EVA('7-19'),
        CREW_EVA('7-7'),
        report(
          'Section 5.1.10.4.4, "Maneuvering unit": "The 35-mm camera mounted on the forward end of the maneuvering unit"',
          '5-42',
        ),
        titans(
          249,
          '"the door would not unlatch because a spring had failed to compress" and "the door suddenly cracked open"',
        ),
      ],
      view: 'spacecraft',
      inTour: true,
    },
    {
      id: 'floating-out',
      title: 'The first American spacewalk',
      chapter: 'spacewalk',
      elapsed: '004:23:00',
      text: {
        short:
          'Ed White pushes off into space, steering with a small gas gun in his hand. He is the first American to float outside a spacecraft in orbit.',
        more: 'White left the spacecraft using only the gun, nicknamed the "zip gun," which squirted oxygen through small jets to push him around. He floated out 15 or 16 feet (about 5 meters), stopped himself, and for the next 4 minutes flew back and forth to the spacecraft twice, turning head over heels and side to side. Then the gun\'s gas ran out. "The gun works great, Jim," White said. "... The only problem I have is that I haven\'t got enough fuel." The Soviet cosmonaut Alexei Leonov had made the world\'s first spacewalk eleven weeks before, on March 18, 1965.',
      },
      citations: [
        ACTUAL_MISSION('4-2'),
        report(
          'Table 5.1-IV, "Guidance and Control Summary Chart" - Continued, row "EVA", actual time 04:23:00',
          '5-53',
        ),
        PILOTS_EVA('7-19'),
        report(
          'Section 5.1.10.4.4, "Maneuvering unit": "the pilot was able to maneuver only about 4 minutes"',
          '5-42',
        ),
        report(
          'Section 3.1.2.3.3, "Maneuvering unit": "a simple hand-held cold-gas reaction jet device" fed by "two Gemini egress-kit oxygen bottles"',
          '3-3',
        ),
        learning(
          '"a Hand-Held Maneuvering Unit, informally called a \'zip gun.\' The device expelled pressurized oxygen" and "The gun works great, Jim," White said to his command pilot. "It\'s very easy to maneuver with the gun. The only problem I have is that I haven\'t got enough fuel."',
        ),
        titans(249, '"Then the compressed oxygen fuel bottle was empty"'),
        nasm(
          'Object description: "Ten weeks earlier, Soviet cosmonaut Alexei Leonov had become the first human to \'walk in space.\'"',
        ),
        {
          source: 'gemini-4-spacewalking-history',
          locator:
            'Second paragraph: "on March 18, Soviet cosmonaut Aleksei A. Leonov took the world\'s first spacewalk" (eleven weeks before June 3 is our count)',
        },
      ],
      discrepancy:
        "The Gemini chronology says White went out 12 minutes after the hatch opened, at about 4 hours 30 minutes, and NASA's Gemini IV page and NSSDCA give 2:46 p.m. EST, the same time. NSSDCA also says the gun's gas lasted 3 minutes. We follow the mission report: approximately 04:23:00 (section 4.1 and Table 5.1-IV), and about 4 minutes of gas (section 5.1.10.4.4). The Smithsonian's Gemini IV page says Leonov walked \"ten weeks earlier.\" From NASA's date for Leonov's walk, March 18, 1965, to June 3 is 77 days, eleven weeks (our count), which the text gives.",
      photo: nasaPhoto(
        'S65-34635',
        1591,
        1600,
        'Ed White floats in black space above the curved blue Earth, in a white spacesuit and gold visor, holding the gas gun out in his right hand. A gold-wrapped hose loops around him and leads back to the dark spacecraft at lower right.',
      ),
      view: 'spacecraft',
      inTour: true,
    },
    {
      id: 'on-the-tether',
      title: 'On the tether',
      chapter: 'spacewalk',
      elapsed: '004:33:21',
      text: {
        short:
          'With the gun out of gas, White moves around by tugging on his tether. Over the United States, Mission Control can hear him and McDivitt again.',
        more: 'Pulling on the tether tended to swing White in a big arc over the top of the spacecraft and back toward its rear. He pushed off again and again and went out to the tether\'s full length. Once he brushed McDivitt\'s window and left smudges on it. McDivitt took pictures of him through the window. "You look beautiful, Ed," he said. "I feel like a million dollars," White answered. Over Texas, White called to Gus Grissom, the capsule communicator in Houston: "Hey, Gus, we\'re right over Houston. We\'re looking right down on Galveston Bay."',
      },
      citations: [
        report(
          'Section 5.1.2.1, "Ultra-high frequency voice communications": from 04:29:33 to 04:33:21 the spacecraft "was not over a station"; "After 04:33:21 g.e.t., the spacecraft communicator listened to the flight crew during the remainder of the extravehicular exercise"',
          '5-6',
        ),
        report(
          'Section 6.1.2.2, "Orbital": "During the continental U.S. pass for the EVA, MCC-H was able to monitor telemetry and talk to the crew"',
          '6-4',
        ),
        PILOTS_EVA('7-20', '7-21'),
        report(
          'Section 5.1.10.5.1, "Still camera": "excellent photographs of the pilot during EVA from inside the spacecraft"',
          '5-42',
        ),
        learning(
          '"You look beautiful, Ed," "I feel like a million dollars," and "Hey, Gus, we\'re right over Houston," said White. "We\'re looking right down on Galveston Bay."',
        ),
        titans(
          249,
          '"After the voice circuit was restored, radio listeners had a chance to hear an American human satellite broadcast his views"',
        ),
      ],
      photo: nasaPhoto(
        's65-30432',
        1600,
        1578,
        'Ed White floats head down above the bright blue Earth and its curved edge against black space, holding the gas gun with a camera mounted on it, a gold-wrapped tether coiling around him.',
      ),
      view: 'spacecraft',
      inTour: true,
    },
    {
      id: 'coming-back-in',
      title: 'Time to come back in',
      chapter: 'spacewalk',
      elapsed: '004:46:00',
      text: {
        short:
          'McDivitt tells White it is time to come back inside. White does not want his walk to end: "It\'s the saddest moment of my life," he says.',
        more: 'White had been outside for about 22 minutes. Their voice-operated radio stayed switched on while they talked, which blocked calls from the ground, until McDivitt changed the radio setting and asked whether Houston wanted anything. "Yes," chuckled Kraft, the mission director in Houston. "Tell him to get back in." White started back in nearly 10 minutes later than planned and handed McDivitt the camera and gun. His suit was bulkier and stiffer than he was used to, and the muscles at the backs of his thighs cramped as he pulled himself down into his seat. "This is the greatest experience," he said. "It\'s just tremendous."',
      },
      citations: [
        ACTUAL_MISSION('4-2'),
        CREW_EVA('7-8'),
        PILOTS_EVA('7-21'),
        report(
          'Section 7.2.2.2.5, "Extravehicular activities": "the muscles in the back of his thighs became cramped while he was attempting to pull himself back into the spacecraft"',
          '7-46',
        ),
        titans(249, '"It\'s the saddest moment of my life."'),
        titans(
          250,
          '"\'Yes,\' Kraft chuckled, \'Tell him to get back in.\'" and White "handed all these items to McDivitt along with the gun"; Kraft "acted as both Mission Director for the entire flight and Flight Director for the first shift"',
        ),
        learning('"This is the greatest experience," he said. "It\'s just tremendous."'),
      ],
      discrepancy:
        "For how long White was outside, the Smithsonian also gives 22 minutes; NASA's Gemini IV page and NSSDCA give 23 minutes, NASA's \"Learning to Walk in Space\" article and the Gemini chronology 20 minutes, NASA's spacewalking history article 36 minutes, and NASA's caption for photo S65-34635 21 minutes. The mission report's own times, egress at approximately 04:23:00 and ingress starting at about 04:46:00 (section 4.1), are 23 minutes apart. We follow the report's section 7.1.1.4, approximately 22 minutes.",
      photo: nasaPhoto(
        'S65-32919',
        1585,
        1600,
        'Ed White floats upside down, his boots toward the sky, high above blue ocean streaked with white clouds, joined to the dark spacecraft at left by a looping gold-wrapped cord.',
      ),
      view: 'spacecraft',
      inTour: true,
    },
    {
      id: 'hatch-locked',
      title: 'The stubborn hatch',
      chapter: 'spacewalk',
      elapsed: '005:06:00',
      text: {
        short:
          'The hatch will not lock. White and McDivitt struggle with it together until it finally closes, and air flows back into the cabin.',
        more: 'The latch handle swung back and forth without catching, because a spring in the latch was failing. Pushing on the handle lifted White out of his seat, so McDivitt pulled on him for leverage and on a strap and bar made for pulling the hatch shut, until White felt the handle catch and the latch locked. White sat back exhausted, sweat running into his eyes. By 5 hours 6 minutes after liftoff the hatch was closed and the cabin full of air again. Because closing it had been so hard, the crew did not open the hatch again to throw out the spacewalk gear as planned, and carried it for the rest of the flight. The latch was redesigned for later spacecraft.',
      },
      citations: [
        ACTUAL_MISSION('4-2'),
        report('Section 5.1.1.4, "Hatch closing and latching difficulty"', '5-4', '5-5'),
        PILOTS_EVA('7-21'),
        CREW_EVA('7-8'),
        report(
          'Section 7.1.1.5, "Crew station housekeeping": "excessive stowage caused by retention of EVA equipment"',
          '7-8',
        ),
        report('Section 9.0, "Conclusions", item 2', '9-1'),
        titans(
          250,
          '"Pushing on the handle lifted White out of his seat, so McDivitt pulled on him to give him some leverage" and "sweat streaming into his eyes"',
        ),
      ],
      discrepancy:
        "The Gemini chronology says the hatch was closed at 4 hours 54 minutes, and NASA's Gemini IV page and NSSDCA give 3:10 p.m. EST, the same time, with the cabin's repressurization beginning at 3:12:50 p.m. EST. We follow the mission report's section 4.1: final hatch closure and repressurization were completed at 05:06 (given to the minute; seconds written as 00).",
      view: 'spacecraft',
      inTour: true,
    },

    /* --------------------------- Four days in orbit ------------------------- */
    {
      id: 'sleep',
      title: 'Taking turns to sleep',
      chapter: 'four-days',
      elapsed: '007:30:00',
      text: {
        short:
          'Now the crew lets the spacecraft drift to save fuel, and White goes to sleep. The astronauts take turns, but sleeping is hard in such a small, noisy cabin.',
        more: "After the spacewalk, flight controllers told the crew to let Gemini 4 drift, firing the thrusters as little as possible. The plan was for each astronaut to sleep for four hours while the other worked, but radio calls came through even with the volume turned all the way down, and light, the sound of the cabin's pressure relieving, and the thump of thruster firings woke them. Whoever was awake often bumped the sleeper by accident. Down in Houston, the flight controllers also took turns, in three shifts around the clock.",
      },
      citations: [
        titans(
          250,
          '"Seven and a half hours after liftoff, White went to sleep" (to the half hour; written as 007:30:00), "alternate periods of four hours each", and "Whoever was on duty frequently bumped the sleeper"',
        ),
        ACTUAL_MISSION('4-2'),
        report(
          'Section 7.2.2.2.4, "Sleep": sleep "disturbed by radio communications, the ambient light, the sound and feel of the cabin pressure relieving, and the poundings felt from the thruster firings"',
          '7-46',
        ),
        report(
          'Section 5.1.2.1: "voice communications interrupted the sleeping periods of the crew members even though the volume controls were in the minimum position"',
          '5-6',
        ),
      ],
      view: 'earth',
    },
    {
      id: 'back-to-work',
      title: 'Back to work',
      chapter: 'four-days',
      elapsed: '022:00:00',
      text: {
        short:
          'After almost a day of drifting, the crew goes back to its plan of experiments. They take pictures of Earth and try finding their way by the stars, as Apollo crews might one day.',
        more: "About an hour earlier, the crew had made their first successful navigation sighting from orbit. To save fuel they still let the spacecraft drift much of the time, and their first experiments with it held steady came at 33 hours. Over the four days they ran 11 experiments: they measured radiation, tested an exercise device, and took many pictures of land and weather for scientists, like this view of the Nile delta, taken earlier, on their 12th revolution. With a sextant they measured the angles between stars and Earth's horizon, to see whether Apollo crews could navigate that way on their trips to the Moon. Seeing stars in daylight turned out to be very hard.",
      },
      citations: [
        ACTUAL_MISSION('4-3'),
        report(
          'Section 2.0, "Introduction", second-order objective (f), the 11 experiments',
          '2-1',
        ),
        report('Section 7.1.2.4.3, "Experiments": M-3, S-5 and S-6, D-8, and D-9', '7-22'),
        report('Section 9.0, "Conclusions", items 15 and 20', '9-3'),
        learning(
          '"One investigation involved spacecraft navigation using a sextant to measure their position using the stars. The objective was to investigate the feasibility of using this technique for lunar flights on the Apollo program."',
        ),
      ],
      discrepancy:
        "Section 4.1 of the mission report also says drifting flight was kept up for approximately the next 2.5 days after the spacewalk, and NSSDCA says 30 hours. The text follows section 4.1's times: the return to the normal flight plan at 22 hours, and the first experiments in a controlled attitude at 33 hours.",
      photo: nasaPhoto(
        's65-34776',
        1600,
        1499,
        'Seen from orbit, the dark Nile delta fans out into the deep blue Mediterranean Sea between tan deserts, with narrow blue arms of the sea reaching into the desert beyond it.',
      ),
      view: 'earth',
    },
    {
      id: 'computer-trouble',
      title: 'The computer fails',
      chapter: 'four-days',
      elapsed: '075:45:43',
      text: {
        short:
          "When McDivitt tries to switch off the spacecraft's computer, it will not turn off, and a warning light comes on. Now the computer cannot help steer them home.",
        more: 'The computer had been turned on and off many times to take in updates from the ground. This time, at about 75 hours 46 minutes, it would not power down. Over the next several revolutions, flight controllers radioed up one thing after another to try, but nothing worked, and trying to cut its power had scrambled its memory. Without it, the crew could not steer their reentry toward a target. Instead they would roll the spacecraft slowly as it fell, at 15 degrees per second, so its lift would cancel out, much as the earlier Mercury spacecraft had come home.',
      },
      citations: [
        ACTUAL_MISSION('4-3'),
        report(
          'Section 5.1.5.2.2, "Orbital phase", computer operation: "it was turned on and off 12 more times" and "After completion of the 12th update at 75:46:00 g.e.t., the computer power switch was placed in the \'off\' position, but the computer failed to power-down"',
          '5-18',
        ),
        SUMMARY('1-1'),
        report(
          'Section 4.3.1.4, "Reentry": "fly a zero lift reentry by rolling the spacecraft at 15 deg/sec"',
          '4-10',
        ),
        titans(
          252,
          '"the crew received instructions for trying different switch positions" and "a rolling Mercury-type reentry"',
        ),
        nmc(
          'Mission Profile: "A zero-lift ballistic reentry, similar to that used by the Mercury program"',
        ),
      ],
      discrepancy:
        "Section 5.1.5.2.2 of the mission report gives 75:46:00 for the failed power-down. Sections 1.0 and 9.0 put the memory's alteration in revolution 48, and section 6.1.2.2 says the computer would not shut down on revolution 49. We follow section 4.1, approximately 75:45:43.",
      view: 'spacecraft',
    },

    /* ------------------------------ Coming home ----------------------------- */
    {
      id: 'thruster-braking',
      title: 'A firing before retrofire',
      chapter: 'home',
      elapsed: '097:28:02',
      text: {
        short:
          "On their last trip around Earth, the crew fires the spacecraft's own thrusters to start slowing down. It shows the thrusters could bring them home if the retrorockets ever failed.",
        more: "Showing that the maneuvering thrusters could stand in for the retrorockets was one of the flight's goals. The crew fired the thrusters at the back of the spacecraft for 2 minutes 41 seconds, timed by the tracking station in Hawaii because the computer was out. The firing lowered the orbit's low point to a theoretical 42.3 nautical miles (78 kilometers), a little below the planned 45. Then, at 97 hours 39 minutes 14 seconds, the crew cast off the equipment section at the back of the spacecraft. The separation was very loud.",
      },
      citations: [
        sequence('Preretrofire maneuver initiate', '4-13'),
        ACTUAL_MISSION('4-4'),
        report(
          'Section 2.0, "Introduction", second-order objective (e): "Demonstrate orbital attitude and maneuver system (OAMS) capability to operate as a backup for the retrograde rocket system"',
          '2-1',
        ),
        report(
          'Section 6.1.2.3, "Reentry": the Hawaii site gave the time hack, and "The duration of this burn was timed by Hawaii to be 2 minutes 41 seconds"',
          '6-5',
        ),
        report(
          'Section 7.1.2.5, "Preretrofire and retrofire": "The adapter separation was very loud"',
          '7-26',
        ),
        titans(
          252,
          '"In revolution 62, at 97 hours 28 minutes, they fired their maneuvering thrusters in the proper retroattitude for 2 minutes 41 seconds"',
        ),
      ],
      discrepancy:
        "Table 5.1-IV of the mission report (page 5-55, PDF page 171) gives the firing's length as 2 minutes 40.6 seconds (printed in seconds), and section 6.1.2.3 gives 2 minutes 40.5 seconds from a quick look at telemetry. We follow section 4.1, 2 minutes 41 seconds, which the Hawaii station timed.",
      view: 'spacecraft',
    },
    {
      id: 'retrofire',
      title: 'Retrofire',
      chapter: 'home',
      elapsed: '097:40:01',
      utc: '1965-06-07T16:56:00Z',
      text: {
        short:
          'Four small rockets fire one after another to slow Gemini 4 down, and it starts its fall toward the Atlantic Ocean.',
        more: 'Retrofire, the engine firing that starts the trip home, came automatically, about 1 second early, after a countdown from the tracking station at Guaymas, Mexico. All four retrorockets fired and slowed the spacecraft by 333.5 feet per second (about 227 miles per hour). White watched the brown, dusty plains of Texas pass below, and then the section that had held the rockets was cast off. Without the computer, McDivitt set the spacecraft rolling as it entered the atmosphere. Behind them, the cast-off section burned like an orange mushroom, and the crew felt up to 7.7 times their normal weight.',
      },
      citations: [
        sequence('Retrofire', '4-13'),
        sequence('Retroadapter separate', '4-13'),
        ACTUAL_MISSION('4-4'),
        report(
          'Section 5.1.8.3, "Retrograde rocket system": "The actual imparted spacecraft velocity decrement of 333.5 ft/sec"',
          '5-34',
        ),
        report(
          'Section 6.1.2.3, "Reentry": the countdown to retrofire over Guaymas, and "All four rockets fired"',
          '6-5',
        ),
        report(
          'Table 4-II, "Comparison of Planned and Actual Trajectory Parameters", "Reentry deceleration, g", actual final column',
          '4-14',
        ),
        titans(
          252,
          '"White watched the brown, dusty Texas plains pass in review and then released the retroadapter" and the adapter "turn into an orange mushroom as it burned"',
        ),
        nmc('Mission Profile: "retrofire at 11:56:00 a.m. EST on June 7" (UTC is our conversion)'),
      ],
      discrepancy:
        "Section 5.1.8.3 of the mission report (page 5-34) gives the first retrorocket's ignition as 97:40:00.7, and section 5.1.6 (page 5-27), as corrected by the report's change sheet (Change 1, pen-and-ink change 11, PDF page 3), gives the actual time of retrofire as 97:40:00.70, approximately 1.3 seconds early. We follow Table 4-I, 97:40:01.",
      view: 'spacecraft',
      inTour: true,
    },
    {
      id: 'parachutes',
      title: 'Parachutes open',
      chapter: 'home',
      elapsed: '097:50:53',
      text: {
        short:
          'The small drogue parachute opens, and the spacecraft swings wildly under it. Then the big main parachute opens and lowers Gemini 4 toward the sea.',
        more: 'The drogue came out at 40,000 feet (about 12,200 meters), lower than the usual 50,000, while the spacecraft was still rolling about 60 degrees per second. The small thrusters that steady the spacecraft may already have run out of fuel, and it rocked hard under the drogue until the parachute opened all the way. The main parachute came out at 97 hours 52 minutes 11 seconds, smoothly and with no torn panels. The crew braced for the jolt when the spacecraft swung into its landing position, with their arms against the window and their heads on their arms.',
      },
      citations: [
        sequence('Drogue deployment', '4-13'),
        sequence('Pilot parachute deployment', '4-13'),
        ACTUAL_MISSION('4-4'),
        report('Section 5.1.11, "Landing System"', '5-47'),
        report('Section 7.1.2.6, "Reentry and landing"', '7-27', '7-28'),
      ],
      view: 'earth',
    },

    /* ------------------------------- Splashdown ----------------------------- */
    {
      id: 'splashdown',
      title: 'Splashdown',
      chapter: 'splashdown',
      elapsed: '097:56:12',
      utc: '1965-06-07T17:12:11Z',
      text: {
        short:
          'Gemini 4 splashes down hard in the Atlantic Ocean, almost four days after liftoff. It dips under the water, then bobs back up.',
        more: 'The landing came at 12:12 p.m. Eastern Standard Time on June 7, about 48 nautical miles (55 miles) from the aircraft carrier USS Wasp. The crew let go of the parachute right away, and the spacecraft came straight back to the surface. A helicopter crew watched it come down, and helicopters with swimmers arrived about 14 minutes after landing. The swimmers fastened a flotation collar around Gemini 4, and the astronauts, still in their spacesuits, climbed out into a raft.',
      },
      citations: [
        sequence('Landing', '4-13'),
        ACTUAL_MISSION('4-4'),
        report(
          'Section 7.1.2.6, "Reentry and landing": "Water landing was somewhat more severe than the crew had expected. The spacecraft went under water"',
          '7-28',
        ),
        report('Section 6.3.2, "Location and Retrieval"', '6-11', '6-12'),
        report(
          'Table 7.2-VI, "Postflight Events and Medical Activities": "Crew decision to remain in suits for helicopter pickup"',
          '7-55',
        ),
        nasaMission('Mission Facts: "Landing Date: Jun. 7, 1965, 12:12:11 EST (17:12:11 UT)"'),
        titans(253, '"one helicopter crew watched the spacecraft descend to the ocean"'),
      ],
      discrepancy:
        "The Gemini chronology gives the landing as 12:13 p.m. We follow Table 4-I, 97:56:12, which NASA's Gemini IV page gives as 12:12:11 p.m. EST.",
      photo: nasaPhoto(
        's65-33490',
        1600,
        1567,
        'Seen from above, the dark Gemini 4 spacecraft floats in deep blue water inside a yellow flotation collar, with a swimmer at its open hatch. An astronaut in a white spacesuit sits in a yellow raft beside it while one swimmer holds on to the raft and another swims nearby.',
      ),
      view: 'earth',
      inTour: true,
    },
    {
      id: 'aboard-wasp',
      title: 'Aboard the carrier',
      chapter: 'splashdown',
      elapsed: '098:53:00',
      utc: '1965-06-07T18:09:00Z',
      text: {
        short:
          'A helicopter carries McDivitt and White to the aircraft carrier USS Wasp. They walk across the deck on a red carpet as the sailors cheer.',
        more: 'The helicopter picked the crew up from the raft 34 minutes after landing and set down on the Wasp 98 hours 53 minutes after liftoff. During the helicopter ride, a NASA doctor reported that the astronauts seemed to be in good shape after four days of weightlessness. The Wasp came alongside the spacecraft at 100 hours 5 minutes and had it on deck 7 minutes later. Gemini 4 had made 62 revolutions around Earth.',
      },
      citations: [
        report(
          'Section 6.3.2, "Location and Retrieval": "The recovery helicopter landed aboard the U.S.S. Wasp at 98:53 g.e.t." (given to the minute; seconds written as 00)',
          '6-11',
          '6-12',
        ),
        report(
          'Table 7.2-VI, "Postflight Events and Medical Activities": "1:09 p.m. Arrived aboard U.S.S. Wasp" (UTC is our conversion from e.s.t.)',
          '7-55',
        ),
        titans(
          253,
          '"Fifty-seven minutes after touchdown, the crew stepped onto a triumphal red carpet on the deck of the aircraft carrier Wasp" and "an MSC physician reported that the crew seemed to be in good shape"',
        ),
        learning('"receiving a tremendous ovation from the sailors on the deck of the Wasp"'),
        nasaMission(
          'Mission Facts: "Revolutions Completed: 62"; Mission Overview: "flown to the aircraft carrier U.S.S. Wasp at 1:09 p.m."',
        ),
      ],
      photo: nasaPhoto(
        's65-19530',
        1600,
        1218,
        "Black-and-white view from above of the carrier's flight deck: McDivitt and White, in spacesuits, walk along a dark carpet between officers and flag bearers, with crowds of sailors in white uniforms behind them.",
      ),
      view: 'earth',
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Gemini IV spacecraft',
        museum: 'Smithsonian National Air and Space Museum',
        place: 'Washington, DC',
      },
      citations: [
        nasm(
          'Display Status: "This object is on display in Boeing Milestones of Flight Hall at National Air and Space Museum in Washington, DC."',
        ),
      ],
    },
  ],
};
