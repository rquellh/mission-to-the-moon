/**
 * The Gemini XII flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the crew's spacecraft ("gemini", the main ship) and the Gemini
 * Agena Target Vehicle ("agena", the target it met, docked with, and was
 * tied to by a tether).
 *
 * Sources:
 * - Gemini Program Mission Report, Gemini XII (MSC-G-R-67-1, January 1967):
 *   the sequence of events (Tables 4.2-I to 4.2-III), the insertion and
 *   landing points (Table 4.3-I), the orbits before and after each maneuver
 *   (Table 4.3-II), the maneuvers (Tables 4.3-IV and 4.3-VIII), the Agena's
 *   insertion (Table 4.3-V), and the text of sections 4.1, 4.3, 5.1, 6.3 and
 *   7.1. No NASA or Internet Archive copy was found; the citations link to
 *   the scan of the NASA report in the Virtual AGC library at ibiblio.org.
 *   Page numbers are the report's printed pages, then the scan's PDF pages.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini XII's ground elapsed time, as the report
 * prints it: zero at the spacecraft's lift-off, 20:46:33.419 G.m.t. on
 * November 11, 1966 (Table 4.2-I). The Agena was launched first, at
 * 19:07:58.688 G.m.t. (Table 4.2-III). Its times on this clock are
 * negative: the report prints them in seconds from the Agena's own
 * lift-off, and we subtract 5914.731 seconds. That number is our
 * arithmetic, 20:46:33.419 minus 19:07:58.688 = 1:38:34.731, and agrees
 * with the report's own "One hour 38 minutes 34.731 seconds after the GAATV
 * lift-off" (section 4.1).
 *
 * Other arithmetic of ours, from printed values:
 * - Times the report prints in seconds from lift-off are written as
 *   hours:minutes:seconds.
 * - Each maneuver ends at its printed start plus its printed duration
 *   (Tables 4.3-IV and 4.3-VIII, "Δt").
 * - 50,000 feet is 8.23 nautical miles (1 foot = 0.3048 m, 1 nautical mile
 *   = 1852 m).
 * - The landing point is printed in degrees and minutes; we write it in
 *   decimal degrees.
 * - The universal times sent to Horizons are lift-off plus the mission
 *   clock times of the sky samples.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The launch pads: Launch Complex 19 and Launch Complex 14 are placed
 *   where the Gemini VIII plan places them (its estimates from that
 *   flight's report; see missions/gemini-8/flight.ts). Gemini XII flew
 *   from the same two pads (section 1.0).
 * - The climb to orbit between each pad and its published insertion point,
 *   each burn (a smooth blend from one orbit to the next), the closing-in
 *   after terminal phase initiation (the four small corrections and the 13
 *   minutes of braking are not drawn one by one; the path blends from the
 *   spacecraft's own orbit into the Agena's position, arriving when the
 *   report says the crew was station keeping), and the entry (a smooth
 *   ground track to the landing point and a smooth descent to the drogue
 *   parachute height). Where retrofire happened is not printed; the engine
 *   places it so the fall reaches the landing point on time.
 * - Orbits are Kepler ellipses turned slowly by Earth's bulge (J2). Their
 *   sizes come from Table 4.3-II; between two published sizes in one phase
 *   the size changes smoothly (air drag lowered the orbits slowly). The
 *   report gives these heights over the Fischer ellipsoid; the model
 *   measures them from Earth's equatorial radius, which can draw an apogee
 *   or perigee a few nautical miles off, depending on its latitude. The
 *   plane change (8.5 ft/sec) is drawn as a burn whose orbits have the same
 *   size; the tiny tilt it made is not drawn.
 * - The docking practice (an undocking and fly-around after the first
 *   docking, a failed night docking at 4:49:44, and dockings at 5:07:14 and
 *   about 6:05, section 7.1.2.6) is not drawn: the report prints no times
 *   for the undockings. The spacecraft is drawn docked from the first
 *   docking until the tether exercise.
 * - While station keeping before docking, and while tied to the Agena by
 *   the 100-foot tether (and for the 23 minutes after the tether was let go,
 *   when the spacecraft stayed near the Agena), the spacecraft is drawn at
 *   the Agena's position; the scene draws the two a little apart. The
 *   tether itself is not drawn.
 * - The small phasing maneuver at 61:47:48 is drawn as a step in the orbit's
 *   size rather than a burn. The scan's actual duration for it shows "64"
 *   with no decimal point (perhaps 6.4, but not clear enough to cite), so
 *   the step takes the 9 seconds the ground commanded (Table 4.3-IV).
 * - The Agena keeps its last published size (just before the spacecraft's
 *   separation maneuver) to the end of the path. Its attempted engine firing
 *   after the crew's recovery (section 4.1; a velocity change of 3.3 ft/sec
 *   by Table 4.3-VIII) is not drawn.
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until the carrier lifted it aboard; its drift is not drawn.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = "https://www.ibiblio.org/apollo/Documents/Gemini12MissionReport.pdf";
const GEMINI_8_REPORT =
  "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271966-11-11%2019:07:58.688%27,%271966-11-11%2020:46:33.419%27,%271966-11-13%2015:34:59.419%27,%271966-11-15%2019:21:03.419%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

function report(locator: string): Citation {
  return { source: "gemini-12-mission-report", locator, url: MISSION_REPORT };
}

/** Table 4.2-I, sequence of events for the launch phase, "Actual" column (seconds from lift-off). */
const launchEvent = (row: string): Citation =>
  report(`Table 4.2-I, "Sequence of Events for Gemini Space Vehicle Launch Phase" (page 4-9, PDF page 85), "${row}" row, actual time`);
/** Table 4.2-II, sequence of events for the orbital and reentry phases, "Actual" column. */
const flightEvent = (row: string): Citation =>
  report(`Table 4.2-II, "Sequence of Events for Gemini Spacecraft Orbital and Reentry Phases" (page 4-10, PDF page 86), "${row}" row, actual time`);
/** Table 4.2-III, the Atlas-Agena's launch, "Actual" column (seconds from the Agena's lift-off). */
const agenaEvent = (row: string): Citation =>
  report(`Table 4.2-III, "Sequence of Events for GAATV Launch Phase" (page 4-11, PDF page 87), "${row}" row, actual time`);
/** Table 4.3-I (concluded), insertion and landing, "Actual, Final" column. */
const trajectory = (condition: string, row: string): Citation =>
  report(`Table 4.3-I, "Planned and Actual Gemini Space Vehicle and Spacecraft Trajectory Parameters" (page 4-21, PDF page 97), ${condition}, "${row}" row, actual final column`);
/** Table 4.3-II, spacecraft orbits before and after each maneuver, "Actual" columns (heights above the Fischer ellipsoid). */
const elements = (maneuver: string, when: "before" | "after", row: string, page: "4-22 (PDF page 98)" | "4-23 (PDF page 99)"): Citation =>
  report(`Table 4.3-II, "Spacecraft Orbital Elements Before and After Maneuvers" (page ${page}), ${maneuver}, ${when} maneuver, "${row}" row, actual column`);
/** Table 4.3-IV, spacecraft and Agena maneuvers, "Actual" column. */
const maneuver = (name: string, row: string, page: "4-26 (PDF page 102)" | "4-27 (PDF page 103)" | "4-31 (PDF page 107)"): Citation =>
  report(`Table 4.3-IV, "Spacecraft and GATV Maneuvers" (page ${page}), ${name}, "${row}" row, actual column`);
/** Table 4.3-V, the Agena's insertion, "Actual, Final" column. */
const agenaInsertion = (row: string, page: "4-33 (PDF page 109)" | "4-34 (PDF page 110)"): Citation =>
  report(`Table 4.3-V, "Planned and Actual TLV and GATV Trajectory Parameters" (page ${page}), insertion, "${row}" row, actual final column`);
/** Table 4.3-VIII, the Agena's maneuvers, "Actual" column. */
const agenaManeuver = (name: string, row: string): Citation =>
  report(`Table 4.3-VIII, "GATV Maneuvers" (page 4-38, PDF page 114), ${name}, "${row}" row, actual column`);
const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});

/* ------------------------------------------------------------------ */
/* Clock arithmetic.                                                   */
/* ------------------------------------------------------------------ */

/** Seconds on the mission clock as "hhh:mm:ss.sss" (negative before lift-off). */
function clockTime(seconds: number): ElapsedTime {
  const sign = seconds < 0 ? "-" : "";
  const total = Math.round(Math.abs(seconds) * 1000) / 1000;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total - hours * 3600) / 60);
  const rest = (total - hours * 3600 - minutes * 60).toFixed(3).replace(/\.?0+$/, "");
  const [whole = "0", fraction] = rest.split(".");
  const secondsText = whole.padStart(2, "0") + (fraction ? `.${fraction}` : "");
  return `${sign}${String(hours).padStart(3, "0")}:${String(minutes).padStart(2, "0")}:${secondsText}` as ElapsedTime;
}

function toSeconds(elapsed: ElapsedTime): number {
  const [h = "0", m = "0", s = "0"] = elapsed.replace("-", "").split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** A maneuver's end: its printed start plus its printed duration (our sum). */
function plus(start: ElapsedTime, seconds: number, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: clockTime(toSeconds(start) + seconds), citations: [citation, ...more] };
}

/** Degrees and minutes as printed, in decimal degrees. */
function degrees(whole: number, minutes: number): number {
  return whole + minutes / 60;
}

/**
 * How long before Gemini XII the Agena lifted off, seconds: 20:46:33.419
 * minus 19:07:58.688 G.m.t. (our subtraction; see the header).
 */
const AGENA_LEAD: Cited<number> = cite(
  5914.731,
  report('Section 4.1, "Actual Mission" (page 4-1, PDF page 75): the GAATV "lifted off at 19:07:58.688 G.m.t."; "One hour 38 minutes 34.731 seconds after the GAATV lift-off, the Gemini Space Vehicle was launched"'),
  agenaEvent("Lift-off (19:07:58.688 G.m.t.)"),
  launchEvent("Lift-off (pad disconnect separation) (20:46:33.419 G.m.t.)"),
);

/** A time the report prints in seconds from the Agena's lift-off, on Gemini XII's clock. */
function agenaClock(secondsFromAgenaLiftoff: number, citation: Citation): Cited<ElapsedTime> {
  return { value: clockTime(secondsFromAgenaLiftoff - AGENA_LEAD.value), citations: [citation, ...AGENA_LEAD.citations] };
}

/* ------------------------------------------------------------------ */
/* Times on the mission clock.                                         */
/* ------------------------------------------------------------------ */

const LIFTOFF = at("000:00:00", launchEvent("Lift-off (pad disconnect separation) (20:46:33.419 G.m.t.)"));
/** After the insertion firing (the Insertion Velocity Adjust Routine), 439.8 seconds after lift-off. */
const INSERTION = at("000:07:19.8", trajectory("spacecraft insertion", "Time from lift-off, sec (439.8)"));
const PHASE_ADJUST = at("000:49:40", flightEvent("Phase adjust maneuver"));
const PHASE_ADJUST_END = plus("000:49:40", 88.6, maneuver("phase adjust", "Δt, sec (88.6)", "4-26 (PDF page 102)"));
const PLANE_CHANGE = at("001:14:22", flightEvent("Plane change maneuver"));
const PLANE_CHANGE_END = plus("001:14:22", 36.0, maneuver("plane change", "Δt, sec (36.0)", "4-26 (PDF page 102)"));
const CORRECTIVE = at("001:47:52", flightEvent("Corrective combination maneuver"));
const CORRECTIVE_END = plus("001:47:52", 17.0, maneuver("corrective combination", "Δt, sec (17.0)", "4-26 (PDF page 102)"));
const COELLIPTIC = at("002:22:55", flightEvent("Coelliptic maneuver"));
const COELLIPTIC_END = plus("002:22:55", 60.0, maneuver("coelliptic", "Δt, sec (60.0)", "4-27 (PDF page 103)"));
const TPI = at("003:05:47", flightEvent("Terminal phase initiate maneuver"));
const TPI_END = plus("003:05:47", 29.0, maneuver("terminal phase initiate", "Δt, sec (29.0)", "4-27 (PDF page 103)"));
/** Given to the minute; seconds written as 00. */
const STATION_KEEPING: Cited<ElapsedTime> = {
  ...at(
    "003:46:00",
    report('Section 4.3.1.2, "Orbit" (page 4-17, PDF page 93): "At 3 hours 46 minutes g.e.t., the spacecraft was less than 50 feet from the GATV and station keeping had been initiated." (given to the minute; seconds written as 00)'),
  ),
  discrepancy: "Section 4.1 (page 4-1) says the crew reported station keeping at 3 hours 45 minutes. We follow section 4.3.1.2 and the mission summary (section 1.0, page 1-2), 3 hours 46 minutes.",
};
const DOCKING = at(
  "004:13:52",
  report('Section 4.1, "Actual Mission" (page 4-1, PDF page 75): "The initial docking occurred at 4:13:52 g.e.t, over the Coastal Sentry Quebec."'),
  report('Section 7.1.2.6, "GATV operations" (page 7-26, PDF page 411): "The initial docking occurred at 4:13:52 g.e.t."'),
);
const ECLIPSE_1 = at("007:05:06", agenaManeuver("eclipse phasing no. 1 (SPS)", "Initiate time, g.e.t."), flightEvent("Eclipse phasing maneuver no. 1 (GATV SPS) (docked)"));
const ECLIPSE_1_END = plus("007:05:06", 51, agenaManeuver("eclipse phasing no. 1 (SPS)", "Δt, sec (51)"));
const ECLIPSE_2 = at("015:16:18", agenaManeuver("eclipse phasing no. 2 (SPS)", "Initiate time, g.e.t."), flightEvent("Eclipse phasing maneuver no. 2 (GATV SPS) (docked)"));
const ECLIPSE_2_END = plus("015:16:18", 18, agenaManeuver("eclipse phasing no. 2 (SPS)", "Δt, sec (18)"));
/** The third undocking, which began the tether exercise; given to the minute. */
const TETHER_START = at(
  "047:23:00",
  report('Section 4.1, "Actual Mission" (page 4-3, PDF page 77): "The tether evaluation was initiated at 47 hours 23 minutes g.e.t., with the third undocking and subsequent deployment of the tether." (given to the minute; seconds written as 00)'),
);
const SEPARATION = at("052:14:27", flightEvent("Separation maneuver"));
const SEPARATION_END = plus("052:14:27", 8.7, maneuver("separation", "Δt, sec (8.7)", "4-31 (PDF page 107)"));
const PHASING = at("061:47:48", flightEvent("Phasing maneuver"));
const PHASING_END = plus(
  "061:47:48",
  9,
  maneuver("phasing", 'Δt, sec: the ground-commanded column prints 9; the actual cell shows "64" with no decimal point visible in the scan (possibly 6.4, but not clear enough to cite), so the 9 seconds is used here (an illustration)', "4-31 (PDF page 107)"),
);
const RETROFIRE = at("093:59:58", flightEvent("Retrofire initiation"));
const RETROFIRE_END: Cited<ElapsedTime> = {
  ...at(
    "094:00:17.2",
    report('Section 5.1.8.2, "Reentry Control System" (page 5-80, PDF page 258), table of propellant remaining: "End retrofire" at 94:00:17.2'),
  ),
  discrepancy: "The same table gives the beginning of retrofire as 93:59:57.7. We start retrofire at Table 4.2-II's 93:59:58.",
};
const ENTRY_INTERFACE = at(
  "094:20:12",
  report('Section 5.1.5.2.3, "Reentry phase" (page 5-14, PDF page 156): "At 94:20:12 g.e.t., the computer commanded a zero-degree bank angle. This indicated proper spacecraft navigation to the 400K-foot level"'),
  report('Section 6.1.4, "Retrofire and Reentry" (page 6-16, PDF page 353): "The onboard computer indication of 400K feet occurred at 20 minutes 14 seconds after retrofire"'),
);
const LANDING: Cited<ElapsedTime> = {
  ...at("094:34:30", flightEvent("Landing")),
  discrepancy: "NASA's Gemini XII page gives the duration as 94 hours 34 minutes 31 seconds. We follow Table 4.2-II.",
};
/** The end of the path: the carrier lifted the spacecraft aboard. Given to the minute. */
const SPACECRAFT_ABOARD = at(
  "095:41:00",
  report('Section 6.3.2, "Location and Retrieval" (page 6-28, PDF page 365), recovery events table, row 20:28 G.m.t. / 95:41 g.e.t.: "Spacecraft aboard U.S.S. Wasp, secured in dolly" (given to the minute; seconds written as 00)'),
);

/* The Agena's own times (seconds from its lift-off), moved onto Gemini XII's clock. */
const AGENA_LIFTOFF: Cited<ElapsedTime> = { value: "-001:38:34.731", citations: AGENA_LEAD.citations };
const AGENA_INSERTION = agenaClock(556.05, agenaInsertion("Time from lift-off, sec (556.05)", "4-33 (PDF page 109)"));

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/*
 * The two pads, as the Gemini VIII plan places them, with that plan's
 * citations: neither report prints where the pads are, so each is that
 * plan's estimate from the Gemini VIII report's first-stage cutoff points,
 * ranges from the launch site, and flight azimuths (see
 * missions/gemini-8/flight.ts).
 */
const PAD_19_ESTIMATE: [Citation, ...Citation[]] = [
  report('Section 1.0, "Mission Summary" (page 1-1, PDF page 35): the Gemini Space Vehicle "was launched from Complex 19, Cape Kennedy, Florida"'),
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

const PAD_14_ESTIMATE: [Citation, ...Citation[]] = [
  report('Section 1.0, "Mission Summary" (page 1-1, PDF page 35): the Gemini Atlas-Agena Target Vehicle "was launched from Complex 14, Cape Kennedy, Florida"'),
  {
    source: "gemini-8-mission-report",
    locator:
      'Section 1.0 (page 1-1): the target vehicle "was launched from Complex 14"; our estimate of where Complex 14 is, not a printed value: the point from which a great circle at the flight azimuth reaches the BECO point after the BECO range',
    url: GEMINI_8_REPORT,
  },
  {
    source: "gemini-8-mission-report",
    locator:
      'Table 4.3-V, "Comparison of Planned and Actual GAATV Trajectory Parameters" (pages 4-30 and 4-31), BECO, "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.55 N, 79.74 W, 43.3)" row, actual column',
    url: GEMINI_8_REPORT,
  },
  {
    source: "gemini-8-mission-report",
    locator: 'Section 4.1 (page 4-1): "the vehicle was rolled from a pad azimuth of 105 degrees to a flight azimuth of 84.36 degrees"',
    url: GEMINI_8_REPORT,
  },
];
const PAD_14 = {
  latitude: cite(28.48, ...PAD_14_ESTIMATE),
  longitude: cite(-80.56, ...PAD_14_ESTIMATE),
};

/** Where the spacecraft came down, and floated until the carrier lifted it aboard. */
const SPLASHDOWN = {
  latitude: {
    ...cite(degrees(24, 35), trajectory("landing point", "Latitude, north (printed 24 deg 35 min; best estimated trajectory from radar tracking data)")),
    discrepancy:
      "Section 6.3.2 (page 6-27, PDF page 364) gives the landing point from LORAN fixes as 24 degrees 36.4 minutes north, 69 degrees 56.2 minutes west, and Table 4.3-I's preliminary column, from the recovery ship, 24 degrees 37 minutes north, 69 degrees 56 minutes west. NASA's Gemini XII page gives 24.58 N, 69.95 W, which matches the final column. We follow Table 4.3-I's final column. The report does not say whether this latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(-degrees(69, 57), trajectory("landing point", "Longitude, west (printed 69 deg 57 min)")),
};

const PROGRADE_GEMINI: Cited<"prograde"> = cite("prograde", trajectory("spacecraft insertion", "Space-fixed heading angle, deg east of north (104.31)"));
const PROGRADE_AGENA: Cited<"prograde"> = cite("prograde", agenaInsertion("Space-fixed heading angle, deg east of North (95.54)", "4-34 (PDF page 110)"));

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: "gemini-12",

  // Four samples: the Agena's lift-off, Gemini XII's lift-off, the opening
  // of the hatch for the umbilical spacewalk, and landing.
  sky: [
    {
      time: AGENA_LIFTOFF,
      moonEclipticLongitude: cite(218.0784549, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-11-11 19:07:58.688")),
      subLunarLongitude: cite(238.488292, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-11-11 19:07:58.688")),
      sunEclipticLongitude: cite(228.9454877, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-11-11 19:07:58.688")),
    },
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(219.0771486, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-11-11 20:46:33.419")),
      subLunarLongitude: cite(214.719654, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-11-11 20:46:33.419")),
      sunEclipticLongitude: cite(229.0143665, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-11-11 20:46:33.419")),
    },
    {
      time: at("042:48:26", report('Section 4.1, "Actual Mission" (page 4-2, PDF page 76): "The hatch was opened at 42:48:26 g.e.t."')),
      moonEclipticLongitude: cite(244.7152018, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-11-13 15:34:59.419")),
      subLunarLongitude: cite(316.376251, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-11-13 15:34:59.419")),
      sunEclipticLongitude: cite(230.8097822, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-11-13 15:34:59.419")),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(274.3116688, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-11-15 19:21:03.419")),
      subLunarLongitude: cite(290.152657, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-11-15 19:21:03.419")),
      sunEclipticLongitude: cite(232.9829187, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-11-15 19:21:03.419")),
    },
  ],

  ships: [
    {
      id: "gemini",
      name: "Gemini XII spacecraft",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
          azimuth: cite(
            100.6,
            launchEvent("Roll program start (launch azimuth = 100.6 deg)"),
            report('Section 4.3.1.1, "Launch" (page 4-13, PDF page 89): "launched on a rendezvous launch azimuth of 100.6 degrees"'),
          ),
        },
        {
          kind: "orbit",
          label: "First orbit",
          body: "earth",
          start: INSERTION,
          end: PHASE_ADJUST,
          apoapsis: cite(146.1, elements("phase adjust", "before", "Apogee, n. mi.", "4-22 (PDF page 98)")),
          periapsis: cite(86.8, elements("phase adjust", "before", "Perigee, n. mi.", "4-22 (PDF page 98)")),
          inclination: cite(28.87, elements("phase adjust", "before", "Inclination, deg", "4-22 (PDF page 98)")),
          sense: PROGRADE_GEMINI,
          startFix: {
            latitude: cite(25.5, trajectory("spacecraft insertion", "Geodetic latitude, deg north")),
            longitude: cite(-65.09, trajectory("spacecraft insertion", "Longitude, deg west (printed 65.09 west)")),
            altitude: cite(86.5, trajectory("spacecraft insertion", "Altitude, n. mi.")),
            speed: cite(25_742, trajectory("spacecraft insertion", "Space-fixed velocity, ft/sec")),
            flightPathAngle: cite(0.07, trajectory("spacecraft insertion", "Space-fixed flight-path angle, deg")),
            heading: cite(104.31, trajectory("spacecraft insertion", "Space-fixed heading angle, deg east of north")),
          },
        },
        {
          kind: "burn",
          label: "Phase adjustment",
          body: "earth",
          start: PHASE_ADJUST,
          end: PHASE_ADJUST_END,
          deltaV: cite(66.7, maneuver("phase adjust", "ΔV, ft/sec", "4-26 (PDF page 102)")),
        },
        {
          kind: "orbit",
          label: "Higher perigee",
          body: "earth",
          start: PHASE_ADJUST_END,
          end: PLANE_CHANGE,
          apoapsis: cite(145.9, elements("phase adjust", "after", "Apogee, n. mi.", "4-22 (PDF page 98)")),
          periapsis: cite(123.4, elements("phase adjust", "after", "Perigee, n. mi.", "4-22 (PDF page 98)")),
          inclination: cite(28.9, elements("phase adjust", "after", "Inclination, deg", "4-22 (PDF page 98)")),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "burn",
          label: "Plane change",
          body: "earth",
          start: PLANE_CHANGE,
          end: PLANE_CHANGE_END,
          deltaV: cite(8.5, maneuver("plane change", "ΔV, ft/sec", "4-26 (PDF page 102)")),
        },
        {
          kind: "orbit",
          label: "In the Agena's plane",
          body: "earth",
          start: PLANE_CHANGE_END,
          end: CORRECTIVE,
          apoapsis: cite(145.9, elements("plane change", "after", "Apogee, n. mi.", "4-22 (PDF page 98)")),
          periapsis: cite(123.4, elements("plane change", "after", "Perigee, n. mi.", "4-22 (PDF page 98)")),
          inclination: cite(28.88, elements("plane change", "after", "Inclination, deg", "4-22 (PDF page 98)")),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "burn",
          label: "Corrective combination maneuver",
          body: "earth",
          start: CORRECTIVE,
          end: CORRECTIVE_END,
          deltaV: cite(8.42, maneuver("corrective combination", "ΔV, ft/sec", "4-26 (PDF page 102)")),
        },
        {
          kind: "orbit",
          label: "Before the coelliptic maneuver",
          body: "earth",
          start: CORRECTIVE_END,
          end: COELLIPTIC,
          apoapsis: cite(151.7, elements("corrective combination", "after", "Apogee, n. mi.", "4-22 (PDF page 98)")),
          periapsis: cite(124.2, elements("corrective combination", "after", "Perigee, n. mi.", "4-22 (PDF page 98)")),
          inclination: cite(28.89, elements("corrective combination", "after", "Inclination, deg", "4-22 (PDF page 98)")),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "burn",
          label: "Coelliptic maneuver",
          body: "earth",
          start: COELLIPTIC,
          end: COELLIPTIC_END,
          deltaV: cite(49.9, maneuver("coelliptic", "ΔV, ft/sec", "4-27 (PDF page 103)")),
        },
        {
          kind: "orbit",
          label: "Coelliptic orbit, below the Agena",
          body: "earth",
          start: COELLIPTIC_END,
          end: TPI,
          apoapsis: cite(151.7, elements("coelliptic (NSR)", "after", "Apogee, n. mi.", "4-22 (PDF page 98)")),
          periapsis: cite(146.8, elements("coelliptic (NSR)", "after", "Perigee, n. mi.", "4-22 (PDF page 98)")),
          inclination: cite(28.88, elements("coelliptic (NSR)", "after", "Inclination, deg", "4-22 (PDF page 98)")),
          sense: PROGRADE_GEMINI,
          // Where the chase stood when the final approach began.
          endRange: {
            target: "agena",
            range: cite(
              22.1,
              report('Section 4.3.1.2, "Orbit" (page 4-16, PDF page 92): "The TPI maneuver was initiated at 3:05:47 g.e.t, when the elevation angle to the GATV was approximately 27.0 degrees, and the range was about 22.1 nautical miles."'),
            ),
          },
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "earth",
          start: TPI,
          end: TPI_END,
          deltaV: cite(21.8, maneuver("terminal phase initiate", "ΔV, ft/sec", "4-27 (PDF page 103)")),
        },
        {
          kind: "rendezvous",
          label: "Closing in on the Agena",
          body: "earth",
          start: TPI_END,
          end: STATION_KEEPING,
          target: "agena",
          apoapsis: cite(162.4, elements("terminal phase initiate (TPI)", "after", "Apogee, n. mi.", "4-22 (PDF page 98)")),
          periapsis: cite(151.7, elements("terminal phase initiate (TPI)", "after", "Perigee, n. mi.", "4-22 (PDF page 98)")),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "station",
          label: "Beside the Agena",
          start: STATION_KEEPING,
          end: DOCKING,
          target: "agena",
        },
        {
          kind: "docked",
          label: "Docked with the Agena",
          start: DOCKING,
          end: TETHER_START,
          target: "agena",
        },
        {
          kind: "station",
          label: "Tied to the Agena by a tether",
          start: TETHER_START,
          end: SEPARATION,
          target: "agena",
        },
        {
          kind: "burn",
          label: "Separation from the Agena",
          body: "earth",
          start: SEPARATION,
          end: SEPARATION_END,
          deltaV: cite(7.1, maneuver("separation", "ΔV, ft/sec", "4-31 (PDF page 107)")),
        },
        {
          kind: "orbit",
          label: "On its own",
          body: "earth",
          start: SEPARATION_END,
          end: RETROFIRE,
          apoapsis: cite(160.0, elements("separation", "after", "Apogee, n. mi.", "4-23 (PDF page 99)")),
          periapsis: cite(140.3, elements("separation", "after", "Perigee, n. mi.", "4-23 (PDF page 99)")),
          inclination: cite(28.88, elements("separation", "after", "Inclination, deg", "4-23 (PDF page 99)")),
          sense: PROGRADE_GEMINI,
          sizes: [
            // The phasing maneuver, a small step: the size before it when it
            // began, the size after it when it ended.
            {
              time: PHASING,
              apoapsis: cite(159.5, elements("phasing", "before", "Apogee, n. mi.", "4-23 (PDF page 99)")),
              periapsis: cite(140.3, elements("phasing", "before", "Perigee, n. mi.", "4-23 (PDF page 99)")),
            },
            {
              time: PHASING_END,
              apoapsis: cite(156.0, elements("phasing", "after", "Apogee, n. mi.", "4-23 (PDF page 99)")),
              periapsis: cite(140.8, elements("phasing", "after", "Perigee, n. mi.", "4-23 (PDF page 99)")),
            },
          ],
        },
        {
          kind: "burn",
          label: "Retrofire",
          body: "earth",
          start: RETROFIRE,
          end: RETROFIRE_END,
          deltaV: cite(
            321.5,
            report('Section 5.1.8.3, "Retrograde rocket system" (page 5-80, PDF page 258): the predicted velocity change "was 322.4 ft/sec. This compares well with the IGS measured value of 321.5 ft/sec."'),
          ),
        },
        {
          kind: "coast",
          label: "Falling toward the atmosphere",
          body: "earth",
          start: RETROFIRE_END,
          end: ENTRY_INTERFACE,
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: {
            ...at("094:29:10", flightEvent("Drogue deployment")),
            discrepancy: "Section 5.1.8.2's propellant table (page 5-80, PDF page 258) gives drogue deployment as 94:29:09.6. We follow the sequence of events, Table 4.2-II.",
          },
          // 50,000 feet, in nautical miles (our conversion).
          drogueAltitude: cite(
            8.23,
            report('Section 7.1.1.6, "Retrofire and reentry" (page 7-7, PDF page 392): "at the 50K-foot altitude the drogue was deployed"'),
          ),
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
    {
      id: "agena",
      name: "Gemini Agena Target Vehicle",
      role: "target",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: AGENA_LIFTOFF,
          end: AGENA_INSERTION,
          site: PAD_14,
        },
        {
          kind: "orbit",
          label: "Waiting for Gemini XII, then docked",
          body: "earth",
          start: AGENA_INSERTION,
          end: ECLIPSE_1,
          apoapsis: cite(
            162.7,
            report('Section 4.3.2.1, "Launch" (page 4-18, PDF page 94): "The GATV achieved a nearly circular orbit with a perigee of 156.4 nautical miles and an apogee of 162.7 nautical miles."'),
            elements("terminal phase finalize (TPF)", "after", "Apogee, n. mi. (the spacecraft beside the Agena)", "4-22 (PDF page 98)"),
          ),
          periapsis: cite(
            156.4,
            report('Section 4.3.2.1, "Launch" (page 4-18, PDF page 94): "a perigee of 156.4 nautical miles"'),
            elements("terminal phase finalize (TPF)", "after", "Perigee, n. mi. (the spacecraft beside the Agena)", "4-22 (PDF page 98)"),
          ),
          sense: PROGRADE_AGENA,
          startFix: {
            latitude: cite(28.52, agenaInsertion("Geodetic latitude, deg North", "4-33 (PDF page 109)")),
            longitude: cite(-59.63, agenaInsertion("Longitude, deg West (printed 59.63 west)", "4-33 (PDF page 109)")),
            altitude: cite(161.5, agenaInsertion("Altitude, n. mi.", "4-34 (PDF page 110)")),
            speed: cite(25_365, agenaInsertion("Space-fixed velocity, ft/sec", "4-34 (PDF page 110)")),
            flightPathAngle: cite(0.04, agenaInsertion("Space-fixed flight-path angle, deg", "4-34 (PDF page 110)")),
            heading: cite(95.54, agenaInsertion("Space-fixed heading angle, deg east of North", "4-34 (PDF page 110)")),
          },
          sizes: [
            // The docked pair's orbit just before the first eclipse phasing
            // firing (air drag had lowered it a little).
            {
              time: ECLIPSE_1,
              apoapsis: cite(161.4, elements("eclipse phasing no. 1 (SPS) (docked)", "before", "Apogee, n. mi.", "4-22 (PDF page 98)")),
              periapsis: cite(153.0, elements("eclipse phasing no. 1 (SPS) (docked)", "before", "Perigee, n. mi.", "4-22 (PDF page 98)")),
            },
          ],
        },
        {
          kind: "burn",
          label: "First eclipse phasing firing (docked)",
          body: "earth",
          start: ECLIPSE_1,
          end: ECLIPSE_1_END,
          deltaV: cite(43.8, agenaManeuver("eclipse phasing no. 1 (SPS)", "ΔV, ft/sec")),
        },
        {
          kind: "orbit",
          label: "Docked, lower orbit",
          body: "earth",
          start: ECLIPSE_1_END,
          end: ECLIPSE_2,
          apoapsis: cite(151.5, elements("eclipse phasing no. 1 (SPS) (docked)", "after", "Apogee, n. mi.", "4-22 (PDF page 98)")),
          periapsis: cite(136.8, elements("eclipse phasing no. 1 (SPS) (docked)", "after", "Perigee, n. mi.", "4-22 (PDF page 98)")),
          inclination: cite(28.88, elements("eclipse phasing no. 1 (SPS) (docked)", "after", "Inclination, deg", "4-22 (PDF page 98)")),
          sense: PROGRADE_AGENA,
          sizes: [
            {
              time: ECLIPSE_2,
              apoapsis: cite(151.3, elements("eclipse phasing no. 2 (SPS) (docked)", "before", "Apogee, n. mi.", "4-23 (PDF page 99)")),
              periapsis: cite(136.5, elements("eclipse phasing no. 2 (SPS) (docked)", "before", "Perigee, n. mi.", "4-23 (PDF page 99)")),
            },
          ],
        },
        {
          kind: "burn",
          label: "Second eclipse phasing firing (docked)",
          body: "earth",
          start: ECLIPSE_2,
          end: ECLIPSE_2_END,
          deltaV: cite(16.7, agenaManeuver("eclipse phasing no. 2 (SPS)", "ΔV, ft/sec")),
        },
        {
          kind: "orbit",
          label: "Docked, then tethered, then left in orbit",
          body: "earth",
          start: ECLIPSE_2_END,
          end: SPACECRAFT_ABOARD,
          apoapsis: cite(160.3, elements("eclipse phasing no. 2 (SPS) (docked)", "after", "Apogee, n. mi.", "4-23 (PDF page 99)")),
          periapsis: cite(136.6, elements("eclipse phasing no. 2 (SPS) (docked)", "after", "Perigee, n. mi.", "4-23 (PDF page 99)")),
          inclination: cite(28.88, elements("eclipse phasing no. 2 (SPS) (docked)", "after", "Inclination, deg", "4-23 (PDF page 99)")),
          sense: PROGRADE_AGENA,
          sizes: [
            // The spacecraft's orbit just before its separation maneuver, when
            // it was still beside the Agena: the Agena's orbit then.
            {
              time: SEPARATION,
              apoapsis: cite(159.3, elements("separation", "before", "Apogee, n. mi. (the spacecraft beside the Agena)", "4-23 (PDF page 99)")),
              periapsis: cite(137.3, elements("separation", "before", "Perigee, n. mi. (the spacecraft beside the Agena)", "4-23 (PDF page 99)")),
            },
          ],
        },
      ],
    },
  ],
};
