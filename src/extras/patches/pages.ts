/**
 * The pages of the patch book: one for each flight, and one for Apollo 1.
 *
 * Each emblem is NASA's own image of it. The image records (the file, its
 * size, what it shows, and where it comes from) are kept in
 * src/content/emblems.ts, so the end of a flight can show the patch too.
 * Every sentence about an emblem says only what NASA or the Smithsonian
 * says about it, and cites where.
 *
 * Gemini 3 and Gemini 4 have no emblem on purpose. NASA's crew patches began
 * with Gemini 5; the designs for those two flights were made later, for
 * collectors, without the crews (Smithsonian), so the book does not show them.
 */
import { emblemFor } from '../../content/emblems.ts';
import type { Citation, Fact, Photo } from '../../content/types.ts';

/** The outline drawn for a patch not collected yet, so the empty slot hints at its shape. */
export type PatchShape = 'circle' | 'hexagon' | 'shield' | 'arch' | 'triangle' | 'oval';

export interface PatchPage {
  /** The mission's id, as in the mission list. */
  mission: string;
  /** NASA's image of the crew's emblem. Missing when the crew wore no mission patch. */
  emblem?: Photo;
  shape: PatchShape;
  /** One or two sentences about the emblem, or about why there is none. */
  fact: Fact;
}

/* ------------------------------------------------------------------ */
/* Citations                                                           */
/* ------------------------------------------------------------------ */

/** A caption in the NASA Image and Video Library. */
function library(id: string, title: string): Citation {
  return {
    source: 'patches-nasa-image-library',
    locator: `Image ${id}, "${title}": caption`,
    url: `https://images.nasa.gov/details/${id}`,
  };
}

/** A caption in NASA's mission patch gallery, on the image's own page. */
function gallery(title: string, slug: string): Citation {
  return {
    source: 'patches-nasa-mission-patches-gallery',
    locator: `"${title}": caption`,
    url: `https://www.nasa.gov/image-detail/${slug}/`,
  };
}

/** Apollo by the Numbers, table 18-18, "Mission Insignias". */
function insignias(mission: string): Citation {
  return {
    source: 'apollo-by-the-numbers',
    locator: `"Mission Insignias" table, ${mission} entry`,
    url: 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_18-18_Mission_Insignias.htm',
  };
}

/** A mission's emblem image, from the shared records. Every page that shows one must have one there. */
function emblem(mission: string): Photo {
  const image = emblemFor(mission);
  if (!image) throw new Error(`src/content/emblems.ts has no emblem image for ${mission}`);
  return image;
}

/* ------------------------------------------------------------------ */
/* The pages                                                           */
/* ------------------------------------------------------------------ */

export const pages: readonly PatchPage[] = [
  {
    mission: 'gemini-3',
    shape: 'circle',
    fact: {
      text: {
        short:
          "NASA's first mission patches came later in 1965, with Gemini 5. The design for this flight was made afterward, so that collectors and the public could remember every flight.",
      },
      citations: [
        {
          source: 'patches-nasm-gemini-3-patch',
          locator:
            'Description, second paragraph: "the first NASA mission patches was not created until Gemini 5 later in 1965, designs for earlier missions were created retroactively to allow collectors and the public to commemorate"',
        },
        {
          source: 'patches-nasm-gemini-4-patch',
          locator:
            'Description, first paragraph: "After the fact and without crew input or approval, patch designs were created for the Mercury single-astronaut missions and the first Gemini dual-astronaut missions"',
        },
      ],
    },
  },
  {
    mission: 'gemini-4',
    shape: 'circle',
    fact: {
      text: {
        short:
          'This crew did not wear a mission patch. Instead, James McDivitt and Ed White chose to wear an American flag on their suits, and that became a custom astronauts still follow.',
      },
      citations: [
        {
          source: 'patches-nasm-flag-patch',
          locator:
            'Description of this later Space Shuttle flag patch, first paragraph, which tells the Gemini IV story: "Without a distinctive mission patch, those astronauts decided to wear an American flag on their suits. That became a custom still followed"',
        },
        {
          source: 'patches-nasm-gemini-4-patch',
          locator:
            'Description, first paragraph: "After the fact and without crew input or approval, patch designs were created for the Mercury single-astronaut missions and the first Gemini dual-astronaut missions"',
        },
      ],
    },
  },
  {
    mission: 'gemini-5',
    shape: 'circle',
    emblem: emblem('gemini-5'),
    fact: {
      text: {
        short:
          'Gemini 5 was the first mission with a crew patch: a covered wagon, for the pioneer spirit and a long journey. Gordon Cooper added the words "8 Days or Bust," but NASA\'s leader worried the flight would be called a bust if it ended early, so cloth was sewn over the words on the patches the crew wore.',
      },
      citations: [
        {
          source: 'patches-nasa-gemini-v-paving-the-way',
          locator:
            'Photo caption beginning "Gemini V was the first mission to have a crew insignia"; James Webb\'s memo: "If the flight does not go eight days, there are many who are going to say it was ‘busted’"; and the paragraph after the caption: "fabric was sewn over the motto on the patches worn by Cooper and Conrad during the flight"',
        },
        {
          source: 'nasa-gemini-5-55-years',
          locator:
            'Paragraph on the patch: "a Conestoga covered wagon to symbolize the long journey. He also added the words “8 Days or Bust” to the patch", approved "on the condition that the motto be covered"',
        },
        library('S66-59530', 'MISSION PATCH - GEMINI-5 SPACE FLIGHT - MSC'),
      ],
    },
  },
  {
    mission: 'gemini-6a',
    shape: 'hexagon',
    emblem: emblem('gemini-6a'),
    fact: {
      text: {
        short:
          "This patch has six sides for Gemini 6, and the spacecraft's path traces a 6 across Castor and Pollux, the twin stars of Gemini. When the flight was put off and renamed Gemini 6A, a new mission patch was never issued.",
      },
      citations: [
        library('jsc2006e39555', 'Gemini 6 patch'),
        library('S65-55983', 'GEMINI-TITAN (GT)-6 - INSIGNIA (PATCH) - MSC'),
        {
          source: 'patches-nasm-gemini-6-patch',
          locator:
            'Description, second paragraph: "the mission was rescheduled, renamed Gemini 6A, and launched after Gemini VII. A new mission patch was never issued, however"',
        },
      ],
    },
  },
  {
    mission: 'gemini-7',
    shape: 'circle',
    emblem: emblem('gemini-7'),
    fact: {
      text: {
        short:
          'A Gemini spacecraft is shown beside a torch held in a hand. The Roman numeral VII stands for the seventh flight in the Gemini series.',
      },
      citations: [library('S65-54129', 'GEMINI 7 - INSIGNIA - EMBLEM - PATCH - MSC')],
    },
  },
  {
    mission: 'gemini-8',
    shape: 'circle',
    emblem: emblem('gemini-8'),
    fact: {
      text: {
        short:
          'This patch was made for the flight of Neil Armstrong and David Scott. Its Roman numeral VIII stands for the eighth flight in the Gemini series.',
      },
      citations: [library('S66-23978', 'GEMINI-TITAN (GT)-8 - INSIGNIA - COLOR DESIGN - MSC')],
    },
  },
  {
    mission: 'gemini-9a',
    shape: 'shield',
    emblem: emblem('gemini-9a'),
    fact: {
      text: {
        short:
          'Two spacecraft stand for a Gemini meeting and docking with an Agena, and an astronaut on a line stands for the planned spacewalk. The Roman numeral IX stands for the ninth flight in the Gemini series.',
      },
      citations: [library('S66-28075', 'GEMINI-TITAN (GT)-9 - INSIGNIA - MSC')],
    },
  },
  {
    mission: 'gemini-10',
    shape: 'circle',
    emblem: emblem('gemini-10'),
    fact: {
      text: {
        short:
          'This patch shows the Roman numeral X with two stars and a drawing of a rendezvous, when spacecraft meet in space.',
      },
      citations: [
        {
          source: 'patches-nasa-gemini-x-mission',
          locator:
            'Alt text of the Gemini X patch image on this page: "The Gemini X patch showing a roman numeral 10 with two stars and a rendezvous graphic"',
        },
      ],
    },
  },
  {
    mission: 'gemini-11',
    shape: 'arch',
    emblem: emblem('gemini-11'),
    fact: {
      text: {
        short:
          'Two spacecraft stand for a Gemini meeting and docking with an Agena, and an astronaut on a line stands for the planned spacewalk. The Roman numeral XI stands for the eleventh flight in the Gemini series.',
      },
      citations: [library('S66-44308', 'ROUNDUP - EMBLEM - GEMINI-TITAN (GT)-11 - MSC')],
    },
  },
  {
    mission: 'gemini-12',
    shape: 'circle',
    emblem: emblem('gemini-12'),
    fact: {
      text: {
        short:
          "This patch shows the Gemini spacecraft, the crew's last names, Lovell and Aldrin, and the Roman numeral for 12.",
      },
      citations: [gallery('Gemini XII Crew Patch', 'gemini_xii_2_crew_patch_s66-51710')],
    },
  },
  {
    mission: 'apollo-1',
    shape: 'circle',
    emblem: emblem('apollo-1'),
    fact: {
      text: {
        short:
          'Gus Grissom, Ed White, and Roger Chaffee died in a fire on the launch pad before they could fly. Their patch shows an Apollo spacecraft circling Earth, with the stars and stripes of the U.S. flag behind it and the Moon to the right, a reminder of the goal.',
      },
      citations: [
        library('S66-36742', 'APOLLO-SATURN (AS)-204 INSIGNIA - MSC'),
        insignias('Apollo 1'),
      ],
    },
  },
  {
    mission: 'apollo-7',
    shape: 'circle',
    emblem: emblem('apollo-7'),
    fact: {
      text: {
        short:
          'The command and service module circles Earth, trailing orange flame, because this flight stayed in orbit around Earth. The Roman numeral VII appears in the Pacific region of the globe.',
      },
      citations: [
        insignias('Apollo 7'),
        library(
          'S68-26668',
          'Official Emblem - Apollo 7 - First (1st) Manned Apollo Space Mission',
        ),
      ],
    },
  },
  {
    mission: 'apollo-8',
    shape: 'triangle',
    emblem: emblem('apollo-8'),
    fact: {
      text: {
        short:
          'Jim Lovell sketched ideas for this patch while Frank Borman flew them back to Texas, and a NASA artist finished it. Its shape is the command module, and the red 8 loops around Earth and the Moon, the path the crew would fly.',
      },
      citations: [
        {
          source: 'patches-nasa-apollo-8-to-the-moon-and-back',
          locator:
            'Caption of the patch: "Borman flew a plane back to Texas while Lovell sat in the passenger seat, sketching ideas for a mission patch", "polished off by a NASA artist"',
        },
        insignias('Apollo 8'),
        gallery('Apollo 8 Mission Patch', 's68-51093'),
      ],
    },
  },
  {
    mission: 'apollo-9',
    shape: 'circle',
    emblem: emblem('apollo-9'),
    fact: {
      text: {
        short:
          'The lunar module flies near the command module, for the first flight with a crew of the spacecraft that would land people on the Moon. The red inside the D in McDivitt marks this as Apollo\'s "D" mission.',
      },
      citations: [insignias('Apollo 9'), library('S69-18569', 'Emblem - Apollo 9 Space Mission')],
    },
  },
  {
    mission: 'apollo-10',
    shape: 'shield',
    emblem: emblem('apollo-10'),
    fact: {
      text: {
        short:
          'A big Roman numeral X sits on the Moon as the command module circles and the lunar module makes its low pass over the surface, with Earth behind. Apollo 10 did not land, but the large X showed it would add a lot to the Apollo program.',
      },
      citations: [
        insignias('Apollo 10'),
        gallery('Apollo 10 Crew Patch', 'apollo_10_patch_s69-31959'),
      ],
    },
  },
  {
    mission: 'apollo-11',
    shape: 'circle',
    emblem: emblem('apollo-11'),
    fact: {
      text: {
        short:
          "Michael Collins designed this patch: an eagle landing on the Moon, carrying an olive branch for peace. It leaves out the crew's names, to share the credit with the thousands of people who helped the mission.",
      },
      citations: [
        {
          source: 'patches-nasm-remembering-michael-collins',
          locator:
            'Paragraph beginning "Collins joined NASA as an astronaut in 1963": "Collins also designed Apollo 11’s iconic mission patch"',
        },
        insignias('Apollo 11'),
      ],
    },
  },
  {
    mission: 'apollo-12',
    shape: 'circle',
    emblem: emblem('apollo-12'),
    fact: {
      text: {
        short:
          'The clipper ship stands for the all-Navy crew and links the age of sailing ships to the age of spaceflight. The four stars stand for the crew and for C. C. Williams, who was first chosen to fly with them and died in a plane crash.',
      },
      citations: [insignias('Apollo 12'), library('S69-52336', 'Official insignia of Apollo 12')],
    },
  },
  {
    mission: 'apollo-13',
    shape: 'circle',
    emblem: emblem('apollo-13'),
    fact: {
      text: {
        short:
          'Three horses pull the chariot of Apollo, the Greek sun god, across the Moon, for the light of knowledge the Apollo flights brought to everyone. The Latin words Ex Luna, Scientia mean "From the Moon, Knowledge."',
      },
      citations: [insignias('Apollo 13'), library('S69-60662', 'Apollo 13 Emblem')],
    },
  },
  {
    mission: 'apollo-14',
    shape: 'oval',
    emblem: emblem('apollo-14'),
    fact: {
      text: {
        short:
          "The crew, Alan Shepard, Stuart Roosa, and Edgar Mitchell, designed this patch. It shows the astronaut pin flying to the Moon, leaving a comet's trail from where it lifted off on Earth.",
      },
      citations: [library('S70-17851', 'Apollo 14 Emblem'), insignias('Apollo 14')],
    },
  },
  {
    mission: 'apollo-15',
    shape: 'circle',
    emblem: emblem('apollo-15'),
    fact: {
      text: {
        short:
          "Three birds, symbols of flight for the three crew members, are drawn over the landing site beside Hadley Rille, at the foot of the Moon's Apennine mountains. The XV beside them is the mission number.",
      },
      citations: [insignias('Apollo 15'), library('S71-30463', 'Apollo 15 insignia')],
    },
  },
  {
    mission: 'apollo-16',
    shape: 'circle',
    emblem: emblem('apollo-16'),
    fact: {
      text: {
        short:
          "A NASA artist drew this patch from the crew's ideas. An eagle and a striped shield rest on the gray Moon as a tribute to the people of the United States, and the 16 stars stand for the mission number.",
      },
      citations: [library('S71-56246', 'Apollo 16 insignia'), insignias('Apollo 16')],
    },
  },
  {
    mission: 'apollo-17',
    shape: 'circle',
    emblem: emblem('apollo-17'),
    fact: {
      text: {
        short:
          'Artist Robert McCall designed this patch with the crew. The face is Apollo, the Greek sun god, looking toward Saturn and a far galaxy, a hint that people may one day travel to the planets and perhaps the stars.',
      },
      citations: [
        library('s72-49079', 'Emblem - Apollo 17 Lunar Landing Mission'),
        insignias('Apollo 17'),
      ],
    },
  },
];

/** The page for a mission, if the book has one. */
export function pageFor(mission: string): PatchPage | undefined {
  return pages.find((page) => page.mission === mission);
}

/**
 * The missions this device has opened, from what the site stored. Anything
 * that is not a list of mission ids counts as none.
 */
export function openedMissions(stored: unknown): ReadonlySet<string> {
  if (!Array.isArray(stored)) return new Set();
  return new Set(stored.filter((id): id is string => typeof id === 'string'));
}
