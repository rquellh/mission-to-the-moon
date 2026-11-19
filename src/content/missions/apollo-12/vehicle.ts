/**
 * How the Apollo 12 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Times are copied from Apollo by the Numbers (NASA SP-2000-4029), Apollo 12
 * Timeline, exactly as printed there, where the Apollo 12 Mission Report's
 * Table 5-I agrees with them to its rounding. The one that differs, the
 * escape tower's jettison, follows the Mission Report (see its discrepancy).
 *
 * One gap in the sources, handled as in Apollo 11's file: the sources say
 * the command and service module separated from the third stage "containing
 * the LM", turned around, and docked with it, but they do not time the
 * opening of the adapter panels. The adapter is drawn until that separation
 * and not after it.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT =
  "https://web.archive.org/web/20251203061616/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a12/A12_MissionReport.pdf";
const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099A";
const NMC_LM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C";

/** A row of the Apollo by the Numbers Apollo 12 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 12 Timeline, row "${row}"`,
    url: `${ABN}Apollo_12i_Timeline.htm`,
  };
}

/** A row of the Mission Report's Table 5-I, Sequence of Events (pages 5-1 and 5-2, PDF pages 83 and 84). */
function sequence(row: string, page: "5-1" | "5-2"): Citation {
  return {
    source: "apollo-12-mission-report",
    locator: `Table 5-I, "Sequence of Events" (page ${page}, PDF page ${page === "5-1" ? 83 : 84}), "${row}" row`,
    url: MISSION_REPORT,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const TURNED_AROUND: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 12 Command and Service Module (CSM)" (1969-099A), Mission Profile: "The CSM separated from the S-IVB stage containing the LM 25 minutes later, turned around and docked with the LM"',
  url: NMC_CSM,
};

const PARACHUTES: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 12 Command and Service Module (CSM)" (1969-099A), Spacecraft and Subsystems, Command Module: the forward compartment held "the three 25.4 m diameter main parachutes, two 5 m drogue parachutes"',
  url: NMC_CSM,
};

const LEFT_ON_THE_MOON: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 12 Lunar Module / ALSEP" (1969-099C), Lunar Module Spacecraft and Subsystems: "The descent stage served as a platform for launching the ascent stage and was left behind on the Moon"',
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

export const vehicle: readonly VehicleChange[] = [
  {
    ship: "csm",
    at: at("000:00:00.68", timeline("Liftoff (umbilical disconnected)."), sequence("Lift-off", "5-1")),
    label: "Saturn V lifts off",
    layout: "launch",
    parts: ["first-stage", "aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:02:42.4", timeline("S-IC/S-II separation command."), sequence("S-IC/S-II separation", "5-1")),
    label: "First stage separates",
    layout: "launch",
    parts: ["aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:12.4", timeline("S-II aft interstage jettisoned.")),
    label: "Second stage drops its aft interstage",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: {
      ...at("000:03:21.6", sequence("Launch escape tower jettison", "5-1")),
      discrepancy:
        'The Apollo by the Numbers Apollo 12 Timeline gives "Launch escape tower jettisoned." at 000:03:17.9. We follow the Mission Report\'s Table 5-I, 00:03:21.6.',
    },
    label: "Launch escape tower jettisoned",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("000:09:13.20", timeline("S-II maximum Earth-fixed velocity. S-II/S-IVB separation command.")),
    label: "Second stage separates",
    layout: "launch",
    parts: ["third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("003:18:04.9", timeline("CSM separated from S-IVB."), sequence("S-IVB/command and service module separation", "5-1"), TURNED_AROUND),
    label: "Yankee Clipper separates from the third stage and turns around",
    layout: "transposition",
    parts: ["third-stage", ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("003:26:53.3", timeline("CSM docked with LM/S-IVB."), sequence("Translunar docking", "5-1")),
    label: "Yankee Clipper docks with Intrepid",
    layout: "docked-on-stage",
    parts: ["third-stage", ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("004:13:00.9", timeline("CSM/LM ejected from S-IVB."), sequence("Spacecraft ejection", "5-2")),
    label: "Yankee Clipper pulls Intrepid free of the third stage",
    layout: "docked",
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("107:54:02.3", timeline("CSM/LM undocked."), sequence("Undocking", "5-2")),
    label: "Intrepid undocks",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("145:36:20.2", timeline("CSM/LM docked."), sequence("Lunar orbit docking", "5-2")),
    label: "Intrepid's ascent stage docks with Yankee Clipper",
    layout: "docked",
    parts: ["lm-ascent-stage", ...CSM],
  },
  {
    ship: "csm",
    at: at("147:59:31.6", timeline("LM ascent stage jettisoned."), sequence("Ascent stage jettison", "5-2")),
    label: "Intrepid's ascent stage is let go",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("244:07:20.1", timeline("CM/SM separation."), sequence("Command module/service module separation", "5-2")),
    label: "Command module separates from the service module",
    layout: "alone",
    parts: ["command-module"],
  },
  {
    ship: "csm",
    at: at("244:30:39.7", timeline("Drogue parachute deployed"), PARACHUTES),
    label: "Drogue parachutes open",
    layout: "alone",
    parts: ["command-module", "drogue-parachutes"],
  },
  {
    ship: "csm",
    at: at("244:31:30.2", timeline("Main parachute deployed."), PARACHUTES),
    label: "Main parachutes open",
    layout: "alone",
    parts: ["command-module", "main-parachutes"],
  },

  {
    ship: "lm",
    at: at("107:54:02.3", timeline("CSM/LM undocked."), sequence("Undocking", "5-2")),
    label: "Intrepid undocks",
    layout: "alone",
    parts: LUNAR_MODULE,
  },
  {
    ship: "lm",
    at: at("142:03:47.78", timeline("LM lunar liftoff ignition (LM APS)."), sequence("Lunar lift-off", "5-2")),
    label: "Intrepid's ascent stage lifts off",
    layout: "alone",
    parts: ["lm-ascent-stage"],
  },
  {
    ship: "lm",
    at: at("145:36:20.2", timeline("CSM/LM docked."), sequence("Lunar orbit docking", "5-2")),
    label: "Docked to Yankee Clipper, and drawn with it",
    layout: "alone",
    parts: [],
  },
];

/** Parts that stay behind. */
export const leftBehind: readonly LeftBehind[] = [
  {
    part: "lm-descent-stage",
    ship: "lm",
    at: at("142:03:47.78", timeline("LM lunar liftoff ignition (LM APS)."), sequence("Lunar lift-off", "5-2"), LEFT_ON_THE_MOON),
    label: "Intrepid's descent stage stays in the Ocean of Storms",
  },
];
