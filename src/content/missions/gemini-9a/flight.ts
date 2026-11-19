/**
 * The Gemini IX-A flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the crew's spacecraft ("gemini", the main ship) and the
 * Augmented Target Docking Adapter ("atda", the target it met three times
 * and could not dock with). The ATDA had been in orbit since June 1, 1966;
 * its path starts at Gemini IX-A's lift-off and is placed by its published
 * lead when the spacecraft reached orbit.
 *
 * NASA's copy of the Gemini IX-A mission report (MSC-G-R-66-6) was not
 * found. The sources, in the order we follow them:
 * - The Gemini chronology (SP-4002), Appendix 1: launch azimuth, the orbits
 *   at insertion and at retrofire, the spacecraft's orbit during each of the
 *   three rendezvous and after the last, the three periods of station
 *   keeping, retrofire, touchdown, landing point, and recovery. Its June 1
 *   entry gives the ATDA's orbit.
 * - The Gemini IX-A air-to-ground and onboard transcript: when each firing
 *   started and ended, as the crew and capsule communicators called it.
 * - Summary of Rendezvous Operations (SP-138): where the spacecraft stood
 *   when the first and third final approaches began (Table 2-IV).
 * - On the Shoulders of Titans (SP-4203): the ATDA's lead at insertion, the
 *   orbit overnight, and the range when the third final approach began.
 * - Gemini Control's commentary (the PAO transcript): the orbit after the
 *   first catch-up firing, the spacecraft's lead overnight, and the orbit
 *   after the orbit-shaping firing on the third day.
 * - NSSDCA: lift-off in UT, and the ATDA's inclination.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini IX-A's ground elapsed time, zero at lift-off,
 * 13:39:33.335 UT on June 3, 1966 (NSSDCA; Appendix 1 of the chronology
 * prints 8:39:33 a.m. e.s.t.). The transcript's clock is the same one: it
 * logs "LIFT-OFF" at 00:00:01, retrofire at 71:46:44 (the chronology's
 * time), and "Lift-off 13:39:33" at 00:00:41.
 *
 * Arithmetic of ours, from printed values:
 * - Kilometers are converted at 1 nautical mile = 1.852 km, to the digits
 *   the source gives (296 km is written 160 nautical miles).
 * - The ranges at the start of the first and third final approaches are
 *   the straight lines across the heights and distances Table 2-IV prints:
 *   12 below and 22 behind is 25 nautical miles.
 * - Ends of station keeping are the chronology's start plus its period.
 * - A firing's end is its start plus the burn time the crew called out.
 * - The landing point is printed in degrees, minutes and seconds; we write
 *   it in decimal degrees. The time the carrier lifted the spacecraft
 *   aboard, 9:53 a.m. e.s.t., is 73:13:26.7 on the mission clock, written to
 *   the minute as the source gives it.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The launch pad: Launch Complex 19 is placed where the Gemini VIII plan
 *   places it (its estimate from that flight's report; see
 *   missions/gemini-8/flight.ts). The climb to orbit is drawn from the pad,
 *   the launch azimuth and the inclination: no ascent track was found. The
 *   orbit is drawn from the second-stage cutoff, which the crew called; the
 *   spacecraft separated from the stage soon after, at a time not found.
 * - The ATDA is placed 572 nautical miles ahead at that moment. On the
 *   Shoulders of Titans gives the lead as 1060 km, most likely along the
 *   orbit; the engine reads it as a straight line, a fraction of a nautical
 *   mile shorter at this height. The ATDA is drawn at its orbit's low point
 *   then, and keeps the orbit the chronology gives for it on June 1 for the
 *   whole flight.
 * - The firings are smooth blends from one orbit to the next. The small
 *   corrective firing at about 1:55 and the plane change it included are not
 *   drawn: the size after it is not published, and the drawn orbit stays in
 *   the plane set at launch.
 * - Each final approach (from terminal phase initiation to station keeping)
 *   is drawn as one blend, since the orbit after each initiation firing is
 *   not published: the two midcourse corrections and the braking are not
 *   drawn one by one.
 * - The equiperiod rendezvous is drawn as the spacecraft flying the orbit
 *   Appendix 1 gives for it, from the ATDA's side after the separation firing
 *   and blended back to it by the start of station keeping; the four
 *   firings that brought it back are not drawn one by one.
 * - The three firings that set up the rendezvous from above (18:23:20,
 *   19:08:17 and 19:54:25) are drawn as one smooth climb in orbit size, from
 *   the overnight orbit to the coelliptic orbit 7.5 nautical miles above the
 *   ATDA, since the sizes between them are not published.
 * - The orbit-shaping firing at 53:41:36 is drawn as a step in size, to the
 *   size Gemini Control gave about four hours later; the orbit then shrinks
 *   smoothly to the size Appendix 1 gives at retrofire (air drag is not
 *   modeled otherwise).
 * - Orbits are Kepler ellipses turned slowly by Earth's bulge (J2). Small
 *   corrections keep the drawn path on its published points: each orbit
 *   that ends at a published range is pinned there, and the last orbit
 *   ends where the fall from retrofire begins.
 * - While station keeping, the spacecraft is drawn at the ATDA's position
 *   (the scene draws the two a little apart).
 * - The entry: a smooth ground track to the landing point and a smooth
 *   descent to the drogue parachute at an illustrative height (no height
 *   was found in a source we follow). Retrofire is drawn from its start to
 *   the crew's "4 good Retros", by which time all four had fired.
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until the carrier lifted it aboard (the crew stayed inside).
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const TRANSCRIPT = "https://www.nasa.gov/wp-content/uploads/2026/01/gt09a2-t.pdf";
const PAO = "https://www.nasa.gov/wp-content/uploads/2026/01/gt09a2-p.pdf";
const RENDEZVOUS_PAPER = "https://ntrs.nasa.gov/api/citations/19680005473/downloads/19680005473.pdf";
const CHRONOLOGY_1966 = "https://www.nasa.gov/history/SP-4002/p3b.htm";
const CHRONOLOGY_TABLE_A = "https://www.nasa.gov/history/SP-4002/app1a.htm";
const CHRONOLOGY_TABLE_B = "https://www.nasa.gov/history/SP-4002/app1b.htm";
const NMC_GEMINI_9A = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-047A";
const NMC_ATDA_TRAJECTORY = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/displayTrajectory.action?id=1966-046A";
const GEMINI_8_REPORT =
  "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf";

/** The Horizons query for each sky table, at lift-off and landing (printed by tools/sky.mjs). */
const HORIZONS_TIMES = "&TLIST_TYPE=%27CAL%27&TLIST=%271966-06-03%2013:39:33.335%27,%271966-06-06%2014:00:23.335%27";
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

/** A line of the Gemini IX-A transcript: its time as printed, who spoke, and the words (printed page; the PDF page is one more). */
function transcript(time: string, words: string, page: number): Citation {
  return {
    source: "gemini-9a-voice-transcript",
    locator: `Page ${page} (PDF page ${page + 1}), ${time}: "${words}"`,
    url: TRANSCRIPT,
  };
}

/** Gemini Control's commentary, by the PDF page of the PAO transcript. */
function pao(pdfPage: number, words: string): Citation {
  return { source: "gemini-9a-pao-commentary", locator: `PDF page ${pdfPage}: ${words}`, url: PAO };
}

/** Appendix 1, Table A (General) of the Gemini chronology, IX-A column. */
const tableA = (rows: string): Citation => ({
  source: "gemini-chronology",
  locator: `Appendix 1, Table A (General), IX-A column: ${rows}`,
  url: CHRONOLOGY_TABLE_A,
});

/** Appendix 1, Table B (Orbital Operations) of the Gemini chronology, IX-A rows. */
const tableB = (rows: string): Citation => ({
  source: "gemini-chronology",
  locator: `Appendix 1, Table B (Orbital Operations), IX-A rows: ${rows}`,
  url: CHRONOLOGY_TABLE_B,
});

/** An entry of the Gemini chronology's 1966 part. */
const chronology = (day: string, words: string): Citation => ({
  source: "gemini-chronology",
  locator: `Part III (B), ${day}, 1966: ${words}`,
  url: CHRONOLOGY_1966,
});

/** On the Shoulders of Titans, chapter XIV (printed page; the PDF page is 21 more). */
const titans = (page: number, words: string): Citation => ({
  source: "on-the-shoulders-of-titans",
  locator: `Chapter XIV, "Charting New Space Lanes", page ${page} (PDF page ${page + 21}): ${words}`,
});

/** Table 2-IV of Summary of Rendezvous Operations, IX-A rows. */
const rendezvousTable = (row: string): Citation => ({
  source: "gemini-rendezvous-summary",
  locator: `Table 2-IV, "Rendezvous Propellant Usage" (page 18 of the Gemini Summary Conference, PDF page 12), ${row}`,
  url: RENDEZVOUS_PAPER,
});

const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY("301", "500@399", "31");
const EARTH_FROM_MOON = HORIZONS_QUERY("399", "500@301", "14");
const SUN_FROM_EARTH = HORIZONS_QUERY("10", "500@399", "31");

/** Degrees, minutes and seconds as printed, in decimal degrees. */
function degrees(whole: number, minutes: number, seconds = 0): number {
  return whole + minutes / 60 + seconds / 3600;
}

/* ------------------------------------------------------------------ */
/* Times on Gemini IX-A's clock.                                       */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  "000:00:00",
  { source: "nssdca-master-catalog", locator: '"Gemini 9A" (1966-047A), Mission Profile: "8:39:33 a.m. EST (13:39:33.335 UT)"', url: NMC_GEMINI_9A },
  tableA('Launch date and Time (e.s.t.) rows, "June 3, 1966" and "8:39:33 a.m."'),
  transcript("00:00:01, capsule communicator", "LIFT-OFF!", 3),
);

/** The second stage shut down, as the command pilot called it; the orbit is drawn from here (see the header). */
const SECO = at("000:05:42", transcript("00:05:42, command pilot", "SECO. ... Zero.", 8));

/** The first catch-up firing, when the pilot felt it, for the 1 minute 40 seconds he gave. */
const PHASE_ADJUST = at(
  "000:49:04",
  transcript("00:49:04, pilot", "I felt that one! I felt that one, Tom!", 16),
  titans(333, '"At 49 minutes into the flight, the thrusters added 22.7 meters per second to spacecraft speed to raise its perigee from 160 to 232 kilometers"'),
);
const PHASE_ADJUST_END = at(
  "000:50:44",
  transcript("00:49:25, pilot", "Okay. The burn time is 1:40 so we should read - 5043 at the completion time. Right? (the end, 00:50:44, is 00:49:04 plus 1 minute 40 seconds: our sum)", 16),
);
const COELLIPTIC = at("002:24:52", transcript("02:24:52, pilot", "8, 9, 50, BURN.", 30));
const COELLIPTIC_END = at("002:27:08", transcript("02:27:08, pilot", "Carnarvon, this is Gemini IX. Burn is complete.", 31));
const TPI_1 = at("003:35:52", transcript("03:35:52, command pilot", "START COMP. We're burning.", 40));
const STATION_1 = at("004:15:00", tableB('first Station keeping row, Ground Elapsed Time "To begin (hr:min:sec)" 4:15:00'));
const STATION_1_END = at(
  "005:01:00",
  tableB('first Station keeping row, "To begin" 4:15:00 and "Period (hr:min:sec)" 0:46:00 (the end, 5:01:00, is our sum)'),
  transcript("05:01:00, pilot", "MARK. The burn.", 67),
);
const EQUIPERIOD_SEPARATION_END = at("005:01:37", transcript("05:01:37, capsule communicator", "End the burn.", 67));
const STATION_2 = at(
  "006:36:00",
  tableB('second Station keeping row, Ground Elapsed Time "To begin (hr:min:sec)" 6:36:00'),
  chronology("June 3", '"an equi-period rendezvous, using onboard optical techniques and completed at 6 hours 36 minutes ground elapsed time"'),
);
const STATION_2_END = at(
  "007:15:00",
  tableB('second Station keeping row, "To begin" 6:36:00 and "Period (hr:min:sec)" 0:39:00 (the end, 7:15:00, is our sum)'),
  titans(336, '"At 7:15 hours, Stafford fired the aft thrusters to decrease the spacecraft speed by 1.1 meters per second"'),
);
const NIGHT_SEPARATION_END = at(
  "007:15:04",
  transcript("07:15:04, command pilot", "Mark it.", 88),
  transcript("07:14:49, command pilot", "Okay. Separation burn at 7:14:58. Standing by for 3.7-feet-per-second burn.", 88),
);
/** Gemini Control's report of the overnight lead (see OVERNIGHT_LEAD). */
const LEAD_REPORT = at(
  "016:11:10",
  pao(164, '"At this time the spacecraft is leading the target by some 80 nautical miles. At 16 hours, 11 minutes and 10 seconds after lift-off, this is Gemini Control."'),
);
const PHASE_ADJUST_3 = at("018:23:20", transcript("18:23:20, pilot", "Mark it.", 108), transcript("18:23:19, command pilot", "Rates adjust.", 108));
/** The coelliptic firing above the ATDA was over by the pilot's readout of what was left to null (our reading). */
const COELLIPTIC_3_END = at(
  "019:54:51",
  transcript("19:54:51, command pilot", "Okay. 81, - 82 is minus 02, 81 is 01.", 115),
  transcript("19:54:25, pilot", "Burn it.", 115),
);
const TPI_3 = {
  ...at("021:02:00", titans(337, '"At 21:02, the distance was 28.6 kilometers. Stafford pointed the nose of his spacecraft down 19 degrees and yawed it to the left 180 degrees, aiming at the other vehicle, which was still below and behind him." (time given to the minute; seconds written as 00)')),
  discrepancy:
    "The transcript has the pilot reading a range of 16.60 nautical miles at 21:01:45 (page 124), and Table 2-IV of Summary of Rendezvous Operations puts the spacecraft 7.5 nautical miles above and 10 ahead at the start of this final approach, 12.5 in a straight line (our arithmetic). We follow On the Shoulders of Titans, which pairs a range with a time.",
};
const STATION_3 = at(
  "021:42:00",
  tableB('third Station keeping row, Ground Elapsed Time "To begin (hr:min:sec)" 21:42:00'),
  transcript("21:42:09, command pilot", "Okay, Carnarvon. We're in position with them.", 128),
);
const FINAL_SEPARATION = at(
  "022:59:00",
  tableB('third Station keeping row, "To begin" 21:42:00 and "Period (hr:min:sec)" 1:17:00 (the end, 22:59:00, is our sum)'),
  chronology("June 3", '"Final separation maneuver was performed at 22 hours 59 minutes after liftoff."'),
);
const ORBIT_SHAPING = at("053:41:36", transcript("53:41:36, command pilot", "32, 33, 34, 35, BURN.", 260));
const ORBIT_SHAPING_END = at(
  "053:42:05",
  transcript("53:42:07, pilot", "Okay, Tom. Burn was 29 seconds and we're at 295. (the end, 53:42:05, is the start plus 29 seconds: our sum)", 260),
);
const RETROFIRE = at(
  "071:46:44",
  tableA('Retrofire & reentry, "G.E.T. to retrofire (hr; min; sec)" row, 71:46:44'),
  transcript("71:46:44, capsule communicator", "RETROFIRE!", 330),
  { source: "nssdca-master-catalog", locator: '"Gemini 9A" (1966-047A), Mission Profile: "Retrofire occurred at the end of the 45th revolution on 6 June at 8:26:17 a.m. EST."', url: NMC_GEMINI_9A },
);
/** Not the end of the burn itself: the pilot's report that all four retrorockets had fired. */
const RETROFIRE_DONE = at("071:47:09", transcript("71:47:09, pilot", "4 good Retros.", 330));
const DROGUE = at("072:15:48", transcript("72:15:48, command pilot", "Drogue.", 343), transcript("72:15:53, command pilot", "We've got the drogue out. Coming down.", 343));
const LANDING = {
  ...at(
    "072:20:50",
    tableA('Retrofire & reentry, "G.E.T. to touchdown (hr; min; sec)" row, 72:20:50'),
    { source: "gemini-9a-nasa-mission-page", locator: 'Mission Facts: "Landing Date: Jun. 6, 1966, 9:00:23 a.m. EST (14:00:23 UT)"' },
  ),
  discrepancy: 'The transcript logs the pilot\'s "SPLASHDOWN!" at 72:20:43 (page 347). We follow the chronology, whose time NASA\'s Gemini IX page and NSSDCA repeat.',
};
/** The carrier lifted the spacecraft aboard, crew inside, at 9:53 a.m. e.s.t. (to the minute). */
const ABOARD = at(
  "073:13:00",
  tableA('Recovery, Ship "Wasp", Date "June 6, 1966", Time (e.s.t.), Crew and Spacecraft rows, both "9:53 a.m." (given to the minute; 73:13:26.7 after lift-off, our arithmetic, written to the minute)'),
  chronology("June 3", '"The crew remained with the spacecraft, which was hoisted aboard 53 minutes after landing."'),
);

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/**
 * Launch Complex 19, reused from the Gemini VIII plan (missions/gemini-8/
 * flight.ts): that plan's estimate of the pad from its report's printed
 * values, good to about 2 km. Gemini IX-A flew from the same pad.
 */
const PAD_19_CITATIONS: [Citation, ...Citation[]] = [
  chronology("June 3", 'Gemini IX-A "was launched from complex 19 at 8:39 a.m., e.s.t."'),
  {
    source: "gemini-8-mission-report",
    locator:
      'Section 1.0 (page 1-1): the spacecraft "was launched from Complex 19"; our estimate of where Complex 19 is, not a printed value: the point from which a great circle at the flight azimuth reaches the BECO point after the BECO range (the Gemini VIII plan\'s pad estimate)',
    url: GEMINI_8_REPORT,
  },
  {
    source: "gemini-8-mission-report",
    locator:
      'Table 4.3-I, "Comparison of Planned and Actual Gemini Space Vehicle Trajectory Parameters" (pages 4-22 and 4-23), BECO, "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.36 N, 79.61 W, 51.4)" row, actual final column',
    url: GEMINI_8_REPORT,
  },
  { source: "gemini-8-mission-report", locator: 'Section 4.1 (page 4-1): "the GLV was launched ... on a rendezvous launch azimuth of 99.9 degrees"', url: GEMINI_8_REPORT },
];
const PAD_19 = { latitude: cite(28.51, ...PAD_19_CITATIONS), longitude: cite(-80.57, ...PAD_19_CITATIONS) };

/** Where Gemini IX-A came down, and floated until it was lifted aboard. */
const SPLASHDOWN = {
  latitude: {
    ...cite(degrees(27, 52), tableA('Landing coordinates, Lat. row, "27°52\' N."')),
    discrepancy:
      "NSSDCA and NASA's Gemini IX page give 27.87 N, 75.00 W, the same point to the precision printed. The chronology does not say whether its latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(-degrees(75, 0, 4), tableA('Landing coordinates, Long. row, "75°00\'04" W."')),
};

/* ------------------------------------------------------------------ */
/* Shared values.                                                      */
/* ------------------------------------------------------------------ */

const PROGRADE = cite<"prograde">("prograde", tableA('Launch azimuth row, "87.4°" (eastward)'));
const PROGRADE_ATDA = cite<"prograde">("prograde", tableB('Target launch, Azimuth (deg.) column, "83.8" (eastward)'));

/** The spacecraft's inclination, the same at insertion and at retrofire. */
const INCLINATION = cite(28.91, tableA('At insertion, "Inclination angle" row, "28.91°"'), tableA('At retrofire, "Inclination angle" row, "28.91°"'));

/** The overnight orbit, 289 by 296 km (156 by 160 nautical miles, our conversion). */
const OVERNIGHT_ORBIT = {
  apoapsis: cite(160, titans(336, '"That retrograde maneuver ... had lowered the orbit of the spacecraft (it now measured 289 by 296 kilometers)"')),
  periapsis: cite(156, titans(336, '"(it now measured 289 by 296 kilometers)"')),
};
const OVERNIGHT_DISCREPANCY =
  "Gemini Control gave the orbit as 160 by 158 nautical miles after the separation (PAO transcript, PDF page 133) and 160.2 by 158.4 at 14 hours 10 minutes (PDF page 162); NSSDCA's trajectory page gives 290.2 by 302.6 km. We follow On the Shoulders of Titans.";

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: "gemini-9a",

  // The sky is fit at lift-off and at landing, which span every
  // Earth-relative fix in the plan.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(255.5840431, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-06-03 13:39:33.335", MOON_FROM_EARTH)),
      subLunarLongitude: cite(157.695779, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-06-03 13:39:33.335", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(72.5208593, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-06-03 13:39:33.335", SUN_FROM_EARTH)),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(294.1628905, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-06-06 14:00:23.335", MOON_FROM_EARTH)),
      subLunarLongitude: cite(192.311314, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-06-06 14:00:23.335", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(75.4057919, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-06-06 14:00:23.335", SUN_FROM_EARTH)),
    },
  ],

  ships: [
    {
      id: "gemini",
      name: "Gemini IX-A spacecraft",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: LIFTOFF,
          end: SECO,
          site: PAD_19,
          azimuth: cite(87.4, tableA('Launch azimuth row, "87.4°"')),
        },
        {
          kind: "orbit",
          label: "Catching up",
          body: "earth",
          start: SECO,
          end: COELLIPTIC,
          apoapsis: {
            ...cite(144.0, tableA('At insertion, "Apogee (n.m.)" row')),
            discrepancy: 'Gemini Control first gave the orbit as "86 nautical miles perigee by 150 nautical miles apogee" (PAO transcript, PDF page 36), and NSSDCA gives 158.8 by 266.9 km. We follow the chronology.',
          },
          periapsis: cite(85.7, tableA('At insertion, "Perigee (n.m.)" row')),
          inclination: INCLINATION,
          sense: PROGRADE,
          sizes: [
            // The first catch-up firing, a step: the insertion orbit until
            // the thrusters fired, the raised orbit when they stopped.
            {
              time: PHASE_ADJUST,
              apoapsis: cite(144.0, tableA('At insertion, "Apogee (n.m.)" row')),
              periapsis: cite(85.7, tableA('At insertion, "Perigee (n.m.)" row')),
            },
            {
              time: PHASE_ADJUST_END,
              apoapsis: {
                ...cite(147, pao(54, 'Gemini Control at 1 hour 10 minutes 30 seconds: "Our new orbit is 147 nautical miles apogee by 125 nautical perigee."')),
                discrepancy:
                  "147 by 125 nautical miles is a figure from Gemini Control's commentary, given about 20 minutes after the firing; it is placed here at the firing's end. On the Shoulders of Titans (page 333) confirms only the perigee, 232 km (125 nautical miles), and gives no apogee; Appendix 1 of the chronology gives no orbit for this moment.",
              },
              periapsis: cite(
                125,
                pao(54, '"Our new orbit is 147 nautical miles apogee by 125 nautical perigee."'),
                titans(333, '"to raise its perigee from 160 to 232 kilometers" (125 nautical miles, our conversion)'),
              ),
            },
          ],
        },
        {
          kind: "burn",
          label: "Coelliptic maneuver",
          body: "earth",
          start: COELLIPTIC,
          end: COELLIPTIC_END,
        },
        {
          kind: "orbit",
          label: "Coelliptic orbit, below the ATDA",
          body: "earth",
          start: COELLIPTIC_END,
          end: TPI_1,
          apoapsis: cite(148.0, tableB('Coelliptical rendezvous row (revolution 3), Spacecraft Orbital Parameters, "Apogee (n.m.)" 148.0')),
          periapsis: cite(145.2, tableB('Coelliptical rendezvous row (revolution 3), Spacecraft Orbital Parameters, "Perigee (n.m.)" 145.2')),
          inclination: cite(28.91, tableB('Coelliptical rendezvous row (revolution 3), "Inclination angle (deg.)" 28.91')),
          sense: PROGRADE,
          // Where the chase stood when the final approach began.
          endRange: {
            target: "atda",
            range: cite(
              25,
              rendezvousTable('first IX-A row (M = 3), "Conditions at start of terminal phase": "Coelliptic: Δh = 12 n. mi., ΔX = 22 n. mi." (25 nautical miles in a straight line, our arithmetic)'),
            ),
          },
        },
        {
          // The whole first final approach, drawn as one blend (see the header).
          kind: "burn",
          label: "Terminal phase: closing in",
          body: "earth",
          start: TPI_1,
          end: STATION_1,
        },
        {
          kind: "station",
          label: "Beside the angry alligator",
          start: STATION_1,
          end: STATION_1_END,
          target: "atda",
          // 30 feet, in nautical miles (our conversion): the far end of the
          // 10 to 30 feet the command pilot gave.
          range: {
            ...cite(0.0049, transcript("04:27:37, command pilot", "58 percent fuel remaining. We're stationkeeping to keep it out here between 10 and 30 feet from it.", 58)),
            discrepancy:
              'On the Shoulders of Titans says the two were "only 30 meters apart" when braking was completed (page 333) and that Stafford stayed 9 to 12 meters from the target (page 334). We follow the command pilot\'s report.',
          },
        },
        {
          kind: "burn",
          label: "Separation for the equiperiod rendezvous",
          body: "earth",
          start: STATION_1_END,
          end: EQUIPERIOD_SEPARATION_END,
          // 6 meters per second is 20 feet per second (our conversion).
          deltaV: cite(20, titans(336, '"Five hours after launch, Stafford nosed the spacecraft down 90 degrees and fired the forward thrusters for 35 seconds to increase his speed by 6 meters per second."')),
        },
        {
          kind: "rendezvous",
          label: "Equiperiod rendezvous, by eye",
          body: "earth",
          start: EQUIPERIOD_SEPARATION_END,
          end: STATION_2,
          target: "atda",
          apoapsis: cite(163.3, tableB('Equi-period rendezvous row (revolution 4), Spacecraft Orbital Parameters, "Apogee (n.m.)" 163.3')),
          periapsis: cite(156.6, tableB('Equi-period rendezvous row (revolution 4), Spacecraft Orbital Parameters, "Perigee (n.m.)" 156.6')),
          sense: PROGRADE,
        },
        {
          kind: "station",
          label: "Beside the ATDA again",
          start: STATION_2,
          end: STATION_2_END,
          target: "atda",
        },
        {
          kind: "burn",
          label: "Separation for the night",
          body: "earth",
          start: STATION_2_END,
          end: NIGHT_SEPARATION_END,
          // 1.1 meters per second is 3.6 feet per second (our conversion).
          deltaV: {
            ...cite(3.6, titans(336, '"At 7:15 hours, Stafford fired the aft thrusters to decrease the spacecraft speed by 1.1 meters per second"')),
            discrepancy:
              'The command pilot, just before the firing, gave the planned change: "Standing by for 3.7-feet-per-second burn" (transcript page 88, 07:14:49). We follow On the Shoulders of Titans.',
          },
        },
        {
          kind: "orbit",
          label: "Overnight, pulling ahead",
          body: "earth",
          start: NIGHT_SEPARATION_END,
          end: LEAD_REPORT,
          apoapsis: { ...OVERNIGHT_ORBIT.apoapsis, discrepancy: OVERNIGHT_DISCREPANCY },
          periapsis: OVERNIGHT_ORBIT.periapsis,
          inclination: cite(28.89, { source: "nssdca-master-catalog", locator: 'Trajectory details for Gemini 9A, epoch 1966-06-03 20:15:00 to 1966-06-04 11:21:00, "Inclination" 28.890°', url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/displayTrajectory.action?id=1966-047A" }),
          sense: PROGRADE,
          // Lower and so faster than the ATDA, the spacecraft drew ahead.
          endRange: {
            target: "atda",
            side: "ahead",
            range: {
              ...cite(80, pao(164, '"At this time the spacecraft is leading the target by some 80 nautical miles. At 16 hours, 11 minutes and 10 seconds after lift-off"')),
              discrepancy:
                "80 nautical miles is a figure from Gemini Control's commentary (\"some 80\"), and 16:11:10 is the time the commentator signed off that report; two hours earlier the commentary gave \"some 50\" (PDF page 162). On the Shoulders of Titans (page 336) says that the next day the spacecraft led its target by 111 kilometers (60 nautical miles), without a time. We use the commentary's figure, the only one tied to a time.",
            },
          },
        },
        {
          kind: "orbit",
          label: "Climbing above the ATDA",
          body: "earth",
          start: LEAD_REPORT,
          end: TPI_3,
          ...OVERNIGHT_ORBIT,
          inclination: cite(28.91, tableB('Rendezvous from above row (revolutions 12 to 15), "Inclination angle (deg.)" 28.91')),
          sense: PROGRADE,
          sizes: [
            // The three firings that set up the rendezvous from above, drawn
            // as one smooth climb (see the header).
            { time: PHASE_ADJUST_3, ...OVERNIGHT_ORBIT },
            {
              time: COELLIPTIC_3_END,
              apoapsis: cite(168.2, tableB('Rendezvous from above row (revolutions 12 to 15), Spacecraft Orbital Parameters, "Apogee (n.m.)" 168.2')),
              periapsis: cite(166.4, tableB('Rendezvous from above row (revolutions 12 to 15), Spacecraft Orbital Parameters, "Perigee (n.m.)" 166.4')),
            },
          ],
          // Above and ahead of the ATDA when the final approach began.
          endRange: {
            target: "atda",
            side: "ahead",
            range: cite(15.4, TPI_3.citations[0], { ...TPI_3.citations[0], locator: `${TPI_3.citations[0].locator} (15.4 nautical miles, our conversion)` }),
          },
        },
        {
          // The whole final approach from above, drawn as one blend.
          kind: "burn",
          label: "Terminal phase: down to the ATDA",
          body: "earth",
          start: TPI_3,
          end: STATION_3,
        },
        {
          kind: "station",
          label: "Beside the ATDA, the third time",
          start: STATION_3,
          end: FINAL_SEPARATION,
          target: "atda",
        },
        {
          kind: "orbit",
          label: "On their own",
          body: "earth",
          start: FINAL_SEPARATION,
          end: RETROFIRE,
          apoapsis: cite(160.3, tableB('Rendezvous from above, Orbital Parameters After Activity, "Apogee (n.m.)" 160.3')),
          periapsis: cite(156.8, tableB('Rendezvous from above, Orbital Parameters After Activity, "Perigee (n.m.)" 156.8')),
          inclination: cite(28.91, tableB('Rendezvous from above, Orbital Parameters After Activity, "Inclination angle (deg.)" 28.91')),
          sense: PROGRADE,
          sizes: [
            // The orbit-shaping firing, a step.
            {
              time: ORBIT_SHAPING,
              apoapsis: cite(160.3, tableB('Rendezvous from above, Orbital Parameters After Activity, "Apogee (n.m.)" 160.3')),
              periapsis: cite(156.8, tableB('Rendezvous from above, Orbital Parameters After Activity, "Perigee (n.m.)" 156.8')),
            },
            {
              time: ORBIT_SHAPING_END,
              apoapsis: {
                ...cite(157.5, pao(436, 'Gemini Control at 57 hours 40 minutes: "Gemini 9\'s apogee is 157.5 nautical miles. Its perigee 145.6 nautical miles." (placed at the end of the orbit-shaping firing)')),
                discrepancy:
                  "157.5 by 145.6 nautical miles is a figure from Gemini Control's commentary at 57 hours 40 minutes, nearly four hours after the firing; it is placed here at the firing's end. At 65 hours 10 minutes 30 seconds the commentary gave 157.2 and 145.6, first calling 157.2 the perigee and then correcting itself (PDF page 449). No report value for this orbit was found.",
              },
              periapsis: cite(145.6, pao(436, '"Its perigee 145.6 nautical miles."')),
            },
            // Retrofire, revolution 45.
            {
              time: RETROFIRE,
              apoapsis: cite(155.5, tableA('At retrofire, "Apogee (n.m.)" row (revolution 45)')),
              periapsis: cite(143.8, tableA('At retrofire, "Perigee (n.m.)" row (revolution 45)')),
            },
          ],
        },
        {
          kind: "burn",
          label: "Retrofire",
          body: "earth",
          start: RETROFIRE,
          end: RETROFIRE_DONE,
          deltaV: cite(296, transcript("71:47:19, command pilot", "Okay. IVI's read 296 aft, 4 right, 125 down.", 331)),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: RETROFIRE_DONE,
          end: LANDING,
          drogue: DROGUE,
          splashdown: SPLASHDOWN,
        },
        {
          kind: "surface",
          label: "Waiting for the carrier",
          body: "earth",
          start: LANDING,
          end: ABOARD,
          site: SPLASHDOWN,
        },
      ],
    },
    {
      id: "atda",
      name: "Augmented Target Docking Adapter",
      role: "target",
      phases: [
        {
          kind: "orbit",
          label: "The ATDA, two days into its flight",
          body: "earth",
          start: LIFTOFF,
          end: ABOARD,
          apoapsis: {
            ...cite(161.5, chronology("June 1", '"The ATDA achieved a near-circular orbit (apogee 161.5, perigee 158.5 nautical miles)."')),
            discrepancy:
              "NSSDCA's trajectory page for the ATDA gives 298.40 by 309.70 km at launch, and On the Shoulders of Titans (page 332) a nearly perfect 298-kilometer orbit. We follow the chronology.",
          },
          periapsis: cite(158.5, chronology("June 1", '"apogee 161.5, perigee 158.5 nautical miles"')),
          inclination: cite(28.87, { source: "nssdca-master-catalog", locator: 'Trajectory details for Gemini 9 Target B (1966-046A), epoch 1966-06-01 15:00:02 to 1966-06-03 00:00:00, "Inclination" 28.870°', url: NMC_ATDA_TRAJECTORY }),
          sense: PROGRADE_ATDA,
          startRelative: {
            ship: "gemini",
            time: SECO,
            ahead: {
              ...cite(572, titans(332, '"Seconds later, the command pilot fired the spacecraft thrusters in the chase toward the target vehicle 1060 kilometers ahead." (572 nautical miles, our conversion)')),
              discrepancy:
                "NASA's article \"Gemini IX and the Angry Alligator\" says that when Gemini IX reached orbit it trailed the ATDA by 640 miles (556 nautical miles). We follow On the Shoulders of Titans.",
            },
          },
        },
      ],
    },
  ],
};
