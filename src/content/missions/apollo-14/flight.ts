/**
 * The Apollo 14 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the command and service module Kitty Hawk ("csm") and the
 * lunar module Antares ("lm").
 *
 * Sources:
 * - Apollo by the Numbers (NASA SP-2000-4029): event times, the ascent
 *   track, orbit sizes, burns, translunar injection, entry, and splashdown
 *   time. Its times agree with the Apollo 14 Mission Report's Table 6-I,
 *   which prints whole seconds, to within about a second (translunar
 *   injection 02:34:32 against 002:34:33.24, the third stage's impact on
 *   the Moon 82:37:52 against 082:37:53.4), so they are used at their
 *   fuller precision.
 * - Apollo 14 Mission Report (MSC-04112), Table 6-III: where the spacecraft
 *   was at each lunar burn (longitude), the flight-path angles there, the
 *   entry interface height, and the splashdown point.
 * - NSSDCA Apollo Landing Site Coordinates: where Antares landed.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * Every time here is counted from range zero, 21:03:02 GMT on January 31,
 * 1971. At 54:53:36 the crew's onboard clock was moved ahead by 40 minutes
 * 2.90 seconds to make up for the launch delay; Apollo by the Numbers and
 * the Mission Report both give times without that update (Mission Report,
 * Section 2.0, page 2-1), and so does this file.
 *
 * What is drawn as an illustration:
 * - The lunar orbits are drawn in the Moon's equatorial plane, as for
 *   Apollo 11. The landing site is 3.6 degrees south of the equator. The
 *   Mission Report's Table 6-III latitudes for the lunar orbits (from
 *   12.65 degrees south to 11.1 degrees north) are not used, and neither is
 *   the plane change of 117:29:33: it is drawn as a burn between two orbits
 *   of the published sizes, in the same plane.
 * - The lunar module's orbit after undocking is not published on its own.
 *   It is drawn at the size published for just after the separation firing
 *   (60.2 by 7.8 nautical miles), which the command and service module made
 *   with a change of only 0.8 feet per second; that low point matches the
 *   7.8-nautical-mile height at which powered descent began.
 * - The Mission Report prints no radius for the landing site that its lunar
 *   heights are measured from, so `moonReferenceRadius` is left out and
 *   lunar heights are drawn above the Moon's mean radius.
 *
 * - After lunar liftoff, the lunar module's two coasts (from the vernier
 *   adjustment to terminal phase initiation, and from there to terminal
 *   phase finalize) are drawn from published place to published place on
 *   time, not as orbits of the published sizes. Kepler orbits of the
 *   published sizes (51.2 by 8.4, then 60.1 by 46.0 nautical miles) cover
 *   about 3 percent less of the Moon in those times than the published
 *   longitudes need, and the second size is the orbit after two small
 *   midcourse corrections that followed terminal phase initiation (Apollo
 *   by the Numbers, mission summary): its low point, 46.0, is above the
 *   44.8-nautical-mile height at which that burn began.
 *
 * Not used, because Table 6-III's values do not fit together there:
 * - The transearth injection ignition longitude, printed as 81.55 degrees
 *   west, with the cutoff 2 minutes 29.2 seconds later at 168.85 degrees
 *   east: the spacecraft could not have covered that much of its orbit in
 *   so short a firing. The last orbit runs on from the separation maneuver
 *   to the burn.
 * - The docking longitude, printed as 161.87 degrees west: the lunar
 *   module was at 76.7 degrees east 19 minutes before docking (terminal
 *   phase finalize) and could have moved only about 60 degrees west in
 *   that time. The jettison point is not used either:
 *   it is 18 degrees of arc from the separation point 4 minutes 44.5
 *   seconds later, more than the 14 degrees the spacecraft could travel in
 *   that time. One orbit runs from the plane change to the final
 *   separation, pinned at that maneuver's published longitude.
 *
 * The two
 * midcourse corrections on the way out (71.1 and 3.5 feet per second) and the
 * one on the way home (0.5 feet per second) are not drawn as burns: the path
 * to the Moon runs from the published translunar injection to the published
 * arrival, and the path home from the published departure to the published
 * entry.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT =
  "https://web.archive.org/web/20251201235420/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a14/A14MRntrs.pdf";
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES = "&TLIST_TYPE=%27CAL%27&TLIST=%271971-01-31%2021:03:02.57%27,%271971-01-31%2023:37:35.24%27,%271971-02-09%2020:50:47.3%27,%271971-02-09%2021:05:00.1%27";
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
  locator: `Apollo 14 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_14d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 14 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_14e_Earth_Orbit_Phase.htm`,
});
const lunarOrbitTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 14 Lunar Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_14g_Lunar_Orbit_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 14 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_14h_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Apollo 14 Timeline, row "${row}"`,
  url: `${ABN}Apollo_14i_Timeline.htm`,
});
const tliTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Translunar Injection table, Apollo 14 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const entryTable = (row: string): Citation => ({
  source: "apollo-by-the-numbers",
  locator: `Entry, Splashdown, and Recovery table, Apollo 14 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
/** Table 6-III, Trajectory Parameters: printed page 6-4, PDF page 47. */
const trajectoryTable = (row: string): Citation => ({
  source: "apollo-14-mission-report",
  locator: `Table 6-III, "Trajectory Parameters" (page 6-4, PDF page 47), "${row}" row`,
  url: MISSION_REPORT,
});
/** Table 6-I, Sequence of Events: printed page 6-2, PDF page 45. */
const sequence = (row: string): Citation => ({
  source: "apollo-14-mission-report",
  locator: `Table 6-I, "Sequence of Events" (page 6-2, PDF page 45), "${row}" row`,
  url: MISSION_REPORT,
});
const reportText = (section: string, page: string, pdfPage: number, quote: string): Citation => ({
  source: "apollo-14-mission-report",
  locator: `Section ${section} (page ${page}, PDF page ${pdfPage}): ${quote}`,
  url: MISSION_REPORT,
});
const LUNAR_SITES: Citation = {
  source: "nssdca-apollo-landing-sites",
  locator: 'Apollo 14, "Lunar Module" row',
  url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
};
const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY("301", "500@399", "31");
const EARTH_FROM_MOON = HORIZONS_QUERY("399", "500@301", "14");
const SUN_FROM_EARTH = HORIZONS_QUERY("10", "500@399", "31");

/** Lunar orbits run east to west (retrograde), as the burn positions show. */
const RETROGRADE: Cited<"retrograde"> = cite("retrograde", {
  source: "apollo-14-mission-report",
  locator:
    'Table 6-III, "Trajectory Parameters" (page 6-4, PDF page 47): at the lunar burns the longitude decreases from ignition to cutoff (lunar orbit insertion 174.81W to 161.58E, descent orbit insertion 173.60W to 174.65W, circularization 178.56E to 178.35E, plane change 96.31E to 95.40E), so the spacecraft moved westward',
  url: MISSION_REPORT,
});

/** Earth orbit and the coasts run west to east (prograde). */
const PROGRADE_EOI: Cited<"prograde"> = cite("prograde", {
  ...ascentTable("Earth orbit insertion"),
  locator:
    'Apollo 14 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 91.656 degrees east of north, so the orbit runs west to east',
});

/* ------------------------------------------------------------------ */
/* Times used more than once.                                          */
/* ------------------------------------------------------------------ */

const LIFTOFF = at("000:00:00.57", ascentTable("Liftoff"), timeline("Liftoff (umbilical disconnected)."));
const EOI = at("000:11:50.56", ascentTable("Earth orbit insertion"), earthOrbitTable("Earth orbit insertion"));
const TLI_IGNITION = at("002:28:32.40", earthOrbitTable("S-IVB 2nd burn ignition"), sequence("Translunar injection maneuver"));
const TLI_CUTOFF = at("002:34:23.24", earthOrbitTable("S-IVB 2nd burn cutoff"));
const LOI_IGNITION = at("081:56:40.70", lunarOrbitTable("Lunar orbit insertion ignition"), sequence("Lunar orbit insertion"));
const LOI_CUTOFF = at("082:02:51.54", lunarOrbitTable("Lunar orbit insertion cutoff"));
const DOI_IGNITION = at("086:10:52.97", lunarOrbitTable("Descent orbit insertion ignition"), sequence("Descent orbit insertion"));
const DOI_CUTOFF = at("086:11:13.78", lunarOrbitTable("Descent orbit insertion cutoff"));
const UNDOCKING = at(
  "103:47:41.6",
  lunarOrbitTable("CSM/LM undocking/separation ignition"),
  timeline("CSM/LM undocking and separation ignition (SM RCS)."),
  sequence("Lunar module undocking and separation"),
);
const SEPARATION_CUTOFF = at("103:47:44.3", lunarOrbitTable("CSM/LM undocking/separation cutoff"));
const CIRC_IGNITION = at("105:11:46.11", lunarOrbitTable("CSM orbit circularization ignition"), sequence("Circularization maneuver"));
const CIRC_CUTOFF = at("105:11:50.13", lunarOrbitTable("CSM orbit circularization cutoff"));
const PDI = at("108:02:26.52", lunarOrbitTable("LM powered descent initiation"), sequence("Powered descent initiation"));
const LANDING = {
  ...at("108:15:09.30", timeline("LM lunar landing (left pad touchdown)."), sequence("Lunar landing")),
  discrepancy:
    'Apollo by the Numbers\' LM Lunar Landing table gives 108:15:11.40, when the other three pads touched down. We follow the Mission Report, which times the landing from the first pad\'s contact (Table 6-II), 108:15:09, as the Apollo 14 Timeline does.',
};
const PLANE_CHANGE_IGNITION = at("117:29:33.17", lunarOrbitTable("CSM plane change ignition"), sequence("Plane change"));
const PLANE_CHANGE_CUTOFF = at("117:29:51.67", lunarOrbitTable("CSM plane change cutoff"));
const LUNAR_LIFTOFF = at("141:45:40", lunarOrbitTable("LM lunar liftoff ignition"), sequence("Lunar lift-off"));
const ASCENT_CUTOFF = at("141:52:52.1", lunarOrbitTable("Lunar ascent orbit cutoff"));
const VERNIER_IGNITION = at("141:56:49.4", lunarOrbitTable("LM vernier adjustment ignition"), sequence("Vernier adjustment maneuver"));
const VERNIER_CUTOFF = at("141:57:01.5", lunarOrbitTable("LM vernier adjustment cutoff"));
const TPI_IGNITION = at("142:30:51.1", lunarOrbitTable("LM terminal phase initiation ignition"), sequence("Terminal phase initiation"));
const TPI_CUTOFF = at("142:30:54.7", lunarOrbitTable("LM terminal phase initiation cutoff"));
const TPF_IGNITION = at("143:13:29.1", lunarOrbitTable("LM terminal phase finalize ignition"), sequence("Terminal phase finalization"));
const TPF_CUTOFF = at("143:13:55.8", lunarOrbitTable("LM terminal phase finalize cutoff"));
const DOCKING = at("143:32:50.5", lunarOrbitTable("CSM/LM docked"), sequence("Docking"));
const JETTISON = at("145:44:58.0", lunarOrbitTable("LM ascent stage jettisoned"), sequence("Lunar module jettison"));
const FINAL_SEP_IGNITION = at("145:49:42.5", lunarOrbitTable("CSM/LM final separation ignition"), sequence("Separation maneuver"));
const FINAL_SEP_CUTOFF = at("145:49:58.3", lunarOrbitTable("CSM/LM final separation cutoff"));
const TEI_IGNITION = at("148:36:02.30", transearthTable("Transearth injection ignition"), sequence("Transearth injection"));
const TEI_CUTOFF = at("148:38:31.53", transearthTable("Transearth injection cutoff"));
const ENTRY_INTERFACE = at(
  "215:47:45.3",
  timeline("Entry."),
  trajectoryTable("Entry"),
  entryTable("Earth Entry GET"),
  sequence("Entry interface"),
);
const SPLASHDOWN_TIME = at("216:01:58.1", entryTable("Earth Splashdown GET"), timeline("Splashdown (went to apex-up)."), sequence("Landing"));

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const LANDING_SITE_DIFFERS =
  "Apollo by the Numbers (LM Lunar Landing table and Apollo 14 mission summary) gives 3.64530 degrees south, 17.47136 degrees west, and the Mission Report 3 degrees 40 minutes 24 seconds south, 17 degrees 27 minutes 55 seconds west (Section 6.2.2, page 6-7, PDF page 50). We follow NSSDCA's coordinates from Lunar Reconnaissance Orbiter images.";

const LANDING_SITE = {
  latitude: { ...cite(-3.64589, LUNAR_SITES), discrepancy: LANDING_SITE_DIFFERS },
  longitude: { ...cite(-17.47194, LUNAR_SITES), discrepancy: LANDING_SITE_DIFFERS },
};

const SPLASHDOWN_POINT: Citation = reportText(
  "1.0, Mission Summary",
  "1-2",
  9,
  '"the command module landed in the Pacific Ocean at 216:01:58. The landing coordinates were 27 degrees 0 minutes 45 seconds south latitude and 172 degrees 39 minutes 30 seconds west longitude"',
);
const SPLASHDOWN_DIFFERS =
  "Apollo by the Numbers (Apollo 14 mission summary, Recovery, and the Entry, Splashdown, and Recovery table) gives 27.02 degrees south, 172.67 degrees west. We follow the Mission Report, which gives the point the recovery forces calculated (also Section 11.3.1, page 11-3, PDF page 163).";

const SPLASHDOWN = {
  latitude: { ...cite(-(27 + 45 / 3600), SPLASHDOWN_POINT), discrepancy: SPLASHDOWN_DIFFERS },
  longitude: { ...cite(-(172 + 39 / 60 + 30 / 3600), SPLASHDOWN_POINT), discrepancy: SPLASHDOWN_DIFFERS },
};

/** The orbit just after undocking (see the file comment). */
const ORBIT_AFTER_UNDOCKING = {
  apoapsis: cite(60.2, lunarOrbitTable("CSM/LM undocking/separation cutoff")),
  periapsis: cite(7.8, lunarOrbitTable("CSM/LM undocking/separation cutoff")),
};

export const flight: FlightPlan = {
  missionId: "apollo-14",

  // The sky is fit at liftoff, translunar injection, entry interface, and
  // splashdown: the moments when Earth-relative positions shape the path.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(18.9502182, horizons("Moon (301) from Earth's center", "ObsEcLon", "1971-01-31 21:03:02.57", MOON_FROM_EARTH)),
      subLunarLongitude: cite(289.617253, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1971-01-31 21:03:02.57", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(311.3484259, horizons("Sun (10) from Earth's center", "ObsEcLon", "1971-01-31 21:03:02.57", SUN_FROM_EARTH)),
    },
    {
      time: at("002:34:33.24", tliTable("GET")),
      moonEclipticLongitude: cite(20.4792811, horizons("Moon (301) from Earth's center", "ObsEcLon", "1971-01-31 23:37:35.24", MOON_FROM_EARTH)),
      subLunarLongitude: cite(252.283625, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1971-01-31 23:37:35.24", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(311.4573894, horizons("Sun (10) from Earth's center", "ObsEcLon", "1971-01-31 23:37:35.24", SUN_FROM_EARTH)),
    },
    {
      time: ENTRY_INTERFACE,
      moonEclipticLongitude: cite(135.5021366, horizons("Moon (301) from Earth's center", "ObsEcLon", "1971-02-09 20:50:47.3", MOON_FROM_EARTH)),
      subLunarLongitude: cite(46.220881, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1971-02-09 20:50:47.3", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(320.4622325, horizons("Sun (10) from Earth's center", "ObsEcLon", "1971-02-09 20:50:47.3", SUN_FROM_EARTH)),
    },
    {
      time: SPLASHDOWN_TIME,
      moonEclipticLongitude: cite(135.6207392, horizons("Moon (301) from Earth's center", "ObsEcLon", "1971-02-09 21:05:00.1", MOON_FROM_EARTH)),
      subLunarLongitude: cite(42.77279, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1971-02-09 21:05:00.1", EARTH_FROM_MOON)),
      sunEclipticLongitude: cite(320.4722199, horizons("Sun (10) from Earth's center", "ObsEcLon", "1971-02-09 21:05:00.1", SUN_FROM_EARTH)),
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
          end: EOI,
          site: {
            latitude: cite(28.447, ascentTable("Liftoff")),
            latitudeKind: "geocentric",
            longitude: cite(-80.6041, ascentTable("Liftoff")),
          },
          // The model lets the orbit itself take over in the last 30 seconds
          // before insertion, so the "S-IVB 1st burn cutoff" row is listed
          // but not drawn through.
          track: [
            ascentPoint("Mach 1 achieved", "000:01:08.0", 4.337, 28.4521, -80.5787),
            ascentPoint("Maximum dynamic pressure", "000:01:21.0", 6.649, 28.458, -80.5509),
            ascentPoint("S-IC center engine cutoff", "000:02:15.14", 23.202, 28.5441, -80.1598),
            ascentPoint("S-IC outboard engine cutoff", "000:02:44.10", 36.317, 28.6516, -79.6634),
            ascentPoint("S-IC/S-II separation", "000:02:44.8", 36.663, 28.6548, -79.6484),
            ascentPoint("S-II center engine cutoff", "000:07:43.09", 98.091, 30.3347, -69.4425),
            ascentPoint("S-II outboard engine cutoff", "000:09:19.05", 101.556, 30.8611, -63.7444),
            ascentPoint("S-II/S-IVB separation", "000:09:20.00", 101.596, 30.8654, -63.681),
            ascentPoint("S-IVB 1st burn cutoff", "000:11:40.56", 103.091, 31.0978, -53.7349),
          ],
        },
        {
          kind: "orbit",
          label: "Earth parking orbit",
          body: "earth",
          start: EOI,
          end: TLI_IGNITION,
          // Apollo by the Numbers measures these from a spherical Earth of
          // 3,443.934 nautical miles, the equatorial radius the engine uses.
          apoapsis: cite(
            100.1,
            earthOrbitTable("Earth orbit insertion"),
            {
              source: "apollo-by-the-numbers",
              locator:
                'Apollo 14 mission summary, "Ascent Phase" section: "an apogee and perigee of 100.1 by 98.9 n mi ... The apogee and perigee were based upon a spherical Earth with a radius of 3,443.934 n mi"',
              url: `${ABN}Apollo_14a_Summary.htm`,
            },
          ),
          periapsis: cite(98.9, earthOrbitTable("Earth orbit insertion")),
          inclination: cite(31.12, earthOrbitTable("Earth orbit insertion")),
          sense: PROGRADE_EOI,
          // No position is published for the start of the burn to the Moon,
          // so the orbit runs on from insertion for its 1.5 revolutions.
          startFix: {
            latitude: cite(31.0806, ascentTable("Earth orbit insertion")),
            latitudeKind: "geocentric",
            longitude: cite(-52.9826, ascentTable("Earth orbit insertion")),
            altitude: cite(103.086, ascentTable("Earth orbit insertion")),
            speed: cite(25_565.8, ascentTable("Earth orbit insertion")),
            flightPathAngle: cite(-0.003, ascentTable("Earth orbit insertion")),
            heading: cite(91.656, ascentTable("Earth orbit insertion")),
          },
        },
        {
          kind: "burn",
          label: "Translunar injection",
          body: "earth",
          start: TLI_IGNITION,
          end: TLI_CUTOFF,
          deltaV: cite(10_366.5, earthOrbitTable("S-IVB 2nd burn cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast to the Moon",
          to: "moon",
          start: TLI_CUTOFF,
          end: LOI_IGNITION,
          earthFix: {
            time: at("002:34:33.24", tliTable("GET")),
            latitude: cite(-19.554, tliTable("Geodetic Latitude (deg N)")),
            longitude: cite(141.7312, tliTable("Longitude (deg E)")),
            altitude: cite(179.544, tliTable("Altitude (n mi)")),
            speed: cite(35_511.6, tliTable("Space-Fixed Velocity (ft/sec)")),
            flightPathAngle: cite(7.48, tliTable("Flight Path Angle (deg)")),
            heading: cite(65.583, tliTable("Heading Angle (deg E of N)")),
          },
          // 174.81 degrees west is on the Moon's far side.
          moonFix: {
            longitude: cite(-174.81, trajectoryTable("Lunar orbit insertion, Ignition")),
            altitude: cite(87.4, lunarOrbitTable("Lunar orbit insertion ignition"), trajectoryTable("Lunar orbit insertion, Ignition")),
            speed: cite(8_061.4, lunarOrbitTable("Lunar orbit insertion ignition"), trajectoryTable("Lunar orbit insertion, Ignition")),
            flightPathAngle: cite(-9.97, trajectoryTable("Lunar orbit insertion, Ignition")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...tliTable("Heading Angle (deg E of N)"),
            locator:
              'Translunar Injection table, Apollo 14 column, "Heading Angle (deg E of N)": 65.583 degrees, so the path leaves Earth heading east',
          }),
          // The path is drawn as the published arrival requires. It left
          // Earth on a free return; the first midcourse correction put it
          // on a "hybrid" path that would not have come home on its own.
          freeReturn: cite(
            false,
            reportText(
              "6.1, Launch and Translunar Trajectories",
              "6-1",
              44,
              '"The S-IVB was targeted for the translunar injection maneuver to achieve a 2022-mile pericynthion free-return trajectory. The command and service module/lunar module trajectory was altered 28 hours later by the first midcourse correction which placed the combined spacecraft on a hybrid trajectory with a pericynthion of 67.0 miles"',
            ),
          ),
        },
        {
          kind: "burn",
          label: "Lunar orbit insertion",
          body: "moon",
          start: LOI_IGNITION,
          end: LOI_CUTOFF,
          deltaV: cite(3_022.4, lunarOrbitTable("Lunar orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "First lunar orbits",
          body: "moon",
          start: LOI_CUTOFF,
          end: DOI_IGNITION,
          apoapsis: cite(169.0, lunarOrbitTable("Lunar orbit insertion cutoff")),
          periapsis: cite(58.1, lunarOrbitTable("Lunar orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(161.58, trajectoryTable("Lunar orbit insertion, Cutoff")),
            altitude: cite(64.2, lunarOrbitTable("Lunar orbit insertion cutoff"), trajectoryTable("Lunar orbit insertion, Cutoff")),
            flightPathAngle: cite(1.3, trajectoryTable("Lunar orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(-173.6, trajectoryTable("Descent orbit insertion, Ignition")) },
        },
        {
          // On earlier landings the lunar module's own engine made this
          // firing; on Apollo 14 the command and service module did, with the
          // lunar module still docked, to save the lunar module's fuel.
          kind: "burn",
          label: "Descent orbit insertion",
          body: "moon",
          start: DOI_IGNITION,
          end: DOI_CUTOFF,
          deltaV: cite(205.7, lunarOrbitTable("Descent orbit insertion cutoff")),
        },
        {
          kind: "orbit",
          label: "Low orbit, docked",
          body: "moon",
          start: DOI_CUTOFF,
          end: UNDOCKING,
          apoapsis: cite(58.8, lunarOrbitTable("Descent orbit insertion cutoff")),
          periapsis: cite(9.1, lunarOrbitTable("Descent orbit insertion cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-174.65, trajectoryTable("Descent orbit insertion, Cutoff")),
            altitude: cite(59.0, lunarOrbitTable("Descent orbit insertion cutoff"), trajectoryTable("Descent orbit insertion, Cutoff")),
            flightPathAngle: cite(-0.03, trajectoryTable("Descent orbit insertion, Cutoff")),
          },
          endFix: { longitude: cite(87.76, trajectoryTable("Command and service module/lunar module separation")) },
        },
        {
          kind: "burn",
          label: "Separation from the lunar module",
          body: "moon",
          start: UNDOCKING,
          end: SEPARATION_CUTOFF,
          deltaV: cite(0.8, lunarOrbitTable("CSM/LM undocking/separation cutoff")),
        },
        {
          kind: "orbit",
          label: "Low orbit, undocked",
          body: "moon",
          start: SEPARATION_CUTOFF,
          end: CIRC_IGNITION,
          ...ORBIT_AFTER_UNDOCKING,
          sense: RETROGRADE,
          endFix: { longitude: cite(178.56, trajectoryTable("Command and service module circularization, Ignition")) },
        },
        {
          kind: "burn",
          label: "Circularization",
          body: "moon",
          start: CIRC_IGNITION,
          end: CIRC_CUTOFF,
          deltaV: cite(77.2, lunarOrbitTable("CSM orbit circularization cutoff")),
        },
        {
          kind: "orbit",
          label: "Lunar orbit, Kitty Hawk alone",
          body: "moon",
          start: CIRC_CUTOFF,
          end: PLANE_CHANGE_IGNITION,
          apoapsis: cite(63.9, lunarOrbitTable("CSM orbit circularization cutoff")),
          periapsis: cite(56.0, lunarOrbitTable("CSM orbit circularization cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(178.35, trajectoryTable("Command and service module circularization, Cutoff")),
            altitude: cite(60.3, lunarOrbitTable("CSM orbit circularization cutoff"), trajectoryTable("Command and service module circularization, Cutoff")),
            flightPathAngle: cite(0.22, trajectoryTable("Command and service module circularization, Cutoff")),
          },
          endFix: { longitude: cite(96.31, trajectoryTable("Command and service module plane change, Ignition")) },
        },
        {
          // A change of plane, so the command and service module would pass
          // over the landing site when Antares lifted off. Only its change
          // of size is drawn (see the file comment).
          kind: "burn",
          label: "Plane change",
          body: "moon",
          start: PLANE_CHANGE_IGNITION,
          end: PLANE_CHANGE_CUTOFF,
          deltaV: cite(370.5, lunarOrbitTable("CSM plane change cutoff")),
        },
        {
          // One orbit from the plane change to the final separation, through
          // Antares' return (docking 143:32:50.5) and its release (jettison
          // 145:44:58.0), which change only the vehicle's shape. Table 6-III's
          // docking and jettison longitudes are not used (see the file
          // comment).
          kind: "orbit",
          label: "Lunar orbit, waiting for Antares",
          body: "moon",
          start: PLANE_CHANGE_CUTOFF,
          end: FINAL_SEP_IGNITION,
          apoapsis: cite(62.1, lunarOrbitTable("CSM plane change cutoff")),
          periapsis: cite(57.7, lunarOrbitTable("CSM plane change cutoff")),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(95.4, trajectoryTable("Command and service module plane change, Cutoff")),
            altitude: cite(62.1, lunarOrbitTable("CSM plane change cutoff"), trajectoryTable("Command and service module plane change, Cutoff")),
            flightPathAngle: cite(0.01, trajectoryTable("Command and service module plane change, Cutoff")),
          },
          endFix: { longitude: cite(-39.58, trajectoryTable("Command and service module separation")) },
        },
        {
          kind: "burn",
          label: "Final separation",
          body: "moon",
          start: FINAL_SEP_IGNITION,
          end: FINAL_SEP_CUTOFF,
          deltaV: cite(3.4, lunarOrbitTable("CSM/LM final separation cutoff")),
        },
        {
          // No end fix: see the file comment about the transearth injection
          // ignition longitude.
          kind: "orbit",
          label: "Last lunar orbits",
          body: "moon",
          start: FINAL_SEP_CUTOFF,
          end: TEI_IGNITION,
          apoapsis: cite(63.4, lunarOrbitTable("CSM/LM final separation cutoff")),
          periapsis: cite(56.8, lunarOrbitTable("CSM/LM final separation cutoff")),
          sense: RETROGRADE,
        },
        {
          kind: "burn",
          label: "Transearth injection",
          body: "moon",
          start: TEI_IGNITION,
          end: TEI_CUTOFF,
          deltaV: cite(3_460.6, transearthTable("Transearth injection cutoff")),
        },
        {
          kind: "transfer",
          label: "Coast home",
          to: "earth",
          start: TEI_CUTOFF,
          end: ENTRY_INTERFACE,
          moonFix: {
            longitude: cite(168.85, trajectoryTable("Transearth injection, Cutoff")),
            altitude: cite(66.5, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
            speed: cite(8_505, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
            flightPathAngle: cite(5.29, transearthTable("Transearth injection cutoff"), trajectoryTable("Transearth injection, Cutoff")),
          },
          earthFix: {
            latitude: cite(-36.36, entryTable("Earth Entry Geodetic Latitude (deg N)"), trajectoryTable("Entry")),
            longitude: cite(165.8, entryTable("Earth Entry Longitude (deg E)"), trajectoryTable("Entry")),
            altitude: cite(66.8, trajectoryTable("Entry")),
            speed: cite(36_170.2, entryTable("Earth Entry Velocity (ft/sec)"), trajectoryTable("Entry")),
            flightPathAngle: cite(-6.37, entryTable("Earth Entry Flight Path Angle"), trajectoryTable("Entry")),
            heading: cite(70.84, entryTable("Earth Entry Heading Angle (deg)"), trajectoryTable("Entry")),
          },
          lunarSense: RETROGRADE,
          earthSense: cite("prograde", {
            ...entryTable("Earth Entry Heading Angle (deg)"),
            locator:
              'Entry, Splashdown, and Recovery table, Apollo 14 column, "Heading Angle": 70.84 degrees, so the spacecraft arrived heading east',
          }),
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: ENTRY_INTERFACE,
          end: SPLASHDOWN_TIME,
          drogue: at("215:56:08", timeline("Drogue parachute deployed"), sequence("Drogue deployment")),
          splashdown: SPLASHDOWN,
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
          start: UNDOCKING,
          end: PDI,
          ...ORBIT_AFTER_UNDOCKING,
          sense: RETROGRADE,
          from: "csm",
          endFix: { longitude: cite(-1.57, trajectoryTable("Powered descent initiation")) },
        },
        {
          kind: "descent",
          label: "Powered descent",
          body: "moon",
          start: PDI,
          end: LANDING,
          site: LANDING_SITE,
        },
        {
          kind: "surface",
          label: "Fra Mauro",
          body: "moon",
          start: LANDING,
          end: LUNAR_LIFTOFF,
          site: LANDING_SITE,
        },
        {
          kind: "ascent",
          label: "Lunar liftoff",
          body: "moon",
          start: LUNAR_LIFTOFF,
          end: ASCENT_CUTOFF,
          site: LANDING_SITE,
        },
        {
          kind: "orbit",
          label: "Into lunar orbit",
          body: "moon",
          start: ASCENT_CUTOFF,
          end: VERNIER_IGNITION,
          apoapsis: cite(51.7, lunarOrbitTable("Lunar ascent orbit cutoff")),
          periapsis: cite(8.5, lunarOrbitTable("Lunar ascent orbit cutoff")),
          sense: RETROGRADE,
          endFix: { longitude: cite(-37.1, trajectoryTable("Vernier adjustment")) },
        },
        {
          kind: "burn",
          label: "Vernier adjustment",
          body: "moon",
          start: VERNIER_IGNITION,
          end: VERNIER_CUTOFF,
          deltaV: cite(10.3, lunarOrbitTable("LM vernier adjustment cutoff")),
        },
        {
          // Drawn from place to place on time (see the file comment); the
          // latitude is part of the fix's type but not used over the Moon.
          kind: "coast",
          label: "Catching up",
          body: "moon",
          start: VERNIER_CUTOFF,
          end: TPI_IGNITION,
          sense: RETROGRADE,
          endFix: {
            latitude: cite(11.1, trajectoryTable("Terminal phase initiation")),
            longitude: cite(-149.6, trajectoryTable("Terminal phase initiation")),
            altitude: cite(44.8, lunarOrbitTable("LM terminal phase initiation ignition"), trajectoryTable("Terminal phase initiation")),
          },
        },
        {
          kind: "burn",
          label: "Terminal phase initiation",
          body: "moon",
          start: TPI_IGNITION,
          end: TPI_CUTOFF,
          deltaV: cite(88.5, lunarOrbitTable("LM terminal phase initiation cutoff")),
        },
        {
          kind: "coast",
          label: "Closing in",
          body: "moon",
          start: TPI_CUTOFF,
          end: TPF_IGNITION,
          sense: RETROGRADE,
          endFix: {
            latitude: cite(-11.3, trajectoryTable("Terminal phase final")),
            longitude: cite(76.7, trajectoryTable("Terminal phase final")),
            altitude: cite(58.8, lunarOrbitTable("LM terminal phase finalize ignition"), trajectoryTable("Terminal phase final")),
          },
        },
        {
          kind: "burn",
          label: "Terminal phase finalize",
          body: "moon",
          start: TPF_IGNITION,
          end: TPF_CUTOFF,
          deltaV: cite(32, lunarOrbitTable("LM terminal phase finalize cutoff")),
        },
        {
          kind: "rendezvous",
          label: "Docking approach",
          body: "moon",
          start: TPF_CUTOFF,
          end: DOCKING,
          target: "csm",
          apoapsis: cite(61.5, lunarOrbitTable("LM terminal phase finalize cutoff")),
          periapsis: cite(58.2, lunarOrbitTable("LM terminal phase finalize cutoff")),
          sense: RETROGRADE,
        },
        {
          kind: "docked",
          label: "Docked",
          start: DOCKING,
          end: JETTISON,
          target: "csm",
        },
      ],
    },
  ],
};

/** One row of the Apollo 14 ascent table (geocentric latitude). */
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
