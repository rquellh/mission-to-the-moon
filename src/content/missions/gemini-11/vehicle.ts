/**
 * How the Gemini XI spacecraft and its Agena target changed shape during the
 * flight, for the 3D models. Each entry is a cited moment from which one
 * ship of the flight path ("gemini" or "agena", see flight.ts) is made of the
 * listed parts and faces the listed way, until that ship's next entry. The
 * scene draws simplified models from these; it does not show any of this as
 * text.
 *
 * NASA's mission report for this flight was not found, so there is no
 * sequence-of-events table. Most moments are the crew's or the ground's own
 * calls in the Gemini XI voice transcript (ground elapsed time as printed
 * there; zero at lift-off, see flight.ts; story.ts says how its speaker
 * letters C and P are read); the spacewalks come from Appendix
 * 1, Table D of the Gemini chronology, and a few moments from the public
 * affairs mission commentary.
 *
 * Which way the craft point:
 * - Gemini XI is drawn nose forward through the chase (the model's
 *   default), and the docked pair with the spacecraft's nose forward and the
 *   Agena ahead of it: the crew came up behind the Agena ("The Agena is out
 *   in front of us," a few minutes before rendezvous) and docked from there.
 * - For the climb to the high orbit the pair is drawn with the spacecraft
 *   leading, blunt end forward. The Agena's main engine is at its back end
 *   and its docking cone at the front (NSSDCA), so to speed the pair up the
 *   engine had to push from behind with the docked spacecraft out in front,
 *   facing back toward the Agena (our reading); On the Shoulders of Titans
 *   says the crew faced the Agena and were thrown forward against their
 *   harnesses. For the climb back down the ground's update called for the
 *   docking adapter aft ("PPS Burn TDA aft, Retrograde"), which puts the
 *   spacecraft behind the Agena, nose forward, as it is drawn from then on.
 *   Other turns of the docked pair are not drawn.
 * - While the two are tied by the tether, and while they keep station, the
 *   scene turns the spacecraft to face the Agena.
 * - From the equipment section's separation the spacecraft is drawn blunt end
 *   forward: the retrorockets slowed it, so they fired forward, from its
 *   blunt end (our reading, as in the Gemini VIII file).
 *
 * Gaps in the sources, and how they are handled:
 * - The Atlas falling away and the Agena's nose shroud coming off were not
 *   timed in the sources found; the Agena is drawn on its Atlas, shroud on,
 *   until it reached orbit.
 * - The docking practice on the first day (the crew undocked and docked
 *   again several times) is not drawn: the pair stays docked from the first
 *   docking.
 * - The hatch, from Table D's minutes: for the umbilical spacewalk, open
 *   with no one outside from 24:02, Gordon standing in it from 24:03,
 *   floating outside from 24:09, and inside with the hatch still open from
 *   24:30 (estimated in Table D) until it closed at 24:35; open again with no
 *   one outside from 25:37 to 25:39 to throw out equipment; and for the
 *   standup spacewalk, Gordon standing on his seat in the open hatch from
 *   46:07 to 48:15. When he climbed back in from the nose is not timed, so
 *   he is drawn floating until he was inside.
 * - The equipment section is drawn off at 70:41:06, when the commentator,
 *   having just reported it separated, called "30 seconds from retrofire";
 *   it came off at or before then.
 * - The main parachute is drawn from 71:13:39, when the recovery ship's
 *   lookouts had the spacecraft in sight; the commentary says the ship had
 *   the spacecraft "on the main chute" by then. It opened earlier, at a time
 *   not published here, and the drogue parachute is not drawn. The parachute
 *   is drawn let go at landing.
 * - The tether and the slow cartwheel of the two spacecraft around each
 *   other (38, then 55 degrees a minute) are not drawn: the scene cannot
 *   draw two ships swinging around each other, so no motion is given.
 *
 * Sizes and shapes (src/scene/vehicles.ts) are approximate and for drawing
 * only; the site does not state any of them.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { LeftBehind, VehicleChange, VehiclePart } from "../../vehicle-types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const TRANSCRIPT = "https://www.nasa.gov/wp-content/uploads/2026/01/gt11-tec.pdf";
const COMMENTARY = "https://www.nasa.gov/wp-content/uploads/2026/01/gt11-pao.pdf";
const CHRONOLOGY_TABLE_B = "https://www.nasa.gov/history/SP-4002/app1b.htm";
const CHRONOLOGY_TABLE_D = "https://www.nasa.gov/history/SP-4002/app1d.htm";
const NMC_GEMINI = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-081A";
const NMC_AGENA = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-080A";

const at = (elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> => ({
  value: elapsed,
  citations: [citation, ...more],
});

/** The transcript's printed page: one less than the PDF page up to PDF page 20, the same from PDF page 21 on. */
function transcriptPage(pdfPage: number): string {
  return pdfPage <= 20 ? `page ${pdfPage - 1}, PDF page ${pdfPage}` : `page ${pdfPage}, PDF page ${pdfPage}`;
}

/** A line of the Gemini XI voice transcript: its time as printed, the speaker, and the words. */
function voice(time: string, speaker: string, words: string, pdfPage: number, note?: string): Citation {
  return {
    source: "gemini-11-voice-transcript",
    locator: `${time} g.e.t. (${transcriptPage(pdfPage)}), ${speaker}: "${words}"${note ? ` (${note})` : ""}`,
    url: TRANSCRIPT,
  };
}

/** A page of the public affairs mission commentary. */
function commentary(tape: number, page: number, pdfPage: number, quote: string, note?: string): Citation {
  return {
    source: "gemini-11-mission-commentary",
    locator: `Tape ${tape}, page ${page} (PDF page ${pdfPage}): "${quote}"${note ? ` (${note})` : ""}`,
    url: COMMENTARY,
  };
}

/** Appendix 1, Table D of the Gemini chronology (extravehicular activity), a Gemini XI row. */
function spacewalks(row: string): Citation {
  return {
    source: "gemini-chronology",
    locator: `Appendix 1, Table D (Extravehicular Activity on Gemini Missions), Gemini XI: ${row}`,
    url: CHRONOLOGY_TABLE_D,
  };
}

const PARTS_OF_THE_AGENA = {
  source: "nssdca-master-catalog",
  locator:
    '"Gemini 11 Target" (1966-080A), Gemini Agena Target Vehicle: "The GATV had a docking cone at the forward end" and "The primary and secondary propulsion systems were at the aft end of the target vehicle"',
  url: NMC_AGENA,
} as const satisfies Citation;

/* ------------------------------------------------------------------ */
/* Moments.                                                            */
/* ------------------------------------------------------------------ */

const AGENA_LIFTOFF = at(
  "-001:37:24.821",
  {
    source: "gemini-chronology",
    locator: 'Appendix 1, Table B (Orbital Operations), Gemini XI row, Launch "Time (e.s.t.)": 8:05:01.725 a.m., Sept. 12, 1966 (on the mission clock -1:37:24.821: our subtraction of Gemini XI\'s 9:42:26.546 a.m. lift-off)',
    url: CHRONOLOGY_TABLE_B,
  },
  { source: "nssdca-master-catalog", locator: '"Gemini 11 Target" (1966-080A), Description: "8:05:01 a.m. EST (13:05:01.725 UT)"', url: NMC_AGENA },
);

const AGENA_IN_ORBIT = at(
  "-001:29:47",
  commentary(31, 1, 78, "Still looking good, 7 minutes, 38 seconds ... Coming up on the cutoff now... Mark PPS cutoff.", "7 minutes 38 seconds after the Agena's lift-off; its engine cut off a few seconds later"),
);

const DOCKING = at(
  "001:34:16",
  { source: "gemini-chronology", locator: 'Appendix 1, Table B (Orbital Operations), Gemini XI: "Docking" row, Ground Elapsed Time "To begin": 1:34:16', url: CHRONOLOGY_TABLE_B },
  voice("01:34:17", "the command pilot", "We are docked.", 25),
);

const BEHIND_THE_AGENA = voice("01:2_:51", "the pilot", "The Agena is out in front of us.", 21, "one digit of the time is unreadable in the scan; the line comes between 01:22:33 and 01:25:23");

const UNDOCKED = at(
  "049:50:46",
  voice("49:50:46", "the command pilot", "Roger, Hawaii. This is Gemini XI, and we've undocked from the Agena", 188, "undocked by then"),
);

/* ------------------------------------------------------------------ */
/* Parts lists.                                                        */
/* ------------------------------------------------------------------ */

const GEMINI: readonly VehiclePart[] = ["gemini-equipment-section", "gemini-retro-section", "gemini-reentry-module"];
const DOCKED: readonly VehiclePart[] = [...GEMINI, "agena"];
const DOCKED_HATCH_OPEN: readonly VehiclePart[] = [...DOCKED, "open-hatch"];
const DOCKED_WITH_GORDON_STANDING: readonly VehiclePart[] = [...DOCKED, "standup-spacewalker"];
const DOCKED_WITH_GORDON_OUTSIDE: readonly VehiclePart[] = [...DOCKED, "spacewalker"];

/* ------------------------------------------------------------------ */
/* The changes, in time order for each ship.                           */
/* ------------------------------------------------------------------ */

export const vehicle: readonly VehicleChange[] = [
  /* The Agena on its Atlas. */
  {
    ship: "agena",
    at: AGENA_LIFTOFF,
    label: "The Atlas-Agena lifts off",
    layout: "launch",
    parts: ["atlas", "agena", "agena-shroud"],
  },
  {
    ship: "agena",
    at: AGENA_IN_ORBIT,
    label: "The Agena in orbit",
    layout: "alone",
    parts: ["agena"],
  },
  {
    ship: "agena",
    at: DOCKING,
    label: "Docked: drawn with the spacecraft",
    layout: "docked",
    parts: [],
  },
  {
    ship: "agena",
    at: UNDOCKED,
    label: "Undocked, at the far end of the tether",
    layout: "alone",
    parts: ["agena"],
  },

  /* The spacecraft on its Titan II, then on its own. */
  {
    ship: "gemini",
    at: at("000:00:00", voice("00:00:00", "the capsule communicator", "LIFT-OFF.", 2)),
    label: "Lift-off",
    layout: "launch",
    parts: ["titan-first-stage", "titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: at("000:02:35", voice("00:02:35", "the command pilot", "It's good Staging and engine ignition.", 4)),
    label: "The first stage falls away",
    layout: "launch",
    parts: ["titan-second-stage", ...GEMINI],
  },
  {
    ship: "gemini",
    at: at(
      "000:06:01",
      { source: "nssdca-master-catalog", locator: '"Gemini 11" (1966-081A), Mission Profile: "inserted into a 160.5 x 279.1 km Earth orbit at 9:48:28" (EST; 6 minutes 1 second after lift-off: our arithmetic)', url: NMC_GEMINI },
    ),
    label: "In orbit",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: { ...DOCKING, citations: [...DOCKING.citations, BEHIND_THE_AGENA] },
    label: "Docked, the Agena ahead",
    layout: "docked",
    parts: DOCKED,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at(
      "024:02:00",
      spacewalks('"Umbilical" row, "Hatch opening (hr:min)": 24:02 (V, from voice transcriptions; given to the minute, seconds written as 00)'),
      voice("24:02:47", "the pilot", "Hatch is open.", 83),
    ),
    label: "Gordon opens his hatch",
    layout: "docked",
    parts: DOCKED_HATCH_OPEN,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("024:03:00", spacewalks('"Umbilical" row, "Crewman standing (hr:min)": 24:03 (V, from voice transcriptions; given to the minute, seconds written as 00)')),
    label: "Gordon stands in the open hatch",
    layout: "docked",
    parts: DOCKED_WITH_GORDON_STANDING,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("024:09:00", spacewalks('"Umbilical" row, "Crewman outside (hr:min)": 24:09 (V, from voice transcriptions; given to the minute, seconds written as 00)')),
    label: "Gordon outside",
    layout: "docked",
    parts: DOCKED_WITH_GORDON_OUTSIDE,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at(
      "024:30:00",
      spacewalks('"Umbilical" row, "Crewman inside (hr:min)": 24:30 (E, "Estimated from comment on tape that the pilot rested for about five minutes"; given to the minute, seconds written as 00)'),
    ),
    label: "Gordon back inside; the hatch is still open",
    layout: "docked",
    parts: DOCKED_HATCH_OPEN,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("024:35:00", spacewalks('"Umbilical" row, "Hatch closing (hr:min)": 24:35 (E, estimated; given to the minute, seconds written as 00)')),
    label: "The hatch is closed",
    layout: "docked",
    parts: DOCKED,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("025:37:00", spacewalks('"Equipment jettison" row, "Hatch opening (hr:min)": 25:37 (E, estimated; given to the minute, seconds written as 00)')),
    label: "The hatch opens to throw out equipment",
    layout: "docked",
    parts: DOCKED_HATCH_OPEN,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("025:39:00", spacewalks('"Equipment jettison" row, "Hatch closing (hr:min)": 25:39 (V, from voice transcriptions; given to the minute, seconds written as 00)')),
    label: "The hatch is closed",
    layout: "docked",
    parts: DOCKED,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at(
      "040:30:20",
      commentary(157, 1, 369, "We have SPS initiate. We have an ullage burn starting - it started at about 40:30:20, 40 hours 30 minutes 20 seconds."),
      {
        source: "on-the-shoulders-of-titans",
        locator: 'Chapter XV, "The Final Curtain", page 363 (PDF page 384): "Since they faced the Agena, the acceleration forced the crew forward onto the seat harnesses."',
      },
      PARTS_OF_THE_AGENA,
    ),
    label: "Turned for the climb: spacecraft leading, blunt end forward",
    layout: "docked",
    parts: DOCKED,
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at(
      "043:53:15",
      voice("43:53:15", "the capsule communicator", "We show your 16 pounders going.", 142, "the start of the second firing sequence"),
      voice("42:05:02", "the capsule communicator", "Purpose is Height-Adjust ... PPS Burn TDA aft, Retrograde.", 134, "the update for this firing"),
      PARTS_OF_THE_AGENA,
    ),
    label: "Turned for the climb down: the Agena leading",
    layout: "docked",
    parts: DOCKED,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at(
      "046:07:00",
      spacewalks('"Standup" row, "Hatch opening (hr:min)": 46:07 (E, estimated; given to the minute, seconds written as 00)'),
    ),
    label: "Gordon stands up in the open hatch",
    layout: "docked",
    parts: DOCKED_WITH_GORDON_STANDING,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at("048:15:00", spacewalks('"Standup" row, "Hatch closing (hr:min)": 48:15 (V, from voice transcriptions; given to the minute, seconds written as 00)')),
    label: "Hatch closed",
    layout: "docked",
    parts: DOCKED,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: UNDOCKED,
    label: "Undocked, tied to the Agena by the tether",
    layout: "alone",
    parts: GEMINI,
    facing: "forward",
  },
  {
    ship: "gemini",
    at: at(
      "070:41:06",
      commentary(254, 1, 632, "Gemini Control. The Gemini 11 crew has separated the equipment adapter. 30 seconds from retrofire.", "30 seconds before the 70:41:36 retrofire; it came off at or before then"),
      { source: "nssdca-master-catalog", locator: '"Gemini 11" (1966-081A), Reentry: "the spacecraft would be maneuvered to the appropriate orientation and equipment adaptor section would be detached and jettisoned, exposing the retrorocket module"', url: NMC_GEMINI },
    ),
    label: "The equipment section comes off, blunt end forward for retrofire",
    layout: "alone",
    parts: ["gemini-retro-section", "gemini-reentry-module"],
    facing: "backward",
  },
  {
    ship: "gemini",
    at: at("070:43:01", voice("70:43:01", "the command pilot", "All right, Houston. Retrojet.", 342, "the retrograde section jettisoned")),
    label: "The retrograde section comes off",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
  {
    ship: "gemini",
    at: at(
      "071:13:39",
      voice("71:13:39", "Guam Control", "Gemini XI, this is Guam Control. Our lookouts have you in sight on my port side.", 345),
      commentary(257, 2, 640, "Gemini Control and the Guam, the recovery ship, Guam has electronic contact with the spacecraft on the main chute."),
    ),
    label: "Main parachute",
    layout: "alone",
    parts: ["gemini-reentry-module", "gemini-main-parachute"],
  },
  {
    ship: "gemini",
    at: at("071:17:08", {
      source: "gemini-chronology",
      locator: 'Appendix 1, Table A (General), Gemini XI column: "G.E.T. to touchdown (hr; min; sec)" row: 71:17:08 (the parachute is drawn let go at landing)',
      url: "https://www.nasa.gov/history/SP-4002/app1a.htm",
    }),
    label: "Floating",
    layout: "alone",
    parts: ["gemini-reentry-module"],
  },
];

/** Nothing of Gemini XI stays anywhere the scene draws. */
export const leftBehind: readonly LeftBehind[] = [];
