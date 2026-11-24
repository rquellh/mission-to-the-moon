import type { FlightPlan, StateFix } from '../../../sim/types.ts';
/**
 * The Apollo 7 flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the command and service module ("csm", the crew's spacecraft)
 * and the Saturn IB's spent S-IVB stage ("s-ivb"), which carried the
 * spacecraft into orbit, flew beside it after separation, and was its
 * rendezvous target the next day.
 *
 * Sources:
 * - Apollo 7 Mission Report (MSC-PA-R-68-15), the more primary source, so we
 *   follow it where the two disagree: the sequence of events (Table 2-I),
 *   the orbits before and after each maneuver (Table 2-II), the positions
 *   at maneuvers (Table 3-III), the entry interface (Table 3-VI and section
 *   5.16.1), and the landing point (section 5.16.1). NASA's copy at nasa.gov
 *   now answers "not found"; the citations link to the Internet Archive's
 *   copy of that NASA file.
 * - Apollo by the Numbers (NASA SP-2000-4029): the launch site and the climb
 *   to orbit (Apollo 7 Ascent Phase table, with geocentric latitudes, as for
 *   Apollo 11), the state at orbit insertion, and times the report does not
 *   print. Its maneuver times and the ones we use agree to a tenth of a
 *   second unless a `discrepancy` says otherwise.
 *
 * Which of the report's times we use: Table 2-I's, except where Table
 * 3-III prints a different time for the same moment and its time agrees
 * with the firing time in Table 3-IV or 3-V and with Apollo by the Numbers.
 * Then we follow Table 3-III: the first phasing maneuver's cutoff, the
 * first service propulsion cutoff, and the fourth firing's ignition. (Table
 * 3-III's 259:31:16.3 for the deorbit ignition is a misprint, not such a
 * case.)
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is ground elapsed time from range zero, 15:02:45 G.m.t.
 * on October 11, 1968 (Table 2-I); lift-off came 0.36 second later.
 *
 * Arithmetic of ours, from printed values: terminal phase initiation ends at
 * its printed start plus its printed 46-second length (Apollo by the Numbers
 * prints the same end, 029:17:19).
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The climb to orbit between the published points, each burn (a smooth
 *   blend from one orbit to the next), the closing-in after terminal phase
 *   initiation (the midcourse correction and the braking are not drawn one
 *   by one; the path blends from the spacecraft's own orbit into the stage's
 *   position by the start of station keeping), and the entry (a smooth
 *   ground track to the landing point and a smooth descent to an
 *   illustrative drogue parachute height).
 * - Orbits are Kepler ellipses turned slowly by Earth's bulge (J2). Air drag
 *   and the S-IVB's venting are drawn only as a smooth change between the
 *   published orbit sizes (`sizes`). The small maneuvers (the two phasing
 *   maneuvers with the reaction control thrusters, and the third, fourth,
 *   sixth, and seventh service propulsion firings) are drawn as steps in
 *   orbit size, not as burns, so the plane changes in the third and seventh
 *   firings (directed partly out of plane to give the control system a
 *   longer test) are not drawn as such. The fifth firing, the largest, is a
 *   burn between two orbits.
 * - The orbit heights are above the oblate Earth model (Table 3-I), the
 *   Fischer ellipsoid (section 3.0, page 3-1); the model
 *   measures them from Earth's equatorial radius, which can draw an apogee or
 *   perigee a few nautical miles off, depending on its latitude.
 * - Small smooth corrections keep the drawn path on its published points:
 *   the 1st service propulsion firing's position is not used (see FIRST_SPS),
 *   so the orbit before it runs free from the stage's, and the next orbit
 *   is pinned to the 2nd firing's published position.
 * - The stage's own orbit after separation is not published, only that it
 *   decayed faster than expected and where it was at station keeping, so it
 *   is drawn changing smoothly from the orbit at separation to the orbit at
 *   station keeping. While the two kept station, both are drawn at the
 *   stage's position (70 feet apart). The stage's path ends with the
 *   crew's separation maneuver: its later orbit is not published, so its
 *   drift away from the spacecraft and its fall into the Indian Ocean on
 *   October 18 are not drawn.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT =
  'https://web.archive.org/web/20250207014232/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A07_MissionReport.pdf';
const ABN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES =
  '&TLIST_TYPE=%27CAL%27&TLIST=%271968-10-11%2015:02:45.36%27,%271968-10-22%2011:11:48%27';
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

function report(locator: string): Citation {
  return { source: 'apollo-7-mission-report', locator, url: MISSION_REPORT };
}

/** Table 2-I, the sequence of events, "Actual" column. */
const sequence = (row: string, page: '2-3' | '2-4'): Citation =>
  report(
    `Table 2-I, "Sequence of Events" (page ${page}, PDF page ${page === '2-3' ? 29 : 30}), "${row}" row, actual column`,
  );

/** Table 2-II, the orbit before or after a maneuver, "Actual" column (heights above the oblate Earth model, the Fischer ellipsoid of section 3.0). */
const elements = (
  maneuver: keyof typeof TABLE_2_II_PAGES,
  when: 'before' | 'after',
  row: string,
): Citation => {
  const page = TABLE_2_II_PAGES[maneuver];
  return report(
    `Table 2-II, "Orbital Elements Before and After Maneuvers" (page ${page}, PDF page ${Number(page.slice(2)) + 26}), ${maneuver}, ${when} maneuver, "${row}" row, actual column`,
  );
};
const TABLE_2_II_PAGES = {
  Insertion: '2-5',
  'S-IVB venting': '2-5',
  'Spacecraft/S-IVB separation': '2-5',
  'First rendezvous phasing': '2-5',
  'Second rendezvous phasing': '2-5',
  'Corrective combination (first service propulsion)': '2-5',
  'Coelliptic (second service propulsion)': '2-6',
  'Terminal phase initiate': '2-6',
  'Terminal phase finalize (braking)': '2-6',
  Separation: '2-6',
  'Third service propulsion': '2-6',
  'Fourth service propulsion': '2-6',
  'Fifth service propulsion': '2-7',
  'Sixth service propulsion': '2-7',
  'Seventh service propulsion': '2-7',
  'Eighth service propulsion': '2-7',
} as const;

/** Table 3-III, a maneuver's ignition or cutoff state, "Actual" column. */
const maneuverState = (
  maneuver: string,
  page: string,
  when: 'ignition' | 'cutoff',
  row: string,
): Citation =>
  report(
    `Table 3-III, "Trajectory Parameters for Maneuvers" (page ${page}, PDF page ${Number(page.slice(2)) + 33}), ${maneuver}, ${when}, "${row}" row, actual column`,
  );

/** Table 3-VI, the entry interface (400 000 ft), "Actual" column. */
const entryState = (row: string): Citation =>
  report(
    `Table 3-VI, "Trajectory Parameters for Entry" (page 3-20, PDF page 53), entry interface (400 000 ft), "${row}" row, actual column`,
  );

const ascentTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 7 Ascent Phase table, "${row}" row`,
  url: `${ABN}Apollo_07d_Ascent_Phase.htm`,
});
const earthOrbitTable = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 7 Earth Orbit Phase table, "${row}" row`,
  url: `${ABN}Apollo_07e_Earth_Orbit_Phase.htm`,
});
const timeline = (row: string): Citation => ({
  source: 'apollo-by-the-numbers',
  locator: `Apollo 7 Timeline, row "${row}"`,
  url: `${ABN}Apollo_07f_Timeline.htm`,
});
const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: 'jpl-horizons',
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY('301', '500@399', '31');
const EARTH_FROM_MOON = HORIZONS_QUERY('399', '500@301', '14');
const SUN_FROM_EARTH = HORIZONS_QUERY('10', '500@399', '31');

/** The orbit runs west to east (prograde), as the heading at insertion shows. */
const PROGRADE: Cited<'prograde'> = cite('prograde', {
  ...ascentTable('Earth orbit insertion'),
  locator:
    'Apollo 7 Ascent Phase table, "Earth orbit insertion" row: space-fixed heading 86.32 degrees east of north, so the orbit runs west to east',
});

/** A difference from Apollo by the Numbers for a time we take from the report. */
function abnDiffers(value: Cited<ElapsedTime>, abn: string, row: string): Cited<ElapsedTime> {
  return {
    ...value,
    discrepancy: `Apollo by the Numbers (Apollo 7 Earth Orbit Phase table and Timeline, "${row}") gives ${abn}. We follow the mission report's Table 2-I.`,
  };
}

/* ------------------------------------------------------------------ */
/* Times.                                                              */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  '000:00:00.36',
  report(
    'Table 2-I, "Sequence of Events" (page 2-3, PDF page 29): "Range zero (15:02:45 G.m.t.)" and "Lift-off (15:02:45.36 G.m.t.)" (the actual column rounds it to 00:00:00.4)',
  ),
  ascentTable('Liftoff'),
);
const INSERTION = at(
  '000:10:26.76',
  ascentTable('Earth orbit insertion'),
  sequence('Orbital insertion', '2-3'),
);
const SAFING_START = at(
  '001:34:29.0',
  sequence('S-IVB safing start', '2-3'),
  timeline('S-IVB safing experiment - LOX dump started.'),
);
const SAFING_END = at(
  '001:46:30.0',
  sequence('S-IVB safing terminate', '2-3'),
  timeline('S-IVB safing experiment - LOX dump ended.'),
);
const SEPARATION = at(
  '002:55:02.40',
  timeline('Separation of CSM from S-IVB.'),
  sequence('Spacecraft/S-IVB separation', '2-3'),
);
const PHASING_1 = at('003:20:09.9', sequence('First phasing maneuver start', '2-3'));
const PHASING_1_END: Cited<ElapsedTime> = {
  ...at(
    '003:20:26.2',
    maneuverState(
      'First phasing maneuver (reaction control system)',
      '3-11',
      'cutoff',
      'Time, hr:min:sec',
    ),
    report(
      'Table 3-IV, "Rendezvous Maneuvers" (page 3-18, PDF page 51), first phasing, time 16.3 seconds',
    ),
    earthOrbitTable('1st rendezvous phasing cutoff'),
  ),
  discrepancy:
    "Table 2-I of the same report gives the cutoff as 03:20:26.7, which does not fit the 16.3-second firing in Table 3-IV. We follow Table 3-III, which Apollo by the Numbers' Earth Orbit Phase table agrees with.",
};
const PHASING_2 = at(
  '015:52:00.9',
  sequence('Second phasing maneuver start', '2-3'),
  earthOrbitTable('2nd rendezvous phasing ignition'),
);
const PHASING_2_END = at(
  '015:52:18.5',
  sequence('Second phasing maneuver cutoff', '2-3'),
  earthOrbitTable('2nd rendezvous phasing cutoff'),
);
const SPS_1 = at(
  '026:24:55.7',
  sequence('First service propulsion ignition', '2-3'),
  earthOrbitTable('1st SPS ignition'),
);
const SPS_1_END: Cited<ElapsedTime> = {
  ...at(
    '026:25:05.1',
    maneuverState('First service propulsion maneuver', '3-12', 'cutoff', 'Time, hr:min:sec'),
    report(
      'Table 3-V, "Service Propulsion Maneuvers" (page 3-19, PDF page 52), maneuver 1, actual firing time 9.4 seconds',
    ),
  ),
  discrepancy:
    'Table 2-I of the same report gives the cutoff as 26:25:05.7, which does not fit the 9.4-second firing in Table 3-V. We follow Table 3-III; Apollo by the Numbers gives 026:25:05.02.',
};
const SPS_2 = at(
  '028:00:56.5',
  sequence('Second service propulsion ignition', '2-3'),
  earthOrbitTable('2nd SPS ignition'),
);
const SPS_2_END = abnDiffers(
  at('028:01:04.3', sequence('Second service propulsion cutoff', '2-3')),
  '028:01:04.23',
  '2nd SPS cutoff',
);
const TPI = at(
  '029:16:33',
  sequence('Terminal phase initiate start', '2-3'),
  maneuverState('Terminal phase initiate', '3-13', 'ignition', 'Time, hr:min:sec'),
);
const TPI_END = at(
  '029:17:19',
  report(
    'Section 3.2.1, "Rendezvous Maneuvers" (page 3-3, PDF page 36): terminal phase initiation "was performed at 29:16:33" and was a "46-second maneuver" (the end is our sum)',
  ),
  timeline('Terminal phase initiation cutoff.'),
);
const STATION_KEEPING = at(
  '029:55:43',
  sequence('End braking, begin station-keeping', '2-4'),
  maneuverState('Station-keeping initiate', '3-13', 'ignition', 'Time, hr:min:sec'),
);
const SEPARATION_BURN = at('030:20:00.0', sequence('Separation maneuver start', '2-4'));
const SEPARATION_BURN_END = at('030:20:05.4', sequence('Separation maneuver cutoff', '2-4'));
const SPS_3 = at(
  '075:48:00.3',
  sequence('Third service propulsion ignition', '2-4'),
  earthOrbitTable('3rd SPS ignition'),
);
const SPS_3_END = abnDiffers(
  at('075:48:09.3', sequence('Third service propulsion cutoff', '2-4')),
  '075:48:09.37',
  '3rd SPS cutoff',
);
const SPS_4: Cited<ElapsedTime> = {
  ...at(
    '120:43:00.4',
    maneuverState('Fourth service propulsion maneuver', '3-15', 'ignition', 'Time, hr:min:sec'),
    report(
      'Table 3-V, "Service Propulsion Maneuvers" (page 3-19, PDF page 52), maneuver 4, actual firing time 0.5 second',
    ),
    earthOrbitTable('4th SPS ignition'),
  ),
  discrepancy:
    'Table 2-I of the same report gives the ignition as 120:43:00.5. We follow Table 3-III, whose time with the 0.5-second firing in Table 3-V meets the cutoff both tables print (120:43:00.9), and which Apollo by the Numbers (120:43:00.44) agrees with.',
};
const SPS_4_END = at(
  '120:43:00.9',
  sequence('Fourth service propulsion cutoff', '2-4'),
  earthOrbitTable('4th SPS cutoff'),
);
const SPS_5 = abnDiffers(
  at(
    '165:00:00.5',
    sequence('Fifth service propulsion ignition', '2-4'),
    maneuverState('Fifth service propulsion maneuver', '3-15', 'ignition', 'Time, hr:min:sec'),
  ),
  '165:00:00.42',
  '5th SPS ignition',
);
const SPS_5_END = abnDiffers(
  at(
    '165:01:07.6',
    sequence('Fifth service propulsion cutoff', '2-4'),
    maneuverState('Fifth service propulsion maneuver', '3-15', 'cutoff', 'Time, hr:min:sec'),
  ),
  '165:01:07.37',
  '5th SPS cutoff',
);
const SPS_6 = abnDiffers(
  at('210:08:00.5', sequence('Sixth service propulsion ignition', '2-4')),
  '210:07:59.99',
  '6th SPS ignition',
);
const SPS_6_END = abnDiffers(
  at('210:08:01.0', sequence('Sixth service propulsion cutoff', '2-4')),
  '210:08:00.49',
  '6th SPS cutoff',
);
const SPS_7 = at(
  '239:06:12.0',
  sequence('Seventh service propulsion ignition', '2-4'),
  earthOrbitTable('7th SPS ignition'),
);
const SPS_7_END = at(
  '239:06:19.7',
  sequence('Seventh service propulsion cutoff', '2-4'),
  earthOrbitTable('7th SPS cutoff'),
);
/** The deorbit firing. Table 3-III (page 3-17) misprints its ignition as 259:31:16.3. */
const DEORBIT = abnDiffers(
  at('259:39:16.3', sequence('Eighth service propulsion ignition', '2-4')),
  '259:39:16.36',
  '8th SPS ignition (deorbit)',
);
const DEORBIT_END = at(
  '259:39:28.2',
  sequence('Eighth service propulsion cutoff', '2-4'),
  earthOrbitTable('8th SPS cutoff'),
);
const ENTRY_INTERFACE: Cited<ElapsedTime> = {
  ...at(
    '259:53:27',
    sequence('Entry interface (400 000 feet)', '2-4'),
    entryState('Time, hr:min:sec'),
  ),
  discrepancy:
    'Apollo by the Numbers (Timeline, "Entry.", and its Entry, Splashdown, and Recovery table) and section 5.16.1 of the mission report (page 5-99) give 259:53:26. We follow Tables 2-I and 3-VI.',
};
const DROGUE: Cited<ElapsedTime> = {
  ...at('260:03:23', sequence('Drogue deployment', '2-4'), timeline('Drogue parachute deployed')),
  discrepancy:
    'Table 3-VI of the mission report (page 3-20) gives drogue deployment at 260:03:25. We follow Table 2-I.',
};
const LANDING = at(
  '260:09:03',
  sequence('Landing', '2-4'),
  timeline('Splashdown (went to apex-down).'),
);

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/** Launch Complex 34, from the Ascent Phase table's lift-off row (geocentric latitude). */
const PAD_34 = {
  latitude: cite(28.3608, ascentTable('Liftoff')),
  latitudeKind: 'geocentric' as const,
  longitude: cite(-80.5611, ascentTable('Liftoff')),
};

/** Where the command module came down. */
const SPLASHDOWN = {
  latitude: {
    ...cite(
      27.64,
      report(
        'Section 5.16.1 (page 5-100, PDF page 169): "The corrected accelerometer data trajectory indicated a landing at 64.15 degrees west longitude and 27.64 degrees north latitude"',
      ),
    ),
    discrepancy:
      "Apollo by the Numbers (Apollo 7 summary, Recovery, and its Entry, Splashdown, and Recovery table) gives 27.63 degrees north, 64.15 degrees west. The recovery section of the mission report (8.3.2, page 8-11) gives 27 degrees 32.5 minutes north, 64 degrees 4 minutes west, by the USS Essex's dead reckoning from a loran fix at 0945 G.m.t. (page 8-12: over the preceding 10 days, loran fixes between 1000 and 1230 G.m.t. had been unreliable), and NSSDCA gives 27 degrees 32 minutes north, 64 degrees 04 minutes west. We follow the report's reconstructed trajectory.",
  },
  longitude: cite(
    -64.15,
    report(
      'Section 5.16.1 (page 5-100, PDF page 169): a landing "at 64.15 degrees west longitude and 27.64 degrees north latitude"',
    ),
  ),
};

/* ------------------------------------------------------------------ */
/* Orbits.                                                             */
/* ------------------------------------------------------------------ */

/** The orbit after insertion, with the spacecraft on the S-IVB. */
const INSERTION_ORBIT = {
  apoapsis: {
    ...cite(153.7, elements('Insertion', 'after', 'Apogee, n. mi.')),
    discrepancy:
      'Apollo by the Numbers\' Earth Orbit Phase table gives 152.34 by 123.03 nautical miles and an inclination of 31.608 degrees, worked out on a spherical Earth of radius 3,442.934 nautical miles (its Apollo 7 summary, "Ascent Phase"). We follow the mission report, whose heights are above the Fischer ellipsoid (section 3.0, "Trajectory", page 3-1, PDF page 34; Table 3-I calls it the oblate earth model).',
  },
  periapsis: cite(123.3, elements('Insertion', 'after', 'Perigee, n. mi.')),
  inclination: cite(31.58, elements('Insertion', 'after', 'Inclination, deg')),
};

/** The S-IVB's venting raised the orbit; this is the joined pair's orbit at separation. */
const VENTED_ORBIT = {
  apoapsis: {
    ...cite(
      167.5,
      elements('S-IVB venting', 'after', 'Apogee, n. mi.'),
      elements('Spacecraft/S-IVB separation', 'before', 'Apogee, n. mi.'),
    ),
    discrepancy:
      'Apollo by the Numbers (Earth Orbit Phase table, "Separation of CSM from S-IVB" row, and its Apollo 7 summary) gives 170.21 by 123.01 nautical miles at separation. We follow the mission report.',
  },
  periapsis: cite(
    123.4,
    elements('S-IVB venting', 'after', 'Perigee, n. mi.'),
    elements('Spacecraft/S-IVB separation', 'before', 'Perigee, n. mi.'),
  ),
};

/** The spacecraft and the stage at station keeping, a day later. */
const STATION_KEEPING_ORBIT = {
  apoapsis: cite(
    161.0,
    report(
      'Section 3.2.1, "Rendezvous Maneuvers" (page 3-3, PDF page 36): "Braking was completed at 29:55:43, and the spacecraft and S-IVB were in a 161.0 by 122.2 n. mi. orbit."',
    ),
  ),
  periapsis: {
    ...cite(
      122.2,
      report(
        'Section 3.2.1, "Rendezvous Maneuvers" (page 3-3, PDF page 36): "the spacecraft and S-IVB were in a 161.0 by 122.2 n. mi. orbit"',
      ),
    ),
    discrepancy:
      "Table 2-II of the same report (after braking) and Apollo by the Numbers give the spacecraft's perigee then as 122.1 nautical miles; 122.2 is the spacecraft's perigee after its separation maneuver. We follow the section's statement for the two craft together.",
  },
};

/** Where the stage was when station keeping began (the spacecraft's position, 70 feet away). */
const STATION_KEEPING_PLACE = {
  latitude: cite(
    26.06,
    maneuverState('Station-keeping initiate', '3-13', 'ignition', 'Geodetic latitude, deg'),
  ),
  longitude: cite(
    171.29,
    maneuverState('Station-keeping initiate', '3-13', 'ignition', 'Longitude, deg'),
  ),
};

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: 'apollo-7',

  // The sky is fit at lift-off and at landing, which span every
  // Earth-relative fix in the plan.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(
        75.5010383,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1968-10-11 15:02:45.36',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        187.731131,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1968-10-11 15:02:45.36',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        198.3549468,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1968-10-11 15:02:45.36',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(
        216.832136,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1968-10-22 11:11:48',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        14.776336,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1968-10-22 11:11:48',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        209.1159747,
        horizons("Sun (10) from Earth's center", 'ObsEcLon', '1968-10-22 11:11:48', SUN_FROM_EARTH),
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
          end: INSERTION,
          site: PAD_34,
          // The orbit itself takes over in the last 30 seconds before
          // insertion, so the S-IVB cutoff row is listed but not drawn
          // through. The maximum dynamic pressure row is left out: the
          // mission report's Table 2-I times it three seconds later.
          track: [
            ascentPoint('Mach 1 achieved', '000:01:02.15', 4.12, 28.3649, -80.5477),
            ascentPoint('S-IB outboard engine cutoff', '000:02:24.32', 32.678, 28.5252, -79.9765),
            ascentPoint('S-IB/S-IVB separation', '000:02:25.59', 33.389, 28.531, -79.9558),
            ascentPoint('S-IVB engine cutoff', '000:10:16.76', 123.167, 31.3633, -61.9777),
          ],
        },
        {
          kind: 'orbit',
          label: 'In orbit on the S-IVB',
          body: 'earth',
          start: INSERTION,
          end: SEPARATION,
          ...INSERTION_ORBIT,
          sense: PROGRADE,
          startFix: {
            latitude: cite(31.4091, ascentTable('Earth orbit insertion')),
            latitudeKind: 'geocentric',
            longitude: {
              ...cite(-61.2293, ascentTable('Earth orbit insertion')),
              discrepancy:
                'Table 3-II of the mission report (page 3-9) prints 61.98 degrees west at insertion, the same as at S-IVB cutoff 10 seconds earlier, which a craft moving 25,553 feet per second cannot be; its other insertion values agree with these. We follow Apollo by the Numbers here.',
            },
            altitude: cite(123.177, ascentTable('Earth orbit insertion')),
            speed: cite(25_553.2, ascentTable('Earth orbit insertion')),
            flightPathAngle: cite(0.005, ascentTable('Earth orbit insertion')),
            heading: cite(86.32, ascentTable('Earth orbit insertion')),
          },
          // The S-IVB's liquid oxygen dump raised the apogee.
          sizes: [
            {
              time: SAFING_START,
              apoapsis: cite(153.7, elements('S-IVB venting', 'before', 'Apogee, n. mi.')),
              periapsis: cite(123.3, elements('S-IVB venting', 'before', 'Perigee, n. mi.')),
            },
            { time: SAFING_END, ...VENTED_ORBIT },
          ],
        },
        {
          kind: 'station',
          label: 'Beside the spent stage',
          start: SEPARATION,
          end: PHASING_1,
          target: 's-ivb',
        },
        {
          kind: 'burn',
          label: 'First phasing maneuver',
          body: 'earth',
          start: PHASING_1,
          end: PHASING_1_END,
          deltaV: cite(
            5.7,
            earthOrbitTable('1st rendezvous phasing cutoff'),
            report(
              'Table 3-IV, "Rendezvous Maneuvers" (page 3-18, PDF page 51), first phasing, resultant velocity change',
            ),
          ),
        },
        {
          kind: 'orbit',
          label: 'Moving ahead of the stage',
          body: 'earth',
          start: PHASING_1_END,
          end: SPS_1,
          apoapsis: cite(165.2, elements('First rendezvous phasing', 'after', 'Apogee, n. mi.')),
          periapsis: cite(124.8, elements('First rendezvous phasing', 'after', 'Perigee, n. mi.')),
          inclination: cite(
            31.62,
            elements('First rendezvous phasing', 'after', 'Inclination, deg'),
          ),
          sense: PROGRADE,
          // The second phasing maneuver (7.0 feet per second) is a step in
          // size. No end fix: Table 3-III prints the first service propulsion
          // ignition at 107.7 degrees east, east of its own cutoff (107.5)
          // although the craft was heading east, so we do not pin the path
          // to it.
          sizes: [
            {
              time: PHASING_2,
              apoapsis: cite(
                165.1,
                elements('Second rendezvous phasing', 'before', 'Apogee, n. mi.'),
              ),
              periapsis: cite(
                124.7,
                elements('Second rendezvous phasing', 'before', 'Perigee, n. mi.'),
              ),
            },
            {
              time: PHASING_2_END,
              apoapsis: cite(
                164.7,
                elements('Second rendezvous phasing', 'after', 'Apogee, n. mi.'),
              ),
              periapsis: cite(
                120.8,
                elements('Second rendezvous phasing', 'after', 'Perigee, n. mi.'),
              ),
            },
            {
              time: SPS_1,
              apoapsis: cite(
                164.6,
                elements(
                  'Corrective combination (first service propulsion)',
                  'before',
                  'Apogee, n. mi.',
                ),
              ),
              periapsis: cite(
                120.6,
                elements(
                  'Corrective combination (first service propulsion)',
                  'before',
                  'Perigee, n. mi.',
                ),
              ),
            },
          ],
        },
        {
          kind: 'burn',
          label: 'First firing of the main engine',
          body: 'earth',
          start: SPS_1,
          end: SPS_1_END,
          deltaV: cite(
            204.1,
            report(
              'Table 3-V, "Service Propulsion Maneuvers" (page 3-19, PDF page 52), maneuver 1, actual total velocity, ft/sec',
            ),
            earthOrbitTable('1st SPS cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Corrective combination orbit',
          body: 'earth',
          start: SPS_1_END,
          end: SPS_2,
          apoapsis: cite(
            194.1,
            elements(
              'Corrective combination (first service propulsion)',
              'after',
              'Apogee, n. mi.',
            ),
          ),
          periapsis: cite(
            123.0,
            elements(
              'Corrective combination (first service propulsion)',
              'after',
              'Perigee, n. mi.',
            ),
          ),
          inclination: cite(
            31.62,
            elements(
              'Corrective combination (first service propulsion)',
              'after',
              'Inclination, deg',
            ),
          ),
          sense: PROGRADE,
          endFix: {
            latitude: cite(
              -22.41,
              maneuverState(
                'Second service propulsion maneuver',
                '3-12',
                'ignition',
                'Geodetic latitude, deg',
              ),
            ),
            longitude: cite(
              106.76,
              maneuverState(
                'Second service propulsion maneuver',
                '3-12',
                'ignition',
                'Longitude, deg',
              ),
            ),
          },
        },
        {
          kind: 'burn',
          label: 'Coelliptic maneuver',
          body: 'earth',
          start: SPS_2,
          end: SPS_2_END,
          deltaV: cite(
            173.8,
            report(
              'Table 3-V, "Service Propulsion Maneuvers" (page 3-19, PDF page 52), maneuver 2, actual total velocity, ft/sec',
            ),
            earthOrbitTable('2nd SPS cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Coelliptic orbit, below the stage',
          body: 'earth',
          start: SPS_2_END,
          end: TPI,
          apoapsis: cite(
            153.6,
            elements('Coelliptic (second service propulsion)', 'after', 'Apogee, n. mi.'),
          ),
          periapsis: cite(
            113.9,
            elements('Coelliptic (second service propulsion)', 'after', 'Perigee, n. mi.'),
          ),
          inclination: cite(
            31.63,
            elements('Coelliptic (second service propulsion)', 'after', 'Inclination, deg'),
          ),
          sense: PROGRADE,
          endFix: {
            latitude: cite(
              -31.14,
              maneuverState(
                'Terminal phase initiate',
                '3-13',
                'ignition',
                'Geodetic latitude, deg',
              ),
            ),
            longitude: cite(
              26.45,
              maneuverState('Terminal phase initiate', '3-13', 'ignition', 'Longitude, deg'),
            ),
          },
        },
        {
          kind: 'burn',
          label: 'Terminal phase initiation',
          body: 'earth',
          start: TPI,
          end: TPI_END,
          deltaV: cite(
            17.7,
            earthOrbitTable('Terminal phase initiation cutoff'),
            report(
              'Section 3.2.1, "Rendezvous Maneuvers" (page 3-3, PDF page 36): "a velocity change of 17.7 ft/sec"',
            ),
          ),
        },
        {
          kind: 'rendezvous',
          label: 'Closing in on the stage',
          body: 'earth',
          start: TPI_END,
          end: STATION_KEEPING,
          target: 's-ivb',
          apoapsis: cite(154.1, elements('Terminal phase initiate', 'after', 'Apogee, n. mi.')),
          periapsis: cite(121.6, elements('Terminal phase initiate', 'after', 'Perigee, n. mi.')),
          sense: PROGRADE,
        },
        {
          kind: 'station',
          label: 'Beside the stage again',
          start: STATION_KEEPING,
          end: SEPARATION_BURN,
          target: 's-ivb',
          // 70 feet, in nautical miles (our conversion).
          range: cite(
            0.0115,
            report(
              'Section 2.0, "Mission Description" (page 2-1, PDF page 27): "final closure to within 70 feet of the S-IVB at approximately 30 hours"',
            ),
          ),
        },
        {
          kind: 'burn',
          label: 'Separation maneuver',
          body: 'earth',
          start: SEPARATION_BURN,
          end: SEPARATION_BURN_END,
          deltaV: cite(
            2.0,
            earthOrbitTable('Separation cutoff'),
            report(
              'Section 2.0, "Mission Description" (page 2-1, PDF page 27): "a 2 ft/sec posigrade maneuver with the reaction control system"',
            ),
          ),
        },
        {
          kind: 'orbit',
          label: 'Testing in orbit',
          body: 'earth',
          start: SEPARATION_BURN_END,
          end: SPS_5,
          apoapsis: cite(161.0, elements('Separation', 'after', 'Apogee, n. mi.')),
          periapsis: cite(122.2, elements('Separation', 'after', 'Perigee, n. mi.')),
          inclination: cite(31.61, elements('Separation', 'after', 'Inclination, deg')),
          sense: PROGRADE,
          // Drag between the published sizes; the third and fourth firings
          // are steps.
          sizes: [
            { time: SPS_3, ...size('Third service propulsion', 'before', 159.4, 121.3) },
            { time: SPS_3_END, ...size('Third service propulsion', 'after', 159.7, 89.5) },
            { time: SPS_4, ...size('Fourth service propulsion', 'before', 149.4, 87.5) },
            { time: SPS_4_END, ...size('Fourth service propulsion', 'after', 156.7, 89.1) },
            { time: SPS_5, ...size('Fifth service propulsion', 'before', 146.5, 87.1) },
          ],
          endFix: {
            latitude: cite(
              28.56,
              maneuverState(
                'Fifth service propulsion maneuver',
                '3-15',
                'ignition',
                'Geodetic latitude, deg',
              ),
            ),
            longitude: cite(
              -91.12,
              maneuverState(
                'Fifth service propulsion maneuver',
                '3-15',
                'ignition',
                'Longitude, deg',
              ),
            ),
          },
        },
        {
          kind: 'burn',
          label: 'Fifth main-engine firing, the largest',
          body: 'earth',
          start: SPS_5,
          end: SPS_5_END,
          deltaV: cite(
            1_691.3,
            report(
              'Table 3-V, "Service Propulsion Maneuvers" (page 3-19, PDF page 52), maneuver 5, actual total velocity, ft/sec',
            ),
            earthOrbitTable('5th SPS cutoff'),
          ),
        },
        {
          kind: 'orbit',
          label: 'Lined up for the trip home',
          body: 'earth',
          start: SPS_5_END,
          end: DEORBIT,
          ...size('Fifth service propulsion', 'after', 244.2, 89.1),
          inclination: cite(
            30.08,
            elements('Fifth service propulsion', 'after', 'Inclination, deg'),
          ),
          sense: PROGRADE,
          startFix: fifthCutoff(),
          // Drag between the published sizes; the sixth and seventh firings
          // are steps.
          sizes: [
            { time: SPS_6, ...size('Sixth service propulsion', 'before', 234.8, 88.5) },
            { time: SPS_6_END, ...size('Sixth service propulsion', 'after', 234.6, 88.4) },
            { time: SPS_7, ...size('Seventh service propulsion', 'before', 228.3, 88.4) },
            { time: SPS_7_END, ...size('Seventh service propulsion', 'after', 229.8, 88.5) },
            { time: DEORBIT, ...size('Eighth service propulsion', 'before', 225.3, 88.2) },
          ],
        },
        {
          kind: 'burn',
          label: 'Deorbit firing',
          body: 'earth',
          start: DEORBIT,
          end: DEORBIT_END,
          deltaV: cite(
            343.6,
            report(
              'Table 3-V, "Service Propulsion Maneuvers" (page 3-19, PDF page 52), maneuver 8, actual total velocity, ft/sec',
            ),
            earthOrbitTable('8th SPS cutoff'),
          ),
        },
        {
          kind: 'coast',
          label: 'Falling toward the atmosphere',
          body: 'earth',
          start: DEORBIT_END,
          end: ENTRY_INTERFACE,
          sense: cite('prograde', entryState('Space-fixed heading angle, deg E of N')),
          // The state at 400,000 feet. The fall from the deorbit firing is
          // the Kepler path through it, run back in time.
          endFix: {
            latitude: {
              ...cite(29.92, entryState('Geodetic latitude, deg North')),
              discrepancy:
                "Apollo by the Numbers' Entry, Splashdown, and Recovery table prints the entry point as latitude -29.92 and longitude 92.62 east: the report's figures with the opposite signs. We follow the mission report.",
            },
            longitude: cite(-92.62, entryState('Longitude, deg West (printed 92.62 west)')),
            altitude: cite(65.79, entryState('Altitude, n. mi.')),
            speed: cite(25_846, entryState('Space-fixed velocity, ft/sec')),
            flightPathAngle: cite(
              -2.072,
              report(
                'Section 5.16.1 (page 5-99, PDF page 168): at the entry interface, "The computer-calculated values were 25 846.4 ft/sec and minus 2.072 degrees for velocity and flight-path angle"',
              ),
              {
                source: 'apollo-by-the-numbers',
                locator:
                  'Entry, Splashdown, and Recovery table, Apollo 7 column, Earth Entry "Flight Path Angle" row (-2.0720)',
                url: `${ABN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`,
              },
            ),
            heading: cite(87.47, entryState('Space-fixed heading angle, deg E of N')),
          },
        },
        {
          kind: 'entry',
          label: 'Entry and splashdown',
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: DROGUE,
          splashdown: SPLASHDOWN,
        },
      ],
    },
    {
      id: 's-ivb',
      name: 'Spent S-IVB stage',
      role: 'target',
      phases: [
        {
          kind: 'docked',
          label: 'Carrying the spacecraft',
          start: LIFTOFF,
          end: SEPARATION,
          target: 'csm',
        },
        {
          kind: 'orbit',
          label: 'Left in orbit',
          body: 'earth',
          start: SEPARATION,
          end: STATION_KEEPING,
          ...VENTED_ORBIT,
          inclination: cite(
            31.58,
            elements('Spacecraft/S-IVB separation', 'before', 'Inclination, deg'),
          ),
          sense: PROGRADE,
          // Its orbit "decayed more rapidly than expected" (section 3.2.1);
          // only its size and place at station keeping are published.
          sizes: [{ time: STATION_KEEPING, ...STATION_KEEPING_ORBIT }],
          endFix: STATION_KEEPING_PLACE,
        },
        {
          kind: 'orbit',
          label: 'Target for station keeping',
          body: 'earth',
          start: STATION_KEEPING,
          end: SEPARATION_BURN_END,
          ...STATION_KEEPING_ORBIT,
          sense: PROGRADE,
        },
      ],
    },
  ],
};

/** One row of the Apollo 7 ascent table (geocentric latitude). */
function ascentPoint(
  row: string,
  elapsed: ElapsedTime,
  altitude: number,
  latitude: number,
  longitude: number,
): StateFix {
  return {
    time: at(elapsed, ascentTable(row)),
    altitude: cite(altitude, ascentTable(row)),
    latitude: cite(latitude, ascentTable(row)),
    latitudeKind: 'geocentric',
    longitude: cite(longitude, ascentTable(row)),
  };
}

/** An orbit size from Table 2-II, which Apollo by the Numbers' Earth Orbit Phase table repeats. */
function size(
  maneuver: keyof typeof TABLE_2_II_PAGES,
  when: 'before' | 'after',
  apoapsis: number,
  periapsis: number,
) {
  return {
    apoapsis: cite(apoapsis, elements(maneuver, when, 'Apogee, n. mi.')),
    periapsis: cite(periapsis, elements(maneuver, when, 'Perigee, n. mi.')),
  };
}

/** The state at the fifth service propulsion cutoff (Table 3-III, page 3-15). */
function fifthCutoff(): StateFix {
  const row = (name: string): Citation =>
    maneuverState('Fifth service propulsion maneuver', '3-15', 'cutoff', name);
  return {
    latitude: cite(29.41, row('Geodetic latitude, deg')),
    longitude: cite(-86.24, row('Longitude, deg')),
    altitude: cite(115.24, row('Altitude, n. mi.')),
    speed: cite(25_714.9, row('Space-fixed velocity, ft/sec'), earthOrbitTable('5th SPS cutoff')),
    flightPathAngle: cite(-0.912, row('Space-fixed flight-path angle, deg')),
    heading: cite(82.7, row('Space-fixed heading angle, deg E of N')),
  };
}
