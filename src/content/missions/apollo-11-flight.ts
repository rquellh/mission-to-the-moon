/**
 * The Apollo 11 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Sources:
 * - Apollo by the Numbers (NASA SP-2000-4029): event times, orbit sizes,
 *   burns, translunar injection, entry, and splashdown. The canonical source.
 * - Apollo 11 Mission Report (MSC-00171), Table 7-II: where the spacecraft
 *   was at each burn, in latitude and longitude over Earth or the Moon.
 *   (Its times differ from Apollo by the Numbers by up to 0.2 seconds; each
 *   position is used at the Apollo by the Numbers time of the same event.)
 * - NSSDCA Apollo Landing Site Coordinates: where Eagle landed.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * Mission Report Table 7-II latitudes for the lunar orbits (all within 1.6
 * degrees of the lunar equator) are not used: the model draws lunar orbits
 * in the Moon's equatorial plane.
 */
import type { Citation, Cited, ElapsedTime } from "../types";
import type { FlightPlan } from "../../sim/types";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT =
  "https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf";
const DESCENT_ASCENT = "https://ntrs.nasa.gov/api/citations/19700024568/downloads/19700024568.pdf";
const OVERVIEW = "https://www.nasa.gov/missions/apollo/apollo-11-mission-overview/";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271969-07-16%2016:22:13.03%27,%271969-07-24%2016:35:05.7%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation] };
}

const ascentTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 11 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_11d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 11 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_11e_Earth_Orbit_Phase.htm`,
});
const lunarOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 11 Lunar Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_11g_Lunar_Orbit_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 11 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_11h_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 11 Timeline, "${row}"`,
  url: `${ABN}Apollo_11i_Timeline.htm`,
});
const tliTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Translunar Injection table, Apollo 11 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const landingTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `LM Lunar Landing table, Apollo 11 column, "${row}"`,
  url: `${ABN}Apollo_18-27_LM_Lunar_Landing.htm`,
});
const entryTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Entry, Splashdown, and Recovery table, Apollo 11 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
const trajectoryTable = (row: string): Citation => ({
  source: "apollo-11-mission-report",
  locator: `Table 7-II, "Trajectory Parameters" (page 7-9), "${row}" row`,
  url: MISSION_REPORT,
});
const LUNAR_SITES: Citation = {
  source: "nssdca-apollo-landing-sites",
  locator: 'Apollo 11, "Lunar Module" row',
  url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
};
const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});

/** Lunar orbits run east to west (retrograde), as these sources show. */
const RETROGRADE: Cited<"retrograde"> = cite(
  "retrograde",
  {
    source: "apollo-lunar-descent-ascent-trajectories",
    locator:
      'PDF pages 23 and 24: West Crater is "approximately 3 nautical miles west" of the landing area\'s center, and the descent headed toward it because of a navigation error of "approximately 3 nautical miles down range", so down range (the direction of travel) was west',
    url: DESCENT_ASCENT,
  },
  {
    source: "apollo-11-mission-report",
    locator:
      "Table 7-II (page 7-9): at every lunar orbit burn the longitude decreases from ignition to cutoff (for example, circularization 170.09E to 169.16E), so the spacecraft moved westward",
    url: MISSION_REPORT,
  },
);

/** Earth orbit and the coasts run west to east (prograde). */
const PROGRADE_EOI: Cited<"prograde"> = cite("prograde", {
  ...ascentTable("Earth orbit insertion"),
  locator:
    'Apollo 11 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 88.848 degrees east of north, so the orbit runs west to east',
});

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const LANDING_SITE = {
  latitude: cite(0.67416, LUNAR_SITES),
  longitude: cite(23.47314, LUNAR_SITES),
};

const CSM_PARKING_ORBIT = {
  apoapsis: cite(66.1, lunarOrbitTable("Lunar orbit circularization cutoff")),
  periapsis: cite(54.5, lunarOrbitTable("Lunar orbit circularization cutoff")),
};

const CSM_ORBIT_AFTER_SEPARATION = {
  apoapsis: cite(63.7, lunarOrbitTable("CSM/LM separation cutoff")),
  periapsis: cite(56.0, lunarOrbitTable("CSM/LM separation cutoff")),
};

export const apollo11Flight: FlightPlan = {
  missionId: "apollo-11",

  moonReferenceRadius: cite(937.14, {
    source: "apollo-11-mission-report",
    locator:
      'Table 5-IV, "Lunar Landing Coordinates" (page 5-15), "Best estimate trajectory" row, radius of Landing Site 2 (miles). Table 7-I defines lunar altitudes as referenced to Landing Site 2',
    url: MISSION_REPORT,
  }),

  // The sky is fit at translunar injection and at entry, the two moments
  // when Earth-relative positions shape the path.
  sky: [
    {
      time: at("002:50:13.03", tliTable("GET")),
      moonEclipticLongitude: cite(136.8221387, horizons("Moon (301) from Earth's center", "ObsEcLon", "1969-07-16 16:22:13.03")),
      subLunarLongitude: cite(320.339872, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1969-07-16 16:22:13.03")),
      sunEclipticLongitude: cite(113.9370697, horizons("Sun (10) from Earth's center", "ObsEcLon", "1969-07-16 16:22:13.03")),
    },
    {
      time: at("195:03:05.7", entryTable("Earth Entry GET")),
      moonEclipticLongitude: cite(239.6496456, horizons("Moon (301) from Earth's center", "ObsEcLon", "1969-07-24 16:35:05.7")),
      subLunarLongitude: cite(45.35307, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1969-07-24 16:35:05.7")),
      sunEclipticLongitude: cite(121.5828807, horizons("Sun (10) from Earth's center", "ObsEcLon", "1969-07-24 16:35:05.7")),
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
          end: at("000:11:49.33", ascentTable("Earth orbit insertion")),
          site: {
            latitude: cite(28.447, ascentTable("Liftoff")),
            latitudeKind: "geocentric",
            longitude: cite(-80.6041, ascentTable("Liftoff")),
          },
          // The "S-IC center engine cutoff" row is left out: its longitude
          // (-81.1517) lies west of the launch pad, out of line with the rows
          // before and after it. The model lets the orbit itself take over in
          // the last 30 seconds before insertion, so the "S-IVB 1st burn
          // cutoff" row is listed but not drawn through.
          track: [
            ascentPoint("Mach 1 achieved", "000:01:06.3", 4.236, 28.4523, -80.5853),
            ascentPoint("Maximum dynamic pressure", "000:01:23.0", 7.326, 28.4624, -80.5499),
            ascentPoint("S-IC outboard engine cutoff", "000:02:41.63", 35.701, 28.7007, -79.6908),
            ascentPoint("S-IC/S-II separation", "000:02:42.30", 36.029, 28.7046, -79.6764),
            ascentPoint("S-II center engine cutoff", "000:07:40.62", 97.28, 30.9513, -69.4309),
            ascentPoint("S-II outboard engine cutoff", "000:09:08.22", 101.142, 31.7089, -64.1983),
            ascentPoint("S-II/S-IVB separation", "000:09:09.00", 101.175, 31.7152, -64.1467),
            ascentPoint("S-IVB 1 st burn cutoff", "000:11:39.33", 103.202, 32.4865, -53.4588),
          ],
        },
        {
          kind: "orbit",
          label: "Earth parking orbit",
          body: "earth",
          start: at("000:11:49.33", earthOrbitTable("Earth orbit insertion")),
          end: at("002:44:16.20", earthOrbitTable("S-IVB 2 nd burn ignition")),
          apoapsis: cite(100.4, earthOrbitTable("Earth orbit insertion")),
          periapsis: cite(98.9, earthOrbitTable("Earth orbit insertion")),
          inclination: cite(32.521, earthOrbitTable("Earth orbit insertion")),
          sense: PROGRADE_EOI,
          startFix: {
            latitude: cite(32.5027, ascentTable("Earth orbit insertion")),
            latitudeKind: "geocentric",
            longitude: cite(-52.6491, ascentTable("Earth orbit insertion")),
            altitude: cite(103.176, ascentTable("Earth orbit insertion")),
            speed: cite(25_567.9, ascentTable("Earth orbit insertion")),
            flightPathAngle: cite(0.012, ascentTable("Earth orbit insertion")),
            heading: cite(88.848, ascentTable("Earth orbit insertion")),
          },
          endFix: {
            latitude: cite(-5.03, trajectoryTable("S-IVB second ignition")),
            longitude: cite(172.55, trajectoryTable("S-IVB second ignition")),
          },
        },
        {
          kind: "burn",
          label: "Translunar injection",
          body: "earth",
          start: at("002:44:16.20", earthOrbitTable("S-IVB 2 nd burn ignition")),
          end: at("002:50:03.03", earthOrbitTable("S-IVB 2 nd burn cutoff")),
          deltaV: cite(10_008.1, earthOrbitTable("S-IVB 2 nd burn cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast to the Moon",
          to: "moon",
          start: at("002:50:03.03", earthOrbitTable("S-IVB 2 nd burn cutoff")),
          end: at("075:49:50.37", lunarOrbitTable("Lunar orbit insertion ignition")),
          earthFix: {
            time: at("002:50:13.03", tliTable("GET")),
            latitude: cite(9.983, tliTable("Geodetic Latitude (deg N)")),
            longitude: cite(-164.8373, tliTable("Longitude (deg E)")),
            altitude: cite(180.581, tliTable("Altitude (n mi)")),
            speed: cite(35_545.6, tliTable("Space-Fixed Velocity (ft/sec)")),
            flightPathAngle: cite(7.367, tliTable("Flight Path Angle (deg)")),
            heading: cite(60.073, tliTable("Heading Angle (deg E of N)")),
          },
          moonFix: {
            longitude: cite(
              -169.58,
              trajectoryTable("Lunar orbit insertion, Ignition"),
              {
                source: "nasa-apollo-11-mission-overview",
                locator:
                  'Mission Highlights: "after Apollo 11 had flown behind the moon out of contact with Earth, came the first lunar orbit insertion maneuver" (169.58 degrees west is on the far side)',
                url: OVERVIEW,
              },
            ),
            altitude: cite(86.7, lunarOrbitTable("Lunar orbit insertion ignition")),
            speed: cite(8_250.0, lunarOrbitTable("Lunar orbit insertion ignition")),
            flightPathAngle: cite(-9.99, trajectoryTable("Lunar orbit insertion, Ignition")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...tliTable("Heading Angle (deg E of N)"),
            locator:
              'Translunar Injection table, Apollo 11 column, "Heading Angle (deg E of N)": 60.073 degrees, so the path leaves Earth heading east',
          }),
          freeReturn: cite(true, {
            source: "nasa-apollo-11-mission-overview",
            locator:
              'Mission Objective: "This was to be the last Apollo mission to fly a \'free-return\' trajectory, which would enable a return to Earth with no engine firing"',
            url: OVERVIEW,
          }),
        },
        {
          kind: "burn",
          label: "Lunar orbit insertion",
          body: "moon",
          start: at("075:49:50.37", lunarOrbitTable("Lunar orbit insertion ignition")),
          end: at("075:55:47.90", lunarOrbitTable("Lunar orbit insertion cutoff")),
          deltaV: cite(2_917.5, lunarOrbitTable("Lunar orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "First lunar orbit",
          body: "moon",
          start: at("075:55:47.90", lunarOrbitTable("Lunar orbit insertion cutoff")),
          end: at("080:11:36.75", lunarOrbitTable("Lunar orbit circularization ignition")),
          apoapsis: cite(169.7, lunarOrbitTable("Lunar orbit insertion cutoff")),
          periapsis: cite(60.0, lunarOrbitTable("Lunar orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(167.13, trajectoryTable("Lunar orbit insertion, Cutoff")),
            altitude: cite(60.1, lunarOrbitTable("Lunar orbit insertion cutoff")),
            flightPathAngle: cite(-0.2, trajectoryTable("Lunar orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(170.09, trajectoryTable("Lunar orbit circularization, Ignition")) },
        },
        {
          kind: "burn",
          label: "Lunar orbit circularization",
          body: "moon",
          start: at("080:11:36.75", lunarOrbitTable("Lunar orbit circularization ignition")),
          end: at("080:11:53.63", lunarOrbitTable("Lunar orbit circularization cutoff")),
          deltaV: cite(158.8, lunarOrbitTable("Lunar orbit circularization cutoff")),
        },
        {
          kind: "orbit",
          label: "Lunar orbit",
          body: "moon",
          start: at("080:11:53.63", lunarOrbitTable("Lunar orbit circularization cutoff")),
          end: at("100:12:00", lunarOrbitTable("CSM/LM undocked")),
          ...CSM_PARKING_ORBIT,
          sense: RETROGRADE,
          startFix: {
            longitude: cite(169.16, trajectoryTable("Lunar orbit circularization, Cutoff")),
            altitude: cite(61.6, lunarOrbitTable("Lunar orbit circularization cutoff")),
            flightPathAngle: cite(0.32, trajectoryTable("Lunar orbit circularization, Cutoff")),
          },
          endFix: { longitude: cite(116.21, trajectoryTable("Undocking")) },
        },
        {
          kind: "orbit",
          label: "Lunar orbit, undocked",
          body: "moon",
          start: at("100:12:00", lunarOrbitTable("CSM/LM undocked")),
          end: at("100:39:52.9", lunarOrbitTable("CSM/LM separation ignition")),
          ...CSM_PARKING_ORBIT,
          sense: RETROGRADE,
          endFix: { longitude: cite(31.86, trajectoryTable("Separation, Ignition")) },
        },
        {
          kind: "burn",
          label: "Separation from the lunar module",
          body: "moon",
          start: at("100:39:52.9", lunarOrbitTable("CSM/LM separation ignition")),
          end: at("100:40:01.9", lunarOrbitTable("CSM/LM separation cutoff")),
          deltaV: cite(2.7, lunarOrbitTable("CSM/LM separation cutoff")),
        },
        {
          kind: "orbit",
          label: "Lunar orbit, waiting for Eagle",
          body: "moon",
          start: at("100:40:01.9", lunarOrbitTable("CSM/LM separation cutoff")),
          end: at("128:03:00.0", lunarOrbitTable("CSM/LM docked")),
          ...CSM_ORBIT_AFTER_SEPARATION,
          sense: RETROGRADE,
          startFix: {
            longitude: cite(31.41, trajectoryTable("Separation, Cutoff")),
            altitude: cite(62.5, lunarOrbitTable("CSM/LM separation cutoff")),
            flightPathAngle: cite(-0.16, trajectoryTable("Separation, Cutoff")),
          },
          endFix: { longitude: cite(67.31, trajectoryTable("Docking")) },
        },
        {
          kind: "orbit",
          label: "Lunar orbit, docked",
          body: "moon",
          start: at("128:03:00.0", lunarOrbitTable("CSM/LM docked")),
          end: at("130:09:31.2", lunarOrbitTable("LM ascent stage jettisoned")),
          ...CSM_ORBIT_AFTER_SEPARATION,
          sense: RETROGRADE,
          endFix: { longitude: cite(41.85, trajectoryTable("Ascent stage jettison")) },
        },
        {
          kind: "orbit",
          label: "Lunar orbit after jettison",
          body: "moon",
          start: at("130:09:31.2", lunarOrbitTable("LM ascent stage jettisoned")),
          end: at("130:30:01.0", lunarOrbitTable("CSM/LM final separation ignition")),
          ...CSM_ORBIT_AFTER_SEPARATION,
          sense: RETROGRADE,
          endFix: { longitude: cite(-20.19, trajectoryTable("Final separation, Ignition")) },
        },
        {
          kind: "burn",
          label: "Final separation",
          body: "moon",
          start: at("130:30:01.0", lunarOrbitTable("CSM/LM final separation ignition")),
          end: at("130:30:08.1", lunarOrbitTable("CSM/LM final separation cutoff")),
          deltaV: cite(2.2, lunarOrbitTable("CSM/LM final separation cutoff")),
        },
        {
          kind: "orbit",
          label: "Last lunar orbits",
          body: "moon",
          start: at("130:30:08.1", lunarOrbitTable("CSM/LM final separation cutoff")),
          end: at("135:23:42.28", transearthTable("Transearth injection ignition")),
          apoapsis: cite(62.7, lunarOrbitTable("CSM/LM final separation cutoff")),
          periapsis: cite(54.0, lunarOrbitTable("CSM/LM final separation cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-20.58, trajectoryTable("Final separation, Cutoff")),
            altitude: cite(62.7, lunarOrbitTable("CSM/LM final separation cutoff")),
            flightPathAngle: cite(-0.02, trajectoryTable("Final separation, Cutoff")),
          },
          endFix: {
            longitude: cite(
              164.02,
              trajectoryTable("Transearth injection, Ignition"),
              {
                source: "nasa-apollo-11-mission-overview",
                locator:
                  'Mission Highlights: transearth injection "when Columbia was behind the moon" (164.02 degrees east is on the far side)',
                url: OVERVIEW,
              },
            ),
          },
        },
        {
          kind: "burn",
          label: "Transearth injection",
          body: "moon",
          start: at("135:23:42.28", transearthTable("Transearth injection ignition")),
          end: at("135:26:13.69", transearthTable("Transearth injection cutoff")),
          deltaV: cite(3_279.0, transearthTable("Transearth injection cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast home",
          to: "earth",
          start: at("135:26:13.69", transearthTable("Transearth injection cutoff")),
          end: at("195:03:05.7", entryTable("Earth Entry GET")),
          moonFix: {
            longitude: cite(154.02, trajectoryTable("Transearth injection, Cutoff")),
            altitude: cite(58.1, transearthTable("Transearth injection cutoff")),
            speed: cite(8_589.0, transearthTable("Transearth injection cutoff")),
            flightPathAngle: cite(5.13, transearthTable("Transearth injection cutoff")),
          },
          earthFix: {
            latitude: cite(-3.19, entryTable("Earth Entry Geodetic Latitude (deg N)")),
            longitude: cite(171.96, entryTable("Earth Entry Longitude (deg E)")),
            altitude: cite(65.8, {
              source: "apollo-11-mission-report",
              locator: 'Table 7-VII, "Entry Trajectory Parameters" (page 7-12): entry interface (400 000 feet altitude), altitude 65.8 miles',
              url: MISSION_REPORT,
            }),
            speed: cite(36_194.4, entryTable("Earth Entry Velocity (ft/sec)")),
            flightPathAngle: cite(-6.48, entryTable("Earth Entry Flight Path Angle")),
            heading: cite(50.18, entryTable("Earth Entry Heading Angle (deg)")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...entryTable("Earth Entry Heading Angle (deg)"),
            locator:
              'Entry, Splashdown, and Recovery table, Apollo 11 column, "Heading Angle": 50.18 degrees, so the spacecraft arrived heading east',
          }),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: at("195:03:05.7", entryTable("Earth Entry GET")),
          end: at("195:18:35", entryTable("Earth Splashdown GET")),
          drogue: at("195:12:06.9", timeline("Drogue parachute deployed")),
          splashdown: {
            latitude: cite(13.3, entryTable("Earth Splashdown Latitude (deg N)")),
            longitude: cite(-169.15, entryTable("Earth Splashdown Longitude (deg E)")),
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
          start: at("100:12:00", lunarOrbitTable("CSM/LM undocked")),
          end: at("101:36:14.0", lunarOrbitTable("LM descent orbit insertion ignition")),
          ...CSM_PARKING_ORBIT,
          sense: RETROGRADE,
          from: "csm",
          endFix: { longitude: cite(-140.2, trajectoryTable("Descent orbit insertion, Ignition")) },
        },
        {
          kind: "burn",
          label: "Descent orbit insertion",
          body: "moon",
          start: at("101:36:14.0", lunarOrbitTable("LM descent orbit insertion ignition")),
          end: at("101:36:44.0", lunarOrbitTable("LM descent orbit insertion cutoff")),
          deltaV: cite(76.4, lunarOrbitTable("LM descent orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "Descent orbit",
          body: "moon",
          start: at("101:36:44.0", lunarOrbitTable("LM descent orbit insertion cutoff")),
          end: at("102:33:05.01", lunarOrbitTable("LM powered descent initiation")),
          // The table prints the descent orbit (58.5 by 7.8) on the powered
          // descent initiation row; its descent orbit insertion row shows
          // 64.3 by 55.6, which does not reach the 50,000-foot starting
          // height of powered descent.
          apoapsis: {
            ...cite(58.5, lunarOrbitTable("LM powered descent initiation")),
            discrepancy:
              'The "LM descent orbit insertion cutoff" row lists 64.3 by 55.6 nautical miles. We follow the powered descent initiation row, which matches a descent from about 60 nautical miles to 50,000 feet (NASA TM X-58040).',
          },
          periapsis: cite(7.8, lunarOrbitTable("LM powered descent initiation")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-141.88, trajectoryTable("Descent orbit insertion, Cutoff")),
            altitude: cite(57.8, lunarOrbitTable("LM descent orbit insertion cutoff")),
            flightPathAngle: cite(-0.06, trajectoryTable("Descent orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(39.39, trajectoryTable("Powered descent initiation")) },
        },
        {
          kind: "descent",
          label: "Powered descent",
          body: "moon",
          start: at("102:33:05.01", lunarOrbitTable("LM powered descent initiation")),
          end: at("102:45:39.9", landingTable("GET")),
          site: LANDING_SITE,
        },
        {
          kind: "surface",
          label: "Tranquility Base",
          body: "moon",
          start: at("102:45:39.9", landingTable("GET")),
          end: at("124:22:00.79", lunarOrbitTable("LM lunar liftoff ignition")),
          site: LANDING_SITE,
        },
        {
          kind: "ascent",
          label: "Lunar liftoff",
          body: "moon",
          start: at("124:22:00.79", lunarOrbitTable("LM lunar liftoff ignition")),
          end: at("124:29:15.67", lunarOrbitTable("LM orbit insertion cutoff")),
          site: LANDING_SITE,
        },
        {
          kind: "orbit",
          label: "Catching up",
          body: "moon",
          start: at("124:29:15.67", lunarOrbitTable("LM orbit insertion cutoff")),
          end: at("125:19:35.0", lunarOrbitTable("LM coelliptic sequence initiation ignition")),
          apoapsis: cite(48.0, lunarOrbitTable("LM orbit insertion cutoff")),
          periapsis: cite(9.4, lunarOrbitTable("LM orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(12.99, trajectoryTable("Lunar orbit engine cutoff")),
            altitude: cite(10.0, lunarOrbitTable("LM orbit insertion cutoff")),
            flightPathAngle: cite(0.28, trajectoryTable("Lunar orbit engine cutoff")),
          },
          endFix: { longitude: cite(-147.12, trajectoryTable("Coelliptic sequence initiation, Ignition")) },
        },
        {
          kind: "burn",
          label: "Coelliptic sequence initiation",
          body: "moon",
          start: at("125:19:35.0", lunarOrbitTable("LM coelliptic sequence initiation ignition")),
          end: at("125:20:22.0", lunarOrbitTable("LM coelliptic sequence initiation cutoff")),
          deltaV: cite(51.5, lunarOrbitTable("LM coelliptic sequence initiation cutoff")),
        },
        {
          kind: "orbit",
          label: "Coelliptic orbit",
          body: "moon",
          start: at("125:20:22.0", lunarOrbitTable("LM coelliptic sequence initiation cutoff")),
          end: at("126:17:49.6", lunarOrbitTable("LM constant differential height ignition")),
          apoapsis: cite(49.3, lunarOrbitTable("LM coelliptic sequence initiation cutoff")),
          periapsis: cite(45.7, lunarOrbitTable("LM coelliptic sequence initiation cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-149.57, trajectoryTable("Coelliptic sequence initiation, Cutoff")),
            altitude: cite(48.4, lunarOrbitTable("LM coelliptic sequence initiation cutoff")),
            flightPathAngle: cite(0.09, trajectoryTable("Coelliptic sequence initiation, Cutoff")),
          },
        },
        {
          kind: "burn",
          label: "Constant differential height",
          body: "moon",
          start: at("126:17:49.6", lunarOrbitTable("LM constant differential height ignition")),
          end: {
            ...at("126:18:07.4", lunarOrbitTable("LM constant differential height cutoff")),
            discrepancy:
              "The Apollo 11 Timeline gives cutoff at 126:18:29.2. We follow the Lunar Orbit Phase table, whose cutoff time agrees with its 17.8-second burn duration.",
          },
          deltaV: cite(19.9, lunarOrbitTable("LM constant differential height cutoff")),
        },
        {
          kind: "orbit",
          label: "Lining up",
          body: "moon",
          start: at("126:18:07.4", lunarOrbitTable("LM constant differential height cutoff")),
          end: at("127:03:51.8", lunarOrbitTable("LM terminal phase initiation ignition")),
          apoapsis: cite(47.4, lunarOrbitTable("LM constant differential height cutoff")),
          periapsis: cite(42.1, lunarOrbitTable("LM constant differential height cutoff")),
          sense: RETROGRADE,
          endFix: { longitude: cite(-110.28, trajectoryTable("Terminal phase initiation, Ignition")) },
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "moon",
          start: at("127:03:51.8", lunarOrbitTable("LM terminal phase initiation ignition")),
          end: at("127:04:14.5", lunarOrbitTable("LM terminal phase initiation cutoff")),
          deltaV: cite(25.3, lunarOrbitTable("LM terminal phase initiation cutoff")),
        },
        {
          kind: "orbit",
          label: "Closing in",
          body: "moon",
          start: at("127:04:14.5", lunarOrbitTable("LM terminal phase initiation cutoff")),
          end: at("127:46:09.8", lunarOrbitTable("LM terminal phase finalize ignition")),
          apoapsis: cite(61.7, lunarOrbitTable("LM terminal phase initiation cutoff")),
          periapsis: cite(43.7, lunarOrbitTable("LM terminal phase initiation cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-111.46, trajectoryTable("Terminal phase initiation, Cutoff")),
            altitude: cite(44.0, lunarOrbitTable("LM terminal phase initiation cutoff")),
            flightPathAngle: cite(-0.03, trajectoryTable("Terminal phase initiation, Cutoff")),
          },
          endFix: { longitude: cite(118.61, trajectoryTable("Terminal phase finalize")) },
        },
        {
          kind: "burn",
          label: "Terminal phase finalize",
          body: "moon",
          start: at("127:46:09.8", lunarOrbitTable("LM terminal phase finalize ignition")),
          end: at("127:46:38.2", lunarOrbitTable("LM terminal phase finalize cutoff")),
          deltaV: cite(31.4, lunarOrbitTable("LM terminal phase finalize cutoff")),
        },
        {
          kind: "rendezvous",
          label: "Docking approach",
          body: "moon",
          start: at("127:46:38.2", lunarOrbitTable("LM terminal phase finalize cutoff")),
          end: at("128:03:00.0", lunarOrbitTable("CSM/LM docked")),
          target: "csm",
          apoapsis: cite(63.0, lunarOrbitTable("LM terminal phase finalize cutoff")),
          periapsis: cite(56.5, lunarOrbitTable("LM terminal phase finalize cutoff")),
          sense: RETROGRADE,
        },
        {
          kind: "docked",
          label: "Docked",
          start: at("128:03:00.0", lunarOrbitTable("CSM/LM docked")),
          end: at("130:09:31.2", lunarOrbitTable("LM ascent stage jettisoned")),
          target: "csm",
        },
      ],
    },
  ],
};

/** One row of the Apollo 11 ascent table (geocentric latitude). */
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
