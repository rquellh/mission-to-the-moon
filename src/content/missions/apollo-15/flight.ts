/**
 * The Apollo 15 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Sources:
 * - Apollo by the Numbers (NASA SP-2000-4029): event times, orbit sizes,
 *   burns, translunar injection, entry, and splashdown time.
 * - Apollo 15 Mission Report (MSC-05161), Table 3-III: where the spacecraft
 *   was at each maneuver, in longitude over the Moon (and latitude and
 *   longitude over Earth), the flight-path angles, the entry altitude, and
 *   the splashdown point. Its times agree with Apollo by the Numbers to the
 *   tenth of a second; each position is used at the Apollo by the Numbers
 *   time of the same event.
 * - NSSDCA Apollo Landing Site Coordinates: where Falcon landed.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The landing site is 26 degrees north of the Moon's equator, so the lunar
 * orbits are drawn in one plane over it (`lunarOrbitPlane`). Table 3-III's
 * lunar latitudes are not used: the model places each lunar fix where that
 * plane crosses its longitude. The plane is the model's default, heading due
 * west over the site at the middle of the stay on the surface; no approach
 * azimuth is published in these sources. The 3-degree plane change of
 * 165:11 hours is drawn as a burn that changes the orbit's size only.
 *
 * Lunar altitudes in these sources are measured from the radius of the
 * landing site (Mission Report Table 3-IV), but neither source prints that
 * radius, so the plan gives no `moonReferenceRadius` and the model measures
 * from the Moon's mean radius (a difference of a mile or two).
 *
 * Drawn by the model, not from published values: where the lunar module's
 * ascent stage reached orbit after liftoff (the engine places insertion at
 * that orbit's low point so the orbit reaches the published terminal phase
 * initiation longitude on time), and the end of the rendezvous, taken as
 * complete at terminal phase finalize (see the lunar module's phases).
 *
 * Left out, because they are too small to see or their sizes are not
 * published: the two outbound midcourse corrections (5.3 and 5.4 feet per
 * second), the 2-foot-per-second separation from the lunar module's ascent
 * stage at 179:50, and the 5.6-foot-per-second correction before entry.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT = "https://ntrs.nasa.gov/api/citations/19720021182/downloads/19720021182.pdf";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271971-07-26%2013:34:00.58%27,%271971-07-26%2016:30:03.61%27,%271971-08-07%2020:32:54.7%27,%271971-08-07%2020:45:53.0%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation] };
}

const ascentTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 15 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_15d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 15 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_15e_Earth_Orbit_Phase.htm`,
});
const lunarOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 15 Lunar Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_15g_Lunar_Orbit_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 15 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_15h_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 15 Timeline, "${row}"`,
  url: `${ABN}Apollo_15i_Timeline.htm`,
});
const tliTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Translunar Injection table, Apollo 15 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const landingTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `LM Lunar Landing table, Apollo 15 column, "${row}"`,
  url: `${ABN}Apollo_18-27_LM_Lunar_Landing.htm`,
});
const entryTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Entry, Splashdown, and Recovery table, Apollo 15 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
const trajectoryTable = (row: string): Citation => ({
  source: "apollo-15-mission-report",
  locator: `Table 3-III, "Trajectory Parameters" (printed page 3-4, PDF page 19), "${row}" row`,
  url: MISSION_REPORT,
});
const LUNAR_SITES: Citation = {
  source: "nssdca-apollo-landing-sites",
  locator: 'Apollo 15, "Lunar Module" row',
  url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
};
const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});

/** Lunar orbits run east to west (retrograde), as Table 3-III shows. */
const RETROGRADE: Cited<"retrograde"> = cite("retrograde", {
  source: "apollo-15-mission-report",
  locator:
    "Table 3-III (printed page 3-4, PDF page 19): every lunar-orbit space-fixed heading angle lies between -40.53 and -131.71 degrees east of north (toward the west), and the longitude decreases from ignition to cutoff at each burn (for example, descent orbit insertion 149.77 W to 151.07 W, transearth injection 167.97 W to 176.32 W)",
  url: MISSION_REPORT,
});

/** Earth orbit runs west to east (prograde). */
const PROGRADE_EOI: Cited<"prograde"> = cite("prograde", {
  ...ascentTable("Earth orbit insertion"),
  locator:
    'Apollo 15 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 95.531 degrees east of north, so the orbit runs west to east',
});

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const LANDING_SITE = {
  latitude: {
    ...cite(26.13239, LUNAR_SITES),
    discrepancy:
      "Apollo by the Numbers (LM Lunar Landing table) gives 26.13222 N, 3.63386 E, and the Mission Report (section 3.2.2) 26 degrees 6 minutes 4 seconds N, 3 degrees 39 minutes 10 seconds E on a 1970 photomap. We follow NSSDCA's coordinates, measured on Lunar Reconnaissance Orbiter images.",
  },
  longitude: {
    ...cite(3.6333, LUNAR_SITES),
    discrepancy:
      "Apollo by the Numbers (LM Lunar Landing table) gives 3.63386 E, and the Mission Report (section 3.2.2) 3 degrees 39 minutes 10 seconds E on a 1970 photomap. We follow NSSDCA, as for the latitude.",
  },
};

/** The descent orbit after the trim burn, which the lunar module kept until powered descent. */
const DESCENT_ORBIT_TRIMMED = {
  apoapsis: cite(60.3, lunarOrbitTable("Descent orbit trim cutoff")),
  periapsis: cite(8.8, lunarOrbitTable("Descent orbit trim cutoff")),
};

/** The command and service module's orbit after the plane change, kept until the orbit-shaping burn. */
const CSM_AFTER_PLANE_CHANGE = {
  apoapsis: cite(64.5, lunarOrbitTable("CSM plane change cutoff")),
  periapsis: cite(53.6, lunarOrbitTable("CSM plane change cutoff")),
};

export const flight: FlightPlan = {
  missionId: "apollo-15",

  lunarOrbitPlane: {
    site: { latitude: LANDING_SITE.latitude, longitude: LANDING_SITE.longitude },
  },

  // The sky is fit at lift-off, translunar injection, entry interface, and
  // splashdown, the moments when Earth-relative positions shape the path.
  sky: [
    {
      time: at("000:00:00.58", timeline("Liftoff (umbilical disconnected).")),
      moonEclipticLongitude: cite(170.2761302, horizons("Moon (301) from Earth's center", "ObsEcLon", "1971-07-26 13:34:00.58")),
      subLunarLongitude: cite(22.756895, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1971-07-26 13:34:00.58")),
      sunEclipticLongitude: cite(122.918668, horizons("Sun (10) from Earth's center", "ObsEcLon", "1971-07-26 13:34:00.58")),
    },
    {
      time: at("002:56:03.61", tliTable("GET")),
      moonEclipticLongitude: cite(171.7335485, horizons("Moon (301) from Earth's center", "ObsEcLon", "1971-07-26 16:30:03.61")),
      subLunarLongitude: cite(339.919672, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1971-07-26 16:30:03.61")),
      sunEclipticLongitude: cite(123.035493, horizons("Sun (10) from Earth's center", "ObsEcLon", "1971-07-26 16:30:03.61")),
    },
    {
      time: at("294:58:54.7", entryTable("Earth Entry GET")),
      moonEclipticLongitude: cite(328.7645714, horizons("Moon (301) from Earth's center", "ObsEcLon", "1971-08-07 20:32:54.7")),
      subLunarLongitude: cite(66.521298, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1971-08-07 20:32:54.7")),
      sunEclipticLongitude: cite(134.6758271, horizons("Sun (10) from Earth's center", "ObsEcLon", "1971-08-07 20:32:54.7")),
    },
    {
      time: at("295:11:53.0", entryTable("Earth Splashdown GET")),
      moonEclipticLongitude: cite(328.896656, horizons("Moon (301) from Earth's center", "ObsEcLon", "1971-08-07 20:45:53.0")),
      subLunarLongitude: cite(63.391375, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1971-08-07 20:45:53.0")),
      sunEclipticLongitude: cite(134.6844558, horizons("Sun (10) from Earth's center", "ObsEcLon", "1971-08-07 20:45:53.0")),
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
          start: at("000:00:00.58", ascentTable("Liftoff")),
          end: at("000:11:44.67", ascentTable("Earth orbit insertion")),
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
            ascentPoint("Mach 1 achieved", "000:01:05.0", 4.224, 28.4497, -80.5854),
            ascentPoint("Maximum dynamic pressure", "000:01:22.0", 7.401, 28.4555, -80.5847),
            ascentPoint("S-IC center engine cutoff*", "000:02:15.96", 25.271, 28.5203, -80.119),
            ascentPoint("S-IC outboard engine cutoff", "000:02:39.56", 36.947, 28.5824, -79.6961),
            ascentPoint("S-IC/S-II separation*", "000:02:41.2", 37.83, 28.5876, -79.6605),
            ascentPoint("S-II outboard engine cutoff", "000:09:09.06", 95.184, 29.681, -63.991),
            ascentPoint("S-II/S-IVB separation*", "000:09:10.1", 95.187, 29.6811, -63.9221),
            ascentPoint("S-IVB 1 st burn cutoff", "000:11:34.67", 93.215, 29.2688, -53.8183),
          ],
        },
        {
          kind: "orbit",
          label: "Earth parking orbit",
          body: "earth",
          start: at("000:11:44.67", earthOrbitTable("Earth orbit insertion")),
          end: at("002:50:02.90", earthOrbitTable("S-IVB 2 nd burn ignition")),
          apoapsis: cite(91.5, earthOrbitTable("Earth orbit insertion")),
          periapsis: cite(89.6, earthOrbitTable("Earth orbit insertion")),
          inclination: cite(29.679, earthOrbitTable("Earth orbit insertion")),
          sense: PROGRADE_EOI,
          // No position is published for the start of translunar injection
          // in these sources, so the orbit runs on freely to the burn.
          startFix: {
            latitude: cite(29.2052, ascentTable("Earth orbit insertion")),
            latitudeKind: "geocentric",
            longitude: cite(-53.0807, ascentTable("Earth orbit insertion")),
            altitude: cite(93.215, ascentTable("Earth orbit insertion")),
            speed: cite(25_602.6, ascentTable("Earth orbit insertion")),
            flightPathAngle: cite(0.015, ascentTable("Earth orbit insertion")),
            heading: cite(95.531, ascentTable("Earth orbit insertion")),
          },
        },
        {
          kind: "burn",
          label: "Translunar injection",
          body: "earth",
          start: at("002:50:02.90", earthOrbitTable("S-IVB 2 nd burn ignition")),
          end: at("002:55:53.61", earthOrbitTable("S-IVB 2 nd burn cutoff")),
          deltaV: cite(10_414.7, earthOrbitTable("S-IVB 2 nd burn cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast to the Moon",
          to: "moon",
          start: at("002:55:53.61", earthOrbitTable("S-IVB 2 nd burn cutoff")),
          end: at("078:31:46.70", lunarOrbitTable("Lunar orbit insertion ignition")),
          earthFix: {
            time: at("002:56:03.61", tliTable("GET")),
            latitude: cite(24.97, tliTable("Geodetic Latitude (deg N)")),
            longitude: cite(-142.1295, tliTable("Longitude (deg E)")),
            altitude: cite(173.679, tliTable("Altitude (n mi)")),
            speed: cite(35_579.1, tliTable("Space-Fixed Velocity (ft/sec)")),
            flightPathAngle: cite(7.43, tliTable("Flight Path Angle (deg)")),
            heading: cite(73.173, tliTable("Heading Angle (deg E of N)")),
          },
          moonFix: {
            longitude: cite(-172.05, trajectoryTable("Lunar orbit insertion, Ignition")),
            altitude: cite(86.7, lunarOrbitTable("Lunar orbit insertion ignition")),
            speed: cite(8_188.6, lunarOrbitTable("Lunar orbit insertion ignition")),
            flightPathAngle: cite(-8.93, trajectoryTable("Lunar orbit insertion, Ignition")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...tliTable("Heading Angle (deg E of N)"),
            locator:
              'Translunar Injection table, Apollo 15 column, "Heading Angle (deg E of N)": 73.173 degrees, so the path leaves Earth heading east',
          }),
        },
        {
          kind: "burn",
          label: "Lunar orbit insertion",
          body: "moon",
          start: at("078:31:46.70", lunarOrbitTable("Lunar orbit insertion ignition")),
          end: at("078:38:25.06", lunarOrbitTable("Lunar orbit insertion cutoff")),
          deltaV: cite(3_000.1, lunarOrbitTable("Lunar orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "First lunar orbits",
          body: "moon",
          start: at("078:38:25.06", lunarOrbitTable("Lunar orbit insertion cutoff")),
          end: at("082:39:49.09", lunarOrbitTable("Descent orbit insertion ignition")),
          apoapsis: cite(170.1, lunarOrbitTable("Lunar orbit insertion cutoff")),
          periapsis: cite(57.7, lunarOrbitTable("Lunar orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(160.08, trajectoryTable("Lunar orbit insertion, Cutoff")),
            altitude: cite(74.1, lunarOrbitTable("Lunar orbit insertion cutoff")),
            flightPathAngle: cite(2.17, trajectoryTable("Lunar orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(-149.77, trajectoryTable("Descent orbit insertion, Ignition")) },
        },
        {
          // On Apollo 15 the command and service module's engine, not the
          // lunar module's, lowered both spacecraft into the descent orbit.
          kind: "burn",
          label: "Descent orbit insertion",
          body: "moon",
          start: at("082:39:49.09", lunarOrbitTable("Descent orbit insertion ignition")),
          end: at("082:40:13.62", lunarOrbitTable("Descent orbit insertion cutoff")),
          deltaV: cite(213.9, lunarOrbitTable("Descent orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "Descent orbit, docked",
          body: "moon",
          start: at("082:40:13.62", lunarOrbitTable("Descent orbit insertion cutoff")),
          end: at("100:39:16.2", lunarOrbitTable("LM undocking and separation")),
          apoapsis: cite(58.5, lunarOrbitTable("Descent orbit insertion cutoff")),
          periapsis: cite(9.6, lunarOrbitTable("Descent orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-151.07, trajectoryTable("Descent orbit insertion, Cutoff")),
            altitude: cite(54.9, lunarOrbitTable("Descent orbit insertion cutoff")),
            flightPathAngle: cite(0.02, trajectoryTable("Descent orbit insertion, Cutoff")),
          },
          // The 30.40-second trim burn (3.2 feet per second) is drawn as a
          // step in the orbit's size, not as a burn of its own. Table
          // 3-III's cutoff longitude for it (143.20 E, 61 degrees from the
          // ignition longitude 30 seconds earlier) cannot be right, so no
          // position is pinned there.
          sizes: [
            {
              time: at("095:56:44.70", lunarOrbitTable("Descent orbit trim ignition")),
              apoapsis: cite(58.5, lunarOrbitTable("Descent orbit insertion cutoff")),
              periapsis: cite(9.6, lunarOrbitTable("Descent orbit insertion cutoff")),
            },
            {
              time: at("095:57:15.10", lunarOrbitTable("Descent orbit trim cutoff")),
              ...DESCENT_ORBIT_TRIMMED,
            },
          ],
          endFix: { longitude: cite(33.58, trajectoryTable("Command and service module/lunar module separation")) },
        },
        {
          kind: "orbit",
          label: "Descent orbit, undocked",
          body: "moon",
          start: at("100:39:16.2", lunarOrbitTable("LM undocking and separation")),
          end: at("101:38:58.98", lunarOrbitTable("CSM orbit circularization ignition")),
          ...DESCENT_ORBIT_TRIMMED,
          sense: RETROGRADE,
          endFix: {
            longitude: cite(-157.78, trajectoryTable("Command and service module circularization, Ignition")),
          },
        },
        {
          kind: "burn",
          label: "Circularization",
          body: "moon",
          start: at("101:38:58.98", lunarOrbitTable("CSM orbit circularization ignition")),
          end: at("101:39:02.65", lunarOrbitTable("CSM orbit circularization cutoff")),
          deltaV: cite(68.3, lunarOrbitTable("CSM orbit circularization cutoff")),
        },
        {
          // Table 3-III's cutoff row for this burn (24.56 N, 26.56 E, half a
          // world from the ignition row 3.7 seconds earlier) cannot be right,
          // so the orbit starts from the burn without a start fix.
          kind: "orbit",
          label: "Science orbit",
          body: "moon",
          start: at("101:39:02.65", lunarOrbitTable("CSM orbit circularization cutoff")),
          end: at("165:11:32.74", lunarOrbitTable("CSM plane change ignition")),
          apoapsis: cite(65.2, lunarOrbitTable("CSM orbit circularization cutoff")),
          periapsis: cite(54.8, lunarOrbitTable("CSM orbit circularization cutoff")),
          sense: RETROGRADE,
          endFix: { longitude: cite(96.94, trajectoryTable("Command and service module plane change, Ignition")) },
        },
        {
          kind: "burn",
          label: "Plane change",
          body: "moon",
          start: at("165:11:32.74", lunarOrbitTable("CSM plane change ignition")),
          end: at("165:11:51.05", lunarOrbitTable("CSM plane change cutoff")),
          deltaV: cite(330.6, lunarOrbitTable("CSM plane change cutoff")),
        },
        {
          kind: "orbit",
          label: "Waiting for Falcon",
          body: "moon",
          start: at("165:11:51.05", lunarOrbitTable("CSM plane change cutoff")),
          end: at("173:36:25.5", lunarOrbitTable("CSM/LM docked")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          startFix: {
            longitude: cite(96.0, trajectoryTable("Command and service module plane change, Cutoff")),
            altitude: cite(62, lunarOrbitTable("CSM plane change cutoff")),
            flightPathAngle: cite(0.01, trajectoryTable("Command and service module plane change, Cutoff")),
          },
          endFix: { longitude: cite(5.35, trajectoryTable("Lunar orbit phase, Docking")) },
        },
        {
          kind: "orbit",
          label: "Lunar orbit, docked",
          body: "moon",
          start: at("173:36:25.5", lunarOrbitTable("CSM/LM docked")),
          end: at("179:30:01.4", lunarOrbitTable("LM ascent stage jettisoned")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          endFix: { longitude: cite(7.89, trajectoryTable("Lunar module jettison")) },
        },
        {
          kind: "orbit",
          label: "Lunar orbit after jettison",
          body: "moon",
          start: at("179:30:01.4", lunarOrbitTable("LM ascent stage jettisoned")),
          end: at("221:20:48.02", lunarOrbitTable("CSM orbit shaping maneuver ignition")),
          ...CSM_AFTER_PLANE_CHANGE,
          sense: RETROGRADE,
          endFix: { longitude: cite(-87.71, trajectoryTable("Shaping maneuver, Ignition")) },
        },
        {
          kind: "burn",
          label: "Orbit shaping",
          body: "moon",
          start: at("221:20:48.02", lunarOrbitTable("CSM orbit shaping maneuver ignition")),
          end: at("221:20:51.44", lunarOrbitTable("CSM orbit shaping maneuver cutoff")),
          deltaV: cite(66.4, lunarOrbitTable("CSM orbit shaping maneuver cutoff")),
        },
        {
          kind: "orbit",
          label: "Last lunar orbits",
          body: "moon",
          start: at("221:20:51.44", lunarOrbitTable("CSM orbit shaping maneuver cutoff")),
          end: at("223:48:45.84", transearthTable("Transearth injection ignition")),
          apoapsis: cite(76.0, lunarOrbitTable("CSM orbit shaping maneuver cutoff")),
          periapsis: cite(54.3, lunarOrbitTable("CSM orbit shaping maneuver cutoff")),
          sense: RETROGRADE,
          // No start fix: the orbit starts from the burn. The published cutoff
          // state (87.90 W, 53.7 nautical miles) is not pinned because it does
          // not fit the orbits around it: its altitude is below this orbit's
          // published perilune (54.3), and the orbit before, kept at its
          // 64.5-by-53.6 size from the plane change two days earlier, is
          // about 5 nautical miles higher there in the model, so pinning both
          // made the ship drop that far in the 3.42-second burn.
          endFix: { longitude: cite(-167.97, trajectoryTable("Transearth injection, Ignition")) },
        },
        {
          kind: "burn",
          label: "Transearth injection",
          body: "moon",
          start: at("223:48:45.84", transearthTable("Transearth injection ignition")),
          end: at("223:51:06.74", transearthTable("Transearth injection cutoff")),
          deltaV: cite(3_046.8, transearthTable("Transearth injection cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast home",
          to: "earth",
          start: at("223:51:06.74", transearthTable("Transearth injection cutoff")),
          end: at("294:58:54.7", entryTable("Earth Entry GET")),
          moonFix: {
            longitude: cite(-176.32, trajectoryTable("Transearth injection, Cutoff")),
            altitude: cite(71.8, transearthTable("Transearth injection cutoff")),
            speed: cite(8_272.4, transearthTable("Transearth injection cutoff")),
            flightPathAngle: cite(4.43, transearthTable("Transearth injection cutoff")),
          },
          earthFix: {
            latitude: cite(14.23, entryTable("Earth Entry Geodetic Latitude (deg N)")),
            longitude: cite(-175.02, entryTable("Earth Entry Longitude (deg E)")),
            altitude: cite(65.9, trajectoryTable("Entry and landing phases, Entry")),
            speed: cite(36_096.4, entryTable("Earth Entry Velocity (ft/sec)")),
            flightPathAngle: cite(-6.51, entryTable("Earth Entry Flight Path Angle")),
            heading: cite(52.06, entryTable("Earth Entry Heading Angle (deg)")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...entryTable("Earth Entry Heading Angle (deg)"),
            locator:
              'Entry, Splashdown, and Recovery table, Apollo 15 column, "Heading Angle": 52.06 degrees, so the spacecraft arrived heading east',
          }),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: at("294:58:54.7", entryTable("Earth Entry GET")),
          end: at("295:11:53.0", entryTable("Earth Splashdown GET")),
          drogue: at("295:06:46", timeline("Drogue parachute deployed.")),
          splashdown: {
            latitude: cite(26.13, trajectoryTable("Entry and landing phases, Landing"), entryTable("Earth Splashdown Latitude (deg N)")),
            longitude: {
              ...cite(-158.14, trajectoryTable("Entry and landing phases, Landing"), {
                source: "apollo-15-mission-report",
                locator:
                  'Section 3.3, "Transearth and Entry Trajectory" (printed page 3-9, PDF page 24): best estimate of the landing point "26 degrees 7 minutes 48 seconds north latitude and 158 degrees 8 minutes 24 seconds west longitude"',
                url: MISSION_REPORT,
              }),
              discrepancy:
                "Apollo by the Numbers (Entry, Splashdown, and Recovery table) gives longitude -158.13. We follow the Mission Report's best estimate, 158 degrees 8 minutes 24 seconds west (158.14 W).",
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
          kind: "orbit",
          label: "Undocked",
          body: "moon",
          start: at("100:39:16.2", lunarOrbitTable("LM undocking and separation")),
          end: at("104:30:09.4", lunarOrbitTable("LM powered descent initiation")),
          ...DESCENT_ORBIT_TRIMMED,
          sense: RETROGRADE,
          from: "csm",
          endFix: { longitude: cite(22.5, trajectoryTable("Powered descent initiation")) },
        },
        {
          kind: "descent",
          label: "Powered descent",
          body: "moon",
          start: at("104:30:09.4", lunarOrbitTable("LM powered descent initiation")),
          end: at("104:42:29.3", landingTable("GET")),
          site: LANDING_SITE,
        },
        {
          kind: "surface",
          label: "Hadley-Apennine",
          body: "moon",
          start: at("104:42:29.3", landingTable("GET")),
          end: at("171:37:23.2", lunarOrbitTable("LM lunar liftoff ignition")),
          site: LANDING_SITE,
        },
        {
          kind: "ascent",
          label: "Lunar liftoff",
          body: "moon",
          start: at("171:37:23.2", lunarOrbitTable("LM lunar liftoff ignition")),
          end: at("171:44:34.2", lunarOrbitTable("LM ascent orbit cutoff")),
          site: LANDING_SITE,
        },
        {
          kind: "orbit",
          label: "Catching up",
          body: "moon",
          start: at("171:44:34.2", lunarOrbitTable("LM ascent orbit cutoff")),
          end: at("172:29:40.0", lunarOrbitTable("LM terminal phase initiation ignition")),
          apoapsis: cite(42.5, lunarOrbitTable("LM ascent orbit cutoff")),
          periapsis: cite(9.0, lunarOrbitTable("LM ascent orbit cutoff")),
          sense: RETROGRADE,
          // ILLUSTRATION. Neither source gives where the ascent stage
          // reached orbit. With no start fix, the engine places insertion at
          // this orbit's low point so that the orbit reaches the published
          // terminal phase initiation longitude at its published time (see
          // src/sim/build.ts).
          endFix: { longitude: cite(-150.83, trajectoryTable("Terminal phase initiation")) },
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "moon",
          start: at("172:29:40.0", lunarOrbitTable("LM terminal phase initiation ignition")),
          end: at("172:29:42.6", lunarOrbitTable("LM terminal phase initiation cutoff")),
          deltaV: cite(72.7, lunarOrbitTable("LM terminal phase initiation cutoff")),
        },
        {
          // The rendezvous is drawn as complete at terminal phase finalize,
          // when the first braking maneuver began close to Endeavour
          // (Mission Report Table 3-II), and the 25 minutes of braking and
          // closing in before docking as flying alongside.
          kind: "rendezvous",
          label: "Closing in",
          body: "moon",
          start: at("172:29:42.6", lunarOrbitTable("LM terminal phase initiation cutoff")),
          end: at("173:11:07", timeline("Terminal phase finalize.")),
          target: "csm",
          apoapsis: cite(64.4, lunarOrbitTable("LM terminal phase initiation cutoff")),
          periapsis: cite(38.7, lunarOrbitTable("LM terminal phase initiation cutoff")),
          sense: RETROGRADE,
        },
        {
          kind: "station",
          label: "Braking and docking approach",
          start: at("173:11:07", timeline("Terminal phase finalize.")),
          end: at("173:36:25.5", lunarOrbitTable("CSM/LM docked")),
          target: "csm",
        },
        {
          kind: "docked",
          label: "Docked",
          start: at("173:36:25.5", lunarOrbitTable("CSM/LM docked")),
          end: at("179:30:01.4", lunarOrbitTable("LM ascent stage jettisoned")),
          target: "csm",
        },
      ],
    },
  ],
};

/** One row of the Apollo 15 ascent table (geocentric latitude). */
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
