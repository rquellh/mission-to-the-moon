/**
 * The Apollo 16 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Sources:
 * - Apollo by the Numbers (NASA SP-2000-4029): event times, orbit sizes,
 *   burns, the places over Earth and the Moon in its phase tables,
 *   translunar injection, entry, and splashdown time.
 * - Apollo 16 Mission Report (MSC-07230), Table 3-III: the flight-path
 *   angles, the entry altitude, and the places Apollo by the Numbers leaves
 *   out (lunar module jettison, transearth injection). Its times agree with
 *   Apollo by the Numbers to the second, and its places with the phase
 *   tables to within a minute of arc; the splashdown point is its section
 *   1.0 and 3.4 value.
 * - NSSDCA Apollo Landing Site Coordinates: where Orion landed.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * All times are on the clock that started at range zero; the two updates
 * Mission Control made to its clock during the flight are not used (Mission
 * Report section 2.0 and Table 3-II).
 *
 * The landing site is 9 degrees south of the Moon's equator, so the lunar
 * orbits are drawn in one plane over it (`lunarOrbitPlane`), and the lunar
 * latitudes in the sources are not used: the model places each lunar fix
 * where that plane crosses its longitude. The plane is the model's default,
 * heading due west over the site at the middle of the stay on the surface;
 * no approach azimuth is published in these sources. The plane change of
 * 169:05 hours is drawn as a burn that changes the orbit's size only.
 *
 * Lunar altitudes in these sources are measured from the radius of the
 * landing site (Mission Report Table 3-IV), but neither source prints that
 * radius, so the plan gives no `moonReferenceRadius` and the model measures
 * from the Moon's mean radius (a difference of a mile or two).
 *
 * Left out, because they are too small to see or the orbit they led to is
 * not published: the outbound midcourse correction (12.5 feet per second),
 * the small rocket firings that brought Casper back beside Orion and then
 * apart again while the engine was checked (100 to 102:30 hours), the lunar
 * module's 10-foot-per-second vernier adjustment at 175:42:18, the
 * 2-foot-per-second separation from the ascent stage at 195:03:13, and the
 * two return midcourse corrections (3.4 and 1.4 feet per second).
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT = "https://www.nasa.gov/wp-content/uploads/static/history/alsj/a16/A16_MissionReport.pdf";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271972-04-16%2017:54:00.59%27,%271972-04-16%2020:33:28.42%27,%271972-04-27%2019:31:31%27,%271972-04-27%2019:45:05%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation] };
}

const ascentTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 16 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_16d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 16 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_16e_Earth_Orbit_Phase.htm`,
});
const lunarOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 16 Lunar Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_16g_Lunar_Orbit_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 16 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_16h_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 16 Timeline, "${row}"`,
  url: `${ABN}Apollo_16i_Timeline.htm`,
});
const summary = (section: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 16 mission summary, "${section}" section`,
  url: `${ABN}Apollo_16a_Summary.htm`,
});
const tliTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Translunar Injection table, Apollo 16 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const landingTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `LM Lunar Landing table, Apollo 16 column, "${row}"`,
  url: `${ABN}Apollo_18-27_LM_Lunar_Landing.htm`,
});
const entryTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Entry, Splashdown, and Recovery table, Apollo 16 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
const trajectoryTable = (row: string): Citation => ({
  source: "apollo-16-mission-report",
  locator: `Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 17), "${row}" row`,
  url: MISSION_REPORT,
});
const LUNAR_SITES: Citation = {
  source: "nssdca-apollo-landing-sites",
  locator: 'Apollo 16, "Lunar Module" row',
  url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
};
const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});
const MANEUVER_SUMMARY = (row: string): Citation => ({
  source: "apollo-16-mission-report",
  locator: `Table 3-V, "Maneuver Summary", part (b) "Lunar orbit" (printed page 3-6, PDF page 19), "${row}" row, resultant apocynthion and pericynthion`,
  url: MISSION_REPORT,
});
/** The splashdown point in the Mission Report's summary and trajectory sections. */
const MISSION_REPORT_LANDING: Citation = {
  source: "apollo-16-mission-report",
  locator:
    'Section 1.0, "Summary" (printed page 1-3, PDF page 12), and section 3.4, "Transearth and Entry Trajectory" (printed page 3-9, PDF page 22): landed at "0 degrees 42 minutes 0 seconds south latitude and 156 degrees 12 minutes 48 seconds west longitude", as determined by the spacecraft computer',
  url: MISSION_REPORT,
};

/** Lunar orbits run east to west (retrograde), as Table 3-III shows. */
const RETROGRADE: Cited<"retrograde"> = cite("retrograde", {
  source: "apollo-16-mission-report",
  locator:
    "Table 3-III (printed page 3-4, PDF page 17): every lunar-orbit space-fixed heading angle lies between -79.43 and -100.50 degrees east of north (toward the west), and the longitude decreases from ignition to cutoff at the long burns (lunar orbit insertion 166:38 W to 169:19 E, transearth injection 175:16 E to 164:21 E)",
  url: MISSION_REPORT,
});

/** Earth orbit runs west to east (prograde). */
const PROGRADE_EOI: Cited<"prograde"> = cite("prograde", {
  ...ascentTable("Earth orbit insertion"),
  locator:
    'Apollo 16 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 88.932 degrees east of north, so the orbit runs west to east',
});

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const LANDING_SITE = {
  latitude: {
    ...cite(-8.9734, LUNAR_SITES),
    discrepancy:
      "Apollo by the Numbers (LM Lunar Landing table, Apollo 16 column, \"Actual Landing Latitude (deg N)\" and \"Actual Landing Longitude (deg E)\") gives -8.97301, 15.50019; NSSDCA's Master Catalog page for the lunar module (1972-031C) gives 8.9730 S, 15.5002 E; and the Mission Report (section 3.3.2) 8 degrees 59 minutes 29 seconds S, 15 degrees 30 minutes 52 seconds E on a 1972 photomap. We follow NSSDCA's landing-site page, measured on Lunar Reconnaissance Orbiter images.",
  },
  longitude: cite(15.5011, LUNAR_SITES),
};

/** The descent orbit, which both spacecraft kept from descent orbit insertion until the engine check was over. */
const DESCENT_ORBIT = {
  apoapsis: cite(58.5, lunarOrbitTable("Descent orbit insertion cutoff")),
  periapsis: cite(10.9, lunarOrbitTable("Descent orbit insertion cutoff")),
};

/** The command and service module's orbit after the plane change, kept until transearth injection. */
const CSM_AFTER_PLANE_CHANGE = {
  apoapsis: cite(64.6, lunarOrbitTable("CSM plane change cutoff")),
  periapsis: cite(55.0, lunarOrbitTable("CSM plane change cutoff")),
};

export const flight: FlightPlan = {
  missionId: "apollo-16",

  lunarOrbitPlane: {
    site: { latitude: LANDING_SITE.latitude, longitude: LANDING_SITE.longitude },
  },

  // The sky is fit at lift-off, translunar injection, entry interface, and
  // splashdown, the moments when Earth-relative positions shape the path.
  sky: [
    {
      time: at("000:00:00.59", timeline("Liftoff (umbilical disconnected).")),
      moonEclipticLongitude: cite(67.8238963, horizons("Moon (301) from Earth's center", "ObsEcLon", "1972-04-16 17:54:00.59")),
      subLunarLongitude: cite(311.857696, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1972-04-16 17:54:00.59")),
      sunEclipticLongitude: cite(26.8352266, horizons("Sun (10) from Earth's center", "ObsEcLon", "1972-04-16 17:54:00.59")),
    },
    {
      time: at("002:39:28.42", tliTable("GET")),
      moonEclipticLongitude: cite(69.4571008, horizons("Moon (301) from Earth's center", "ObsEcLon", "1972-04-16 20:33:28.42")),
      subLunarLongitude: cite(273.682389, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1972-04-16 20:33:28.42")),
      sunEclipticLongitude: cite(26.9435503, horizons("Sun (10) from Earth's center", "ObsEcLon", "1972-04-16 20:33:28.42")),
    },
    {
      time: at("265:37:31", entryTable("Earth Entry GET")),
      moonEclipticLongitude: cite(209.8012855, horizons("Moon (301) from Earth's center", "ObsEcLon", "1972-04-27 19:31:31")),
      subLunarLongitude: cite(57.148021, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1972-04-27 19:31:31")),
      sunEclipticLongitude: cite(37.6245994, horizons("Sun (10) from Earth's center", "ObsEcLon", "1972-04-27 19:31:31")),
    },
    {
      time: at("265:51:05", entryTable("Earth Splashdown GET")),
      moonEclipticLongitude: cite(209.9132286, horizons("Moon (301) from Earth's center", "ObsEcLon", "1972-04-27 19:45:05")),
      subLunarLongitude: cite(53.855393, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1972-04-27 19:45:05")),
      sunEclipticLongitude: cite(37.633754, horizons("Sun (10) from Earth's center", "ObsEcLon", "1972-04-27 19:45:05")),
    },
  ],

  ships: [
    {
      id: "csm",
      name: "Command and service module",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: at("000:00:00.59", ascentTable("Liftoff")),
          end: at("000:11:56.21", ascentTable("Earth orbit insertion")),
          site: {
            latitude: cite(28.447, ascentTable("Liftoff")),
            latitudeKind: "geocentric",
            longitude: cite(-80.6041, ascentTable("Liftoff")),
          },
          // The table marks the center engine cutoff and the two stage
          // separations as commanded times only; their positions fit the
          // rows around them, so they are kept. The model lets the orbit
          // itself take over in the last 30 seconds before insertion, so the
          // "S-IVB 1st burn cutoff" row is listed but not drawn through.
          track: [
            ascentPoint("Mach 1 achieved", "000:01:07.5", 4.282, 28.4539, -80.5797),
            ascentPoint("Maximum dynamic pressure", "000:01:26.0", 7.755, 28.467, -80.5359),
            ascentPoint("S-IC center engine cutoff*", "000:02:17.85", 24.548, 28.5847, -80.1207),
            ascentPoint("S-IC outboard engine cutoff", "000:02:41.78", 35.698, 28.7009, -79.7028),
            ascentPoint("S-IC/S-II separation*", "000:02:43.5", 36.56, 28.7109, -79.6666),
            ascentPoint("S-II center engine cutoff", "000:07:41.77", 92.441, 30.9376, -69.6064),
            ascentPoint("S-II outboard engine cutoff", "000:09:19.54", 93.445, 31.7737, -63.81),
            ascentPoint("S-II/S-IVB separation*", "000:09:20.5", 93.468, 31.7812, -63.7457),
            ascentPoint("S-IVB 1st burn cutoff", "000:11:46.21", 93.374, 32.5109, -53.2983),
          ],
        },
        {
          kind: "orbit",
          label: "Earth parking orbit",
          body: "earth",
          start: at("000:11:56.21", earthOrbitTable("Earth orbit insertion")),
          end: at("002:33:36.50", earthOrbitTable("S-IVB 2nd burn ignition")),
          apoapsis: cite(91.3, earthOrbitTable("Earth orbit insertion")),
          periapsis: cite(90.0, earthOrbitTable("Earth orbit insertion")),
          inclination: cite(32.542, earthOrbitTable("Earth orbit insertion")),
          sense: PROGRADE_EOI,
          startFix: {
            latitude: cite(32.5262, ascentTable("Earth orbit insertion")),
            latitudeKind: "geocentric",
            longitude: cite(-52.53, ascentTable("Earth orbit insertion")),
            altitude: cite(93.377, ascentTable("Earth orbit insertion")),
            speed: cite(25_605.0, ascentTable("Earth orbit insertion")),
            flightPathAngle: cite(0.001, ascentTable("Earth orbit insertion")),
            heading: cite(88.932, ascentTable("Earth orbit insertion")),
          },
          endFix: {
            latitude: cite(-24.5488, earthOrbitTable("S-IVB 2nd burn ignition")),
            latitudeKind: "geocentric",
            longitude: cite(137.4789, earthOrbitTable("S-IVB 2nd burn ignition")),
          },
        },
        {
          kind: "burn",
          label: "Translunar injection",
          body: "earth",
          start: at("002:33:36.50", earthOrbitTable("S-IVB 2nd burn ignition")),
          end: at("002:39:18.42", earthOrbitTable("S-IVB 2nd burn cutoff")),
          deltaV: cite(10_389.6, earthOrbitTable("S-IVB 2nd burn cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast to the Moon",
          to: "moon",
          start: at("002:39:18.42", earthOrbitTable("S-IVB 2nd burn cutoff")),
          end: at("074:28:27.87", lunarOrbitTable("Lunar orbit insertion ignition")),
          earthFix: {
            time: at("002:39:28.42", tliTable("GET")),
            latitude: cite(-11.9881, tliTable("Geodetic Latitude (deg N)")),
            longitude: cite(162.482, tliTable("Longitude (deg E)")),
            altitude: cite(171.243, tliTable("Altitude (n mi)")),
            speed: cite(35_566.1, tliTable("Space-Fixed Velocity (ft/sec)")),
            flightPathAngle: cite(7.461, tliTable("Flight Path Angle (deg)")),
            heading: cite(59.524, tliTable("Heading Angle (deg E of N)")),
          },
          moonFix: {
            longitude: cite(-166.63, lunarOrbitTable("Lunar orbit insertion ignition")),
            altitude: {
              ...cite(93.9, lunarOrbitTable("Lunar orbit insertion ignition"), trajectoryTable("Lunar orbit insertion, Ignition")),
              discrepancy:
                'Apollo by the Numbers\' mission summary ("Translunar Phase" section) says the engine fired "at an altitude of 92.9 n mi above the Moon". Its Lunar Orbit Phase table and the Mission Report\'s Table 3-III give 93.9, which we follow.',
            },
            speed: cite(8_105.4, lunarOrbitTable("Lunar orbit insertion ignition")),
            flightPathAngle: cite(-9.51, trajectoryTable("Lunar orbit insertion, Ignition")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...tliTable("Heading Angle (deg E of N)"),
            locator:
              'Translunar Injection table, Apollo 16 column, "Heading Angle (deg E of N)": 59.524 degrees, so the path leaves Earth heading east',
          }),
        },
        {
          kind: "burn",
          label: "Lunar orbit insertion",
          body: "moon",
          start: at("074:28:27.87", lunarOrbitTable("Lunar orbit insertion ignition")),
          end: at("074:34:42.77", lunarOrbitTable("Lunar orbit insertion cutoff")),
          deltaV: cite(2_802, lunarOrbitTable("Lunar orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "First lunar orbits",
          body: "moon",
          start: at("074:34:42.77", lunarOrbitTable("Lunar orbit insertion cutoff")),
          end: at("078:33:45.04", lunarOrbitTable("Descent orbit insertion ignition")),
          apoapsis: cite(170.3, lunarOrbitTable("Lunar orbit insertion cutoff")),
          periapsis: cite(58.1, lunarOrbitTable("Lunar orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(169.32, lunarOrbitTable("Lunar orbit insertion cutoff")),
            altitude: cite(75.3, lunarOrbitTable("Lunar orbit insertion cutoff")),
            flightPathAngle: cite(2.22, trajectoryTable("Lunar orbit insertion, Cutoff")),
          },
          // Both sources put the ignition of descent orbit insertion at 136.02
          // E (136:01 E), but its cutoff 24.35 seconds later at 137.27 W
          // (137:16 W), 87 degrees away. The likely explanation is a dropped
          // minus sign: the burn covered about 1.25 degrees, exactly the
          // distance from 136.02 W to 137.27 W. The cutoff point also agrees
          // with an orbit of the published size run from the insertion point
          // above, and with the undocking point 17 hours later. So the
          // ignition point is not used: the orbit runs freely to the burn,
          // and the next orbit starts at the published cutoff point.
        },
        {
          // As on Apollo 15, the command and service module's engine lowered
          // both spacecraft into the descent orbit.
          kind: "burn",
          label: "Descent orbit insertion",
          body: "moon",
          start: at("078:33:45.04", lunarOrbitTable("Descent orbit insertion ignition")),
          end: at("078:34:09.39", lunarOrbitTable("Descent orbit insertion cutoff")),
          deltaV: cite(209.5, lunarOrbitTable("Descent orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "Descent orbit, docked",
          body: "moon",
          start: at("078:34:09.39", lunarOrbitTable("Descent orbit insertion cutoff")),
          end: at("096:13:31", lunarOrbitTable("LM undocking and separation")),
          ...DESCENT_ORBIT,
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-137.27, lunarOrbitTable("Descent orbit insertion cutoff")),
            altitude: cite(58.4, lunarOrbitTable("Descent orbit insertion cutoff")),
            flightPathAngle: cite(0.1, trajectoryTable("Descent orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(121.92, lunarOrbitTable("LM undocking and separation")) },
        },
        {
          // Casper was to circularize its orbit at 097:41:44, but the engine
          // check found a fault, and the burn waited until 103:21:43.08. In
          // between, Casper stayed in the descent orbit near Orion.
          kind: "orbit",
          label: "Descent orbit, waiting",
          body: "moon",
          start: at("096:13:31", lunarOrbitTable("LM undocking and separation")),
          end: at("103:21:43.08", lunarOrbitTable("CSM orbit circularization ignition")),
          ...DESCENT_ORBIT,
          sense: RETROGRADE,
          endFix: { longitude: cite(-151.98, lunarOrbitTable("CSM orbit circularization ignition")) },
        },
        {
          kind: "burn",
          label: "Circularization",
          body: "moon",
          start: at("103:21:43.08", lunarOrbitTable("CSM orbit circularization ignition")),
          end: at("103:21:47.74", lunarOrbitTable("CSM orbit circularization cutoff")),
          deltaV: cite(81.6, lunarOrbitTable("CSM orbit circularization cutoff")),
        },
        {
          kind: "orbit",
          label: "Science orbit",
          body: "moon",
          start: at("103:21:47.74", lunarOrbitTable("CSM orbit circularization cutoff")),
          end: at("169:05:52.14", lunarOrbitTable("CSM plane change ignition")),
          apoapsis: cite(68.0, lunarOrbitTable("CSM orbit circularization cutoff")),
          periapsis: cite(53.1, lunarOrbitTable("CSM orbit circularization cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-151.95, lunarOrbitTable("CSM orbit circularization cutoff")),
            altitude: cite(59.1, lunarOrbitTable("CSM orbit circularization cutoff")),
            flightPathAngle: cite(0.42, trajectoryTable("Command and service module circularization, Cutoff")),
          },
          endFix: { longitude: cite(108.83, lunarOrbitTable("CSM plane change ignition")) },
        },
        {
          kind: "burn",
          label: "Plane change",
          body: "moon",
          start: at("169:05:52.14", lunarOrbitTable("CSM plane change ignition")),
          end: at("169:05:59.28", lunarOrbitTable("CSM plane change cutoff")),
          deltaV: cite(124, lunarOrbitTable("CSM plane change cutoff")),
        },
        {
          kind: "orbit",
          label: "Waiting for Orion",
          body: "moon",
          start: at("169:05:59.28", lunarOrbitTable("CSM plane change cutoff")),
          end: at("177:41:18", lunarOrbitTable("CSM/LM docked")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          // No start fix: the orbit goes on from where the science orbit is
          // pinned, 7 seconds before the published cutoff point (108.50 E,
          // 58.6 nautical miles). The published values are not in question;
          // the gap is in the model, whose orbit keeps the shape it had at
          // circularization for 33 revolutions and so is near its high point
          // there (about 67 nautical miles). Pinning the cutoff's altitude
          // too would make the drawn path jump.
          //
          // Both sources put the docking at 55.65 W (55:39 W). That is about
          // 40 degrees west of where an orbit of the published size reaches
          // at docking time, whether it is run on from the plane change or
          // from the lunar module's terminal phase initiation; and the same
          // orbit run on from the plane change reaches the published
          // jettison point 26 hours later. So the docking point is not used,
          // and the orbit is pinned at the jettison instead.
        },
        {
          kind: "orbit",
          label: "Lunar orbit, docked",
          body: "moon",
          start: at("177:41:18", lunarOrbitTable("CSM/LM docked")),
          end: at("195:00:12", lunarOrbitTable("LM ascent stage jettisoned")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          endFix: {
            longitude: {
              ...cite(70.47, trajectoryTable("Lunar module jettison")),
              discrepancy:
                'Apollo by the Numbers\' Lunar Orbit Phase table leaves the place blank on its "LM ascent stage jettisoned" row. The jettison place (1.13, 70.47) appears two rows down, on its "Subsatellite deployed" row, and the subsatellite\'s place (-0.02, -115.98) on the "CSM separation maneuver" row between them; the Mission Report\'s Table 3-III gives these places for the jettison (01:08 N, 70:28 E) and the subsatellite launch (00:01 S, 115:59 W). We follow the Mission Report.',
            },
          },
        },
        {
          kind: "orbit",
          label: "Lunar orbit after jettison",
          body: "moon",
          start: at("195:00:12", lunarOrbitTable("LM ascent stage jettisoned")),
          end: at("200:21:33.07", transearthTable("Transearth injection ignition")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          // 175:16 E in decimal degrees (our arithmetic). Table 3-III prints
          // the ignition's time and place on the "Transearth injection" line
          // and the rest of the ignition values on the "Ignition" line below.
          endFix: {
            longitude: cite(175.27, {
              ...trajectoryTable("Transearth injection"),
              locator:
                'Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 17), "Transearth injection" row: 200:21:33, 09:43 N, 175:16 E (the ignition)',
            }),
          },
        },
        {
          kind: "burn",
          label: "Transearth injection",
          body: "moon",
          start: at("200:21:33.07", transearthTable("Transearth injection ignition")),
          end: at("200:24:15.36", transearthTable("Transearth injection cutoff")),
          deltaV: cite(3_370.9, transearthTable("Transearth injection cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast home",
          to: "earth",
          start: at("200:24:15.36", transearthTable("Transearth injection cutoff")),
          end: at("265:37:31", entryTable("Earth Entry GET")),
          moonFix: {
            longitude: cite(164.35, trajectoryTable("Transearth injection, Cutoff")),
            altitude: cite(59.7, transearthTable("Transearth injection cutoff")),
            speed: cite(8_663.0, transearthTable("Transearth injection cutoff")),
            flightPathAngle: cite(5.12, transearthTable("Transearth injection cutoff")),
          },
          earthFix: {
            latitude: cite(-19.87, entryTable("Earth Entry Geodetic Latitude (deg N)")),
            longitude: cite(-162.13, entryTable("Earth Entry Longitude (deg E)")),
            altitude: cite(65.8, trajectoryTable("Entry and landing phases, Entry interface")),
            speed: cite(36_196.1, entryTable("Earth Entry Velocity (ft/sec)")),
            flightPathAngle: cite(-6.55, entryTable("Earth Entry Flight Path Angle")),
            heading: cite(21.08, entryTable("Earth Entry Heading Angle (deg)")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...entryTable("Earth Entry Heading Angle (deg)"),
            locator:
              'Entry, Splashdown, and Recovery table, Apollo 16 column, "Heading Angle": 21.08 degrees east of north, so the spacecraft arrived moving toward the east',
          }),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: at("265:37:31", entryTable("Earth Entry GET")),
          end: at("265:51:05", entryTable("Earth Splashdown GET")),
          drogue: at("265:45:26", timeline("Drogue parachute deployed")),
          // The Mission Report's landing point, 0 degrees 42 minutes 0
          // seconds S and 156 degrees 12 minutes 48 seconds W, in decimal
          // degrees (our arithmetic).
          splashdown: {
            latitude: cite(-0.7, MISSION_REPORT_LANDING, entryTable("Earth Splashdown Latitude (deg N)")),
            longitude: {
              ...cite(-156.2133, MISSION_REPORT_LANDING),
              discrepancy:
                "Apollo by the Numbers (Entry, Splashdown, and Recovery table) gives longitude -156.22, and NASA's mission details page 156 degrees 12 minutes 49 seconds W. We follow the Mission Report, 156 degrees 12 minutes 48 seconds W, as the spacecraft computer determined it.",
            },
          },
        },
      ],
    },
    {
      id: "lm",
      name: "Lunar module",
      role: "lander",
      phases: [
        {
          // Orion stayed close to Casper from undocking until the engine
          // check was over: drawn as flying beside it. How close the two were
          // is not published for most of this time (a little over half a mile
          // when Casper began to close in, Mission Report section 9.6.4,
          // printed page 9-16, PDF page 118).
          kind: "station",
          label: "Beside Casper during the engine check",
          start: at("096:13:31", lunarOrbitTable("LM undocking and separation")),
          end: at("102:30:00", timeline("LM separation from CSM.")),
          target: "csm",
        },
        {
          kind: "orbit",
          label: "Undocked, before descent",
          body: "moon",
          start: at("102:30:00", timeline("LM separation from CSM.")),
          end: at("104:17:25", lunarOrbitTable("LM powered descent initiation")),
          ...DESCENT_ORBIT,
          sense: RETROGRADE,
          endFix: { longitude: cite(32.73, lunarOrbitTable("LM powered descent initiation")) },
        },
        {
          kind: "descent",
          label: "Powered descent",
          body: "moon",
          start: at("104:17:25", lunarOrbitTable("LM powered descent initiation")),
          end: at("104:29:35", landingTable("GET")),
          site: LANDING_SITE,
        },
        {
          kind: "surface",
          label: "Descartes",
          body: "moon",
          start: at("104:29:35", landingTable("GET")),
          end: at("175:31:47.9", lunarOrbitTable("LM lunar liftoff ignition")),
          site: LANDING_SITE,
        },
        {
          kind: "ascent",
          label: "Lunar liftoff",
          body: "moon",
          start: at("175:31:47.9", lunarOrbitTable("LM lunar liftoff ignition")),
          end: at("175:38:55.7", lunarOrbitTable("LM lunar ascent orbit cutoff")),
          site: LANDING_SITE,
        },
        {
          kind: "orbit",
          label: "Catching up",
          body: "moon",
          start: at("175:38:55.7", lunarOrbitTable("LM lunar ascent orbit cutoff")),
          end: at("176:26:05", lunarOrbitTable("LM terminal phase initiation ignition")),
          apoapsis: cite(40.2, lunarOrbitTable("LM lunar ascent orbit cutoff")),
          periapsis: cite(7.9, lunarOrbitTable("LM lunar ascent orbit cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(5.43, lunarOrbitTable("LM lunar ascent orbit cutoff")),
            altitude: cite(9.9, lunarOrbitTable("LM lunar ascent orbit cutoff")),
            speed: cite(5_523.3, lunarOrbitTable("LM lunar ascent orbit cutoff")),
            flightPathAngle: cite(0.34, trajectoryTable("Ascent insertion")),
          },
          // A 10-foot-per-second vernier adjustment at 175:42:18 changed this
          // orbit (Mission Report section 3.3.3, printed page 3-7, PDF page
          // 20), and the orbit after it is not published. So the orbit is not
          // pinned at the terminal phase initiation point (147.37 W): it runs
          // on freely from insertion, and the rendezvous below carries Orion
          // to Casper.
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "moon",
          start: at("176:26:05", lunarOrbitTable("LM terminal phase initiation ignition")),
          end: at("176:26:07.5", lunarOrbitTable("LM terminal phase initiation cutoff")),
          deltaV: cite(78.0, lunarOrbitTable("LM terminal phase initiation cutoff")),
        },
        {
          // The rendezvous is drawn as complete at terminal phase finalize,
          // when the first braking maneuver began close to Casper (Mission
          // Report Table 3-II), and the half hour of braking, station
          // keeping, and inspection before docking as flying alongside.
          kind: "rendezvous",
          label: "Closing in",
          body: "moon",
          start: at("176:26:07.5", lunarOrbitTable("LM terminal phase initiation cutoff")),
          end: at("177:08:42", timeline("Terminal phase finalize.")),
          target: "csm",
          apoapsis: cite(64.2, summary("Lunar Orbit/Lunar Surface Phase"), MANEUVER_SUMMARY("Terminal phase initiation")),
          periapsis: cite(40.1, summary("Lunar Orbit/Lunar Surface Phase"), MANEUVER_SUMMARY("Terminal phase initiation")),
          sense: RETROGRADE,
        },
        {
          kind: "station",
          label: "Braking and docking approach",
          start: at("177:08:42", timeline("Terminal phase finalize.")),
          end: at("177:41:18", lunarOrbitTable("CSM/LM docked")),
          target: "csm",
        },
        {
          kind: "docked",
          label: "Docked",
          start: at("177:41:18", lunarOrbitTable("CSM/LM docked")),
          end: at("195:00:12", lunarOrbitTable("LM ascent stage jettisoned")),
          target: "csm",
        },
      ],
    },
  ],
};

/** One row of the Apollo 16 ascent table (geocentric latitude). */
function ascentPoint(
  row: string,
  elapsed: ElapsedTime,
  altitude: number,
  latitude: number,
  longitude: number,
) {
  return {
    time: at(elapsed, ascentTable(row)),
    altitude: cite(altitude, ascentTable(row)),
    latitude: cite(latitude, ascentTable(row)),
    latitudeKind: "geocentric" as const,
    longitude: cite(longitude, ascentTable(row)),
  };
}
