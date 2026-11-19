/**
 * The Apollo 13 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Apollo 13 never went into orbit around the Moon. After translunar
 * injection it flew one long coast, broken by two midcourse burns (the one
 * that left the free-return path and, after the oxygen tank failed, the
 * one that went back to it), swung once around the far side of the Moon,
 * and fired the lunar module's descent engine two hours after its closest
 * approach to speed up the trip home. The lunar module rode docked to the
 * command module from the docking after translunar injection until it was
 * cast off about an hour before entry.
 *
 * Sources:
 * - Apollo by the Numbers (NASA SP-2000-4029): event times, the ascent and
 *   Earth orbit, burns, translunar injection, entry, and splashdown. The
 *   canonical source for times.
 * - Apollo 13 Mission Report (MSC-02680), Table 4-II: where the spacecraft
 *   was at each burn, over Earth or the Moon; Table 4-III: the closest
 *   approach to the Moon each burn aimed for; Table 3-I: liftoff. Most of
 *   its times are Apollo by the Numbers' times rounded to a tenth of a
 *   second, and Apollo by the Numbers' extra digit is kept. Two disagree by
 *   more than rounding, liftoff (by 0.04 second) and the start of
 *   translunar injection (by 0.1 second): for those we follow the Mission
 *   Report and give the other value as a discrepancy.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The two small midcourse corrections on the way home (105:18:28.0 and
 * 137:39:51.5, 7.8 and 3.2 feet per second) are not drawn as burns: the coast
 * home runs straight from the burn after the Moon to the published entry
 * interface, the place those corrections aimed for. The story tells them.
 *
 * Lunar altitudes in the Mission Report are measured above the planned
 * landing site's height (Table 4-I), which this report does not give, so
 * they are drawn above the Moon's mean radius (an approximation: the
 * plan has no `moonReferenceRadius`).
 *
 * The drogue parachute time is a reported time, not a measured one (see
 * the entry phase). The lunar module's path ends when it is cast off: its
 * own coast to the atmosphere is not published, and the vehicle file shows
 * it drifting away from the command module at that moment.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT = "https://ntrs.nasa.gov/api/citations/19710003598/downloads/19710003598.pdf";
const AIR_TO_GROUND = "https://www.nasa.gov/wp-content/uploads/2026/01/as13-tec.pdf";
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES = "&TLIST_TYPE=%27CAL%27&TLIST=%271970-04-11%2019:13:00.65%27,%271970-04-11%2021:54:47.15%27,%271970-04-17%2017:53:45.7%27,%271970-04-17%2018:07:41%27";
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const ascentTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 13 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_13d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 13 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_13e_Earth_Orbit_Phase.htm`,
});
const translunarTable = (row: string, note?: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 13 Translunar Phase table, "${row}" row${note ? ` (${note})` : ""}`,
  url: `${ABN}Apollo_13f_Translunar_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 13 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_13g_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 13 Timeline, row "${row}"`,
  url: `${ABN}Apollo_13h_Timeline.htm`,
});
const tliTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Translunar Injection table, Apollo 13 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const entryTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Entry, Splashdown, and Recovery table, Apollo 13 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
const trajectoryTable = (row: string): Citation => ({
  source: "apollo-13-mission-report",
  locator: `Table 4-II, "Trajectory Parameters" (printed page 4-3, PDF page 18), "${row}" row`,
  url: MISSION_REPORT,
});
const maneuverTable = (row: string, column: string): Citation => ({
  source: "apollo-13-mission-report",
  locator: `Table 4-III, "Maneuver Summary," part (a) Translunar (printed page 4-5, PDF page 20), "${row}" row, "Resultant pericynthion conditions," ${column}`,
  url: MISSION_REPORT,
});
const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY("301", "500@399", "31");
const EARTH_FROM_MOON = HORIZONS_QUERY("399", "500@301", "14");
const SUN_FROM_EARTH = HORIZONS_QUERY("10", "500@399", "31");

/**
 * The path swings around the Moon east to west (retrograde), as the burn
 * after the far side shows.
 */
const RETROGRADE: Cited<"retrograde"> = cite("retrograde", {
  ...trajectoryTable("Transearth injection"),
  locator:
    'Table 4-II, "Trajectory Parameters" (printed page 4-3, PDF page 18), "Transearth injection" rows, reference body Moon: the longitude decreases from ignition to cutoff (65.46E to 64.77E) and the heading is -116.308 degrees (west-southwest), so the spacecraft was moving westward around the Moon',
});

/** The coasts run west to east around Earth (prograde). */
const PROGRADE_TLI: Cited<"prograde"> = cite("prograde", {
  ...tliTable("Heading Angle (deg E of N)"),
  locator:
    'Translunar Injection table, Apollo 13 column, "Heading Angle (deg E of N)": 59.318 degrees, so the path leaves Earth heading east',
});

/**
 * At the closest approach the path is level: Table 4-I defines pericynthion
 * as the lowest point, where the flight-path angle (measured from the local
 * horizontal) is zero.
 */
const LEVEL_AT_PERICYNTHION: Cited<number> = cite(0, {
  source: "apollo-13-mission-report",
  locator:
    'Table 4-I, "Definition of Trajectory and Orbital Parameters" (printed page 4-2, PDF page 17): pericynthion is the "Minimum altitude above the moon model," and the space-fixed flight-path angle is "measured positive upward from the body-centered, local horizontal plane." At the lowest point the path is level, so the angle there is zero (our reasoning; the table prints no angle)',
  url: MISSION_REPORT,
});

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const sequenceOfEvents = (row: string): Citation => ({
  source: "apollo-13-mission-report",
  locator: `Table 3-I, "Sequence of Events" (printed page 3-2, PDF page 13), "${row}"`,
  url: MISSION_REPORT,
});

/** Liftoff, as the Mission Report times it. */
const LIFTOFF: Cited<ElapsedTime> = {
  ...at("000:00:00.65", sequenceOfEvents("Lift-off - 19:13:00.65 G.m.t., April 11, 1970")),
  discrepancy:
    'Apollo by the Numbers\' Apollo 13 Timeline and Ascent Phase table give liftoff (umbilical disconnected) at 000:00:00.61. We follow the Mission Report.',
};

/** Ignition for translunar injection, as the Mission Report times it. */
const TLI_IGNITION: Cited<ElapsedTime> = {
  ...at("002:35:46.4", trajectoryTable("S-IVB second ignition")),
  discrepancy:
    'Apollo by the Numbers\' Apollo 13 Earth Orbit Phase table and Timeline give S-IVB 2nd burn ignition at 002:35:46.30. We follow the Mission Report (Table 4-II, and Table 4-III, which gives the same 2:35:46.4).',
};

const TLI_CUTOFF = at("002:41:37.15", earthOrbitTable("S-IVB 2nd burn cutoff"));
const MCC1_IGNITION = at("030:40:49.65", translunarTable("Midcourse correction ignition (CM SPS)"));
const MCC1_CUTOFF = at("030:40:53.14", translunarTable("Midcourse correction cutoff", "the first one, after the CM SPS ignition"));
const MCC2_IGNITION = at("061:29:43.49", translunarTable("Midcourse correction ignition (LM DPS)"));
const MCC2_CUTOFF = at("061:30:17.72", translunarTable("Midcourse correction cutoff", "the second one, after the LM DPS ignition"));
const PC2_IGNITION = at("079:27:38.95", transearthTable("Transearth injection ignition (LM DPS)"));
const PC2_CUTOFF = at("079:32:02.77", transearthTable("Transearth injection cutoff"));
const ENTRY_INTERFACE = at("142:40:45.7", entryTable("Earth Entry GET"));
const LM_JETTISON = at("141:30:00.2", timeline("LM jettisoned."));

export const flight: FlightPlan = {
  missionId: "apollo-13",

  // The sky is fit at liftoff, translunar injection, entry, and splashdown:
  // the ends of the flight and the two moments when Earth-relative
  // positions shape the path.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(90.855698, horizons("Moon (301) from Earth's center", "ObsEcLon", "1970-04-11 19:13:00.65", MOON_FROM_EARTH)),
      subLunarLongitude: cite(323.134555, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1970-04-11 19:13:00.65", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(21.4792212, horizons("Sun (10) from Earth's center", "ObsEcLon", "1970-04-11 19:13:00.65", SUN_FROM_EARTH)),
    },
    {
      time: at("002:41:47.15", tliTable("GET")),
      moonEclipticLongitude: cite(92.2384778, horizons("Moon (301) from Earth's center", "ObsEcLon", "1970-04-11 21:54:47.15", MOON_FROM_EARTH)),
      subLunarLongitude: cite(284.144162, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1970-04-11 21:54:47.15", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(21.5894299, horizons("Sun (10) from Earth's center", "ObsEcLon", "1970-04-11 21:54:47.15", SUN_FROM_EARTH)),
    },
    {
      time: at("142:40:45.7", entryTable("Earth Entry GET")),
      moonEclipticLongitude: cite(161.8554582, horizons("Moon (301) from Earth's center", "ObsEcLon", "1970-04-17 17:53:45.7", MOON_FROM_EARTH)),
      subLunarLongitude: cite(49.362924, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1970-04-17 17:53:45.7", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(27.3002703, horizons("Sun (10) from Earth's center", "ObsEcLon", "1970-04-17 17:53:45.7", SUN_FROM_EARTH)),
    },
    {
      time: at("142:54:41", entryTable("Earth Splashdown GET")),
      moonEclipticLongitude: cite(161.9719219, horizons("Moon (301) from Earth's center", "ObsEcLon", "1970-04-17 18:07:41", MOON_FROM_EARTH)),
      subLunarLongitude: cite(45.977437, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1970-04-17 18:07:41", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(27.3097187, horizons("Sun (10) from Earth's center", "ObsEcLon", "1970-04-17 18:07:41", SUN_FROM_EARTH)),
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
          start: LIFTOFF,
          end: at("000:12:39.83", ascentTable("Earth orbit insertion")),
          site: {
            latitude: cite(28.447, ascentTable("Liftoff")),
            latitudeKind: "geocentric",
            longitude: cite(-80.6041, ascentTable("Liftoff")),
          },
          // Rows marked with an asterisk in the table give only the
          // commanded time, but they still give the place. The model lets
          // the orbit itself take over in the last 30 seconds before
          // insertion, so the "S-IVB 1st burn cutoff" row is listed but not
          // drawn through.
          track: [
            ascentPoint("Mach 1 achieved", "000:01:08.4", 4.394, 28.4533, -80.5804),
            ascentPoint("Maximum dynamic pressure", "000:01:21.3", 6.727, 28.4608, -80.5529),
            ascentPoint("S-IC center engine cutoff*", "000:02:15.18", 23.464, 28.5677, -80.1654),
            ascentPoint("S-IC outboard engine cutoff", "000:02:43.6", 36.392, 28.6989, -79.681),
            ascentPoint("S-IC/S-II separation*", "000:02:44.3", 36.739, 28.7029, -79.666),
            ascentPoint("S-II center engine #5 cutoff", "000:05:30.64", 86.183, 29.8167, -75.1433),
            ascentPoint("S-II to complete CECO*", "000:07:42.6", 97.45, 30.8785, -69.8409),
            ascentPoint("S-II outboard engine cutoff", "000:09:52.64", 102.112, 31.9133, -62.4374),
            ascentPoint("S-II/S-IVB separation*", "000:09:53.50", 102.15, 31.9193, -62.3805),
            ascentPoint("S-IVB 1st burn cutoff", "000:12:29.83", 103.469, 32.5241, -51.2552),
          ],
        },
        {
          kind: "orbit",
          label: "Earth parking orbit",
          body: "earth",
          start: at("000:12:39.83", earthOrbitTable("Earth orbit insertion")),
          end: TLI_IGNITION,
          // Apollo by the Numbers measures apogee and perigee above a
          // spherical Earth of radius 3,443.934 nautical miles (its Apollo
          // 13 summary, "Ascent Phase"), Earth's equatorial radius, which is
          // what this plan's orbit sizes use.
          apoapsis: {
            ...cite(100.3, earthOrbitTable("Earth orbit insertion")),
            discrepancy:
              "The Mission Report (section 4.0, printed page 4-1) gives the parking orbit as 100.2 by 98.0 miles, measured above its oblate Earth model (Table 4-I). We follow Apollo by the Numbers, whose 100.3 by 99.3 nautical miles are measured above Earth's equatorial radius, as this plan's orbit sizes are.",
          },
          periapsis: cite(99.3, earthOrbitTable("Earth orbit insertion")),
          inclination: cite(32.547, earthOrbitTable("Earth orbit insertion")),
          sense: cite("prograde", {
            ...ascentTable("Earth orbit insertion"),
            locator:
              'Apollo 13 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 90.148 degrees east of north, so the orbit runs west to east',
          }),
          startFix: {
            latitude: cite(32.5249, ascentTable("Earth orbit insertion")),
            latitudeKind: "geocentric",
            longitude: cite(-50.4902, ascentTable("Earth orbit insertion")),
            altitude: cite(103.472, ascentTable("Earth orbit insertion")),
            speed: cite(25_566.1, ascentTable("Earth orbit insertion")),
            flightPathAngle: cite(0.005, ascentTable("Earth orbit insertion")),
            heading: cite(90.148, ascentTable("Earth orbit insertion")),
          },
          endFix: {
            latitude: cite(-22.48, trajectoryTable("S-IVB second ignition")),
            longitude: cite(142.45, trajectoryTable("S-IVB second ignition")),
          },
        },
        {
          kind: "burn",
          label: "Translunar injection",
          body: "earth",
          start: TLI_IGNITION,
          end: TLI_CUTOFF,
          deltaV: cite(10_039.0, earthOrbitTable("S-IVB 2nd burn cutoff")),
        },
        {
          // On a free-return path: had nothing else been done, it would have
          // swung around the Moon and back to Earth.
          kind: "transfer",
          label: "Free-return coast",
          to: "moon",
          start: TLI_CUTOFF,
          end: MCC1_IGNITION,
          earthFix: {
            time: at("002:41:47.15", tliTable("GET")),
            latitude: {
              ...cite(-8.92, trajectoryTable("Translunar injection")),
              discrepancy:
                "Apollo by the Numbers' Translunar Injection table gives a geodetic latitude of -3.8602 degrees (geocentric -3.8635). We follow the Mission Report's 8.92 degrees south, which fits its own S-IVB cutoff position 10 seconds earlier (9.39 degrees south): heading 59.3 degrees, the spacecraft moved about half a degree north in those 10 seconds.",
            },
            longitude: cite(167.2074, tliTable("Longitude (deg E)"), trajectoryTable("Translunar injection")),
            altitude: cite(182.445, tliTable("Altitude (n mi)")),
            speed: cite(35_538.4, tliTable("Space-Fixed Velocity (ft/sec)")),
            flightPathAngle: cite(7.635, tliTable("Flight Path Angle (deg)")),
            heading: cite(59.318, tliTable("Heading Angle (deg E of N)")),
          },
          lunarSense: RETROGRADE,
          earthSense: PROGRADE_TLI,
          freeReturn: cite(true, {
            source: "apollo-by-the-numbers",
            locator:
              'Apollo 13 mission summary, "Translunar Phase" section: before the midcourse correction at 030:40:49.65, "the spacecraft had been on a free-return trajectory, in which the spacecraft would have looped around the Moon and returned to Earth without requiring a major maneuver"',
            url: `${ABN}Apollo_13a_Summary.htm`,
          }),
        },
        {
          kind: "burn",
          label: "Midcourse correction off the free-return path",
          body: "earth",
          start: MCC1_IGNITION,
          end: MCC1_CUTOFF,
          deltaV: cite(23.2, translunarTable("Midcourse correction cutoff", "the first one, 030:40:53.14")),
        },
        {
          // Aimed at the closest approach this burn set up (it never
          // happened: the next burn changed it).
          kind: "transfer",
          label: "Coast on the hybrid path",
          to: "moon",
          start: MCC1_CUTOFF,
          end: MCC2_IGNITION,
          moonFix: {
            time: at("077:28:39", maneuverTable("First midcourse correction", '"Pericynthion arrival time"')),
            longitude: cite(178.93, maneuverTable("First midcourse correction", '"Longitude"')),
            // The scan shows 63 and a decimal digit that cannot be read.
            altitude: {
              ...cite(63, maneuverTable("First midcourse correction", '"Altitude above landing site, miles" (the digit after the decimal point is not legible in the scan)')),
              discrepancy:
                'The Mission Report\'s text (section 4.0, printed page 4-1) and Apollo by the Numbers (Apollo 13 mission summary, "Translunar Phase") give 60 miles, the planned orbit height; the Apollo 13 Review Board report gives 62 nautical miles (printed page 3-28) and 64 (printed page 4-27). The path follows the Mission Report\'s maneuver table, the only source that also gives the speed and time of this closest approach.',
            },
            speed: cite(8_277.9, maneuverTable("First midcourse correction", '"Velocity"')),
            flightPathAngle: LEVEL_AT_PERICYNTHION,
          },
          lunarSense: RETROGRADE,
          earthSense: PROGRADE_TLI,
          freeReturn: cite(false, {
            source: "apollo-by-the-numbers",
            locator: 'Apollo 13 Timeline, row "Midcourse correction ignition (SPS) - transfer to hybrid non-free return trajectory."',
            url: `${ABN}Apollo_13h_Timeline.htm`,
          }),
        },
        {
          kind: "burn",
          label: "Midcourse correction back to a free return",
          body: "earth",
          start: MCC2_IGNITION,
          end: MCC2_CUTOFF,
          deltaV: cite(37.8, translunarTable("Midcourse correction cutoff", "the second one, 061:30:17.72")),
        },
        {
          // The closest approach this burn set up. No burn came between it
          // and the Moon, so it is the one flown.
          kind: "transfer",
          label: "Around the far side of the Moon",
          to: "moon",
          start: MCC2_CUTOFF,
          end: PC2_IGNITION,
          moonFix: {
            time: at("077:20:57", maneuverTable("Second midcourse correction", '"Pericynthion arrival time"')),
            longitude: cite(-179.29, maneuverTable("Second midcourse correction", '"Longitude" (179.29W)')),
            // The scan shows 136 and a decimal digit that cannot be read.
            altitude: cite(136, maneuverTable("Second midcourse correction", '"Altitude above landing site, miles" (the digit after the decimal point is not legible in the scan)')),
            speed: cite(8_053.4, maneuverTable("Second midcourse correction", '"Velocity"')),
            flightPathAngle: LEVEL_AT_PERICYNTHION,
          },
          lunarSense: RETROGRADE,
          earthSense: PROGRADE_TLI,
          freeReturn: cite(true, timeline("Midcourse correction ignition to free-return trajectory (LM DPS).")),
        },
        {
          kind: "burn",
          label: "Burn two hours after closest approach",
          body: "moon",
          start: PC2_IGNITION,
          end: PC2_CUTOFF,
          deltaV: cite(860.5, transearthTable("Transearth injection cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast home",
          to: "earth",
          start: PC2_CUTOFF,
          end: ENTRY_INTERFACE,
          moonFix: {
            longitude: cite(64.77, trajectoryTable("Transearth injection, Cutoff")),
            altitude: cite(5_658.68, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
            speed: cite(5_020.2, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
            flightPathAngle: cite(64.784, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
          },
          earthFix: {
            latitude: cite(-28.23, entryTable("Earth Entry Geodetic Latitude (deg N)"), trajectoryTable("Entry interface")),
            longitude: cite(173.44, entryTable("Earth Entry Longitude (deg E)"), trajectoryTable("Entry interface")),
            altitude: cite(65.83, trajectoryTable("Entry interface")),
            speed: cite(36_210.6, entryTable("Earth Entry Velocity (ft/sec)"), trajectoryTable("Entry interface")),
            flightPathAngle: cite(-6.269, entryTable("Earth Entry Flight Path Angle"), trajectoryTable("Entry interface")),
            heading: cite(77.21, entryTable("Earth Entry Heading Angle (deg)"), trajectoryTable("Entry interface")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...entryTable("Earth Entry Heading Angle (deg)"),
            locator:
              'Entry, Splashdown, and Recovery table, Apollo 13 column, "Heading Angle": 77.21 degrees, so the spacecraft arrived heading east',
          }),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: ENTRY_INTERFACE,
          end: at("142:54:41", entryTable("Earth Splashdown GET")),
          // Neither Apollo by the Numbers nor the Mission Report times the
          // parachutes. This is when the crew reported "two good drogues" on
          // the radio: a reported time, not a measured one (the drogues had
          // opened by then).
          drogue: at("142:49:17", {
            source: "apollo-13-air-to-ground-transcript",
            locator: 'Tape 95/5, page 757 (PDF page 764), 05 22 49 17 (5 days 22:49:17, that is 142:49:17), CMP: "We got two good drogues." (a reported time)',
            url: AIR_TO_GROUND,
          }),
          splashdown: {
            latitude: cite(-21.63, entryTable("Earth Splashdown Latitude (deg N)")),
            longitude: cite(-165.37, entryTable("Earth Splashdown Longitude (deg E)")),
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
          // From the docking after translunar injection: before it, the
          // lunar module rides inside the adapter on the third stage, drawn
          // as part of the command and service module's launch stack. The
          // path ends when it is cast off, about 70 minutes before entry.
          kind: "docked",
          label: "Docked to the command module",
          start: at("003:19:08.8", timeline("CSM docked with LM/S-IVB.")),
          end: LM_JETTISON,
          target: "csm",
        },
      ],
    },
  ],
};

/** One row of the Apollo 13 ascent table (geocentric latitude). */
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
