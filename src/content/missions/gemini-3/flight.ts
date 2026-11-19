/**
 * The Gemini 3 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * One ship: the crew's spacecraft, Molly Brown ("gemini", the main ship).
 *
 * Sources. NASA's own copy of the Gemini 3 mission report (MSC-G-R-65-2)
 * was not found, so this plan is built from:
 * - NSSDCA's Master Catalog: its launch and orbital information page gives
 *   the three orbits Gemini 3 flew (heights, inclination, and the times they
 *   applied), and its main page the insertion time, the time of the third
 *   orbit change, retrofire, and the landing point.
 * - On the Shoulders of Titans (NASA SP-4203), Appendix B, "Flight Data
 *   Summary": launch time, the highest apogee, and the landing point.
 * - NASA's Gemini III page: the same times, the landing point, and the
 *   recovery.
 * - The composite air-to-ground and onboard voice transcription of the GT-3
 *   mission (NASA Manned Spacecraft Center, April 1965): the start and end
 *   of each thruster firing, retrofire, and the drogue parachute, from the
 *   crew's own calls. Its pages are cited as printed, then as the scan's PDF
 *   page (one more).
 * - NASA's article "60 Years Ago: Gemini III": the drogue parachute height.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini 3's ground elapsed time: zero at lift-off,
 * 14:24:00.064 UT on March 23, 1965 (NASA's Gemini III page and NSSDCA;
 * SP-4203 prints 9:24:00.064 a.m. e.s.t.). The transcript prints elapsed
 * time to the whole second, and its clock agrees with that zero: the ground
 * read up retrofire as "GMTRC 18 57 23 for a GETRC of 04 33 23".
 *
 * Arithmetic of ours, from printed values:
 * - Orbit heights printed in kilometers are written in nautical miles
 *   (1 nautical mile = 1.852 km), to the digits the kilometers carry:
 *   158 km is 85.3, 169 km is 91.3, and 84 km is 45.4 nautical miles.
 *   50,000 feet is 8.23 nautical miles (1 foot = 0.3048 m).
 * - Times printed in EST are moved to the mission clock by subtracting
 *   9:24 a.m. (lift-off), for example 5:03 p.m. is 7:39 on the clock.
 * - The landing point is printed in degrees and minutes; we write it in
 *   decimal degrees.
 * - The universal times sent to Horizons are lift-off plus the mission
 *   clock times of the sky samples.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The launch pad: Launch Complex 19 is placed where the Gemini VIII plan
 *   places it (its estimate from that flight's report; see
 *   missions/gemini-8/flight.ts), since every crewed Gemini flew from it.
 * - The climb to orbit, and where the orbit begins: no insertion point is
 *   published, so the plane comes from the launch site and the published
 *   inclination, and the insertion point is an illustrative distance
 *   downrange (see src/sim/build.ts). No flown launch azimuth is published
 *   in the sources we have (the press kit gives only the planned one, and a
 *   press kit is not cited for what was flown), so the orbit leaves the
 *   Cape toward the northeast, the engine's default, which is the way a
 *   Gemini launch from the Cape went.
 * - The orbit: a Kepler ellipse turned slowly by Earth's bulge (J2), with
 *   air drag left out. Its size changes in two steps, each drawn over the
 *   firing's own time (its start and end calls in the transcript): the
 *   first orbit change, and the lowering of the perigee before retrofire.
 *   NSSDCA's table gives the orbit between the first two changes and after
 *   the third, and its epoch for the first change, 16:00:00 UT, is a round
 *   time about two minutes after the firing ended; we draw the change at
 *   the firing. The second change, the 0.02-degree tilt of the orbit's
 *   plane during the second revolution, is too small to see and is not
 *   drawn.
 * - Orbit heights are measured from Earth's equatorial radius; NSSDCA does
 *   not say what its heights are measured from.
 * - Retrofire ends at the crew's report that all four retrorockets had
 *   fired (04:33:44 in the transcript); when the last one burned out is not
 *   published. Where retrofire happened is not published either; the
 *   engine places it so the fall reaches the landing point on time, and the
 *   entry is a smooth ground track to the landing point and a smooth descent
 *   to the drogue parachute height.
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until the carrier Intrepid lifted it aboard; its drift is not drawn.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const TRANSCRIPT = "https://www.nasa.gov/wp-content/uploads/2026/01/gt03-tec.pdf";
const NMC_GEMINI = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-024A";
const NMC_ORBITS = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/displayTrajectory.action?id=1965-024A";
const GEMINI_8_REPORT =
  "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf";
const CHRONOLOGY_1965 = "https://www.nasa.gov/history/SP-4002/p3a.htm";
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES = "&TLIST_TYPE=%27CAL%27&TLIST=%271965-03-23%2014:24:00.064%27,%271965-03-23%2018:57:23.064%27,%271965-03-23%2019:16:31.064%27";
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

/** A line of the voice transcription: its printed page (the scan's PDF page is one more), elapsed time, speaker, and words. */
function transcript(page: number, line: string): Citation {
  return {
    source: "gemini-3-voice-transcript",
    locator: `page ${page} (PDF page ${page + 1}), ${line}`,
    url: TRANSCRIPT,
  };
}

/** NSSDCA's launch and orbital information for Gemini 3: one of its three orbits. */
function orbitTable(epoch: string, column: string): Citation {
  return {
    source: "nssdca-master-catalog",
    locator: `"Launch/Orbital information for Gemini 3" (1965-024A), Trajectory Details, orbit with epoch start ${epoch} UTC, ${column}`,
    url: NMC_ORBITS,
  };
}

/** The NSSDCA Master Catalog page for Gemini 3. */
function nmc(section: string): Citation {
  return { source: "nssdca-master-catalog", locator: `"Gemini 3" (1965-024A), ${section}`, url: NMC_GEMINI };
}

/** On the Shoulders of Titans, Appendix B, "Flight Data Summary", the Gemini 3 row (printed page 524, PDF page 545). */
function flightData(quote: string): Citation {
  return {
    source: "on-the-shoulders-of-titans",
    locator: `Appendix B, "Flight Data Summary-Continued", Gemini 3 row, Description column (page 524, PDF page 545): ${quote}`,
  };
}

/** NASA's Gemini III page. */
function nasaMission(section: string): Citation {
  return { source: "nasa-gemini-3-mission", locator: section };
}

const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY("301", "500@399", "31");
const EARTH_FROM_MOON = HORIZONS_QUERY("399", "500@301", "14");
const SUN_FROM_EARTH = HORIZONS_QUERY("10", "500@399", "31");

/** Degrees and minutes as printed, in decimal degrees. */
function degrees(whole: number, minutes: number): number {
  return whole + minutes / 60;
}

/* ------------------------------------------------------------------ */
/* Times on the mission clock.                                         */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  "000:00:00",
  transcript(2, '00 00 00, CC: "Bolts and lift-off."'),
  nasaMission('Mission Overview: "launched from Complex 19 on Mar. 23, 1965, at 9:24 a.m. EST (14:24:00.064 UT)"'),
  flightData('"launch, 9:24:00.064 a.m., e.s.t."'),
);
const INSERTION = at(
  "000:05:54",
  nmc('Mission Profile: "inserted 5 minutes 54 seconds later (9:29:54 a.m. EST)"'),
  nasaMission('Mission Overview: "inserted 5 minutes and 54 seconds later (9:29:54 a.m. EST)"'),
);

/* The first orbit change: the crew's calls at its start and end. */
const FIRST_CHANGE = at("001:33:00", transcript(37, '01 33 00, Grissom (C): "MARK!", then 01 33 01, Young (P): "Okay. They appear to be firing good."'));
const FIRST_CHANGE_END: Cited<ElapsedTime> = {
  ...at(
    "001:34:14",
    transcript(38, '01 34 14, Young (P): "MARK!" and Grissom (C): "Thrusting complete."; 01 34 21, Young: "That burn was 1 minute and 14 seconds by our watches."'),
  ),
  discrepancy:
    "On the Shoulders of Titans (chapter X, page 235) says the firing lasted 1 minute 15 seconds. We follow the transcript, 1 minute 14 seconds, which NASA's article \"60 Years Ago: Gemini III\" also gives.",
};

/* The third orbit change, which lowered the perigee before retrofire. */
const PERIGEE_LOWERING = at(
  "004:21:23",
  transcript(91, '04 21 23, Grissom (C): "MARK!" and 04 21 28, CC: "We got your start of burn."'),
  nmc('Mission Profile: "Near the end of the third orbit, at 4:21:23 ground elapsed time, or GET (1:45:23 p.m. EST) the perigee was lowered to 84 km"'),
);
const PERIGEE_LOWERING_END: Cited<ElapsedTime> = {
  ...at("004:23:14", transcript(91, '04 23 14, Grissom (C): "MARK! End of burn." and 04 23 16, CC: "Mark end of burn."')),
  discrepancy:
    "The crew timed the firing at 1 minute 48 seconds (transcript page 90, 04 23 19), three seconds less than between their two marks. On the Shoulders of Titans (page 235) calls it a two and a half minute burn. We follow the marks.",
};

const RETROFIRE = at(
  "004:33:23",
  transcript(96, '04 33 13, CC: "10 - 9 - 8 - 7 - 6 - 5 - 4 - 3 - 2 - 1 - Retrofire." and 04 33 23, Grissom (C): "Auto-retro."'),
  transcript(83, '04 00 25, CC: "The GMTRC is 18 57 23 for a GETRC of 04 33 23."'),
  nmc('Mission Profile: "retrofire at 4:33:23 GET (1:57:23 p.m. EST)"'),
);
/** Our reading: the burn was over by the crew's report that all four retrorockets had fired. */
const RETROFIRE_END = at(
  "004:33:44",
  transcript(97, '04 33 44, Grissom (C): "All rockets fired normally and attitudes were right in the center." (the end of the firing itself is not printed)'),
);
const DROGUE: Cited<ElapsedTime> = {
  ...at("004:46:48", transcript(100, '04 46 48, Grissom (C): "There goes the drogue."')),
  discrepancy:
    'Ten seconds earlier (04 46 38) Grissom read his altimeter as "60 000"; NASA\'s article "60 Years Ago: Gemini III" says the drogue came out at 50,000 feet. The scene uses the article\'s height.',
};
const LANDING = at(
  "004:52:31",
  transcript(105, '04 52 31, "(Impact)"'),
  nmc('Mission Profile: "Splashdown occurred in the Atlantic in the vicinity of Grand Turk Island, at 22.43 N, 70.85 W, at 4:52:31 GET (2:16:31 p.m. EST)"'),
  nasaMission('Mission Facts: "Duration: 4 hours, 52 minutes, 31 seconds" and "Landing Date: Mar. 23,1965, 2:16:31 EST (19:16:31 UT)"'),
);
/** The end of the path: the carrier lifted the spacecraft aboard. */
const SPACECRAFT_ABOARD = at(
  "007:39:00",
  nasaMission('Mission Overview: "The Gemini capsule was recovered at 5:03 p.m. EST." (given to the minute; seconds written as 00)'),
  { source: "gemini-chronology", locator: 'Part III (A), March 23, 1965: "Spacecraft recovery was completed at 5:03."', url: CHRONOLOGY_1965 },
);

/* ------------------------------------------------------------------ */
/* Places and orbits.                                                  */
/* ------------------------------------------------------------------ */

/*
 * Launch Complex 19, as the Gemini VIII plan places it, with that plan's
 * citations: the Gemini VIII report does not print where the pad is either,
 * so it is that plan's estimate from the report's first-stage cutoff point,
 * its range from the launch site, and the flight azimuth (see
 * missions/gemini-8/flight.ts). Every crewed Gemini flew from this pad.
 */
const PAD_19_ESTIMATE: [Citation, ...Citation[]] = [
  { source: "gemini-chronology", locator: 'Part III (A), March 23, 1965: GT-3 "was launched from complex 19"', url: CHRONOLOGY_1965 },
  {
    source: "gemini-8-mission-report",
    locator:
      'Section 1.0 (page 1-1): the spacecraft "was launched from Complex 19"; our estimate of where Complex 19 is, not a printed value: the point from which a great circle at the flight azimuth reaches the BECO point after the BECO range',
    url: GEMINI_8_REPORT,
  },
  {
    source: "gemini-8-mission-report",
    locator:
      'Table 4.3-I, "Comparison of Planned and Actual Gemini Space Vehicle Trajectory Parameters" (pages 4-22 and 4-23), BECO, "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.36 N, 79.61 W, 51.4)" row, actual final column',
    url: GEMINI_8_REPORT,
  },
  {
    source: "gemini-8-mission-report",
    locator: 'Section 4.1 (page 4-1): "the GLV was launched ... on a rendezvous launch azimuth of 99.9 degrees"',
    url: GEMINI_8_REPORT,
  },
];
const PAD_19 = {
  latitude: cite(28.51, ...PAD_19_ESTIMATE),
  longitude: cite(-80.57, ...PAD_19_ESTIMATE),
};

/** Where the spacecraft came down, and floated until the carrier lifted it aboard. */
const SPLASHDOWN = {
  latitude: {
    ...cite(
      degrees(22, 26),
      flightData('"landing, 22°26\' N, 70°51\' W"'),
      nmc('Mission Profile: "at 22.43 N, 70.85 W"'),
      nasaMission('Mission Facts: "Landing Site: Near Grand Turk Island, 22.43° N, 70.85° W"'),
    ),
    discrepancy:
      "The sources do not say whether this latitude is geodetic; we draw it as a map latitude. NSSDCA's orbital information page prints the longitude as 70.850 without a sign; its main page and NASA's Gemini III page say west.",
  },
  longitude: cite(-degrees(70, 51), flightData('"landing, 22°26\' N, 70°51\' W" (printed west)'), nmc('Mission Profile: "70.85 W"')),
};

const INSERTION_EPOCH = "1965-03-23 14:24:00";
const SECOND_EPOCH = "1965-03-23 16:00:00";
const THIRD_EPOCH = "1965-03-23 18:45:23";

/** The orbit Gemini 3 was put into, which it kept for most of its first revolution. */
const INSERTION_ORBIT = {
  apoapsis: {
    ...cite(
      121,
      nmc('Mission Profile: "into a 161.2 x 224.2 km (87 x 121 nautical mile) orbit with a period of 88.3 minutes"'),
      orbitTable(INSERTION_EPOCH, "Apoapsis 224.20 km"),
      flightData('"highest apogee, 224 km (121 n.m.)"'),
    ),
    discrepancy:
      'Just after insertion the ground radioed "We have an 87 by 125 orbit" (transcript page 5, 00 07 23), a first estimate. On the Shoulders of Titans (chapter X, page 235) gives the orbit as 122 by 175 kilometers. We follow NSSDCA and the same book\'s Appendix B, 121 nautical miles.',
  },
  periapsis: cite(87, nmc('Mission Profile: "(87 x 121 nautical mile) orbit"'), orbitTable(INSERTION_EPOCH, "Periapsis 161.20 km")),
};

/** After the first orbit change: 169 by 158 kilometers, in nautical miles (our conversion). */
const SECOND_ORBIT = {
  apoapsis: {
    ...cite(
      91.3,
      orbitTable(SECOND_EPOCH, "Apoapsis 169.00 km (91.3 nautical miles, our conversion)"),
      nmc('Mission Profile: "the first orbital maneuver, which lowered the orbit to a near-circular 158 x 169 kms"'),
    ),
    discrepancy:
      'After the firing the ground radioed "After your burn your orbit is 85.6, 92.6" (transcript page 44, 01 50 32), and NASA\'s article "60 Years Ago: Gemini III" gives 97 miles by 105 miles. We follow NSSDCA, 158 by 169 kilometers.',
  },
  periapsis: {
    ...cite(85.3, orbitTable(SECOND_EPOCH, "Periapsis 158.00 km (85.3 nautical miles, our conversion)"), nmc('Mission Profile: "158 x 169 kms"')),
    discrepancy:
      "On the Shoulders of Titans, Appendix B, gives the lowest perigee as 158.5 km (85.6 n.m.), the same as the ground's radio call after the firing. We follow NSSDCA's 158 km, which goes with its apogee.",
  },
};

/** After the perigee was lowered: 169 by 84 kilometers, in nautical miles (our conversion). */
const THIRD_ORBIT = {
  apoapsis: cite(91.3, orbitTable(THIRD_EPOCH, "Apoapsis 169.00 km (91.3 nautical miles, our conversion)")),
  periapsis: {
    ...cite(
      45.4,
      orbitTable(THIRD_EPOCH, "Periapsis 84.00 km (45.4 nautical miles, our conversion)"),
      nmc('Mission Profile: "the perigee was lowered to 84 km to allow the orbit to decay naturally in case of retrorocket failure"'),
    ),
    discrepancy:
      'On the Shoulders of Titans (chapter X, page 235) says the burn "dropped the spacecraft\'s perigee to 72 kilometers", and NASA\'s article "60 Years Ago: Gemini III" says "to 45 miles". We follow NSSDCA, 84 km, which goes with its apogee.',
  },
};

const PROGRADE: Cited<"prograde"> = cite("prograde", orbitTable(INSERTION_EPOCH, "Inclination 32.600° (below 90 degrees, so eastward)"));

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: "gemini-3",

  // Three samples: lift-off, retrofire, and landing.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(256.6968003, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-03-23 14:24:00.064", MOON_FROM_EARTH)),
      subLunarLongitude: cite(218.693673, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-03-23 14:24:00.064", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(2.7414805, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-03-23 14:24:00.064", SUN_FROM_EARTH)),
    },
    {
      time: RETROFIRE,
      moonEclipticLongitude: cite(258.9808987, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-03-23 18:57:23.064", MOON_FROM_EARTH)),
      subLunarLongitude: cite(152.611154, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-03-23 18:57:23.064", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(2.9296901, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-03-23 18:57:23.064", SUN_FROM_EARTH)),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(259.1404871, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-03-23 19:16:31.064", MOON_FROM_EARTH)),
      subLunarLongitude: cite(147.986481, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-03-23 19:16:31.064", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(2.9428617, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-03-23 19:16:31.064", SUN_FROM_EARTH)),
    },
  ],

  ships: [
    {
      id: "gemini",
      name: "Gemini 3 spacecraft, Molly Brown",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
        },
        {
          kind: "orbit",
          label: "Three trips around Earth",
          body: "earth",
          start: INSERTION,
          end: RETROFIRE,
          ...INSERTION_ORBIT,
          inclination: cite(32.6, orbitTable(INSERTION_EPOCH, "Inclination 32.600°")),
          sense: PROGRADE,
          sizes: [
            // The first orbit change, a step: the insertion orbit until the
            // thrusters fired, the smaller, rounder orbit when they stopped.
            { time: FIRST_CHANGE, ...INSERTION_ORBIT },
            { time: FIRST_CHANGE_END, ...SECOND_ORBIT },
            // The perigee lowered before retrofire, a second step.
            { time: PERIGEE_LOWERING, ...SECOND_ORBIT },
            { time: PERIGEE_LOWERING_END, ...THIRD_ORBIT },
          ],
        },
        {
          kind: "burn",
          label: "Retrofire",
          body: "earth",
          start: RETROFIRE,
          end: RETROFIRE_END,
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: RETROFIRE_END,
          end: LANDING,
          drogue: DROGUE,
          // 50,000 feet, in nautical miles (our conversion).
          drogueAltitude: cite(8.23, {
            source: "nasa-gemini-3-60-years",
            locator: '"At 50,000 feet, Grissom deployed the drogue parachute to stabilize and slow the spacecraft"',
          }),
          splashdown: SPLASHDOWN,
        },
        {
          kind: "surface",
          label: "Floating until the carrier lifts it aboard",
          body: "earth",
          start: LANDING,
          end: SPACECRAFT_ABOARD,
          site: SPLASHDOWN,
        },
      ],
    },
  ],
};
