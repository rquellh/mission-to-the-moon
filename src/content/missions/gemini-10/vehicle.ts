/**
 * How the Gemini X vehicles changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("gemini", "agena", or "agena-8", see flight.ts) is made of the
 * listed parts and faces the listed way, until that ship's next entry. The
 * scene draws simplified models from these; it does not show any of this as
 * text.
 *
 * Every time but one is copied from the Gemini Program Mission Report for
 * Gemini X (MSC-G-R-66-7): the spacecraft's from Tables 4-I and 4-II, the
 * Agena's launch from Table 4-III, and a few from the report's text, named
 * in each citation. The one other, when Collins stood up in the hatch, is
 * from the Gemini chronology (see below). Table 4-III prints the Agena's times in seconds from its own
 * lift-off; on the mission clock they are those seconds minus 6040.517, our
 * arithmetic (see flight.ts). Times printed in seconds from lift-off are
 * written as hours:minutes:seconds.
 *
 * Which way the craft point:
 * - Both Agenas are drawn with their docking cones forward.
 * - The spacecraft is drawn nose forward until docking. Docked, it is drawn
 *   blunt end forward, with the Agena behind it, docking cone forward: the
 *   crew yawed the pair "to a TDA-forward heading" after docking (section
 *   7.1.2.6.1), and flew "backward" through the first firing of the
 *   Agena's engine (On the Shoulders of Titans, page 345). The pair turned
 *   many more times while docked (at least eleven 90-degree heading changes,
 *   section 7.1.2.6.2), including the turn that pointed the Agena's engine
 *   forward for the second firing; those turns are not drawn, because the
 *   report prints no times for them.
 * - After undocking the spacecraft is drawn nose forward again (its attitude
 *   is not published), and from the equipment section's separation blunt end
 *   forward, the attitude the crew aligned for retrofire (section 7.1.1.8).
 *
 * Collins outside, in the report's three open-hatch periods (section
 * 5.1.10.5):
 * - The standup spacewalk, from 23:24:00 to 24:13:00: the hatch is drawn
 *   open with no one outside until 23:27, when Table D of the Gemini
 *   chronology's Appendix 1 has Collins standing (the report gives no time
 *   for it), then Collins standing in his seat in the open hatch.
 * - The umbilical spacewalk, from about 48:42 to 49:20: he is drawn floating
 *   on his tether for the whole time the hatch was open, because the report
 *   gives hatch opening and egress as one time (48:42) and ingress and hatch
 *   closure as another (49:20), both to the minute. Table D splits them
 *   (standing 48:42, outside 48:47, inside 49:12), and the report says he
 *   deployed the handrails "while standing in the seat" first, so he is
 *   drawn floating for a few minutes when he stood in the hatch; we follow
 *   the report.
 * - The hatch opening to throw out used equipment, from 50:30 to 50:34: the
 *   hatch is drawn open with no one outside.
 *
 * Gaps in the sources, and how they are handled:
 * - The retrograde section: the report says the crew jettisoned it after
 *   retrofire (section 7.1.1.8) but prints no time. The model drops it at
 *   070:11:16.8, thirty seconds after the drawn end of retrofire (flight.ts,
 *   RETROFIRE_END, itself an illustration). That time is ours.
 * - The main parachute: its release after landing is not timed; the model
 *   lets it go at landing.
 * - The Atlas is drawn as one piece; its booster section's separation
 *   (133.41 seconds) is not drawn. Nor are the pilot parachute, the
 *   spacecraft's spinning under the main parachute (section 5.1.11), or the
 *   handrail and experiment packages.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = "https://ntrs.nasa.gov/api/citations/19750067644/downloads/19750067644.pdf";

function report(locator: string): Citation {
  return { source: "gemini-10-mission-report", locator, url: MISSION_REPORT };
}

/** A row of Table 4-I (the launch phase), actual time from lift-off. */
const launchEvent = (row: string): Citation =>
  report(`Table 4-I, "Sequence of Events for Gemini Space Vehicle Launch Phase" (page 4-12, PDF page 91), "${row}" row, actual time`);
/** A row of Table 4-II (orbital and reentry phases), actual ground elapsed time. */
const event = (row: string): Citation =>
  report(`Table 4-II, "Sequence of Events for Gemini Spacecraft Orbital and Reentry Phases" (page 4-13, PDF page 92), "${row}" row, actual ground elapsed time`);
/** A row of Table 4-III (the Agena's launch phase), actual time from the Agena's lift-off. */
const agenaEvent = (row: string): Citation =>
  report(`Table 4-III, "Sequence of Events for GAATV Launch Phase" (page 4-14, PDF page 93), "${row}" row, actual time from lift-off`);

const AGENA_LEAD_SECONDS = 6040.517;
const AGENA_LEAD = report(
  'Section 4.1, "Actual Mission" (page 4-1, PDF page 80): "One hour, 40 minutes, and 40.517 seconds after the GAATV lift-off, the Gemini Space Vehicle was launched" (Table 4-I: lift-off at 22:20:26.648 G.m.t.; Table 4-III: 20:39:46.131 G.m.t.)',
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

/** A Table 4-III time (seconds from the Agena's lift-off) on Gemini X's clock. */
function agenaAt(secondsFromAgenaLiftoff: number, row: string): Cited<ElapsedTime> {
  return at(clockTime(secondsFromAgenaLiftoff - AGENA_LEAD_SECONDS), agenaEvent(row), AGENA_LEAD);
}

const DOCKING = report('Section 5.4.5.2.1, "Docking" (page 5-146, PDF page 298): "Docking occurred at 5:52:37.1 g.e.t."');
const UNDOCKING = event("Second rendezvous: Spacecraft separation and phase adjust maneuver");
const BLUNT_END_FORWARD_DOCKED: [Citation, ...Citation[]] = [
  report('Section 7.1.2.6.1, "Gemini X GATV station keeping and docking" (page 7-28, PDF page 410): "The GATV was yawed to a TDA-forward heading using the spacecraft propulsion system and the attitude control in the direct mode."'),
  { source: "on-the-shoulders-of-titans", locator: 'Chapter XIV, "Charting New Space Lanes", page 345 (PDF page 366): during the first firing of the Agena\'s engine "The crew, at the moment flying backward ... were thrown forward from the seats against the body straps"' },
];
const STANDUP = report(
  'Section 7.1.1.5.1, "Standup EVA" (page 7-5, PDF page 386): "The EVA started at 23:24:00 g.e.t. (sunset) after the spacecraft was depressurized and the hatch was opened" and the crew "terminated the EVA six minutes early at 24:13:00 g.e.t."',
);
const STANDUP_STANDING = {
  source: "gemini-chronology",
  locator:
    'Appendix 1, Table D (Extravehicular Activity on Gemini Missions), Gemini X "Standup" row: "Crewman standing (hr:min)" 23:27 (V, from voice transcriptions; given to the minute, seconds written as 00)',
  url: "https://www.nasa.gov/history/SP-4002/app1d.htm",
} as const satisfies Citation;
const STANDUP_PERIOD = report('Section 5.1.10.5, "Extravehicular equipment" (page 5-101, PDF page 253): "standup EVA from 23 hours 24 minutes to 24 hours 13 minutes g.e.t."');
const UMBILICAL_PERIOD = report(
  'Section 5.1.10.5, "Extravehicular equipment" (page 5-101, PDF page 253): "umbilical EVA from 48 hours 42 minutes to 49 hours 20 minutes g.e.t" (given to the minute; seconds written as 00)',
);
const UMBILICAL_START = report('Section 7.1.1.5.2, "Umbilical EVA" (page 7-6, PDF page 387): "the hatch was opened at sunrise at about 48 hours 42 minutes g.e.t."');
const UMBILICAL_EGRESS = report(
  'Section 5.1.10.5.1, "Extravehicular Life Support System" (page 5-102, PDF page 254): "At the time of hatch opening and egress (48 hours 42 minutes g.e.t.)"',
);
const UMBILICAL_END = report('Section 7.1.1.5.2, "Umbilical EVA" (page 7-6, PDF page 387): "The pilot ingressed at 49 hours 20 minutes g.e.t"');
const UMBILICAL_HATCH_CLOSED = report(
  'Section 5.1.10.5.1, "Extravehicular Life Support System" (page 5-102, PDF page 254): "After ingress and hatch closure at 49 hours 20 minutes g.e.t"',
);
const JETTISON_PERIOD = report(
  'Section 5.1.10.5, "Extravehicular equipment" (page 5-101, PDF page 253): "a hatch-open period to jettison used equipment from 50 hours 30 minutes to 50 hours 34 minutes g.e.t." (given to the minute; seconds written as 00)',
);
const JETTISON = report('Section 7.1.1.5.2, "Umbilical EVA" (page 7-7, PDF page 388): "The equipment was jettisoned at 50 hours 30 minutes g.e.t, in two bundles"');
const RETROFIRE_ATTITUDE = report(
  'Section 7.1.1.8, "Retrofire and reentry" (pages 7-9 and 7-10, PDF pages 390 and 391): "The platform was aligned blunt end forward (BEF) using the Orbital Attitude and Maneuver System (OAMS) in the platform mode during the last revolution."',
);
const RETRO_SECTION = report(
  'Section 7.1.1.8, "Retrofire and reentry" (page 7-10, PDF page 391): "After jettison of the adapter retrograde section, the crew selected single-ring operation of the Reentry Control System" (no time is printed, so the time used is ours: thirty seconds after the drawn end of retrofire, which is itself an illustration; see flight.ts)',
);

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = ["gemini-equipment-section", "gemini-retro-section", "gemini-reentry-module"];
const DOCKED: readonly VehiclePart[] = [...GEMINI, "agena"];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  /* The Gemini X Agena on its Atlas, then in orbit. */
  {
    ship: "agena",
    at: at("-001:40:40.517", agenaEvent("Lift-off (20:39:46.131 G.m.t.)"), AGENA_LEAD),
    label: "The Atlas-Agena lifts off",
    layout: "launch",
    parts: ["atlas", "agena", "agena-shroud"],
  },
  {
    ship: "agena",
    at: agenaAt(300.7, "TLV/GATV separation"),
    label: "The Atlas falls away",
    layout: "launch",
    parts: ["agena", "agena-shroud"],
  },
  {
    ship: "agena",
    at: agenaAt(380.17, "Jettison nose shroud"),
    label: "The nose shroud comes off",
    layout: "launch",
    parts: ["agena"],
  },
  {
    ship: "agena",
    at: agenaAt(558.05, "Velocity meter cutoff"),
    label: "The Agena in orbit",
    layout: "alone",
    parts: ["agena"],
  },
  {
    ship: "agena",
    at: at("005:52:37.1", DOCKING),
    label: "Docked: drawn with the spacecraft",
    layout: "docked",
    parts: [],
  },
  {
    ship: "agena",
    at: at("044:40:16", UNDOCKING),
    label: "Left in orbit",
    layout: "alone",
    parts: ["agena"],
  },

  /* The Gemini VIII Agena, drawn from the start of the chase. */
  {
    ship: "agena-8",
    at: at("044:40:16", UNDOCKING),
    label: "The old Agena, waiting in orbit",
    layout: "alone",
    parts: ["agena"],
  },

  /* The spacecraft on its Titan II, then on its own and docked. */
  {
    ship: "gemini",
    at: at("000:00:00", launchEvent("Lift-off (pad disconnect separation) (22:20:26.648 G.m.t.)")),
    label: "Lift-off",
    layout: "launch",
    parts: ["titan-first-stage", "titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    // 153.10 seconds after lift-off.
    at: at("000:02:33.1", launchEvent("Stage separation begin")),
    label: "The first stage falls away",
    layout: "launch",
    parts: ["titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    // 371.44 seconds after lift-off.
    at: at("000:06:11.44", launchEvent("Spacecraft separation (shaped charge fired)")),
    label: "In orbit",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("005:52:37.1", DOCKING, ...BLUNT_END_FORWARD_DOCKED),
    label: "Docked with the Agena",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("023:24:00", STANDUP, STANDUP_PERIOD),
    label: "The hatch opens for the standup spacewalk",
    layout: "docked",
    parts: [...DOCKED, "open-hatch"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("023:27:00", STANDUP_STANDING),
    label: "Standup spacewalk: Collins stands in the open hatch",
    layout: "docked",
    parts: [...DOCKED, "standup-spacewalker"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("024:13:00", STANDUP, STANDUP_PERIOD),
    label: "Hatch closed",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("044:40:16", UNDOCKING),
    label: "Undocked",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("048:42:00", UMBILICAL_START, UMBILICAL_EGRESS, UMBILICAL_PERIOD),
    label: "Umbilical spacewalk: Collins goes to the old Agena",
    layout: "alone",
    parts: [...GEMINI, "spacewalker"],
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("049:20:00", UMBILICAL_END, UMBILICAL_HATCH_CLOSED, UMBILICAL_PERIOD),
    label: "Collins back inside, hatch closed",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("050:30:00", JETTISON_PERIOD, JETTISON),
    label: "Hatch open to throw out used equipment",
    layout: "alone",
    parts: [...GEMINI, "open-hatch"],
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("050:34:00", JETTISON_PERIOD),
    label: "Hatch closed",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("070:08:37", event("Equipment adapter separation"), RETROFIRE_ATTITUDE),
    label: "The equipment section comes off, blunt end forward for retrofire",
    layout: "alone",
    parts: ["gemini-retro-section", "gemini-reentry-module"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("070:11:16.8", RETRO_SECTION),
    label: "The retrograde section comes off",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
  {
    ship: "gemini",
    at: at("070:41:34", event("Drogue parachute deployment")),
    label: "Drogue parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-drogue-parachute"],
  },
  {
    ship: "gemini",
    at: at("070:42:51", event("Pilot parachute deployment, main parachute initiation")),
    label: "Main parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-main-parachute"],
  },
  {
    ship: "gemini",
    at: at(
      "070:46:39",
      event("Landing"),
      report('Section 6.3.4, "Postretrieval Procedures" (page 6-33, PDF page 369), item (g): "The main parachute attach points released normally" (the release is not timed; the model lets the parachute go at landing)'),
    ),
    label: "Floating, parachute let go",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
];

/** Nothing of Gemini X stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
