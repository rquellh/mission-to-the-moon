import type { ExtraContext } from '../extras/types';

/**
 * Small values kept on this device (localStorage), as JSON. Nothing here is
 * ever sent anywhere. Every call is wrapped, so private browsing, storage
 * that is full or turned off, or a value that does not parse just means the
 * value is forgotten.
 */
const PREFIX = 'mission-to-the-moon/';

function read<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === undefined) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Forgetting is the safe answer.
  }
}

/**
 * Keys the site writes and every extra can read by the same name through
 * `context.store.get` (see src/extras/types.ts). Extras cannot change them.
 */
const SITE_KEYS = new Set(['visited-missions']);

/** The ids in "visited-missions", oldest first. Anything that is not a list of ids counts as none. */
function visits(): string[] {
  const stored = read<unknown>('site/visited-missions');
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
}

/** Note that a mission's tour or exploring has started: its id joins "visited-missions", oldest first, once. */
export function recordVisit(missionId: string): void {
  const ids = visits();
  if (ids.includes(missionId)) return;
  write('site/visited-missions', [...new Set(ids), missionId]);
}

/** The missions whose tour or exploring has started on this device: the flights whose patches are collected. */
export function readVisits(): ReadonlySet<string> {
  return new Set(visits());
}

/** One extra's store: its own keys, plus the site's keys to read. */
export function extraStore(extraId: string): ExtraContext['store'] {
  return {
    get<T>(key: string): T | undefined {
      return read<T>(SITE_KEYS.has(key) ? `site/${key}` : `extras/${extraId}/${key}`);
    },
    set(key: string, value: unknown): void {
      if (SITE_KEYS.has(key)) {
        if (import.meta.env.DEV)
          console.warn(`"${key}" is kept by the site; extras can read it but not change it.`);
        return;
      }
      write(`extras/${extraId}/${key}`, value);
    },
  };
}
