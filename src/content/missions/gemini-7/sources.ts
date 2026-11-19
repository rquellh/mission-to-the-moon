import type { Source } from "../../source-types.ts";

/**
 * Sources cited only by Gemini 7. Gemini 7 also cites three sources that
 * Gemini 6A registers, by their Gemini 6A ids: the Gemini VII mission report
 * (MSC-G-R-66-1, "gemini-6a-gemini-vii-mission-report"), the Gemini VI-A
 * onboard computer's record ("gemini-6a-supplemental-report-5"), and the
 * Gemini VI voice transcript ("gemini-6a-voice-transcript"). It cites the
 * Gemini Summary Conference rendezvous paper by the shared id
 * "gemini-rendezvous-summary".
 */
export const sources = {
  "gemini-7-nasa-mission-page": {
    title: "Gemini VII",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/gemini-vii/",
    checked: "2026-11-19",
    use: "Gemini VII mission facts: crew roles, launch and landing times in EST and UT, duration, revolutions, landing site, the mission objectives, and the times of retrofire and recovery.",
  },
  "gemini-7-nasa-dual-gemini-flights": {
    title: "Dual Gemini Flights Achieved Crucial Spaceflight Milestones",
    publisher: "NASA Kennedy Space Center (Bob Granath)",
    url: "https://www.nasa.gov/missions/gemini/dual-gemini-flights-achieved-crucial-spaceflight-milestones/",
    checked: "2026-11-19",
    use: "Why a 14-day flight mattered for the Moon, the lightweight suits, Lovell's words at launch, the 20 experiments, and how long the endurance record stood.",
  },
  "gemini-7-nasm-capsule": {
    title: "Gemini VII Capsule",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/capsule-gemini-vii/nasm_A19680273000",
    checked: "2026-11-19",
    use: "What the flight was for, how long its record stood, and where the Gemini VII spacecraft is displayed (its Display Status).",
  },
} as const satisfies Record<string, Source>;
