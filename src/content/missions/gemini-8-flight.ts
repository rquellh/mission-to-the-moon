/**
 * The Gemini VIII flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the crew's spacecraft ("gemini", the main ship) and the Gemini
 * Agena Target Vehicle ("agena", the target it met and docked with).
 *
 * Sources:
 * - Gemini Program Mission Report, Gemini VIII (MSC-G-R-66-4, April 1966):
 *   the sequence of events (Tables 4.2-I and 4.2-II), launch and insertion
 *   conditions (Tables 4.3-I and 4.3-V), the orbits before and after each
 *   maneuver (Tables 4.3-II, 4.3-IV and 4.3-IX), the rendezvous maneuvers
 *   (Table 4.3-III), retrofire (Table 5.1.8-V), the reentry state at
 *   400,000 feet (Table 5.1.5-VIII), the landing point (Table 4.3-I), and
 *   the recovery (Section 6.3.2). NASA's copy at nasa.gov now answers "not
 *   found"; the citations link to the Internet Archive's copy of that NASA
 *   file, which is byte for byte the copy the source registry points to.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini VIII's ground elapsed time, as the report
 * prints it: zero at the spacecraft's lift-off, 16:41:02.389 G.m.t. on
 * March 16, 1966 (Table 4.2-I prints lift-off at 0.00 g.e.t.). The Agena
 * was launched first, at 15:00:03.127 G.m.t. Its times on this clock are
 * negative: the report prints them in seconds from the Agena's own
 * lift-off, and we subtract 6059.262 seconds. That number is our
 * arithmetic, 16:41:02.389 minus 15:00:03.127 = 1:40:59.262, and agrees
 * with the report's own "One hour 40 minutes 59.262 seconds after GAATV
 * lift-off" (page 4-1).
 *
 * Other arithmetic of ours, from printed values:
 * - Times the report prints in seconds from lift-off are written as
 *   hours:minutes:seconds.
 * - Each maneuver ends at its printed start plus its printed burn time
 *   (Table 4.3-III, "Delta t_B"). Retrofire ends when the last of the four
 *   retrorockets burned out: its ignition plus its web burn time (Table
 *   5.1.8-V).
 * - 400,000 feet is 65.83 nautical miles, and 50,000 feet is 8.23
 *   (1 foot = 0.3048 m, 1 nautical mile = 1852 m).
 * - The landing point is printed in degrees and minutes; we write it in
 *   decimal degrees.
 * - The launch pads: the report does not print where they are, and we found
 *   no NASA or Smithsonian page that does, so each is our estimate from the
 *   report's first-stage cutoff point, its range from the launch site, and
 *   the flight azimuth (see "Launch pads" below). Good to about 2 km.
 *
 * Readings of ours (the report does not say):
 * - The reentry state at 400,000 feet (Table 5.1.5-VIII) comes from the
 *   onboard computer. We read its latitude as geocentric: in the same
 *   table, at guidance termination the computer prints latitude 25.08 with
 *   1.39 nautical miles to go to the target, which was at 25 degrees 15
 *   minutes north (page 6-27); only a geocentric 25.08 (25.23 on a map)
 *   fits that, and Figure 5.1.5-16 plots that point at about 25.23. We read
 *   its velocity, flight-path angle, and heading as measured against the
 *   turning Earth: so read, the path through that state peaks at 298 km,
 *   the height of the orbit retrofire was made from; read as space-fixed,
 *   it would peak 167 km lower, below that orbit.
 * - Maneuver times in Table 4.3-III are taken as the start of each burn.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The climb to orbit between the launch pad and the published points,
 *   each burn (a smooth blend from one orbit to the next), the closing-in
 *   after terminal phase initiation (the crew's two corrections and the
 *   braking are not drawn one by one; the path blends from the spacecraft's
 *   own orbit into the Agena's position, arriving when the report says the
 *   crew was keeping station 150 feet away), and the entry (a smooth ground
 *   track to the landing point and a smooth descent to the drogue parachute
 *   height).
 * - Orbits are Kepler ellipses turned slowly by Earth's bulge (J2); air drag
 *   is left out. Each orbit's plane comes from the published heading at
 *   insertion; the 26.6 ft/sec plane change (about 0.06 degrees) is not
 *   drawn as such.
 * - The report gives its final orbit heights above the Fischer ellipsoid;
 *   the model measures them from Earth's equatorial radius, which can draw
 *   an apogee or perigee up to about 2.7 nautical miles (5 km) higher than
 *   published, depending on its latitude.
 * - Small corrections keep the drawn path on its published points: the
 *   coelliptic orbit ends 29 nautical miles behind the Agena at terminal
 *   phase initiation (a 0.1 percent correction to its rate), and the orbit
 *   after undocking ends where the fall to 400,000 feet begins (0.3
 *   percent). The second one draws the spacecraft drifting about 100
 *   nautical miles ahead of the Agena by retrofire; how far apart the two
 *   really were then is not published.
 * - While station keeping, the spacecraft is drawn at the Agena's position
 *   (150 feet apart). While docked, the pair follows the Agena's orbit; the
 *   tumble changed their attitude, not their orbit, and attitude is not
 *   part of the path.
 * - After the crew left, the Agena kept its insertion orbit until the end
 *   of this flight; it was maneuvered from the ground only later (its first
 *   maneuver was 21:42:47 after its own lift-off, Table 4.2-II).
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until the crew boarded the recovery ship; its drift is not drawn.
 */
import type { Citation, Cited, ElapsedTime } from "../types";
import type { FlightPlan, StateFix } from "../../sim/types";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT =
  "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271966-03-16%2015:00:03.127%27,%271966-03-16%2016:41:02.389%27,%271966-03-17%2003:22:28.389%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

function report(locator: string): Citation {
  return { source: "gemini-8-mission-report", locator, url: MISSION_REPORT };
}

/** Table 4.2-I, sequence of events for the Gemini space vehicle, "Actual time" column. */
const geminiEvents = (row: string): Citation =>
  report(`Table 4.2-I, "Sequence of Events - Gemini Space Vehicle" (pages 4-10 and 4-11), "${row}" row, actual time`);
/** Table 4.2-II, sequence of events for the Agena and its Atlas, "Actual time from lift-off" column. */
const agenaEvents = (row: string): Citation =>
  report(`Table 4.2-II, "Gemini Atlas-Agena Target Vehicle Sequence of Events" (pages 4-12 and 4-13), "${row}" row, actual time`);
/** Table 4.3-I, Gemini launch conditions, "Final" column. */
const geminiLaunch = (condition: string, row: string): Citation =>
  report(`Table 4.3-I, "Comparison of Planned and Actual Gemini Space Vehicle Trajectory Parameters" (pages 4-22 and 4-23), ${condition}, "${row}" row, actual final column`);
/** Table 4.3-II, Gemini orbits around each maneuver, "Final" column (heights above the Fischer ellipsoid). */
const geminiOrbit = (maneuver: string, when: "before" | "after", row: string): Citation =>
  report(`Table 4.3-II, "Comparison of Spacecraft Orbital Elements Before and After Maneuvers" (pages 4-24 and 4-25), ${maneuver}, ${when} maneuver, "${row}" row, actual final column`);
/** Table 4.3-III, rendezvous maneuvers, "Actual" column. */
const maneuver = (name: string, row: string): Citation =>
  report(`Table 4.3-III, "Spacecraft Rendezvous Maneuvers" (pages 4-26 to 4-28), ${name}, "${row}" row, actual column`);
/** Table 4.3-IV, Gemini orbits by revolution, "Final" column. */
const geminiRevolution = (revolution: string, row: string): Citation =>
  report(`Table 4.3-IV, "Comparison of Spacecraft Orbital Elements" (page 4-29), revolution ${revolution}, "${row}" row, actual final column`);
/** Table 4.3-V, Agena launch conditions ("Actual" column; "Final" for insertion). */
const agenaLaunch = (condition: string, row: string): Citation =>
  report(`Table 4.3-V, "Comparison of Planned and Actual GAATV Trajectory Parameters" (pages 4-30 and 4-31), ${condition}, "${row}" row, ${condition === "Insertion" ? "actual final" : "actual"} column`);
/** Table 4.3-IX, Agena orbits by revolution, "Final" column. */
const agenaRevolution = (revolution: string, row: string): Citation =>
  report(`Table 4.3-IX, "Comparison of GATV Orbital Elements" (page 4-38), revolution ${revolution}, "${row}" row, actual final column`);
/** Table 5.1.5-VII, translation maneuvers measured by the onboard guidance. */
const translation = (row: string, column: string): Citation =>
  report(`Table 5.1.5-VII, "Translation Maneuvers" (page 5-39), "${row}" row, "${column}" column`);
/** Table 5.1.5-VIII, reentry state from the onboard computer, 400K ft, telemetry column. */
const reentryState = (row: string): Citation =>
  report(`Table 5.1.5-VIII, "Comparison of Computer Telemetry Reentry Parameters With Postflight Reconstruction" (page 5-40), 400K ft, "${row}" row, telemetry column`);
/** Table 5.1.8-V, retrograde rocket system. */
const retrorockets = (row: string): Citation =>
  report(`Table 5.1.8-V, "Retrograde Rocket System" (page 5-97), ${row}`);
const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});

/* ------------------------------------------------------------------ */
/* The Agena's clock.                                                  */
/* ------------------------------------------------------------------ */

/**
 * How long before Gemini VIII the Agena lifted off, seconds: 16:41:02.389
 * minus 15:00:03.127 G.m.t. (our subtraction; see the header).
 */
const AGENA_LEAD: Cited<number> = cite(
  6059.262,
  report('Section 4.1 (page 4-1): the Agena lifted off at "15:00:03.127 Greenwich mean time"; "One hour 40 minutes 59.262 seconds after GAATV lift-off, the GLV was launched with lift-off at 16:41:02.389 G.m.t."'),
  agenaEvents("Lift-off"),
  geminiEvents("Lift-off (pad disconnect separation)"),
);

/** A time the report prints in seconds from the Agena's lift-off, on Gemini VIII's clock. */
function agenaClock(secondsFromAgenaLiftoff: number, citation: Citation): Cited<ElapsedTime> {
  return {
    value: clockTime(secondsFromAgenaLiftoff - AGENA_LEAD.value),
    citations: [citation, ...AGENA_LEAD.citations],
  };
}

/** A time the report prints in seconds from Gemini VIII's lift-off. */
function geminiClock(seconds: number, citation: Citation): Cited<ElapsedTime> {
  return { value: clockTime(seconds), citations: [citation] };
}

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

/** A maneuver's end: its printed start plus its printed burn time (our sum). */
function burnEnd(start: ElapsedTime, burnSeconds: number, citation: Citation): Cited<ElapsedTime> {
  const [h = "0", m = "0", s = "0"] = start.split(":");
  return { value: clockTime(Number(h) * 3600 + Number(m) * 60 + Number(s) + burnSeconds), citations: [citation] };
}

/** Degrees and minutes as printed, in decimal degrees. */
function degrees(whole: number, minutes: number): number {
  return whole + minutes / 60;
}

/* ------------------------------------------------------------------ */
/* Shared values.                                                      */
/* ------------------------------------------------------------------ */

const PROGRADE_GEMINI: Cited<"prograde"> = cite(
  "prograde",
  geminiLaunch("spacecraft separation", "Space-fixed heading angle, deg east of North"),
);
const PROGRADE_AGENA: Cited<"prograde"> = cite(
  "prograde",
  agenaLaunch("Insertion", "Space-fixed heading angle, deg east of North"),
);

/** The Agena's orbit from insertion to the end of this flight. */
const AGENA_ORBIT = {
  apoapsis: cite(161.3, agenaRevolution("1 (Insertion)", "Apogee, n. mi.")),
  periapsis: cite(158.8, agenaRevolution("1 (Insertion)", "Perigee, n. mi.")),
  inclination: cite(29.02, agenaRevolution("1 (Insertion)", "Inclination, deg")),
  sense: PROGRADE_AGENA,
};

/* Times on Gemini VIII's clock. */
const LIFTOFF = at("000:00:00", geminiEvents("Lift-off (pad disconnect separation)"));
const INSERTION = geminiClock(365.66, geminiLaunch("spacecraft separation", "Time from lift-off, sec"));
const NH1 = at("001:34:36.4", maneuver("Height adjust (NH1)", "G.e.t., hr:min:sec"));
const NC1 = at("002:18:25.8", maneuver("Phase adjust (NC1)", "G.e.t., hr:min:sec"));
const NPC = at("002:45:52.8", maneuver("Plane change (NPC)", "G.e.t., hr:min:sec"));
const NH2 = at("003:03:42.2", maneuver("Vernier height adjust (NH2)", "G.e.t., hr:min:sec"));
const NSR = at("003:48:09.7", maneuver("Coelliptical (NSR)", "G.e.t., hr:min:sec"));
const TPI = at("005:14:55.7", maneuver("Terminal phase initiate (TPI)", "G.e.t., hr:min:sec"));
const NH1_END = burnEnd("001:34:36.4", 5.5, maneuver("Height adjust (NH1)", "Delta t_B, sec"));
const NC1_END = burnEnd("002:18:25.8", 68.0, maneuver("Phase adjust (NC1)", "Delta t_B, sec"));
const NPC_END = burnEnd("002:45:52.8", 35.5, maneuver("Plane change (NPC)", "Delta t_B, sec"));
const NH2_END = burnEnd("003:03:42.2", 3.0, maneuver("Vernier height adjust (NH2)", "Delta t_B, sec"));
const NSR_END = burnEnd("003:48:09.7", 82.5, maneuver("Coelliptical (NSR)", "Delta t_B, sec"));
const TPI_END = burnEnd("005:14:55.7", 37.0, maneuver("Terminal phase initiate (TPI)", "Delta t_B, sec"));
const DOCKING = at("006:33:16", geminiEvents("Docking"));
const UNDOCKING = at("007:15:12.3", geminiEvents("Undocking"));
const RETROFIRE: Cited<ElapsedTime> = {
  ...at("010:04:46.6", translation("Retrofire", "Time, g.e.t., hr:min:sec"), retrorockets("individual motor performance, motor 1 ignition time")),
  discrepancy: 'Table 4.2-I rounds retrofire initiation to 10:04:47. We follow the tenths of a second in Tables 5.1.5-VII and 5.1.8-V.',
};
const RETROFIRE_END = burnEnd(
  "010:05:03.3",
  5.6,
  retrorockets("individual motor performance: motor 4, the last to fire, ignited at 10:05:03.3 g.e.t. with a web burn time of 5.6 seconds"),
);
const ENTRY_INTERFACE = at(
  "010:26:53.239",
  report('Section 5.1.5.2.3 (page 5-24): "At 10:26:53.239 g.e.t., the computer commanded a zero-degree bank angle which indicated proper spacecraft navigation to the 400K-foot level"'),
);
const LANDING = at("010:41:26", geminiEvents("Landing"));
/** The end of the story: the crew climbed aboard the recovery ship. */
const CREW_ABOARD = at("013:47:00", {
  source: "gemini-8-mission-report",
  locator: 'Section 6.3.2, "Location and Retrieval" (pages 6-32 to 6-34), recovery events table, row 06:28 G.m.t. / 13:47 g.e.t. (both given to the minute; seconds written as 00): "Flight crew boarded U.S.S. Mason"',
  url: MISSION_REPORT,
});

/** Where the spacecraft came down, and floated until the crew was picked up. */
const SPLASHDOWN = {
  latitude: {
    ...cite(degrees(25, 12), geminiLaunch("landing point", "Latitude, north (printed 25 degrees 12 minutes; IGS coordinates in the onboard computer)")),
    discrepancy:
      "The recovery ship U.S.S. Leonard F. Mason reported its pickup point as 25 degrees 22 minutes north, 135 degrees 56 minutes east (Table 4.3-I, preliminary column, and page 6-34; Section 1.0 prints 25 degrees 21 minutes), and NSSDCA lists 25.22 N, 136.00 E. The report puts the difference down to small navigation errors in the ship's and aircraft's positions (page 6-34). We follow the report's final column, the landing point from the onboard computer, which the report says agrees with its reconstructed reentry (Section 4.3.1.3). The report does not say whether this latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(degrees(136, 5), geminiLaunch("landing point", "Longitude, east (printed 136 degrees 05 minutes; IGS coordinates in the onboard computer)")),
};

/* Times on the Agena's own clock (seconds from its lift-off), moved onto Gemini VIII's. */
const AGENA_LIFTOFF: Cited<ElapsedTime> = { value: "-001:40:59.262", citations: AGENA_LEAD.citations };
const AGENA_INSERTION = agenaClock(560.4, agenaLaunch("Insertion", "Time from lift-off, sec"));

/* ------------------------------------------------------------------ */
/* Launch pads.                                                        */
/* ------------------------------------------------------------------ */

/*
 * The report does not print where the pads are, and we found no NASA or
 * Smithsonian page that does. Each pad is our estimate from printed values:
 * the point from which a great circle leaving at the published flight
 * azimuth reaches the first-stage cutoff (BECO) point after its published
 * "range from launch site" (on a sphere, 1 nautical mile per arc minute),
 * rounded to 0.01 degree. Good to about 2 km, which is far below what the
 * scene can show. src/sim/test/gemini-8.test.ts recomputes both.
 */

/** Launch Complex 19, the Gemini launch vehicle's pad (our estimate; see above). */
const PAD_19 = {
  latitude: cite(28.51, ...padEstimate("Gemini", "Complex 19")),
  longitude: cite(-80.57, ...padEstimate("Gemini", "Complex 19")),
};

/** Launch Complex 14, the Atlas-Agena's pad (our estimate; see above). */
const PAD_14 = {
  latitude: cite(28.48, ...padEstimate("Agena", "Complex 14")),
  longitude: cite(-80.56, ...padEstimate("Agena", "Complex 14")),
};

function padEstimate(vehicle: "Gemini" | "Agena", pad: string): [Citation, ...Citation[]] {
  const estimate = `our estimate of where ${pad} is, not a printed value: the point from which a great circle at the flight azimuth reaches the BECO point after the BECO range`;
  if (vehicle === "Gemini") {
    return [
      report(`Section 1.0 (page 1-1): the spacecraft "was launched from Complex 19"; ${estimate}`),
      geminiLaunch("BECO", "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.36 N, 79.61 W, 51.4)"),
      report('Section 4.1 (page 4-1): "the GLV was launched ... on a rendezvous launch azimuth of 99.9 degrees"'),
    ];
  }
  return [
    report(`Section 1.0 (page 1-1): the target vehicle "was launched from Complex 14"; ${estimate}`),
    agenaLaunch("BECO", "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.55 N, 79.74 W, 43.3)"),
    report('Section 4.1 (page 4-1): "the vehicle was rolled from a pad azimuth of 105 degrees to a flight azimuth of 84.36 degrees"'),
  ];
}

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const gemini8Flight: FlightPlan = {
  missionId: "gemini-8",

  // The sky is fit at the Agena's lift-off, Gemini VIII's lift-off, and
  // landing, which span every Earth-relative fix in the plan.
  sky: [
    {
      time: AGENA_LIFTOFF,
      moonEclipticLongitude: cite(294.7489324, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-03-16 15:00:03.127")),
      subLunarLongitude: cite(258.759473, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-03-16 15:00:03.127")),
      sunEclipticLongitude: cite(355.5706414, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-03-16 15:00:03.127")),
    },
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(295.5859079, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-03-16 16:41:02.389")),
      subLunarLongitude: cite(234.35852, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-03-16 16:41:02.389")),
      sunEclipticLongitude: cite(355.6404726, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-03-16 16:41:02.389")),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(300.8909455, horizons("Moon (301) from Earth's center", "ObsEcLon", "1966-03-17 03:22:28.389")),
      subLunarLongitude: cite(79.314372, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1966-03-17 03:22:28.389")),
      sunEclipticLongitude: cite(356.0839549, horizons("Sun (10) from Earth's center", "ObsEcLon", "1966-03-17 03:22:28.389")),
    },
  ],

  ships: [
    {
      id: "gemini",
      name: "Gemini VIII spacecraft",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
          // The orbit itself takes over in the last 30 seconds before
          // insertion, so the second-stage cutoff point is listed but not
          // drawn through.
          track: [
            geminiAscentPoint("BECO", 154.62, 34.4, 28.36, -79.61),
            geminiAscentPoint("SECO", 337.54, 86.7, 27.09, -72.04),
          ],
        },
        {
          kind: "orbit",
          label: "First orbit",
          body: "earth",
          start: INSERTION,
          end: NH1,
          apoapsis: cite(146.7, geminiRevolution("1 (Insertion)", "Apogee, n. mi.")),
          periapsis: cite(86.3, geminiRevolution("1 (Insertion)", "Perigee, n. mi.")),
          inclination: {
            ...cite(29.07, geminiRevolution("1 (Insertion)", "Inclination, deg")),
            discrepancy: "Table 4.3-II prints 29.02 degrees for the same orbit (before the height adjustment). Both are informational here: the orbit's plane comes from the heading at insertion.",
          },
          sense: PROGRADE_GEMINI,
          startFix: {
            latitude: cite(26.7, geminiLaunch("spacecraft separation", "Geodetic latitude, deg north")),
            longitude: cite(-70.03, geminiLaunch("spacecraft separation", "Longitude, deg west (printed 70.03 west)")),
            altitude: cite(86.5, geminiLaunch("spacecraft separation", "Altitude, n. mi.")),
            speed: cite(25_738, geminiLaunch("spacecraft separation", "Space-fixed velocity, ft/sec")),
            flightPathAngle: cite(0.04, geminiLaunch("spacecraft separation", "Space-fixed flight-path angle, deg")),
            heading: cite(101.88, geminiLaunch("spacecraft separation", "Space-fixed heading angle, deg east of North")),
          },
        },
        {
          kind: "burn",
          label: "Height adjustment",
          body: "earth",
          start: NH1,
          end: NH1_END,
          deltaV: cite(3.1, maneuver("Height adjust (NH1)", "Delta V, ft/sec")),
        },
        {
          kind: "orbit",
          label: "Lower apogee",
          body: "earth",
          start: NH1_END,
          end: NC1,
          apoapsis: cite(144.7, geminiOrbit("height adjust (NH1)", "after", "Apogee, n. mi.")),
          periapsis: cite(86.3, geminiOrbit("height adjust (NH1)", "after", "Perigee, n. mi.")),
          inclination: cite(29.07, geminiOrbit("height adjust (NH1)", "after", "Inclination, deg.")),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "burn",
          label: "Phase adjustment",
          body: "earth",
          start: NC1,
          end: NC1_END,
          deltaV: cite(50.6, maneuver("Phase adjust (NC1)", "Delta V, ft/sec")),
        },
        {
          kind: "orbit",
          label: "Higher perigee",
          body: "earth",
          start: NC1_END,
          end: NPC,
          apoapsis: cite(144.7, geminiOrbit("phase adjust (NC1)", "after", "Apogee, n. mi.")),
          periapsis: cite(113.3, geminiOrbit("phase adjust (NC1)", "after", "Perigee, n. mi.")),
          inclination: cite(29.07, geminiOrbit("phase adjust (NC1)", "after", "Inclination, deg.")),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "burn",
          label: "Plane change",
          body: "earth",
          start: NPC,
          end: NPC_END,
          deltaV: cite(26.6, maneuver("Plane change (NPC)", "Delta V, ft/sec")),
        },
        {
          kind: "orbit",
          label: "In the Agena's plane",
          body: "earth",
          start: NPC_END,
          end: NH2,
          apoapsis: cite(144.7, geminiOrbit("plane change (NPC)", "after", "Apogee, n. mi.")),
          periapsis: cite(113.3, geminiOrbit("plane change (NPC)", "after", "Perigee, n. mi.")),
          inclination: cite(29.02, geminiOrbit("plane change (NPC)", "after", "Inclination, deg.")),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "burn",
          label: "Vernier height adjustment",
          body: "earth",
          start: NH2,
          end: NH2_END,
          deltaV: cite(2.3, maneuver("Vernier height adjust (NH2)", "Delta V, ft/sec")),
        },
        {
          kind: "orbit",
          label: "Before the coelliptic maneuver",
          body: "earth",
          start: NH2_END,
          end: NSR,
          apoapsis: cite(144.8, geminiOrbit("vernier height adjust (NH2)", "after", "Apogee, n. mi.")),
          periapsis: cite(113.3, geminiOrbit("vernier height adjust (NH2)", "after", "Perigee, n. mi.")),
          inclination: cite(29.02, geminiOrbit("vernier height adjust (NH2)", "after", "Inclination, deg.")),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: "burn",
          label: "Coelliptic maneuver",
          body: "earth",
          start: NSR,
          end: NSR_END,
          deltaV: cite(61.6, maneuver("Coelliptical (NSR)", "Delta V, ft/sec")),
        },
        {
          kind: "orbit",
          label: "Coelliptic orbit, below the Agena",
          body: "earth",
          start: NSR_END,
          end: TPI,
          apoapsis: cite(146.7, geminiOrbit("coelliptical maneuver (NSR)", "after", "Apogee, n. mi.")),
          periapsis: cite(143.9, geminiOrbit("coelliptical maneuver (NSR)", "after", "Perigee, n. mi.")),
          inclination: cite(29.02, geminiOrbit("coelliptical maneuver (NSR)", "after", "Inclination, deg.")),
          sense: PROGRADE_GEMINI,
          // Where the chase stood when the final approach began.
          endRange: {
            target: "agena",
            range: cite(
              29,
              report('Section 4.3.1.2.1 (page 4-18): "The TPI maneuver was begun at 5:14:56 g.e.t. when the elevation angle to the GATV was approximately 26.8 degrees and the range was about 29 nautical miles."'),
            ),
          },
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "earth",
          start: TPI,
          end: TPI_END,
          deltaV: cite(27.3, maneuver("Terminal phase initiate (TPI)", "Delta V, ft/sec")),
        },
        {
          kind: "rendezvous",
          label: "Closing in on the Agena",
          body: "earth",
          start: TPI_END,
          end: DOCKING,
          target: "agena",
          apoapsis: cite(159.0, geminiOrbit("terminal phase initiate (TPI)", "after", "Apogee, n. mi.")),
          periapsis: cite(145.9, geminiOrbit("terminal phase initiate (TPI)", "after", "Perigee, n. mi.")),
          sense: PROGRADE_GEMINI,
          alongside: at(
            "005:55:00",
            report('Section 4.3.1.2.1 (page 4-19): "By 5:55:00 g.e.t., the spacecraft was about 150 feet from the GATV and the crew was station keeping."'),
          ),
        },
        {
          kind: "docked",
          label: "Docked with the Agena",
          start: DOCKING,
          end: UNDOCKING,
          target: "agena",
        },
        {
          kind: "orbit",
          label: "After undocking",
          body: "earth",
          start: UNDOCKING,
          end: RETROFIRE,
          apoapsis: cite(161.3, geminiRevolution("7 (Pre-retrofire)", "Apogee, n. mi.")),
          periapsis: cite(157.5, geminiRevolution("7 (Pre-retrofire)", "Perigee, n. mi.")),
          inclination: cite(29.02, geminiRevolution("7 (Pre-retrofire)", "Inclination, deg")),
          sense: PROGRADE_GEMINI,
          from: "agena",
        },
        {
          kind: "burn",
          label: "Retrofire",
          body: "earth",
          start: RETROFIRE,
          end: RETROFIRE_END,
          deltaV: cite(314.0, retrorockets('system performance, "Delta V, ft/sec" total, actual column')),
        },
        {
          kind: "coast",
          label: "Falling toward the atmosphere",
          body: "earth",
          start: RETROFIRE_END,
          end: ENTRY_INTERFACE,
          sense: cite("prograde", reentryState("Spacecraft heading, deg")),
          // The onboard computer's state at 400,000 feet. The fall from
          // retrofire is the Kepler path through it, run back in time.
          endFix: {
            latitude: cite(28.82, reentryState("Latitude, deg")),
            latitudeKind: "geocentric",
            longitude: cite(102.99, reentryState("Longitude, deg")),
            // 400,000 feet, in nautical miles (our conversion).
            altitude: cite(65.83, reentryState("column heading 400K ft")),
            speed: cite(24_411.87, reentryState("Velocity, ft/sec")),
            flightPathAngle: cite(-1.361, reentryState("Flight-path angle, deg.")),
            heading: cite(88.56, reentryState("Spacecraft heading, deg")),
            velocityFrame: "earth-fixed",
          },
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: {
            ...at("010:36:47", geminiEvents("Drogue parachute deployment")),
            discrepancy: "Figure 5.1.11-1 marks drogue parachute deployment at 10:36:34.4. We follow the sequence of events, Table 4.2-I.",
          },
          // 50,000 feet, in nautical miles (our conversion).
          drogueAltitude: cite(
            8.23,
            report('Section 5.1.11 (page 5-107): the landing-system sequence "was actuated near the nominal drogue parachute deployment altitude of 50 000 feet"'),
            report('Section 7.1.2.12 (page 7-23), the crew\'s report: "The drogue parachute was actuated at 50K feet"'),
          ),
          splashdown: SPLASHDOWN,
        },
        {
          kind: "surface",
          label: "Waiting for the recovery ship",
          body: "earth",
          start: LANDING,
          end: CREW_ABOARD,
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
          track: [
            agenaAscentPoint("BECO", 129.79, 31.4, 28.55, -79.74),
            agenaAscentPoint("SECO", 283.68, 107.6, 28.88, -74.47),
            agenaAscentPoint("VECO", 303.94, 116.7, 28.92, -73.6),
            agenaAscentPoint("PPS start", 377.5, 144.2, 29.0, -70.16),
          ],
        },
        {
          kind: "orbit",
          label: "Waiting for Gemini VIII",
          body: "earth",
          start: AGENA_INSERTION,
          end: DOCKING,
          ...AGENA_ORBIT,
          startFix: {
            latitude: cite(28.57, agenaLaunch("Insertion", "Geodetic latitude, deg North")),
            longitude: cite(-59.37, agenaLaunch("Insertion", "Longitude, deg West (printed 59.37 west)")),
            altitude: cite(161.3, agenaLaunch("Insertion", "Altitude, n. mi.")),
            speed: cite(25_366, agenaLaunch("Insertion", "Space-fixed velocity, ft/sec")),
            flightPathAngle: cite(0.003, agenaLaunch("Insertion", "Space-fixed flight-path angle, deg")),
            heading: cite(95.27, agenaLaunch("Insertion", "Space-fixed heading angle, deg east of North")),
          },
        },
        {
          kind: "orbit",
          label: "Docked with Gemini VIII",
          body: "earth",
          start: DOCKING,
          end: UNDOCKING,
          ...AGENA_ORBIT,
        },
        {
          kind: "orbit",
          label: "Left in orbit",
          body: "earth",
          start: UNDOCKING,
          end: CREW_ABOARD,
          ...AGENA_ORBIT,
        },
      ],
    },
  ],
};

/** A Gemini launch vehicle point from Table 4.3-I (geodetic latitude; longitude printed west). */
function geminiAscentPoint(condition: string, secondsFromLiftoff: number, altitude: number, latitude: number, longitude: number): StateFix {
  return {
    time: geminiClock(secondsFromLiftoff, geminiLaunch(condition, "Time from lift-off, sec")),
    altitude: cite(altitude, geminiLaunch(condition, "Altitude, n. mi.")),
    latitude: cite(latitude, geminiLaunch(condition, "Geodetic latitude, deg north")),
    longitude: cite(longitude, geminiLaunch(condition, `Longitude, deg west (printed ${-longitude} west)`)),
  };
}

/** An Atlas-Agena point from Table 4.3-V (geodetic latitude; longitude printed west). */
function agenaAscentPoint(condition: string, secondsFromLiftoff: number, altitude: number, latitude: number, longitude: number): StateFix {
  return {
    time: agenaClock(secondsFromLiftoff, agenaLaunch(condition, "Time from lift-off, sec")),
    altitude: cite(altitude, agenaLaunch(condition, "Altitude, n. mi.")),
    latitude: cite(latitude, agenaLaunch(condition, "Geodetic latitude, deg north")),
    longitude: cite(longitude, agenaLaunch(condition, `Longitude, deg west (printed ${-longitude} west)`)),
  };
}
