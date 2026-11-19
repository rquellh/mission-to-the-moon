/**
 * How the Gemini VI-A and Gemini VII spacecraft changed shape during this
 * flight, for the 3D models. Each entry is a cited moment from which one
 * ship of the flight path ("gemini" or "gemini-7", see flight.ts) is made of
 * the listed parts, faces the listed way, and turns as listed, until that
 * ship's next entry. The scene draws simplified models from these; it does
 * not show any of this as text.
 *
 * Gemini VI-A's mission report was not found, so most of its moments are the
 * crew's own calls in the Gemini VI air-to-ground and onboard transcript
 * (ground elapsed time as printed there; zero at lift-off, see flight.ts),
 * and a few come from the chronology and On the Shoulders of Titans.
 *
 * Which way the craft point:
 * - Gemini VI-A is drawn nose forward through the chase (the model's
 *   default). While the two keep station, the scene turns them to face each
 *   other. At the separation Schirra turned the spacecraft blunt end
 *   forward (On the Shoulders of Titans, page 289), and it stays so through
 *   retrofire: he turned it blunt end forward again before the equipment
 *   section was cast off and retrofire followed (same page).
 * - Gemini VII is drawn nose forward. It spent much of the flight drifting,
 *   and during the approach it held whatever attitude pointed its radar
 *   transponder at Gemini VI-A (Gemini VII mission report, section
 *   7.1.2.3.4); those attitudes are not drawn.
 *
 * Gaps in the sources, and how they are handled:
 * - The first stage's separation is drawn at the command pilot's call
 *   "Staging." (00:02:39), and spacecraft separation at his "Separating."
 *   (00:06:00); no sequence-of-events table was found for this flight.
 * - The equipment section: On the Shoulders of Titans says it was cast off
 *   just before retrofire but gives no time. The model drops it when the
 *   ground's retrofire countdown began, 25:15:49 (that time is ours).
 * - The retrograde section: drawn off at 25:18:12, when Schirra reported
 *   "we're all clean", ten seconds after Hawaii asked him to report the
 *   retro jettison. It came off at or before then.
 * - The main parachute: drawn from 25:50:26, when Schirra confirmed 2,000
 *   feet at 30 feet per second, a main-parachute descent. It opened earlier,
 *   at about 3,200 meters (On the Shoulders of Titans, page 291), at a time
 *   not published here. The parachute is drawn let go at landing.
 * - No turning rates are published, so no motion is given.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const TRANSCRIPT = "https://www.nasa.gov/wp-content/uploads/2026/01/gt06-tec.pdf";
const GEMINI_VII_REPORT = "https://www.ibiblio.org/apollo/Documents/Gemini7MissionReport.pdf";

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

/** A line of the Gemini VI transcript: its time as printed, the speaker, and the words. */
function transcript(time: string, words: string, page: number): Citation {
  return {
    source: "gemini-6a-voice-transcript",
    locator: `Page ${page} (PDF page ${page + 1}), ${time}: "${words}"`,
    url: TRANSCRIPT,
  };
}

/** On the Shoulders of Titans, chapter XII (printed page; the PDF page is 21 more). */
const titans = (page: number, words: string): Citation => ({
  source: "on-the-shoulders-of-titans",
  locator: `Chapter XII, "Spirit of 76", page ${page} (PDF page ${page + 21}): ${words}`,
});

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = ["gemini-equipment-section", "gemini-retro-section", "gemini-reentry-module"];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  /* Gemini VII, on the eleventh day of its own flight. */
  {
    ship: "gemini-7",
    at: at(
      "000:00:00",
      {
        source: "gemini-6a-gemini-vii-mission-report",
        locator: 'Section 4.1, "Actual Mission" (page 4-6, PDF page 84): "Gemini VI-A was launched at 13:37:26.47 G.m.t. (258:07:22.77 g.e.t. of Gemini VII)"',
        url: GEMINI_VII_REPORT,
      },
    ),
    label: "Gemini VII in orbit",
    layout: "alone",
    parts: GEMINI,
  },

  /* Gemini VI-A on its Titan II, then on its own. */
  {
    ship: "gemini",
    at: at("000:00:00", transcript("00:00:01, capsule communicator", "Lift-off 13:37:26", 1)),
    label: "Lift-off",
    layout: "launch",
    parts: ["titan-first-stage", "titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: at("000:02:39", transcript("00:02:39, command pilot", "Staging.", 2)),
    label: "The first stage falls away",
    layout: "launch",
    parts: ["titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: at("000:06:00", transcript("00:06:00, command pilot", "Separating.", 4), transcript("00:06:03, pilot", "Okay sep.", 4)),
    label: "In orbit",
    layout: "alone",
    parts: GEMINI,
  },
  {
    ship: "gemini",
    at: at(
      "011:13:29",
      {
        source: "gemini-chronology",
        locator: 'Appendix 1, Table B (Orbital Operations), VI-A station keeping row: begins 5:56:00, period 5:17:29 (the end, 11:13:29, is our sum)',
        url: "https://www.nasa.gov/history/SP-4002/app1b.htm",
      },
      titans(289, '"As the pilots\' bedtime approached, Schirra flipped the spacecraft blunt-end forward and fired his thrusters to impart a small separation speed."'),
    ),
    label: "Blunt end forward, moving apart",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at(
      "025:15:49",
      transcript("25:15:49, capsule communicator", "10, 9, 8, 7, 6, 5, 4, 3, 2, 1, Retrofire.", 122),
      titans(289, '"He then flipped VI-A blunt-end forward and jettisoned the equipment section; retrofire followed automatically." (no time printed; the countdown\'s start is used)'),
    ),
    label: "The equipment section comes off",
    layout: "alone",
    parts: ["gemini-retro-section", "gemini-reentry-module"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at(
      "025:18:12",
      transcript("25:18:12, command pilot", "Hawaii, we're all clean and Reentry Attitude now.", 123),
      transcript("25:18:02, capsule communicator", "Very good. Advise retrojett.", 123),
    ),
    label: "The retrograde section comes off",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
  {
    ship: "gemini",
    at: at("025:45:55", transcript("25:45:55, command pilot", "Drogue is out.", 127)),
    label: "Drogue parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-drogue-parachute"],
  },
  {
    ship: "gemini",
    at: at(
      "025:50:26",
      transcript("25:50:26, command pilot", "That's affirmative. 30 feet per second.", 128),
      titans(291, '"punched out the main parachute at 3200 meters" (no time printed; the model shows it from this call)'),
    ),
    label: "Main parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-main-parachute"],
  },
  {
    ship: "gemini",
    at: at(
      "025:51:24",
      {
        source: "gemini-chronology",
        locator: 'Appendix 1, Table A (General), VI-A column: "G.E.T. to touchdown (hr; min; sec)" row, 25:51:24 (the parachute is drawn let go at touchdown; its release time is not printed)',
        url: "https://www.nasa.gov/history/SP-4002/app1a.htm",
      },
    ),
    label: "Floating, parachute let go",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
];

/** Nothing of Gemini VI-A stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
