/**
 * The crews' mission patches: NASA's own image of each emblem, by mission
 * id. Only the image records live here (the file, its size, what it shows,
 * and where it comes from), so both the end of a flight and the patch book
 * (src/extras/patches) can show a patch. Everything the book says about a
 * patch stays with the book.
 *
 * Each image is from the NASA Image and Video Library where it is there,
 * and otherwise from NASA's mission patch gallery. Gemini 3 and Gemini 4
 * have none on purpose: NASA's crew patches began with Gemini 5 (see the
 * book's pages for why).
 */
import type { Photo } from './types.ts';

const DIR = 'media/extras/patches/';

/** An emblem from the NASA Image and Video Library, sized for the site. */
function libraryEmblem(
  file: string,
  id: string,
  width: number,
  height: number,
  alt: string,
): Photo {
  return {
    src: `${DIR}${file}`,
    width,
    height,
    alt,
    credit: 'NASA',
    sourceUrl: `https://images.nasa.gov/details/${id}`,
  };
}

/** An emblem from NASA's mission patch gallery. */
function galleryEmblem(
  file: string,
  slug: string,
  width: number,
  height: number,
  alt: string,
): Photo {
  return {
    src: `${DIR}${file}`,
    width,
    height,
    alt,
    credit: 'NASA',
    sourceUrl: `https://www.nasa.gov/image-detail/${slug}/`,
  };
}

const EMBLEMS = new Map<string, Photo>([
  [
    'gemini-5',
    libraryEmblem(
      'gemini-5-s66-59530.jpg',
      'S66-59530',
      480,
      480,
      'A round cloth patch with a covered wagon on a white field, the words Gemini 5 above it, and the names Cooper and Conrad on either side.',
    ),
  ],
  [
    'gemini-6a',
    libraryEmblem(
      'gemini-6a-s65-55983.jpg',
      'S65-55983',
      480,
      384,
      'A six-sided dark blue patch with gold stars, a small Gemini spacecraft, and the curving path it flies. It reads GTA-6, Schirra, and Stafford.',
    ),
  ],
  [
    'gemini-7',
    libraryEmblem(
      'gemini-7-s65-54129.jpg',
      'S65-54129',
      480,
      480,
      'A round blue patch with a white hand holding a gold torch, a white Gemini spacecraft, and the Roman numeral VII.',
    ),
  ],
  [
    'gemini-8',
    libraryEmblem(
      'gemini-8-s66-23978.jpg',
      'S66-23978',
      464,
      480,
      'A round white patch with a rainbow-colored beam of light, two small stars, the Roman numeral VIII, and the names Armstrong and Scott.',
    ),
  ],
  [
    'gemini-9a',
    libraryEmblem(
      'gemini-9a-s66-28075.jpg',
      'S66-28075',
      480,
      342,
      'A black patch with a large white Roman numeral IX, a Gemini spacecraft and an Agena target joined across it, and a tiny astronaut on a line.',
    ),
  ],
  [
    'gemini-10',
    galleryEmblem(
      'gemini-10-crew-patch.png',
      'gemini_x_2_crew_patch',
      480,
      418,
      'A round light blue patch with a large red Roman numeral X, two yellow stars, and thin lines looping around it.',
    ),
  ],
  [
    'gemini-11',
    libraryEmblem(
      'gemini-11-s66-44308.jpg',
      'S66-44308',
      384,
      480,
      'A dark blue patch with a pointed top, showing a Gemini spacecraft and an Agena, a small astronaut on a line, the Roman numeral XI, and the names Conrad and Gordon.',
    ),
  ],
  [
    'gemini-12',
    galleryEmblem(
      'gemini-12-s66-51710.jpg',
      'gemini_xii_2_crew_patch_s66-51710',
      472,
      480,
      'A round patch, half yellow Moon and half dark blue sky, with an orange Gemini spacecraft, the Roman numeral XII, and the names Lovell and Aldrin.',
    ),
  ],
  [
    'apollo-1',
    libraryEmblem(
      'apollo-1-s66-36742.jpg',
      'S66-36742',
      463,
      480,
      'A round patch with an Apollo spacecraft over Earth, the stars and stripes behind it, the Moon at the right, and the names Grissom, White, and Chaffee around the edge, with Apollo 1 at the bottom.',
    ),
  ],
  [
    'apollo-7',
    libraryEmblem(
      'apollo-7-s68-26668.jpg',
      'S68-26668',
      480,
      381,
      'A patch with the command and service module flying around Earth, trailing orange flame, with the Americas on the globe, the Roman numeral VII, and the names Schirra, Eisele, and Cunningham.',
    ),
  ],
  [
    'apollo-8',
    galleryEmblem(
      'apollo-8-s68-51093.jpg',
      's68-51093',
      480,
      480,
      'A patch shaped like the command module, with a red figure 8 looping around Earth and the Moon, and the names Borman, Lovell, and Anders.',
    ),
  ],
  [
    'apollo-9',
    libraryEmblem(
      'apollo-9-s69-18569.jpg',
      'S69-18569',
      480,
      480,
      'A round dark blue patch with a Saturn V rocket at the left, the command module and the lunar module in space, the names McDivitt, Scott, and Schweickart, and Apollo IX at the bottom.',
    ),
  ],
  [
    'apollo-10',
    galleryEmblem(
      'apollo-10-s69-31959.jpg',
      'apollo_10_patch_s69-31959',
      480,
      480,
      'A shield-shaped patch with a large Roman numeral X standing on the Moon, the command module and the lunar module flying above it, Earth behind, and the names Stafford, Young, and Cernan.',
    ),
  ],
  [
    'apollo-11',
    libraryEmblem(
      'apollo-11-s69-34875.jpg',
      'S69-34875',
      480,
      480,
      "A round patch with a bald eagle landing on the Moon's cratered surface, holding an olive branch, with Earth in the black sky and Apollo 11 across the top.",
    ),
  ],
  [
    'apollo-12',
    libraryEmblem(
      'apollo-12-s69-52336.jpg',
      'S69-52336',
      470,
      480,
      'A round patch with a sailing ship flying over the Moon, the words Apollo XII, and the names Conrad, Gordon, and Bean.',
    ),
  ],
  [
    'apollo-13',
    libraryEmblem(
      'apollo-13-s69-60662.jpg',
      'S69-60662',
      480,
      480,
      'A round patch with three golden horses racing across the Moon under a bright sun, and the words Apollo XIII and Ex Luna, Scientia.',
    ),
  ],
  [
    'apollo-14',
    libraryEmblem(
      'apollo-14-s70-17851.jpg',
      'S70-17851',
      480,
      384,
      "An oval patch with the astronaut pin flying from Earth toward the Moon with a comet's trail, and the names Shepard, Roosa, and Mitchell.",
    ),
  ],
  [
    'apollo-15',
    libraryEmblem(
      'apollo-15-s71-30463.jpg',
      'S71-30463',
      480,
      464,
      "A round patch with three red, white, and blue bird shapes over a gray drawing of the Moon's surface, and the names Scott, Worden, and Irwin.",
    ),
  ],
  [
    'apollo-16',
    libraryEmblem(
      'apollo-16-s71-56246.jpg',
      'S71-56246',
      480,
      480,
      'A round patch with an eagle on a red, white, and blue striped shield over the gray Moon, a gold symbol of flight, a ring of 16 stars, and the names Young, Mattingly, and Duke.',
    ),
  ],
  [
    'apollo-17',
    libraryEmblem(
      'apollo-17-s72-49079.jpg',
      's72-49079',
      480,
      480,
      'A round patch with the head of the statue of Apollo, an eagle with red stripes and white stars, the Moon, Saturn, and a spiral galaxy, and the names Cernan, Evans, and Schmitt.',
    ),
  ],
]);

/** NASA's image of a mission's crew patch, or undefined when the crew wore none (Gemini 3 and 4). */
export function emblemFor(missionId: string): Photo | undefined {
  return EMBLEMS.get(missionId);
}
