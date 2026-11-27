/**
 * Where the game's own sentences about the real flights come from. The
 * sentences are in index.ts (TEXT); their sources are folded under the Start
 * button, labeled as theirs. Each page here was opened and the quoted words
 * found on it on 2026-11-27, and every source is one the site already
 * registers (Apollo 11's own, or shared).
 */
import type { Citations } from '../../content/types.ts';

const MISSION_REPORT =
  'https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf';
const ABTN = 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/';
const ABTN_SUMMARY = `${ABTN}Apollo_11a_Summary.htm`;
const ABTN_LM_LANDING = `${ABTN}Apollo_18-27_LM_Lunar_Landing.htm`;
const NMC_LM = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C';
const DESCENT_ASCENT = 'https://ntrs.nasa.gov/api/citations/19700024568/downloads/19700024568.pdf';

/** "The computer is heading for a field of boulders": Apollo 11's automatic descent was. */
export const BOULDERS: Citations = [
  {
    source: 'apollo-11-mission-report',
    locator:
      'Section 4.10.3, "Powered Descent", page 4-9 (PDF page 38): "After it became clear that an automatic descent would terminate in a boulder field surrounding a large sharp-rimmed crater, manual control was again assumed, and the range was extended to avoid the unsatisfactory landing area."',
    url: MISSION_REPORT,
  },
  {
    source: 'apollo-by-the-numbers',
    locator:
      'Apollo 11 mission summary, "Lunar Orbit/Lunar Surface Phase" section: "the commander noted that the landing point toward which the spacecraft was headed was in the center of a large crater that appeared extremely rugged, with boulders of five to ten feet in diameter and larger. Consequently, he switched to manual attitude control to translate beyond the rough terrain area."',
    url: ABTN_SUMMARY,
  },
];

/**
 * "The real descent took more than twelve minutes, and a computer helped the
 * crew most of the way down": the firing lasted 756.39 seconds (12 minutes
 * 36.39 seconds, our arithmetic), and the crew steered by hand only near the
 * end, in its final 2.5 minutes, from about 600 feet up (out of about 52,000).
 */
export const DESCENT: Citations = [
  {
    source: 'apollo-by-the-numbers',
    locator: '"LM Lunar Landing" table, Apollo 11 column: PDI Burn Duration (sec) row, 756.39',
    url: ABTN_LM_LANDING,
  },
  {
    source: 'apollo-by-the-numbers',
    locator:
      'Apollo 11 mission summary, "Lunar Orbit/Lunar Surface Phase" section: "The LM was maneuvered manually 1,100 feet down range from the preplanned landing point during the final 2.5 minutes of descent."',
    url: ABTN_SUMMARY,
  },
  {
    source: 'apollo-11-mission-report',
    locator:
      'Section 4.10.2, "Alignment and Navigation Checks", page 4-8 (PDF page 37): "a predicted altitude at ignition of 52 000 feet above the surface"',
    url: MISSION_REPORT,
  },
  {
    source: 'apollo-11-mission-report',
    locator:
      'Section 5.3, "Powered Descent", page 5-5 (PDF page 54): "Manual control began at an altitude of approximately 600 feet."',
    url: MISSION_REPORT,
  },
];

/**
 * "The top half is flying the crew back up to orbit": the lunar module's top
 * half, its ascent stage, was made to take the crew back to orbit from a
 * descent cut short, and running low on fuel meant landing or doing that.
 */
export const BACK_TO_ORBIT: Citations = [
  {
    source: 'nssdca-master-catalog',
    locator:
      '"Apollo 11 Lunar Module / EASEP" (1969-059C), Lunar Module Spacecraft and Subsystems: "The lunar module was a two-stage vehicle", and the ascent stage was "mounted on top of the descent stage"',
    url: NMC_LM,
  },
  {
    source: 'apollo-lunar-descent-ascent-trajectories',
    locator:
      'Introduction, page 1 (PDF page 4): "The LM ascent was designed as a single powered flight maneuver to return the crew from the lunar surface (or from an aborted descent) to a satisfactory orbit from which rendezvous with the CSM could be performed."',
    url: DESCENT_ASCENT,
  },
  {
    source: 'apollo-lunar-descent-ascent-trajectories',
    locator:
      'Page 13 (PDF page 16), on the descent propellant: flight controllers advise the crew "of impending propellant depletion for an abort-or-landing decision point at least 20 seconds prior to depletion"',
    url: DESCENT_ASCENT,
  },
];
