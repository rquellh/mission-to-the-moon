/**
 * How the Apollo 13 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Times are copied from Apollo by the Numbers (NASA SP-2000-4029), Apollo
 * 13 Timeline, exactly as printed there, except liftoff, which follows the
 * Apollo 13 Mission Report as the flight plan does (Apollo by the Numbers
 * gives 000:00:00.61), and the parachutes, which come from NASA's Apollo
 * 13 Technical Air-to-Ground Voice Transcription (see below).
 *
 * The launch and the turn-around-and-dock follow the Apollo 11 file, with
 * the same gap: the sources do not time the opening of the adapter panels,
 * so the adapter is drawn until the command and service module separates
 * from the third stage and not after it.
 *
 * The damaged service module: the Apollo 13 Timeline says that at
 * 055:54:53.555 "the panel separated" and the crew heard a loud bang, so
 * the service module is drawn with its side panel missing from that moment.
 * It stays docked until it is cast off at 138:01:48.0, when the damaged one
 * drifts away. After that the command module flies on docked to the lunar
 * module with no service module, until the lunar module is cast off at
 * 141:30:00.2. The lunar module's own path ends there (flight.ts), so it is
 * drawn drifting away from the command module and is not followed after.
 *
 * The parachutes: neither Apollo by the Numbers nor the Mission Report
 * times them. NASA's air-to-ground transcript has the crew's report of "two
 * good drogues" at 142:49:17 and Mission Control's "We show you on the
 * mains" at 142:50:06. Those are reported times, not measured ones; the
 * model switches parachutes there, and the site does not state them as
 * deployment times.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../vehicle-types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const NMC_CSM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1970-029A';
const AIR_TO_GROUND = 'https://www.nasa.gov/wp-content/uploads/2026/01/as13-tec.pdf';

/** A row of the Apollo by the Numbers Apollo 13 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 13 Timeline, row "${row}"`,
    url: `${ABN}Apollo_13h_Timeline.htm`,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const TRANSPOSITION: Citation = {
  source: 'apollo-by-the-numbers',
  locator:
    'Apollo 13 mission summary, "Translunar Phase" section: "At 003:06:38.9, the CSM was separated from the S-IVB stage ... Transposition and docking with the LM occurred at 003:19:08.8. The docked spacecraft were ejected from the S-IVB at 004:01:00.8"',
  url: `${ABN}Apollo_13a_Summary.htm`,
};

const PANEL_BLOWN_OFF: Citation = {
  source: 'apollo-by-the-numbers',
  locator:
    'Apollo 13 mission summary, "How the Problem Occurred" section: the rapid expulsion of high-pressure oxygen "blew off the outer panel into bay 4 of the SM"',
  url: `${ABN}Apollo_13a_Summary.htm`,
};

const DAMAGE_SEEN: Citation = {
  source: 'apollo-13-mission-report',
  locator:
    'Section 8.9.4, "Service Module Separation and Photography" (printed pages 8-15 and 8-16, PDF pages 70 and 71): "The entire bay 4 outer panel was missing, and torn Mylar insulation was seen protruding from the bay"',
  url: 'https://ntrs.nasa.gov/api/citations/19710003598/downloads/19710003598.pdf',
};

const PARACHUTES: Citation = {
  source: 'nssdca-master-catalog',
  locator:
    '"Apollo 13 Command and Service Module (CSM)" (1970-029A), Spacecraft and Subsystems: the forward compartment held "the three 25.4 m diameter main parachutes, two 5 m drogue parachutes"',
  url: NMC_CSM,
};

const SPLASHDOWN_BY_PARACHUTE: Citation = {
  source: 'apollo-by-the-numbers',
  locator:
    'Apollo 13 mission summary, "Recovery" section: "The parachute system effected splashdown of the CM in the Pacific Ocean"',
  url: `${ABN}Apollo_13a_Summary.htm`,
};

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const LUNAR_MODULE: readonly VehiclePart[] = ['lm-descent-stage', 'lm-ascent-stage'];
const CSM: readonly VehiclePart[] = ['service-module', 'command-module'];
const CSM_DAMAGED: readonly VehiclePart[] = ['service-module-damaged', 'command-module'];
const SPACECRAFT: readonly VehiclePart[] = ['adapter', ...LUNAR_MODULE, ...CSM];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  {
    ship: 'csm',
    at: at('000:00:00.65', {
      source: 'apollo-13-mission-report',
      locator:
        'Table 3-I, "Sequence of Events" (printed page 3-2, PDF page 13), "Lift-off - 19:13:00.65 G.m.t., April 11, 1970"',
      url: 'https://ntrs.nasa.gov/api/citations/19710003598/downloads/19710003598.pdf',
    }),
    label: 'Saturn V lifts off',
    layout: 'launch',
    parts: [
      'first-stage',
      'aft-interstage',
      'second-stage',
      'third-stage',
      ...SPACECRAFT,
      'escape-tower',
    ],
  },
  {
    ship: 'csm',
    at: at('000:02:44.3', timeline('S-IC/S-II separation command.')),
    label: 'First stage separates',
    layout: 'launch',
    parts: ['aft-interstage', 'second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at('000:03:14.3', timeline('S-II aft interstage jettisoned.')),
    label: 'Second stage drops its aft interstage',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at('000:03:21.0', timeline('Launch escape tower jettisoned.')),
    label: 'Launch escape tower jettisoned',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at(
      '000:09:53.50',
      timeline('S-II maximum Earth-fixed velocity; S-II/S-IVB separation command.'),
    ),
    label: 'Second stage separates',
    layout: 'launch',
    parts: ['third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at('003:06:38.9', timeline('CSM separated from S-IVB.'), TRANSPOSITION),
    label: 'Odyssey separates from the third stage and turns around',
    layout: 'transposition',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at('003:19:08.8', timeline('CSM docked with LM/S-IVB.')),
    label: 'Odyssey docks with Aquarius',
    layout: 'docked-on-stage',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at('004:01:00.8', timeline('CSM/LM ejected from S-IVB.')),
    label: 'Odyssey pulls Aquarius free of the third stage',
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at(
      '055:54:53.555',
      timeline(
        'Telemetry loss for 1.8 seconds. Master caution and warning triggered by DC main bus B undervoltage. Alarm turned off in 6 seconds. Indications were that the cryogenic oxygen tank #2 lost pressure during this time period and the panel separated. It was at this time that the crew heard a loud bang.',
      ),
      PANEL_BLOWN_OFF,
      DAMAGE_SEEN,
    ),
    label: 'Oxygen tank 2 fails and blows a side panel off the service module',
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM_DAMAGED],
  },
  {
    ship: 'csm',
    at: at('138:01:48.0', timeline('SM separation.'), DAMAGE_SEEN),
    label: 'The damaged service module is cast off',
    layout: 'docked',
    parts: [...LUNAR_MODULE, 'command-module'],
  },
  {
    ship: 'csm',
    at: at('141:30:00.2', timeline('LM jettisoned.')),
    label: 'Aquarius is cast off',
    layout: 'alone',
    parts: ['command-module'],
  },
  {
    ship: 'csm',
    at: at(
      '142:49:17',
      {
        source: 'apollo-13-air-to-ground-transcript',
        locator:
          'Tape 95/5, page 757 (PDF page 764), 05 22 49 17 (5 days 22:49:17, that is 142:49:17), CMP: "We got two good drogues." (a reported time)',
        url: AIR_TO_GROUND,
      },
      PARACHUTES,
      SPLASHDOWN_BY_PARACHUTE,
    ),
    label: 'Drogue parachutes reported open',
    layout: 'alone',
    parts: ['command-module', 'drogue-parachutes'],
  },
  {
    ship: 'csm',
    at: at(
      '142:50:06',
      {
        source: 'apollo-13-air-to-ground-transcript',
        locator:
          'Tape 95/5, page 757 (PDF page 764), 05 22 50 06 (142:50:06), CC: "Odyssey, Houston. We show you on the mains. It really looks great." (a reported time)',
        url: AIR_TO_GROUND,
      },
      PARACHUTES,
      SPLASHDOWN_BY_PARACHUTE,
    ),
    label: 'Main parachutes reported open',
    layout: 'alone',
    parts: ['command-module', 'main-parachutes'],
  },

  {
    ship: 'lm',
    at: at('003:19:08.8', timeline('CSM docked with LM/S-IVB.')),
    label: 'Docked to Odyssey, and drawn with it',
    layout: 'alone',
    parts: [],
  },
];

/**
 * Nothing was left on the Moon by a landing. The spent third stage did
 * strike the Moon (2.4 degrees south, 27.9 degrees west, Mission Report
 * section 4.0), but the scene can draw only a descent stage or a rover as
 * a part left behind, and only at a ship's landing site, so it is not shown.
 */
export const leftBehind: readonly LeftBehind[] = [];
