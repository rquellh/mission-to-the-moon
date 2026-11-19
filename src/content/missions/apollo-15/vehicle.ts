/**
 * How the Apollo 15 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Every time is copied from Apollo by the Numbers (NASA SP-2000-4029),
 * Apollo 15 Timeline, exactly as printed there.
 *
 * Gaps in the sources, and how they are handled:
 * - The adapter's panels: as for Apollo 11, the opening of the adapter
 *   panels is not timed, so the adapter is drawn until the command and
 *   service module separates from the third stage and not after it.
 * - The scientific instrument module bay: its door was cast off at
 *   074:06:47.1 and the subsatellite was launched from the bay at
 *   222:39:29.1. The model has no separate part for the bay, its door, or
 *   the subsatellite, so neither moment changes the drawing.
 * - The lunar rover: it is drawn parked beside Falcon's descent stage from
 *   the moment it was unloaded, and stays on the Moon. Its drives (three
 *   traverses of 5.6, 6.7, and 2.7 nautical miles) are not drawn, and where
 *   it stands beside Falcon is an illustration.
 * - The main parachutes: one of the three collapsed at about 6,000 feet,
 *   but the model always draws three open main parachutes. The story says
 *   so in the splashdown event.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063A";
const NMC_LM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C";

/** A row of the Apollo by the Numbers Apollo 15 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 15 Timeline, row "${row}"`,
    url: `${ABN}Apollo_15i_Timeline.htm`,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const SEPARATED_AND_DOCKED: Citation = {
  source: "apollo-by-the-numbers",
  locator:
    'Apollo 15 mission summary, "Translunar Phase" section: "At 003:22:27.2, the CSM was separated from the S-IVB stage, transposed, and docked at 003:33:49.5"',
  url: `${ABN}Apollo_15a_Summary.htm`,
};

const PARACHUTES: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 15 Command and Service Module (CSM)" (1971-063A), Spacecraft and Subsystems, Command Module: the forward compartment held "the three 25.4 m diameter main parachutes, two 5 m drogue parachutes"',
  url: NMC_CSM,
};

const LEFT_ON_THE_MOON: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 15 Lunar Module /ALSEP" (1971-063C), Lunar Module Spacecraft and Subsystems: the descent stage held "in the case of Apollo 15, 16, and 17, the lunar rover", and "served as a platform for launching the ascent stage and was left behind on the Moon"',
  url: NMC_LM,
};

const SPACEWALK: Citation = {
  source: "apollo-by-the-numbers",
  locator:
    'Apollo 15 mission summary, "Transearth Phase" section: "At 241:57:12, the command module pilot began a transearth coast extravehicular activity", retrieving film cassettes "from the scientific instrument module bay"; "The EVA was completed at 242:36:19"',
  url: `${ABN}Apollo_15a_Summary.htm`,
};

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const LUNAR_MODULE: readonly VehiclePart[] = ["lm-descent-stage", "lm-ascent-stage"];
const CSM: readonly VehiclePart[] = ["service-module", "command-module"];
const SPACECRAFT: readonly VehiclePart[] = ["adapter", ...LUNAR_MODULE, ...CSM];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  {
    ship: "csm",
    at: at("000:00:00.58", timeline("Liftoff (umbilical disconnected).")),
    label: "Saturn V lifts off",
    layout: "launch",
    parts: ["first-stage", "aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:02:41.2", timeline("S-IC/S-II separation command.")),
    label: "First stage separates",
    layout: "launch",
    parts: ["aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:11.2", timeline("S-II aft interstage jettisoned.")),
    label: "Second stage drops its aft interstage",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:15.9", timeline("Launch escape tower jettisoned.")),
    label: "Launch escape tower jettisoned",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("000:09:10.1", timeline("S-II/S-IVB separation command.")),
    label: "Second stage separates",
    layout: "launch",
    parts: ["third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("003:22:27.2", timeline("CSM separated from S-IVB."), SEPARATED_AND_DOCKED),
    label: "Endeavour separates from the third stage and turns around",
    layout: "transposition",
    parts: ["third-stage", ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("003:33:49.5", timeline("CSM docked with LM/S-IVB.")),
    label: "Endeavour docks with Falcon",
    layout: "docked-on-stage",
    parts: ["third-stage", ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("004:18:01.2", timeline("CSM/LM ejected from S-IVB.")),
    label: "Endeavour pulls Falcon free of the third stage",
    layout: "docked",
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("100:39:16.2", timeline("LM undocking and separation.")),
    label: "Falcon undocks",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("173:36:25.5", timeline("CSM/LM docked.")),
    label: "Falcon's ascent stage docks with Endeavour",
    layout: "docked",
    parts: ["lm-ascent-stage", ...CSM],
  },
  {
    ship: "csm",
    at: at("179:30:01.4", timeline("LM ascent stage jettisoned.")),
    label: "Falcon's ascent stage is let go",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("241:57:12", timeline("Transearth EVA started (Worden)."), SPACEWALK),
    label: "Worden goes outside to bring in the camera film",
    layout: "alone",
    parts: [...CSM, "spacewalker"],
  },
  {
    ship: "csm",
    at: at("242:36:19", timeline("Transearth EVA ended."), SPACEWALK),
    label: "Worden is back inside",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("294:43:55.2", timeline("CM/SM separation.")),
    label: "Command module separates from the service module",
    layout: "alone",
    parts: ["command-module"],
  },
  {
    ship: "csm",
    at: at("295:06:46", timeline("Drogue parachute deployed."), PARACHUTES),
    label: "Drogue parachutes open",
    layout: "alone",
    parts: ["command-module", "drogue-parachutes"],
  },
  {
    ship: "csm",
    at: at("295:07:34", timeline("Main parachute deployed."), PARACHUTES),
    label: "Main parachutes open",
    layout: "alone",
    parts: ["command-module", "main-parachutes"],
  },

  {
    ship: "lm",
    at: at("100:39:16.2", timeline("LM undocking and separation.")),
    label: "Falcon undocks",
    layout: "alone",
    parts: LUNAR_MODULE,
  },
  {
    ship: "lm",
    at: at("171:37:23.2", timeline("LM lunar liftoff ignition (LM APS).")),
    label: "Falcon's ascent stage lifts off",
    layout: "alone",
    parts: ["lm-ascent-stage"],
  },
  {
    ship: "lm",
    at: at("173:36:25.5", timeline("CSM/LM docked.")),
    label: "Docked to Endeavour, and drawn with it",
    layout: "alone",
    parts: [],
  },
];

/** Parts that stay behind. */
export const leftBehind: readonly LeftBehind[] = [
  {
    part: "lunar-rover",
    ship: "lm",
    at: at("120:18:31", timeline("Lunar rover vehicle (LRV) offloaded."), LEFT_ON_THE_MOON, {
      source: "apollo-by-the-numbers",
      locator:
        'Apollo 15 mission summary, "Lunar Orbit/Lunar Surface Phase" section: "After returning to the LM, the LRV was unloaded and parked at 167:35:24 for ground-controlled television coverage of the LM ascent"',
      url: `${ABN}Apollo_15a_Summary.htm`,
    }),
    label: "The rover is unloaded from Falcon, and stays on the Moon",
  },
  {
    part: "lm-descent-stage",
    ship: "lm",
    at: at("171:37:23.2", timeline("LM lunar liftoff ignition (LM APS)."), LEFT_ON_THE_MOON),
    label: "Falcon's descent stage stays at Hadley-Apennine",
  },
];
