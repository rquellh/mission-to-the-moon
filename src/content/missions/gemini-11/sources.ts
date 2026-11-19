import type { Source } from "../../source-types.ts";

/** Sources cited only by Gemini 11 (its rendezvous paper is the shared "gemini-rendezvous-summary"). */
export const sources = {
  "gemini-11-voice-transcript": {
    title: "Gemini XI Voice Communications (Air-to-Ground, Ground-to-Air and On-Board Transcription)",
    publisher: "NASA Manned Spacecraft Center, Houston, Texas",
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/gt11-tec.pdf",
    checked: "2026-11-19",
    use: "Gemini 11 moments as the crew and the ground spoke them, by ground elapsed time: staging, docking, the spacewalk, the Agena engine firings, undocking for the tether exercise, the second rendezvous, retrofire, and the last minutes before landing. NASA's mission report for this flight was not found, so the transcript stands in for its sequence of events.",
  },
  "gemini-11-mission-commentary": {
    title: "Gemini 11 Mission Commentary",
    publisher: "NASA Public Affairs (Gemini Launch Control and Gemini Control, Houston)",
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/gt11-pao.pdf",
    checked: "2026-11-19",
    use: "The Agena's climb to orbit, the terminal phase maneuver, the separation burn after the second rendezvous, and the equipment section's separation before retrofire, as the public affairs officers announced them.",
  },
  "nasa-gemini-11-mission": {
    title: "Gemini XI",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/gemini-xi/",
    checked: "2026-11-19",
    use: "Gemini XI overview: crew roles, launch and landing times in EST and UT, the landing site, the recovery ship, the duration, and the first-orbit rendezvous and record altitude.",
  },
  "nasa-gemini-11-55-years": {
    title: "55 Years Ago: Gemini XI Achieves One-Orbit Rendezvous, Record Altitude",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/55-years-ago-gemini-xi-achieves-one-orbit-rendezvous-record-altitude/",
    checked: "2026-11-19",
    use: "Why the first-orbit rendezvous mattered for Apollo, the two-second launch window, the 100-foot tether, the spin rates and artificial gravity, the recovery, and where the spacecraft is displayed.",
  },
  "nasm-gemini-11-capsule": {
    title: "Capsule, Gemini XI",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/capsule-gemini-xi/nasm_A19680260000",
    checked: "2026-11-19",
    use: "That the first-orbit rendezvous pioneered a technique used in the Apollo lunar landings, and that the Smithsonian's Gemini XI capsule is not on display at the National Air and Space Museum.",
  },
} as const satisfies Record<string, Source>;
