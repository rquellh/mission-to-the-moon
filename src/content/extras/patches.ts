import type { Source } from "../source-types.ts";

/**
 * Sources cited only by the mission patch book. The book also cites two
 * sources other parts of the site register: "apollo-by-the-numbers" (its
 * table of Apollo mission insignias) and Gemini 5's "nasa-gemini-5-55-years".
 */
export const sources = {
  "patches-nasa-image-library": {
    title: "NASA Image and Video Library",
    publisher: "NASA",
    url: "https://images.nasa.gov/",
    checked: "2026-11-19",
    use: "The official emblem images for Gemini 5, 6, 7, 8, 9, and 11 and for Apollo 1, 7, 9, and 11 to 17, with their captions, which say what each emblem shows and, for some, who designed it. Each image's id was confirmed through the library's search service (images-api.nasa.gov).",
  },
  "patches-nasa-mission-patches-gallery": {
    title: "Human Spaceflight Mission Patches",
    publisher: "NASA",
    url: "https://www.nasa.gov/gallery/human-spaceflight-mission-patches/",
    checked: "2026-11-19",
    use: "The Gemini XII, Apollo 8, and Apollo 10 crew patch images, which are not in the NASA Image and Video Library, with their captions.",
  },
  "patches-nasa-gemini-x-mission": {
    title: "Gemini X",
    publisher: "NASA",
    url: "https://www.nasa.gov/mission/gemini-x/",
    checked: "2026-11-19",
    use: "The Gemini X crew patch image and its alt text, which says what the patch shows.",
  },
  "patches-nasa-gemini-v-paving-the-way": {
    title: "Gemini V: Paving the Way for Long Duration Spaceflight",
    publisher: "NASA",
    url: "https://www.nasa.gov/missions/gemini/gemini-v/gemini-v-paving-the-way-for-long-duration-spaceflight/",
    checked: "2026-11-19",
    use: "That Gemini V was the first mission with a crew insignia, its covered wagon, and the \"8 Days or Bust\" slogan covered on the patches the crew wore.",
  },
  "patches-nasa-apollo-8-to-the-moon-and-back": {
    title: "To the Moon and Back: Apollo 8 and the Future of Lunar Exploration",
    publisher: "NASA",
    url: "https://www.nasa.gov/missions/apollo/to-the-moon-and-back-apollo-8-and-the-future-of-lunar-exploration/",
    checked: "2026-11-19",
    use: "That Jim Lovell sketched the Apollo 8 patch while Frank Borman flew them back to Houston.",
  },
  "patches-nasm-remembering-michael-collins": {
    title: "Remembering Michael Collins",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/stories/editorial/remembering-michael-collins",
    checked: "2026-11-19",
    use: "That Michael Collins designed the Apollo 11 patch, what it shows, and why it leaves out the crew's names.",
  },
  "patches-nasm-gemini-3-patch": {
    title: "Patch, Mission, Gemini 3",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/patch-mission-gemini-3/nasm_A19820387000",
    checked: "2026-11-19",
    use: "That the first NASA mission patches came with Gemini 5, and that designs for earlier flights were made afterward, for collectors.",
  },
  "patches-nasm-gemini-4-patch": {
    title: "Patch, Mission, Gemini 4, space-flown",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/patch-mission-gemini-4-space-flown/nasm_A20010644000",
    checked: "2026-11-19",
    use: "That the Gemini 4 patch was made after the flight, without the crew's input, and that crew patch designs began with Gemini V.",
  },
  "patches-nasm-flag-patch": {
    title: "Patch, United States Flag, Space Shuttle, STS-69 (Gernhardt): a later shuttle flag patch, whose description tells how flags came to be worn, starting with Gemini IV",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/patch-united-states-flag-shuttle-sts-69-gernhardt/nasm_A20140162000",
    checked: "2026-11-19",
    use: "That the Gemini IV crew, without a mission patch, chose to wear an American flag on their suits, which became a custom.",
  },
  "patches-nasm-gemini-6-patch": {
    title: "Patch, Mission, Gemini 6",
    publisher: "Smithsonian National Air and Space Museum",
    url: "https://airandspace.si.edu/collection-objects/patch-mission-gemini-6/nasm_A19820390000",
    checked: "2026-11-19",
    use: "That no new mission patch was made when Gemini 6 was put off and renamed Gemini 6A.",
  },
} as const satisfies Record<string, Source>;
