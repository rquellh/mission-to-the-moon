/**
 * The Apollo 17 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Sources:
 * - Apollo by the Numbers (NASA SP-2000-4029): event times, orbit sizes,
 *   burns, translunar injection, entry, and splashdown time.
 * - Apollo 17 Mission Report (JSC-07904), Table 3-III: where the spacecraft
 *   was at each maneuver, in longitude over the Moon (and latitude and
 *   longitude over Earth), the flight-path angles, the entry altitude, the
 *   lunar module's place at orbit insertion after lunar liftoff, and the
 *   splashdown point. Its times agree with Apollo by the Numbers to the
 *   second, except where a citation says otherwise; each position is used
 *   at the Apollo by the Numbers time of the same event. Its Table 3-I
 *   (sequence of events) gives the landing time.
 * - NSSDCA Apollo Landing Site Coordinates: where Challenger landed.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * Mission clock: every time here is counted from range zero, 05:33:00 GMT
 * on December 7, 1972, as Apollo by the Numbers and the Mission Report
 * print it. At 065:00 the clocks were set ahead 2 hours 40 minutes to make
 * up for the launch delay (Mission Report Table 3-I, "Mission control
 * center time update (+2:40:00)"; Apollo by the Numbers Timeline, "Mission
 * clock updated (002:40:00 added)."); that update is not applied here.
 *
 * The entry state comes from the Mission Report's Table 3-III, not from
 * Apollo by the Numbers' Entry table, whose footnote says "Some Apollo 17
 * entry phase data are preflight predictions because actual data were not
 * obtained." The two agree on every value used here.
 *
 * The landing site is 20 degrees north of the Moon's equator, so the lunar
 * orbits are drawn in one plane over it (`lunarOrbitPlane`). Table 3-III's
 * lunar latitudes are not used: the model places each lunar fix where that
 * plane crosses its longitude. The plane is the model's default, heading due
 * west over the site at the middle of the stay on the surface; no approach
 * azimuth is published in these sources. The command and service module's
 * plane change of 179:53 hours is drawn as a burn that changes the orbit's
 * size only.
 *
 * Lunar altitudes in these sources are measured from the radius of the
 * landing site (Mission Report Table 3-IV), but neither source prints that
 * radius, so the plan gives no `moonReferenceRadius` and the model measures
 * from the Moon's mean radius (a difference of a mile or two).
 *
 * Left out, because they are too small to see: the two midcourse
 * corrections (10.5 feet per second outbound, 2.1 on the way home) and the
 * 1-foot-per-second firing that separated the two spacecraft at undocking.
 * The 2-foot-per-second separation from the ascent stage at 191:23 is drawn
 * as a step in the orbit's size, not as a burn of its own.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT =
  "https://web.archive.org/web/20250206054342/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a17/A17_MissionReport.pdf";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271972-12-07%2005:33:00.63%27,%271972-12-07%2008:51:37.64%27,%271972-12-19%2019:11:38%27,%271972-12-19%2019:24:59%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation] };
}

const ascentTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 17 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_17d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 17 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_17e_Earth_Orbit_Phase.htm`,
});
const lunarOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 17 Lunar Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_17g_Lunar_Orbit_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 17 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_17h_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 17 Timeline, "${row}"`,
  url: `${ABN}Apollo_17i_Timeline.htm`,
});
const tliTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Translunar Injection table, Apollo 17 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const entryTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Entry, Splashdown, and Recovery table, Apollo 17 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
const trajectoryTable = (row: string): Citation => ({
  source: "apollo-17-mission-report",
  locator: `Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 22), "${row}" row`,
  url: MISSION_REPORT,
});
const eventsTable = (row: string): Citation => ({
  source: "apollo-17-mission-report",
  locator: `Table 3-I, "Sequence of Events" (printed page 3-2, PDF page 20), "${row}" row`,
  url: MISSION_REPORT,
});
const LUNAR_SITES: Citation = {
  source: "nssdca-apollo-landing-sites",
  locator: 'Apollo 17, "Lunar Module" row',
  url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
};
const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});

/** Lunar orbits run east to west (retrograde), as Table 3-III shows. */
const RETROGRADE: Cited<"retrograde"> = cite("retrograde", {
  source: "apollo-17-mission-report",
  locator:
    'Table 3-III (printed page 3-4, PDF page 22), "Lunar orbit phase": every space-fixed heading angle lies between 250.09 and 293.67 degrees east of north (toward the west), and the longitude decreases from ignition to cutoff at each burn (for example, lunar orbit insertion 177.38 E to 151.84 E, and the row printed "Translunar injection" in that phase, which is transearth injection, 170.02 W to 179.69 W)',
  url: MISSION_REPORT,
});

/** Earth orbit runs west to east (prograde). */
const PROGRADE_EOI: Cited<"prograde"> = cite("prograde", {
  ...ascentTable("Earth orbit insertion"),
  locator:
    'Apollo 17 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 105.021 degrees east of north, so the orbit runs west to east',
});

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const LANDING_SITE = {
  latitude: {
    ...cite(20.1911, LUNAR_SITES),
    discrepancy:
      "Apollo by the Numbers (LM Lunar Landing table) gives 20.19080 N, 30.77168 E, and the Mission Report (section 1.0, printed page 1-1, PDF page 13) 20 degrees 9 minutes 55 seconds N, 30 degrees 45 minutes 57 seconds E. We follow NSSDCA's coordinates, measured on Lunar Reconnaissance Orbiter images.",
  },
  longitude: {
    ...cite(30.7723, LUNAR_SITES),
    discrepancy:
      "Apollo by the Numbers (LM Lunar Landing table, \"Actual Landing Longitude (deg E)\") gives 30.77168 E. We follow NSSDCA's coordinates, measured on Lunar Reconnaissance Orbiter images.",
  },
};

/** Challenger's landing, as the Mission Report's sequence of events gives it. */
const LANDING: Cited<ElapsedTime> = {
  value: "110:21:57",
  citations: [eventsTable("Lunar landing")],
  discrepancy:
    "Apollo by the Numbers (Timeline and LM Lunar Landing table) and the Mission Report's own summary (section 1.0, printed page 1-1, PDF page 13) give 110:21:58. We follow the Mission Report's sequence of events (Table 3-I), 110:21:57, which NSSDCA's 19:54:57 UT also matches.",
};

/** The orbit the two docked spacecraft were in when they separated. */
const AT_UNDOCKING = {
  apoapsis: cite(61.5, lunarOrbitTable("CSM/LM separation cutoff"), {
    source: "apollo-by-the-numbers",
    locator:
      'Apollo 17 mission summary, "Lunar Orbit/Lunar Surface Phase" section: undocked and separated "at 107:47:56 at an altitude of 47.2 n mi, while in an orbit of 61.5 by 11.5 n mi"',
    url: `${ABN}Apollo_17a_Summary.htm`,
  }),
  periapsis: cite(11.5, lunarOrbitTable("CSM/LM separation cutoff")),
};

/** The command and service module's orbit after the plane change, kept until the ascent stage was cast off. */
const CSM_AFTER_PLANE_CHANGE = {
  apoapsis: cite(62.8, lunarOrbitTable("CSM plane change cutoff")),
  periapsis: cite(62.5, lunarOrbitTable("CSM plane change cutoff")),
};

/**
 * The end of the lunar ascent, when the ascent stage reached orbit. Apollo by
 * the Numbers' time is used because it is the end of the 441-second firing
 * that the Mission Report's maneuver summary also gives.
 */
const ASCENT_CUTOFF: Cited<ElapsedTime> = {
  value: "185:28:58",
  citations: [
    lunarOrbitTable("LM ascent orbit cutoff"),
    {
      source: "apollo-17-mission-report",
      locator:
        'Table 3-V, "Maneuver Summary" (printed page 3-6, PDF page 24), "Ascent" row: ignition 185:21:37, firing time 441 seconds',
      url: MISSION_REPORT,
    },
  ],
  discrepancy:
    'The Mission Report\'s Table 3-III ("Ascent (insertion)" row) prints 185:28:56 for orbit insertion. We follow Apollo by the Numbers\' 185:28:58, the end of the 441-second firing that both sources give.',
};

export const flight: FlightPlan = {
  missionId: "apollo-17",

  lunarOrbitPlane: {
    site: { latitude: LANDING_SITE.latitude, longitude: LANDING_SITE.longitude },
  },

  // The sky is fit at lift-off, translunar injection, entry interface, and
  // splashdown, the moments when Earth-relative positions shape the path.
  sky: [
    {
      time: at("000:00:00.63", timeline("Liftoff (umbilical disconnected).")),
      moonEclipticLongitude: cite(270.2199451, horizons("Moon (301) from Earth's center", "ObsEcLon", "1972-12-07 05:33:00.63")),
      subLunarLongitude: cite(110.900056, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1972-12-07 05:33:00.63")),
      sunEclipticLongitude: cite(255.2217418, horizons("Sun (10) from Earth's center", "ObsEcLon", "1972-12-07 05:33:00.63")),
    },
    {
      time: at("003:18:37.64", tliTable("GET")),
      moonEclipticLongitude: cite(271.8640248, horizons("Moon (301) from Earth's center", "ObsEcLon", "1972-12-07 08:51:37.64")),
      subLunarLongitude: cite(62.920175, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1972-12-07 08:51:37.64")),
      sunEclipticLongitude: cite(255.3618855, horizons("Sun (10) from Earth's center", "ObsEcLon", "1972-12-07 08:51:37.64")),
    },
    {
      time: at("301:38:38", eventsTable("Entry interface (400 000 feet)")),
      moonEclipticLongitude: cite(79.4444081, horizons("Moon (301) from Earth's center", "ObsEcLon", "1972-12-19 19:11:38")),
      subLunarLongitude: cite(61.932056, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1972-12-19 19:11:38")),
      sunEclipticLongitude: cite(268.0053172, horizons("Sun (10) from Earth's center", "ObsEcLon", "1972-12-19 19:11:38")),
    },
    {
      time: at("301:51:59", entryTable("Earth Splashdown GET")),
      moonEclipticLongitude: cite(79.5849628, horizons("Moon (301) from Earth's center", "ObsEcLon", "1972-12-19 19:24:59")),
      subLunarLongitude: cite(58.741447, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1972-12-19 19:24:59")),
      sunEclipticLongitude: cite(268.0147546, horizons("Sun (10) from Earth's center", "ObsEcLon", "1972-12-19 19:24:59")),
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
          start: at("000:00:00.63", ascentTable("Liftoff")),
          end: at("000:11:52.65", ascentTable("Earth orbit insertion")),
          site: {
            latitude: cite(28.447, ascentTable("Liftoff")),
            latitudeKind: "geocentric",
            longitude: cite(-80.6041, ascentTable("Liftoff")),
          },
          // The table marks the center engine cutoff and the two stage
          // separations as commanded times only; their positions fit the
          // rows around them, so they are kept. The "Mach 1 achieved" row
          // is left out: its longitude (-80.5082) puts the rocket farther
          // east than the maximum dynamic pressure row 15 seconds later
          // (-80.5460), and farther than its own 1.265-mile range allows.
          // The model lets the orbit itself take over in the last 30
          // seconds before insertion, so the "S-IVB 1st burn cutoff" row is
          // listed but not drawn through.
          track: [
            ascentPoint("Maximum dynamic pressure", "000:01:22.5", 6.992, 28.4457, -80.546),
            ascentPoint("S-IC center engine cutoff*", "000:02:19.30", 25.388, 28.4329, -80.0781),
            ascentPoint("S-IC outboard engine cutoff", "000:02:41.20", 35.9, 28.4211, -79.6741),
            ascentPoint("S-IC/S-II separation*", "000:02:42.9", 36.776, 28.42, -79.6369),
            ascentPoint("S-II center engine cutoff", "000:07:41.21", 93.42, 27.5754, -69.4919),
            ascentPoint("S-II outboard engine cutoff", "000:09:19.66", 93.182, 26.7251, -63.8908),
            ascentPoint("S-II/S-IVB separation*", "000:09:20.6", 93.195, 26.7147, -63.8314),
            ascentPoint("S-IVB 1 st burn cutoff", "000:11:42.65", 92.082, 24.7139, -54.4952),
          ],
        },
        {
          kind: "orbit",
          label: "Earth parking orbit",
          body: "earth",
          start: at("000:11:52.65", earthOrbitTable("Earth orbit insertion")),
          end: at("003:12:36.60", earthOrbitTable("S-IVB 2 nd burn ignition")),
          apoapsis: {
            ...cite(90.3, earthOrbitTable("Earth orbit insertion")),
            discrepancy:
              "The Mission Report (section 1.0, printed page 1-1, PDF page 13) gives a parking orbit of 92.5 by 91.2 miles. We follow Apollo by the Numbers' 90.3 by 90.0 nautical miles, which its mission summary says are measured from a spherical Earth of 3,443.934 nautical miles radius, the equatorial radius this plan's Earth orbits are measured from.",
          },
          periapsis: cite(90.0, earthOrbitTable("Earth orbit insertion")),
          inclination: cite(28.526, earthOrbitTable("Earth orbit insertion")),
          sense: PROGRADE_EOI,
          // No position is published for the start of translunar injection
          // in these sources, so the orbit runs on freely to the burn.
          startFix: {
            latitude: cite(24.5384, ascentTable("Earth orbit insertion")),
            latitudeKind: "geocentric",
            longitude: cite(-53.8107, ascentTable("Earth orbit insertion")),
            altitude: cite(92.057, ascentTable("Earth orbit insertion")),
            speed: cite(25_603.9, ascentTable("Earth orbit insertion")),
            flightPathAngle: cite(0.0003, ascentTable("Earth orbit insertion")),
            heading: cite(105.021, ascentTable("Earth orbit insertion")),
          },
        },
        {
          kind: "burn",
          label: "Translunar injection",
          body: "earth",
          start: at("003:12:36.60", earthOrbitTable("S-IVB 2 nd burn ignition")),
          end: at("003:18:27.64", earthOrbitTable("S-IVB 2 nd burn cutoff")),
          deltaV: cite(10_376, earthOrbitTable("S-IVB 2 nd burn cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast to the Moon",
          to: "moon",
          start: at("003:18:27.64", earthOrbitTable("S-IVB 2 nd burn cutoff")),
          end: at("086:14:22.60", lunarOrbitTable("Lunar orbit insertion ignition")),
          earthFix: {
            time: at("003:18:37.64", tliTable("GET")),
            latitude: cite(4.71, tliTable("Geodetic Latitude (deg N)")),
            longitude: cite(-53.119, tliTable("Longitude (deg E)")),
            altitude: cite(169.401, tliTable("Altitude (n mi)")),
            speed: cite(35_555.3, tliTable("Space-Fixed Velocity (ft/sec)")),
            flightPathAngle: cite(7.379, tliTable("Flight Path Angle (deg)")),
            heading: cite(118.11, tliTable("Heading Angle (deg E of N)")),
          },
          moonFix: {
            longitude: cite(177.38, trajectoryTable("Lunar orbit insertion, Ignition")),
            altitude: cite(76.8, lunarOrbitTable("Lunar orbit insertion ignition")),
            speed: cite(8_110.2, lunarOrbitTable("Lunar orbit insertion ignition")),
            flightPathAngle: cite(-9.9, trajectoryTable("Lunar orbit insertion, Ignition")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...tliTable("Heading Angle (deg E of N)"),
            locator:
              'Translunar Injection table, Apollo 17 column, "Heading Angle (deg E of N)": 118.110 degrees, so the path leaves Earth heading east-southeast',
          }),
        },
        {
          kind: "burn",
          label: "Lunar orbit insertion",
          body: "moon",
          start: at("086:14:22.60", lunarOrbitTable("Lunar orbit insertion ignition")),
          end: at("086:20:55.76", lunarOrbitTable("Lunar orbit insertion cutoff")),
          deltaV: cite(2_988, lunarOrbitTable("Lunar orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "First lunar orbits",
          body: "moon",
          start: at("086:20:55.76", lunarOrbitTable("Lunar orbit insertion cutoff")),
          end: at("090:31:37.43", lunarOrbitTable("1 st descent orbit insertion ignition")),
          apoapsis: cite(170.0, lunarOrbitTable("Lunar orbit insertion cutoff")),
          periapsis: cite(52.6, lunarOrbitTable("Lunar orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(151.84, trajectoryTable("Lunar orbit insertion, Cutoff")),
            altitude: cite(51.2, lunarOrbitTable("Lunar orbit insertion cutoff")),
            flightPathAngle: cite(0.43, trajectoryTable("Lunar orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(164.16, trajectoryTable("First descent orbit insertion, Ignition")) },
        },
        {
          // On Apollo 17, as on Apollo 15 and 16, the command and service
          // module's engine lowered both spacecraft into the descent orbit.
          kind: "burn",
          label: "Descent orbit insertion",
          body: "moon",
          start: at("090:31:37.43", lunarOrbitTable("1 st descent orbit insertion ignition")),
          end: at("090:31:59.70", lunarOrbitTable("1 st descent orbit insertion cutoff")),
          deltaV: cite(197, lunarOrbitTable("1 st descent orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "Descent orbit, docked",
          body: "moon",
          start: at("090:31:59.70", lunarOrbitTable("1 st descent orbit insertion cutoff")),
          end: at("107:47:56", lunarOrbitTable("CSM/LM separation initiated")),
          apoapsis: cite(59.0, lunarOrbitTable("1 st descent orbit insertion cutoff")),
          periapsis: cite(14.5, lunarOrbitTable("1 st descent orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(163.04, trajectoryTable("First descent orbit insertion, Cutoff")),
            altitude: cite(50.9, lunarOrbitTable("1 st descent orbit insertion cutoff")),
            flightPathAngle: cite(-0.89, trajectoryTable("First descent orbit insertion, Cutoff")),
          },
          // The Moon's uneven gravity reshaped this orbit over the 17 hours
          // the two spacecraft spent in it; it is drawn changing smoothly
          // from its size after the burn to its size at undocking.
          sizes: [{ time: at("107:47:56", lunarOrbitTable("CSM/LM separation initiated")), ...AT_UNDOCKING }],
          endFix: {
            longitude: cite(
              135.91,
              trajectoryTable("Command and service module/lunar module separation"),
            ),
          },
        },
        {
          kind: "orbit",
          label: "Descent orbit, undocked",
          body: "moon",
          start: at("107:47:56", lunarOrbitTable("CSM/LM separation initiated")),
          end: at("109:17:28.92", lunarOrbitTable("CSM orbit circularization ignition")),
          ...AT_UNDOCKING,
          sense: RETROGRADE,
          endFix: {
            longitude: cite(-149.17, trajectoryTable("Command and service module circularization, Ignition")),
          },
        },
        {
          kind: "burn",
          label: "Circularization",
          body: "moon",
          start: at("109:17:28.92", lunarOrbitTable("CSM orbit circularization ignition")),
          end: at("109:17:32.72", lunarOrbitTable("CSM orbit circularization cutoff")),
          deltaV: cite(70.5, lunarOrbitTable("CSM orbit circularization cutoff")),
        },
        {
          kind: "orbit",
          label: "Science orbit",
          body: "moon",
          start: at("109:17:32.72", lunarOrbitTable("CSM orbit circularization cutoff")),
          end: at("178:54:05.45", lunarOrbitTable("CSM orbital trim ignition")),
          apoapsis: cite(70, lunarOrbitTable("CSM orbit circularization cutoff")),
          periapsis: cite(54, lunarOrbitTable("CSM orbit circularization cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-149.3, trajectoryTable("Command and service module circularization, Cutoff")),
            altitude: cite(58.8, lunarOrbitTable("CSM orbit circularization cutoff")),
            flightPathAngle: cite(0.47, trajectoryTable("Command and service module circularization, Cutoff")),
          },
          endFix: { longitude: cite(124.36, trajectoryTable("Orbital trim maneuver ignition")) },
        },
        {
          // The orbit did not shrink as predicted while Challenger was on
          // the Moon, so a small firing lowered it before the rendezvous.
          kind: "burn",
          label: "Orbit trim",
          body: "moon",
          start: at("178:54:05.45", lunarOrbitTable("CSM orbital trim ignition")),
          end: at("178:54:42.95", lunarOrbitTable("CSM orbital trim cutoff")),
          deltaV: cite(9.2, lunarOrbitTable("CSM orbital trim cutoff")),
        },
        {
          // No position is published at either end of this hour, so the
          // orbit runs on from the trim burn to the plane change.
          kind: "orbit",
          label: "Trimmed orbit",
          body: "moon",
          start: at("178:54:42.95", lunarOrbitTable("CSM orbital trim cutoff")),
          end: at("179:53:53.83", lunarOrbitTable("CSM plane change ignition.")),
          apoapsis: cite(67.3, lunarOrbitTable("CSM orbital trim cutoff")),
          periapsis: cite(62.5, lunarOrbitTable("CSM orbital trim cutoff")),
          sense: RETROGRADE,
        },
        {
          kind: "burn",
          label: "Plane change",
          body: "moon",
          start: at("179:53:53.83", lunarOrbitTable("CSM plane change ignition.")),
          end: at("179:54:13.88", lunarOrbitTable("CSM plane change cutoff")),
          deltaV: cite(366, lunarOrbitTable("CSM plane change cutoff")),
        },
        {
          kind: "orbit",
          label: "Waiting for Challenger",
          body: "moon",
          start: at("179:54:13.88", lunarOrbitTable("CSM plane change cutoff")),
          end: at("187:37:15", lunarOrbitTable("CSM/LM docked")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-57.38, trajectoryTable("Command and service module plane change (cutoff)")),
            altitude: cite(60.5, lunarOrbitTable("CSM plane change cutoff")),
            flightPathAngle: cite(-0.001, trajectoryTable("Command and service module plane change (cutoff)")),
          },
          endFix: { longitude: cite(-21.4, trajectoryTable("Docking")) },
        },
        {
          kind: "orbit",
          label: "Lunar orbit, docked",
          body: "moon",
          start: at("187:37:15", lunarOrbitTable("CSM/LM docked")),
          end: at("191:18:31", lunarOrbitTable("LM ascent stage jettisoned")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          endFix: { longitude: cite(31.23, trajectoryTable("Lunar module jettison")) },
        },
        {
          kind: "orbit",
          label: "Last lunar orbits",
          body: "moon",
          start: at("191:18:31", lunarOrbitTable("LM ascent stage jettisoned")),
          end: at("234:02:09.18", transearthTable("Transearth injection ignition")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          // The 12-second, 2-foot-per-second firing that moved America away
          // from the ascent stage, drawn as a step in the orbit's size.
          sizes: [
            {
              time: at("191:23:31", lunarOrbitTable("CSM separation ignition.")),
              ...CSM_AFTER_PLANE_CHANGE,
            },
            {
              time: at("191:23:43", lunarOrbitTable("CSM separation cutoff")),
              apoapsis: cite(63.9, lunarOrbitTable("CSM separation cutoff")),
              periapsis: cite(61.2, lunarOrbitTable("CSM separation cutoff")),
            },
          ],
          endFix: {
            longitude: cite(-170.02, {
              ...trajectoryTable("Translunar injection, Ignition"),
              locator:
                'Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 22), the last rows of the "Lunar orbit phase", printed "Translunar injection" (it is transearth injection, at 234:02:09), "Ignition" row',
            }),
          },
        },
        {
          kind: "burn",
          label: "Transearth injection",
          body: "moon",
          start: at("234:02:09.18", transearthTable("Transearth injection ignition")),
          end: at("234:04:32.87", transearthTable("Transearth injection cutoff")),
          deltaV: cite(3_046.3, transearthTable("Transearth injection cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast home",
          to: "earth",
          start: at("234:04:32.87", transearthTable("Transearth injection cutoff")),
          end: at("301:38:38", eventsTable("Entry interface (400 000 feet)")),
          moonFix: {
            longitude: cite(-179.69, {
              ...trajectoryTable("Translunar injection, Cutoff"),
              locator:
                'Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 22), the last rows of the "Lunar orbit phase", printed "Translunar injection" (it is transearth injection, at 234:04:33), "Cutoff" row',
            }),
            altitude: cite(63.1, transearthTable("Transearth injection cutoff")),
            speed: cite(8_374.3, transearthTable("Transearth injection cutoff")),
            flightPathAngle: cite(2.46, transearthTable("Transearth injection cutoff")),
          },
          earthFix: {
            latitude: cite(0.71, trajectoryTable("Entry")),
            longitude: cite(-173.34, trajectoryTable("Entry")),
            altitude: cite(65.8, trajectoryTable("Entry")),
            speed: cite(36_090.3, trajectoryTable("Entry")),
            flightPathAngle: cite(-6.49, trajectoryTable("Entry")),
            heading: cite(156.53, trajectoryTable("Entry")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...trajectoryTable("Entry"),
            locator:
              'Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 22), "Entry" row: space-fixed heading 156.53 degrees east of north, so the spacecraft arrived heading south-southeast, still moving east',
          }),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: at("301:38:38", eventsTable("Entry interface (400 000 feet)")),
          end: at("301:51:59", entryTable("Earth Splashdown GET")),
          drogue: at("301:46:22", timeline("Drogue parachute deployed")),
          splashdown: {
            latitude: cite(-17.88, trajectoryTable("Landing"), entryTable("Earth Splashdown Latitude (deg N)")),
            longitude: cite(-166.11, trajectoryTable("Landing"), entryTable("Earth Splashdown Longitude (deg E)")),
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
          kind: "orbit",
          label: "Undocked",
          body: "moon",
          start: at("107:47:56", lunarOrbitTable("CSM/LM separation initiated")),
          end: at("109:22:42", lunarOrbitTable("LM 2 nd descent orbit insertion ignition")),
          ...AT_UNDOCKING,
          sense: RETROGRADE,
          from: "csm",
          endFix: { longitude: cite(-165.78, trajectoryTable("Second descent orbit insertion, Ignition")) },
        },
        {
          // Challenger's own thrusters lowered its orbit's low point for
          // the landing.
          kind: "burn",
          label: "Second descent orbit insertion",
          body: "moon",
          start: at("109:22:42", lunarOrbitTable("LM 2 nd descent orbit insertion ignition")),
          end: at("109:23:03.5", lunarOrbitTable("LM 2 nd descent orbit insertion cutoff")),
          deltaV: cite(7.5, lunarOrbitTable("LM 2 nd descent orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "Descent orbit",
          body: "moon",
          start: at("109:23:03.5", lunarOrbitTable("LM 2 nd descent orbit insertion cutoff")),
          end: at("110:09:53", lunarOrbitTable("LM powered descent initiation")),
          apoapsis: cite(59.6, lunarOrbitTable("LM 2 nd descent orbit insertion cutoff")),
          periapsis: cite(6.2, lunarOrbitTable("LM 2 nd descent orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-166.77, trajectoryTable("Second descent orbit insertion, Cutoff")),
            altitude: cite(59.6, lunarOrbitTable("LM 2 nd descent orbit insertion cutoff")),
            flightPathAngle: cite(0.02, trajectoryTable("Second descent orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(48.75, trajectoryTable("Powered descent initiation")) },
        },
        {
          kind: "descent",
          label: "Powered descent",
          body: "moon",
          start: at("110:09:53", lunarOrbitTable("LM powered descent initiation")),
          end: LANDING,
          site: LANDING_SITE,
        },
        {
          kind: "surface",
          label: "Taurus-Littrow",
          body: "moon",
          start: LANDING,
          end: at("185:21:37", lunarOrbitTable("LM lunar liftoff ignition")),
          site: LANDING_SITE,
        },
        {
          kind: "ascent",
          label: "Lunar liftoff",
          body: "moon",
          start: at("185:21:37", lunarOrbitTable("LM lunar liftoff ignition")),
          end: ASCENT_CUTOFF,
          site: LANDING_SITE,
        },
        {
          kind: "orbit",
          label: "Back in orbit",
          body: "moon",
          start: ASCENT_CUTOFF,
          end: at("185:32:12", lunarOrbitTable("LM vernier adjustment initiated")),
          apoapsis: cite(48.5, lunarOrbitTable("LM ascent orbit cutoff")),
          periapsis: cite(9.1, lunarOrbitTable("LM ascent orbit cutoff")),
          sense: RETROGRADE,
          // Table 3-III publishes where the ascent stage reached orbit.
          startFix: {
            longitude: cite(19.6, trajectoryTable("Ascent (insertion)")),
            altitude: cite(8.0, trajectoryTable("Ascent (insertion)"), lunarOrbitTable("LM ascent orbit cutoff")),
            speed: cite(5_542.3, trajectoryTable("Ascent (insertion)"), lunarOrbitTable("LM ascent orbit cutoff")),
            flightPathAngle: cite(0.34, trajectoryTable("Ascent (insertion)")),
          },
          endFix: { longitude: cite(8.22, trajectoryTable("Vernier adjustment maneuver")) },
        },
        {
          kind: "burn",
          label: "Vernier adjustment",
          body: "moon",
          start: at("185:32:12", lunarOrbitTable("LM vernier adjustment initiated")),
          end: at("185:32:22", lunarOrbitTable("LM vernier adjustment cutoff")),
          deltaV: cite(10.0, lunarOrbitTable("LM vernier adjustment cutoff")),
        },
        {
          kind: "orbit",
          label: "Catching up",
          body: "moon",
          start: at("185:32:22", lunarOrbitTable("LM vernier adjustment cutoff")),
          end: at("186:15:58", lunarOrbitTable("LM terminal phase initiation ignition")),
          apoapsis: cite(48.5, lunarOrbitTable("LM vernier adjustment cutoff")),
          periapsis: cite(9.4, lunarOrbitTable("LM vernier adjustment cutoff")),
          sense: RETROGRADE,
          endFix: { longitude: cite(-129.53, trajectoryTable("Terminal phase initiation")) },
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "moon",
          start: at("186:15:58", lunarOrbitTable("LM terminal phase initiation ignition")),
          end: at("186:16:01.2", lunarOrbitTable("LM terminal phase initiation cutoff")),
          deltaV: cite(53.8, lunarOrbitTable("LM terminal phase initiation cutoff")),
        },
        {
          // No time is published in these sources for the end of braking
          // or for station keeping, so the rendezvous is drawn as closing in
          // all the way to docking.
          kind: "rendezvous",
          label: "Closing in",
          body: "moon",
          start: at("186:16:01.2", lunarOrbitTable("LM terminal phase initiation cutoff")),
          end: at("187:37:15", lunarOrbitTable("CSM/LM docked")),
          target: "csm",
          apoapsis: cite(64.7, lunarOrbitTable("LM terminal phase initiation cutoff")),
          // ILLUSTRATION. Both sources give this orbit a low point of 48.5
          // nautical miles, but Table 3-III puts the burn itself at 44.6
          // nautical miles, and an orbit cannot dip below its own low point.
          // Drawn with the published 48.5, the ascent stage would jump 4
          // miles outward during the 3.2-second burn, so the low point is
          // drawn at the burn's published altitude instead.
          periapsis: {
            ...cite(44.6, {
              ...trajectoryTable("Terminal phase initiation"),
              locator:
                'ILLUSTRATION, not a published low point: the altitude of the "Terminal phase initiation" row of Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 22), used as the low point of the orbit after the burn',
            }),
            discrepancy:
              'Apollo by the Numbers (Lunar Orbit Phase table, "LM terminal phase initiation cutoff" row) and the Mission Report (Table 3-V, printed page 3-6, PDF page 24) both give the orbit after the burn as 64.7 by 48.5 nautical miles, a low point above the 44.6-nautical-mile altitude the Mission Report gives at the burn. The drawing uses 44.6 so the path stays continuous.',
          },
          sense: RETROGRADE,
        },
        {
          kind: "docked",
          label: "Docked",
          start: at("187:37:15", lunarOrbitTable("CSM/LM docked")),
          end: at("191:18:31", lunarOrbitTable("LM ascent stage jettisoned")),
          target: "csm",
        },
      ],
    },
  ],
};

/** One row of the Apollo 17 ascent table (geocentric latitude). */
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
