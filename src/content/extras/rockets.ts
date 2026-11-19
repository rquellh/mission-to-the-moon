import type { Source } from "../source-types.ts";

/**
 * Sources cited only by the rocket lineup extra. The two Saturn heights come
 * from the shared "apollo-by-the-numbers" source (its Launch Vehicle/Spacecraft
 * Key Facts table), so only the Gemini-Titan's height needs a source here.
 */
export const sources = {
  "rockets-project-gemini": {
    title: "Project Gemini (NASA TM X-59048)",
    publisher: "NASA (1966), in the NASA Technical Reports Server",
    url: "https://ntrs.nasa.gov/citations/19670001419",
    checked: "2026-11-19",
    use: "The Gemini-Titan's height with its Gemini spacecraft (109 feet), and a short description of the Titan II rocket (page 29, \"The Project Gemini Launch Vehicles\").",
  },
} as const satisfies Record<string, Source>;
