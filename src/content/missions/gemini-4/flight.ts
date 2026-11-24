import type { FlightPlan } from '../../../sim/types.ts';
/**
 * The Gemini IV flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * One ship: the crew's spacecraft ("gemini", the main ship). The spent
 * second stage of the Titan II, which the crew tried to fly beside for most
 * of the first revolution, is told in the story only; it is not drawn. The
 * report gives its orbit (87.6 by 150.1 nautical miles) and how far apart
 * the two were at a few moments, but not where it was relative to the
 * spacecraft through the exercise, so any drawing of the chase would be
 * invented.
 *
 * Sources:
 * - Gemini Program Mission Report, Gemini IV (MSC-G-R-65-3, June 1965): the
 *   sequence of events (Table 4-I), launch, insertion and landing (Table
 *   4-II), the orbit through the flight (Table 4-III), the station-keeping
 *   firings (Table 4-IV), the 400,000-foot point (Table 5.1-IV), retrofire
 *   (section 5.1.8.3), the drogue parachute (section 5.1.11), and the
 *   recovery (section 6.3.2). The citations link to NASA's Technical Reports
 *   Server copy. Page numbers are the report's printed pages, then the
 *   PDF's pages.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini IV's ground elapsed time, as the report
 * prints it: zero at lift-off, 15:15:59.562 G.m.t. on June 3, 1965 (Table
 * 4-I prints lift-off at 0 g.e.t.).
 *
 * Arithmetic of ours, from printed values:
 * - Times the report prints in seconds from lift-off, or in minutes and
 *   seconds (Table 4-IV), are written as hours:minutes:seconds.
 * - The end of the station keeping is the last firing's printed start plus
 *   its printed length (Table 4-IV), and the spacecraft was on the carrier's
 *   deck at the printed 100:05 plus the printed 7 minutes (section 6.3.2).
 * - 40,000 feet is 6.58 nautical miles (1 foot = 0.3048 m, 1 nautical mile
 *   = 1852 m).
 * - The landing point is printed in degrees and minutes; we write it in
 *   decimal degrees.
 * - The universal times sent to Horizons are lift-off plus the mission
 *   clock times of the sky samples.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The launch pad: Launch Complex 19 is placed where the Gemini VIII plan
 *   places it (its estimate from that flight's report; see
 *   missions/gemini-8/flight.ts), since every crewed Gemini flew from it.
 *   The Gemini IV report prints no first-stage cutoff point to check it by.
 * - The climb to orbit between the pad and the published points, and the
 *   entry (a smooth ground track to the landing point and a smooth descent
 *   to the drogue parachute height). Where retrofire happened is not
 *   printed; the engine places it so the fall reaches the landing point on
 *   time.
 * - The orbit over the four days: a Kepler ellipse turned slowly by Earth's
 *   bulge (J2), whose size passes through the report's published sizes at
 *   the moments they belong to and changes smoothly in between (air drag
 *   lowered it slowly). The 74 station-keeping firings are not drawn one by
 *   one: the orbit changes smoothly from the insertion size, at the first
 *   firing toward the stage, to the size after station keeping, at the end
 *   of the last firing. Table 4-III's sizes for revolutions 18, 33 and 52
 *   are not used, because the report gives them by revolution, not by time,
 *   and a revolution's time cannot be worked out from the orbital period
 *   (the flight's 62 revolutions in about 98 hours are longer than its
 *   89-minute periods). They lie close to the smooth change drawn between
 *   the sizes used here.
 * - The size for revolution 61 is placed at the start of the pre-retrofire
 *   maneuver, early in revolution 62 (section 4.1). That maneuver itself
 *   (2 minutes 41 seconds of the aft-firing thrusters, which lowered the
 *   perigee to a theoretical 42.3 nautical miles) is not drawn, because the
 *   report gives no apogee after it; the drawn orbit runs on at the
 *   revolution 61 size to retrofire.
 * - The retrofire burn is drawn from the first retrorocket's ignition to
 *   the last one's. The report prints when the motors fired (section
 *   5.1.8.3 and Table 5.1-X) but not when the last burned out, a few seconds
 *   later.
 * - The fall from retrofire to 400,000 feet took only about two and a half
 *   minutes, because the pre-retrofire maneuver had already lowered the
 *   perigee. With that maneuver left out (see above), the engine draws the
 *   fall from the higher revolution 61 orbit, so it is steeper than the
 *   real one; its time and the entry interface time are the published
 *   ones.
 * - The report's final orbit heights are over an oblate Earth (section
 *   4.3.1.2); the model measures them from Earth's equatorial radius, which
 *   can draw an apogee or perigee up to about 3 nautical miles off,
 *   depending on its latitude.
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until the carrier lifted it aboard; its drift to the pickup point
 *   (section 6.3.2) is not drawn.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = 'https://ntrs.nasa.gov/api/citations/19670095754/downloads/19670095754.pdf';
const GEMINI_8_REPORT =
  'https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf';
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES =
  '&TLIST_TYPE=%27CAL%27&TLIST=%271965-06-03%2015:15:59.562%27,%271965-06-04%2013:15:59.562%27,%271965-06-06%2019:01:42.562%27,%271965-06-07%2016:56:00.562%27,%271965-06-07%2017:12:11.562%27';
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

function report(locator: string): Citation {
  return { source: 'gemini-4-mission-report', locator, url: MISSION_REPORT };
}

/** Table 4-I, sequence of events, "Actual time, g.e.t." column. */
const events = (row: string, page: '4-12 (PDF page 90)' | '4-13 (PDF page 91)'): Citation =>
  report(`Table 4-I, "Sequence of Events" (page ${page}), "${row}" row, actual time`);
const launchEvent = (row: string): Citation => events(row, '4-12 (PDF page 90)');
const flightEvent = (row: string): Citation => events(row, '4-13 (PDF page 91)');
/** Table 4-II, trajectory parameters, "Actual, Final" column. */
const trajectory = (condition: string, row: string): Citation =>
  report(
    `Table 4-II, "Comparison of Planned and Actual Trajectory Parameters" (page 4-14, PDF page 92), ${condition}, "${row}" row, actual final column`,
  );
/** Table 4-III, orbital elements, "Actual, Final" column. */
const elements = (revolution: string, row: string): Citation =>
  report(
    `Table 4-III, "Comparison of Orbital Elements" (page 4-15, PDF page 93), revolution ${revolution}, "${row}" row, actual final column`,
  );
/** Table 4-IV, the station-keeping firings (times printed in minutes and seconds). */
const stationKeeping = (page: '4-16 (PDF page 94)' | '4-17 (PDF page 95)', row: string): Citation =>
  report(
    `Table 4-IV, "Detailed List of Maneuvers During Gemini IV Station-Keeping Attempt" (page ${page}), ${row}`,
  );
const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: 'jpl-horizons',
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY('301', '500@399', '31');
const EARTH_FROM_MOON = HORIZONS_QUERY('399', '500@301', '14');
const SUN_FROM_EARTH = HORIZONS_QUERY('10', '500@399', '31');

/** Seconds on the mission clock as "hhh:mm:ss.sss". */
function clockTime(seconds: number): ElapsedTime {
  const total = Math.round(seconds * 1000) / 1000;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total - hours * 3600) / 60);
  const rest = (total - hours * 3600 - minutes * 60).toFixed(3).replace(/\.?0+$/, '');
  const [whole = '0', fraction] = rest.split('.');
  const secondsText = whole.padStart(2, '0') + (fraction ? `.${fraction}` : '');
  return `${String(hours).padStart(3, '0')}:${String(minutes).padStart(2, '0')}:${secondsText}` as ElapsedTime;
}

/** A time the report prints in seconds from lift-off. */
function fromLiftoff(seconds: number, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: clockTime(seconds), citations: [citation, ...more] };
}

/** Degrees and minutes as printed, in decimal degrees. */
function degrees(whole: number, minutes: number): number {
  return whole + minutes / 60;
}

/* ------------------------------------------------------------------ */
/* Times on the mission clock.                                         */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  '000:00:00',
  launchEvent('Lift-off (pad disconnect separation) (15:15:59.562 G.m.t.)'),
);
const INSERTION: Cited<ElapsedTime> = {
  ...fromLiftoff(365.6, trajectory('spacecraft separation', 'Time from lift-off, sec')),
  discrepancy:
    "Table 4-I gives spacecraft separation as 365.55 seconds after lift-off. The orbit starts at Table 4-II's 365.6, the moment of its published state.",
};
/** The first firing toward the stage (Table 4-IV prints 8:47.164, minutes and seconds). */
const STATION_KEEPING_START = at(
  '000:08:47.164',
  stationKeeping(
    '4-16 (PDF page 94)',
    'first firing after separation, "Time (g.e.t.), min:sec" 8:47.164',
  ),
);
/** The last firing (Table 4-IV prints 86:46.297, minutes and seconds) plus its 4.25 seconds (our sum). */
const STATION_KEEPING_END = fromLiftoff(
  86 * 60 + 46.297 + 4.25,
  stationKeeping(
    '4-17 (PDF page 95)',
    'last firing, "Time (g.e.t.), min:sec" 86:46.297 and "Length of burn, sec" 4.25',
  ),
);
const PRE_RETROFIRE = at(
  '097:28:02',
  flightEvent('Preretrofire maneuver initiate'),
  report(
    'Section 4.1, "Actual Mission" (page 4-4, PDF page 82): "In revolution 62 at 97:28:02 g.e.t., a preretrograde orbital attitude and maneuvers system (OAMS) maneuver was initiated"',
  ),
);
const RETROFIRE: Cited<ElapsedTime> = {
  ...at(
    '097:40:00.7',
    report(
      'Section 5.1.8.3, "Retrograde rocket system" (page 5-34, PDF page 150): "At 97:40:00.7 g.e.t. ignition of retrorocket number 1 occurred"',
    ),
    report(
      'Change sheet, Change 1 of December 9, 1965 (PDF page 3), pen-and-ink change 11: "Change actual time of retrofire to 97:40:00.70 g.e.t."',
    ),
  ),
  discrepancy:
    'Table 4-I gives retrofire as 97:40:01, to the second. We follow the tenths of a second in section 5.1.8.3.',
};
/** The last of the four retrorockets fired (the time it burned out is not printed). */
const LAST_RETROROCKET = at(
  '097:40:17.2',
  report(
    'Table 5.1-X, "Sequential Events" (page 5-60, PDF page 176), "Retrorocket no. 4 fire" 97:40:17.2',
  ),
  report(
    'Section 5.1.8.3, "Retrograde rocket system" (page 5-34, PDF page 150): retrorocket number 1 was "followed by the remaining motors in the normal firing sequence"',
  ),
);
const ENTRY_INTERFACE = at(
  '097:42:31',
  report(
    'Table 5.1-IV, "Guidance and Control Summary Chart" - Concluded (page 5-55, PDF page 171), "400 000 feet" row, actual time',
  ),
  report(
    'Section 4.1, "Actual Mission" (page 4-4, PDF page 82): the command pilot "held full-lift attitude for 21 seconds beyond the 400 000-foot altitude"; section 5.1.5.2.3 (page 5-18, PDF page 134): "a full-lift attitude was held until 97:42:52.5 g.e.t."',
  ),
);
const LANDING = at('097:56:12', flightEvent('Landing'));
/** The end of the path: the carrier had the spacecraft on its deck. */
const SPACECRAFT_ABOARD = at(
  '100:12:00',
  report(
    'Section 6.3.2, "Location and Retrieval" (page 6-12, PDF page 247): "The U.S.S. Wasp was alongside the spacecraft at 100:05 g.e.t. and had the spacecraft on the deck 7 minutes later" (to the minute; seconds written as 00; the sum is ours)',
  ),
  report(
    'Section 1.0, "Mission Summary" (page 1-1, PDF page 36): "the recovery of the spacecraft by the prime recovery ship, the aircraft carrier U.S.S. Wasp, ... at 2:28 p.m. e.s.t."',
  ),
);

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/*
 * Launch Complex 19, as the Gemini VIII plan places it, with that plan's
 * citations: the Gemini VIII report does not print where the pad is either,
 * so it is that plan's estimate from the report's first-stage cutoff point,
 * its range from the launch site, and the flight azimuth (see
 * missions/gemini-8/flight.ts). Every crewed Gemini flew from this pad.
 */
const PAD_19_ESTIMATE: [Citation, ...Citation[]] = [
  report(
    'Section 1.0, "Mission Summary" (page 1-1, PDF page 36): Gemini IV "was launched from Complex 19 at Cape Kennedy, Florida"',
  ),
  {
    source: 'gemini-8-mission-report',
    locator:
      'Section 1.0 (page 1-1): the spacecraft "was launched from Complex 19"; our estimate of where Complex 19 is, not a printed value: the point from which a great circle at the flight azimuth reaches the BECO point after the BECO range',
    url: GEMINI_8_REPORT,
  },
  {
    source: 'gemini-8-mission-report',
    locator:
      'Table 4.3-I, "Comparison of Planned and Actual Gemini Space Vehicle Trajectory Parameters" (pages 4-22 and 4-23), BECO, "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.36 N, 79.61 W, 51.4)" row, actual final column',
    url: GEMINI_8_REPORT,
  },
  {
    source: 'gemini-8-mission-report',
    locator:
      'Section 4.1 (page 4-1): "the GLV was launched ... on a rendezvous launch azimuth of 99.9 degrees"',
    url: GEMINI_8_REPORT,
  },
];
const PAD_19 = {
  latitude: cite(28.51, ...PAD_19_ESTIMATE),
  longitude: cite(-80.57, ...PAD_19_ESTIMATE),
};

/** Where the spacecraft came down, and floated until the carrier lifted it aboard. */
const SPLASHDOWN = {
  latitude: {
    ...cite(
      degrees(27, 44),
      trajectory('landing point', 'Latitude, deg:min North (printed 27:44)'),
      report(
        'Section 4.1, "Actual Mission" (page 4-4, PDF page 82): "Landing occurred at 97:56:12 g.e.t. at 27:44 North latitude and 74:14 West longitude, as reported by the recovery ship"',
      ),
    ),
    discrepancy:
      "The mission report's summary (section 1.0, page 1-1) gives 27 degrees 44 minutes north, 74 degrees 11 minutes west, the same as the calculated landing position the carrier received (section 6.3.2, page 6-11), and NASA's Gemini IV page and NSSDCA give 27.73 N, 74.18 W, which matches it. We follow Table 4-II's final column and section 4.1: 27 degrees 44 minutes north, 74 degrees 14 minutes west. The report does not say whether this latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(
    -degrees(74, 14),
    trajectory('landing point', 'Longitude, deg:min West (printed 74:14)'),
    report(
      'Section 4.1, "Actual Mission" (page 4-4, PDF page 82): "27:44 North latitude and 74:14 West longitude, as reported by the recovery ship"',
    ),
  ),
};

const PROGRADE: Cited<'prograde'> = cite(
  'prograde',
  trajectory('spacecraft separation', 'Space-fixed heading angle, deg East of North (78.90)'),
);

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: 'gemini-4',

  // Five samples across the four days: lift-off, the return to the flight
  // plan, the computer failure, retrofire, and landing.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(
        124.5778996,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1965-06-03 15:15:59.562',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        7.121872,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1965-06-03 15:15:59.562',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        72.8150286,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1965-06-03 15:15:59.562',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: at(
        '022:00:00',
        report(
          'Section 4.1, "Actual Mission" (page 4-3, PDF page 81): "The crew was instructed to return to the normal flight plan at 22 hours g.e.t." (given to the hour)',
        ),
      ),
      moonEclipticLongitude: cite(
        137.9032298,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1965-06-04 13:15:59.562',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        50.132268,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1965-06-04 13:15:59.562',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        73.6929342,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1965-06-04 13:15:59.562',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: at(
        '075:45:43',
        report(
          'Section 4.1, "Actual Mission" (page 4-3, PDF page 81): "At approximately 75:45:43 g.e.t., the command pilot had trouble turning off the computer"',
        ),
      ),
      moonEclipticLongitude: cite(
        169.5035609,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1965-06-06 19:01:42.562',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        352.043667,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1965-06-06 19:01:42.562',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        75.8370376,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1965-06-06 19:01:42.562',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: at('097:40:01', flightEvent('Retrofire')),
      moonEclipticLongitude: cite(
        181.9372164,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1965-06-07 16:56:00.562',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        33.908719,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1965-06-07 16:56:00.562',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        76.7101509,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1965-06-07 16:56:00.562',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(
        182.0887128,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1965-06-07 17:12:11.562',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        29.988807,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1965-06-07 17:12:11.562',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        76.7209001,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1965-06-07 17:12:11.562',
          SUN_FROM_EARTH,
        ),
      ),
    },
  ],

  ships: [
    {
      id: 'gemini',
      name: 'Gemini IV spacecraft',
      role: 'main',
      phases: [
        {
          kind: 'ascent',
          label: 'Launch',
          body: 'earth',
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
          // No track points. The report prints no first-stage cutoff point,
          // and its second-stage cutoff point (Table 4-II: 333.8 seconds,
          // 87.4 nautical miles, 30.52 N, 72.21 W) lies only 120.6 nautical
          // miles of range short of the separation point it gives 31.8
          // seconds later. Covering that distance in that time means
          // moving over the ground about 3 percent slower than the
          // spacecraft was moving at separation (our arithmetic; the
          // printed speeds themselves, 25,659 ft/sec at cutoff and 25,743
          // at separation, differ by only 0.3 percent). Drawn through that
          // point, the path jumps in speed at insertion (the all-missions
          // test measured 3.13 percent). The separation state is the one the orbit is built
          // from (the Bermuda tracking vector run back to separation,
          // section 4.3.1.1), so the climb is drawn from the pad straight
          // to it.
        },
        {
          kind: 'orbit',
          label: 'Four days in orbit',
          body: 'earth',
          start: INSERTION,
          end: RETROFIRE,
          apoapsis: cite(152.2, elements('Insertion', 'Apogee, n. mi.')),
          periapsis: cite(87.6, elements('Insertion', 'Perigee, n. mi.')),
          inclination: cite(32.53, elements('Insertion', 'Inclination, deg')),
          sense: PROGRADE,
          startFix: {
            latitude: cite(
              30.97,
              trajectory('spacecraft separation', 'Geodetic latitude, deg North'),
            ),
            longitude: cite(
              -69.88,
              trajectory('spacecraft separation', 'Longitude, deg West (printed 69.88 west)'),
            ),
            altitude: cite(87.6, trajectory('spacecraft separation', 'Altitude, n. mi.')),
            speed: cite(
              25_743,
              trajectory('spacecraft separation', 'Space-fixed velocity, ft/sec'),
            ),
            flightPathAngle: cite(
              0.07,
              trajectory('spacecraft separation', 'Space-fixed flight-path angle, deg'),
            ),
            heading: cite(
              78.9,
              trajectory(
                'spacecraft separation',
                'Space-fixed heading angle, deg East of North (printed 78.90)',
              ),
            ),
          },
          sizes: [
            // The station-keeping attempt: the insertion orbit until the
            // first firing toward the stage, the raised orbit after the last.
            {
              time: STATION_KEEPING_START,
              apoapsis: cite(152.2, elements('Insertion', 'Apogee, n. mi.')),
              periapsis: cite(87.6, elements('Insertion', 'Perigee, n. mi.')),
            },
            {
              time: STATION_KEEPING_END,
              apoapsis: cite(
                159.9,
                elements('2 (after station-keeping)', 'Apogee, n. mi.'),
                report(
                  'Section 4.1, "Actual Mission" (page 4-2, PDF page 80): "Maneuvers performed up to this time had resulted in a 90.4 by 159.9 nautical-mile orbit"',
                ),
              ),
              periapsis: cite(90.4, elements('2 (after station-keeping)', 'Perigee, n. mi.')),
            },
            // Four days of slow decay, to the last revolution before the
            // pre-retrofire maneuver.
            {
              time: PRE_RETROFIRE,
              apoapsis: cite(136.5, elements('61', 'Apogee, n. mi.')),
              periapsis: cite(86.1, elements('61', 'Perigee, n. mi.')),
            },
          ],
        },
        {
          kind: 'burn',
          label: 'Retrofire',
          body: 'earth',
          start: RETROFIRE,
          end: LAST_RETROROCKET,
          deltaV: cite(
            333.5,
            report(
              'Section 5.1.8.3, "Retrograde rocket system" (page 5-34, PDF page 150): "The actual imparted spacecraft velocity decrement of 333.5 ft/sec"',
            ),
          ),
        },
        {
          kind: 'coast',
          label: 'Falling toward the atmosphere',
          body: 'earth',
          start: LAST_RETROROCKET,
          end: ENTRY_INTERFACE,
          sense: PROGRADE,
        },
        {
          kind: 'entry',
          label: 'Entry and splashdown',
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: at('097:50:53', flightEvent('Drogue deployment')),
          // 40,000 feet, in nautical miles (our conversion).
          drogueAltitude: cite(
            6.58,
            report(
              'Section 5.1.11, "Landing System" (page 5-47, PDF page 163): "the drogue parachute was deployed at an altitude of 40 000 feet instead of the normal altitude of 50 000 feet"',
            ),
          ),
          splashdown: SPLASHDOWN,
        },
        {
          kind: 'surface',
          label: 'Floating until the carrier lifts it aboard',
          body: 'earth',
          start: LANDING,
          end: SPACECRAFT_ABOARD,
          site: SPLASHDOWN,
        },
      ],
    },
  ],
};
