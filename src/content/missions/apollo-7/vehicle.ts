/**
 * How the Apollo 7 vehicles changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "s-ivb", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Every time is copied from the Apollo 7 Mission Report (MSC-PA-R-68-15),
 * Table 2-I, "Sequence of Events", or from Apollo by the Numbers' Apollo 7
 * Timeline where it prints the same moment to the hundredth of a second.
 *
 * Gaps in the sources, and how they are handled:
 * - Apollo 7 carried no lunar module, so the launch stack is the Saturn IB
 *   with an empty adapter. At separation the S-IVB, with its adapter
 *   panels opened, becomes a ship of its own ("s-ivb"); until then it is
 *   drawn as part of the spacecraft's stack.
 * - One of the four adapter panels had opened fully and then partly closed
 *   again. The mission report is itself split on how far it stayed open:
 *   about 25 degrees instead of about 45 in section 11.7 (page 11-5), as
 *   Apollo by the Numbers also says, but 30 degrees in section 8.1.3 (page
 *   8-2). Photographs on revolution 19 showed all four at about 45 degrees
 *   (section 11.7). The model draws all four panels open alike.
 * - The stage was tumbling at the rendezvous (Apollo by the Numbers, Apollo
 *   7 summary, "Inflight Activities"), but no rate is published, so it is
 *   not turned. Nor is the spacecraft's turnaround to face the stage drawn
 *   as a motion: while the two keep station, the scene turns it to face the
 *   stage.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT =
  "https://web.archive.org/web/20250207014232/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A07_MissionReport.pdf";
const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";

function report(locator: string): Citation {
  return { source: "apollo-7-mission-report", locator, url: MISSION_REPORT };
}

/** A row of Table 2-I, "Actual" column. */
function sequence(row: string, page: "2-3" | "2-4"): Citation {
  return report(`Table 2-I, "Sequence of Events" (page ${page}, PDF page ${page === "2-3" ? 29 : 30}), "${row}" row, actual column`);
}

/** A row of the Apollo by the Numbers Apollo 7 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `Apollo 7 Timeline, row "${row}"`, url: `${ABN}Apollo_07f_Timeline.htm` };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const PARACHUTES = report(
  'Appendix A, section A.1.13, "Recovery System" (page A-17, PDF page 360): the earth landing system "consists of two mutually redundant sequence controllers, two drogue parachutes, three pilot parachutes, three main parachutes"',
);

const NO_LUNAR_MODULE: Citation = {
  source: "nssdca-master-catalog",
  locator: '"Apollo 7" (1968-089A), Description: "There was no lunar module or boilerplate unit on this flight."',
  url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1968-089A",
};

const PANELS_OPEN = report(
  'Section 6.2.1, "Mission Description", flight crew report (page 6-21, PDF page 263): after separation, transposition, and the simulated docking exercise, "One of the adapter panels had deployed and then retracted"',
);

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const CSM: readonly VehiclePart[] = ["service-module", "command-module"];
/** The S-IVB with its empty spacecraft-LM adapter. */
const STAGE: readonly VehiclePart[] = ["third-stage", "adapter"];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  /* The spacecraft on its Saturn IB, then on its own. */
  {
    ship: "csm",
    at: at(
      "000:00:00.36",
      report('Table 2-I, "Sequence of Events" (page 2-3, PDF page 29): "Lift-off (15:02:45.36 G.m.t.)", range zero at 15:02:45 G.m.t.'),
      timeline("Liftoff (umbilical disconnected)."),
      NO_LUNAR_MODULE,
    ),
    label: "Saturn IB lifts off",
    layout: "launch",
    parts: ["saturn-ib-first-stage", ...STAGE, ...CSM, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:02:25.59", timeline("S-IB/S-IVB separation command."), sequence("S-IB/S-IVB separation", "2-3")),
    label: "First stage separates",
    layout: "launch",
    parts: [...STAGE, ...CSM, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:02:46.54", timeline("Launch escape tower jettisoned."), sequence("Escape tower jettison", "2-3")),
    label: "Launch escape tower jettisoned",
    layout: "launch",
    parts: [...STAGE, ...CSM],
  },
  {
    ship: "csm",
    at: at("002:55:02.40", timeline("Separation of CSM from S-IVB."), sequence("Spacecraft/S-IVB separation", "2-3")),
    label: "The command and service module separates from the S-IVB",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("259:43:33.8", sequence("Command module/service module separation", "2-4"), timeline("CM/SM separation.")),
    label: "Command module separates from the service module",
    layout: "alone",
    parts: ["command-module"],
  },
  {
    ship: "csm",
    at: at("260:03:23", sequence("Drogue deployment", "2-4"), timeline("Drogue parachute deployed"), PARACHUTES),
    label: "Drogue parachutes open",
    layout: "alone",
    parts: ["command-module", "drogue-parachutes"],
  },
  {
    ship: "csm",
    at: at(
      "260:04:13",
      sequence("Main parachute deployment", "2-4"),
      timeline("Main parachute deployed. VHF voice contact with CM established by recovery forces."),
      PARACHUTES,
    ),
    label: "Main parachutes open",
    layout: "alone",
    parts: ["command-module", "main-parachutes"],
  },

  /* The S-IVB: part of the stack, then a target of its own. */
  {
    ship: "s-ivb",
    at: at("000:00:00.36", timeline("Liftoff (umbilical disconnected).")),
    label: "Carrying the spacecraft, and drawn with it",
    layout: "alone",
    parts: [],
  },
  {
    ship: "s-ivb",
    at: at("002:55:02.40", timeline("Separation of CSM from S-IVB."), sequence("Spacecraft/S-IVB separation", "2-3"), PANELS_OPEN),
    label: "The spent stage, its adapter panels open",
    layout: "alone",
    parts: STAGE,
  },
];

/** Nothing of Apollo 7 stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
