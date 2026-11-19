/**
 * The Gemini VI-A flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the crew's spacecraft ("gemini", the main ship) and Gemini VII
 * ("gemini-7", the target it met). Gemini VII had been in orbit since
 * December 4, 1965; its path starts at Gemini VI-A's lift-off and is placed
 * by its published lead at Gemini VI-A's insertion.
 *
 * NASA's copy of the Gemini VI-A mission report (MSC-G-R-66-2) was not
 * found. The sources, in the order we follow them:
 * - Supplemental Report 5 to that mission report (the onboard computer's
 *   analysis): insertion time (Table 3), terminal phase initiation (the
 *   catch-up report's introduction), and the state at 400,000 feet (the
 *   re-entry report's Table I).
 * - The Gemini VII mission report (MSC-G-R-66-1): Gemini VII's orbit
 *   (Table 4.3-IV) and Gemini VI-A's lift-off on Gemini VII's clock.
 * - The Gemini chronology (SP-4002), Appendix 1: launch azimuth, the orbits
 *   at insertion and at retrofire, station keeping, retrofire, touchdown,
 *   landing point, and recovery.
 * - The Gemini VI air-to-ground and onboard transcript: when each catch-up
 *   burn started and ended, as the crew called it.
 * - On the Shoulders of Titans (SP-4203): orbit sizes after the catch-up
 *   burns, the lead of Gemini VII at insertion, and parachute heights.
 * - Summary of Rendezvous Operations (SP-138): where the final approach began.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 * The scans hosted at ibiblio.org are NASA's documents (see sources.ts).
 *
 * The mission clock is Gemini VI-A's ground elapsed time, zero at lift-off,
 * 13:37:26.471 UT on December 15, 1965 (NSSDCA; the Gemini VII mission
 * report prints 13:37:26.47 G.m.t.). The transcript's clock reads the same:
 * it logs "Lift-off 13:37:26" at 00:00:01, and its retrofire countdown,
 * logged at 25:15:49, runs out about nine seconds later, at the 25:15:58
 * that Appendix 1 of the chronology lists.
 *
 * Arithmetic of ours, from printed values:
 * - Times printed in seconds from lift-off are written as hours:minutes:
 *   seconds. Times printed in Eastern Standard Time are converted to UT
 *   (plus 5 hours) and to the mission clock.
 * - Kilometers and meters are converted at 1 nautical mile = 1.852 km, and
 *   feet at 0.3048 m. A source's km value is converted to the same number of
 *   digits it has (272 km is written 147 nautical miles).
 * - The range at terminal phase initiation is the straight line across the
 *   15 nautical miles below and 25 behind that Table 2-IV prints: 29.
 * - The landing point is printed in degrees and minutes; we write it in
 *   decimal degrees.
 * - The height at 400,000 feet: the computer prints its distance from
 *   Earth's center (21,307,736 feet) and a geocentric latitude; over the
 *   ellipsoid that is 398,457 feet, 65.58 nautical miles.
 *
 * Readings of ours (the sources do not say):
 * - The computer's time "T_E" in the re-entry report is the time from
 *   lift-off: the report compares it directly with "the elapsed time from
 *   lift-off at which retro-fire occurred", and the start of its count from
 *   retrofire (its first frame, 91,133.86 seconds, less the 172.25 seconds
 *   counted by then) falls 3.6 seconds after the chronology's retrofire
 *   time, 25:15:58.
 * - The computer's latitude at 400,000 feet is geocentric: in the same
 *   report's Table III the latitude peaks at 28.892 degrees, which is the
 *   orbit's inclination (28.89, chronology); a map latitude would peak about
 *   0.16 degree higher. Its velocity, flight-path angle, and heading are
 *   measured against the turning Earth: the report's own equations add
 *   Earth's rotation to them to get the inertial velocity.
 * - After the phase adjustment, the apogee stayed where the height
 *   adjustment left it: the burn was made at apogee (chronology, December 15
 *   entry), and On the Shoulders of Titans gives only the new perigee.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The climb to orbit (no ascent track was found in the sources), each
 *   burn (a smooth blend from one orbit to the next), and the entry (a
 *   smooth ground track to the landing point and a smooth descent).
 * - The final approach. No orbit after terminal phase initiation and no burn
 *   length is published, so the whole terminal phase (the initiation burn,
 *   two midcourse corrections, and braking) is drawn as one blend, from the
 *   coelliptic orbit 29 nautical miles behind Gemini VII at initiation to
 *   Gemini VII's side when station keeping began.
 * - The plane change at 2:42 and the vernier height adjustment at about
 *   3:03 (0.8 ft/sec) are not drawn as changes of plane or size: Gemini VII
 *   is drawn in Gemini VI-A's launch plane instead.
 * - Gemini VII is placed 1075.6 nautical miles ahead at insertion. On the
 *   Shoulders of Titans gives the lead as 1992 km along the orbit; the
 *   engine reads it as a straight line, which is about 4 nautical miles
 *   shorter at this height (our arithmetic). Gemini VII is drawn at its
 *   orbit's low point then.
 * - Gemini VII keeps the orbit listed for its revolution 160 (Table 4.3-IV)
 *   for the whole flight; by revolution 176 it had changed by less than 1
 *   nautical mile. Revolution 160 is the listing just before Gemini VI-A's
 *   launch (our reading: the same report has Gemini VII coming out of
 *   darkness in revolution 177 just before Gemini VI-A's reentry, page 6-8,
 *   and 16 revolutions earlier is about the time of the launch). That table
 *   measures heights above the launch complex 19 radius, a few miles below
 *   the equatorial radius the model measures from.
 * - Orbits are Kepler ellipses turned slowly by Earth's bulge (J2); air drag
 *   is left out. Both ships go around in their published periods (Gemini
 *   VII 90.57 minutes, Table 4.3-IV; Gemini VI-A after separation 90.54,
 *   chronology). The coelliptic orbit is pinned to end 29 nautical miles
 *   behind Gemini VII; the orbit after separation to end 17.63 nautical
 *   miles from it at 22:00, Stafford's radar reading; and the last stretch
 *   to end where the fall from retrofire begins. All three corrections are
 *   small changes of rate.
 * - While station keeping, the spacecraft is drawn at Gemini VII's position
 *   (the scene draws the two a little apart). The separation is drawn as the
 *   start of a new orbit from Gemini VII's position; the two small burns
 *   that set up the night apart (read up to the crew for 11:14:29 and
 *   13:25:52) are not drawn one by one, since only their plans are
 *   published here.
 * - Overnight the drawn pair stays within about 20 nautical miles of each
 *   other until 22:00, as published (On the Shoulders of Titans: "settled
 *   down 16 kilometers apart"). From 22:00 to retrofire the drawn distance
 *   grows to about 80 nautical miles: the retrofire point is published, but
 *   Gemini VII's place along its orbit is only as good as its placement at
 *   insertion, and no later distance between the two is published.
 * - Retrofire is drawn from its start (25:15:58) to 25:16:28, when Schirra
 *   read out the velocity it had taken off ("309 aft"); the four rockets
 *   burned for less than that, but their times are not published here.
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until it was hoisted aboard the carrier (the crew stayed inside).
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const SUPPLEMENTAL = "https://www.ibiblio.org/apollo/Documents/Gemini-6-7-PostFlightReports.pdf";
const GEMINI_VII_REPORT = "https://www.ibiblio.org/apollo/Documents/Gemini7MissionReport.pdf";
const TRANSCRIPT = "https://www.nasa.gov/wp-content/uploads/2026/01/gt06-tec.pdf";
const RENDEZVOUS_PAPER = "https://ntrs.nasa.gov/api/citations/19680005473/downloads/19680005473.pdf";
const CHRONOLOGY_1965 = "https://www.nasa.gov/history/SP-4002/p3a.htm";
const CHRONOLOGY_TABLE_A = "https://www.nasa.gov/history/SP-4002/app1a.htm";
const CHRONOLOGY_TABLE_B = "https://www.nasa.gov/history/SP-4002/app1b.htm";
const NMC_GEMINI_6A = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-104A";
const GEMINI_8_REPORT =
  "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271965-12-15%2013:37:26.471%27,%271965-12-16%2015:28:50.471%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

/** Supplemental Report 5: printed page within its part, and the page of the combined PDF. */
function supplemental(part: "ascent" | "rendezvous" | "re-entry", locator: string): Citation {
  const name = {
    ascent: "Gemini GT-6A Post Flight Analysis Report (ascent)",
    rendezvous: "Gemini GT-6 Rendezvous and Catch-up Post Flight Report",
    "re-entry": "GT-7/6 Re-entry Mission Reconstruction Report",
  }[part];
  return { source: "gemini-6a-supplemental-report-5", locator: `${name}, ${locator}`, url: SUPPLEMENTAL };
}

/** A line of the Gemini VI transcript: its time as printed, the speaker, and the words. */
function transcript(time: string, words: string, page: number): Citation {
  return {
    source: "gemini-6a-voice-transcript",
    locator: `Page ${page} (PDF page ${page + 1}), ${time}: "${words}"`,
    url: TRANSCRIPT,
  };
}

/** The Gemini VII mission report. */
function geminiVII(locator: string): Citation {
  return { source: "gemini-6a-gemini-vii-mission-report", locator, url: GEMINI_VII_REPORT };
}

/** Table 4.3-IV of the Gemini VII mission report, revolution 160, "Final" column. */
const geminiVIIOrbit = (row: string): Citation =>
  geminiVII(`Table 4.3-IV, "Comparison of Orbital Elements - Concluded" (page 4-27, PDF page 105), revolution 160, "${row}" row, actual final column (heights above the launch complex 19 radius)`);

/** Appendix 1, Table A (General) of the Gemini chronology, Gemini VI-A column. */
const tableA = (rows: string): Citation => ({
  source: "gemini-chronology",
  locator: `Appendix 1, Table A (General), VI-A column: ${rows}`,
  url: CHRONOLOGY_TABLE_A,
});

/** Appendix 1, Table B (Orbital Operations) of the Gemini chronology, Gemini VI-A rows. */
const tableB = (rows: string): Citation => ({
  source: "gemini-chronology",
  locator: `Appendix 1, Table B (Orbital Operations), VI-A rows: ${rows}`,
  url: CHRONOLOGY_TABLE_B,
});

/** On the Shoulders of Titans, chapter XII (printed page; the PDF page is 21 more). */
const titans = (page: number, words: string): Citation => ({
  source: "on-the-shoulders-of-titans",
  locator: `Chapter XII, "Spirit of 76", page ${page} (PDF page ${page + 21}): ${words}`,
});

/** Table 2-IV of Summary of Rendezvous Operations. */
const rendezvousTable = (row: string): Citation => ({
  source: "gemini-6a-rendezvous-summary",
  locator: `Table 2-IV, "Rendezvous Propellant Usage" (page 18 of the Gemini Summary Conference, PDF page 12), VI-A row, ${row}`,
  url: RENDEZVOUS_PAPER,
});

const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});

/* ------------------------------------------------------------------ */
/* Times on Gemini VI-A's clock.                                       */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  "000:00:00",
  { source: "nssdca-master-catalog", locator: '"Gemini 6A" (1965-104A), Mission Profile: "8:37:26 a.m. EST (13:37:26.471 UT)"', url: NMC_GEMINI_6A },
  geminiVII('Section 4.1, "Actual Mission" (page 4-6, PDF page 84): "Gemini VI-A was launched at 13:37:26.47 G.m.t. (258:07:22.77 g.e.t. of Gemini VII)"'),
  transcript("00:00:01", "Lift-off 13:37:26", 1),
);

/** Insertion: the computer's injection conditions are for 358.557 seconds after lift-off. */
const INSERTION = at(
  "000:05:58.557",
  supplemental("ascent", 'Table 3, "IGS Injection Conditions (At Approximately SECO +20: 358.557)" (page 10, PDF page 16)'),
  { source: "nssdca-master-catalog", locator: '"Gemini 6A" (1965-104A), Mission Profile: "inserted into a 161.0 x 259.4 km orbit at 8:43:25" (EST; 5 minutes 58.5 seconds after lift-off, our arithmetic)', url: NMC_GEMINI_6A },
);

/* The catch-up burns, as the crew called their starts and ends. */
const HEIGHT_ADJUST = at("001:34:04", transcript("01:34:04, command pilot", "... MARK. Burning.", 17));
const HEIGHT_ADJUST_END = at("001:34:27", transcript("01:34:27, command pilot", "MARK. Burn complete.", 17));
const PHASE_ADJUST = at(
  "002:18:02",
  transcript("02:18:02, command pilot", "MARK.", 22),
  transcript("02:17:59, command pilot", "3, 2, 1.", 22),
);
const PHASE_ADJUST_END = at(
  "002:19:17",
  transcript("02:19:17, command pilot", "MARK.", 23),
  transcript("02:19:11, command pilot", "Stand by for stop burn.", 23),
);
const PLANE_CHANGE = at("002:42:08", transcript("02:42:08, pilot", "MARK.", 30));
const PLANE_CHANGE_END = at("002:42:47", transcript("02:42:47, command pilot", "Burn complete.", 30));
const COELLIPTIC = at("003:47:40", transcript("03:47:40, command pilot", "Burning.", 43));
/** The coelliptic burn's end: its start plus the 54 seconds On the Shoulders of Titans gives (our sum). */
const COELLIPTIC_END = at(
  "003:48:34",
  titans(287, '"at 3 hours 47 minutes, the aft thrusters fired for 54 seconds" (end time is the transcript\'s start, 03:47:40, plus 54 seconds: our sum)'),
);
const TPI = {
  ...at(
    "005:18:59",
    supplemental("rendezvous", 'Introduction (page 1, PDF page 50): "The closed loop Rendezvous phase between 17,702 and 20,641 seconds TPI at 19,139 seconds elapsed time" (19,139 seconds is 5:18:59)'),
    transcript("05:18:58, command pilot", "We're burning.", 58),
  ),
  discrepancy:
    'On the Shoulders of Titans (page 287) says the gradual catch-up "lasted until 5 hours 16 minutes", and the chronology\'s December 15 entry puts terminal phase initiation "an hour and a half" after the 3:47 coelliptic maneuver. We follow the onboard computer analysis, 5 hours 18 minutes 59 seconds (19,139 seconds), which matches the crew\'s "We\'re burning" at 05:18:58.',
};
const STATION_KEEPING = {
  ...at(
    "005:56:00",
    tableB('Station keeping row, Ground Elapsed Time "To begin (hr:min:sec)", 5:56:00'),
    transcript("05:56:51, pilot", "Roger. We have 120 feet steady.", 76),
  ),
  discrepancy:
    "The Gemini VII mission report (page 1-2) says the rendezvous was accomplished at 263:58 on Gemini VII's clock, which is 5:50:37 on Gemini VI-A's (our arithmetic), the moment braking began. We follow the chronology's start of station keeping.",
};
/** The end of station keeping: its start plus the 5:17:29 the chronology lists (our sum). */
const SEPARATION = {
  ...at(
    "011:13:29",
    tableB('Station keeping row, Ground Elapsed Time "To begin" 5:56:00 and "Period (hr:min:sec)" 5:17:29 (the end, 11:13:29, is our sum)'),
  ),
  discrepancy:
    'The Gemini VII mission report (page 4-6) says the separation maneuver came "At approximately 269:30 g.e.t." on Gemini VII\'s clock, about 11:23 on Gemini VI-A\'s (our arithmetic). We follow the chronology.',
};
const RETROFIRE = {
  ...at(
    "025:15:58",
    tableA('Retrofire and reentry, "G.E.T. to retrofire (hr; min; sec)" row, 25:15:58'),
    { source: "nssdca-master-catalog", locator: '"Gemini 6A" (1965-104A), Mission Profile: "the retrorockets were fired at 9:53:24 a.m. EST on 16 December"', url: NMC_GEMINI_6A },
    transcript("25:15:49, capsule communicator", "10, 9, 8, 7, 6, 5, 4, 3, 2, 1, Retrofire.", 122),
  ),
};
/** Not the end of the burn itself: the moment Schirra read out its velocity change (see the header). */
const RETROFIRE_READOUT = at("025:16:28", transcript("25:16:28, command pilot", "... 309 aft, 1 right ...", 122));
/** The computer's state at about 400,000 feet: T_E = 92,170.375 seconds from lift-off (our reading; see the header). */
const ENTRY_INTERFACE = at(
  "025:36:10.375",
  supplemental("re-entry", 'Table I "(S/C 6) (T_E = 92170.375 sec)" (page 2, PDF page 61); T_E read as time from lift-off (Discussion, page 3, PDF page 62: "the TRS time T_E ... and the elapsed time from lift-off at which retro-fire occurred")'),
);
const DROGUE = at(
  "025:45:55",
  transcript("25:45:55, command pilot", "Drogue is out.", 127),
);
const LANDING = at(
  "025:51:24",
  tableA('Retrofire and reentry, "G.E.T. to touchdown (hr; min; sec)" row, 25:51:24'),
  { source: "gemini-6a-nasa-mission-page", locator: 'Mission Facts: "Landing Date: Dec. 16, 1965, 10:28:50 a.m. EST (15:28:50 UT)"' },
);
/** Hoisted aboard the carrier, crew inside: 11:32 a.m. e.s.t., given to the minute (26:54:33.5 after lift-off, written to the minute). */
const ABOARD = at(
  "026:55:00",
  tableA('Recovery, Time (e.s.t.), Crew and Spacecraft rows, both "11:32 a.m." (given to the minute; 26:54:33.5 after lift-off, our arithmetic, written to the minute)'),
  { source: "nssdca-master-catalog", locator: '"Gemini 6A" (1965-104A), Mission Profile: "The spacecraft and crew were brought aboard the aircraft carrier U.S.S. Wasp at 11:32 a.m."', url: NMC_GEMINI_6A },
);

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/**
 * Launch Complex 19, reused from the Gemini VIII plan (missions/gemini-8/
 * flight.ts): that plan's estimate of the pad from its report's printed
 * values, good to about 2 km. Gemini VI-A flew from the same pad.
 */
const PAD_19_CITATIONS: [Citation, ...Citation[]] = [
  { source: "gemini-chronology", locator: 'Part III (A), December 15, 1965: Gemini VI-A "was launched from complex 19"', url: CHRONOLOGY_1965 },
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

/** Where Gemini VI-A came down, and floated until it was hoisted aboard. */
const SPLASHDOWN = {
  latitude: {
    ...cite(23 + 35 / 60, tableA('Landing coordinates, Lat. row, "23°35\' N."')),
    discrepancy:
      "NSSDCA and NASA's Gemini VI page give 23.58 N, 67.83 W, the same point to the precision printed. The chronology does not say whether its latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(-(67 + 50 / 60), tableA('Landing coordinates, Long. row, "67°50\' W."')),
};

/* ------------------------------------------------------------------ */
/* Shared values.                                                      */
/* ------------------------------------------------------------------ */

const PROGRADE = cite<"prograde">("prograde", tableA('Launch azimuth row, "81.4°" (eastward)'));
const PROGRADE_VII = cite<"prograde">("prograde", geminiVIIOrbit("Inclination, deg (28.89: below 90 degrees, so eastward)"));

/** After the height adjustment: 272 km, 147 nautical miles (our conversion). */
const APOGEE_AFTER_HEIGHT_ADJUST = cite(
  147,
  titans(286, '"The perigee remained the same, but the acceleration kicked the apogee up to 272 kilometers"'),
);
const INSERTION_PERIGEE = cite(86.9, tableA('At insertion, "Perigee (n.m.)" row'));

/** The coelliptic orbit: 270 by 274 km, 146 by 148 nautical miles (our conversion). */
const COELLIPTIC_ORBIT = {
  apoapsis: cite(148, titans(287, '"The result was almost a circle, measuring 270 by 274 kilometers"')),
  periapsis: cite(146, titans(287, '"The result was almost a circle, measuring 270 by 274 kilometers"')),
};

/** Gemini VI-A's orbit after the separation: the chronology's orbit at retrofire (revolution 16). */
const NIGHT_ORBIT = {
  apoapsis: cite(168.1, tableA('At retrofire, "Apogee (n.m.)" row (revolution 16)')),
  periapsis: cite(153.0, tableA('At retrofire, "Perigee (n.m.)" row (revolution 16)')),
  inclination: cite(28.89, tableA('At retrofire, "Inclination angle" row, "28.89°"')),
  period: cite(90.54, tableA('At retrofire, "Period (min.)" row, 90.54')),
  sense: PROGRADE,
};

/** Stafford's radar reading overnight: 17.63 nautical miles at 22:00. */
const RADAR_RANGE = transcript("22:06:15, pilot", "21:50, we have a range of 22.24 nautical miles; at 22:00, we have a range of 17.63 nautical miles.", 108);
const RADAR_RANGE_TIME = at("022:00:00", RADAR_RANGE, transcript("22:05:30, pilot", "at 22 plus 00 we had a range of 17.63 nautical miles and we still have a positive lock-on", 108));
/**
 * Gemini VI-A drawn ahead of Gemini VII at 22:00 (our reading; no source
 * says which side): the separation burn read up to the crew was a
 * retrograde maneuver, which leaves a craft in a shorter orbit that pulls
 * ahead; its published period (90.54 minutes) is shorter than Gemini VII's
 * (90.57); and drawn ahead, the range shrinks from 21:50 to 22:00 as the
 * two radar readings do (22.24 to 17.63), where drawn behind it grows.
 */
const NIGHT_SIDE = "ahead";

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: "gemini-6a",

  // The sky is fit at lift-off and at landing, which span every
  // Earth-relative fix in the plan.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(175.4079019, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-12-15 13:37:26.471")),
      subLunarLongitude: cite(249.392908, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-12-15 13:37:26.471")),
      sunEclipticLongitude: cite(263.379067, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-12-15 13:37:26.471")),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(190.2685923, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-12-16 15:28:50.471")),
      subLunarLongitude: cite(233.84657, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-12-16 15:28:50.471")),
      sunEclipticLongitude: cite(264.475414, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-12-16 15:28:50.471")),
    },
  ],

  ships: [
    {
      id: "gemini",
      name: "Gemini VI-A spacecraft",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
          azimuth: cite(81.4, tableA('Launch azimuth row, "81.4°"')),
        },
        {
          kind: "orbit",
          label: "First orbit",
          body: "earth",
          start: INSERTION,
          end: HEIGHT_ADJUST,
          apoapsis: {
            ...cite(140.0, tableA('At insertion, "Apogee (n.m.)" row')),
            discrepancy: "NSSDCA gives 161.0 by 259.4 km (86.9 by 140.1 nautical miles, our conversion); On the Shoulders of Titans, 161 by 259 km. We follow the chronology.",
          },
          periapsis: INSERTION_PERIGEE,
          inclination: {
            ...cite(28.97, tableA('At insertion, "Inclination angle" row, "28.97°"')),
            discrepancy: "NSSDCA's trajectory page gives the same 28.970 degrees for the first orbit.",
          },
          sense: PROGRADE,
        },
        {
          kind: "burn",
          label: "Height adjustment",
          body: "earth",
          start: HEIGHT_ADJUST,
          end: HEIGHT_ADJUST_END,
        },
        {
          kind: "orbit",
          label: "Higher apogee",
          body: "earth",
          start: HEIGHT_ADJUST_END,
          end: PHASE_ADJUST,
          apoapsis: APOGEE_AFTER_HEIGHT_ADJUST,
          periapsis: cite(86.9, titans(286, '"The perigee remained the same"'), tableA('At insertion, "Perigee (n.m.)" row')),
          sense: PROGRADE,
        },
        {
          kind: "burn",
          label: "Phase adjustment",
          body: "earth",
          start: PHASE_ADJUST,
          end: PHASE_ADJUST_END,
        },
        {
          kind: "orbit",
          label: "Higher perigee",
          body: "earth",
          start: PHASE_ADJUST_END,
          end: PLANE_CHANGE,
          // The apogee is unchanged (our reading; see the header).
          apoapsis: APOGEE_AFTER_HEIGHT_ADJUST,
          periapsis: cite(121, titans(286, '"to raise the chase vehicle\'s perigee to 224 kilometers" (121 nautical miles, our conversion)')),
          sense: PROGRADE,
        },
        {
          kind: "burn",
          label: "Plane change",
          body: "earth",
          start: PLANE_CHANGE,
          end: PLANE_CHANGE_END,
        },
        {
          kind: "orbit",
          label: "In Gemini VII's plane",
          body: "earth",
          start: PLANE_CHANGE_END,
          end: COELLIPTIC,
          apoapsis: APOGEE_AFTER_HEIGHT_ADJUST,
          periapsis: cite(121, titans(286, '"to raise the chase vehicle\'s perigee to 224 kilometers"; the plane change that followed changed the plane, not the size (our reading)')),
          sense: PROGRADE,
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
          label: "Coelliptic orbit, below Gemini VII",
          body: "earth",
          start: COELLIPTIC_END,
          end: TPI,
          ...COELLIPTIC_ORBIT,
          sense: PROGRADE,
          // Where the chase stood when the final approach began.
          endRange: {
            target: "gemini-7",
            range: cite(
              29,
              rendezvousTable('"Conditions at start of terminal phase": "Coelliptic: Δh = 15 n. mi., ΔX = 25 n. mi." (29 nautical miles in a straight line, our arithmetic)'),
            ),
          },
        },
        {
          // The whole terminal phase, drawn as one blend (see the header).
          kind: "burn",
          label: "Terminal phase: closing in",
          body: "earth",
          start: TPI,
          end: STATION_KEEPING,
        },
        {
          kind: "station",
          label: "Flying in formation with Gemini VII",
          start: STATION_KEEPING,
          end: SEPARATION,
          target: "gemini-7",
          // 120 feet, in nautical miles (our conversion).
          range: cite(0.0197, transcript("05:56:51, pilot", "Roger. We have 120 feet steady.", 76)),
        },
        {
          kind: "orbit",
          label: "Apart for the night",
          body: "earth",
          start: SEPARATION,
          end: RADAR_RANGE_TIME,
          ...NIGHT_ORBIT,
          from: "gemini-7",
          // The distance Stafford read off the radar at 22:00.
          endRange: {
            target: "gemini-7",
            range: cite(17.63, RADAR_RANGE),
            side: NIGHT_SIDE,
          },
        },
        {
          kind: "orbit",
          label: "Near Gemini VII until retrofire",
          body: "earth",
          start: RADAR_RANGE_TIME,
          end: RETROFIRE,
          ...NIGHT_ORBIT,
        },
        {
          kind: "burn",
          label: "Retrofire",
          body: "earth",
          start: RETROFIRE,
          end: RETROFIRE_READOUT,
        },
        {
          kind: "coast",
          label: "Falling toward the atmosphere",
          body: "earth",
          start: RETROFIRE_READOUT,
          end: ENTRY_INTERFACE,
          sense: cite("prograde", supplemental("re-entry", 'Table I (page 2, PDF page 61), telemetry row, heading "ψ_E" 92.242 degrees (eastward)')),
          // The onboard computer's state at about 400,000 feet. The fall
          // from retrofire is the Kepler path through it, run back in time.
          endFix: {
            latitude: cite(28.822, supplemental("re-entry", 'Table I (page 2, PDF page 61), telemetry ("T/M") row, "φ" 28.822 degrees (geocentric, our reading; see the header)')),
            latitudeKind: "geocentric",
            longitude: cite(-99.519, supplemental("re-entry", 'Table I (page 2, PDF page 61), telemetry row, "θ_E" 260.481 degrees east, which is 99.519 degrees west')),
            altitude: cite(65.58, supplemental("re-entry", 'Table I (page 2, PDF page 61), telemetry row, "r_s" 21,307,736 ft from Earth\'s center (65.58 nautical miles above the ellipsoid, our arithmetic)')),
            speed: cite(24_389.179, supplemental("re-entry", 'Table I (page 2, PDF page 61), telemetry row, "V_E" 24389.179 fps')),
            flightPathAngle: cite(-1.422, supplemental("re-entry", 'Table I (page 2, PDF page 61), telemetry row, "γ" -1.422 degrees')),
            heading: cite(92.242, supplemental("re-entry", 'Table I (page 2, PDF page 61), telemetry row, "ψ_E" 92.242 degrees')),
            velocityFrame: "earth-fixed",
          },
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: DROGUE,
          // 14,000 meters, in nautical miles (our conversion).
          drogueAltitude: {
            ...cite(7.56, titans(291, '"deployed the drogue parachute at 14 000 meters"')),
            discrepancy: "NASA's 55-years article gives 45,000 feet (7.41 nautical miles). We follow On the Shoulders of Titans.",
          },
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
      id: "gemini-7",
      name: "Gemini VII spacecraft",
      role: "target",
      phases: [
        {
          kind: "orbit",
          label: "Gemini VII, on its eleventh day",
          body: "earth",
          start: LIFTOFF,
          end: ABOARD,
          apoapsis: cite(162.5, geminiVIIOrbit("Apogee, n. mi.")),
          periapsis: cite(157.1, geminiVIIOrbit("Perigee, n. mi.")),
          inclination: cite(28.89, geminiVIIOrbit("Inclination, deg")),
          period: cite(90.57, geminiVIIOrbit("Period, min")),
          sense: PROGRADE_VII,
          startRelative: {
            ship: "gemini",
            time: INSERTION,
            ahead: {
              ...cite(1075.6, titans(286, '"At insertion, the chase vehicle trailed its target by 1992 kilometers" (1075.6 nautical miles, our conversion)')),
              discrepancy: "NSSDCA says Gemini VI-A trailed Gemini VII by about 1,900 km at insertion. We follow On the Shoulders of Titans.",
            },
          },
        },
      ],
    },
  ],
};
