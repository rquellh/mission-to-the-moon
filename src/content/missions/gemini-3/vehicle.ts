/**
 * How the Gemini 3 spacecraft, Molly Brown, changed shape during the flight,
 * for the 3D model. Each entry is a cited moment from which the one ship of
 * the flight path ("gemini", see flight.ts) is made of the listed parts and
 * faces the listed way, until its next entry. The scene draws simplified
 * models from these; it does not show any of this as text.
 *
 * NASA's copy of the mission report was not found, so every time here is
 * the crew's or the ground's call in the composite air-to-ground and onboard
 * voice transcription of the GT-3 mission (NASA Manned Spacecraft Center,
 * April 1965), as its elapsed-time column prints it, to the whole second.
 * Each moment is drawn at the call that reports it, which can be a second or
 * so after the event itself. Pages are cited as printed, then as the scan's
 * PDF page (one more).
 *
 * Which way the craft points:
 * - From separation it is drawn nose forward (the default). The attitude
 *   for the first two orbit changes is not drawn.
 * - From 03:57:28 it is drawn blunt end forward: the ground recommended
 *   flying the last orbit change and retrofire blunt end forward, and at
 *   03:57:28 Grissom reported "We are blunt-end-forward". When the turn
 *   itself began is not printed.
 *
 * Not drawn: the spacecraft's attitude under the main parachute, including
 * the sudden shift to the landing attitude that broke Grissom's faceplate.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const TRANSCRIPT = "https://www.nasa.gov/wp-content/uploads/2026/01/gt03-tec.pdf";

/** A line of the voice transcription: its printed page (the scan's PDF page is one more), elapsed time, speaker, and words. */
function transcript(page: number, line: string): Citation {
  return {
    source: "gemini-3-voice-transcript",
    locator: `page ${page} (PDF page ${page + 1}), ${line}`,
    url: TRANSCRIPT,
  };
}

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = ["gemini-equipment-section", "gemini-retro-section", "gemini-reentry-module"];

/* ------------------------------------------------------------------ */
/* The changes, in time order.                                         */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  {
    ship: "gemini",
    at: at("000:00:00", transcript(2, '00 00 00, CC: "Bolts and lift-off."')),
    label: "Lift-off",
    layout: "launch",
    parts: ["titan-first-stage", "titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: at("000:02:35", transcript(3, '00 02 35, Grissom (C): "Okay, there was staging."')),
    label: "The first stage falls away",
    layout: "launch",
    parts: ["titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: at("000:06:10", transcript(4, '00 06 10, Grissom (C): "Okay. We are separated."')),
    label: "In orbit",
    layout: "alone",
    parts: GEMINI,
  },
  {
    ship: "gemini",
    at: at(
      "003:57:28",
      transcript(82, '03 57 28, Grissom (C): "We are blunt-end-forward."'),
      transcript(80, '03 49 46, CC: "Cape recommends you perform your OAMS retroburn in BEF after alinement, and stay in BEF up to retrofire."'),
    ),
    label: "Turned blunt end forward for the last orbit change and retrofire",
    layout: "alone",
    parts: GEMINI,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("004:32:29", transcript(96, '04 32 29, Grissom (C): "Hey, the adapter has separated."')),
    label: "The equipment section comes off",
    layout: "alone",
    parts: ["gemini-retro-section", "gemini-reentry-module"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("004:34:15", transcript(97, '04 34 15, Young (P): "Roger, and retropack has jettisoned."')),
    label: "The retrograde section comes off",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
  {
    ship: "gemini",
    at: at("004:46:48", transcript(100, '04 46 48, Grissom (C): "There goes the drogue."')),
    label: "Drogue parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-drogue-parachute"],
  },
  {
    ship: "gemini",
    // The crew's first report of the main parachute; at 04 48 12 Grissom had
    // said "We don't have a main yet" (page 101).
    at: at("004:48:47", transcript(101, '04 48 47, Grissom (C): "Okay. We have a good stable chute. Going to landing attitude."')),
    label: "Main parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-main-parachute"],
  },
  {
    ship: "gemini",
    at: at("004:53:20", transcript(105, '04 53 20, Young (P): "Post-landing checklist. Parachute jett-pushed."')),
    label: "Floating, parachute let go",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
];

/** Nothing of Gemini 3 stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
