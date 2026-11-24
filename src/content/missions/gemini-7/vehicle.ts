/**
 * How the Gemini VII and Gemini VI-A spacecraft changed shape during this
 * flight, for the 3D models. Each entry is a cited moment from which one
 * ship of the flight path ("gemini" or "gemini-6a", see flight.ts) is made
 * of the listed parts and faces the listed way, until that ship's next
 * entry. The scene draws simplified models from these; it does not show
 * any of this as text.
 *
 * Gemini VII's times are from Table 4.2-I ("Sequence of Events", pages 4-12
 * and 4-13, PDF pages 90 and 91) of the Gemini VII mission report
 * (MSC-G-R-66-1), actual times, and from its text where named. Gemini
 * VI-A's mission report was not found, so its moments are its crew's calls
 * in the Gemini VI transcript, printed on Gemini VI-A's clock and moved to
 * Gemini VII's by adding 258:07:22.77, the Gemini VII elapsed time of
 * Gemini VI-A's lift-off (our sum; see flight.ts).
 *
 * Which way the craft point:
 * - Gemini VII is drawn nose forward in orbit. Right after separation the
 *   crew turned it around to fly beside the spent second stage (section
 *   4.1); the stage is not a ship here, so that turn is not drawn. For
 *   much of the flight it drifted in no set attitude, and no turning rates
 *   are published, so no motion is given. From the equipment section's
 *   separation it is drawn blunt end forward for retrofire: the
 *   retrorockets slowed the craft, so they fired forward, from its blunt
 *   end (our reading, as in the Gemini VIII file).
 * - Gemini VI-A is drawn nose forward through the chase. While the two keep
 *   station, the scene turns them to face each other. At the separation
 *   Schirra turned it blunt end forward (On the Shoulders of Titans, page
 *   289), and it stays so through retrofire.
 *
 * Gaps in the sources, and how they are handled:
 * - Gemini VII's equipment section: cast off just before retrofire
 *   (section 7.1.2.4), at a time not printed (the tape recorder had
 *   failed); the model drops it at retrofire initiation. Its retrograde
 *   section came off 45 seconds after retrofire (same section).
 * - Gemini VI-A's equipment section: drawn off when the ground's retrofire
 *   countdown began (25:15:49 on its clock), its retrograde section when
 *   Schirra reported "we're all clean" (25:18:12), and its main parachute
 *   from his confirmation of a main-parachute descent rate (25:50:26); the
 *   real moments are not published here (see the Gemini 6A vehicle file).
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from '../../types.ts';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../vehicle-types.ts';

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = 'https://www.ibiblio.org/apollo/Documents/Gemini7MissionReport.pdf';
const TRANSCRIPT = 'https://www.nasa.gov/wp-content/uploads/2026/01/gt06-tec.pdf';

function report(locator: string): Citation {
  return { source: 'gemini-6a-gemini-vii-mission-report', locator, url: MISSION_REPORT };
}

/** A row of Table 4.2-I, quoted as printed, actual time. */
function sequence(row: string, page: '4-12 (PDF page 90)' | '4-13 (PDF page 91)'): Citation {
  return report(`Table 4.2-I, "Sequence of Events" (page ${page}), "${row}" row, actual time`);
}

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

/** A line of the Gemini VI transcript, on Gemini VI-A's clock. */
function transcript(time: string, words: string, page: number): Citation {
  return {
    source: 'gemini-6a-voice-transcript',
    locator: `Page ${page} (PDF page ${page + 1}), ${time} on Gemini VI-A's clock: "${words}"`,
    url: TRANSCRIPT,
  };
}

/** Gemini VI-A's lift-off on Gemini VII's clock, and the two lift-off times it comes from. */
const GEMINI_6A_LIFTOFF = report(
  'Section 4.1, "Actual Mission" (page 4-6, PDF page 84): "Gemini VI-A was launched at 13:37:26.47 G.m.t. (258:07:22.77 g.e.t. of Gemini VII)"',
);
const GEMINI_7_LIFTOFF = sequence(
  'Lift-off (pad disconnect separation) (19:30:03.702 G.m.t.)',
  '4-12 (PDF page 90)',
);

/** Seconds on the mission clock as "hhh:mm:ss.ss". */
function clockTime(seconds: number): ElapsedTime {
  const total = Math.round(seconds * 100) / 100;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total - hours * 3600) / 60);
  const rest = (total - hours * 3600 - minutes * 60).toFixed(2).replace(/\.?0+$/, '');
  const [whole = '0', fraction] = rest.split('.');
  return `${String(hours).padStart(3, '0')}:${String(minutes).padStart(2, '0')}:${whole.padStart(2, '0')}${fraction ? `.${fraction}` : ''}` as ElapsedTime;
}

/** A Gemini VI-A clock time, plus 258:07:22.77 (our sum), on Gemini VII's clock. */
function onGemini7Clock(
  gemini6aClock: string,
  citation: Citation,
  ...more: Citation[]
): Cited<ElapsedTime> {
  const [h = '0', m = '0', s = '0'] = gemini6aClock.split(':');
  const offset = 258 * 3600 + 7 * 60 + 22.77;
  return at(
    clockTime(offset + Number(h) * 3600 + Number(m) * 60 + Number(s)),
    citation,
    ...more,
    GEMINI_6A_LIFTOFF,
    GEMINI_7_LIFTOFF,
  );
}

/** On the Shoulders of Titans, chapter XII (printed page; the PDF page is 21 more). */
const titans = (page: number, words: string): Citation => ({
  source: 'on-the-shoulders-of-titans',
  locator: `Chapter XII, "Spirit of 76", page ${page} (PDF page ${page + 21}): ${words}`,
});

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = [
  'gemini-equipment-section',
  'gemini-retro-section',
  'gemini-reentry-module',
];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  /* Gemini VII on its Titan II, then on its own for two weeks. */
  {
    ship: 'gemini',
    at: at('000:00:00', GEMINI_7_LIFTOFF),
    label: 'Lift-off',
    layout: 'launch',
    parts: ['titan-first-stage', 'titan-second-stage', ...GEMINI],
  },
  {
    ship: 'gemini',
    // 156.25 seconds after lift-off.
    at: at('000:02:36.25', sequence('Stage separation begin', '4-12 (PDF page 90)')),
    label: 'The first stage falls away',
    layout: 'launch',
    parts: ['titan-second-stage', ...GEMINI],
  },
  {
    ship: 'gemini',
    // 368.79 seconds after lift-off.
    at: at(
      '000:06:08.79',
      sequence('Spacecraft separation (shaped charge fire)', '4-13 (PDF page 91)'),
    ),
    label: 'In orbit',
    layout: 'alone',
    parts: GEMINI,
  },
  {
    ship: 'gemini',
    at: at(
      '329:58:04',
      sequence('Retrofire initiation', '4-13 (PDF page 91)'),
      report(
        'Section 7.1.2.4, "Preretrofire and retrofire" (page 7-57, PDF page 313): the separation of the adapter equipment section "produced not only a large noise but also a significant thrust", before retrofire (no time printed; drawn at retrofire initiation)',
      ),
    ),
    label: 'The equipment section comes off, blunt end forward for retrofire',
    layout: 'alone',
    parts: ['gemini-retro-section', 'gemini-reentry-module'],
    facing: 'backward',
  },
  {
    ship: 'gemini',
    // Retrofire plus 45 seconds (our sum).
    at: at(
      '329:58:49',
      report(
        'Section 7.1.2.4, "Preretrofire and retrofire" (page 7-57, PDF page 313): "The retrograde section of the adapter was jettisoned at TR + 45 seconds"',
      ),
      sequence('Retrofire initiation', '4-13 (PDF page 91)'),
    ),
    label: 'The retrograde section comes off',
    layout: 'alone',
    parts: ['gemini-reentry-module'],
  },
  {
    ship: 'gemini',
    at: at('330:29:30', sequence('Drogue parachute deployment', '4-13 (PDF page 91)')),
    label: 'Drogue parachute',
    layout: 'alone',
    parts: ['gemini-reentry-module', 'gemini-drogue-parachute'],
  },
  {
    ship: 'gemini',
    at: at(
      '330:31:03',
      sequence('Pilot parachute deployment/main parachute initiation', '4-13 (PDF page 91)'),
    ),
    label: 'Main parachute',
    layout: 'alone',
    parts: ['gemini-reentry-module', 'gemini-main-parachute'],
  },
  {
    ship: 'gemini',
    at: at('330:35:02', sequence('Main parachute jettison', '4-13 (PDF page 91)')),
    label: 'Floating, parachute let go',
    layout: 'alone',
    parts: ['gemini-reentry-module'],
  },

  /* Gemini VI-A, the visitor, on its own Titan II, then on its own. */
  {
    ship: 'gemini-6a',
    at: at('258:07:22.77', GEMINI_6A_LIFTOFF, GEMINI_7_LIFTOFF),
    label: 'Gemini VI-A lifts off',
    layout: 'launch',
    parts: ['titan-first-stage', 'titan-second-stage', ...GEMINI],
  },
  {
    ship: 'gemini-6a',
    at: onGemini7Clock('000:02:39', transcript('00:02:39, command pilot', 'Staging.', 2)),
    label: "Gemini VI-A's first stage falls away",
    layout: 'launch',
    parts: ['titan-second-stage', ...GEMINI],
  },
  {
    ship: 'gemini-6a',
    at: onGemini7Clock('000:06:00', transcript('00:06:00, command pilot', 'Separating.', 4)),
    label: 'Gemini VI-A in orbit',
    layout: 'alone',
    parts: GEMINI,
  },
  {
    ship: 'gemini-6a',
    at: at(
      '269:30:00',
      report(
        'Section 4.1, "Actual Mission" (page 4-6, PDF page 84): "At approximately 269:30 g.e.t., the Gemini VI-A crew performed a separation maneuver"',
      ),
      titans(
        289,
        '"As the pilots\' bedtime approached, Schirra flipped the spacecraft blunt-end forward and fired his thrusters to impart a small separation speed."',
      ),
    ),
    label: 'Gemini VI-A turns blunt end forward and moves off',
    layout: 'alone',
    parts: GEMINI,
    facing: 'backward',
  },
  {
    ship: 'gemini-6a',
    at: onGemini7Clock(
      '025:15:49',
      transcript(
        '25:15:49, capsule communicator',
        '10, 9, 8, 7, 6, 5, 4, 3, 2, 1, Retrofire.',
        122,
      ),
      titans(
        289,
        '"He then flipped VI-A blunt-end forward and jettisoned the equipment section; retrofire followed automatically." (no time printed; the countdown\'s start is used)',
      ),
    ),
    label: "Gemini VI-A's equipment section comes off",
    layout: 'alone',
    parts: ['gemini-retro-section', 'gemini-reentry-module'],
    facing: 'backward',
  },
  {
    ship: 'gemini-6a',
    at: onGemini7Clock(
      '025:18:12',
      transcript(
        '25:18:12, command pilot',
        "Hawaii, we're all clean and Reentry Attitude now.",
        123,
      ),
    ),
    label: "Gemini VI-A's retrograde section comes off",
    layout: 'alone',
    parts: ['gemini-reentry-module'],
  },
  {
    ship: 'gemini-6a',
    at: onGemini7Clock('025:45:55', transcript('25:45:55, command pilot', 'Drogue is out.', 127)),
    label: "Gemini VI-A's drogue parachute",
    layout: 'alone',
    parts: ['gemini-reentry-module', 'gemini-drogue-parachute'],
  },
  {
    ship: 'gemini-6a',
    at: onGemini7Clock(
      '025:50:26',
      transcript('25:50:26, command pilot', "That's affirmative. 30 feet per second.", 128),
      titans(
        291,
        '"punched out the main parachute at 3200 meters" (no time printed; the model shows it from this call)',
      ),
    ),
    label: "Gemini VI-A's main parachute",
    layout: 'alone',
    parts: ['gemini-reentry-module', 'gemini-main-parachute'],
  },
];

/** Nothing of Gemini VII or VI-A stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
