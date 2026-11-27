import { sources as extraDocking } from './extras/docking.ts';
import { sources as extraLandingSites } from './extras/landing-sites.ts';
import { sources as extraOrbit } from './extras/orbit.ts';
import { sources as extraPatches } from './extras/patches.ts';
import { sources as extraRockets } from './extras/rockets.ts';
import { sources as extraStages } from './extras/stages.ts';
import { sources as apollo1 } from './missions/apollo-1/sources.ts';
import { sources as apollo7 } from './missions/apollo-7/sources.ts';
import { sources as apollo8 } from './missions/apollo-8/sources.ts';
import { sources as apollo9 } from './missions/apollo-9/sources.ts';
import { sources as apollo10 } from './missions/apollo-10/sources.ts';
import { sources as apollo11 } from './missions/apollo-11/sources.ts';
import { sources as apollo12 } from './missions/apollo-12/sources.ts';
import { sources as apollo13 } from './missions/apollo-13/sources.ts';
import { sources as apollo14 } from './missions/apollo-14/sources.ts';
import { sources as apollo15 } from './missions/apollo-15/sources.ts';
import { sources as apollo16 } from './missions/apollo-16/sources.ts';
import { sources as apollo17 } from './missions/apollo-17/sources.ts';
/**
 * The registry of sources the site cites. A fact may only cite a source
 * listed here, and the type checker enforces that (see types.ts).
 *
 * Only add a source after opening its URL and confirming it says what we
 * need. `checked` is the date the URL was last confirmed to work.
 *
 * A source cited by one mission only lives in that mission's folder
 * (missions/<id>/sources.ts), and a source cited by one extra only in
 * extras/<id>.ts. A document cited by three or more missions is
 * registered once below, as a shared source. A document two missions cite is
 * registered once, in the earlier flight's folder, and the later mission
 * cites it by that id (Gemini 7 cites some of Gemini 6A's).
 */
import { sources as gemini3 } from './missions/gemini-3/sources.ts';
import { sources as gemini4 } from './missions/gemini-4/sources.ts';
import { sources as gemini5 } from './missions/gemini-5/sources.ts';
import { sources as gemini6a } from './missions/gemini-6a/sources.ts';
import { sources as gemini7 } from './missions/gemini-7/sources.ts';
import { sources as gemini8 } from './missions/gemini-8/sources.ts';
import { sources as gemini9a } from './missions/gemini-9a/sources.ts';
import { sources as gemini10 } from './missions/gemini-10/sources.ts';
import { sources as gemini11 } from './missions/gemini-11/sources.ts';
import { sources as gemini12 } from './missions/gemini-12/sources.ts';
import type { Source } from './source-types.ts';

export type { Source } from './source-types.ts';

const SHARED = {
  'apollo-by-the-numbers': {
    title: 'Apollo by the Numbers: A Statistical Reference (NASA SP-2000-4029)',
    publisher: 'NASA History Division',
    url: 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_00g_Table_of_Contents.htm',
    checked: '2026-11-15',
    use: 'Apollo event times, crews, call signs, orbits, burns, landing and splashdown data. The canonical source for Apollo timelines.',
  },
  'gemini-chronology': {
    title: 'Project Gemini: A Chronology (NASA SP-4002)',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/history/SP-4002/',
    checked: '2026-11-15',
    use: 'Gemini crews, launch vehicles, launch times, orbits, and landing points for all twelve flights (Appendix 1).',
  },
  'on-the-shoulders-of-titans': {
    title: 'On the Shoulders of Titans: A History of Project Gemini (NASA SP-4203)',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/03/sp-4203.pdf',
    checked: '2026-11-15',
    use: 'The narrative history of each Gemini flight. In "Fly to orbit", that ground computers carried out the Gemini launch vehicle\'s radio guidance.',
  },
  'nssdca-master-catalog': {
    title: 'NSSDCA Master Catalog',
    publisher: 'NASA Space Science Data Coordinated Archive, Goddard Space Flight Center',
    url: 'https://nssdc.gsfc.nasa.gov/nmc/',
    checked: '2026-11-15',
    use: 'Per-spacecraft facts for every flight: launch time, vehicle, orbit, and landing position.',
  },
  'nssdca-apollo-landing-sites': {
    title: 'Apollo Landing Site Coordinates',
    publisher: 'NASA Space Science Data Coordinated Archive, Goddard Space Flight Center',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
    checked: '2026-11-15',
    use: 'Where each lunar module landed. The canonical source for landing coordinates.',
  },
  'nssdca-apollo-current-locations': {
    title: 'Apollo: Where are they now?',
    publisher: 'NASA Space Science Data Coordinated Archive, Goddard Space Flight Center',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html',
    checked: '2026-11-15',
    use: 'Where each Apollo command module is displayed today.',
  },
  'apollo-lunar-descent-ascent-trajectories': {
    title: 'Apollo Lunar Descent and Ascent Trajectories (NASA TM X-58040)',
    publisher: 'NASA Manned Spacecraft Center',
    url: 'https://ntrs.nasa.gov/citations/19700024568',
    checked: '2026-11-15',
    use: 'How the Apollo 11 lunar module came down and went back up: descent orbit geometry, the direction of travel over the landing site, and orbit insertion after liftoff. In "Land on the Moon", that the ascent stage could take the crew back to orbit from an aborted descent, and that the call to land or abort came before the descent fuel ran out.',
  },
  'gemini-rendezvous-summary': {
    title: 'Summary of Rendezvous Operations (Gemini Summary Conference, NASA SP-138, paper 2)',
    publisher:
      'By W. Bernard Evans, Office of Vehicles and Missions, Gemini Program Office, NASA Manned Spacecraft Center; and Marvin R. Czarnik, Dynamics Group Engineer, McDonnell Aircraft Corp. (NASA Technical Reports Server)',
    url: 'https://ntrs.nasa.gov/citations/19680005473',
    checked: '2026-11-19',
    use: "How Gemini's rendezvous flights were flown and where each spacecraft stood when its final approach began (Table 2-IV): Gemini VI-A and, below and behind Gemini VII, how the meeting began; each of Gemini IX-A's three final approaches, the equiperiod rendezvous and the rendezvous from above; and Gemini 11's first-orbit and later stable-orbit rendezvous (figures 2-7 and 2-8, terminal phase initiation). Also Gemini VI-A's two midcourse corrections (Table 2-V) and why rendezvous mattered to Apollo.",
  },
  'nasa-image-and-video-library': {
    title: 'NASA Image and Video Library',
    publisher: 'NASA',
    url: 'https://images.nasa.gov/',
    checked: '2026-11-19',
    use: "NASA's captions for the photographs used here: what each shows, and where and when it was taken.",
  },
  'jpl-horizons': {
    title: 'Horizons System',
    publisher: 'NASA Jet Propulsion Laboratory, Solar System Dynamics Group',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
    checked: '2026-11-15',
    use: "Where the Moon and Sun were during a mission, and which point on Earth was directly below the Moon, so Earth can be turned correctly in the flight path's frame.",
  },
} as const satisfies Record<string, Source>;

/** Every source the site may cite: the shared ones, then each mission's own, in flight order. */
export const SOURCES = {
  ...SHARED,
  ...gemini3,
  ...gemini4,
  ...gemini5,
  ...gemini7,
  ...gemini6a,
  ...gemini8,
  ...gemini9a,
  ...gemini10,
  ...gemini11,
  ...gemini12,
  ...apollo1,
  ...apollo7,
  ...apollo8,
  ...apollo9,
  ...apollo10,
  ...apollo11,
  ...apollo12,
  ...apollo13,
  ...apollo14,
  ...apollo15,
  ...apollo16,
  ...apollo17,
  ...extraStages,
  ...extraDocking,
  ...extraLandingSites,
  ...extraRockets,
  ...extraPatches,
  ...extraOrbit,
} as const satisfies Record<string, Source>;

/** The id of a registered source. */
export type SourceId = keyof typeof SOURCES;

/** The registered sources grouped by who cites them: the shared ones, each mission's own, and each extra's own. */
export interface SourceGroups {
  readonly shared: Readonly<Record<string, Source>>;
  readonly missions: Readonly<Record<string, Readonly<Record<string, Source>>>>;
  /** Each extra’s own sources, under the extra’s id (a folder under src/extras). */
  readonly extras: Readonly<Record<string, Readonly<Record<string, Source>>>>;
}

/** The same sources in groups: the shared ones, and each mission's own under its mission id, in flight order. */
export const SOURCE_GROUPS: SourceGroups = {
  shared: SHARED,
  missions: {
    'gemini-3': gemini3,
    'gemini-4': gemini4,
    'gemini-5': gemini5,
    'gemini-7': gemini7,
    'gemini-6a': gemini6a,
    'gemini-8': gemini8,
    'gemini-9a': gemini9a,
    'gemini-10': gemini10,
    'gemini-11': gemini11,
    'gemini-12': gemini12,
    'apollo-1': apollo1,
    'apollo-7': apollo7,
    'apollo-8': apollo8,
    'apollo-9': apollo9,
    'apollo-10': apollo10,
    'apollo-11': apollo11,
    'apollo-12': apollo12,
    'apollo-13': apollo13,
    'apollo-14': apollo14,
    'apollo-15': apollo15,
    'apollo-16': apollo16,
    'apollo-17': apollo17,
  },
  extras: {
    stages: extraStages,
    docking: extraDocking,
    'landing-sites': extraLandingSites,
    rockets: extraRockets,
    patches: extraPatches,
    orbit: extraOrbit,
  },
};
