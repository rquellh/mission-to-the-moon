/**
 * The registry of extras. Each folder here is one extra, found by its file
 * names (see types.ts for the whole contract), so adding a folder needs no
 * edit anywhere else:
 *
 * - meta.ts exports `meta: ExtraMeta`, loaded with the page for the list.
 * - index.ts exports `extra: Extra`, loaded only when the extra is opened,
 *   as its own file in the build.
 *
 * A meta with `status: "draft"` is listed only on the dev server. It still
 * opens by its address (`?extra=<folder name>`).
 *
 * This file uses `import.meta.glob`, which only Vite understands, so code
 * that Node runs directly (the tests) must not import it.
 */
import type { Extra, ExtraMeta } from "./types.ts";

export type { Extra, ExtraContext, ExtraMeta, ExtraMount } from "./types.ts";

/** The folder a module path is in: "./stages/meta.ts" is "stages". */
function folderOf(path: string): string {
  return path.split("/")[1] ?? path;
}

function byFolder<T>(modules: Record<string, T>): ReadonlyMap<string, T> {
  return new Map(Object.entries(modules).map(([path, value]) => [folderOf(path), value]));
}

const metaById = byFolder(import.meta.glob<ExtraMeta>("./*/meta.ts", { eager: true, import: "meta" }));
const loaders = byFolder(import.meta.glob<Extra>("./*/index.ts", { import: "extra" }));

if (import.meta.env.DEV) {
  // Addresses and "handsOn" use the folder name, so a meta must use it too.
  for (const [folder, meta] of metaById) {
    if (meta.id !== folder) console.warn(`extras/${folder}/meta.ts has id "${meta.id}"; it should be "${folder}".`);
  }
}

/** True when an extra is finished: marked ready, with its index.ts in place. */
export function isExtraReady(meta: ExtraMeta): boolean {
  return meta.status === "ready" && loaders.has(meta.id);
}

const KIND_ORDER: Record<ExtraMeta["kind"], number> = { "hands-on": 0, explore: 1 };

/** The extras list: hands-on first, then the rest, each by `order`, leaving out drafts outside the dev server. */
export const extras: readonly ExtraMeta[] = [...metaById.values()]
  .filter((meta) => import.meta.env.DEV || isExtraReady(meta))
  .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.order - b.order || a.title.localeCompare(b.title));

/** Any extra's meta by id, drafts included, or undefined when there is none. */
export function extraFor(id: string | null | undefined): ExtraMeta | undefined {
  return id ? metaById.get(id) : undefined;
}

/** True when the id names an extra that can be opened. */
export function hasExtra(id: string | null | undefined): boolean {
  return Boolean(id && loaders.has(id));
}

/** Load an extra's code. */
export function loadExtra(id: string): Promise<Extra> {
  const loader = loaders.get(id);
  return loader ? loader() : Promise.reject(new Error(`There is no extra called "${id}"`));
}
