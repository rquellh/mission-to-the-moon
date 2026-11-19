import type { Source } from "../../source-types.ts";

/**
 * Sources cited only by Gemini 9A. No NASA copy of the Gemini IX-A mission
 * report (MSC-G-R-66-6) was found, so the flight is told from the crew's
 * air-to-ground and onboard transcript, NASA's real-time commentary, the
 * rendezvous paper of the Gemini Summary Conference (a shared source, registered in sources.ts), NASA's pages, and the
 * NASA histories registered for every mission (the chronology, SP-4002, and
 * On the Shoulders of Titans, SP-4203).
 */
export const sources = {
  "gemini-9a-voice-transcript": {
    title: "Gemini IX-A Composite Air-to-Ground and Onboard Voice Tape Transcription",
    publisher: "NASA Manned Spacecraft Center (NASA History, Mission Transcripts: Mercury, Gemini, and Apollo)",
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/gt09a2-t.pdf",
    checked: "2026-11-19",
    use: "Gemini IX-A crew and capsule communicator calls with their ground elapsed times: lift-off, staging, engine cutoff, the catch-up and rendezvous firings, the first sight of the ATDA, the half-open shroud and the \"angry alligator\", the spacewalk, retrofire, the parachutes, and splashdown.",
  },
  "gemini-9a-pao-commentary": {
    title: "Gemini IX-A/2 PAO Mission Commentary Transcript",
    publisher: "NASA Manned Spacecraft Center, Public Affairs Office (NASA History, Mission Transcripts: Mercury, Gemini, and Apollo)",
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/gt09a2-p.pdf",
    checked: "2026-11-19",
    use: "Gemini Control's commentary during the flight: the orbit after the first catch-up firing, how far Gemini IX-A led the ATDA overnight, and the orbit after the orbit-shaping firing on the third day.",
  },
  "gemini-9a-nasa-mission-page": {
    title: "Gemini IX",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/gemini-ix/",
    checked: "2026-11-19",
    use: "Gemini IX-A mission facts: crew roles, launch and landing times in UT, duration, landing site, the spacewalk's length, and the mission overview.",
  },
  "gemini-9a-nasa-angry-alligator": {
    title: "Gemini IX and the Angry Alligator",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/gemini-ix-and-the-angry-alligator/",
    checked: "2026-11-19",
    use: "The crew change, the lost Agena, the third launch attempt, the optical rendezvous, Cernan's spacewalk and what it changed, the landing's accuracy, Cernan's weight loss, and where the spacecraft is displayed.",
  },
  "gemini-9a-nasm-capsule": {
    title: "Capsule, Gemini IX-A",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/capsule-gemini-ix/nasm_A19710157000",
    checked: "2026-11-19",
    use: "That NASA transferred the Gemini IX-A spacecraft to the Smithsonian in 1967 and that it is not on display at the National Air and Space Museum (its Display Status).",
  },
} as const satisfies Record<string, Source>;
