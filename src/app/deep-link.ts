/**
 * Deep links: what the page's address asks the site to open. Kept apart from
 * src/main.ts so it can be read and tested without starting the site.
 */
import { elapsedToSeconds, type ElapsedTime, type EventView } from '../content/types.ts';

/** What the address asks for. */
export interface DeepLink {
  /** The mission's id, or null for the default mission. */
  mission: string | null;
  time: number | null;
  view: EventView | null;
  start: 'tour' | 'explore' | null;
  /** An event id of the mission, to open paused at it. */
  event: string | null;
  /** An extra's id, to open it over the mission. */
  extra: string | null;
  /** Every value but `extra`, passed on to the extra. */
  extraParams: URLSearchParams;
}

/**
 * Read a deep link from the address's query string (`window.location.search`).
 *
 * Deep links:
 * - `?mission=gemini-8` picks the mission. An unknown id opens the default
 *   mission. A memorial's id (`?mission=apollo-1`) opens the default mission
 *   with the memorial page open over the mission list.
 * - `?t=102:45:40` opens paused at that mission time (hours, minutes, and
 *   seconds since liftoff, or plain seconds; a leading minus sign means
 *   before liftoff) and skips the welcome.
 * - `?view=` picks the view (journey, earth, moon, or spacecraft; "both"
 *   and "ship" also work, as the buttons name them).
 * - `?start=tour` or `?start=explore` skips the welcome and begins that way.
 * - `?event=landing` opens paused at that event of the mission, as `t` does.
 * - `?extra=stages` opens that extra over the mission (over the mission
 *   list, when the address names nothing else). Every other value in the
 *   address reaches the extra as its params.
 */
export function readDeepLink(search: string): DeepLink {
  const params = new URLSearchParams(search);
  let time: number | null = null;
  const t = params.get('t')?.trim();
  if (t) {
    const seconds = /^-?\d+(\.\d+)?$/.test(t)
      ? Number(t)
      : /^-?\d+:\d{1,2}(:\d{1,2}(\.\d+)?)?$/.test(t)
        ? elapsedToSeconds((t.split(':').length === 2 ? `${t}:0` : t) as ElapsedTime)
        : Number.NaN;
    if (Number.isFinite(seconds)) time = seconds;
  }
  const names = new Map<string, EventView>([
    ['journey', 'journey'],
    ['both', 'journey'],
    ['earth', 'earth'],
    ['moon', 'moon'],
    ['spacecraft', 'spacecraft'],
    ['ship', 'spacecraft'],
  ]);
  const view = names.get(params.get('view')?.trim().toLowerCase() ?? '') ?? null;
  const startParam = params.get('start')?.trim().toLowerCase();
  const start = startParam === 'tour' || startParam === 'explore' ? startParam : null;
  const extraParams = new URLSearchParams(params);
  extraParams.delete('extra');
  return {
    mission: params.get('mission')?.trim().toLowerCase() || null,
    time,
    view,
    start,
    event: params.get('event')?.trim() || null,
    extra: params.get('extra')?.trim().toLowerCase() || null,
    extraParams,
  };
}
