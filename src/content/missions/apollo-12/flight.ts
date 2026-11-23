import type { FlightPlan } from '../../../sim/types.ts';
/**
 * The Apollo 12 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Sources:
 * - Apollo 12 Mission Report (MSC-01855): event times (Table 5-I), where the
 *   spacecraft was at each burn, in latitude and longitude over Earth or the
 *   Moon (Table 5-III), the orbit after each lunar burn (Table 5-VI), and the
 *   entry interface (Table 5-IX). It is the more primary source, so its
 *   values are followed where Apollo by the Numbers differs from them by
 *   more than the report's rounding (the discrepancy fields say where).
 * - Apollo by the Numbers (NASA SP-2000-4029): the ascent track, the Earth
 *   orbit, translunar injection, burn ends the report does not print, and
 *   times at the precision the report rounds away where the two agree.
 * - NSSDCA Apollo Landing Site Coordinates: where Intrepid landed.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * Lunar heights: the report measures them from the landing site's radius
 * (Table 5-II, page 5-3) but does not print that radius, so the plan gives
 * no `moonReferenceRadius` and the model measures from the Moon's mean
 * radius (a difference of a mile or two).
 *
 * The lunar orbits are drawn over the Moon's equator, as Apollo 11's are.
 * The real orbit was tilted more than Apollo 11's: the burn positions in
 * Table 5-III reach 14.57 degrees north and 14.53 degrees south. The landing
 * site, 3 degrees south, lies close enough to the equator that the descent
 * and liftoff stay smooth. The two plane changes are drawn as burns that
 * change only the orbit's size, because the model keeps every lunar orbit in
 * one plane.
 *
 * Not drawn: the midcourse corrections (61.8 feet per second on the way out,
 * which moved Apollo 12 off a free-return path, and 2.0 and 2.4 on the way
 * home), the lunar module's two small corrections before docking, and the
 * ascent stage's crash into the Moon after it was cast off.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const MISSION_REPORT =
  'https://web.archive.org/web/20251203061616/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a12/A12_MissionReport.pdf';
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES =
  '&TLIST_TYPE=%27CAL%27&TLIST=%271969-11-14%2016:22:00.68%27,%271969-11-14%2019:15:13.94%27,%271969-11-24%2020:44:19.09%27,%271969-11-24%2020:58:25%27';
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const ascentTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 12 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_12d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 12 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_12e_Earth_Orbit_Phase.htm`,
});
const lunarOrbitTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 12 Lunar Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_12g_Lunar_Orbit_Phase.htm`,
});
/**
 * The table has two pairs of "CSM/LM separation" rows: the first after
 * undocking, the second after the ascent stage was cast off.
 */
const separationRow = (
  which: 'first' | 'second',
  end: 'ignition' | 'cutoff',
  time: string,
): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 12 Lunar Orbit Phase table, the ${which} "CSM/LM separation ${end}" row (${time})`,
  url: `${ABN}Apollo_12g_Lunar_Orbit_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 12 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_12h_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 12 Timeline, row "${row}"`,
  url: `${ABN}Apollo_12i_Timeline.htm`,
});
const summary = (section: string, quote: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 12 mission summary, "${section}" section: ${quote}`,
  url: `${ABN}Apollo_12a_Summary.htm`,
});
const tliTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Translunar Injection table, Apollo 12 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const entryTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Entry, Splashdown, and Recovery table, Apollo 12 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
/** Table 5-I, Sequence of Events: printed pages 5-1 and 5-2, PDF pages 83 and 84. */
const sequence = (row: string, page: '5-1' | '5-2'): Citation => ({
  source: 'apollo-12-mission-report',
  locator: `Table 5-I, "Sequence of Events" (page ${page}, PDF page ${page === '5-1' ? 83 : 84}), "${row}" row`,
  url: MISSION_REPORT,
});
/** Table 5-III, Trajectory Parameters: printed page 5-5, PDF page 87 (printed sideways). */
const trajectoryTable = (row: string): Citation => ({
  source: 'apollo-12-mission-report',
  locator: `Table 5-III, "Trajectory Parameters" (page 5-5, PDF page 87), "${row}" row`,
  url: MISSION_REPORT,
});
/** Table 5-VI, Lunar Orbit Maneuver Summary: printed page 5-9, PDF page 91. */
const maneuverTable = (row: string): Citation => ({
  source: 'apollo-12-mission-report',
  locator: `Table 5-VI, "Lunar Orbit Maneuver Summary" (page 5-9, PDF page 91), "${row}" row`,
  url: MISSION_REPORT,
});
const entryParameters = (row: string): Citation => ({
  source: 'apollo-12-mission-report',
  locator: `Table 5-IX, "Entry Trajectory Parameters" (page 5-14, PDF page 96), "Entry interface (400 000 feet altitude)": ${row}`,
  url: MISSION_REPORT,
});
const reportText = (section: string, page: string, pdfPage: number, quote: string): Citation => ({
  source: 'apollo-12-mission-report',
  locator: `Section ${section} (page ${page}, PDF page ${pdfPage}): ${quote}`,
  url: MISSION_REPORT,
});
const LUNAR_SITES: Citation = {
  source: 'nssdca-apollo-landing-sites',
  locator: 'Apollo 12, "Lunar Module" row',
  url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
};
const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: 'jpl-horizons',
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY('301', '500@399', '31');
const EARTH_FROM_MOON = HORIZONS_QUERY('399', '500@301', '14');
const SUN_FROM_EARTH = HORIZONS_QUERY('10', '500@399', '31');

/** Lunar orbits run east to west (retrograde), as the burn positions show. */
const RETROGRADE: Cited<'retrograde'> = cite('retrograde', {
  source: 'apollo-12-mission-report',
  locator:
    'Table 5-III, "Trajectory Parameters" (page 5-5, PDF page 87): at every lunar burn the longitude decreases from ignition to cutoff (lunar orbit insertion 175.61E to 154.04E, circularization 151.67E to 150.85E, separation 7.44W to 8.14W, transearth injection 170.25W to 178.56W), so the spacecraft moved westward',
  url: MISSION_REPORT,
});

/** Earth orbit and the coasts run west to east (prograde). */
const PROGRADE_EOI: Cited<'prograde'> = cite('prograde', {
  ...ascentTable('Earth orbit insertion'),
  locator:
    'Apollo 12 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 88.580 degrees east of north, so the orbit runs west to east',
});

/** Apollo by the Numbers' orbit sizes, where they differ from the Mission Report's Table 5-VI that we follow. */
const abnSize = (row: string, apolune: string, perilune: string) =>
  `Apollo by the Numbers (Apollo 12 Lunar Orbit Phase table, ${row}) gives ${apolune} by ${perilune} nautical miles. We follow the Mission Report's Table 5-VI.`;

/* ------------------------------------------------------------------ */
/* Times used more than once.                                          */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  '000:00:00.68',
  ascentTable('Liftoff'),
  timeline('Liftoff (umbilical disconnected).'),
  sequence('Lift-off', '5-1'),
);
const EOI = at(
  '000:11:43.91',
  ascentTable('Earth orbit insertion'),
  earthOrbitTable('Earth orbit insertion'),
);
const TLI_IGNITION: Cited<ElapsedTime> = {
  ...at(
    '002:47:22.7',
    trajectoryTable('S-IVB second ignition'),
    sequence('Translunar injection maneuver', '5-1'),
  ),
  discrepancy:
    "Apollo by the Numbers (Apollo 12 Earth Orbit Phase table and Timeline) gives the S-IVB second burn ignition as 002:47:22.80. We follow the Mission Report's Table 5-III, 2:47:22.7 (its Table 5-I rounds it to 02:47:23).",
};
const TLI_CUTOFF = at(
  '002:53:03.94',
  earthOrbitTable('S-IVB 2nd burn cutoff'),
  trajectoryTable('S-IVB second cutoff'),
);
const LOI_IGNITION = at(
  '083:25:23.36',
  lunarOrbitTable('Lunar orbit insertion ignition'),
  trajectoryTable('Lunar orbit insertion, Ignition'),
);
const LOI_CUTOFF: Cited<ElapsedTime> = {
  ...at('083:31:15.7', trajectoryTable('Lunar orbit insertion, Cutoff')),
  discrepancy:
    "Apollo by the Numbers (Apollo 12 Lunar Orbit Phase table and Timeline) gives lunar orbit insertion cutoff at 083:31:15.61. We follow the Mission Report's Table 5-III, 83:31:15.7.",
};
const LOC_IGNITION = at(
  '087:48:48.08',
  lunarOrbitTable('Lunar orbit circularization ignition'),
  trajectoryTable('Lunar orbit circularization, Ignition'),
);
const LOC_CUTOFF = at(
  '087:49:04.99',
  lunarOrbitTable('Lunar orbit circularization cutoff'),
  trajectoryTable('Lunar orbit circularization, Cutoff'),
);
const UNDOCKING = at(
  '107:54:02.3',
  lunarOrbitTable('CSM/LM undocked'),
  trajectoryTable('Undocking'),
  sequence('Undocking', '5-2'),
);
const SEPARATION_IGNITION = at(
  '108:24:36.8',
  separationRow('first', 'ignition', '108:24:36.8'),
  trajectoryTable('Separation, Ignition'),
);
const SEPARATION_CUTOFF = at(
  '108:24:51.2',
  separationRow('first', 'cutoff', '108:24:51.2'),
  trajectoryTable('Separation, Cutoff'),
);
const DOI_IGNITION = at(
  '109:23:39.9',
  lunarOrbitTable('LM descent orbit insertion ignition'),
  trajectoryTable('Descent orbit insertion, Ignition'),
);
const DOI_CUTOFF = at(
  '109:24:08.9',
  lunarOrbitTable('LM descent orbit insertion cutoff'),
  trajectoryTable('Descent orbit insertion, Cutoff'),
);
const PDI = at(
  '110:20:38.1',
  lunarOrbitTable('LM powered descent initiation'),
  trajectoryTable('Powered descent initiation'),
);
const LANDING = at(
  '110:32:36.2',
  timeline('LM lunar landing.'),
  trajectoryTable('Landing'),
  sequence('Lunar landing', '5-2'),
);
const PLANE_CHANGE_1_IGNITION = at(
  '119:47:13.23',
  lunarOrbitTable('CSM plane change ignition'),
  trajectoryTable('Command and service module plane change'),
);
const PLANE_CHANGE_1_CUTOFF = at('119:47:31.46', lunarOrbitTable('CSM plane change cutoff'));
const LIFTOFF_FROM_MOON = at(
  '142:03:47.78',
  lunarOrbitTable('LM lunar liftoff ignition'),
  sequence('Lunar lift-off', '5-2'),
);
const LM_INSERTION = at(
  '142:10:59.9',
  lunarOrbitTable('LM orbit insertion'),
  timeline('LM ascent stage orbit insertion.'),
);
const CSI_IGNITION = at(
  '143:01:51.0',
  lunarOrbitTable('LM coelliptic sequence initiation ignition'),
  trajectoryTable('Coelliptic sequence initiation, Ignition'),
);
const CSI_CUTOFF = at(
  '143:02:32.1',
  lunarOrbitTable('LM coelliptic sequence initiation cutoff'),
  trajectoryTable('Coelliptic sequence initiation, Cutoff'),
);
const CDH_IGNITION = at(
  '144:00:02.6',
  lunarOrbitTable('LM constant differential height ignition'),
  maneuverTable('Constant differential height'),
);
const CDH_CUTOFF = at('144:00:15.6', lunarOrbitTable('LM constant differential height cutoff'));
const TPI_IGNITION = at(
  '144:36:26',
  lunarOrbitTable('LM terminal phase initiation ignition'),
  trajectoryTable('Terminal phase initiation'),
);
const TPI_CUTOFF = at('144:36:52', lunarOrbitTable('LM terminal phase initiation cutoff'));
const TPF_IGNITION = at(
  '145:19:29.3',
  lunarOrbitTable('LM terminal phase finalize ignition'),
  maneuverTable('Terminal phase finalization'),
);
const TPF_CUTOFF = at('145:20:07.3', lunarOrbitTable('LM terminal phase finalize cutoff'));
const DOCKING = at(
  '145:36:20.2',
  lunarOrbitTable('CSM/LM docked'),
  trajectoryTable('Docking'),
  sequence('Lunar orbit docking', '5-2'),
);
const JETTISON = at(
  '147:59:31.6',
  lunarOrbitTable('LM ascent stage jettison'),
  sequence('Ascent stage jettison', '5-2'),
);
const FINAL_SEPARATION_IGNITION = at(
  '148:04:30.9',
  separationRow('second', 'ignition', '148:04:30.9'),
  trajectoryTable('Command and service module/ascent stage separation'),
);
const FINAL_SEPARATION_CUTOFF = at('148:04:36.3', separationRow('second', 'cutoff', '148:04:36.3'));
const PLANE_CHANGE_2_IGNITION = at(
  '159:04:45.47',
  lunarOrbitTable('CSM orbit plane change ignition'),
  trajectoryTable('Plane change, Ignition'),
);
const PLANE_CHANGE_2_CUTOFF = at(
  '159:05:04.72',
  lunarOrbitTable('CSM orbit plane change cutoff'),
  trajectoryTable('Plane change, Cutoff'),
);
const TEI_IGNITION = at(
  '172:27:16.81',
  transearthTable('Transearth injection ignition'),
  trajectoryTable('Transearth injection, Ignition'),
);
const TEI_CUTOFF = at(
  '172:29:27.13',
  transearthTable('Transearth injection cutoff'),
  trajectoryTable('Transearth injection, Cutoff'),
);
const ENTRY_INTERFACE = at(
  '244:22:19.09',
  entryTable('Earth Entry GET'),
  entryParameters('Time, 244:22:19.1'),
);
const SPLASHDOWN_TIME = at(
  '244:36:25',
  entryTable('Earth Splashdown GET'),
  sequence('Landing', '5-2'),
);

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const LANDING_SITE_DIFFERS =
  "Apollo by the Numbers (LM Lunar Landing table and mission summary) gives the older 3.01239 degrees south, 23.42157 degrees west. The Mission Report gives 3 degrees 11 minutes 51 seconds south, 23 degrees 23 minutes 7.5 seconds west on the Surveyor III Site Map of 1968 (Section 5.0, page 5-8, PDF page 90), and 3.04S, 23.42W in its Table 5-III. We follow NSSDCA's coordinates, measured from Lunar Reconnaissance Orbiter images.";

const LANDING_SITE = {
  latitude: { ...cite(-3.0128, LUNAR_SITES), discrepancy: LANDING_SITE_DIFFERS },
  longitude: { ...cite(-23.4219, LUNAR_SITES), discrepancy: LANDING_SITE_DIFFERS },
};

/** The orbit after circularization, kept through undocking (as Apollo 11's plan does). */
const CSM_PARKING_ORBIT = {
  apoapsis: {
    ...cite(66.1, maneuverTable('Lunar orbit circularization')),
    discrepancy: abnSize('"Lunar orbit circularization cutoff" row', '66.10', '54.59'),
  },
  periapsis: cite(54.3, maneuverTable('Lunar orbit circularization')),
};

const SPLASHDOWN_POINT: Citation = reportText(
  '5.0, Trajectory',
  '5-12',
  94,
  '"The landing was within 2 miles of the intended location and occurred at 15 degrees 46.6 minutes south latitude and 165 degrees 9 minutes west longitude, as determined from the recovery ship"',
);
const SPLASHDOWN_DIFFERS =
  "Apollo by the Numbers (Entry, Splashdown, and Recovery table, and mission summary) gives 15.78 degrees south, 165.15 degrees west, the same point to its rounding. The Mission Report's summary gives the onboard computer's 15 degrees 52 minutes south, 165 degrees 10 minutes west (Section 1.0, page 1-2, PDF page 8). We follow the recovery ship's fix.";

export const flight: FlightPlan = {
  missionId: 'apollo-12',

  // The sky is fit at liftoff, translunar injection, entry interface, and
  // splashdown: the moments when Earth-relative positions shape the path.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(
        296.1045923,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1969-11-14 16:22:00.68',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        359.848777,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1969-11-14 16:22:00.68',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        232.1332521,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1969-11-14 16:22:00.68',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: at('002:53:13.94', tliTable('GET')),
      moonEclipticLongitude: cite(
        297.8332294,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1969-11-14 19:15:13.94',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        318.264626,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1969-11-14 19:15:13.94',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        232.254448,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1969-11-14 19:15:13.94',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: ENTRY_INTERFACE,
      moonEclipticLongitude: cite(
        72.3873501,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1969-11-24 20:44:19.09',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        55.489571,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1969-11-24 20:44:19.09',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        242.4096687,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1969-11-24 20:44:19.09',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: SPLASHDOWN_TIME,
      moonEclipticLongitude: cite(
        72.508885,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1969-11-24 20:58:25',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        52.090065,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1969-11-24 20:58:25',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        242.4195686,
        horizons("Sun (10) from Earth's center", 'ObsEcLon', '1969-11-24 20:58:25', SUN_FROM_EARTH),
      ),
    },
  ],

  ships: [
    {
      id: 'csm',
      name: 'Command and service module',
      role: 'main',
      phases: [
        {
          kind: 'ascent',
          label: 'Launch',
          body: 'earth',
          start: LIFTOFF,
          end: EOI,
          site: {
            latitude: cite(28.447, ascentTable('Liftoff')),
            latitudeKind: 'geocentric',
            longitude: cite(-80.6041, ascentTable('Liftoff')),
          },
          // The "1st lightning strike" row is left out: the table's footnote
          // says its data is for 36 seconds, not the row's 36.5. The model
          // lets the orbit itself take over in the last 30 seconds before
          // insertion, so the "S-IVB 1st burn cutoff" row is listed but not
          // drawn through.
          track: [
            ascentPoint('2nd lightning strike', '000:00:52', 2.374, 28.4487, -80.5968),
            ascentPoint('Mach 1 achieved', '000:01:06.1', 4.215, 28.4532, -80.582),
            ascentPoint('Maximum dynamic pressure', '000:01:21.1', 6.934, 28.4627, -80.5498),
            ascentPoint('S-IC center engine cutoff', '000:02:15.24', 24.158, 28.5794, -80.1463),
            ascentPoint('S-IC outboard engine cutoff', '000:02:41.74', 36.773, 28.7069, -79.6913),
            ascentPoint('S-IC/S-II separation', '000:02:42.4', 37.118, 28.7107, -79.6773),
            ascentPoint('S-II center engine cutoff', '000:07:40.75', 100.463, 30.9599, -69.4827),
            ascentPoint('S-II outboard engine cutoff', '000:09:12.34', 102.801, 31.7508, -63.9914),
            ascentPoint('S-II/S-IVB separation', '000:09:13.20', 102.827, 31.7576, -63.9341),
            ascentPoint('S-IVB 1st burn cutoff', '000:11:33.91', 103.093, 32.4933, -53.8956),
          ],
        },
        {
          kind: 'orbit',
          label: 'Earth parking orbit',
          body: 'earth',
          start: EOI,
          end: TLI_IGNITION,
          // Apollo by the Numbers measures these from a spherical Earth of
          // 3,443.934 nautical miles, the equatorial radius the engine uses.
          // The Mission Report's Table 5-III prints no position for the
          // S-IVB's second ignition, so the orbit has no end fix.
          apoapsis: cite(
            100.1,
            earthOrbitTable('Earth orbit insertion'),
            summary(
              'Ascent Phase',
              '"an apogee and perigee of 100.1 by 97.8 n mi ... based upon a spherical Earth with a radius of 3,443.934 n mi"',
            ),
          ),
          periapsis: cite(97.8, earthOrbitTable('Earth orbit insertion')),
          inclination: cite(32.54, earthOrbitTable('Earth orbit insertion')),
          sense: PROGRADE_EOI,
          startFix: {
            latitude: cite(32.5128, ascentTable('Earth orbit insertion')),
            latitudeKind: 'geocentric',
            longitude: cite(-53.1311, ascentTable('Earth orbit insertion')),
            altitude: cite(103.086, ascentTable('Earth orbit insertion')),
            speed: cite(25_565.9, ascentTable('Earth orbit insertion')),
            flightPathAngle: cite(-0.014, ascentTable('Earth orbit insertion')),
            heading: cite(88.58, ascentTable('Earth orbit insertion')),
          },
        },
        {
          kind: 'burn',
          label: 'Translunar injection',
          body: 'earth',
          start: TLI_IGNITION,
          end: TLI_CUTOFF,
          deltaV: cite(10_515, earthOrbitTable('S-IVB 2nd burn cutoff')),
        },
        {
          // One coast from translunar injection to lunar orbit insertion. The
          // midcourse correction at 30:52:44 that moved Apollo 12 off its
          // free-return path is too small to draw, so `freeReturn` is left
          // out: the drawn path is the one after it.
          kind: 'transfer',
          label: 'Coast to the Moon',
          to: 'moon',
          start: TLI_CUTOFF,
          end: LOI_IGNITION,
          earthFix: {
            time: at('002:53:13.94', tliTable('GET')),
            latitude: cite(16.176, tliTable('Geodetic Latitude (deg N)')),
            longitude: {
              ...cite(-154.2798, tliTable('Longitude (deg E)')),
              discrepancy:
                "The Mission Report's Table 5-III (page 5-5) prints for translunar injection the same position and velocity as for S-IVB cutoff 10 seconds earlier: 15.83N, 154.98W, 192.1 miles, 35,427 feet per second. We follow Apollo by the Numbers, whose values are for 10 seconds after cutoff.",
            },
            altitude: cite(199.023, tliTable('Altitude (n mi)')),
            speed: cite(35_389.8, tliTable('Space-Fixed Velocity (ft/sec)')),
            flightPathAngle: cite(8.584, tliTable('Flight Path Angle (deg)')),
            heading: cite(63.902, tliTable('Heading Angle (deg E of N)')),
          },
          moonFix: {
            // 175.61 degrees east is on the far side of the Moon.
            longitude: cite(175.61, trajectoryTable('Lunar orbit insertion, Ignition'), {
              source: 'nasa-apollo-12-pinpoint-mission',
              locator:
                'Mission Highlights: "when Apollo 12 went behind the moon at about 97 miles up, the first lunar orbit insertion burn began"',
            }),
            altitude: {
              ...cite(82.5, trajectoryTable('Lunar orbit insertion, Ignition')),
              discrepancy:
                "Apollo by the Numbers (Apollo 12 Lunar Orbit Phase table and mission summary) gives 83.91 nautical miles. We follow the Mission Report's Table 5-III.",
            },
            speed: {
              ...cite(8_175, trajectoryTable('Lunar orbit insertion, Ignition')),
              discrepancy:
                "Apollo by the Numbers (Apollo 12 Lunar Orbit Phase table) gives 8,173.6 feet per second. We follow the Mission Report's Table 5-III.",
            },
            flightPathAngle: cite(-8.44, trajectoryTable('Lunar orbit insertion, Ignition')),
          },
          lunarSense: RETROGRADE,
          earthSense: cite('prograde', {
            ...tliTable('Heading Angle (deg E of N)'),
            locator:
              'Translunar Injection table, Apollo 12 column, "Heading Angle (deg E of N)": 63.902 degrees, so the path leaves Earth heading east',
          }),
        },
        {
          kind: 'burn',
          label: 'Lunar orbit insertion',
          body: 'moon',
          start: LOI_IGNITION,
          end: LOI_CUTOFF,
          deltaV: cite(
            2_889.5,
            maneuverTable('Lunar orbit insertion'),
            lunarOrbitTable('Lunar orbit insertion cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'First lunar orbit',
          body: 'moon',
          start: LOI_CUTOFF,
          end: LOC_IGNITION,
          apoapsis: {
            ...cite(168.8, maneuverTable('Lunar orbit insertion')),
            discrepancy: abnSize('"Lunar orbit insertion cutoff" row', '170.20', '61.66'),
          },
          periapsis: cite(62.6, maneuverTable('Lunar orbit insertion')),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(154.04, trajectoryTable('Lunar orbit insertion, Cutoff')),
            altitude: {
              ...cite(61.7, trajectoryTable('Lunar orbit insertion, Cutoff')),
              discrepancy:
                'Apollo by the Numbers (Apollo 12 Lunar Orbit Phase table, "Lunar orbit insertion cutoff" row) gives 62.91 nautical miles. We follow the Mission Report\'s Table 5-III.',
            },
            flightPathAngle: cite(-0.63, trajectoryTable('Lunar orbit insertion, Cutoff')),
          },
          endFix: {
            longitude: cite(151.67, trajectoryTable('Lunar orbit circularization, Ignition')),
          },
        },
        {
          kind: 'burn',
          label: 'Lunar orbit circularization',
          body: 'moon',
          start: LOC_IGNITION,
          end: LOC_CUTOFF,
          deltaV: cite(
            165.2,
            maneuverTable('Lunar orbit circularization'),
            lunarOrbitTable('Lunar orbit circularization cutoff'),
          ),
        },
        {
          // One phase through undocking (the lunar module starts from the
          // command module's place then): pinning the published undocking
          // longitude as well would make the half hour after it run 2.7
          // percent fast to reach the separation burn's published longitude.
          kind: 'orbit',
          label: 'Lunar orbit',
          body: 'moon',
          start: LOC_CUTOFF,
          end: SEPARATION_IGNITION,
          ...CSM_PARKING_ORBIT,
          sense: RETROGRADE,
          startFix: {
            longitude: cite(150.85, trajectoryTable('Lunar orbit circularization, Cutoff')),
            altitude: {
              ...cite(61.7, trajectoryTable('Lunar orbit circularization, Cutoff')),
              discrepancy:
                'Apollo by the Numbers (Apollo 12 Lunar Orbit Phase table, "Lunar orbit circularization cutoff" row) gives 62.74 nautical miles. We follow the Mission Report\'s Table 5-III.',
            },
            flightPathAngle: cite(0.3, trajectoryTable('Lunar orbit circularization, Cutoff')),
          },
          endFix: { longitude: cite(-7.44, trajectoryTable('Separation, Ignition')) },
        },
        {
          kind: 'burn',
          label: 'Separation from the lunar module',
          body: 'moon',
          start: SEPARATION_IGNITION,
          end: SEPARATION_CUTOFF,
          deltaV: cite(
            2.4,
            maneuverTable('Command module/lunar module separation'),
            separationRow('first', 'cutoff', '108:24:51.2'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Lunar orbit, waiting for Intrepid',
          body: 'moon',
          start: SEPARATION_CUTOFF,
          end: PLANE_CHANGE_1_IGNITION,
          apoapsis: {
            ...cite(63.5, maneuverTable('Command module/lunar module separation')),
            discrepancy: abnSize(
              'the first "CSM/LM separation cutoff" row (108:24:51.2)',
              '64.06',
              '56.58',
            ),
          },
          periapsis: cite(56.3, maneuverTable('Command module/lunar module separation')),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(-8.14, trajectoryTable('Separation, Cutoff')),
            altitude: cite(59.2, trajectoryTable('Separation, Cutoff')),
            flightPathAngle: cite(-0.2, trajectoryTable('Separation, Cutoff')),
          },
          endFix: {
            longitude: cite(77.68, trajectoryTable('Command and service module plane change')),
          },
        },
        {
          // Most of this firing turned the orbit's plane, to stay over the
          // landing site as the Moon turned beneath it (Mission Report
          // Section 5.0, page 5-8). Only its small change of size is drawn.
          kind: 'burn',
          label: 'First plane change',
          body: 'moon',
          start: PLANE_CHANGE_1_IGNITION,
          end: PLANE_CHANGE_1_CUTOFF,
          deltaV: cite(
            349.9,
            maneuverTable('First lunar orbit plane change'),
            lunarOrbitTable('CSM plane change cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Lunar orbit, waiting for Intrepid',
          body: 'moon',
          start: PLANE_CHANGE_1_CUTOFF,
          end: DOCKING,
          apoapsis: cite(
            62.5,
            maneuverTable('First lunar orbit plane change'),
            lunarOrbitTable('CSM plane change cutoff'),
          ),
          periapsis: cite(
            57.6,
            maneuverTable('First lunar orbit plane change'),
            lunarOrbitTable('CSM plane change cutoff'),
          ),
          sense: RETROGRADE,
          endFix: { longitude: cite(46.98, trajectoryTable('Docking')) },
        },
        {
          // One phase through the ascent stage's jettison at 147:59:31.6, for
          // the same reason: the five minutes from jettison to the final
          // separation burn are too short to absorb the published longitude.
          kind: 'orbit',
          label: 'Lunar orbit, docked, then alone',
          body: 'moon',
          start: DOCKING,
          end: FINAL_SEPARATION_IGNITION,
          apoapsis: cite(62.5, maneuverTable('First lunar orbit plane change')),
          periapsis: cite(57.6, maneuverTable('First lunar orbit plane change')),
          sense: RETROGRADE,
          endFix: {
            longitude: cite(
              -43.34,
              trajectoryTable('Command and service module/ascent stage separation'),
            ),
          },
        },
        {
          kind: 'burn',
          label: 'Final separation',
          body: 'moon',
          start: FINAL_SEPARATION_IGNITION,
          end: FINAL_SEPARATION_CUTOFF,
          deltaV: cite(
            1.0,
            maneuverTable('Final separation'),
            separationRow('second', 'cutoff', '148:04:36.3'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Photographing future landing sites',
          body: 'moon',
          start: FINAL_SEPARATION_CUTOFF,
          end: PLANE_CHANGE_2_IGNITION,
          apoapsis: cite(
            62.0,
            maneuverTable('Final separation'),
            separationRow('second', 'cutoff', '148:04:36.3'),
          ),
          periapsis: cite(
            57.5,
            maneuverTable('Final separation'),
            separationRow('second', 'cutoff', '148:04:36.3'),
          ),
          sense: RETROGRADE,
          endFix: { longitude: cite(110.34, trajectoryTable('Plane change, Ignition')) },
        },
        {
          // This plane change set up photography of future landing sites
          // (Mission Report Section 5.0, page 5-8). Only its small change of
          // size is drawn.
          kind: 'burn',
          label: 'Second plane change',
          body: 'moon',
          start: PLANE_CHANGE_2_IGNITION,
          end: PLANE_CHANGE_2_CUTOFF,
          deltaV: cite(
            381.8,
            maneuverTable('Second lunar orbit plane change'),
            lunarOrbitTable('CSM orbit plane change cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Last lunar orbits',
          body: 'moon',
          start: PLANE_CHANGE_2_CUTOFF,
          end: TEI_IGNITION,
          apoapsis: cite(
            64.7,
            maneuverTable('Second lunar orbit plane change'),
            lunarOrbitTable('CSM orbit plane change cutoff'),
          ),
          periapsis: cite(
            56.8,
            maneuverTable('Second lunar orbit plane change'),
            lunarOrbitTable('CSM orbit plane change cutoff'),
          ),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(109.4, trajectoryTable('Plane change, Cutoff')),
            altitude: cite(58.9, trajectoryTable('Plane change, Cutoff')),
            flightPathAngle: cite(-0.2, trajectoryTable('Plane change, Cutoff')),
          },
          endFix: { longitude: cite(-170.25, trajectoryTable('Transearth injection, Ignition')) },
        },
        {
          kind: 'burn',
          label: 'Transearth injection',
          body: 'moon',
          start: TEI_IGNITION,
          end: TEI_CUTOFF,
          deltaV: cite(3_042.0, transearthTable('Transearth injection cutoff')),
        },
        {
          kind: 'transfer',
          label: 'Coast home',
          to: 'earth',
          start: TEI_CUTOFF,
          end: ENTRY_INTERFACE,
          moonFix: {
            longitude: cite(-178.56, trajectoryTable('Transearth injection, Cutoff')),
            altitude: {
              ...cite(64.6, trajectoryTable('Transearth injection, Cutoff')),
              discrepancy:
                "Apollo by the Numbers (Apollo 12 Transearth Phase table) gives 66.0 nautical miles. We follow the Mission Report's Table 5-III.",
            },
            speed: {
              ...cite(8_351, trajectoryTable('Transearth injection, Cutoff')),
              discrepancy:
                "Apollo by the Numbers (Apollo 12 Transearth Phase table) gives 8,350.4 feet per second. We follow the Mission Report's Table 5-III.",
            },
            flightPathAngle: {
              ...cite(2.69, trajectoryTable('Transearth injection, Cutoff')),
              discrepancy:
                "Apollo by the Numbers (Apollo 12 Transearth Phase table) gives 2.718 degrees. We follow the Mission Report's Table 5-III.",
            },
          },
          earthFix: {
            latitude: cite(
              -13.8,
              entryTable('Earth Entry Geodetic Latitude (deg N)'),
              entryParameters('Geodetic latitude, deg south, 13.80'),
            ),
            longitude: cite(
              173.52,
              entryTable('Earth Entry Longitude (deg E)'),
              entryParameters('Longitude, deg east, 173.52'),
            ),
            altitude: cite(65.8, entryParameters('Altitude, miles, 65.8')),
            speed: cite(
              36_116.618,
              entryTable('Earth Entry Velocity (ft/sec)'),
              entryParameters('Space-fixed velocity, ft/sec, 36 116'),
            ),
            flightPathAngle: cite(
              -6.48,
              entryTable('Earth Entry Flight Path Angle'),
              entryParameters('Space-fixed flight-path angle, deg, -6.48'),
            ),
            heading: cite(
              98.16,
              entryTable('Earth Entry Heading Angle (deg)'),
              entryParameters('Space-fixed heading angle, deg east of north, 98.16'),
            ),
          },
          lunarSense: RETROGRADE,
          earthSense: cite('prograde', {
            ...entryTable('Earth Entry Heading Angle (deg)'),
            locator:
              'Entry, Splashdown, and Recovery table, Apollo 12 column, "Heading Angle": 98.16 degrees, so the spacecraft arrived heading east',
          }),
        },
        {
          kind: 'entry',
          label: 'Entry and splashdown',
          start: ENTRY_INTERFACE,
          end: SPLASHDOWN_TIME,
          drogue: at('244:30:39.7', timeline('Drogue parachute deployed')),
          splashdown: {
            latitude: {
              ...cite(
                -(15 + 46.6 / 60),
                SPLASHDOWN_POINT,
                entryTable('Earth Splashdown Latitude (deg N)'),
              ),
              discrepancy: SPLASHDOWN_DIFFERS,
            },
            longitude: {
              ...cite(
                -(165 + 9 / 60),
                SPLASHDOWN_POINT,
                entryTable('Earth Splashdown Longitude (deg E)'),
              ),
              discrepancy: SPLASHDOWN_DIFFERS,
            },
          },
        },
      ],
    },
    {
      id: 'lm',
      name: 'Lunar module',
      role: 'lander',
      phases: [
        {
          kind: 'orbit',
          label: 'Undocked',
          body: 'moon',
          start: UNDOCKING,
          end: DOI_IGNITION,
          ...CSM_PARKING_ORBIT,
          sense: RETROGRADE,
          from: 'csm',
          endFix: { longitude: cite(172.21, trajectoryTable('Descent orbit insertion, Ignition')) },
        },
        {
          kind: 'burn',
          label: 'Descent orbit insertion',
          body: 'moon',
          start: DOI_IGNITION,
          end: DOI_CUTOFF,
          deltaV: cite(
            72.4,
            maneuverTable('Descent orbit insertion'),
            lunarOrbitTable('LM descent orbit insertion cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Descent orbit',
          body: 'moon',
          start: DOI_CUTOFF,
          end: PDI,
          apoapsis: {
            ...cite(60.6, maneuverTable('Descent orbit insertion')),
            discrepancy: abnSize('"LM descent orbit insertion cutoff" row', '61.53', '8.70'),
          },
          periapsis: cite(8.1, maneuverTable('Descent orbit insertion')),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(170.76, trajectoryTable('Descent orbit insertion, Cutoff')),
            altitude: cite(61.5, trajectoryTable('Descent orbit insertion, Cutoff')),
            flightPathAngle: cite(-0.02, trajectoryTable('Descent orbit insertion, Cutoff')),
          },
          endFix: { longitude: cite(-7.82, trajectoryTable('Powered descent initiation')) },
        },
        {
          kind: 'descent',
          label: 'Powered descent',
          body: 'moon',
          start: PDI,
          end: LANDING,
          site: LANDING_SITE,
        },
        {
          kind: 'surface',
          label: 'Ocean of Storms',
          body: 'moon',
          start: LANDING,
          end: LIFTOFF_FROM_MOON,
          site: LANDING_SITE,
        },
        {
          kind: 'ascent',
          label: 'Lunar liftoff',
          body: 'moon',
          start: LIFTOFF_FROM_MOON,
          end: LM_INSERTION,
          site: LANDING_SITE,
        },
        {
          // The report prints no position for orbit insertion, so the model
          // starts this orbit at an illustrative point downrange of the
          // site, moved along the orbit so that it reaches the published
          // position of the next burn on time (see build.ts).
          kind: 'orbit',
          label: 'Catching up',
          body: 'moon',
          start: LM_INSERTION,
          end: CSI_IGNITION,
          // Apollo by the Numbers' size is followed here: the Mission Report's
          // own Table 5-III puts the next burn 51.5 miles up, higher than the
          // 46.3-mile high point of its Table 5-VI.
          apoapsis: {
            ...cite(
              51.93,
              lunarOrbitTable('LM orbit insertion'),
              summary(
                'Lunar Orbit/Lunar Surface Phase',
                '"placed the spacecraft into an orbit of 51.93 by 9.21 n mi at 142:10:59.9"',
              ),
            ),
            discrepancy:
              "The Mission Report's Table 5-VI (page 5-9) gives the orbit after ascent as 46.3 by 8.8 nautical miles. We follow Apollo by the Numbers, which agrees with the report's own Table 5-III: the coelliptic burn that followed began 51.5 miles up, above a 46.3-mile high point.",
          },
          periapsis: cite(9.21, lunarOrbitTable('LM orbit insertion')),
          sense: RETROGRADE,
          endFix: {
            longitude: cite(164.68, trajectoryTable('Coelliptic sequence initiation, Ignition')),
          },
        },
        {
          kind: 'burn',
          label: 'Coelliptic sequence initiation',
          body: 'moon',
          start: CSI_IGNITION,
          end: CSI_CUTOFF,
          deltaV: cite(
            45.0,
            maneuverTable('Coelliptic sequence initiation'),
            lunarOrbitTable('LM coelliptic sequence initiation cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Coelliptic orbit',
          body: 'moon',
          start: CSI_CUTOFF,
          end: CDH_IGNITION,
          apoapsis: {
            ...cite(51.0, maneuverTable('Coelliptic sequence initiation')),
            discrepancy: abnSize(
              '"LM coelliptic sequence initiation cutoff" row',
              '51.49',
              '41.76',
            ),
          },
          periapsis: cite(41.5, maneuverTable('Coelliptic sequence initiation')),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(162.61, trajectoryTable('Coelliptic sequence initiation, Cutoff')),
            altitude: cite(51.5, trajectoryTable('Coelliptic sequence initiation, Cutoff')),
            flightPathAngle: cite(0.02, trajectoryTable('Coelliptic sequence initiation, Cutoff')),
          },
        },
        {
          kind: 'burn',
          label: 'Constant differential height',
          body: 'moon',
          start: CDH_IGNITION,
          end: CDH_CUTOFF,
          deltaV: cite(
            13.8,
            maneuverTable('Constant differential height'),
            lunarOrbitTable('LM constant differential height cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Lining up',
          body: 'moon',
          start: CDH_CUTOFF,
          end: TPI_IGNITION,
          apoapsis: cite(
            44.4,
            maneuverTable('Constant differential height'),
            lunarOrbitTable('LM constant differential height cutoff'),
          ),
          periapsis: cite(
            40.4,
            maneuverTable('Constant differential height'),
            lunarOrbitTable('LM constant differential height cutoff'),
          ),
          sense: RETROGRADE,
          endFix: { longitude: cite(-128.99, trajectoryTable('Terminal phase initiation')) },
        },
        {
          kind: 'burn',
          label: 'Terminal phase initiation',
          body: 'moon',
          start: TPI_IGNITION,
          end: TPI_CUTOFF,
          deltaV: cite(
            29.0,
            maneuverTable('Terminal phase initiation'),
            lunarOrbitTable('LM terminal phase initiation cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Closing in',
          body: 'moon',
          start: TPI_CUTOFF,
          end: TPF_IGNITION,
          apoapsis: cite(
            60.2,
            maneuverTable('Terminal phase initiation'),
            lunarOrbitTable('LM terminal phase initiation cutoff'),
          ),
          periapsis: cite(
            43.8,
            maneuverTable('Terminal phase initiation'),
            lunarOrbitTable('LM terminal phase initiation cutoff'),
          ),
          sense: RETROGRADE,
        },
        {
          kind: 'burn',
          label: 'Terminal phase finalize',
          body: 'moon',
          start: TPF_IGNITION,
          end: TPF_CUTOFF,
          deltaV: cite(
            40.0,
            maneuverTable('Terminal phase finalization'),
            lunarOrbitTable('LM terminal phase finalize cutoff'),
          ),
        },
        {
          kind: 'rendezvous',
          label: 'Docking approach',
          body: 'moon',
          start: TPF_CUTOFF,
          end: DOCKING,
          target: 'csm',
          apoapsis: cite(
            62.3,
            maneuverTable('Terminal phase finalization'),
            lunarOrbitTable('LM terminal phase finalize cutoff'),
          ),
          periapsis: cite(
            58.3,
            maneuverTable('Terminal phase finalization'),
            lunarOrbitTable('LM terminal phase finalize cutoff'),
          ),
          sense: RETROGRADE,
        },
        {
          kind: 'docked',
          label: 'Docked',
          start: DOCKING,
          end: JETTISON,
          target: 'csm',
        },
      ],
    },
  ],
};

/** One row of the Apollo 12 ascent table (geocentric latitude). */
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
    latitudeKind: 'geocentric' as const,
    longitude: cite(longitude, ascentTable(row)),
  };
}
