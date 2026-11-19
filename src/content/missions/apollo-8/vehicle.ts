/**
 * How the Apollo 8 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which the one ship of the
 * flight path ("csm", see flight.ts) is made of the listed parts, until its
 * next entry. The scene draws simplified models from these; it does not
 * show any of this as text.
 *
 * Times are from Apollo by the Numbers (NASA SP-2000-4029), Apollo 8
 * Timeline, exactly as printed there; the Apollo 8 Mission Report's Table
 * 3-I gives the same times to its rounding.
 *
 * What is not drawn, and why:
 * - The adapter carried a lunar module test article (LTA-B), a stand-in of
 *   about the same weight, in place of a lunar module. It is not drawn: the
 *   launch stack is listed without lunar module parts, so the adapter is
 *   empty.
 * - After separation the crew turned the spacecraft around to look at and
 *   photograph the third stage, flying alongside it, then moved away with
 *   thruster firings at 3:40:01 and 4:45:01. It is drawn turning around
 *   beside the stage (the "transposition" layout with no lunar module, so
 *   nothing to dock to) from separation to the first firing, and nose
 *   toward the stage ("backward") from the first firing to the second. When
 *   the turn was made within that first span, and when the spacecraft
 *   stopped facing the stage, are not published: the turn's pace and the
 *   return to the usual facing at the second firing are illustrations. The
 *   adapter is left out from separation on, since its panels came off; the
 *   third stage is not drawn after the first firing.
 * - The main parachutes were let go just after splashdown, a moment later
 *   than planned (Mission Report, Section 7.2.7); the release is not timed,
 *   so the model lets them go at splashdown (an illustration).
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT =
  "https://web.archive.org/web/20251209023927/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A08_MissionReport.pdf";

/** A row of the Apollo by the Numbers Apollo 8 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 8 Timeline, row "${row}"`,
    url: `${ABN}Apollo_08i_Timeline.htm`,
  };
}

/** A row of the Mission Report's Table 3-I, Sequence of Events. */
function sequence(row: string, page: "3-3" | "3-4"): Citation {
  return {
    source: "apollo-8-mission-report",
    locator: `Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === "3-3" ? 12 : 13}), "${row}" row`,
    url: MISSION_REPORT,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const NO_LUNAR_MODULE: Citation = {
  source: "apollo-8-mission-report",
  locator:
    'Section 3.0, Mission Description (page 3-1, PDF page 10): "A lunar module test article (LTA-B) was mounted in the spacecraft/launch vehicle adapter for mass loading purposes"',
  url: MISSION_REPORT,
};

const TURNED_AROUND: Citation = {
  source: "apollo-8-mission-report",
  locator:
    'Section 3.0, Mission Description (page 3-1, PDF page 10): "After separation and transposition, the crew observed and photographed the S-IVB, then performed reaction control system maneuvers at 3:40:01 and at 4:45:01 to increase the separation distance"',
  url: MISSION_REPORT,
};

const PARACHUTES: Citation = {
  source: "apollo-8-mission-report",
  locator:
    'Section 7.2.7, Entry and Landing, in the Pilots\' Report (page 7-22, PDF page 171): "apex cover jettison, drogue deployment, and main parachute deployment were all normal", and the light of the thruster propellant dump "was adequate for a visual check of the three main parachutes"',
  url: MISSION_REPORT,
};

const PARACHUTES_RELEASED: Citation = {
  source: "apollo-8-mission-report",
  locator:
    'Section 7.2.7, Entry and Landing, in the Pilots\' Report (page 7-22, PDF page 171): the water that came in at landing "caused a momentary delay in releasing the main parachutes. As a result, the spacecraft was pulled over to a stable II attitude"',
  url: MISSION_REPORT,
};

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const CSM: readonly VehiclePart[] = ["service-module", "command-module"];
/** The spacecraft on the rocket: the adapter (holding only the test article, not drawn) under the command and service module. */
const SPACECRAFT: readonly VehiclePart[] = ["adapter", ...CSM];

/* ------------------------------------------------------------------ */
/* The changes, in time order.                                         */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  {
    ship: "csm",
    at: at("000:00:00.67", timeline("Liftoff (umbilical disconnected)."), NO_LUNAR_MODULE),
    label: "Saturn V lifts off",
    layout: "launch",
    parts: ["first-stage", "aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at(
      "000:02:34.47",
      timeline("S-IC maximum Earth-fixed velocity; S-IC/S-II separation command"),
      sequence("S-IC/S-II separation", "3-3"),
    ),
    label: "First stage separates",
    layout: "launch",
    parts: ["aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:04.47", timeline("S-II aft interstage jettisoned."), sequence("Interstage jettison", "3-3")),
    label: "Second stage drops its aft interstage",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:08.6", timeline("Launch escape tower jettisoned."), sequence("Launch escape tower jettison", "3-3")),
    label: "Launch escape tower jettisoned",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at(
      "000:08:44.90",
      timeline("S-II maximum Earth-fixed velocity; S-II/S-IVB separation command."),
      sequence("S-II/S-IVB separation", "3-3"),
    ),
    label: "Second stage separates",
    layout: "launch",
    parts: ["third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("003:20:59.3", timeline("CSM separated from S-IVB."), sequence("Spacecraft/S-IVB separation", "3-3"), TURNED_AROUND),
    label: "The spacecraft separates from the third stage, turns around, and flies alongside it",
    layout: "transposition",
    parts: ["third-stage", ...CSM],
  },
  {
    ship: "csm",
    at: at("003:40:01", timeline("1 st CSM evasive maneuver from S-IVB (RCS)."), sequence("First separation maneuver", "3-3"), TURNED_AROUND),
    label: "The first thruster firing moves the spacecraft away from the stage",
    layout: "alone",
    parts: CSM,
    facing: "backward",
  },
  {
    ship: "csm",
    at: at("004:45:01", timeline("2nd CSM evasive maneuver from S-IVB (RCS)."), sequence("Second separation maneuver", "3-3"), TURNED_AROUND),
    label: "The second thruster firing moves the spacecraft farther away",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("146:28:48.0", timeline("CM/SM separation."), sequence("Command module/service module separation", "3-4")),
    label: "Command module separates from the service module",
    layout: "alone",
    parts: ["command-module"],
  },
  {
    ship: "csm",
    at: at("146:54:47.8", timeline("Drogue parachute deployed"), sequence("Drogue deployment", "3-4"), PARACHUTES),
    label: "Drogue parachutes open",
    layout: "alone",
    parts: ["command-module", "drogue-parachutes"],
  },
  {
    ship: "csm",
    at: at("146:55:38.9", timeline("Main parachute deployed."), sequence("Main parachute deployment", "3-4"), PARACHUTES),
    label: "Main parachutes open",
    layout: "alone",
    parts: ["command-module", "main-parachutes"],
  },
  {
    ship: "csm",
    at: at("147:00:42.0", timeline("Splashdown."), sequence("Landing", "3-4"), PARACHUTES_RELEASED),
    label: "Splashdown; the main parachutes are let go",
    layout: "alone",
    parts: ["command-module"],
  },
];

/** Nothing of Apollo 8 stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
