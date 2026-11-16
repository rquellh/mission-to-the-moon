/**
 * The shape of the site's mission content.
 *
 * Each mission is one file that exports a `Mission`. Because the content is
 * type-checked, the build fails if a fact has no citation or cites a source
 * that is not in the registry (sources.ts). That is how the site keeps its
 * first rule: every fact is cited.
 *
 * The flight path (orbits, burns, landing and splashdown points) is described
 * separately, by the flight plan types in src/sim/.
 */
import type { SourceId } from "./sources";

/** Where a fact comes from: a registered source and the exact place in it. */
export interface Citation {
  source: SourceId;
  /** The table, page, or section that states the fact. */
  locator: string;
  /** A direct link, when the fact is on a different page than the source's main address. */
  url?: string;
}

/** One or more citations. A fact with none does not type-check. */
export type Citations = [Citation, ...Citation[]];

/** A value together with where it comes from. */
export interface Cited<T> {
  value: T;
  citations: Citations;
  /** When sources disagree: what the other source says, and which one we follow. */
  discrepancy?: string;
}

/**
 * Text at two reading levels.
 *
 * Write a duration of a minute or more as minutes and seconds, not as raw
 * seconds, and keep the precision the source gives: "5 minutes 57.53
 * seconds", not "357.53 seconds" and not a rounded "5 minutes 58 seconds".
 */
export interface LeveledText {
  /** One or two plain sentences a ten-year-old can follow. */
  short: string;
  /** The fuller version behind "Tell me more". */
  more?: string;
}

/** A statement shown on the site, with its sources. */
export interface Fact {
  text: LeveledText;
  citations: Citations;
  discrepancy?: string;
}

/**
 * Time on the mission clock (ground elapsed time), written the way the
 * sources print it: hours:minutes:seconds, for example "102:45:39.9".
 * The sources start this clock at "range zero", the last whole second
 * before liftoff, so liftoff itself can be a fraction of a second in.
 *
 * A time before liftoff starts with a minus sign: "-001:40:59" is 1 hour,
 * 40 minutes, 59 seconds before the clock starts. Gemini 8 needs this,
 * because its Agena target was launched before the crew.
 */
export type ElapsedTime = `${number}:${number}:${number}`;

/** Converts an elapsed time to seconds on the mission clock (negative before liftoff). */
export function elapsedToSeconds(elapsed: ElapsedTime): number {
  const before = elapsed.trim().startsWith("-");
  const [hours = 0, minutes = 0, seconds = 0] = elapsed.replace("-", "").split(":").map(Number);
  const total = hours * 3600 + minutes * 60 + seconds;
  return before ? -total : total;
}

export type Program = "gemini" | "apollo";

export interface CrewMember {
  name: string;
  /** For example "Commander" or "Lunar module pilot". */
  role: string;
}

/** A photograph hosted with the site. */
export interface Photo {
  /** Path under public/, for example "media/apollo-11/as11-40-5903.jpg". */
  src: string;
  /** Pixel size of the hosted file. */
  width: number;
  height: number;
  /** Describes the picture for someone who cannot see it. */
  alt: string;
  /** Credit line as the source gives it, for example "NASA". */
  credit: string;
  /** The page where the original can be found. */
  sourceUrl: string;
}

/**
 * Where the camera looks while an event is featured. A presentation hint,
 * not a fact: "journey" shows Earth and Moon together.
 */
export type EventView = "earth" | "moon" | "spacecraft" | "journey";

/** A named stretch of a mission, used to group events and to jump around the timeline. */
export interface Chapter {
  /** Unique within the mission, for example "landing". */
  id: string;
  /** Short and plain, for example "Landing". */
  title: string;
}

/** A moment in a mission, placed on the mission clock. */
export interface MissionEvent {
  /** Unique within the mission, for example "landing". */
  id: string;
  title: string;
  /** The id of the chapter this event belongs to. */
  chapter: string;
  elapsed: ElapsedTime;
  /** Universal time as ISO 8601, when the source gives it. */
  utc?: string;
  text: LeveledText;
  citations: Citations;
  discrepancy?: string;
  photo?: Photo;
  view: EventView;
  /** True for the events the guided tour stops at. */
  inTour?: boolean;
}

/** A flown spacecraft and the museum that displays it today. */
export interface Exhibit {
  /** For example "Command module Columbia". */
  object: string;
  museum: string;
  /** City and state or country. */
  place: string;
}

export interface Mission {
  /** For example "apollo-11". */
  id: string;
  program: Program;
  /** For example "Apollo 11". */
  name: string;
  /** "memorial" is for Apollo 1, which has no flight to show. */
  kind: "flight" | "memorial";
  /**
   * How far the flight went. It decides which camera views the site offers:
   * a flight that stayed in Earth orbit has no Moon view (see src/app/views.ts).
   */
  destination: "earth-orbit" | "moon";
  summary: Fact;
  crew: Cited<CrewMember[]>;
  launch?: Cited<{
    /** Universal time as ISO 8601. */
    utc: string;
    site: string;
    vehicle: string;
  }>;
  duration?: Cited<ElapsedTime>;
  /** Radio names of the spacecraft, for example Columbia and Eagle. */
  callSigns?: Cited<{ craft: string; name: string }[]>;
  accomplishments: Fact[];
  /** In the order they happen. Empty for a memorial. */
  chapters: Chapter[];
  /** In order of elapsed time. Empty for a memorial. */
  events: MissionEvent[];
  whereNow?: Cited<Exhibit>[];
}
