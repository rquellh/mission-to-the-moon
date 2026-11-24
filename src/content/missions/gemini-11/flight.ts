import type { FlightPlan } from '../../../sim/types.ts';
/**
 * The Gemini XI flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * Two ships: the crew's spacecraft ("gemini", the main ship) and its Gemini
 * Agena Target Vehicle ("agena", the target it met, docked with, and was
 * later tied to by a tether). Both were launched the same morning.
 *
 * NASA's mission report for this flight was not found. The sources, in the
 * order we follow them:
 * - The Gemini chronology (SP-4002): Appendix 1, Tables A (launch azimuth,
 *   the orbits at insertion and at retrofire, retrofire, touchdown, landing
 *   point, recovery) and B (the Agena's launch, the orbits around each
 *   activity, docking, the tethered operations); its September 12, 1966
 *   entry for the order of events.
 * - The Gemini XI voice transcript (air-to-ground and onboard), for moments
 *   by ground elapsed time as the crew and the ground spoke them (story.ts
 *   says how its speaker letters C and P are read).
 * - Summary of Rendezvous Operations (SP-138): terminal phase initiation and
 *   where the spacecraft stood then, and the later stable-orbit rendezvous.
 * - NASA's public affairs mission commentary: the Agena's climb to orbit and
 *   the Agena engine firings, as announced.
 * - NSSDCA's Master Catalog pages for Gemini 11 and its target: lift-off
 *   times in UT, insertion, and the length of each Agena engine firing.
 * - On the Shoulders of Titans (SP-4203): the start of the second chase.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini XI's ground elapsed time, zero at lift-off,
 * 14:42:26.546 UT on September 12, 1966 (NSSDCA; Appendix 1 of the
 * chronology prints 9:42:26 a.m. e.s.t.). The voice transcript's clock reads
 * the same: it logs "LIFT-OFF" at 00:00:00 and the ground's retrofire
 * countdown ending at 70:41:37, a second after the 70:41:36 that Table A
 * lists. The Agena lifted off at 8:05:01.725 a.m. e.s.t. (Table B), 13:05:01.725
 * UT (NSSDCA); on the mission clock that is -1:37:24.821, our subtraction.
 *
 * Arithmetic of ours, from printed values:
 * - Times printed in Eastern Standard Time are converted to UT (plus 5
 *   hours) and to the mission clock (minus 9:42:26.546 a.m. on September 12),
 *   then written to the unit the source gives: a time printed to the second
 *   is written to the nearest second, one printed to the minute to the
 *   nearest minute.
 * - The range at terminal phase initiation is the straight line across the
 *   10 nautical miles below and 15 behind that SP-138 prints: 18.
 * - The end of the tethered operations is Table B's start (49:55:00) plus
 *   its period (3:03:00): 52:58:00.
 * - Kilometers are converted at 1 nautical mile = 1.852 km. The landing
 *   latitude is printed in degrees, minutes and seconds; we write it in
 *   decimal degrees.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The launch pads: Launch Complex 19 and Launch Complex 14 are placed
 *   where the Gemini VIII plan places them (its estimates from that flight's
 *   report; see missions/gemini-8/flight.ts), since Gemini XI and its Agena
 *   flew from the same pads.
 * - The climbs to orbit (no ascent track was found), each burn (a smooth
 *   blend from one orbit to the next), and the entry (a smooth ground track
 *   to the landing point and a smooth descent). No insertion point is
 *   published. Gemini XI's orbit plane comes from its pad, its published
 *   inclination and its launch azimuth, with insertion an illustrative
 *   distance downrange. The Agena is placed by the published distance it was
 *   from Gemini XI at that insertion, ahead of it (our reading) in Gemini
 *   XI's plane: Gemini XI was launched
 *   when its pad passed under the Agena's orbit, so the two shared one plane.
 *   Placed from its own pad and azimuth instead, the Agena's orbit would be
 *   drawn 2.4 degrees out of Gemini XI's plane, because the steering on its
 *   climb to orbit is not drawn. Its climb is drawn from its pad to that
 *   place, and it is drawn at its orbit's low point at Gemini XI's insertion.
 * - The final approach on the first orbit. No orbit for the approach and no
 *   burn length is published: terminal phase initiation is drawn from its
 *   start to the commentator's report that it had been made, and the rest of
 *   the approach (two corrections and braking) as one blend into the
 *   Agena's place, on the orbit Table B gives once the spacecraft had reached
 *   it. The 3-foot-per-second plane change at 0:29:16 is not drawn.
 * - The docked pair follows the Agena's orbit. The docking practice (the
 *   crew undocked and docked again several times on the first day) and the
 *   docked firing at about 4:30 that moved the pair into a new orbital
 *   plane (33 meters per second, On the Shoulders of Titans, page 360) are
 *   not drawn: the Agena keeps the orbit Table B gives after the rendezvous
 *   until the climb to the high orbit.
 * - Each Agena engine firing for the high orbit is drawn from the start of
 *   its firing sequence (the small thrusters that settle the propellants,
 *   then the main engine) to a moment the transcript shows it was over; the
 *   main engine itself ran for about 25 seconds the first time and 22.5 the
 *   second (NSSDCA).
 * - While tied by the tether, and while flying close by after letting it go,
 *   the spacecraft is drawn at the Agena's place (the scene draws the two a
 *   little apart, not 100 feet); the slow spin of the pair around each other
 *   is not drawn.
 * - After the separation burn at 53:24:56, the spacecraft is drawn on the
 *   Agena's own orbit, falling slowly behind it until it trails by the
 *   published 25 nautical miles when the second chase began. Really it
 *   dropped back to about that distance within one revolution and then held
 *   it; the small burns that set up that "stable orbit" are not drawn one by
 *   one. The second chase (a ground-computed burn, one correction, braking)
 *   is drawn as its first burn and then one blend into station keeping, on
 *   the orbit Table B gives after it.
 * - The departure from the Agena is drawn at 67:07:45, the first moment the
 *   transcript shows the separation burn had been made (its time was not
 *   logged), as the start of the orbit Table A gives at retrofire.
 * - Orbits are Kepler ellipses of the published size, going around in the
 *   period Appendix 1 publishes for each and turned slowly by Earth's bulge
 *   (J2); air drag is left out. Where the Agena was when it fired its engine
 *   42 hours after insertion is not published, so where the high orbit's top
 *   falls is an illustration (the crew reached it over Australia). The orbit
 *   before retrofire is pinned to end where the fall to the landing point
 *   begins, a correction of 0.48 percent of its rate, which draws the
 *   spacecraft about 550 km ahead of the Agena by retrofire; how far apart
 *   the two really were then is not published.
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until the Guam lifted it aboard.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const TRANSCRIPT = 'https://www.nasa.gov/wp-content/uploads/2026/01/gt11-tec.pdf';
const COMMENTARY = 'https://www.nasa.gov/wp-content/uploads/2026/01/gt11-pao.pdf';
const RENDEZVOUS_PAPER =
  'https://ntrs.nasa.gov/api/citations/19680005473/downloads/19680005473.pdf';
const CHRONOLOGY_1966 = 'https://www.nasa.gov/history/SP-4002/p3b.htm';
const CHRONOLOGY_TABLE_A = 'https://www.nasa.gov/history/SP-4002/app1a.htm';
const CHRONOLOGY_TABLE_B = 'https://www.nasa.gov/history/SP-4002/app1b.htm';
const NMC_GEMINI = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-081A';
const NMC_AGENA = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-080A';
const GEMINI_8_REPORT =
  'https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf';
/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */
const HORIZONS_TIMES =
  '&TLIST_TYPE=%27CAL%27&TLIST=%271966-09-12%2013:05:01.725%27,%271966-09-12%2014:42:26.546%27,%271966-09-14%2007:14:18.546%27,%271966-09-15%2013:59:34.546%27';
const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${command}%27&CENTER=%27${center}%27&QUANTITIES=%27${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27${HORIZONS_TIMES}`;

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

/** The transcript's printed page: one less than the PDF page up to PDF page 20, the same from PDF page 21 on. */
function transcriptPage(pdfPage: number): string {
  return pdfPage <= 20
    ? `page ${pdfPage - 1}, PDF page ${pdfPage}`
    : `page ${pdfPage}, PDF page ${pdfPage}`;
}

/** A line of the Gemini XI voice transcript: its time as printed, the speaker, and the words. */
function voice(
  time: string,
  speaker: string,
  words: string,
  pdfPage: number,
  note?: string,
): Citation {
  return {
    source: 'gemini-11-voice-transcript',
    locator: `${time} g.e.t. (${transcriptPage(pdfPage)}), ${speaker}: "${words}"${note ? ` (${note})` : ''}`,
    url: TRANSCRIPT,
  };
}

/** A page of the public affairs mission commentary. */
function commentary(
  tape: number,
  page: number,
  pdfPage: number,
  quote: string,
  note?: string,
): Citation {
  return {
    source: 'gemini-11-mission-commentary',
    locator: `Tape ${tape}, page ${page} (PDF page ${pdfPage}): "${quote}"${note ? ` (${note})` : ''}`,
    url: COMMENTARY,
  };
}

/** The chronology's September 12, 1966 entry, on the Gemini XI mission. */
function chronology(quote: string, note?: string): Citation {
  return {
    source: 'gemini-chronology',
    locator: `Part III (B), September 12, 1966: "${quote}"${note ? ` (${note})` : ''}`,
    url: CHRONOLOGY_1966,
  };
}

/** Appendix 1, Table A (General), Gemini XI column. */
function tableA(row: string): Citation {
  return {
    source: 'gemini-chronology',
    locator: `Appendix 1, Table A (General), Gemini XI column: ${row}`,
    url: CHRONOLOGY_TABLE_A,
  };
}

/** Appendix 1, Table B (Orbital Operations), Gemini XI rows. */
function tableB(row: string): Citation {
  return {
    source: 'gemini-chronology',
    locator: `Appendix 1, Table B (Orbital Operations), Gemini XI: ${row}`,
    url: CHRONOLOGY_TABLE_B,
  };
}

/** An NSSDCA Master Catalog page: Gemini 11 or its Agena target. */
function nmc(page: 'gemini' | 'agena', section: string): Citation {
  return page === 'gemini'
    ? {
        source: 'nssdca-master-catalog',
        locator: `"Gemini 11" (1966-081A), ${section}`,
        url: NMC_GEMINI,
      }
    : {
        source: 'nssdca-master-catalog',
        locator: `"Gemini 11 Target" (1966-080A), ${section}`,
        url: NMC_AGENA,
      };
}

/** Summary of Rendezvous Operations, in the Gemini Summary Conference (SP-138). */
function rendezvousPaper(locator: string): Citation {
  return { source: 'gemini-rendezvous-summary', locator, url: RENDEZVOUS_PAPER };
}

const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({
  source: 'jpl-horizons',
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url,
});
const MOON_FROM_EARTH = HORIZONS_QUERY('301', '500@399', '31');
const EARTH_FROM_MOON = HORIZONS_QUERY('399', '500@301', '14');
const SUN_FROM_EARTH = HORIZONS_QUERY('10', '500@399', '31');

/** Degrees, minutes and seconds as printed, in decimal degrees. */
function degrees(whole: number, minutes: number, seconds = 0): number {
  return whole + minutes / 60 + seconds / 3600;
}

/* ------------------------------------------------------------------ */
/* Times on the mission clock.                                         */
/* ------------------------------------------------------------------ */

const LIFTOFF = at(
  '000:00:00',
  nmc(
    'gemini',
    'Mission Profile: "launched on 12 September 1966 at 9:42:26 a.m. EST (14:42:26.546 UT)"',
  ),
  tableA('"Launch date" and "Time (e.s.t.)" rows: Sept. 12, 1966, 9:42:26 a.m.'),
  voice('00:00:00', 'the capsule communicator', 'LIFT-OFF.', 2),
);

const INSERTION: Cited<ElapsedTime> = {
  ...at(
    '000:06:01',
    nmc(
      'gemini',
      'Mission Profile: "inserted into a 160.5 x 279.1 km Earth orbit at 9:48:28" (EST; on the mission clock 6 minutes 1.454 seconds, written to the second: our arithmetic)',
    ),
    voice(
      '00:05:58',
      'the capsule communicator',
      "Gemini XI, you're GO for M equals 1.",
      6,
      'On the Shoulders of Titans, page 358, says this call "came at booster separation"',
    ),
  ),
  discrepancy:
    'Figure 2-7 of SP-138\'s Summary of Rendezvous Operations marks spacecraft insertion at 00:06:40. In the voice transcript the command pilot reads out the insertion velocity correction "after Separation" at 00:06:29 and starts that burn at 00:06:38, so 00:06:40 fits the correction burn rather than separation. We follow NSSDCA.',
};

/** Terminal phase initiation on the first orbit. */
const TPI = at(
  '000:49:43',
  rendezvousPaper(
    'Figures 2-7, "Relative trajectory. Gemini XI mission," and 2-8, "Relative trajectory, terminal phase. Gemini XI mission" (page 11, PDF page 5): "Terminal-phase initiation 90 seconds before apogee ... g.e.t. = 00:49:43"',
  ),
  commentary(
    52,
    1,
    113,
    'The next burn was the terminal phase initiation maneuver at 49 minutes 43 seconds.',
  ),
);

/** Terminal phase initiation was over by then. */
const TPI_DONE = at(
  '000:52:00',
  commentary(
    51,
    1,
    109,
    'This is Gemini Control 52 minutes into the flight. Gemini 11 has just performed the terminal phase maneuver over Carnarvon',
    'given to the minute; seconds written as 00',
  ),
);

/** The spacecraft reached the Agena. */
const RENDEZVOUS = at(
  '001:25:00',
  chronology(
    'Five maneuvers completed the spacecraft/GATV rendezvous at 1 hour 25 minutes ground elapsed time, and the two vehicles docked nine minutes later.',
    'given to the minute; seconds written as 00',
  ),
  nmc('gemini', 'Mission Profile: rendezvous "at 11:07 a.m. (1:25 Ground Elapsed Time, GET)"'),
);

const DOCKING = at(
  '001:34:16',
  tableB('"Docking" row, revolution 1, Ground Elapsed Time "To begin": 1:34:16'),
  voice('01:34:17', 'the command pilot', 'We are docked.', 25),
);

const UNDOCKING: Cited<ElapsedTime> = {
  ...at(
    '049:50:46',
    voice(
      '49:50:46',
      'the command pilot',
      "Roger, Hawaii. This is Gemini XI, and we've undocked from the Agena",
      188,
      'the first call of the Hawaii pass; the crew had undocked by then',
    ),
    commentary(
      194,
      1,
      466,
      'This is Gemini Control, 49 hours 49 minutes into the flight. We are 25 seconds away from Hawaii acquisition',
    ),
  ),
  discrepancy:
    'Appendix 1, Table B of the chronology gives the tethered operations as beginning at 49:55:00 (and the docked period as 48:20:44, which ends then). The voice transcript has the crew reporting that they had already undocked at 49:50:46, and the mission commentary had said at 49:47 that the flight plan called for undocking 20 seconds before reaching Hawaii. We follow the transcript.',
};

const TETHER_RELEASE = at(
  '052:58:00',
  tableB(
    '"Tethered operations" row, Ground Elapsed Time "To begin" 49:55:00 and "Period" 3:03:00 (the end, 52:58:00, is our sum)',
  ),
  chronology(
    'At about 53 hours into the mission, the crew released the tether, separated from the GATV',
  ),
  voice(
    '53:03:57',
    'the pilot',
    "We Just got loose from the Agena. It's got a 100-foot tether flying all over the place, but we're riding the platform, Stationkeeping.",
    231,
  ),
);

/** The separation burn after the tether exercise, set up for the stable-orbit rendezvous. */
const SEPARATION = at(
  '053:24:56',
  voice(
    '53:02:52',
    'the capsule communicator',
    'Okay. GET B: 53:24:56; Delta-V, 8.8; ... thrusters, forward; maneuver is Posigrade up.',
    231,
    'the time of the burn read up to the crew',
  ),
  voice('53:24:54', 'the command pilot', 'Stand by.', 241),
);

/** The first burn of the second chase. */
const CATCHUP = at('065:27:00', {
  source: 'on-the-shoulders-of-titans',
  locator:
    'Chapter XV, "The Final Curtain", page 369 (PDF page 390): "At 65:27 hours of flight time, Conrad tilted the spacecraft nose 53 degrees above level flight and fired the forward thrusters." (given to the minute; seconds written as 00)',
});

/** That burn was over by then. */
const CATCHUP_DONE = at(
  '065:32:24',
  voice(
    '65:32:24',
    'the capsule communicator',
    'How did the burn go?',
    315,
    'the first call after the burn; it was over by then',
  ),
);

/** Station keeping beside the Agena again. */
const REREND = at(
  '066:40:43',
  voice('66:40:43', 'the command pilot', "Okay. We're Stationkeeping.", 323),
  chronology('A rerendezvous was accomplished at 66 hours 40 minutes ground elapsed time'),
);

/** The spacecraft is drawn leaving the Agena when the transcript first shows the separation burn had been made. */
const FAREWELL: Cited<ElapsedTime> = {
  ...at(
    '067:07:45',
    voice(
      '67:07:45',
      'the Carnarvon capsule communicator',
      'Roger. How did your SEP burn go?',
      325,
      "the crew's 3-foot-per-second separation burn had been made by then",
    ),
    voice(
      '66:41:45',
      'the capsule communicator',
      "And then all you have to do is a 3-feet-per-second Retrograde burn any time before Carnarvon, which we're showing coming up at 67:10 about.",
      324,
    ),
    commentary(
      236,
      1,
      601,
      'Gemini Control - Houston, 67 hours, 07 minutes into the flight ... Pete Conrad has advised he has completed his separation burn from the Agena',
    ),
  ),
  discrepancy:
    'On the Shoulders of Titans (page 369) says the crew broke away twelve minutes after reporting station keeping, which would be about 66:53. Asked at 67:07, the crew said they had not written the time down. We draw the departure at 67:07:45, by which time it had been made.',
};

const RETROFIRE: Cited<ElapsedTime> = {
  ...at(
    '070:41:36',
    tableA('"G.E.T. to retrofire (hr; min; sec)" row: 70:41:36'),
    commentary(252, 1, 630, 'That time is 70 hours 41 minutes 36 seconds elapsed time.'),
    nmc(
      'gemini',
      'Mission Profile: "Retrofire occurred at the end of the 44th revolution at 8:24:03 a.m. EST on 15 September"',
    ),
  ),
  discrepancy:
    'The voice transcript logs the ground\'s countdown ending in "Retrofire!" at 70:41:37. We follow Table A.',
};

/** Retrofire is drawn until the pilot read off the velocity it had taken off. */
const RETRO_READOUT = at(
  '070:42:03',
  voice('70:42:03', 'the pilot', 'Retrofire 303 aft, 2 right, 118 down.', 342),
);

const LANDING = at(
  '071:17:08',
  tableA('"G.E.T. to touchdown (hr; min; sec)" row: 71:17:08'),
  nmc('gemini', 'Mission Profile: "Total mission elapsed time was 71:17:08"'),
);

/** The end of the path: the Guam lifted the spacecraft aboard. */
const ABOARD = at(
  '072:16:00',
  tableA(
    'Recovery, "Time (e.s.t.)", Spacecraft row: 9:58 a.m. (given to the minute; on the mission clock 72:15:33, written to the nearest minute: our arithmetic)',
  ),
  nmc('gemini', 'Mission Profile: "the spacecraft was recovered at 9:58 a.m."'),
);

/* The Agena's times. */

const AGENA_LIFTOFF = at(
  '-001:37:24.821',
  tableB('Gemini XI row, Launch "Time (e.s.t.)": 8:05:01.725 a.m., Sept. 12, 1966'),
  nmc(
    'agena',
    'Description: "launched from Cape Canaveral at 8:05:01 a.m. EST (13:05:01.725 UT) on 12 September 1966"',
  ),
  nmc(
    'gemini',
    'Mission Profile: Gemini 11 "launched ... at 9:42:26 a.m. EST (14:42:26.546 UT)" (the difference, 1 hour 37 minutes 24.821 seconds, is our subtraction)',
  ),
);

const AGENA_INSERTION = at(
  '-001:29:47',
  commentary(
    31,
    1,
    78,
    'Still looking good, 7 minutes, 38 seconds approaching 20,000 feet per second velocity ... Coming up on the cutoff now... Mark PPS cutoff.',
    "7 minutes 38 seconds after the Agena's lift-off, the commentator's last time call before he marked its engine cutoff a few seconds later; on the mission clock -1:29:46.821, written to the second: our arithmetic",
  ),
);

/** The climb to the high orbit: the firing sequence began with the Agena's small ullage thrusters. */
const HIGH_BURN: Cited<ElapsedTime> = {
  ...at(
    '040:30:20',
    commentary(
      157,
      1,
      369,
      'We have SPS initiate. We have an ullage burn starting - it started at about 40:30:20, 40 hours 30 minutes 20 seconds.',
    ),
    nmc(
      'gemini',
      'Mission Profile: "the Agena primary propulsion system was fired for 25 seconds at 2:12:41 a.m. EST on 14 September" (40:30:14 on the mission clock: our arithmetic)',
    ),
    chronology(
      'At 40 hours 30 minutes after liftoff, the GATV primary propulsion system (PPS) was fired to raise the apogee of the docked vehicles to 741 nautical miles for two revolutions.',
    ),
  ),
  discrepancy:
    'The mission commentary says the firing sequence began with "some 68 seconds" of the small thrusters settling the propellants and that the main engine started a few seconds after 40:31:20; NSSDCA\'s 2:12:41 a.m. EST (40:30:14) and the chronology\'s 40 hours 30 minutes fit the start of the sequence. We draw the burn over the whole sequence.',
};

const HIGH_BURN_END: Cited<ElapsedTime> = {
  ...at(
    '040:31:52',
    voice('40:31:52', 'the Canary Islands capsule communicator', 'Cut-off.', 126),
    commentary(
      157,
      1,
      369,
      'We have a PPS start. Pete Conrad said "It\'s going, it\'s really going." Looking good. We have a cut-off.',
    ),
  ),
  discrepancy:
    "NSSDCA gives the main engine's firing as 25 seconds; On the Shoulders of Titans (page 363) and NASA's 55-years article give 26 seconds.",
};

/** The climb back down: the firing sequence, then the main engine. */
const LOW_BURN = at(
  '043:53:15',
  voice(
    '43:53:15',
    'the capsule communicator',
    'We show your 16 pounders going.',
    142,
    "the Agena's small thrusters, which settle the propellants before its main engine fires",
  ),
  commentary(
    173,
    1,
    407,
    'Burn was initiated, the sequence has been initiated. 16 pounders initiated.',
  ),
  chronology(
    'The PPS was fired again, 3 hours 23 minutes later, to reduce apogee to 164 nautical miles.',
  ),
);

const LOW_BURN_END: Cited<ElapsedTime> = {
  ...at(
    '043:54:32',
    voice('43:54:32', 'the pilot', 'Good burn ?', 142, 'the burn was over by then'),
    nmc('gemini', 'Mission Profile: "After two orbits the Agena was fired again for 22.5 seconds"'),
  ),
  discrepancy:
    "On the Shoulders of Titans (page 365) gives the main engine's firing as 23 seconds; NSSDCA gives 22.5.",
};

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/*
 * The two pads, as the Gemini VIII plan places them, with that plan's
 * citations: the Gemini VIII report does not print where the pads are
 * either, so each is that plan's estimate from the report's first-stage
 * cutoff point, its range from the launch site, and the flight azimuth (see
 * missions/gemini-8/flight.ts).
 */
const GEMINI_8_PAD_NOTE =
  'our estimate of where it is, not a printed value: the point from which a great circle at the flight azimuth reaches the BECO point after the BECO range';

const PAD_19_ESTIMATE: [Citation, ...Citation[]] = [
  chronology(
    'The Gemini space vehicle, carrying command pilot Astronaut Charles Conrad, Jr., and pilot Astronaut Richard F. Gordon, Jr., was launched from complex 19 at 9:42 a.m.',
  ),
  {
    source: 'gemini-8-mission-report',
    locator: `Section 1.0 (page 1-1): the spacecraft "was launched from Complex 19"; ${GEMINI_8_PAD_NOTE}`,
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

const PAD_14_ESTIMATE: [Citation, ...Citation[]] = [
  chronology(
    'The Gemini XI mission began with the launch of the Gemini Atlas-Agena target vehicle from complex 14 at 8:05 a.m., e.s.t.',
  ),
  {
    source: 'gemini-8-mission-report',
    locator: `Section 1.0 (page 1-1): the target vehicle "was launched from Complex 14"; ${GEMINI_8_PAD_NOTE}`,
    url: GEMINI_8_REPORT,
  },
  {
    source: 'gemini-8-mission-report',
    locator:
      'Table 4.3-V, "Comparison of Planned and Actual GAATV Trajectory Parameters" (pages 4-30 and 4-31), BECO, "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.55 N, 79.74 W, 43.3)" row, actual column',
    url: GEMINI_8_REPORT,
  },
  {
    source: 'gemini-8-mission-report',
    locator:
      'Section 4.1 (page 4-1): "the vehicle was rolled from a pad azimuth of 105 degrees to a flight azimuth of 84.36 degrees"',
    url: GEMINI_8_REPORT,
  },
];

/** Launch Complex 19 (the Gemini VIII plan's estimate). */
const PAD_19 = {
  latitude: cite(28.51, ...PAD_19_ESTIMATE),
  longitude: cite(-80.57, ...PAD_19_ESTIMATE),
};

/** Launch Complex 14 (the Gemini VIII plan's estimate). */
const PAD_14 = {
  latitude: cite(28.48, ...PAD_14_ESTIMATE),
  longitude: cite(-80.56, ...PAD_14_ESTIMATE),
};

/** Where the spacecraft came down, and floated until the Guam lifted it aboard. */
const SPLASHDOWN = {
  latitude: {
    ...cite(degrees(24, 15, 4), tableA('Landing coordinates, "Lat" row: 24°15\'04" N')),
    discrepancy:
      "NSSDCA and NASA's Gemini XI page give 24.25 N, 70.00 W, which agrees to within a few hundredths of a degree. The source does not say whether this latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(
    -70,
    tableA('Landing coordinates, "Long" row: 70° W (printed to the whole degree)'),
    nmc('gemini', 'Mission Profile: "Splashdown in the western Atlantic at 24.25 N, 70.00 W"'),
  ),
};

/* ------------------------------------------------------------------ */
/* Orbits.                                                             */
/* ------------------------------------------------------------------ */

const PROGRADE_GEMINI: Cited<'prograde'> = cite(
  'prograde',
  tableA('"Launch azimuth" row: 99.9° (east of north, so eastward: our reading)'),
);
const PROGRADE_AGENA: Cited<'prograde'> = cite(
  'prograde',
  tableB('Gemini XI row, Launch "Azimuth (deg.)": 83.32 (east of north, so eastward: our reading)'),
);

/** The Agena's orbit until the climb to the high orbit (Table B lists it after the rendezvous). */
const AGENA_FIRST_ORBIT = {
  apoapsis: cite(
    163.1,
    tableB(
      '"Rendezvous at first apogee" row (revolution 1), Orbital Parameters After Activity, "Apogee (n.m.)": 163.1',
    ),
  ),
  periapsis: cite(
    153.7,
    tableB(
      '"Rendezvous at first apogee" row (revolution 1), Orbital Parameters After Activity, "Perigee (n.m.)": 153.7',
    ),
  ),
  inclination: cite(
    28.85,
    tableB(
      '"Rendezvous at first apogee" row (revolution 1), Orbital Parameters After Activity, "Inclination angle (deg.)": 28.85',
    ),
  ),
  period: cite(
    90.55,
    tableB(
      '"Rendezvous at first apogee" row (revolution 1), Orbital Parameters After Activity, "Period (min.)": 90.55',
    ),
  ),
  sense: PROGRADE_AGENA,
};

/** The record orbit, with Gemini XI docked. */
const HIGH_ORBIT = {
  apoapsis: {
    ...cite(
      739.2,
      tableB(
        '"High-altitude excursion" row (revolution 26), Spacecraft Orbital Parameters, "Apogee (n.m.)": 739.2',
      ),
      tableA('At retrofire, "Highest apogee (n.m.)" row: 739.2'),
    ),
    discrepancy:
      "The chronology's September 12 entry gives 741 nautical miles; NSSDCA gives 1,374.1 km and NASA's Gemini XI page 1,374 km (742 nautical miles, our conversion); in the voice transcript the ground gives the orbit as \"156 by 742\" at 41:05:16; NASA's 55-years article gives 853 miles. We follow Appendix 1, Tables A and B.",
  },
  periapsis: cite(
    156.3,
    tableB(
      '"High-altitude excursion" row (revolution 26), Spacecraft Orbital Parameters, "Perigee (n.m.)": 156.3',
    ),
  ),
  inclination: cite(
    28.85,
    tableB(
      '"High-altitude excursion" row (revolution 26), Spacecraft Orbital Parameters, "Inclination angle (deg.)": 28.85',
    ),
  ),
  period: cite(
    101.52,
    tableB(
      '"High-altitude excursion" row (revolution 26), Spacecraft Orbital Parameters, "Period (min.)": 101.52',
    ),
  ),
  sense: PROGRADE_AGENA,
};

/** The Agena's orbit from the start of the tether exercise (Table B), which Gemini XI shared while trailing it. */
const AGENA_LAST_ORBIT = {
  apoapsis: {
    ...cite(
      164.0,
      tableB(
        '"Tethered operations" row (revolution 32), Spacecraft Orbital Parameters, "Apogee (n.m.)": 164.0',
      ),
    ),
    discrepancy:
      "NSSDCA gives the orbit right after the second firing as 287 x 304 km (155.0 x 164.1 nautical miles), and the Agena's orbit when the crew left it as 285 x 305 km. We follow Appendix 1, Table B.",
  },
  periapsis: cite(
    152.6,
    tableB(
      '"Tethered operations" row (revolution 32), Spacecraft Orbital Parameters, "Perigee (n.m.)": 152.6',
    ),
  ),
  inclination: cite(
    28.83,
    tableB(
      '"Tethered operations" row (revolution 32), Spacecraft Orbital Parameters, "Inclination angle (deg.)": 28.83',
    ),
  ),
  period: cite(
    90.45,
    tableB(
      '"Tethered operations" row (revolution 32), Spacecraft Orbital Parameters, "Period (min.)": 90.45',
    ),
  ),
  sense: PROGRADE_AGENA,
};

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: 'gemini-11',

  // Four samples across the three days: the Agena's lift-off, Gemini XI's
  // lift-off, the end of the climb to the high orbit, and landing.
  sky: [
    {
      time: AGENA_LIFTOFF,
      moonEclipticLongitude: cite(
        137.2195929,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1966-09-12 13:05:01.725',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        313.967461,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1966-09-12 13:05:01.725',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        169.3165068,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1966-09-12 13:05:01.725',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(
        138.2317438,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1966-09-12 14:42:26.546',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        290.568398,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1966-09-12 14:42:26.546',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        169.3823658,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1966-09-12 14:42:26.546',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: HIGH_BURN_END,
      moonEclipticLongitude: cite(
        163.869739,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1966-09-14 07:14:18.546',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        65.528772,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1966-09-14 07:14:18.546',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        171.0272792,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1966-09-14 07:14:18.546',
          SUN_FROM_EARTH,
        ),
      ),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(
        183.4565048,
        horizons(
          "Moon (301) from Earth's center",
          'ObsEcLon',
          '1966-09-15 13:59:34.546',
          MOON_FROM_EARTH,
        ),
      ),
      subLunarLongitude: cite(
        340.607226,
        horizons(
          "Earth (399) from the Moon's center",
          'ObsSub-LON',
          '1966-09-15 13:59:34.546',
          EARTH_FROM_MOON,
        ),
      ),
      sunEclipticLongitude: cite(
        172.2764026,
        horizons(
          "Sun (10) from Earth's center",
          'ObsEcLon',
          '1966-09-15 13:59:34.546',
          SUN_FROM_EARTH,
        ),
      ),
    },
  ],

  ships: [
    {
      id: 'gemini',
      name: 'Gemini XI spacecraft',
      role: 'main',
      phases: [
        {
          kind: 'ascent',
          label: 'Launch',
          body: 'earth',
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
          azimuth: cite(99.9, tableA('"Launch azimuth" row: 99.9°')),
        },
        {
          kind: 'orbit',
          label: 'First orbit, chasing the Agena',
          body: 'earth',
          start: INSERTION,
          end: TPI,
          apoapsis: cite(150.6, tableA('At insertion, "Apogee (n.m.)" row: 150.6')),
          periapsis: cite(86.6, tableA('At insertion, "Perigee (n.m.)" row: 86.6')),
          inclination: cite(28.85, tableA('At insertion, "Inclination angle" row: 28.85°')),
          period: cite(88.99, tableA('At insertion, "Period (min.)" row: 88.99')),
          sense: PROGRADE_GEMINI,
          // Where the chase stood when the final approach began.
          endRange: {
            target: 'agena',
            range: {
              ...cite(
                18,
                rendezvousPaper(
                  'Text, page 12 (PDF page 6): "Terminal-phase initiation occurred just prior to first spacecraft apogee with the spacecraft 10 nautical miles below and 15 nautical miles behind the target vehicle." (the straight line across, 18, is our arithmetic)',
                ),
                rendezvousPaper(
                  'Table 2-IV, "Rendezvous Propellant Usage" (page 18, PDF page 12), XI, M = 1, conditions at start of terminal phase: "Spacecraft at apogee of 87/151 orbit: Δh = 10 n. mi., ΔX = 15 n. mi."',
                ),
              ),
              discrepancy:
                "The ground's backup solution, read up at 00:34:50 (voice transcript), put the spacecraft 8.6 nautical miles below and 18.9 behind at terminal phase initiation, 22.7 miles away; the mission commentary reports 15.2 nautical miles at the last reading after the burn (Tape 51, page 4). We follow SP-138.",
            },
          },
        },
        {
          kind: 'burn',
          label: 'Terminal phase initiation',
          body: 'earth',
          start: TPI,
          end: TPI_DONE,
        },
        {
          kind: 'rendezvous',
          label: 'The final approach',
          body: 'earth',
          start: TPI_DONE,
          end: RENDEZVOUS,
          target: 'agena',
          // Table B gives no orbit for the approach itself; this is the
          // spacecraft's orbit once it had reached the Agena.
          apoapsis: AGENA_FIRST_ORBIT.apoapsis,
          periapsis: AGENA_FIRST_ORBIT.periapsis,
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'station',
          label: 'Beside the Agena',
          start: RENDEZVOUS,
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
          kind: 'station',
          label: 'Tied to the Agena by the tether',
          start: UNDOCKING,
          end: TETHER_RELEASE,
          target: 'agena',
        },
        {
          kind: 'station',
          label: 'Flying close to the Agena',
          start: TETHER_RELEASE,
          end: SEPARATION,
          target: 'agena',
        },
        {
          kind: 'orbit',
          label: 'Trailing the Agena',
          body: 'earth',
          start: SEPARATION,
          end: CATCHUP,
          // The Agena's own orbit, which the spacecraft shared: drawn from
          // the Agena's place, falling back to the published trailing
          // distance by the start of the second chase.
          apoapsis: {
            ...AGENA_LAST_ORBIT.apoapsis,
            citations: [
              ...AGENA_LAST_ORBIT.apoapsis.citations,
              rendezvousPaper(
                'Text, page 12 (PDF page 6): "After the initial separation maneuver, the spacecraft was in a nearly circular orbit at the same altitude as the target vehicle, but with a trailing displacement of approximately 25 nautical miles."',
              ),
            ],
          },
          periapsis: AGENA_LAST_ORBIT.periapsis,
          inclination: AGENA_LAST_ORBIT.inclination,
          period: AGENA_LAST_ORBIT.period,
          sense: PROGRADE_GEMINI,
          endRange: {
            target: 'agena',
            range: cite(
              25,
              rendezvousPaper(
                'Table 2-IV, "Rendezvous Propellant Usage" (page 18, PDF page 12), XI, stable orbit, conditions at start of terminal phase: "Δh = 0 n. mi., ΔX = 25 n. mi."',
              ),
              rendezvousPaper(
                'Text, page 12 (PDF page 6): "a trailing displacement of approximately 25 nautical miles"',
              ),
            ),
          },
        },
        {
          kind: 'burn',
          label: 'The second chase begins',
          body: 'earth',
          start: CATCHUP,
          end: CATCHUP_DONE,
        },
        {
          kind: 'rendezvous',
          label: 'Closing in again',
          body: 'earth',
          start: CATCHUP_DONE,
          end: REREND,
          target: 'agena',
          // The spacecraft's orbit after this rendezvous (none is given for
          // the approach itself).
          apoapsis: cite(
            164.0,
            tableB(
              '"Coincident orbit rendezvous" row (revolution 42), Orbital Parameters After Activity, "Apogee (n.m.)": 164.0',
            ),
          ),
          periapsis: cite(
            155.6,
            tableB(
              '"Coincident orbit rendezvous" row (revolution 42), Orbital Parameters After Activity, "Perigee (n.m.)": 155.6',
            ),
          ),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'station',
          label: 'Beside the Agena again',
          start: REREND,
          end: FAREWELL,
          target: 'agena',
        },
        {
          kind: 'orbit',
          label: 'Last orbits, on its own',
          body: 'earth',
          start: FAREWELL,
          end: RETROFIRE,
          // The orbit Table A gives at retrofire. The 3-foot-per-second
          // separation burn that put the spacecraft on it (its time was not
          // logged) is not drawn as such: this orbit starts at the Agena's
          // place.
          apoapsis: cite(163.0, tableA('At retrofire, "Apogee (n.m.)" row (revolution 44): 163.0')),
          periapsis: cite(
            151.0,
            tableA('At retrofire, "Perigee (n.m.)" row (revolution 44): 151.0'),
          ),
          inclination: cite(28.84, tableA('At retrofire, "Inclination angle" row: 28.84°')),
          period: cite(90.38, tableA('At retrofire, "Period (min.)" row: 90.38')),
          sense: PROGRADE_GEMINI,
        },
        {
          kind: 'burn',
          label: 'Retrofire',
          body: 'earth',
          start: RETROFIRE,
          end: RETRO_READOUT,
        },
        {
          kind: 'entry',
          label: 'Automatic entry and splashdown',
          start: RETRO_READOUT,
          end: LANDING,
          splashdown: SPLASHDOWN,
        },
        {
          kind: 'surface',
          label: 'Floating until the Guam lifts it aboard',
          body: 'earth',
          start: LANDING,
          end: ABOARD,
          site: SPLASHDOWN,
        },
      ],
    },
    {
      id: 'agena',
      name: 'Gemini Agena Target Vehicle',
      role: 'target',
      phases: [
        {
          kind: 'ascent',
          label: 'Launch',
          body: 'earth',
          start: AGENA_LIFTOFF,
          end: AGENA_INSERTION,
          site: PAD_14,
          azimuth: cite(83.32, tableB('Gemini XI row, Launch "Azimuth (deg.)": 83.32')),
        },
        {
          kind: 'orbit',
          label: 'Waiting for Gemini XI, then docked',
          body: 'earth',
          start: AGENA_INSERTION,
          end: HIGH_BURN,
          ...AGENA_FIRST_ORBIT,
          // Placed by how far it was from Gemini XI at Gemini XI's insertion,
          // so the two orbits share one plane, as they did: the Gemini was
          // launched when its pad passed under the Agena's orbit. Placed from
          // its own pad instead, the Agena's orbit would be drawn about 2.4
          // degrees out of Gemini XI's plane. On the Shoulders of Titans gives
          // the distance, not the direction: placing the Agena ahead, in a
          // straight line in Gemini XI's plane, is an illustration (our
          // reading of SP-138's Figure 2-7, which plots the spacecraft's
          // insertion far behind the target).
          startRelative: {
            ship: 'gemini',
            time: INSERTION,
            ahead: cite(
              232,
              {
                source: 'on-the-shoulders-of-titans',
                locator:
                  'Chapter XV, "The Final Curtain", page 358 (PDF page 379), on the corrections made just after insertion: "Their computer showed the crew they had made very precise insertion corrections that would help them catch a target 430 kilometers away." (430 km is 232 nautical miles: our conversion; the book says "away", and ahead is our reading)',
              },
              rendezvousPaper(
                'Figure 2-7, "Relative trajectory. Gemini XI mission" (page 11, PDF page 5): the trajectory starts at "Spacecraft insertion" on the "Behind" side of the horizontal axis (read off the graph, not printed as a number)',
              ),
            ),
          },
        },
        {
          kind: 'burn',
          label: "The Agena's engine: up to the high orbit",
          body: 'earth',
          start: HIGH_BURN,
          end: HIGH_BURN_END,
        },
        {
          kind: 'orbit',
          label: 'The high orbit',
          body: 'earth',
          start: HIGH_BURN_END,
          end: LOW_BURN,
          ...HIGH_ORBIT,
        },
        {
          kind: 'burn',
          label: "The Agena's engine: back down",
          body: 'earth',
          start: LOW_BURN,
          end: LOW_BURN_END,
        },
        {
          kind: 'orbit',
          label: 'Back near the starting height',
          body: 'earth',
          start: LOW_BURN_END,
          end: ABOARD,
          ...AGENA_LAST_ORBIT,
        },
      ],
    },
  ],
};
