/**
 * How the Apollo 9 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Every time is copied from the Apollo 9 Mission Report (MSC-PA-R-69-2),
 * Table 3-I, "Sequence of Events", or section 4.2 for the spacewalk, or
 * from Apollo by the Numbers' Apollo 9 Timeline where it prints the same
 * moment to the hundredth of a second.
 *
 * Gaps in the sources, and how they are handled:
 * - The adapter's panels: Apollo by the Numbers says they were jettisoned
 *   after the command and service module separated from the S-IVB, without
 *   a time, so the adapter is drawn until that separation and not after it,
 *   as for Apollo 11.
 * - Spider's landing legs were unfolded at about 45 hours (Apollo by the
 *   Numbers' Timeline); the model draws them unfolded throughout.
 * - The spacewalk (section 4.2): Schweickart is drawn on Spider's porch
 *   from the start of his egress to the end of his ingress, and Scott
 *   standing in Gumdrop's open side hatch, head and shoulders out, from the
 *   hatch opening to its closing. Spider's forward hatch, open from before
 *   Schweickart's egress until after his ingress, is drawn shut: the model
 *   has no open lunar module hatch.
 * - The S-IVB is not a ship of the flight plan: after the docked spacecraft
 *   were ejected from it, it is not drawn.
 * - Spider's ascent stage, cast off after the second docking, is not drawn
 *   after that: its path ends there (see flight.ts), and the scene shows it
 *   drifting away when it leaves Gumdrop's part list.
 * - The descent stage, dropped in orbit during the rendezvous, is not drawn
 *   after it was let go.
 * - No turn rates are published, so no motion is drawn.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../vehicle-types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT =
  'https://web.archive.org/web/20250815162504/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A09_MissionReport.pdf';
const ABN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';

function report(locator: string): Citation {
  return { source: 'apollo-9-mission-report', locator, url: MISSION_REPORT };
}

/** A row of Table 3-I, the sequence of events. */
function sequence(row: string, page: '3-4' | '3-5'): Citation {
  return report(
    `Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === '3-4' ? 14 : 15}), "${row}" row`,
  );
}

/** A row of the Apollo by the Numbers Apollo 9 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 9 Timeline, row "${row}"`,
    url: `${ABN}Apollo_09f_Timeline.htm`,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const PANELS_JETTISONED: Citation = {
  source: 'apollo-by-the-numbers',
  locator:
    'Apollo 9 mission summary, "Earth Orbit Phase" section: "the CSM was separated from the S-IVB stage at 002:41:16.0. The adapter panels that housed the LM and shielded it from the rigors of launch was then jettisoned. The CM was turned so its apex, holding the docking probe, faced the LM."',
  url: `${ABN}Apollo_09a_Summary.htm`,
};

const SPACEWALK = report(
  'Section 4.2, "Actual Timeline" (page 4-2, PDF page 29): the Lunar Module Pilot "began his egress to the forward platform at 72:59:02" and "began his ingress at 73:45:00 and completed it at 73:46:03"',
);
const CM_HATCH_OPEN = report(
  'Section 4.2, "Actual Timeline" (page 4-2, PDF page 29): "The command module was depressurized and the side hatch opened at 73:02:00."',
);
const SCOTT_IN_HATCH = report(
  'Section 3.0, "Mission Description" (page 3-2, PDF page 12): "the Command Module Pilot, dependent on spacecraft life support, partially exited through the command module hatch for observation, photography, and retrieval of thermal samples"',
);
const CM_HATCH_CLOSED = report(
  'Section 4.2, "Actual Timeline" (page 4-2, PDF page 29): "The command module hatch was closed and locked at 73:49:00"',
);

const PARACHUTES: Citation = {
  source: 'nasa-apollo-9-completes-its-mission',
  locator:
    'Paragraph on the entry: "after which the drogue parachutes deployed. The three main parachutes opened at 10,000 feet altitude"',
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
      '000:00:00.67',
      timeline('Liftoff (umbilical disconnected).'),
      sequence('Lift-off', '3-4'),
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
    at: at(
      '000:02:43.45',
      timeline('S-IC/S-II separation command and S-IC maximum Earth-fixed velocity.'),
      sequence('S-IC/S-II separation', '3-4'),
    ),
    label: 'First stage separates',
    layout: 'launch',
    parts: ['aft-interstage', 'second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at(
      '000:03:13.5',
      timeline('S-II aft interstage jettisoned.'),
      sequence('Interstage jettison', '3-4'),
    ),
    label: 'Second stage drops its aft interstage',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at(
      '000:03:18.3',
      timeline('Launch escape tower jettisoned.'),
      sequence('Launch escape tower jettison', '3-4'),
    ),
    label: 'Launch escape tower jettisoned',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at(
      '000:08:57.18',
      timeline('S-II/S-IVB separation command.'),
      sequence('S-II/S-IVB separation', '3-4'),
    ),
    label: 'Second stage separates',
    layout: 'launch',
    parts: ['third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at(
      '002:41:16.0',
      timeline('CSM separated from S-IVB (command).'),
      sequence('Command and service module/S-IVB separation command', '3-4'),
      PANELS_JETTISONED,
    ),
    label: 'Gumdrop separates from the third stage and turns around',
    layout: 'transposition',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at(
      '003:01:59.3',
      timeline('Formation flying. CSM docked with LM/S-IVB.'),
      sequence('Docking', '3-4'),
    ),
    label: 'Gumdrop docks with Spider',
    layout: 'docked-on-stage',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: {
      ...at(
        '004:08:06',
        sequence('Spacecraft ejection from S-IVB', '3-4'),
        report(
          'Section 7.2, "Spacecraft/S-IVB Separation" (page 7-1, PDF page 83): "At 4:08:06, the docked spacecraft were separated from the S-IVB"',
        ),
      ),
      discrepancy:
        'Apollo by the Numbers (Timeline, "CSM/LM ejected from S-IVB.", and its Earth Orbit Phase table) gives 004:08:09. We follow the mission report.',
    },
    label: 'Gumdrop and Spider are pushed free of the third stage',
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at('072:59:02', SPACEWALK, timeline('LMP started egress.')),
    label: "Schweickart climbs out onto Spider's porch",
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM, 'spacewalker'],
  },
  {
    ship: 'csm',
    at: at('073:02:00', CM_HATCH_OPEN, SCOTT_IN_HATCH, timeline('CM side hatch open.')),
    label: "Scott opens Gumdrop's side hatch and leans out",
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM, 'spacewalker', 'standup-spacewalker'],
  },
  {
    ship: 'csm',
    at: at('073:46:03', SPACEWALK, timeline('LMP ingress completed.')),
    label: "Schweickart is back inside Spider; Scott is still in Gumdrop's hatch",
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM, 'standup-spacewalker'],
  },
  {
    ship: 'csm',
    at: {
      ...at('073:49:00', CM_HATCH_CLOSED),
      discrepancy:
        'Apollo by the Numbers (Timeline, "CM side hatch reported closed and locked.") gives 073:49:23. We follow the mission report.',
    },
    label: "Gumdrop's hatch is closed",
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at('092:39:36', sequence('First undocking', '3-5'), timeline('CSM/LM reported undocked.')),
    label: 'Spider undocks',
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at('099:02:26', sequence('Docking', '3-5'), timeline('CSM/LM docked.')),
    label: "Spider's ascent stage docks with Gumdrop",
    layout: 'docked',
    parts: ['lm-ascent-stage', ...CSM],
  },
  {
    ship: 'csm',
    at: at(
      '101:22:45.0',
      timeline('LM ascent stage jettisoned.'),
      sequence('Lunar module jettison', '3-5'),
    ),
    label: "Spider's ascent stage is let go",
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at(
      '240:36:03.8',
      timeline('CM/SM separation.'),
      sequence('Command module/service module separation', '3-5'),
    ),
    label: 'Command module separates from the service module',
    layout: 'alone',
    parts: ['command-module'],
  },
  {
    ship: 'csm',
    at: at(
      '240:55:07.8',
      timeline('Drogue parachute deployed'),
      sequence('Drogue deployment', '3-5'),
      PARACHUTES,
    ),
    label: 'Drogue parachutes open',
    layout: 'alone',
    parts: ['command-module', 'drogue-parachutes'],
  },
  {
    ship: 'csm',
    at: at(
      '240:55:59.0',
      timeline('Main parachute deployed.'),
      sequence('Main parachute deployment', '3-5'),
      PARACHUTES,
    ),
    label: 'Main parachutes open',
    layout: 'alone',
    parts: ['command-module', 'main-parachutes'],
  },

  {
    ship: 'lm',
    at: at('092:39:36', sequence('First undocking', '3-5'), timeline('CSM/LM reported undocked.')),
    label: 'Spider undocks',
    layout: 'alone',
    parts: LUNAR_MODULE,
  },
  {
    ship: 'lm',
    at: at(
      '096:16:06.54',
      timeline(
        'LM coelliptic sequence initiation maneuver ignition. Approximate time of LM descent stage jettison.',
      ),
      report(
        'Section 5.3.1, "Lunar Module" (page 5-9, PDF page 52): "coelliptic sequence initiation was performed at 96:16:06, with the descent stage being jettisoned immediately after the start of reaction control system thrusting" (no time is given for the jettison itself, so the firing\'s start, the approximate time of staging, is used)',
      ),
    ),
    label: 'Spider drops its descent stage (at about the start of the coelliptic firing)',
    layout: 'alone',
    parts: ['lm-ascent-stage'],
  },
  {
    ship: 'lm',
    at: at('099:02:26', sequence('Docking', '3-5'), timeline('CSM/LM docked.')),
    label: 'Docked to Gumdrop, and drawn with it',
    layout: 'alone',
    parts: [],
  },
];

/** Nothing of Apollo 9 stays anywhere the scene draws (the descent stage was left in orbit, not on a surface). */
export const leftBehind: readonly LeftBehind[] = [];
