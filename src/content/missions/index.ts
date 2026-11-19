/**
 * Every mission on the site, in flight order. Add each new mission here.
 *
 * A mission is a folder: its story (events, crew, sources), its flight plan
 * (the published points the path is computed from), its spacecraft shapes,
 * and its own sources. Its index.ts bundles the first three together.
 */
import type { Mission } from "../types.ts";
import { bundle as apollo11Bundle } from "./apollo-11/index.ts";
import { bundle as gemini8Bundle } from "./gemini-8/index.ts";
import type { MissionBundle } from "./bundle.ts";

export type { MissionBundle } from "./bundle.ts";

/** In flight order. */
export const bundles: readonly MissionBundle[] = [gemini8Bundle, apollo11Bundle];

/** Every mission's story, in flight order. */
export const missions: readonly Mission[] = bundles.map((bundle) => bundle.mission);

/** The mission shown when the address does not name one. */
export const DEFAULT_MISSION_ID = "apollo-11";

/** The bundle for a mission id, or the default mission's when the id is unknown. */
export function bundleFor(id: string | null | undefined): MissionBundle {
  const found = bundles.find((bundle) => bundle.mission.id === id);
  const fallback = bundles.find((bundle) => bundle.mission.id === DEFAULT_MISSION_ID) ?? bundles[0];
  if (!found && !fallback) throw new Error("No missions are registered");
  return (found ?? fallback)!;
}
