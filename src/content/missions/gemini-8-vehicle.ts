/**
 * How the Gemini VIII vehicles changed shape and turned during the flight,
 * for the 3D models. Each entry is a cited moment from which one ship of
 * the flight path ("gemini" or "agena", see gemini-8-flight.ts) is made of
 * the listed parts, faces the listed way, and turns as listed, until that
 * ship's next entry. The scene draws simplified models from these; it does
 * not show any of this as text (no time, rate, or attitude here is shown
 * on screen).
 *
 * Every time is copied from the Gemini Program Mission Report for Gemini
 * VIII (MSC-G-R-66-4): the spacecraft's from Table 4.2-I ("Sequence of
 * Events - Gemini Space Vehicle"), the Agena's from Table 4.2-II ("Gemini
 * Atlas-Agena Target Vehicle Sequence of Events"), and a few from the
 * report's text, named in each citation. Table 4.2-II prints the Agena's
 * times in seconds from its own lift-off; on the mission clock they are
 * those seconds minus 6059.262, our arithmetic (see gemini-8-flight.ts).
 *
 * Which way the craft point:
 * - The Agena is drawn with its docking cone forward throughout. The report
 *   gives its insertion attitude as 0, 0, 0 degrees (section 5.4.5.2, page
 *   5-194) and describes that attitude as "TDA forward", the target docking
 *   adapter leading (section 5.4.5.3, page 5-195). Its yaw to -90 degrees
 *   by ground command before docking, and the docked pair's 90-degree yaw
 *   back at about 06:49:00, are not drawn.
 * - The spacecraft is drawn nose forward until station keeping, matching
 *   the "SEF" (small end forward) attitude of its platform alignments during
 *   the chase (Table 5.1.5-I), and blunt end forward from station keeping
 *   on, as the report describes it there (section 7.1.2.5, page 7-19). It
 *   stays blunt end forward through retrofire and entry: the retrorockets
 *   slowed the craft, so they fired forward, from its blunt end (our
 *   reading). Its turnaround is drawn at the start of station keeping.
 *
 * Gaps in the sources, and how they are handled:
 * - The retrograde section: the report says it was jettisoned after
 *   retrofire (section 7.1.2.11, page 7-22) but prints no time. The model
 *   drops it at 010:05:38.9, thirty seconds after the last retrorocket
 *   burned out (gemini-8-flight.ts, RETROFIRE_END). That time is ours.
 * - The roll while docked: the report gives bounds, not a rate (section
 *   5.1.5, page 5-26: above 10 degrees per second for about 100 seconds in
 *   all, never above 20). The model turns the docked pair at a steady 10
 *   degrees per second from the thruster anomaly to undocking; that steady
 *   rate is our simplification.
 * - The spin: the report gives the rate at undocking (5 degrees per second
 *   in roll), says it rose to 296 degrees per second over about three
 *   minutes from 07:15:44.7, that the thruster's torque stopped at
 *   07:18:15.7, that the reentry thrusters first fired at 07:19:03.8, and
 *   that rates were under control by 07:25:30. How the rate rose and fell
 *   between those points is not published: the model changes it evenly
 *   (296 reached at 07:18:15.7, held to 07:19:03.8, then down to steady by
 *   07:25:30). The tumbling in pitch and yaw is not drawn.
 * - The Atlas is drawn as one piece; its booster section's separation
 *   (132.75 seconds) is not drawn. Nor are the pilot parachute, the
 *   Agena's tumbling just after undocking (its rates are not published),
 *   or the spacecraft's attitude under the main parachute.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from "../types";
import type { LeftBehind, VehicleChange, VehicleMotion, VehiclePart } from "../vehicle-types";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT =
  "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf";

function report(locator: string): Citation {
  return { source: "gemini-8-mission-report", locator, url: MISSION_REPORT };
}

/** A row of Table 4.2-I, quoted as printed, actual time. */
function sequence(row: string, page: "4-10" | "4-11"): Citation {
  return report(`Table 4.2-I, "Sequence of Events - Gemini Space Vehicle" (page ${page}), row "${row}", actual time`);
}

/** A row of Table 4.2-II, quoted as printed, actual time from the Agena's lift-off. */
function agenaSequence(row: string): Citation {
  return report(`Table 4.2-II, "Gemini Atlas-Agena Target Vehicle Sequence of Events" (page 4-12), row "${row}", actual time from lift-off`);
}

/** How long before Gemini VIII the Agena lifted off (6059.262 seconds; our subtraction of the two printed lift-off times). */
const AGENA_LEAD_SECONDS = 6059.262;
const AGENA_LEAD = report(
  'Section 4.1 (page 4-1): the Agena lifted off at "15:00:03.127 Greenwich mean time"; "One hour 40 minutes 59.262 seconds after GAATV lift-off, the GLV was launched with lift-off at 16:41:02.389 G.m.t."',
);

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

/** Seconds on the mission clock as "hhh:mm:ss.sss" (negative before lift-off). */
function clockTime(seconds: number): ElapsedTime {
  const sign = seconds < 0 ? "-" : "";
  const total = Math.round(Math.abs(seconds) * 1000) / 1000;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total - hours * 3600) / 60);
  const rest = (total - hours * 3600 - minutes * 60).toFixed(3).replace(/\.?0+$/, "");
  const [whole = "0", fraction] = rest.split(".");
  return `${sign}${String(hours).padStart(3, "0")}:${String(minutes).padStart(2, "0")}:${whole.padStart(2, "0")}${fraction ? `.${fraction}` : ""}` as ElapsedTime;
}

/** A Table 4.2-II time (seconds from the Agena's lift-off) on Gemini VIII's clock. */
function agenaAt(secondsFromAgenaLiftoff: number, row: string): Cited<ElapsedTime> {
  return at(clockTime(secondsFromAgenaLiftoff - AGENA_LEAD_SECONDS), agenaSequence(row), AGENA_LEAD);
}

/** A Table 4.2-I launch-phase time (seconds from lift-off) on the mission clock. */
function launchAt(secondsFromLiftoff: number, row: string): Cited<ElapsedTime> {
  return at(clockTime(secondsFromLiftoff), sequence(row, "4-10"));
}

/** Section 5.1.5 of the report, on the thruster failure (page 5-26). */
const CONTROL_ANALYSIS = (quote: string): Citation =>
  report(`Section 5.1.5, "Guidance and Control System" (page 5-26): "${quote}"`);

const STATION_KEEPING = report(
  'Section 4.3.1.2.1 (page 4-19): "By 5:55:00 g.e.t., the spacecraft was about 150 feet from the GATV and the crew was station keeping."',
);
const BLUNT_END_FORWARD = report(
  'Section 7.1.2.5, "Terminal phase" (page 7-19): the braking maneuvers "culminated in station keeping at 150 feet along the local horizontal and in a blunt-end-forward (BEF) attitude"',
);
const RETRO_ADAPTER = report(
  'Section 7.1.2.11, "Retrofire" (page 7-22): "No change in these values was noted as the retro adapter was jettisoned" (after retrofire; no time is printed, so the time used is ours)',
);

/** A roll at a cited rate (degrees per second), steady or changing evenly to `to` by the ship's next change. */
function roll(rate: number, citation: Citation, to?: { rate: number; citation: Citation }): VehicleMotion[] {
  return [
    {
      kind: "roll",
      rate: { value: rate, citations: [citation] },
      ...(to ? { rateTo: { value: to.rate, citations: [to.citation] } } : {}),
    },
  ];
}

const ROLL_AT_UNDOCKING = CONTROL_ANALYSIS("Rates at this time were +3, -5, and -2 deg/sec in pitch, roll, and yaw, respectively.");
const ROLL_PEAK = CONTROL_ANALYSIS(
  "At 7:15:44.7 g.e.t., the ACME bias power was inadvertantly removed, disabling the control system, and the roll rate increased to 296 deg/sec over the next three minutes",
);
const ROLL_WHILE_DOCKED = CONTROL_ANALYSIS(
  "the roll rate did exceed 10 deg/sec for a total of approximately 100 seconds in six 15-to-20 second intervals ... and did not exceed 20 deg/sec at any time prior to undocking (a steady 10 deg/sec is our simplification)",
);
const STEADY = CONTROL_ANALYSIS('Control was regained using the RCS in DIRECT-DIRECT. (Table 4.2-I: "Rates under control" at 07:25:30.)');

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = ["gemini-equipment-section", "gemini-retro-section", "gemini-reentry-module"];
const DOCKED: readonly VehiclePart[] = [...GEMINI, "agena"];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const gemini8Vehicle: readonly VehicleChange[] = [
  /* The Agena on its Atlas. */
  {
    ship: "agena",
    at: at("-001:40:59.262", agenaSequence("Lift-off"), AGENA_LEAD),
    label: "The Atlas-Agena lifts off",
    layout: "launch",
    parts: ["atlas", "agena", "agena-shroud"],
  },
  {
    ship: "agena",
    at: agenaAt(308.3, "TLV-GATV separation (retrorocket fire)"),
    label: "The Atlas falls away",
    layout: "launch",
    parts: ["agena", "agena-shroud"],
  },
  {
    ship: "agena",
    at: agenaAt(386.71, "Nose-shroud jettison squibs fired"),
    label: "The nose shroud comes off",
    layout: "launch",
    parts: ["agena"],
  },
  {
    ship: "agena",
    at: agenaAt(560.4, "PPS engine cutoff (VMCO)"),
    label: "The Agena in orbit",
    layout: "alone",
    parts: ["agena"],
  },
  {
    ship: "agena",
    at: at("006:33:16", sequence("Docking", "4-11")),
    label: "Docked: drawn with the spacecraft",
    layout: "docked",
    parts: [],
  },
  {
    ship: "agena",
    at: at("007:15:12.3", sequence("Undocking", "4-11")),
    label: "Left in orbit",
    layout: "alone",
    parts: ["agena"],
  },

  /* The spacecraft on its Titan II, then on its own. */
  {
    ship: "gemini",
    at: at("000:00:00", sequence("Lift-off (pad disconnect separation)", "4-10")),
    label: "Lift-off",
    layout: "launch",
    parts: ["titan-first-stage", "titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: launchAt(155.29, "Stage separation begins"),
    label: "The first stage falls away",
    layout: "launch",
    parts: ["titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: launchAt(365.66, "Spacecraft separation (shape-charge fired)"),
    label: "In orbit",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("005:55:00", STATION_KEEPING, BLUNT_END_FORWARD),
    label: "Station keeping, blunt end forward",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("006:33:16", sequence("Docking", "4-11")),
    label: "Docked with the Agena",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("007:00:26.7", sequence("Thruster anomaly start", "4-11")),
    label: "The docked pair starts to roll",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
    motion: roll(10, ROLL_WHILE_DOCKED),
  },
  {
    ship: "gemini",
    at: at("007:15:12.3", sequence("Undocking", "4-11")),
    label: "Undocked, still rolling",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(5, ROLL_AT_UNDOCKING),
  },
  {
    ship: "gemini",
    at: at("007:15:44.7", ROLL_PEAK),
    label: "The spin speeds up",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(5, ROLL_AT_UNDOCKING, { rate: 296, citation: ROLL_PEAK }),
  },
  {
    ship: "gemini",
    at: at(
      "007:18:15.7",
      sequence("TCA no. 8 circuit breaker off", "4-11"),
      CONTROL_ANALYSIS("The disturbance torque from thruster 8 ceased at 7:18:15.7 g.e.t. when the OAMS attitude-thruster circuit breakers were opened."),
    ),
    label: "The stuck thruster stops",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(296, ROLL_PEAK),
  },
  {
    ship: "gemini",
    at: at("007:19:03.8", CONTROL_ANALYSIS("no RCS thrusters were fired until 7:19:03.8 g.e.t.")),
    label: "The reentry thrusters slow the spin",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(296, ROLL_PEAK, { rate: 0, citation: STEADY }),
  },
  {
    ship: "gemini",
    at: at("007:25:30", sequence("Rates under control", "4-11")),
    label: "Steady again",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("010:03:48", sequence("Adapter equipment section separation", "4-11")),
    label: "The equipment section comes off",
    layout: "alone",
    parts: ["gemini-retro-section", "gemini-reentry-module"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("010:05:38.9", RETRO_ADAPTER),
    label: "The retrograde section comes off",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
  {
    ship: "gemini",
    at: at("010:36:47", sequence("Drogue parachute deployment", "4-11")),
    label: "Drogue parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-drogue-parachute"],
  },
  {
    ship: "gemini",
    at: at("010:38:08", sequence("Pilot parachute deploy/main parachute deploy", "4-11")),
    label: "Main parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-main-parachute"],
  },
  {
    ship: "gemini",
    at: at("010:41:34", sequence("Parachute jettison", "4-11")),
    label: "Floating, parachute let go",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
];

/** Nothing of Gemini VIII stays anywhere the scene draws. */
export const gemini8LeftBehind: readonly LeftBehind[] = [];
