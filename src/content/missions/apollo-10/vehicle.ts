/**
 * How the Apollo 10 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Times are copied from Apollo by the Numbers (NASA SP-2000-4029), Apollo
 * 10 Timeline, exactly as printed there; the Apollo 10 Mission Report's
 * Table 3-I gives the same times to its rounding. The one exception is the
 * first docking, a second later in the Mission Report, which we follow.
 *
 * Gaps in the sources, and how they are handled:
 * - The adapter's panels: the sources say the command and service module
 *   separated from the third stage, turned around, and docked with the
 *   lunar module. They do not time the opening of the adapter panels, so
 *   the adapter is drawn until that separation and not after it, as for
 *   Apollo 11.
 * - The two lunar module stages are not drawn after they were cast off:
 *   the descent stage stayed in orbit around the Moon, and the ascent
 *   stage was sent into orbit around the Sun. Neither stood anywhere the
 *   scene draws, so nothing is left behind.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../vehicle-types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const MISSION_REPORT =
  'https://web.archive.org/web/20250207014556/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A10_MissionReport.pdf';

/** A row of the Apollo by the Numbers Apollo 10 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 10 Timeline, row "${row}"`,
    url: `${ABN}Apollo_10i_Timeline.htm`,
  };
}

/** A row of the Mission Report's Table 3-I, Sequence of Events (pages 3-3 and 3-4, PDF pages 14 and 15). */
function sequence(row: string, page: '3-3' | '3-4'): Citation {
  return {
    source: 'apollo-10-mission-report',
    locator: `Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === '3-3' ? 14 : 15}), "${row}" row`,
    url: MISSION_REPORT,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const TURNED_AROUND: Citation = {
  source: 'apollo-10-mission-report',
  locator:
    'Section 3.0, Mission Description (page 3-1, PDF page 12): "The command and service modules were separated from the S-IVB and then were transposed and docked with the lunar module. The docking latches were secured, the tunnel was pressurized, and the spacecraft were ejected from the S-IVB at about 4 hours"',
  url: MISSION_REPORT,
};

const FIRST_DOCKING: Citation = {
  source: 'apollo-10-mission-report',
  locator:
    'Section 6.3, Translunar Injection and Separation (page 6-2, PDF page 43): "Separation of the command and service modules from the S-IVB was initiated at 3:02:42 and docking was completed at 3:17:37"',
  url: MISSION_REPORT,
};

const STAGED: Citation = {
  source: 'apollo-by-the-numbers',
  locator:
    'Apollo 10 mission summary, "Lunar Orbit Phase" section: "The ascent stage was then separated from the descent stage at 102:45:16.9 at an altitude of 31.4 n mi ... The descent stage went into lunar orbit"',
  url: `${ABN}Apollo_10a_Summary.htm`,
};

const PARACHUTES_RELEASED: Citation = {
  source: 'apollo-10-mission-report',
  locator:
    'Section 9.13.4, Landing (page 9-25, PDF page 173): "The main parachute release circuit breakers and switch were activated immediately, and the main parachutes fell into the water near the spacecraft"',
  url: MISSION_REPORT,
};

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const LUNAR_MODULE: readonly VehiclePart[] = ['lm-descent-stage', 'lm-ascent-stage'];
const CSM: readonly VehiclePart[] = ['service-module', 'command-module'];
const SPACECRAFT: readonly VehiclePart[] = ['adapter', ...LUNAR_MODULE, ...CSM];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  {
    ship: 'csm',
    at: at(
      '000:00:00.58',
      timeline('Liftoff (umbilical disconnected).'),
      sequence('Lift-off', '3-3'),
    ),
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
    at: at('000:02:42.31', timeline('S-IC/S-II separation command.')),
    label: 'First stage separates',
    layout: 'launch',
    parts: ['aft-interstage', 'second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at('000:03:12.3', timeline('S-II aft interstage jettisoned.')),
    label: 'Second stage drops its aft interstage',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at(
      '000:03:17.8',
      timeline('Launch escape tower jettisoned.'),
      sequence('Launch escape tower jettison', '3-3'),
    ),
    label: 'Launch escape tower jettisoned',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at(
      '000:09:13.50',
      timeline('S-II maximum Earth-fixed velocity. S-II/S-IVB separation command.'),
    ),
    label: 'Second stage separates',
    layout: 'launch',
    parts: ['third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at(
      '003:02:42.4',
      timeline('CSM separated from S-IVB (ignition).'),
      sequence('Command and service module separation', '3-3'),
      TURNED_AROUND,
    ),
    label: 'Charlie Brown separates from the third stage and turns around',
    layout: 'transposition',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: {
      ...at('003:17:37', sequence('First docking', '3-3'), FIRST_DOCKING),
      discrepancy:
        'The Apollo by the Numbers Apollo 10 Timeline ("CSM docked with LM/S-IVB.") gives 003:17:36.0. We follow the Mission Report.',
    },
    label: 'Charlie Brown docks with Snoopy',
    layout: 'docked-on-stage',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at(
      '003:56:25.7',
      timeline('CSM/LM ejected from S-IVB.'),
      sequence('Spacecraft ejection', '3-3'),
    ),
    label: 'Charlie Brown pulls Snoopy free of the third stage',
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at('098:11:57', timeline('CSM/LM undocked.'), sequence('Undocking', '3-3')),
    label: 'Snoopy undocks',
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at('106:22:02', timeline('CSM/LM docked.'), sequence('Second docking', '3-4')),
    label: "Snoopy's ascent stage docks with Charlie Brown",
    layout: 'docked',
    parts: ['lm-ascent-stage', ...CSM],
  },
  {
    ship: 'csm',
    at: at(
      '108:24:36',
      timeline('LM ascent stage jettisoned.'),
      sequence('Ascent stage jettison', '3-4'),
    ),
    label: "Snoopy's ascent stage is let go",
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at(
      '191:33:26',
      timeline('CM/SM separation.'),
      sequence('Command module/service module separation', '3-4'),
    ),
    label: 'Command module separates from the service module',
    layout: 'alone',
    parts: ['command-module'],
  },
  {
    ship: 'csm',
    at: at(
      '191:57:18.0',
      timeline('Drogue parachute deployed'),
      sequence('Drogue deployment', '3-4'),
    ),
    label: 'Drogue parachutes open',
    layout: 'alone',
    parts: ['command-module', 'drogue-parachutes'],
  },
  {
    ship: 'csm',
    at: at(
      '191:58:05',
      timeline('Main parachute deployed.'),
      sequence('Main parachute deployment', '3-4'),
    ),
    label: 'Main parachutes open',
    layout: 'alone',
    parts: ['command-module', 'main-parachutes'],
  },
  {
    ship: 'csm',
    at: at(
      '192:03:23',
      timeline('Splashdown (went to apex-up).'),
      sequence('Landing', '3-4'),
      PARACHUTES_RELEASED,
    ),
    label: 'Splashdown; the main parachutes are let go',
    layout: 'alone',
    parts: ['command-module'],
  },

  {
    ship: 'lm',
    at: at('098:11:57', timeline('CSM/LM undocked.'), sequence('Undocking', '3-3')),
    label: 'Snoopy undocks',
    layout: 'alone',
    parts: LUNAR_MODULE,
  },
  {
    ship: 'lm',
    at: at(
      '102:45:16.9',
      timeline('LM ascent stage/descent stage separated.'),
      sequence('Lunar module staging', '3-3'),
      STAGED,
    ),
    label: 'Snoopy casts off its descent stage in lunar orbit',
    layout: 'alone',
    parts: ['lm-ascent-stage'],
  },
  {
    ship: 'lm',
    at: at('106:22:02', timeline('CSM/LM docked.'), sequence('Second docking', '3-4')),
    label: 'Docked to Charlie Brown, and drawn with it',
    layout: 'alone',
    parts: [],
  },
];

/** Nothing of Apollo 10 stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
