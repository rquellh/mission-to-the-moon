/**
 * How the Gemini XII vehicles changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("gemini" or "agena", see flight.ts) is made of the listed parts and
 * faces the listed way, until that ship's next entry. The scene draws
 * simplified models from these; it does not show any of this as text.
 *
 * Times are copied from the Gemini Program Mission Report for Gemini XII
 * (MSC-G-R-67-1): the launch from Table 4.2-I, the orbital and reentry events
 * from Table 4.2-II, the Agena's launch from Table 4.2-III, and the rest from
 * the report's text, named in each citation. Table 4.2-III prints the
 * Agena's times in seconds from its own lift-off; on the mission clock they
 * are those seconds minus 5914.731, our arithmetic (see flight.ts). Page
 * numbers are the report's printed pages, then the scan's PDF pages.
 *
 * Aldrin outside: the "spacewalker" part is listed during each of his three
 * periods outside, from the hatch opening to the hatch closing. During the
 * two standup periods (the first and the third) he stood on his seat with
 * his upper body out of the open hatch; the model draws a figure on a tether
 * beside the hatch, so for those two periods it is the closest picture the
 * scene has, an illustration. During the umbilical spacewalk he moved along
 * the spacecraft and the Agena; where the model floats him is an
 * illustration too.
 *
 * Which way the craft point:
 * - From separation the spacecraft is drawn nose forward: it made its
 *   rendezvous maneuvers with its aft-firing thrusters, which push it
 *   forward (section 4.3.1.2; our reading).
 * - While docked it is drawn blunt end forward: the pair was turned "to
 *   Target Docking Adapter (TDA) forward", the Agena's docking end, where
 *   Gemini's nose was, leading (section 7.1.2.6). The other attitudes they
 *   held while docked (for example "TDA south" for the umbilical spacewalk,
 *   section 7.1.2.8.2) are not drawn.
 * - After the tether exercise it is drawn nose forward again: during the
 *   last standup period "the spacecraft was maintained small end forward
 *   (SEF)" (section 7.1.2.8.2).
 * - From the equipment section's separation it is drawn blunt end forward,
 *   the attitude for retrofire (section 7.1.2.10). The turn itself, made
 *   early because of the weak thrusters, is not drawn: no time is printed.
 * - The Agena is drawn with its docking cone forward throughout. Its
 *   pointing straight down at Earth for the tether exercise (section 7.1.2.9)
 *   is not drawn.
 *
 * Gaps in the sources, and how they are handled:
 * - The retrograde section: the report prints no time for its jettison. The
 *   model drops it at 094:00:47.2, thirty seconds after retrofire ended
 *   (flight.ts, RETROFIRE_END). That time is ours.
 * - The undockings and redockings of the docking practice (section 7.1.2.6)
 *   have no printed undocking times; the pair is drawn docked throughout.
 * - The tether between the two craft has no model and is not drawn.
 * - The Atlas is drawn as one piece; its booster section's separation
 *   (134.66 seconds, Table 4.2-III) is not drawn. Nor are the pilot
 *   parachute or the spacecraft's attitude under the main parachute.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = "https://www.ibiblio.org/apollo/Documents/Gemini12MissionReport.pdf";

function report(locator: string): Citation {
  return { source: "gemini-12-mission-report", locator, url: MISSION_REPORT };
}

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

/** A row of Table 4.2-I, the launch phase, actual time. */
const launchEvent = (row: string): Citation =>
  report(`Table 4.2-I, "Sequence of Events for Gemini Space Vehicle Launch Phase" (page 4-9, PDF page 85), row "${row}", actual time`);
/** A row of Table 4.2-II, the orbital and reentry phases, actual time. */
const flightEvent = (row: string): Citation =>
  report(`Table 4.2-II, "Sequence of Events for Gemini Spacecraft Orbital and Reentry Phases" (page 4-10, PDF page 86), row "${row}", actual time`);
/** A row of Table 4.2-III, the Atlas-Agena's launch, actual time from the Agena's lift-off. */
const agenaEvent = (row: string): Citation =>
  report(`Table 4.2-III, "Sequence of Events for GAATV Launch Phase" (page 4-11, PDF page 87), row "${row}", actual time`);

const AGENA_LEAD_SECONDS = 5914.731;
const AGENA_LEAD = report(
  'Section 4.1, "Actual Mission" (page 4-1, PDF page 75): "One hour 38 minutes 34.731 seconds after the GAATV lift-off, the Gemini Space Vehicle was launched" (the Agena\'s times on the mission clock are its printed seconds minus 5914.731, our arithmetic)',
);

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

/** A Table 4.2-III time (seconds from the Agena's lift-off) on Gemini XII's clock. */
function agenaAt(secondsFromAgenaLiftoff: number, row: string): Cited<ElapsedTime> {
  return at(clockTime(secondsFromAgenaLiftoff - AGENA_LEAD_SECONDS), agenaEvent(row), AGENA_LEAD);
}

/** A Table 4.2-I time (seconds from lift-off) on the mission clock. */
function launchAt(secondsFromLiftoff: number, row: string): Cited<ElapsedTime> {
  return at(clockTime(secondsFromLiftoff), launchEvent(row));
}

const DOCKING = report('Section 4.1, "Actual Mission" (page 4-1, PDF page 75): "The initial docking occurred at 4:13:52 g.e.t"');
const TDA_FORWARD = report(
  'Section 7.1.2.6, "GATV operations" (page 7-26, PDF page 411): "No problems were encountered with the docking, the gyrocompassing to Target Docking Adapter (TDA) forward, or the subsequent undocking and GATV fly-around."',
);
const FORWARD_THRUSTERS = report(
  'Section 4.3.1.2, "Orbit" (page 4-15, PDF page 91): at the phase-adjust maneuver "A horizontal posigrade ΔV of 66.7 ft/sec was applied with the aft-firing thrusters" (nose forward is our reading)',
);
const SMALL_END_FORWARD = report(
  'Section 7.1.2.8.2, "Sequence of events" (page 7-30, PDF page 415): during the second standup EVA, "Because of attitude thruster problems, the spacecraft was maintained small end forward (SEF)"',
);
const BLUNT_END_FORWARD = report(
  'Section 7.1.2.10, "Reentry" (page 7-31, PDF page 416): "Because of the degraded OAMS thrusters, spacecraft alignment blunt end forward (BEF) was started early to assure adequate time for the alignment."',
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
  /* The Agena on its Atlas. */
  {
    ship: "agena",
    at: at("-001:38:34.731", agenaEvent("Lift-off (19:07:58.688 G.m.t.)"), AGENA_LEAD),
    label: "The Atlas-Agena lifts off",
    layout: "launch",
    parts: ["atlas", "agena", "agena-shroud"],
  },
  {
    ship: "agena",
    at: agenaAt(300.3, "TLV/GATV separation (retrorocket fire)"),
    label: "The Atlas falls away",
    layout: "launch",
    parts: ["agena", "agena-shroud"],
  },
  {
    ship: "agena",
    at: agenaAt(381.72, "Fire jettison nose shroud squibs"),
    label: "The nose shroud comes off",
    layout: "launch",
    parts: ["agena"],
  },
  {
    ship: "agena",
    at: agenaAt(555.85, "Velocity meter cutoff"),
    label: "The Agena in orbit",
    layout: "alone",
    parts: ["agena"],
  },
  {
    ship: "agena",
    at: at("004:13:52", DOCKING),
    label: "Docked: drawn with the spacecraft",
    layout: "docked",
    parts: [],
  },
  {
    ship: "agena",
    at: at(
      "047:23:00",
      report('Section 4.1, "Actual Mission" (page 4-3, PDF page 77): "The tether evaluation was initiated at 47 hours 23 minutes g.e.t., with the third undocking" (given to the minute; seconds written as 00)'),
    ),
    label: "Undocked, tied by the tether, then left in orbit",
    layout: "alone",
    parts: ["agena"],
  },

  /* The spacecraft on its Titan II, then on its own. */
  {
    ship: "gemini",
    at: at("000:00:00", launchEvent("Lift-off (pad disconnect separation) (20:46:33.419 G.m.t.)")),
    label: "Lift-off",
    layout: "launch",
    parts: ["titan-first-stage", "titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    // 155.45 seconds after lift-off.
    at: launchAt(155.45, "Stage separation begin"),
    label: "The first stage falls away",
    layout: "launch",
    parts: ["titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    // 366.72 seconds after lift-off.
    at: at("000:06:06.72", launchEvent("Spacecraft separation (shape charge fired)"), FORWARD_THRUSTERS),
    label: "In orbit",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("004:13:52", DOCKING, TDA_FORWARD),
    label: "Docked with the Agena, its docking end forward",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at(
      "019:29:00",
      report('Section 4.1, "Actual Mission" (page 4-2, PDF page 76): the standup EVA, "with hatch opening at 19 hours 29 minutes g.e.t" (given to the minute; seconds written as 00)'),
    ),
    label: "Aldrin stands up in the open hatch",
    layout: "docked",
    parts: [...DOCKED, "spacewalker"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: {
      ...at(
        "021:58:00",
        report('Section 4.1, "Actual Mission" (page 4-2, PDF page 76): "repressurization beginning at 21 hours 58 minutes g.e.t." (given to the minute; seconds written as 00)'),
        report('Section 1.0, "Mission Summary" (page 1-2, PDF page 36): "During the 2 hours 29 minutes the pilot was outside the spacecraft"'),
      ),
      discrepancy: "Section 7.1.1.4 (page 7-3, PDF page 388) says the crew began repressurizing the cabin at 22 hours 2 minutes. We follow sections 4.1 and 1.0.",
    },
    label: "The hatch is closed",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("042:48:26", report('Section 4.1, "Actual Mission" (page 4-2, PDF page 76): "The hatch was opened at 42:48:26 g.e.t."')),
    label: "Aldrin goes outside on his umbilical",
    layout: "docked",
    parts: [...DOCKED, "spacewalker"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at(
      "044:55:00",
      report('Section 4.1, "Actual Mission" (page 4-2, PDF page 76): "The spacecraft hatch was closed at 44 hours 55 minutes g.e.t." (given to the minute; seconds written as 00)'),
    ),
    label: "Back inside",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at(
      "047:23:00",
      report('Section 4.1, "Actual Mission" (page 4-3, PDF page 77): "The tether evaluation was initiated at 47 hours 23 minutes g.e.t., with the third undocking" (given to the minute; seconds written as 00)'),
    ),
    label: "Undocked, tied to the Agena by the tether",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: {
      ...at(
        "066:06:00",
        report('Section 1.0, "Mission Summary" (page 1-3, PDF page 37): "At 66 hours 6 minutes, the hatch was opened for the extravehicular activity" (given to the minute; seconds written as 00)'),
        SMALL_END_FORWARD,
      ),
      discrepancy:
        "Section 4.1 (page 4-3, PDF page 77) gives cabin depressurization at 66:05:55, and section 7.1.1.4 (page 7-4, PDF page 389) gives the hatch opening as 66 hours 8 minutes. We follow section 1.0.",
    },
    label: "Aldrin stands up in the open hatch again",
    layout: "alone",
    parts: [...GEMINI, "spacewalker"],
    facing: "forward",
  },
  {
    ship: "gemini",
    at: {
      ...at(
        "067:01:00",
        report('Section 1.0, "Mission Summary" (page 1-3, PDF page 37): "the hatch was closed at 67 hours 1 minute" (given to the minute; seconds written as 00)'),
      ),
      discrepancy: "Section 4.1 (page 4-3, PDF page 77) gives cabin repressurization at 67:03:03. We follow section 1.0.",
    },
    label: "The last hatch closing of the Gemini program",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("093:59:03", flightEvent("Equipment adapter separation"), BLUNT_END_FORWARD),
    label: "The equipment section comes off, blunt end forward for retrofire",
    layout: "alone",
    parts: ["gemini-retro-section", "gemini-reentry-module"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at(
      "094:00:47.2",
      report('Section 5.1.8.2, "Reentry Control System" (page 5-80, PDF page 258): "End retrofire" at 94:00:17.2; the retrograde section\'s jettison has no printed time, so the model drops it thirty seconds later (our time)'),
      { source: "nssdca-master-catalog", locator: '"Gemini 12" (1966-104A), Reentry: "The retrorocket module would then be jettisonned, exposing the heat shield"', url: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-104A" },
    ),
    label: "The retrograde section comes off",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
  {
    ship: "gemini",
    at: at("094:29:10", flightEvent("Drogue deployment")),
    label: "Drogue parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-drogue-parachute"],
  },
  {
    ship: "gemini",
    at: at("094:30:35", flightEvent("Pilot parachute deployment, main parachute initiation")),
    label: "Main parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-main-parachute"],
  },
  {
    ship: "gemini",
    at: at(
      "094:34:30",
      flightEvent("Landing"),
      report('Section 6.3.2, "Location and Retrieval" (page 6-28, PDF page 365): the parachute jettison switch "was activated by the flight crew upon landing"'),
    ),
    label: "Floating, parachute let go",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
];

/** Nothing of Gemini XII stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
