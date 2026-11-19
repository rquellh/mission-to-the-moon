/**
 * The three launch vehicles that carried the crews on this site, with
 * their cited heights as launched (spacecraft and escape tower on top).
 * Which flights each one launched is read from the missions' own stories
 * (`launch.value.vehicle`), and the shapes from their vehicle files at
 * liftoff, so neither is copied here.
 */
import { elapsedToSeconds, type Citations, type Fact, type Program } from "../../content/types.ts";
import type { MissionBundle } from "../../content/missions/bundle.ts";
import type { VehiclePart } from "../../content/vehicle-types.ts";

const ABN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
/** Apollo by the Numbers' "Launch Vehicle/Spacecraft Key Facts" table, printed over three pages. */
const KEY_FACTS = [1, 2, 3].map((page) => `${ABN}Apollo_18-1${page}_Launch_Vehicle-Spacecraft_Key_Facts.htm`);
const PROJECT_GEMINI = "https://ntrs.nasa.gov/api/citations/19670001419/downloads/19670001419.pdf";

/** Meters in a foot (the international foot, exact). Conversions with it are ours, and say so. */
export const METERS_PER_FOOT = 0.3048;

export interface Rocket {
  id: "titan-ii" | "saturn-ib" | "saturn-v";
  /** As the missions' stories name it. */
  name: string;
  /** The mission whose vehicle file gives the part list at liftoff. */
  partsFrom: string;
  /** Matches a story's launch vehicle, for example "Saturn V (SA-506)". */
  vehicle: RegExp;
  /** The program whose flights to look through for it. */
  program: Program;
  /** Height with the spacecraft on top, as launched: the number as the source prints it, in feet. */
  height: { printed: string; citations: Citations; discrepancy?: string };
  about: Fact;
}

export const ROCKETS: readonly Rocket[] = [
  {
    id: "titan-ii",
    name: "Titan II",
    partsFrom: "gemini-8",
    vehicle: /^Titan II\b/,
    program: "gemini",
    height: {
      printed: "109",
      citations: [
        {
          source: "rockets-project-gemini",
          locator:
            'Page 29 (PDF page 33), "The Project Gemini Launch Vehicles," photo caption: "The overall assembly, GLV and Gemini, is 109 feet tall and has a maximum diameter of 10 feet."',
          url: PROJECT_GEMINI,
        },
      ],
      discrepancy:
        'NASA Kennedy Space Center\'s "The Early Years: Mercury to Apollo-Soyuz" (Information Summaries PMS 017-C, September 1991) says "The combined Gemini-Titan stood 32.9 meters (108 feet) high" (page 2) and lists "Height: 32.9 meters (108 feet)" (PDF page 10). We follow the earlier NASA document, from 1966, during the Gemini program.',
    },
    about: {
      text: {
        short:
          "The Gemini rocket was a changed version of the Titan II, a rocket built for the military. It had two stages, and the first stage's two engines pushed with 430,000 pounds of thrust.",
      },
      citations: [
        {
          source: "rockets-project-gemini",
          locator:
            'Page 29 (PDF page 33), "The Project Gemini Launch Vehicles": "The Titan part of Gemini-Titan consists of a modified version of the military Titan II" and "Its two first-stage engines produce 430,000 pounds of thrust"; photo caption: "a two-stage, liquid-fueled launch vehicle"',
          url: PROJECT_GEMINI,
        },
      ],
    },
  },
  {
    id: "saturn-ib",
    name: "Saturn IB",
    partsFrom: "apollo-7",
    vehicle: /^Saturn IB\b/,
    program: "apollo",
    height: {
      printed: "223.488",
      citations: [
        {
          source: "apollo-by-the-numbers",
          locator: 'Launch Vehicle/Spacecraft Key Facts (third page), "Total Vehicle Height (ft)" row, Apollo 7 column: "223.488"',
          url: KEY_FACTS[2] as string,
        },
      ],
    },
    about: {
      text: {
        short:
          "The Saturn IB had two stages. Its first stage had eight H-1 engines. Its second stage was an S-IVB, the same kind of stage that was the Saturn V's third stage.",
      },
      citations: [
        {
          source: "apollo-by-the-numbers",
          locator: 'Launch Vehicle/Spacecraft Key Facts (first page), "First Stage (S-IB)," "Engines, type/number" row, Apollo 7 column: "H-1/8"',
          url: KEY_FACTS[0] as string,
        },
        {
          source: "apollo-by-the-numbers",
          locator: 'Launch Vehicle/Spacecraft Key Facts (second page), heading "Third Stage (S-IVB) (2nd stage for Apollo 7)"',
          url: KEY_FACTS[1] as string,
        },
      ],
    },
  },
  {
    id: "saturn-v",
    name: "Saturn V",
    partsFrom: "apollo-11",
    vehicle: /^Saturn V\b/,
    program: "apollo",
    height: {
      printed: "363.013",
      citations: [
        {
          source: "apollo-by-the-numbers",
          locator:
            'Launch Vehicle/Spacecraft Key Facts (third page), "Total Vehicle Height (ft)" row, Apollo 8 through Apollo 17 columns: "363.013"',
          url: KEY_FACTS[2] as string,
        },
      ],
    },
    about: {
      text: {
        short: "The Saturn V had three stages, one on top of the next. Its first stage had five F-1 engines.",
      },
      citations: [
        {
          source: "apollo-by-the-numbers",
          locator:
            'Launch Vehicle/Spacecraft Key Facts (first page), "First Stage (S-IC)" and "Second Stage (S-II)," and the "Engines, type/number" row of the first stage, Apollo 8 through Apollo 17 columns: "F-1/5"',
          url: KEY_FACTS[0] as string,
        },
        {
          source: "apollo-by-the-numbers",
          locator: 'Launch Vehicle/Spacecraft Key Facts (second page), "Third Stage (S-IVB)"',
          url: KEY_FACTS[1] as string,
        },
      ],
    },
  },
];

/** The cited height in meters, to scale the model with (the conversion is ours). */
export function heightMeters(rocket: Rocket): number {
  return Number(rocket.height.printed) * METERS_PER_FOOT;
}

/** "about 110.6 meters": our conversion, to a tenth of a meter (finer than the picture needs, coarser than the source). */
export function metersText(rocket: Rocket): string {
  return `about ${heightMeters(rocket).toFixed(1)} meters`;
}

/** The main ship's parts at its first launch-layout change (liftoff), from a mission's vehicle file. */
export function liftoffParts(bundle: MissionBundle): readonly VehiclePart[] | null {
  const main = bundle.flight.ships.find((ship) => ship.role === "main");
  if (!main) return null;
  let first: readonly VehiclePart[] | null = null;
  let firstTime = Infinity;
  for (const change of bundle.vehicle) {
    if (change.ship !== main.id || change.layout !== "launch") continue;
    const time = elapsedToSeconds(change.at.value);
    if (time < firstTime) {
      first = change.parts;
      firstTime = time;
    }
  }
  return first;
}

/** The rocket a mission's story says launched it, if it is one of the three. */
export function rocketOf(bundle: MissionBundle): Rocket | undefined {
  const vehicle = bundle.mission.launch?.value.vehicle;
  return vehicle ? ROCKETS.find((rocket) => rocket.vehicle.test(vehicle)) : undefined;
}
