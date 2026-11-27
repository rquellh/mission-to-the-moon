/**
 * Where the game's own sentences about the real flights come from. The
 * sentences are in index.ts (TEXT); their sources are folded under the Start
 * button, labeled as theirs. Each page here was opened and the quoted words
 * found on it on 2026-11-27. The sources only this game cites are registered
 * in src/content/extras/orbit.ts; the rest are the Apollo 7 and Gemini 8
 * mission reports and the shared "On the Shoulders of Titans". Quotes from
 * scanned PDFs keep their words; the scans' broken spacing is mended.
 */
import type { Citations } from '../../content/types.ts';

const BASICS = 'https://science.nasa.gov/learn/basics-of-space-flight/chapter3-4/';
const SPACE_PLACE = 'https://spaceplace.nasa.gov/orbits/en/';
const GLENN = 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-to-orbit/';
const LVDC =
  'https://airandspace.si.edu/collection-objects/cards-launch-vehicle-digital-computer-saturn-v/nasm_A20090028001';
const APOLLO_7_REPORT =
  'https://web.archive.org/web/20250207014232/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A07_MissionReport.pdf';
const GEMINI_8_REPORT =
  'https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf';
const GLV_DEVELOPMENT = 'https://ntrs.nasa.gov/api/citations/19660020347/downloads/19660020347.pdf';
const ABORT_PLANNING = 'https://ntrs.nasa.gov/api/citations/19720017278/downloads/19720017278.pdf';

/** "Going up gets a rocket to space. Going sideways very fast is what keeps it there. That is an orbit." */
export const WHAT_AN_ORBIT_IS: Citations = [
  {
    source: 'orbit-basics-of-space-flight-gravity',
    locator:
      '"Orbiting a Real Planet": "to get a spacecraft into orbit, you need to raise it up and accelerate it until it is going so fast that as it falls, it falls completely around the planet."',
    url: BASICS,
  },
  {
    source: 'orbit-space-place-what-is-an-orbit',
    locator:
      '"How Do Objects Stay in Orbit?": "When these forces are balanced, the object is always falling toward the planet, but because it\'s moving sideways fast enough, it never hits the planet."',
    url: SPACE_PLACE,
  },
];

/**
 * "Climb straight up through the thick air first. Then tip the rocket over,
 * one step at a time, to build sideways speed." The steps are the game's;
 * the order, up and out of the thick air and then over toward level while
 * speeding up, is the real one.
 */
export const THE_CLIMB: Citations = [
  {
    source: 'orbit-glenn-flight-to-orbit',
    locator:
      '"Thrust and Weight": "Leaving the pad, the rocket begins a powered vertical ascent. The vehicle accelerates because of the high thrust and decreasing weight and rather quickly moves out of the thick atmosphere near the surface of the earth." and "As the rocket ascends, it also begins to pitch over, and its flight path becomes more inclined to the vertical."',
    url: GLENN,
  },
  {
    source: 'orbit-glenn-flight-to-orbit',
    locator:
      '"Staging": "The lighter, upper stage continues to accelerate under the power of its engine and to pitch over to the horizontal."',
    url: GLENN,
  },
];

/**
 * "Computers steered the real rocket, not the crew": a computer on board
 * guided the two Saturns, the Saturn IB (Apollo 7) and the Saturn V
 * (Apollo 11); Gemini's Titan II was guided by radio from the ground, by
 * computers there.
 */
export const COMPUTERS_STEERED: Citations = [
  {
    source: 'orbit-nasm-lvdc-cards',
    locator:
      '"The LVDC was installed above the third stage of the Saturn V, or above the second stage of the Saturn 1B, and was used to guide the rocket from launch into Earth orbit."',
    url: LVDC,
  },
  {
    source: 'apollo-7-mission-report',
    locator:
      'Appendix A, section A.4.3, "Instrument Unit", page A-45 (PDF page 388): "The instrument unit houses electrical and mechanical equipment that guides, controls, and monitors the launch vehicle from lift-off until conclusion of orbital lifetime"',
    url: APOLLO_7_REPORT,
  },
  {
    source: 'orbit-gemini-launch-vehicle-development',
    locator:
      'Introduction, "Modifications Required To Adapt the Titan II to a Gemini Launch Vehicle", page 107 (PDF page 1): "The Titan II inertial guidance system was replaced with a radio guidance system."',
    url: GLV_DEVELOPMENT,
  },
  {
    source: 'on-the-shoulders-of-titans',
    locator:
      'Chapter IV, "Organizing Project Gemini", page 88 (PDF page 109): General Electric was to "furnish the booster radio guidance system (the missile used inertial guidance)", and the Burroughs Corporation "to supply ground computers and implement launch vehicle guidance equations"',
  },
  {
    source: 'gemini-8-mission-report',
    locator:
      'Section 4.3.1.1, "Launch", page 4-16 (PDF page 102): "After BECO, the Radio Guidance System (RGS) corrected the errors accumulated during Stage I flight and guided Stage II to a near-nominal insertion."',
    url: GEMINI_8_REPORT,
  },
  {
    source: 'gemini-8-mission-report',
    locator:
      'Section 5.2.5.2, "Radio guidance", page 5-127 (PDF page 263), on the pitch steering commands: "This particular phenomenon is a normal characteristic of tracking data when the ground guidance system is being influenced by atmospheric effects."',
    url: GEMINI_8_REPORT,
  },
];

/**
 * "The spacecraft lets go of the rocket and comes down in the ocean under its
 * parachutes": the plan when a climb failed above the air. For Apollo, the
 * spacecraft separates and lands in the Atlantic, under its parachutes; for
 * Gemini, the landing areas for such an abort were at sea, from beyond the
 * area off Cape Kennedy to the west coast of Africa.
 */
export const COMING_DOWN: Citations = [
  {
    source: 'orbit-apollo-abort-planning',
    locator:
      'Launch Phase, "Return to Earth", page 8 (PDF page 17): "A mode II abort may occur after the vehicle leaves the atmosphere, where there is little chance of aerodynamic loads that can lead to launch-vehicle breakup and explosion. A mode II abort consists simply of a separation of the spacecraft and the launch vehicle, followed by spacecraft orientation to entry attitude and a subsequent landing in the Atlantic Ocean."',
    url: ABORT_PLANNING,
  },
  {
    source: 'apollo-7-mission-report',
    locator:
      'Appendix A, section A.1.8, "Service Propulsion System", page A-11 (PDF page 354): "The service propulsion system provides the primary impulse for all major velocity changes, including the capability for launch abort after the launch escape system has been jettisoned."',
    url: APOLLO_7_REPORT,
  },
  {
    source: 'apollo-7-mission-report',
    locator:
      'Appendix A, section A.2, "Launch Escape System", page A-41 (PDF page 384): "In the event of an abort, the launch escape system would be jettisoned prior to parachute deployment."',
    url: APOLLO_7_REPORT,
  },
  {
    source: 'gemini-8-mission-report',
    locator:
      'Section 6.3.1, "Recovery Force Deployment", page 6-31 (PDF page 399): "Launch-abort (powered flight) landing areas are areas within the boundaries formed by the most northern and southern launch azimuths, the seaward extremity of the launch-site landing area, and the west coast of Africa. A landing within these boundaries would occur following an abort above 45 000 feet and prior to spacecraft orbital insertion."',
    url: GEMINI_8_REPORT,
  },
];
