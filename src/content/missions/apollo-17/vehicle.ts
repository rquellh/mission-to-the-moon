/**
 * How the Apollo 17 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Times are copied from Apollo by the Numbers (NASA SP-2000-4029), Apollo
 * 17 Timeline, exactly as printed there, except for separation from the
 * third stage, docking, and pulling free of the stage: for those three the
 * Apollo 17 Mission Report's sequence of events (Table 3-I) differs, and
 * its times are used (the `discrepancy` fields say by how much). All times
 * count from range zero, without the 2-hour-40-minute clock update of
 * 065:00 (see flight.ts).
 *
 * Gaps in the sources, and how they are handled:
 * - The launch escape tower: Apollo by the Numbers gives only the planned
 *   time for its jettison ("actual time not recorded"), so it is drawn
 *   leaving at that planned time.
 * - The adapter's panels: as for Apollo 11, the opening of the adapter
 *   panels is not timed, so the adapter is drawn until the command and
 *   service module separates from the third stage and not after it.
 * - The scientific instrument module bay: its door was cast off at
 *   081:32:40. The model has no separate part for the bay or its door, so
 *   that moment does not change the drawing.
 * - The spacewalk on the way home: Evans is drawn floating by the service
 *   module and Schmitt standing in the open side hatch from the spacewalk's
 *   start (254:54:40) until "CM hatch closed" (255:40). The sources print
 *   no time for the hatch opening or for Evans's egress (he first let go of
 *   a trash bag and mounted a TV camera outside the hatch; the Timeline's
 *   row "Installation of television camera and data acquisition camera
 *   started." is at 255:00), so for those first minutes he is drawn outside
 *   before he was. The model shows him beside the service module, not at
 *   the instrument bay.
 * - The lunar rover: it is drawn parked beside Challenger's descent stage
 *   from the moment it was unloaded, and stays on the Moon. Its three
 *   drives are not drawn, and where it stands beside Challenger is an
 *   illustration (it was parked about 158 meters away to televise the
 *   liftoff).
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../vehicle-types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const MISSION_REPORT =
  'https://web.archive.org/web/20250206054342/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a17/A17_MissionReport.pdf';
const NMC_CSM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096A';
const NMC_LM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096C';

/** A row of the Apollo by the Numbers Apollo 17 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 17 Timeline, row "${row}"`,
    url: `${ABN}Apollo_17i_Timeline.htm`,
  };
}

/** A row of the Mission Report's sequence of events. */
function eventsTable(row: string): Citation {
  return {
    source: 'apollo-17-mission-report',
    locator: `Table 3-I, "Sequence of Events" (printed page 3-2, PDF page 20), "${row}" row`,
    url: MISSION_REPORT,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

/** A Mission Report time that Apollo by the Numbers gives differently. */
function reportTime(
  elapsed: ElapsedTime,
  row: string,
  abnRow: string,
  abnTime: string,
): Cited<ElapsedTime> {
  return {
    value: elapsed,
    citations: [eventsTable(row)],
    discrepancy: `Apollo by the Numbers (Apollo 17 Timeline, row "${abnRow}") gives ${abnTime}. We follow the Mission Report's sequence of events (Table 3-I), ${elapsed}.`,
  };
}

const PARACHUTES: Citation = {
  source: 'nssdca-master-catalog',
  locator:
    '"Apollo 17 Command and Service Module (CSM)" (1972-096A), Spacecraft and Subsystems, Command Module: the forward compartment held "the three 25.4 m diameter main parachutes, two 5 m drogue parachutes"',
  url: NMC_CSM,
};

const LEFT_ON_THE_MOON: Citation = {
  source: 'nssdca-master-catalog',
  locator:
    '"Apollo 17 Lunar Module /ALSEP" (1972-096C), Lunar Module Spacecraft and Subsystems: the descent stage held "in the case of Apollo 15, 16, and 17, the lunar rover", and "served as a platform for launching the ascent stage and was left behind on the Moon"',
  url: NMC_LM,
};

const SPACEWALK: Citation = {
  source: 'apollo-by-the-numbers',
  locator:
    'Apollo 17 mission summary, "Transearth Phase" section: "At 254:54:40, the command module pilot began a 1-hour 5-minute 44-second transearth coast extravehicular activity", retrieving film cassettes "in three trips to the scientific instrument module bay"',
  url: `${ABN}Apollo_17a_Summary.htm`,
};

const SCHMITT_IN_THE_HATCH: Citation = {
  source: 'nasa-apollo-17-heads-home',
  locator:
    'Paragraph on Evans\' spacewalk: the center couch was removed "to allow Evans to exit the side hatch and for Schmitt to stand in the hatch to take the cassettes as Evans passed them in", and "Evans then climbed back into America and closed the hatch"',
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
    at: at('000:00:00.63', timeline('Liftoff (umbilical disconnected).')),
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
    at: at('000:02:42.9', timeline('S-IC/S-II separation command.')),
    label: 'First stage separates',
    layout: 'launch',
    parts: ['aft-interstage', 'second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at('000:03:12.9', timeline('S-II aft interstage jettisoned.')),
    label: 'Second stage drops its aft interstage',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at(
      '000:03:19',
      timeline('Launch escape tower jettisoned (planned time, actual time not recorded).'),
    ),
    label: 'Launch escape tower jettisoned (at its planned time; the actual time was not recorded)',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at(
      '000:09:20.6',
      timeline('S-II/S-IVB separation command. S-II maximum Earth-fixed velocity.'),
    ),
    label: 'Second stage separates',
    layout: 'launch',
    parts: ['third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: reportTime(
      '003:42:29',
      'S-IVB/command and service module separation',
      'CSM separated from S-IVB.',
      '003:42:27.6',
    ),
    label: 'America separates from the third stage and turns around',
    layout: 'transposition',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: reportTime('003:56:45', 'Translunar docking', 'CSM docked with LM/S-IVB.', '003:57:10.7'),
    label: 'America docks with Challenger',
    layout: 'docked-on-stage',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: reportTime('004:45:00', 'Spacecraft ejection', 'CSM/LM ejected from S-IVB.', '004:45:02.3'),
    label: 'America pulls Challenger free of the third stage',
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at(
      '107:47:56',
      timeline('CSM/LM separation maneuver initiated (RCS).'),
      eventsTable('Lunar module undocking and separation'),
    ),
    label: 'Challenger undocks',
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at('187:37:15', timeline('CSM/LM docked.')),
    label: "Challenger's ascent stage docks with America",
    layout: 'docked',
    parts: ['lm-ascent-stage', ...CSM],
  },
  {
    ship: 'csm',
    at: at('191:18:31', timeline('LM ascent stage jettisoned.')),
    label: "Challenger's ascent stage is let go",
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at(
      '254:54:40',
      timeline('Transearth EVA started (Evans).'),
      SPACEWALK,
      SCHMITT_IN_THE_HATCH,
    ),
    label: 'Evans goes outside to bring in the camera film; Schmitt stands in the open hatch',
    layout: 'alone',
    parts: [...CSM, 'spacewalker', 'standup-spacewalker'],
  },
  {
    ship: 'csm',
    at: at('255:40:00', {
      source: 'apollo-by-the-numbers',
      locator:
        'Apollo 17 Timeline, row "CM hatch closed.", 255:40 (given to the minute; seconds written as 00; the row "Transearth EVA ended." follows at 256:00:24)',
      url: `${ABN}Apollo_17i_Timeline.htm`,
    }),
    label: 'Evans is back inside and the hatch is closed',
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at('301:23:49', timeline('CM/SM separation.')),
    label: 'Command module separates from the service module',
    layout: 'alone',
    parts: ['command-module'],
  },
  {
    ship: 'csm',
    at: at('301:46:22', timeline('Drogue parachute deployed'), PARACHUTES),
    label: 'Drogue parachutes open',
    layout: 'alone',
    parts: ['command-module', 'drogue-parachutes'],
  },
  {
    ship: 'csm',
    at: at('301:47:13', timeline('Main parachute deployed.'), PARACHUTES),
    label: 'Main parachutes open',
    layout: 'alone',
    parts: ['command-module', 'main-parachutes'],
  },

  {
    ship: 'lm',
    at: at(
      '107:47:56',
      timeline('CSM/LM separation maneuver initiated (RCS).'),
      eventsTable('Lunar module undocking and separation'),
    ),
    label: 'Challenger undocks',
    layout: 'alone',
    parts: LUNAR_MODULE,
  },
  {
    ship: 'lm',
    at: at('185:21:37', timeline('LM lunar liftoff ignition (LM APS).')),
    label: "Challenger's ascent stage lifts off",
    layout: 'alone',
    parts: ['lm-ascent-stage'],
  },
  {
    ship: 'lm',
    at: at('187:37:15', timeline('CSM/LM docked.')),
    label: 'Docked to America, and drawn with it',
    layout: 'alone',
    parts: [],
  },
];

/** Parts that stay behind. */
export const leftBehind: readonly LeftBehind[] = [
  {
    part: 'lunar-rover',
    ship: 'lm',
    at: at('114:51:10', timeline('Lunar roving vehicle (LRV) offloaded.'), LEFT_ON_THE_MOON, {
      source: 'apollo-by-the-numbers',
      locator: 'Apollo 17 Timeline, row "LRV positioned to monitor LM ascent." (167:39:57)',
      url: `${ABN}Apollo_17i_Timeline.htm`,
    }),
    label: 'The rover stays on the Moon',
  },
  {
    part: 'lm-descent-stage',
    ship: 'lm',
    at: at('185:21:37', timeline('LM lunar liftoff ignition (LM APS).'), LEFT_ON_THE_MOON),
    label: "Challenger's descent stage stays at Taurus-Littrow",
  },
];
