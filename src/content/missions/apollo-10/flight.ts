/**
 * The Apollo 10 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the command and service module ("csm", Charlie Brown) for the
 * whole flight, and the lunar module ("lm", Snoopy) from undocking in lunar
 * orbit until it docked again. Snoopy never landed: it dipped low over the
 * Moon, dropped its descent stage in orbit, and its ascent stage flew back
 * up to Charlie Brown, as after a liftoff from the surface. The descent
 * stage (left in lunar orbit) and the ascent stage (sent into orbit around
 * the Sun after it was let go) are not drawn after they were cast off, and
 * neither is the third stage after the spacecraft left it.
 *
 * Sources:
 * - Apollo by the Numbers (NASA SP-2000-4029): event times, the ascent
 *   track, orbit sizes, burn sizes, translunar injection, and entry. Its
 *   times agree with the Mission Report's to the report's rounding: where
 *   the report prints tenths of a second and Apollo by the Numbers
 *   hundredths, they differ by less than a tenth (translunar injection
 *   ignition is 2:33:27.6 in the report, 002:33:27.52 here), and the more
 *   precise value is used. The two times that differ by more are noted in
 *   their discrepancy fields.
 * - Apollo 10 Mission Report (MSC-00126), Table 6-II: where the spacecraft
 *   were at each burn, in latitude and longitude over Earth or the Moon,
 *   and the entry interface (Table 6-VII) and landing point (Section 12.3).
 *   The table's text layer is garbled (it reads 38.31E for 38.37E); its
 *   values were read from the page image.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The Mission Report's lunar latitudes all lie within 1.8 degrees of the
 * lunar equator (Table 6-II), so the lunar orbits are drawn in the Moon's
 * equatorial plane, as for Apollo 11. The report prints no radius for the
 * Moon it measures heights from (Table 6-I: "above the moon model"), so
 * `moonReferenceRadius` is left out and lunar heights are drawn above the
 * Moon's mean radius.
 *
 * Not drawn: the parking orbit's slight change from oxygen venting
 * (Mission Report Section 6.2); the midcourse corrections (49.2 feet per
 * second on the way out, 2.2 on the way home), too small to see at this
 * scale; the slow changes the Moon's gravity made to the lunar
 * orbits; and the lunar module's two small midcourse corrections and its
 * braking near the command module (31.6 feet per second, timed only at its
 * start), which fall inside the drawn approach to docking.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT =
  "https://web.archive.org/web/20250207014556/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A10_MissionReport.pdf";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271969-05-18%2016:49:00.58%27,%271969-05-18%2019:28:20.58%27,%271969-05-26%2016:37:54.5%27,%271969-05-26%2016:52:23%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const ascentTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 10 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_10d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 10 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_10e_Earth_Orbit_Phase.htm`,
});
const lunarOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 10 Lunar Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_10g_Lunar_Orbit_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 10 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_10h_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 10 Timeline, row "${row}"`,
  url: `${ABN}Apollo_10i_Timeline.htm`,
});
const summary = (section: string, quote: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 10 mission summary, "${section}" section: ${quote}`,
  url: `${ABN}Apollo_10a_Summary.htm`,
});
const tliTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Translunar Injection table, Apollo 10 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const entryTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Entry, Splashdown, and Recovery table, Apollo 10 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
/** Table 3-I, Sequence of Events: printed pages 3-3 and 3-4, PDF pages 14 and 15. */
const sequence = (row: string, page: "3-3" | "3-4"): Citation => ({
  source: "apollo-10-mission-report",
  locator: `Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === "3-3" ? 14 : 15}), "${row}" row`,
  url: MISSION_REPORT,
});
/** Table 6-II, Trajectory Parameters: printed page 6-9, PDF page 50 (read from the page image; its text layer is garbled). */
const trajectoryTable = (row: string): Citation => ({
  source: "apollo-10-mission-report",
  locator: `Table 6-II, "Trajectory Parameters" (page 6-9, PDF page 50), "${row}" row`,
  url: MISSION_REPORT,
});
/** Table 6-IV, Lunar Orbit Maneuver Summary: printed page 6-11, PDF page 52. */
const lunarManeuvers = (row: string): Citation => ({
  source: "apollo-10-mission-report",
  locator: `Table 6-IV, "Lunar Orbit Maneuver Summary" (page 6-11, PDF page 52), "${row}" row`,
  url: MISSION_REPORT,
});
const entryParameters = (row: string): Citation => ({
  source: "apollo-10-mission-report",
  locator: `Table 6-VII, "Entry Trajectory Parameters" (page 6-13, PDF page 54), "Entry interface (400 000 feet altitude)": ${row}`,
  url: MISSION_REPORT,
});
const reportText = (section: string, page: string, pdfPage: number, quote: string): Citation => ({
  source: "apollo-10-mission-report",
  locator: `Section ${section} (page ${page}, PDF page ${pdfPage}): ${quote}`,
  url: MISSION_REPORT,
});
const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});

/** Lunar orbits run east to west (retrograde), as the burn positions show. */
const RETROGRADE: Cited<"retrograde"> = cite("retrograde", {
  source: "apollo-10-mission-report",
  locator:
    'Table 6-II, "Trajectory Parameters" (page 6-9, PDF page 50): at every lunar burn the longitude decreases from ignition to cutoff (lunar orbit insertion 162.68W to 174.60E, circularization 153.46E to 152.70E, transearth injection 155.72E to 144.62E), so the spacecraft moved westward',
  url: MISSION_REPORT,
});

/** Earth orbit and the coast out run west to east (prograde). */
const PROGRADE_EOI: Cited<"prograde"> = cite("prograde", {
  ...ascentTable("Earth orbit insertion"),
  locator:
    'Apollo 10 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 89.933 degrees east of north, so the orbit runs west to east',
});

/* ------------------------------------------------------------------ */
/* Times used more than once.                                          */
/* ------------------------------------------------------------------ */

const LIFTOFF = at("000:00:00.58", ascentTable("Liftoff"), timeline("Liftoff (umbilical disconnected)."));
const EARTH_ORBIT_INSERTION = at("000:11:53.76", ascentTable("Earth orbit insertion"), earthOrbitTable("Earth orbit insertion"));
const TLI_IGNITION = at("002:33:27.52", earthOrbitTable("S-IVB 2nd burn ignition"), timeline("S-IVB 2nd burn ignition."));
const TLI_CUTOFF = at("002:39:10.58", earthOrbitTable("S-IVB 2nd burn cutoff"), timeline("S-IVB 2nd burn cutoff."));
const LOI_IGNITION = at("075:55:54.0", lunarOrbitTable("Lunar orbit insertion ignition"), sequence("Lunar orbit insertion", "3-3"));
const LOI_CUTOFF = at("076:01:50.1", lunarOrbitTable("Lunar orbit insertion cutoff"), trajectoryTable("Lunar orbit insertion, Cutoff"));
const LOC_IGNITION = at("080:25:08.1", lunarOrbitTable("Lunar orbit circularization ignition"), sequence("Lunar orbit circularization", "3-3"));
const LOC_CUTOFF = at("080:25:22.0", lunarOrbitTable("Lunar orbit circularization cutoff"), trajectoryTable("Lunar orbit circularization, Cutoff"));
const UNDOCKED = {
  ...at("098:11:57", lunarOrbitTable("CSM/LM undocked"), timeline("CSM/LM undocked."), sequence("Undocking", "3-3")),
  discrepancy:
    'The Apollo by the Numbers mission summary (Lunar Orbit Phase section) says undocking occurred at 098:29:20. Its Timeline and Lunar Orbit Phase table, and the Mission Report (Tables 3-I and 6-II), give 098:11:57, which we follow.',
};
const CSM_SEPARATION_IGNITION = at("098:47:17.4", lunarOrbitTable("CSM/LM separation ignition"), trajectoryTable("Separation, Ignition"));
const CSM_SEPARATION_CUTOFF = at("098:47:25.7", lunarOrbitTable("CSM/LM separation cutoff"), trajectoryTable("Separation, Cutoff"));
const DOI_IGNITION = at("099:46:01.6", lunarOrbitTable("LM descent orbit insertion ignition"), trajectoryTable("Descent orbit insertion, Ignition"));
const DOI_CUTOFF = {
  ...at("099:46:29.0", lunarOrbitTable("LM descent orbit insertion cutoff"), timeline("Descent orbit insertion cutoff.")),
  discrepancy:
    "The Mission Report's Table 6-II prints cutoff at 99:46:28.0. Its Table 6-IV gives the firing as 27.4 seconds, which from ignition at 99:46:01.6 ends at 99:46:29.0, the time Apollo by the Numbers gives; we follow that.",
};
const PHASING_IGNITION = at("100:58:25.93", lunarOrbitTable("LM phasing ignition"), trajectoryTable("Phasing maneuver, Ignition"));
const PHASING_CUTOFF = at("100:59:05.88", lunarOrbitTable("LM phasing cutoff"), trajectoryTable("Phasing maneuver, Cutoff"));
const INSERTION_IGNITION = at("102:55:02.13", lunarOrbitTable("LM ascent orbit insertion ignition"), trajectoryTable("Ascent orbit insertion, Ignition"));
const INSERTION_CUTOFF = at("102:55:17.68", lunarOrbitTable("LM ascent orbit insertion cutoff"), trajectoryTable("Ascent orbit insertion, Cutoff"));
const CSI_IGNITION = at("103:45:55.3", lunarOrbitTable("LM coelliptic sequence initiation ignition"), trajectoryTable("Coelliptic sequence initiation, Ignition"));
const CSI_CUTOFF = at("103:46:22.6", lunarOrbitTable("LM coelliptic sequence initiation cutoff"), trajectoryTable("Coelliptic sequence initiation, Cutoff"));
const CDH_IGNITION = at("104:43:53.28", lunarOrbitTable("LM constant differential height ignition"), trajectoryTable("Constant differential height, Ignition"));
const CDH_CUTOFF = at("104:43:54.93", lunarOrbitTable("LM constant differential height cutoff"), trajectoryTable("Constant differential height, Cutoff"));
const TPI_IGNITION = at("105:22:55.58", lunarOrbitTable("LM terminal phase initiation ignition"), trajectoryTable("Terminal phase initiation, Ignition"));
const TPI_CUTOFF = at("105:23:12.08", lunarOrbitTable("LM terminal phase initiation cutoff"), trajectoryTable("Terminal phase initiation, Cutoff"));
const DOCKED = at("106:22:02", lunarOrbitTable("CSM/LM docked"), timeline("CSM/LM docked."), sequence("Second docking", "3-4"));
const ASCENT_STAGE_JETTISON = at("108:24:36", timeline("LM ascent stage jettisoned."), sequence("Ascent stage jettison", "3-4"));
const TEI_IGNITION = at("137:36:28.9", transearthTable("Transearth injection ignition"), sequence("Transearth injection", "3-4"));
const TEI_CUTOFF = at("137:39:13.7", transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff"));
const ENTRY_INTERFACE = at("191:48:54.5", entryTable("Earth Entry, GET"), entryParameters("Time, hr:min:sec"));
const LANDING = at("192:03:23", entryTable("Earth Splashdown, GET"), sequence("Landing", "3-4"), timeline("Splashdown (went to apex-up)."));

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const LANDING_POINT: Citation = reportText(
  "12.3.1, Command Module Location and Retrieval",
  "12-4",
  213,
  '"The spacecraft landed at 192:03:23 (1652 G.m.t.) at a point calculated by recovery forces to be 15 degrees 2 minutes south latitude and 164 degrees 39 minutes west longitude"',
);
const LANDING_POINT_DIFFERS =
  "Apollo by the Numbers (Apollo 10 mission summary, Recovery, and the Entry, Splashdown, and Recovery table) gives 15.07 degrees south, 164.65 degrees west, the onboard guidance's position at drogue deployment in the Mission Report's Table 6-VII. We follow the Mission Report's Section 12.3.1, the point calculated by the recovery forces.";

const SPLASHDOWN = {
  latitude: { ...cite(-(15 + 2 / 60), LANDING_POINT), discrepancy: LANDING_POINT_DIFFERS },
  longitude: { ...cite(-(164 + 39 / 60), LANDING_POINT), discrepancy: LANDING_POINT_DIFFERS },
};

const LM_ORBIT_NOTE =
  "An illustration, not a published value: these are the command and service module's orbit after circularization. No orbit is published for the lunar module between undocking and descent orbit insertion; the separation burn at 98:47:17.4 was the command and service module's alone (Mission Report, Table 6-IV), so the lunar module is drawn on the orbit the two shared.";

/** The command and service module's orbit after circularization. */
const CIRCULAR_ORBIT = {
  apoapsis: cite(61.0, lunarOrbitTable("Lunar orbit circularization cutoff"), lunarManeuvers("Lunar orbit circularization")),
  periapsis: cite(59.2, lunarOrbitTable("Lunar orbit circularization cutoff"), lunarManeuvers("Lunar orbit circularization")),
};

/**
 * The lunar module's orbit from Charlie Brown's separation burn to its own
 * first burn: an illustration. No size is published for it; since only the
 * command and service module fired, the lunar module is drawn on the orbit
 * the two shared after circularization.
 */
const LM_ORBIT_BEFORE_DESCENT = {
  apoapsis: {
    ...CIRCULAR_ORBIT.apoapsis,
    discrepancy: LM_ORBIT_NOTE,
  },
  periapsis: {
    ...CIRCULAR_ORBIT.periapsis,
    discrepancy: LM_ORBIT_NOTE,
  },
};

/** The command and service module's orbit after it moved away from the lunar module. */
const CSM_ORBIT_AFTER_SEPARATION = {
  apoapsis: cite(
    62.9,
    lunarOrbitTable("CSM/LM separation cutoff"),
    lunarManeuvers("Command module/lunar module separation"),
    summary("Lunar Orbit Phase", '"The CSM was in an orbit of 62.9 by 57.7 n mi at the time"'),
  ),
  periapsis: cite(57.7, lunarOrbitTable("CSM/LM separation cutoff"), lunarManeuvers("Command module/lunar module separation")),
};

export const flight: FlightPlan = {
  missionId: "apollo-10",

  // The sky is fit at liftoff, translunar injection, entry interface, and
  // landing: the moments when Earth-relative positions shape the path.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(83.6908237, horizons("Moon (301) from Earth's center", "ObsEcLon", "1969-05-18 16:49:00.58")),
      subLunarLongitude: cite(314.410926, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1969-05-18 16:49:00.58")),
      sunEclipticLongitude: cite(57.5528749, horizons("Sun (10) from Earth's center", "ObsEcLon", "1969-05-18 16:49:00.58")),
    },
    {
      time: at("002:39:20.58", tliTable("GET")),
      moonEclipticLongitude: cite(85.0131443, horizons("Moon (301) from Earth's center", "ObsEcLon", "1969-05-18 19:28:20.58")),
      subLunarLongitude: cite(275.963620, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1969-05-18 19:28:20.58")),
      sunEclipticLongitude: cite(57.6594431, horizons("Sun (10) from Earth's center", "ObsEcLon", "1969-05-18 19:28:20.58")),
    },
    {
      time: ENTRY_INTERFACE,
      moonEclipticLongitude: cite(180.8230356, horizons("Moon (301) from Earth's center", "ObsEcLon", "1969-05-26 16:37:54.5")),
      subLunarLongitude: cite(47.110751, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1969-05-26 16:37:54.5")),
      sunEclipticLongitude: cite(65.2369304, horizons("Sun (10) from Earth's center", "ObsEcLon", "1969-05-26 16:37:54.5")),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(180.9548301, horizons("Moon (301) from Earth's center", "ObsEcLon", "1969-05-26 16:52:23")),
      subLunarLongitude: cite(43.598378, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1969-05-26 16:52:23")),
      sunEclipticLongitude: cite(65.2465777, horizons("Sun (10) from Earth's center", "ObsEcLon", "1969-05-26 16:52:23")),
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
          end: EARTH_ORBIT_INSERTION,
          // Pad B of Launch Complex 39, a little north of Pad A.
          site: {
            latitude: cite(28.4658, ascentTable("Liftoff")),
            latitudeKind: "geocentric",
            longitude: cite(-80.6209, ascentTable("Liftoff")),
          },
          // The model lets the orbit itself take over just before insertion,
          // so the "S-IVB 1st burn cutoff" row, 10 seconds before it, is
          // listed but not drawn through. Rows marked * in the table give
          // only the commanded time.
          track: [
            ascentPoint("Mach 1 achieved", "000:01:06.8", 4.244, 28.4714, -80.6023),
            ascentPoint("Maximum dynamic pressure", "000:01:22.6", 7.137, 28.4813, -80.569),
            ascentPoint("S-IC center engine cutoff*", "000:02:15.16", 23.43, 28.5967, -80.1577),
            ascentPoint("S-IC outboard engine cutoff", "000:02:41.63", 35.247, 28.7182, -79.709),
            ascentPoint("S-IC/S-II separation*", "000:02:42.31", 35.58, 28.7222, -79.6943),
            ascentPoint("S-II center engine cutoff", "000:07:40.61", 96.71, 30.9579, -69.4941),
            ascentPoint("S-II outboard engine cutoff", "000:09:12.64", 101.204, 31.7505, -64.0222),
            ascentPoint("S-II/S-IVB separation", "000:09:13.50", 101.247, 31.7574, -63.9647),
            ascentPoint("S-IVB 1st burn cutoff*", "000:11:43.76", 103.385, 32.515, -53.292),
          ],
        },
        {
          kind: "orbit",
          label: "Earth parking orbit",
          body: "earth",
          start: EARTH_ORBIT_INSERTION,
          end: TLI_IGNITION,
          // Apollo by the Numbers measures these from a spherical Earth of
          // 3,443.934 nautical miles, the equatorial radius the engine uses.
          apoapsis: {
            ...cite(
              100.32,
              earthOrbitTable("Earth orbit insertion"),
              summary("Ascent Phase", '"an apogee and perigee of 100.32 by 99.71 n mi ... based upon a spherical Earth with a radius of 3,443.934 n mi"'),
            ),
            discrepancy:
              "The Mission Report gives the parking orbit as 102.6 by 99.6 nautical miles (Section 1.0, page 1-1, PDF page 9), measured above the oblate Earth (Table 6-I, page 6-8, PDF page 49). We follow Apollo by the Numbers, whose heights are above the equatorial radius, as the flight path measures them.",
          },
          periapsis: {
            ...cite(99.71, earthOrbitTable("Earth orbit insertion")),
            discrepancy:
              "The Mission Report gives the low point as 99.6 nautical miles (Section 1.0, page 1-1, PDF page 9), above the oblate Earth. We follow Apollo by the Numbers, as for the high point.",
          },
          inclination: cite(32.546, earthOrbitTable("Earth orbit insertion")),
          sense: PROGRADE_EOI,
          startFix: {
            latitude: cite(32.5303, ascentTable("Earth orbit insertion")),
            latitudeKind: "geocentric",
            longitude: cite(-52.526, ascentTable("Earth orbit insertion")),
            altitude: cite(103.334, ascentTable("Earth orbit insertion")),
            speed: cite(25_567.88, ascentTable("Earth orbit insertion")),
            flightPathAngle: cite(-0.0049, ascentTable("Earth orbit insertion")),
            heading: cite(89.933, ascentTable("Earth orbit insertion")),
          },
          endFix: {
            latitude: cite(-25.76, trajectoryTable("S-IVB ignition")),
            longitude: cite(135.54, trajectoryTable("S-IVB ignition")),
          },
        },
        {
          kind: "burn",
          label: "Translunar injection",
          body: "earth",
          start: TLI_IGNITION,
          end: TLI_CUTOFF,
        },
        {
          kind: "transfer",
          label: "Coast to the Moon",
          to: "moon",
          start: TLI_CUTOFF,
          end: LOI_IGNITION,
          earthFix: {
            time: at("002:39:20.58", tliTable("GET"), timeline("Translunar injection.")),
            latitude: cite(-13.627, tliTable("Geodetic Latitude (deg N)"), trajectoryTable("Translunar injection")),
            longitude: cite(159.9201, tliTable("Longitude (deg E)"), trajectoryTable("Translunar injection")),
            altitude: cite(179.92, tliTable("Altitude (n mi)")),
            speed: cite(35_562.96, tliTable("Space-Fixed Velocity (ft/sec)")),
            flightPathAngle: cite(7.379, tliTable("Flight Path Angle (deg)")),
            heading: cite(61.065, tliTable("Heading Angle (deg E of N)")),
          },
          moonFix: {
            // 162.68 degrees west is on the far side, out of contact with Earth.
            longitude: cite(
              -162.68,
              trajectoryTable("Lunar orbit insertion, Ignition"),
              {
                source: "nasa-apollo-10-charlie-brown-and-snoopy",
                locator: 'Paragraph 1: "The Lunar Orbit Insertion (LOI) maneuver, a six–minute firing of the Service Propulsion System (SPS) engine, took place behind the Moon"',
              },
            ),
            altitude: cite(95.1, lunarOrbitTable("Lunar orbit insertion ignition"), trajectoryTable("Lunar orbit insertion, Ignition")),
            speed: cite(8_232.3, lunarOrbitTable("Lunar orbit insertion ignition"), trajectoryTable("Lunar orbit insertion, Ignition")),
            flightPathAngle: cite(-11.7, trajectoryTable("Lunar orbit insertion, Ignition")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...tliTable("Heading Angle (deg E of N)"),
            locator:
              'Translunar Injection table, Apollo 10 column, "Heading Angle (deg E of N)": 61.065 degrees, so the path leaves Earth heading east',
          }),
        },
        {
          kind: "burn",
          label: "Lunar orbit insertion",
          body: "moon",
          start: LOI_IGNITION,
          end: LOI_CUTOFF,
          deltaV: cite(2_982.4, lunarOrbitTable("Lunar orbit insertion cutoff"), lunarManeuvers("Lunar orbit insertion")),
        },
        {
          kind: "orbit",
          label: "First lunar orbits",
          body: "moon",
          start: LOI_CUTOFF,
          end: LOC_IGNITION,
          apoapsis: cite(170.0, lunarOrbitTable("Lunar orbit insertion cutoff"), lunarManeuvers("Lunar orbit insertion")),
          periapsis: cite(60.2, lunarOrbitTable("Lunar orbit insertion cutoff"), lunarManeuvers("Lunar orbit insertion")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(174.6, trajectoryTable("Lunar orbit insertion, Cutoff")),
            altitude: cite(61.2, lunarOrbitTable("Lunar orbit insertion cutoff"), trajectoryTable("Lunar orbit insertion, Cutoff")),
            flightPathAngle: cite(-0.9, trajectoryTable("Lunar orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(153.46, trajectoryTable("Lunar orbit circularization, Ignition")) },
        },
        {
          kind: "burn",
          label: "Lunar orbit circularization",
          body: "moon",
          start: LOC_IGNITION,
          end: LOC_CUTOFF,
          deltaV: cite(139.0, lunarOrbitTable("Lunar orbit circularization cutoff"), lunarManeuvers("Lunar orbit circularization")),
        },
        {
          kind: "orbit",
          label: "Lunar orbit, docked",
          body: "moon",
          start: LOC_CUTOFF,
          end: UNDOCKED,
          ...CIRCULAR_ORBIT,
          sense: RETROGRADE,
          startFix: {
            longitude: cite(152.7, trajectoryTable("Lunar orbit circularization, Cutoff")),
            altitude: cite(59.3, lunarOrbitTable("Lunar orbit circularization cutoff"), trajectoryTable("Lunar orbit circularization, Cutoff")),
            flightPathAngle: cite(0.01, trajectoryTable("Lunar orbit circularization, Cutoff")),
          },
          endFix: { longitude: cite(146.42, trajectoryTable("Undocking")) },
        },
        {
          kind: "orbit",
          label: "Lunar orbit, undocked",
          body: "moon",
          start: UNDOCKED,
          end: CSM_SEPARATION_IGNITION,
          ...CIRCULAR_ORBIT,
          sense: RETROGRADE,
          endFix: { longitude: cite(38.37, trajectoryTable("Separation, Ignition")) },
        },
        {
          kind: "burn",
          label: "Separation from Snoopy",
          body: "moon",
          start: CSM_SEPARATION_IGNITION,
          end: CSM_SEPARATION_CUTOFF,
          deltaV: cite(2.5, lunarOrbitTable("CSM/LM separation cutoff"), lunarManeuvers("Command module/lunar module separation")),
        },
        {
          kind: "orbit",
          label: "Lunar orbit, waiting for Snoopy",
          body: "moon",
          start: CSM_SEPARATION_CUTOFF,
          end: DOCKED,
          ...CSM_ORBIT_AFTER_SEPARATION,
          sense: RETROGRADE,
          startFix: {
            longitude: cite(38.0, trajectoryTable("Separation, Cutoff")),
            altitude: cite(59.2, lunarOrbitTable("CSM/LM separation cutoff"), trajectoryTable("Separation, Cutoff")),
            flightPathAngle: cite(0.15, trajectoryTable("Separation, Cutoff")),
          },
          endFix: { longitude: cite(94.03, trajectoryTable("Docking")) },
        },
        {
          // No later size of the command and service module's orbit is
          // published before the burn home, so it keeps this one.
          kind: "orbit",
          label: "Last lunar orbits",
          body: "moon",
          start: DOCKED,
          end: TEI_IGNITION,
          ...CSM_ORBIT_AFTER_SEPARATION,
          sense: RETROGRADE,
          endFix: {
            // 155.72 degrees east is on the far side.
            longitude: cite(
              155.72,
              trajectoryTable("Transearth injection, Ignition"),
              {
                source: "nasa-apollo-10-mission-details",
                locator: '"Apollo 10 was on the back side of the moon when it was injected into a trans-Earth trajectory"',
              },
            ),
          },
        },
        {
          kind: "burn",
          label: "Transearth injection",
          body: "moon",
          start: TEI_IGNITION,
          end: TEI_CUTOFF,
          deltaV: cite(3_680.3, transearthTable("Transearth injection cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast home",
          to: "earth",
          start: TEI_CUTOFF,
          end: ENTRY_INTERFACE,
          moonFix: {
            longitude: cite(144.62, trajectoryTable("Transearth injection, Cutoff")),
            altitude: cite(56.5, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
            speed: cite(8_987.2, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
            flightPathAngle: cite(2.53, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
          },
          earthFix: {
            latitude: cite(-23.6, entryTable("Earth Entry, Geodetic Latitude (deg N)"), entryParameters("Geodetic latitude, deg south")),
            longitude: cite(174.39, entryTable("Earth Entry, Longitude (deg E)"), entryParameters("Longitude, deg east")),
            altitude: cite(65.8, entryParameters("Altitude, miles")),
            speed: cite(36_314, entryTable("Earth Entry, Velocity (ft/sec)"), entryParameters("Space-fixed velocity, ft/sec")),
            flightPathAngle: cite(-6.54, entryTable("Earth Entry, Flight Path Angle (deg E of N)"), entryParameters("Space-fixed flight-path angle, deg")),
            heading: cite(71.89, entryTable("Earth Entry, Heading Angle (deg)"), entryParameters("Space-fixed heading angle, deg east of north")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...entryTable("Earth Entry, Heading Angle (deg)"),
            locator:
              'Entry, Splashdown, and Recovery table, Apollo 10 column, Earth Entry "Heading Angle (deg)": 71.89 degrees, so the spacecraft arrived heading east',
          }),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: at("191:57:18.0", timeline("Drogue parachute deployed"), sequence("Drogue deployment", "3-4")),
          splashdown: SPLASHDOWN,
        },
        {
          kind: "surface",
          label: "Waiting for the recovery ship",
          body: "earth",
          start: LANDING,
          // The timeline gives this only to the minute (192:42).
          end: at(
            "192:42:00",
            timeline("Crew aboard recovery ship."),
            reportText("12.3.1, Command Module Location and Retrieval", "12-4", 213, '"The crew was retrieved and onboard the Princeton 39 minutes after landing"'),
          ),
          site: SPLASHDOWN,
        },
      ],
    },
    {
      id: "lm",
      name: "Lunar module",
      role: "lander",
      phases: [
        {
          // After undocking the two flew close together while Young looked
          // Snoopy over on television, until Charlie Brown's separation burn
          // (NASA, "Charlie Brown and Snoopy in Lunar Orbit"). No distance
          // between them is published for this stretch; the scene draws
          // them a little apart.
          kind: "station",
          label: "Beside Charlie Brown",
          start: UNDOCKED,
          end: CSM_SEPARATION_IGNITION,
          target: "csm",
        },
        {
          // It starts on Charlie Brown's orbit, which it kept until its own
          // first burn.
          kind: "orbit",
          label: "Undocked",
          body: "moon",
          start: CSM_SEPARATION_IGNITION,
          end: DOI_IGNITION,
          ...LM_ORBIT_BEFORE_DESCENT,
          sense: RETROGRADE,
          // 139.67 degrees west is on the far side.
          endFix: { longitude: cite(-139.67, trajectoryTable("Descent orbit insertion, Ignition")) },
        },
        {
          kind: "burn",
          label: "Descent orbit insertion",
          body: "moon",
          start: DOI_IGNITION,
          end: DOI_CUTOFF,
          deltaV: cite(71.3, lunarOrbitTable("LM descent orbit insertion cutoff"), lunarManeuvers("Descent orbit insertion")),
        },
        {
          kind: "orbit",
          label: "Descent orbit",
          body: "moon",
          start: DOI_CUTOFF,
          end: PHASING_IGNITION,
          apoapsis: cite(60.9, lunarOrbitTable("LM descent orbit insertion cutoff"), lunarManeuvers("Descent orbit insertion")),
          periapsis: cite(8.5, lunarOrbitTable("LM descent orbit insertion cutoff"), lunarManeuvers("Descent orbit insertion")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-141.12, trajectoryTable("Descent orbit insertion, Cutoff")),
            altitude: cite(61.2, lunarOrbitTable("LM descent orbit insertion cutoff"), trajectoryTable("Descent orbit insertion, Cutoff")),
            flightPathAngle: cite(-0.03, trajectoryTable("Descent orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(-11.19, trajectoryTable("Phasing maneuver, Ignition")) },
        },
        {
          kind: "burn",
          label: "Phasing",
          body: "moon",
          start: PHASING_IGNITION,
          end: PHASING_CUTOFF,
          deltaV: cite(176.0, lunarOrbitTable("LM phasing cutoff"), lunarManeuvers("Phasing")),
        },
        {
          // The descent stage was cast off during this orbit (102:45:16.9);
          // only the vehicle file changes there.
          kind: "orbit",
          label: "Phasing orbit",
          body: "moon",
          start: PHASING_CUTOFF,
          end: INSERTION_IGNITION,
          apoapsis: cite(190.1, lunarOrbitTable("LM phasing cutoff"), lunarManeuvers("Phasing")),
          periapsis: cite(12.1, lunarOrbitTable("LM phasing cutoff"), lunarManeuvers("Phasing")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-13.67, trajectoryTable("Phasing maneuver, Cutoff")),
            altitude: cite(19.0, lunarOrbitTable("LM phasing cutoff"), trajectoryTable("Phasing maneuver, Cutoff")),
            flightPathAngle: cite(1.88, trajectoryTable("Phasing maneuver, Cutoff")),
          },
          endFix: { longitude: cite(19.58, trajectoryTable("Ascent orbit insertion, Ignition")) },
        },
        {
          kind: "burn",
          label: "Insertion",
          body: "moon",
          start: INSERTION_IGNITION,
          end: INSERTION_CUTOFF,
          deltaV: cite(220.9, lunarOrbitTable("LM ascent orbit insertion cutoff"), lunarManeuvers("Ascent orbit insertion")),
        },
        {
          kind: "orbit",
          label: "Insertion orbit",
          body: "moon",
          start: INSERTION_CUTOFF,
          end: CSI_IGNITION,
          apoapsis: cite(46.5, lunarOrbitTable("LM ascent orbit insertion cutoff"), lunarManeuvers("Ascent orbit insertion")),
          periapsis: cite(11.0, lunarOrbitTable("LM ascent orbit insertion cutoff"), lunarManeuvers("Ascent orbit insertion")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(18.72, trajectoryTable("Ascent orbit insertion, Cutoff")),
            altitude: cite(11.7, lunarOrbitTable("LM ascent orbit insertion cutoff"), trajectoryTable("Ascent orbit insertion, Cutoff")),
            flightPathAngle: cite(0.49, trajectoryTable("Ascent orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(-141.57, trajectoryTable("Coelliptic sequence initiation, Ignition")) },
        },
        {
          kind: "burn",
          label: "Coelliptic sequence initiation",
          body: "moon",
          start: CSI_IGNITION,
          end: CSI_CUTOFF,
          deltaV: cite(45.3, lunarOrbitTable("LM coelliptic sequence initiation cutoff"), lunarManeuvers("Coelliptic sequence initiation")),
        },
        {
          kind: "orbit",
          label: "Coelliptic orbit",
          body: "moon",
          start: CSI_CUTOFF,
          end: CDH_IGNITION,
          apoapsis: cite(48.7, lunarOrbitTable("LM coelliptic sequence initiation cutoff"), lunarManeuvers("Coelliptic sequence initiation")),
          periapsis: cite(40.7, lunarOrbitTable("LM coelliptic sequence initiation cutoff"), lunarManeuvers("Coelliptic sequence initiation")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-143.13, trajectoryTable("Coelliptic sequence initiation, Cutoff")),
            altitude: cite(44.6, lunarOrbitTable("LM coelliptic sequence initiation cutoff"), trajectoryTable("Coelliptic sequence initiation, Cutoff")),
            flightPathAngle: cite(-0.19, trajectoryTable("Coelliptic sequence initiation, Cutoff")),
          },
          endFix: { longitude: cite(36.98, trajectoryTable("Constant differential height, Ignition")) },
        },
        {
          kind: "burn",
          label: "Constant differential height",
          body: "moon",
          start: CDH_IGNITION,
          end: CDH_CUTOFF,
          deltaV: cite(3.0, lunarOrbitTable("LM constant differential height cutoff"), lunarManeuvers("Constant differential height")),
        },
        {
          kind: "orbit",
          label: "Lining up",
          body: "moon",
          start: CDH_CUTOFF,
          end: TPI_IGNITION,
          apoapsis: cite(48.8, lunarOrbitTable("LM constant differential height cutoff"), lunarManeuvers("Constant differential height")),
          periapsis: cite(42.1, lunarOrbitTable("LM constant differential height cutoff"), lunarManeuvers("Constant differential height")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(36.89, trajectoryTable("Constant differential height, Cutoff")),
            altitude: cite(43.8, lunarOrbitTable("LM constant differential height cutoff"), trajectoryTable("Constant differential height, Cutoff")),
            flightPathAngle: cite(0.17, trajectoryTable("Constant differential height, Cutoff")),
          },
          endFix: { longitude: cite(-84.16, trajectoryTable("Terminal phase initiation, Ignition")) },
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "moon",
          start: TPI_IGNITION,
          end: TPI_CUTOFF,
          deltaV: cite(24.1, lunarOrbitTable("LM terminal phase initiation cutoff"), lunarManeuvers("Terminal phase initiation")),
        },
        {
          // The two small midcourse corrections (105:37:56 and 105:52:56)
          // and the braking that began at 106:05:49 are inside this blend.
          kind: "rendezvous",
          label: "Closing in",
          body: "moon",
          start: TPI_CUTOFF,
          end: DOCKED,
          target: "csm",
          apoapsis: cite(58.3, lunarOrbitTable("LM terminal phase initiation cutoff"), lunarManeuvers("Terminal phase initiation")),
          periapsis: cite(46.8, lunarOrbitTable("LM terminal phase initiation cutoff"), lunarManeuvers("Terminal phase initiation")),
          sense: RETROGRADE,
        },
        {
          kind: "docked",
          label: "Docked",
          start: DOCKED,
          end: ASCENT_STAGE_JETTISON,
          target: "csm",
        },
      ],
    },
  ],
};

/** One row of the Apollo 10 ascent table (geocentric latitude). */
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
