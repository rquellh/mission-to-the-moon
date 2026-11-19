/**
 * The Gemini VII flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the crew's spacecraft ("gemini", the main ship), and Gemini
 * VI-A ("gemini-6a", the visitor), which lifted off on Gemini VII's
 * eleventh day, caught up with it, flew beside it, and landed the next day.
 *
 * Sources, in the order we follow them:
 * - Gemini Program Mission Report, Gemini VII (MSC-G-R-66-1): the sequence
 *   of events (Table 4.2-I), launch and landing (Table 4.3-I), the
 *   maneuvers (Table 4.3-II), the orbit before and after each maneuver
 *   (Table 4.3-III), the orbit every 16th revolution (Table 4.3-IV), the
 *   rendezvous, the retrograde section's jettison (section 7.1.2.4), the
 *   drogue parachute height, and the recovery (section 6.3.2). No NASA or
 *   Internet Archive copy was found; the citations link to NASA's scan in
 *   the Virtual AGC library at ibiblio.org. Pages are the report's printed
 *   pages, then the scan's PDF pages.
 * - For Gemini VI-A, whose own mission report was not found: its
 *   Supplemental Report 5 (insertion, terminal phase initiation, and its
 *   state at about 400,000 feet on the way down), the
 *   Gemini VI transcript (its burns and its distance from Gemini VII
 *   overnight), Summary of Rendezvous Operations (where the final approach
 *   began), the Gemini chronology's Appendix 1 (its orbits, retrofire,
 *   touchdown, and landing point), and On the Shoulders of Titans.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini VII's ground elapsed time, zero at lift-off,
 * 19:30:03.702 G.m.t. on December 4, 1965 (Table 4.2-I).
 *
 * Gemini VI-A's times, on Gemini VII's clock. Gemini VI-A's sources print
 * times on its own clock, zero at its lift-off, 13:37:26.47 G.m.t. on
 * December 15, 1965 (Gemini VII mission report, section 4.1). From
 * 19:30:03.702 G.m.t. on December 4 to 13:37:26.47 on December 15 is 10
 * days 18 hours 7 minutes 22.768 seconds, 258:07:22.768 (our arithmetic);
 * the same report prints the moment as "258:07:22.77 g.e.t. of Gemini
 * VII". Every Gemini VI-A time here is its own clock's time plus
 * 258:07:22.77 (our sum, kept to hundredths of a second): for example,
 * its retrofire at 25:15:58 is 283:23:20.77 here.
 *
 * Arithmetic of ours, from printed values:
 * - Times printed in seconds from lift-off are written as hours:minutes:
 *   seconds. A maneuver's end is its printed start plus its printed thrust
 *   duration (Table 4.3-II).
 * - Degrees and minutes are written in decimal degrees; feet and meters
 *   are converted at 1 foot = 0.3048 m and 1 nautical mile = 1852 m, and
 *   kilometers are converted to the number of digits the source gives.
 * - The range at Gemini VI-A's terminal phase initiation is the straight
 *   line across the 15 nautical miles below and 25 behind that Table 2-IV
 *   prints: 29.
 * - Gemini VI-A's height at about 400,000 feet: the computer prints its
 *   distance from Earth's center (21,307,736 feet) and a geocentric
 *   latitude; over the ellipsoid that is 398,457 feet, 65.58 nautical
 *   miles.
 *
 * Readings of ours (the sources do not say), as in the Gemini 6A plan:
 * - The re-entry report's time "T_E" for Gemini VI-A is the time from its
 *   lift-off: its first telemetry frame, 91,133.86 seconds, less the 172.25
 *   seconds counted from retrofire by then, falls 3.6 seconds after the
 *   chronology's retrofire time, 25:15:58.
 * - That state's latitude is geocentric (in the same report's Table III it
 *   peaks at 28.892 degrees, the orbit's inclination), and its velocity,
 *   flight-path angle, and heading are measured against the turning Earth
 *   (the report's equations add Earth's rotation to them).
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The launch pad, Launch Complex 19, placed where the Gemini VIII plan
 *   places it (its estimate from that flight's report; see
 *   missions/gemini-8/flight.ts). Both Gemini VII and VI-A flew from it.
 * - The climbs to orbit between the pad and the published points (for
 *   Gemini VII, its first-stage cutoff; its second-stage cutoff, 31.78
 *   seconds before insertion, is left to the orbit, which takes over
 *   there), each burn (a smooth blend from one orbit to the next), and the
 *   entries (a smooth ground track to the landing point and a smooth
 *   descent). Where Gemini VII fired its retrorockets is not printed; the
 *   engine places retrofire so the fall reaches the published landing
 *   point on time. Gemini VI-A's fall from retrofire is the Kepler path
 *   through its published state at about 400,000 feet, run back in time.
 * - Gemini VII's orbit over two weeks: a Kepler ellipse turned slowly by
 *   Earth's bulge (J2), whose size passes through the report's published
 *   sizes before and after each maneuver (Table 4.3-III) and changes
 *   smoothly in between. Each maneuver is drawn as a step from the size
 *   before it to the size after it over its printed thrust duration. The
 *   two circularization firings, 43 minutes apart, are drawn as one change
 *   from the size before the first to the size after the second, since the
 *   orbit between them is not published. The sizes every 16th revolution
 *   (Table 4.3-IV) are given by revolution, not by time, and are not used,
 *   except the last, for revolution 206 just before retrofire, which is
 *   placed at retrofire. So from the circularization to Gemini VI-A's
 *   insertion the size is held at 162.8 by 160.5 nautical miles, and from
 *   then to retrofire it changes smoothly to 163.6 by 156.5. The table
 *   measures heights above the launch complex 19 radius, a few miles below
 *   the equatorial radius the model measures from.
 * - Where Gemini VII is when Gemini VI-A reaches orbit: 1075.6 nautical
 *   miles ahead of it. On the Shoulders of Titans gives the lead as 1992 km
 *   along the orbit; the engine reads it as a straight line, about 4
 *   nautical miles shorter at this height (our arithmetic). Gemini VII's
 *   first orbit phase is pinned to end there, with a correction spread over
 *   its ten and three-quarter days; the second phase carries on to
 *   retrofire with the published period of 90.57 minutes (Table 4.3-IV).
 * - Gemini VI-A's chase. Its catch-up burns are drawn as blends between
 *   orbits of the published sizes; its plane change at 2:42 (260:49:30.77
 *   here) is not drawn as a change of plane: Gemini VII is drawn in Gemini
 *   VI-A's launch plane instead. No orbit after terminal phase initiation
 *   is published, so the final approach is drawn as one blend, from the
 *   coelliptic orbit 29 nautical miles behind Gemini VII to its side.
 * - The meeting. Station keeping begins at 5:56:00 on Gemini VI-A's clock
 *   (the chronology), 264:03:22.77 here; the Gemini VII report's
 *   "rendezvous ... accomplished at 263:58" is about when braking began,
 *   5:50:37 on Gemini VI-A's clock. It ends at the separation maneuver,
 *   "approximately 269:30" in the Gemini VII report (the chronology's end of
 *   station keeping, 11:13:29 on Gemini VI-A's clock, 269:20:51.77 here, is
 *   noted in the story). While keeping station, Gemini VI-A is drawn at
 *   Gemini VII's position (the scene draws the two a little apart).
 * - Overnight, Gemini VI-A flies the orbit the chronology lists for it at
 *   retrofire, at the period listed there (90.54 minutes), pinned to be
 *   17.63 nautical miles ahead of Gemini VII at 22:00 on its clock, as its
 *   crew read the radar range. That Gemini VII was behind it then is the
 *   crew's "he'll be aft of me", confirmed by the ground. From there its
 *   last orbits are pinned to end where its fall from retrofire begins.
 *   Drawn this way, the two stay within about 40 nautical miles of each
 *   other through the night, near the 16 to 26 nautical miles its crew
 *   read on the radar between 21:50 and 22:30 on their clock (transcript,
 *   pages 108 to 111). Gemini VI-A's two small burns of the night are not
 *   drawn.
 * - Retrofire is drawn from its start to the moment the retrograde section
 *   was cast off 45 seconds later (Gemini VII; section 7.1.2.4) or, for
 *   Gemini VI-A, to Schirra's readout of the velocity it had taken off. The
 *   four rockets burned for less than that, but their times are not
 *   published (for Gemini VII the tape recorder had failed; section
 *   5.1.8.3).
 * - After landing, Gemini VII is drawn floating at the landing point until
 *   the carrier lifted it aboard; its drift of about 2 miles (section
 *   6.3.2) is not drawn. Gemini VI-A's path ends at its touchdown.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan, StateFix } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = "https://www.ibiblio.org/apollo/Documents/Gemini7MissionReport.pdf";
const SUPPLEMENTAL = "https://www.ibiblio.org/apollo/Documents/Gemini-6-7-PostFlightReports.pdf";
const TRANSCRIPT = "https://www.nasa.gov/wp-content/uploads/2026/01/gt06-tec.pdf";
const RENDEZVOUS_PAPER = "https://ntrs.nasa.gov/api/citations/19680005473/downloads/19680005473.pdf";
const CHRONOLOGY_1965 = "https://www.nasa.gov/history/SP-4002/p3a.htm";
const CHRONOLOGY_TABLE_A = "https://www.nasa.gov/history/SP-4002/app1a.htm";
const GEMINI_8_REPORT =
  "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf";
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES = "&TLIST_TYPE=%27CAL%27&TLIST=%271965-12-04%2019:30:03.702%27,%271965-12-09%2018:41:58.702%27,%271965-12-15%2013:37:26.47%27,%271965-12-18%2013:28:07.702%27,%271965-12-18%2014:05:04.702%27";
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

/** The Gemini VII mission report, at a printed page (and the scan's PDF page). */
function report(locator: string): Citation {
  return { source: "gemini-6a-gemini-vii-mission-report", locator, url: MISSION_REPORT };
}

/** Table 4.2-I, sequence of events, "Actual time, g.e.t." column. */
const sequence = (row: string, page: "4-12 (PDF page 90)" | "4-13 (PDF page 91)"): Citation =>
  report(`Table 4.2-I, "Sequence of Events" (page ${page}), "${row}" row, actual time`);
/** Table 4.3-I, trajectory parameters, "Actual, Final" column. */
const trajectory = (condition: string, row: string): Citation =>
  report(`Table 4.3-I, "Comparison of Planned and Actual Trajectory Parameters" (page 4-21, PDF page 99), ${condition}, "${row}" row, actual final column`);
/** Table 4.3-II, the maneuvers, "Actual" column. */
const maneuver = (name: string, row: string, page: "4-23 (PDF page 101)" | "4-24 (PDF page 102)"): Citation =>
  report(`Table 4.3-II, "Gemini VII Maneuvers" (page ${page}), ${name}, "${row}" row, actual column`);
/** Table 4.3-III, orbital elements before and after each maneuver, "Actual, Final" columns. */
const elements = (maneuverName: string, when: "before" | "after", row: string): Citation =>
  report(`Table 4.3-III, "Comparison of Orbital Elements for Maneuvers" (page 4-25, PDF page 103), ${maneuverName}, "${row}" row, ${when} maneuver, actual final column`);
/** Table 4.3-IV, orbital elements every 16th revolution, "Actual, Final" column. */
const revolution = (rev: string, row: string): Citation =>
  report(`Table 4.3-IV, "Comparison of Orbital Elements - Concluded" (page 4-27, PDF page 105), revolution ${rev}, "${row}" row, actual final column (heights above the launch complex 19 radius)`);

/** Appendix 1, Table A (General) of the Gemini chronology. */
const tableA = (column: "VII" | "VI-A", rows: string): Citation => ({
  source: "gemini-chronology",
  locator: `Appendix 1, Table A (General), ${column} column: ${rows}`,
  url: CHRONOLOGY_TABLE_A,
});

/** On the Shoulders of Titans, chapter XII (printed page; the PDF page is 21 more). */
const titans = (page: number, words: string): Citation => ({
  source: "on-the-shoulders-of-titans",
  locator: `Chapter XII, "Spirit of 76", page ${page} (PDF page ${page + 21}): ${words}`,
});

/** A line of the Gemini VI transcript, on Gemini VI-A's clock: its time as printed, the speaker, and the words. */
function transcript(time: string, words: string, page: number): Citation {
  return {
    source: "gemini-6a-voice-transcript",
    locator: `Page ${page} (PDF page ${page + 1}), ${time} on Gemini VI-A's clock: "${words}"`,
    url: TRANSCRIPT,
  };
}

/** Table I of the GT-7/6 Re-entry Mission Reconstruction Report (Supplemental Report 5 to Gemini VI-A's mission report). */
const reentry = (row: string): Citation => ({
  source: "gemini-6a-supplemental-report-5",
  locator: `GT-7/6 Re-entry Mission Reconstruction Report, Table I "(S/C 6) (T_E = 92170.375 sec)" (page 2, PDF page 61), ${row}`,
  url: SUPPLEMENTAL,
});

const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY("301", "500@399", "31");
const EARTH_FROM_MOON = HORIZONS_QUERY("399", "500@301", "14");
const SUN_FROM_EARTH = HORIZONS_QUERY("10", "500@399", "31");

/* ------------------------------------------------------------------ */
/* Clock arithmetic.                                                   */
/* ------------------------------------------------------------------ */

/** Seconds on the mission clock as "hhh:mm:ss.ss", kept to hundredths. */
function clockTime(seconds: number): ElapsedTime {
  const total = Math.round(seconds * 100) / 100;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total - hours * 3600) / 60);
  const rest = (total - hours * 3600 - minutes * 60).toFixed(2).replace(/\.?0+$/, "");
  const [whole = "0", fraction] = rest.split(".");
  return `${String(hours).padStart(3, "0")}:${String(minutes).padStart(2, "0")}:${whole.padStart(2, "0")}${fraction ? `.${fraction}` : ""}` as ElapsedTime;
}

function seconds(elapsed: string): number {
  const [h = "0", m = "0", s = "0"] = elapsed.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** A printed start plus a printed duration in seconds (our sum). */
function plus(start: ElapsedTime, duration: number, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: clockTime(seconds(start) + duration), citations: [citation, ...more] };
}

/** Gemini VI-A's lift-off on Gemini VII's clock, as the Gemini VII report prints it. */
const GEMINI_6A_OFFSET = "258:07:22.77";
const BOTH_LIFTOFFS: [Citation, Citation] = [
  report('Section 4.1, "Actual Mission" (page 4-6, PDF page 84): "Gemini VI-A was launched at 13:37:26.47 G.m.t. (258:07:22.77 g.e.t. of Gemini VII)"'),
  report('Table 4.2-I, "Sequence of Events" (page 4-12, PDF page 90), "Lift-off (pad disconnect separation) (19:30:03.702 G.m.t.)" row: Gemini VII\'s clock zero (the difference of the two lift-off times is 258:07:22.768, our arithmetic)'),
];

/** A time on Gemini VI-A's clock, moved to Gemini VII's: plus 258:07:22.77 (our sum). */
function onGemini7Clock(gemini6aClock: string, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return {
    value: clockTime(seconds(GEMINI_6A_OFFSET) + seconds(gemini6aClock)),
    citations: [citation, ...more, ...BOTH_LIFTOFFS],
  };
}

/* ------------------------------------------------------------------ */
/* Gemini VII's times.                                                 */
/* ------------------------------------------------------------------ */

const LIFTOFF = at("000:00:00", sequence("Lift-off (pad disconnect separation) (19:30:03.702 G.m.t.)", "4-12 (PDF page 90)"));
/** Spacecraft separation, 368.79 seconds after lift-off. */
const INSERTION = at(
  "000:06:08.79",
  sequence("Spacecraft separation (shaped charge fire)", "4-13 (PDF page 91)"),
  trajectory("spacecraft separation", "Time from lift-off, sec (368.79)"),
);
const D4D7 = at("000:21:17", sequence("D-4/D-7 experiment maneuver", "4-13 (PDF page 91)"));
const D4D7_END = plus("000:21:17", 21.2, maneuver("D-4/D-7 experiment", "Δt, sec (21.2)", "4-23 (PDF page 101)"), sequence("D-4/D-7 experiment maneuver", "4-13 (PDF page 91)"));
const PERIGEE_ADJUST = at("003:47:59", sequence("Perigee adjust maneuver", "4-13 (PDF page 91)"));
const PERIGEE_ADJUST_END = plus("003:47:59", 76.2, maneuver("perigee adjust", "Δt, sec (76.2)", "4-23 (PDF page 101)"), sequence("Perigee adjust maneuver", "4-13 (PDF page 91)"));
const PHASE_ADJUST: Cited<ElapsedTime> = {
  ...at("069:43:21", sequence("Phasing maneuver", "4-13 (PDF page 91)")),
  discrepancy:
    'Table 4.3-II (page 4-23) and section 4.1 (page 4-4) give the phase adjustment as 69:43:19; Table 4.2-I gives 69:43:19 as planned and 69:43:21 as actual. We follow the sequence of events\' actual time.',
};
const PHASE_ADJUST_END = plus("069:43:21", 16.5, maneuver("phase adjust", "Δt, sec (16.5)", "4-23 (PDF page 101)"), sequence("Phasing maneuver", "4-13 (PDF page 91)"));
const CIRCULARIZE = at("119:11:55", report('Table 4.2-I, "Sequence of Events" (page 4-13, PDF page 91), first "Circularization maneuver" row, actual time 119:11:55'), maneuver("circular perigee adjust", "Maneuver initiate", "4-24 (PDF page 102)"));
const CIRCULARIZE_END = plus(
  "119:55:01",
  15,
  maneuver("circular apogee adjust", "Δt, sec (15)", "4-24 (PDF page 102)"),
  report('Table 4.2-I, "Sequence of Events" (page 4-13, PDF page 91), second "Circularization maneuver" row, actual time 119:55:01'),
);
const RETROFIRE = at(
  "329:58:04",
  sequence("Retrofire initiation", "4-13 (PDF page 91)"),
  tableA("VII", '"G.E.T. to retrofire (hr; min; sec)" row, 329:58:04'),
);
/** The end of the drawn retrofire: the retrograde section's jettison, 45 seconds after retrofire (our sum). */
const RETRO_SECTION_OFF = plus(
  "329:58:04",
  45,
  report('Section 7.1.2.4, "Preretrofire and retrofire" (page 7-57, PDF page 313): "The retrograde section of the adapter was jettisoned at TR + 45 seconds"'),
  sequence("Retrofire initiation", "4-13 (PDF page 91)"),
);
const DROGUE = at("330:29:30", sequence("Drogue parachute deployment", "4-13 (PDF page 91)"));
const LANDING = at(
  "330:35:01",
  sequence("Landing", "4-13 (PDF page 91)"),
  tableA("VII", '"G.E.T. to touchdown (hr; min; sec)" row, 330:35:01'),
);
/** The end of Gemini VII's path: the carrier had the spacecraft aboard (given to the minute). */
const ABOARD: Cited<ElapsedTime> = {
  ...at(
    "331:38:00",
    report('Section 6.3.2, "Location and Retrieval" (page 6-18, PDF page 238): "The carrier had the spacecraft onboard at 331:38 g.e.t." (given to the minute; seconds written as 00)'),
  ),
  discrepancy:
    'The chronology (Appendix 1, Table A) gives the spacecraft\'s recovery as 10:08 a.m. e.s.t., which is 331:37:56 (our arithmetic). Section 1.0 of the report says "approximately 1 hour and 5 minutes after landing". We follow section 6.3.2.',
};

/* ------------------------------------------------------------------ */
/* Gemini VI-A's times, on Gemini VII's clock (see the header).        */
/* ------------------------------------------------------------------ */

const LIFTOFF_6A = at(GEMINI_6A_OFFSET, ...BOTH_LIFTOFFS);
/** Insertion: the computer's injection conditions are for 358.557 seconds after Gemini VI-A's lift-off. */
const INSERTION_6A = onGemini7Clock(
  "000:05:58.557",
  {
    source: "gemini-6a-supplemental-report-5",
    locator: 'Gemini GT-6A Post Flight Analysis Report (ascent), Table 3, "IGS Injection Conditions (At Approximately SECO +20: 358.557)" (page 10, PDF page 16)',
    url: SUPPLEMENTAL,
  },
);
const HEIGHT_ADJUST_6A = onGemini7Clock("001:34:04", transcript("01:34:04, command pilot", "... MARK. Burning.", 17));
const HEIGHT_ADJUST_6A_END = onGemini7Clock("001:34:27", transcript("01:34:27, command pilot", "MARK. Burn complete.", 17));
const PHASE_ADJUST_6A = onGemini7Clock("002:18:02", transcript("02:18:02, command pilot", "MARK.", 22));
const PHASE_ADJUST_6A_END = onGemini7Clock("002:19:17", transcript("02:19:17, command pilot", "MARK.", 23));
const PLANE_CHANGE_6A = onGemini7Clock("002:42:08", transcript("02:42:08, pilot", "MARK.", 30));
const PLANE_CHANGE_6A_END = onGemini7Clock("002:42:47", transcript("02:42:47, command pilot", "Burn complete.", 30));
const COELLIPTIC_6A = onGemini7Clock("003:47:40", transcript("03:47:40, command pilot", "Burning.", 43));
/** The coelliptic burn's end: its start plus the 54 seconds On the Shoulders of Titans gives (our sum). */
const COELLIPTIC_6A_END = onGemini7Clock(
  "003:48:34",
  titans(287, '"at 3 hours 47 minutes, the aft thrusters fired for 54 seconds" (the end, 3:48:34 on Gemini VI-A\'s clock, is the transcript\'s start, 03:47:40, plus 54 seconds: our sum)'),
  transcript("03:47:40, command pilot", "Burning.", 43),
);
/** Terminal phase initiation: 19,139 seconds (5:18:59) on Gemini VI-A's clock. */
const TPI_6A = onGemini7Clock(
  "005:18:59",
  {
    source: "gemini-6a-supplemental-report-5",
    locator: 'Gemini GT-6 Rendezvous and Catch-up Post Flight Report, Introduction (page 1, PDF page 50): "The closed loop Rendezvous phase between 17,702 and 20,641 seconds TPI at 19,139 seconds elapsed time"',
    url: SUPPLEMENTAL,
  },
  transcript("05:18:58, command pilot", "We're burning.", 58),
);
/**
 * The start of station keeping: 5:56:00 on Gemini VI-A's clock. The Gemini
 * VII report's "rendezvous ... accomplished at 263:58" is an earlier moment,
 * 5:50:37 on Gemini VI-A's clock (our arithmetic), when braking began.
 */
const ARRIVAL = onGemini7Clock(
  "005:56:00",
  { source: "gemini-chronology", locator: 'Appendix 1, Table B (Orbital Operations), VI-A rows: Station keeping, Ground Elapsed Time "To begin (hr:min:sec)" 5:56:00', url: "https://www.nasa.gov/history/SP-4002/app1b.htm" },
  { source: "gemini-chronology", locator: 'Part III (A), December 15, 1965: "final braking maneuvers at 5 hours 50 minutes into the flight. Rendezvous was technically accomplished and stationkeeping began some 6 minutes later when the two spacecraft were about 120 feet apart and their relative motion had stopped."', url: CHRONOLOGY_1965 },
);
const SEPARATION_6A: Cited<ElapsedTime> = {
  ...at(
    "269:30:00",
    report('Section 4.1, "Actual Mission" (page 4-6, PDF page 84): "At approximately 269:30 g.e.t., the Gemini VI-A crew performed a separation maneuver" (given to the minute; seconds written as 00)'),
  ),
  discrepancy:
    "The chronology's Appendix 1, Table B ends Gemini VI-A's station keeping 5:17:29 after it began at 5:56:00 on Gemini VI-A's clock, which is 269:20:51.77 on Gemini VII's (our arithmetic). We follow the Gemini VII mission report.",
};
/** 22:00 on Gemini VI-A's clock, when its crew read a radar range of 17.63 nautical miles to Gemini VII. */
const RANGE_READING_6A = onGemini7Clock(
  "022:00:00",
  transcript("22:06:15, pilot", "Roger. 21:50, we have a range of 22.24 nautical miles; at 22:00, we have a range of 17.63 nautical miles.", 108),
);
const RETROFIRE_6A = onGemini7Clock(
  "025:15:58",
  tableA("VI-A", '"G.E.T. to retrofire (hr; min; sec)" row, 25:15:58'),
  transcript("25:15:49, capsule communicator", "10, 9, 8, 7, 6, 5, 4, 3, 2, 1, Retrofire.", 122),
);
/** Not the end of the burn itself: the moment Schirra read out its velocity change (see the header). */
const RETROFIRE_6A_READOUT = onGemini7Clock("025:16:28", transcript("25:16:28, command pilot", "... 309 aft, 1 right ...", 122));
/**
 * The computer's state at about 400,000 feet: T_E = 92,170.375 seconds,
 * read as time from Gemini VI-A's lift-off (25:36:10.375 on its clock; see
 * the header).
 */
const ENTRY_INTERFACE_6A = onGemini7Clock(
  "025:36:10.375",
  reentry('heading "(S/C 6) (T_E = 92170.375 sec)"'),
  {
    source: "gemini-6a-supplemental-report-5",
    locator:
      'GT-7/6 Re-entry Mission Reconstruction Report, page 4 (PDF page 63): "For GT-6, the first available telemetry record was at time 91133.86 sec, which corresponds to an integration time from retro of TT = 172.25 sec" (91,133.86 less 172.25 seconds is 25:16:01.61, 3.61 seconds after the chronology\'s retrofire time, 25:15:58: our arithmetic, and why T_E is read as time from lift-off)',
    url: SUPPLEMENTAL,
  },
);
const DROGUE_6A = onGemini7Clock("025:45:55", transcript("25:45:55, command pilot", "Drogue is out.", 127));
const LANDING_6A = onGemini7Clock("025:51:24", tableA("VI-A", '"G.E.T. to touchdown (hr; min; sec)" row, 25:51:24'));

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/*
 * Launch Complex 19, as the Gemini VIII plan places it, with that plan's
 * citations: the Gemini VIII report does not print where the pad is
 * either, so it is that plan's estimate from the report's first-stage
 * cutoff point, its range from the launch site, and the flight azimuth
 * (see missions/gemini-8/flight.ts).
 */
const PAD_19_ESTIMATE: [Citation, ...Citation[]] = [
  report('Section 1.0, "Mission Summary" (page 1-1, PDF page 31): Gemini VII "was launched from Complex 19, Cape Kennedy, Florida"'),
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
const PAD_19 = { latitude: cite(28.51, ...PAD_19_ESTIMATE), longitude: cite(-80.57, ...PAD_19_ESTIMATE) };

/** Where Gemini VII came down, and floated until the carrier lifted it aboard. */
const SPLASHDOWN = {
  latitude: {
    ...cite(25 + 25.1 / 60, report('Table 4.3-I, "Comparison of Planned and Actual Trajectory Parameters - Concluded" (page 4-22, PDF page 100), landing point, "Latitude" row, actual final column, "25°25.1\' N." (based on final Grand Turk Island radar tracking data)')),
    discrepancy:
      "The chronology's Appendix 1, Table A gives 25°25'01\" N, 70°06'07\" W, and NASA's Gemini VII page 25.42 N, 70.10 W. The recovery ship placed the spacecraft at pickup at 25°21.9' N, 70°08.8' W, about 2 miles from where it landed (section 6.3.2). We follow Table 4.3-I's final column. The report does not say whether this latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(-(70 + 6.7 / 60), report('Table 4.3-I, "Comparison of Planned and Actual Trajectory Parameters - Concluded" (page 4-22, PDF page 100), landing point, "Longitude" row, actual final column, "70°06.7\' W."')),
};

/** Where Gemini VI-A came down. */
const SPLASHDOWN_6A = {
  latitude: cite(23 + 35 / 60, tableA("VI-A", 'Landing coordinates, Lat. row, "23°35\' N."')),
  longitude: cite(-(67 + 50 / 60), tableA("VI-A", 'Landing coordinates, Long. row, "67°50\' W."')),
};

/* ------------------------------------------------------------------ */
/* Shared values.                                                      */
/* ------------------------------------------------------------------ */

const PROGRADE = cite<"prograde">("prograde", trajectory("spacecraft separation", "Space-fixed heading angle, deg E of N (89.88)"));
const PROGRADE_6A = cite<"prograde">("prograde", tableA("VI-A", 'Launch azimuth row, "81.4°" (eastward)'));

/** Gemini VII's orbit right after circularization, held to Gemini VI-A's insertion (see the header). */
const CIRCULAR = {
  apoapsis: cite(162.8, elements("Circularize revolution 75/76", "after", "Apogee, n. mi.")),
  periapsis: cite(160.5, elements("Circularize revolution 75/76", "after", "Perigee, n. mi.")),
};

/** Gemini VI-A after its height adjustment: 272 km, 147 nautical miles (our conversion). */
const APOGEE_AFTER_HEIGHT_ADJUST_6A = cite(
  147,
  titans(286, '"The perigee remained the same, but the acceleration kicked the apogee up to 272 kilometers"'),
);
const PERIGEE_AFTER_PHASE_ADJUST_6A = cite(
  121,
  titans(286, '"to raise the chase vehicle\'s perigee to 224 kilometers" (121 nautical miles, our conversion; the apogee is left where the height adjustment put it, our reading)'),
);
/** Gemini VI-A's orbit for the night, as the chronology lists it at retrofire. */
const NIGHT_ORBIT_6A = {
  apoapsis: cite(168.1, tableA("VI-A", 'At retrofire, "Apogee (n.m.)" row (revolution 16)')),
  periapsis: cite(153.0, tableA("VI-A", 'At retrofire, "Perigee (n.m.)" row (revolution 16)')),
  inclination: cite(28.89, tableA("VI-A", 'At retrofire, "Inclination angle" row, "28.89°"')),
  period: cite(90.54, tableA("VI-A", 'At retrofire, "Period (min.)" row, 90.54')),
};

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: "gemini-7",

  // Five samples across the two weeks: lift-off, the circularization,
  // Gemini VI-A's lift-off, retrofire, and landing.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(23.1360912, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-12-04 19:30:03.702", MOON_FROM_EARTH)),
      subLunarLongitude: cite(16.807517, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-12-04 19:30:03.702", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(252.4518274, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-12-04 19:30:03.702", SUN_FROM_EARTH)),
    },
    {
      time: CIRCULARIZE,
      moonEclipticLongitude: cite(91.667829, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-12-09 18:41:58.702", MOON_FROM_EARTH)),
      subLunarLongitude: cite(93.075511, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-12-09 18:41:58.702", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(257.4940244, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-12-09 18:41:58.702", SUN_FROM_EARTH)),
    },
    {
      // 13:37:26.47 G.m.t. is 258:07:22.768 on Gemini VII's clock (our arithmetic).
      time: at("258:07:22.768", ...BOTH_LIFTOFFS),
      moonEclipticLongitude: cite(175.4079018, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-12-15 13:37:26.47", MOON_FROM_EARTH)),
      subLunarLongitude: cite(249.392912, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-12-15 13:37:26.47", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(263.379067, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-12-15 13:37:26.47", SUN_FROM_EARTH)),
    },
    {
      time: RETROFIRE,
      moonEclipticLongitude: cite(215.9479455, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-12-18 13:28:07.702", MOON_FROM_EARTH)),
      subLunarLongitude: cite(285.508813, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-12-18 13:28:07.702", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(266.4261109, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-12-18 13:28:07.702", SUN_FROM_EARTH)),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(216.2856684, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-12-18 14:05:04.702", MOON_FROM_EARTH)),
      subLunarLongitude: cite(276.561854, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-12-18 14:05:04.702", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(266.4522392, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-12-18 14:05:04.702", SUN_FROM_EARTH)),
    },
  ],

  ships: [
    {
      id: "gemini",
      name: "Gemini VII spacecraft",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
          track: [ascentPoint("BECO", 155.61, 34, 28.6, -79.57)],
        },
        {
          kind: "orbit",
          label: "Ten and a half days in orbit",
          body: "earth",
          start: INSERTION,
          end: INSERTION_6A,
          apoapsis: cite(177.1, elements("Station keeping and D-4/D-7 experiment", "before", "Apogee, n. mi."), tableA("VII", 'At insertion, "Apogee (n.m.)" row')),
          periapsis: cite(87.2, elements("Station keeping and D-4/D-7 experiment", "before", "Perigee, n. mi."), tableA("VII", 'At insertion, "Perigee (n.m.)" row')),
          inclination: cite(28.89, elements("Station keeping and D-4/D-7 experiment", "before", "Inclination, deg."), tableA("VII", 'At insertion, "Inclination angle" row, "28.89°"')),
          sense: PROGRADE,
          startFix: {
            latitude: cite(29.05, trajectory("spacecraft separation", "Geodetic latitude, deg North")),
            longitude: cite(-69.45, trajectory("spacecraft separation", "Longitude, deg West (printed 69.45 west)")),
            altitude: cite(87.2, trajectory("spacecraft separation", "Altitude, n. mi.")),
            speed: cite(25_793, trajectory("spacecraft separation", "Space-fixed velocity, ft/sec")),
            flightPathAngle: cite(0.05, trajectory("spacecraft separation", "Space-fixed flight-path angle, deg")),
            heading: cite(89.88, trajectory("spacecraft separation", "Space-fixed heading angle, deg E of N")),
          },
          sizes: [
            // The separation maneuver of the D-4/D-7 experiment, a step.
            {
              time: D4D7,
              apoapsis: cite(177.1, elements("Station keeping and D-4/D-7 experiment", "before", "Apogee, n. mi.")),
              periapsis: cite(87.2, elements("Station keeping and D-4/D-7 experiment", "before", "Perigee, n. mi.")),
            },
            {
              time: D4D7_END,
              apoapsis: cite(174.4, elements("Station keeping and D-4/D-7 experiment", "after", "Apogee, n. mi.")),
              periapsis: cite(88.2, elements("Station keeping and D-4/D-7 experiment", "after", "Perigee, n. mi.")),
            },
            // The perigee adjustment on revolution 3, so the orbit would last two weeks.
            {
              time: PERIGEE_ADJUST,
              apoapsis: cite(174.3, elements("Perigee adjust revolution 3", "before", "Apogee, n. mi.")),
              periapsis: cite(88.2, elements("Perigee adjust revolution 3", "before", "Perigee, n. mi.")),
            },
            {
              time: PERIGEE_ADJUST_END,
              apoapsis: cite(174.3, elements("Perigee adjust revolution 3", "after", "Apogee, n. mi.")),
              periapsis: cite(119.6, elements("Perigee adjust revolution 3", "after", "Perigee, n. mi.")),
            },
            // The phase adjustment on revolution 44.
            {
              time: PHASE_ADJUST,
              apoapsis: cite(170.9, elements("Phase adjust revolution 44", "before", "Apogee, n. mi.")),
              periapsis: cite(119.5, elements("Phase adjust revolution 44", "before", "Perigee, n. mi.")),
            },
            {
              time: PHASE_ADJUST_END,
              apoapsis: cite(170.9, elements("Phase adjust revolution 44", "after", "Apogee, n. mi.")),
              periapsis: cite(126.5, elements("Phase adjust revolution 44", "after", "Perigee, n. mi.")),
            },
            // The two circularization firings, drawn as one change (see the header).
            {
              time: CIRCULARIZE,
              apoapsis: cite(168.2, elements("Circularize revolution 75/76", "before", "Apogee, n. mi.")),
              periapsis: cite(126.0, elements("Circularize revolution 75/76", "before", "Perigee, n. mi.")),
            },
            { time: CIRCULARIZE_END, ...CIRCULAR },
          ],
          // Where Gemini VII was when Gemini VI-A reached orbit (see the header).
          endRange: {
            target: "gemini-6a",
            side: "ahead",
            range: {
              ...cite(1075.6, titans(286, '"At insertion, the chase vehicle trailed its target by 1992 kilometers" (1075.6 nautical miles, our conversion)')),
              discrepancy: "NSSDCA says Gemini 6A trailed Gemini 7 by about 1,900 km at insertion. We follow On the Shoulders of Titans.",
            },
          },
        },
        {
          kind: "orbit",
          label: "With company, then alone again",
          body: "earth",
          start: INSERTION_6A,
          end: RETROFIRE,
          ...CIRCULAR,
          inclination: cite(28.89, revolution("160", "Inclination, deg")),
          sense: PROGRADE,
          period: cite(90.57, revolution("160", "Period, min"), revolution("206 (prior to retrofire)", "Period, min")),
          sizes: [
            {
              time: RETROFIRE,
              apoapsis: cite(163.6, revolution("206 (prior to retrofire)", "Apogee, n. mi."), tableA("VII", 'At retrofire, "Apogee (n.m.)" row (revolution 206)')),
              periapsis: cite(156.5, revolution("206 (prior to retrofire)", "Perigee, n. mi."), tableA("VII", 'At retrofire, "Perigee (n.m.)" row (revolution 206)')),
            },
          ],
        },
        {
          kind: "burn",
          label: "Retrofire",
          body: "earth",
          start: RETROFIRE,
          end: RETRO_SECTION_OFF,
          deltaV: cite(318.5, report('Table 5.1.8-III, "Retrograde Rocket System Performance" (page 5-65, PDF page 183), "Total ΔV, ft/sec" row, actual column')),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: RETRO_SECTION_OFF,
          end: LANDING,
          drogue: DROGUE,
          // 50,000 feet, in nautical miles (our conversion).
          drogueAltitude: cite(
            8.23,
            report('Section 7.1.2.5, "Reentry and landing" (page 7-58, PDF page 314): "the drogue was deployed at 50K feet"'),
          ),
          splashdown: SPLASHDOWN,
        },
        {
          kind: "surface",
          label: "Floating until the carrier lifts it aboard",
          body: "earth",
          start: LANDING,
          end: ABOARD,
          site: SPLASHDOWN,
        },
      ],
    },
    {
      id: "gemini-6a",
      name: "Gemini VI-A spacecraft",
      role: "target",
      phases: [
        {
          kind: "ascent",
          label: "Gemini VI-A's launch",
          body: "earth",
          start: LIFTOFF_6A,
          end: INSERTION_6A,
          site: PAD_19,
          azimuth: cite(81.4, tableA("VI-A", 'Launch azimuth row, "81.4°"')),
        },
        {
          kind: "orbit",
          label: "Gemini VI-A's first orbit",
          body: "earth",
          start: INSERTION_6A,
          end: HEIGHT_ADJUST_6A,
          apoapsis: cite(140.0, tableA("VI-A", 'At insertion, "Apogee (n.m.)" row')),
          periapsis: cite(86.9, tableA("VI-A", 'At insertion, "Perigee (n.m.)" row')),
          inclination: cite(28.97, tableA("VI-A", 'At insertion, "Inclination angle" row, "28.97°"')),
          sense: PROGRADE_6A,
        },
        { kind: "burn", label: "Gemini VI-A: height adjustment", body: "earth", start: HEIGHT_ADJUST_6A, end: HEIGHT_ADJUST_6A_END },
        {
          kind: "orbit",
          label: "Gemini VI-A: higher apogee",
          body: "earth",
          start: HEIGHT_ADJUST_6A_END,
          end: PHASE_ADJUST_6A,
          apoapsis: APOGEE_AFTER_HEIGHT_ADJUST_6A,
          periapsis: cite(86.9, titans(286, '"The perigee remained the same"'), tableA("VI-A", 'At insertion, "Perigee (n.m.)" row')),
          sense: PROGRADE_6A,
        },
        { kind: "burn", label: "Gemini VI-A: phase adjustment", body: "earth", start: PHASE_ADJUST_6A, end: PHASE_ADJUST_6A_END },
        {
          kind: "orbit",
          label: "Gemini VI-A: higher perigee",
          body: "earth",
          start: PHASE_ADJUST_6A_END,
          end: PLANE_CHANGE_6A,
          apoapsis: APOGEE_AFTER_HEIGHT_ADJUST_6A,
          periapsis: PERIGEE_AFTER_PHASE_ADJUST_6A,
          sense: PROGRADE_6A,
        },
        { kind: "burn", label: "Gemini VI-A: plane change", body: "earth", start: PLANE_CHANGE_6A, end: PLANE_CHANGE_6A_END },
        {
          kind: "orbit",
          label: "Gemini VI-A in Gemini VII's plane",
          body: "earth",
          start: PLANE_CHANGE_6A_END,
          end: COELLIPTIC_6A,
          apoapsis: APOGEE_AFTER_HEIGHT_ADJUST_6A,
          periapsis: PERIGEE_AFTER_PHASE_ADJUST_6A,
          sense: PROGRADE_6A,
        },
        { kind: "burn", label: "Gemini VI-A: coelliptic maneuver", body: "earth", start: COELLIPTIC_6A, end: COELLIPTIC_6A_END },
        {
          kind: "orbit",
          label: "Gemini VI-A below and behind Gemini VII",
          body: "earth",
          start: COELLIPTIC_6A_END,
          end: TPI_6A,
          // The coelliptic orbit: 270 by 274 km, 146 by 148 nautical miles (our conversion).
          apoapsis: cite(148, titans(287, '"The result was almost a circle, measuring 270 by 274 kilometers"')),
          periapsis: cite(146, titans(287, '"The result was almost a circle, measuring 270 by 274 kilometers"')),
          sense: PROGRADE_6A,
          endRange: {
            target: "gemini",
            range: cite(
              29,
              {
                source: "gemini-rendezvous-summary",
                locator:
                  'Table 2-IV, "Rendezvous Propellant Usage" (page 18 of the Gemini Summary Conference, PDF page 12), VI-A row, "Conditions at start of terminal phase": "Δh = 15 n. mi.", "ΔX = 25 n. mi." (29 nautical miles in a straight line, our arithmetic)',
                url: RENDEZVOUS_PAPER,
              },
            ),
          },
        },
        {
          // The whole final approach, drawn as one blend (see the header).
          kind: "burn",
          label: "Gemini VI-A closes in",
          body: "earth",
          start: TPI_6A,
          end: ARRIVAL,
        },
        {
          kind: "station",
          label: "Flying in formation",
          start: ARRIVAL,
          end: SEPARATION_6A,
          target: "gemini",
          // About 120 feet, in nautical miles (our conversion).
          range: cite(
            0.0197,
            { source: "gemini-chronology", locator: 'Part III (A), December 15, 1965: station keeping began "when the two spacecraft were about 120 feet apart"', url: CHRONOLOGY_1965 },
          ),
        },
        {
          kind: "orbit",
          label: "Gemini VI-A: apart for the night",
          body: "earth",
          start: SEPARATION_6A,
          end: RANGE_READING_6A,
          ...NIGHT_ORBIT_6A,
          sense: PROGRADE_6A,
          from: "gemini",
          // Gemini VI-A was ahead of Gemini VII overnight (see the header).
          endRange: {
            target: "gemini",
            side: "ahead",
            range: {
              ...cite(
                17.63,
                transcript("22:06:15, pilot", "Roger. 21:50, we have a range of 22.24 nautical miles; at 22:00, we have a range of 17.63 nautical miles.", 108),
                transcript("21:43:25, pilot", "Okay, he'll be aft of me. That's correct, right?", 107),
                transcript("21:43:32, capsule communicator", "That is affirm.", 107),
              ),
              discrepancy:
                "On the Shoulders of Titans (page 289) says the crews settled down 16 kilometers apart; the chronology's December 15 entry says Gemini 6A withdrew to about 30 miles, and NSSDCA to roughly 50 km. We pin the path to the radar range the crew read at 22:00.",
            },
          },
        },
        {
          kind: "orbit",
          label: "Gemini VI-A: the last orbits",
          body: "earth",
          start: RANGE_READING_6A,
          end: RETROFIRE_6A,
          ...NIGHT_ORBIT_6A,
          sense: PROGRADE_6A,
        },
        { kind: "burn", label: "Gemini VI-A: retrofire", body: "earth", start: RETROFIRE_6A, end: RETROFIRE_6A_READOUT },
        {
          kind: "coast",
          label: "Gemini VI-A falls toward the atmosphere",
          body: "earth",
          start: RETROFIRE_6A_READOUT,
          end: ENTRY_INTERFACE_6A,
          sense: cite("prograde", reentry('telemetry ("T/M") row, heading "ψ_E" 92.242 degrees (eastward)')),
          // The onboard computer's state at about 400,000 feet. The fall
          // from retrofire is the Kepler path through it, run back in time.
          endFix: {
            latitude: cite(28.822, reentry('telemetry row, "φ" 28.822 degrees (geocentric, our reading; see the header)')),
            latitudeKind: "geocentric",
            longitude: cite(-99.519, reentry('telemetry row, "θ_E" 260.481 degrees east, which is 99.519 degrees west')),
            altitude: cite(65.58, reentry('telemetry row, "r_s" 21,307,736 ft from Earth\'s center (65.58 nautical miles above the ellipsoid, our arithmetic)')),
            speed: cite(24_389.179, reentry('telemetry row, "V_E" 24389.179 fps')),
            flightPathAngle: cite(-1.422, reentry('telemetry row, "γ" -1.422 degrees')),
            heading: cite(92.242, reentry('telemetry row, "ψ_E" 92.242 degrees')),
            velocityFrame: "earth-fixed",
          },
        },
        {
          kind: "entry",
          label: "Gemini VI-A: entry and splashdown",
          start: ENTRY_INTERFACE_6A,
          end: LANDING_6A,
          drogue: DROGUE_6A,
          // 14,000 meters, in nautical miles (our conversion).
          drogueAltitude: cite(7.56, titans(291, '"deployed the drogue parachute at 14 000 meters"')),
          splashdown: SPLASHDOWN_6A,
        },
      ],
    },
  ],
};

/** A launch vehicle point from Table 4.3-I (geodetic latitude; longitude printed west). */
function ascentPoint(condition: string, secondsFromLiftoff: number, altitude: number, latitude: number, longitude: number): StateFix {
  return {
    time: { value: clockTime(secondsFromLiftoff), citations: [trajectory(condition, "Time from lift-off, sec")] },
    altitude: cite(altitude, trajectory(condition, "Altitude, n. mi.")),
    latitude: cite(latitude, trajectory(condition, "Geodetic latitude, deg North")),
    longitude: cite(longitude, trajectory(condition, `Longitude, deg West (printed ${-longitude} west)`)),
  };
}
