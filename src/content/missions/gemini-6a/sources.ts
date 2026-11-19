import type { Source } from "../../source-types.ts";

/**
 * Sources registered by Gemini 6A. Gemini 7 also cites the supplemental
 * report, the voice transcript, and the Gemini VII mission report below, by
 * these ids, because it draws the visiting spacecraft's path from them; the
 * rest are cited only by Gemini 6A. The Gemini Summary Conference
 * rendezvous paper is shared (see sources.ts). NASA's own copy of the Gemini VI-A
 * mission report (MSC-G-R-66-2) was not found, so the flight is told from
 * its supplemental report, its air-to-ground transcript, the Gemini VII
 * mission report (which covers the meeting from the other spacecraft), and
 * NASA's histories.
 */
export const sources = {
  "gemini-6a-supplemental-report-5": {
    title:
      "Gemini GT-6A Post Flight Analysis Report, Gemini GT-6 Rendezvous and Catch-up Post Flight Report, and GT-7/6 Re-entry Mission Reconstruction Report (Supplemental Report 5 to the Gemini Program Mission Report, Gemini VI-A, MSC-G-R-66-2)",
    publisher:
      "NASA Manned Spacecraft Center, Gemini VI-A Mission Evaluation Team (prepared by IBM Federal Systems Division; NASA's scan, as hosted by the Virtual AGC project's document library at ibiblio.org)",
    url: "https://www.ibiblio.org/apollo/Documents/Gemini-6-7-PostFlightReports.pdf",
    checked: "2026-11-19",
    use: "The onboard computer's record of Gemini VI-A: the moment of insertion into orbit, second-stage engine cutoff, terminal phase initiation (also used for when the final approach to Gemini VII began, as Gemini 7 draws the visiting spacecraft), and the spacecraft's position and velocity at 400,000 feet on the way down.",
  },
  "gemini-6a-voice-transcript": {
    title: "Gemini VI Voice Communications (Air-to-Ground, Ground-to-Air and On-Board Transcription)",
    publisher: "NASA Manned Spacecraft Center (NASA History, Mission Transcripts: Mercury, Gemini, and Apollo)",
    url: "https://www.nasa.gov/wp-content/uploads/2026/01/gt06-tec.pdf",
    checked: "2026-11-19",
    use: "Gemini VI-A crew and capsule communicator calls with their ground elapsed times: the catch-up burns, the sighting of Gemini VII, braking, station keeping, the Jingle Bells joke, retrofire, and the parachutes (Gemini 7 also uses it for the catch-up burns, the distance from Gemini VII overnight, and the retrofire and drogue parachute calls, on Gemini VI-A's clock).",
  },
  "gemini-6a-gemini-vii-mission-report": {
    title: "Gemini Program Mission Report: Gemini VII (MSC-G-R-66-1)",
    publisher:
      "NASA Manned Spacecraft Center, Gemini Mission Evaluation Team (NASA's scan, as hosted by the Virtual AGC project's document library at ibiblio.org)",
    url: "https://www.ibiblio.org/apollo/Documents/Gemini7MissionReport.pdf",
    checked: "2026-11-19",
    use: "The rendezvous seen from Gemini VII: Gemini VI-A's launch time on both clocks, Gemini VII's orbit during the meeting (Table 4.3-IV), the Gemini VII crew's view of the approach, and the separation maneuver.",
  },
  "gemini-6a-nasa-mission-page": {
    title: "Gemini VI",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/gemini-vi/",
    checked: "2026-11-19",
    use: "Gemini VI-A mission facts: crew roles, launch and landing times in UT, duration, landing site, recovery ship, and the mission overview.",
  },
  "gemini-6a-nasa-spirit-of-76": {
    title: "55 Years Ago: The Spirit of 76 - The First Rendezvous in Space",
    publisher: "NASA Johnson Space Center (John Uri)",
    url: "https://www.nasa.gov/history/55-years-ago-the-spirit-of-76-the-first-rendezvous-in-space/",
    checked: "2026-11-19",
    use: "Why rendezvous mattered to Apollo, the launch attempts, crew radio calls, the Jingle Bells exchange, the parachute heights, and where the spacecraft is displayed.",
  },
  "gemini-6a-nasm-capsule": {
    title: "Capsule, Gemini VI-A",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/capsule-gemini-vi/nasm_A19680266000",
    checked: "2026-11-19",
    use: "That the Smithsonian holds the Gemini VI-A spacecraft and that it is not on display at the National Air and Space Museum (its Display Status).",
  },
  "gemini-6a-nasm-first-rendezvous": {
    title: "The World's First Space Rendezvous",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/stories/editorial/worlds-first-space-rendezvous",
    checked: "2026-11-19",
    use: "The \"Beat Army\" sign and the nose-to-nose flying, and where the harmonica and bells are exhibited.",
  },
} as const satisfies Record<string, Source>;
