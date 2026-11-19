/**
 * How the Apollo 14 vehicle changed shape during the flight, for the 3D
 * models. Each entry is a cited moment from which one ship of the flight
 * path ("csm" or "lm", see flight.ts) is made of the listed parts, until
 * that ship's next entry. The scene draws simplified models from these; it
 * does not show any of this as text.
 *
 * Times are from Apollo by the Numbers (NASA SP-2000-4029), Apollo 14
 * Timeline, exactly as printed there, counted from range zero; the Apollo 14
 * Mission Report's Table 6-I gives the same times to its rounding.
 *
 * Gaps in the sources, and how they are handled:
 * - The docking trouble: the command and service module separated from the
 *   third stage at 003:02:29.4 and made five tries to dock that did not
 *   latch before the sixth one did, at 004:56:56.7. The model stays in the
 *   turning-around layout for that whole time and shows the docking at the
 *   moment it succeeded; the tries in between are told in the story.
 * - The adapter's panels: their opening is not timed, so the adapter is
 *   drawn until the separation from the third stage and not after it, as
 *   for Apollo 11.
 * - The main parachutes: Apollo by the Numbers' timeline and the Mission
 *   Report's sequence of events do not list them. NASA's onboard voice
 *   transcription of the command module has Roosa's call "And the mains are
 *   out free" at 08 23 56 58 (days, hours, minutes, seconds) of true
 *   mission-elapsed time, which is 215:56:58. That is when the crew saw
 *   them, not a measured deployment time, and the site does not state it as
 *   a fact.
 * - At splashdown the parachutes were jettisoned, though one tangled on the
 *   spacecraft and was later cut loose by the recovery team (Mission Report,
 *   Section 9.15). Neither is timed, so the model removes all three at
 *   splashdown.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const MISSION_REPORT =
  "https://web.archive.org/web/20251201235420/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a14/A14MRntrs.pdf";
const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-008A";
const NMC_LM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-008C";

/** A row of the Apollo by the Numbers Apollo 14 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 14 Timeline, row "${row}"`,
    url: `${ABN}Apollo_14i_Timeline.htm`,
  };
}

/** A row of the Mission Report's Table 6-I, Sequence of Events (page 6-2, PDF page 45). */
function sequence(row: string): Citation {
  return {
    source: "apollo-14-mission-report",
    locator: `Table 6-I, "Sequence of Events" (page 6-2, PDF page 45), "${row}" row`,
    url: MISSION_REPORT,
  };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

const TURNED_AROUND: Citation = {
  source: "apollo-by-the-numbers",
  locator:
    'Apollo 14 mission summary, "Translunar Phase" section: "At 003:02:29.4, the CSM was separated from the S-IVB stage. Transposition occurred normally; however, six docking attempts were required before the CSM was successfully docked with the LM at 004:56:56.7"',
  url: `${ABN}Apollo_14a_Summary.htm`,
};

const STAGE_HELD_THE_LM: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 14 Command and Service Module (CSM)" (1971-008A), Mission Profile: "The CSM separated from the S-IVB stage containing the LM at 00:05:31 UT on 1 February"',
  url: NMC_CSM,
};

const PARACHUTES: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 14 Command and Service Module (CSM)" (1971-008A), Spacecraft and Subsystems, Command Module: the forward compartment held "the three 25.4 m diameter main parachutes, two 5 m drogue parachutes"',
  url: NMC_CSM,
};

const PARACHUTES_RELEASED: Citation = {
  source: "apollo-14-mission-report",
  locator:
    'Section 9.15, Entry and Landing (page 9-28, PDF page 129): "The landing impact was milder than anticipated. The parachutes were jettisoned and the spacecraft remained in the stable I attitude" and "One parachute became entangled on the spacecraft and was cut loose by the recovery team"',
  url: MISSION_REPORT,
};

const LEFT_ON_THE_MOON: Citation = {
  source: "nssdca-master-catalog",
  locator:
    '"Apollo 14 Lunar Module /ALSEP" (1971-008C), Lunar Module Spacecraft and Subsystems: "The descent stage served as a platform for launching the ascent stage and was left behind on the Moon"',
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
    at: at("000:00:00.57", timeline("Liftoff (umbilical disconnected).")),
    label: "Saturn V lifts off",
    layout: "launch",
    parts: ["first-stage", "aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:02:44.8", timeline("S-IC/S-II separation command.")),
    label: "First stage separates",
    layout: "launch",
    parts: ["aft-interstage", "second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:14.8", timeline("S-II aft interstage jettisoned.")),
    label: "Second stage drops its aft interstage",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT, "escape-tower"],
  },
  {
    ship: "csm",
    at: at("000:03:20.7", timeline("Launch escape tower jettisoned.")),
    label: "Launch escape tower jettisoned",
    layout: "launch",
    parts: ["second-stage", "third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("000:09:20.00", timeline("S-II/S-IVB separation command.")),
    label: "Second stage separates",
    layout: "launch",
    parts: ["third-stage", ...SPACECRAFT],
  },
  {
    ship: "csm",
    at: at("003:02:29.4", timeline("CSM separated from S-IVB."), sequence("S-IVB/command module separation"), TURNED_AROUND, STAGE_HELD_THE_LM),
    label: "Kitty Hawk separates from the third stage and turns around",
    layout: "transposition",
    parts: ["third-stage", ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at(
      "004:56:56.7",
      timeline("CSM docked with LM/S-IVB (initial docking latch triggered)."),
      sequence("Translunar docking"),
      TURNED_AROUND,
    ),
    label: "Kitty Hawk docks with Antares on the sixth try",
    layout: "docked-on-stage",
    parts: ["third-stage", ...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("005:47:14.4", timeline("CSM/LM ejected from S-IVB (RCS ignition)."), sequence("Spacecraft ejection")),
    label: "Kitty Hawk pulls Antares free of the third stage",
    layout: "docked",
    parts: [...LUNAR_MODULE, ...CSM],
  },
  {
    ship: "csm",
    at: at("103:47:41.6", timeline("CSM/LM undocking and separation ignition (SM RCS)."), sequence("Lunar module undocking and separation")),
    label: "Antares undocks",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("143:32:50.5", timeline("CSM/LM docked."), sequence("Docking")),
    label: "Antares' ascent stage docks with Kitty Hawk",
    layout: "docked",
    parts: ["lm-ascent-stage", ...CSM],
  },
  {
    ship: "csm",
    at: at("145:44:58.0", timeline("LM ascent stage jettisoned."), sequence("Lunar module jettison")),
    label: "Antares' ascent stage is let go",
    layout: "alone",
    parts: CSM,
  },
  {
    ship: "csm",
    at: at("215:32:42.2", timeline("CM/SM separation."), sequence("Command module/service module separation")),
    label: "Command module separates from the service module",
    layout: "alone",
    parts: ["command-module"],
  },
  {
    ship: "csm",
    at: at("215:56:08", timeline("Drogue parachute deployed"), sequence("Drogue deployment"), PARACHUTES),
    label: "Drogue parachutes open",
    layout: "alone",
    parts: ["command-module", "drogue-parachutes"],
  },
  {
    ship: "csm",
    at: at(
      "215:56:58",
      {
        source: "apollo-14-cm-onboard-transcription",
        locator:
          'Day 9, page 233 (PDF page 239): "08 23 56 58 CMP And there go the drogues. And the mains are out free. Oh, we got all three."; Introduction (page iii, PDF page 3): the time column gives "days, hours, minutes, and seconds", and the onboard-recorded time is "the true mission-elapsed time", which the flight-plan clock updates do not change',
        url: "https://www.nasa.gov/wp-content/uploads/2026/01/as14-cm.pdf",
      },
      PARACHUTES,
    ),
    label: "Main parachutes seen open by the crew",
    layout: "alone",
    parts: ["command-module", "main-parachutes"],
  },
  {
    ship: "csm",
    at: at("216:01:58.1", timeline("Splashdown (went to apex-up)."), sequence("Landing"), PARACHUTES_RELEASED),
    label: "Splashdown; the parachutes are jettisoned (one tangled and was cut loose later)",
    layout: "alone",
    parts: ["command-module"],
  },

  {
    ship: "lm",
    at: at("103:47:41.6", timeline("CSM/LM undocking and separation ignition (SM RCS)."), sequence("Lunar module undocking and separation")),
    label: "Antares undocks",
    layout: "alone",
    parts: LUNAR_MODULE,
  },
  {
    ship: "lm",
    at: at("141:45:40", timeline("LM lunar liftoff ignition (LM APS)."), sequence("Lunar lift-off")),
    label: "Antares' ascent stage lifts off",
    layout: "alone",
    parts: ["lm-ascent-stage"],
  },
  {
    ship: "lm",
    at: at("143:32:50.5", timeline("CSM/LM docked."), sequence("Docking")),
    label: "Docked to Kitty Hawk, and drawn with it",
    layout: "alone",
    parts: [],
  },
];

/** Parts that stay behind. */
export const leftBehind: readonly LeftBehind[] = [
  {
    part: "lm-descent-stage",
    ship: "lm",
    at: at("141:45:40", timeline("LM lunar liftoff ignition (LM APS)."), LEFT_ON_THE_MOON),
    label: "Antares' descent stage stays at Fra Mauro",
  },
];
