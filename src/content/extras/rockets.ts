import type { Source } from '../source-types.ts';

/**
 * Sources cited only by the rocket lineup extra. The two Saturn heights come
 * from the shared "apollo-by-the-numbers" source (its Launch Vehicle/Spacecraft
 * Key Facts table), so only the Gemini-Titan's height needs sources here:
 * the one we follow, and the one that gives a different figure.
 */
export const sources = {
  'rockets-project-gemini': {
    title: 'Project Gemini (NASA TM X-59048)',
    publisher: 'NASA (1966), in the NASA Technical Reports Server',
    url: 'https://ntrs.nasa.gov/citations/19670001419',
    checked: '2026-11-19',
    use: 'The Gemini-Titan\'s height with its Gemini spacecraft (109 feet), and a short description of the Titan II rocket (page 29, "The Project Gemini Launch Vehicles").',
  },
  'rockets-ksc-early-years': {
    title: 'The Early Years: Mercury to Apollo-Soyuz (Information Summaries PMS 017-C)',
    publisher: 'NASA Kennedy Space Center (September 1991)',
    url: 'https://www.nasa.gov/wp-content/uploads/2015/03/167718main_early_years.pdf',
    checked: '2026-11-19',
    use: "The other figure for the Gemini-Titan's height, 32.9 meters (108 feet), named where sources differ (we follow the 1966 Project Gemini figure of 109 feet).",
  },
} as const satisfies Record<string, Source>;
