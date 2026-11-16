/**
 * How the Apollo 11 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see apollo-11-flight.ts) is made of the listed
 * parts, until that ship's next entry. The scene draws simplified models
 * from these; it does not show any of this as text.
 *
 * Every time is copied from Apollo by the Numbers (NASA SP-2000-4029),
 * Apollo 11 Timeline, exactly as printed there.
 *
 * Two gaps in the sources, and how they are handled:
 * - The adapter's panels: the sources say the command and service module
 *   separated from the third stage "containing the LM", turned around, and
 *   docked with the LM. They do not time the opening of the adapter panels,
 *   so the adapter is drawn until that separation and not after it (the
 *   docking shows the LM was uncovered by then).
 * - The main parachutes: the Apollo 11 Timeline times the drogue
 *   parachutes but not the main parachutes, and neither does the Apollo 11
 *   Mission Report (its Table 7-VII stops at drogue deployment). The Apollo
 *   11 Flight Journal lists "Deployment of main parachutes reported" at
 *   195:13:22, from the public affairs commentary ("Apollo 11 should be on
 *   main chutes now"). That is a reported time, not a measured one. The
 *   model switches from the drogues to the main parachutes there, and the
 *   site does not state it as a fact.
 */
import type { Citation, Cited, ElapsedTime } from "../types";
import type { LeftBehind, VehicleChange, VehiclePart } from "../vehicle-types";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059A";
const NMC_LM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C";

/** A row of the Apollo by the Numbers Apollo 11 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 11 Timeline, row "${row}"`,
    url: `${ABN}Apollo_11i_Timeline.htm`,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const TURNED_AROUND: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 11 Command and Service Module (CSM)" (1969-059A), Mission Profile: "The CSM separated from the S-IVB stage containing the LM 33 minutes later, turned around and docked with the LM"',
  url: NMC_CSM,
};

const PARACHUTES: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 11 Command and Service Module (CSM)" (1969-059A), Spacecraft and Subsystems, Command Module: the forward compartment held "three 25.4 m diameter main parachutes, two 5 m drogue parachutes"',
  url: NMC_CSM,
};

const LEFT_ON_THE_MOON: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 11 Lunar Module / EASEP" (1969-059C), Lunar Module Spacecraft and Subsystems: "The descent stage served as a platform for launching the ascent stage and was left behind on the Moon"',
  url: NMC_LM,
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

export const apollo11Vehicle: readonly VehicleChange[] = [
  {
    ship: "csm",
    at: at("000:00:00.63", timeline("Liftoff (umbilical disconnected) (1.07 g).")),
    label: "Saturn V lifts off",
    layout: "launch",
    parts: ["first-stage", "aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:02:42.30", timeline("S-IC maximum Earth-fixed velocity. S-IC/S-II separation command.")),
    label: "First stage separates",
    layout: "launch",
    parts: ["aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:12.3", timeline("S-II aft interstage jettisoned.")),
    label: "Second stage drops its aft interstage",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:17.9", timeline("Launch escape tower jettisoned.")),
    label: "Launch escape tower jettisoned",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("000:09:09.00", timeline("S-II maximum Earth-fixed velocity. S-II/S-IVB separation command.")),
    label: "Second stage separates",
    layout: "launch",
    parts: ["third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("003:15:23.0", timeline("CSM separated from S-IVB."), TURNED_AROUND),
    label: "Columbia separates from the third stage and turns around",
    layout: "transposition",
    parts: ["third-stage", ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("003:24:03.7", timeline("CSM docked with LM/S-IVB.")),
    label: "Columbia docks with Eagle",
    layout: "docked-on-stage",
    parts: ["third-stage", ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("004:17:03.0", timeline("CSM/LM ejected from S-IVB.")),
    label: "Columbia pulls Eagle free of the third stage",
    layout: "docked",
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("100:12:00.0", timeline("CSM/LM undocked.")),
    label: "Eagle undocks",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("128:03:00", timeline("CSM/LM docked.")),
    label: "Eagle's ascent stage docks with Columbia",
    layout: "docked",
    parts: ["lm-ascent-stage", ...CSM],
  },
  {
    ship: "csm",
    at: at("130:09:31.2", timeline("LM ascent stage jettisoned.")),
    label: "Eagle's ascent stage is let go",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("194:49:12.7", timeline("CM/SM separation.")),
    label: "Command module separates from the service module",
    layout: "alone",
    parts: ["command-module"],
  },
  {
    ship: "csm",
    at: at("195:12:06.9", timeline("Drogue parachute deployed"), PARACHUTES),
    label: "Drogue parachutes open",
    layout: "alone",
    parts: ["command-module", "drogue-parachutes"],
  },
  {
    ship: "csm",
    at: at(
      "195:13:22",
      {
        source: "apollo-11-flight-journal",
        locator:
          'Day 9, part 2: Entry and Splashdown, Index to events: "Deployment of main parachutes reported", 195:13:22 (a reported time, from the public affairs commentary)',
        url: "https://www.apollojournals.org/afj/ap11fj/27day9-entry.html",
      },
      PARACHUTES,
      {
        source: "apollo-by-the-numbers",
        locator:
          'Apollo 11 mission summary, "Recovery" section: "The parachute system effected splashdown of the CM in the Pacific Ocean"',
        url: `${ABN}Apollo_11a_Summary.htm`,
      },
    ),
    label: "Main parachutes reported open",
    layout: "alone",
    parts: ["command-module", "main-parachutes"],
  },

  {
    ship: "lm",
    at: at("100:12:00.0", timeline("CSM/LM undocked.")),
    label: "Eagle undocks",
    layout: "alone",
    parts: LUNAR_MODULE,
  },
  {
    ship: "lm",
    at: at("124:22:00.79", timeline("LM lunar liftoff ignition (LM APS).")),
    label: "Eagle's ascent stage lifts off",
    layout: "alone",
    parts: ["lm-ascent-stage"],
  },
  {
    ship: "lm",
    at: at("128:03:00", timeline("CSM/LM docked.")),
    label: "Docked to Columbia, and drawn with it",
    layout: "alone",
    parts: [],
  },
];

/** Parts that stay behind. */
export const apollo11LeftBehind: readonly LeftBehind[] = [
  {
    part: "lm-descent-stage",
    ship: "lm",
    at: at("124:22:00.79", timeline("LM lunar liftoff ignition (LM APS)."), LEFT_ON_THE_MOON),
    label: "Eagle's descent stage stays at Tranquility Base",
  },
];
