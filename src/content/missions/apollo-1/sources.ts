import type { Source } from "../../source-types.ts";

/** Sources cited only by Apollo 1. */
export const sources = {
  "apollo-204-review-board-report": {
    title: "Report of Apollo 204 Review Board (summary report)",
    publisher: "NASA, Apollo 204 Review Board",
    url: "https://www.nasa.gov/wp-content/uploads/static/history/Apollo204/summary.pdf",
    checked: "2026-11-19",
    use: "The canonical source for the Apollo 1 fire: the test and its purpose (Part IV, pages 4-3 to 4-4), the fire, the hatches, and the rescue (Part IV, pages 4-5 to 4-8), and the Board's findings, determinations, and recommendations (Part VI, pages 6-1 to 6-3).",
  },
  "nasa-apollo-204-history": {
    title: "NASA Apollo Mission Apollo-1",
    publisher: "NASA",
    url: "https://www.nasa.gov/history/Apollo204/",
    checked: "2026-11-19",
    use: "The Apollo 1 crew and backup crew, the Review Board's work, and that the AS-204 mission was renamed Apollo 1 in honor of the crew.",
  },
  "nasa-apollo-1-mission": {
    title: "Apollo 1",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/apollo-1/",
    checked: "2026-11-19",
    use: "What Apollo 1 was to be, its planned launch date, the crew, the time of the crew's fire report, and how the mission came to be called Apollo 1.",
  },
  "nasa-apollo-1-final-preparations": {
    title: "55 Years Ago: Final Preparations for the Planned Launch of Apollo 1",
    publisher: "NASA Johnson Space Center",
    url: "https://www.nasa.gov/humans-in-space/55-years-ago-final-preparations-for-the-planned-launch-of-apollo-1/",
    checked: "2026-11-19",
    use: "What the Apollo 1 flight was meant to do: its length, its main objectives, and its planned splashdown.",
  },
  "nasa-apollo-1-tragedy-on-the-launch-pad": {
    title: "55 Years Ago: Tragedy on the Launch Pad",
    publisher: "NASA Johnson Space Center",
    url: "https://www.nasa.gov/history/55-years-ago-tragedy-on-the-launch-pad/",
    checked: "2026-11-19",
    use: "The plugs-out test on January 27, 1967, the fire, and the pad crew's work to open the hatches.",
  },
  "nasa-apollo-1-fire-aftermath": {
    title: "55 Years Ago: The Apollo 1 Fire and its Aftermath",
    publisher: "NASA Johnson Space Center",
    url: "https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/",
    checked: "2026-11-19",
    use: "The investigation, the changes NASA made to the spacecraft and to its safety organization, the choice of the Apollo 1 backup crew to fly first, and the display of the Apollo 1 hatch.",
  },
  "nasa-apollo-1-mixed-gas-atmosphere": {
    title: "50th anniversary of NASA deciding on a mixed-gas atmosphere for Apollo, a direct result of the Apollo fire.",
    publisher: "NASA Johnson Space Center",
    url: "https://www.nasa.gov/history/50th-anniversary-of-nasa-deciding-on-a-mixed-gas-atmosphere-for-apollo-a-direct-result-of-the-apollo-fire/",
    checked: "2026-11-19",
    use: "The oxygen and nitrogen mix NASA chose for the cabin on the launch pad after the fire, and the flammability tests behind that choice.",
  },
  "nasa-apollo-1-tribute-exhibit": {
    title: "Apollo 1 Crew Honored in New Tribute Exhibit",
    publisher: "NASA",
    url: "https://www.nasa.gov/history/apollo-1-crew-honored-in-new-tribute-exhibit/",
    checked: "2026-11-19",
    use: "The tribute exhibit \"Ad Astra Per Aspera\" at Kennedy Space Center, which first put the Apollo 1 hatch on display, and the crew's work together during Gemini 4.",
  },
  "nasa-apollo-1-day-of-remembrance": {
    title: "Kennedy Space Center Honors Fallen Heroes of Human Spaceflight",
    publisher: "NASA",
    url: "https://www.nasa.gov/centers-and-facilities/kennedy/kennedy-space-center-honors-fallen-heroes-of-human-spaceflight/",
    checked: "2026-11-19",
    use: "NASA's yearly Day of Remembrance for the crews of Apollo 1, Challenger, and Columbia, and the Space Mirror Memorial.",
  },
  "nasm-apollo-1": {
    title: "Apollo 1",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/explore/stories/apollo-missions/apollo-1",
    checked: "2026-11-19",
    use: "The three astronauts and their earlier flights, the old hatch's escape procedure, and the naming of the mission as Apollo 1.",
  },
  "nasm-apollo-1-learning-from-tragedy": {
    title: "Learning from Tragedy: Apollo 1 Fire",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/stories/editorial/learning-tragedy-apollo-1-fire",
    checked: "2026-11-19",
    use: "The old two-part hatch and the new unified hatch, with the hatches the Museum holds from Apollo 4 and Apollo 11.",
  },
} as const satisfies Record<string, Source>;
