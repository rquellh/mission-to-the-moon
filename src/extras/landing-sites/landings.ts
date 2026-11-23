import type { MissionBundle } from '../../content/missions/bundle.ts';
/**
 * Where and when each lunar module landed, read from a mission's own cited
 * flight plan and story, so the extra repeats facts the site already holds
 * (with their citations) instead of keeping a copy that could drift.
 */
import {
  elapsedToSeconds,
  type Citation,
  type ElapsedTime,
  type MissionEvent,
} from '../../content/types.ts';
import type { DescentPhase, Phase, SurfacePhase } from '../../sim/types.ts';

/** The six flights whose lunar modules landed on the Moon, in flight order. */
export const LANDING_MISSIONS = [
  'apollo-11',
  'apollo-12',
  'apollo-14',
  'apollo-15',
  'apollo-16',
  'apollo-17',
] as const;

/** The flight that was meant to land and did not. */
export const MEANT_TO_LAND = 'apollo-13';

export interface Landing {
  missionId: string;
  /** Degrees, north and east positive, as the flight plan gives them. */
  latitude: number;
  longitude: number;
  /** The flight plan's citations for the place, and its notes where sources differ. */
  placeCitations: Citation[];
  placeNotes: string[];
  /** The story's event at the landing, or undefined if the story has none at or before it. */
  event: MissionEvent | undefined;
}

const isSurface = (phase: Phase): phase is SurfacePhase =>
  phase.kind === 'surface' && phase.body === 'moon';
const isDescent = (phase: Phase): phase is DescentPhase =>
  phase.kind === 'descent' && phase.body === 'moon';

/**
 * The lander's landing place and moment, or null when the flight has no
 * lunar module that reached the surface. The moment is the story event at
 * the start of the stay on the surface (or the end of the descent), or the
 * nearest event before it, so no event id or time is written here.
 */
export function landingOf(bundle: MissionBundle): Landing | null {
  const lander = bundle.flight.ships.find((ship) => ship.role === 'lander');
  if (!lander) return null;
  const surface = lander.phases.find(isSurface);
  const descent = lander.phases.find(isDescent);
  const site = (surface ?? descent)?.site;
  if (!site) return null;
  const touchdown: ElapsedTime = surface
    ? surface.start.value
    : (descent as DescentPhase).end.value;
  const notes = [site.latitude.discrepancy, site.longitude.discrepancy].filter(
    (note): note is string => Boolean(note),
  );
  return {
    missionId: bundle.mission.id,
    latitude: site.latitude.value,
    longitude: site.longitude.value,
    placeCitations: [...site.latitude.citations, ...site.longitude.citations],
    placeNotes: [...new Set(notes)],
    event: eventAtOrBefore(bundle.mission.events, elapsedToSeconds(touchdown)),
  };
}

/** The event at this time (within half a second), or else the latest one before it. */
export function eventAtOrBefore(
  events: readonly MissionEvent[],
  seconds: number,
): MissionEvent | undefined {
  let before: MissionEvent | undefined;
  let beforeTime = -Infinity;
  for (const event of events) {
    const time = elapsedToSeconds(event.elapsed);
    if (Math.abs(time - seconds) < 0.5) return event;
    if (time < seconds && time > beforeTime) {
      before = event;
      beforeTime = time;
    }
  }
  return before;
}

/** "0.67416° north", "3.0128° south": the value as given, without its sign. */
export function formatLatitude(degrees: number): string {
  if (degrees === 0) return '0°';
  return `${Math.abs(degrees)}° ${degrees > 0 ? 'north' : 'south'}`;
}

/** "23.47314° east", "23.4219° west". */
export function formatLongitude(degrees: number): string {
  if (degrees === 0) return '0°';
  return `${Math.abs(degrees)}° ${degrees > 0 ? 'east' : 'west'}`;
}

const unit = (count: string, one: string, many: string): string =>
  `${count} ${Number(count) === 1 ? one : many}`;

/**
 * A mission clock time in words, keeping the seconds as printed:
 * "102:45:39.9" is "102 hours 45 minutes 39.9 seconds".
 */
export function elapsedInWords(elapsed: ElapsedTime): string {
  const [hours = '0', minutes = '0', seconds = '0'] = elapsed.replace('-', '').trim().split(':');
  // Drop leading zeros ("009" is 9) but keep any fraction as the source prints it.
  const trim = (part: string): string => part.replace(/^0+(?=\d)/, '');
  const words: string[] = [];
  if (Number(hours) > 0) words.push(unit(trim(hours), 'hour', 'hours'));
  if (Number(minutes) > 0 || words.length > 0) words.push(unit(trim(minutes), 'minute', 'minutes'));
  words.push(unit(trim(seconds), 'second', 'seconds'));
  return words.join(' ');
}

const dayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

/**
 * Universal time in words, keeping the precision of the ISO string:
 * "1969-07-20T20:17:39Z" is "July 20, 1969, at 20:17:39 universal time".
 * Empty when it does not read as a date.
 */
export function utcInWords(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = /T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/.exec(iso)?.[1];
  const day = dayFormat.format(date);
  return time ? `${day}, at ${time} universal time` : day;
}
