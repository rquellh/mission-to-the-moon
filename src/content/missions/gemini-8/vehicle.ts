/**
 * How the Gemini VIII vehicles changed shape and turned during the flight,
 * for the 3D models. Each entry is a cited moment from which one ship of
 * the flight path ("gemini" or "agena", see flight.ts) is made of
 * the listed parts, faces the listed way, and turns as listed, until that
 * ship's next entry. The scene draws simplified models from these; it does
 * not show any of this as text (no time, rate, or attitude here is shown
 * on screen).
 *
 * Every time is copied from the Gemini Program Mission Report for Gemini
 * VIII (MSC-G-R-66-4): the spacecraft's from Table 4.2-I ("Sequence of
 * Events - Gemini Space Vehicle"), the Agena's from Table 4.2-II ("Gemini
 * Atlas-Agena Target Vehicle Sequence of Events"), and a few from the
 * report's text, named in each citation. A few times are ours, and their
 * citations say so: the six roll surges while docked, the end of the roll
 * at 30 degrees per second after undocking (a sum), and the retrograde
 * section's jettison (see below). Table 4.2-II prints the Agena's
 * times in seconds from its own lift-off; on the mission clock they are
 * those seconds minus 6059.262, our arithmetic (see flight.ts).
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
 *   reading). Its turnaround is drawn at the start of station keeping,
 *   5:56:56 (section 7.1.1.2.3, page 7-4), the time the story uses too. The
 *   flight path brings the spacecraft beside the Agena a little earlier, at
 *   5:55:00, when section 4.3.1.2.1 (page 4-19) puts it about 150 feet away
 *   (see flight.ts).
 *
 * Gaps in the sources, and how they are handled:
 * - The retrograde section: the report says it was jettisoned after
 *   retrofire (section 7.1.2.11, page 7-22) but prints no time. The model
 *   drops it at 010:05:38.9, thirty seconds after the last retrorocket
 *   burned out (flight.ts, RETROFIRE_END). That time is ours.
 * - The roll while docked, 07:00:26.7 to 07:15:12.3, is drawn as a series
 *   of changes at the moments the report prints (section 5.1.5, pages 5-25
 *   and 5-26; the crew's account, section 7.1.1.4, pages 7-6 and 7-7), with
 *   the rate the report gives wherever it gives one. Between two changes
 *   the rate changes evenly, which is our simplification (thruster 8 fired
 *   for 4.9 seconds, stopped for 4, then fired again, and the drawn rise
 *   does not show that).
 *   - 07:00:26.7, thruster 8 starts firing: from steady (the pair was "very
 *     stable after docking") up to the published "approximately 15 deg/sec"
 *     at 07:00:38, when the crew turned on Gemini's thruster controls (the
 *     report gives that rate at the switch to direct mode "about 2 seconds
 *     later"). The drawn rise passes 5 degrees per second about 4 seconds
 *     in; the report says the pilot saw 5 deg/sec "a few seconds later".
 *   - 07:00:38 to 07:01:36.4: the crew stopped the roll and it came back,
 *     "several times"; how often and how fast is not published. Drawn as an
 *     even slowdown from 15 to zero: an illustration.
 *   - 07:01:36.4, rate command: the roll was "reduced to zero". Drawn at
 *     zero from then (how quickly it got there is not published).
 *   - 07:01:50.6, pulse mode: the roll built up again; 07:01:58, rate
 *     command again: roll "held at a constant rate". Neither rate is
 *     published. Drawn rising to 5 degrees per second and held there: an
 *     illustration.
 *   - 07:02:37.4, thruster 8 stops: "the roll rate was stopped immediately"
 *     and the pair stayed "essentially stable" until 07:07:20.3. Drawn at
 *     zero (the slight rates after 07:02:54.6 are not drawn).
 *   - 07:07:20.3, thruster 8 fires again: the crew kept the rates low, but
 *     six times the roll went above 10 deg/sec, for 15 to 20 seconds each,
 *     about 100 seconds in all, never above 20, and each time it was
 *     brought back to near zero. The report gives the number and length of
 *     these six intervals, but not their times or their peak rates. Drawn
 *     as six surges at 15 degrees per second, 17 seconds each (102 seconds
 *     in all), starting at 07:08:00 and every 1 minute 15 seconds after,
 *     with zero between them: an illustration. After the last, the rate
 *     rises to the published 5 deg/sec at undocking.
 *   The report's plot of the roll rate during the anomaly (figure
 *   5.1.5-19, printed page 5-60) is not in the copy cited: printed pages
 *   5-59 to 5-64 are missing from the scan.
 * - The spin after undocking:
 *   - 07:15:12.3, undocking: 5 deg/sec in roll (page 7-7; page 5-26 prints
 *     -5), up to the published 30 deg/sec "by 17 seconds after separation"
 *     (page 7-7; section 4.1, page 4-4: "As rates increased to 30
 *     deg/sec"), at 07:15:29.3 (our sum).
 *   - 07:15:29.3 to 07:15:44.7: the crew's switch to rate command brought
 *     "some reduction in roll rate"; by how much is not published. Drawn
 *     steady at 30.
 *   - 07:15:44.7, the control electronics lose power: the rate rose to 296
 *     deg/sec "over the next three minutes" (page 5-26). Drawn rising
 *     evenly from 30 to 296 at 07:18:15.7, when the thruster's torque
 *     stopped. Three minutes from 07:15:44.7 would be 07:18:44.7, but with
 *     the torque gone at 07:18:15.7 and no reentry thruster fired until
 *     07:19:03.8, the rate could not have kept rising after 07:18:15.7 (our
 *     reading). The even rise is our simplification; the report notes
 *     short periods of intermittent or degraded thruster 8 performance.
 *   - 07:18:15.7 to 07:19:03.8: held at 296. 07:19:03.8, the reentry
 *     thrusters fire: down evenly to steady at 07:25:30 (the report says
 *     only that the rates "were slowly decreased"; the even fall is ours).
 *   - Direction: the report prints the roll rate at undocking as -5 deg/sec
 *     (page 5-26) and calls thruster 8 the "yaw left-roll left" thruster
 *     (section 1.0, page 1-3), so the minus sign is a roll to the left (our
 *     reading; the sections cited do not state the spacecraft's sign
 *     convention). A motion's `rate` is a speed ("How fast, in degrees per
 *     second", src/content/vehicle-types.ts), with no convention that ties
 *     a sign to the crew's left or right, so every rate here is written as
 *     a positive speed and the direction of the roll is not drawn.
 *   - The tumbling in pitch and yaw is not drawn.
 * - The Atlas is drawn as one piece; its booster section's separation
 *   (132.75 seconds) is not drawn. Nor are the pilot parachute, the
 *   Agena's tumbling just after undocking (its rates are not published),
 *   or the spacecraft's attitude under the main parachute.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Citations, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehicleMotion, VehiclePart } from "../../vehicle-types.ts";

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

/**
 * Section 5.1.5 of the report, on the thruster failure: a quotation as
 * printed, then (outside the quotation marks) any note of ours.
 */
const CONTROL_ANALYSIS = (page: "5-25" | "5-26", quote: string, note?: string): Citation =>
  report(`Section 5.1.5, "Guidance and Control System" (page ${page}): "${quote}"${note ? `; ${note}` : ""}`);

/** Section 7.1.1.4 of the report, the crew's account of the control problem: a quotation, then any note of ours. */
const CREW_ACCOUNT = (page: "7-6" | "7-7", quote: string, note?: string): Citation =>
  report(`Section 7.1.1.4, "Control systems" (page ${page}): "${quote}"${note ? `; ${note}` : ""}`);

const STATION_KEEPING = report(
  'Section 7.1.1.2.3, "Station keeping and docking" (page 7-4): "Station keeping began at 5:56:56 g.e.t., or about 42 minutes after TPI, at a range of 150 feet."',
);
const BLUNT_END_FORWARD = report(
  'Section 7.1.2.5, "Terminal phase" (page 7-19): the braking maneuvers "culminated in station keeping at 150 feet along the local horizontal and in a blunt-end-forward (BEF) attitude"',
);
const RETRO_ADAPTER = report(
  'Section 7.1.2.11, "Retrofire" (page 7-22): "No change in these values was noted as the retro adapter was jettisoned" (after retrofire; no time is printed, so the time used is ours)',
);

/**
 * A roll (degrees per second, a speed: the direction is not drawn; see the
 * header), steady, or changing evenly to `to` by the ship's next change.
 */
function roll(rate: number, citations: Citations, to?: { rate: number; citations: Citations }): VehicleMotion[] {
  return [
    {
      kind: "roll",
      rate: { value: rate, citations },
      ...(to ? { rateTo: { value: to.rate, citations: to.citations } } : {}),
    },
  ];
}

/* The roll while docked. */
const STABLE_AFTER_DOCKING = CREW_ACCOUNT(
  "7-6",
  "The spacecraft-GATV combination was very stable after docking and after performing a 90-degree yaw maneuver.",
);
const FIRST_ROLL_SEEN = CREW_ACCOUNT(
  "7-6",
  "A few seconds later, the pilot noticed a 5 deg/sec roll rate on the Flight Director Attitude Indicator",
  "the drawn rise from zero passes 5 degrees per second about 4 seconds after 7:00:26.7 (our arithmetic)",
);
const ROLL_15 = CREW_ACCOUNT(
  "7-6",
  "The OAMS attitude-control power was turned on at 7:00:38 and the direct mode was selected about 2 seconds later. The roll rate had increased to approximately 15 deg/sec.",
  "the drawing reaches 15 at 7:00:38, the time printed",
);
const NULLED_SEVERAL_TIMES = CREW_ACCOUNT(
  "7-6",
  "The spacecraft-GATV combination was quickly stabilized but when the hand controller was released, the rates built up again in yaw and roll. The command pilot nulled the rates several times and then switched the spacecraft to RATE COMMAND at 7:01:36.4 g.e.t.",
  "how many times, and at what rates, is not published: the even slowdown from 15 to zero drawn here is an illustration",
);
const RATE_COMMAND = CREW_ACCOUNT(
  "7-6",
  "switched the spacecraft to RATE COMMAND at 7:01:36.4 g.e.t. The roll rates of the combination were reduced to zero",
  "how quickly is not published; drawn at zero from 7:01:36.4",
);
const PULSE_MODE = CREW_ACCOUNT(
  "7-7",
  "Pulse mode was selected at 7:01:50.6 g.e.t., and the rates built up in all three axes, but primarily in roll.",
  "no rate is published: the rise to 5 degrees per second drawn here is an illustration",
);
const HELD_CONSTANT = CREW_ACCOUNT(
  "7-7",
  "The crew again selected RATE COMMAND at 7:01:58 g.e.t. and the pitch and yaw were nulled, but roll was only held at a constant rate with thrusters 3, 4, 7, and 8 on.",
  "the constant rate is not published: the 5 degrees per second drawn here is an illustration",
);
const THRUSTER_STOPS = CREW_ACCOUNT(
  "7-7",
  "Thruster 8 apparently stopped firing at 7:02:37.4 g.e.t. and the roll rate was stopped immediately. The docked vehicle combination remained essentially stable for approximately 5 minutes",
);
const THRUSTER_STOPS_ANALYSIS = CONTROL_ANALYSIS(
  "5-25",
  "At 7:02:37.4 g.e.t., the dynamic responses indicate that thruster 8 stopped firing, although the telemetry indication remained ON.",
);
const TROUBLE_RETURNS = CREW_ACCOUNT(
  "7-7",
  "At 7:07:20.3 g.e.t., thruster 8 again began firing, producing rates primarily in the roll and yaw axes; however, the crew was able to maintain the rates at relatively low levels.",
);
const TROUBLE_RETURNS_ANALYSIS = report(
  'Section 5.1.5, "Guidance and Control System" (pages 5-25 and 5-26): "At 7:07:20.3 g.e.t., after an interval of 4 minutes 42.9 seconds, the original disturbance returned, indicating that thruster no. 8 was again operating at or near full thrust."',
);
const SIX_INTERVALS_QUOTE =
  "the roll rate did exceed 10 deg/sec for a total of approximately 100 seconds in six 15-to-20 second intervals. Each time the roll rate exceeded 10 deg/sec, it was quickly brought back to near zero using the direct control mode, and did not exceed 20 deg/sec at any time prior to undocking.";
/** When the six intervals were: not published. */
const SURGE_TIME = CONTROL_ANALYSIS(
  "5-26",
  SIX_INTERVALS_QUOTE,
  "the report gives the number and length of these six intervals but not their times: this time is ours, an illustration (six surges of 17 seconds, starting at 07:08:00 and every 1 minute 15 seconds after)",
);
/** How fast the roll was in the six intervals: only bounds are published. */
const SURGE_RATE = CONTROL_ANALYSIS(
  "5-26",
  SIX_INTERVALS_QUOTE,
  "the report gives bounds, not the rate: the 15 degrees per second drawn here is ours, an illustration between the published 10 and 20",
);
const BACK_TO_NEAR_ZERO = CONTROL_ANALYSIS("5-26", SIX_INTERVALS_QUOTE, "drawn at zero between the surges");

/* The spin after undocking. */
const ROLL_AT_UNDOCKING: Citations = [
  CREW_ACCOUNT("7-7", "The rates just prior to separation were 3 deg/sec in pitch, 5 deg/sec in roll, and 2 deg/sec in yaw."),
  CONTROL_ANALYSIS(
    "5-26",
    "Separation from the GATV occurred at 7:15:12.3 g.e.t. with thrusters 11 and 12 firing for 6.6 seconds. Rates at this time were +3, -5, and -2 deg/sec in pitch, roll, and yaw, respectively.",
    "the sign gives the direction, which is not drawn (see the header)",
  ),
];
const ROLL_30: Citations = [
  CREW_ACCOUNT(
    "7-7",
    "However, the roll rate rapidly diverged to 30 deg/sec by 17 seconds after separation and the crew switched the ACME to RATE COMMAND, with some reduction in roll rate.",
    "7:15:12.3 plus 17 seconds is 7:15:29.3 (our sum); how much the rate was reduced is not published, so it is drawn steady at 30 until 7:15:44.7",
  ),
  report(
    'Section 4.1 (page 4-4): "As rates increased to 30 deg/sec, the crew selected the OAMS rate-command mode. Rates were reduced a slight amount; however, the Attitude Control and Maneuver Electronics (ACME) bias power was inadvertently interrupted, which deactivated the hand controller and prevented the crew from controlling the spacecraft."',
  ),
];
const ROLL_PEAK = CONTROL_ANALYSIS(
  "5-26",
  "At 7:15:44.7 g.e.t., the ACME bias power was inadvertantly removed, disabling the control system, and the roll rate increased to 296 deg/sec over the next three minutes, due to the uncontrolled firing of thruster 8, although short periods of intermittent or degraded thruster 8 performance appeared to exist.",
  "the drawing reaches 296 at 7:18:15.7, when the thruster's torque stopped, and rises evenly to it (our simplification; see the header)",
);
const TORQUE_STOPS = CONTROL_ANALYSIS(
  "5-26",
  "The disturbance torque from thruster 8 ceased at 7:18:15.7 g.e.t. when the OAMS attitude-thruster circuit breakers were opened.",
);
const RCS_FIRES = CONTROL_ANALYSIS("5-26", "no RCS thrusters were fired until 7:19:03.8 g.e.t.");
const STEADY: Citations = [
  report(
    'Section 4.1 (page 4-4): "Angular rates were slowly decreased using the RCS B-ring and the spacecraft was finally brought to a stable attitude at 7:25:30 g.e.t."',
  ),
  sequence("Rates under control", "4-11"),
];

/** An illustrative time inside the six intervals (see SURGE_TIME). */
const surgeAt = (elapsed: ElapsedTime): Cited<ElapsedTime> => at(elapsed, SURGE_TIME);

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = ["gemini-equipment-section", "gemini-retro-section", "gemini-reentry-module"];
const DOCKED: readonly VehiclePart[] = [...GEMINI, "agena"];

/** Seconds on the mission clock, from "hhh:mm:ss.s" (times after lift-off). */
function secondsOf(elapsed: ElapsedTime): number {
  const [h = "0", m = "0", s = "0"] = elapsed.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** How long each drawn surge lasts: ours, inside the published 15 to 20 seconds, about 100 seconds for all six. */
const SURGE_SECONDS = 17;

const DAMPED_FOR_UNDOCKING = CREW_ACCOUNT(
  "7-7",
  "The rates were damped to what the crew determined to be a safe level, and a normal undocking was accomplished at 7:15:12.3 g.e.t.",
  "drawn as an even rise from zero after the last surge to the published 5 deg/sec at undocking",
);

/**
 * The six intervals after 07:07:20.3 in which the docked pair's roll went
 * above 10 deg/sec: each drawn as a surge at 15 degrees per second, brought
 * back to zero 17 seconds later. Their times and rate are ours, an
 * illustration (see the header). After the last one, the rate rises evenly
 * to the published 5 deg/sec at undocking.
 */
function rollSurges(starts: readonly ElapsedTime[]): VehicleChange[] {
  return starts.flatMap((start, index): VehicleChange[] => {
    const last = index === starts.length - 1;
    return [
      {
        ship: "gemini",
        at: surgeAt(start),
        label: `Roll surge ${index + 1} of ${starts.length}, above 10 deg/sec (the report gives the number and length of these surges but not their times; the time and rate drawn are an illustration)`,
        layout: "docked",
        parts: DOCKED,
        facing: "backward",
        motion: roll(15, [SURGE_RATE]),
      },
      {
        ship: "gemini",
        at: surgeAt(clockTime(secondsOf(start) + SURGE_SECONDS)),
        label: last
          ? "Brought back to near zero, then damped to a safe rate for undocking (time drawn is an illustration)"
          : "Brought back to near zero (time drawn is an illustration)",
        layout: "docked",
        parts: DOCKED,
        facing: "backward",
        motion: last
          ? roll(0, [BACK_TO_NEAR_ZERO], { rate: 5, citations: [DAMPED_FOR_UNDOCKING, ...ROLL_AT_UNDOCKING] })
          : roll(0, [BACK_TO_NEAR_ZERO]),
      },
    ];
  });
}

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
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
    at: at("005:56:56", STATION_KEEPING, BLUNT_END_FORWARD),
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

  /*
   * The roll while docked, change by change (see the header). Every change
   * from here to the end of the spin carries a roll, a rate of zero where
   * the roll was stopped, so the drawn attitude carries on from one change
   * to the next instead of snapping back square.
   */
  {
    ship: "gemini",
    at: at("007:00:26.7", sequence("Thruster anomaly start", "4-11")),
    label: "Thruster 8 starts firing and the docked pair starts to roll",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
    motion: roll(0, [STABLE_AFTER_DOCKING], { rate: 15, citations: [ROLL_15, FIRST_ROLL_SEEN] }),
  },
  {
    ship: "gemini",
    at: at("007:00:38", ROLL_15),
    label: "Gemini's thrusters switched on: the roll is stopped and comes back several times (drawn as an even slowdown, an illustration)",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
    motion: roll(15, [ROLL_15], { rate: 0, citations: [NULLED_SEVERAL_TIMES, RATE_COMMAND] }),
  },
  {
    ship: "gemini",
    at: at("007:01:36.4", RATE_COMMAND),
    label: "Rate command: the roll is stopped",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
    motion: roll(0, [RATE_COMMAND]),
  },
  {
    ship: "gemini",
    at: at("007:01:50.6", PULSE_MODE),
    label: "Pulse mode: the roll builds up again (its rate is not published; drawn as an illustration)",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
    motion: roll(0, [RATE_COMMAND], { rate: 5, citations: [PULSE_MODE] }),
  },
  {
    ship: "gemini",
    at: at("007:01:58", HELD_CONSTANT),
    label: "Rate command again: the roll is held at a constant rate (not published; drawn as an illustration)",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
    motion: roll(5, [HELD_CONSTANT]),
  },
  {
    ship: "gemini",
    at: at("007:02:37.4", THRUSTER_STOPS, THRUSTER_STOPS_ANALYSIS),
    label: "Thruster 8 stops and the pair holds steady",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
    motion: roll(0, [THRUSTER_STOPS]),
  },
  {
    ship: "gemini",
    at: at("007:07:20.3", TROUBLE_RETURNS, TROUBLE_RETURNS_ANALYSIS),
    label: "Thruster 8 fires again; the crew holds the rates low",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
    motion: roll(0, [TROUBLE_RETURNS, BACK_TO_NEAR_ZERO]),
  },
  ...rollSurges(["007:08:00", "007:09:15", "007:10:30", "007:11:45", "007:13:00", "007:14:15"]),

  /* The spin after undocking (see the header). */
  {
    ship: "gemini",
    at: at("007:15:12.3", sequence("Undocking", "4-11")),
    label: "Undocked, rolling faster",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(5, ROLL_AT_UNDOCKING, { rate: 30, citations: ROLL_30 }),
  },
  {
    ship: "gemini",
    at: at("007:15:29.3", ...ROLL_30),
    label: "Rate command: the roll slows slightly (by how much is not published; drawn steady)",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(30, ROLL_30),
  },
  {
    ship: "gemini",
    at: at("007:15:44.7", ROLL_PEAK),
    label: "The control electronics lose power and the spin speeds up",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(30, ROLL_30, { rate: 296, citations: [ROLL_PEAK] }),
  },
  {
    ship: "gemini",
    at: at("007:18:15.7", sequence("TCA no. 8 circuit breaker off", "4-11"), TORQUE_STOPS),
    label: "The stuck thruster stops",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(296, [ROLL_PEAK, TORQUE_STOPS, RCS_FIRES]),
  },
  {
    ship: "gemini",
    at: at("007:19:03.8", RCS_FIRES),
    label: "The reentry thrusters slow the spin",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
    motion: roll(296, [ROLL_PEAK], { rate: 0, citations: STEADY }),
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
export const leftBehind: readonly LeftBehind[] = [];
