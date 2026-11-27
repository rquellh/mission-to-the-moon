/**
 * What the browser tests open, and the ids they open it with.
 *
 * The site has no server and no API: a deep link is how a test sets the
 * site up. The address puts the site at any mission, moment, and view at
 * once, so a spec goes straight there with `sitePage.goto(URLS....)` rather
 * than clicking its way to a starting place (see src/app/deep-link.ts for
 * every value an address can hold).
 */
import type { EventView } from '../../src/content/types';

/**
 * Every flight, in the mission list's order. `src/content/missions/index.ts`
 * finds the missions with Vite's `import.meta.glob`, which Playwright cannot
 * run, so the list is kept here. missions.test.ts checks it against the
 * site's own list, so a new mission cannot be left out.
 */
export const FLIGHT_IDS = [
  'gemini-3',
  'gemini-4',
  'gemini-5',
  'gemini-7',
  'gemini-6a',
  'gemini-8',
  'gemini-9a',
  'gemini-10',
  'gemini-11',
  'gemini-12',
  'apollo-7',
  'apollo-8',
  'apollo-9',
  'apollo-10',
  'apollo-11',
  'apollo-12',
  'apollo-13',
  'apollo-14',
  'apollo-15',
  'apollo-16',
  'apollo-17',
] as const;

export type FlightId = (typeof FLIGHT_IDS)[number];

/** The missions the tests name on their own. */
export const MISSIONS = {
  /** Opened when the address names no mission, or one the site does not have. */
  DEFAULT: 'apollo-11',
  /** A memorial page, for a crew that did not fly: it has no flight to show. */
  MEMORIAL: 'apollo-1',
  /** An id the site does not have. */
  UNKNOWN: 'apollo-99',
} as const;

/**
 * Every extra that is ready (src/extras/<id>/meta.ts), in the mission list's
 * order (hands-on first, then the rest, each by `order`), with the title its
 * sheet shows. extras.test.ts checks that the list on the site shows each one.
 */
export const EXTRAS = [
  { id: 'orbit', title: 'Fly to orbit' },
  { id: 'stages', title: 'Drop the stages' },
  { id: 'docking', title: 'Dock two spacecraft' },
  { id: 'landing', title: 'Land on the Moon' },
  { id: 'patches', title: 'Mission patches' },
  { id: 'landing-sites', title: 'Six landings on the Moon' },
  { id: 'rockets', title: 'Three rockets' },
] as const;

/**
 * The guided tour the tests take: Gemini 6A, named by its first three stops,
 * and how many it makes in all. Its first trip is one of the shortest of any
 * tour, which keeps the test quick.
 */
export const TOUR = {
  mission: 'gemini-6a',
  stopCount: 10,
  stops: [
    { id: 'liftoff', title: 'Liftoff, at last' },
    { id: 'in-orbit', title: 'In orbit, far behind' },
    { id: 'bright-star', title: 'A bright star ahead' },
  ],
} as const;

/** Events and moments the tests open by address, with what the page shows there. */
export const EVENTS = {
  /** Apollo 11's liftoff, where "Fly to orbit" opened from the list leads ("Fly Apollo 11"). */
  APOLLO_11_LIFTOFF: {
    mission: 'apollo-11',
    id: 'liftoff',
    title: 'Liftoff',
    name: 'Apollo 11',
  },
  /** The first landing, where "Land on the Moon" opened from the list leads ("Fly Apollo 11"). */
  APOLLO_11_LANDING: {
    mission: 'apollo-11',
    id: 'landing',
    title: 'The Eagle has landed',
    clock: '102:45:39',
    name: 'Apollo 11',
  },
  APOLLO_11_FIRST_STEP: {
    mission: 'apollo-11',
    id: 'first-step',
    title: 'First step on the Moon',
    clock: '109:24:15',
  },
  /** The last moment, at the end of the clock: Finish shows the end of the flight, which suggests Apollo 12 on a fresh device. */
  APOLLO_11_SPLASHDOWN: {
    mission: 'apollo-11',
    id: 'splashdown',
    title: 'Splashdown',
    next: { mission: 'apollo-12', name: 'Apollo 12', firstTitle: 'Liftoff' },
  },
  /** The third moonwalk: the lander and the rover are on the Moon, and nothing has been left behind yet. */
  APOLLO_17_THIRD_MOONWALK: { mission: 'apollo-17', id: 'third-moonwalk' },
  /** The first American spacewalk: the astronaut floats out with his gas gun. */
  GEMINI_4_FLOATING_OUT: { mission: 'gemini-4', id: 'floating-out' },
  /** The first docking in orbit, where "Dock two spacecraft" opened from the list leads ("Fly Gemini 8"). */
  GEMINI_8_DOCKING: {
    mission: 'gemini-8',
    id: 'docking',
    title: 'The first docking',
    name: 'Gemini 8',
  },
} as const;

/** Mission times the tests open by address. */
export const MOMENTS = {
  /** Eight minutes after Apollo 11's Eagle undocks (100:12:00), before Columbia's separation burn: the two fly side by side. */
  APOLLO_11_BESIDE_COLUMBIA: { mission: 'apollo-11', t: '100:20:00' },
  /** Eight minutes before Apollo 11's Eagle docks with Columbia (128:03:00), in the final approach that began at 127:46:38.2: the two close in. */
  APOLLO_11_CLOSING_ON_COLUMBIA: { mission: 'apollo-11', t: '127:55:00' },
  /** Thirteen seconds after Apollo 17's ascent stage lifts off (185:21:37): the descent stage and the rover are left behind, labeled. */
  APOLLO_17_AFTER_LIFTOFF: { mission: 'apollo-17', t: '185:21:50' },
} as const;

/** What an address asks for (see src/app/deep-link.ts). Values left out are left out of the address. */
interface Place {
  mission?: string | undefined;
  start?: 'tour' | 'explore' | undefined;
  event?: string | undefined;
  t?: string | undefined;
  view?: EventView | undefined;
  extra?: string | undefined;
}

/** A relative address for a place (the config's baseURL ends in "/"). */
function address(place: Place): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(place)) {
    if (value !== undefined) params.set(key, value);
  }
  return `?${params.toString()}`;
}

/** The addresses specs open. Each puts the site straight where the test begins. */
export const URLS = {
  /** The welcome: the mission on show, and the ways in, over its 3D view. */
  WELCOME: (mission: string) => address({ mission }),
  /** The guided tour, from its first stop. */
  TOUR: (mission: string) => address({ mission, start: 'tour' }),
  /** Exploring, from the first event, in a view if one is named. */
  EXPLORE: (mission: string, view?: EventView) => address({ mission, start: 'explore', view }),
  /** Paused at an event, in the event's own view unless one is named. */
  EVENT: (mission: string, event: string, view?: EventView) =>
    address({ mission, start: 'explore', event, view }),
  /** Paused at a mission time (HHH:MM:SS since liftoff). */
  TIME: (mission: string, t: string, view?: EventView) =>
    address({ mission, start: 'explore', t, view }),
  /** Only the event or the time, as a shared link has them: no `start`. */
  LINK: (place: Place) => address(place),
  /** An extra, open over a mission. */
  EXTRA: (mission: string, extra: string) => address({ mission, extra }),
  /** An extra on its own, as the mission list opens it: over the welcome, with no flight behind it. */
  EXTRA_ON_ITS_OWN: (extra: string) => address({ extra }),
} as const;
