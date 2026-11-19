/**
 * The Apollo 9 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the command and service module ("csm", Gumdrop, the crew's
 * spacecraft for the whole flight) and the lunar module ("lm", Spider). Until
 * undocking, Spider rides on Gumdrop and is drawn as part of it (see
 * vehicle.ts). Its path begins at undocking and ends with the docked phase
 * after the rendezvous; when its ascent stage is cast off, vehicle.ts drops
 * it from Gumdrop's parts.
 *
 * Sources:
 * - Apollo 9 Mission Report (MSC-PA-R-69-2), the more primary source, so we
 *   follow it where the two disagree: the sequence of events (Table 3-I),
 *   the orbit size at insertion (sections 1.0 and 3.0), where the spacecraft
 *   was at each firing (Table 7-II, geodetic latitudes), the orbit after
 *   each firing (Table 7-III), the lunar module's orbits during the
 *   rendezvous (Table 5-II, best-estimated trajectory column), and the
 *   entry interface (Table 7-IV). Table 7-II prints times to a tenth of a
 *   second; each of its positions is used at Apollo by the Numbers' time of
 *   the same event, which agrees with it to that tenth. NASA's copy at
 *   nasa.gov now answers "not found"; the citations link to the Internet
 *   Archive's copy of that NASA file.
 * - Apollo by the Numbers (NASA SP-2000-4029): the launch pad and the climb
 *   to orbit (Apollo 9 Ascent Phase table, with geocentric latitudes, as for
 *   Apollo 11), the state at orbit insertion, the splashdown point, and
 *   event times to the hundredth of a second where the report rounds them
 *   (the two agree unless a `discrepancy` says otherwise).
 * - NSSDCA Master Catalog: the orbit after the S-IVB's tanks were vented.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is ground elapsed time from range zero, 16:00:00
 * G.m.t. on March 3, 1969 (mission report, section 2.0); lift-off came
 * 0.67 second later.
 *
 * Arithmetic of ours: the vented orbit, which NSSDCA prints in kilometers,
 * is converted to nautical miles (1 nautical mile = 1.852 km).
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The climb to orbit between the published points, each burn (a smooth
 *   blend from one orbit to the next), the entry (a smooth ground track to
 *   the splashdown point and a smooth descent to an illustrative drogue
 *   parachute height), and where each orbit's high and low points lie.
 * - Gumdrop's orbits are Kepler ellipses turned slowly by Earth's bulge
 *   (J2), each starting from the published state after a firing and pinned
 *   to where the next firing began. The firings that changed the orbit's
 *   plane (the second, third, fourth, and seventh main-engine firings,
 *   directed largely out of plane, section 7.3, and the docked descent
 *   engine firing and the fifth, which changed the inclination) are burns
 *   between orbits. The two small in-plane firings, the first and sixth,
 *   are drawn as steps in orbit size, not as burns. The venting of the
 *   S-IVB's tanks is drawn as a smooth change in size over the first six
 *   hours (its time is not published). Air drag between firings is not
 *   drawn, except from the fifth firing to the separation maneuver, where
 *   the published sizes (131.0 by 125.9, then 127 by 122) are joined
 *   smoothly.
 * - Spider flies from Gumdrop's drawn position through the published sizes
 *   of its orbits, so where the two are relative to each other is our
 *   illustration (the report gives the greatest distance, 98 nautical
 *   miles, and Spider's place after the coelliptic firing, 10 nautical miles
 *   below and 82 behind). Its first orbit, before its own first firing, is
 *   not published: it is drawn in the 127 by 122 orbit published for Gumdrop
 *   after the separation maneuver, which was a 5 ft/sec push straight down
 *   (Table 5-II) and so hardly changed the orbit's size. The two
 *   midcourse corrections and the braking are not drawn one by one: the
 *   path blends from Spider's own orbit into Gumdrop's position by the start
 *   of station keeping.
 * - The orbit heights are above an oblate Earth (Table 7-III, note); the
 *   model measures them from Earth's equatorial radius, which can draw an
 *   apogee or perigee a few nautical miles off, depending on its latitude.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan, OrbitSize, StateFix } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT =
  "https://web.archive.org/web/20250815162504/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A09_MissionReport.pdf";
const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-018A";
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES = "&TLIST_TYPE=%27CAL%27&TLIST=%271969-03-03%2016:00:00.67%27,%271969-03-13%2017:00:54%27";
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

function report(locator: string): Citation {
  return { source: "apollo-9-mission-report", locator, url: MISSION_REPORT };
}

/** Table 3-I, the sequence of events. */
const sequence = (row: string, page: "3-4" | "3-5"): Citation =>
  report(`Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === "3-4" ? 14 : 15}), "${row}" row`);

/** Table 7-III, the orbit after a firing. */
const resultant = (maneuver: string, row: string): Citation =>
  report(`Table 7-III, "Maneuver Summary" (page 7-9, PDF page 91), "${maneuver}" row, resultant orbit, ${row}`);

/** Table 5-II, a rendezvous maneuver, "Best-estimated trajectory" column unless the row says otherwise. */
const rendezvousManeuver = (maneuver: string, page: "5-20" | "5-21" | "5-22", row: string): Citation =>
  report(
    `Table 5-II, "Summary of Rendezvous Maneuvers" (page ${page}, PDF page ${Number(page.slice(2)) + 43}), ${maneuver}, "${row}" row`,
  );

/** Table 7-II, one column of a firing's ignition or cutoff row. */
const trajectory = (maneuver: string, page: "7-7" | "7-8", when: "ignition" | "cutoff", column: string): Citation =>
  report(`Table 7-II, "Trajectory Parameters" (page ${page}, PDF page ${page === "7-7" ? 89 : 90}), "${maneuver}", ${when}, ${column}`);

/** Where a firing began (Table 7-II; longitudes printed west). */
function ignitionPlace(maneuver: string, page: "7-7" | "7-8", latitude: number, longitudeWest: number) {
  return {
    latitude: cite(latitude, trajectory(maneuver, page, "ignition", "latitude, deg")),
    longitude: cite(-longitudeWest, trajectory(maneuver, page, "ignition", `longitude, deg (printed ${longitudeWest}W)`)),
  };
}

/** The state when a firing ended (Table 7-II; latitudes printed north, longitudes west). */
function cutoffState(
  maneuver: string,
  page: "7-7" | "7-8",
  latitude: number,
  longitudeWest: number,
  altitude: number,
  speed: number,
  flightPathAngle: number,
  heading: number,
): StateFix {
  const column = (name: string): Citation => trajectory(maneuver, page, "cutoff", name);
  return {
    latitude: cite(latitude, column("latitude, deg")),
    longitude: cite(-longitudeWest, column(`longitude, deg (printed ${longitudeWest}W)`)),
    altitude: cite(altitude, column("altitude, miles")),
    speed: cite(speed, column("space-fixed velocity, ft/sec")),
    flightPathAngle: cite(flightPathAngle, column("space-fixed flight-path angle, deg")),
    heading: cite(heading, column("space-fixed heading angle, deg E of N")),
  };
}

/** Table 7-III, a firing's velocity change. */
const velocityChange = (maneuver: string, value: number, abnRow: string): Cited<number> =>
  cite(value, report(`Table 7-III, "Maneuver Summary" (page 7-9, PDF page 91), "${maneuver}" row, velocity change, ft/sec`), earthOrbitTable(abnRow));

/** Table 7-IV, the entry interface (400 000 feet altitude). */
const entryState = (row: string): Citation =>
  report(`Table 7-IV, "Entry Trajectory Parameters" (page 7-10, PDF page 92), entry interface (400 000 feet altitude), "${row}" row`);

const ascentTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 9 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_09d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 9 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_09e_Earth_Orbit_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 9 Timeline, row "${row}"`,
  url: `${ABN}Apollo_09f_Timeline.htm`,
});
const entryTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Entry, Splashdown, and Recovery table, Apollo 9 column, "${row}" row`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY("301", "500@399", "31");
const EARTH_FROM_MOON = HORIZONS_QUERY("399", "500@301", "14");
const SUN_FROM_EARTH = HORIZONS_QUERY("10", "500@399", "31");

/** Earth orbit runs west to east (prograde), as the heading at insertion shows. */
const PROGRADE: Cited<"prograde"> = cite("prograde", {
  ...ascentTable("Earth orbit insertion"),
  locator: 'Apollo 9 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 87.412 degrees east of north, so the orbit runs west to east',
});

/* ------------------------------------------------------------------ */
/* Times.                                                              */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  "000:00:00.67",
  ascentTable("Liftoff"),
  timeline("Liftoff (umbilical disconnected)."),
  sequence("Lift-off", "3-4"),
);
const INSERTION = at("000:11:14.66", ascentTable("Earth orbit insertion"), sequence("Orbital insertion", "3-4"));

/** A firing's ignition and cutoff, from the Earth Orbit Phase table; the report's Table 3-I gives the same ignition to a tenth of a second. */
function firing(abnName: string, reportRow: string, page: "3-4" | "3-5", ignition: ElapsedTime, cutoff: ElapsedTime): [Cited<ElapsedTime>, Cited<ElapsedTime>] {
  return [
    at(ignition, earthOrbitTable(`${abnName} ignition`), sequence(reportRow, page)),
    at(cutoff, earthOrbitTable(`${abnName} cutoff`)),
  ];
}

const [SPS_1, SPS_1_END] = firing("1st SPS", "First service propulsion maneuver", "3-4", "005:59:01.07", "005:59:06.30");
const [SPS_2, SPS_2_END] = firing("2nd SPS", "Second service propulsion maneuver", "3-4", "022:12:04.07", "022:13:54.36");
const [SPS_3, SPS_3_END] = firing("3rd SPS", "Third service propulsion maneuver", "3-4", "025:17:39.27", "025:22:19.15");
const [SPS_4, SPS_4_END] = firing("4th SPS", "Fourth service propulsion maneuver", "3-4", "028:24:41.37", "028:25:09.24");
const [DPS_DOCKED, DPS_DOCKED_END] = firing("DPS docked", "First descent propulsion maneuver", "3-4", "049:41:34.46", "049:47:45.97");
const [SPS_5, SPS_5_END] = firing("5th SPS", "Fifth service propulsion maneuver", "3-4", "054:26:12.27", "054:26:55.53");
const UNDOCKING = at("092:39:36", sequence("First undocking", "3-5"), timeline("CSM/LM reported undocked."));
const SEPARATION_END = at("093:03:03.5", earthOrbitTable("CSM/LM separation cutoff"), report('Table 7-II, "Trajectory Parameters" (page 7-7, PDF page 89), "Separation maneuver (service module)", cutoff, time'));
const PHASING = at("093:47:35.4", sequence("Descent propulsion phasing maneuver", "3-5"), earthOrbitTable("LM descent phasing ignition"));
const PHASING_END: Cited<ElapsedTime> = {
  ...at("093:47:54.1", report('Table 7-II, "Trajectory Parameters" (page 7-7, PDF page 89), "Second descent propulsion maneuver (phasing)", cutoff, time')),
  discrepancy:
    'Apollo by the Numbers (Earth Orbit Phase table, "LM descent phasing cutoff", and Timeline) gives 093:47:54.4. We follow the mission report\'s Table 7-II.',
};
const INSERTION_BURN = at("095:39:08.06", earthOrbitTable("LM descent insertion ignition"), sequence("Descent propulsion insertion maneuver", "3-5"));
const INSERTION_BURN_END = at("095:39:30.43", earthOrbitTable("LM descent insertion cutoff"));
const CSI = at(
  "096:16:06.54",
  earthOrbitTable("LM coelliptic sequence ignition"),
  sequence("Coelliptic sequence initiation maneuver", "3-5"),
  timeline("LM coelliptic sequence initiation maneuver ignition. Approximate time of LM descent stage jettison."),
);
const CSI_END = at("096:16:38.25", earthOrbitTable("LM coelliptic sequence cutoff"));
const CDH = at("096:58:15.0", earthOrbitTable("LM constant differential height ignition"), sequence("Constant delta height maneuver (first ascent propulsion)", "3-5"));
const CDH_END = at("096:58:17.9", earthOrbitTable("LM constant differential height cutoff"));
const TPI = at("097:57:59", earthOrbitTable("LM terminal phase initiation ignition"), sequence("Terminal phase initiation", "3-5"));
const TPI_END = at("097:58:36.6", earthOrbitTable("LM terminal phase initiation cutoff"));
const STATION_KEEPING = at(
  "098:30:51.2",
  timeline("Stationkeeping."),
  report('Table 7-II, "Trajectory Parameters" (page 7-8, PDF page 90), "Station-keeping" row, time'),
);
const DOCKING = at("099:02:26", sequence("Docking", "3-5"), timeline("CSM/LM docked."));
const LM_JETTISON = at("101:22:45.0", timeline("LM ascent stage jettisoned."), sequence("Lunar module jettison", "3-5"));
const [SPS_6, SPS_6_END] = firing("6th SPS", "Sixth service propulsion maneuver", "3-5", "123:25:06.97", "123:25:08.40");
const SPS_7: Cited<ElapsedTime> = {
  ...at("169:39:00.36", earthOrbitTable("7th SPS ignition"), sequence("Seventh service propulsion maneuver", "3-5"), timeline("7th SPS ignition.")),
  discrepancy:
    'The "Earth Orbit Phase" section of the Apollo 9 mission summary in Apollo by the Numbers gives 169:30:00.36. Its Earth Orbit Phase table and Timeline give 169:39:00.36, and the mission report 169:39:00.4, which we follow.',
};
const SPS_7_END = at("169:39:25.26", earthOrbitTable("7th SPS cutoff"));
const DEORBIT = at("240:31:14.84", earthOrbitTable("8th SPS ignition"), sequence("Eighth service propulsion maneuver (deorbit)", "3-5"));
const DEORBIT_END = at("240:31:26.58", earthOrbitTable("8th SPS cutoff"));
const ENTRY_INTERFACE = at(
  "240:44:10.2",
  entryState("Time, hr:min:sec"),
  sequence("Entry interface (400 000 feet altitude)", "3-5"),
  entryTable("Earth Entry GET"),
);
const DROGUE = at("240:55:07.8", sequence("Drogue deployment", "3-5"), timeline("Drogue parachute deployed"));
const LANDING = at("241:00:54", sequence("Landing", "3-5"), timeline("Splashdown (went to apex-up)."), entryTable("Earth Splashdown GET"));

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/** Launch Complex 39, Pad A, from the Ascent Phase table's lift-off row (geocentric latitude). */
const PAD_39A = {
  latitude: cite(28.447, ascentTable("Liftoff")),
  latitudeKind: "geocentric" as const,
  longitude: cite(-80.6041, ascentTable("Liftoff")),
};

/** Where the command module came down. */
const SPLASHDOWN = {
  latitude: {
    ...cite(
      23.22,
      entryTable("Earth Splashdown Latitude (deg N)"),
      {
        source: "apollo-by-the-numbers",
        locator: 'Apollo 9 mission summary, "Recovery" section: "The splashdown site was estimated to be latitude 23.22° north and longitude 67.98° west"',
        url: `${ABN}Apollo_09a_Summary.htm`,
      },
    ),
    discrepancy:
      "The mission report's Table 7-IV (page 7-10) gives the same figures, from its best-estimate trajectory, for where the drogue parachutes opened, and gives the recovery ship's report as 23.21 degrees north, 67.94 degrees west. NSSDCA gives 23 degrees 15 minutes north, 67 degrees 56 minutes west. We follow Apollo by the Numbers. Table 7-IV labels the same 23.22 best-estimate figure, for the drogue deployment point, \"Geodetic latitude, deg north\", and Table 7-I (page 7-6) defines geodetic latitude, so we draw it as a geodetic (map) latitude.",
  },
  longitude: cite(-67.98, entryTable("Earth Splashdown Longitude (deg E)")),
};

/* ------------------------------------------------------------------ */
/* Orbits.                                                             */
/* ------------------------------------------------------------------ */

/** An orbit size from Table 7-III, which Apollo by the Numbers' Earth Orbit Phase table repeats. */
function after(maneuver: string, abnRow: string, apoapsis: number, periapsis: number) {
  return {
    apoapsis: cite(apoapsis, resultant(maneuver, "apogee, miles"), earthOrbitTable(abnRow)),
    periapsis: cite(periapsis, resultant(maneuver, "perigee, miles"), earthOrbitTable(abnRow)),
  };
}

/**
 * The report prints the insertion orbit as "102.3 by 103.9" without saying
 * which is which. NSSDCA's 189.6 x 192.5 km is 102.4 by 103.9 nautical miles
 * (our conversion), so 103.9 is the high point (apogee) and 102.3 the low
 * point (perigee).
 */
const INSERTION_ORBIT_NSSDCA: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 9" (1969-018A), Description: "injection of the combined S-IVB stage and the adaptor-LM-CSM payload into a 189.6 x 192.5 km Earth orbit" (192.5 km, 103.9 nautical miles, is the apogee and 189.6 km, 102.4 nautical miles, the perigee; our conversion)',
  url: NMC_CSM,
};

const INSERTION_ORBIT = {
  apoapsis: {
    ...cite(
      103.9,
      report('Section 1.0, "Summary" (page 1-1, PDF page 8): "the S-IVB stage inserted the spacecraft into an orbit of 102.3 by 103.9 nautical miles"'),
      report('Section 3.0, "Mission Description" (page 3-1, PDF page 11): "the insertion orbit was 102.3 by 103.9 miles"'),
      INSERTION_ORBIT_NSSDCA,
    ),
    discrepancy:
      'Apollo by the Numbers\' Earth Orbit Phase table gives 100.74 by 99.68 nautical miles, worked out on a spherical Earth of radius 3,443.934 nautical miles (its Apollo 9 summary, "Ascent Phase"). We follow the mission report, whose heights are above an oblate Earth.',
  },
  periapsis: cite(102.3, report('Section 1.0, "Summary" (page 1-1, PDF page 8): an orbit "of 102.3 by 103.9 nautical miles"'), INSERTION_ORBIT_NSSDCA),
};

/** After the S-IVB's tanks were vented, before the first firing: NSSDCA's 198 x 204 km, in nautical miles (our conversion). */
const VENTED_ORBIT = {
  apoapsis: cite(110.2, {
    source: "nssdca-master-catalog",
    locator: '"Apollo 9" (1969-018A), Description: "the S-IVB propellant tanks were vented, changing the orbit to 198 x 204 km" (204 km is 110.2 nautical miles, our conversion)',
    url: NMC_CSM,
  }),
  periapsis: cite(106.9, {
    source: "nssdca-master-catalog",
    locator: '"Apollo 9" (1969-018A), Description: "changing the orbit to 198 x 204 km" (198 km is 106.9 nautical miles, our conversion)',
    url: NMC_CSM,
  }),
};

const AFTER_SPS_1 = after("First service propulsion maneuver", "1st SPS cutoff", 127.6, 111.3);
const AFTER_SPS_2 = after("Second service propulsion maneuver", "2nd SPS cutoff", 192.5, 110.7);
const AFTER_SPS_3 = after("Third service propulsion maneuver", "3rd SPS cutoff", 274.9, 112.6);
const AFTER_SPS_4 = after("Fourth service propulsion maneuver", "4th SPS cutoff", 275.0, 112.4);
const AFTER_DPS_DOCKED = after("First descent propulsion maneuver (docked)", "DPS docked cutoff", 274.6, 112.1);
const FIFTH = after("Fifth service propulsion maneuver", "5th SPS cutoff", 131.0, 125.9);
const AFTER_SPS_5 = {
  ...FIFTH,
  apoapsis: {
    ...FIFTH.apoapsis,
    discrepancy:
      'Section 7.3.1 of the same report (page 7-3, PDF page 85) says this firing "resulted in an orbit of 129.2 by 123.8 miles". We follow its Table 7-III, which Apollo by the Numbers repeats.',
  },
};
/** Gumdrop's orbit after the separation maneuver (and, as drawn, Spider's until its first firing). */
const AFTER_SEPARATION = {
  apoapsis: cite(
    127,
    earthOrbitTable("CSM/LM separation cutoff"),
    rendezvousManeuver("separation maneuver (service module reaction control system)", "5-20", "Resultant apogee/perigee altitudes, miles (127/122, ground and pre-rendezvous nominal columns)"),
  ),
  periapsis: cite(
    122,
    earthOrbitTable("CSM/LM separation cutoff"),
    rendezvousManeuver("separation maneuver (service module reaction control system)", "5-20", "Resultant apogee/perigee altitudes, miles (127/122, ground and pre-rendezvous nominal columns)"),
  ),
};
const AFTER_SPS_6 = after("Sixth service propulsion maneuver", "6th SPS cutoff", 123.1, 108.5);
const AFTER_SPS_7 = after("Seventh service propulsion maneuver", "7th SPS cutoff", 253.2, 100.7);

/** A size in Gumdrop's schedule. */
function size(time: Cited<ElapsedTime>, orbit: { apoapsis: Cited<number>; periapsis: Cited<number> }): OrbitSize {
  return { time, ...orbit };
}

/** One of Spider's orbits during the rendezvous, from Table 5-II, which Apollo by the Numbers repeats. */
function lmOrbit(maneuver: string, page: "5-20" | "5-21" | "5-22", abnRow: string, apoapsis: number, periapsis: number) {
  const row = "Resultant apogee/perigee altitudes, miles";
  return {
    apoapsis: cite(apoapsis, earthOrbitTable(abnRow), rendezvousManeuver(maneuver, page, `${row}, best-estimated trajectory column`)),
    periapsis: cite(periapsis, earthOrbitTable(abnRow), rendezvousManeuver(maneuver, page, `${row}, best-estimated trajectory column`)),
  };
}

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: "apollo-9",

  // The sky is fit at lift-off and at splashdown, which span every
  // Earth-relative fix in the plan.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(156.3242854, horizons("Moon (301) from Earth's center", "ObsEcLon", "1969-03-03 16:00:00.67", MOON_FROM_EARTH)),
      subLunarLongitude: cite(117.647983, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1969-03-03 16:00:00.67", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(342.9064209, horizons("Sun (10) from Earth's center", "ObsEcLon", "1969-03-03 16:00:00.67", SUN_FROM_EARTH)),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(294.5731297, horizons("Moon (301) from Earth's center", "ObsEcLon", "1969-03-13 17:00:54", MOON_FROM_EARTH)),
      subLunarLongitude: cite(231.069315, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1969-03-13 17:00:54", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(352.9441977, horizons("Sun (10) from Earth's center", "ObsEcLon", "1969-03-13 17:00:54", SUN_FROM_EARTH)),
    },
  ],

  ships: [
    {
      id: "csm",
      name: "Command and service module Gumdrop",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_39A,
          // The orbit itself takes over in the last 30 seconds before
          // insertion, so the S-IVB cutoff row is listed but not drawn
          // through. Rows marked "only the commanded time is available"
          // are used: their places lie in line with the rows around them.
          track: [
            ascentPoint("Mach 1 achieved", "000:01:08.2", 4.243, 28.4545, -80.5794),
            ascentPoint("Maximum dynamic pressure", "000:01:25.5", 7.429, 28.4666, -80.5369),
            ascentPoint("S-IC center engine cutoff*", "000:02:14.34", 22.459, 28.572, -80.1602),
            ascentPoint("S-IC outboard engine cutoff", "000:02:42.76", 34.808, 28.7071, -79.6718),
            ascentPoint("S-IC/S-II separation*", "000:02:43.45", 35.144, 28.7111, -79.6571),
            ascentPoint("S-II engine cutoff", "000:08:56.22", 100.735, 31.6261, -65.0422),
            ascentPoint("S-II/S-IVB separation*", "000:08:57.18", 100.794, 31.6343, -64.9786),
            ascentPoint("S-IVB 1st burn cutoff", "000:11:04.66", 103.156, 32.4266, -55.9293),
          ],
        },
        {
          kind: "orbit",
          label: "In orbit on the S-IVB, then docked with Spider",
          body: "earth",
          start: INSERTION,
          end: SPS_2,
          ...INSERTION_ORBIT,
          inclination: cite(32.552, earthOrbitTable("Earth orbit insertion")),
          sense: PROGRADE,
          startFix: {
            latitude: cite(32.4599, ascentTable("Earth orbit insertion")),
            latitudeKind: "geocentric",
            longitude: cite(-55.1658, ascentTable("Earth orbit insertion")),
            altitude: cite(103.154, ascentTable("Earth orbit insertion")),
            speed: cite(25_569.78, ascentTable("Earth orbit insertion")),
            flightPathAngle: cite(-0.0058, ascentTable("Earth orbit insertion")),
            heading: cite(87.412, ascentTable("Earth orbit insertion")),
          },
          // The venting raised the orbit smoothly (its time is not
          // published); the first, in-plane firing is a step.
          sizes: [size(SPS_1, VENTED_ORBIT), size(SPS_1_END, AFTER_SPS_1), size(SPS_2, AFTER_SPS_1)],
          endFix: ignitionPlace("Second service propulsion maneuver", "7-7", 27.54, 64.13),
        },
        {
          kind: "burn",
          label: "Second main-engine firing, docked",
          body: "earth",
          start: SPS_2,
          end: SPS_2_END,
          deltaV: velocityChange("Second service propulsion maneuver", 850.5, "2nd SPS cutoff"),
        },
        {
          kind: "orbit",
          label: "Docked, after the second firing",
          body: "earth",
          start: SPS_2_END,
          end: SPS_3,
          ...AFTER_SPS_2,
          sense: PROGRADE,
          startFix: cutoffState("Second service propulsion maneuver", "7-7", 29.78, 56.43, 108.0, 25_701.7, -0.02, 73.68),
          endFix: ignitionPlace("Third service propulsion maneuver", "7-7", 33.13, 83.93),
        },
        {
          kind: "burn",
          label: "Third main-engine firing, docked",
          body: "earth",
          start: SPS_3,
          end: SPS_3_END,
          deltaV: velocityChange("Third service propulsion maneuver", 2_567.9, "3rd SPS cutoff"),
        },
        {
          kind: "orbit",
          label: "Docked, after the third firing",
          body: "earth",
          start: SPS_3_END,
          end: SPS_4,
          ...AFTER_SPS_3,
          sense: PROGRADE,
          startFix: cutoffState("Third service propulsion maneuver", "7-7", 33.98, 62.22, 115.7, 25_794.3, 0.456, 90.86),
          endFix: ignitionPlace("Fourth service propulsion maneuver", "7-7", 33.99, 111.19),
        },
        {
          kind: "burn",
          label: "Fourth main-engine firing, docked",
          body: "earth",
          start: SPS_4,
          end: SPS_4_END,
          deltaV: velocityChange("Fourth service propulsion maneuver", 300.5, "4th SPS cutoff"),
        },
        {
          kind: "orbit",
          label: "Docked, after the fourth firing",
          body: "earth",
          start: SPS_4_END,
          end: DPS_DOCKED,
          ...AFTER_SPS_4,
          sense: PROGRADE,
          startFix: cutoffState("Fourth service propulsion maneuver", "7-7", 33.99, 109.0, 115.0, 25_798.9, 0.434, 90.14),
          endFix: ignitionPlace("First descent propulsion maneuver (docked)", "7-7", 33.16, 89.64),
        },
        {
          kind: "burn",
          label: "Spider's descent engine fires, docked",
          body: "earth",
          start: DPS_DOCKED,
          end: DPS_DOCKED_END,
          deltaV: velocityChange("First descent propulsion maneuver (docked)", 1_737.5, "DPS docked cutoff"),
        },
        {
          kind: "orbit",
          label: "Docked, after the descent engine firing",
          body: "earth",
          start: DPS_DOCKED_END,
          end: SPS_5,
          ...AFTER_DPS_DOCKED,
          sense: PROGRADE,
          startFix: cutoffState("First descent propulsion maneuver (docked)", "7-7", 33.8, 60.76, 117.0, 25_783.0, 0.53, 95.18),
          endFix: ignitionPlace("Fifth service propulsion maneuver", "7-7", 30.43, 111.2),
        },
        {
          kind: "burn",
          label: "Fifth main-engine firing, docked",
          body: "earth",
          start: SPS_5,
          end: SPS_5_END,
          deltaV: velocityChange("Fifth service propulsion maneuver", 572.5, "5th SPS cutoff"),
        },
        {
          kind: "orbit",
          label: "Circular orbit for the rendezvous",
          body: "earth",
          start: SPS_5_END,
          end: SPS_7,
          ...AFTER_SPS_5,
          sense: PROGRADE,
          startFix: cutoffState("Fifth service propulsion maneuver", "7-7", 29.6, 108.14, 129.3, 25_473.2, 0.01, 107.01),
          // Drag and the small separation maneuver are a smooth change; the
          // sixth, in-plane firing is a step.
          sizes: [size(SEPARATION_END, AFTER_SEPARATION), size(SPS_6, AFTER_SEPARATION), size(SPS_6_END, AFTER_SPS_6), size(SPS_7, AFTER_SPS_6)],
          endFix: ignitionPlace("Seventh service propulsion maneuver", "7-8", 33.66, 102.88),
        },
        {
          kind: "burn",
          label: "Seventh main-engine firing",
          body: "earth",
          start: SPS_7,
          end: SPS_7_END,
          deltaV: velocityChange("Seventh service propulsion maneuver", 650.1, "7th SPS cutoff"),
        },
        {
          kind: "orbit",
          label: "Lined up for the trip home",
          body: "earth",
          start: SPS_7_END,
          end: DEORBIT,
          ...AFTER_SPS_7,
          sense: PROGRADE,
          startFix: cutoffState("Seventh service propulsion maneuver", "7-8", 33.57, 100.95, 103.3, 25_825.9, -0.414, 92.79),
        },
        {
          kind: "burn",
          label: "Deorbit firing",
          body: "earth",
          start: DEORBIT,
          end: DEORBIT_END,
          deltaV: cite(
            322.7,
            report('Table 7-III, "Maneuver Summary" (page 7-9, PDF page 91), "Eighth service propulsion maneuver" row, velocity change, ft/sec'),
            earthOrbitTable("8th SPS cutoff"),
          ),
        },
        {
          kind: "coast",
          label: "Falling toward the atmosphere",
          body: "earth",
          start: DEORBIT_END,
          end: ENTRY_INTERFACE,
          sense: cite("prograde", entryState("Space-fixed heading angle, deg east of north")),
          // The state at 400,000 feet. The fall from the deorbit firing is
          // the Kepler path through it, run back in time.
          endFix: {
            latitude: cite(33.52, entryState("Geodetic latitude, deg north"), entryTable("Earth Entry Geodetic Latitude (deg N)")),
            longitude: cite(-99.05, entryState("Longitude, deg west (printed 99.05 west)"), entryTable("Earth Entry Longitude (deg E)")),
            altitude: cite(65.9, entryState("Altitude, miles")),
            speed: cite(25_894, entryState("Space-fixed velocity, ft/sec"), entryTable("Earth Entry Velocity (ft/sec)")),
            flightPathAngle: cite(-1.74, entryState("Space-fixed flight-path angle, deg"), entryTable("Earth Entry Flight Path Angle (deg E of N)")),
            heading: cite(99.26, entryState("Space-fixed heading angle, deg east of north"), entryTable("Earth Entry Heading Angle (deg)")),
          },
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: DROGUE,
          splashdown: SPLASHDOWN,
        },
      ],
    },
    {
      id: "lm",
      name: "Lunar module Spider",
      role: "lander",
      phases: [
        {
          kind: "orbit",
          label: "Undocked, beside Gumdrop",
          body: "earth",
          start: UNDOCKING,
          end: PHASING,
          ...AFTER_SEPARATION,
          sense: PROGRADE,
          from: "csm",
        },
        {
          kind: "burn",
          label: "Phasing firing of the descent engine",
          body: "earth",
          start: PHASING,
          end: PHASING_END,
        },
        {
          kind: "orbit",
          label: "Phasing orbit",
          body: "earth",
          start: PHASING_END,
          end: INSERTION_BURN,
          ...lmOrbit("phasing maneuver (descent propulsion system, abort guidance control)", "5-20", "LM descent phasing cutoff", 137, 112),
          sense: PROGRADE,
        },
        {
          kind: "burn",
          label: "Insertion firing of the descent engine",
          body: "earth",
          start: INSERTION_BURN,
          end: INSERTION_BURN_END,
        },
        {
          kind: "orbit",
          label: "Above Gumdrop's orbit",
          body: "earth",
          start: INSERTION_BURN_END,
          end: CSI,
          apoapsis: cite(
            138.9,
            earthOrbitTable("LM descent insertion cutoff"),
            rendezvousManeuver("insertion maneuver (descent propulsion system, primary guidance control)", "5-21", "Resultant apogee/perigee altitudes, miles (139/134, best-estimated trajectory column)"),
          ),
          periapsis: cite(
            133.9,
            earthOrbitTable("LM descent insertion cutoff"),
            rendezvousManeuver("insertion maneuver (descent propulsion system, primary guidance control)", "5-21", "Resultant apogee/perigee altitudes, miles (139/134, best-estimated trajectory column)"),
          ),
          sense: PROGRADE,
        },
        {
          kind: "burn",
          label: "Coelliptic sequence initiation; the descent stage is cast off",
          body: "earth",
          start: CSI,
          end: CSI_END,
        },
        {
          kind: "orbit",
          label: "Coelliptic orbit, below and behind",
          body: "earth",
          start: CSI_END,
          end: CDH,
          ...lmOrbit("concentric sequence initiation (lunar module reaction control system with interconnect)", "5-21", "LM coelliptic sequence cutoff", 138, 113),
          sense: PROGRADE,
        },
        {
          kind: "burn",
          label: "Constant differential height, the first ascent engine firing",
          body: "earth",
          start: CDH,
          end: CDH_END,
        },
        {
          kind: "orbit",
          label: "Lining up",
          body: "earth",
          start: CDH_END,
          end: TPI,
          ...lmOrbit("constant differential height maneuver (ascent propulsion system)", "5-21", "LM constant differential height cutoff", 116, 111),
          sense: PROGRADE,
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "earth",
          start: TPI,
          end: TPI_END,
        },
        {
          kind: "rendezvous",
          label: "Closing in on Gumdrop",
          body: "earth",
          start: TPI_END,
          end: DOCKING,
          target: "csm",
          ...lmOrbit("terminal phase initiation (lunar module reaction control system)", "5-22", "LM terminal phase initiation cutoff", 126, 113),
          sense: PROGRADE,
          alongside: STATION_KEEPING,
        },
        {
          kind: "docked",
          label: "Docked to Gumdrop",
          start: DOCKING,
          end: LM_JETTISON,
          target: "csm",
        },
      ],
    },
  ],
};

/** One row of the Apollo 9 Ascent Phase table (geocentric latitude). */
function ascentPoint(row: string, elapsed: ElapsedTime, altitude: number, latitude: number, longitude: number): StateFix {
  return {
    time: at(elapsed, ascentTable(row)),
    altitude: cite(altitude, ascentTable(row)),
    latitude: cite(latitude, ascentTable(row)),
    latitudeKind: "geocentric",
    longitude: cite(longitude, ascentTable(row)),
  };
}
