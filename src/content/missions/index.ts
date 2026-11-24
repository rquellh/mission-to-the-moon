/**
 * The registry of missions. Each folder here is one mission, found by its
 * file names, so adding a folder needs no edit anywhere else:
 *
 * - summary.ts exports `summary: MissionSummary`. Every summary loads with
 *   the page, for the mission list, so it stays small.
 * - index.ts exports `bundle: MissionBundle` (story, flight plan, vehicle).
 *   It loads only when that flight is opened, as its own file in the build.
 * - memorial.ts exports `memorial: Memorial`, for a crew that did not fly.
 *   It loads only when its page is opened.
 *
 * A summary with `status: "draft"` is listed only in the dev server. It can
 * still be opened by its address (`?mission=<folder name>`).
 *
 * This file uses `import.meta.glob`, which only Vite understands. The
 * Vitest tests run through Vite and can import it; code that plain Node or
 * Playwright runs (tools/, tests/) cannot.
 */
import type { Memorial, MissionSummary } from '../types.ts';
import type { MissionBundle } from './bundle.ts';

export type { MissionBundle } from './bundle.ts';

/** The mission shown when the address does not name one, or names one we do not have. */
export const DEFAULT_MISSION_ID = 'apollo-11';

/** The folder a module path is in: "./apollo-11/summary.ts" is "apollo-11". */
function folderOf(path: string): string {
  return path.split('/')[1] ?? path;
}

function byFolder<T>(modules: Record<string, T>): ReadonlyMap<string, T> {
  return new Map(Object.entries(modules).map(([path, value]) => [folderOf(path), value]));
}

const summaryById = byFolder(
  import.meta.glob<MissionSummary>('./*/summary.ts', { eager: true, import: 'summary' }),
);
const bundleLoaders = byFolder(
  import.meta.glob<MissionBundle>('./*/index.ts', { import: 'bundle' }),
);
const memorialLoaders = byFolder(
  import.meta.glob<Memorial>('./*/memorial.ts', { import: 'memorial' }),
);

if (import.meta.env.DEV) {
  // Addresses and the list use the folder name, so a summary must use it too.
  for (const [folder, summary] of summaryById) {
    if (summary.id !== folder)
      console.warn(
        `missions/${folder}/summary.ts has id "${summary.id}"; it should be "${folder}".`,
      );
  }
}

/** True when the files a summary points to exist: the flight's bundle, or the memorial page. */
function hasContent(summary: MissionSummary): boolean {
  return (summary.kind === 'memorial' ? memorialLoaders : bundleLoaders).has(summary.id);
}

/**
 * True when a mission is finished: marked ready, with its content in place.
 * Anything else is listed only in the dev server, marked as a draft.
 */
export function isReady(summary: MissionSummary): boolean {
  return summary.status === 'ready' && hasContent(summary);
}

const time = (summary: MissionSummary): number => {
  const ms = Date.parse(summary.date);
  return Number.isNaN(ms) ? Infinity : ms;
};

/** The mission list: every summary in date order, leaving out drafts outside the dev server. */
export const summaries: readonly MissionSummary[] = [...summaryById.values()]
  .filter((summary) => import.meta.env.DEV || isReady(summary))
  .sort((a, b) => time(a) - time(b));

/** Any mission's summary by id, drafts included, or undefined when there is none. */
export function summaryFor(id: string | null | undefined): MissionSummary | undefined {
  return id ? summaryById.get(id) : undefined;
}

/** The flight to open for an id: the id itself when it has a bundle, otherwise the default mission. */
export function flightIdFor(id: string | null | undefined): string {
  return id && bundleLoaders.has(id) ? id : DEFAULT_MISSION_ID;
}

/** True when the id has a memorial page. */
export function hasMemorial(id: string | null | undefined): boolean {
  return Boolean(id && memorialLoaders.has(id));
}

/** Load a flight's bundle. An unknown id loads the default mission. */
export function loadBundle(id: string | null | undefined): Promise<MissionBundle> {
  const loader = bundleLoaders.get(flightIdFor(id));
  return loader ? loader() : Promise.reject(new Error('No missions are registered'));
}

/** Load a memorial page. */
export function loadMemorial(id: string): Promise<Memorial> {
  const loader = memorialLoaders.get(id);
  return loader ? loader() : Promise.reject(new Error(`There is no memorial page for "${id}"`));
}
