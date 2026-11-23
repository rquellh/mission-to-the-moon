import type { FlightPlan } from '../../../sim/types.ts';
/**
 * The Apollo 8 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * One ship: the command and service module. Apollo 8 carried no lunar
 * module, so nothing undocks; the third stage it left behind is not drawn
 * after separation.
 *
 * Sources:
 * - Apollo 8 Mission Report (MSC-PA-R-69-1): event times (Table 3-I) and
 *   where the spacecraft was at each burn, in latitude and longitude over
 *   Earth or the Moon (Table 5-II). It is the more primary source, so its
 *   times are followed where Apollo by the Numbers differs from them by more
 *   than the report's rounding (the discrepancy fields say where).
 * - Apollo by the Numbers (NASA SP-2000-4029): the ascent track, orbit
 *   sizes, burn sizes, translunar injection, and entry, at the precision the
 *   report rounds away where the two agree.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The Mission Report prints no radius for the Moon it measures heights from
 * (Section 5.0: "the moon model was a sphere"), so `moonReferenceRadius` is
 * left out and lunar heights are drawn above the Moon's mean radius.
 *
 * Not drawn: the parking orbit's slow rise (oxygen venting raised its high
 * point by 6.4 nautical miles before the burn to the Moon; Mission Report
 * Section 5.2), and the three midcourse corrections, whose changes of 1.4 to
 * 20.4 feet per second are too small to see at this scale.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const MISSION_REPORT =
  'https://web.archive.org/web/20251209023927/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A08_MissionReport.pdf';
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES =
  '&TLIST_TYPE=%27CAL%27&TLIST=%271968-12-21%2012:51:00.67%27,%271968-12-21%2015:47:05.51%27,%271968-12-27%2015:37:12.8%27,%271968-12-27%2015:51:42.0%27';
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
  locator: `Apollo 8 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_08d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 8 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_08e_Earth_Orbit_Phase.htm`,
});
const lunarOrbitTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 8 Lunar Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_08g_Lunar_Orbit_Phase.htm`,
});
const transearthTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 8 Transearth Phase table, "${row}" row`,
  url: `${ABN}Apollo_08h_Transearth_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 8 Timeline, row "${row}"`,
  url: `${ABN}Apollo_08i_Timeline.htm`,
});
const summary = (section: string, quote: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 8 mission summary, "${section}" section: ${quote}`,
  url: `${ABN}Apollo_08a_Summary.htm`,
});
const tliTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Translunar Injection table, Apollo 8 column, "${row}"`,
  url: `${ABN}Apollo_18-24_Translunar_Injection.htm`,
});
const entryTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Entry, Splashdown, and Recovery table, Apollo 8 column, "${row}"`,
  url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
});
/** Table 3-I, Sequence of Events: printed pages 3-3 and 3-4, PDF pages 12 and 13. */
const sequence = (row: string, page: '3-3' | '3-4'): Citation => ({
  source: 'apollo-8-mission-report',
  locator: `Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === '3-3' ? 12 : 13}), "${row}" row`,
  url: MISSION_REPORT,
});
/** Table 5-II, Trajectory Parameters: printed pages 5-7 and 5-8, PDF pages 50 and 51. */
const trajectoryTable = (row: string, page: '5-7' | '5-8' = '5-7'): Citation => ({
  source: 'apollo-8-mission-report',
  locator: `Table 5-II, "Trajectory Parameters" (page ${page}, PDF page ${page === '5-7' ? 50 : 51}), "${row}" row`,
  url: MISSION_REPORT,
});
const entryParameters = (row: string): Citation => ({
  source: 'apollo-8-mission-report',
  locator: `Table 5-V, "Entry Trajectory Parameters" (page 5-10, PDF page 53), "Entry interface (400 000 feet)": ${row}`,
  url: MISSION_REPORT,
});
const reportText = (section: string, page: string, pdfPage: number, quote: string): Citation => ({
  source: 'apollo-8-mission-report',
  locator: `Section ${section} (page ${page}, PDF page ${pdfPage}): ${quote}`,
  url: MISSION_REPORT,
});
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
  source: 'apollo-8-mission-report',
  locator:
    'Table 5-II, "Trajectory Parameters" (pages 5-7 and 5-8, PDF pages 50 and 51): at every lunar burn the longitude decreases from ignition to cutoff (lunar orbit insertion 163.98W to 179.56E, circularization 160.29E to 159.79E, transearth injection 174.78E to 160.19E), so the spacecraft moved westward',
  url: MISSION_REPORT,
});

/** Earth orbit and the coast out run west to east (prograde). */
const PROGRADE_EOI: Cited<'prograde'> = cite('prograde', {
  ...ascentTable('Earth orbit insertion'),
  locator:
    'Apollo 8 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 88.532 degrees east of north, so the orbit runs west to east',
});

/* ------------------------------------------------------------------ */
/* Times used more than once.                                          */
/* ------------------------------------------------------------------ */

const TLI_IGNITION: Cited<ElapsedTime> = {
  ...at(
    '002:50:37.1',
    sequence('Translunar injection ignition', '3-3'),
    trajectoryTable('S-IVB ignition'),
  ),
  discrepancy:
    'Apollo by the Numbers (Apollo 8 Earth Orbit Phase table and Timeline) gives the S-IVB second burn ignition as 002:50:37.79. We follow the Mission Report, Tables 3-I and 5-II.',
};
const TLI_CUTOFF = at(
  '002:55:55.51',
  earthOrbitTable('S-IVB 2nd burn cutoff'),
  sequence('Translunar injection cutoff', '3-3'),
);
const LOI_IGNITION = at(
  '069:08:20.4',
  lunarOrbitTable('Lunar orbit insertion ignition'),
  sequence('Lunar orbit insertion ignition', '3-3'),
);
const LOI_CUTOFF = at(
  '069:12:27.3',
  lunarOrbitTable('Lunar orbit insertion cutoff'),
  sequence('Lunar orbit insertion cutoff', '3-3'),
);
const LOC_IGNITION = at(
  '073:35:06.6',
  lunarOrbitTable('Lunar orbit circularization ignition'),
  sequence('Lunar orbit circularization ignition', '3-3'),
);
const LOC_CUTOFF = at(
  '073:35:16.2',
  lunarOrbitTable('Lunar orbit circularization cutoff'),
  sequence('Lunar orbit circularization cutoff', '3-3'),
);
const TEI_IGNITION = at(
  '089:19:16.6',
  transearthTable('Transearth injection ignition'),
  sequence('Transearth injection ignition', '3-3'),
);
const TEI_CUTOFF = at(
  '089:22:40.3',
  transearthTable('Transearth injection cutoff'),
  sequence('Transearth injection cutoff', '3-3'),
);
const ENTRY_INTERFACE = at(
  '146:46:12.8',
  entryTable('Earth Entry GET'),
  sequence('Entry interface (400 000 feet)', '3-4'),
);
const LANDING = at('147:00:42.0', entryTable('Earth Splashdown GET'), sequence('Landing', '3-4'));

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

const LANDING_POINT: Citation = reportText(
  '9.3.2, Command Module Location and Retrieval',
  '9-4',
  192,
  '"The landing point calculated by the recovery forces was latitude 8 degrees 7.5 minutes north and longitude 165 degrees 1.2 minutes west"',
);
const LANDING_POINT_TOO: Citation = reportText(
  '6.9, Guidance, Navigation, and Control Systems',
  '6-45',
  99,
  '"The recovery forces estimated the landing point to be 165 degrees 1.2 minutes west longitude and 8 degrees 7.5 minutes north latitude"',
);
const LANDING_POINT_DIFFERS =
  'The Mission Report\'s Summary rounds the same point to whole minutes, 8 degrees 8 minutes north, 165 degrees 1 minute west, "as determined by the primary recovery ship USS Yorktown" (Section 1.0, pages 1-1 and 1-2, PDF pages 7 and 8), as does its Mission Description (Section 3.0, page 3-2). Its best-estimate trajectory puts the landing at 8 degrees 6.0 minutes north, 165 degrees 0.7 minutes west (Section 6.9, page 6-45). Apollo by the Numbers (Apollo 8 mission summary, Recovery, and the Entry, Splashdown, and Recovery table) gives 8.10 degrees north, 165.00 degrees west. We follow the recovery forces\' point at the precision the report gives it.';

const SPLASHDOWN = {
  latitude: {
    ...cite(8 + 7.5 / 60, LANDING_POINT, LANDING_POINT_TOO),
    discrepancy: LANDING_POINT_DIFFERS,
  },
  longitude: {
    ...cite(-(165 + 1.2 / 60), LANDING_POINT, LANDING_POINT_TOO),
    discrepancy: LANDING_POINT_DIFFERS,
  },
};

export const flight: FlightPlan = {
  missionId: 'apollo-8',

  /*
   * The Mission Report puts the lunar orbits 7 to 12 degrees south of the
   * Moon's equator (Table 5-II), too far to draw them on the equator. It
   * publishes no inclination over the Moon, and its headings are measured
   * against a space-fixed north, not the lunar equator (Table 5-I), so they
   * cannot place the plane either. The plane is drawn through the published
   * point at the end of circularization, at that time, with the default
   * due-west heading: the lowest inclination that reaches it (an
   * illustration). The other published points then lie within about
   * 3 degrees of latitude of the drawn orbit.
   */
  lunarOrbitPlane: {
    site: {
      latitude: cite(-11.66, trajectoryTable('Lunar orbit circularization, Cutoff')),
      longitude: cite(159.79, trajectoryTable('Lunar orbit circularization, Cutoff')),
    },
    time: at('073:35:16', trajectoryTable('Lunar orbit circularization, Cutoff')),
  },

  // The sky is fit at liftoff, translunar injection, entry interface, and
  // landing: the moments when Earth-relative positions shape the path.
  sky: [
    {
      time: at('000:00:00.67', ascentTable('Liftoff')),
      moonEclipticLongitude: cite(
        294.9341099,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1968-12-21 12:51:00.67',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        14.907536,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1968-12-21 12:51:00.67',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        269.7390761,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1968-12-21 12:51:00.67',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: at('002:56:05.51', tliTable('GET')),
      moonEclipticLongitude: cite(
        296.7659266,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1968-12-21 15:47:05.51',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        332.741473,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1968-12-21 15:47:05.51',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        269.8636702,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1968-12-21 15:47:05.51',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: ENTRY_INTERFACE,
      moonEclipticLongitude: cite(
        18.1179217,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1968-12-27 15:37:12.8',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        45.791385,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1968-12-27 15:37:12.8',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        275.9707884,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1968-12-27 15:37:12.8',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(
        18.242098,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1968-12-27 15:51:42.0',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        42.27163,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1968-12-27 15:51:42.0',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        275.98104,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1968-12-27 15:51:42.0',
          SUN_FROM_EARTH,
        ),
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
          start: at(
            '000:00:00.67',
            ascentTable('Liftoff'),
            timeline('Liftoff (umbilical disconnected).'),
          ),
          end: at('000:11:34.98', ascentTable('Earth orbit insertion')),
          site: {
            latitude: cite(28.447, ascentTable('Liftoff')),
            latitudeKind: 'geocentric',
            longitude: cite(-80.6041, ascentTable('Liftoff')),
          },
          // The model lets the orbit itself take over in the last 30 seconds
          // before insertion, so the "S-IVB 1 st burn cutoff" row is listed
          // but not drawn through.
          track: [
            ascentPoint('Mach 1 achieved', '000:01:01.45', 3.971, 28.4526, -80.5805),
            ascentPoint('Maximum dynamic pressure', '000:01:18.9', 7.252, 28.4645, -80.5398),
            ascentPoint('S-IC center engine cutoff*', '000:02:05.93', 22.398, 28.5581, -80.1934),
            ascentPoint('S-IC outboard engine cutoff', '000:02:33.82', 35.503, 28.6856, -79.7302),
            ascentPoint('S-IC/S-II separation*', '000:02:34.47', 35.838, 28.6893, -79.7168),
            ascentPoint('S-II engine cutoff', '000:08:44.04', 103.424, 31.5492, -65.3897),
            ascentPoint('S-II/S-IVB separation*', '000:08:44.90', 103.46, 31.5565, -65.3338),
            ascentPoint('S-IVB 1 st burn cutoff', '000:11:24.98', 103.324, 32.4541, -54.0565),
          ],
        },
        {
          kind: 'orbit',
          label: 'Earth parking orbit',
          body: 'earth',
          start: at('000:11:34.98', earthOrbitTable('Earth orbit insertion')),
          end: TLI_IGNITION,
          // Apollo by the Numbers measures these from a spherical Earth of
          // 3,443.934 nautical miles, the equatorial radius the engine uses.
          apoapsis: {
            ...cite(
              99.99,
              earthOrbitTable('Earth orbit insertion'),
              summary(
                'Ascent Phase',
                '"apogee and perigee 99.99 by 99.57 n mi ... based upon a spherical Earth with a radius of 3,443.934 n mi"',
              ),
            ),
            discrepancy:
              'The Mission Report gives the parking orbit as 98 by 103 nautical miles (Section 1.0, page 1-1), measured above the oblate Earth (Table 5-I, page 5-6). We follow Apollo by the Numbers, whose heights are above the equatorial radius, as the flight path measures them.',
          },
          periapsis: cite(99.57, earthOrbitTable('Earth orbit insertion')),
          inclination: cite(32.509, earthOrbitTable('Earth orbit insertion')),
          sense: PROGRADE_EOI,
          startFix: {
            latitude: cite(32.4741, ascentTable('Earth orbit insertion')),
            latitudeKind: 'geocentric',
            longitude: cite(-53.2923, ascentTable('Earth orbit insertion')),
            altitude: cite(103.326, ascentTable('Earth orbit insertion')),
            speed: cite(25_567.06, ascentTable('Earth orbit insertion')),
            flightPathAngle: cite(0.0006, ascentTable('Earth orbit insertion')),
            heading: cite(88.532, ascentTable('Earth orbit insertion')),
          },
          endFix: {
            latitude: cite(9.25, trajectoryTable('S-IVB ignition')),
            longitude: cite(-166.55, trajectoryTable('S-IVB ignition')),
          },
        },
        {
          kind: 'burn',
          label: 'Translunar injection',
          body: 'earth',
          start: TLI_IGNITION,
          end: TLI_CUTOFF,
          deltaV: cite(9_973.81, earthOrbitTable('S-IVB 2nd burn cutoff')),
        },
        {
          kind: 'transfer',
          label: 'Coast to the Moon',
          to: 'moon',
          start: TLI_CUTOFF,
          end: LOI_IGNITION,
          earthFix: {
            time: at('002:56:05.51', tliTable('GET'), trajectoryTable('Translunar injection')),
            latitude: cite(21.477, tliTable('Geodetic Latitude (deg N)')),
            longitude: {
              ...cite(-143.9242, tliTable('Longitude (deg E)')),
              discrepancy:
                "The Mission Report, Table 5-II (page 5-7), prints 143.02W for translunar injection. We follow Apollo by the Numbers: the report's own S-IVB cutoff 10 seconds earlier is at 144.79W, and at the speed and heading it prints the spacecraft covered about 0.9 degree of longitude in those 10 seconds, which reaches 143.9W, not 143.0W.",
            },
            altitude: cite(187.221, tliTable('Altitude (n mi)')),
            speed: cite(35_505.41, tliTable('Space-Fixed Velocity (ft/sec)')),
            flightPathAngle: cite(7.897, tliTable('Flight Path Angle (deg)')),
            heading: cite(67.494, tliTable('Heading Angle (deg E of N)')),
          },
          moonFix: {
            // 163.98 degrees west is on the far side, out of contact with Earth.
            longitude: cite(
              -163.98,
              trajectoryTable('Lunar orbit insertion, Ignition'),
              summary(
                'Lunar Orbit Phase',
                '"As the spacecraft passed behind the Moon for the first time, and communications were interrupted"',
              ),
            ),
            altitude: {
              ...cite(
                75.6,
                lunarOrbitTable('Lunar orbit insertion ignition'),
                reportText(
                  '5.5, Lunar Orbit Insertion',
                  '5-3',
                  46,
                  '"performed at 69:08:20, 75.6 n. mi. above the lunar surface"',
                ),
              ),
              discrepancy:
                "The Mission Report's Table 5-II (page 5-7) prints 76.6 nautical miles; its own text (Section 5.5) and Apollo by the Numbers give 75.6, which we follow.",
            },
            speed: cite(
              8_391,
              lunarOrbitTable('Lunar orbit insertion ignition'),
              trajectoryTable('Lunar orbit insertion, Ignition'),
            ),
            flightPathAngle: cite(-6.43, trajectoryTable('Lunar orbit insertion, Ignition')),
          },
          lunarSense: RETROGRADE,
          earthSense: cite('prograde', {
            ...tliTable('Heading Angle (deg E of N)'),
            locator:
              'Translunar Injection table, Apollo 8 column, "Heading Angle (deg E of N)": 67.494 degrees, so the path leaves Earth heading east',
          }),
          freeReturn: cite(
            true,
            {
              source: 'apollo-by-the-numbers',
              locator:
                'Apollo 8 Objectives, Launch Vehicle Primary Detailed Test Objectives, 9: "To verify the capability of the launch vehicle to perform a free-return translunar injection. Achieved."',
              url: `${ABN}Apollo_08b_Objectives.htm`,
            },
            summary(
              'Earth Orbit Phase',
              '"the CSM would have continued on its \'free-return\' trajectory, looping behind the Moon and returning directly to Earth"',
            ),
          ),
        },
        {
          kind: 'burn',
          label: 'Lunar orbit insertion',
          body: 'moon',
          start: LOI_IGNITION,
          end: LOI_CUTOFF,
          deltaV: cite(2_997, lunarOrbitTable('Lunar orbit insertion cutoff')),
        },
        {
          kind: 'orbit',
          label: 'First lunar orbits',
          body: 'moon',
          start: LOI_CUTOFF,
          end: LOC_IGNITION,
          apoapsis: cite(168.5, lunarOrbitTable('Lunar orbit insertion cutoff')),
          periapsis: cite(60.0, lunarOrbitTable('Lunar orbit insertion cutoff')),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(179.56, trajectoryTable('Lunar orbit insertion, Cutoff')),
            altitude: cite(
              62.0,
              lunarOrbitTable('Lunar orbit insertion cutoff'),
              trajectoryTable('Lunar orbit insertion, Cutoff'),
            ),
            flightPathAngle: cite(-0.79, trajectoryTable('Lunar orbit insertion, Cutoff')),
          },
          endFix: {
            longitude: cite(160.29, trajectoryTable('Lunar orbit circularization, Ignition')),
          },
        },
        {
          kind: 'burn',
          label: 'Lunar orbit circularization',
          body: 'moon',
          start: LOC_IGNITION,
          end: LOC_CUTOFF,
          deltaV: cite(134.8, lunarOrbitTable('Lunar orbit circularization cutoff')),
        },
        {
          kind: 'orbit',
          label: 'Lunar orbit',
          body: 'moon',
          start: LOC_CUTOFF,
          end: TEI_IGNITION,
          apoapsis: cite(60.7, lunarOrbitTable('Lunar orbit circularization cutoff')),
          periapsis: cite(59.7, lunarOrbitTable('Lunar orbit circularization cutoff')),
          sense: RETROGRADE,
          startFix: {
            longitude: cite(159.79, trajectoryTable('Lunar orbit circularization, Cutoff')),
            altitude: cite(
              60.7,
              lunarOrbitTable('Lunar orbit circularization cutoff'),
              trajectoryTable('Lunar orbit circularization, Cutoff'),
            ),
            flightPathAngle: cite(-0.02, trajectoryTable('Lunar orbit circularization, Cutoff')),
          },
          // The Moon's uneven gravity changed the orbit slowly; the size
          // before the burn home is published, not its steps.
          sizes: [
            {
              time: TEI_IGNITION,
              apoapsis: cite(
                63.6,
                reportText(
                  '5.6, Transearth Injection',
                  '5-3',
                  46,
                  '"the final lunar orbit was 63.6 by 58.6 n. mi."',
                ),
                summary(
                  'Lunar Orbit Phase',
                  '"the final lunar orbit had an apogee and perigee of 63.6 by 58.6 n mi"',
                ),
              ),
              periapsis: cite(
                58.6,
                reportText(
                  '5.6, Transearth Injection',
                  '5-3',
                  46,
                  '"the final lunar orbit was 63.6 by 58.6 n. mi."',
                ),
              ),
            },
          ],
          endFix: {
            // 174.78 degrees east is on the far side.
            longitude: cite(
              174.78,
              trajectoryTable('Transearth injection, Ignition', '5-8'),
              summary(
                'Transearth Phase',
                '"After emerging from lunar occlusion following transearth injection"',
              ),
            ),
          },
        },
        {
          kind: 'burn',
          label: 'Transearth injection',
          body: 'moon',
          start: TEI_IGNITION,
          end: TEI_CUTOFF,
          deltaV: cite(3_519.0, transearthTable('Transearth injection cutoff')),
        },
        {
          kind: 'transfer',
          label: 'Coast home',
          to: 'earth',
          start: TEI_CUTOFF,
          end: ENTRY_INTERFACE,
          moonFix: {
            longitude: cite(160.19, trajectoryTable('Transearth injection, Cutoff', '5-8')),
            altitude: cite(
              66.1,
              transearthTable('Transearth injection cutoff'),
              trajectoryTable('Transearth injection, Cutoff', '5-8'),
            ),
            speed: cite(
              8_842,
              transearthTable('Transearth injection cutoff'),
              trajectoryTable('Transearth injection, Cutoff', '5-8'),
            ),
            flightPathAngle: cite(
              5.1,
              transearthTable('Transearth injection cutoff'),
              trajectoryTable('Transearth injection, Cutoff', '5-8'),
            ),
          },
          earthFix: {
            latitude: cite(
              20.83,
              entryTable('Earth Entry Geodetic Latitude (deg N)'),
              entryParameters('Geodetic latitude, deg north'),
            ),
            longitude: cite(
              -179.89,
              entryTable('Earth Entry Longitude (deg E)'),
              entryParameters('Longitude, deg west'),
            ),
            altitude: cite(65.9, entryParameters('Altitude, n. mi.')),
            speed: cite(
              36_221.1,
              entryTable('Earth Entry Velocity (ft/sec)'),
              entryParameters('Space-fixed velocity, ft/sec'),
            ),
            flightPathAngle: cite(
              -6.5,
              entryTable('Earth Entry Flight Path Angle'),
              entryParameters('Space-fixed flight-path angle, deg'),
            ),
            heading: cite(
              121.57,
              entryTable('Earth Entry Heading Angle (deg)'),
              entryParameters('Space-fixed heading angle, deg east of north'),
            ),
          },
          lunarSense: RETROGRADE,
          earthSense: cite('prograde', {
            ...entryTable('Earth Entry Heading Angle (deg)'),
            locator:
              'Entry, Splashdown, and Recovery table, Apollo 8 column, "Heading Angle": 121.57 degrees, so the spacecraft arrived heading east',
          }),
        },
        {
          kind: 'entry',
          label: 'Entry and splashdown',
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: at(
            '146:54:47.8',
            sequence('Drogue deployment', '3-4'),
            timeline('Drogue parachute deployed'),
          ),
          splashdown: SPLASHDOWN,
        },
        {
          kind: 'surface',
          label: 'Waiting for the recovery ship',
          body: 'earth',
          start: LANDING,
          end: at(
            '148:29:00',
            timeline('Crew aboard recovery ship.'),
            reportText(
              '3.0, Mission Description',
              '3-2',
              11,
              '"The crew were retrieved and were aboard the USS Yorktown at 17:20 G.m.t."',
            ),
          ),
          site: SPLASHDOWN,
        },
      ],
    },
  ],
};

/** One row of the Apollo 8 ascent table (geocentric latitude). */
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
