/**
 * How the Gemini V spacecraft changed shape during the flight, for the 3D
 * model. Each entry is a cited moment from which the one ship of the flight
 * path ("gemini", see flight.ts) is made of the listed parts and faces the
 * listed way, until its next entry. The scene draws simplified models from
 * these; it does not show any of this as text.
 *
 * Every time is copied from Table 4.2-I ("Sequence of Events", pages 4-10
 * and 4-11, PDF pages 71 and 72) of the Gemini Program Mission Report for
 * Gemini V (MSC-G-R-65-4), actual times. Times the table prints in seconds
 * from lift-off are written as hours:minutes:seconds.
 *
 * Which way the craft points:
 * - From separation until the last orbits it is drawn nose forward (the
 *   default). For long stretches the spacecraft drifted (section 4.1), in
 *   no set attitude, with the thrusters fired only to stop it turning too
 *   fast; that drifting is not drawn, since no rates are published.
 * - From the equipment section's separation it is drawn blunt end forward,
 *   the attitude the crew held for retrofire: they alined the platform blunt
 *   end forward for one and one-half orbits before retrofire (section
 *   7.1.2.6). The turn itself, one and one-half orbits earlier, is not
 *   drawn, because the report prints no time for it.
 *
 * Not drawn: the rendezvous evaluation pod, which rode in the adapter at
 * the back of the spacecraft and was ejected at 02:07:15 (there is no model
 * for it, and it is not a ship of the flight path), the pilot parachute, and
 * the spacecraft's attitude under the main parachute.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../vehicle-types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = 'https://www.ibiblio.org/apollo/Documents/Gemini5MissionReport.pdf';

function report(locator: string): Citation {
  return { source: 'gemini-5-mission-report', locator, url: MISSION_REPORT };
}

/** A row of Table 4.2-I, quoted as printed, actual time. */
function sequence(row: string, page: '4-10 (PDF page 71)' | '4-11 (PDF page 72)'): Citation {
  return report(`Table 4.2-I, "Sequence of Events" (page ${page}), row "${row}", actual time`);
}

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

const BLUNT_END_FORWARD = report(
  'Section 7.1.2.6, "Retrofire" (page 7-17, PDF page 298): "The RCS was activated, checked out, and used to aline the platform BEF for one and one-half orbits prior to retrofire."',
);

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = [
  'gemini-equipment-section',
  'gemini-retro-section',
  'gemini-reentry-module',
];

/* ------------------------------------------------------------------ */
/* The changes, in time order.                                         */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  {
    ship: 'gemini',
    at: at(
      '000:00:00',
      sequence('Lift-off (pad disconnect separation) (13:59:59.518 G.m.t.)', '4-10 (PDF page 71)'),
    ),
    label: 'Lift-off',
    layout: 'launch',
    parts: ['titan-first-stage', 'titan-second-stage', ...GEMINI],
  },
  {
    ship: 'gemini',
    // 154.29 seconds after lift-off.
    at: at('000:02:34.29', sequence('Stage separation begin', '4-10 (PDF page 71)')),
    label: 'The first stage falls away',
    layout: 'launch',
    parts: ['titan-second-stage', ...GEMINI],
  },
  {
    ship: 'gemini',
    // 356.91 seconds after lift-off.
    at: at(
      '000:05:56.91',
      sequence('Spacecraft separation (shape charge fired)', '4-11 (PDF page 72)'),
    ),
    label: 'In orbit',
    layout: 'alone',
    parts: GEMINI,
  },
  {
    ship: 'gemini',
    at: at(
      '190:26:47',
      sequence('Equipment adapter separation', '4-11 (PDF page 72)'),
      BLUNT_END_FORWARD,
    ),
    label: 'The equipment section comes off, blunt end forward for retrofire',
    layout: 'alone',
    parts: ['gemini-retro-section', 'gemini-reentry-module'],
    facing: 'backward',
  },
  {
    ship: 'gemini',
    at: at('190:28:30', sequence('Retroadapter separate', '4-11 (PDF page 72)')),
    label: 'The retrograde section comes off',
    layout: 'alone',
    parts: ['gemini-reentry-module'],
  },
  {
    ship: 'gemini',
    at: at('190:49:19', sequence('Drogue parachute deployment', '4-11 (PDF page 72)')),
    label: 'Drogue parachute',
    layout: 'alone',
    parts: ['gemini-reentry-module', 'gemini-drogue-parachute'],
  },
  {
    ship: 'gemini',
    at: at(
      '190:51:16',
      sequence('Pilot parachute deployment/main parachute initiate', '4-11 (PDF page 72)'),
    ),
    label: 'Main parachute',
    layout: 'alone',
    parts: ['gemini-reentry-module', 'gemini-main-parachute'],
  },
  {
    ship: 'gemini',
    at: at('190:55:17', sequence('Parachute jettison', '4-11 (PDF page 72)')),
    label: 'Floating, parachute let go',
    layout: 'alone',
    parts: ['gemini-reentry-module'],
  },
];

/** Nothing of Gemini V stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
