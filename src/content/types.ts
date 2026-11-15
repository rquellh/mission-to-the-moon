/**
 * The shape of the site's mission content.
 *
 * Each mission is one file that exports a `Mission`. Because the content is
 * type-checked, the build fails if a fact has no citation or cites a source
 * that is not in the registry (sources.ts). That is how the site keeps its
 * first rule: every fact is cited.
 *
 * Not defined yet: the flight path (orbits, burns, landing and splashdown
 * points). It is added with the first full mission, when the way paths are
 * drawn is settled.
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

/** Text at two reading levels. */
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
 * Time since liftoff, written the way the sources print it:
 * hours:minutes:seconds, for example "102:45:39.9".
 */
export type ElapsedTime = `${number}:${number}:${number}`;

/** Converts an elapsed time to seconds since liftoff. */
export function elapsedToSeconds(elapsed: ElapsedTime): number {
  const [hours = 0, minutes = 0, seconds = 0] = elapsed.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

export type Program = "gemini" | "apollo";

export interface CrewMember {
  name: string;
  /** For example "Commander" or "Lunar module pilot". */
  role: string;
}

/** A moment in a mission, placed on the mission clock. */
export interface MissionEvent {
  /** Unique within the mission, for example "landing". */
  id: string;
  title: string;
  elapsed: ElapsedTime;
  /** Universal time as ISO 8601, when the source gives it. */
  utc?: string;
  text: LeveledText;
  citations: Citations;
  discrepancy?: string;
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
  /** In order of elapsed time. Empty for a memorial. */
  events: MissionEvent[];
  whereNow?: Cited<Exhibit>[];
}
