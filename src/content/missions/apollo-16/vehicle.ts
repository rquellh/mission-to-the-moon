/**
 * How the Apollo 16 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Every time is copied from Apollo by the Numbers (NASA SP-2000-4029),
 * Apollo 16 Timeline, exactly as printed there, except where an entry says
 * otherwise.
 *
 * Gaps in the sources, and how they are handled:
 * - The adapter's panels: as for Apollo 11, the opening of the adapter
 *   panels is not timed, so the adapter is drawn until the command and
 *   service module separates from the third stage and not after it.
 * - The scientific instrument module bay: its door was cast off at
 *   069:59:01, the mass spectrometer's boom at 195:23:12, and the
 *   subsatellite was launched from the bay at 196:02:09. The model has no
 *   separate part for the bay, its door, the boom, or the subsatellite, so
 *   none of these moments changes the drawing.
 * - Undocking: Orion is drawn on its own from undocking, and beside Casper
 *   (not docked) while the engine was checked, as the flight plan has it.
 * - The lunar rover: it is drawn parked beside Orion's descent stage from
 *   the moment it was unloaded, and stays on the Moon. Its drives are not
 *   drawn, and where it stands beside Orion is an illustration.
 * - The spacewalk on the way home: Mattingly is drawn floating by the
 *   service module and Duke in the open side hatch from the spacewalk's
 *   start (218:39:46) until "Ingress and hatch closing started" (219:50),
 *   then the hatch open with no one outside until the spacewalk's end
 *   (220:03:28). The sources print no time for the hatch opening or for
 *   when the hatch was shut, so the hatch is drawn open from the start and
 *   until the end of the spacewalk. The model shows Mattingly beside the
 *   service module, not in the foot restraints at the instrument bay.
 * - The ascent stage: after it was let go at 195:00:12 it tumbled, at about
 *   3 degrees per second (Apollo by the Numbers mission summary), but its
 *   path ends there, so the tumble is not drawn.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../vehicle-types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const MISSION_REPORT =
  'https://www.nasa.gov/wp-content/uploads/static/history/alsj/a16/A16_MissionReport.pdf';
const NMC_CSM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-031A';
const NMC_LM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-031C';

/** A row of the Apollo by the Numbers Apollo 16 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `Apollo 16 Timeline, row "${row}"`,
    url: `${ABN}Apollo_16i_Timeline.htm`,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const SEPARATED_AND_DOCKED: Citation = {
  source: 'apollo-by-the-numbers',
  locator:
    'Apollo 16 mission summary, "Translunar Phase" section: "At 003:04:59.0, the CSM was separated from the S-IVB stage, transposed, and docked at 003:21:53.4"',
  url: `${ABN}Apollo_16a_Summary.htm`,
};

const PARACHUTES: Citation = {
  source: 'nssdca-master-catalog',
  locator:
    '"Apollo 16 Command and Service Module (CSM)" (1972-031A), Spacecraft and Subsystems, Command Module: the forward compartment held "the three 25.4 m diameter main parachutes, two 5 m drogue parachutes"',
  url: NMC_CSM,
};

const LEFT_ON_THE_MOON: Citation = {
  source: 'nssdca-master-catalog',
  locator:
    '"Apollo 16 Lunar Module /ALSEP" (1972-031C), Lunar Module Spacecraft and Subsystems: the descent stage held "in the case of Apollo 15, 16, and 17, the lunar rover", and "served as a platform for launching the ascent stage and was left behind on the Moon"',
  url: NMC_LM,
};

const SPACEWALK: Citation = {
  source: 'apollo-by-the-numbers',
  locator:
    'Apollo 16 mission summary, "Transearth Phase" section: "At 218:39:46, the command module pilot began a transearth coast EVA", during which he "retrieved film cassettes from the scientific instrument module cameras"',
  url: `${ABN}Apollo_16a_Summary.htm`,
};

const DUKE_IN_THE_HATCH: Citation = {
  source: 'nasa-apollo-16-heads-home',
  locator:
    'Paragraph on the spacewalk: "They depressurized Casper, opened the hatch, and Mattingly floated out, installing a TV camera" and "handed them to Duke, floating in the open hatch"',
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
    at: at('000:00:00.59', timeline('Liftoff (umbilical disconnected).')),
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
    at: at('000:02:43.5', timeline('S-IC/S-II separation command.')),
    label: 'First stage separates',
    layout: 'launch',
    parts: ['aft-interstage', 'second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at('000:03:13.5', timeline('S-II aft interstage jettisoned.')),
    label: 'Second stage drops its aft interstage',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT, 'escape-tower'],
  },
  {
    ship: 'csm',
    at: at('000:03:19.8', timeline('Launch escape tower jettisoned.')),
    label: 'Launch escape tower jettisoned',
    layout: 'launch',
    parts: ['second-stage', 'third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at('000:09:20.5', timeline('S-II/S-IVB separation command.')),
    label: 'Second stage separates',
    layout: 'launch',
    parts: ['third-stage', ...SPACECRAFT],
  },
  {
    ship: 'csm',
    at: at('003:04:59.0', timeline('CSM separated from S-IVB.'), SEPARATED_AND_DOCKED),
    label: 'Casper separates from the third stage and turns around',
    layout: 'transposition',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at('003:21:53.4', timeline('CSM docked with LM/S-IVB.')),
    label: 'Casper docks with Orion',
    layout: 'docked-on-stage',
    parts: ['third-stage', ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at('003:59:15.1', timeline('CSM/LM ejected from S-IVB.')),
    label: 'Casper pulls Orion free of the third stage',
    layout: 'docked',
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: 'csm',
    at: at('096:13:31', timeline('LM undocking and separation.')),
    label: 'Orion undocks',
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at('177:41:18', timeline('CSM/LM docked.')),
    label: "Orion's ascent stage docks with Casper",
    layout: 'docked',
    parts: ['lm-ascent-stage', ...CSM],
  },
  {
    ship: 'csm',
    at: at('195:00:12', timeline('LM ascent stage jettisoned.')),
    label: "Orion's ascent stage is let go",
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: at(
      '218:39:46',
      timeline('Transearth EVA started (Mattingly).'),
      SPACEWALK,
      DUKE_IN_THE_HATCH,
    ),
    label: 'Mattingly goes outside to bring in the camera film; Duke is in the open hatch',
    layout: 'alone',
    parts: [...CSM, 'spacewalker', 'standup-spacewalker'],
  },
  {
    ship: 'csm',
    at: at('219:50:00', {
      source: 'apollo-by-the-numbers',
      locator:
        'Apollo 16 Timeline, row "Ingress and hatch closing started.", 219:50 (given to the minute; seconds written as 00)',
      url: `${ABN}Apollo_16i_Timeline.htm`,
    }),
    label: 'Mattingly comes back in; the hatch is still open',
    layout: 'alone',
    parts: [...CSM, 'open-hatch'],
  },
  {
    ship: 'csm',
    at: at('220:03:28', timeline('Transearth EVA ended.')),
    label: 'The spacewalk is over',
    layout: 'alone',
    parts: CSM,
  },
  {
    ship: 'csm',
    at: {
      ...at(
        '265:22:33',
        {
          source: 'apollo-16-mission-report',
          locator:
            'Table 3-I, "Sequence of Events" (printed page 3-2, PDF page 15), "Command module/service module separation" row',
          url: MISSION_REPORT,
        },
        {
          source: 'apollo-by-the-numbers',
          locator:
            'Apollo 16 mission summary, "Recovery" section: "The service module was jettisoned at 265:22:33"',
          url: `${ABN}Apollo_16a_Summary.htm`,
        },
      ),
      discrepancy:
        'Apollo by the Numbers\' Apollo 16 Timeline gives "CM/SM separation" at 265:22:23. Its mission summary and the Mission Report\'s Table 3-I give 265:22:33, which we follow.',
    },
    label: 'Command module separates from the service module',
    layout: 'alone',
    parts: ['command-module'],
  },
  {
    ship: 'csm',
    at: at('265:45:26', timeline('Drogue parachute deployed'), PARACHUTES),
    label: 'Drogue parachutes open',
    layout: 'alone',
    parts: ['command-module', 'drogue-parachutes'],
  },
  {
    ship: 'csm',
    at: at('265:46:16', timeline('Main parachute deployed.'), PARACHUTES),
    label: 'Main parachutes open',
    layout: 'alone',
    parts: ['command-module', 'main-parachutes'],
  },

  {
    ship: 'lm',
    at: at('096:13:31', timeline('LM undocking and separation.')),
    label: 'Orion undocks',
    layout: 'alone',
    parts: LUNAR_MODULE,
  },
  {
    ship: 'lm',
    at: at('175:31:47.9', timeline('LM lunar liftoff ignition (LM APS).')),
    label: "Orion's ascent stage lifts off",
    layout: 'alone',
    parts: ['lm-ascent-stage'],
  },
  {
    ship: 'lm',
    at: at('177:41:18', timeline('CSM/LM docked.')),
    label: 'Docked to Casper, and drawn with it',
    layout: 'alone',
    parts: [],
  },
];

/** Parts that stay behind. */
export const leftBehind: readonly LeftBehind[] = [
  {
    part: 'lunar-rover',
    ship: 'lm',
    at: at('119:25:29', timeline('Lunar roving vehicle (LRV) offloaded.'), LEFT_ON_THE_MOON, {
      source: 'nasa-apollo-16-heads-home',
      locator:
        'Caption of the liftoff pictures, before the paragraph on the liftoff: "broadcast by the television camera aboard the Lunar Roving Vehicle (Rover), parked about 300 feet away"',
    }),
    label: 'The rover stays on the Moon',
  },
  {
    part: 'lm-descent-stage',
    ship: 'lm',
    at: at('175:31:47.9', timeline('LM lunar liftoff ignition (LM APS).'), LEFT_ON_THE_MOON),
    label: "Orion's descent stage stays at Descartes",
  },
];
