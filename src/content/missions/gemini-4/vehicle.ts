/**
 * How the Gemini IV spacecraft changed shape during the flight, for the 3D
 * model. Each entry is a cited moment from which the one ship of the flight
 * path ("gemini", see flight.ts) is made of the listed parts and faces the
 * listed way, until its next entry. The scene draws simplified models from
 * these; it does not show any of this as text.
 *
 * Times come from the Gemini Program Mission Report for Gemini IV
 * (MSC-G-R-65-3): Table 4-I ("Sequence of Events", pages 4-12 and 4-13, PDF
 * pages 90 and 91), actual times, and the report's text and other tables,
 * named in each citation. Times the report prints in seconds from lift-off,
 * or in minutes and seconds (Table 4-IV), are written as hours:minutes:
 * seconds.
 *
 * Which way the craft points:
 * - At separation it is drawn nose forward, as the crew fired the aft
 *   thrusters to move straight ahead (section 7.1.2.3).
 * - From the first firing toward the rocket stage it is drawn blunt end
 *   forward: the crew turned the spacecraft around after separation to face
 *   the stage behind it, and made the first firings blunt end forward
 *   (section 4.3.1.3). The turnaround itself, shortly before, has no printed
 *   time.
 * - From the end of the chase it is drawn nose forward again: the platform
 *   was alined small end forward early in revolution 3 (section 5.1.5.2.2),
 *   the revolution of the spacewalk. When the spacecraft turned is not
 *   printed; the model turns it once the last firing at the stage is over,
 *   so that it is not drawn turning with White outside. No attitude is
 *   published for the spacewalk or for the days of drifting flight that
 *   followed, so the drifting is not drawn.
 * - From the pre-retrofire maneuver it is drawn blunt end forward: the
 *   aft-firing thrusters slowed the spacecraft (section 4.1), so they fired
 *   toward its direction of travel, with the blunt end leading (our
 *   reading), and the platform was alined blunt end forward for the 33
 *   minutes before (section 5.1.5.2.2). The turn, earlier in that half hour,
 *   is not drawn.
 *
 * The spacewalk follows the mission report's times (egress, start of
 * ingress, hatch closure, section 4.1), with the moments it does not time
 * (the hatch opening, White standing up, White back inside) from Table D of
 * the Gemini chronology's Appendix 1, all to the minute:
 * - The hatch open with no one outside from 04:18 (Table D, "Hatch
 *   opening"), White standing in it from 04:20 ("Crewman standing"): he
 *   spent 4 or 5 minutes mounting a camera outside and a guard on the hatch
 *   sill and putting the gas gun together (section 7.1.2.4.2).
 * - White floating on his tether from his egress (04:23) to the start of
 *   his ingress (04:46), the gas gun in his right hand ("gas-gun"), as
 *   NASA photo S65-34635 shows him; he had "assembled the maneuvering
 *   unit" standing in the hatch (section 7.1.2.4.2). How far out he floats
 *   is the scene's illustration.
 * - White standing in the hatch again while he climbs in, from 04:46 to
 *   04:50 (Table D, "Crewman inside"), then the hatch open with him inside
 *   until it closed (05:06).
 * Table D's own egress and closing times (4:30 and 4:54) are not used; the
 * story's discrepancy notes say so.
 *
 * Not drawn: the spent rocket stage (not a ship of the flight path), the
 * pilot parachute, and the spacecraft's attitude under the main parachute.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../vehicle-types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = 'https://ntrs.nasa.gov/api/citations/19670095754/downloads/19670095754.pdf';

function report(locator: string): Citation {
  return { source: 'gemini-4-mission-report', locator, url: MISSION_REPORT };
}

/** The June 3, 1965 entry of Project Gemini: A Chronology, Part III (A). */
function chronology(detail: string): Citation {
  return {
    source: 'gemini-chronology',
    locator: `Part III (A), June 3, 1965: ${detail}`,
    url: 'https://www.nasa.gov/history/SP-4002/p3a.htm',
  };
}

/** Appendix 1, Table D of the Gemini chronology (extravehicular activity), the Gemini IV row. */
function spacewalks(column: string): Citation {
  return {
    source: 'gemini-chronology',
    locator: `Appendix 1, Table D (Extravehicular Activity on Gemini Missions), Gemini IV "Umbilical" row: ${column} (given to the minute; seconds written as 00)`,
    url: 'https://www.nasa.gov/history/SP-4002/app1d.htm',
  };
}

/** A row of Table 4-I, quoted as printed, actual time. */
function sequence(row: string, page: '4-12 (PDF page 90)' | '4-13 (PDF page 91)'): Citation {
  return report(`Table 4-I, "Sequence of Events" (page ${page}), row "${row}", actual time`);
}

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

const STRAIGHT_AHEAD = report(
  'Section 7.1.2.3, "Insertion" (page 7-17, PDF page 276): at SECO+30 "a 5-second separation maneuver was performed", and "the crew attempted to separate straight ahead"',
);
const BLUNT_END_FORWARD_STATION_KEEPING = report(
  'Section 4.3.1.3, "Station keeping" (page 4-8, PDF page 86): "Two retrograde maneuvers were completed by 00:09:23 g.e.t. using the aft-firing thrusters and with the spacecraft in the BEF orientation"; section 5.1.5.2.2 (page 5-17, PDF page 133): "The platform was caged blunt-end-forward (BEF) following the yaw turnaround after separation"',
);
const SMALL_END_FORWARD = report(
  'Section 5.1.5.2.2, "Orbital phase" (page 5-17, PDF page 133): "Small-end-forward (SEF) alinement was initiated early in revolution 3"; section 6.1.2.2 (page 6-4, PDF page 239): the crew "was given permission to proceed with EVA over Hawaii during the third revolution"',
);
const BLUNT_END_FORWARD_RETROFIRE = report(
  'Section 5.1.5.2.2, "Orbital phase" (page 5-17, PDF page 133): "The platform was alined in the BEF mode for a 33-minute period prior to the OAMS preretrofire maneuver"; section 4.1 (page 4-4, PDF page 82): "The aft-firing thrusters were used" for the preretrograde maneuver (blunt end forward for it is our reading)',
);

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = [
  'gemini-equipment-section',
  'gemini-retro-section',
  'gemini-reentry-module',
];
const STANDING_IN_HATCH: readonly VehiclePart[] = [...GEMINI, 'standup-spacewalker'];
const SPACEWALK: readonly VehiclePart[] = [...GEMINI, 'spacewalker', 'gas-gun'];
const HATCH_OPEN: readonly VehiclePart[] = [...GEMINI, 'open-hatch'];

/* ------------------------------------------------------------------ */
/* The changes, in time order.                                         */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  {
    ship: 'gemini',
    at: at(
      '000:00:00',
      sequence('Lift-off (pad disconnect separation) (15:15:59.562 G.m.t.)', '4-12 (PDF page 90)'),
    ),
    label: 'Lift-off',
    layout: 'launch',
    parts: ['titan-first-stage', 'titan-second-stage', ...GEMINI],
  },
  {
    ship: 'gemini',
    // 153.14 seconds after lift-off.
    at: at('000:02:33.14', sequence('Stage separation begin', '4-12 (PDF page 90)')),
    label: 'The first stage falls away',
    layout: 'launch',
    parts: ['titan-second-stage', ...GEMINI],
  },
  {
    ship: 'gemini',
    // 365.55 seconds after lift-off.
    at: at(
      '000:06:05.55',
      sequence('Spacecraft separation (shaped charge fired)', '4-13 (PDF page 91)'),
      STRAIGHT_AHEAD,
    ),
    label: 'In orbit',
    layout: 'alone',
    parts: GEMINI,
    facing: 'forward',
  },
  {
    ship: 'gemini',
    at: at(
      '000:08:47.164',
      report(
        'Table 4-IV, "Detailed List of Maneuvers During Gemini IV Station-Keeping Attempt" (page 4-16, PDF page 94), first firing after separation, "Time (g.e.t.), min:sec" 8:47.164',
      ),
      BLUNT_END_FORWARD_STATION_KEEPING,
    ),
    label: 'Turned around to chase the rocket stage, blunt end forward',
    layout: 'alone',
    parts: GEMINI,
    facing: 'backward',
  },
  {
    ship: 'gemini',
    // The last firing at the stage began at 86:46.297 (minutes and seconds)
    // and lasted 4.25 seconds (our sum: 01:26:50.547).
    at: at(
      '001:26:50.547',
      report(
        'Table 4-IV, "Detailed List of Maneuvers During Gemini IV Station-Keeping Attempt" - Concluded (page 4-17, PDF page 95), last firing, "Time (g.e.t.), min:sec" 86:46.297 and "Length of burn, sec" 4.25',
      ),
      SMALL_END_FORWARD,
    ),
    label: 'The chase is over: nose forward again',
    layout: 'alone',
    parts: GEMINI,
    facing: 'forward',
  },
  {
    ship: 'gemini',
    at: at(
      '004:18:00',
      chronology(
        '"The spacecraft hatch was opened at 4 hours 18 minutes into the flight" (time given to the minute; seconds written as 00; the mission report prints no time for it)',
      ),
      spacewalks('"Hatch opening (hr:min)" 4:18 (E, estimated)'),
    ),
    label: 'White opens the hatch',
    layout: 'alone',
    parts: HATCH_OPEN,
    facing: 'forward',
  },
  {
    ship: 'gemini',
    at: at(
      '004:20:00',
      spacewalks('"Crewman standing (hr:min)" 4:20 (V, from voice transcriptions)'),
      report(
        'Section 7.1.2.4.2, pilots\' report, "Extravehicular activity" (page 7-19, PDF page 278): "The pilot opened the spacecraft hatch and mounted the outside 16-mm camera, mounted the umbilical guard on the hatch sill, and assembled the maneuvering unit and camera" and "These operations took 4 or 5 minutes"',
      ),
    ),
    label: 'White stands in the open hatch',
    layout: 'alone',
    parts: STANDING_IN_HATCH,
    facing: 'forward',
  },
  {
    ship: 'gemini',
    at: at(
      '004:23:00',
      report(
        'Section 4.1, "Actual Mission" (page 4-2, PDF page 80): "The pilot egressed from the spacecraft at approximately 04:23:00 g.e.t."',
      ),
      report(
        'Table 5.1-IV, "Guidance and Control Summary Chart" - Continued (page 5-53, PDF page 169), row "EVA", actual time 04:23:00',
      ),
    ),
    label: 'White floats outside',
    layout: 'alone',
    parts: SPACEWALK,
    facing: 'forward',
  },
  {
    ship: 'gemini',
    at: at(
      '004:46:00',
      report(
        'Section 4.1, "Actual Mission" (page 4-2, PDF page 80): "Pilot ingress started at about 04:46:00 g.e.t."',
      ),
    ),
    label: 'White climbs back in through the hatch',
    layout: 'alone',
    parts: STANDING_IN_HATCH,
    facing: 'forward',
  },
  {
    ship: 'gemini',
    at: at(
      '004:50:00',
      spacewalks('"Crewman inside (hr:min)" 4:50 (V, from voice transcriptions)'),
    ),
    label: 'White inside; the hatch is still open',
    layout: 'alone',
    parts: HATCH_OPEN,
    facing: 'forward',
  },
  {
    ship: 'gemini',
    at: at(
      '005:06:00',
      report(
        'Section 4.1, "Actual Mission" (page 4-2, PDF page 80): "final hatch closure and repressurization were not completed until 05:06 g.e.t." (time given to the minute; seconds written as 00)',
      ),
    ),
    label: 'The hatch is closed',
    layout: 'alone',
    parts: GEMINI,
    facing: 'forward',
  },
  {
    ship: 'gemini',
    at: at(
      '097:28:02',
      sequence('Preretrofire maneuver initiate', '4-13 (PDF page 91)'),
      BLUNT_END_FORWARD_RETROFIRE,
    ),
    label: 'Blunt end forward for the pre-retrofire firing',
    layout: 'alone',
    parts: GEMINI,
    facing: 'backward',
  },
  {
    ship: 'gemini',
    at: at(
      '097:39:14.2',
      report(
        'Table 5.1-X, "Sequential Events" (page 5-60, PDF page 176), "Adapter shape charge ignition" 97:39:14.2',
      ),
      report(
        'Section 4.1, "Actual Mission" (page 4-4, PDF page 82): "Equipment adapter separation was commanded by the crew at 97:39:14 g.e.t."',
      ),
    ),
    label: 'The equipment section comes off',
    layout: 'alone',
    parts: ['gemini-retro-section', 'gemini-reentry-module'],
    facing: 'backward',
  },
  {
    ship: 'gemini',
    at: at('097:40:47', sequence('Retroadapter separate', '4-13 (PDF page 91)')),
    label: 'The retrograde section comes off',
    layout: 'alone',
    parts: ['gemini-reentry-module'],
  },
  {
    ship: 'gemini',
    at: at('097:50:53', sequence('Drogue deployment', '4-13 (PDF page 91)')),
    label: 'Drogue parachute',
    layout: 'alone',
    parts: ['gemini-reentry-module', 'gemini-drogue-parachute'],
  },
  {
    ship: 'gemini',
    at: at(
      '097:52:11',
      sequence('Pilot parachute deployment', '4-13 (PDF page 91)'),
      report(
        'Section 4.1, "Actual Mission" (page 4-4, PDF page 82): "pilot and main parachute deployment at 97:52:11 g.e.t."',
      ),
    ),
    label: 'Main parachute',
    layout: 'alone',
    parts: ['gemini-reentry-module', 'gemini-main-parachute'],
  },
  {
    ship: 'gemini',
    at: at(
      '097:56:12',
      sequence('Landing', '4-13 (PDF page 91)'),
      report(
        'Section 7.1.2.6, "Reentry and landing" (page 7-28, PDF page 287): "The parachute was jettisoned immediately after landing" (the landing time is used; Table 5.1-X has no time for it, "Not received")',
      ),
    ),
    label: 'Floating, parachute let go',
    layout: 'alone',
    parts: ['gemini-reentry-module'],
  },
];

/** Nothing of Gemini IV stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
