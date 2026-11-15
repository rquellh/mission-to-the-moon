/**
 * The registry of sources the site cites. A fact may only cite a source
 * listed here, and the type checker enforces that (see types.ts).
 *
 * Only add a source after opening its URL and confirming it says what we
 * need. `checked` is the date the URL was last confirmed to work.
 */

export interface Source {
  /** The publication or page title, as the source gives it. */
  title: string;
  /** Who publishes it. */
  publisher: string;
  /** The main address: a table of contents or landing page. */
  url: string;
  /** ISO date this URL was last confirmed to work. */
  checked: string;
  /** What we use it for. */
  use: string;
}

export const SOURCES = {
  "apollo-by-the-numbers": {
    title: "Apollo by the Numbers: A Statistical Reference (NASA SP-2000-4029)",
    publisher: "NASA History Division",
    url: "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_00g_Table_of_Contents.htm",
    checked: "2026-11-15",
    use: "Apollo event times, crews, call signs, orbits, burns, landing and splashdown data. The canonical source for Apollo timelines.",
  },
  "gemini-chronology": {
    title: "Project Gemini: A Chronology (NASA SP-4002)",
    publisher: "NASA",
    url: "https://www.nasa.gov/history/SP-4002/",
    checked: "2026-11-15",
    use: "Gemini crews, launch vehicles, launch times, orbits, and landing points for all twelve flights (Appendix 1).",
  },
  "on-the-shoulders-of-titans": {
    title: "On the Shoulders of Titans: A History of Project Gemini (NASA SP-4203)",
    publisher: "NASA",
    url: "https://www.nasa.gov/wp-content/uploads/2023/03/sp-4203.pdf",
    checked: "2026-11-15",
    use: "The narrative history of each Gemini flight.",
  },
  "nssdca-master-catalog": {
    title: "NSSDCA Master Catalog",
    publisher: "NASA Space Science Data Coordinated Archive, Goddard Space Flight Center",
    url: "https://nssdc.gsfc.nasa.gov/nmc/",
    checked: "2026-11-15",
    use: "Per-spacecraft facts for every flight: launch time, vehicle, orbit, and landing position.",
  },
  "nssdca-apollo-landing-sites": {
    title: "Apollo Landing Site Coordinates",
    publisher: "NASA Space Science Data Coordinated Archive, Goddard Space Flight Center",
    url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
    checked: "2026-11-15",
    use: "Where each lunar module landed. The canonical source for landing coordinates.",
  },
  "nssdca-apollo-current-locations": {
    title: "Apollo: Where are they now?",
    publisher: "NASA Space Science Data Coordinated Archive, Goddard Space Flight Center",
    url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html",
    checked: "2026-11-15",
    use: "Where each Apollo command module is displayed today.",
  },
} as const satisfies Record<string, Source>;

/** The id of a registered source. */
export type SourceId = keyof typeof SOURCES;
