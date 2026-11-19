/**
 * How the Gemini IX-A spacecraft and its target changed shape during this
 * flight, for the 3D models. Each entry is a cited moment from which one
 * ship of the flight path ("gemini" or "atda", see flight.ts) is made of the
 * listed parts, faces the listed way, and turns as listed, until that ship's
 * next entry. The scene draws simplified models from these; it does not show
 * any of this as text.
 *
 * The Gemini IX-A mission report was not found, so the spacecraft's moments
 * are the crew's and capsule communicators' calls in the Gemini IX-A
 * air-to-ground and onboard transcript (ground elapsed time as printed
 * there; zero at lift-off, see flight.ts).
 *
 * The ATDA is drawn with its shroud on and half open for the whole flight,
 * the "angry alligator" the crew found: its launch, two days before Gemini
 * IX-A's, is not part of this path.
 *
 * Which way the craft point:
 * - The spacecraft is drawn nose forward until its last orbits (the model's
 *   default). While it keeps station, the scene turns it to face the ATDA.
 *   From the pilot's call to put the spacecraft in retrofire attitude it is
 *   drawn blunt end forward: the retrorockets slowed the craft, so they fired
 *   forward, from its blunt end (our reading, as in the Gemini VIII file).
 * - The ATDA was not stabilized (On the Shoulders of Titans, page 333). It
 *   is drawn rolling about its long axis at a steady 3 degrees per second,
 *   the low end of the "3 to 4 degrees per second" the command pilot gave
 *   at 04:26:33; a few seconds later he said "the basic rate is in roll"
 *   (04:27:59). That reading is the only rate found; holding it for the
 *   whole flight is our simplification. The "very slight bit of yaw" he
 *   mentioned is not drawn.
 *
 * Gaps in the sources, and how they are handled:
 * - Staging is drawn at the pilot's "Oh, there's the fireball!" (00:02:33),
 *   and the spacecraft on its own at the command pilot's call of
 *   second-stage cutoff (00:05:42): it separated from the stage soon after,
 *   at a time not found.
 * - The spacewalk, from the crew's calls, each matching the minute that
 *   Table D of the Gemini chronology's Appendix 1 gives for it: the hatch is
 *   drawn open with no one outside from "We're opening the hatch now"
 *   (49:22:01); Cernan standing in the hatch from "Standing in the seat now"
 *   (49:24:03; Table D, 49:24); floating outside from "Okay. Let it go now"
 *   (49:40:06; Table D, 49:40), when Stafford let go of his foot (our
 *   reading of the calls around it); standing in the hatch again from "We
 *   got Gene back in the hatch" (51:09:03); inside with the hatch still
 *   open from 51:26 (Table D, "Crewman inside"; no call marks it); and the
 *   hatch shut at "We've got the hatch closed" (51:30:23). The minutes about
 *   49:30 to 49:33 when Stafford held him down in the seat to fit the
 *   outside camera are drawn with him standing. The Astronaut Maneuvering
 *   Unit he prepared at the back of the adapter is not drawn (there is no
 *   model for it).
 * - The main parachute is drawn from the pilot's "We're on the main chute at
 *   this time" (72:17:22), and let go at touchdown; its release time is not
 *   printed.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehicleMotion, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const TRANSCRIPT = "https://www.nasa.gov/wp-content/uploads/2026/01/gt09a2-t.pdf";

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

/** A line of the Gemini IX-A transcript: its time as printed, who spoke, and the words (printed page; the PDF page is one more). */
function transcript(time: string, words: string, page: number): Citation {
  return {
    source: "gemini-9a-voice-transcript",
    locator: `Page ${page} (PDF page ${page + 1}), ${time}: "${words}"`,
    url: TRANSCRIPT,
  };
}

/** Appendix 1, Table D of the Gemini chronology (extravehicular activity), the Gemini IX-A row. */
function spacewalks(column: string): Citation {
  return {
    source: "gemini-chronology",
    locator: `Appendix 1, Table D (Extravehicular Activity on Gemini Missions), Gemini IX-A "Umbilical" row: ${column} (V, from voice transcriptions; given to the minute)`,
    url: "https://www.nasa.gov/history/SP-4002/app1d.htm",
  };
}

/** The ATDA's roll: the command pilot's one reading, held steady (see the header). */
const ATDA_ROLL: readonly VehicleMotion[] = [
  {
    kind: "roll",
    rate: {
      value: 3,
      citations: [
        transcript("04:26:33, command pilot", "Okay. It's about 3 to 4 degrees per second. (the low end, held steady for the whole flight: our simplification)", 58),
        transcript("04:27:59, command pilot", "Roger. It appears that the basic rate is in roll. The body axis right now is merely horizontal. ... the big rates are in roll.", 58),
        { source: "on-the-shoulders-of-titans", locator: 'Chapter XIV, "Charting New Space Lanes", page 333 (PDF page 354): "The Agena was a stabilized vehicle; the ATDA was not"' },
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = ["gemini-equipment-section", "gemini-retro-section", "gemini-reentry-module"];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  /* The ATDA, already two days in orbit, its shroud stuck half open. */
  {
    ship: "atda",
    at: at(
      "000:00:00",
      transcript("00:00:01, capsule communicator", "LIFT-OFF!", 3),
      transcript("04:12:40, command pilot", "The shroud is half open. The shroud is half open on that thing!", 56),
    ),
    label: "The ATDA in orbit, its jaws half open",
    layout: "alone",
    parts: ["atda", "atda-shroud"],
    motion: ATDA_ROLL,
  },

  /* Gemini IX-A on its Titan II, then on its own. */
  {
    ship: "gemini",
    at: at("000:00:00", transcript("00:00:01, capsule communicator", "LIFT-OFF!", 3)),
    label: "Lift-off",
    layout: "launch",
    parts: ["titan-first-stage", "titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: at("000:02:33", transcript("00:02:33, pilot", "Oh, there's the fireball!", 6), transcript("00:02:37, command pilot", "Yes, we had a beautiful fireball. Staging is GO.", 6)),
    label: "The first stage falls away",
    layout: "launch",
    parts: ["titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: at("000:05:42", transcript("00:05:42, command pilot", "SECO. ... Zero.", 8)),
    label: "In orbit",
    layout: "alone",
    parts: GEMINI,
  },
  {
    ship: "gemini",
    at: at(
      "049:22:01",
      transcript("49:22:01, pilot", "Okay. We're opening the hatch now.", 192),
      transcript("49:22:53 or 49:22:54, pilot (the last digit is unclear in the scan's text; the line falls between 49:22:52 and 49:22:55)", "Hatches open.", 193),
    ),
    label: "Cernan opens his hatch",
    layout: "alone",
    parts: [...GEMINI, "open-hatch"],
  },
  {
    ship: "gemini",
    at: at(
      "049:24:03",
      transcript("49:24:03, pilot", "Yes. Standing in the seat now.", 194),
      spacewalks('"Crewman standing (hr:min)" 49:24'),
      transcript("49:35:04, command pilot", "Gene's taking a couple of pictures, standing on the seat.", 203),
    ),
    label: "Cernan stands in the open hatch",
    layout: "alone",
    parts: [...GEMINI, "standup-spacewalker"],
  },
  {
    ship: "gemini",
    at: at(
      "049:40:06",
      transcript("49:39:59, command pilot, then 49:40:06, pilot (Stafford lets go of Cernan's foot and he floats out: our reading)", "Give me your foot.\" / \"Okay. Let it go now.", 207),
      spacewalks('"Crewman outside (hr:min)" 49:40'),
      transcript("49:40:30, command pilot", "Now we've got the docking bar mirror. Looks like you're upside down and have all kinds of snake around you.", 207),
    ),
    label: "Cernan floats outside",
    layout: "alone",
    parts: [...GEMINI, "spacewalker"],
  },
  {
    ship: "gemini",
    at: at(
      "051:09:03",
      transcript("51:09:03, command pilot", "... Houston. We got Gene back in the hatch. He's still completely fogged up.", 237),
      transcript("51:09:24, command pilot", "Okay. Why don't you just stand there and relax for awhile, Gene?", 237),
    ),
    label: "Cernan back in the hatch, standing",
    layout: "alone",
    parts: [...GEMINI, "standup-spacewalker"],
  },
  {
    ship: "gemini",
    at: at("051:26:00", spacewalks('"Crewman inside (hr:min)" 51:26 (seconds written as 00)')),
    label: "Cernan inside; the hatch is still open",
    layout: "alone",
    parts: [...GEMINI, "open-hatch"],
  },
  {
    ship: "gemini",
    at: at("051:30:23", transcript("51:30:23, command pilot", "Okay, Houston. We've got the hatch closed.", 244)),
    label: "Hatch closed",
    layout: "alone",
    parts: GEMINI,
  },
  {
    ship: "gemini",
    at: at("071:43:37", transcript("71:43:37, pilot", "Control Spacecraft to Retro-Attitude; ...", 328)),
    label: "Blunt end forward for retrofire",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("071:45:48", transcript("71:45:48, pilot", "There's OAMS; there's Electric; and here goes Adapter. Wow! That went all right.", 330)),
    label: "The equipment section comes off",
    layout: "alone",
    parts: ["gemini-retro-section", "gemini-reentry-module"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at(
      "071:47:57",
      transcript("71:47:57, pilot", "Okay. Retro jettison armed. Retro-Jett was pushed and we got RETRO JETT.", 331),
      transcript("71:47:36, pilot", "Okay, Tom. Here goes the Retro Adapter.", 331),
    ),
    label: "The retrograde section comes off",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
  {
    ship: "gemini",
    at: at("072:15:48", transcript("72:15:48, command pilot", "Drogue.", 343), transcript("72:15:53, command pilot", "We've got the drogue out. Coming down.", 343)),
    label: "Drogue parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-drogue-parachute"],
  },
  {
    ship: "gemini",
    at: at("072:17:22", transcript("72:17:22, pilot", "Gemini IX. We're on the main chute at this time.", 344)),
    label: "Main parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-main-parachute"],
  },
  {
    ship: "gemini",
    at: at(
      "072:20:50",
      {
        source: "gemini-chronology",
        locator: 'Appendix 1, Table A (General), IX-A column: "G.E.T. to touchdown (hr; min; sec)" row, 72:20:50 (the parachute is drawn let go at touchdown; its release time is not printed)',
        url: "https://www.nasa.gov/history/SP-4002/app1a.htm",
      },
    ),
    label: "Floating, parachute let go",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
];

/** Nothing of Gemini IX-A stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
