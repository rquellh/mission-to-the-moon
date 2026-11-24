import type { FlightPlan, StateFix } from '../../../sim/types.ts';
/**
 * The Gemini X flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Three ships: the crew's spacecraft ("gemini", the main ship); its own
 * Gemini Agena Target Vehicle ("agena"), launched the same day, which the
 * crew docked with and whose engines then moved the docked pair; and the
 * Agena left in orbit by Gemini VIII in March 1966 ("agena-8"), a passive
 * target the crew flew beside on the third day.
 *
 * Sources:
 * - Gemini Program Mission Report, Gemini X (MSC-G-R-66-7, August 1966),
 *   NASA's copy on the Technical Reports Server: the sequences of events
 *   (Tables 4-I to 4-III), launch and insertion conditions (Tables 4-V and
 *   4-IX), the orbits before and after every maneuver (Table 4-VII), the
 *   maneuvers and their burn times (Table 4-VIII), the Agena's orbits
 *   (Table 4-XII), the docking (section 5.4.5.2.1), retrofire (Table
 *   5.1.5-XII), the 400,000-foot level (section 5.1.5.2.5), the drogue
 *   parachute (section 5.1.11), the old Agena's orbit (section 6.1), the
 *   landing point and the recovery (section 6.3.2). Page numbers are the
 *   report's printed pages, then the PDF's pages.
 * - The Gemini VIII mission report, for the two launch pads (see below), the
 *   old Agena's direction of travel, and the length of a Gemini retrofire.
 * - Gemini X PAO Mission Commentary Transcript: the burn time Houston read
 *   up for the orbit-shaping maneuver on the third day.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini X's ground elapsed time, as the report prints
 * it: zero at the spacecraft's lift-off, 22:20:26.648 G.m.t. on July 18,
 * 1966 (Table 4-I). The Agena was launched first, at 20:39:46.131 G.m.t.
 * (Table 4-III). Its times on this clock are negative: the report prints
 * them in seconds from the Agena's own lift-off, and we subtract 6040.517
 * seconds. That number is our arithmetic, 22:20:26.648 minus 20:39:46.131 =
 * 1:40:40.517, and agrees with the report's own "One hour, 40 minutes, and
 * 40.517 seconds after the GAATV lift-off" (section 4.1).
 *
 * Other arithmetic of ours, from printed values:
 * - Times the report prints in seconds from lift-off are written as
 *   hours:minutes:seconds.
 * - Each maneuver ends at its printed start plus its printed burn time
 *   (Table 4-VIII, "Delta t"). For two of them, plane change and the first
 *   terminal phase initiation, the table says its time includes zeroing
 *   the onboard velocity display; we use it as printed.
 * - 40,000 feet is 6.58 nautical miles (1 foot = 0.3048 m, 1 nautical mile
 *   = 1852 m).
 * - The landing point is printed in degrees and minutes; we write it in
 *   decimal degrees.
 * - The universal times sent to Horizons are lift-off plus the mission
 *   clock times of the sky samples.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The launch pads: Launch Complex 19 and Launch Complex 14 are placed
 *   where the Gemini VIII plan places them (its estimates from that
 *   flight's report; see missions/gemini-8/flight.ts). Both flights used
 *   these pads.
 * - The climbs to orbit between the pads and the published points, each
 *   burn (a smooth blend from one orbit to the next), both closing-ins after
 *   terminal phase initiation (the midcourse corrections and the braking are
 *   not drawn one by one), and the entry (a smooth ground track to the
 *   landing point and a smooth descent to the drogue parachute height).
 * - Orbits are Kepler ellipses turned slowly by Earth's bulge (J2); air drag
 *   is left out. The report gives its orbit heights above an oblate Earth;
 *   the model measures them from Earth's equatorial radius, which can draw
 *   an apogee or perigee a few nautical miles off, depending on latitude.
 * - Burns not drawn: the insertion velocity adjustment (26 ft/sec, made
 *   just after separation; the insertion orbit drawn is the one after it),
 *   the two plane changes (10.5 and 16.0 ft/sec, tiny tilts that left the
 *   orbit's size unchanged), the two separations (2.0 and about 1.5
 *   ft/sec). Three small trims, the docked Agena's two small-engine phase
 *   adjustments and the spacecraft's corrective combination and coelliptic
 *   maneuvers, are drawn as quick changes of the orbit's size (`sizes`),
 *   each lasting its printed burn time.
 * - The second terminal phase initiation (22.3 ft/sec) is drawn the same
 *   way, as a size step at the end of the orbit before it, not as a burn
 *   phase. The only published distance between the spacecraft and the old
 *   Agena is the range at that moment (14.2 nautical miles), and the engine
 *   can place a target already in orbit (startRelative) only at a moment
 *   inside one of the other ship's orbit phases; a burn phase starting at
 *   that moment would not qualify.
 * - The old Agena is drawn from the start of the chase on (undocking), on
 *   the spacecraft's orbit after the braking that ended in station keeping
 *   (216.0 by 213.5 nautical miles, Table 4-VII; see AGENA_8_ORBIT_NOTE),
 *   placed so it is 14.2 nautical miles ahead of the spacecraft at terminal
 *   phase initiation. It is drawn at its orbit's low point then (an illustration
 *   of the engine's); its orbit plane is the spacecraft's.
 * - The orbit-shaping (true anomaly adjust) burn: the report prints its time
 *   and size but not its length. It is drawn lasting the burn time Houston
 *   read up to the crew, 1 minute 57 seconds (a planned value).
 * - Retrofire: the report prints the start but not how long the four
 *   retrorockets fired. The burn is drawn lasting 22.3 seconds, the time
 *   Gemini VIII's four retrorockets took from the first ignition to the
 *   last burnout (an illustration from the same kind of spacecraft).
 * - While station keeping, the spacecraft is drawn at the target's position
 *   (the scene draws the two a little apart). While docked, the pair follows
 *   the Agena's orbit.
 * - After undocking, the Gemini X Agena keeps its last docked orbit to the
 *   end of this flight. Table 4-XII prints 209.2 by 205.9 nautical miles
 *   for it before the second rendezvous but no time, so that is not drawn;
 *   its maneuvers after the crew landed came after the end of the path.
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until it was resting in its cradle aboard the ship (71:41); the hoist
 *   after hook-on (71:38) and its drift are not drawn.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = 'https://ntrs.nasa.gov/api/citations/19750067644/downloads/19750067644.pdf';
const GEMINI_8_REPORT =
  'https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf';
const PAO_TRANSCRIPT = 'https://www.nasa.gov/wp-content/uploads/2026/01/gt10-pao.pdf';
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES =
  '&TLIST_TYPE=%27CAL%27&TLIST=%271966-07-18%2020:39:46.131%27,%271966-07-18%2022:20:26.648%27,%271966-07-20%2021:47:10.648%27,%271966-07-21%2021:07:05.648%27';
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

function report(locator: string): Citation {
  return { source: 'gemini-10-mission-report', locator, url: MISSION_REPORT };
}

function gemini8(locator: string): Citation {
  return { source: 'gemini-8-mission-report', locator, url: GEMINI_8_REPORT };
}

/** Table 4-I, the launch phase, "Actual" column (seconds from lift-off). */
const launchEvents = (row: string): Citation =>
  report(
    `Table 4-I, "Sequence of Events for Gemini Space Vehicle Launch Phase" (page 4-12, PDF page 91), "${row}" row, actual time`,
  );
/** Table 4-II, the orbital and reentry phases, "Actual" column. */
const events = (row: string): Citation =>
  report(
    `Table 4-II, "Sequence of Events for Gemini Spacecraft Orbital and Reentry Phases" (page 4-13, PDF page 92), "${row}" row, actual ground elapsed time`,
  );
/** Table 4-III, the Agena's launch phase, "Actual" column (seconds from the Agena's lift-off). */
const agenaEvents = (row: string): Citation =>
  report(
    `Table 4-III, "Sequence of Events for GAATV Launch Phase" (page 4-14, PDF page 93), "${row}" row, actual time from lift-off`,
  );
/** Table 4-V, Gemini launch conditions, "Actual, Final" column. */
const trajectory = (condition: string, row: string): Citation =>
  report(
    `Table 4-V, "Planned and Actual Gemini Launch Vehicle and Spacecraft Trajectory Parameters" (page 4-16, PDF page 95), ${condition}, "${row}" row, actual final column`,
  );
/** Table 4-VII, spacecraft orbits before and after each maneuver, "Actual" columns. */
const ORBIT_TABLE_PAGES = {
  '4-20': 'page 4-20, PDF page 99',
  '4-21': 'page 4-21, PDF page 100',
  '4-22': 'page 4-22, PDF page 101',
} as const;
const orbitAround = (
  page: keyof typeof ORBIT_TABLE_PAGES,
  maneuver: string,
  when: 'before' | 'after',
  row: string,
): Citation =>
  report(
    `Table 4-VII, "Spacecraft Orbital Elements Before and After Maneuvers" (${ORBIT_TABLE_PAGES[page]}), maneuver ${maneuver}, ${when} maneuver, "${row}" row, actual column`,
  );
/** Table 4-VIII, the rendezvous maneuvers, "Actual" column. */
const maneuver = (name: string, row: string, page: string): Citation =>
  report(`Table 4-VIII, "Rendezvous Maneuvers" (${page}), ${name}, "${row}" row, actual column`);
/** Table 4-IX, the Atlas-Agena's launch conditions, "Actual, Final" column. */
const agenaTrajectory = (condition: string, row: string, page: string): Citation =>
  report(
    `Table 4-IX, "Planned and Actual TLV and GATV Trajectory Parameters" (${page}), ${condition}, "${row}" row, actual final column`,
  );
/** Table 4-XII, the Gemini X Agena's orbits, "Actual" column. */
const agenaElements = (revolution: string, row: string): Citation =>
  report(
    `Table 4-XII, "Comparison of Gemini X GATV Orbital Elements" (page 4-34, PDF page 113), revolution ${revolution}, "${row}" row, actual column`,
  );
const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: 'jpl-horizons',
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY('301', '500@399', '31');
const EARTH_FROM_MOON = HORIZONS_QUERY('399', '500@301', '14');
const SUN_FROM_EARTH = HORIZONS_QUERY('10', '500@399', '31');

/* ------------------------------------------------------------------ */
/* The two clocks.                                                     */
/* ------------------------------------------------------------------ */

/**
 * How long before Gemini X the Agena lifted off, seconds: 22:20:26.648
 * minus 20:39:46.131 G.m.t. (our subtraction; see the header).
 */
const AGENA_LEAD: Cited<number> = cite(
  6040.517,
  report(
    'Section 4.1, "Actual Mission" (page 4-1, PDF page 80): the GAATV lifted off "on July 18, 1966, at 20:39:46.131 G.m.t."; "One hour, 40 minutes, and 40.517 seconds after the GAATV lift-off, the Gemini Space Vehicle was launched"',
  ),
  agenaEvents('Lift-off (20:39:46.131 G.m.t.)'),
  launchEvents('Lift-off (pad disconnect separation) (22:20:26.648 G.m.t.)'),
);

/** Seconds on the mission clock as "hhh:mm:ss.sss" (negative before lift-off). */
function clockTime(seconds: number): ElapsedTime {
  const sign = seconds < 0 ? '-' : '';
  const total = Math.round(Math.abs(seconds) * 1000) / 1000;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total - hours * 3600) / 60);
  const rest = (total - hours * 3600 - minutes * 60).toFixed(3).replace(/\.?0+$/, '');
  const [whole = '0', fraction] = rest.split('.');
  const secondsText = whole.padStart(2, '0') + (fraction ? `.${fraction}` : '');
  return `${sign}${String(hours).padStart(3, '0')}:${String(minutes).padStart(2, '0')}:${secondsText}` as ElapsedTime;
}

function toSeconds(elapsed: ElapsedTime): number {
  const [h = '0', m = '0', s = '0'] = elapsed.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** A time the report prints in seconds from the Agena's lift-off, on Gemini X's clock. */
function agenaClock(secondsFromAgenaLiftoff: number, citation: Citation): Cited<ElapsedTime> {
  return {
    value: clockTime(secondsFromAgenaLiftoff - AGENA_LEAD.value),
    citations: [citation, ...AGENA_LEAD.citations],
  };
}

/** A time the report prints in seconds from Gemini X's lift-off. */
function fromLiftoff(seconds: number, citation: Citation): Cited<ElapsedTime> {
  return { value: clockTime(seconds), citations: [citation] };
}

/** A maneuver's end: its printed start plus its printed burn time (our sum). */
function plus(
  start: ElapsedTime,
  seconds: number,
  citation: Citation,
  ...more: Citation[]
): Cited<ElapsedTime> {
  return { value: clockTime(toSeconds(start) + seconds), citations: [citation, ...more] };
}

/** Degrees and minutes as printed, in decimal degrees. */
function degrees(whole: number, minutes: number): number {
  return whole + minutes / 60;
}

/* ------------------------------------------------------------------ */
/* Times on Gemini X's clock.                                          */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  '000:00:00',
  launchEvents('Lift-off (pad disconnect separation) (22:20:26.648 G.m.t.)'),
);
const INSERTION = fromLiftoff(
  371.44,
  trajectory('spacecraft separation', 'Time from lift-off, sec'),
);

/* The first rendezvous, with the Gemini X Agena (Table 4-VIII, pages 4-23 to 4-25). */
const NC1 = at('002:18:11', events('M=4 rendezvous: Phase adjust maneuver'));
const NC1_END = plus(
  '002:18:11',
  75.0,
  maneuver(
    'phase adjust (NC1), first rendezvous',
    'Delta t, sec (75.0)',
    'page 4-23, PDF page 102',
  ),
);
const NSR = at('003:47:36', events('M=4 rendezvous: Coelliptic maneuver'));
const NSR_END = plus(
  '003:47:36',
  65.0,
  maneuver('coelliptic (NSR), first rendezvous', 'Delta t, sec (65.0)', 'page 4-23, PDF page 102'),
);
const TPI = at('004:33:44', events('M=4 rendezvous: Terminal phase initiate maneuver'));
const TPI_END = plus(
  '004:33:44',
  55.0,
  maneuver(
    'terminal phase initiate (TPI), first rendezvous (footnote a: "the amount of time that was taken to perform the maneuver which includes the zeroing of the IVI")',
    'Delta t, sec (55.0)',
    'page 4-24, PDF page 103',
  ),
);
/** Station keeping began (given to the minute; seconds written as 00). */
const STATION_KEEPING: Cited<ElapsedTime> = {
  ...at(
    '005:15:00',
    report(
      'Section 4.3.1.2.1, "First rendezvous" (page 4-7, PDF page 86): "At 5 hours 15 minutes g.e.t, the spacecraft was less than 200 feet from the Gemini X GATV, and the crew was station keeping." (given to the minute; seconds written as 00)',
    ),
  ),
  discrepancy:
    'Section 1.0 of the report (page 1-2, PDF page 36) and the Gemini chronology say the rendezvous was completed at 5 hours 23 minutes. We follow section 4.3.1.2.1, which ties the time to the start of station keeping.',
};
const DOCKING: Cited<ElapsedTime> = {
  ...at(
    '005:52:37.1',
    report(
      'Section 5.4.5.2.1, "Docking" (page 5-146, PDF page 298): "Docking occurred at 5:52:37.1 g.e.t."',
    ),
  ),
  discrepancy:
    'Section 5.4.1.4 (page 5-141, PDF page 293) gives docking as 5 hours 53 minutes, and section 1.0 (page 1-2, PDF page 36) as about 30 minutes after a rendezvous at 5 hours 23 minutes. We follow section 5.4.5.2.1, which gives it to a tenth of a second.',
};

/* The docked maneuvers, made with the Agena's engines (Table 4-VIII, pages 4-25 and 4-26). */
const NCH1 = at(
  '007:38:34',
  events('Second rendezvous: Phase adjust maneuver (07:38:34)'),
  report(
    'Table 4-IV, "Sequence of Events for GATV Orbital Phase" (page 4-15, PDF page 94), "Phase adjust maneuver" row, actual time',
  ),
);
const NCH1_END = plus(
  '007:38:34',
  80.0,
  maneuver(
    'phase adjust (NCH1), second rendezvous',
    'Delta t, sec (80.0)',
    'page 4-25, PDF page 104',
  ),
);
const NCH2 = at('020:20:12', events('Second rendezvous: Height adjust maneuver'));
const NCH2_END = plus(
  '020:20:12',
  78.0,
  maneuver(
    'height adjust (NCH2), second rendezvous',
    'Delta t, sec (78.0)',
    'page 4-25, PDF page 104',
  ),
);
const NSR_DOCKED = at('022:37:06', events('Second rendezvous: Coelliptic maneuver (22:37:06)'));
const NSR_DOCKED_END = plus(
  '022:37:06',
  70.0,
  maneuver('coelliptic (NSR), second rendezvous', 'Delta t, sec (70.0)', 'page 4-26, PDF page 105'),
);
const NC1_DOCKED = at('027:45:36', events('Second rendezvous: Phase adjust maneuver (27:45:36)'));
const NC1_DOCKED_END = plus(
  '027:45:36',
  10.0,
  maneuver(
    'phase adjust (NC1) at 27:45:36, second rendezvous',
    'Delta t, sec (10.0)',
    'page 4-26, PDF page 105',
  ),
);
const NC1_LAST = at('041:35:50', events('Second rendezvous: Phase adjust maneuver (41:35:50)'));
const NC1_LAST_END = plus(
  '041:35:50',
  4.0,
  maneuver(
    'phase adjust (NC1) at 41:35:50, second rendezvous',
    'Delta t, sec (4.0)',
    'page 4-26, PDF page 105',
  ),
);
const UNDOCKING = at(
  '044:40:16',
  events('Second rendezvous: Spacecraft separation and phase adjust maneuver'),
);

/* The second rendezvous, with the Gemini VIII Agena (Table 4-VIII, pages 4-27 and 4-28). */
const NCC = at('045:54:01', events('Second rendezvous: Corrective combination maneuver'));
const NCC_END = plus(
  '045:54:01',
  6.0,
  maneuver(
    'corrective combination (NCC), second rendezvous',
    'Delta t, sec (6.0)',
    'page 4-27, PDF page 106',
  ),
);
const NSR_2 = at('046:09:29', events('Second rendezvous: Coelliptic maneuver (46:09:29)'));
const NSR_2_END = plus(
  '046:09:29',
  15.0,
  maneuver(
    'coelliptic (NSR), second rendezvous, after separation',
    'Delta t, sec (15.0)',
    'page 4-27, PDF page 106',
  ),
);
const TPI_2 = at('047:26:44', events('Second rendezvous: Terminal phase initiate maneuver'));
const TPI_2_END = plus(
  '047:26:44',
  26.0,
  maneuver(
    'terminal phase initiate (TPI), second rendezvous',
    'Delta t, sec (26.0)',
    'page 4-28, PDF page 107',
  ),
);
const STATION_KEEPING_2: Cited<ElapsedTime> = {
  ...at(
    '047:59:22',
    report(
      'Section 4.3.1.2.2, "Second rendezvous" (page 4-9, PDF page 88): "almost continuous thrusts were applied until station keeping started at 47:59:22 g.e.t."',
    ),
  ),
  discrepancy:
    'Section 4.1 of the report (page 4-2, PDF page 81) says the crew was station keeping with the Gemini VIII GATV at 48 hours 3 minutes, and section 1.0 (page 1-3, PDF page 37) that the second rendezvous was completed at 48 hours. We follow section 4.3.1.2.2, which gives the time to the second.',
};
const SEPARATION_2 = at('051:16:00', events('Spacecraft separation maneuver'));
const TAA: Cited<ElapsedTime> = {
  ...at('051:38:52', events('True anomaly adjust maneuver')),
  discrepancy:
    "Section 1.0 (page 1-3, PDF page 37) and section 6.1 (page 6-13, PDF page 349) give 51:38:51, the planned time in Table 4-II, and Table 5.1.5-XII (page 5-48, PDF page 192) gives 51:38:51.8. We follow Table 4-II's actual time.",
};
const TAA_END = plus(
  '051:38:52',
  117,
  {
    source: 'gemini-10-pao-transcript',
    locator:
      'Mission commentary, July 20, 1966, 7:10, tape 182, page 3 (PDF page 411): Houston reads up "an orbit shaping maneuver, GET of 51:38:51, 100.0 feet per second, burn time one plus 57" (1 minute 57 seconds, a planned value; the mission report prints no burn time, so the drawn end is an illustration)',
    url: PAO_TRANSCRIPT,
  },
  events('True anomaly adjust maneuver'),
);
const RETROFIRE: Cited<ElapsedTime> = {
  ...at(
    '070:10:24.5',
    report(
      'Table 5.1.5-XII, "Translation Maneuvers - Concluded" (page 5-48, PDF page 192), "Retrofire" row, "Ground elapsed time, hr:min:sec" column',
    ),
  ),
  discrepancy:
    'Table 4-II gives retrofire initiation as 70:10:24, and sections 1.0 and 6.1.4 as 70:10:25. We follow the tenths of a second in Table 5.1.5-XII.',
};
/** Our illustration: the report prints no length for retrofire (see the header). */
const RETROFIRE_END = plus(
  '070:10:24.5',
  22.3,
  gemini8(
    'Table 5.1.8-V, "Retrograde Rocket System" (page 5-97): Gemini VIII\'s motor 1 ignited at 10:04:46.6 g.e.t. and motor 4, the last, at 10:05:03.3 with a web burn time of 5.6 seconds, 22.3 seconds in all (our arithmetic). The Gemini X report prints no retrofire length, so this length is an illustration.',
  ),
  RETROFIRE.citations[0],
);
const ENTRY_INTERFACE: Cited<ElapsedTime> = {
  ...at(
    '070:32:46.7',
    report(
      'Section 5.1.5.2.5, "Reentry phase" (page 5-28, PDF page 172): "At 70:32:46.7 g.e.t., the computer commanded a zero-degree bank angle. This indicated proper spacecraft navigation to the 400K-foot level"',
    ),
  ),
  discrepancy:
    "Table 5.1.5-XVII (page 5-53, PDF page 197) puts the 400K-foot point of the best estimated trajectory at 1325.7 seconds after retrofire, about 70:32:30. We follow the onboard computer's time in section 5.1.5.2.5, as the Gemini VIII plan does.",
};
const LANDING = at('070:46:39', events('Landing'));
/** The end of the path: the spacecraft resting aboard the recovery ship. */
const SPACECRAFT_ABOARD = at(
  '071:41:00',
  report(
    'Section 6.3.2, "Location and Retrieval" (pages 6-31 and 6-32, PDF pages 367 and 368), recovery events table, row 22:01 G.m.t. / 71:41 g.e.t. (given to the minute; seconds written as 00): "Spacecraft resting in cradle aboard U.S.S. Guadalcanal"',
  ),
);

/* Times on the Agena's own clock (seconds from its lift-off), moved onto Gemini X's. */
const AGENA_LIFTOFF: Cited<ElapsedTime> = {
  value: '-001:40:40.517',
  citations: AGENA_LEAD.citations,
};
const AGENA_INSERTION = agenaClock(
  558.27,
  agenaTrajectory('GATV insertion', 'Time from lift-off, sec', 'page 4-31, PDF page 110'),
);

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/*
 * The launch pads, as the Gemini VIII plan places them, with that plan's
 * citations: neither report prints where the pads are, so each is that
 * plan's estimate from the Gemini VIII report's first-stage cutoff point,
 * its range from the launch site, and the flight azimuth (see
 * missions/gemini-8/flight.ts). Gemini X used the same two pads.
 */
const PAD_ESTIMATE =
  'our estimate of where the pad is, not a printed value: the point from which a great circle at the flight azimuth reaches the BECO point after the BECO range';
const PAD_19_ESTIMATE: [Citation, ...Citation[]] = [
  report(
    'Section 1.0, "Mission Summary" (page 1-1, PDF page 35): "The Gemini Space Vehicle was launched from Complex 19, Cape Kennedy, Florida"',
  ),
  gemini8(`Section 1.0 (page 1-1): the spacecraft "was launched from Complex 19"; ${PAD_ESTIMATE}`),
  gemini8(
    'Table 4.3-I, "Comparison of Planned and Actual Gemini Space Vehicle Trajectory Parameters" (pages 4-22 and 4-23), BECO, "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.36 N, 79.61 W, 51.4)" row, actual final column',
  ),
  gemini8(
    'Section 4.1 (page 4-1): "the GLV was launched ... on a rendezvous launch azimuth of 99.9 degrees"',
  ),
];
const PAD_14_ESTIMATE: [Citation, ...Citation[]] = [
  report(
    'Section 1.0, "Mission Summary" (page 1-1, PDF page 35): "The Gemini Atlas-Agena Target Vehicle was launched from Complex 14, Cape Kennedy, Florida"',
  ),
  gemini8(
    `Section 1.0 (page 1-1): the target vehicle "was launched from Complex 14"; ${PAD_ESTIMATE}`,
  ),
  gemini8(
    'Table 4.3-V, "Comparison of Planned and Actual GAATV Trajectory Parameters" (pages 4-30 and 4-31), BECO, "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.55 N, 79.74 W, 43.3)" row, actual column',
  ),
  gemini8(
    'Section 4.1 (page 4-1): "the vehicle was rolled from a pad azimuth of 105 degrees to a flight azimuth of 84.36 degrees"',
  ),
];
const PAD_19 = {
  latitude: cite(28.51, ...PAD_19_ESTIMATE),
  longitude: cite(-80.57, ...PAD_19_ESTIMATE),
};
const PAD_14 = {
  latitude: cite(28.48, ...PAD_14_ESTIMATE),
  longitude: cite(-80.56, ...PAD_14_ESTIMATE),
};

/** Where the spacecraft came down, and floated until it was hoisted aboard the ship. */
const LANDING_POINT = report(
  'Section 6.3.2, "Location and Retrieval" (pages 6-30 and 6-31, PDF pages 366 and 367): "The spacecraft was landed at 21:07 G.m.t. on July 21, 1966, at 26 degrees 44.7 minutes north latitude and 71 degrees 57.0 minutes west longitude, 3.4 nautical miles from the aiming point"',
);
const SPLASHDOWN = {
  latitude: {
    ...cite(degrees(26, 44.7), LANDING_POINT),
    discrepancy:
      "Table 4-V (page 4-17, PDF page 96) gives the landing point from the recovery ship's determinations as 26 degrees 45 minutes north, 71 degrees 57 minutes west, the same point to the minute, and from the onboard guidance at drogue deployment as 26 degrees 42 minutes north, 72 degrees 02 minutes west. NASA's Gemini X page gives 26.74 N, 71.95 W. We follow section 6.3.2, which gives tenths of a minute. The report does not say whether this latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(-degrees(71, 57.0), LANDING_POINT),
};

/* ------------------------------------------------------------------ */
/* Shared values.                                                      */
/* ------------------------------------------------------------------ */

const PROGRADE_GEMINI: Cited<'prograde'> = cite(
  'prograde',
  trajectory('spacecraft separation', 'Space-fixed heading angle, deg east of north (101.73)'),
);
const PROGRADE_AGENA: Cited<'prograde'> = cite(
  'prograde',
  agenaTrajectory(
    'GATV insertion',
    'Space-fixed heading angle, deg east of north (94.91)',
    'page 4-31, PDF page 110',
  ),
);
const PROGRADE_AGENA_8: Cited<'prograde'> = cite(
  'prograde',
  gemini8(
    'Table 4.3-V, "Comparison of Planned and Actual GAATV Trajectory Parameters" (pages 4-30 and 4-31), Insertion, "Space-fixed heading angle, deg east of North" row, actual final column (95.27 degrees: the old Agena, Gemini VIII\'s target, was launched eastward)',
  ),
);

/**
 * Why the old Agena is drawn on the spacecraft's station-keeping orbit:
 * our reading, since no orbit of the old Agena is published for that time.
 */
const AGENA_8_ORBIT_NOTE =
  "No orbit of the old Agena is published for the time of the rendezvous. Section 6.1 (page 6-9, PDF page 345) gives the ground's first skin track of it during this flight, in revolution 8: 215.0 by 216.9 nautical miles. We draw it on the orbit Table 4-VII gives for the spacecraft after the braking that ended in station keeping, 216.0 by 213.5 nautical miles: the orbit the two shared while flying together (our reading), so the spacecraft leaves it smoothly.";

/** The Agena's last docked orbit, which it kept after the crew left (Table 4-VII). */
const AGENA_LAST_DOCKED = {
  apoapsis: cite(
    208.5,
    orbitAround(
      '4-21',
      '"Phase adjust (NC1) (docked)", the second (41:35:50)',
      'after',
      'Apogee, n. mi.',
    ),
  ),
  periapsis: cite(
    205.5,
    orbitAround(
      '4-21',
      '"Phase adjust (NC1) (docked)", the second (41:35:50)',
      'after',
      'Perigee, n. mi.',
    ),
  ),
};

/** The Agena's orbit from insertion to its first docked firing (Table 4-XII). */
const AGENA_INSERTION_ORBIT = {
  apoapsis: cite(162.0, agenaElements('1 (Insertion)', 'Apogee, n. mi.')),
  periapsis: cite(156.6, agenaElements('1 (Insertion)', 'Perigee, n. mi.')),
  inclination: cite(28.87, agenaElements('1 (Insertion)', 'Inclination, deg')),
  sense: PROGRADE_AGENA,
};

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: 'gemini-10',

  // Four samples: the Agena's lift-off, Gemini X's lift-off, the second
  // terminal phase initiation (the middle of the flight), and landing.
  sky: [
    {
      time: AGENA_LIFTOFF,
      moonEclipticLongitude: cite(
        125.0678688,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1966-07-18 20:39:46.131',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        242.541771,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1966-07-18 20:39:46.131',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        115.7537224,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1966-07-18 20:39:46.131',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(
        126.1066739,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1966-07-18 22:20:26.648',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        218.404255,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1966-07-18 22:20:26.648',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        115.8204711,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1966-07-18 22:20:26.648',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: TPI_2,
      moonEclipticLongitude: cite(
        155.5917662,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1966-07-20 21:47:10.648',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        254.24925,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1966-07-20 21:47:10.648',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        117.7080481,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1966-07-20 21:47:10.648',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(
        169.9621217,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1966-07-21 21:07:05.648',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        276.612654,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1966-07-21 21:07:05.648',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        118.6363908,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1966-07-21 21:07:05.648',
          SUN_FROM_EARTH,
        ),
      ),
    },
  ],

  ships: [
    {
      id: 'gemini',
      name: 'Gemini X spacecraft',
      role: 'main',
      phases: [
        {
          kind: 'ascent',
          label: 'Launch',
          body: 'earth',
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
          // The second-stage cutoff point (340.57 seconds; 86.8 nautical
          // miles up at 27.13 N, 71.94 W, Table 4-V) is left out: the orbit
          // takes over in the last 30 seconds before insertion, and a point
          // 30.87 seconds before it would put a kink in the drawn path.
          track: [geminiAscentPoint('BECO', 152.38, 34.0, 28.38, -79.65)],
        },
        {
          kind: 'orbit',
          label: 'First orbits',
          body: 'earth',
          start: INSERTION,
          end: NC1,
          apoapsis: cite(
            145.1,
            orbitAround(
              '4-20',
              '"First rendezvous, phase adjust (NC1)"',
              'before',
              'Apogee, n. mi.',
            ),
          ),
          periapsis: cite(
            86.3,
            orbitAround(
              '4-20',
              '"First rendezvous, phase adjust (NC1)"',
              'before',
              'Perigee, n. mi.',
            ),
          ),
          inclination: cite(
            28.87,
            orbitAround(
              '4-20',
              '"First rendezvous, phase adjust (NC1)"',
              'before',
              'Inclination, deg',
            ),
          ),
          sense: PROGRADE_GEMINI,
          startFix: {
            latitude: cite(
              26.72,
              trajectory('spacecraft separation', 'Geodetic latitude, deg north'),
            ),
            longitude: cite(
              -69.73,
              trajectory('spacecraft separation', 'Longitude, deg west (printed 69.73 west)'),
            ),
            altitude: cite(86.7, trajectory('spacecraft separation', 'Altitude, n. mi.')),
            speed: cite(
              25_712,
              trajectory('spacecraft separation', 'Space-fixed velocity, ft/sec'),
            ),
            flightPathAngle: cite(
              0.01,
              trajectory('spacecraft separation', 'Space-fixed flight-path angle, deg'),
            ),
            heading: cite(
              101.73,
              trajectory('spacecraft separation', 'Space-fixed heading angle, deg east of north'),
            ),
          },
        },
        {
          kind: 'burn',
          label: 'Phase adjustment',
          body: 'earth',
          start: NC1,
          end: NC1_END,
          deltaV: cite(
            55.8,
            maneuver(
              'phase adjust (NC1), first rendezvous',
              'Delta V, ft/sec',
              'page 4-23, PDF page 102',
            ),
          ),
        },
        {
          // The plane change at 02:30:49 (10.5 ft/sec) is not drawn: it
          // left the orbit's size unchanged (Table 4-VII).
          kind: 'orbit',
          label: 'Higher low point',
          body: 'earth',
          start: NC1_END,
          end: NSR,
          apoapsis: cite(
            144.5,
            orbitAround(
              '4-20',
              '"First rendezvous, phase adjust (NC1)"',
              'after',
              'Apogee, n. mi.',
            ),
          ),
          periapsis: cite(
            117.2,
            orbitAround(
              '4-20',
              '"First rendezvous, phase adjust (NC1)"',
              'after',
              'Perigee, n. mi.',
            ),
          ),
          inclination: cite(
            28.85,
            orbitAround(
              '4-20',
              '"Plane change (NPC)", first rendezvous',
              'after',
              'Inclination, deg',
            ),
          ),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'burn',
          label: 'Coelliptic maneuver',
          body: 'earth',
          start: NSR,
          end: NSR_END,
          deltaV: cite(
            47.5,
            maneuver(
              'coelliptic (NSR), first rendezvous',
              'Delta V, ft/sec',
              'page 4-23, PDF page 102',
            ),
          ),
        },
        {
          kind: 'orbit',
          label: 'Coelliptic orbit, below the Agena',
          body: 'earth',
          start: NSR_END,
          end: TPI,
          apoapsis: cite(
            145.8,
            orbitAround('4-20', '"Coelliptic (NSR)", first rendezvous', 'after', 'Apogee, n. mi.'),
          ),
          periapsis: cite(
            143.3,
            orbitAround('4-20', '"Coelliptic (NSR)", first rendezvous', 'after', 'Perigee, n. mi.'),
          ),
          inclination: cite(
            28.85,
            orbitAround(
              '4-20',
              '"Coelliptic (NSR)", first rendezvous',
              'after',
              'Inclination, deg',
            ),
          ),
          sense: PROGRADE_GEMINI,
          // Where the chase stood when the final approach began.
          endRange: {
            target: 'agena',
            range: cite(
              37,
              report(
                'Section 4.3.1.2.1, "First rendezvous" (page 4-6, PDF page 85): "The TPI maneuver was initiated at 4:33:44 g.e.t, when the elevation angle to the Gemini X GATV was approximately 26.0 degrees and the range was about 37 nautical miles."',
              ),
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
            42.3,
            maneuver(
              'terminal phase initiate (TPI), first rendezvous',
              'Delta V, ft/sec',
              'page 4-24, PDF page 103',
            ),
          ),
        },
        {
          kind: 'rendezvous',
          label: 'Closing in on the Agena',
          body: 'earth',
          start: TPI_END,
          end: STATION_KEEPING,
          target: 'agena',
          apoapsis: cite(
            160.6,
            orbitAround(
              '4-20',
              '"Terminal phase initiate (TPI)", first rendezvous',
              'after',
              'Apogee, n. mi.',
            ),
          ),
          periapsis: cite(
            143.3,
            orbitAround(
              '4-20',
              '"Terminal phase initiate (TPI)", first rendezvous',
              'after',
              'Perigee, n. mi.',
            ),
          ),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'station',
          label: 'Beside the Agena',
          start: STATION_KEEPING,
          end: DOCKING,
          target: 'agena',
        },
        {
          kind: 'docked',
          label: 'Docked with the Agena',
          start: DOCKING,
          end: UNDOCKING,
          target: 'agena',
        },
        {
          kind: 'orbit',
          label: 'Chasing the old Agena',
          body: 'earth',
          start: UNDOCKING,
          end: TPI_2_END,
          apoapsis: cite(
            208.2,
            orbitAround('4-21', '"Separation (NC1)"', 'after', 'Apogee, n. mi.'),
          ),
          periapsis: cite(
            205.4,
            orbitAround('4-21', '"Separation (NC1)"', 'after', 'Perigee, n. mi.'),
          ),
          inclination: cite(
            28.91,
            orbitAround('4-21', '"Separation (NC1)"', 'after', 'Inclination, deg'),
          ),
          sense: PROGRADE_GEMINI,
          from: 'agena',
          // Three small firings, each a quick step in the orbit's size (see
          // the header for why the last, terminal phase initiation, is drawn
          // this way).
          sizes: [
            {
              time: NCC,
              apoapsis: cite(
                208.2,
                orbitAround('4-21', '"Corrective combination (NCC)"', 'before', 'Apogee, n. mi.'),
              ),
              periapsis: cite(
                205.4,
                orbitAround('4-21', '"Corrective combination (NCC)"', 'before', 'Perigee, n. mi.'),
              ),
            },
            {
              time: NCC_END,
              apoapsis: cite(
                209.2,
                orbitAround('4-21', '"Corrective combination (NCC)"', 'after', 'Apogee, n. mi.'),
              ),
              periapsis: cite(
                205.9,
                orbitAround('4-21', '"Corrective combination (NCC)"', 'after', 'Perigee, n. mi.'),
              ),
            },
            {
              time: NSR_2,
              apoapsis: cite(
                209.2,
                orbitAround(
                  '4-21',
                  '"Coelliptic (NSR)", after separation',
                  'before',
                  'Apogee, n. mi.',
                ),
              ),
              periapsis: cite(
                205.9,
                orbitAround(
                  '4-21',
                  '"Coelliptic (NSR)", after separation',
                  'before',
                  'Perigee, n. mi.',
                ),
              ),
            },
            {
              time: NSR_2_END,
              apoapsis: cite(
                208.9,
                orbitAround(
                  '4-21',
                  '"Coelliptic (NSR)", after separation',
                  'after',
                  'Apogee, n. mi.',
                ),
              ),
              periapsis: cite(
                206.1,
                orbitAround(
                  '4-21',
                  '"Coelliptic (NSR)", after separation',
                  'after',
                  'Perigee, n. mi.',
                ),
              ),
            },
            {
              time: TPI_2,
              apoapsis: cite(
                208.9,
                orbitAround(
                  '4-22',
                  '"Terminal phase initiate (TPI)", second rendezvous',
                  'before',
                  'Apogee, n. mi.',
                ),
              ),
              periapsis: cite(
                206.1,
                orbitAround(
                  '4-22',
                  '"Terminal phase initiate (TPI)", second rendezvous',
                  'before',
                  'Perigee, n. mi.',
                ),
              ),
            },
            {
              time: TPI_2_END,
              apoapsis: cite(
                216.8,
                orbitAround(
                  '4-22',
                  '"Terminal phase initiate (TPI)", second rendezvous',
                  'after',
                  'Apogee, n. mi.',
                ),
              ),
              periapsis: cite(
                207.4,
                orbitAround(
                  '4-22',
                  '"Terminal phase initiate (TPI)", second rendezvous',
                  'after',
                  'Perigee, n. mi.',
                ),
              ),
            },
          ],
        },
        {
          kind: 'rendezvous',
          label: 'Closing in on the old Agena',
          body: 'earth',
          start: TPI_2_END,
          end: STATION_KEEPING_2,
          target: 'agena-8',
          apoapsis: cite(
            216.8,
            orbitAround(
              '4-22',
              '"Terminal phase initiate (TPI)", second rendezvous',
              'after',
              'Apogee, n. mi.',
            ),
          ),
          periapsis: cite(
            207.4,
            orbitAround(
              '4-22',
              '"Terminal phase initiate (TPI)", second rendezvous',
              'after',
              'Perigee, n. mi.',
            ),
          ),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'station',
          label: 'Beside the old Agena',
          start: STATION_KEEPING_2,
          end: SEPARATION_2,
          target: 'agena-8',
        },
        {
          kind: 'orbit',
          label: 'Moving away from the old Agena',
          body: 'earth',
          start: SEPARATION_2,
          end: TAA,
          apoapsis: cite(
            216.0,
            orbitAround(
              '4-22',
              '"After separation, true anomaly adjust"',
              'before',
              'Apogee, n. mi.',
            ),
          ),
          periapsis: cite(
            213.5,
            orbitAround(
              '4-22',
              '"After separation, true anomaly adjust"',
              'before',
              'Perigee, n. mi.',
            ),
          ),
          inclination: cite(
            28.91,
            orbitAround(
              '4-22',
              '"After separation, true anomaly adjust"',
              'before',
              'Inclination, deg',
            ),
          ),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'burn',
          label: 'Orbit shaping for reentry',
          body: 'earth',
          start: TAA,
          end: TAA_END,
          deltaV: cite(
            99.8,
            report(
              'Table 5.1.5-XII, "Translation Maneuvers - Concluded" (page 5-48, PDF page 192), "True anomaly adjust" row, "Delta V total, ft/sec" column',
            ),
          ),
        },
        {
          kind: 'orbit',
          label: 'Last orbits',
          body: 'earth',
          start: TAA_END,
          end: RETROFIRE,
          apoapsis: cite(
            215.5,
            orbitAround(
              '4-22',
              '"After separation, true anomaly adjust"',
              'after',
              'Apogee, n. mi.',
            ),
          ),
          periapsis: cite(
            157.9,
            orbitAround(
              '4-22',
              '"After separation, true anomaly adjust"',
              'after',
              'Perigee, n. mi.',
            ),
          ),
          inclination: cite(
            28.87,
            orbitAround(
              '4-22',
              '"After separation, true anomaly adjust"',
              'after',
              'Inclination, deg',
            ),
          ),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'burn',
          label: 'Retrofire',
          body: 'earth',
          start: RETROFIRE,
          end: RETROFIRE_END,
          deltaV: cite(
            325.5,
            report(
              'Table 5.1.5-XII, "Translation Maneuvers - Concluded" (page 5-48, PDF page 192), "Retrofire" row, "Delta V total, ft/sec" column',
            ),
          ),
        },
        {
          kind: 'coast',
          label: 'Falling toward the atmosphere',
          body: 'earth',
          start: RETROFIRE_END,
          end: ENTRY_INTERFACE,
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'entry',
          label: 'Entry and splashdown',
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: at('070:41:34', events('Drogue parachute deployment')),
          // 40,000 feet, in nautical miles (our conversion).
          drogueAltitude: {
            ...cite(
              6.58,
              report(
                'Section 5.1.11, "Landing System" (page 5-107, PDF page 259): "The drogue parachute was deployed at approximately 40 000 feet instead of the design altitude of 50 000 feet."',
              ),
            ),
            discrepancy:
              'The crew\'s report (section 7.1.1.8, page 7-10, PDF page 391) says the drogue "was accomplished at 38K feet instead of 50K feet". We follow the landing system analysis, section 5.1.11.',
          },
          splashdown: SPLASHDOWN,
        },
        {
          kind: 'surface',
          label: 'In the water until hoisted aboard',
          body: 'earth',
          start: LANDING,
          end: SPACECRAFT_ABOARD,
          site: SPLASHDOWN,
        },
      ],
    },
    {
      id: 'agena',
      name: 'Gemini X Agena Target Vehicle',
      role: 'target',
      phases: [
        {
          kind: 'ascent',
          label: 'Launch',
          body: 'earth',
          start: AGENA_LIFTOFF,
          end: AGENA_INSERTION,
          site: PAD_14,
          track: [
            agenaAscentPoint('BECO', 130.37, 32.6, 28.56, -79.75, 'page 4-30, PDF page 109'),
            agenaAscentPoint('SECO', 279.34, 108.4, 28.89, -74.64, 'page 4-30, PDF page 109'),
            agenaAscentPoint('VECO', 298.09, 117.5, 28.93, -73.74, 'page 4-30, PDF page 109'),
            agenaAscentPoint(
              'PPS start',
              370.37,
              144.1,
              29.01,
              -70.34,
              'pages 4-30 and 4-31, PDF pages 109 and 110',
            ),
          ],
        },
        {
          kind: 'orbit',
          label: 'Waiting for Gemini X',
          body: 'earth',
          start: AGENA_INSERTION,
          end: DOCKING,
          ...AGENA_INSERTION_ORBIT,
          startFix: {
            latitude: cite(
              28.61,
              agenaTrajectory(
                'GATV insertion',
                'Geodetic latitude, deg north',
                'page 4-31, PDF page 110',
              ),
            ),
            longitude: cite(
              -59.49,
              agenaTrajectory(
                'GATV insertion',
                'Longitude, deg west (printed 59.49 west)',
                'page 4-31, PDF page 110',
              ),
            ),
            altitude: cite(
              161.2,
              agenaTrajectory('GATV insertion', 'Altitude, n. mi.', 'page 4-31, PDF page 110'),
            ),
            speed: cite(
              25_366,
              agenaTrajectory(
                'GATV insertion',
                'Space-fixed velocity, ft/sec',
                'page 4-31, PDF page 110',
              ),
            ),
            flightPathAngle: cite(
              -0.03,
              agenaTrajectory(
                'GATV insertion',
                'Space-fixed flight-path angle, deg',
                'page 4-31, PDF page 110',
              ),
            ),
            heading: cite(
              94.91,
              agenaTrajectory(
                'GATV insertion',
                'Space-fixed heading angle, deg east of north',
                'page 4-31, PDF page 110',
              ),
            ),
          },
        },
        {
          kind: 'orbit',
          label: 'Docked with Gemini X',
          body: 'earth',
          start: DOCKING,
          end: NCH1,
          ...AGENA_INSERTION_ORBIT,
        },
        {
          kind: 'burn',
          label: 'Main engine: up to the record height',
          body: 'earth',
          start: NCH1,
          end: NCH1_END,
          deltaV: cite(
            423.6,
            maneuver(
              'phase adjust (NCH1), second rendezvous',
              'Delta V, ft/sec',
              'page 4-25, PDF page 104',
            ),
          ),
        },
        {
          kind: 'orbit',
          label: 'Record-high orbit, docked',
          body: 'earth',
          start: NCH1_END,
          end: NCH2,
          apoapsis: cite(
            412.2,
            orbitAround(
              '4-20',
              '"Second rendezvous, phase adjust (NCH1) (docked)"',
              'after',
              'Apogee, n. mi.',
            ),
          ),
          periapsis: cite(
            158.5,
            orbitAround(
              '4-20',
              '"Second rendezvous, phase adjust (NCH1) (docked)"',
              'after',
              'Perigee, n. mi.',
            ),
          ),
          inclination: cite(
            28.88,
            orbitAround(
              '4-20',
              '"Second rendezvous, phase adjust (NCH1) (docked)"',
              'after',
              'Inclination, deg',
            ),
          ),
          sense: PROGRADE_AGENA,
        },
        {
          kind: 'burn',
          label: 'Main engine: lowering the high point',
          body: 'earth',
          start: NCH2,
          end: NCH2_END,
          deltaV: cite(
            346.2,
            maneuver(
              'height adjust (NCH2), second rendezvous',
              'Delta V, ft/sec',
              'page 4-25, PDF page 104',
            ),
          ),
        },
        {
          kind: 'orbit',
          label: 'Lower orbit, docked',
          body: 'earth',
          start: NCH2_END,
          end: NSR_DOCKED,
          apoapsis: cite(
            205.8,
            orbitAround('4-20', '"Height adjust (NCH2) (docked)"', 'after', 'Apogee, n. mi.'),
          ),
          periapsis: cite(
            158.4,
            orbitAround('4-20', '"Height adjust (NCH2) (docked)"', 'after', 'Perigee, n. mi.'),
          ),
          inclination: cite(
            28.89,
            orbitAround('4-20', '"Height adjust (NCH2) (docked)"', 'after', 'Inclination, deg'),
          ),
          sense: PROGRADE_AGENA,
        },
        {
          kind: 'burn',
          label: 'Main engine: rounding out the orbit',
          body: 'earth',
          start: NSR_DOCKED,
          end: NSR_DOCKED_END,
          deltaV: cite(
            82.2,
            maneuver(
              'coelliptic (NSR), second rendezvous',
              'Delta V, ft/sec',
              'page 4-26, PDF page 105',
            ),
          ),
        },
        {
          kind: 'orbit',
          label: 'Below the old Agena, docked',
          body: 'earth',
          start: NSR_DOCKED_END,
          end: UNDOCKING,
          apoapsis: cite(
            208.7,
            orbitAround('4-21', '"Coelliptic (NSR) (docked)"', 'after', 'Apogee, n. mi.'),
          ),
          periapsis: cite(
            203.9,
            orbitAround('4-21', '"Coelliptic (NSR) (docked)"', 'after', 'Perigee, n. mi.'),
          ),
          inclination: cite(
            28.88,
            orbitAround('4-21', '"Coelliptic (NSR) (docked)"', 'after', 'Inclination, deg'),
          ),
          sense: PROGRADE_AGENA,
          // The two small-engine phase adjustments, each a quick step. The
          // plane change between them (16.0 ft/sec) left the size unchanged
          // and is not drawn.
          sizes: [
            {
              time: NC1_DOCKED,
              apoapsis: cite(
                208.7,
                orbitAround(
                  '4-21',
                  '"Phase adjust (NC1) (docked)", the first (27:45:36)',
                  'before',
                  'Apogee, n. mi.',
                ),
              ),
              periapsis: cite(
                203.9,
                orbitAround(
                  '4-21',
                  '"Phase adjust (NC1) (docked)", the first (27:45:36)',
                  'before',
                  'Perigee, n. mi.',
                ),
              ),
            },
            {
              time: NC1_DOCKED_END,
              apoapsis: cite(
                209.9,
                orbitAround(
                  '4-21',
                  '"Phase adjust (NC1) (docked)", the first (27:45:36)',
                  'after',
                  'Apogee, n. mi.',
                ),
              ),
              periapsis: cite(
                205.0,
                orbitAround(
                  '4-21',
                  '"Phase adjust (NC1) (docked)", the first (27:45:36)',
                  'after',
                  'Perigee, n. mi.',
                ),
              ),
            },
            {
              time: NC1_LAST,
              apoapsis: cite(
                209.9,
                orbitAround(
                  '4-21',
                  '"Phase adjust (NC1) (docked)", the second (41:35:50)',
                  'before',
                  'Apogee, n. mi.',
                ),
              ),
              periapsis: cite(
                205.0,
                orbitAround(
                  '4-21',
                  '"Phase adjust (NC1) (docked)", the second (41:35:50)',
                  'before',
                  'Perigee, n. mi.',
                ),
              ),
            },
            {
              time: NC1_LAST_END,
              ...AGENA_LAST_DOCKED,
            },
          ],
        },
        {
          kind: 'orbit',
          label: 'Left in orbit',
          body: 'earth',
          start: UNDOCKING,
          end: SPACECRAFT_ABOARD,
          ...AGENA_LAST_DOCKED,
          sense: PROGRADE_AGENA,
        },
      ],
    },
    {
      id: 'agena-8',
      name: 'Gemini VIII Agena Target Vehicle',
      role: 'target',
      phases: [
        {
          kind: 'orbit',
          label: 'Waiting since March',
          body: 'earth',
          start: UNDOCKING,
          end: SPACECRAFT_ABOARD,
          // The orbit the spacecraft and the old Agena shared while flying
          // together (see AGENA_8_ORBIT_NOTE).
          apoapsis: {
            ...cite(
              216.0,
              orbitAround(
                '4-22',
                '"Terminal phase finalize (TPF)", second rendezvous',
                'after',
                'Apogee, n. mi.',
              ),
            ),
            discrepancy: AGENA_8_ORBIT_NOTE,
          },
          periapsis: {
            ...cite(
              213.5,
              orbitAround(
                '4-22',
                '"Terminal phase finalize (TPF)", second rendezvous',
                'after',
                'Perigee, n. mi.',
              ),
            ),
            discrepancy: AGENA_8_ORBIT_NOTE,
          },
          sense: PROGRADE_AGENA_8,
          // The only published distance between the two: the range when the
          // final approach began.
          startRelative: {
            ship: 'gemini',
            time: TPI_2,
            ahead: cite(
              14.2,
              report(
                'Section 4.3.1.2.2, "Second rendezvous" (page 4-9, PDF page 88): "TPI was applied at 47:26:44 g.e.t ... At TPI, the relative range between the spacecraft and the passive GATV was about 14.2 nautical miles and the elevation angle to the target was about 31 degrees."',
              ),
            ),
          },
        },
      ],
    },
  ],
};

/** A Gemini launch vehicle point from Table 4-V (geodetic latitude; longitude printed west). */
function geminiAscentPoint(
  condition: string,
  secondsFromLiftoff: number,
  altitude: number,
  latitude: number,
  longitude: number,
): StateFix {
  return {
    time: fromLiftoff(secondsFromLiftoff, trajectory(condition, 'Time from lift-off, sec')),
    altitude: cite(altitude, trajectory(condition, 'Altitude, n. mi.')),
    latitude: cite(latitude, trajectory(condition, 'Geodetic latitude, deg north')),
    longitude: cite(
      longitude,
      trajectory(condition, `Longitude, deg west (printed ${-longitude} west)`),
    ),
  };
}

/** An Atlas-Agena point from Table 4-IX (geodetic latitude; longitude printed west). */
function agenaAscentPoint(
  condition: string,
  secondsFromLiftoff: number,
  altitude: number,
  latitude: number,
  longitude: number,
  page: string,
): StateFix {
  return {
    time: agenaClock(
      secondsFromLiftoff,
      agenaTrajectory(condition, 'Time from lift-off, sec', page),
    ),
    altitude: cite(altitude, agenaTrajectory(condition, 'Altitude, n. mi.', page)),
    latitude: cite(latitude, agenaTrajectory(condition, 'Geodetic latitude, deg north', page)),
    longitude: cite(
      longitude,
      agenaTrajectory(condition, `Longitude, deg west (printed ${-longitude} west)`, page),
    ),
  };
}
